import {describe,it,expect} from "vitest";
import {
  assessGate05ExactRunwayDelayV39,
  type Gate05RunwayDelayInputV39
} from "../server/lib/disruption/gate05RunwayDelayLabelAudit_v39";
const base:Gate05RunwayDelayInputV39={
  canonicalOperatingLegVerified:true,targetRecoveryGraceElapsed:true,
  scheduled:{utc:"2026-10-27 08:00Z",
    semanticClass:"VERIFIED_SCHEDULED_WHEELS_OFF",
    externallyAuthenticatedSemantics:true},
  actual:{utc:"2026-10-27T08:12:30Z",
    semanticClass:"VERIFIED_ACTUAL_WHEELS_OFF",
    externallyAuthenticatedSemantics:true}
};
describe("Gate05 exact runway estimand — fail semantic shortcuts, not valid missingness",()=>{
 it("computes signed actual wheels-off minus scheduled wheels-off, not revised gate time",()=>{
   const r=assessGate05ExactRunwayDelayV39(base);
   expect(r.status).toBe("OBSERVED_EXACT_RUNWAY_DELAY");
   expect(r.runwayDelayMinutes).toBe(12.5);
   expect(r.observedTargetCanBeScored).toBe(true);
   expect(r.noProviderIO).toBe(true);
   expect(r.noDatabaseIO).toBe(true);
 });
 it("permits negative delay (early takeoff), not a zero-floor clamp",()=>{
   const r=assessGate05ExactRunwayDelayV39({...base,
     actual:{...base.actual,utc:"2026-10-27T07:51:00Z"}});
   expect(r.runwayDelayMinutes).toBe(-9);
 });
 it("missing WSSS runwayTime is NULL, never zero or blanket flight exclusion",()=>{
   const r=assessGate05ExactRunwayDelayV39({...base,
     actual:{...base.actual,utc:null}});
   expect(r.status).toBe("MISSING_TARGET_EVIDENCE");
   expect(r.runwayDelayMinutes).toBeNull();
   expect(r.otherTargetsUnaffected).toBe(true);
 });
 it("before frozen target-specific grace, missing actual stays pending",()=>{
   const r=assessGate05ExactRunwayDelayV39({...base,
     targetRecoveryGraceElapsed:false,
     actual:{...base.actual,utc:null}});
   expect(r.status).toBe("PENDING_TARGET_EVIDENCE");
 });
 it("estimated runway and generic scheduled departure are both unproven",()=>{
   for(const x of [
     {...base,actual:{...base.actual,semanticClass:"ESTIMATED_RUNWAY" as const}},
     {...base,scheduled:{...base.scheduled,semanticClass:"GENERAL_SCHEDULED_DEPARTURE" as const}},
     {...base,actual:{...base.actual,externallyAuthenticatedSemantics:false}},
     {...base,canonicalOperatingLegVerified:false},
   ]){
      const r=assessGate05ExactRunwayDelayV39(x);
      expect(r.status).toBe("SOURCE_SEMANTICS_UNVERIFIED");
      expect(r.runwayDelayMinutes).toBeNull();
   }
 });
 it("rejects fabricated calendar date or non-UTC offset even if marked verified",()=>{
   for(const utc of ["2026-02-30 08:00Z","2026-10-27T08:00+05:00"]){
     const r=assessGate05ExactRunwayDelayV39({...base,
       actual:{...base.actual,utc}});
     expect(r.runwayDelayMinutes).toBeNull();
     expect(r.status).toBe("SOURCE_SEMANTICS_UNVERIFIED");
   }
 });
});
