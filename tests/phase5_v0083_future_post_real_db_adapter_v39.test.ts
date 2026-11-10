import {describe,it,expect,vi} from "vitest";
import {createHash} from "node:crypto";
import {
 p5V0083FuturePostReservationSha256,
 verifyP5FuturePostReviewedFrame,
 reserveP5FuturePostV0083OnePhysicalGet,
 verifyP5FuturePostOriginalBeforeCommit,
 verifyP5FuturePostOriginalAfterCommit,
 type P5ReviewedFuturePostOneGet,
 type P5ActualV0083PostReserved
} from "../server/lib/disruption/phase5V0083FuturePostOriginalDb_v39";
import {buildFidsRequestContractV39} from
 "../server/lib/disruption/fidsCensus_v3";
import {fetchFidsAirport} from "../server/lib/disruption/aerodataboxLimiter_v3";
const sh=(c:string)=>c.repeat(64);
const stamp=(s:string)=>new Date(s);
function approved():P5ReviewedFuturePostOneGet{
 return{
 schema:"v39.phase5.future-post-reviewed-outcome-one-get.v1",
 manifestSha256:sh("a"),requestSha256:sh("b"),githubRunId:"1234567890",
 reviewedSourceRightsSha256:sh("c"),reviewedProviderPriceSha256:sh("d"),
 reviewedCategoryBudgetSha256:sh("e"),
 reviewedRequestContextSha256:sh("f"),
 reviewedProviderContractSha256:sh("9"),
 reviewedFrameSha256:sh("8"),
 runDayIndex:1,slot:"HUB",airportIcao:"WSSS",
 flightInstanceId:"leg:phase5:abcd012345",
 expectedSelectedTNativeUtc:"2027-02-02T10:00:00.000Z",
 plannedSourceFromUtc:"2027-02-02T09:00:00.000Z",
 plannedSourceToUtc:"2027-02-02T11:00:00.000Z",
 fromLocal:"2027-02-02T17:00",toLocal:"2027-02-02T19:00",
 airportIanaTimezone:"Asia/Singapore",
 postDispatchEarliestUtc:"2027-02-02T12:00:00.000Z",
 postDispatchHardLatestUtc:"2027-02-02T12:20:00.000Z",
 expectedApiUnitsPerGet:2,
 independentFuturePostRequestAndRightsReview:true
 };
}
function reservation(p=approved()):P5ActualV0083PostReserved{
 return{
  schema:"v39.phase5.v0083.future-post-physical-reservation.v1",
  reservationSha256:p5V0083FuturePostReservationSha256(p),
  requestSha256:p.requestSha256,manifestSha256:p.manifestSha256,
  githubRunId:p.githubRunId,
  reservedAtUtc:"2027-02-02T12:01:00.000Z",
  physicallyChargedUtcDate:"2027-02-02",
  category:"OUTCOME_REST_UNIT_BUDGET",approvedApiUnits:2,
  physicalPaidAttemptReserved:true,providerResponseSucceeded:false,
  providerOriginalCommitted:false,
  phase5ScientificFreezeGrantedByThisCode:false,
  phase6PaidGoGrantedByThisCode:false
 };
}
const now=stamp("2027-02-02T12:01:00.000Z");
function fakeDatabase(p=approved()){
 const res=reservation(p);
 let call=0,hasPreviouslyReserved=false;
 const history:string[]=[];
 const q=async (sql:string)=>{
  history.push(sql);
  if(sql.startsWith("SELECT current_user"))
   return {rowCount:1,rows:[{
    role:"phase5_other_rest_reserve_prod_20261108",
    login:"phase5_rest_reserve_login_20261110",
    db:"neondb",now,ro:"off"
   }]};
  if(sql.includes("FROM clean.phase5_other_rest_reviewed_call_v39"))
   return{rowCount:1,rows:[{
    rest_category:"OUTCOME_REST_UNIT_BUDGET",
    manifest_sha256:p.manifestSha256,request_sha256:p.requestSha256,
    github_run_id:p.githubRunId,
    rights_review_sha256:p.reviewedSourceRightsSha256,
    provider_price_sha256:p.reviewedProviderPriceSha256,
    reviewed_category_budget_sha256:p.reviewedCategoryBudgetSha256,
    reviewed_request_context_sha256:p.reviewedRequestContextSha256,
    api_units_per_get:2,planned_charge_day_utc:"2027-02-02",
    earliest_dispatch_utc:stamp(p.postDispatchEarliestUtc),
    hard_latest_dispatch_utc:stamp(p.postDispatchHardLatestUtc),
    source_query_digest:null
   }]};
  if(sql.includes("SELECT clean.reserve_phase5_other_rest_once_v39")){
   if(hasPreviouslyReserved)throw Error("P5_V0083_DUPLICATE_PHYSICAL_GET_NEVER_RETRY");
   hasPreviouslyReserved=true;call++;
   return {rowCount:1,rows:[{reserved_at:now}]};
  }
  if(sql.includes("FROM clean.phase5_other_rest_physical_reservation_v39"))
   return{rowCount:1,rows:[{
    reservation_sha256:res.reservationSha256,request_sha256:p.requestSha256,
    manifest_sha256:p.manifestSha256,rest_category:"OUTCOME_REST_UNIT_BUDGET",
    approved_api_units:2,github_run_id:p.githubRunId,
    rights_review_sha256:p.reviewedSourceRightsSha256,
    provider_price_sha256:p.reviewedProviderPriceSha256,
    charged_utc_date:stamp("2027-02-02T00:00:00.000Z"),
    reserved_at_utc:now
   }]};
  return{rowCount:0,rows:[]};
 };
 const client=()=>({query:q,release:()=>history.push("RELEASE")});
 return{
  pool:{connect:async()=>client()},
  getPaidReservationCalls:()=>call,
  history
 };
}
describe("Phase5 V0083 paid POST DB port — real SQL paths but NEVER provider in tests",()=>{
 it("binds deterministic SHA exactly to installed V0083 PG formula",()=>{
  const p=approved();
  const expected=createHash("sha256").update(
   [p.manifestSha256,p.requestSha256,p.githubRunId,"2",
    p.reviewedSourceRightsSha256,p.reviewedProviderPriceSha256].join("|")
  ).digest("hex");
  expect(p5V0083FuturePostReservationSha256(p)).toBe(expected);
  expect(verifyP5FuturePostReviewedFrame(p).chargeDateUtc).toBe("2027-02-02");
 });
 it("executes exactly ONE serializable V0083 reservation and independent postCOMMIT readback",async()=>{
  const p=approved(),f=fakeDatabase(p);
  const x=await reserveP5FuturePostV0083OnePhysicalGet(f.pool as any,p);
  expect(x.physicalPaidAttemptReserved).toBe(true);
  expect(x.providerResponseSucceeded).toBe(false);
  expect(x.approvedApiUnits).toBe(2);
  expect(x.phase6PaidGoGrantedByThisCode).toBe(false);
  expect(f.getPaidReservationCalls()).toBe(1);
  expect(f.history).toContain("COMMIT");
  expect(f.history.some(s=>s.includes(
   "SELECT clean.reserve_phase5_other_rest_once_v39"))).toBe(true);
  expect(f.history.some(s=>s.includes(
   "FROM clean.phase5_other_rest_physical_reservation_v39"))).toBe(true);
 });
 it("cannot silently retry physical request after an irreversible reservation",async()=>{
  const p=approved(),f=fakeDatabase(p);
  await reserveP5FuturePostV0083OnePhysicalGet(f.pool as any,p);
  await expect(reserveP5FuturePostV0083OnePhysicalGet(f.pool as any,p))
   .rejects.toThrow("P5_V0083_DUPLICATE_PHYSICAL_GET_NEVER_RETRY");
  expect(f.getPaidReservationCalls()).toBe(1);
 });
 it("refuses timestamps, wrong frame source, unreviewed rights and a midnight-crossing charge",()=>{
  const p=approved();p.postDispatchHardLatestUtc=
   "2027-02-03T00:00:00.000Z";
  expect(()=>verifyP5FuturePostReviewedFrame(p))
   .toThrow("POST_SOURCE_WINDOW_NOT_PROSPECTIVE_OR_BOUNDED");
  const x=approved();x.expectedSelectedTNativeUtc=
   "2027-02-02T11:01:00.000Z";
  expect(()=>verifyP5FuturePostReviewedFrame(x))
   .toThrow("POST_SOURCE_WINDOW_NOT_PROSPECTIVE_OR_BOUNDED");
  const y=approved();y.independentFuturePostRequestAndRightsReview=false as true;
  expect(()=>verifyP5FuturePostReviewedFrame(y))
   .toThrow("MISSING_REVIEWED_POST_SOURCE_QUERY");
 });
 it("fails closed on wrong budget role before physical reservation",async()=>{
  const p=approved();
  const x=fakeDatabase(p);
  const f={connect:async()=>({query:async(sql:string)=>{
    if(sql.startsWith("SELECT current_user"))
     return{rowCount:1,rows:[{role:"app_runtime",db:"neondb",ro:"off",now}]};
    return {rowCount:0,rows:[]};
   },release:()=>{}})};
  await expect(reserveP5FuturePostV0083OnePhysicalGet(f as any,p))
   .rejects.toThrow("NOT_RESTRICTED_V0083_REST_RESERVE_ROLE");
  expect(x.getPaidReservationCalls()).toBe(0);
 });
 it("guarantees no application POST marker in ordinary PRE and refuses fake POST category",()=>{
  const p=approved();
  const q={
   airportIcao:"WSSS",fromLocal:p.fromLocal,toLocal:p.toLocal,
   ianaTimezone:p.airportIanaTimezone,withCancelled:true,
   withCodeshared:true,direction:"Departure" as const,
   serviceWindowStartUtc:stamp(p.plannedSourceFromUtc),
   serviceWindowEndUtc:stamp(p.plannedSourceToUtc),
   cutoffUtc:stamp(p.postDispatchEarliestUtc),
   restCategory:"outcome" as const,
   providerApiVersion:"test",fidsProtocolVersion:"P5-POST",
   openapiSha256:p.reviewedProviderContractSha256,
   phase5PostReservationSha256:reservation(p).reservationSha256
  };
  const contract=buildFidsRequestContractV39(q);
  expect(contract.phase5PostReservationSha256)
   .toBe(reservation(p).reservationSha256);
  expect(()=>buildFidsRequestContractV39(
   {...q,restCategory:"fids_base" as const}))
   .toThrow("P5_POST_V0083_RESERVATION_FRAME_INVALID_HOLD");
  expect(()=>buildFidsRequestContractV39({
   ...q,phase5PostReservationSha256:undefined
  })).not.toThrow();
 });
 it("validates ORIGINAL and reservation readback in same PG atomic persist tx",async()=>{
  const p=approved(),res=reservation(p),id=
   "11111111-2222-4333-8444-555555555555";
  const query:any={
   populationQueryId:id,sourceAirportIcao:p.airportIcao,
   queryDirection:"Departure",
   serviceWindowStartUtc:stamp(p.plannedSourceFromUtc),
   serviceWindowEndUtc:stamp(p.plannedSourceToUtc),
   fromLocal:p.fromLocal,toLocal:p.toLocal,
   airportIanaTimezone:p.airportIanaTimezone,
   openapiSha256:p.reviewedProviderContractSha256,
   fidsRetrievalUtc:stamp("2027-02-02T12:02:00.000Z"),
   responseHash:sh("4"),
   rawPayload:{
    phase5PostReservationSha256:res.reservationSha256,
    phase5PostPurpose:"FUTURE_POST_SOURCE_OBSERVATION_NOT_AN_ACTUAL_PHYSICAL_LABEL",
    originalDecodedEntityBodyPreserved:true,
    originalDecodedEntityBodyEvidence:{
     representation:"FETCH_DECODED_RESPONSE_BODY_BYTES_NOT_HTTP_WIRE",
     bodySha256:sh("5")
    }
   }
  };
  const rows:any[]=[{batchId:res.reservationSha256,
   populationQueryId:id,responseHash:sh("4")}];
  let reads=0;
  const db={query:async()=>{reads++;return{rowCount:1,rows:[{
   reservation_sha256:res.reservationSha256,request_sha256:p.requestSha256,
   manifest_sha256:p.manifestSha256,rest_category:"OUTCOME_REST_UNIT_BUDGET",
   approved_api_units:2,github_run_id:p.githubRunId,
   rights_review_sha256:p.reviewedSourceRightsSha256,
   provider_price_sha256:p.reviewedProviderPriceSha256,
   reserved_at_utc:now
  }]}}};
  await verifyP5FuturePostOriginalBeforeCommit(
   db as any,p,res,query,rows,{
    durableAvailableAt:stamp("2027-02-02T12:02:30.000Z"),
    normalizedInsertedRows:1});
  expect(reads).toBe(1);
  await expect(verifyP5FuturePostOriginalBeforeCommit(
   db as any,p,res,{...query,sourceAirportIcao:"YSSY"},rows,{
    durableAvailableAt:stamp("2027-02-02T12:02:30.000Z"),
    normalizedInsertedRows:1}))
   .rejects.toThrow("UNBOUND_OR_PARTIAL_POST_SOURCE_ORIGINAL");
 });
 it("checks original and all normalized members again AFTER their COMMIT",async()=>{
  const p=approved(),res=reservation(p);
  const id="11111111-2222-4333-8444-555555555555";
  const pool={connect:async()=>({
   query:async()=>({rowCount:1,rows:[{
    id,response_hash:sh("4"),source_airport_icao:"WSSS",
    raw_payload:{phase5PostReservationSha256:res.reservationSha256,
     originalDecodedEntityBodyPreserved:true},
    members:2
   }]}),release:()=>{}
  })};
  const x=await verifyP5FuturePostOriginalAfterCommit(
   pool as any,p,res,id,sh("4"),2);
  expect(x.status).toBe(
   "FUTURE_POST_ORIGINAL_COMMITTED_NOT_ACTUAL_FLIGHT_OUTCOME");
  expect(x.actualPhysicalDepartureCertified).toBe(false);
  expect(x.normalizedMembers).toBe(2);
 });
});

