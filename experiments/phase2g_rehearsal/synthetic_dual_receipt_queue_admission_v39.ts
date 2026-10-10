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
  async admit(input:Parameters<typeof createSyntheticDualSourceMessageV2>[0]):Promise<{
    ackAfterQueueAcceptance:true;
    duplicate:boolean;
    receipt:DualSourceMessageV2["receipt"];
  }>{
    const message=await createSyntheticDualSourceMessageV2(input);
    // Queue account Free max is 128KB inclusive of internal metadata;
    // enforce a conservative 120KB on the full JSON serialized message,
    // not just original provider body.
    const serialized=new TextEncoder().encode(JSON.stringify(message));
    if(serialized.length>120_000)throw new Error("SOURCE_QUEUE_SERIALIZED_OVERFLOW");
    const k=message.receipt.attemptKey;
    const compare=(old:DualSourceMessageV2)=>{
      if(old.receipt.wireSha256!==message.receipt.wireSha256 ||
         old.receipt.canonicalSha256!==message.receipt.canonicalSha256 ||
         old.receipt.syntheticCostCredits!==message.receipt.syntheticCostCredits)
        throw new Error("SOURCE_ATTEMPT_CONFLICT_REFUSED");
    };
    const previous=this.committed.get(k);
    if(previous){
      compare(previous);
      return {ackAfterQueueAcceptance:true,duplicate:true,receipt:previous.receipt};
    }
    const inflight=this.inflight.get(k);
    if(inflight){
      const settled=await inflight;
      compare(settled);
      return {ackAfterQueueAcceptance:true,duplicate:true,receipt:settled.receipt};
    }
    const p=(async()=>{
      await this.queue.send(message); // NO HTTP 200 until true Queue acceptance
      this.committed.set(k,message);
      return message;
    })();
    this.inflight.set(k,p);
    try {
      const success=await p;
      return {ackAfterQueueAcceptance:true,duplicate:false,receipt:success.receipt};
    }finally{
      if(this.inflight.get(k)===p)this.inflight.delete(k);
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
