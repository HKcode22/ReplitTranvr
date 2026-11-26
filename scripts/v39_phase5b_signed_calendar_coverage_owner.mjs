/** Owner-only count/clock census across the original 31-day signed study.
 * No provider request, raw flight values, calendar mutation or training release.
 * Run from a verified immutable blob with existing Replit owner DB access.
 * Absent prepared rows are not zero provider yield. */
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";
import {createRequire} from "node:module";
const fail=s=>{throw Error("HOLD_P6_SIGNED_CALENDAR_COVERAGE_"+s)};
const HORIZONS=["T-24h","T-6h","T-90m"];
const int=n=>Number.isSafeInteger(n)&&n>=0;
const split=d=>d<=20?"train":d<=25?"validation":"test";
const clock=s=>typeof s==="string"&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s;
const countFields=["prepared","reservations","bindings","timely_bindings","elapsed_unreserved","open_unreserved","future_unreserved","stopped_unreserved","pre_rows","cutoff_safe_pre_rows"];
export function projectP6SignedCalendarCoverage(calendar,rows,duplicates,observedAtUtc){
 if(!clock(observedAtUtc)||!Array.isArray(calendar)||calendar.length!==31||!Array.isArray(rows)||rows.length>93||
  !duplicates||!["cross_day_ids","cross_partition_ids","duplicate_day_horizon_ids"].every(k=>int(duplicates[k])))fail("EXACT_DENOMINATOR");
 const dates=new Set();
 for(let i=0;i<31;i++){
  const d=calendar[i];if(d.run_day_index!==i+1||d.evaluation_partition!==split(i+1)||!clock(d.start_utc)||dates.has(d.start_utc)||
    i>0&&Date.parse(d.start_utc)<=Date.parse(calendar[i-1].start_utc))fail("FROZEN_CALENDAR_OR_SPLIT_DRIFT");
  dates.add(d.start_utc);
 }
 const by=new Map();
 for(const x of rows){
  const k=x.run_day_index+"|"+x.horizon;
  if(!Number.isSafeInteger(x.run_day_index)||x.run_day_index<1||x.run_day_index>31||!HORIZONS.includes(x.horizon)||by.has(k)||
   !countFields.every(c=>int(x[c]))||x.prepared<1||x.reservations>x.prepared||x.bindings>x.reservations||x.timely_bindings>x.bindings||
   x.elapsed_unreserved+x.open_unreserved+x.future_unreserved+x.stopped_unreserved+x.reservations!==x.prepared||x.cutoff_safe_pre_rows>x.pre_rows||
   x.next_planned_utc!==null&&!clock(x.next_planned_utc)||x.next_hard_latest_utc!==null&&!clock(x.next_hard_latest_utc))
   fail("COUNT_OR_CLOCK_CONTRADICTION");
  by.set(k,x);
 }
 const cells=calendar.flatMap(d=>HORIZONS.map(h=>{
  const x=by.get(d.run_day_index+"|"+h);
  return x?{day:d.run_day_index,split:d.evaluation_partition,horizon:h,status:"PREPARED_DENOMINATOR_OBSERVED",
   ...Object.fromEntries(countFields.map(k=>[k,x[k]])),next_planned_utc:x.next_planned_utc,next_hard_latest_utc:x.next_hard_latest_utc}:
   {day:d.run_day_index,split:d.evaluation_partition,horizon:h,status:"NO_PREPARED_ROWS_OBSERVED_NOT_ZERO_YIELD",
    ...Object.fromEntries(countFields.map(k=>[k,null])),next_planned_utc:null,next_hard_latest_utc:null};
 }));
 const bySplit=["train","validation","test"].map(p=>{
  const a=cells.filter(x=>x.split===p),seen=a.filter(x=>x.prepared!==null);
  return {partition:p,calendarDays:a.length/3,preparedHorizonCells:seen.length,unpreparedHorizonCells:a.length-seen.length,
   ...Object.fromEntries(countFields.map(k=>[k,seen.reduce((n,x)=>n+x[k],0)]))};
 });
 return {status:"SIGNED_CALENDAR_PREPARED_QUERY_AND_SPLIT_COUNTS_READONLY",observedAtUtc,calendarDays:31,bySplit,cells,
  leakageDiagnostics:{...duplicates,requiresIndependentReview:duplicates.cross_day_ids>0||duplicates.cross_partition_ids>0||duplicates.duplicate_day_horizon_ids>0},
  preparedQueriesAreNotFullFrozenTemplateDenominator:true,reservationsAreNotBillingProof:true,
  createdAtCutoffIsNotIndependentCommitProof:true,actualLabelsCertified:false,trainingEligibilityCertified:false,providerCalls:0,databaseWrites:0};
}
export async function readP6SignedCalendarCoverage(client){
 let tx=false;
 try{
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
  await client.query("SET LOCAL statement_timeout='25000ms'");await client.query("SET LOCAL lock_timeout='2000ms'");
  const ident=(await client.query("SELECT current_database()='neondb' db,current_user='neondb_owner' owner,session_user='neondb_owner' login,NOT pg_is_in_recovery() primary,current_setting('transaction_read_only')='on' ro,transaction_timestamp() at")).rows[0];
  if(!ident?.db||!ident.owner||!ident.login||!ident.primary||!ident.ro)fail("OWNER_CONTEXT");
  const auth=(await client.query("SELECT manifest_sha256,calendar_hash FROM clean.adb_phase6_authorization WHERE enabled AND revoked_at_utc IS NULL")).rows;
  if(auth.length!==1||!["manifest_sha256","calendar_hash"].every(k=>/^[a-f0-9]{64}$/.test(auth[0][k]??"")))fail("AUTHORIZATION");
  const m=auth[0].manifest_sha256,cal=auth[0].calendar_hash;
  const calendar=(await client.query("SELECT run_day_index,evaluation_partition,scheduled_start_utc AS start_utc FROM clean.adb_phase6_calendar_day WHERE calendar_hash=$1 ORDER BY run_day_index",[cal])).rows;
  const queryRows=(await client.query(`
   WITH base AS (
    SELECT q.run_day_index,q.horizon,count(*)::int prepared,count(a.reservation_sha256)::int reservations,
     count(b.population_query_id)::int bindings,
     count(*) FILTER(WHERE b.population_query_id IS NOT NULL AND b.bound_at_utc<=q.prediction_cutoff_utc)::int timely_bindings,
     count(*) FILTER(WHERE a.reservation_sha256 IS NULL AND q.state='STOPPED')::int stopped_unreserved,
     count(*) FILTER(WHERE a.reservation_sha256 IS NULL AND q.state<>'STOPPED' AND q.hard_latest_dispatch_utc<transaction_timestamp())::int elapsed_unreserved,
     count(*) FILTER(WHERE a.reservation_sha256 IS NULL AND q.state<>'STOPPED' AND q.planned_dispatch_utc<=transaction_timestamp() AND q.hard_latest_dispatch_utc>=transaction_timestamp())::int open_unreserved,
     count(*) FILTER(WHERE a.reservation_sha256 IS NULL AND q.state<>'STOPPED' AND q.planned_dispatch_utc>transaction_timestamp())::int future_unreserved,
     min(q.planned_dispatch_utc) FILTER(WHERE a.reservation_sha256 IS NULL AND q.state<>'STOPPED' AND q.hard_latest_dispatch_utc>=transaction_timestamp()) next_planned_utc,
     min(q.hard_latest_dispatch_utc) FILTER(WHERE a.reservation_sha256 IS NULL AND q.state<>'STOPPED' AND q.hard_latest_dispatch_utc>=transaction_timestamp()) next_hard_latest_utc
    FROM clean.phase5_fids_allowed_query_v39 q
    LEFT JOIN clean.phase5_fids_physical_attempt_v39 a USING(manifest_sha256,query_digest)
    LEFT JOIN clean.phase5_fids_original_binding_v39 b ON b.manifest_sha256=q.manifest_sha256 AND b.query_digest=q.query_digest AND b.reservation_sha256=a.reservation_sha256
    WHERE q.manifest_sha256=$1 GROUP BY 1,2
   ),pre AS (
    SELECT q.run_day_index,q.horizon,count(DISTINCT s.id)::int pre_rows,
     count(DISTINCT s.id) FILTER(WHERE s.created_at<=s.prediction_cutoff_utc)::int cutoff_safe_pre_rows
    FROM clean.phase5_fids_allowed_query_v39 q JOIN clean.phase5_fids_original_binding_v39 b USING(manifest_sha256,query_digest)
    JOIN clean.flight_snapshots s ON s.population_query_id=b.population_query_id::text AND s.fids_response_hash=b.response_hash AND s.horizon=q.horizon AND s.prediction_state='PRE_DEPARTURE'
    WHERE q.manifest_sha256=$1 GROUP BY 1,2
   )
   SELECT base.*,coalesce(pre.pre_rows,0)::int pre_rows,coalesce(pre.cutoff_safe_pre_rows,0)::int cutoff_safe_pre_rows FROM base LEFT JOIN pre USING(run_day_index,horizon) ORDER BY 1,2
  `,[m])).rows;
  const duplicates=(await client.query(`
   WITH linked AS (
    SELECT DISTINCT s.id,s.flight_instance_id,q.run_day_index,q.horizon,
     CASE WHEN q.run_day_index<=20 THEN 'train' WHEN q.run_day_index<=25 THEN 'validation' ELSE 'test' END part
    FROM clean.phase5_fids_allowed_query_v39 q JOIN clean.phase5_fids_original_binding_v39 b USING(manifest_sha256,query_digest)
    JOIN clean.flight_snapshots s ON s.population_query_id=b.population_query_id::text AND s.fids_response_hash=b.response_hash AND s.horizon=q.horizon AND s.prediction_state='PRE_DEPARTURE'
    WHERE q.manifest_sha256=$1
   ), grouped AS (SELECT flight_instance_id,count(DISTINCT run_day_index) days,count(DISTINCT part) parts FROM linked GROUP BY 1),
   dup AS (SELECT flight_instance_id FROM linked GROUP BY flight_instance_id,run_day_index,horizon HAVING count(*)>1)
   SELECT (SELECT count(*)::int FROM grouped WHERE days>1) cross_day_ids,
    (SELECT count(*)::int FROM grouped WHERE parts>1) cross_partition_ids,
    (SELECT count(DISTINCT flight_instance_id)::int FROM dup) duplicate_day_horizon_ids
  `,[m])).rows[0];
  const iso=x=>x===null?null:new Date(x).toISOString();
  return projectP6SignedCalendarCoverage(calendar.map(d=>({...d,start_utc:iso(d.start_utc)})),
   queryRows.map(x=>({...x,next_planned_utc:iso(x.next_planned_utc),next_hard_latest_utc:iso(x.next_hard_latest_utc)})),duplicates,iso(ident.at));
 }finally{if(tx)await client.query("ROLLBACK").catch(()=>{});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let c;
 try{
  if(!process.env.DATABASE_URL||process.env.NODE_TLS_REJECT_UNAUTHORIZED==="0")fail("OWNER_URL");
  const {Client}=createRequire(resolve(process.cwd(),"package.json"))("pg");
  c=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000});
  await c.connect();console.log(JSON.stringify(await readP6SignedCalendarCoverage(c)));
 }catch(e){console.error(JSON.stringify({status:"P6_SIGNED_CALENDAR_COVERAGE_HOLD",sqlstate:/^[A-Z0-9]{5}$/.test(e?.code??"")?e.code:null,providerCalls:0,databaseWrites:0}));process.exitCode=2;}
 finally{if(c)await c.end().catch(()=>{});}
}
