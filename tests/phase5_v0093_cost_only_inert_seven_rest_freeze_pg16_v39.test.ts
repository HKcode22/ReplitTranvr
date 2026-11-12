/**
 * V0093 real disposable PG16 B0062 stage then COST_UPPER_BOUND seven-category freeze. Synthetic future calendar/budgets.
 * DO NOT use fixture source, dates, airport selection or budget in production.
 * No provider keys, no paid GET, no production DB credential.
 */
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {URL as NodeFileURL} from "node:url";
import {Pool} from "pg";
import {describe,it,expect,beforeAll,afterAll} from "vitest";
import {buildP5PrelaunchSlotBudgetEnvelope} from
 "../server/lib/disruption/phase5PrelaunchUnknownAirportSlotBudgetEnvelope_v39.mjs";
import {compileP5InertB0062UtcStagePacket,commitP5InertB0062UtcStageOnce} from
 "../server/lib/disruption/phase5B0062InertCalendarUtcBudgetStage_v39.mjs";
import {buildP5V0082UnknownAirportSevenCostOnlyDraft} from
 "../server/lib/disruption/phase5V0082UnknownAirportSevenCostOnlyDraft_v39.mjs";
import {
 compileP5V0093CostOnlySevenRestReview,commitP5V0093CostOnlySevenRestOnce
} from "../server/lib/disruption/phase5V0093CostOnlySevenRestFreezeWriter_v39.mjs";

const URL="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
const ROLE="phase5_b0062_prelaunch_stage_ci20261112";
const RESTRICTED="postgresql://"+ROLE+":ci-only@localhost:5432/neondb?sslmode=disable";
const BUDGET_ROLE="phase5_fids_budget_freeze_ci_20261112";
const BUDGET_URL="postgresql://"+BUDGET_ROLE+
 ":ci-only@localhost:5432/neondb?sslmode=disable";
const enabled=process.env.V39_P5_V0093_FREEZE_PG16==="1";
const suite=enabled?describe:describe.skip;
const H=3600000,M=60000,D=86400000;
const digest=x=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const sha=c=>c.repeat(64);
const iso=n=>new Date(n).toISOString();
const SLOTS=[0,4,8,12,16,20];
const HUBS=["OMAA","WSSS","SKBO","YSSY"];
const HUB_REGION:Record<string,string>={
 OMAA:"Gulf/Africa",WSSS:"Asia-Pacific",
 SKBO:"South America",YSSY:"Oceania"
};
// This is the archived actual owner's 2026-11-09 B0062 candidate, not mock
// airport IDs. Dates, treatment, budgets and approval remain synthetic.
const archived=JSON.parse(readFileSync(new NodeFileURL(
 "../data-collection/phase5/evidence/2026-11-09_five_full_frame_pairs_post_selection_kteb_to_kbuf_readonly.json",
 import.meta.url),"utf8"));
if(archived.schema!=="phase5.full-b0062-five-pair-selection-review.v1"||
   archived.selectedAirportIcaosSha256!==
    "f5112a9ca432d9d3fede96a9805030d68e05ced5a19d029aa896805746c21592"||
   archived.candidatePairAirportSets?.length!==5)
 throw Error("REFUSED_PG16_REAL_PAIR_EVIDENCE_DRIFT");
