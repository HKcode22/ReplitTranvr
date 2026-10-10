import {generateKeyPairSync} from "node:crypto";
import {describe,expect,it} from "vitest";
import {
  makeSyntheticTwoStageOwnerV39,
  signSyntheticPostSubscriptionBindingV39,
  signSyntheticPreSubscriptionPlanV39,
  preSubscriptionPlanSha256V39,
  verifySyntheticTwoStageOwnerV39,
  type SyntheticPreSubscriptionPlanV39
} from "../experiments/phase2g_rehearsal/synthetic_two_stage_owner_protocol_v39";
import {
  syntheticOwnerPublicKeyFingerprintV39
} from "../experiments/phase2g_rehearsal/synthetic_owner_freeze_signature_v39";
import {
  reconcileSyntheticSignedAttemptsV39,
  signSyntheticSenderFrameV39
} from "../experiments/phase2g_rehearsal/signed_attempt_reconciliation_v39";
import {createSyntheticDualSourceMessageV2}
  from "../experiments/phase2g_rehearsal/dual_source_wire_canonical_receipt_v39";

const KEYS=generateKeyPairSync("ed25519");
const PUB=KEYS.publicKey.export({type:"spki",format:"pem"}).toString();
const PIN=syntheticOwnerPublicKeyFingerprintV39(PUB);
const SESSION="12345678-1234-4234-8234-123456789abc";
const SUB="synthetic-issued-subscription-001";
const CREATE_SHA="6".repeat(64);
const CREATED="2026-10-12T02:56:00.000Z";
const BOUND="2026-10-12T02:57:00.000Z";
const PLAN=():SyntheticPreSubscriptionPlanV39=>({
  schema:"v39.phase2g.synthetic-owner-freeze.v1",
  mode:"synthetic-only",owner:"github-actions-emulator",
  stage:"Phase2G-Stage1",sessionId:SESSION,
  providerSubscriptionId:null,phase:"pre_subscription",
  frozenAtUtc:"2026-10-12T02:54:00.000Z",
  frozenPlanSha256:"a".repeat(64),
  frozenImplementationSha256:"b".repeat(64),
  ownerCommitSha:"c".repeat(40),receiverCommitSha:"d".repeat(40),
  databasePostmasterStartUtc:"2026-10-10T01:00:00.000Z",
  windowStartUtc:"2026-10-12T03:00:00.000Z",
  windowEndUtc:"2026-10-12T05:00:00.000Z",
  airportIcao:"YSSY",
  physicalFlightContract:"v39-physical-flight-instance-v2",
  sampleBucketMinutes:15,maxDeliveryRetries:0,
  providerCreditCeiling:500,stage1ReserveCredits:450,
  protectedAccountFloorCredits:1000,providerEmulatorOnly:true
});
const fixture=(custom?:{
  plan?:SyntheticPreSubscriptionPlanV39;
  subscriptionId?:string;
  created?:string;
  bound?:string;
  createSha?:string;
})=>{
  const plan=custom?.plan??PLAN();
  const subscriptionId=custom?.subscriptionId??SUB;
  const providerCreatedAtUtc=custom?.created??CREATED;
  const boundAtUtc=custom?.bound??BOUND;
  const createAttemptSha256=custom?.createSha??CREATE_SHA;
  const signed=makeSyntheticTwoStageOwnerV39({
    plan,subscriptionId,providerCreatedAtUtc,boundAtUtc,
    createAttemptSha256,ownerPrivateKey:KEYS.privateKey
  });
  return {plan,subscriptionId,providerCreatedAtUtc,boundAtUtc,
    createAttemptSha256,...signed};
};
const verify=(f=fixture(),overrides:Record<string,unknown>={})=>
  verifySyntheticTwoStageOwnerV39({
    signedPlan:f.signedPlan,
    signedBinding:f.signedBinding,
    signedPostFreeze:f.signedPostFreeze,
    trustedOwnerPublicKeyPem:PUB,pinnedOwnerPublicKeySha256:PIN,
    independentlyExpectedPlan:PLAN(),
    independentlyReportedSubscriptionId:SUB,
    independentlyReportedCreateAttemptSha256:CREATE_SHA,
    independentlyReportedCreatedAtUtc:CREATED,
    ...overrides
  });
const modify=<T extends object>(v:T,patch:Record<string,unknown>)=>
  Object.assign({...v},patch) as T;

