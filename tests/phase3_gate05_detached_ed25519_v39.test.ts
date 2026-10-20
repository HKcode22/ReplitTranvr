import {describe,it,expect} from "vitest";
import {
  createHash,generateKeyPairSync,randomUUID,sign
} from "node:crypto";
import {
  gate05Ed25519SigningMessageV39,
  verifyGate05DetachedApprovalSignatureV39
} from "../server/lib/disruption/gate05DetachedEd25519Approval_v39";
import {gate05FidsQueryFingerprintV39} from "../server/lib/disruption/gate05ScopedFidsOwner_v39";
import {reviewGate05SignedPreparedCommissionV39} from "../server/lib/disruption/gate05SignedPreparedCommissionReview_v39";

const sha=(bytes:Buffer)=>createHash("sha256").update(bytes).digest("hex");
const query={icao:"WSSS",fromLocal:"2026-10-20T09:00",toLocal:"2026-10-20T10:00"};
const auth=()=>Buffer.from(JSON.stringify({
  schema:"v39.gate05.fids-feasibility-auth.v1",
  scopeId:randomUUID(),authorizationId:"AUTH-20261020-G05SIGNED001",
  sourceCommit:"a".repeat(40),openapiSha256:"b".repeat(64),
  cycleId:"fixture-cycle-only-not-provider-proof",
  providerResetUtc:"2026-11-04T02:21:21.000Z",
  airportIcao:"WSSS",ianaTimezone:"Asia/Singapore",
  fromLocal:query.fromLocal,toLocal:query.toLocal,
  startsAtUtc:"2026-10-20T00:55:00.000Z",
  expiresAtUtc:"2026-10-20T01:30:00.000Z",
  noLocationQuerySha256:gate05FidsQueryFingerprintV39({...query,withLocation:false}),
  locationQuerySha256:gate05FidsQueryFingerprintV39({...query,withLocation:true}),
  maxBaseUnits:4,maxRetryUnits:8,maxTotalUnits:12,maxAlertCreates:0,
  purpose:"TWO_QUERY_FEASIBILITY_NOT_SCIENTIFIC_PILOT"
}));
function fixture(){
  const {publicKey,privateKey}=generateKeyPairSync("ed25519");
  const publicDer=Buffer.from(publicKey.export({format:"der",type:"spki"}));
  const bytes=auth();
  const signed=sign(null,gate05Ed25519SigningMessageV39(bytes),privateKey);
  return {
    authorizationBytes:bytes,
    detachedSignatureBase64:signed.toString("base64"),
    signerPublicKeySpkiDerBase64:publicDer.toString("base64"),
    independentPins:{
      independentlyReviewedArtifactSha256:sha(bytes),
      expectedSourceCommit:"a".repeat(40),
      expectedOpenapiSha256:"b".repeat(64),
      expectedProviderResetUtc:"2026-11-04T02:21:21.000Z",
      expectedIanaTimezone:"Asia/Singapore",
      observedNowUtc:"2026-10-19T23:59:00.000Z",
      independentlyApprovedSignerSpkiSha256:sha(publicDer)
    }
  };
}
describe("Gate05 Ed25519 detached signature never auto-enrolls an operator",()=>{
  it("valid signed exact bytes verify mathematically, NEVER authorize provider spend",()=>{
    const f=fixture();
    const r=verifyGate05DetachedApprovalSignatureV39(f);
    expect(r.cryptographicSignatureVerified).toBe(true);
    expect(r.maxTotalUnits).toBe(12);
    expect(r.signerIdentityIndependentlyAttested).toBe(false);
    expect(r.humanSpendingApprovalIndependentlyVerified).toBe(false);
    expect(r.databaseCommissioningAuthorized).toBe(false);
    expect(r.paidPilotAuthorized).toBe(false);
    expect(r.providerCalls).toBe(0);
    expect(r.databaseWrites).toBe(0);
  });
  it("rejects a substituted signer even with valid alternate-key signature",()=>{
    const f=fixture(),other=fixture();
    expect(()=>verifyGate05DetachedApprovalSignatureV39({
      ...f,
      signerPublicKeySpkiDerBase64:other.signerPublicKeySpkiDerBase64,
      detachedSignatureBase64:other.detachedSignatureBase64
    })).toThrow("GATE05_SIGNER_ROOT_PIN_MISMATCH_HOLD");
  });
  it("rejects same key but detached signature over wrong context",()=>{
    const f=fixture();
    const bad=Buffer.alloc(64,0).toString("base64");
    expect(()=>verifyGate05DetachedApprovalSignatureV39({
      ...f,detachedSignatureBase64:bad
    })).toThrow("GATE05_SIGNER_SIGNATURE_NOT_VALID_HOLD");
  });
  it("rejects malformed signature and missing independent trust root",()=>{
    const f=fixture();
    expect(()=>verifyGate05DetachedApprovalSignatureV39({
      ...f,detachedSignatureBase64:"abc"
    })).toThrow("GATE05_SIGNER_SIGNATURE_ENCODING_HOLD");
    expect(()=>verifyGate05DetachedApprovalSignatureV39({
      ...f,independentPins:{
        ...f.independentPins,
        independentlyApprovedSignerSpkiSha256:"0".repeat(64)
      }
    })).toThrow("GATE05_SIGNER_ROOT_PIN_MISMATCH_HOLD");
  });
  it("rejects modified authorization bytes under the previously reviewed hash",()=>{
    const f=fixture();
    expect(()=>verifyGate05DetachedApprovalSignatureV39({
      ...f,authorizationBytes:Buffer.concat([f.authorizationBytes,Buffer.from(" ")])
    })).toThrow("GATE05_AUTH_REVIEWED_DIGEST_MISMATCH_HOLD");
  });
  it("rejects modification with new matching artifact hash but old signature",()=>{
    const f=fixture();
    const newBytes=Buffer.from(f.authorizationBytes.toString("utf8").replace(
      "AUTH-20261020-G05SIGNED001","AUTH-20261020-G05SIGNED002"));
    expect(newBytes.equals(f.authorizationBytes)).toBe(false);
    expect(()=>verifyGate05DetachedApprovalSignatureV39({
      ...f,
      authorizationBytes:newBytes,
      independentPins:{
        ...f.independentPins,
        independentlyReviewedArtifactSha256:sha(newBytes)
      }
    })).toThrow("GATE05_SIGNER_SIGNATURE_NOT_VALID_HOLD");
  });
  it("does not accept arbitrary signer algorithm or PEM as SPKI DER base64",()=>{
    const f=fixture();
    expect(()=>verifyGate05DetachedApprovalSignatureV39({
      ...f,signerPublicKeySpkiDerBase64:"---BEGIN PUBLIC KEY---"
    })).toThrow("GATE05_SIGNER_ROOT_PIN_HOLD");
  });
});


