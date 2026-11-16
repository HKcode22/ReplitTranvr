/**
 * One-time existing B0062 authorization transition for the C+D GitHub path.
 * Never creates an authorization, starts Alerts, dispatches Actions, changes
 * flags, stages data, or calls AeroDataBox. Requires the existing hash-locked
 * Phase6 AUTH with reviewed scope, exact staged inputs and independent evidence.
 * A global DB enabled row is NOT by itself source-use permission or paid GO.
 */
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {Pool} from "pg";
import type {VerifiedAuthFile} from "./v39_paid_guard_v39";
import {verifyP6SourceEnableAuthFile,P6_SOURCE_AUTH_PHASE,P6_SOURCE_AUTH_SCOPE} from "./v39_phase6_source_enable_approval_ledger_v39";
import {admitP6InertOwnerReadback} from "./v39_phase6_inert_release_stage_manual_v39.mjs";
import {compileP5V0093CostOnlySevenRestReview} from "../server/lib/disruption/phase5V0093CostOnlySevenRestFreezeWriter_v39.mjs";
import {inspectP5V0093IndependentExactPostStage} from "../server/lib/disruption/phase5V0093IndependentPostStageReadback_v39.mjs";

const H=/^[a-f0-9]{64}$/,CODE=/^[a-f0-9]{40}$/;
const PHASE=P6_SOURCE_AUTH_PHASE;
export {P6_SOURCE_AUTH_SCOPE};
const hold=(s:string):never=>{throw Error("HOLD_P6_EXACT_SOURCE_AUTH_"+s);};
const digest=(x:unknown)=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const at=(s:unknown)=>{
 if(typeof s!=="string"||!Number.isFinite(Date.parse(s))||new Date(s).toISOString()!==s)
  return hold("NONCANONICAL_REVIEW_TIME");
 return Date.parse(s);
};
type ReviewedStage={input:any;review:any;freezeReview:any};
type OwnerContext=ReviewedStage&{url:string;codeSha:string;stageSha:string;costSha:string};
type Verify=VerifiedAuthFile;
const requiredEvidence=["scientificFreezeEvidenceSha256","sourceRightsEvidenceSha256",
 "providerAccountAndBudgetEvidenceSha256","publishedAndGithubStopEvidenceSha256","operationalReleaseEvidenceSha256"] as const;

/** AUTH content pin excludes ONLY final Git SHA, to avoid a circular hash
 * when the scoped continuation approval ledger is committed. Exact final executable
 * main is separately verified and already bound to the canonical stage input.
 */
export function p6SourceAuthorizationStageContentSha(input:any){
 const {codeSha40,...content}=input??{};
 if(!CODE.test(codeSha40??""))hold("INVALID_STAGE_CODE");
 return digest(content);
}
export function verifyP6SourceActivationReview(s:ReviewedStage,auth:Verify,now:Date){
 const p=compileP5V0093CostOnlySevenRestReview(s.input,s.review,s.freezeReview);
 const a=auth?.record as any,b=a?.releaseActivation;
 const stamp=now.getTime();
 const cats=p.cost.categoryCaps as {category:string;ceilingUnits:number}[];
 if(auth?.verdict?.verified!==true||!H.test(auth.artifactHash??"")||
    !a||a.phaseGate!==PHASE||a.authorizationId!==p.staged.authorizationId||
    !/^AUTH-\d{8}-[A-Z0-9]+$/.test(a.authorizationId)||
    a.airportFilterWindow!==P6_SOURCE_AUTH_SCOPE||
    typeof a.cleanupOwner!=="string"||a.cleanupOwner.trim().length<6||
    !Array.isArray(a.predecessorEvidenceIds)||
    JSON.stringify(a.predecessorEvidenceIds)!==JSON.stringify(p.staged.predecessorEvidenceIds)||
    a.maxAlertCredits!==p.staged.alertSafety.alertRunSpendCeilingCredits||
    !a.maxRestUnitsByCategory||typeof a.maxRestUnitsByCategory!=="object"||
    Array.isArray(a.maxRestUnitsByCategory)||Object.keys(a.maxRestUnitsByCategory).length!==7||
    cats.some(c=>a.maxRestUnitsByCategory[c.category]!==c.ceilingUnits)||
    b?.schema!=="v39.phase6.exact-source-activation-review.v1"||
    b.stageContentSha256!==p6SourceAuthorizationStageContentSha(s.input)||
    b.costEnvelopeSha256!==p.cost.costOnlyCategoryDraftSha256||
    b.independentScientificFreezeApproved!==true||b.independentSourceUseApproved!==true||
    b.independentOperationalReleaseApproved!==true||b.currentAccountAndBudgetApproved!==true||
    b.legacyPublishedAutoCollectVerifiedOff!==true||b.githubPaidDispatchFlagsVerifiedOff!==true||
    b.activeBillableSubscriptionsVerifiedZero!==true||b.separatePaidDispatchStillRequired!==true||
    b.legacyAlertStartApproved!==false||requiredEvidence.some(k=>!H.test(b[k]??"")))
  hold("EXACT_INDEPENDENT_AUTH_SCOPE_OR_BUDGET_REQUIRED");
 const start=at(a.startNotBeforeUtc),expiry=at(a.expiresAtUtc);
 const observed=at(b.accountObservedAtUtc),valid=at(b.accountEvidenceValidUntilUtc);
 if(!Number.isFinite(stamp)||start>=expiry||stamp<start||stamp>=expiry||
    observed>stamp||valid<=observed||stamp>=valid)
  hold("REVIEW_OR_ACCOUNT_EVIDENCE_NOT_CURRENT");
 if(Date.parse(p.staged.calendarDays[0].startUtc)-stamp<=24*3600000+50*60000)
  hold("FIRST_PROSPECTIVE_T24_WINDOW_ALREADY_DUE");
 return {packet:p,authId:a.authorizationId,artifactSha256:auth.artifactHash};
}

