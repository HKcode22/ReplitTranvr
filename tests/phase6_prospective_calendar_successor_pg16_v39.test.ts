import {createHash} from "node:crypto";
import {Pool} from "pg";
import {afterAll,beforeAll,describe,expect,it} from "vitest";
import {
  P6_NOV20_SUCCESSOR_REVIEW,P6_ORIGINAL_FROZEN_RELEASE,
  commitP6ProspectiveCalendarSuccessorOnce,verifyP6ProspectiveCalendarSuccessorReadOnly,
  validateP6ProspectiveCalendarSuccessorPacket,
  type P6ProspectiveCalendarSuccessorPacket,
} from "../server/lib/disruption/phase6ProspectiveCalendarSuccessor_v39";

const enabled=process.env.V39_P6_CALENDAR_SUCCESSOR_PG16==="1";
const suite=enabled?describe:describe.skip;
const URL="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
const h=(x:string)=>createHash("sha256").update(x).digest("hex");
const j=(x:unknown)=>h(JSON.stringify(x));
const iso=(n:number)=>new Date(n).toISOString();
const cats=["FIDS_SOURCE_UNIT_BUDGET","FIDS_RETRY_UNIT_BUDGET","VALIDATION_UNIT_BUDGET",
 "OUTCOME_REST_UNIT_BUDGET","HISTORY_BOOTSTRAP_UNIT_BUDGET","DIAGNOSTIC_UNIT_BUDGET","RESERVED_GUARD_UNIT_BUDGET"];

function packet():P6ProspectiveCalendarSuccessorPacket{
  const base=Date.parse(P6_NOV20_SUCCESSOR_REVIEW.firstServiceUtc);
  const frame=h("frame");
  const calendarDays=Array.from({length:31},(_,i)=>({
    runDayIndex:i+1,budgetDayId:"p6-nov20-"+String(i+1).padStart(2,"0"),
    startUtc:iso(base+i*24*3600000),utcSlot:"00",timeClass:"00",
    windowShape:"4h" as const,partition:(i<20?"train":i<25?"validation":"test") as "train"|"validation"|"test",
    pairId:null,crossoverPeriod:null,pairRole:null,drawType:"NEW_TEMPLATE",
    slotRegions:{HUB:"Asia-Pacific",MID_A:"Europe",MID_B:"North America",REGIONAL:"Oceania"},
    anchorIcao:"WSSS",pairAirportSet:null,frozenDrawSeed:h("seed-"+i),frameSha256:frame,activeDurationMinutes:240,
  }));
  const utcBudgets=Array.from({length:37},(_,i)=>({
    chargeDayUtc:new Date(Date.UTC(2026,10,20+i)).toISOString().slice(0,10),
    dailyApiCeiling:1900,dailyOtherReservedUnits:400,
  }));
  const cycleBudget={cycleApiCeiling:48000,otherCategoryReservedUnits:12000,protectedApiFloorUnits:1000};
  const sevenRestRelease={reviewedProviderRangeSha256:h("range"),verifiedProviderMaxRangeMinutes:240,
    reviewedCategoryBudgetSha256:h("category")};
  const cycleCategoryCaps=cats.map((category,i)=>({category,ceilingUnits:5000+i}));
  const utcCategoryBudgets=utcBudgets.flatMap(d=>cats.map((category,i)=>({
    chargeDayUtc:d.chargeDayUtc,category,plannedUnits:100+i,
  })));
  const runtimeCalendarRowsSha256=j(calendarDays);
  const runtimeBudgetRowsSha256=j({cycleBudget,utcBudgets,sevenRestRelease,cycleCategoryCaps,utcCategoryBudgets});
  const configSha256=h("successor-config");
  const manifest={
    schema:"v39.phase6.prospective-date-successor-manifest.v1",
    status:"SCIENTIFIC_FREEZE_DATE_SUCCESSOR_APPROVED_NO_GO",
    originalPhase5ManifestSha256:P6_ORIGINAL_FROZEN_RELEASE.manifestSha256,
    calendarRowsSha256:P6_NOV20_SUCCESSOR_REVIEW.calendarRowsSha256,
    runtimeCalendarRowsSha256,runtimeBudgetRowsSha256,configSha256,
    scientificFreezeApproved:true,prospectiveDateSuccessorApproved:true,
    sourceRightsApproved:false,sourceUseDeferredToPhase6Activation:true,phase6PaidGo:false,
  };
  const manifestJson=JSON.stringify(manifest);
  return {
    schema:"v39.phase6.prospective-calendar-successor.v1",
    reviewedMainSha:"1".repeat(40),
    original:{...P6_ORIGINAL_FROZEN_RELEASE},
    successor:{
      authorizationId:"AUTH-20261120-P6NOV20DATE1",manifestSha256:h(manifestJson),manifestJson,
      calendarSha256:P6_NOV20_SUCCESSOR_REVIEW.calendarRowsSha256,
      runtimeCalendarRowsSha256,runtimeBudgetRowsSha256,configSha256,codeSha40:"2".repeat(40),
      phase6StartDateUtc:"2026-11-22",predecessorEvidenceIds:["DEC-20261119-ADBBOUNDEDSOURCE","DEC-20261120-NOV20DATE1"],
      calendarDays,cycleBudget,utcBudgets,sevenRestRelease,cycleCategoryCaps,utcCategoryBudgets,
      sourceTemplates:6144,totalReservedUnits:36740,peakUtcDayReserveUnits:1280,
      firstSourceUtc:P6_NOV20_SUCCESSOR_REVIEW.firstSourceUtc,
    },
    review:{
      originalFreezeReceiptSha256:P6_ORIGINAL_FROZEN_RELEASE.freezeReceiptSha256,
      boundedSourceUseEvidenceSha256:h("bounded-source-use"),
      prospectiveDateRevisionEvidenceSha256:h("date-revision"),
      recoveryControlEvidenceSha256:h("recovery"),
      independentDateRevisionApproved:true,originalSeedAndTreatmentPreserved:true,ownerApproved:true,
      sourceAuthorizationStillSeparate:true,paidGoStillSeparate:true,
    },
    phase6PaidGo:false,
  };
}

