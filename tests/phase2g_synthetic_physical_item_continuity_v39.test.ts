import {describe,expect,it} from "vitest";
import {
  compareSyntheticPhysicalItemContinuityV39,
  type SyntheticPhysicalItemWitnessV39
} from "../experiments/phase2g_rehearsal/synthetic_physical_item_continuity_v39";

const SESSION="12345678-1234-4234-8234-123456789abc";
const START="2026-10-12T03:00:00.000Z";
const END="2026-10-12T05:00:00.000Z";
const at=(minute:number)=>
  new Date(Date.parse(START)+minute*60000).toISOString();
const item=(i:number):SyntheticPhysicalItemWitnessV39=>({
  sessionId:SESSION,deliveryId:"synthetic-n-"+i,itemIndex:0,
  rawItemSha256:i.toString(16).padStart(64,"0"),
  originalEdgeReceivedUtc:at(i),
  identityResolutionStatus:"resolved",
  codeshareResolutionStatus:"resolved_operator",
  flightInstanceId:"synthetic-YSSY-QF-"+i,
  initialServiceDate:"2026-10-12",
  operatingCarrier:"QF",
  operatingFlightNumber:String(i+100),
  originIcao:"YSSY",destinationIcao:"YMEL",
  scheduledGateOutUtc:at(i)
});
const fixture=()=>{
  const expected=Array.from({length:120},(_,i)=>item(i));
  return {
    frozenSessionId:SESSION,windowStartUtc:START,windowEndUtc:END,
    independentSourceEvidenceAuthenticated:true,
    independentOwnerFreezeAuthenticated:true,
    expectedWitnesses:expected,
    observedRuntimeRows:expected.map(x=>({...x}))
  };
};
type Evidence=ReturnType<typeof fixture>;
const changed=(x:Evidence)=>({
  ...x,expectedWitnesses:[...x.expectedWitnesses],
  observedRuntimeRows:x.observedRuntimeRows.map(r=>({...r}))
});
const check=(v:Evidence)=>
  compareSyntheticPhysicalItemContinuityV39(v);
const censored=(v:Evidence,code:string)=>{
  const result=check(v);
  expect(result.mandatoryCensor).toBe(true);
  expect(result.errors).toContain(code);
  expect(result.scientificRunAuthorized).toBe(false);
  expect(result.automaticRestorationAuthorized).toBe(false);
};
describe("Phase2G synthetic physical-v2 post-crash per-item exact science comparison",()=>{
  it("can match all 120 synthetic original per-minute items and eight buckets; still never authorizes science",()=>{
    const r=check(fixture());
    expect(r).toMatchObject({
      itemEvidenceConsistent:true,mandatoryCensor:false,
      expectedItemCount:120,observedItemCount:120,
      confirmedOperatorPhysicalCount:120,
      sourceBuckets:[15,15,15,15,15,15,15,15],
      errors:[],scientificRunAuthorized:false,
      automaticRestorationAuthorized:false
    });
  });
  it("post-crash empty UNLOGGED items with retained source witnesses MUST censor",()=>{
    const v=fixture();v.observedRuntimeRows=[];
    censored(v,"MISSING_PHYSICAL_ITEM_AFTER_CRASH");
    expect(check(v).errors).toContain("PHYSICAL_ITEM_LEDGER_COUNT_DIFFERENT");
  });
  it("one missing physical row out of 120 cannot pass",()=>{
    const v=fixture();v.observedRuntimeRows.splice(59,1);
    censored(v,"MISSING_PHYSICAL_ITEM_AFTER_CRASH");
  });
  it("equal 120 total but one wrong delivery/item identity is still rejected",()=>{
    const v=fixture();v.observedRuntimeRows[35].deliveryId="fictional-different-delivery";
    censored(v,"UNEXPECTED_PHYSICAL_ITEM_IDENTITY");
    expect(check(v).errors).toContain("MISSING_PHYSICAL_ITEM_AFTER_CRASH");
    expect(check(v).expectedItemCount).toBe(check(v).observedItemCount);
  });
  it("altering physical-v2 key or airline/flight number cannot be masked by equal counts",()=>{
    const v=fixture();v.observedRuntimeRows[20].flightInstanceId="wrong-physical-leg";
    censored(v,"PHYSICAL_V2_IDENTITY_OR_DISPOSITION_CHANGED");
    const w=fixture();w.observedRuntimeRows[10].operatingFlightNumber="999";
    censored(w,"PHYSICAL_V2_IDENTITY_OR_DISPOSITION_CHANGED");
  });
  it("original raw flight item digest mismatch refuses reconstruction",()=>{
    const v=fixture();v.observedRuntimeRows[1].rawItemSha256="f".repeat(64);
    censored(v,"ORIGINAL_FLIGHT_ITEM_HASH_MISMATCH");
  });
  it("replayed received UTC shifted by one minute cannot silently move buckets",()=>{
    const v=fixture();
    v.observedRuntimeRows[14].originalEdgeReceivedUtc=at(16);
    censored(v,"ORIGINAL_FLIGHT_ITEM_UTC_SHIFTED");
    expect(check(v).errors).toContain("PHYSICAL_V2_IDENTITY_OR_DISPOSITION_CHANGED");
  });
  it("codeshare/operator misclassification or incomplete physical confirmation fails exact comparison",()=>{
    const v=fixture();v.observedRuntimeRows[0].codeshareResolutionStatus="quarantined";
    censored(v,"PHYSICAL_V2_IDENTITY_OR_DISPOSITION_CHANGED");
    const w=fixture();
    w.expectedWitnesses[2]={
      ...w.expectedWitnesses[2],identityResolutionStatus:"resolved",
      codeshareResolutionStatus:"quarantined"
    };
    censored(w,"PHYSICAL_V2_OPERATOR_PROOF_INCOMPLETE");
  });
  it("duplicates or unknown item entries cannot pass even when source count correct",()=>{
    const v=fixture();
    v.observedRuntimeRows.push({...v.observedRuntimeRows[0]});
    censored(v,"DUPLICATE_OBSERVED_ITEM_IDENTITY");
    const w=fixture();w.expectedWitnesses.push({...w.expectedWitnesses[0]});
    censored(w,"DUPLICATE_EXPECTED_ITEM_IDENTITY");
  });
  it("source outside frozen window and wrong session always censored",()=>{
    const v=fixture();v.expectedWitnesses[0]={
      ...v.expectedWitnesses[0],originalEdgeReceivedUtc:END
    };
    censored(v,"ITEM_OUTSIDE_FROZEN_SOURCE_WINDOW");
    const w=fixture();w.observedRuntimeRows[0].sessionId=
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    censored(w,"OBSERVED_PHYSICAL_ITEM_SCHEMA_OR_SESSION_INVALID");
  });
  it("source or owner evidence cannot be represented as certified merely by row equality",()=>{
    const v=fixture();v.independentSourceEvidenceAuthenticated=false;
    censored(v,"SOURCE_ITEM_WITNESS_NOT_INDEPENDENTLY_AUTHENTICATED");
    const w=fixture();w.independentOwnerFreezeAuthenticated=false;
    censored(w,"OWNER_SCIENTIFIC_FREEZE_NOT_INDEPENDENTLY_AUTHENTICATED");
  });
  it("rejects a 119-minute frozen window despite 120 item rows",()=>{
    const v=fixture();v.windowEndUtc=at(119);
    censored(v,"FROZEN_SCIENTIFIC_SESSION_OR_WINDOW_INVALID");
  });
});