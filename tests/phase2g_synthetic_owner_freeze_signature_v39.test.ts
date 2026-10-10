import {generateKeyPairSync} from "node:crypto";
import {describe,expect,it} from "vitest";
import {
  signSyntheticOwnerFreezeV39,verifySyntheticOwnerFreezeV39,
  syntheticOwnerPublicKeyFingerprintV39,syntheticOwnerFreezeSha256V39,
  reconcileSyntheticUnderSignedOwnerFreezeV39,
  type SyntheticOwnerFreezeV39,
  type SignedSyntheticOwnerFreezeV39
} from "../experiments/phase2g_rehearsal/synthetic_owner_freeze_signature_v39";
import {signSyntheticSenderFrameV39} from "../experiments/phase2g_rehearsal/signed_attempt_reconciliation_v39";
import {createSyntheticDualSourceMessageV2} from "../experiments/phase2g_rehearsal/dual_source_wire_canonical_receipt_v39";

const UUID="12345678-1234-4234-8234-123456789abc";
const SUB="fixture-post-subscription-bound-001";
const SENDER="fixture-independent-sender-"+ "s".repeat(60);
const EDGE="fixture-independent-edge-"+ "e".repeat(60);
const WINDOW="2026-10-12T03:00:00.000Z";
const END="2026-10-12T05:00:00.000Z";
const AUDIT="2026-10-12T05:02:00.000Z";
const keys=generateKeyPairSync("ed25519");
const pem=keys.publicKey.export({type:"spki",format:"pem"}).toString();
const PIN=syntheticOwnerPublicKeyFingerprintV39(pem);
const freeze=():SyntheticOwnerFreezeV39=>({
  schema:"v39.phase2g.synthetic-owner-freeze.v1",
  mode:"synthetic-only",
  owner:"github-actions-emulator",
  stage:"Phase2G-Stage1",
  sessionId:UUID,
  providerSubscriptionId:SUB,
  frozenPlanSha256:"a".repeat(64),
  frozenImplementationSha256:"b".repeat(64),
  ownerCommitSha:"c".repeat(40),
  receiverCommitSha:"d".repeat(40),
  databasePostmasterStartUtc:"2026-10-10T01:00:00.000Z",
  signedAtUtc:"2026-10-12T02:58:00.000Z",
  windowStartUtc:WINDOW,
  windowEndUtc:END,
  airportIcao:"YSSY",
  physicalFlightContract:"v39-physical-flight-instance-v2",
  sampleBucketMinutes:15,
  maxDeliveryRetries:0,
  providerCreditCeiling:500,
  stage1ReserveCredits:450,
  protectedAccountFloorCredits:1000,
  providerEmulatorOnly:true
});
const signed=(v=freeze())=>signSyntheticOwnerFreezeV39(v,keys.privateKey);
const check=(s=signed(),expected=freeze(),publicPem=pem,pin=PIN)=>
  verifySyntheticOwnerFreezeV39({
    signed:s,trustedOwnerPublicKeyPem:publicPem,
    pinnedOwnerPublicKeySha256:pin,expectedIndependentFreeze:expected
  });
const change=(v:SyntheticOwnerFreezeV39,overrides:Record<string,unknown>)=>
  Object.assign({...v},overrides) as SyntheticOwnerFreezeV39;

