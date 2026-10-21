import {describe,it,expect,vi} from "vitest";
import {createHash,generateKeyPairSync,randomUUID,sign} from "node:crypto";
import {
  gate05Ed25519SigningMessageV39
} from "../server/lib/disruption/gate05DetachedEd25519Approval_v39";
import {
  gate05FidsQueryFingerprintV39
} from "../server/lib/disruption/gate05ScopedFidsOwner_v39";
import {
  previewGate05SignedExpiryGuardPlanV39
} from "../server/lib/disruption/gate05SignedExpiryGuardPlan_v39";

const sha=(v:Buffer)=>createHash("sha256").update(v).digest("hex");
const fixture=()=>{
  // Tests manufacture ephemeral keys. They are NEVER owner identity/consent.
  const {publicKey,privateKey}=generateKeyPairSync("ed25519");
  const der=Buffer.from(publicKey.export({format:"der",type:"spki"}));
  const scopeId=randomUUID();
  const query={icao:"WSSS",fromLocal:"2026-10-20T09:00",toLocal:"2026-10-20T10:00"};
  const expiresAtUtc="2026-10-20T01:30:00.000Z";
  const authorizationBytes=Buffer.from(JSON.stringify({
    schema:"v39.gate05.fids-feasibility-auth.v1",scopeId,
    authorizationId:"AUTH-20261020-G05EXPIRY001",
    sourceCommit:"a".repeat(40),openapiSha256:"b".repeat(64),
    cycleId:"fixture-cycle-only-not-provider-proof",
    providerResetUtc:"2026-11-04T02:21:21.000Z",
    airportIcao:"WSSS",ianaTimezone:"Asia/Singapore",
    fromLocal:query.fromLocal,toLocal:query.toLocal,
    startsAtUtc:"2026-10-20T00:55:00.000Z",expiresAtUtc,
    noLocationQuerySha256:gate05FidsQueryFingerprintV39({...query,withLocation:false}),
    locationQuerySha256:gate05FidsQueryFingerprintV39({...query,withLocation:true}),
    maxBaseUnits:4,maxRetryUnits:8,maxTotalUnits:12,maxAlertCreates:0,
    purpose:"TWO_QUERY_FEASIBILITY_NOT_SCIENTIFIC_PILOT"
  }));
  return {
    scopeId,expiresAtUtc,
    args:{
      authorizationBytes,
      detachedSignatureBase64:sign(
        null,gate05Ed25519SigningMessageV39(authorizationBytes),privateKey
      ).toString("base64"),
      signerPublicKeySpkiDerBase64:der.toString("base64"),
      independentPins:{
        independentlyReviewedArtifactSha256:sha(authorizationBytes),
        expectedSourceCommit:"a".repeat(40),
        expectedOpenapiSha256:"b".repeat(64),
        expectedProviderResetUtc:"2026-11-04T02:21:21.000Z",
        expectedIanaTimezone:"Asia/Singapore",
        observedNowUtc:"2026-10-19T23:59:00.000Z",
        independentlyApprovedSignerSpkiSha256:sha(der)
      }
    }
  };
};
describe("Gate05 signed immutable expiry-guard preview (NO deployment)",()=>{
  it("binds exact signed scope and expiration without any I/O or LIVE authority",()=>{
    const f=fixture(),db=vi.fn(),provider=vi.fn();
    const r=previewGate05SignedExpiryGuardPlanV39(f.args);
    expect(r.scopeId).toBe(f.scopeId);
    expect(r.expiresAtUtc).toBe(f.expiresAtUtc);
    expect(r.reviewedAuthorizationSha256).toBe(
      sha(f.args.authorizationBytes)
    );
    expect(r.cryptographicSignatureVerified).toBe(true);
    expect(r.ownerSignerIndependentlyAttested).toBe(false);
    expect(r.humanPaidApprovalVerified).toBe(false);
    expect(r.productionSafetyLoginAuthenticated).toBe(false);
    expect(r.continuousSupervisorLivenessVerified).toBe(false);
    expect(r.independentlyDeployed).toBe(false);
    expect(r.paidPilotAuthorized).toBe(false);
    expect(r.databaseWrites).toBe(0);
    expect(r.providerRequests).toBe(0);
    expect(db).not.toHaveBeenCalled();
    expect(provider).not.toHaveBeenCalled();
  });
  it("does not honor an independent caller-provided expiry or scope override",()=>{
    const f=fixture();
    const r=previewGate05SignedExpiryGuardPlanV39({
      ...f.args,scopeId:randomUUID(),
      expiresAtUtc:"2099-01-01T00:00:00.000Z"
    } as any);
    expect(r.scopeId).toBe(f.scopeId);
    expect(r.expiresAtUtc).toBe(f.expiresAtUtc);
  });
  it("rejects altered expiry without a new independently reviewed byte digest",()=>{
    const f=fixture();
    const bytes=Buffer.from(f.args.authorizationBytes.toString("utf8")
      .replace("2026-10-20T01:30:00.000Z","2026-10-20T01:31:00.000Z"));
    expect(()=>previewGate05SignedExpiryGuardPlanV39({
      ...f.args,authorizationBytes:bytes
    })).toThrow("GATE05_AUTH_REVIEWED_DIGEST_MISMATCH_HOLD");
  });
  it("rejects an altered, newly pinned artifact with an old signature",()=>{
    const f=fixture();
    const bytes=Buffer.from(f.args.authorizationBytes.toString("utf8")
      .replace("2026-10-20T01:30:00.000Z","2026-10-20T01:31:00.000Z"));
    expect(()=>previewGate05SignedExpiryGuardPlanV39({
      ...f.args,authorizationBytes:bytes,
      independentPins:{
        ...f.args.independentPins,
        independentlyReviewedArtifactSha256:sha(bytes)
      }
    })).toThrow("GATE05_SIGNER_SIGNATURE_NOT_VALID_HOLD");
  });
  it("rejects substituted signer key, forged signature, and missing trust pin",()=>{
    const f=fixture(),other=fixture();
    expect(()=>previewGate05SignedExpiryGuardPlanV39({
      ...f.args,
      signerPublicKeySpkiDerBase64:other.args.signerPublicKeySpkiDerBase64
    })).toThrow("GATE05_SIGNER_ROOT_PIN_MISMATCH_HOLD");
    expect(()=>previewGate05SignedExpiryGuardPlanV39({
      ...f.args,detachedSignatureBase64:Buffer.alloc(64).toString("base64")
    })).toThrow("GATE05_SIGNER_SIGNATURE_NOT_VALID_HOLD");
    expect(()=>previewGate05SignedExpiryGuardPlanV39({
      ...f.args,independentPins:{
        ...f.args.independentPins,
        independentlyApprovedSignerSpkiSha256:"0".repeat(64)
      }
    })).toThrow("GATE05_SIGNER_ROOT_PIN_MISMATCH_HOLD");
  });
});
