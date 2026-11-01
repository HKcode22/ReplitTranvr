/**
 * Gate5 future-cohort independent audit admission. NO paid activation.
 * A syntactically valid SHA or client-declared booleans are not review.
 * The pin in THIS reviewed source must be changed by a future PR for a
 * genuinely new frozen cohort, never by an environment variable.
 */
import {createHash} from "node:crypto";
import type {P4FreshCohortScopeV39}
 from "./phase4Gate5FreshCohortReadOnly_v39";
export const NEXT_AUDIT_MANIFEST_PATH_V39=
 "data-collection/phase4/GATE5_NEXT_FROZEN_COHORT_READONLY_AUDIT_HOLD.json";
export const NEXT_AUDIT_MANIFEST_SCHEMA_V39=
 "v39.phase4.gate5-next-independent-readonly-audit-manifest.v1" as const;
export const NEXT_AUDIT_APPROVED_SHA256_V39:
 string|null=null; // NO next cohort has been independently reviewed/approved yet.
const HASH=/^[a-f0-9]{64}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
function ts(t:unknown,why:string):number{
 if(typeof t!=="string"||!UTC.test(t)||!Number.isFinite(Date.parse(t))||
  new Date(t).toISOString()!==t)throw Error("P4_NEXT_AUDIT_BAD_UTC:"+why);
 return Date.parse(t);
}
export function validateP4NextCohortAuditManifestV39(
 bytes:string,pinnedSha256:string|null,nowUtc:string
):{status:"HOLD_NO_NEW_COHORT";scope:null;manifestSha256:string}|
  {status:"APPROVED_READONLY_COHORT_AUDIT";scope:P4FreshCohortScopeV39;manifestSha256:string}{
 if(typeof bytes!=="string"||bytes.length>12000)
  throw Error("P4_NEXT_AUDIT_MANIFEST_BYTES_INVALID");
 let m:Record<string,unknown>;
 try{
  const v=JSON.parse(bytes);
  if(!v||typeof v!=="object"||Array.isArray(v))throw Error("not object");
  m=v as Record<string,unknown>;
 }catch{throw Error("P4_NEXT_AUDIT_MANIFEST_JSON_INVALID");}
 if(bytes!==JSON.stringify(m,null,2)+"\n"||
    m.schema!==NEXT_AUDIT_MANIFEST_SCHEMA_V39||
    Object.keys(m).length!==14)
  throw Error("P4_NEXT_AUDIT_MANIFEST_CANONICAL_HOLD");
 const hash=createHash("sha256").update(bytes,"utf8").digest("hex");
 ts(nowUtc,"read");
 if(m.mode==="HOLD_NO_REVIEWED_NEXT_COHORT"){
  if(m.cohortId!==null||m.airportIcao!==null||
   m.serviceWindowStartUtc!==null||m.serviceWindowEndUtc!==null||
   m.reviewedFrozenGridSha256!==null||
   m.sourceRetentionReviewArtifactSha256!==null||
   m.providerNativeSemanticsEvidenceSha256!==null||
   m.providerCallsAuthorized!==false||m.databaseWritesAuthorized!==false||
   m.strictGate5Passed!==false||m.phase5FreezeAuthorized!==false||
   m.phase6Authorized!==false||pinnedSha256!==null)
   throw Error("P4_NEXT_AUDIT_HOLD_MANIFEST_NOT_INERT");
  return {status:"HOLD_NO_NEW_COHORT",scope:null,manifestSha256:hash};
 }
 if(m.mode!=="REVIEWED_NEW_COHORT_READONLY"||
    pinnedSha256===null||!HASH.test(pinnedSha256)||
    hash!==pinnedSha256)
  throw Error("P4_NEXT_AUDIT_UNAPPROVED_OR_CHANGED_MANIFEST");
 if(typeof m.cohortId!=="string"||
    !/^[A-Z][A-Z0-9_-]{9,75}$/.test(m.cohortId)||
    !/^[A-Z]{4}$/.test(String(m.airportIcao))||
    !HASH.test(String(m.reviewedFrozenGridSha256))||
    !HASH.test(String(m.sourceRetentionReviewArtifactSha256))||
    !HASH.test(String(m.providerNativeSemanticsEvidenceSha256))||
    m.providerCallsAuthorized!==false||m.databaseWritesAuthorized!==false||
    m.strictGate5Passed!==false||m.phase5FreezeAuthorized!==false||
    m.phase6Authorized!==false)
  throw Error("P4_NEXT_AUDIT_REVIEWED_SCOPE_OR_RIGHTS_HOLD");
 const start=ts(m.serviceWindowStartUtc,"start");
 const end=ts(m.serviceWindowEndUtc,"end");
 const now=ts(nowUtc,"read");
 // Forbid reusing Oct31 and attempts to infer a missing future observation
 // while the window is still in progress. Retention of original source
 // content must be separately verified; a positive digest is not rights.
 if(start<Date.parse("2026-11-01T00:00:00.000Z")||
   end<=start||end-start<10*60000||end-start>4*3600000||
   now<end||now>end+168*3600000)
  throw Error("P4_NEXT_AUDIT_COHORT_TIME_OR_SOURCE_EXPIRY_HOLD");
 return {
  status:"APPROVED_READONLY_COHORT_AUDIT",
  manifestSha256:hash,
  scope:{
   airportIcao:String(m.airportIcao),
   serviceWindowStartUtc:String(m.serviceWindowStartUtc),
   serviceWindowEndUtc:String(m.serviceWindowEndUtc),
   readAsOfUtc:nowUtc,
   reviewedFrozenManifestSha256:hash
  }
 };
}
export function assertP4NextAuditGitHubV39(
 e:NodeJS.ProcessEnv,localSha:string,job:"validate-next-cohort-manifest"|"independent-next-cohort-readonly"
){
 const owner="HKcode22/ReplitTranvr";
 const path=owner+"/.github/workflows/phase4-gate5-future-independent-readonly.yml@refs/heads/main";
 if(e.GITHUB_ACTIONS!=="true"||e.GITHUB_REPOSITORY!==owner||
  e.GITHUB_EVENT_NAME!=="push"||e.GITHUB_REF!=="refs/heads/main"||
  e.GITHUB_RUN_ATTEMPT!=="1"||e.GITHUB_JOB!==job||
  e.GITHUB_WORKFLOW!=="Phase4 Gate5 Future Cohort Independent Read-Only Audit"||
  e.GITHUB_WORKFLOW_REF!==path||
  !/^[a-f0-9]{40}$/.test(e.GITHUB_SHA??"")||localSha!==e.GITHUB_SHA||
  e.P4_NEXT_AUDIT_EXACT_INTENT!=="NO_PROVIDER_NEW_COHORT_READONLY"||
  !!e.AERODATABOX_API_KEY||!!e.RAPIDAPI_KEY||
  !!e.V39_DATABASE_RUNTIME_URL||!!e.DATABASE_URL||
  (job==="validate-next-cohort-manifest"&&!!e.GATE05_AUTOMATION_DATABASE_URL))
  throw Error("P4_NEXT_AUDIT_GITHUB_CONTEXT_OR_SECRET_HOLD");
}
