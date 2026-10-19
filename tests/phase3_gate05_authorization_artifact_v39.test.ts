import {describe,it,expect} from "vitest";
import {createHash,randomUUID} from "node:crypto";
import {inspectGate05ExactAuthArtifactV39} from "../server/lib/disruption/gate05AuthorizationArtifact_v39";
import {gate05FidsQueryFingerprintV39} from "../server/lib/disruption/gate05ScopedFidsOwner_v39";
const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const core={icao:"WSSS",fromLocal:"2026-10-20T09:00",toLocal:"2026-10-20T10:00"};
const source="a".repeat(40),openapi="b".repeat(64);
const raw=()=>({
  schema:"v39.gate05.fids-feasibility-auth.v1",
  scopeId:randomUUID(),authorizationId:"AUTH-20261020-G05PILOT001",
  sourceCommit:source,openapiSha256:openapi,
  cycleId:"placeholder-cycle-requires-official-proof",
  providerResetUtc:"2026-11-04T02:21:21.000Z",
  airportIcao:"WSSS",ianaTimezone:"Asia/Singapore",
  fromLocal:core.fromLocal,toLocal:core.toLocal,
  startsAtUtc:"2026-10-20T00:55:00.000Z",
  expiresAtUtc:"2026-10-20T01:30:00.000Z",
  noLocationQuerySha256:gate05FidsQueryFingerprintV39({...core,withLocation:false}),
  locationQuerySha256:gate05FidsQueryFingerprintV39({...core,withLocation:true}),
  maxBaseUnits:4,maxRetryUnits:8,maxTotalUnits:12,maxAlertCreates:0,
  purpose:"TWO_QUERY_FEASIBILITY_NOT_SCIENTIFIC_PILOT"
});
const review=(a:Record<string,any>,change:Record<string,any>={})=>{
  const bytes=Buffer.from(JSON.stringify(a));
  return inspectGate05ExactAuthArtifactV39(bytes,{
    independentlyReviewedArtifactSha256:sha(bytes),
    expectedSourceCommit:source,
    expectedOpenapiSha256:openapi,
    expectedProviderResetUtc:"2026-11-04T02:21:21.000Z",
    expectedIanaTimezone:"Asia/Singapore",
    observedNowUtc:"2026-10-19T23:59:00.000Z",
    ...change
  });
};
describe("Gate05 exact authorization artifact binding — review is NOT live AUTH",()=>{
  it("requires independent exact byte digest and returns a non-activated review",()=>{
    const a=raw(),r=review(a);
    expect(r.status).toBe("ARTIFACT_BOUND_NOT_HUMAN_SIGNED_OR_DEPLOYABLE");
    expect(r.allowedQuerySha256).toEqual([a.noLocationQuerySha256,a.locationQuerySha256]);
    expect(r.maxAlertCreates).toBeUndefined();
    expect(r.humanSignatureVerified).toBe(false);
    expect(r.paidPilotAuthorized).toBe(false);
    expect(r.activationPermissionGranted).toBe(false);
  });
  it("refuses a bytes change even when the JSON content is semantically identical",()=>{
    const a=raw();
    const bytes=Buffer.from(JSON.stringify(a));
    const pins={
      independentlyReviewedArtifactSha256:sha(bytes),
      expectedSourceCommit:source,expectedOpenapiSha256:openapi,
      expectedProviderResetUtc:a.providerResetUtc,
      expectedIanaTimezone:"Asia/Singapore",
      observedNowUtc:"2026-10-19T23:59:00.000Z"
    };
    expect(()=>inspectGate05ExactAuthArtifactV39(Buffer.from(JSON.stringify(a,null,2)),pins))
      .toThrow("GATE05_AUTH_REVIEWED_DIGEST_MISMATCH_HOLD");
  });
  it("refuses altered query, airport, OpenAPI pin, time window and unit ceiling",()=>{
    expect(()=>review({...raw(),locationQuerySha256:"f".repeat(64)}))
      .toThrow("GATE05_AUTH_FIDS_QUERY_FINGERPRINT_HOLD");
    expect(()=>review({...raw(),airportIcao:"EGLL"}))
      .toThrow("GATE05_AUTH_FIDS_QUERY_FINGERPRINT_HOLD");
    expect(()=>review({...raw(),maxTotalUnits:13}))
      .toThrow("GATE05_AUTH_SCOPE_OR_LIMITS_HOLD");
    expect(()=>review({...raw(),maxAlertCreates:1}))
      .toThrow("GATE05_AUTH_SCOPE_OR_LIMITS_HOLD");
    expect(()=>review({...raw(),sourceCommit:"0".repeat(40)}))
      .toThrow("GATE05_AUTH_SCOPE_OR_LIMITS_HOLD");
    expect(()=>review(raw(),{expectedOpenapiSha256:"c".repeat(64)}))
      .toThrow("GATE05_AUTH_SCOPE_OR_LIMITS_HOLD");
    expect(()=>review({...raw(),expiresAtUtc:"2026-11-05T01:30:00.000Z"}))
      .toThrow("GATE05_AUTH_TIME_WINDOW_OR_CYCLE_HOLD");
  });
  it("refuses duplicate JSON keys even when raw sha is pinned",()=>{
    const a=raw(),b=Buffer.from(JSON.stringify(a).replace(
      '"maxAlertCreates":0','"maxAlertCreates":0,"maxAlertCreates":99'
    ));
    expect(()=>inspectGate05ExactAuthArtifactV39(b,{
      independentlyReviewedArtifactSha256:sha(b),
      expectedSourceCommit:source,expectedOpenapiSha256:openapi,
      expectedProviderResetUtc:a.providerResetUtc,
      expectedIanaTimezone:"Asia/Singapore",
      observedNowUtc:"2026-10-19T23:59:00.000Z"
    })).toThrow("PREPAID_ORIGINAL_DUPLICATE_JSON_KEY");
  });
  it("does not allow unknown fields or unsafe local query shape",()=>{
    expect(()=>review({...raw(),freeFormProviderOptions:{withLocation:true}}))
      .toThrow("GATE05_AUTH_FIELDS_HOLD");
    expect(()=>review({...raw(),fromLocal:"2026-10-20T10:00",toLocal:"2026-10-20T09:00"}))
      .toThrow("GATE05_FIDS_QUERY_SHAPE_HOLD");
  });
});
