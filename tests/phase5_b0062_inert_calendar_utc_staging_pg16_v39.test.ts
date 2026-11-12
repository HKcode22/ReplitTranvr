/**
 * Disposable real PostgreSQL 16 ONLY. Synthetic future calendar/budgets.
 * DO NOT use fixture source, dates, airport selection or budget in production.
 * No provider keys, no paid GET, no production DB credential.
 */
import {createHash} from "node:crypto";
import {Pool} from "pg";
import {describe,it,expect,beforeAll,afterAll} from "vitest";
import {buildP5PrelaunchSlotBudgetEnvelope} from
 "../server/lib/disruption/phase5PrelaunchUnknownAirportSlotBudgetEnvelope_v39.mjs";
import {compileP5InertB0062UtcStagePacket,commitP5InertB0062UtcStageOnce} from
 "../server/lib/disruption/phase5B0062InertCalendarUtcBudgetStage_v39.mjs";

const URL="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
const ROLE="phase5_b0062_prelaunch_stage_ci20261112";
const RESTRICTED="postgresql://"+ROLE+":ci-only@localhost:5432/neondb?sslmode=disable";
const enabled=process.env.V39_P5_B0062_INERT_STAGE_PG16==="1";
const suite=enabled?describe:describe.skip;
const H=3600000,M=60000,D=86400000;
const digest=x=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const sha=c=>c.repeat(64);
const iso=n=>new Date(n).toISOString();
const SLOTS=[0,4,8,12,16,20];
const HUBS=["OMAA","WSSS","SKBO","YSSY"];
const SETS=[
 {HUB:"OMAA",MID_A:"OMSJ",MID_B:"SPJC",REGIONAL:"KDEC"},
 {HUB:"WSSS",MID_A:"SBFL",MID_B:"TJSJ",REGIONAL:"LSZB"},
 {HUB:"YSSY",MID_A:"KBUF",MID_B:"LFQQ",REGIONAL:"NZNP"},
 {HUB:"SKBO",MID_A:"EBAW",MID_B:"NZNS",REGIONAL:"RJNK"},
 {HUB:"SKBO",MID_A:"YBUD",MID_B:"RKTU",REGIONAL:"FAKM"}
];
const REGIONS:Record<string,string>={HUB:"FIXTURE_REGION",MID_A:"FIXTURE_MIDA",MID_B:"FIXTURE_MIDB",REGIONAL:"FIXTURE_REGIONAL"};
const PAIR_SITES=SETS.map(row=>Object.fromEntries(
 Object.entries(row).map(([slot,icao])=>[slot,{icao,region:REGIONS[slot]}])
));
const OTHER=[
 "FIDS_RETRY_UNIT_BUDGET","VALIDATION_UNIT_BUDGET",
 "OUTCOME_REST_UNIT_BUDGET","HISTORY_BOOTSTRAP_UNIT_BUDGET",
 "DIAGNOSTIC_UNIT_BUDGET"
];
function fixture(){
 // Synthetic 31 batch days spread weeks apart ONLY to exercise real DB.
 const base=Date.parse("2027-01-04T00:00:00.000Z");
 const calendarDays=Array.from({length:31},(_,i)=>{
  const n=i+1,pi=i<5?i:i>=6&&i<11?i-6:null;
  const period=pi===null?null:i<5?1:2;
  const role=pi===null?null:pi<3?
   period===1?"control":"alternative":
   period===1?"alternative":"control";
  const shape=role==="alternative"?
   pi<3?"2x2h":"up-to-6h":"4h";
  const start=base+i*7*D+SLOTS[i%6]*H;
  const pairSet=pi===null?null:PAIR_SITES[pi];
  const anchor=pairSet?.HUB?.icao??HUBS[i%4];
  return {
   runDayIndex:n,startUtc:iso(start),utcSlot:String(SLOTS[i%6]).padStart(2,"0"),
   windowShape:shape,partition:i<20?"train":i<25?"validation":"test",
   timeClass:String(SLOTS[i%6]).padStart(2,"0"),
   budgetDayId:"p5-ci-stage-parent-"+n,
   frozenDrawSeed:digest({fixtureDrawSeed:pi===null?"ordinary-"+i:"pair-"+pi}),
   anchorIcao:anchor,
   slotRegions:{...REGIONS},
   pairId:pi===null?null:"pair_00"+(pi+1),
   crossoverPeriod:period,pairRole:role,
   drawType:period===2?"PAIR_REPLAY":"NEW_TEMPLATE",
   pairAirportSet:pairSet
  };
 });
 const dates=new Set();
 for(const day of calendarDays){
  const s=Date.parse(day.startUtc);
  const seg=day.windowShape==="2x2h"?
   [[s,s+2*H],[s+3*H,s+5*H]]:
   [[s,s+(day.windowShape==="up-to-6h"?6:4)*H]];
  for(const [start,end] of seg)
   for(let part=start;part<end;part+=4*H)
    for(const offset of [24*H,6*H,90*M])
     for(let t=part-offset-120000;t<Math.min(part+4*H,end)-offset-120000;t+=120*M)
      dates.add(iso(t).slice(0,10));
 }
 const input:any={
  schema:"v39.phase5.b0062-inert-utc-stage-input.v1",
  manifestSha256:sha("a"),calendarSha256:sha("b"),
  configSha256:sha("c"),frameSha256:sha("d"),codeSha40:"f".repeat(40),
  phase6AuthorizationId:"CI-INERT-STAGING-20261112",
  phase6StartDateUtc:calendarDays[0].startUtc.slice(0,10),
  predecessorEvidenceIds:["CI-SYNTHETIC-NO-PROVIDER-NO-GO"],
  calendarDays,expectedSignedCalendarRowsSha256:digest(calendarDays),
  alertSafety:{
   unsettledBurstMarginCredits:10,protectedAlertFloorCredits:1000,
   alertRunSpendCeilingCredits:27000,dailySoftStopMarginCredits:10,
   productionReconcileToleranceCredits:0,
   startAdmissionToleranceSeconds:120,safetyWatchdogPollMs:10000,
   settlementInitialWaitSeconds:60,settlementPollIntervalSeconds:30,
   settlementStableReadCount:3,settlementTimeoutSeconds:300
  },
  slotBudgetInput:{
   schema:"v39.phase5.prelaunch-slot-budget-input.v1",
   manifestSha256:sha("a"),calendarSha256:sha("b"),
   configSha256:sha("c"),frameSha256:sha("d"),
   providerRangeEvidenceSha256:sha("e"),timingEvidenceSha256:sha("f"),
   asOfUtc:"2026-10-01T00:00:00.000Z",providerMaxRangeMinutes:240,
   refreshEveryMinutes:120,physicalGetsPerRefreshUpperBound:1,
   getLeadSeconds:120,apiUnitsPerPhysicalGet:2,
   cycleRestCeilingUnits:50000,protectedRestFloorUnits:1000,
   calendarDays:calendarDays.map(d=>({
    runDayIndex:d.runDayIndex,startUtc:d.startUtc,
    windowShape:d.windowShape,utcSlot:d.utcSlot,partition:d.partition
   })),
   restOtherByUtcDate:[...dates].sort().map(chargeDayUtc=>({
    chargeDayUtc,dailyRestCeilingUnits:1900,
    categories:Object.fromEntries(OTHER.map(k=>[k,0]))
   }))
  }
 };
 input.expectedSignedSlotEnvelopeSha256=
  buildP5PrelaunchSlotBudgetEnvelope(input.slotBudgetInput).prelaunchEnvelopeSha256;
 const review={
  expectedSignedStagePacketSha256:digest(input),
  expectedExactWriterRole:ROLE,
  independentCalendarTreatmentReviewApproved:true,
  independentProviderAccountAndRestBudgetReviewApproved:true,
  narrowPrelaunchOwnerApproved:true
 };
 return {input,review};
}
suite("P5 B0062 inert initial calendar+UTC budget real PG16",()=>{
 let admin,writer;
 const {input,review}=fixture();
 const packet=compileP5InertB0062UtcStagePacket(input,review);
 beforeAll(async()=>{
  if(process.env.GITHUB_ACTIONS!=="true"||!enabled||
     process.env.DATABASE_URL!==URL||process.env.AERODATABOX_API_KEY||
     process.env.V39_PHASE6_PROCESS_ARMED!=="0"||
     process.env.V39_PHASE6_OWNER_APPROVED!=="0")
   throw Error("REFUSED_INERT_STAGE_NONDISPOSABLE_PG16_TEST");
  admin=new Pool({connectionString:URL});
  await admin.query("CREATE ROLE "+ROLE+" LOGIN PASSWORD 'ci-only' "+
   "NOSUPERUSER NOCREATEROLE NOCREATEDB NOINHERIT");
  await admin.query("GRANT USAGE ON SCHEMA clean TO "+ROLE);
  await admin.query("GRANT SELECT ON "+[
   "clean.adb_phase6_calendar_day",
   "clean.adb_phase6_authorization",
   "clean.phase5_fids_cycle_budget_v39",
   "clean.phase5_fids_utc_charge_budget_v39",
   "clean.adb_sampling_draw",
   "clean.phase5_fids_day_budget_v39",
   "clean.phase5_fids_allowed_query_v39",
   "clean.phase5_fids_seven_rest_release_v39",
   "clean.phase5_fids_cycle_rest_category_cap_v39",
   "clean.phase5_fids_utc_rest_category_budget_v39"
  ].join(",")+" TO "+ROLE);
  await admin.query("GRANT INSERT ON "+
   ["clean.adb_phase6_calendar_day",
    "clean.adb_phase6_authorization",
    "clean.phase5_fids_cycle_budget_v39",
    "clean.phase5_fids_utc_charge_budget_v39"].join(",")+
    " TO "+ROLE);
  writer=new Pool({connectionString:RESTRICTED});
 });
 afterAll(async()=>{
  if(writer)await writer.end();
  if(admin)await admin.end();
 });
 async function counts(){
  const r=(await admin.query(
   "SELECT "+
   "(SELECT COUNT(*)::int FROM clean.adb_phase6_calendar_day) calendar,"+
   "(SELECT COUNT(*)::int FROM clean.adb_phase6_authorization) auth,"+
   "(SELECT COUNT(*)::int FROM clean.phase5_fids_cycle_budget_v39) cycle,"+
   "(SELECT COUNT(*)::int FROM clean.phase5_fids_utc_charge_budget_v39) utc,"+
   "(SELECT COUNT(*)::int FROM clean.phase5_fids_day_budget_v39) perday,"+
   "(SELECT COUNT(*)::int FROM clean.phase5_fids_seven_rest_release_v39) v82,"+
   "(SELECT COUNT(*)::int FROM clean.phase5_fids_allowed_query_v39) query"
  )).rows[0];
  return r;
 }
 it("has 21 unknown ordinary flights and real typed inert seven-category envelope",async()=>{
  expect(packet.knownPairedAirportDays).toBe(10);
  expect(packet.unknownOrdinaryAirportDays).toBe(21);
  expect(packet.budget.utcCategoryRows.length).toBeGreaterThanOrEqual(31);
  expect(packet.v0082CategoryBudgetFreezeCreated).toBe(false);
  expect(packet.providerCalls).toBe(0);
  expect(packet.phase6PaidGo).toBe(false);
  expect(await counts()).toEqual({
   calendar:0,auth:0,cycle:0,utc:0,perday:0,v82:0,query:0
  });
 });
 it("refuses tampered signed calendar, invented ordinary airport, UTC cap and role",async()=>{
  const bad=structuredClone(input);
  bad.calendarDays[11].pairAirportSet=PAIR_SITES[0];
  const reviewBad={...review,expectedSignedStagePacketSha256:digest(bad)};
  bad.expectedSignedCalendarRowsSha256=digest(bad.calendarDays);
  reviewBad.expectedSignedStagePacketSha256=digest(bad);
  expect(()=>compileP5InertB0062UtcStagePacket(bad,reviewBad))
   .toThrow("ORDINARY_DAY_FUTURE_AIRPORTS_NOT_PROSPECTIVE");
  const badPairRegion=structuredClone(input);
  badPairRegion.calendarDays[0].pairAirportSet.MID_A.region="UNRELATED_REGION";
  badPairRegion.expectedSignedCalendarRowsSha256=digest(badPairRegion.calendarDays);
  expect(()=>compileP5InertB0062UtcStagePacket(badPairRegion,{
   ...review,expectedSignedStagePacketSha256:digest(badPairRegion)
  })).toThrow("MISSING_FOUR_REGION_BOUND_PAIRED_AIRPORTS");
  // The actual pair sites, not an accidentally shared per-day seed string,
  // are what must replay. Keep explicit per-day seed and UTC class flexibility.
  const benign=structuredClone(input);
  benign.calendarDays[6].frozenDrawSeed=sha("9");
  benign.calendarDays[6].timeClass="00:00";
  benign.expectedSignedCalendarRowsSha256=digest(benign.calendarDays);
  expect(()=>compileP5InertB0062UtcStagePacket(benign,{
   ...review,expectedSignedStagePacketSha256:digest(benign)
  })).not.toThrow();
  const noBudget=structuredClone(input);
  noBudget.slotBudgetInput.restOtherByUtcDate.pop();
  expect(()=>compileP5InertB0062UtcStagePacket(noBudget,{
   ...review,expectedSignedStagePacketSha256:digest(noBudget)
  })).toThrow("SOURCE_AND_OTHER_UTC_CHARGE_DATES_NOT_EXACT");
  const wrongRole={...review,expectedExactWriterRole:"postgres"};
  expect(()=>compileP5InertB0062UtcStagePacket(input,wrongRole))
   .toThrow("MISSING_VERIFIED_INDEPENDENT_PRELAUNCH_REVIEW");
  await expect(commitP5InertB0062UtcStageOnce(admin,input,review))
   .rejects.toThrow("WRONG_DATABASE_OR_NONDEDICATED_DB_SESSION");
  expect(await counts()).toEqual({
   calendar:0,auth:0,cycle:0,utc:0,perday:0,v82:0,query:0
  });
 });
 it("rolls back all rows when final UTC charge-day insert fails",async()=>{
  const day=input.slotBudgetInput.restOtherByUtcDate.at(-1).chargeDayUtc;
  await admin.query("CREATE FUNCTION clean.ci_inert_utc_failure() "+
   "RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN "+
   "IF NEW.charge_day_utc='"+day+"'::date THEN "+
   "RAISE EXCEPTION 'CI_EXPECTED_LAST_CHARGE_DAY_FAILURE';"+
   "END IF; RETURN NEW; END $$");
  await admin.query("CREATE TRIGGER ci_inert_utc_fail "+
   "BEFORE INSERT ON clean.phase5_fids_utc_charge_budget_v39 "+
   "FOR EACH ROW EXECUTE FUNCTION clean.ci_inert_utc_failure()");
  try{
   await expect(commitP5InertB0062UtcStageOnce(writer,input,review))
    .rejects.toThrow("CI_EXPECTED_LAST_CHARGE_DAY_FAILURE");
   expect(await counts()).toEqual({
    calendar:0,auth:0,cycle:0,utc:0,perday:0,v82:0,query:0
   });
  }finally{
   await admin.query("DROP TRIGGER ci_inert_utc_fail ON "+
    "clean.phase5_fids_utc_charge_budget_v39");
   await admin.query("DROP FUNCTION clean.ci_inert_utc_failure()");
  }
 });
 it("stages calendar, disabled authorization and physical UTC budgets only",async()=>{
  const out=await commitP5InertB0062UtcStageOnce(writer,input,review);
  expect(out.status).toBe(
   "INERT_31_DAY_CALENDAR_DISABLED_AUTH_AND_UTC_REST_STAGED_NO_GO");
  expect(out.calendarRows).toBe(31);
  expect(out.v0079PhysicalUtcChargeBudgetRows)
   .toBe(input.slotBudgetInput.restOtherByUtcDate.length);
  expect(out.v0079PerDrawDayBudgetRows).toBe(0);
  expect(out.sourceQueries).toBe(0);
  expect(out.providerCalls).toBe(0);
  expect(out.phase6PaidGo).toBe(false);
  expect(await counts()).toEqual({
   calendar:31,auth:1,cycle:1,
   utc:out.v0079PhysicalUtcChargeBudgetRows,perday:0,v82:0,query:0
  });
  const a=(await admin.query(
   "SELECT enabled,revoked_at_utc,manifest_sha256 "+
   "FROM clean.adb_phase6_authorization WHERE singleton_key=true"
  )).rows[0];
  expect(a).toMatchObject({
   enabled:false,revoked_at_utc:null,manifest_sha256:input.manifestSha256
  });
  const ordinary=(await admin.query(
   "SELECT COUNT(*)::int AS n FROM clean.adb_phase6_calendar_day "+
   "WHERE crossover_group_id IS NULL AND pair_airport_set IS NULL"
  )).rows[0].n;
  expect(ordinary).toBe(21);
 });
 it("refuses replay; no unapproved overwrite or additional paid activity",async()=>{
  await expect(commitP5InertB0062UtcStageOnce(writer,input,review))
   .rejects.toThrow("NOT_AN_EMPTY_PHASE6_COLD_START_NEVER_OVERWRITE_OR_RETRY");
  expect((await counts()).auth).toBe(1);
  expect((await counts()).v82).toBe(0);
 });
});