describe("Gate05 signature-to-PREPARED commission plan binds immutable reviewed artifacts",()=>{
  it("requires cryptographic verification before exposing the bounded 3-row plan",()=>{
    const v=fixture();
    const r=reviewGate05SignedPreparedCommissionV39(v);
    expect(r.status).toBe("VALID_SIGNATURE_PREPARED_SQL_REVIEW_ONLY_NO_LIVE_AUTH");
    expect(r.cryptographicSignatureVerified).toBe(true);
    expect(r.independentlyAttestedOwnerIdentity).toBe(false);
    expect(r.explicitHumanPaidAuthorizationVerified).toBe(false);
    expect(r.providerTariffAndRetentionEntitlementsVerified).toBe(false);
    expect(r.productionCommissioningAuthorized).toBe(false);
    expect(r.productionActivationAuthorized).toBe(false);
    expect(r.paidPilotAuthorized).toBe(false);
    expect(r.productionDatabaseWrites).toBe(0);
    expect(r.providerRequests).toBe(0);
    expect(r.exactRowsSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(r.plannedCommands).toHaveLength(2);
    expect(r.plannedCommands[0].sql).toContain("'PREPARED',4,8,0,0");
    expect(r.plannedCommands[1].sql).toContain("($1::uuid,$3,2,true,0)");
    expect(r.inventoryQuery.sql).toContain("state IN ('PREPARED','ACTIVE')");
    expect(r.inventoryQuery.params).toEqual([r.scopeId]);
    expect(JSON.stringify(r)).not.toContain("PRIVATE KEY");
  });
  it("rejects unsigned, tampered, mismatched signer and self-pinned substituted keys",()=>{
    const v=fixture(),other=fixture();
    expect(()=>reviewGate05SignedPreparedCommissionV39({
      ...v,detachedSignatureBase64:Buffer.alloc(64,0).toString("base64")
    })).toThrow("GATE05_SIGNER_SIGNATURE_NOT_VALID_HOLD");
    expect(()=>reviewGate05SignedPreparedCommissionV39({
      ...v,authorizationBytes:Buffer.concat([v.authorizationBytes,Buffer.from(" ")])
    })).toThrow("GATE05_AUTH_REVIEWED_DIGEST_MISMATCH_HOLD");
    expect(()=>reviewGate05SignedPreparedCommissionV39({
      ...v,signerPublicKeySpkiDerBase64:other.signerPublicKeySpkiDerBase64,
      detachedSignatureBase64:other.detachedSignatureBase64
    })).toThrow("GATE05_SIGNER_ROOT_PIN_MISMATCH_HOLD");
    // Merely passing attacker-controlled key fingerprints is not authority:
    // the returned review must explicitly keep owner identity/paid approval false.
    const substituted=reviewGate05SignedPreparedCommissionV39(other);
    expect(substituted.productionCommissioningAuthorized).toBe(false);
    expect(substituted.paidPilotAuthorized).toBe(false);
  });
});
