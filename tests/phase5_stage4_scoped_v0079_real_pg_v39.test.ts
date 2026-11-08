/**
 * End-to-end offline proof: fake HTTP response, real disposable PostgreSQL16,
 * irreversible V0079 reservation and atomic original raw+population binding.
 * No network, no live production database, no permitted paid collection.
 */
import {Pool} from "pg";
import {beforeAll,afterAll,describe,expect,it} from "vitest";
import {verifyPreparedDailyDraw,type PreparedDrawRow,
 type PreparedDayForReadback} from "../server/lib/disruption/phase5EarlyPreselectionReadback_v39";
import {runP5ScopedFidsSource,type P5SourceSingleQueryPlan}
 from "../server/lib/disruption/phase5ScopedFidsSourceBridge_v39";
import {createP5V0079ScopedDbPorts}
 from "../server/lib/disruption/phase5V0079ScopedDbPorts_v39";
const URL="postgresql://postgres:postgres@localhost:5432/v39_ci?sslmode=disable";
const run=process.env.V39_P5_STAGE4_REAL_PG==="1"?describe:describe.skip;
const H=(s:string)=>s.repeat(64);
const manifest=H("a"),query=H("b"),calendar=H("c"),
 config=H("d"),frame=H("e"),rights=H("2"),contract=H("3"),release=H("1");
