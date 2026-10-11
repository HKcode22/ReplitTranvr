import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {
  signSyntheticIrregularTraceV39,
  evaluateSyntheticIrregularTwoHourTraceV39,
  type SyntheticTracePlanV39,
  type SyntheticObservedAttemptV39,
  type SyntheticPhysicalObservationV39,
} from "../experiments/phase2g_rehearsal/synthetic_120min_irregular_trace_v39";

const KEY="fictional-independent-sender-trace-key-".padEnd(75,"k");
const START=Date.parse("2026-10-12T03:00:00.000Z");
const stamp=(b:number,m=0)=>new Date(START+b*15*60_000+m*60_000).toISOString();
const sha=(s:string)=>createHash("sha256").update(s).digest("hex");
const distribution=[7,0,8,0,0,4,1,2];
const sessionId="12345678-1234-4234-8234-123456789abc";
function baseline(){
  const senders:{attemptId:string;providerAttemptUtc:string;wireSha256:string;billedCredits:0|1}[]=[];
  const observations:SyntheticObservedAttemptV39[]=[];
  for(let b=0;b<8;b++){
    for(let k=0;k<distribution[b];k++){
      const index=senders.length;
      const id="synthetic-bursty-"+index;
      const edgeUtc=stamp(b,k%14);
      senders.push({attemptId:id,providerAttemptUtc:edgeUtc,
        wireSha256:sha(id+"-wire"),billedCredits:1});
      observations.push({
        attemptId:id,originalEdgeReceivedUtc:edgeUtc,
        originalWireSha256:sha(id+"-wire"),
        storedCanonicalSha256:sha(id+"-canonical"),
        senderStatus:200,senderElapsedMs:200,edgeWasDurable:true,
        internalCommitCredits:1,rawRetentionHours:168
      });
    }
  }
  const sourceItems:SyntheticPhysicalObservationV39[]=[
    {attemptId:"synthetic-bursty-0",itemIndex:0,flightInstanceId:"F-0",
      resolution:"resolved_operator",sourceItemSha256:sha("item0")},
    {attemptId:"synthetic-bursty-1",itemIndex:0,flightInstanceId:"F-1",
      resolution:"resolved_operator",sourceItemSha256:sha("item1")},
    {attemptId:"synthetic-bursty-2",itemIndex:0,flightInstanceId:"F-0",
      resolution:"resolved_operator",sourceItemSha256:sha("retimed-F0")},
    {attemptId:"synthetic-bursty-3",itemIndex:0,flightInstanceId:null,
      resolution:"quarantined",sourceItemSha256:sha("marketing")},
    {attemptId:"synthetic-bursty-7",itemIndex:0,flightInstanceId:"F-2",
      resolution:"resolved_operator",sourceItemSha256:sha("item7")},
    {attemptId:"synthetic-bursty-8",itemIndex:0,flightInstanceId:"F-2",
      resolution:"resolved_operator",sourceItemSha256:sha("retimed-F2")},
    {attemptId:"synthetic-bursty-15",itemIndex:0,flightInstanceId:"F-3",
      resolution:"resolved_operator",sourceItemSha256:sha("item15")},
    {attemptId:"synthetic-bursty-19",itemIndex:0,flightInstanceId:"F-4",
      resolution:"resolved_operator",sourceItemSha256:sha("item19")}
  ];
  const plan:SyntheticTracePlanV39={
    schema:"v39.phase2g-synthetic-irregular-trace.v2",
    mode:"synthetic-only",sessionId,startUtc:stamp(0),endUtc:stamp(8),
    senderAttempts:senders,
    expectedFirstPhysicalIdsBy15m:[
      ["F-0","F-1"],[],["F-2"],[],[],["F-3"],["F-4"],[]
    ]
  };
  return {
    signedPlan:signSyntheticIrregularTraceV39(plan,KEY),
    independentSenderKey:KEY,actualElapsedMinutes:120,
    minuteHeartbeatIndices:[...Array(120).keys()],
    providerCalls:0,realProviderCredits:0,cloudResourceMutations:0,
    scientificDatabaseWrites:0,ownerExitedCleanly:true,
    cleanupVerified:true,observedAttempts:observations,
    observedPhysicalItems:sourceItems
  };
}
function hasError(input:ReturnType<typeof baseline>,reason:string){
  const r=evaluateSyntheticIrregularTwoHourTraceV39(input);
  expect(r.passOnlySyntheticEvidence).toBe(false);
  expect(r.errors).toContain(reason);
  expect(r.actualPaidScientificGoAuthorized).toBe(false);
}
describe("P20 frozen independent irregular 120min sender trace vs physical-v2 science",()=>{
  it("accepts only TEST-ONLY 22 bursty callbacks with entire zero-traffic bins and 5 first physical legs",()=>{
    const r=evaluateSyntheticIrregularTwoHourTraceV39(baseline());
    expect(r).toMatchObject({
      passOnlySyntheticEvidence:true,actualPaidScientificGoAuthorized:false,
      errors:[],callbackArrivalCounts15m:distribution,
      distinctFirstPhysicalFlightCounts15m:[2,0,1,0,0,1,1,0],
      sentSyntheticCredits:22,internallyCommittedSyntheticCredits:22
    });
    expect(r.callbackArrivalCounts15m).not.toEqual(r.distinctFirstPhysicalFlightCounts15m);
  });
  it("does not confuse a valid 15-minute quiet interval with missing minute-level owner heartbeat",()=>{
    const input=baseline();input.minuteHeartbeatIndices.splice(36,1);
    hasError(input,"P20_OWNER_HEARTBEAT_GAP");
  });
  it("refuses a missing sender callback even when the observed bins are allowed to be sparse",()=>{
    const a=baseline();a.observedAttempts.splice(9,1);
    hasError(a,"P20_SYNTHETIC_SENDER_EDGE_OR_SQL_DELIVERY_MISSING");
  });
  it("refuses a one-credit internal gap even with all source objects present",()=>{
    const a=baseline();a.observedAttempts[11]={...a.observedAttempts[11],internalCommitCredits:0};
    const r=evaluateSyntheticIrregularTwoHourTraceV39(a);
    expect(r.sentSyntheticCredits).toBe(22);
    expect(r.internallyCommittedSyntheticCredits).toBe(21);
    expect(r.errors).toContain("P20_SENDER_INTERNAL_CREDIT_GAP");
    expect(r.errors).toContain("P20_CREDIT_PER_ATTEMPT_MISMATCH");
  });
  it("refuses a forged independently frozen sender schedule after signature verification",()=>{
    const a=baseline();
    const altered={...a.signedPlan.plan,
      senderAttempts:[...a.signedPlan.plan.senderAttempts].slice(1)};
    expect(()=>evaluateSyntheticIrregularTwoHourTraceV39({
      ...a,signedPlan:{...a.signedPlan,plan:altered}
    })).toThrow("P20_INDEPENDENT_TRACE_SIGNATURE_INVALID");
  });
  it("refuses changed wire bytes or shifted original edge UTC, regardless of internal 200",()=>{
    const a=baseline();
    a.observedAttempts[4]={...a.observedAttempts[4],originalWireSha256:sha("false-wire")};
    hasError(a,"P20_WIRE_OR_CANONICAL_SHA_MISMATCH");
    const b=baseline();
    b.observedAttempts[4]={...b.observedAttempts[4],originalEdgeReceivedUtc:stamp(8)};
    hasError(b,"P20_EDGE_RECEIPT_OUTSIDE_FROZEN_WINDOW");
  });
  it("a marketing item cannot count toward physical operating-flight yield",()=>{
    const a=baseline();
    a.observedPhysicalItems[3]={...a.observedPhysicalItems[3],flightInstanceId:"FAKE_MARKETING"};
    hasError(a,"P20_QUARANTINED_ITEM_COUNTED_AS_PHYSICAL");
  });
  it("an extra or incorrect physical-v2 first identity changes the frozen science trace",()=>{
    const a=baseline();
    a.observedPhysicalItems[5]={...a.observedPhysicalItems[5],flightInstanceId:"FAKE_F2_SPLIT"};
    hasError(a,"P20_PHYSICAL_FIRST_OBSERVATION_TRACE_MISMATCH");
  });
  it("rejects late sender 2xx and source raw retention shorter than 168h",()=>{
    const a=baseline();
    a.observedAttempts[12]={...a.observedAttempts[12],senderElapsedMs:10_001};
    hasError(a,"P20_UPSTREAM_SENDER_ACK_DEADLINE_NOT_MET");
    const b=baseline();
    b.observedAttempts[12]={...b.observedAttempts[12],rawRetentionHours:24};
    hasError(b,"P20_RAW_CUSTODY_OR_RETENTION_NOT_PROVEN");
  });
  it("rejects stopped owner at 119 minutes, failed cleanup and nonzero provider activity",()=>{
    const a=baseline();a.actualElapsedMinutes=119;
    hasError(a,"P20_120_REAL_MINUTES_NOT_OBSERVED");
    const b=baseline();b.cleanupVerified=false;
    hasError(b,"P20_OWNER_TERMINAL_CLEANUP_NOT_PROVED");
    const c=baseline();c.providerCalls=1;
    hasError(c,"P20_NONZERO_EXTERNAL_COST_OR_SCIENTIFIC_DB_MUTATION");
  });
  it("refuses duplicate attempt and duplicate physical item evidence",()=>{
    const a=baseline();a.observedAttempts.push({...a.observedAttempts[0]});
    hasError(a,"P20_DUPLICATE_OBSERVED_PROVIDER_ATTEMPT");
    const b=baseline();b.observedPhysicalItems.push({...b.observedPhysicalItems[0]});
    hasError(b,"P20_PHYSICAL_ITEM_DUPLICATED_OR_INVALID");
  });
  it("refuses a fake 120m plan with repeated physical ID across declared buckets",()=>{
    const a=baseline();
    const invalid={...a.signedPlan.plan,
      expectedFirstPhysicalIdsBy15m:[
        ["F-0","F-1"],[],["F-2"],[],[],["F-0"],["F-4"],[]
      ]};
    expect(()=>signSyntheticIrregularTraceV39(invalid,KEY))
      .toThrow("P20_FROZEN_PHYSICAL_DUPLICATE_OR_INVALID");
  });
});
