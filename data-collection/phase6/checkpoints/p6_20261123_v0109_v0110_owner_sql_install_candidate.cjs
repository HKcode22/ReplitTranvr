"use strict";
// Staged owner candidate; do not run --apply before coordinated paid STOP,
// reviewed code-policy successor, and exact no-in-flight reconciliation.
// Does not merge, write GitHub secrets, dispatch jobs or contact provider.
const {Client}=require("pg");
const {execFileSync}=require("node:child_process");
const {createHash}=require("node:crypto");
const R="HKcode22/ReplitTranvr", RELAY="HKcode22/TravnrClockRelay";
const BASE="c8e065d665ccacb6d2575070e94c5500b7583044";
const HEAD="9c9cddb1aaeb04934d94af2937ee158e6d991f6c";
const M="a596feb9b3d8a1d75c8856a2f2f6bc559a87d58fd18132bbfa0f48428965118e";
const PREP="phase5_fids_prepare_prod_20261107",DRAW="phase5_early_draw_prod20261115";
const BINDER="clean.bind_phase5_prospective_parent_source_budget_v39(text,integer,text,integer)";
const EXCEPTION="clean.p6_day1_later_source_exception_v39(clean.phase5_fids_allowed_query_v39,timestamptz)";
const RESERVE="clean.reserve_phase5_fids_physical_get_v39(text,text,text,text,text,text)";
const blobs=["6d1486371749eec0f23becb92a87e10177b74cca","9ed0cece4ccd0a87450f728319ddd978ae9e26d9"];
const hold=x=>{throw Error("HOLD_P6_SQL_SUCCESSOR_"+x)};
function need(x,s){if(!x)hold(s)}
function gh(a){return execFileSync("gh",a,{encoding:"utf8",timeout:30000,stdio:["ignore","pipe","pipe"]}).trim()}
function sqlBlob(sha){
 const b=Buffer.from(gh(["api","repos/"+R+"/git/blobs/"+sha,"--jq",".content"]).replace(/\s/g,""),"base64");
 need(createHash("sha1").update("blob "+b.length+"\0").update(b).digest("hex")===sha,"BLOB_IDENTITY");
 const src=b.toString("utf8");
 need(/^\s*(?:--[^\n]*\n)*BEGIN;\s*/.test(src)&&/COMMIT;\s*$/.test(src),"TRANSACTION_WRAPPER");
 return src.replace(/^\s*(?:--[^\n]*\n)*BEGIN;\s*/,"").replace(/COMMIT;\s*$/,"");
}
async function main(){
 const mode=process.argv[2];
 need(process.argv.length===3&&["VERIFY_ONLY","APPLY_AFTER_COORDINATED_DISARM_NO_PROVIDER"].includes(mode),"MODE");
 need(gh(["api","user","--jq",".login"])==="HKcode22","OWNER");
 const pr=JSON.parse(gh(["api","repos/"+R+"/pulls/965"]));
 need(pr.head.sha===HEAD,"CANDIDATE_HEAD_MOVED");
 const base=gh(["api","repos/"+R+"/git/ref/heads/main","--jq",".object.sha"]);
 need(base===BASE|| (pr.merged===true&&base===pr.merge_commit_sha),"UNEXPECTED_MAIN");
 if(mode!=="VERIFY_ONLY"){
  need(gh(["variable","get","TRAVNR_RELAY_ROLLING_ENABLED","-R",RELAY])==="0","ROLLING_NOT_PAUSED");
  need(gh(["variable","get","P6_NONPAID_SOURCE_SCHEDULE_ENABLED","-R",R])!=="true","NONPAID_SCHEDULE_NOT_PAUSED");
 }
 const sql=blobs.map(sqlBlob);
 const c=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000});
 need(!!process.env.DATABASE_URL,"MISSING_OWNER_DATABASE_URL");
 await c.connect();
 let tx=false;
 try{
  await c.query(mode==="VERIFY_ONLY"?"BEGIN READ ONLY":"BEGIN ISOLATION LEVEL SERIALIZABLE");
  tx=true;
  await c.query("SET LOCAL statement_timeout='15000ms'; SET LOCAL lock_timeout='3000ms'");
  const a=(await c.query("SELECT current_database() db, current_user actor, pg_is_in_recovery() replica, current_setting('server_version_num')::int ver, clock_timestamp() now, (SELECT enabled AND revoked_at_utc IS NULL FROM clean.adb_phase6_authorization WHERE singleton_key=true AND manifest_sha256=$1) auth, (SELECT count(*)::int FROM clean.phase5_fids_physical_attempt_v39 WHERE manifest_sha256=$1) source, (SELECT count(*)::int FROM clean.phase5_other_rest_physical_reservation_v39 WHERE manifest_sha256=$1) rest, (SELECT count(*)::int FROM clean.adb_incident_stop WHERE NOT resolved) stops, (SELECT count(*)::int FROM clean.adb_sampling_draw WHERE run_day_index=1) d1, (SELECT count(*)::int FROM clean.adb_sampling_draw WHERE run_day_index=2) d2, (SELECT count(*)::int FROM clean.phase5_fids_day_budget_v39 WHERE manifest_sha256=$1 AND run_day_index=2 AND daily_api_ceiling=384) d2budget, (SELECT count(*)::int FROM clean.phase5_fids_allowed_query_v39 WHERE manifest_sha256=$1 AND run_day_index=1) d1queries",[M])).rows[0];
  const s=(await c.query("SELECT to_regprocedure($1) IS NOT NULL binder, to_regprocedure($2) IS NOT NULL exception, (SELECT pg_get_userbyid(proowner)=current_user FROM pg_proc WHERE oid=to_regprocedure($3)) reserve_owner, (SELECT count(*)::int FROM pg_roles WHERE rolname IN ($4,$5)) roles, has_column_privilege($5,'clean.phase5_fids_physical_attempt_v39','manifest_sha256','SELECT') source_read, has_column_privilege($5,'clean.phase5_other_rest_physical_reservation_v39','manifest_sha256','SELECT') rest_read, has_column_privilege($5,'clean.adb_incident_stop','resolved','SELECT') stop_read",[BINDER,EXCEPTION,RESERVE,PREP,DRAW])).rows[0];
  console.log(JSON.stringify({status:"P6_SQL_SUCCESSOR_OWNER_INVENTORY",main:base,candidate:HEAD,...a,...s,providerCalls:0}));
  need(a.db==="neondb"&&a.replica===false&&a.ver>=160000&&a.ver<170000&&s.roles===2,"DATABASE_OR_ROLES");
  if(mode==="VERIFY_ONLY"){await c.query("ROLLBACK");tx=false;return}
  need(a.auth===true&&a.source===0&&a.rest===0&&a.stops===0&&a.d1===0&&a.d2===4&&a.d2budget===1&&a.d1queries===0,"LIVE_HISTORY_CHANGED");
  need(Date.parse(a.now)<Date.parse("2026-11-24T17:25:00Z"),"PREPARATION_DEADLINE");
  need(s.reserve_owner===true&&!s.binder&&!s.exception,"OWNER_OR_PRIOR_INSTALL");
  // Exact original-body guard is inside V0110. Both migrations and all
  // grants are in one outer transaction, never separately committed.
  await c.query(sql[0]);await c.query(sql[1]);
  await c.query("GRANT EXECUTE ON FUNCTION "+BINDER+" TO "+PREP);
  await c.query("GRANT SELECT (manifest_sha256) ON clean.phase5_fids_physical_attempt_v39 TO "+DRAW);
  await c.query("GRANT SELECT (manifest_sha256) ON clean.phase5_other_rest_physical_reservation_v39 TO "+DRAW);
  await c.query("GRANT SELECT (resolved) ON clean.adb_incident_stop TO "+DRAW);
  const v=(await c.query("SELECT has_function_privilege($1,$2,'EXECUTE') prep_exec, to_regprocedure($3) IS NOT NULL exception, has_column_privilege($4,'clean.phase5_fids_physical_attempt_v39','manifest_sha256','SELECT') source_read, has_column_privilege($4,'clean.phase5_other_rest_physical_reservation_v39','manifest_sha256','SELECT') rest_read, has_column_privilege($4,'clean.adb_incident_stop','resolved','SELECT') stop_read, has_any_column_privilege($4,'clean.phase5_fids_physical_attempt_v39','INSERT') source_write, has_any_column_privilege($4,'clean.phase5_other_rest_physical_reservation_v39','INSERT') rest_write, has_any_column_privilege($4,'clean.adb_incident_stop','UPDATE') stop_write",[PREP,BINDER,EXCEPTION,DRAW])).rows[0];
  need(v.prep_exec&&v.exception&&v.source_read&&v.rest_read&&v.stop_read&&!v.source_write&&!v.rest_write&&!v.stop_write,"ACL_READBACK");
  await c.query("COMMIT");tx=false;
  console.log(JSON.stringify({status:"P6_SQL_SUCCESSOR_COMMIT_ACK_NOT_COLLECTION_NOT_PAID_GO",...v,providerCalls:0}));
 }finally{if(tx)await c.query("ROLLBACK").catch(()=>{});await c.end()}
}
main().catch(e=>{console.error(e.code||"P6_SQL_SUCCESSOR_FAILURE", /^HOLD_P6_SQL_SUCCESSOR_/.test(e.message)?e.message:"inspect locally without printing connection credentials");process.exitCode=1});
