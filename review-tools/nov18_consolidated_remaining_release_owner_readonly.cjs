'use strict';
// One owner-local batch: actual stage/cost status, effective destruction privileges,
// installed function fingerprints, candidate byte integrity, secret-name presence.
// This does not stage, sign, enable, modify retention, export flight data or prove PITR.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const PIN='70580b3749544dfcbeff39da181b2aa42b1b4476',R='HKcode22/ReplitTranvr';
const MANIFEST='9f6a12965dcf3eb911da4b13b3d58e5b8ebd0c6544861f499b7ec807cf0dbe25';
const HASHES={'manifest-candidate.json':MANIFEST,'source-inventory.json':'6cf7dbe2421604fed2909f6539f68021103137eb5d320c40faf28dfb799fd6a0','config-candidate.json':'4055c04207222f5dbdda7d124c30f7bfdc40e852e68fef38df4d1e93e0659edb','external-input-offline-review-NOT-STAGE.json':'a7508acbea9de20ffb3e69771b94f0d6b61f47e77f6bafe38376a9a7c8454fe9'};
const TABLES=['adb_phase6_calendar_day','adb_phase6_authorization','adb_sampling_draw','phase5_fids_cycle_budget_v39','phase5_fids_utc_charge_budget_v39','phase5_fids_seven_rest_release_v39','phase5_fids_cycle_rest_category_cap_v39','phase5_fids_utc_rest_category_budget_v39','phase5_fids_day_budget_v39','phase5_fids_allowed_query_v39','phase5_fids_exact_query_partition_v39','phase5_fids_physical_attempt_v39','phase5_other_rest_physical_reservation_v39','phase5_fids_original_binding_v39','phase5_fids_github_prearm_v39','phase5_t24_postcommit_witness_v39','adb_incident_stop','adb_probe_budget_day','adb_collection_batches','adb_collection_subs'];
const RESEARCH=['clean.flight_snapshots','clean.flight_outcomes','clean.population_research_membership','clean.population_research_outcome_link','clean.phase5_t24_postcommit_witness_v39'];
const STAGES=['adb_phase6_calendar_day','adb_phase6_authorization','phase5_fids_cycle_budget_v39','phase5_fids_utc_charge_budget_v39','phase5_fids_seven_rest_release_v39','phase5_fids_cycle_rest_category_cap_v39','phase5_fids_utc_rest_category_budget_v39'];
const SECRETS=['P5_V39_B0062_PRELAUNCH_STAGE_DATABASE_URL','P5_V39_V0093_COST_ONLY_BUDGET_DATABASE_URL','P6_PRIVATE_READER_DATABASE_URL','P6_PRIVATE_PUBLISHER_DATABASE_URL','P6_INERT_STAGE_INPUT_JSON','P6_INERT_STAGE_INPUT_SHA256','P6_INERT_CALENDAR_REVIEW_APPROVED','P6_INERT_COST_REVIEW_APPROVED','P6_INERT_COST_ENVELOPE_SHA256','V39_P5_APPROVED_CODE_SHA','V39_P5_MANIFEST_SHA256','V39_P5_RELEASE_SHA256','V39_P5_RIGHTS_SHA256','V39_PHASE5_FREEZE_SIGNED','V39_PHASE5_SOURCE_RIGHTS_APPROVED','P6_NONPAID_DAILY_POLICY_BASE64','P6_NONPAID_DAILY_POLICY_SHA256','P6_NONPAID_SIGNING_POLICY_BASE64','P6_NONPAID_SIGNING_POLICY_SHA256','P6_NONPAID_TRANSPORT_TRUST_BASE64','P6_NONPAID_TRANSPORT_TRUST_SHA256','P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64','P6_PRIVATE_POST_REVIEWER_TRUST_BASE64','P6_NONPAID_DAILY_REVIEWER_PRIVATE_KEY_BASE64','P6_NONPAID_QUERY_REVIEWER_PRIVATE_KEY_BASE64','P6_NONPAID_REGISTRY_REVIEWER_PRIVATE_KEY_BASE64','P6_PRIVATE_DAY_REVIEWER_KEY_BASE64','P6_PRIVATE_LATER_REVIEWER_KEY_BASE64','P6_PRIVATE_POST_REVIEWER_KEY_BASE64','P6_PRIVATE_T24_CUSTODY_REVIEWER_KEY_BASE64'];
const FLAG_EXPECTED={P6_NONPAID_SOURCE_SCHEDULE_ENABLED:'false',P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED:'false',P6_PRIVATE_POST_PARENT_ENABLED:'false',P6_NATIVE_LATER_RUNTIME_ENABLED:'0',P6_NATIVE_POST_PRODUCER_ENABLED:'0',P6_PRIVATE_CURRENT_PRE_SCHEDULE_ENABLED:'0',P6_PRIVATE_T24_EXECUTION_ENABLED:'0',P6_PRIVATE_LATER_ENROLL_SCHEDULE_ENABLED:'0',P6_PRIVATE_T24_ENROLL_SCHEDULE_ENABLED:'0',P5_CD_GH_PRE_SCHEDULE_ENABLED:'0',P5_CD_GH_T24_SCHEDULE_ENABLED:'0',P6_ROLLING_CONTROLLER_ENABLED:'0',P5_AUTO_SOURCE_DISPATCH_ENABLED:'false',P5_POST_AUTO_DISPATCH_ENABLED:'false',P5_T24_AUTO_DISPATCH_ENABLED:'false',P5_LATER_PRE_AUTO_DISPATCH_ENABLED:'false',P5_LATER_PRE_BATCH_AUTO_DISPATCH_ENABLED:'false'};
const fail=x=>{throw Error('HOLD_P5_CONSOLIDATED_'+x)};
const need=(v,k)=>{if(!v)fail(k);};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const n=v=>Number.isSafeInteger(v)&&v>=0;
function state(c,a){
 if(STAGES.some(k=>!n(c[k])))return 'MISSING_STAGE_TABLE_OR_COUNTS';
 if(!a||!n(a.enabled)||!n(a.disabled)||!n(a.revoked))return 'AUTHORIZATION_COUNTS_INVALID';
 if(a.enabled>0)return 'ALREADY_ENABLED_RECONCILE_NO_REPLAY';
 if(STAGES.every(k=>c[k]===0))return 'EMPTY_EXISTING_STAGE_TABLES';
 if(c.adb_phase6_calendar_day===31&&c.adb_phase6_authorization===1&&a.disabled===1&&a.revoked===0&&c.phase5_fids_cycle_budget_v39===1&&c.phase5_fids_utc_charge_budget_v39===38){
  if(c.phase5_fids_seven_rest_release_v39===0&&c.phase5_fids_cycle_rest_category_cap_v39===0&&c.phase5_fids_utc_rest_category_budget_v39===0)return 'CALENDAR_SHAPE_PRESENT_EXACT_READBACK_REQUIRED';
  if(c.phase5_fids_seven_rest_release_v39===1&&c.phase5_fids_cycle_rest_category_cap_v39===7&&c.phase5_fids_utc_rest_category_budget_v39===266)return 'CALENDAR_COST_SHAPE_PRESENT_EXACT_READBACK_REQUIRED';
 }
 return 'PARTIAL_OR_HISTORICAL_STAGE_RECONCILE_NO_REPLAY';
}
function researchWrites(s){
 const re=/\b(delete\s+from|truncate(?:\s+table)?|drop\s+table|update)\s+(?:only\s+)?(?:(?:"?clean"?)\s*\.\s*)?"?(flight_snapshots|flight_outcomes|population_research_membership|population_research_outcome_link|phase5_t24_postcommit_witness_v39)"?\b/gi;
 return [...new Set([...String(s).matchAll(re)].map(m=>m[1].toUpperCase().replace(/\s+/g,' ')+':'+m[2].toLowerCase()))].sort();
}
function localReview(){
 const home=fs.realpathSync(os.homedir());
 const dirs=fs.readdirSync(home).filter(x=>/^\.phase5-final-review-[A-Za-z0-9_-]+$/.test(x)).sort();
 need(dirs.length<=100,'REVIEW_DIR_BOUND');
 const matches=[];
 for(const d of dirs){
  const parent=path.join(home,d),dir=path.join(parent,'nov18-'+PIN.slice(0,12));
  if(!fs.existsSync(dir))continue;
  const st=fs.lstatSync(parent),dt=fs.lstatSync(dir);
  if(!st.isDirectory()||!dt.isDirectory()||st.uid!==process.getuid()||dt.uid!==process.getuid()||(st.mode&0o077)!==0||(dt.mode&0o077)!==0)continue;
  let ok=true,files={};
  for(const [name,expected] of Object.entries(HASHES)){
   const f=path.join(dir,name);
   if(!fs.existsSync(f)){ok=false;break;}
   const s=fs.lstatSync(f);
   if(!s.isFile()||s.uid!==process.getuid()||s.nlink!==1||(s.mode&0o077)!==0||s.size>4*1024*1024){ok=false;break;}
   const b=fs.readFileSync(f),sha=hash(b);if(sha!==expected){ok=false;break;}
   files[name]=JSON.parse(b.toString('utf8'));
  }
  if(ok){
   const m=files['manifest-candidate.json'],d=files['external-input-offline-review-NOT-STAGE.json'];
   need(m.scientificFreezeApproved===false&&m.finalPredecessorsApproved===false&&m.phase6PaidGo===false&&d.phase6AuthorizationId===null&&d.predecessorEvidenceIds===null&&d.manifestSha256===MANIFEST&&d.codeSha40===PIN,'UNSIGNED_REVIEW_SCOPE_DRIFT');
   matches.push({verifiedFiles:4,manifestCandidateSha256:MANIFEST,sourceInventoryCount:files['source-inventory.json'].length,unapproved:true,actualAuthorizationId:null});
  }
 }
 return {exactMatchingLocalReviewCount:matches.length,review:matches[0]??null,recoveryNeeded:matches.length===0,stagePacketCertified:false};
}
const gh=(args)=>execFileSync('gh',args,{encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024,stdio:['ignore','pipe','ignore']}).trim();
const live=()=>gh(['api','repos/'+R+'/git/ref/heads/main','--jq','.object.sha']);
const objects=s=>s.split('\n').filter(Boolean).map(l=>JSON.parse(l));
function githubReview(){
 const names=new Set(gh(['secret','list','-R',R,'--json','name','--jq','.[].name']).split('\n').filter(Boolean));
 const vars=objects(gh(['api','--paginate','repos/'+R+'/actions/variables?per_page=100','--jq','.variables[] | @json']));
 const v=new Map(vars.map(x=>[x.name,x.value]));
 return {presentRequiredSecretNames:SECRETS.filter(x=>names.has(x)),absentRequiredSecretNames:SECRETS.filter(x=>!names.has(x)),
  repositorySecretNamesOnly:true,candidateModeFlags:Object.entries(FLAG_EXPECTED).map(([name,expected])=>({name,state:!v.has(name)?'UNSET':v.get(name)===expected?'MATCHES_STOP_REFERENCE':'OTHER_VALUE_REVIEW'})),
  secretValuesRead:false,actualApprovalValuesRead:false,flagReferenceOnlyNotGlobalStopProof:true};
}
async function review(c){
 let tx=false;const read=async(q,args=[])=> (await c.query(q,args)).rows;
 try{
  await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');tx=true;
  await c.query("SET LOCAL statement_timeout='12000ms'");await c.query("SET LOCAL lock_timeout='2000ms'");
  const id=(await read("SELECT current_database() db,current_user actor,session_user login,current_setting('server_version_num')::int ver,current_setting('transaction_read_only') ro,pg_is_in_recovery() replica,transaction_timestamp() t"))[0];
  need(id?.db==='neondb'&&id.actor==='neondb_owner'&&id.actor===id.login&&id.ver>=160000&&id.ver<170000&&id.ro==='on'&&id.replica===false,'EXACT_PG16_OWNER_READONLY');
  const counts={};
  for(const t of TABLES){const present=(await read("SELECT to_regclass($1) IS NOT NULL present",['clean.'+t]))[0].present;
   counts[t]=present?(await read('SELECT count(*)::int n FROM clean.'+t))[0].n:null;
   need(counts[t]===null||n(counts[t]),'COUNT_SHAPE');
  }
  const auth=counts.adb_phase6_authorization===null?null:(await read("SELECT count(*) FILTER(WHERE enabled AND revoked_at_utc IS NULL)::int enabled,count(*) FILTER(WHERE NOT enabled AND revoked_at_utc IS NULL)::int disabled,count(*) FILTER(WHERE revoked_at_utc IS NOT NULL)::int revoked FROM clean.adb_phase6_authorization"))[0];
  const stop=(await read("SELECT (SELECT count(*)::int FROM clean.adb_incident_stop WHERE NOT resolved) unresolved_incidents,(SELECT count(*)::int FROM clean.adb_probe_budget_day WHERE state='OPEN') open_probe_budgets,(SELECT count(*)::int FROM clean.adb_collection_batches WHERE status='ACTIVE' OR run_day_index IS NOT NULL) activation_blocking_batches,(SELECT count(*)::int FROM clean.adb_collection_subs WHERE ended_at IS NULL) unended_subscriptions,(SELECT count(*)::int FROM clean.adb_collection_meta WHERE key LIKE 'phase6_source_authorization_enabled:%') prior_enable_markers,(SELECT count(*)::int FROM clean.adb_collection_meta WHERE key LIKE 'phase5_frozen_manifest:%') stored_manifest_count,(SELECT count(*)::int FROM clean.adb_collection_meta WHERE key=$1) exact_unsigned_candidate_key_count",['phase5_frozen_manifest:'+MANIFEST]))[0];
  need(Object.values(stop).every(n),'STOP_COUNT_SHAPE');
  const roles=(await read("SELECT rolname,rolcanlogin,rolsuper,rolcreaterole,rolcreatedb,rolreplication,rolbypassrls FROM pg_roles WHERE rolname=ANY($1::text[])",
   [['phase5_b0062_prelaunch_stage_prod20261113','phase5_fids_budget_freeze_prod20261113','phase6_private_reader_login_prod20261115','phase6_private_publisher_login_prod20261115']]));
  const grants=await read("SELECT r.rolname role,r.rolcanlogin login,t.relname relation,has_table_privilege(r.oid,t.oid,'DELETE') can_delete,has_table_privilege(r.oid,t.oid,'TRUNCATE') can_truncate,has_table_privilege(r.oid,t.oid,'UPDATE') can_update FROM pg_roles r CROSS JOIN pg_class t JOIN pg_namespace ns ON ns.oid=t.relnamespace WHERE (r.rolname ~ '^(phase5_|phase6_|v39_)' OR r.rolname=current_user) AND ns.nspname||'.'||t.relname=ANY($1::text[]) AND (has_table_privilege(r.oid,t.oid,'DELETE') OR has_table_privilege(r.oid,t.oid,'TRUNCATE') OR has_table_privilege(r.oid,t.oid,'UPDATE')) ORDER BY 1,3",[RESEARCH]);
  need(grants.length<=1000,'GRANT_BOUND');
  // Do not print function bodies. Inspect static direct references and hash
  // active routine definitions to make later code-vs-installed review possible.
  const funcs=await read("SELECT ns.nspname schema,p.proname name,pg_get_function_identity_arguments(p.oid) args,p.prosrc body,p.prosecdef security_definer FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace WHERE ns.nspname IN ('clean','phase6_private') AND p.prokind IN ('f','p') ORDER BY 1,2,3");
  need(funcs.length<=2000,'ROUTINE_BOUND');
  const direct=funcs.flatMap(r=>{const matches=researchWrites(r.body);return matches.length?[{schema:r.schema,name:r.name,bodySha256:hash(r.body),securityDefiner:r.security_definer,staticResearchWriteReferences:matches}]:[];});
  const triggerNames=['phase5_cd_scope_snapshot_immutable_v39','phase5_cd_scope_snapshot_insert_v39','attach_population_member_to_snapshot','sync_population_research_outcome_link','expire_fids_population_from_response','phase5_t24_witness_immutable_v39','phase5_primary_fids_expiry_sweep_v39','phase6_private_epoch_expiry_sweep_v39','phase5_physical_rest_live_guard_v39'];
  const triggerFunctionIdentities=funcs.filter(r=>triggerNames.includes(r.name)).map(r=>({schema:r.schema,name:r.name,bodySha256:hash(r.body),securityDefiner:r.security_definer}));
  const settings=await read("SELECT name,setting FROM pg_settings WHERE name=ANY($1::text[]) ORDER BY name",[['archive_mode','wal_level','data_checksums','track_commit_timestamp']]);
  await c.query('ROLLBACK');tx=false;
  return {observedAtUtc:new Date(id.t).toISOString(),counts,authorization:auth,stageState:state(counts,auth),activationBlockingCounts:stop,existingStageAndTransportRoleCatalog:roles,
   researchMutationPrivilegeEdges:grants,staticRoutineScan:{checked:funcs.length,matching:direct,selectedGuardIdentities:triggerFunctionIdentities,dynamicSqlAndExternalApplicationsProven:false},
   postgresSettings:settings,neonManagementHistoryWindowVerified:false,backupRestoreVerified:false,stageExactValuesVerified:false,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
 }finally{if(tx)await c.query('ROLLBACK').catch(()=>{});}
}
function canonicalHost(h){return String(h||'').toLowerCase().replace(/-pooler(?=\.)/,'');}
async function management(u){
 const key=process.env.NEON_API_KEY,project=process.env.NEON_PROJECT_ID;
 if(!key||!project)return {status:'NEON_MANAGEMENT_SETTINGS_NOT_AVAILABLE_IN_EXISTING_ENV',managementReads:0,historyWindowVerified:false,restoreVerified:false};
 if(!/^[a-z0-9-]{1,60}$/.test(project))return {status:'NEON_PROJECT_ID_FORMAT_REVIEW',managementReads:0,historyWindowVerified:false,restoreVerified:false};
 let reads=0;
 const get=async suffix=>{reads++;const r=await fetch('https://console.neon.tech/api/v2/projects/'+project+suffix,{method:'GET',headers:{Authorization:'Bearer '+key,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('MGMT_HTTP');return r.json();};
 try{
  const ep=await get('/endpoints');
  if(!Array.isArray(ep.endpoints)||ep.endpoints.filter(x=>canonicalHost(x.host)===canonicalHost(u.hostname)&&x.type==='read_write').length!==1)
   return {status:'NEON_MANAGEMENT_PROJECT_NOT_MATCHED_TO_EXISTING_PRODUCTION_ENDPOINT',managementReads:reads,historyWindowVerified:false,restoreVerified:false};
  const info=await get('');
  const x=info.project;
  if(x?.id!==project||!n(x.history_retention_seconds))
   return {status:'NEON_MANAGEMENT_RESPONSE_HISTORY_FIELD_UNAVAILABLE',managementReads:reads,historyWindowVerified:false,restoreVerified:false};
  return {status:'NEON_EXISTING_ENDPOINT_MATCHED_HISTORY_SETTING_READONLY',managementReads:reads,historyRetentionSeconds:x.history_retention_seconds,historyWindowVerified:true,restoreVerified:false,settingsChanged:false};
 }catch{return {status:'NEON_MANAGEMENT_READ_FAILED_NO_SETTINGS_CHANGED',managementReads:reads,historyWindowVerified:false,restoreVerified:false};}
}
async function main(){
 const e=process.env;need(e.GITHUB_ACTIONS!=='true'&&e.DATABASE_URL&&!e.AERODATABOX_API_KEY&&!e.RAPIDAPI_KEY&&!e.AERODATABOX_WEBHOOK_SECRET&&e.NODE_TLS_REJECT_UNAUTHORIZED!=='0','OWNER_SCOPE');
 need(live()===PIN,'MAIN_CHANGED');
 const u=new URL(e.DATABASE_URL);need(['postgres:','postgresql:'].includes(u.protocol)&&decodeURIComponent(u.username)==='neondb_owner'&&u.password&&u.hostname.endsWith('.neon.tech')&&u.pathname==='/neondb'&&['require','verify-full'].includes(u.searchParams.get('sslmode'))&&!u.hash&&[...u.searchParams.keys()].every(k=>['sslmode','channel_binding'].includes(k)),'EXISTING_TLS_OWNER_REQUIRED');
 u.searchParams.set('sslmode','verify-full');
 const {Client}=require(require.resolve('pg',{paths:[process.cwd()]}));const c=new Client({connectionString:u.toString(),connectionTimeoutMillis:8000,query_timeout:15000,options:'-c default_transaction_read_only=on',application_name:'p5_consolidated_release_inventory'});
 try{await c.connect();const db=await review(c);console.log(JSON.stringify({status:'P5_CONSOLIDATED_PRODUCTION_REMAINING_INVENTORY_READONLY',main:PIN,...db}));}finally{await c.end().catch(()=>{});}
 const local=localReview(),github=githubReview(),recoverySettings=await management(u);need(live()===PIN,'MAIN_CHANGED_DURING_REVIEW');
 console.log(JSON.stringify({status:'P5_CONSOLIDATED_PRIVATE_CANDIDATE_AND_GITHUB_METADATA_NO_GO',main:PIN,local,github,recoverySettings,providerCalls:0,databaseWrites:0,githubMutations:0,phase6PaidGo:false}));
}
module.exports={state,researchWrites,canonicalHost};
if(require.main===module)main().catch(e=>{console.error(/^HOLD_P5_CONSOLIDATED_[A-Z0-9_]+$/.test(e.message)?e.message:'HOLD_P5_CONSOLIDATED_REDACTED');process.exitCode=2;});
