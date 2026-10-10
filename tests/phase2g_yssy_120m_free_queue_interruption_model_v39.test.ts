import {describe,it,expect} from "vitest";
import {FREE_TIER_MODEL,ZeroCostQueueModel} from "../experiments/phase2g_cf_sandbox_ingress/free_queue_two_hour_model";

const flight=(minute:number,credits=2)=>({
  attemptId:"synthetic-"+minute,sourceReceivedMinute:minute,
  rawBytes:2600,billedCredits:credits,
});

describe("Phase2G YSSY 120min ZERO-CLOUD free-queue feasibility and interruption stress",()=>{
  it("preserves all 120 source minutes across 30m Replit outage (59-88), then drains exactly",()=>{
    const model=new ZeroCostQueueModel();
    for(let minute=0;minute<130;minute++){
      if(minute<120)expect(model.admit(flight(minute),minute)).toBe(true);
      model.tick(minute,minute<59||minute>=89,10);
    }
    const s=model.finish(130);
    expect(s.infrastructurePass,s.errors.join(",")).toBe(true);
    expect(s).toMatchObject({
      received:120,committed:120,externalCredits:240,internalCredits:240,
      totalReservedOps:480,firstReceivedBuckets:[15,15,15,15,15,15,15,15],
      errors:[]
    });
    const delayed=model.entriesSnapshot.filter(x=>x.sourceReceivedMinute>=59&&x.sourceReceivedMinute<89);
    expect(delayed).toHaveLength(30);
    expect(delayed.every(x=>x.consumedMinute!>=89)).toBe(true);
    expect(delayed.every(x=>x.queuedMinute===x.sourceReceivedMinute)).toBe(true);
  });

  it("declares longer-than-authorized outage unsafe even if processor returns and queue eventually drains",()=>{
    const model=new ZeroCostQueueModel();
    for(let minute=0;minute<150;minute++){
      if(minute<120)model.admit(flight(minute),minute);
      model.tick(minute,minute<59||minute>=103,15);
    }
    const s=model.finish(150);
    expect(s.infrastructurePass).toBe(false);
    expect(s.errors).toContain("SCIENTIFIC_BACKLOG_AGE_EXCEEDED");
  });

  it("rejects notification too big for conservative FREE Queues envelope, no fake positive ACK",()=>{
    const model=new ZeroCostQueueModel();
    expect(model.admit({...flight(0),rawBytes:FREE_TIER_MODEL.maxRawMessageBytes+1},0)).toBe(false);
    expect(model.totalAccepted).toBe(0);
    expect(model.failed).toContain("QUEUE_ENVELOPE_SIZE");
  });

  it("rejects cumulative provider credit authorization over 500, never silently expands budget",()=>{
    const model=new ZeroCostQueueModel();
    expect(model.admit({...flight(0),billedCredits:500},0)).toBe(true);
    expect(model.admit({...flight(1),billedCredits:1},1)).toBe(false);
    expect(model.failed).toContain("PROVIDER_CREDIT_CEILING");
    expect(model.edgeAttemptCredits).toBe(500);
  });

  it("accepts same-attempt queue replay idempotently, but fails conflicting attempt metadata",()=>{
    const model=new ZeroCostQueueModel();
    expect(model.admit(flight(0),0)).toBe(true);
    expect(model.admit(flight(0),1)).toBe(true);
    expect(model.totalAccepted).toBe(1);
    expect(model.opsUsed).toBe(4);
    expect(model.admit({...flight(0),billedCredits:3},1)).toBe(false);
    expect(model.failed).toContain("CONFLICTING_ATTEMPT");
  });

  it("enforces account-wide free-tier quota reservation in *modeled* traffic before 10k operations",()=>{
    const model=new ZeroCostQueueModel();
    for(let i=0;i<2_000;i++){
      const accepted=model.admit({...flight(i,0),attemptId:"zero-credit-fixture-"+i},i);
      expect(accepted).toBe(true);
    }
    expect(model.opsUsed).toBe(8_000);
    expect(model.admit({...flight(2000,0),attemptId:"overflow"},2000)).toBe(false);
    expect(model.failed).toContain("SHARED_FREE_TIER_QUOTA_GUARD");
  });

  it("fails closed if queue not drained at 120m cutoff and refuses historical 260/259-like disparity",()=>{
    const model=new ZeroCostQueueModel();
    for(let i=0;i<260;i++)
      expect(model.admit({...flight(0,1),attemptId:"credit-"+i},0)).toBe(true);
    model.tick(1,true,259);
    const s=model.finish(120);
    expect(s.infrastructurePass).toBe(false);
    expect(s.externalCredits).toBe(260);
    expect(s.internalCredits).toBe(259);
    expect(s.errors).toEqual(expect.arrayContaining(["UNSETTLED_QUEUE","CREDIT_MISMATCH"]));
  });

  it("stale 24h free Queue may expire and must not be called durable 168h evidence",()=>{
    const override={...FREE_TIER_MODEL,maxDegradedMinutes:2_000,maxPendingMessages:1_000};
    const model=new ZeroCostQueueModel(override);
    expect(model.admit(flight(0),0)).toBe(true);
    model.tick(1440,false);
    expect(model.failed).toContain("CLOUDFLARE_FREE_QUEUE_RETENTION_EXPIRED");
    expect(model.finish(1440).infrastructurePass).toBe(false);
    expect(FREE_TIER_MODEL.queueRetentionMinutes).toBeLessThan(FREE_TIER_MODEL.priorScienceRawRetentionMinutes);
  });

  it("a false 2-hour PASS is forbidden while a pending queue remains or settlement grace expires",()=>{
    const model=new ZeroCostQueueModel();
    model.admit(flight(0),0);
    expect(model.finish(120).infrastructurePass).toBe(false);
    expect(model.failed).toContain("UNSETTLED_QUEUE");
    const delayed=new ZeroCostQueueModel();
    delayed.admit(flight(0),0);
    delayed.tick(2,true);
    expect(delayed.finish(151).errors).toContain("SETTLEMENT_GRACE_EXPIRED");
  });
});
