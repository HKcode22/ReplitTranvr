/**
 * GitHub-only future original-source pre-expiry independent reader.
 * Triggered AFTER a reviewed horizon source owner, never dispatches one.
 * GitHub API source-job provenance must match live DB V0076/V0077 owner.
 */
import {readFileSync,appendFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import pg from "pg";
import {
 P4_G5_FUTURE_HORIZON_MANIFEST_PATH_V39,P4_G5_FUTURE_GRID_PATH_V39,
 P4_G5_FUTURE_HORIZON_APPROVED_SHA256_V39,
 admitP4G5FutureHorizonManifestV39,
 attestP4G5FutureSourceGitHubV39,
 assertP4G5FutureHorizonGitHubContextV39
} from "../server/lib/disruption/phase4Gate5FutureHorizonGithubAdmission_v39";
import {
 auditP4G5DiscoveredHorizonOriginalBeforeExpiryV39
} from "../server/lib/disruption/phase4Gate5NineOriginalBoundCohort_v39";
import {deriveP4G5FutureHorizonPreScopeV39}
 from "../server/lib/disruption/phase4Gate5FutureHorizonPreScope_v39";
import {auditP4G5HorizonPreexpiryV39}
 from "../server/lib/disruption/phase4Gate5HorizonPreexpiryReadOnly_v39";

const ROOT="https://api.github.com/repos/HKcode22/ReplitTranvr";
type Job="admit-future-horizon"|"read-future-horizon";
async function githubJson(path:string,token:string):Promise<unknown>{
 const response=await fetch(ROOT+path,{
  redirect:"error",signal:AbortSignal.timeout(15000),
  headers:{Authorization:"Bearer "+token,
   Accept:"application/vnd.github+json",
   "X-GitHub-Api-Version":"2022-11-28"}
 });
 if(!response.ok)throw Error("P4_G5_FUTURE_GH_READ_UNAVAILABLE_HOLD");
 const raw=await response.text();
 if(raw.length>150000)throw Error("P4_G5_FUTURE_GH_TOO_LARGE_HOLD");
 return JSON.parse(raw) as unknown;
}
async function verifyOriginalSourceOwner(
 review:Extract<ReturnType<typeof admitP4G5FutureHorizonManifestV39>,
 {status:"REVIEWED_FUTURE_HORIZON_READONLY"}>
){
 const e=process.env;
 if(!e.GITHUB_EVENT_PATH||!e.GH_READONLY_TOKEN)
  throw Error("P4_G5_FUTURE_MISSING_EVENT_OR_GH_TOKEN_HOLD");
 const raw=readFileSync(e.GITHUB_EVENT_PATH,"utf8");
 if(raw.length>100000)throw Error("P4_G5_FUTURE_EVENT_SIZE_HOLD");
 const event=JSON.parse(raw) as {workflow_run?:{id?:unknown}};
 const sourceId=event.workflow_run?.id;
 if(!Number.isSafeInteger(sourceId)||Number(sourceId)<=0)
  throw Error("P4_G5_FUTURE_SOURCE_RUN_ID_HOLD");
 const run=await githubJson("/actions/runs/"+sourceId,e.GH_READONLY_TOKEN);
 const jobs=await githubJson("/actions/runs/"+sourceId+"/jobs?per_page=100",
  e.GH_READONLY_TOKEN);
 return attestP4G5FutureSourceGitHubV39(review,sourceId,run,jobs);
}
export async function mainP4G5FutureHorizonReaderV39(){
 const job=process.env.GITHUB_JOB;
 if(job!=="admit-future-horizon"&&job!=="read-future-horizon")
  throw Error("P4_G5_FUTURE_JOB_HOLD");
 const head=execFileSync("git",["rev-parse","HEAD"],
  {encoding:"utf8"}).trim();
 assertP4G5FutureHorizonGitHubContextV39(process.env,job as Job,head);
 const manifestBytes=readFileSync(P4_G5_FUTURE_HORIZON_MANIFEST_PATH_V39,"utf8");
 const reviewed=admitP4G5FutureHorizonManifestV39(
  manifestBytes,P4_G5_FUTURE_HORIZON_APPROVED_SHA256_V39);
 if(job==="admit-future-horizon"&&reviewed.status==="HOLD_NO_APPROVED_FUTURE_AUDIT"){
  if(!process.env.GITHUB_OUTPUT)
   throw Error("P4_G5_FUTURE_MISSING_GITHUB_OUTPUT_HOLD");
  appendFileSync(process.env.GITHUB_OUTPUT,"ready=false\n");
  console.log("P4_G5_FUTURE_SOURCE_AUDIT_NOT_ARMED_NO_APPROVED_PIN");
  return;
 }
 if(reviewed.status!=="REVIEWED_FUTURE_HORIZON_READONLY")
  throw Error("P4_G5_FUTURE_HORIZON_NOT_REVIEWED_HOLD");
 const gridBytes=readFileSync(P4_G5_FUTURE_GRID_PATH_V39,"utf8");
 if(createHash("sha256").update(gridBytes,"utf8").digest("hex")!==
    reviewed.frozenGridSha256)
  throw Error("P4_G5_FUTURE_FROZEN_GRID_CHANGED_HOLD");
 const source=await verifyOriginalSourceOwner(reviewed);
 if(job==="admit-future-horizon"){
  if(!process.env.GITHUB_OUTPUT)
   throw Error("P4_G5_FUTURE_GITHUB_OUTPUT_REQUIRED_HOLD");
  appendFileSync(process.env.GITHUB_OUTPUT,"ready=true\n");
  console.log(JSON.stringify({
   status:"FUTURE_SOURCE_OWNER_GITHUB_ATTESTED_DB_AUDIT_PENDING",
   horizon:source.horizon,sourceRunId:source.runId,
   providerCalls:0,databaseWrites:0,scientificGate5Passed:false
  }));
  return;
 }
 const url=process.env.GATE05_AUTOMATION_DATABASE_URL;
 if(!url)throw Error("P4_G5_FUTURE_READER_CREDENTIAL_MISSING_HOLD");
 const db=new pg.Client({
  connectionString:url,application_name:"p4_g5_future_independent_horizon_original",
  connectionTimeoutMillis:9000,query_timeout:15000,
  options:"-c default_transaction_read_only=on"
 });
 let tx=false;
 try{
  await db.connect();
  await db.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  tx=true;
  await db.query("SET LOCAL statement_timeout = '12000ms'");
  await db.query("SET LOCAL lock_timeout = '2000ms'");
  const readOnly=await db.query(
   "SELECT current_setting('transaction_read_only') AS is_readonly");
  if(readOnly.rows[0]?.is_readonly!=="on")
   throw Error("P4_G5_FUTURE_NOT_READONLY_HOLD");
  const readAsOfUtc=new Date().toISOString();
  const reader={query:async(sql:string,params:readonly unknown[])=>
   ({rows:(await db.query(sql,[...params])).rows as unknown[]})};
  const result=await auditP4G5DiscoveredHorizonOriginalBeforeExpiryV39(
   reader,{
    reviewedFrozenManifestBytes:gridBytes,
    independentlyReviewedManifestSha256:reviewed.frozenGridSha256,
    expectedCohortId:reviewed.cohortId,
    horizon:source.horizon,expectedOwnerGithubRunId:source.runId,
    readAsOfUtc
   });
  // Before the short-lived source expires, inspect actual PRE rows in the
  // SAME read-only database snapshot, never a retrospective POST backfill.
  // This remains candidate-only until native T/actuality, rights and identity.
  let preCandidate:Record<string,unknown>|null=null;
  if(result.status==="THREE_APPLICATION_SOURCE_FRAMES_MATCHED_NOT_PROVIDER_CERTIFIED"){
   const preScope=deriveP4G5FutureHorizonPreScopeV39({
    reviewedFrozenGridBytes:gridBytes,
    independentlyReviewedFrozenGridSha256:reviewed.frozenGridSha256,
    expectedCohortId:reviewed.cohortId,
    githubAttestedSourceRunId:source.runId,
    githubAttestedHorizon:source.horizon,
    actualReadAtUtc:readAsOfUtc
   });
   const preResult=await auditP4G5HorizonPreexpiryV39(reader,preScope);
   if(preResult.status==="V0077_BOUND_THREE_ORIGINALS_PREEXPIRY_CANDIDATE_ONLY"){
    preCandidate={
     status:preResult.status,
     observedBoundOriginals:preResult.observedBoundOriginals,
     distinctQuerySlots:preResult.distinctQuerySlots,
     sourceScopedPhysicalCandidates:preResult.sourceScopedPhysicalCandidates,
     operatingCandidates:preResult.operatingCandidates,
     eligibleCutoffCandidates:preResult.eligibleCutoffCandidates,
     prePersistedCandidateCount:preResult.prePresent,
     missingPreCandidateCount:preResult.missingPreCandidateCount,
     preCandidateCompleteness:preResult.candidatePreCompleteness,
     notYetDue:preResult.notYetDue,
     lateOriginalForCutoff:preResult.lateOriginalForCutoff,
     missingGenericT:preResult.missingGenericT,
     identityScopeAmbiguous:preResult.identityScopeAmbiguous,
     invalidOrPosthocPreExcluded:preResult.invalidOrPosthocPRE,
     actualSelectedTVerified:false,certifiedPre:false
    };
   }else{
    preCandidate={
     status:preResult.status,
     observedBoundOriginals:preResult.observedBoundOriginals,
     preCandidateCompleteness:null,
     sourceOrExpectedPreUnknown:true
    };
    process.exitCode=2;
   }
  }
  console.log(JSON.stringify({
   status:result.status,horizon:source.horizon,
   matchedOriginalSlots:result.matchedOriginalSlots,
   sourceRunId:source.runId,
   independentGitHubSourceRunMetadataVerified:true,
   applicationSourceFrameReadback:result.status===
     "THREE_APPLICATION_SOURCE_FRAMES_MATCHED_NOT_PROVIDER_CERTIFIED",
   actualPersistedPreCandidateReview:preCandidate,
   originalProviderWireAuthenticated:false,
   legallyPermittedMetadataProofRetentionCertified:false,
   providerNativeFirstTVerified:false,actualOnlyWheelsOffVerified:false,
   persistedPreCertified:false,scientificGate5Passed:false,
   phase5FreezeAuthorized:false,phase6Authorized:false,
   providerCalls:0,databaseWrites:0
  }));
  if(result.status!=="THREE_APPLICATION_SOURCE_FRAMES_MATCHED_NOT_PROVIDER_CERTIFIED")
   process.exitCode=2;
 }finally{
  if(tx)await db.query("ROLLBACK").catch(()=>undefined);
  await db.end().catch(()=>undefined);
 }
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_future_horizon_originals_readonly_actions.ts"))
 void mainP4G5FutureHorizonReaderV39().catch(()=>{
  console.error("P4_G5_FUTURE_ORIGINAL_HORIZON_INDEPENDENT_READONLY_HOLD");
  process.exitCode=2;
 });
