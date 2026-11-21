'use strict';
// Gate 3 only: owner-local READ ONLY metadata, no source row, no source value,
// no provider/HTTP, no replica names or endpoints, no managed custody inference.
// Deliberately not an installer or a paid release decision.
const HOLD=s=>{throw Error('HOLD_P6_NONPITR_'+s)};
const settings=Object.freeze({
 log_statement:/^(none|ddl|mod|all)$/,
 log_min_duration_statement:/^-?[0-9]+$/,
 log_min_duration_sample:/^-?[0-9]+$/,
 log_statement_sample_rate:/^[0-9]+(?:\.[0-9]+)?$/,
 log_transaction_sample_rate:/^[0-9]+(?:\.[0-9]+)?$/,
 log_parameter_max_length:/^-?[0-9]+$/,
 log_parameter_max_length_on_error:/^-?[0-9]+$/,
 log_min_error_statement:/^(debug[1-5]|info|notice|warning|error|log|fatal|panic)$/,
 log_min_messages:/^(debug[1-5]|info|notice|warning|error|log|fatal|panic)$/,
 logging_collector:/^(on|off)$/,
 archive_mode:/^(off|on|always)$/,
 wal_level:/^(minimal|replica|logical)$/
});
const identitySql="SELECT current_database() db,current_user actor,session_user login,current_setting('server_version_num')::int ver,current_setting('transaction_read_only') ro,pg_is_in_recovery() replica,transaction_timestamp() observed";
const settingSql="SELECT name,setting FROM pg_settings WHERE name=ANY($1::text[]) ORDER BY name";
const queries=Object.freeze({
 senderSessions:"SELECT count(*)::int total FROM pg_stat_replication",
 receiverSessions:"SELECT count(*)::int total FROM pg_stat_wal_receiver",
 slots:"SELECT count(*)::int total,count(*) FILTER(WHERE slot_type='physical')::int physical,count(*) FILTER(WHERE slot_type='logical')::int logical,count(*) FILTER(WHERE active)::int active FROM pg_replication_slots"
});
const countKeys={senderSessions:['total'],receiverSessions:['total'],slots:['total','physical','logical','active']};
function checkIdentity(rows){
 const a=rows?.[0];
 if(rows?.length!==1||a.db!=='neondb'||a.actor!=='neondb_owner'||a.login!==a.actor||!Number.isInteger(a.ver)||a.ver<160000||a.ver>=170000||a.ro!=='on'||a.replica!==false||!Number.isFinite(new Date(a.observed).getTime()))HOLD('NOT_EXISTING_OWNER_PG16_PRIMARY_READONLY');
 return new Date(a.observed).toISOString();
}
function parseSettings(rows){
 if(!Array.isArray(rows)||rows.length>Object.keys(settings).length)HOLD('SETTING_ROWS');
 const out={};
 for(const r of rows){
  if(!r||Object.keys(r).sort().join('|')!=='name|setting'||!Object.hasOwn(settings,r.name)||Object.hasOwn(out,r.name)||typeof r.setting!=='string'||!settings[r.name].test(r.setting))HOLD('SETTING_VALUE');
  out[r.name]=r.setting;
 }
 return out;
}
function parseCounts(rows,name){
 const k=countKeys[name],a=rows?.[0];
 if(rows?.length!==1||Object.keys(a).sort().join('|')!==[...k].sort().join('|')||k.some(x=>!Number.isSafeInteger(a[x])||a[x]<0||a[x]>a.total)||name==='slots'&&a.physical+a.logical!==a.total)HOLD('COUNT_SHAPE');
 return Object.fromEntries(k.map(x=>[x,a[x]]));
}
async function optionalRead(c,query,args,parse){
 await c.query('SAVEPOINT p6_nonpitr_metadata_check');
 try{
  const value=parse((await c.query(query,args)).rows);
  await c.query('RELEASE SAVEPOINT p6_nonpitr_metadata_check');return {visibility:'VISIBLE_SQL_METADATA_ONLY',value};
 }catch(e){
  await c.query('ROLLBACK TO SAVEPOINT p6_nonpitr_metadata_check');
  await c.query('RELEASE SAVEPOINT p6_nonpitr_metadata_check');
  if(['42501','42P01','42704','0A000'].includes(e?.code))return {visibility:'UNAVAILABLE_OR_RESTRICTED',value:null};
  throw e;
 }
}
async function review(c){
 let began=false;
 try{
  await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');began=true;
  await c.query("SET LOCAL statement_timeout='8000ms'");
  const observedAtUtc=checkIdentity((await c.query(identitySql)).rows);
  const gate=(await c.query("SELECT count(*)::int total,count(*) FILTER(WHERE singleton_key=true AND code_sha=$1 AND manifest_sha256=$2 AND enabled=false AND revoked_at_utc IS NULL)::int exact FROM clean.adb_phase6_authorization",["781140cde71af3b72376c2db9f0fdb84204a2b7c","b2a691cb411af61c2bfdc42c55506e0ee86e45bfa3e22b420bbd738dc98ee4e4"])).rows;
  if(gate.length!==1||gate[0].total!==1||gate[0].exact!==1)HOLD('DISABLED_STAGE_DRIFT');
  const log=await optionalRead(c,settingSql,[Object.keys(settings)],parseSettings);
  const replica={};
  for(const [name,query] of Object.entries(queries))replica[name]=await optionalRead(c,query,[],rows=>parseCounts(rows,name));
  const v=log.value??{},unobservedSettings=Object.keys(settings).filter(k=>!Object.hasOwn(v,k));
  const ordinaryStatementLogMayCapture=v.log_statement!==undefined&&v.log_statement!=='none'||v.log_min_duration_statement!==undefined&&Number(v.log_min_duration_statement)>=0||v.log_min_duration_sample!==undefined&&Number(v.log_min_duration_sample)>=0&&Number(v.log_statement_sample_rate??1)>0||Number(v.log_transaction_sample_rate??0)>0;
  const findings=[];
  if(unobservedSettings.length) findings.push('SQL_SETTINGS_VISIBILITY_INCOMPLETE');
  if(ordinaryStatementLogMayCapture) findings.push('SQL_STATEMENT_OR_DURATION_LOGGING_REVIEW');
  if(v.log_parameter_max_length!==undefined&&Number(v.log_parameter_max_length)!==0&&ordinaryStatementLogMayCapture) findings.push('SQL_PARAMETER_LOGGING_REVIEW');
  if(v.log_parameter_max_length_on_error!==undefined&&Number(v.log_parameter_max_length_on_error)!==0) findings.push('SQL_ERROR_PARAMETER_LOGGING_REVIEW');
  if(v.log_min_error_statement!==undefined&&v.log_min_error_statement!=='panic') findings.push('SQL_ERROR_STATEMENT_TEXT_STILL_POSSIBLE_CHECK_APPLICATION_REDACTION');
  if(Object.values(replica).some(x=>x.value===null)) findings.push('REPLICA_METADATA_VISIBILITY_INCOMPLETE');
  if(Object.values(replica).some(x=>x.value&&x.value.total>0)) findings.push('VISIBLE_REPLICATION_RESOURCE_REVIEW');
  if(v.archive_mode&&v.archive_mode!=='off') findings.push('VISIBLE_WAL_ARCHIVE_MODE_REVIEW');
  await c.query('ROLLBACK');began=false;
  return {schema:'travnr.phase6.nonpitr-visible-sql-metadata.v1',status:'OWNER_VISIBLE_SQL_METADATA_ONLY_MANAGED_CUSTODY_OPEN_NO_GO',observedAtUtc,settings:log,unobservedSettings,replica,findings,managedReadReplicasVerified:false,managedLogRotationVerified:false,managedLogAccessIamVerified:false,replitObjectBucketIamVerified:false,pitrReviewRepeated:false,providerCalls:0,databaseWrites:0,sourceRowsRead:0,exactDisabledStageReadback:true,sourceEnabled:false,phase6PaidGo:false};
 }finally{if(began)await c.query('ROLLBACK').catch(()=>{});}
}
// Follow-up only: identify known infrastructure slots without exporting any
// raw slot names, PID, endpoints, LSNs, or repeating the 12-setting inventory.
// A name match is evidence of a documented convention, NOT proof of remote
// retention, actual ownership, or absence of provider-managed read replicas.
const slotClassSql="SELECT count(*)::int total,count(*) FILTER(WHERE slot_name='wal_proposer_slot' AND slot_type='physical')::int proposer,count(*) FILTER(WHERE slot_name='wal_proposer_slot' AND slot_type='physical' AND active)::int proposer_active,count(*) FILTER(WHERE slot_name='wal_retention_slot' AND slot_type='physical')::int retention,count(*) FILTER(WHERE slot_name='wal_retention_slot' AND slot_type='physical' AND active)::int retention_active,count(*) FILTER(WHERE slot_type='logical')::int logical,count(*) FILTER(WHERE slot_type='physical' AND slot_name NOT IN ('wal_proposer_slot','wal_retention_slot'))::int other_physical FROM pg_catalog.pg_replication_slots";
function parseSlotClasses(rows){
 const a=rows?.[0],keys=['total','proposer','proposer_active','retention','retention_active','logical','other_physical'];
 if(rows?.length!==1||!a||Object.keys(a).sort().join('|')!==[...keys].sort().join('|')||keys.some(k=>!Number.isSafeInteger(a[k])||a[k]<0||a[k]>a.total)||a.proposer>1||a.retention>1||a.proposer_active>a.proposer||a.retention_active>a.retention||a.proposer+a.retention+a.logical+a.other_physical!==a.total)HOLD('SLOT_CLASS_COUNT_SHAPE');
 return Object.fromEntries(keys.map(k=>[k,a[k]]));
}
async function classifySlots(c){
 let began=false;
 try{
  await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');began=true;
  await c.query("SET LOCAL statement_timeout='8000ms'");
  const observedAtUtc=checkIdentity((await c.query(identitySql)).rows);
  const gate=(await c.query("SELECT count(*)::int total,count(*) FILTER(WHERE singleton_key=true AND code_sha=$1 AND manifest_sha256=$2 AND enabled=false AND revoked_at_utc IS NULL)::int exact FROM clean.adb_phase6_authorization",["781140cde71af3b72376c2db9f0fdb84204a2b7c","b2a691cb411af61c2bfdc42c55506e0ee86e45bfa3e22b420bbd738dc98ee4e4"])).rows;
  if(gate.length!==1||gate[0].total!==1||gate[0].exact!==1)HOLD('DISABLED_STAGE_DRIFT');
  const slotClasses=await optionalRead(c,slotClassSql,[],parseSlotClasses);
  await c.query('ROLLBACK');began=false;
  const a=slotClasses.value;
  return {schema:'travnr.phase6.physical-slot-name-classification.v1',status:'OWNER_PHYSICAL_SLOT_CLASSIFICATION_ONLY_NO_GO',observedAtUtc,slotClasses,allVisibleSlotsMatchDocumentedInternalNames:a!==null&&a.total===2&&a.proposer===1&&a.retention===1&&a.logical===0&&a.other_physical===0,managedOwnershipOrRotationVerified:false,managedReadReplicasVerified:false,sourceRowsRead:0,providerCalls:0,databaseWrites:0,exactDisabledStageReadback:true,sourceEnabled:false,phase6PaidGo:false};
 }finally{if(began)await c.query('ROLLBACK').catch(()=>{});}
}
async function main(){
 const slotOnly=process.argv.length===3&&process.argv[2]==='--classify-slots';
 if((process.argv.length!==2&&!slotOnly)||process.env.GITHUB_ACTIONS==='true'||process.env.ADB_AUTO_COLLECT!=='0'||process.env.V39_PHASE6_PROCESS_ARMED!=='0'||process.env.V39_PHASE6_OWNER_APPROVED!=='0'||process.env.NODE_TLS_REJECT_UNAUTHORIZED==='0'||[process.env.AERODATABOX_API_KEY,process.env.RAPIDAPI_KEY,process.env.AERODATABOX_WEBHOOK_SECRET,process.env.V39_DATABASE_RUNTIME_URL].some(Boolean))HOLD('DISARMED_OWNER_NO_PROVIDER');
 const u=new URL(process.env.DATABASE_URL??'');
 if(!['postgres:','postgresql:'].includes(u.protocol)||decodeURIComponent(u.username)!=='neondb_owner'||!u.password||!u.hostname.endsWith('.neon.tech')||u.pathname!=='/neondb'||u.searchParams.getAll('sslmode').length!==1||!['require','verify-full'].includes(u.searchParams.get('sslmode')))HOLD('EXISTING_TLS_DB');
 const {Client}=require(require.resolve('pg',{paths:[process.cwd()]}));
 const c=new Client({connectionString:u.toString(),connectionTimeoutMillis:8000,query_timeout:12000,options:'-c default_transaction_read_only=on',application_name:'p6_nonpitr_metadata_review'});
 try{await c.connect();console.log(JSON.stringify(await (slotOnly?classifySlots(c):review(c))));}finally{await c.end().catch(()=>{})}
}
module.exports={review,classifySlots,parseSlotClasses,slotClassSql,checkIdentity,parseSettings,parseCounts,settings,queries};
if(require.main===module)main().catch(e=>{const m=String(e?.message??'');console.error(/^HOLD_P6_NONPITR_[A-Z_]+$/.test(m)?m:'HOLD_P6_NONPITR_REDACTED');process.exitCode=2;});