describe("V0083 onePhysicalAttemptOnly: no hidden FIDS transport retry after one reserved REST call",()=>{
 it.each([429,500,503])("POST HTTP %s still executes exactly one charged attempt",async status=>{
  let charged=0,networkCalls=0;
  const result=await fetchFidsAirport("WSSS","2027-02-02T17:00",
   "2027-02-02T19:00",{
    direction:"Departure",category:"outcome",
    strictDepartureList:true,strictArrivalList:false,
    onePhysicalAttemptOnly:true,
    budgetOwner:{reserve:async(category,units,attempt)=>{
     charged++;expect(category).toBe("outcome");
     expect(units).toBe(2);expect(attempt).toBe(1);
     return "prepaid-one-physical-attempt";
    }},
    fetchImpl:vi.fn(async()=>{
     networkCalls++;
     return new Response("provider not ready",{status});
    }) as typeof fetch,
    sleepImpl:async()=>{throw Error("NO_POST_RETRY_SLEEP_ALLOWED");}
   });
  expect(result).toBeNull();
  expect(charged).toBe(1);
  expect(networkCalls).toBe(1);
 });
 it("a network transport exception does not cause the second HTTP GET",async()=>{
  let charged=0,calls=0;
  const result=await fetchFidsAirport("WSSS","2027-02-02T17:00",
   "2027-02-02T19:00",{
    direction:"Departure",category:"outcome",
    onePhysicalAttemptOnly:true,
    budgetOwner:{reserve:async()=>{charged++;return "reservation";}},
    fetchImpl:vi.fn(async()=>{
     calls++;throw new Error("SIMULATED_NETWORK_RESET_AFTER_PAID_DISPATCH");
    }) as typeof fetch,
    sleepImpl:async()=>{throw Error("NO_RETRY_SLEEP_ALLOWED");}
   });
  expect(result).toBeNull();
  expect(charged).toBe(1);
  expect(calls).toBe(1);
 });
});
