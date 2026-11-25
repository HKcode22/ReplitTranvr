// Metadata only; does not call AeroDataBox, reserve, publish, or mutate.
"use strict";
const {createRequire}=require("node:module"),{join}=require("node:path");
const {Client}=createRequire(join(process.cwd(),"package.json"))("pg");
const safe=e=>typeof e?.code==="string"&&/^[A-Z0-9]{5}$/.test(e.code)?e.code:"UNCLASSIFIED";
const out=(status,fields)=>console.log(JSON.stringify({status,...fields,providerCalls:0,productionWrites:0}));
const role="phase5_fids_source_prod_20261107";
async function main(){
 if(!process.env.DATABASE_URL)throw Error("NO_OWNER_DSN");
 const c=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000});
 try{
  await c.connect();await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  await c.query("SET LOCAL statement_timeout='12s'");
  const g=(await c.query("SELECT current_database()='neondb' db,current_user='neondb_owner' owner,NOT pg_is_in_recovery() primary,current_setting('transaction_read_only')='on' ro,current_setting('server_version_num')::int ver,clock_timestamp() at")).rows[0];
  if(!g.db||!g.owner||!g.primary||!g.ro)throw Error("WRONG_OWNER_CONTEXT");
  const priv=await c.query(`
   SELECT name AS relation,has_table_privilege($1,name,'SELECT') AS source_select,
    has_table_privilege($1,name,'INSERT') AS source_insert
   FROM unnest(ARRAY['clean.phase5_fids_allowed_query_v39','clean.phase5_fids_physical_attempt_v39',
    'clean.phase5_fids_original_binding_v39','clean.fids_query_response','clean.flight_snapshots']) AS name`,[role]);
  const cols=await c.query(`
    SELECT table_name,column_name,data_type FROM information_schema.columns
    WHERE table_schema='clean' AND table_name IN ('phase5_fids_physical_attempt_v39','phase5_fids_original_binding_v39','flight_snapshots','phase5_fids_allowed_query_v39')
    AND column_name IN ('github_run_id','reservation_sha256','query_digest','population_query_id','horizon','fids_response_hash','frame_hash','prediction_state','prediction_cutoff_utc','created_at','committed_at_utc') ORDER BY 1,2`);
  out("P6_SOURCE_POST_METADATA",{at:g.at,pgVersion:g.ver,privileges:priv.rows,types:cols.rows});
  const sql=`EXPLAIN (COSTS OFF)
   SELECT q.query_digest,q.horizon,q.airport_icao,q.service_window_start_utc,q.service_window_end_utc,
   count(DISTINCT s.id)::int AS n FROM clean.phase5_fids_allowed_query_v39 q
   JOIN clean.phase5_fids_original_binding_v39 b ON b.query_digest=q.query_digest AND b.manifest_sha256=q.manifest_sha256
   JOIN clean.flight_snapshots s ON s.population_query_id=b.population_query_id::text AND s.fids_response_hash=b.response_hash
   WHERE q.manifest_sha256=$1 AND q.run_day_index=$2 AND q.query_digest=ANY($3::text[]) AND s.frame_hash=$4
   AND s.prediction_state='PRE_DEPARTURE' AND s.horizon=q.horizon AND s.created_at<=s.prediction_cutoff_utc
   AND s.created_at<=$5::timestamptz AND b.source_expires_at_utc>$5::timestamptz
   GROUP BY q.query_digest,q.horizon,q.airport_icao,q.service_window_start_utc,q.service_window_end_utc LIMIT 385`;
  const args=["0".repeat(64),1,["0".repeat(64)],"0".repeat(64),new Date().toISOString()];
  await c.query("SAVEPOINT owner_explain");
  try{await c.query(sql,args);out("P6_POST_HINT_EXPLAIN_OWNER",{pass:true});}
  catch(e){await c.query("ROLLBACK TO SAVEPOINT owner_explain");out("P6_POST_HINT_EXPLAIN_OWNER",{pass:false,sqlstate:safe(e)});}
  await c.query("ROLLBACK TO SAVEPOINT owner_explain");
  await c.query("SAVEPOINT role_probe");
  try{
   await c.query("SET LOCAL ROLE phase5_fids_source_prod_20261107");
   await c.query(sql,args);
   out("P6_POST_HINT_EXPLAIN_SOURCE_ROLE",{pass:true,actualDedicatedLoginProven:false});
  }catch(e){out("P6_POST_HINT_EXPLAIN_SOURCE_ROLE",{pass:false,sqlstate:safe(e),actualDedicatedLoginProven:false});}
  finally{await c.query("ROLLBACK TO SAVEPOINT role_probe");}
  const a=await c.query(`
   SELECT p.github_run_id::text run_id,pg_typeof(p.github_run_id)::text run_id_type,
    pg_typeof(p.committed_at_utc)::text committed_type,q.state,
    q.github_run_id::text=p.github_run_id::text query_run_matches,
    p.physical_attempt_number=1 attempt_one,p.charged_reserved_units=2 reserved_two,
    EXISTS(SELECT 1 FROM clean.phase5_fids_original_binding_v39 b WHERE b.reservation_sha256=p.reservation_sha256) original_bound
    FROM clean.phase5_fids_physical_attempt_v39 p JOIN clean.phase5_fids_allowed_query_v39 q
    ON q.manifest_sha256=p.manifest_sha256 AND q.query_digest=p.query_digest
    WHERE p.github_run_id::text=ANY($1::text[]) ORDER BY p.github_run_id::text`,
    [["45435367814","45435371804","45435375175","45435378191"]]);
  out("P6_SOURCE_RESERVATION_READBACK_METADATA",{rows:a.rows,originalRuntimeReadbackProven:false});
 }finally{await c.query("ROLLBACK").catch(()=>{});await c.end().catch(()=>{});}
}
main().catch(e=>{out("P6_METADATA_PROBE_HOLD",{sqlstate:safe(e)});process.exitCode=2;});
