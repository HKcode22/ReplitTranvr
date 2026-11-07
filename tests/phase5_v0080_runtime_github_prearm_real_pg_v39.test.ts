/**
 * No-paid, real disposable B0062/V0079/V0080 PostgreSQL16.
 * Actual GITHUB_RUN_ID is unknown at source template commit time; prove
 * PREPARED->ACTIVE prearm before V0079 physical reservation.
 */
import {createHash} from "node:crypto";
import {Pool} from "pg";
import {afterAll,beforeAll,describe,expect,it} from "vitest";
import {prearmP5V0080ActualGitHubRun,phase5PrearmDigest}
 from "../server/lib/disruption/phase5V0080GitHubPrearm_v39";
const URL="postgresql://postgres:postgres@localhost:5432/v39_ci?sslmode=disable";
const suite=process.env.V39_P5_V0080_PG16==="1"?describe:describe.skip;
const H=(x:string)=>x.repeat(64);
const m=H("a"),q=H("b"),calendar=H("c"),config=H("d"),
 frame=H("e"),draw=H("f"),rights=H("2"),provider=H("3");
const runId="12345678910";
const sha=(s:string)=>createHash("sha256").update(s).digest("hex");
const reservation=sha([m,q,runId,"1"].join("|"));
let db:Pool,chargeDate:string;
async function reserve(){
 return db.query(
  "SELECT clean.reserve_phase5_fids_physical_get_v39($1,$2,$3,$4,$5,$6) t",
  [m,q,runId,draw,rights,reservation]);
}
suite("P5 V0080 bind actual GH run ID before physical FIDS GET on PostgreSQL16",()=>{
 beforeAll(async()=>{
  if(process.env.GITHUB_ACTIONS!=="true"||
     process.env.V39_P5_V0080_PG16!=="1"||process.env.DATABASE_URL!==URL)
   throw Error("REFUSED_NONDISPOSABLE_V0080_DB");
  db=new Pool({connectionString:URL,max:3});
  const now=new Date((await db.query("SELECT clock_timestamp() t")).rows[0].t);
  chargeDate=now.toISOString().slice(0,10);
  const service=new Date(now.getTime()+29*3600_000);
  await db.query(
   `INSERT INTO clean.adb_phase6_calendar_day(
     run_day_index,budget_day_id,calendar_hash,config_hash,date_utc,
     utc_slot,time_class,window_shape,evaluation_partition,draw_type,
     slot_regions,anchor_icao,pair_airport_set,frozen_draw_seed,
     scheduled_start_utc,active_duration_minutes,frame_hash)
     VALUES(1,'CI-P5-DAY1',$1,$2,$3,'CI','CI','4h','CI',
     'NEW_TEMPLATE',$4::jsonb,'WSSS',NULL,'ci-v0080',$5,240,$6)`,
   [calendar,config,service.toISOString().slice(0,10),
    JSON.stringify({HUB:"ASIA",MID_A:"MIDDLE_EAST",MID_B:"SOUTH_AMERICA",REGIONAL:"NORTH_AMERICA"}),
    service.toISOString(),frame]);
  for(const [slot,icao,region] of [
    ["HUB","WSSS","ASIA"],["MID_A","OMAA","MIDDLE_EAST"],
    ["MID_B","SKBO","SOUTH_AMERICA"],["REGIONAL","KGPT","NORTH_AMERICA"]
   ]){
   await db.query(
    `INSERT INTO clean.adb_sampling_draw(
     run_day_index,slot_id,target_region,draw_type,selected_icao,
     frozen_draw_seed,adaptive_state_hash,probability_vector,
     airport_layer_design_probability,selected_at_utc)
     VALUES(1,$1,$2,'NEW_TEMPLATE',$3,'ci-v0080',$4,$5::jsonb,$6,$7)`,
    [slot,region,icao,slot==="REGIONAL"?H("5"):null,
     slot==="REGIONAL"?JSON.stringify([{icao:"KGPT",probability:1,drawScore:1}]):null,
     slot==="REGIONAL"?1:null,
     new Date(now.getTime()-7200_000).toISOString()]);
  }
  await db.query(
   `INSERT INTO clean.phase5_fids_cycle_budget_v39(
     manifest_sha256,cycle_api_ceiling,other_category_reserved_units,
     protected_api_floor_units) VALUES($1,100,10,10)`,[m]);
  await db.query(
   `INSERT INTO clean.phase5_fids_day_budget_v39(
     manifest_sha256,run_day_index,budget_day_utc,calendar_hash,
     config_hash,frame_hash,early_draw_sha256,daily_api_ceiling,
     daily_other_reserved_units)
     VALUES($1,1,$2,$3,$4,$5,$6,50,10)`,
   [m,service.toISOString().slice(0,10),calendar,config,frame,draw]);
  await db.query(
   `INSERT INTO clean.phase5_fids_utc_charge_budget_v39(
     manifest_sha256,charge_day_utc,daily_api_ceiling,
     daily_other_reserved_units) VALUES($1,$2,50,10)`,[m,chargeDate]);
  await db.query(
   `INSERT INTO clean.phase5_fids_allowed_query_v39(
    query_digest,manifest_sha256,run_day_index,query_key,slot_id,horizon,
    airport_icao,early_draw_sha256,reviewed_release_sha256,
    rights_review_sha256,provider_contract_sha256,github_run_id,
    service_window_start_utc,service_window_end_utc,
    from_local,to_local,airport_iana_timezone,
    provider_api_version,fids_protocol_version,planned_dispatch_utc,
    planned_charge_utc_date,hard_latest_dispatch_utc,
    prediction_cutoff_utc,state)
    VALUES($1,$2,1,'CI-V0080-DAY1-HUB-T24','HUB','T-24h','WSSS',
    $3,$4,$5,$6,'00000',$7,$8,'2026-11-09T22:00','2026-11-10T02:00',
    'Asia/Singapore','CI-PROVIDER','CI-PROTOCOL',$9,$10,$11,$12,'PREPARED')`,
   [q,m,draw,H("1"),rights,provider,service.toISOString(),
    new Date(service.getTime()+4*3600_000).toISOString(),
    new Date(now.getTime()-5000).toISOString(),chargeDate,
    new Date(now.getTime()+60000).toISOString(),
    new Date(now.getTime()+900000).toISOString()]);
 });
 afterAll(async()=>{if(db)await db.end();});

 it("blocks forged direct ACTIVE attempt without trusted preceding V0080 prearm",async()=>{
  await db.query(
   "UPDATE clean.phase5_fids_allowed_query_v39 SET github_run_id=$1,state='ACTIVE' WHERE query_digest=$2",
   [runId,q]);
  await expect(reserve()).rejects.toThrow("P5_V0080_REAL_GITHUB_PREARM_REQUIRED");
  await db.query(
   "UPDATE clean.phase5_fids_allowed_query_v39 SET github_run_id='00000',state='PREPARED' WHERE query_digest=$1",
   [q]);
  expect((await db.query("SELECT physically_reserved_units n FROM clean.phase5_fids_cycle_budget_v39"))
   .rows[0].n).toBe(0);
 });
 it("rejects arbitrary prearm SHA and prevents phantom GitHub owner allocation",async()=>{
  await expect(db.query(
   "SELECT clean.prearm_phase5_fids_github_query_v39($1,$2,$3,$4,$5,$6)",
   [m,q,runId,draw,rights,H("9")]))
   .rejects.toThrow("P5_V0080_PREARM_HASH_MISMATCH");
  expect((await db.query("SELECT count(*)::int n FROM clean.phase5_fids_github_prearm_v39"))
   .rows[0].n).toBe(0);
 });
 it("binds the real future GitHub run ID and verifies it after commit",async()=>{
  const p={pool:db,manifestSha256:m,queryDigestSha256:q,
   githubRunId:runId,earlyDrawSha256:draw,rightsReviewSha256:rights};
  const res=await prearmP5V0080ActualGitHubRun(p);
  expect(res.githubRunId).toBe(runId);
  expect(res.prearmSha256).toBe(phase5PrearmDigest(p));
  const qRow=(await db.query(
   "SELECT github_run_id,state FROM clean.phase5_fids_allowed_query_v39 WHERE query_digest=$1",[q]
  )).rows[0];
  expect(qRow).toMatchObject({github_run_id:runId,state:"ACTIVE"});
  await expect(prearmP5V0080ActualGitHubRun(p))
   .rejects.toThrow("P5_V0080_SIGNED_QUERY_NOT_PREPARED");
 });
 it("permits exactly one V0079 paid-attempt reservation only after V0080",async()=>{
  await reserve();
  const a=(await db.query(
   "SELECT github_run_id,charged_utc_date FROM clean.phase5_fids_physical_attempt_v39")).rows[0];
  expect(a.github_run_id).toBe(runId);
  expect(new Date(a.charged_utc_date).toISOString().slice(0,10)).toBe(chargeDate);
  await expect(reserve()).rejects.toThrow("P5_PHYSICAL_QUERY_NOT_ACTIVE_OR_ALREADY_RESERVED");
  const c=(await db.query(
   `SELECT c.physically_reserved_units cycle,d.daily_source_reserved_units service,
    u.physically_reserved_units actual
    FROM clean.phase5_fids_cycle_budget_v39 c
    JOIN clean.phase5_fids_day_budget_v39 d USING(manifest_sha256)
    JOIN clean.phase5_fids_utc_charge_budget_v39 u USING(manifest_sha256)`)).rows[0];
  expect(c).toMatchObject({cycle:2,service:2,actual:2});
 });
 it("prearm is immutable and inaccessible to PUBLIC",async()=>{
  await expect(db.query("DELETE FROM clean.phase5_fids_github_prearm_v39"))
   .rejects.toThrow("P5_V0080_PREARM_IMMUTABLE");
  const roles=(await db.query(
   `SELECT has_table_privilege('public','clean.phase5_fids_github_prearm_v39','INSERT') public_insert,
    has_function_privilege('public',
    'clean.prearm_phase5_fids_github_query_v39(text,text,text,text,text,text)',
    'EXECUTE') public_execute`)).rows[0];
  expect(roles).toMatchObject({public_insert:false,public_execute:false});
 });
});
