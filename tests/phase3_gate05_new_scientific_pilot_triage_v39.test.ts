import {describe,it,expect} from "vitest";
import {triageGate05NewScientificPilotV39,
  type Gate05NewPilotReviewV39} from
  "../server/lib/disruption/gate05NewScientificPilotTriage_v39";
import {DEFAULT_GATE_05_CRITERIA} from "../server/lib/disruption/gates_v3";

const base=():Gate05NewPilotReviewV39=>({
  frozenAtUtc:"2026-10-27T18:00:00Z",
  firstPaidActionAtUtc:"2026-10-27T19:00:00Z",
  lastObservationAtUtc:"2026-10-27T20:00:00Z",
  criteria:{...DEFAULT_GATE_05_CRITERIA},
  measurements:{
    notificationsReceived:100,uniqueFlights:50,completedFlights:20,
    airborneFlights:30,airbornePoints:100,pilotDurationMinutes:60,
    payloadFieldInventory:true,providerTimestampSemantics:true,
    tConstructibility:true,primaryTargetConstructibility:true,
    fidsMaxRange:true,fidsBoundaryBehavior:true,withLegBehavior:true,
    codeshareAmbiguity:true,observationCadence:true,
    trajectoryCompleteness:true,arrivalNotificationLatency:true,
    censoringGrace:true,rateLimit:true,unsettledAlertCreditBurst:true
  },
  rawBefore2xxEvidencePresent:true,
  exactProviderSubscriptionStopEvidencePresent:true,
  sourceAuthenticatedMilestoneEvidencePresent:true,
  independentlyAuditedOperatingLegIdentityPresent:true,
  perObservationRunwayActualityEvidencePresent:true
});

describe("new Gate05 paid pilot: proper f8 PASS/insufficient/FAIL triage, no provider",()=>{
  it("numerically adequate reported counts ONLY authorize independent source audit",()=>{
    const z=triageGate05NewScientificPilotV39(base());
    expect(z.status).toBe("READY_FOR_INDEPENDENT_SOURCE_AUDIT");
    expect(z.provenFullScientificGate05Pass).toBe(false);
    expect(z.newPaidAuthorizationGranted).toBe(false);
    expect(z.providerRequests).toBe(0);
  });
  it("sampling under frozen minimums is insufficient, not semantic FAIL",()=>{
    const x=base();x.measurements.notificationsReceived=99;
    x.measurements.completedFlights=18;
    const z=triageGate05NewScientificPilotV39(x);
    expect(z.status).toBe("INSUFFICIENT_SAMPLE");
    expect(z.missingSampleMinima).toEqual(["notificationsReceived","completedFlights"]);
    expect(z.failedScientificChecks).toEqual([]);
    expect(z.provenFullScientificGate05Pass).toBe(false);
  });
  it("even huge sample never cures missing runway actual vs estimated proof",()=>{
    const x=base();x.measurements.notificationsReceived=1000;
    x.perObservationRunwayActualityEvidencePresent=false;
    const z=triageGate05NewScientificPilotV39(x);
    expect(z.status).toBe("FAIL");
    expect(z.failedScientificChecks).toContain("RUNWAY_ACTUALITY_UNVERIFIED");
  });
  it("freezes minima BEFORE first paid action; forbids backdating",()=>{
    const x=base();x.frozenAtUtc=x.firstPaidActionAtUtc;
    const z=triageGate05NewScientificPilotV39(x);
    expect(z.status).toBe("FAIL");
    expect(z.failedScientificChecks).toContain("FREEZE_MUST_PRECEDE_PAID_ACTION");
  });
  it("truthy strings/undefined never turn a scientific flag into a pass",()=>{
    const x=base();
    (x as unknown as Record<string,unknown>).sourceAuthenticatedMilestoneEvidencePresent="true";
    expect(()=>triageGate05NewScientificPilotV39(x)).toThrow("GATE05_RETEST_INVALID_FLAG_sourceAuthenticatedMilestoneEvidencePresent");
  });
  it("PRE future runway absence cannot count as verified outcome",()=>{
    const x=base();x.measurements.primaryTargetConstructibility=false;
    const z=triageGate05NewScientificPilotV39(x);
    expect(z.status).toBe("FAIL");
    expect(z.failedScientificChecks).toContain("primaryTargetConstructibility");
    expect(z.actualSampleMinimumsSatisfied).toBe(true);
  });
});
