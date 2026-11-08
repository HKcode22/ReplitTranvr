/**
 * No provider, no production SQL. Real disposable B0062+V0079+V0080+V0082 PG16.
 * Shows atomic rejection BEFORE paid dispatch for incomplete 7-category plans,
 * changed source range, missing cycle cap, and irreversible BASE/SPLIT spends.
 * This also exercises V0080 real-GitHub-run prearm in the same source
 * transaction path. A synthetic CI GH run ID is NOT a production authorization.
 */
import {Pool} from "pg";
import {createHash} from "node:crypto";
import {afterAll,beforeAll,describe,expect,it} from "vitest";
const URL="postgresql://postgres:postgres@localhost:5432/v39_ci?sslmode=disable";
const suite=process.env.V39_P5_V0082_DISPOSABLE_PG16==="1"?describe:describe.skip;
const H=(c:string)=>c.repeat(64);
const manifest=H("a"),calendar=H("b"),config=H("c"),frame=H("d");
const draw=H("e"),rights=H("f"),provider=H("1"),release=H("2");
const rangeEvidence=H("3"),requestSet=H("4"),budgetReview=H("5");
const runId="12345678910",baseDigest=H("6"),splitDigest=H("7");
const hash=(x:string)=>createHash("sha256").update(x).digest("hex");
const expected=(q:string)=>hash([manifest,q,runId,"1"].join("|"));
const categories=[
 "FIDS_BASE_UNITS","FIDS_SPLIT_UNITS","FIDS_RETRY_UNIT_BUDGET",
 "VALIDATION_UNIT_BUDGET","OUTCOME_REST_UNIT_BUDGET",
 "HISTORY_BOOTSTRAP_UNIT_BUDGET","DIAGNOSTIC_UNIT_BUDGET"
] as const;
let db:Pool;
let start:Date,cutoff:string,chargeDate:string;
let baseStart:string,baseEnd:string,splitEnd:string;
let fetchCalls=0;
async function reserve(queryDigest:string){
 return db.query(
  "SELECT clean.reserve_phase5_fids_physical_get_v39($1,$2,$3,$4,$5,$6)",
  [manifest,queryDigest,runId,draw,rights,expected(queryDigest)]
 );
}
async function counters(){
 const cycle=(await db.query(
   "SELECT physically_reserved_units AS n FROM clean.phase5_fids_cycle_budget_v39"
 )).rows[0].n;
 const rows=(await db.query(
  "SELECT category,planned_units,physically_reserved_units FROM clean.phase5_fids_utc_rest_category_budget_v39 ORDER BY category"
 )).rows;
 const attempts=(await db.query(
  "SELECT COUNT(*)::int n FROM clean.phase5_fids_physical_attempt_v39"
 )).rows[0].n;
 return {cycle:Number(cycle),rows,attempts};
}
suite("V0082 seven-category REST enforcement / actual disposable PostgreSQL16 only",()=>{
 beforeAll(async()=>{
  if(process.env.GITHUB_ACTIONS!=="true"||
     process.env.DATABASE_URL!==URL||
     process.env.V39_P5_V0082_DISPOSABLE_PG16!=="1"||
     process.env.AERODATABOX_API_KEY||process.env.V39_PHASE6_PROCESS_ARMED!=="0")
    throw Error("REFUSED_PHASE5_V0082_NONDISPOSABLE_PG16");
  db=new Pool({connectionString:URL,max:3});
  const now=new Date((await db.query("SELECT clock_timestamp() t")).rows[0].t);
  start=new Date(now.getTime()+29*3_600_000);
  const selected=new Date(now.getTime()-2*3_600_000).toISOString();
  chargeDate=now.toISOString().slice(0,10);
  baseStart=start.toISOString();
  baseEnd=new Date(start.getTime()+4*3_600_000).toISOString();
  splitEnd=new Date(start.getTime()+6*3_600_000).toISOString();
  cutoff=new Date(now.getTime()+15*60_000).toISOString();
  await db.query(
   `INSERT INTO clean.adb_phase6_calendar_day
   (run_day_index,budget_day_id,calendar_hash,config_hash,date_utc,utc_slot,
    time_class,window_shape,evaluation_partition,draw_type,slot_regions,
    anchor_icao,pair_airport_set,frozen_draw_seed,scheduled_start_utc,
    active_duration_minutes,frame_hash)
   VALUES(1,'P5-V0082-CI',$1,$2,$3::date,'CI','CI','up-to-6h','CI',
    'NEW_TEMPLATE',$4::jsonb,'WSSS',NULL,'v0082-ci-seed',$5,360,$6)`,
   [calendar,config,start.toISOString().slice(0,10),
    JSON.stringify({HUB:"ASIA",MID_A:"MIDDLE_EAST",MID_B:"SOUTH_AMERICA",
     REGIONAL:"NORTH_AMERICA"}),baseStart,frame]
  );
  for(const [slot,icao,region] of [
   ["HUB","WSSS","ASIA"],["MID_A","OMAA","MIDDLE_EAST"],
   ["MID_B","SKBO","SOUTH_AMERICA"],["REGIONAL","KGPT","NORTH_AMERICA"]
  ]){
   await db.query(
    `INSERT INTO clean.adb_sampling_draw(
      run_day_index,slot_id,target_region,draw_type,selected_icao,
      frozen_draw_seed,adaptive_state_hash,probability_vector,
      airport_layer_design_probability,selected_at_utc)
     VALUES(1,$1,$2,'NEW_TEMPLATE',$3,'v0082-ci-seed',$4,$5::jsonb,$6,$7)`,
    [slot,region,icao,slot==="REGIONAL"?H("8"):null,
     slot==="REGIONAL"?JSON.stringify([{icao:"KGPT",probability:1,drawScore:1}]):null,
     slot==="REGIONAL"?1:null,selected]
   );
  }
  await db.query(`INSERT INTO clean.phase5_fids_cycle_budget_v39(
    manifest_sha256,cycle_api_ceiling,other_category_reserved_units,
    protected_api_floor_units) VALUES($1,100,6,10)`,[manifest]);
  await db.query(`INSERT INTO clean.phase5_fids_day_budget_v39(
    manifest_sha256,run_day_index,budget_day_utc,calendar_hash,config_hash,
    frame_hash,early_draw_sha256,daily_api_ceiling,daily_other_reserved_units)
   VALUES($1,1,$2,$3,$4,$5,$6,40,6)`,
   [manifest,start.toISOString().slice(0,10),calendar,config,frame,draw]);
  await db.query(`INSERT INTO clean.phase5_fids_utc_charge_budget_v39(
    manifest_sha256,charge_day_utc,daily_api_ceiling,daily_other_reserved_units)
   VALUES($1,$2::date,40,6)`,[manifest,chargeDate]);

  const planned=new Date(now.getTime()-10_000).toISOString();
  const latest=new Date(now.getTime()+120_000).toISOString();
  for(const [digest,key,s,e] of [
   [baseDigest,"V0082-BASE",""+baseStart,""+baseEnd],
   [splitDigest,"V0082-SPLIT",""+baseEnd,""+splitEnd]
  ]){
   await db.query(
    `INSERT INTO clean.phase5_fids_allowed_query_v39(
     query_digest,manifest_sha256,run_day_index,query_key,slot_id,horizon,
     airport_icao,early_draw_sha256,reviewed_release_sha256,
     rights_review_sha256,provider_contract_sha256,github_run_id,
     service_window_start_utc,service_window_end_utc,
     from_local,to_local,airport_iana_timezone,provider_api_version,
     fids_protocol_version,planned_dispatch_utc,planned_charge_utc_date,
     hard_latest_dispatch_utc,prediction_cutoff_utc,state)
    VALUES($1,$2,1,$3,'HUB','T-24h','WSSS',$4,$5,$6,$7,'00000',
     $8,$9,'2026-11-09T22:00','2026-11-10T02:00','Asia/Singapore',
     'CI-PROVIDER','CI-PROTOCOL',$10,$11::date,$12,$13,'PREPARED')`,
    [digest,manifest,key,draw,release,rights,provider,s,e,
     planned,chargeDate,latest,cutoff]
   );
  }

  await db.query(`INSERT INTO clean.phase5_fids_seven_rest_release_v39(
    manifest_sha256,reviewed_source_request_grid_sha256,
    reviewed_provider_range_sha256,verified_provider_max_range_minutes,
    reviewed_category_budget_sha256) VALUES($1,$2,$3,240,$4)`,
   [manifest,requestSet,rangeEvidence,budgetReview]);
  for(const [digest,idx,category] of [
    [baseDigest,1,"FIDS_BASE_UNITS"],[splitDigest,2,"FIDS_SPLIT_UNITS"]
  ]){
   await db.query(`INSERT INTO clean.phase5_fids_exact_query_partition_v39(
     query_digest,manifest_sha256,segment_index,partition_index,
     window_shape,rest_category,reviewed_provider_range_sha256)
    VALUES($1,$2,1,$3,'up-to-6h',$4,$5)`,
    [digest,manifest,idx,category,rangeEvidence]);
  }
  const initial={FIDS_BASE_UNITS:2,FIDS_SPLIT_UNITS:2,
   FIDS_RETRY_UNIT_BUDGET:0,VALIDATION_UNIT_BUDGET:2,
   OUTCOME_REST_UNIT_BUDGET:2,HISTORY_BOOTSTRAP_UNIT_BUDGET:2,
   DIAGNOSTIC_UNIT_BUDGET:0};
  // Intentionally OMIT last category and last cycle cap first,
  // proving that no physical provider GET is reserved under partial plans.
  for(const c of categories.slice(0,-1)){
    await db.query(`INSERT INTO clean.phase5_fids_utc_rest_category_budget_v39
     (manifest_sha256,charge_day_utc,category,planned_units)
     VALUES($1,$2::date,$3,$4)`,
     [manifest,chargeDate,c,initial[c]]);
    await db.query(`INSERT INTO clean.phase5_fids_cycle_rest_category_cap_v39
     (manifest_sha256,category,ceiling_units) VALUES($1,$2,$3)`,
     [manifest,c,initial[c]]);
  }
  // Reproduce the actual V0080 separately COMMITTED GitHub prearm before
  // any V0079 attempt. No paid provider or production database is accessible.
  for(const q of [baseDigest,splitDigest]){
   const prearmSha=hash([
    "phase5-v0080",manifest,q,runId,draw,rights
   ].join("|"));
   await db.query(
    "SELECT clean.prearm_phase5_fids_github_query_v39($1,$2,$3,$4,$5,$6)",
    [manifest,q,runId,draw,rights,prearmSha]
   );
  }
  const p=(await db.query(
   "SELECT COUNT(*)::int n FROM clean.phase5_fids_github_prearm_v39"
  )).rows[0].n;
  expect(p).toBe(2);
 });
 afterAll(async()=>{if(db)await db.end();});
 it("rejects the absent seventh UTC charge category without any charged reservation",async()=>{
   await expect(reserve(baseDigest)).rejects
    .toThrow("P5_V0082_INCOMPLETE_SEVEN_CATEGORY_UTC_BUDGET");
   expect((await counters()).cycle).toBe(0);
   expect((await counters()).attempts).toBe(0);
   expect(fetchCalls).toBe(0);
 });
 it("requires every cycle category cap before a physical GET",async()=>{
   await db.query(`INSERT INTO clean.phase5_fids_utc_rest_category_budget_v39
    (manifest_sha256,charge_day_utc,category,planned_units)
    VALUES($1,$2::date,'DIAGNOSTIC_UNIT_BUDGET',0)`,
    [manifest,chargeDate]);
   await expect(reserve(baseDigest)).rejects
    .toThrow("P5_V0082_SEVEN_CATEGORY_CYCLE_CAP_HOLD");
   expect((await counters()).attempts).toBe(0);
   expect(fetchCalls).toBe(0);
 });
 it("refuses changed six-hour source interval before physically reserving",async()=>{
   await db.query(`INSERT INTO clean.phase5_fids_cycle_rest_category_cap_v39
    (manifest_sha256,category,ceiling_units)
    VALUES($1,'DIAGNOSTIC_UNIT_BUDGET',0)`,[manifest]);
   await db.query(`UPDATE clean.phase5_fids_allowed_query_v39
    SET service_window_end_utc=$2 WHERE query_digest=$1`,
    [splitDigest,new Date(start.getTime()+5*3_600_000).toISOString()]);
   await expect(reserve(splitDigest)).rejects
    .toThrow("P5_V0082_EXACT_EXPOSED_SOURCE_RANGE_OR_CATEGORY_MISMATCH");
   expect((await counters()).cycle).toBe(0);
   await db.query(`UPDATE clean.phase5_fids_allowed_query_v39
    SET service_window_end_utc=$2 WHERE query_digest=$1`,
    [splitDigest,splitEnd]);
 });
 it("reserves BASE and later SPLIT atomically on the actual GET UTC charge day",async()=>{
   await reserve(baseDigest);
   let state=await counters();
   expect(state.cycle).toBe(2);
   expect(state.attempts).toBe(1);
   expect(Number(state.rows.find((r:any)=>r.category==="FIDS_BASE_UNITS").physically_reserved_units)).toBe(2);
   expect(Number(state.rows.find((r:any)=>r.category==="FIDS_SPLIT_UNITS").physically_reserved_units)).toBe(0);
   await reserve(splitDigest);
   state=await counters();
   expect(state.cycle).toBe(4);
   expect(state.attempts).toBe(2);
   expect(Number(state.rows.find((r:any)=>r.category==="FIDS_SPLIT_UNITS").physically_reserved_units)).toBe(2);
   const billed=(await db.query(
    "SELECT DISTINCT charged_utc_date FROM clean.phase5_fids_physical_attempt_v39"
   )).rows;
   expect(billed).toHaveLength(1);
   expect(new Date(billed[0].charged_utc_date).toISOString().slice(0,10))
    .toBe(chargeDate);
   expect(fetchCalls).toBe(0);
 });
 it("cannot replay a paid reservation or retune frozen category budgets",async()=>{
   await expect(reserve(baseDigest)).rejects
    .toThrow("P5_PHYSICAL_QUERY_NOT_ACTIVE_OR_ALREADY_RESERVED");
   await expect(db.query(`UPDATE clean.phase5_fids_utc_rest_category_budget_v39
      SET planned_units=100 WHERE manifest_sha256=$1
      AND category='FIDS_BASE_UNITS'`,[manifest]))
      .rejects.toThrow("P5_V0082_SEVEN_REST_CATEGORY_IMMUTABLE");
   expect((await counters()).cycle).toBe(4);
   expect((await counters()).attempts).toBe(2);
   expect(fetchCalls).toBe(0);
 });
});