describe("P13 signed GitHub owner/session freeze — isolated synthetic Ed25519",()=>{
  it("accepts a correct pinned signature and binds a deterministic frozen-run digest, but NEVER authorizes paid or science",()=>{
    const v=freeze(),s=signed(v),result=check(s,v);
    expect(result).toMatchObject({
      ownerSignatureVerified:true,
      frozenRunSha256:syntheticOwnerFreezeSha256V39(v),
      pinnedOwnerPublicKeySha256:PIN,
      productionOwnerAuthority:false,
      paidLaunchAuthorized:false,scientificRecoveryAuthorized:false
    });
    expect(check(s,v).frozenRunSha256).toBe(result.frozenRunSha256);
  });
  it("refuses a valid attacker-generated key/signature even when the attacker supplies both",()=>{
    const attacker=generateKeyPairSync("ed25519");
    const wrongPem=attacker.publicKey.export({type:"spki",format:"pem"}).toString();
    const forged=signSyntheticOwnerFreezeV39(freeze(),attacker.privateKey);
    expect(()=>check(forged,freeze(),wrongPem,PIN)).toThrow("OWNER_PUBLIC_KEY_PIN_MISMATCH");
    expect(()=>check(forged,freeze(),pem,PIN)).toThrow("OWNER_FREEZE_SIGNATURE_INVALID");
  });
  it("rejects missing owner key pin and non-Ed25519 public key",()=>{
    const v=signed();
    expect(()=>check(v,freeze(),pem,"")).toThrow("OWNER_TRUST_ANCHOR_NOT_PINNED");
    const rsa=generateKeyPairSync("rsa",{modulusLength:2048});
    const rsaPem=rsa.publicKey.export({format:"pem",type:"spki"}).toString();
    expect(()=>check(v,freeze(),rsaPem,PIN)).toThrow("OWNER_FREEZE_PUBLIC_KEY_NOT_ED25519");
  });
  it("rejects a tampered signature, invalid length and unknown metadata field",()=>{
    const v=signed(),replaced=v.signatureBase64[0]==="A"?"B":"A";
    expect(()=>check({...v,signatureBase64:replaced+v.signatureBase64.slice(1)}))
      .toThrow("OWNER_FREEZE_SIGNATURE_INVALID");
    expect(()=>check({...v,signatureBase64:"AB=="}))
      .toThrow("OWNER_FREEZE_SIGNATURE_ENCODING_INVALID");
    const extra=change(freeze(),{unreviewedPaidOverride:true});
    expect(()=>signSyntheticOwnerFreezeV39(extra,keys.privateKey))
      .toThrow("OWNER_FREEZE_UNKNOWN_OR_MISSING_FIELDS");
  });
  it("refuses validly signed altered plan, implementation, owner build or receiver build against independently pinned run",()=>{
    for(const k of ["frozenPlanSha256","frozenImplementationSha256"] as const){
      const changed=change(freeze(),{[k]:"e".repeat(64)});
      expect(()=>check(signed(changed))).toThrow("OWNER_FREEZE_INDEPENDENT_CONTEXT_MISMATCH");
    }
    for(const k of ["ownerCommitSha","receiverCommitSha"] as const){
      const changed=change(freeze(),{[k]:"f".repeat(40)});
      expect(()=>check(signed(changed))).toThrow("OWNER_FREEZE_INDEPENDENT_CONTEXT_MISMATCH");
    }
  });
  it("rejects a validly signed wrong session and wrong provider subscription binding",()=>{
    for(const changes of [
      {sessionId:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"},
      {providerSubscriptionId:"unexpected-subscription"}
    ]){
      expect(()=>check(signed(change(freeze(),changes))))
        .toThrow("OWNER_FREEZE_INDEPENDENT_CONTEXT_MISMATCH");
    }
  });
  it("rejects validly signed shifted windows and database lifecycle anchor mismatch",()=>{
    for(const changes of [
      {windowStartUtc:"2026-10-12T04:00:00.000Z",
       windowEndUtc:"2026-10-12T06:00:00.000Z",
       signedAtUtc:"2026-10-12T03:58:00.000Z"},
      {databasePostmasterStartUtc:"2026-10-10T02:00:00.000Z"}
    ]){
      expect(()=>check(signed(change(freeze(),changes))))
        .toThrow("OWNER_FREEZE_INDEPENDENT_CONTEXT_MISMATCH");
    }
  });
  it("rejects 119m exposure, unsigned fake science config, changed budget, any provider retry or false emulator flag",()=>{
    for(const changes of [
      {windowEndUtc:"2026-10-12T04:59:00.000Z"},
      {physicalFlightContract:"unreviewed-metric"},
      {providerCreditCeiling:501},
      {maxDeliveryRetries:1},
      {providerEmulatorOnly:false},
      {stage1ReserveCredits:451}
    ]){
      expect(()=>signSyntheticOwnerFreezeV39(change(freeze(),changes),keys.privateKey))
        .toThrow("OWNER_FREEZE_CONTRACT_INVALID");
    }
  });
  it("rejects a signature created after window start or DB startup after signing",()=>{
    for(const changes of [
      {signedAtUtc:"2026-10-12T03:00:01.000Z"},
      {databasePostmasterStartUtc:"2026-10-12T02:59:00.000Z"}
    ])expect(()=>signed(change(freeze(),changes)))
      .toThrow("OWNER_FREEZE_TIME_OR_DURATION_INVALID");
  });
  it("refuses stale signed owner freeze with untrusted independent anchor even if cryptographic signature verifies",()=>{
    const old=freeze(),s=signed(old);
    const independentlyUpdated=change(freeze(),{receiverCommitSha:"f".repeat(40)});
    expect(()=>check(s,independentlyUpdated))
      .toThrow("OWNER_FREEZE_INDEPENDENT_CONTEXT_MISMATCH");
  });
  it("binds the independent synthetic sender ledger to the VERIFIED owner digest before credit reconciliation",async()=>{
    const v=freeze(),s=signed(v);
    const raw=JSON.stringify({
      id:"synthetic-flight-001",subscription:{id:SUB},
      timestampUtc:"2026-10-12T03:01:00.000Z",
      deliveryAttempt:{seqNo:0,costCredits:1,timestampUtc:"2026-10-12T03:01:01.000Z"},
      flights:[]
    });
    const receipt=await createSyntheticDualSourceMessageV2({
      rawBytes:new TextEncoder().encode(raw),
      sessionId:UUID,expectedProviderSubscriptionId:SUB,
      trustedReceivedAtUtc:"2026-10-12T03:01:02.000Z",
      privateEdgeSigningKey:EDGE
    });
    const sender=signSyntheticSenderFrameV39({
      schema:"v39.phase2g-synthetic-independent-sender.v1",
      mode:"synthetic-only",sessionId:UUID,providerSubscriptionId:SUB,
      ownerFrozenRunSha256:syntheticOwnerFreezeSha256V39(v),
      windowStartUtc:WINDOW,windowEndUtc:END,
      attempts:[{
        attemptKey:receipt.receipt.attemptKey,
        notificationId:receipt.receipt.notificationId,
        attemptSeqNo:0,providerAttemptUtc:receipt.receipt.providerAttemptUtc,
        providerGeneratedUtc:receipt.receipt.providerGeneratedUtc,
        wireSha256:receipt.receipt.wireSha256,
        canonicalSha256:receipt.receipt.canonicalSha256,
        syntheticCostCredits:1,senderResponseStatus:200,senderResponseElapsedMs:240
      }]
    },SENDER);
    const base={
      signedOwner:s,trustedOwnerPublicKeyPem:pem,
      pinnedOwnerPublicKeySha256:PIN,expectedIndependentFreeze:v,
      signedSender:sender,independentSenderKey:SENDER,edgeSigningKey:EDGE,
      trustedAuditUtc:AUDIT,signedEdgeReceipts:[receipt],
      committedInternal:[{
        attemptKey:receipt.receipt.attemptKey,
        canonicalSha256:receipt.receipt.canonicalSha256,
        rawObjectReadbackSha256:receipt.receipt.canonicalSha256,
        originalEdgeReceivedUtc:receipt.receipt.firstEdgeReceivedAtUtc,
        syntheticCostCredits:1
      }]
    };
    const result=await reconcileSyntheticUnderSignedOwnerFreezeV39(base);
    expect(result.signedOwnerVerified).toBe(true);
    expect(result.attemptResult.attemptEvidenceConsistent).toBe(true);
    expect(result.attemptResult.attemptedCredits).toBe(1);
    expect(result).toMatchObject({
      scientificCompletionAuthorized:false,automaticRecoveryAuthorized:false
    });
    const badSender=signSyntheticSenderFrameV39({
      ...sender.frame,ownerFrozenRunSha256:"f".repeat(64)
    },SENDER);
    await expect(reconcileSyntheticUnderSignedOwnerFreezeV39({
      ...base,signedSender:badSender
    })).rejects.toThrow("INDEPENDENT_SENDER_FROZEN_CONTEXT_MISMATCH");
    const shifted=signSyntheticSenderFrameV39({
      ...sender.frame,windowStartUtc:"2026-10-12T02:00:00.000Z",
      windowEndUtc:"2026-10-12T04:00:00.000Z"
    },SENDER);
    await expect(reconcileSyntheticUnderSignedOwnerFreezeV39({
      ...base,signedSender:shifted
    })).rejects.toThrow("SENDER_WINDOW_NOT_OWNER_FROZEN");
  });
});