async function ddl(pool:Pool){
  await pool.query("CREATE SCHEMA clean");
  await pool.query(`CREATE TABLE clean.adb_collection_meta(key text PRIMARY KEY,value text NOT NULL)`);
  await pool.query(`CREATE TABLE clean.adb_phase6_authorization(
    singleton_key boolean PRIMARY KEY,authorization_id text NOT NULL,manifest_sha256 text NOT NULL,
    calendar_hash text NOT NULL,config_hash text NOT NULL,code_sha text NOT NULL,schema_version text NOT NULL,
    phase6_start_date date NOT NULL,enabled boolean NOT NULL,revoked_at_utc timestamptz,
    predecessor_evidence_ids jsonb NOT NULL)`);
  await pool.query(`CREATE TABLE clean.adb_phase6_calendar_day(
    run_day_index int PRIMARY KEY,budget_day_id text NOT NULL,calendar_hash text NOT NULL,config_hash text NOT NULL,
    frame_hash text NOT NULL,scheduled_start_utc timestamptz NOT NULL,date_utc date NOT NULL,utc_slot text NOT NULL,
    time_class text NOT NULL,window_shape text NOT NULL,evaluation_partition text NOT NULL,crossover_group_id text,
    crossover_period int,pair_role text,draw_type text NOT NULL,slot_regions jsonb NOT NULL,anchor_icao text NOT NULL,
    pair_airport_set jsonb,frozen_draw_seed text NOT NULL,active_duration_minutes int NOT NULL)`);
  await pool.query(`CREATE TABLE clean.phase5_fids_cycle_budget_v39(
    manifest_sha256 text PRIMARY KEY,cycle_api_ceiling int,other_category_reserved_units int,
    protected_api_floor_units int,physically_reserved_units int)`);
  await pool.query(`CREATE TABLE clean.phase5_fids_utc_charge_budget_v39(
    manifest_sha256 text,charge_day_utc date,daily_api_ceiling int,daily_other_reserved_units int,
    physically_reserved_units int,PRIMARY KEY(manifest_sha256,charge_day_utc))`);
  await pool.query(`CREATE TABLE clean.phase5_fids_seven_rest_release_v39(
    manifest_sha256 text PRIMARY KEY,reviewed_source_request_grid_sha256 text,
    reviewed_provider_range_sha256 text,verified_provider_max_range_minutes int,
    reviewed_category_budget_sha256 text,budget_release_mode text,reviewed_cost_envelope_sha256 text)`);
  await pool.query(`CREATE TABLE clean.phase5_fids_cycle_rest_category_cap_v39(
    manifest_sha256 text,category text,ceiling_units int,PRIMARY KEY(manifest_sha256,category))`);
  await pool.query(`CREATE TABLE clean.phase5_fids_utc_rest_category_budget_v39(
    manifest_sha256 text,charge_day_utc date,category text,planned_units int,
    PRIMARY KEY(manifest_sha256,charge_day_utc,category))`);
  for(const t of ["adb_sampling_draw","phase5_fids_day_budget_v39","phase5_fids_allowed_query_v39",
    "phase5_fids_exact_query_partition_v39","phase5_fids_physical_attempt_v39",
    "phase5_other_rest_physical_reservation_v39"])await pool.query("CREATE TABLE clean."+t+"(id int)");
  await pool.query("CREATE TABLE clean.adb_collection_batches(id int,status text,run_day_index int)");
  await pool.query("CREATE TABLE clean.adb_collection_subs(id int,ended_at timestamptz)");
  await pool.query("CREATE TABLE clean.adb_incident_stop(id int,resolved boolean)");
}

