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
import {verifyP6SourceEnableAuthFile,P6_SOURCE_AUTH_PHASE,P6_SOURCE_AUTH_SCOPE,P6_SOURCE_RELEASE_EVIDENCE_HASH_FIELDS} from "./v39_phase6_source_enable_approval_ledger_v39";
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
const requiredEvidence=P6_SOURCE_RELEASE_EVIDENCE_HASH_FIELDS;
const POST_STAGE_APPROVAL_LEDGER_PATH="data-collection/evidence/ledgers/V3.9_PHASE6_SOURCE_ENABLE_APPROVALS.json";
const POST_STAGE_EVIDENCE_PATH=/^data-collection\/phase5\/evidence\/[A-Za-z0-9][A-Za-z0-9_.-]{0,180}\.(?:json|md)$/;
const POST_STAGE_REVIEWED_BRIDGE_STAGE="ae0915d1eb0c37651d280ff3f178efdb640ed509";
export const P6_POST_STAGE_REVIEWED_BRIDGE_SELF_SHA256="f9df88ea47dc7d1ea86161811785c08c58ab27a76f309178214c7bbcf9e15489";
export const P6_POST_STAGE_REVIEWED_BRIDGE_COMPANION_BLOBS=Object.freeze({
 "tests/phase5_source_rights_deferred_to_phase6_activation_v39.test.mjs":"3d5f3826e00ea5b18dbf31b223900d660afa553e",
 "tests/phase6_poststage_evidence_only_main_advance_v39.test.ts":"7eab4f255b1aec3daccf453c744f53949e247ca1"
});
const POST_STAGE_REVIEWED_BRIDGE_SCRIPT="scripts/v39_phase6_enable_source_owner_v39.ts";
function normalizedBridgeSelfSha256(){
 const raw=readFileSync(fileURLToPath(import.meta.url),"utf8");
 const normalized=raw.replace(
  /(?:export )?const P6_POST_STAGE_REVIEWED_BRIDGE_SELF_SHA256="[a-f0-9]{64}";/,
  'export const P6_POST_STAGE_REVIEWED_BRIDGE_SELF_SHA256="'+"0".repeat(64)+'";');
 if(normalized===raw&&P6_POST_STAGE_REVIEWED_BRIDGE_SELF_SHA256!=="0".repeat(64))
  hold("POST_STAGE_REVIEWED_BRIDGE_SELF_NORMALIZATION");
 return createHash("sha256").update(normalized,"utf8").digest("hex");
}

/** #879 deliberately permits Phase5 to stage the disabled calendar/cost state
 * before source-use permission exists. A later source-rights/approval commit
 * therefore must not invalidate the already-staged executable SHA. Only a
 * strict descendant containing scoped evidence files and/or the dedicated
 * SOURCE approval ledger is permitted; any executable/config/workflow change
 * still fails closed and requires a new prospective stage.
 */
export function verifyP6PostStageEvidenceOnlyMainAdvance(stageCode:string,currentHead:string,changedPaths:string[],stageIsAncestor:boolean){
 if(!CODE.test(stageCode??"")||!CODE.test(currentHead??"")||!Array.isArray(changedPaths)||
    changedPaths.some(p=>typeof p!=="string"||p.length<1)||new Set(changedPaths).size!==changedPaths.length)
  hold("POST_STAGE_MAIN_IDENTITY_INVALID");
 if(stageCode===currentHead){
  if(changedPaths.length!==0)hold("POST_STAGE_IDENTICAL_MAIN_HAS_DIFF");
  return {stageCode,currentHead,evidenceOnlyAdvance:false,changedPaths:0};
 }
 if(stageIsAncestor!==true||changedPaths.length<1||
    changedPaths.some(p=>p!==POST_STAGE_APPROVAL_LEDGER_PATH&&!POST_STAGE_EVIDENCE_PATH.test(p)))
  hold("POST_STAGE_MAIN_NOT_EVIDENCE_ONLY_DESCENDANT");
 return {stageCode,currentHead,evidenceOnlyAdvance:true,changedPaths:changedPaths.length};
}

