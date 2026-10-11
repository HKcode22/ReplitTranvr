import {describe,it,expect} from "vitest";
import {
  assessP20VariableRateRehearsalV39,
  type P20VariableRateFixtureV39
} from "../experiments/phase2g_rehearsal/variable_rate_wallclock_audit_v39";

const BASE=Date.parse("2026-10-12T03:00:00.000Z");
const utc=(milliseconds:number)=>new Date(BASE+milliseconds).toISOString();
const H="c".repeat(64);
function fixture(minutes:number[]=[0,1,3,3.5,9,15,29,30,31,44,46,47,58,60,62,62.5,70,72,75,88,91,93,94,99,103,105,109,110,115,119]):P20VariableRateFixtureV39{
  const attempts=minutes.map((minute,i)=>({
    attemptId:"attempt-"+i,sentUtc:utc(minute*60_000),
    sourceWireSha256:H,syntheticFlightItems:1,syntheticCostCredits:1,
    senderStatus:200,senderElapsedMs:300
  }));
  const edges=attempts.map(x=>({
    attemptId:x.attemptId,originalUtc:utc(Date.parse(x.sentUtc)-BASE+100),
    sourceWireSha256:H,completeBytesDurablyAccepted:true,
    authenticatedSyntheticReceipt:true,
    observedSyntheticCostCredits:x.syntheticCostCredits
  }));
  const internal=edges.map(x=>({
    attemptId:x.attemptId,originalUtc:x.originalUtc,
    sourceWireSha256:H,rawObjectSha256ReadbackVerified:true,
    rawRetentionHours:168,observedSyntheticCostCredits:x.observedSyntheticCostCredits
  }));
  return {
    mode:"synthetic-only",ownerWindowStartUtc:utc(0),
    ownerWindowEndUtc:utc(7_200_000),
    monotonicStartMs:1500,monotonicEndMs:1500+7_200_000,
    realProviderCalls:0,cloudResourcesCreated:0,scientificDatabaseWrites:0,
    ownerExitedCleanly:true,cleanupAttested:true,
    minutes:Array.from({length:120},(_,minute)=>({
      minute,ownerUtc:utc(minute*60_000),receiverUtc:utc(minute*60_000+125),
      monotonicMs:1500+minute*60_000,receiverReady:true,ownerAlive:true
    })),
    preplannedSenderAttempts:attempts,observedEdgeAttempts:edges,
    observedInternalAttempts:internal
  };
}
function rejects(input:P20VariableRateFixtureV39,code:string){
  const d=assessP20VariableRateRehearsalV39(input);
  expect(d.infrastructureFixtureConsistent).toBe(false);
  expect(d.errors).toContain(code);
}
describe("P20 120m realistic variable-rate rehearsal evidence, no provider/no hosting",()=>{
  it("accepts 30 variable-rate planned notifications over 120 owner heartbeats, not 120 invented webhooks",()=>{
    const r=assessP20VariableRateRehearsalV39(fixture());
    expect(r.infrastructureFixtureConsistent,r.errors.join(",")).toBe(true);
    expect(r.monitoringMinuteBuckets).toEqual([15,15,15,15,15,15,15,15]);
    expect(r.actualSourceBuckets).toEqual([5,2,3,3,5,2,5,5]);
    expect(r.senderAttemptCount).toBe(30);
    expect([r.senderCredits,r.edgeCredits,r.internalCredits]).toEqual([30,30,30]);
    expect(r.scientificPassAuthorized).toBe(false);
    expect(r.wallClockHostContinuityProven).toBe(false);
  });
  it("rejects a 120-minute GET-only soak without even one synthetic callback",()=>{
    const a=fixture([]);
    rejects(a,"P20_NO_SYNTHETIC_CALLBACK_PATH_EXERCISED");
  });
  it("accepts zero callbacks in one 15m interval without inventing science data",()=>{
    const smaller=fixture([0,1,45,61,80,92,119]);
    const r=assessP20VariableRateRehearsalV39(smaller);
    expect(r.infrastructureFixtureConsistent).toBe(true);
    expect(r.actualSourceBuckets).toEqual([2,0,0,1,1,1,1,1]);
    expect(r.scientificPassAuthorized).toBe(false);
  });
  it("refuses 119-minute elapsed witness and a frozen UTC range shorter than 120m",()=>{
    const a=fixture();rejects({...a,monotonicEndMs:a.monotonicStartMs+7_140_000},
      "P20_MONOTONIC_TWO_HOUR_ELAPSED_UNPROVEN");
    const b=fixture();rejects({...b,ownerWindowEndUtc:utc(7_140_000)},
      "P20_FROZEN_120M_WINDOW_INVALID");
  });
  it("refuses a missing/duplicated minute even though every callback was delivered",()=>{
    const a=fixture();rejects({...a,minutes:a.minutes.slice(1)},
      "P20_MINUTE_WITNESSES_INCOMPLETE");
    const b=fixture();const bad=[...b.minutes];bad[57]={...bad[56]};
    rejects({...b,minutes:bad},"P20_MINUTE_DUPLICATE_OR_OUT_OF_RANGE");
  });
  it("refuses clock jumps, monotonic cadence gaps or Replit receiver health failure",()=>{
    const a=fixture();const bad=[...a.minutes];
    bad[59]={...bad[59],monotonicMs:bad[59].monotonicMs+20_000};
    rejects({...a,minutes:bad},"P20_HEARTBEAT_CLOCK_OR_CADENCE_UNVERIFIED");
    const b=fixture();const bad2=[...b.minutes];
    bad2[60]={...bad2[60],receiverReady:false};
    rejects({...b,minutes:bad2},"P20_OWNER_OR_RECEIVER_NOT_READY_AT_MINUTE");
  });
  it("refuses P2G22-like independent sender vs internal 30/29 gap",()=>{
    const a=fixture();const b={...a,observedInternalAttempts:a.observedInternalAttempts.slice(0,-1)};
    const result=assessP20VariableRateRehearsalV39(b);
    expect([result.senderCredits,result.edgeCredits,result.internalCredits]).toEqual([30,30,29]);
    expect(result.errors).toEqual(expect.arrayContaining([
      "P20_PLANNED_SENDER_MISSING_INTERNAL","P20_ATTEMPT_CREDIT_RECONCILIATION_GAP"
    ]));
  });
  it("refuses 503/timed-out sender response even if every internal record committed",()=>{
    const a=fixture();const plan=[...a.preplannedSenderAttempts];
    plan[0]={...plan[0],senderStatus:503,senderElapsedMs:11_001};
    rejects({...a,preplannedSenderAttempts:plan},"P20_PROVIDER_EMULATOR_ACK_FAILURE");
  });
  it("refuses shifted original source UTC, bad SHA or unverified edge custody",()=>{
    const a=fixture();const changed=[...a.observedInternalAttempts];
    changed[0]={...changed[0],originalUtc:utc(70_000)};
    rejects({...a,observedInternalAttempts:changed},"P20_INTERNAL_OBJECT_OR_FIRST_RECEIPT_MISMATCH");
    const b=fixture();const changedEdge=[...b.observedEdgeAttempts];
    changedEdge[1]={...changedEdge[1],completeBytesDurablyAccepted:false};
    rejects({...b,observedEdgeAttempts:changedEdge},"P20_EDGE_SOURCE_BYTES_OR_AUTH_UNVERIFIED");
  });
  it("refuses a source whose receipt is later than independently observed sender ACK",()=>{
    const a=fixture();const bad=[...a.observedEdgeAttempts];
    bad[2]={...bad[2],originalUtc:utc(10*60_000)};
    rejects({...a,observedEdgeAttempts:bad},"P20_EDGE_FIRST_RECEIPT_TIME_INVALID");
  });
  it("refuses duplicate provider attempt and unexpected internal delivery",()=>{
    const a=fixture();rejects({...a,preplannedSenderAttempts:[
      ...a.preplannedSenderAttempts,a.preplannedSenderAttempts[0]
    ]},"P20_SENDER_DUPLICATE_OR_INVALID");
    const b=fixture();const internal=[...b.observedInternalAttempts,{
      ...b.observedInternalAttempts[0],attemptId:"ghost"
    }];
    rejects({...b,observedInternalAttempts:internal},"P20_INTERNAL_WITHOUT_SENDER_AND_EDGE");
  });
  it("refuses shortened raw retention, missing downstream readback, owner shutdown failure",()=>{
    const a=fixture();const items=[...a.observedInternalAttempts];
    items[0]={...items[0],rawRetentionHours:24};
    rejects({...a,observedInternalAttempts:items},"P20_INTERNAL_OBJECT_OR_FIRST_RECEIPT_MISMATCH");
    const b=fixture();rejects({...b,cleanupAttested:false},"P20_OWNER_SHUTDOWN_OR_CLEANUP_UNVERIFIED");
  });
  it("hard-refuses any real provider traffic, scientific DB mutation or cloud provisioning",()=>{
    const a=fixture();rejects({...a,realProviderCalls:1},"P20_NOT_STRICTLY_ZERO_PROVIDER_AND_CLOUD");
    const b=fixture();rejects({...b,cloudResourcesCreated:1},"P20_NOT_STRICTLY_ZERO_PROVIDER_AND_CLOUD");
    const c=fixture();rejects({...c,scientificDatabaseWrites:1},"P20_NOT_STRICTLY_ZERO_PROVIDER_AND_CLOUD");
  });

  it("P14 multi-flight notification can consume three synthetic flight credits in one attempt",()=>{
    const f=fixture();
    const sender=[...f.preplannedSenderAttempts];
    const edge=[...f.observedEdgeAttempts];
    const internal=[...f.observedInternalAttempts];
    sender[10]={...sender[10],syntheticFlightItems:3,syntheticCostCredits:3};
    edge[10]={...edge[10],observedSyntheticCostCredits:3};
    internal[10]={...internal[10],observedSyntheticCostCredits:3};
    const r=assessP20VariableRateRehearsalV39({...f,
      preplannedSenderAttempts:sender,observedEdgeAttempts:edge,
      observedInternalAttempts:internal});
    expect(r.infrastructureFixtureConsistent,r.errors.join(",")).toBe(true);
    expect(r.senderAttemptCount).toBe(30);
    expect([r.senderCredits,r.edgeCredits,r.internalCredits]).toEqual([32,32,32]);
    expect(r.paidLaunchAuthorized).toBe(false);
  });
  it("P14 exact same 30 attempts can hide 32/32/31 item-credit gap unless downstream observed credits are independent",()=>{
    const f=fixture();
    const sender=[...f.preplannedSenderAttempts];
    const edge=[...f.observedEdgeAttempts];
    const internal=[...f.observedInternalAttempts];
    sender[10]={...sender[10],syntheticFlightItems:3,syntheticCostCredits:3};
    edge[10]={...edge[10],observedSyntheticCostCredits:3};
    internal[10]={...internal[10],observedSyntheticCostCredits:2};
    const r=assessP20VariableRateRehearsalV39({...f,
      preplannedSenderAttempts:sender,observedEdgeAttempts:edge,
      observedInternalAttempts:internal});
    expect(r.senderAttemptCount).toBe(30);
    expect([r.senderCredits,r.edgeCredits,r.internalCredits]).toEqual([32,32,31]);
    expect(r.errors).toEqual(expect.arrayContaining([
      "P20_INTERNAL_OBSERVED_CREDIT_MISMATCH",
      "P20_ATTEMPT_CREDIT_RECONCILIATION_GAP"
    ]));
  });
  it("P14 same attempt-count edge credit deficiency must be measured, not copied from sender",()=>{
    const f=fixture();
    const edge=[...f.observedEdgeAttempts];
    edge[4]={...edge[4],observedSyntheticCostCredits:0};
    const r=assessP20VariableRateRehearsalV39({...f,observedEdgeAttempts:edge});
    expect([r.senderCredits,r.edgeCredits,r.internalCredits]).toEqual([30,29,30]);
    expect(r.errors).toEqual(expect.arrayContaining([
      "P20_EDGE_OBSERVED_CREDIT_MISMATCH",
      "P20_ATTEMPT_CREDIT_RECONCILIATION_GAP"
    ]));
  });
  it("P14 sender must not claim zero charged flight items for a nonempty synthetic notification",()=>{
    const f=fixture();
    const sender=[...f.preplannedSenderAttempts];
    sender[0]={...sender[0],syntheticFlightItems:2,syntheticCostCredits:1};
    rejects({...f,preplannedSenderAttempts:sender},"P20_SENDER_FLIGHT_ITEM_CREDIT_MISMATCH");
  });

});
