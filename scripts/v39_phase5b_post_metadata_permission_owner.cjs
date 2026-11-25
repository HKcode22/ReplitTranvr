// Owner-only narrow runtime permission successor. No HTTP, reservations, data
// changes, scheduling or PRE/POST write grants. EXPLAIN is not EXPLAIN ANALYZE.
"use strict";
const {createRequire}=require("node:module"),{join}=require("node:path");
const {Client}=createRequire(join(process.cwd(),"package.json"))("pg");
const role="phase5_fids_source_prod_20261107",rel="clean.flight_snapshots";
const cols=["created_at","fids_response_hash","flight_instance_id","frame_hash","horizon","id","population_member_id","population_query_id","prediction_cutoff_utc","prediction_state","selected_t_milestone_utc"];
const queries=["SELECT q.query_digest,q.horizon,q.airport_icao,q.service_window_start_utc,q.service_window_end_utc,count(DISTINCT s.id)::int AS n FROM clean.phase5_fids_allowed_query_v39 q JOIN clean.phase5_fids_original_binding_v39 b ON b.query_digest=q.query_digest AND b.manifest_sha256=q.manifest_sha256 JOIN clean.flight_snapshots s ON s.population_query_id=b.population_query_id::text AND s.fids_response_hash=b.response_hash WHERE q.manifest_sha256=$1 AND q.run_day_index=$2 AND q.query_digest=ANY($3::text[]) AND s.frame_hash=$4 AND s.prediction_state='PRE_DEPARTURE' AND s.horizon=q.horizon AND s.created_at<=s.prediction_cutoff_utc AND s.created_at<=$5::timestamptz AND b.source_expires_at_utc>$5::timestamptz GROUP BY q.query_digest,q.horizon,q.airport_icao,q.service_window_start_utc,q.service_window_end_utc LIMIT 385","SELECT s.id::text AS snapshot_id,s.horizon,q.query_digest, s.created_at,s.prediction_cutoff_utc, s.selected_t_milestone_utc,s.fids_response_hash, r.available_at AS original_available_at, b.source_expires_at_utc,b.response_hash AS binding_response_hash FROM clean.flight_snapshots s JOIN clean.phase5_fids_original_binding_v39 b ON b.population_query_id::text=s.population_query_id JOIN clean.phase5_fids_allowed_query_v39 q ON q.query_digest=b.query_digest AND q.manifest_sha256=b.manifest_sha256 JOIN clean.fids_query_response r ON r.population_query_id=b.population_query_id AND r.response_hash=b.response_hash JOIN clean.flight_population fp ON fp.population_query_id=b.population_query_id AND fp.population_member_id=s.population_member_id AND fp.canonical_flight_instance_id=s.flight_instance_id WHERE q.manifest_sha256=$1 AND q.run_day_index=$2 AND q.airport_icao=$3 AND s.flight_instance_id=$4 AND s.frame_hash=$5 AND s.prediction_state='PRE_DEPARTURE' AND fp.source_airport_icao=q.airport_icao AND fp.population_role='requested_airport_primary' AND fp.source_type='fids' AND fp.codeshare_resolution_status='confirmed_operating_leg' AND fp.available_at<=s.prediction_cutoff_utc AND fp.provider_content_expired_at_utc IS NULL AND r.raw_expired_at_utc IS NULL AND r.raw_payload IS NOT NULL AND b.source_expires_at_utc>transaction_timestamp() AND s.fids_response_hash=b.response_hash AND q.horizon=s.horizon AND s.horizon IN ('T-24h','T-6h','T-90m')","SELECT s.flight_instance_id,s.id::text AS snapshot_id,s.horizon,q.query_digest, s.created_at,s.prediction_cutoff_utc, s.selected_t_milestone_utc,s.fids_response_hash, r.available_at AS original_available_at, b.source_expires_at_utc,b.response_hash AS binding_response_hash FROM clean.flight_snapshots s JOIN clean.phase5_fids_original_binding_v39 b ON b.population_query_id::text=s.population_query_id JOIN clean.phase5_fids_allowed_query_v39 q ON q.query_digest=b.query_digest AND q.manifest_sha256=b.manifest_sha256 JOIN clean.fids_query_response r ON r.population_query_id=b.population_query_id AND r.response_hash=b.response_hash JOIN clean.flight_population fp ON fp.population_query_id=b.population_query_id AND fp.population_member_id=s.population_member_id AND fp.canonical_flight_instance_id=s.flight_instance_id WHERE q.manifest_sha256=$1 AND q.run_day_index=$2 AND q.airport_icao=$3 AND s.flight_instance_id=ANY($4::text[]) AND s.frame_hash=$5 AND s.prediction_state='PRE_DEPARTURE' AND fp.source_airport_icao=q.airport_icao AND fp.population_role='requested_airport_primary' AND fp.source_type='fids' AND fp.codeshare_resolution_status='confirmed_operating_leg' AND fp.available_at<=s.prediction_cutoff_utc AND fp.provider_content_expired_at_utc IS NULL AND r.raw_expired_at_utc IS NULL AND r.raw_payload IS NOT NULL AND b.source_expires_at_utc>transaction_timestamp() AND s.fids_response_hash=b.response_hash AND q.horizon=s.horizon AND s.horizon IN ('T-24h','T-6h','T-90m') ORDER BY s.flight_instance_id,s.horizon,s.id LIMIT $6"];
const h="0".repeat(64), args=[[h,1,[h],h,new Date().toISOString()],[h,1,"XXXX","fixture-not-a-flight",h],[h,1,"XXXX",["fixture-not-a-flight"],h,7]];
const cmd=process.argv[2];
const mode=["VERIFY_ONLY","APPLY_NARROW_POST_PRE_METADATA_SELECT","ROLLBACK_EXACT_PHASE5B_COLUMN_GRANT"].includes(cmd)?cmd:null;
const emit=(status,fields={})=>console.log(JSON.stringify({status,...fields,providerCalls:0,paidReservations:0,flightDataWrites:0,workflowDispatches:0}));
async function matrix(c){
 const g=(await c.query("SELECT has_table_privilege($1,$2,'SELECT') table_select,has_table_privilege($1,$2,'INSERT') pre_insert,has_table_privilege($1,$2,'UPDATE') pre_update,has_table_privilege($1,$2,'DELETE') pre_delete",[role,rel])).rows[0];
 const rows=(await c.query("SELECT x AS col,has_column_privilege($1,$2,x,'SELECT') AS readable FROM unnest($3::text[]) x ORDER BY 1",[role,rel,cols])).rows;
 if(g.table_select||g.pre_insert||g.pre_update||g.pre_delete||rows.length!==cols.length)throw Error("UNEXPECTED_PRIVILEGE_BASELINE");
 return rows.filter(x=>x.readable).map(x=>x.col);
}
async function check(c){
 await c.query("SET LOCAL ROLE "+role);
 // If EXPLAIN fails the outer transaction rolls back; do not RESET in an
 // aborted transaction and hide the original SQLSTATE.
 for(let i=0;i<queries.length;i++)await c.query("EXPLAIN (COSTS OFF) "+queries[i],args[i]);
 await c.query("RESET ROLE");
}
async function main(){
 if(!mode||!process.env.DATABASE_URL)throw Error("EXACT_OWNER_MODE_REQUIRED");
 const c=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000});
 try{
  await c.connect();
  await c.query(mode==="VERIFY_ONLY"?"BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY":"BEGIN");
  await c.query("SET LOCAL statement_timeout='12s'");await c.query("SET LOCAL lock_timeout='2s'");
  const id=(await c.query("SELECT current_database()='neondb' db,current_user='neondb_owner' owner,session_user='neondb_owner' login,NOT pg_is_in_recovery() primary,current_setting('server_version_num')::int ver")).rows[0];
  if(!id.db||!id.owner||!id.login||!id.primary||id.ver<160000||id.ver>=170000)throw Error("WRONG_OWNER_CONTEXT");
  const before=await matrix(c);
  if(mode==="ROLLBACK_EXACT_PHASE5B_COLUMN_GRANT"){
   // Only use when the apply receipt records baseline 0 and all exact columns newly granted.
   if(before.length!==cols.length)throw Error("ROLLBACK_BASELINE_DRIFT");
   await c.query("REVOKE SELECT ("+cols.join(",")+") ON "+rel+" FROM "+role);
   if((await matrix(c)).length!==0)throw Error("ROLLBACK_READBACK_DRIFT");
   await c.query("COMMIT");emit("P6_POST_METADATA_GRANT_ROLLED_BACK",{columns:cols.length});return;
  }
  if(mode==="APPLY_NARROW_POST_PRE_METADATA_SELECT"){
   if(before.length!==0&&before.length!==cols.length)throw Error("MIXED_PRIOR_COLUMN_GRANTS_NO_WRITE");
   if(before.length===0)await c.query("GRANT SELECT ("+cols.join(",")+") ON "+rel+" TO "+role);
  }
  const after=await matrix(c);
  if(after.length!==cols.length)throw Error("MISSING_NARROW_PRE_METADATA_SELECT");
  await check(c);
  if(mode==="VERIFY_ONLY")await c.query("ROLLBACK");else await c.query("COMMIT");
  emit(mode==="VERIFY_ONLY"?"P6_POST_METADATA_READONLY_VERIFY_PASS":"P6_POST_METADATA_NARROW_SELECT_COMMITTED_AND_EXPLAIN_VERIFIED",{columns:cols,baselineReadableCount:before.length,addedColumnCount:mode==="VERIFY_ONLY"?0:cols.length-before.length,tableWideSelect:false,preInsert:false,preUpdate:false,preDelete:false,exactSqlChecks:3,actualDedicatedLoginProven:false});
 }catch(e){await c.query("ROLLBACK").catch(()=>{});throw e;}
 finally{await c.end().catch(()=>{});}
}
main().catch(e=>{const reason=/^[A-Z_]+$/.test(e?.message??"")?e.message:"REDACTED_DB_ERROR";emit("P6_POST_METADATA_REPAIR_HOLD",{reason,sqlstate:/^[A-Z0-9]{5}$/.test(e?.code??"")?e.code:null});process.exitCode=2;});
