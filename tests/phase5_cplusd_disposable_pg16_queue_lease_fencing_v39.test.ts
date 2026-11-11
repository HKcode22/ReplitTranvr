/**
 * Offline-only C+D queue design test on REAL disposable PostgreSQL16.
 *
 * This does NOT add any application migration, entitlement, paid provider,
 * production queue, or pre-validated native flight source. Queue schema
 * exists only in local disposable CI neondb; test tables get dropped.
 *
 * Tests only the task/claim/lease/fence control plane. Original Stage14
 * immutable scientific PRE writer remains separate and must later be
 * benchmarked independently on disposable PG16.
 */
import {describe,it,expect,beforeAll,beforeEach,afterAll} from "vitest";
import {Pool,type PoolClient} from "pg";

const URL="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
const enabled=process.env.V39_P5_CD_DISPOSABLE_PG16==="1"?describe:describe.skip;
type Claim={id:string;generation:number;owner:string};
enabled("Phase5 C+D queue atomic claim / recovery on DISPOSABLE PG16 ONLY",()=>{
 let pool:Pool;
 beforeAll(async()=>{
  if(process.env.GITHUB_ACTIONS!=="true"||
     process.env.V39_P5_CD_DISPOSABLE_PG16!=="1"||
     process.env.DATABASE_URL!==URL||
     process.env.ADB_AUTO_COLLECT!=="0"||
     process.env.V39_PHASE6_PROCESS_ARMED!=="0"||
     process.env.AERODATABOX_API_KEY||
     process.env.AERODATABOX_WEBHOOK_SECRET)
    throw Error("REFUSED_CD_NOT_DISPOSABLE_NO_PROVIDER");
  pool=new Pool({connectionString:URL,max:12,
    application_name:"ci_p5_cd_disposable_queue_only"});
  const verify=(await pool.query(
    "SELECT current_database() AS db, current_user AS u,"+
    "current_setting('server_version_num')::integer AS version")).rows[0];
  if(verify.db!=="neondb"||verify.u!=="postgres"||verify.version<160000)
   throw Error("REFUSED_CD_WRONG_POSTGRES_TARGET");
  await pool.query("CREATE SCHEMA p5_cd_lease_ci");
  await pool.query(
   "CREATE TABLE p5_cd_lease_ci.pre_task ("+
   "id bigserial PRIMARY KEY,"+
   "flight_instance_id text NOT NULL,"+
   "horizon text NOT NULL CHECK(horizon IN ('T-24h','T-6h','T-90m')),"+
   "selected_native_t timestamptz NOT NULL,"+
   "own_cutoff timestamptz NOT NULL,"+
   "packet_sha text NOT NULL CHECK(packet_sha~'^[0-9a-f]{64}$'),"+
   "status text NOT NULL DEFAULT 'READY' CHECK(status IN ("+
   "'READY','CLAIMED','WRITE_STARTED_UNKNOWN','VERIFIED_ON_TIME')),"+
   "lease_owner text,"+
   "lease_generation integer NOT NULL DEFAULT 0,"+
   "lease_until timestamptz,"+
   "UNIQUE(flight_instance_id,horizon),"+
   "CHECK(own_cutoff=selected_native_t-("+
   "CASE horizon WHEN 'T-24h' THEN INTERVAL '24 hours' "+
   "WHEN 'T-6h' THEN INTERVAL '6 hours' "+
   "ELSE INTERVAL '90 minutes' END)))");
 });
 afterAll(async()=>{
  if(pool){
   await pool.query("DROP SCHEMA IF EXISTS p5_cd_lease_ci CASCADE");
   await pool.end();
  }
 });
 beforeEach(async()=>{
  await pool.query("TRUNCATE p5_cd_lease_ci.pre_task RESTART IDENTITY");
 });
 async function insert(n:number){
  await pool.query(
   "WITH cutoff AS (SELECT clock_timestamp()+INTERVAL '90 seconds' AS c)"+
   "INSERT INTO p5_cd_lease_ci.pre_task("+
   "flight_instance_id,horizon,selected_native_t,own_cutoff,packet_sha)"+
   "SELECT 'synthetic-leg-'||s.i::text,'T-6h',cutoff.c+INTERVAL '6 hours',"+
   "cutoff.c,lpad(to_hex(s.i),64,'0')"+
   " FROM generate_series(1,$1::integer) AS s(i) CROSS JOIN cutoff",[n]);
 }
 async function claimOne(owner:string):Promise<Claim|null>{
  const c:PoolClient=await pool.connect();let active=false;
  try{
   await c.query("BEGIN");active=true;
   await c.query("SET LOCAL statement_timeout='8000ms'");
   const r=await c.query(
    "WITH chosen AS ("+
    " SELECT id FROM p5_cd_lease_ci.pre_task"+
    " WHERE status='READY'"+
    " AND own_cutoff-INTERVAL '180 seconds'<=clock_timestamp()"+
    " AND own_cutoff-INTERVAL '2 seconds'>clock_timestamp()"+
    " ORDER BY own_cutoff,id FOR UPDATE SKIP LOCKED LIMIT 1"+
    ") UPDATE p5_cd_lease_ci.pre_task t SET status='CLAIMED',"+
    "lease_owner=$1,lease_generation=t.lease_generation+1,"+
    "lease_until=clock_timestamp()+INTERVAL '60 seconds'"+
    " WHERE t.id=(SELECT id FROM chosen)"+
    " RETURNING t.id::text AS id,t.lease_generation AS generation,"+
    "t.lease_owner AS owner",[owner]);
   await c.query("COMMIT");active=false;
   return r.rows.length?r.rows[0] as Claim:null;
  }catch(e){
   if(active)await c.query("ROLLBACK").catch(()=>{});
   throw e;
  }finally{c.release();}
 }
 it("100 eligible synthetic flight tasks claimed once by 8 concurrent CI workers",async()=>{
  await insert(100);
  const results:Claim[]=[];
  await Promise.all(Array.from({length:8},(_,idx)=>(async()=>{
   while(true){
    const next=await claimOne("ci-worker-"+idx);
    if(!next)break;
    results.push(next);
   }
  })()));
  expect(results).toHaveLength(100);
  expect(new Set(results.map(x=>x.id)).size).toBe(100);
  expect(results.every(x=>x.generation===1)).toBe(true);
  const r=await pool.query(
   "SELECT count(*)::integer AS total,"+
   "count(*) FILTER(WHERE status='CLAIMED')::integer AS claimed,"+
   "count(DISTINCT flight_instance_id)::integer AS identities"+
   " FROM p5_cd_lease_ci.pre_task");
  expect(r.rows[0]).toEqual({total:100,claimed:100,identities:100});
  console.log("CD_PG16_QUEUE_100_TASKS_8_ATOMIC_WORKERS_NO_PROVIDER_PASS");
 });
 it("claim lease expires, newest claim fences a stale old process",async()=>{
  await insert(1);
  const old=await claimOne("ci-old");
  expect(old?.generation).toBe(1);
  await pool.query(
   "UPDATE p5_cd_lease_ci.pre_task"+
   " SET lease_until=clock_timestamp()-INTERVAL '1 second'"+
   " WHERE id=$1",[old?.id]);
  const reclaimed=await pool.query(
   "UPDATE p5_cd_lease_ci.pre_task"+
   " SET status='READY',lease_owner=NULL,lease_generation=lease_generation+1,"+
   "lease_until=NULL WHERE status='CLAIMED'"+
   " AND lease_until<clock_timestamp() RETURNING id");
  expect(reclaimed.rowCount).toBe(1);
  const current=await claimOne("ci-new");
  expect(current?.generation).toBe(3);
  const stale=await pool.query(
   "UPDATE p5_cd_lease_ci.pre_task SET status='WRITE_STARTED_UNKNOWN'"+
   " WHERE id=$1 AND status='CLAIMED'"+
   " AND lease_owner=$2 AND lease_generation=$3"+
   " AND lease_until>clock_timestamp() RETURNING id",
   [old?.id,old?.owner,old?.generation]);
  expect(stale.rowCount).toBe(0);
  const legit=await pool.query(
   "UPDATE p5_cd_lease_ci.pre_task SET status='WRITE_STARTED_UNKNOWN'"+
   " WHERE id=$1 AND status='CLAIMED'"+
   " AND lease_owner=$2 AND lease_generation=$3"+
   " AND lease_until>clock_timestamp() RETURNING id",
   [current?.id,current?.owner,current?.generation]);
  expect(legit.rowCount).toBe(1);
 });
 it("unknown COMMIT is held for independent READ ONLY reconciliation, never reclaimed",async()=>{
  await insert(1);
  const claimed=await claimOne("ci-owner");
  await pool.query(
   "UPDATE p5_cd_lease_ci.pre_task"+
   " SET status='WRITE_STARTED_UNKNOWN',"+
   " lease_until=clock_timestamp()-INTERVAL '1 second'"+
   " WHERE id=$1",[claimed?.id]);
  const reaper=await pool.query(
   "UPDATE p5_cd_lease_ci.pre_task SET status='READY'"+
   " WHERE status='CLAIMED' AND lease_until<clock_timestamp()");
  expect(reaper.rowCount).toBe(0);
  const reader=await pool.connect();
  try{
   await reader.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
   const view=await reader.query(
    "SELECT status,lease_generation FROM p5_cd_lease_ci.pre_task WHERE id=$1",
    [claimed?.id]);
   await reader.query("ROLLBACK");
   expect(view.rows[0]).toEqual({
    status:"WRITE_STARTED_UNKNOWN",lease_generation:1
   });
  }finally{reader.release();}
  expect(await claimOne("ci-retry")).toBeNull();
  console.log("CD_PG16_UNKNOWN_COMMIT_READONLY_QUARANTINE_NO_RETRY_PASS");
 });
 it("same canonical flight+horizon with different native T/cutoff cannot be reinserted",async()=>{
  await insert(1);
  await expect(pool.query(
   "INSERT INTO p5_cd_lease_ci.pre_task"+
   "(flight_instance_id,horizon,selected_native_t,own_cutoff,packet_sha)"+
   " SELECT flight_instance_id,horizon,selected_native_t+INTERVAL '15 minutes',"+
   "own_cutoff+INTERVAL '15 minutes',"+
   "lpad('f',64,'f') FROM p5_cd_lease_ci.pre_task WHERE id=1"
  )).rejects.toMatchObject({code:"23505"});
 });
});
