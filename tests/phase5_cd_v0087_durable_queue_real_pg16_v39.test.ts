/**
 * V0087 REAL queue schema/functions on DISPOSABLE PostgreSQL16 ONLY.
 * Unlike the earlier in-test queue, this invokes the exact proposed
 * staged migration SQL. Tests queue STATE, not a paid source or ML accuracy.
 */
import {beforeAll,beforeEach,afterAll,describe,it,expect} from "vitest";
import {Pool} from "pg";
const DB="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
const TEST=process.env.V39_P5_CD_V0087_DURABLE_PG16==="1"?describe:describe.skip;
const Q="clean.phase5_cd_pre_task_v39";
const SHA=(x:string)=>x.repeat(64);
const QID="c23e4567-e89b-42d3-a456-426614174013";
const OWNER="ci-queue-owner";
const ROLE="phase5_cd_queue_worker_ciuser01";
const WORKER_URL="postgresql://"+ROLE+":ci-only@localhost:5432/neondb?sslmode=disable";
type Claim={task_id:string;flight_instance_id:string;horizon:string;
 lease_owner:string;lease_generation:string;state:string;packet_sha256:string};
TEST("Phase5 V0087 durable flight/horizon queue control in isolated PG16",()=>{
 let admin:Pool,worker:Pool;
 beforeAll(async()=>{
  if(process.env.GITHUB_ACTIONS!=="true"||
   process.env.V39_P5_CD_V0087_DURABLE_PG16!=="1"||
   process.env.DATABASE_URL!==DB||
   process.env.ADB_AUTO_COLLECT!=="0"||
   process.env.V39_PHASE6_PROCESS_ARMED!=="0"||
   process.env.AERODATABOX_API_KEY||
   process.env.AERODATABOX_WEBHOOK_SECRET||
   process.env.P5_V39_PRE_DATABASE_URL||
   process.env.P5_V39_OTHER_REST_RESERVE_DATABASE_URL)
   throw Error("REFUSED_CD_V0087_NOT_DISPOSABLE_NO_PROVIDER");
  admin=new Pool({connectionString:DB,max:6});
  const row=(await admin.query(
   "SELECT current_database() db,current_user usr,"+
   "current_setting('server_version_num')::integer ver,"+
   "to_regclass('clean.phase5_cd_pre_task_v39') AS task"
  )).rows[0];
  if(row.db!=="neondb"||row.usr!=="postgres"||
     row.ver<160000||!row.task)
   throw Error("REFUSED_CD_V0087_WRONG_TARGET_OR_MIGRATION");
  await admin.query("CREATE ROLE "+ROLE+
   " LOGIN PASSWORD 'ci-only' NOSUPERUSER NOCREATEDB NOCREATEROLE");
  await admin.query("GRANT USAGE ON SCHEMA clean TO "+ROLE);
  worker=new Pool({connectionString:WORKER_URL,max:12});
  // Function permissions are deliberately UNCOMMISSIONED after migration.
  await expect(worker.query(
   "SELECT * FROM clean.phase5_cd_claim_due_v39($1,1,30)",
   [OWNER])).rejects.toMatchObject({code:"42501"});
  await admin.query(
   "GRANT EXECUTE ON FUNCTION clean.phase5_cd_claim_due_v39(text,integer,integer)"+
   " TO "+ROLE);
  await admin.query(
   "GRANT EXECUTE ON FUNCTION clean.phase5_cd_mark_write_started_v39(bigint,text,bigint)"+
   " TO "+ROLE);
  await admin.query(
   "GRANT EXECUTE ON FUNCTION clean.phase5_cd_ack_verified_v39(bigint,text,bigint,bigint,text)"+
   " TO "+ROLE);
  await admin.query(
   "GRANT EXECUTE ON FUNCTION clean.phase5_cd_reap_once_v39(integer) TO "+ROLE);
 });
 afterAll(async()=>{
  if(worker)await worker.end();
  if(admin)await admin.end();
 });
 beforeEach(async()=>{
  await admin.query("TRUNCATE clean.phase5_cd_pre_task_v39 RESTART IDENTITY");
 });
 async function addTasks(count:number,horizon:"T-6h"|"T-24h"|"T-90m"="T-6h"){
  const off=horizon==="T-24h"?"24 hours":horizon==="T-6h"?"6 hours":"90 minutes";
  await admin.query(
   "WITH moment AS ("+
   " SELECT clock_timestamp()+INTERVAL '100 seconds' AS cutoff)"+
   " INSERT INTO "+Q+"("+
   "manifest_sha256,flight_instance_id,horizon,"+
   "selected_native_t_utc,prediction_cutoff_utc,"+
   "packet_sha256,source_population_query_id,source_response_sha256,"+
   "reviewed_source_rights_sha256,source_expires_at_utc)"+
   " SELECT $1,'leg:ci:v0087:'||lpad(i::text,4,'0'),$2,"+
   "moment.cutoff + ($3::text)::interval,moment.cutoff,"+
   "lpad(to_hex(i),64,'0'),$4,$5,$6,clock_timestamp()+interval '12 hours'"+
   " FROM generate_series(1,$7::integer) AS i CROSS JOIN moment",
   [SHA("a"),horizon,off,QID,SHA("b"),SHA("c"),count]);
 }
 async function claim(owner=OWNER,max=1):Promise<Claim[]>{
  const r=await worker.query(
   "SELECT task_id::text,flight_instance_id,horizon,lease_owner,"+
   "lease_generation::text,state,packet_sha256 "+
   "FROM clean.phase5_cd_claim_due_v39($1,$2,$3)",
   [owner,max,45]);
  return r.rows as Claim[];
 }
 async function started(c:Claim):Promise<boolean>{
  return (await worker.query(
   "SELECT clean.phase5_cd_mark_write_started_v39("+
   "$1::bigint,$2,$3::bigint) AS ok",
   [c.task_id,c.lease_owner,c.lease_generation])).rows[0].ok;
 }
 it("100 flight-level tasks are durably claimed exactly once by 8 workers",async()=>{
  await addTasks(100);
  const all:Claim[][]=await Promise.all(
   Array.from({length:8},(_,i)=>(async()=>{
    const my:Claim[]=[];
    for(;;){
     const next=await claim("ci-worker-"+i,3);
     if(!next.length)break;
     my.push(...next);
    }
    return my;
   })()));
  const c=all.flat();
  expect(c).toHaveLength(100);
  expect(new Set(c.map(x=>x.task_id)).size).toBe(100);
  expect(c.every(x=>x.lease_generation==="1"&&x.state==="CLAIMED"))
   .toBe(true);
  expect((await admin.query(
   "SELECT count(*)::integer n FROM "+Q+" WHERE state='CLAIMED'"
  )).rows[0].n).toBe(100);
  console.log("P5_V0087_ACTUAL_SQL_100_UNIQUE_8_WORKERS_PASS");
 });
 it("source/native T, cutoff and packet never change across retry/revision",async()=>{
  await addTasks(1);
  const c=(await claim())[0];
  await expect(admin.query(
   "UPDATE "+Q+" SET selected_native_t_utc="+
   "selected_native_t_utc+interval '15 minutes',"+
   "prediction_cutoff_utc=prediction_cutoff_utc+interval '15 minutes'"+
   " WHERE task_id=$1",[c.task_id])
  ).rejects.toThrow("P5_CD_QUEUE_FROZEN_IDENTITY_OR_SOURCE_CHANGED");
  await expect(admin.query(
   "INSERT INTO "+Q+"("+
   "manifest_sha256,flight_instance_id,horizon,"+
   "selected_native_t_utc,prediction_cutoff_utc,packet_sha256,"+
   "source_population_query_id,source_response_sha256,"+
   "reviewed_source_rights_sha256,source_expires_at_utc)"+
   " SELECT manifest_sha256,flight_instance_id,horizon,"+
   "selected_native_t_utc+interval '15 minutes',"+
   "prediction_cutoff_utc+interval '15 minutes',packet_sha256,"+
   "source_population_query_id,source_response_sha256,"+
   "reviewed_source_rights_sha256,source_expires_at_utc"+
   " FROM "+Q+" WHERE task_id=$1",[c.task_id])
  ).rejects.toMatchObject({code:"23505"});
  await expect(admin.query(
   "DELETE FROM "+Q+" WHERE task_id=$1",[c.task_id])
  ).rejects.toThrow("P5_CD_QUEUE_TASK_DELETE_FORBIDDEN");
 });
 it("expired but never-started claim reclaims; stale generation is fenced",async()=>{
  await addTasks(1);
  const prev=(await claim("ci-old",1))[0];
  await admin.query(
   "UPDATE "+Q+" SET lease_until_utc=clock_timestamp()-interval '1 second'"+
   " WHERE task_id=$1",[prev.task_id]);
  const reap=await worker.query(
   "SELECT task_id::text,new_state FROM clean.phase5_cd_reap_once_v39(10)");
  expect(reap.rows).toHaveLength(1);
  expect(reap.rows[0].new_state).toBe("READY");
  const cur=(await claim("ci-new",1))[0];
  expect(cur.lease_generation).toBe("3");
  expect((await worker.query(
   "SELECT clean.phase5_cd_mark_write_started_v39($1::bigint,$2,$3::bigint) ok",
   [prev.task_id,prev.lease_owner,prev.lease_generation])).rows[0].ok)
   .toBe(false);
  expect(await started(cur)).toBe(true);
 });
 it("WRITE_STARTED_UNKNOWN expires to QUARANTINED, never requeued",async()=>{
  await addTasks(1);
  const c=(await claim())[0];
  expect(await started(c)).toBe(true);
  await admin.query(
   "UPDATE "+Q+" SET lease_until_utc=clock_timestamp()-interval '1 second'"+
   " WHERE task_id=$1",[c.task_id]);
  const reaped=await worker.query(
   "SELECT task_id::text,new_state FROM clean.phase5_cd_reap_once_v39(10)");
  expect(reaped.rows).toHaveLength(1);
  expect(reaped.rows[0].new_state).toBe("QUARANTINED");
  expect(await claim()).toHaveLength(0);
  expect((await worker.query(
   "SELECT clean.phase5_cd_mark_write_started_v39("+
   "$1::bigint,$2,$3::bigint) ok",
   [c.task_id,c.lease_owner,c.lease_generation])).rows[0].ok).toBe(false);
  await expect(admin.query(
   "UPDATE "+Q+" SET state='READY',lease_owner=NULL,lease_until_utc=NULL"+
   " WHERE task_id=$1",[c.task_id])
  ).rejects.toThrow("P5_CD_QUEUE_UNREVIEWED_STATE_TRANSITION");
 });
 it("successful verify requires prior real snapshot+source and readback receipt",async()=>{
  await addTasks(1);
  const c=(await claim())[0];expect(await started(c)).toBe(true);
  const no=await worker.query(
   "SELECT clean.phase5_cd_ack_verified_v39("+
   "$1::bigint,$2,$3::bigint,$4::bigint,$5) ok",
   [c.task_id,c.lease_owner,c.lease_generation,999999,SHA("d")]);
  expect(no.rows[0].ok).toBe(false);
  await expect(worker.query(
   "SELECT clean.phase5_cd_ack_verified_v39("+
   "$1::bigint,$2,$3::bigint,$4::bigint,$5)",
   [c.task_id,c.lease_owner,c.lease_generation,999999,"NOT_SHA"])
  ).rejects.toThrow("P5_CD_QUEUE_SIGNED_POSTCOMMIT_RECEIPT_REQUIRED");
  expect((await admin.query(
   "SELECT state FROM "+Q+" WHERE task_id=$1",[c.task_id]
  )).rows[0].state).toBe("WRITE_STARTED_UNKNOWN");
  // A forged digest by itself never creates a snapshot or completes task.
 });
 it("new queue has no commissioned public privileges or existing-flight rewrites",async()=>{
  const rights=(await admin.query(
   "SELECT has_table_privilege($1,'clean.phase5_cd_pre_task_v39','UPDATE') u,"+
   "has_table_privilege($1,'clean.phase5_cd_pre_task_v39','INSERT') i",
   [ROLE])).rows[0];
  expect(rights).toEqual({u:false,i:false});
  await expect(worker.query(
   "SELECT task_id FROM "+Q+" LIMIT 1"
  )).rejects.toMatchObject({code:"42501"});
  const functions=(await admin.query(
   "SELECT proconfig,prosecdef FROM pg_catalog.pg_proc"+
   " WHERE proname='phase5_cd_claim_due_v39'"
  )).rows[0];
  expect(functions.prosecdef).toBe(true);
  expect(Array.isArray(functions.proconfig)).toBe(true);
  expect(functions.proconfig.some((v:string)=>
   v.replaceAll(" ","")==="search_path=pg_catalog,pg_temp")).toBe(true);
 });
});
