/**
 * Nonpaid, OFFLINE: Phase5 prelaunch UTC seven-category "cost-only" analysis.
 * It cannot run the installed V0082 production release writer, DB or API.
 */
import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {buildP5PrelaunchSlotBudgetEnvelope} from
 "../server/lib/disruption/phase5PrelaunchUnknownAirportSlotBudgetEnvelope_v39.mjs";
import {
 buildP5V0082UnknownAirportSevenCostOnlyDraft,
 inspectP5V0082DynamicSignedSourceAgainstCostOnlyCap
} from "../server/lib/disruption/phase5V0082UnknownAirportSevenCostOnlyDraft_v39.mjs";

const digest=x=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const h=n=>String(n).repeat(64);
const iso=n=>new Date(n).toISOString();
const H=3600000,M=60000,D=86400000;
const OTHER=[
 "FIDS_RETRY_UNIT_BUDGET","VALIDATION_UNIT_BUDGET",
 "OUTCOME_REST_UNIT_BUDGET","HISTORY_BOOTSTRAP_UNIT_BUDGET",
 "DIAGNOSTIC_UNIT_BUDGET"
];
function fixture(){
 const start=Date.parse("2027-03-01T00:00:00.000Z");
 const calendarDays=Array.from({length:31},(_,i)=>{
  const shape=i<26?"4h":i<29?"2x2h":"up-to-6h";
  const hour=[0,4,8,12,16,20][i%6];
  return {
   runDayIndex:i+1,startUtc:iso(start+i*7*D+hour*H),
   utcSlot:String(hour).padStart(2,"0"),
   windowShape:shape,
   partition:i<20?"train":i<25?"validation":"test"
  };
 });
 const chargeDates=new Set();
 for(const d of calendarDays){
  const from=Date.parse(d.startUtc);
  const segs=d.windowShape==="2x2h"?
   [[from,from+2*H],[from+3*H,from+5*H]]:
   [[from,from+(d.windowShape==="up-to-6h"?6:4)*H]];
  for(const [a,b] of segs){
   for(let p=a;p<b;p+=4*H){
    const end=Math.min(p+4*H,b);
    for(const offset of [24*H,6*H,90*M]){
     for(let tick=p-offset-120000;tick<end-offset-120000;tick+=120*M)
      chargeDates.add(iso(tick).slice(0,10));
    }
   }
  }
 }
 const slotBudgetInput={
  schema:"v39.phase5.prelaunch-slot-budget-input.v1",
  manifestSha256:h("a"),calendarSha256:h("b"),configSha256:h("c"),
  frameSha256:h("d"),providerRangeEvidenceSha256:h("e"),
  timingEvidenceSha256:h("f"),asOfUtc:"2027-01-01T00:00:00.000Z",
  providerMaxRangeMinutes:240,refreshEveryMinutes:120,
  physicalGetsPerRefreshUpperBound:1,getLeadSeconds:120,
  apiUnitsPerPhysicalGet:2,cycleRestCeilingUnits:50000,
  protectedRestFloorUnits:1000,
  calendarDays,restOtherByUtcDate:[...chargeDates].sort().map(chargeDayUtc=>({
   chargeDayUtc,dailyRestCeilingUnits:1900,
   categories:Object.fromEntries(OTHER.map(k=>[k,1]))
  }))
 };
 const original=buildP5PrelaunchSlotBudgetEnvelope(slotBudgetInput);
 const inp={
  schema:"v39.phase5.v0082-cost-only-from-slot-input.v1",
  slotBudgetInput,
  expectedReviewerSlotEnvelopeSha256:original.prelaunchEnvelopeSha256
 };
 return {inp,original};
}
function signedMetadata(c,chargeDayUtc,category,seed){
 return {
  queryDigest:digest({syntheticQuery:seed}),
  manifestSha256:c.manifestSha256,
  plannedChargeUtcDate:chargeDayUtc,
  restCategory:category,airportIcao:"WSSS",
  earlyDrawSha256:h("1"),reviewedReleaseSha256:h("2"),
  rightsReviewSha256:h("3"),
  reviewedProviderRangeSha256:c.reviewedProviderRangeEvidenceSha256
 };
}
describe("V0082 nonpaid future-unknown airports seven-category UTC cost upper bound",()=>{
 it("reuses real slot source physics and materializes exact 7 costs per physical UTC, not fictitious airports",()=>{
  const {inp,original}=fixture();
  const c=buildP5V0082UnknownAirportSevenCostOnlyDraft(inp);
  expect(c.status).toBe(
   "COST_ONLY_SEVEN_CATEGORY_UTC_DRAFT_NOT_V0082_STAGE22_SOURCE_RELEASE");
  expect(c.sourceSlotBudgetSha256).toBe(original.prelaunchEnvelopeSha256);
  expect(c.days.length).toBeGreaterThanOrEqual(31);
  expect(c.days.every(x=>x.categoryRows.length===7)).toBe(true);
  expect(c.days.every(x=>x.categoryRows.every(y=>y.physicallyReservedUnits===0)))
   .toBe(true);
  expect(c.categoryCaps.length).toBe(7);
  expect(new Set(c.categoryCaps.map(x=>x.category)).size).toBe(7);
  expect(c.cycleSourceReservedUnits).toBe(original.cycleSourceUnits);
  expect(c.cycleOtherReservedUnits).toBe(original.cycleOtherUnits);
  expect(c.plannedPhysicalGetsUpperBound*2).toBe(original.cycleSourceUnits);
  expect(c.unsignedFutureOrdinaryAirports).toBe(21);
  expect(c.sourceRequestGridSha256).toBeNull();
  expect(c.originalExistingV0082WriterCompatible).toBe(false);
  expect(c.originalExistingV0082ExactQueryEqualityCompatible).toBe(false);
  expect(c.separateCostOnlyV0082ReleaseImplementationInstalled).toBe(false);
  expect(c.physicallyReservedUnits).toBe(0);
  expect(c.providerCalls).toBe(0);
  expect(c.dbWrites).toBe(0);
  expect(c.phase6PaidGo).toBe(false);
 });
 it("refuses falsely signed slot input, missing category and overdrawn daily REST",()=>{
  const {inp}=fixture();
  inp.expectedReviewerSlotEnvelopeSha256=h("0");
  expect(()=>buildP5V0082UnknownAirportSevenCostOnlyDraft(inp))
   .toThrow("REVIEWED_SLOT_ENVELOPE_DIGEST_CHANGED");
  const noOther=fixture();
  delete noOther.inp.slotBudgetInput.restOtherByUtcDate[0].categories.DIAGNOSTIC_UNIT_BUDGET;
  expect(()=>buildP5V0082UnknownAirportSevenCostOnlyDraft(noOther.inp))
   .toThrow("UNSIGNED_OR_INCOMPLETE_FIVE_OTHER_REST_CATEGORIES");
  const exceed=fixture();
  exceed.inp.slotBudgetInput.restOtherByUtcDate.forEach(x=>
   x.dailyRestCeilingUnits=2);
  expect(()=>buildP5V0082UnknownAirportSevenCostOnlyDraft(exceed.inp))
   .toThrow("PHYSICAL_UTC_REST_BUDGET_OVERSPENT");
 });
 it("can prove a future signed count is within frozen UPPER LIMIT without requiring an equal GET count",()=>{
  const {inp}=fixture();
  const c=buildP5V0082UnknownAirportSevenCostOnlyDraft(inp);
  const date=c.days.find(d=>d.fidsBaseUnits>=4).chargeDayUtc;
  const one=signedMetadata(c,date,"FIDS_BASE_UNITS",1);
  const r=inspectP5V0082DynamicSignedSourceAgainstCostOnlyCap({
   candidate:c,chargeDayUtc:date,knownSignedQueryMetadata:[one]
  });
  expect(r.status).toBe(
   "SIGNED_QUERY_METADATA_WITHIN_UPPER_CAP_NOT_DB_VERIFIED_NO_GO");
  expect(r.actualKnownQueries).toBe(1);
  expect(r.observedBaseSourceUnits).toBe(2);
  expect(r.unspentUpperBoundBaseUnits).toBeGreaterThan(0);
  expect(r.exactSourceRequestAndFlightIdentityDbVerified).toBe(false);
  expect(r.providerRequestActuallySent).toBe(false);
  expect(r.physicalReservationCommitted).toBe(false);
  expect(r.phase6PaidGo).toBe(false);
  const zero=inspectP5V0082DynamicSignedSourceAgainstCostOnlyCap({
   candidate:c,chargeDayUtc:date,knownSignedQueryMetadata:[]
  });
  expect(zero.status).toBe("UNSPENT_BUDGET_NO_QUERIES_YET_NOT_RELEASE");
  expect(zero.actualKnownQueries).toBe(0);
 });
 it("rejects replayed queries, wrong physical charge date, wrong category and upper-cap overbooking",()=>{
  const {inp}=fixture();
  const c=buildP5V0082UnknownAirportSevenCostOnlyDraft(inp);
  const date=c.days.find(d=>d.fidsBaseUnits>=4).chargeDayUtc;
  const one=signedMetadata(c,date,"FIDS_BASE_UNITS",1);
  const run=knownSignedQueryMetadata=>
   inspectP5V0082DynamicSignedSourceAgainstCostOnlyCap({
    candidate:c,chargeDayUtc:date,knownSignedQueryMetadata
   });
  expect(()=>run([one,one])).toThrow(
   "UNAUTHENTICATED_OR_DUPLICATE_FUTURE_SIGNED_QUERY_METADATA");
  expect(()=>run([{...one,plannedChargeUtcDate:"2027-01-01"}])).toThrow(
   "UNAUTHENTICATED_OR_DUPLICATE_FUTURE_SIGNED_QUERY_METADATA");
  expect(()=>run([{...one,restCategory:"FIDS_RETRY_UNIT_BUDGET"}])).toThrow(
   "UNAUTHENTICATED_OR_DUPLICATE_FUTURE_SIGNED_QUERY_METADATA");
  const ceiling=c.days.find(d=>d.chargeDayUtc===date).fidsBaseUnits/2;
  const overflow=Array.from({length:ceiling+1},(_,i)=>
    signedMetadata(c,date,"FIDS_BASE_UNITS",i+100));
  expect(()=>run(overflow)).toThrow(
   "ACTUAL_SIGNED_QUERY_UNITS_EXCEED_PRELAUNCH_CAP");
 });
 it("rejects a mutated immutable cost draft and detects malformed query range SHA",()=>{
  const {inp}=fixture();
  const c=buildP5V0082UnknownAirportSevenCostOnlyDraft(inp);
  const date=c.days.find(d=>d.fidsBaseUnits>0).chargeDayUtc;
  const altered=structuredClone(c);
  altered.days[0].categoryRows[0].plannedUnits+=2;
  expect(()=>inspectP5V0082DynamicSignedSourceAgainstCostOnlyCap({
   candidate:altered,chargeDayUtc:date,knownSignedQueryMetadata:[]
  })).toThrow("COST_ONLY_REVIEW_PACKET_TAMPERED");
  expect(()=>inspectP5V0082DynamicSignedSourceAgainstCostOnlyCap({
   candidate:c,chargeDayUtc:date,
   knownSignedQueryMetadata:[
    {...signedMetadata(c,date,"FIDS_BASE_UNITS",1),
     reviewedProviderRangeSha256:h("9")}
   ]
  })).toThrow("UNAUTHENTICATED_OR_DUPLICATE_FUTURE_SIGNED_QUERY_METADATA");
 });
});
