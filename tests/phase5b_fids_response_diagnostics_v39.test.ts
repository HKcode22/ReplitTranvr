import {describe,it,expect,vi} from "vitest";
import {createServer} from "node:http";
import {fetchFidsAirport} from "../server/lib/disruption/aerodataboxLimiter_v3";
describe("SOURCE response diagnostics preserve strict one-GET semantics",()=>{
 for(const [name,response,expected,valid] of [
  ["204",()=>new Response(null,{status:204}),"BODY_UNAVAILABLE",false],
  ["empty",()=>new Response(""),"BODY_EMPTY",false],
  ["invalid",()=>new Response("not json"),"BODY_INVALID_JSON",false],
  ["array",()=>new Response("[]"),"BODY_INVALID_OBJECT",false],
  ["missing",()=>new Response("{}"),"DEPARTURES_MISSING",false],
  ["zero",()=>new Response('{"departures":[]}'),"BODY_VALID",true]
 ] as const){
 it(name,async()=>{
  const seen:string[]=[],reserve=vi.fn(async()=> "a".repeat(64)),fetchImpl=vi.fn(async()=>response());
  const result=await fetchFidsAirport("WSSS","2026-11-25T00:00","2026-11-25T02:00",{direction:"Departure",strictDepartureList:true,onePhysicalAttemptOnly:true,budgetOwner:{reserve},fetchImpl,onResponseDiagnostic:x=>seen.push(x)});
  expect(seen).toEqual([expected]);expect(reserve).toHaveBeenCalledTimes(1);expect(fetchImpl).toHaveBeenCalledTimes(1);
  if(valid)expect(result?.departures).toEqual([]);else expect(result).toBeNull();
 });
 }
 it("429 remains missing and cannot trigger a second reservation",async()=>{
 const reserve=vi.fn(async()=> "a".repeat(64)),fetchImpl=vi.fn(async()=>new Response(null,{status:429})),onResponseDiagnostic=vi.fn();
 expect(await fetchFidsAirport("WSSS","2026-11-25T00:00","2026-11-25T02:00",{direction:"Departure",strictDepartureList:true,onePhysicalAttemptOnly:true,budgetOwner:{reserve},fetchImpl,onResponseDiagnostic})).toBeNull();
 expect(reserve).toHaveBeenCalledTimes(1);expect(fetchImpl).toHaveBeenCalledTimes(1);expect(onResponseDiagnostic).not.toHaveBeenCalled();
 });
});

import {requireP5ExactSourceLocalGeometry} from "../server/lib/disruption/phase5V0079DailyPreparedQueryProposals_v39";
it("T097 exact local signed SOURCE geometry for four incident airports, DST and midnight",()=>{
 const acquisition={serviceWindowStartUtc:"2026-11-27T08:00:00.000Z",serviceWindowEndUtc:"2026-11-27T10:00:00.000Z"};
 for(const [ianaTimezone,localFrom,localTo] of [
  ["Australia/Sydney","2026-11-27T19:00","2026-11-27T21:00"],
  ["America/New_York","2026-11-27T03:00","2026-11-27T05:00"],
  ["Europe/Paris","2026-11-27T09:00","2026-11-27T11:00"],
  ["Pacific/Auckland","2026-11-27T21:00","2026-11-27T23:00"]
 ]){
  const p={acquisition,ianaTimezone,localFrom,localTo};
  expect(()=>requireP5ExactSourceLocalGeometry(p)).not.toThrow();
  expect(()=>requireP5ExactSourceLocalGeometry({...p,localFrom:"2026-11-27T08:00"})).toThrow("SIGNED_SOURCE_LOCAL_GEOMETRY_DRIFT");
  expect(()=>requireP5ExactSourceLocalGeometry({...p,localTo:localFrom})).toThrow("SIGNED_SOURCE_LOCAL_GEOMETRY_DRIFT");
 }
 const midnight={acquisition:{serviceWindowStartUtc:"2026-11-27T11:00:00.000Z",serviceWindowEndUtc:"2026-11-27T13:00:00.000Z"},ianaTimezone:"Pacific/Auckland",localFrom:"2026-11-28T00:00",localTo:"2026-11-28T02:00"};
 expect(()=>requireP5ExactSourceLocalGeometry(midnight)).not.toThrow();
 expect(()=>requireP5ExactSourceLocalGeometry({...midnight,localFrom:"2026-11-27T24:00"})).toThrow("SIGNED_SOURCE_LOCAL_GEOMETRY_DRIFT");
});