describe("P13 two-stage signed pre-create plan and post-create subscription binding: synthetic-only",()=>{
  it("signs unbound plan BEFORE creation, then links exactly one fictional subscription via separate owner signatures",()=>{
    const f=fixture(),got=verify(f);
    expect(f.signedPlan.plan.providerSubscriptionId).toBe(null);
    expect(got).toMatchObject({
      twoSignaturesVerified:true,
      prePlanSha256:preSubscriptionPlanSha256V39(f.plan),
      providerSubscriptionId:SUB,
      independentCreationVerified:false,
      crossProcessOneSubscriptionProven:false,
      productionOwnerAuthority:false,
      paidLaunchAuthorized:false,
      scientificRecoveryAuthorized:false
    });
    expect(got.boundFreezeSha256).toBe(f.signedBinding.binding.postFreezeSha256);
  });
  it("rejects unsigned change to pre-frozen plan after subscription creation",()=>{
    const f=fixture();
    const altered=modify(f.plan,{frozenPlanSha256:"f".repeat(64)});
    expect(()=>verify(f,{signedPlan:{...f.signedPlan,plan:altered}}))
      .toThrow("TWO_STAGE_PLAN_DIFFERS_FROM_FROZEN_POLICY");
  });
  it("rejects legitimately re-signed changed plan against independently pinned original",()=>{
    const f=fixture({plan:modify(PLAN(),{receiverCommitSha:"e".repeat(40)})});
    expect(()=>verify(f)).toThrow("TWO_STAGE_PLAN_DIFFERS_FROM_FROZEN_POLICY");
  });
  it("rejects post-create subscription substitution even if all later signatures are valid",()=>{
    const f=fixture({subscriptionId:"second-subscription-not-frozen"});
    expect(()=>verify(f)).toThrow("TWO_STAGE_INDEPENDENT_CREATION_MISMATCH");
  });
  it("rejects mismatched independent create attempt proof token",()=>{
    const f=fixture({createSha:"0".repeat(64)});
    expect(()=>verify(f)).toThrow("TWO_STAGE_INDEPENDENT_CREATION_MISMATCH");
  });
  it("rejects a signed bind whose pre-plan digest no longer matches its signed plan",()=>{
    const f=fixture();
    const b=modify(f.signedBinding.binding,{prePlanSha256:"1".repeat(64)});
    const signed=signSyntheticPostSubscriptionBindingV39(b,KEYS.privateKey);
    expect(()=>verify(f,{signedBinding:signed}))
      .toThrow("TWO_STAGE_PRE_PLAN_DIGEST_BROKEN");
  });
  it("rejects signed post-freeze digest mismatch or tampered post-freeze signature",()=>{
    const f=fixture();
    const b=modify(f.signedBinding.binding,{postFreezeSha256:"2".repeat(64)});
    expect(()=>verify(f,{
      signedBinding:signSyntheticPostSubscriptionBindingV39(b,KEYS.privateKey)
    })).toThrow("TWO_STAGE_POST_FREEZE_DIGEST_BROKEN");
    const altered={...f.signedPostFreeze,signatureBase64:"A".repeat(86)+"=="};
    expect(()=>verify(f,{signedPostFreeze:altered}))
      .toThrow(/OWNER_FREEZE_SIGNATURE_INVALID|OWNER_FREEZE_SIGNATURE_ENCODING_INVALID/);
  });
  it("rejects a provider creation event before pre-plan freeze",()=>{
    const f=fixture({created:"2026-10-12T02:53:00.000Z",
      bound:"2026-10-12T02:57:00.000Z"});
    expect(()=>verify(f,{
      independentlyReportedCreatedAtUtc:"2026-10-12T02:53:00.000Z"
    })).toThrow("TWO_STAGE_PLAN_NOT_FROZEN_BEFORE_CREATION");
  });
  it("rejects binding before subscription creation and after sampling window begins",()=>{
    expect(()=>fixture({bound:"2026-10-12T02:55:00.000Z"}))
      .toThrow("TWO_STAGE_BINDING_PRECEDES_CREATION");
    // The underlying frozen-run validator already refuses a post-window
    // signature before the two-stage gate can even evaluate it.
    expect(()=>fixture({bound:"2026-10-12T03:00:01.000Z"}))
      .toThrow("OWNER_FREEZE_TIME_OR_DURATION_INVALID");
  });
  it("rejects a 119-minute plan, changed retry count and hidden unknown preplan keys",()=>{
    for(const changes of [
      {windowEndUtc:"2026-10-12T04:59:00.000Z"},
      {maxDeliveryRetries:1},
      {hiddenPaidOverride:true}
    ]){
      expect(()=>signSyntheticPreSubscriptionPlanV39(
        modify(PLAN(),changes),KEYS.privateKey
      )).toThrow();
    }
  });
  it("rejects alternate signing public keys, self-supplied replacement keys or modified binding signature",()=>{
    const f=fixture(),attacker=generateKeyPairSync("ed25519");
    const forged=signSyntheticPostSubscriptionBindingV39(
      f.signedBinding.binding,attacker.privateKey
    );
    const fakePublic=attacker.publicKey.export({type:"spki",format:"pem"}).toString();
    expect(()=>verify(f,{signedBinding:forged}))
      .toThrow("TWO_STAGE_SIGNATURE_INVALID");
    expect(()=>verify(f,{
      trustedOwnerPublicKeyPem:fakePublic
    })).toThrow("TWO_STAGE_OWNER_KEY_PIN_MISMATCH");
    expect(()=>verify(f,{
      pinnedOwnerPublicKeySha256:"f".repeat(64)
    })).toThrow("TWO_STAGE_OWNER_KEY_PIN_MISMATCH");
  });
  it("detects conflicting signed subscription bindings for the same immutable plan when both are supplied as evidence",()=>{
    const f=fixture();
    const second=fixture({subscriptionId:"synthetic-other-subscription"});
    expect(()=>verify(f,{observedPriorBindings:[second.signedBinding]}))
      .toThrow("TWO_STAGE_CONFLICTING_OWNER_BINDINGS");
    expect(verify(f,{observedPriorBindings:[f.signedBinding]}).twoSignaturesVerified)
      .toBe(true);
  });
  it("refuses a provider ID merely present in a signed binding if independently reported provider ID is absent",()=>{
    const f=fixture();
    expect(()=>verify(f,{independentlyReportedSubscriptionId:""}))
      .toThrow("TWO_STAGE_INDEPENDENT_CREATION_MISMATCH");
  });
  it("requires source/emulator sender records to be tied to the post-binding frozen run digest, never preplan hash",async()=>{
    const f=fixture(),result=verify(f);
    const edgeKey="edge-key-"+"e".repeat(64),senderKey="sender-key-"+"s".repeat(64);
    const raw=JSON.stringify({
      id:"test-only-sender-001",subscription:{id:SUB},
      timestampUtc:"2026-10-12T03:01:00.000Z",
      deliveryAttempt:{seqNo:0,costCredits:1,
        timestampUtc:"2026-10-12T03:01:01.000Z"},flights:[]
    });
    const receipt=await createSyntheticDualSourceMessageV2({
      rawBytes:new TextEncoder().encode(raw),sessionId:SESSION,
      expectedProviderSubscriptionId:SUB,
      trustedReceivedAtUtc:"2026-10-12T03:01:02.000Z",
      privateEdgeSigningKey:edgeKey
    });
    const frame={
      schema:"v39.phase2g-synthetic-independent-sender.v1" as const,
      mode:"synthetic-only" as const,
      sessionId:SESSION,providerSubscriptionId:SUB,
      ownerFrozenRunSha256:result.boundFreezeSha256,
      windowStartUtc:PLAN().windowStartUtc,windowEndUtc:PLAN().windowEndUtc,
      attempts:[{
        attemptKey:receipt.receipt.attemptKey,
        notificationId:receipt.receipt.notificationId,
        attemptSeqNo:0,providerAttemptUtc:receipt.receipt.providerAttemptUtc,
        providerGeneratedUtc:receipt.receipt.providerGeneratedUtc,
        wireSha256:receipt.receipt.wireSha256,
        canonicalSha256:receipt.receipt.canonicalSha256,
        syntheticCostCredits:1,senderResponseStatus:200,senderResponseElapsedMs:250
      }]
    };
    const signed=signSyntheticSenderFrameV39(frame,senderKey);
    const input={
      signedSender:signed,independentSenderKey:senderKey,
      edgeSigningKey:edgeKey,expectedSessionId:SESSION,
      expectedProviderSubscriptionId:SUB,
      expectedOwnerFrozenRunSha256:result.boundFreezeSha256,
      trustedAuditUtc:"2026-10-12T05:01:00.000Z",
      signedEdgeReceipts:[receipt],committedInternal:[{
        attemptKey:receipt.receipt.attemptKey,
        canonicalSha256:receipt.receipt.canonicalSha256,
        rawObjectReadbackSha256:receipt.receipt.canonicalSha256,
        originalEdgeReceivedUtc:receipt.receipt.firstEdgeReceivedAtUtc,
        syntheticCostCredits:1
      }]
    };
    const audit=await reconcileSyntheticSignedAttemptsV39(input);
    expect(audit.attemptEvidenceConsistent).toBe(true);
    expect(audit.scientificCompletionAuthorized).toBe(false);
    await expect(reconcileSyntheticSignedAttemptsV39({
      ...input,expectedOwnerFrozenRunSha256:result.prePlanSha256
    })).rejects.toThrow("INDEPENDENT_SENDER_FROZEN_CONTEXT_MISMATCH");
  });
});