/** The owner completed inert B0062/V0093 at the #879 production SHA before
 * #881 could be merged. Permit exactly that one independently reviewed
 * executable bridge, then restore the evidence-only rule from the bridge
 * commit forward. A later edit to any bridge file therefore fails closed.
 */
export function verifyP6PostStageReviewedBridgeAdvance(input:{
 stageCode:string;currentHead:string;stageIsAncestor:boolean;
 changedPaths:string[];currentBridgeBlobs:Record<string,string>;selfNormalizedSha256:string;
}){
 const {stageCode,currentHead,stageIsAncestor,changedPaths,currentBridgeBlobs,selfNormalizedSha256}=input;
 if(stageCode!==POST_STAGE_REVIEWED_BRIDGE_STAGE||
    !CODE.test(currentHead??"")||stageIsAncestor!==true||
    !Array.isArray(changedPaths)||new Set(changedPaths).size!==changedPaths.length||
    !currentBridgeBlobs||typeof currentBridgeBlobs!=="object"||Array.isArray(currentBridgeBlobs)||
    !H.test(selfNormalizedSha256??""))
  hold("POST_STAGE_REVIEWED_BRIDGE_IDENTITY_INVALID");
 const companionPaths=Object.keys(P6_POST_STAGE_REVIEWED_BRIDGE_COMPANION_BLOBS).sort();
 const bridgePaths=[POST_STAGE_REVIEWED_BRIDGE_SCRIPT,...companionPaths].sort();
 if(selfNormalizedSha256!==P6_POST_STAGE_REVIEWED_BRIDGE_SELF_SHA256)
  hold("POST_STAGE_REVIEWED_BRIDGE_SELF_CHANGED");
 if(companionPaths.some(p=>currentBridgeBlobs[p]!==P6_POST_STAGE_REVIEWED_BRIDGE_COMPANION_BLOBS[p]))
  hold("POST_STAGE_REVIEWED_BRIDGE_BLOB_CHANGED");
 if(changedPaths.length<bridgePaths.length||
    bridgePaths.some(p=>!changedPaths.includes(p))||
    changedPaths.some(p=>!bridgePaths.includes(p)&&
      p!==POST_STAGE_APPROVAL_LEDGER_PATH&&!POST_STAGE_EVIDENCE_PATH.test(p)))
  hold("POST_STAGE_AFTER_BRIDGE_NOT_EVIDENCE_ONLY");
 return {stageCode,currentHead,reviewedBridgeApplied:true,
  reviewedBridgePaths:bridgePaths.length,evidenceOnlyChangedPaths:
   changedPaths.filter(p=>!bridgePaths.includes(p)).length};
}

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

/** Verify the already-reviewed immutable bytes, not a newly generated approval.
 * Same key and byte contract as the existing owner-local manifest store.
 * Independent approval of manifest completeness remains outside this function.
 */
async function requireStoredReviewedManifest(c:import("pg").PoolClient,p:{manifestSha256:string;calendarSha256:string;configSha256:string}){
 const rows=(await c.query("SELECT value FROM clean.adb_collection_meta WHERE key=$1",
  ["phase5_frozen_manifest:"+p.manifestSha256])).rows;
 const raw=rows[0]?.value;
 if(rows.length!==1||typeof raw!=="string"||Buffer.byteLength(raw)<100||
    Buffer.byteLength(raw)>2*1024*1024||
    createHash("sha256").update(raw,"utf8").digest("hex")!==p.manifestSha256)
  hold("STORED_REVIEWED_MANIFEST_MISSING_OR_DIFFERENT");
 let m:any;try{m=JSON.parse(raw);}catch{hold("STORED_REVIEWED_MANIFEST_INVALID_JSON");}
 const rightsAtManifest=m?.sourceRightsApproved===true;
 const rightsDeferred=m?.sourceRightsApproved===false&&m?.sourceUseDeferredToPhase6Activation===true;
 if(!m||typeof m!=="object"||Array.isArray(m)||typeof m.schema!=="string"||
    !m.schema.startsWith("v39.")||m.scientificFreezeApproved!==true||
    (!rightsAtManifest&&!rightsDeferred)||m.phase6PaidGo!==false||
    m.calendarRowsSha256!==p.calendarSha256||m.configSha256!==p.configSha256)
  hold("STORED_MANIFEST_NOT_FINAL_REVIEWED");
}

