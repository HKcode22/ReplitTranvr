import {describe,it,expect} from "vitest";
import {censusGate05ObservedPilotV39, type Gate05ObservedPilotV39,
  type Gate05RawItemV39} from "../server/lib/disruption/gate05ObservedSampleCensus_v39";

const H="a".repeat(64);
const time=(min:number)=>new Date(Date.parse("2026-10-29T00:00:00Z")+min*60000).toISOString();
const sample=(overrides:Partial<Gate05RawItemV39>={}):Gate05RawItemV39=>({
  envelopeId:"envelope_00001",itemOrdinal:0,rawSha256:H,
  receivedAtUtc:time(5),rawDurableAtUtc:time(5),
  http2xxAtUtc:time(5),physicalFlightId:"flight_instance_001",
  identityBasis:"VERIFIED_OPERATING_LEG",codeshareRole:"OPERATOR",
  flightStage:"AIRBORNE",airbornePointUtc:time(4),
  terminalStateUpdatedAtUtc:null,...overrides
});
const pilot=(items:Gate05RawItemV39[],stop=60):Gate05ObservedPilotV39=>({
  frozenAtUtc:"2026-10-28T23:00:00Z",
  observedSubscriptionStartUtc:time(0),
  exactProviderDeletionVerifiedAtUtc:time(stop),
  plannedEndUtc:time(60),
  evidenceSourceReviewed:true,items
});

