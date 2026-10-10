/**
 * Phase2G YSSY 120m *offline* fault-model for a prospective Workers/Queues
 * FREE-tier-only backup. NO Cloudflare binding, network, storage or ADB calls.
 *
 * A queue can protect a short Replit interruption only when:
 *  - full raw messages fit in Cloudflare Queues, using conservative envelope cap
 *  - original reception time and provider attempt identity are preserved
 *  - strict backlog expiry/ops quota do not occur
 *  - Replit later provides a durable-before-ACK 168h source-object retention
 *  - a new prospectively authorized scientific replay protocol exists
 *
 * This DOES NOT license the real Stage1 supervisor to continue through outage,
 * or prove scientific 15-minute buckets after replay. No paid owner changes.
 */

export const FREE_TIER_MODEL=Object.freeze({
  workerRequestsPerDay:100_000,
  queueOperationsPerDay:10_000,
  queueRetentionMinutes:24*60,
  // Conservative cap below 128KB (metadata + queue serialization overhead).
  maxRawMessageBytes:112_000,
  reservedQueueOperationsPerAttempt:4,
  // Keep 20% of account-wide operations unallocated for unknown other queues
  // and extra reads/retries. This is a MODEL reservation, not enforced by CF.
  dailyOpsUseThreshold:8_000,
  maxProviderSpendCredits:500,
  maxDegradedMinutes:35,
  maxPendingMessages:500,
  exposureMinutes:120,
  settlementGraceMinutes:30,
  priorScienceRawRetentionMinutes:7*24*60,
});

export type SyntheticProviderAttempt={
  attemptId:string;
  sourceReceivedMinute:number;
  rawBytes:number;
  billedCredits:number;
};
export type SimEntry=SyntheticProviderAttempt&{
  queuedMinute:number;
  consumedMinute?:number;
};

export class ZeroCostQueueModel{
  private entries=new Map<string,SimEntry>();
  private usedOps=0;
  private uniqueCredits=0;
  private committedCredits=0;
  private failedReasons:string[]=[];
  private finished=new Set<string>();
  constructor(private readonly limits=FREE_TIER_MODEL){}
  get failed(){return [...this.failedReasons]}
  get edgeAttemptCredits(){return this.uniqueCredits}
  get internalCommittedCredits(){return this.committedCredits}
  get opsUsed(){return this.usedOps}
  get totalAccepted(){return this.entries.size}
  get committedCount(){return this.finished.size}
  get pendingCount(){return this.entries.size-this.finished.size}
  get entriesSnapshot(){return [...this.entries.values()].map(e=>({...e}))}
  private fail(reason:string):false{this.failedReasons.push(reason);return false}
  /** Returns ACK=true only if the whole notification was accepted into queue model. */
  admit(attempt:SyntheticProviderAttempt,nowMinute:number):boolean{
    if(!attempt.attemptId || !Number.isInteger(attempt.sourceReceivedMinute) ||
      !Number.isInteger(attempt.rawBytes) ||
      !Number.isInteger(attempt.billedCredits)||attempt.billedCredits<0 ||
      attempt.sourceReceivedMinute>nowMinute||attempt.sourceReceivedMinute<0 ||
      nowMinute<0)return this.fail("INVALID_SOURCE_ATTEMPT");
    if(attempt.rawBytes>this.limits.maxRawMessageBytes ||attempt.rawBytes===0)
      return this.fail("QUEUE_ENVELOPE_SIZE");
    const old=this.entries.get(attempt.attemptId);
    if(old){
      if(old.rawBytes!==attempt.rawBytes ||
         old.sourceReceivedMinute!==attempt.sourceReceivedMinute ||
         old.billedCredits!==attempt.billedCredits)return this.fail("CONFLICTING_ATTEMPT");
      // Same-attempt at-least-once replay is not a new provider SEND.
      return true;
    }
    if(this.uniqueCredits+attempt.billedCredits>this.limits.maxProviderSpendCredits)
      return this.fail("PROVIDER_CREDIT_CEILING");
    if(this.usedOps+this.limits.reservedQueueOperationsPerAttempt >
       this.limits.dailyOpsUseThreshold)return this.fail("SHARED_FREE_TIER_QUOTA_GUARD");
    this.entries.set(attempt.attemptId,{...attempt,queuedMinute:nowMinute});
    this.uniqueCredits+=attempt.billedCredits;
    // Conservatively reserve full write/read/delete + 1 extra retry per send.
    this.usedOps+=this.limits.reservedQueueOperationsPerAttempt;
    return true;
  }
  /** Called once per minute in fixture; no provider API. */
  tick(nowMinute:number,replitUp:boolean,capacity=10):void{
    const pending=[...this.entries.values()].filter(e=>!this.finished.has(e.attemptId))
      .sort((a,b)=>a.queuedMinute-b.queuedMinute||a.attemptId.localeCompare(b.attemptId));
    if(pending.length>this.limits.maxPendingMessages)this.fail("BACKLOG_COUNT_EXCEEDED");
    if(pending.length && (nowMinute-pending[0].queuedMinute)>this.limits.maxDegradedMinutes)
      this.fail("SCIENTIFIC_BACKLOG_AGE_EXCEEDED");
    if(pending.some(x=>nowMinute-x.queuedMinute>=this.limits.queueRetentionMinutes))
      this.fail("CLOUDFLARE_FREE_QUEUE_RETENTION_EXPIRED");
    if(!replitUp ||this.failed.length)return;
    for(const e of pending.slice(0,Math.max(0,capacity))){
      if(this.finished.has(e.attemptId))continue;
      // This represents a synthetic consumer's durable commit assertion.
      // Real Postgres/object storage atomicity and timestamp validation are
      // NOT simulated here and must pass their own integration tests.
      this.finished.add(e.attemptId);
      e.consumedMinute=nowMinute;
      this.committedCredits+=e.billedCredits;
    }
  }
  /** Infrastructure-only gate; DOES NOT assert physical-v2 scientific validity. */
  finish(nowMinute:number):{
    infrastructurePass:boolean;received:number;committed:number;
    externalCredits:number;internalCredits:number;
    totalReservedOps:number;firstReceivedBuckets:number[];errors:string[];
  }{
    if(nowMinute<this.limits.exposureMinutes)
      this.fail("EXPOSURE_TOO_SHORT");
    if(nowMinute>this.limits.exposureMinutes+this.limits.settlementGraceMinutes)
      this.fail("SETTLEMENT_GRACE_EXPIRED");
    if(this.pendingCount!==0)this.fail("UNSETTLED_QUEUE");
    if(this.uniqueCredits!==this.committedCredits)this.fail("CREDIT_MISMATCH");
    const buckets=Array.from({length:8},()=>0);
    for(const e of this.entries.values())if(e.sourceReceivedMinute>=0&&e.sourceReceivedMinute<120){
      buckets[Math.floor(e.sourceReceivedMinute/15)]++;
    }
    return {
      infrastructurePass:this.failedReasons.length===0,
      received:this.totalAccepted,committed:this.committedCount,
      externalCredits:this.uniqueCredits,internalCredits:this.committedCredits,
      totalReservedOps:this.usedOps,
      firstReceivedBuckets:buckets,
      errors:[...new Set(this.failedReasons)],
    };
  }
}