it("T101 one reserved FIDS GET does not follow an actual local HTTP redirect; legacy remains unchanged",async()=>{
 const hits:string[]=[];
 const server=createServer((req,res)=>{
  hits.push(req.url??"");
  if(req.url==="/first"){res.writeHead(302,{Location:"/second"});res.end();}
  else{res.writeHead(200,{"Content-Type":"application/json"});res.end('{"departures":[]}');}
 });
 await new Promise<void>((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve);});
 try{
  const address=server.address();if(!address||typeof address==="string")throw Error("LOCAL_FIXTURE_ADDRESS");
  const reserve=vi.fn(async()=> "a".repeat(64));
  // Only redirect/signal reach a loopback fixture. No provider URL or headers.
  const fetchImpl:typeof fetch=async(_input,init)=>fetch("http://127.0.0.1:"+address.port+"/first",{redirect:init?.redirect,signal:init?.signal});
  const args={direction:"Departure" as const,strictDepartureList:true,budgetOwner:{reserve},fetchImpl};
  expect(await fetchFidsAirport("WSSS","2026-11-25T00:00","2026-11-25T02:00",{...args,onePhysicalAttemptOnly:true})).toBeNull();
  expect(hits).toEqual(["/first"]);expect(reserve).toHaveBeenCalledTimes(1);
  hits.length=0;reserve.mockClear();
  expect((await fetchFidsAirport("WSSS","2026-11-25T00:00","2026-11-25T02:00",args))?.departures).toEqual([]);
  expect(hits).toEqual(["/first","/second"]);expect(reserve).toHaveBeenCalledTimes(1);
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
it("T101 every Fetch redirect status terminates the one-GET lane without retry or body acceptance",async()=>{
 for(const status of [301,302,303,307,308]){
  const reserve=vi.fn(async()=> "a".repeat(64)),sleepImpl=vi.fn(async()=>undefined);
  const fetchImpl=vi.fn(async(_input:RequestInfo|URL,init?:RequestInit)=>{
   expect(init?.redirect).toBe("manual");
   return new Response('{"departures":[]}',{status,headers:{Location:"https://invalid.example/never-follow"}});
  });
  expect(await fetchFidsAirport("WSSS","2026-11-25T00:00","2026-11-25T02:00",{direction:"Departure",strictDepartureList:true,onePhysicalAttemptOnly:true,budgetOwner:{reserve},fetchImpl,sleepImpl})).toBeNull();
  expect(reserve).toHaveBeenCalledTimes(1);expect(fetchImpl).toHaveBeenCalledTimes(1);expect(sleepImpl).not.toHaveBeenCalled();
 }
});

it("T101 ambiguous transport and server faults never retry a pre-reserved paid GET",async()=>{
 for(const fault of ["transport","server"] as const){
  const reserve=vi.fn(async()=> "a".repeat(64));
  const fetchImpl=vi.fn(async()=>{
   if(fault==="transport")throw Error("fixture transport interrupted after dispatch");
   return new Response(null,{status:503,headers:{"Retry-After":"0"}});
  });
  const sleepImpl=vi.fn(async()=>undefined);
  expect(await fetchFidsAirport("WSSS","2026-11-25T00:00","2026-11-25T02:00",{
   direction:"Departure",strictDepartureList:true,onePhysicalAttemptOnly:true,
   budgetOwner:{reserve},fetchImpl,sleepImpl
  })).toBeNull();
  expect(reserve).toHaveBeenCalledTimes(1);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect(sleepImpl).not.toHaveBeenCalled();
 }
});
it("T101 refused durable reservation makes zero HTTP requests",async()=>{
 const reserve=vi.fn(async():Promise<string>=>{throw Error("fixture reservation refused");});
 const fetchImpl=vi.fn(async()=>new Response('{"departures":[]}'));
 expect(await fetchFidsAirport("WSSS","2026-11-25T00:00","2026-11-25T02:00",{
  direction:"Departure",strictDepartureList:true,onePhysicalAttemptOnly:true,
  budgetOwner:{reserve},fetchImpl
 })).toBeNull();
 expect(reserve).toHaveBeenCalledTimes(1);
 expect(fetchImpl).not.toHaveBeenCalled();
});