describe("Gate05 source-item census, independent offline verification only",()=>{
  it("deduplicates operating flights and location samples; never automatically certifies Gate05",()=>{
    const data:Gate05RawItemV39[]=[];
    let envelope=0;
    for(let i=0;i<30;i++){
      for(let k=0;k<4;k++){
        data.push(sample({
          envelopeId:"env_"+String(++envelope).padStart(8,"0"),
          physicalFlightId:"verified_operating_"+String(i).padStart(3,"0"),
          airbornePointUtc:time(k+1)
        }));
      }
    }
    for(let i=30;i<50;i++){
      data.push(sample({
        envelopeId:"env_"+String(++envelope).padStart(8,"0"),
        physicalFlightId:"verified_operating_"+String(i).padStart(3,"0"),
        flightStage:"COMPLETED",airbornePointUtc:null,
        terminalStateUpdatedAtUtc:time(4)
      }));
    }
    const s=censusGate05ObservedPilotV39(pilot(data));
    expect(s.status).toBe("SAMPLE_ONLY_NEEDS_SOURCE_AUDIT");
    expect(s.rawBefore2xxItems).toBe(140);
    expect(s.sourceQualifiedPhysicalFlights).toBe(50);
    expect(s.sourceQualifiedCompletedFlights).toBe(20);
    expect(s.sourceQualifiedAirborneFlights).toBe(30);
    expect(s.uniqueUsableAirbornePoints).toBe(120);
    expect(s.airborneGapSeconds).toEqual({count:90,median:60,p95:60,maximum:60});
    expect(s.terminalReceiptLatencySeconds).toEqual({count:20,median:60,p95:60,maximum:60});
    expect(s.deficits).toEqual([]);
    expect(s.strictSciencePassed).toBe(false);
    expect(s.independentPhysicalIdentityConfirmed).toBe(false);
    expect(s.actualWheelsOffSourceConfirmed).toBe(false);
    expect(s.providerCalls).toBe(0);
    expect(s.databaseWrites).toBe(0);
  });
  it("rejects a right-truncated run even when observation count is otherwise large",()=>{
    const s=censusGate05ObservedPilotV39(pilot([],254/60));
    expect(s.status).toBe("STOPPED_EARLY");
    expect(s.observedDurationMinutes).toBeCloseTo(254/60,3);
    expect(s.deficits).toContain("EXACT_OBSERVED_SUBSCRIPTION_DURATION_LT_60_MIN");
    expect(s.strictSciencePassed).toBe(false);
  });
  it("counts an operator once, excludes marketing and unknown identities",()=>{
    const s=censusGate05ObservedPilotV39(pilot([
      sample({envelopeId:"envelope_00001"}),
      sample({envelopeId:"envelope_00002",codeshareRole:"MARKETING"}),
      sample({envelopeId:"envelope_00003",identityBasis:"PROVISIONAL"}),
      sample({envelopeId:"envelope_00004",physicalFlightId:null}),
    ]));
    expect(s.itemFacts).toBe(4);
    expect(s.sourceQualifiedPhysicalFlights).toBe(1);
    expect(s.uniqueUsableAirbornePoints).toBe(1);
    expect(s.marketingOrUnverifiedItems).toBe(3);
  });
  it("a repeated physical point isn't a distinct trajectory observation",()=>{
    const s=censusGate05ObservedPilotV39(pilot([
      sample({envelopeId:"envelope_00001"}),
      sample({envelopeId:"envelope_00002"}),
    ]));
    expect(s.rawBefore2xxItems).toBe(2);
    expect(s.uniqueUsableAirbornePoints).toBe(1);
    expect(s.airborneGapSeconds.count).toBe(0);
    expect(s.airborneGapSeconds.p95).toBeNull();
  });
  it("raw persisted after HTTP 2xx cannot pass raw-first custody",()=>{
    const s=censusGate05ObservedPilotV39(pilot([
      sample({rawDurableAtUtc:"2026-10-29T00:05:02Z",
        http2xxAtUtc:"2026-10-29T00:05:01Z"})
    ]));
    expect(s.rawBefore2xxItems).toBe(0);
    expect(s.missingRawAckProofItems).toBe(1);
    expect(s.deficits).toContain("RECEIVED_NOTIFICATION_ITEMS_LT_100");
    expect(s.integrityFindings).toContain("RAW_BEFORE_2XX_ITEM_ACK_PROOF_INCOMPLETE");
  });
  it("does not count a stale or future-dated airborne point",()=>{
    const s=censusGate05ObservedPilotV39(pilot([
      sample({envelopeId:"envelope_00001",airbornePointUtc:time(-5)}),
      sample({envelopeId:"envelope_00002",airbornePointUtc:time(10)}),
      sample({envelopeId:"envelope_00003",airbornePointUtc:time(2)})
    ]));
    expect(s.malformedOrStaleAirbornePointItems).toBe(2);
    expect(s.uniqueUsableAirbornePoints).toBe(1);
  });
  it("preserves post-STOP late receipt separately, without restoring observed paid minutes",()=>{
    const s=censusGate05ObservedPilotV39(pilot([
      sample({envelopeId:"envelope_00001",receivedAtUtc:time(63),
        rawDurableAtUtc:time(63),http2xxAtUtc:time(63),
        airbornePointUtc:null,flightStage:"OTHER"})
    ]));
    expect(s.postStopReceivedItemCount).toBe(1);
    expect(s.inWindowReceivedItemCount).toBe(0);
    expect(s.rawBefore2xxItems).toBe(0);
    expect(s.sourceQualifiedPhysicalFlights).toBe(0);
    expect(s.latestPostStopReceiptDelaySeconds).toBe(180);
    expect(s.observedDurationMinutes).toBe(60);
  });
  it("100+ genuine in-window items meet COUNT minimum even if per-item 2xx proofs are unavailable",()=>{
    const rows=Array.from({length:120},(_,i)=>sample({
      envelopeId:"env_"+String(i).padStart(9,"0"),
      http2xxAtUtc:null,rawDurableAtUtc:time(5)
    }));
    const z=censusGate05ObservedPilotV39(pilot(rows));
    expect(z.inWindowReceivedItemCount).toBe(120);
    expect(z.rawBefore2xxItems).toBe(0);
    expect(z.missingRawAckProofItems).toBe(120);
    expect(z.deficits).not.toContain("RECEIVED_NOTIFICATION_ITEMS_LT_100");
    expect(z.integrityFindings)
      .toContain("RAW_BEFORE_2XX_ITEM_ACK_PROOF_INCOMPLETE");
    expect(z.strictSciencePassed).toBe(false);
  });
  it("100+ poststop items do not falsely satisfy the 100-item in-window minimum",()=>{
    const rows=Array.from({length:120},(_,i)=>sample({
      envelopeId:"env_"+String(i).padStart(9,"0"),
      receivedAtUtc:time(62),rawDurableAtUtc:time(62),
      http2xxAtUtc:time(62),flightStage:"OTHER",airbornePointUtc:null
    }));
    const z=censusGate05ObservedPilotV39(pilot(rows));
    expect(z.inWindowReceivedItemCount).toBe(0);
    expect(z.postStopReceivedItemCount).toBe(120);
    expect(z.deficits).toContain("RECEIVED_NOTIFICATION_ITEMS_LT_100");
    expect(z.rawBefore2xxItems).toBe(0);
    expect(z.strictSciencePassed).toBe(false);
  });
  it("rejects duplicate receipt keys instead of overcounting deliveries",()=>{
    const x=sample();
    expect(()=>censusGate05ObservedPilotV39(pilot([x,x])))
      .toThrow("GATE05_CENSUS_DUPLICATE_RECEIPT_KEY");
  });
  it("rejects invalid frozen clock, malformed timestamp and bad SHA before assessment",()=>{
    expect(()=>censusGate05ObservedPilotV39({
      ...pilot([]),frozenAtUtc:time(1)
    })).toThrow("GATE05_CENSUS_IMPOSSIBLE_WINDOW");
    expect(()=>censusGate05ObservedPilotV39(pilot([
      sample({receivedAtUtc:"2026-02-30T00:05:00Z"})
    ]))).toThrow("GATE05_CENSUS_INVALID_UTC_received");
    expect(()=>censusGate05ObservedPilotV39(pilot([
      sample({rawSha256:"notsha"})
    ]))).toThrow("GATE05_CENSUS_INVALID_ITEM");
  });
  it("cannot turn an unreviewed item source into independently audited sample",()=>{
    const s=censusGate05ObservedPilotV39({
      ...pilot([sample()]),evidenceSourceReviewed:false
    });
    expect(s.integrityFindings).toContain("ITEM_SOURCE_NOT_INDEPENDENTLY_REVIEWED");
    expect(s.rawCustodyIndependentlyValidated).toBe(false);
    expect(s.strictSciencePassed).toBe(false);
  });
});