const PAIR_SITES=archived.candidatePairAirportSets.map(
 (pair:any)=>Object.fromEntries(Object.entries(pair.airports).map(
  ([slot,v]:[string,any])=>[slot,{icao:v.icao,region:v.region}]))
);
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
   slotRegions:pairSet?
    Object.fromEntries(Object.entries(pairSet).map(
     ([slot,v]:[string,any])=>[slot,v.region])):
    {HUB:HUB_REGION[anchor],MID_A:"Europe",
     MID_B:"North America",REGIONAL:"Oceania"},
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
suite("P5 V0093 B0062 + typed COST_ONLY pre-GO freeze real disposable PG16",()=>{
 let admin,writer,budgetWriter;
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
  await admin.query("CREATE ROLE "+BUDGET_ROLE+" LOGIN PASSWORD 'ci-only' "+
   "NOSUPERUSER NOCREATEROLE NOCREATEDB NOINHERIT");
  await admin.query("GRANT USAGE ON SCHEMA clean TO "+BUDGET_ROLE);
  await admin.query("GRANT SELECT ON "+[
   "clean.adb_phase6_authorization","clean.adb_phase6_calendar_day",
   "clean.phase5_fids_cycle_budget_v39",
   "clean.phase5_fids_utc_charge_budget_v39",
   "clean.phase5_fids_allowed_query_v39",
   "clean.phase5_fids_seven_rest_release_v39",
   "clean.phase5_fids_cycle_rest_category_cap_v39",
   "clean.phase5_fids_utc_rest_category_budget_v39"
  ].join(",")+" TO "+BUDGET_ROLE);
  await admin.query("GRANT INSERT ON "+[
   "clean.phase5_fids_seven_rest_release_v39",
   "clean.phase5_fids_cycle_rest_category_cap_v39",
   "clean.phase5_fids_utc_rest_category_budget_v39"
  ].join(",")+" TO "+BUDGET_ROLE);
  budgetWriter=new Pool({connectionString:BUDGET_URL,max:1});
 });
 afterAll(async()=>{
  if(budgetWriter)await budgetWriter.end();
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
  const badHubRegion=structuredClone(input);
  badHubRegion.calendarDays[11].slotRegions.HUB="Europe";
  badHubRegion.expectedSignedCalendarRowsSha256=digest(badHubRegion.calendarDays);
  expect(()=>compileP5InertB0062UtcStagePacket(badHubRegion,{
   ...review,expectedSignedStagePacketSha256:digest(badHubRegion)
  })).toThrow("INVALID_FUTURE_B0062_CALENDAR_DAY");
  const badUnknownRegion=structuredClone(input);
  badUnknownRegion.calendarDays[11].slotRegions.REGIONAL="FAKE_REGION";
  badUnknownRegion.expectedSignedCalendarRowsSha256=digest(
   badUnknownRegion.calendarDays);
  expect(()=>compileP5InertB0062UtcStagePacket(badUnknownRegion,{
   ...review,expectedSignedStagePacketSha256:digest(badUnknownRegion)
  })).toThrow("INVALID_FUTURE_B0062_CALENDAR_DAY");
  // Day 6 is ordinary: its selected HUB is KNOWN prelaunch even though
  // its remaining three airports are unknown. Pair 5 has an up-to-6h
  // treatment; the next day at 20:00 is 22h after that exposure ends,
  // within the 24h washout, despite the parent windows not overlapping.
  const badAnchorWashout=structuredClone(input);
  badAnchorWashout.calendarDays[5].anchorIcao="SKBO";
  badAnchorWashout.calendarDays[5].slotRegions.HUB="South America";
  badAnchorWashout.calendarDays[5].startUtc=iso(
   Date.parse(badAnchorWashout.calendarDays[4].startUtc)+28*H);
  badAnchorWashout.expectedSignedCalendarRowsSha256=digest(
   badAnchorWashout.calendarDays);
  expect(()=>compileP5InertB0062UtcStagePacket(badAnchorWashout,{
   ...review,expectedSignedStagePacketSha256:digest(badAnchorWashout)
  })).toThrow("PRESELECTED_HUB_ANCHOR_24H_WASHOUT");
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
  // Both crossover periods must retain the same time-class convention.
  benign.calendarDays[0].timeClass="00:00";
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
 function budgetReview(){
  const staged=compileP5InertB0062UtcStagePacket(input,review);
  const c=buildP5V0082UnknownAirportSevenCostOnlyDraft({
   schema:"v39.phase5.v0082-cost-only-from-slot-input.v1",
   slotBudgetInput:input.slotBudgetInput,
   expectedReviewerSlotEnvelopeSha256:staged.sourceSlotBudgetSha256
  });
  return {staged,c,permit:{
   expectedStagedB0062PacketSha256:staged.stagePacketSha256,
   expectedSignedSevenCategoryCostSha256:c.costOnlyCategoryDraftSha256,
   expectedExactBudgetWriterRole:BUDGET_ROLE,
   independentProspectiveCalendarAndTreatmentApproved:true,
   independentRealProviderRangeAndRestBudgetApproved:true,
   independentSourceContentsRightsForIntendedUseApproved:true,
   exactRestrictedNoProviderBudgetFreezeApproved:true
  }};
 }
 async function categoryCounts(){
  return (await admin.query("SELECT "+
   "(SELECT COUNT(*)::int FROM clean.phase5_fids_seven_rest_release_v39) release,"+
   "(SELECT COUNT(*)::int FROM clean.phase5_fids_cycle_rest_category_cap_v39) caps,"+
   "(SELECT COUNT(*)::int FROM clean.phase5_fids_utc_rest_category_budget_v39) days,"+
   "(SELECT COUNT(*)::int FROM clean.phase5_fids_allowed_query_v39) source,"+
   "(SELECT COUNT(*)::int FROM clean.phase5_fids_physical_attempt_v39) attempt"
  )).rows[0];
 }
 it("refuses unauthenticated signed cost SHA, administrator and excess UPDATE grant",async()=>{
  const r=budgetReview();
  expect(r.c.unsignedFutureOrdinaryAirports).toBe(21);
  const pr=compileP5V0093CostOnlySevenRestReview(input,review,r.permit);
  expect(pr.cost.costOnlyCategoryDraftSha256).toBe(r.c.costOnlyCategoryDraftSha256);
  expect(pr.cost.sourceRequestGridSha256).toBeNull();
  expect(pr.phase6PaidGo).toBe(false);
  expect(()=>compileP5V0093CostOnlySevenRestReview(input,review,{
   ...r.permit,expectedSignedSevenCategoryCostSha256:sha("0")
  })).toThrow("MISSING_DISTINCT_AUTHENTIC_COST_ONLY_REVIEW");
  await expect(commitP5V0093CostOnlySevenRestOnce(
   admin,input,review,r.permit
  )).rejects.toThrow("UNCOMMISSIONED_COST_ONLY_BUDGET_WRITER_IDENTITY");
  await admin.query("GRANT UPDATE ON clean.phase5_fids_cycle_budget_v39 TO "+
   BUDGET_ROLE);
  try{
   await expect(commitP5V0093CostOnlySevenRestOnce(
    budgetWriter,input,review,r.permit
   )).rejects.toThrow("NARROW_BUDGET_WRITER_HAS_EXCESS_OR_MISSING_ACL");
  }finally{
   await admin.query("REVOKE UPDATE ON clean.phase5_fids_cycle_budget_v39 "+
    "FROM "+BUDGET_ROLE);
  }
  expect(await categoryCounts()).toEqual({
   release:0,caps:0,days:0,source:0,attempt:0
  });
 });
 it("rolls back ALL V0093 category/release rows after final UTC insert failure",async()=>{
  const r=budgetReview();
  const last=r.c.days.at(-1).chargeDayUtc;
  await admin.query("CREATE FUNCTION clean.ci_v0093_cost_last_failure() "+
   "RETURNS trigger LANGUAGE plpgsql AS $ BEGIN "+
   "IF NEW.charge_day_utc='"+last+"'::date THEN "+
   "RAISE EXCEPTION 'CI_EXPECTED_V0093_LAST_UTC_BUDGET_ROLLBACK';"+
   "END IF; RETURN NEW; END $");
  await admin.query("CREATE TRIGGER ci_v0093_last_utc_fail "+
   "BEFORE INSERT ON clean.phase5_fids_utc_rest_category_budget_v39 "+
   "FOR EACH ROW EXECUTE FUNCTION clean.ci_v0093_cost_last_failure()");
  try{
   await expect(commitP5V0093CostOnlySevenRestOnce(
    budgetWriter,input,review,r.permit
   )).rejects.toThrow("CI_EXPECTED_V0093_LAST_UTC_BUDGET_ROLLBACK");
   expect(await categoryCounts()).toEqual({
    release:0,caps:0,days:0,source:0,attempt:0
   });
  }finally{
   await admin.query("DROP TRIGGER ci_v0093_last_utc_fail ON "+
    "clean.phase5_fids_utc_rest_category_budget_v39");
   await admin.query("DROP FUNCTION clean.ci_v0093_cost_last_failure()");
  }
 });
 it("commits typed V0093 COST_UPPER_BOUND seven REST rows only, with zero source",async()=>{
  const r=budgetReview();
  const out=await commitP5V0093CostOnlySevenRestOnce(
   budgetWriter,input,review,r.permit
  );
  expect(out.status).toBe(
   "COST_UPPER_BOUND_SEVEN_REST_CEILINGS_FROZEN_NO_GET_OR_PAID_GO");
  expect(out.categoryCapRows).toBe(7);
  expect(out.physicalUtcChargeDays).toBe(r.c.days.length);
  expect(out.categoryChargeDayRows).toBe(7*r.c.days.length);
  expect(out.unknownOrdinaryAirportDays).toBe(21);
  expect(out.actualFidsQueryRowsCreated).toBe(0);
  expect(out.providerCalls).toBe(0);
  expect(out.physicalReservations).toBe(0);
  expect(out.phase6PaidGo).toBe(false);
  expect(await categoryCounts()).toEqual({
   release:1,caps:7,days:7*r.c.days.length,source:0,attempt:0
  });
  const release=(await admin.query(
   "SELECT budget_release_mode,reviewed_source_request_grid_sha256,"+
   "reviewed_cost_envelope_sha256,reviewed_category_budget_sha256 "+
   "FROM clean.phase5_fids_seven_rest_release_v39"
  )).rows[0];
  expect(release).toMatchObject({
   budget_release_mode:"COST_UPPER_BOUND",
   reviewed_source_request_grid_sha256:null,
   reviewed_cost_envelope_sha256:r.c.costOnlyCategoryDraftSha256,
   reviewed_category_budget_sha256:r.c.costOnlyCategoryDraftSha256
  });
  expect((await admin.query(
   "SELECT COUNT(*)::int n FROM clean.adb_phase6_authorization WHERE enabled"
  )).rows[0].n).toBe(0);
 });
 it("rejects replay, and cannot alter signed release or reserve source",async()=>{
  const r=budgetReview();
  await expect(commitP5V0093CostOnlySevenRestOnce(
   budgetWriter,input,review,r.permit
  )).rejects.toThrow("V0082_COST_FREEZE_NOT_VIRGIN_NO_REPLAY");
  await expect(admin.query(
   "UPDATE clean.phase5_fids_seven_rest_release_v39 "+
   "SET reviewed_cost_envelope_sha256=$1",[sha("9")]
  )).rejects.toThrow("P5_V0082_FROZEN_SEVEN_REST_MANIFEST_IMMUTABLE");
  expect(await categoryCounts()).toEqual({
   release:1,caps:7,days:7*r.c.days.length,source:0,attempt:0
  });
 });
 it("refuses replay; no unapproved overwrite or additional paid activity",async()=>{
  await expect(commitP5InertB0062UtcStageOnce(writer,input,review))
   .rejects.toThrow("NOT_AN_EMPTY_PHASE6_COLD_START_NEVER_OVERWRITE_OR_RETRY");
  expect((await counts()).auth).toBe(1);
  expect((await counts()).v82).toBe(1);
 });
});
