import {describe,it,expect,vi} from "vitest";
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
