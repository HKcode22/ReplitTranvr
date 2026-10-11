import {describe,it,expect} from "vitest";
import {
  evaluateStage1SyntheticRehearsalV39,
  type RehearsalEvidenceV39,
} from "../experiments/phase2g_rehearsal/synthetic_120min_acceptance_v39";

const FROM=Date.parse("2026-10-12T03:00:00.000Z");
const time=(minute:number)=>new Date(FROM+minute*60_000).toISOString();
const SHA="a".repeat(64);
function baseline():RehearsalEvidenceV39{
  const sources=Array.from({length:120},(_,i)=>({
    attemptId:"synthetic-p2g-"+String(i).padStart(3,"0"),
    edgeReceivedUtc:time(i),
    senderResponseStatus:200,
    senderResponseElapsedMs:240,
    sourceSha256:SHA,
    billedSyntheticCredits:1,
    edgeDurable:true
  }));
  return {
    mode:"synthetic_only",activeWindowStartUtc:time(0),activeWindowEndUtc:time(120),
    elapsedActiveMinutes:120,providerCalls:0,realProviderCredits:0,
    cloudResourceMutations:0,scientificDbWrites:0,
    ownerExitedCleanly:true,cleanupVerified:true,
    timelineMinutesObserved:Array.from({length:120},(_,i)=>i),
    expectedSyntheticAttempts:120,
    sources,committed:sources.map(x=>({
      attemptId:x.attemptId,originalEdgeReceivedUtc:x.edgeReceivedUtc,
      sourceSha256:x.sourceSha256,retentionHours:168,
      confirmedOperatorPhysicalId:"phys-synthetic-"+x.attemptId,
      itemDisposition:"resolved_operator" as const
    }))
  };
}
function error(v:RehearsalEvidenceV39,code:string){
  const out=evaluateStage1SyntheticRehearsalV39(v);
  expect(out.safeSyntheticPass).toBe(false);
  expect(out.errorCodes).toContain(code);
}
describe("Phase2G prospective 120-minute NO-CREDIT rehearsal manifest fail-closed contract",()=>{
  it("allows internally consistent 120min synthetic evidence only (NOT proof of live hosting)",()=>{
    const r=evaluateStage1SyntheticRehearsalV39(baseline());
    expect(r.safeSyntheticPass,r.errorCodes.join(",")).toBe(true);
    expect(r.sourceBuckets).toEqual([15,15,15,15,15,15,15,15]);
    expect([r.senderSyntheticCredits,r.internalSyntheticCredits]).toEqual([120,120]);
    expect(r.errorCodes).toEqual([]);
  });
  it("rejects 119-minute owner run and absent minute heartbeat",()=>{
    const a=baseline();a.elapsedActiveMinutes=119;error(a,"INSUFFICIENT_WALLCLOCK_DURATION");
    const b=baseline();b.timelineMinutesObserved.splice(58,1);error(b,"MINUTE_HEARTBEAT_GAP");
  });
  it("rejects missing sender attempt or 260 vs 259 synthetic credit gap",()=>{
    const a=baseline();a.sources.pop();error(a,"MISSING_OR_EXTRA_SOURCE_ATTEMPT");
    const b=baseline();b.sources[0].billedSyntheticCredits=141;
    b.committed.pop();
    const out=evaluateStage1SyntheticRehearsalV39(b);
    expect(out.safeSyntheticPass).toBe(false);
    expect([out.senderSyntheticCredits,out.internalSyntheticCredits]).toEqual([260,259]);
    expect(out.errorCodes).toEqual(expect.arrayContaining([
      "SENDER_INTERNAL_CREDIT_GAP","MISSING_OR_EXTRA_INTERNAL_ATTEMPT"
    ]));
  });
  it("rejects a duplicate internal receipt even if the aggregate credit count could match",()=>{
    const a=baseline();a.committed[1]={...a.committed[0]};
    error(a,"DUPLICATE_INTERNAL_ATTEMPT");
  });
  it("refuses an upstream 503 or late >10s acknowledged sender response",()=>{
    const a=baseline();a.sources[60].senderResponseStatus=503;
    error(a,"SENDER_ACK_NOT_WITHIN_DEADLINE");
    const b=baseline();b.sources[59].senderResponseElapsedMs=10_001;
    error(b,"SENDER_ACK_NOT_WITHIN_DEADLINE");
  });
  it("refuses unverified edge durable admission and changed original replay timestamp",()=>{
    const a=baseline();a.sources[40].edgeDurable=false;error(a,"UNPROVEN_EDGE_DURABILITY");
    const b=baseline();b.committed[60].originalEdgeReceivedUtc=time(61);
    error(b,"ORIGINAL_SOURCE_TIME_SHIFTED");
  });
  it("rejects a raw SHA mismatch, 24h-only raw evidence and missing confirmed physical flight identity",()=>{
    const a=baseline();a.committed[1].sourceSha256="b".repeat(64);
    error(a,"RAW_SHA_MISMATCH");
    const b=baseline();b.committed[3].retentionHours=24;
    error(b,"RAW_RETENTION_CONTRACT_INVALID");
    const c=baseline();c.committed[4].itemDisposition="quarantined";
    c.committed[4].confirmedOperatorPhysicalId=null;
    error(c,"PHYSICAL_V2_OPERATOR_NOT_CONFIRMED");
  });
  it("fails if source arrives after frozen 120-minute window or 15-minute buckets are imbalanced",()=>{
    const a=baseline();a.sources[119].edgeReceivedUtc=time(120);
    error(a,"SOURCE_OUTSIDE_FROZEN_WINDOW");
    const b=baseline();b.sources[15].edgeReceivedUtc=time(14);
    b.committed[15].originalEdgeReceivedUtc=time(14);
    error(b,"REHEARSAL_SAMPLE_BUCKET_INCOMPLETE");
  });
  it("never passes synthetic trial with real provider credits, scientific DB writes or cloud resource provisioning",()=>{
    const a=baseline();a.providerCalls=1;error(a,"REAL_PROVIDER_ACTIVITY");
    const b=baseline();b.scientificDbWrites=1;error(b,"EXTERNAL_MUTATION");
    const c=baseline();c.cloudResourceMutations=1;error(c,"EXTERNAL_MUTATION");
  });
  it("refuses missing owner shutdown and unconfirmed cleanup after two hours",()=>{
    const a=baseline();a.ownerExitedCleanly=false;error(a,"OWNER_OR_CLEANUP_INCOMPLETE");
    const b=baseline();b.cleanupVerified=false;error(b,"OWNER_OR_CLEANUP_INCOMPLETE");
  });
});