const gitRun="12345678910";
let pool:Pool,plan:P5SourceSingleQueryPlan;
let fetches=0;
const fakeFetch:typeof fetch=async()=>{
 fetches++;
 return new Response(JSON.stringify({departures:[],arrivals:[]}),{
  status:200,headers:{"content-type":"application/json"}
 });
};
run("Phase5 real V0079 source adapter + fake HTTP, disposable B0062 PG16 only",()=>{
 beforeAll(async()=>{
  if(process.env.GITHUB_ACTIONS!=="true"||
     process.env.DATABASE_URL!==URL||
     process.env.V39_P5_STAGE4_REAL_PG!=="1")
    throw Error("REFUSED_STAGE4_NONDISPOSABLE_DB");
  pool=new Pool({connectionString:URL,max:5});
  const now=new Date((await pool.query("SELECT clock_timestamp() AS t")).rows[0].t);
  const start=new Date(now.getTime()+29*3600000);
  const utcChargeDay=now.toISOString().slice(0,10);
  expect(start.toISOString().slice(0,10)).not.toBe(utcChargeDay);
  const selected=new Date(now.getTime()-2*3600000).toISOString();
  const day:PreparedDayForReadback={
   runDayIndex:1,scheduledStartUtc:start,frozenDrawSeed:"stage4-ci-seed",
   drawType:"NEW_TEMPLATE",anchorIcao:"WSSS",
   slotRegions:{HUB:"ASIA",MID_A:"MIDDLE_EAST",
    MID_B:"SOUTH_AMERICA",REGIONAL:"NORTH_AMERICA"},
   pairAirportSet:null,calendarHash:calendar,configHash:config,frameHash:frame,
  };
  const rows:PreparedDrawRow[]=[
    ["HUB","WSSS","ASIA"],["MID_A","OMAA","MIDDLE_EAST"],
    ["MID_B","SKBO","SOUTH_AMERICA"],["REGIONAL","KGPT","NORTH_AMERICA"]
   ].map(([slot,icao,region])=>({
    slot_id:slot,target_region:region,draw_type:"NEW_TEMPLATE",
    selected_icao:icao,frozen_draw_seed:day.frozenDrawSeed,
    selected_at_utc:selected,
    adaptive_state_hash:slot==="REGIONAL"?H("5"):null,
    probability_vector:slot==="REGIONAL"?
     [{icao:"KGPT",probability:1,drawScore:1}]:null,
    airport_layer_design_probability:slot==="REGIONAL"?1:null,
   }));
  const drawSha=verifyPreparedDailyDraw(day,rows).stateHash;
  plan={
    sourcePartition:{
      schema:"v39.phase5.amendment-c.source-segment-partition.v1",
      windowShape:"4h",segmentIndex:1,partitionIndex:1,
      verifiedProviderMaxRangeMinutes:240,
      reviewedProviderRangeEvidenceSha256:H("7")
    },
    day,savedEarlyDrawRows:rows,expectedEarlyDrawSha256:drawSha,
    reviewedReleaseSha256:release,reviewedProviderRightsSha256:rights,
    openapiSha256:contract,independentlyApprovedSourceAndRetention:true,
    githubOnlyOwnerApproved:true,providerApiVersion:"CI-PROVIDER",
    fidsProtocolVersion:"CI-PROTOCOL",localFrom:"2026-11-09T22:00",
    localTo:"2026-11-10T02:00",ianaTimezone:"Asia/Singapore",
    acquisition:{
     runDayIndex:1,budgetDayUtc:start.toISOString().slice(0,10),
     slot:"HUB",icao:"WSSS",horizon:"T-24h",
     providerQueryDirection:"Departure",
     serviceWindowStartUtc:start.toISOString(),
     serviceWindowEndUtc:new Date(start.getTime()+4*3600000).toISOString(),
     earliestPlannedCutoffUtc:new Date(now.getTime()+15*60000).toISOString(),
     scheduledRequestUtc:new Date(now.getTime()-5000).toISOString(),
     plannedAirportSelectionUtc:selected,maxResponseAndPersistSeconds:120,
     apiUnitsPerAttempt:2,maxAttempts:1,queryKey:"CI-P5-D1-HUB-T24",
    },
  };
  await pool.query(
   `INSERT INTO clean.adb_phase6_calendar_day(
    run_day_index,budget_day_id,calendar_hash,config_hash,date_utc,
    utc_slot,time_class,window_shape,evaluation_partition,draw_type,
    slot_regions,anchor_icao,pair_airport_set,frozen_draw_seed,
    scheduled_start_utc,active_duration_minutes,frame_hash)
    VALUES(1,'P6D01',$1,$2,$3::date,'CI','CI','4h','CI','NEW_TEMPLATE',
    $4::jsonb,'WSSS',NULL,'stage4-ci-seed',$5,240,$6)`,
   [calendar,config,start.toISOString().slice(0,10),
    JSON.stringify(day.slotRegions),start.toISOString(),frame]);
  for(const x of rows){
   await pool.query(
    `INSERT INTO clean.adb_sampling_draw(
     run_day_index,slot_id,target_region,draw_type,selected_icao,
     frozen_draw_seed,adaptive_state_hash,probability_vector,
     airport_layer_design_probability,selected_at_utc)
     VALUES(1,$1,$2,'NEW_TEMPLATE',$3,'stage4-ci-seed',$4,$5::jsonb,$6,$7)`,
    [x.slot_id,x.target_region,x.selected_icao,x.adaptive_state_hash,
     x.probability_vector?JSON.stringify(x.probability_vector):null,
     x.airport_layer_design_probability,selected]);
  }
  await pool.query(
   `INSERT INTO clean.phase5_fids_cycle_budget_v39(
     manifest_sha256,cycle_api_ceiling,other_category_reserved_units,
     protected_api_floor_units) VALUES($1,100,10,10)`,[manifest]);
  await pool.query(
   `INSERT INTO clean.phase5_fids_day_budget_v39(
    manifest_sha256,run_day_index,budget_day_utc,calendar_hash,config_hash,
    frame_hash,early_draw_sha256,daily_api_ceiling,daily_other_reserved_units)
    VALUES($1,1,$2,$3,$4,$5,$6,50,10)`,
   [manifest,start.toISOString().slice(0,10),calendar,config,frame,drawSha]);
  await pool.query(
   `INSERT INTO clean.phase5_fids_utc_charge_budget_v39(
    manifest_sha256,charge_day_utc,daily_api_ceiling,daily_other_reserved_units)
    VALUES($1,$2,50,10)`,[manifest,utcChargeDay]);
  await pool.query(
   `INSERT INTO clean.phase5_fids_allowed_query_v39(
    query_digest,manifest_sha256,run_day_index,query_key,slot_id,horizon,
    airport_icao,early_draw_sha256,reviewed_release_sha256,
    rights_review_sha256,provider_contract_sha256,github_run_id,
    service_window_start_utc,service_window_end_utc,
    from_local,to_local,airport_iana_timezone,provider_api_version,
    fids_protocol_version,planned_dispatch_utc,planned_charge_utc_date,
    hard_latest_dispatch_utc,prediction_cutoff_utc,state)
    VALUES($1,$2,1,$3,'HUB','T-24h','WSSS',$4,$5,$6,$7,$8,
    $9,$10,'2026-11-09T22:00','2026-11-10T02:00','Asia/Singapore',
    'CI-PROVIDER','CI-PROTOCOL',$11,$14::date,$12,$13,'ACTIVE')`,
   [query,manifest,plan.acquisition.queryKey,drawSha,release,rights,
    contract,gitRun,plan.acquisition.serviceWindowStartUtc,
    plan.acquisition.serviceWindowEndUtc,
    plan.acquisition.scheduledRequestUtc,
    new Date(now.getTime()+60000).toISOString(),
    plan.acquisition.earliestPlannedCutoffUtc,utcChargeDay]);
 });
 afterAll(async()=>{if(pool)await pool.end();});
 const make=(p:P5SourceSingleQueryPlan=plan)=>createP5V0079ScopedDbPorts({
  plan:p,manifestSha256:manifest,exactQueryDigest:query,
  githubRunId:gitRun,scopedPool:pool,fetchImpl:fakeFetch,
 });
 it("rejects signed first partition if actual PostgreSQL frozen treatment shape differs",async()=>{
  // A four-hour GET is a valid partition of either a 4h parent or the
  // first 4h of a six-hour parent. Only the stored calendar distinguishes.
  const altered={...plan,sourcePartition:{
    ...plan.sourcePartition,windowShape:"up-to-6h" as const
  }};
  const ports=make(altered);
  await expect(runP5ScopedFidsSource(altered,ports))
   .rejects.toThrow("FROZEN_QUERY_OR_SELECTION_CHANGED");
  expect(fetches).toBe(0);
  expect((await pool.query(
    "SELECT physically_reserved_units n FROM clean.phase5_fids_cycle_budget_v39"
  )).rows[0].n).toBe(0);
 });
 it("rejects changed original query before any provider or physical reservation",async()=>{
  const fake={...plan,localTo:"2026-11-10T03:00"};
  const p=make(fake);
  await expect(runP5ScopedFidsSource(fake,p))
   .rejects.toThrow("FROZEN_QUERY_OR_SELECTION_CHANGED");
  expect(fetches).toBe(0);
  expect((await pool.query("SELECT physically_reserved_units n FROM clean.phase5_fids_cycle_budget_v39"))
   .rows[0].n).toBe(0);
 });
 it("commits physical reservation before one fake HTTP; binds original in real PG transaction",async()=>{
  const result=await runP5ScopedFidsSource(plan,make());
  expect(result.status).toBe("SOURCE_ORIGINAL_BOUND_TIMELY_NOT_FLIGHT_PRE");
  expect(result.actualPreCertified).toBe(false);
  expect(result.providerOriginalBound).toBe(true);
  expect(fetches).toBe(1);
  const c=(await pool.query(
   `SELECT c.physically_reserved_units,d.daily_source_reserved_units
    FROM clean.phase5_fids_cycle_budget_v39 c
    JOIN clean.phase5_fids_day_budget_v39 d USING(manifest_sha256)`)).rows[0];
  expect(c).toMatchObject({physically_reserved_units:2,daily_source_reserved_units:2});
  const utcCharge=(await pool.query(
    "SELECT charge_day_utc,physically_reserved_units FROM clean.phase5_fids_utc_charge_budget_v39"
  )).rows[0];
  expect(utcCharge.physically_reserved_units).toBe(2);
  expect(new Date(utcCharge.charge_day_utc).toISOString().slice(0,10))
    .toBe(new Date(plan.acquisition.scheduledRequestUtc).toISOString().slice(0,10));
  const b=(await pool.query(
   `SELECT b.response_hash,b.decoded_original_body_sha256,r.response_hash AS original_hash
    FROM clean.phase5_fids_original_binding_v39 b
    JOIN clean.fids_query_response r USING(population_query_id)`)).rows;
  expect(b).toHaveLength(1);
  expect(b[0].response_hash).toBe(b[0].original_hash);
 });
 it("replaying same query cannot reserve or issue a second physical GET",async()=>{
  await expect(runP5ScopedFidsSource(plan,make())).rejects
   .toThrow("P5_PHYSICAL_QUERY_NOT_ACTIVE_OR_ALREADY_RESERVED");
  expect(fetches).toBe(1);
  expect((await pool.query(
   "SELECT count(*)::int n FROM clean.phase5_fids_physical_attempt_v39")).rows[0].n)
   .toBe(1);
 });
});
