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