// The existing independent reader opens a separate read-only connection.
// Lock its exact calendar/cost tables against other writes first, so a
// concurrent mutation cannot invalidate the comparison before the single
// authorization update. No provider work or long-running lock is performed.
const LOCK_TABLES=[
 "adb_phase6_authorization","adb_phase6_calendar_day","adb_sampling_draw",
 "phase5_fids_cycle_budget_v39","phase5_fids_utc_charge_budget_v39",
 "phase5_fids_seven_rest_release_v39","phase5_fids_cycle_rest_category_cap_v39",
 "phase5_fids_utc_rest_category_budget_v39","phase5_fids_day_budget_v39",
 "phase5_fids_allowed_query_v39","phase5_fids_exact_query_partition_v39",
 "phase5_fids_physical_attempt_v39","adb_incident_stop","adb_probe_budget_day",
 "adb_collection_batches","adb_collection_subs","adb_collection_meta"
];
export async function commitP6ExistingSourceAuthorizationOnce(pool:Pool,s:ReviewedStage,auth:Verify){
 const c=await pool.connect();let began=false,commitAttempted=false;
 try{
  await c.query("BEGIN");began=true;
  await c.query("SET LOCAL statement_timeout='20000ms'");
  await c.query("SET LOCAL lock_timeout='2000ms'");
  const who=(await c.query("SELECT current_database() db,current_user actor,session_user session_actor,"+
   "current_setting('server_version_num')::int ver,current_setting('transaction_read_only') ro,pg_is_in_recovery() replica")).rows[0];
  if(who?.db!=="neondb"||who.actor!==who.session_actor||who.ver<160000||who.ver>=170000||
     who.ro!=="off"||who.replica!==false||
     [s.review.expectedExactWriterRole,s.freezeReview.expectedExactBudgetWriterRole].includes(who.actor))
   hold("NOT_DISTINCT_EXISTING_OWNER_DB");
  const lock=(await c.query("SELECT pg_try_advisory_xact_lock(hashtext('v39-phase6-provider-mutation')::bigint) ok")).rows[0];
  if(lock?.ok!==true)hold("EXISTING_PROVIDER_OWNER_LOCK_BUSY");
  await c.query("LOCK TABLE "+LOCK_TABLES.map(t=>"clean."+t).join(",")+" IN SHARE ROW EXCLUSIVE MODE");
  const clock=async()=>new Date((await c.query("SELECT clock_timestamp() t")).rows[0].t);
  const admission=verifyP6SourceActivationReview(s,auth,await clock());
  const p=admission.packet.staged,cost=admission.packet.cost;
  const markerKey="phase6_source_authorization_enabled:"+admission.authId;
  const blockers=(await c.query("SELECT "+
   "(SELECT count(*)::int FROM clean.adb_incident_stop WHERE NOT resolved) incidents,"+
   "(SELECT count(*)::int FROM clean.adb_probe_budget_day WHERE state='OPEN') open_budget,"+
   "(SELECT count(*)::int FROM clean.adb_collection_batches WHERE status='ACTIVE' OR run_day_index IS NOT NULL) batches,"+
   "(SELECT count(*)::int FROM clean.adb_collection_subs WHERE ended_at IS NULL) subscriptions,"+
   "(SELECT count(*)::int FROM clean.adb_collection_meta WHERE key=$1) prior_enable",[markerKey])).rows[0];
  if(!blockers||Object.values(blockers).some(n=>n!==0))hold("INCIDENT_OPEN_EXPOSURE_OR_PRIOR_ENABLE");
  const readback=await inspectP5V0093IndependentExactPostStage(pool,s.input,s.review,s.freezeReview);
  if(readback.status!=="INDEPENDENT_EXACT_B0062_V0093_POST_STAGE_READONLY_MATCH_NO_GO"||
     readback.alertSafetyValuesExact!==true||readback.authorizationEnabled!==false||
     readback.exactReviewedStagePacketSha256!==p.stagePacketSha256||
     readback.exactReviewedCostEnvelopeSha256!==cost.costOnlyCategoryDraftSha256)
   hold("EXACT_INDEPENDENT_STAGED_READBACK_REQUIRED");
  const t=await clock();verifyP6SourceActivationReview(s,auth,t);
  const changed=await c.query("UPDATE clean.adb_phase6_authorization SET enabled=true "+
   "WHERE singleton_key=true AND enabled=false AND revoked_at_utc IS NULL AND authorization_id=$1 "+
   "AND manifest_sha256=$2 AND calendar_hash=$3 AND config_hash=$4 AND code_sha=$5 AND schema_version='v39'",
   [admission.authId,p.manifestSha256,p.calendarSha256,p.configSha256,p.codeSha40]);
  if(changed.rowCount!==1)hold("EXACT_DISABLED_AUTH_CHANGED");
  const receipt={schema:"v39.phase6.exact-source-authorization-transition.v1",
   status:"EXISTING_DB_AUTH_ENABLED_NO_PROVIDER_NO_WORKFLOW_SWITCH_CHANGED",
   authorizationId:admission.authId,authArtifactSha256:admission.artifactSha256,
   manifestSha256:p.manifestSha256,calendarSha256:p.calendarSha256,configSha256:p.configSha256,
   codeSha:p.codeSha40,stagePacketSha256:p.stagePacketSha256,costEnvelopeSha256:cost.costOnlyCategoryDraftSha256,
   enabledAtDatabaseUtc:t.toISOString(),independentStagedValuesMatch:true,
   databaseAuthorizationEnabled:true,providerCalls:0,databaseWrites:2,
   githubFlagsChanged:0,legacyAlertStarted:false,phase6PaidGoGrantedByThisTransition:false};
  const inserted=await c.query("INSERT INTO clean.adb_collection_meta(key,value) VALUES($1,$2)",
   [markerKey,JSON.stringify(receipt)]);
  if(inserted.rowCount!==1)hold("DURABLE_ONE_USE_MARKER_NOT_INSERTED");
  commitAttempted=true;await c.query("COMMIT");began=false;
  return receipt;
 }catch(e){
  if(began&&!commitAttempted)await c.query("ROLLBACK").catch(()=>{});
  if(commitAttempted)hold("UNKNOWN_COMMIT_DO_NOT_REPLAY_INDEPENDENT_READBACK");
  throw e;
 }finally{c.release(commitAttempted&&began?new Error("P6_COMMIT_OUTCOME_UNKNOWN"):undefined);}
}
/** Fresh independent metadata-only confirmation after acknowledged commit.
 * Failure is not permission to re-enable or change any workflow switch.
 */
