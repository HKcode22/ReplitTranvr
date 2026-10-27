import {describe,expect,it} from "vitest";
import {aggregateGate05FidsPairV39}
  from "../server/lib/disruption/gate05FidsAggregateEvidence_v39";
import {reviewGate05ProspectiveLabelSourceV39,summarizeGate05NestedTimePresenceV39}
  from "../server/lib/disruption/gate05ProspectiveLabelSourceReview_v39";

const bounds={
  requestedAirportIcao:"WSSS",startUtc:"2026-10-27T04:00:00Z",
  endUtc:"2026-10-27T04:10:00Z"
};
const departure={
  number:"SQ123",codeshareStatus:"IsOperator",quality:["Live"],
  departure:{
    scheduledTime:{utc:"2026-10-27T04:05:00Z"},
    runwayTime:{utc:"2026-10-27T04:08:00Z"}
  },
  arrival:{airport:{icao:"WADD"}}
};
const pair=aggregateGate05FidsPairV39([departure],[departure],bounds);
const uncertain={
  actualWheelsOff:"FIDS_ACTUAL_OR_ESTIMATED" as const,
  scheduledWheelsOff:"GENERAL_SCHEDULED_DEPARTURE" as const,
  forecastCutoffAsOf:"NO_SOURCE_AS_OF_PROOF" as const,
  operatingFlightIdentity:"PROVISIONAL_FIDS_CODESHARE" as const,
  evidenceReferenceIds:["AERODATABOX-FIDS-CONTRACT"],
};
describe("Gate05 source review guard: provider responses and synthetics are NOT runway-delay truth",()=>{
  it("does not certify actual runway time from Live quality or populated runwayTime",()=>{
    const out=reviewGate05ProspectiveLabelSourceV39(pair,uncertain);
    expect(out.runwayTimestampPresentAcrossVariants).toBe(2);
    expect(out.scheduledTimestampPresentAcrossVariants).toBe(2);
    expect(out.status).toBe("NEEDS_SEMANTIC_OR_ASOF_EVIDENCE");
    expect(out.blockers).toContain("ACTUAL_WHEELS_OFF_NOT_SOURCE_VERIFIED");
    expect(out.blockers).toContain("SCHEDULED_WHEELS_OFF_BASELINE_UNVERIFIED");
    expect(out.blockers).toContain("FEATURE_AS_OF_CUTOFF_T_UNKNOWN");
    expect(out.blockers).toContain("CANONICAL_FLIGHT_IDENTITY_UNKNOWN");
    expect(out.actualRunwayDelayLabelProven).toBe(false);
    expect(out.newPaidPilotAuthorized).toBe(false);
    expect(out.providerRequests).toBe(0);
  });
  it("even with alleged cited source semantics, only permits HUMAN review, not paid launch",()=>{
    const out=reviewGate05ProspectiveLabelSourceV39(pair,{
      actualWheelsOff:"EXTERNALLY_VERIFIED_ACTUAL_RUNWAY_EVENT",
      scheduledWheelsOff:"INDEPENDENT_SCHEDULED_RUNWAY_REFERENCE",
      forecastCutoffAsOf:"SOURCE_TIMESTAMPED_BEFORE_T",
      operatingFlightIdentity:"INDEPENDENT_OPERATING_LEG",
      evidenceReferenceIds:["EXTERNAL-DOCUMENT-0001","LICENSED-LABEL-AUDIT-0002"]
    });
    expect(out.status).toBe("READY_FOR_HUMAN_SOURCE_REVIEW");
    expect(out.referencesIndependentlyVerified).toBe(false);
    expect(out.actualRunwayDelayLabelProven).toBe(false);
    expect(out.newPaidPilotAuthorized).toBe(false);
  });
  it("does not invent field coverage if examples contain no time fields",()=>{
    const blanks=aggregateGate05FidsPairV39([
      {departure:{},arrival:{}}
    ],[],bounds);
    const out=reviewGate05ProspectiveLabelSourceV39(blanks,{
      actualWheelsOff:"EXTERNALLY_VERIFIED_ACTUAL_RUNWAY_EVENT",
      scheduledWheelsOff:"INDEPENDENT_SCHEDULED_RUNWAY_REFERENCE",
      forecastCutoffAsOf:"SOURCE_TIMESTAMPED_BEFORE_T",
      operatingFlightIdentity:"INDEPENDENT_OPERATING_LEG",
      evidenceReferenceIds:["EXTERNAL-DOCUMENT-0001","LICENSED-LABEL-AUDIT-0002"]
    });
    expect(out.status).toBe("NEEDS_REAL_RESPONSE_FIELD_COVERAGE");
    expect(out.newPaidPilotAuthorized).toBe(false);
  });
  it("rejects nonexistent or malformed evidence descriptions",()=>{
    expect(()=>reviewGate05ProspectiveLabelSourceV39(pair,{
      ...uncertain,evidenceReferenceIds:[""]
    })).toThrow("GATE05_SOURCE_REVIEW_INVALID_INPUT");
  });
});

describe("Future separately authorized FIDS nested timing counts — privacy-safe and fixture-only",()=>{
  it("summarizes nested time presence but never claims runway actual or persists records",()=>{
    const rows=[
      {number:"SQ999",departure:{
        scheduledTime:{utc:"2026-10-27T04:05:00Z"},
        revisedTime:{utc:"2026-10-27T04:07:00Z"},
        runwayTime:{utc:"2026-10-27T04:08:00Z"}
      },location:{lat:1.23,lon:2.34}},
      {number:"SQ998",departure:{scheduledTime:{utc:"2026-10-27T04:09:00Z"}}},
      {number:"SQ997",departure:{runwayTime:{utc:""}}},
      null
    ];
    const result=summarizeGate05NestedTimePresenceV39(rows);
    expect(result.responseObjects).toBe(4);
    expect(result.malformedObjects).toBe(1);
    expect(result.scheduledTimeUtcFieldsPresent).toBe(2);
    expect(result.revisedTimeUtcFieldsPresent).toBe(1);
    expect(result.runwayTimeUtcFieldsPresent).toBe(1);
    expect(result.actualWheelsOffProven).toBe(false);
    expect(result.scheduledWheelsOffProven).toBe(false);
    expect(result.eventAsOfTProven).toBe(false);
    expect(result.rawProviderRecordsPersisted).toBe(false);
    expect(result.providerRequests).toBe(0);
    const serialized=JSON.stringify(result);
    expect(serialized).not.toContain("SQ999");
    expect(serialized).not.toContain("2026-10-27T04:05");
    expect(serialized).not.toContain("1.23");
  });
  it("rejects malformed response arrays and cannot promote empty observations",()=>{
    expect(()=>summarizeGate05NestedTimePresenceV39(null))
      .toThrow("GATE05_NESTED_FIELDS_INVALID_RESPONSE");
    expect(summarizeGate05NestedTimePresenceV39([]).actualWheelsOffProven)
      .toBe(false);
  });
});
