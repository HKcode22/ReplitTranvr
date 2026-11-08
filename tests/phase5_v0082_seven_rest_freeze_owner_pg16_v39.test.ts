/**
 * REAL disposable PostgreSQL16 (B0062 + staged V0079+V0082), 0 provider.
 * A synthetic 31-day Stage21+Stage22 reviewed-input budget is not a release.
 */
import {afterAll,beforeAll,describe,it,expect} from "vitest";
import {Pool} from "pg";
import {full31SyntheticBudgetPlan} from
 "./helpers/phase5_v0082_full31_budget_candidate_fixture_v39.mjs";
import {createP5V0082SevenRestFreezeCandidate} from
 "../server/lib/disruption/phase5V0082SevenCategoryFreezePacket_v39.mjs";
import {commitP5V0082FrozenSevenRestInput,
 type P5V0082FreezeOwnerReview} from
 "../server/lib/disruption/phase5V0082SevenCategoryBudgetFreezeWriter_v39";

const URL="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
const ROLE="phase5_fids_budget_freeze_ci_20261108";
const RESTRICTED="postgresql://"+ROLE+":ci-only@localhost:5432/neondb?sslmode=disable";
const enabled=process.env.V39_P5_V0082_SEVEN_INPUT_PG16==="1";
const suite=enabled?describe:describe.skip;
const sha=(c:string)=>c.repeat(64);
const sourceCats=["FIDS_BASE_UNITS","FIDS_SPLIT_UNITS"];
suite("Phase5 V0082 frozen 31-day seven-category budget input (PG16)",()=>{
 let admin:Pool,owner:Pool,review:P5V0082FreezeOwnerReview;
 let nDays=0,expectedSourceUnits=0,expectedOtherUnits=0;
 let fake:any;
 beforeAll(async()=>{
  if(process.env.GITHUB_ACTIONS!=="true"||!enabled||
     process.env.DATABASE_URL!==URL||
     process.env.AERODATABOX_API_KEY||
     process.env.V39_PHASE6_PROCESS_ARMED!=="0"||
     process.env.V39_PHASE6_OWNER_APPROVED!=="0")
   throw Error("REFUSED_P5_V0082_NONDISPOSABLE_BUDGET_FREEZE_TEST");
  admin=new Pool({connectionString:URL,max:2});
  fake=full31SyntheticBudgetPlan();
  const {candidate:c}=fake;
  nDays=c.days.length;
  expectedSourceUnits=c.cycleSourceReservedUnits;
  expectedOtherUnits=c.cycleOtherReservedUnits;
  expect(c.calendarDays).toHaveLength(31);
  expect(c.days.length).toBeGreaterThanOrEqual(31);
  expect(c.reviewedCategoryBudgetSha256).toMatch(/^[0-9a-f]{64}$/);
  expect(c.cycleSourceReservedUnits).toBe(3936);
  expect(c.cycleOtherReservedUnits).toBe(nDays*20);
  review={
   candidate:c,expectedSignedCategoryBudgetSha256:
     c.reviewedCategoryBudgetSha256,
   expectedStage22CoverageInputSha256:c.stage22CoverageInputSha256,
   expectedManifestSha256:c.manifestSha256,
   expectedCalendarSha256:c.calendarSha256,
   expectedConfigSha256:c.configSha256,
   expectedFrameSha256:c.frameSha256,
   expectedProviderRangeEvidenceSha256:c.reviewedProviderRangeEvidenceSha256,
   expectedRequestGridSha256:c.reviewed31DaySourceRequestGridSha256,
   expectedWriterRole:ROLE,
   independent31DaySourceAndSevenCategoryPlanApproved:true,
   independentCategoryBudgetReviewApproved:true,
   githubOnlyRestrictedOwnerApproved:true
  };
  await admin.query(
   "INSERT INTO clean.adb_phase6_authorization "+
   "(authorization_id,manifest_sha256,calendar_hash,config_hash,code_sha,"+
   "schema_version,phase6_start_date,alert_cap_per_parent_day,"+
   "unsettled_burst_margin_credits,protected_alert_floor,enabled,"+
   "predecessor_evidence_ids) "+
   "VALUES ('CI-V0082-SEVEN-CATEGORY',$1,$2,$3,$4,'v39',"+
   "'2027-01-04'::date,1900,10,1000,true,"+
   "'[\"synthetic-audit-only-no-provider\"]'::jsonb)",
   [c.manifestSha256,c.calendarSha256,c.configSha256,"f".repeat(40)]
  );
  for(const day of fake.coverageInput.calendar.days){
   await admin.query(
    "INSERT INTO clean.adb_phase6_calendar_day "+
    "(run_day_index,budget_day_id,calendar_hash,config_hash,date_utc,"+
    "utc_slot,time_class,window_shape,evaluation_partition,"+
    "crossover_group_id,crossover_period,pair_role,draw_type,"+
    "slot_regions,anchor_icao,pair_airport_set,frozen_draw_seed,"+
    "scheduled_start_utc,active_duration_minutes,frame_hash) "+
    "VALUES ($1,$2,$3,$4,$5::date,$6,'CI',$7,$8,$9,$10,$11,$12,"+
    "$13::jsonb,$14,$15::jsonb,$16,$17::timestamptz,$18,$19)",
    [day.runDayIndex,"P5-CI-CALENDAR-"+day.runDayIndex,
     c.calendarSha256,c.configSha256,day.startUtc.slice(0,10),
     day.utcSlot,day.windowShape,day.partition,day.pairId,
     day.crossoverPeriod,day.pairId?day.pairRole:null,day.drawType,
     JSON.stringify(day.targetRegions),day.airports.HUB,
     day.pairId?JSON.stringify(day.airports):null,
     "ci-v0082-seed-"+day.runDayIndex,
     day.startUtc,day.windowShape==="up-to-6h"?360:240,c.frameSha256]
   );
  }
  await admin.query(
   "INSERT INTO clean.phase5_fids_cycle_budget_v39 "+
   "(manifest_sha256,cycle_api_ceiling,other_category_reserved_units,"+
   "protected_api_floor_units) VALUES ($1,$2,$3,$4)",
   [c.manifestSha256,c.cycleApiCeiling,c.cycleOtherReservedUnits,
    c.protectedApiFloorUnits]
  );
  for(const row of c.days)await admin.query(
   "INSERT INTO clean.phase5_fids_utc_charge_budget_v39 "+
   "(manifest_sha256,charge_day_utc,daily_api_ceiling,"+
   "daily_other_reserved_units) VALUES ($1,$2::date,$3,$4)",
   [c.manifestSha256,row.chargeDayUtc,row.dailyApiCeiling,
    row.dailyOtherReservedUnits]
  );
  await admin.query(
   "CREATE ROLE "+ROLE+" LOGIN PASSWORD 'ci-only' NOSUPERUSER "+
   "NOCREATEROLE NOCREATEDB NOINHERIT"
  );
  await admin.query("GRANT USAGE ON SCHEMA clean TO "+ROLE);
  const selects=[
   "clean.adb_phase6_authorization",
   "clean.adb_phase6_calendar_day",
   "clean.phase5_fids_cycle_budget_v39",
   "clean.phase5_fids_utc_charge_budget_v39",
   "clean.phase5_fids_seven_rest_release_v39",
   "clean.phase5_fids_cycle_rest_category_cap_v39",
   "clean.phase5_fids_utc_rest_category_budget_v39",
   "clean.phase5_fids_allowed_query_v39"
  ];
  await admin.query("GRANT SELECT ON "+selects.join(",")+" TO "+ROLE);
  await admin.query(
   "GRANT INSERT ON clean.phase5_fids_seven_rest_release_v39,"+
   "clean.phase5_fids_cycle_rest_category_cap_v39,"+
   "clean.phase5_fids_utc_rest_category_budget_v39 TO "+ROLE
  );
  owner=new Pool({connectionString:RESTRICTED,max:1});
 });
 afterAll(async()=>{if(owner)await owner.end();if(admin)await admin.end();});
 async function state(){
  const r=(await admin.query(
   "SELECT "+
   "(SELECT COUNT(*)::int FROM clean.phase5_fids_seven_rest_release_v39) release,"+
   "(SELECT COUNT(*)::int FROM clean.phase5_fids_cycle_rest_category_cap_v39) caps,"+
   "(SELECT COUNT(*)::int FROM clean.phase5_fids_utc_rest_category_budget_v39) budget,"+
   "(SELECT COUNT(*)::int FROM clean.phase5_fids_allowed_query_v39) source,"+
   "(SELECT COUNT(*)::int FROM clean.phase5_fids_physical_attempt_v39) attempt"
  )).rows[0];
  return r;
 }
 it("31-day Stage22 math makes exact seven-category caps, non-FIDS and split units",()=>{
  const {candidate:c}=fake;
  expect(c.databaseWrites).toBe(0);
  expect(c.phase6PaidGo).toBe(false);
  expect(c.cycleSourceReservedUnits).toBe(3936);
  expect(c.cycleOtherReservedUnits).toBe(expectedOtherUnits);
  expect(c.days.some((d:any)=>d.fidsSplitUnits>0)).toBe(true);
  expect(c.days.every((d:any)=>d.categoryRows.length===7)).toBe(true);
  const mutation=structuredClone(fake.freezeInput);
  mutation.coverageInput.requests[0].scheduledGetUtc=
     "2027-01-01T00:00:00.000Z";
  expect(()=>createP5V0082SevenRestFreezeCandidate(mutation))
   .toThrow("RAW_31_DAY_COVERAGE_PACKET_UNREVIEWED_OR_MUTATED");
 });
 it("refuses ordinary admin role and altered expected signed category hash",async()=>{
  await expect(commitP5V0082FrozenSevenRestInput(admin,review))
   .rejects.toThrow("UNAUTHORIZED_PRODUCTION_BUDGET_FREEZE_OWNER_ROLE");
  await expect(commitP5V0082FrozenSevenRestInput(owner,{
   ...review,expectedSignedCategoryBudgetSha256:sha("0")
  })).rejects.toThrow("UNSIGNED_OR_TAMPERED_CANONICAL_SEVEN_CATEGORY_PLAN");
  expect(await state()).toEqual({
   release:0,caps:0,budget:0,source:0,attempt:0
  });
 });
 it("refuses unexpected existing-cycle UPDATE grant before freezing",async()=>{
  await admin.query(
   "GRANT UPDATE ON clean.phase5_fids_cycle_budget_v39 TO "+ROLE
  );
  try{
   await expect(commitP5V0082FrozenSevenRestInput(owner,review))
    .rejects.toThrow("ROLE_HAS_EXCESS_PRIVILEGES_OR_MISSING_FREEZE_INSERT_ACL");
   expect(await state()).toEqual({
    release:0,caps:0,budget:0,source:0,attempt:0
   });
  }finally{
   await admin.query(
    "REVOKE UPDATE ON clean.phase5_fids_cycle_budget_v39 FROM "+ROLE
   );
  }
 });
 it("rolls back whole release + seven caps after deliberate budget insert failure",async()=>{
  await admin.query(`CREATE FUNCTION clean.ci_v0082_day_freeze_bomb()
    RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.category='DIAGNOSTIC_UNIT_BUDGET'
      THEN RAISE EXCEPTION 'CI_EXPECTED_SEVENTH_CATEGORY_ATOMIC_FAILURE';
      END IF; RETURN NEW; END $$`);
  await admin.query(`CREATE TRIGGER ci_v0082_day_freeze_bomb_trigger
    BEFORE INSERT ON clean.phase5_fids_utc_rest_category_budget_v39
    FOR EACH ROW EXECUTE FUNCTION clean.ci_v0082_day_freeze_bomb()`);
  try{
   await expect(commitP5V0082FrozenSevenRestInput(owner,review))
    .rejects.toThrow("CI_EXPECTED_SEVENTH_CATEGORY_ATOMIC_FAILURE");
   expect(await state()).toEqual({
    release:0,caps:0,budget:0,source:0,attempt:0
   });
  }finally{
   await admin.query(
    "DROP TRIGGER ci_v0082_day_freeze_bomb_trigger ON "+
    "clean.phase5_fids_utc_rest_category_budget_v39"
   );
   await admin.query("DROP FUNCTION clean.ci_v0082_day_freeze_bomb()");
  }
 });
 it("freezes one real-source-shaped 31-day reviewed seven-category input atomically",async()=>{
  const result=await commitP5V0082FrozenSevenRestInput(owner,review);
  expect(result.status).toBe(
   "SEVEN_CATEGORY_REST_INPUT_FROZEN_NO_GET_OR_PHASE6_RELEASE");
  expect(result.categoryCapRows).toBe(7);
  expect(result.actualUtcChargeDays).toBe(nDays);
  expect(result.categoryChargeDayRows).toBe(nDays*7);
  expect(result.databaseInserts).toBe(8+nDays*7);
  expect(result.providerCalls).toBe(0);
  expect(result.physicalGetReservations).toBe(0);
  expect(result.phase6PaidGo).toBe(false);
  expect(await state()).toEqual({
   release:1,caps:7,budget:nDays*7,source:0,attempt:0
  });
  const totals=(await admin.query(
   "SELECT category,SUM(planned_units)::int units,"+
   "SUM(physically_reserved_units)::int reserved "+
   "FROM clean.phase5_fids_utc_rest_category_budget_v39 "+
   "GROUP BY category ORDER BY category"
  )).rows;
  expect(totals).toHaveLength(7);
  expect(totals.every((r:any)=>r.reserved===0)).toBe(true);
  expect(totals.filter((r:any)=>sourceCats.includes(r.category)).
   reduce((n:number,r:any)=>n+r.units,0)).toBe(expectedSourceUnits);
  expect(totals.filter((r:any)=>!sourceCats.includes(r.category)).
   reduce((n:number,r:any)=>n+r.units,0)).toBe(expectedOtherUnits);
 });
 it("refuses replay without changing immutable budgets or source",async()=>{
  await expect(commitP5V0082FrozenSevenRestInput(owner,review))
    .rejects.toThrow("FROZEN_V0082_REST_ROWS_ALREADY_EXIST_NO_REPLAY");
  expect(await state()).toEqual({
   release:1,caps:7,budget:nDays*7,source:0,attempt:0
  });
 });
});