async function seed(pool:Pool){
  const o=P6_ORIGINAL_FROZEN_RELEASE;
  await pool.query(`INSERT INTO clean.adb_phase6_authorization VALUES
    (true,$1,$2,$3,$4,$5,'v39','2026-11-21',false,NULL,'[]'::jsonb)`,
    [o.authorizationId,o.manifestSha256,o.calendarSha256,o.configSha256,"a".repeat(40)]);
  for(let i=0;i<31;i++)await pool.query(`INSERT INTO clean.adb_phase6_calendar_day VALUES
    ($1,$2,$3,$4,$5,$6::timestamptz,$7::date,'00','00','4h',$8,NULL,NULL,NULL,'NEW_TEMPLATE',
     '{"HUB":"Asia-Pacific"}'::jsonb,'WSSS',NULL,$9,240)`,
    [i+1,"old-"+(i+1),o.calendarSha256,o.configSha256,h("old-frame"),
     iso(Date.UTC(2026,10,21+i)),new Date(Date.UTC(2026,10,21+i)).toISOString().slice(0,10),
     i<20?"train":i<25?"validation":"test",h("old-seed-"+i)]);
  await pool.query("INSERT INTO clean.phase5_fids_cycle_budget_v39 VALUES($1,50000,14000,1000,0)",[o.manifestSha256]);
  const dates=Array.from({length:37},(_,i)=>new Date(Date.UTC(2026,10,19+i)).toISOString().slice(0,10));
  for(const d of dates)await pool.query("INSERT INTO clean.phase5_fids_utc_charge_budget_v39 VALUES($1,$2::date,1900,400,0)",[o.manifestSha256,d]);
  await pool.query("INSERT INTO clean.phase5_fids_seven_rest_release_v39 VALUES($1,NULL,$2,240,$3,'COST_UPPER_BOUND',$3)",
    [o.manifestSha256,h("old-range"),o.costEnvelopeSha256]);
  for(const [i,c] of cats.entries())await pool.query("INSERT INTO clean.phase5_fids_cycle_rest_category_cap_v39 VALUES($1,$2,$3)",[o.manifestSha256,c,5000+i]);
  for(const d of dates)for(const [i,c] of cats.entries())await pool.query("INSERT INTO clean.phase5_fids_utc_rest_category_budget_v39 VALUES($1,$2::date,$3,$4)",[o.manifestSha256,d,c,100+i]);
}

suite("Phase6 prospective calendar successor atomic transition",()=>{
  let pool:Pool;
  beforeAll(async()=>{
    if(process.env.GITHUB_ACTIONS!=="true"||!enabled||process.env.DATABASE_URL!==URL||
      process.env.AERODATABOX_API_KEY||process.env.RAPIDAPI_KEY||process.env.V39_PHASE6_PROCESS_ARMED!=="0")
      throw Error("REFUSED_NONDISPOSABLE_SUCCESSOR_TEST");
    pool=new Pool({connectionString:URL});
    await ddl(pool); await seed(pool);
  });
  afterAll(async()=>{if(pool)await pool.end();});
  it("validates the exact reviewed successor and rejects a row mutation",()=>{
    const p=packet();
    expect(validateP6ProspectiveCalendarSuccessorPacket(p,new Date("2026-11-20T02:00:00.000Z")).pass).toBe(true);
    const bad=structuredClone(p); bad.successor.calendarDays[0].anchorIcao="YSSY";
    expect(()=>validateP6ProspectiveCalendarSuccessorPacket(bad,new Date("2026-11-20T02:00:00.000Z"))).toThrow("CALENDAR_COUNT_OR_HASH");
  });
  it("archives the old freeze, replaces only disabled zero-work runtime rows, and reads back successor",async()=>{
    const p=packet();
    const receipt=await commitP6ProspectiveCalendarSuccessorOnce(pool,p);
    expect(receipt).toMatchObject({
      status:"PROSPECTIVE_CALENDAR_SUCCESSOR_INSTALLED_DISABLED_NO_PROVIDER_NO_GO",
      originalCalendarSha256:P6_ORIGINAL_FROZEN_RELEASE.calendarSha256,
      successorCalendarSha256:P6_NOV20_SUCCESSOR_REVIEW.calendarRowsSha256,
      providerCalls:0,paidGo:false,databaseAuthorizationEnabled:false,
    });
    const rb=await verifyP6ProspectiveCalendarSuccessorReadOnly(pool,p);
    expect(rb).toMatchObject({
      status:"PROSPECTIVE_CALENDAR_SUCCESSOR_READONLY_MATCH_DISABLED_NO_GO",
      originalSnapshotPreserved:true,authorizationEnabled:false,providerCalls:0,paidGo:false,
    });
    const archived=(await pool.query("SELECT value FROM clean.adb_collection_meta WHERE key=$1",
      ["phase6_calendar_successor_original:"+P6_ORIGINAL_FROZEN_RELEASE.calendarSha256])).rows[0]?.value;
    expect(archived).toContain(P6_ORIGINAL_FROZEN_RELEASE.authorizationId);
    expect(archived).toContain(P6_ORIGINAL_FROZEN_RELEASE.manifestSha256);
    await expect(commitP6ProspectiveCalendarSuccessorOnce(pool,p)).rejects.toThrow("PRIOR_ARCHIVE_OR_TRANSITION_NO_REPLAY");
  });
});
