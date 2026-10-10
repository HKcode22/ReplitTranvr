import {
  createSyntheticDualSourceMessageV2,
  verifySyntheticDualSourceMessageV2,
  type DualSourceMessageV2
} from "./dual_source_wire_canonical_receipt_v39";

/**
 * Synthetic queue admission + source-attestation continuation prototype.
 * In-memory attempt map is deliberately NOT a durable receipt ledger.
 * Must not receive real provider traffic. No Cloudflare account connection.
 */
export type SyntheticQueuePortV2={
  send:(message:DualSourceMessageV2)=>Promise<unknown>
};
export class SyntheticDualQueueAdmissionV2 {
  private readonly committed=new Map<string,DualSourceMessageV2>();
  private readonly inflight=new Map<string,Promise<DualSourceMessageV2>>();
  constructor(private readonly queue:SyntheticQueuePortV2){}
  get locallyRememberedAttempts(){return this.committed.size;}

  /**
   * Reserve a candidate attempt SYNCHRONOUSLY before the first async HMAC
   * or SHA operation. Previously, concurrent calls raced during WebCrypto,
   * allowing a later call to win and overwrite the intended first edge UTC.
   *
   * This quick parse is only for scheduling. Full signed source validation,
   * duplicate JSON-key refusal and limits still happen BEFORE queue.send().
   */
  private candidateKey(input:Parameters<typeof createSyntheticDualSourceMessageV2>[0]):string{
    let body:unknown;
    try{
      if(!(input.rawBytes instanceof Uint8Array))throw new Error("bad raw");
      body=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(input.rawBytes));
    }catch{throw new Error("SOURCE_JSON_INVALID_UTF8_OR_SYNTAX");}
    if(!body||typeof body!=="object"||Array.isArray(body))
      throw new Error("SOURCE_PINNED_ATTEMPT_CONTRACT_INVALID");
    const o=body as Record<string,any>,notice=o.id,sub=o.subscription?.id,
      seq=o.deliveryAttempt?.seqNo;
    if(typeof input.sessionId!=="string"||
       typeof sub!=="string"||sub!==input.expectedProviderSubscriptionId||
       typeof notice!=="string"||notice.length===0||
       !Number.isSafeInteger(seq)||seq<0)
      throw new Error("SOURCE_PINNED_ATTEMPT_CONTRACT_INVALID");
    return JSON.stringify([input.sessionId,sub,notice,seq]);
  }

  async admit(input:Parameters<typeof createSyntheticDualSourceMessageV2>[0]):Promise<{
    ackAfterQueueAcceptance:true;
    duplicate:boolean;
    receipt:DualSourceMessageV2["receipt"];
  }>{
    const candidate=this.candidateKey(input); // happens before any await
    const previous=this.committed.get(candidate);
    const active=this.inflight.get(candidate);
    const created=createSyntheticDualSourceMessageV2(input);
    const compare=(old:DualSourceMessageV2,fresh:DualSourceMessageV2)=>{
      if(old.receipt.attemptKey!==fresh.receipt.attemptKey||
         old.receipt.wireSha256!==fresh.receipt.wireSha256||
         old.receipt.canonicalSha256!==fresh.receipt.canonicalSha256||
         old.receipt.syntheticCostCredits!==fresh.receipt.syntheticCostCredits)
        throw new Error("SOURCE_ATTEMPT_CONFLICT_REFUSED");
    };
    if(previous){
      const fresh=await created;compare(previous,fresh);
      return {ackAfterQueueAcceptance:true,duplicate:true,receipt:previous.receipt};
    }
    if(active){
      const [old,fresh]=await Promise.all([active,created]);
      compare(old,fresh);
      return {ackAfterQueueAcceptance:true,duplicate:true,receipt:old.receipt};
    }
    const processing=(async()=>{
      const message=await created;
      // Conservative 120 KB cap includes the ENTIRE queue envelope.
      const serialized=new TextEncoder().encode(JSON.stringify(message));
      if(serialized.length>120_000)
        throw new Error("SOURCE_QUEUE_SERIALIZED_OVERFLOW");
      await this.queue.send(message);
      this.committed.set(candidate,message);
      return message;
    })();
    this.inflight.set(candidate,processing);
    try{
      const done=await processing;
      return {ackAfterQueueAcceptance:true,duplicate:false,receipt:done.receipt};
    }finally{
      if(this.inflight.get(candidate)===processing)
        this.inflight.delete(candidate);
    }
  }
}

/**
 * Separate downstream validation. Queue admission is not SQL commit or raw
 * 168-hour storage; only this independently checks signed wire/canonical
 * linkage and original receipt time before any scientific replay.
 */
export async function verifyQueuedSyntheticSourceBeforeReplayV2(input:{
  message:DualSourceMessageV2;
  privateEdgeSigningKey:string;
  sessionId:string;
  providerSubscriptionId:string;
  trustedNowUtc:string;
}):Promise<{validated:true;originalEdgeReceivedAtUtc:string;legacyV39CanonicalSha256:string}>{
  const check=await verifySyntheticDualSourceMessageV2({
    message:input.message,
    privateEdgeSigningKey:input.privateEdgeSigningKey,
    expectedSessionId:input.sessionId,
    expectedProviderSubscriptionId:input.providerSubscriptionId,
    trustedNowUtc:input.trustedNowUtc
  });
  return {
    validated:check.verified,
    originalEdgeReceivedAtUtc:check.firstEdgeReceivedAtUtc,
    legacyV39CanonicalSha256:check.canonicalSha256
  };
}