/** Re-use the exact installed V0104 migration body and physical boundaries.
 * Installation history alone is not proof a trigger is still enabled.
 * In the write transaction the two existing physical tables are locked;
 * this is only a catalog read, never a new migration or retention action.
 */
async function requireInstalledPhysicalRestGuard(c:import("pg").PoolClient){
 const sql=readFileSync(new URL("../migrations/staged/V0104__phase5_physical_rest_live_authority_retention_guard_v39.sql",import.meta.url));
 if(createHash("sha1").update(Buffer.from("blob "+sql.length+"\0")).update(sql).digest("hex")!=="578c76e025bf761f61803e3d70af40ae4a8136e8")
  hold("PHYSICAL_REST_GUARD_REVIEWED_SQL_DRIFT");
 const body=sql.toString("utf8").match(/AS \$guard\$([\s\S]*?)\$guard\$;/)?.[1];
 const f=(await c.query(`SELECT p.oid::text oid,p.prosrc body,p.pronargs::int nargs,
  p.prosecdef definer,p.provolatile vol,p.prokind kind,p.proconfig config,
  l.lanname lang,p.prorettype='trigger'::regtype returns_trigger,
  pg_get_userbyid(p.proowner)=current_user owner_matches,
  current_setting('session_replication_role')='origin' origin,
  NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
   WHERE a.grantee<>p.proowner OR a.privilege_type<>'EXECUTE') owner_only
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  JOIN pg_language l ON l.oid=p.prolang
  WHERE n.nspname='clean' AND p.proname='phase5_physical_rest_live_guard_v39'`)).rows;
 const q=f[0];
 if(!body||f.length!==1||!q||q.body!==body||q.nargs!==0||q.definer!==true||
  q.vol!=="v"||q.kind!=="f"||q.lang!=="plpgsql"||q.returns_trigger!==true||
  q.owner_matches!==true||q.owner_only!==true||q.origin!==true||
  !Array.isArray(q.config)||q.config.length!==1||
  String(q.config[0]).replace(/\s/g,"")!=="search_path=pg_catalog,pg_temp")
  hold("PHYSICAL_REST_GUARD_FUNCTION_MISSING_OR_DRIFTED");
 const tables=["phase5_fids_physical_attempt_v39","phase5_other_rest_physical_reservation_v39"];
 const names=["a00_phase5_fids_physical_rest_live_guard_v39","a00_phase5_other_physical_rest_live_guard_v39"];
 const tr=(await c.query(`SELECT t.tgname name,n.nspname schema,c.relname tbl,
  pg_get_userbyid(c.relowner)=current_user owner_matches,t.tgfoid::text fn,t.tgenabled enabled,
  t.tgtype::int type,t.tgnargs::int nargs,t.tgqual IS NULL no_when,t.tgattr::text attrs,
  t.tgconstraint=0 no_constraint,t.tgdeferrable deferred,t.tginitdeferred initdeferred,
  t.tgoldtable oldtable,t.tgnewtable newtable
  FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE NOT t.tgisinternal AND (t.tgfoid=$1::oid OR (n.nspname='clean' AND t.tgname=ANY($2::text[])))`,
  [q.oid,names])).rows;
 if(tr.length!==2||names.some((name,i)=>!tr.some(x=>x.name===name&&x.schema==="clean"&&
  x.tbl===tables[i]&&x.owner_matches===true&&x.fn===q.oid&&x.enabled==="O"&&x.type===7&&
  x.nargs===0&&x.no_when===true&&x.attrs===""&&x.no_constraint===true&&
  x.deferred===false&&x.initdeferred===false&&x.oldtable===null&&x.newtable===null)))
  hold("PHYSICAL_REST_GUARD_TRIGGER_MISSING_OR_DRIFTED");
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
 "phase5_fids_physical_attempt_v39","phase5_other_rest_physical_reservation_v39","adb_incident_stop","adb_probe_budget_day",
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
  await requireStoredReviewedManifest(c,p);
  await requireInstalledPhysicalRestGuard(c);
  const readback=await inspectP5V0093IndependentExactPostStage(pool,s.input,s.review,s.freezeReview);
  if(readback.status!=="INDEPENDENT_EXACT_B0062_V0093_POST_STAGE_READONLY_MATCH_NO_GO"||
     readback.alertSafetyValuesExact!==true||readback.authorizationEnabled!==false||
     readback.exactReviewedStagePacketSha256!==p.stagePacketSha256||
     readback.exactReviewedCostEnvelopeSha256!==cost.costOnlyCategoryDraftSha256)
   hold("EXACT_INDEPENDENT_STAGED_READBACK_REQUIRED");
  await requireInstalledPhysicalRestGuard(c);
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
   enabledAtDatabaseUtc:t.toISOString(),independentStagedValuesMatch:true,exactPhysicalRestGuardVerified:true,
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
  await requireStoredReviewedManifest(c,receipt);
  await requireInstalledPhysicalRestGuard(c);
  await c.query("ROLLBACK");began=false;
  return {verifiedReadOnly:true,exactEnabledRowAndDurableMarker:true,exactStoredReviewedManifest:true,exactPhysicalRestGuardVerified:true,observedAtUtc:new Date(who.t).toISOString(),
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
 const stageRaw=readFileSync(stagePath,"utf8");
 let stageCode:string;try{stageCode=JSON.parse(stageRaw)?.codeSha40;}catch{hold("STAGED_CODE_IDENTITY_INVALID");}
 if(!CODE.test(stageCode??""))hold("STAGED_CODE_IDENTITY_INVALID");
 let ancestor=stageCode===head;
 if(!ancestor){
  try{execFileSync("git",["merge-base","--is-ancestor",stageCode,head],{stdio:["ignore","ignore","ignore"],timeout:15000});ancestor=true;}catch{}
 }
 if(stageCode===POST_STAGE_REVIEWED_BRIDGE_STAGE&&head!==stageCode){
  const changed=cmd("git",["diff","--no-renames","--name-only",stageCode,head]).split("\n").filter(Boolean);
  const currentBridgeBlobs=Object.fromEntries(Object.keys(P6_POST_STAGE_REVIEWED_BRIDGE_COMPANION_BLOBS).map(p=>
   [p,cmd("git",["rev-parse",head+":"+p])]));
  verifyP6PostStageReviewedBridgeAdvance({stageCode,currentHead:head,stageIsAncestor:ancestor,
   changedPaths:changed,currentBridgeBlobs,selfNormalizedSha256:normalizedBridgeSelfSha256()});
 }else{
  const changed=stageCode===head?[]:cmd("git",["diff","--no-renames","--name-only",stageCode,head]).split("\n").filter(Boolean);
  verifyP6PostStageEvidenceOnlyMainAdvance(stageCode,head,changed,ancestor);
 } // The immutable stage remains bound to the executable SHA that created the
 // disabled B0062/V0093 state. Current HEAD supplies only the one exact
 // reviewed #881 bridge plus later scoped evidence and its approval ledger.
 const s=admitP6InertOwnerReadback(process.env,stageRaw,stageSha,costSha,stageCode) as unknown as OwnerContext;
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
