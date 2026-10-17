import {describe,it,expect} from "vitest";
import {evaluatePhase2gEarlyPilotCloseoutV39 as close,
  type PilotProbeV39} from "../server/lib/disruption/phase2gEarlyPilotCloseout_v39";
const m=(icao:PilotProbeV39["icao"],probeId:number,
 status:string,recon:string,rate:number|null,gap:number,
 tier:PilotProbeV39["researchTier"],verified:boolean|null):PilotProbeV39=>({
  icao,probeId,status,reconciliation:recon,
  metricContract:"v39-physical-flight-instance-v2",durationCensored:false,
  observedSeconds:icao==="YSSY"?7203.639:7200.1,
  officialRowsPerHour:rate,deliveryGapCredits:gap,
  researchTier:tier,verifiedSavedOriginals:verified,
 });
const a=[
 m("WSSS",11,"completed","MATCH",160.4975,0,"A_VERIFIED_PRIMARY",null),
 m("OMAA",12,"completed","MATCH",73.9991,0,"A_VERIFIED_PRIMARY",null),
 m("MMUN",14,"completed","MATCH",22.9996,0,"A_VERIFIED_PRIMARY",null),
 m("SKBO",15,"completed","MATCH",150.4977,0,"A_VERIFIED_PRIMARY",null),
 m("YSSY",19,"failed","DELIVERY_GAP",null,2,"B_DEGRADED_OBSERVED_ONLY",true),
] as const;
const ops={activeBillableSubscriptions:0,incident31Resolved:false,rawSourceDispositionCompleted:false};
describe("Oct-2 amendment early pilot; factual closeout cannot silently change original Gate2",()=>{
 it("five completed fieldwork sites; three original capacity-eligible sites",()=>{
  const r=close(a,ops);
  expect(r.fieldwork).toBe("COMPLETE");
  expect(r.fullDuration).toEqual(["WSSS","OMAA","MMUN","SKBO","YSSY"]);
  expect(r.formallyCapacityEligible).toEqual(["WSSS","OMAA","SKBO"]);
  expect(r.noneligible).toEqual(["MMUN","YSSY"]);
  expect(r.researchQualified).toEqual(["YSSY"]);
  expect(r.researchInventory).toBe("INCLUDED_WITH_EXCEPTIONS");
  expect(r.formalGate2).toMatch(/^HOLD_/);
  expect(r.finalAnchorPoolConfirmed).toBe(false);
  expect(r.historicalProbeStatusesModified).toBe(false);
  expect(r.blockers).toContain("INCIDENT31_UNRESOLVED");
 });
 it("YSSY never inherits official capacity from 229 items / 7203 seconds",()=>{
  expect(close(a,ops).formallyCapacityEligible).not.toContain("YSSY");
 });
 it("conditional Stage2 trigger is NOT a permission for automatic 4h runs",()=>{
  const r=close(a,{...ops,incident31Resolved:true,rawSourceDispositionCompleted:true});
  expect(r.conditionalStage2Trigger).toBe(true);
  expect(r.automaticStage2Authorized).toBe(false);
  expect(r.gate3PaidAuthorized).toBe(false);
  expect(r.phase3OfflinePreparationAllowed).toBe(true);
  expect(r.formalGate2).toMatch(/^HOLD_/);
 });
 it("detects duplicate/absent/invalid/censored or remaining billable",()=>{
  expect(close(a.slice(0,4),ops).fieldwork).toBe("INCOMPLETE");
  expect(close([...a,a[0]],ops).blockers).toContain("DUPLICATE_OR_WRONG_PROBE_ID");
  expect(close(a.map(p=>p.icao==="SKBO"?{...p,durationCensored:true}:p),ops).fieldwork).toBe("INCOMPLETE");
  expect(close(a.map(p=>p.icao==="OMAA"?{...p,metricContract:"legacy"}:p),ops).blockers).toContain("WRONG_IDENTITY_METRIC_CONTRACT");
  expect(close(a,{...ops,activeBillableSubscriptions:1}).blockers).toContain("ACTIVE_OR_UNVERIFIED_PAID_EXPOSURE");
 });
});
