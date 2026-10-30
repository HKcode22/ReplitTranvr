import {describe,it,expect,vi} from "vitest";
import {createHash} from "node:crypto";
import {fetchFidsAirport} from "../server/lib/disruption/aerodataboxLimiter_v3";
import {buildFidsRequestContractV39,fetchFidsPopulation}
 from "../server/lib/disruption/fidsCensus_v3";
const base={
 airportIcao:"WSSS",fromLocal:"2026-10-31T08:00",toLocal:"2026-10-31T12:00",
 ianaTimezone:"Asia/Singapore",withCancelled:true,withCodeshared:true,
 withCargo:false,withPrivate:false,direction:"Departure" as const,
 serviceWindowStartUtc:new Date("2026-10-31T00:00:00Z"),
 serviceWindowEndUtc:new Date("2026-10-31T04:00:00Z"),
 cutoffUtc:new Date("2026-10-30T00:00:00Z"),
 providerApiVersion:"1.15.4.0",fidsProtocolVersion:"v3.9-f.8",
 openapiSha256:"a".repeat(64)
};
describe("Phase4 FIDS request source-frame application intent",()=>{
 it("binds exact effective Plan f.8 FIDS filter intent into every normalized source response hash",async()=>{
  const contract=buildFidsRequestContractV39(base);
  expect(contract).toMatchObject({
   schema:"v39.fids-request-frame.application-intent.v1",
   endpointKind:"airport_local_fids",airportIcao:"WSSS",
   fromLocal:"2026-10-31T08:00",toLocal:"2026-10-31T12:00",
   direction:"Departure",withLeg:true,withCancelled:true,
   withCodeshared:true,withCargo:false,withPrivate:false,withLocation:false,
   sourceTransportRequestReceiptVerified:false,originalHttpBytesPreserved:false
  });
  const fetchAirport=vi.fn(async(..._args:any[])=>({departures:[],arrivals:[]}));
  const persist=vi.fn(async(_query:any,_rows:any[])=>0);
  const res=await fetchFidsPopulation(base,{fetchAirport,persist,
   now:()=>new Date("2026-10-30T07:30:00.000Z")});
  expect(res?.flightCount).toBe(0);
  expect(fetchAirport.mock.calls).toHaveLength(1);
  expect(fetchAirport.mock.calls[0][3]).toMatchObject({
   direction:"Departure",withLeg:true,withCancelled:true,
   withCodeshared:true,withCargo:false,withPrivate:false,withLocation:false
  });
  const [query]=persist.mock.calls[0];
  const raw=query.rawPayload as Record<string,unknown>;
  expect(raw.fidsRequestContract).toEqual(contract);
  expect(raw.payloadRepresentation).toBe("RECONSTRUCTED_RESPONSE_JSON_NOT_VERBATIM_HTTP_BYTES");
  expect(query.responseHash).toBe(createHash("sha256").update(JSON.stringify(raw)).digest("hex"));
 });
 it("passes flags into actual bounded FIDS gateway URL without remote provider request",async()=>{
  const urls:string[]=[];
  const owner={reserve:vi.fn(async()=>undefined)};
  const fetchImpl=vi.fn(async(input:RequestInfo|URL)=>{
   urls.push(String(input));
   return new Response(JSON.stringify({departures:[],arrivals:[]}),{status:200});
  });
  const got=await fetchFidsAirport("WSSS",base.fromLocal,base.toLocal,{
   direction:"Departure",withLeg:true,withCancelled:false,
   withCodeshared:false,withCargo:true,withPrivate:true,
   withLocation:false,
   budgetOwner:owner,fetchImpl:fetchImpl as typeof fetch
  });
  expect(got).toEqual({departures:[],arrivals:[]});
  expect(owner.reserve).toHaveBeenCalledTimes(1);
  expect(urls).toHaveLength(1);
  const url=new URL(urls[0]);
  expect(url.pathname).toBe("/flights/airports/icao/WSSS/2026-10-31T08%3A00/2026-10-31T12%3A00");
  expect(Object.fromEntries(url.searchParams.entries())).toMatchObject({
   direction:"Departure",withLeg:"true",withCancelled:"false",
   withCodeshared:"false",withCargo:"true",withPrivate:"true",withLocation:"false"
  });
 });
 it("legacy direct gateway caller retains frozen baseline defaults",async()=>{
  const urls:string[]=[];
  const fetchImpl=vi.fn(async(input:RequestInfo|URL)=>{
   urls.push(String(input));return new Response(JSON.stringify({departures:[],arrivals:[]}),{status:200});
  });
  await fetchFidsAirport("WSSS",base.fromLocal,base.toLocal,{
   budgetOwner:{reserve:async()=>undefined},fetchImpl:fetchImpl as typeof fetch
  });
  const p=new URL(urls[0]).searchParams;
  expect(p.get("withCancelled")).toBe("true");
  expect(p.get("withCodeshared")).toBe("true");
  expect(p.get("withCargo")).toBe("false");
  expect(p.get("withPrivate")).toBe("false");
 });
 it("rejects malformed frame inputs before any mock provider request",async()=>{
  for(const mismatch of [
   {withCargo:"false"},{withPrivate:0},{withCancelled:"true"},
   {direction:"Maybe"},{airportIcao:"WSS"},{fromLocal:"nonsense"}
  ]){
   expect(()=>buildFidsRequestContractV39({...base,...mismatch} as any)).toThrow(/FIDS_REQUEST_/);
  }
  const fetchImpl=vi.fn();
  await expect(fetchFidsAirport("WSSS",base.fromLocal,base.toLocal,{
   withCodeshared:"false" as any,
   fetchImpl:fetchImpl as typeof fetch
  })).rejects.toThrow("FIDS_FRAME_FILTER_BOOLEAN_REQUIRED");
  expect(fetchImpl).not.toHaveBeenCalled();
 });

 it("retains authentic fetch-decoded body bytes and SHA without calling the provider",async()=>{
  const originalText=' {\n "departures": [], "arrivals": [] \n}  ';
  const bodyBytes=Buffer.from(originalText,"utf8");
  const fetchImpl=vi.fn(async()=>new Response(bodyBytes,{status:200}));
  const owner={reserve:vi.fn(async()=>undefined)};
  const captured=await fetchFidsAirport("WSSS",base.fromLocal,base.toLocal,{
   direction:"Departure",budgetOwner:owner,fetchImpl:fetchImpl as typeof fetch
  });
  expect(captured).not.toBeNull();
  expect(captured?.originalDecodedBody?.representation)
   .toBe("FETCH_DECODED_RESPONSE_BODY_BYTES_NOT_HTTP_WIRE");
  expect(captured?.originalDecodedBody?.byteLength).toBe(bodyBytes.length);
  expect(captured?.originalDecodedBody?.sha256)
   .toBe(createHash("sha256").update(bodyBytes).digest("hex"));
  expect(JSON.stringify(captured)).not.toContain("originalDecodedBody");
  const persist=vi.fn(async(_query:any,_rows:any[])=>0);
  await fetchFidsPopulation(base,{fetchAirport:async()=>captured,persist,
   now:()=>new Date("2026-10-30T07:30:00.000Z")});
  const [query]=persist.mock.calls[0];
  const raw=query.rawPayload as any;
  expect(raw.originalDecodedEntityBodyPreserved).toBe(true);
  expect(raw.originalHttpWireBytesPreserved).toBe(false);
  expect(raw.payloadRepresentation).toBe("RECONSTRUCTED_RESPONSE_JSON_NOT_VERBATIM_HTTP_BYTES");
  expect(raw.originalDecodedEntityBodyEvidence.bodySha256)
   .toBe(createHash("sha256").update(bodyBytes).digest("hex"));
  expect(Buffer.from(raw.originalDecodedEntityBodyEvidence.bodyBase64,"base64"))
   .toEqual(bodyBytes);
  expect(query.responseHash)
   .toBe(createHash("sha256").update(JSON.stringify(raw)).digest("hex"));
  expect(owner.reserve).toHaveBeenCalledTimes(1);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
 });
 it("refuses forged source SHA or changed normalized response before persisting",async()=>{
  const rawText='{"departures":[],"arrivals":[]}';
  const bytes=Buffer.from(rawText);
  const genuine={
   representation:"FETCH_DECODED_RESPONSE_BODY_BYTES_NOT_HTTP_WIRE" as const,
   byteLength:bytes.length,sha256:createHash("sha256").update(bytes).digest("hex"),
   base64:bytes.toString("base64")
  };
  const persist=vi.fn(async(_query:any,_rows:any[])=>0);
  const run=(value:any)=>fetchFidsPopulation(base,{fetchAirport:async()=>value,persist});
  await expect(run({departures:[],arrivals:[],originalDecodedBody:{
   ...genuine,sha256:"0".repeat(64)}}))
   .rejects.toThrow("FIDS_ORIGINAL_DECODED_BODY_SHA_MISMATCH_HOLD");
  await expect(run({departures:[{number:"FAKE"}],arrivals:[],originalDecodedBody:genuine}))
   .rejects.toThrow("FIDS_ORIGINAL_DECODED_BODY_NORMALIZATION_MISMATCH_HOLD");
  expect(persist).not.toHaveBeenCalled();
 });
 it("legacy reconstructed-only observations explicitly remain unverified",async()=>{
  const persist=vi.fn(async(_query:any,_rows:any[])=>0);
  await fetchFidsPopulation(base,{
   fetchAirport:async()=>({departures:[],arrivals:[]}),persist
  });
  const raw=persist.mock.calls[0][0].rawPayload as any;
  expect(raw.originalDecodedEntityBodyPreserved).toBe(false);
  expect(raw.originalDecodedEntityBodyEvidence).toBeNull();
  expect(raw.originalHttpWireBytesPreserved).toBe(false);
 });
 it("refuses oversized fetch body rather than creating a false source receipt",async()=>{
  const owner={reserve:vi.fn(async()=>undefined)};
  const fetchImpl=vi.fn(async()=>new Response('{"departures":[]}',{
   status:200,headers:{"content-length":String(4*1024*1024+1)}
  }));
  const result=await fetchFidsAirport("WSSS",base.fromLocal,base.toLocal,{
   budgetOwner:owner,fetchImpl:fetchImpl as typeof fetch
  });
  expect(result).toBeNull();
  expect(owner.reserve).toHaveBeenCalledTimes(1);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
 });

 it("caps stream bytes even when decoded size has no Content-Length",async()=>{
  const owner={reserve:vi.fn(async()=>undefined)};
  const oversized='x'.repeat(4*1024*1024+1);
  const fetchImpl=vi.fn(async()=>new Response(oversized,{status:200}));
  const result=await fetchFidsAirport("WSSS",base.fromLocal,base.toLocal,{
   budgetOwner:owner,fetchImpl:fetchImpl as typeof fetch
  });
  expect(result).toBeNull();
  expect(owner.reserve).toHaveBeenCalledTimes(1);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
 });
});
