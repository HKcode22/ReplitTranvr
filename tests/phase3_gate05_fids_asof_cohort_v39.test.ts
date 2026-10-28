import {describe,it,expect} from "vitest";
import {assessGate05FidsAsOfCohortV39,
  type Gate05FidsSnapshotV39} from "../server/lib/disruption/gate05FidsAsOfCohort_v39";

const H="a".repeat(64);
const baseline=():Gate05FidsSnapshotV39=>({
  captureId:"capture_00000001", responseSha256:H,
  availableAtUtc:"2026-10-30T23:00:00Z", // T minus 25 hours
  frozenNativeTAtUtc:"2026-11-01T00:00:00Z",
  nativeTFirstObservedAtUtc:"2026-10-30T22:00:00Z",
  physicalOperatingLegId:"physical_00001",
  physicalIdentity:"VERIFIED_OPERATING_LEG", codeshareRole:"OPERATOR",
  phase:"PRE", scheduledDepartureCandidateUtc:"2026-11-01T00:00:00Z",
  departureRunwayCandidateUtc:null
});
describe("Gate05 per-flight FIDS as-of join, strictly offline",()=>{
  it("uses only durable pre-cutoff response for each requested horizon",()=>{
    const before=baseline();
    const near:Gate05FidsSnapshotV39={
      ...before,captureId:"capture_00000002",
      availableAtUtc:"2026-10-31T23:30:00Z", // 30m before T: too late for all three
      scheduledDepartureCandidateUtc:"2026-11-01T00:05:00Z"
    };
    const post:Gate05FidsSnapshotV39={
      ...before,captureId:"capture_00000003",phase:"POST",
      availableAtUtc:"2026-11-01T03:00:00Z",
      departureRunwayCandidateUtc:"2026-11-01T00:17:00Z"
    };
    const result=assessGate05FidsAsOfCohortV39([before,near,post]);
    for(const h of ["T-24h","T-6h","T-90m"] as const){
      expect(result.perHorizon[h].eligibleLegs).toBe(1);
      expect(result.perHorizon[h].joinedLaterPostLegs).toBe(1);
      expect(result.perHorizon[h].latestEligibleAvailabilityUtc)
        .toBe("2026-10-30T23:00:00.000Z");
      expect(result.perHorizon[h].observedRunwayCandidatePresent).toBe(1);
    }
    expect(result.runwayCandidateProvenActual).toBe(false);
    expect(result.scheduledDepartureProvenWheelsOff).toBe(false);
    expect(result.genuineFlightLevelPredictionCutoffCertified).toBe(false);
    expect(result.strictScientificLabelProven).toBe(false);
    expect(result.providerCalls).toBe(0);
  });
  it("cannot use a paid POST-only snapshot for earlier PRE membership",()=>{
    const p=baseline();
    const z=assessGate05FidsAsOfCohortV39([{
      ...p,phase:"POST",availableAtUtc:"2026-11-01T02:00:00Z",
      departureRunwayCandidateUtc:"2026-11-01T00:12:00Z"
    }]);
    expect(z.retainedSameCohortPostLegs).toBe(0);
    expect(z.postRecordsWithoutMatchedPre).toBe(1);
    expect(z.perHorizon["T-24h"].eligibleLegs).toBe(0);
    expect(z.perHorizon["T-24h"].sourceUnavailableBeforeCutoffLegs).toBe(1);
  });
  it("does not treat different service windows or legs as matched",()=>{
    const a=baseline();
    const b={...a,captureId:"capture_00000002",phase:"POST" as const,
      physicalOperatingLegId:"physical_00002",
      availableAtUtc:"2026-11-01T02:00:00Z"};
    const z=assessGate05FidsAsOfCohortV39([a,b]);
    expect(z.retainedSameCohortPostLegs).toBe(0);
    expect(z.perHorizon["T-24h"].joinedLaterPostLegs).toBe(0);
  });
  it("excludes codeshare marketing responses as separate flight instances",()=>{
    const a=baseline();
    const b={...a,captureId:"capture_00000002",
      codeshareRole:"MARKETING" as const,
      physicalOperatingLegId:"physical_00002"};
    const z=assessGate05FidsAsOfCohortV39([a,b]);
    expect(z.inputObjects).toBe(2);
    expect(z.verifiedOperatingLegCandidates).toBe(1);
    expect(z.marketingOrIdentityUnverifiedObjects).toBe(1);
  });
  it("refuses to join inconsistent frozen T values to an older flight",()=>{
    const a=baseline();
    const b={...a,captureId:"capture_00000002",phase:"POST" as const,
      availableAtUtc:"2026-11-01T02:00:00Z",
      frozenNativeTAtUtc:"2026-11-01T00:30:00Z"};
    const z=assessGate05FidsAsOfCohortV39([a,b]);
    expect(z.conflictingNativeTLegCount).toBe(1);
    expect(z.perHorizon["T-24h"].eligibleLegs).toBe(0);
  });
  it("rejects native T discovered only after the claimed response",()=>{
    expect(()=>assessGate05FidsAsOfCohortV39([{
      ...baseline(),nativeTFirstObservedAtUtc:"2026-10-31T23:10:00Z"
    }])).toThrow("GATE05_FIDS_ASOF_T_AVAILABLE_AFTER_RESPONSE");
  });
  it("rejects duplicate capture+leg+phase, bad UTC and malformed digest",()=>{
    const a=baseline();
    expect(()=>assessGate05FidsAsOfCohortV39([a,a]))
      .toThrow("GATE05_FIDS_ASOF_DUPLICATE_CAPTURE_LEG");
    expect(()=>assessGate05FidsAsOfCohortV39([{
      ...a,availableAtUtc:"2026-02-30T00:00:00Z"
    }])).toThrow("GATE05_FIDS_ASOF_INVALID_UTC_available");
    expect(()=>assessGate05FidsAsOfCohortV39([{
      ...a,responseSha256:"bad"
    }])).toThrow("GATE05_FIDS_ASOF_INVALID_ROW");
  });
});