export async function verifyP6EnabledSourceAuthorizationReceipt(pool:Pool,receipt:Awaited<ReturnType<typeof commitP6ExistingSourceAuthorizationOnce>>){
 const c=await pool.connect();let began=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");began=true;
  await c.query("SET LOCAL statement_timeout='12000ms'");
  const who=(await c.query("SELECT current_database() db,current_user actor,session_user session_actor,"+
   "current_setting('transaction_read_only') ro,clock_timestamp() t")).rows[0];
  if(who?.db!=="neondb"||who.actor!==who.session_actor||who.ro!=="on")hold("POST_ENABLE_READBACK_SCOPE");
  const rows=(await c.query("SELECT authorization_id,manifest_sha256,calendar_hash,config_hash,code_sha,schema_version,enabled,revoked_at_utc "+
   "FROM clean.adb_phase6_authorization WHERE singleton_key=true")).rows;
  const a=rows[0];
  const markers=(await c.query("SELECT value FROM clean.adb_collection_meta WHERE key=$1",
   ["phase6_source_authorization_enabled:"+receipt.authorizationId])).rows;
  if(rows.length!==1||a.authorization_id!==receipt.authorizationId||a.manifest_sha256!==receipt.manifestSha256||
     a.calendar_hash!==receipt.calendarSha256||a.config_hash!==receipt.configSha256||a.code_sha!==receipt.codeSha||
     a.schema_version!=="v39"||a.enabled!==true||a.revoked_at_utc!==null||markers.length!==1||
     markers[0].value!==JSON.stringify(receipt))
   hold("POST_ENABLE_ROW_OR_MARKER_NOT_IDENTICAL");
  await c.query("ROLLBACK");began=false;
  return {verifiedReadOnly:true,exactEnabledRowAndDurableMarker:true,observedAtUtc:new Date(who.t).toISOString(),
   providerCalls:0,databaseWrites:0,githubFlagsChanged:0,phase6PaidGoGrantedByThisTransition:false};
 }finally{
  if(began)await c.query("ROLLBACK").catch(()=>{});
  c.release();
 }
}
async function main(){
 if(process.argv.length!==8||process.argv[2]!=="--enable-exact-existing-source-auth")
  hold("EXACT_OWNER_ARGUMENTS");
 const [stagePath,stageSha,costSha,authPath,authSha]=process.argv.slice(3);
 const cmd=(c:string,a:string[])=>execFileSync(c,a,{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:15000}).trim();
 const head=cmd("git",["rev-parse","HEAD"]),remote=()=>cmd("gh",["api","repos/HKcode22/ReplitTranvr/git/ref/heads/main","--jq",".object.sha"]);
 if(head!==remote()||cmd("git",["status","--porcelain","--untracked-files=no"])!=="")
  hold("EXACT_CLEAN_REVIEWED_MAIN_REQUIRED");
 const s=admitP6InertOwnerReadback(process.env,readFileSync(stagePath,"utf8"),stageSha,costSha,head) as unknown as OwnerContext;
 if(process.env.V39_DATABASE_RUNTIME_URL&&process.env.V39_DATABASE_RUNTIME_URL===s.url)
  hold("OWNER_DB_MUST_NOT_BE_RUNTIME_LOGIN");
 const a=verifyP6SourceEnableAuthFile(authPath,head);
 if(a.verdict.verified!==true||a.artifactHash!==authSha)
  hold("EXACT_APPROVED_EXISTING_LEDGER_AUTH_REQUIRED");
 verifyP6SourceActivationReview(s,a as Verify,new Date());
 if(head!==remote())hold("MAIN_CHANGED_BEFORE_TRANSITION");
 // One writing owner session + separate independent READ ONLY session.
 const pool=new Pool({connectionString:s.url,max:2,connectionTimeoutMillis:8000,query_timeout:20000,
  application_name:"p6_exact_existing_source_authorization"});
 try{
  const receipt=await commitP6ExistingSourceAuthorizationOnce(pool,s,a as Verify);
  // Emit the actual acknowledged transition before the fresh readback. An
  // uncertain second read must never lead the owner to replay the first.
  console.log(JSON.stringify(receipt));
  const fresh=await verifyP6EnabledSourceAuthorizationReceipt(pool,receipt);
  if(head!==remote())hold("MAIN_CHANGED_AFTER_COMMIT_DO_NOT_REPLAY");
  console.log(JSON.stringify({status:"P6_SOURCE_AUTH_ENABLED_INDEPENDENT_READBACK_NO_PAID_DISPATCH",...fresh}));
 }finally{await pool.end();}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(e=>{
  const m=String(e?.message??"");
  console.error(/^HOLD_P6_EXACT_SOURCE_AUTH_[A-Z0-9_]+$/.test(m)?m:"HOLD_P6_EXACT_SOURCE_AUTH_REDACTED_RECONCILE_NO_REPLAY");
  process.exitCode=2;
 });
}
