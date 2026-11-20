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
import {commitP5V0093CostOnlySevenRestOnce} from
 "../server/lib/disruption/phase5V0093CostOnlySevenRestFreezeWriter_v39.mjs";
import {
 compileP6ProspectiveDisabledStageRevisionV39,
 commitP6ProspectiveDisabledStageRevisionOnceV39,
 verifyP6ProspectiveDisabledStageRevisionReadOnlyV39,
} from "../server/lib/disruption/phase6ProspectiveDisabledStageRevision_v39";

const URL="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
const ROLE="phase5_b0062_prelaunch_stage_ci20261120";
const RESTRICTED="postgresql://"+ROLE+":ci-only@localhost:5432/neondb?sslmode=disable";
const BUDGET_ROLE="phase5_fids_budget_freeze_ci_20261120";
const BUDGET_URL="postgresql://"+BUDGET_ROLE+":ci-only@localhost:5432/neondb?sslmode=disable";
const H=3600000,M=60000,D=86400000;
const digest=(x:unknown)=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const rawDigest=(x:string)=>createHash("sha256").update(x,"utf8").digest("hex");
const sha=(c:string)=>c.repeat(64);
const iso=(n:number)=>new Date(n).toISOString();
const SLOTS=[0,4,8,12,16,20];
const HUBS=["OMAA","WSSS","SKBO","YSSY"];
const HUB_REGION:Record<string,string>={
 OMAA:"Gulf/Africa",WSSS:"Asia-Pacific",SKBO:"South America",YSSY:"Oceania"
};
const archived=JSON.parse(readFileSync(new NodeFileURL(
 "../data-collection/phase5/evidence/2026-11-09_five_full_frame_pairs_post_selection_kteb_to_kbuf_readonly.json",
 import.meta.url),"utf8"));
const PAIR_SITES=archived.candidatePairAirportSets.map((pair:any)=>
 Object.fromEntries(Object.entries(pair.airports).map(
  ([slot,v]:[string,any])=>[slot,{icao:v.icao,region:v.region}])));
const OTHER=[
 "FIDS_RETRY_UNIT_BUDGET","VALIDATION_UNIT_BUDGET",
 "OUTCOME_REST_UNIT_BUDGET","HISTORY_BOOTSTRAP_UNIT_BUDGET",
 "DIAGNOSTIC_UNIT_BUDGET"
];

function sourceDates(calendarDays:any[]){
 const dates=new Set<string>();
 for(const day of calendarDays){
  const s=Date.parse(day.startUtc);
  const seg=day.windowShape==="2x2h"?[[s,s+2*H],[s+3*H,s+5*H]]:
   [[s,s+(day.windowShape==="up-to-6h"?6:4)*H]];
  for(const [start,end] of seg)
   for(let part=start;part<end;part+=4*H)
    for(const offset of [24*H,6*H,90*M])
     for(let t=part-offset-120000;t<Math.min(part+4*H,end)-offset-120000;t+=120*M)
      dates.add(iso(t).slice(0,10));
 }
 return [...dates].sort();
}
function makeInput(codeSha="f".repeat(40)){
 const base=Date.parse("2027-01-04T00:00:00.000Z");
 const calendarDays=Array.from({length:31},(_,i)=>{
  const n=i+1,pi=i<5?i:i>=6&&i<11?i-6:null;
  const period=pi===null?null:i<5?1:2;
  const role=pi===null?null:pi<3?(period===1?"control":"alternative"):
   (period===1?"alternative":"control");
  const shape=role==="alternative"?(pi<3?"2x2h":"up-to-6h"):"4h";
  const start=base+i*7*D+SLOTS[i%6]*H;
  const pairSet=pi===null?null:PAIR_SITES[pi];
  const anchor=pairSet?.HUB?.icao??HUBS[i%4];
  return {runDayIndex:n,startUtc:iso(start),utcSlot:String(SLOTS[i%6]).padStart(2,"0"),
   windowShape:shape,partition:i<20?"train":i<25?"validation":"test",
   timeClass:String(SLOTS[i%6]).padStart(2,"0"),budgetDayId:"p6-revision-ci-"+n,
   frozenDrawSeed:digest({seed:pi===null?"ordinary-"+i:"pair-"+pi}),anchorIcao:anchor,
   slotRegions:pairSet?Object.fromEntries(Object.entries(pairSet).map(
    ([slot,v]:[string,any])=>[slot,v.region])):
    {HUB:HUB_REGION[anchor],MID_A:"Europe",MID_B:"North America",REGIONAL:"Oceania"},
   pairId:pi===null?null:"pair_00"+(pi+1),crossoverPeriod:period,pairRole:role,
   drawType:period===2?"PAIR_REPLAY":"NEW_TEMPLATE",pairAirportSet:pairSet};
 });
 const calendarSha=digest(calendarDays),configSha=sha("c"),frameSha=sha("d");
 const placeholderManifest={schema:"v39.phase6.prospective-calendar-ci-original.v1",
  scientificFreezeApproved:true,sourceRightsApproved:false,
  sourceUseDeferredToPhase6Activation:true,phase6PaidGo:false,
  calendarRowsSha256:calendarSha,configSha256:configSha};
 const manifestSha=digest(placeholderManifest);
 const input:any={schema:"v39.phase5.b0062-inert-utc-stage-input.v1",
  manifestSha256:manifestSha,calendarSha256:calendarSha,configSha256:configSha,
  frameSha256:frameSha,codeSha40:codeSha,
  phase6AuthorizationId:"AUTH-20261120-CIPROSPECTIVEREVISION",
  phase6StartDateUtc:calendarDays[0].startUtc.slice(0,10),
  predecessorEvidenceIds:["CI-ORIGINAL-FROZEN-NO-GO"],
  calendarDays,expectedSignedCalendarRowsSha256:digest(calendarDays),
  alertSafety:{unsettledBurstMarginCredits:10,protectedAlertFloorCredits:1000,
   alertRunSpendCeilingCredits:27000,dailySoftStopMarginCredits:10,
   productionReconcileToleranceCredits:0,startAdmissionToleranceSeconds:120,
   safetyWatchdogPollMs:10000,settlementInitialWaitSeconds:60,
   settlementPollIntervalSeconds:30,settlementStableReadCount:3,settlementTimeoutSeconds:300},
  slotBudgetInput:{schema:"v39.phase5.prelaunch-slot-budget-input.v1",
   manifestSha256:manifestSha,calendarSha256:calendarSha,configSha256:configSha,
   frameSha256:frameSha,providerRangeEvidenceSha256:sha("e"),timingEvidenceSha256:sha("f"),
   asOfUtc:"2026-10-01T00:00:00.000Z",providerMaxRangeMinutes:240,
   refreshEveryMinutes:120,physicalGetsPerRefreshUpperBound:1,getLeadSeconds:120,
   apiUnitsPerPhysicalGet:2,cycleRestCeilingUnits:50000,protectedRestFloorUnits:1000,
   calendarDays:calendarDays.map(d=>({runDayIndex:d.runDayIndex,startUtc:d.startUtc,
    windowShape:d.windowShape,utcSlot:d.utcSlot,partition:d.partition})),
   restOtherByUtcDate:sourceDates(calendarDays).map(chargeDayUtc=>({
    chargeDayUtc,dailyRestCeilingUnits:1900,categories:Object.fromEntries(OTHER.map(k=>[k,0]))
   }))
  }
 };
 input.expectedSignedSlotEnvelopeSha256=
  buildP5PrelaunchSlotBudgetEnvelope(input.slotBudgetInput).prelaunchEnvelopeSha256;
 return input;
}
function stageReview(input:any){
 return {expectedSignedStagePacketSha256:digest(input),expectedExactWriterRole:ROLE,
  independentCalendarTreatmentReviewApproved:true as const,
  independentProviderAccountAndRestBudgetReviewApproved:true as const,
  narrowPrelaunchOwnerApproved:true as const};
}
function budgetReview(input:any,review:any){
 const staged=compileP5InertB0062UtcStagePacket(input,review);
 const cost=buildP5V0082UnknownAirportSevenCostOnlyDraft({
  schema:"v39.phase5.v0082-cost-only-from-slot-input.v1",
  slotBudgetInput:input.slotBudgetInput,
  expectedReviewerSlotEnvelopeSha256:staged.sourceSlotBudgetSha256
 });
 return {cost,permit:{expectedStagedB0062PacketSha256:staged.stagePacketSha256,
  expectedSignedSevenCategoryCostSha256:cost.costOnlyCategoryDraftSha256,
  expectedExactBudgetWriterRole:BUDGET_ROLE,
  independentProspectiveCalendarAndTreatmentApproved:true as const,
  independentRealProviderRangeAndRestBudgetApproved:true as const,
  independentSourceContentsRightsForIntendedUseApproved:false as const,
  sourceUseDeferredToPhase6Activation:true as const,
  exactRestrictedNoProviderBudgetFreezeApproved:true as const}};
}
function revise(old:any){
 const input=structuredClone(old);
 input.codeSha40="e".repeat(40);
 input.calendarDays[0].startUtc=iso(Date.parse(input.calendarDays[0].startUtc)+24*H);
 input.phase6StartDateUtc=input.calendarDays[0].startUtc.slice(0,10);
 input.calendarSha256=digest(input.calendarDays);
 input.configSha256=sha("9");
 input.slotBudgetInput.calendarDays[0].startUtc=input.calendarDays[0].startUtc;
 input.slotBudgetInput.calendarSha256=input.calendarSha256;
 input.slotBudgetInput.configSha256=input.configSha256;
 input.slotBudgetInput.restOtherByUtcDate=sourceDates(input.calendarDays).map(chargeDayUtc=>({
  chargeDayUtc,dailyRestCeilingUnits:1900,categories:Object.fromEntries(OTHER.map(k=>[k,0]))
 }));
 const preliminary={schema:"v39.phase6.prospective-calendar-revision-ci.v1",
  scientificFreezeApproved:true,originalFrozenPacketPreserved:true,
  originalFrozenManifestSha256:old.manifestSha256,sourceRightsApproved:false,
  sourceUseDeferredToPhase6Activation:true,phase6PaidGo:false,
  calendarRowsSha256:input.calendarSha256,configSha256:input.configSha256};
 input.manifestSha256=digest(preliminary);
 input.slotBudgetInput.manifestSha256=input.manifestSha256;
 input.expectedSignedCalendarRowsSha256=digest(input.calendarDays);
 input.expectedSignedSlotEnvelopeSha256=
  buildP5PrelaunchSlotBudgetEnvelope(input.slotBudgetInput).prelaunchEnvelopeSha256;
 const manifest={...preliminary};
 const raw=JSON.stringify(manifest);
 expect(rawDigest(raw)).toBe(input.manifestSha256);
 return {input,raw};
}

describe("Phase6 disabled prospective stage revision real disposable PG16",()=>{
 const old=makeInput(),oldReview=stageReview(old),oldBudget=budgetReview(old,oldReview);
 const next=revise(old),nextReview=stageReview(next.input),nextBudget=budgetReview(next.input,nextReview);
 const review={schema:"v39.phase6.prospective-disabled-stage-revision-review.v1" as const,
  expectedOldStageInputSha256:digest(old),
  expectedOldCostEnvelopeSha256:oldBudget.cost.costOnlyCategoryDraftSha256,
  expectedNewStageInputSha256:digest(next.input),
  expectedNewCostEnvelopeSha256:nextBudget.cost.costOnlyCategoryDraftSha256,
  expectedOriginalFrozenManifestSha256:old.manifestSha256,
  expectedNewManifestSha256:next.input.manifestSha256,
  expectedPriorCodeSha40:old.codeSha40,expectedCurrentCodeSha40:next.input.codeSha40,
  reviewedCalendarRevisionEvidenceSha256:sha("7"),
  independentProspectiveRevisionApproved:true as const,
  originalScientificDesignPreserved:true as const,
  oldStageRemainsArchivedEvidence:true as const,noBackfillApproved:true as const};
 const ctx={oldInput:old,oldStageReview:oldReview,oldFreezeReview:oldBudget.permit,
  newInput:next.input,newStageReview:nextReview,newFreezeReview:nextBudget.permit,
  newManifestRaw:next.raw,review,now:new Date("2026-11-20T00:00:00.000Z")};
 let admin:Pool,writer:Pool,budgetWriter:Pool;
 beforeAll(async()=>{
  if(process.env.GITHUB_ACTIONS!=="true"||process.env.V39_P6_PROSPECTIVE_RESTAGE_PG16!=="1"||
     process.env.DATABASE_URL!==URL||process.env.AERODATABOX_API_KEY||
     process.env.V39_PHASE6_PROCESS_ARMED!=="0"||process.env.V39_PHASE6_OWNER_APPROVED!=="0")
   throw Error("REFUSED_P6_PROSPECTIVE_RESTAGE_NONDISPOSABLE_TEST");
  admin=new Pool({connectionString:URL});
  await admin.query("CREATE ROLE "+ROLE+" LOGIN PASSWORD 'ci-only' NOSUPERUSER NOCREATEROLE NOCREATEDB NOINHERIT");
  await admin.query("GRANT USAGE ON SCHEMA clean TO "+ROLE);
  const stageTables=["clean.adb_phase6_calendar_day","clean.adb_phase6_authorization",
   "clean.phase5_fids_cycle_budget_v39","clean.phase5_fids_utc_charge_budget_v39"];
  const all=[...stageTables,"clean.adb_sampling_draw","clean.phase5_fids_day_budget_v39",
   "clean.phase5_fids_allowed_query_v39","clean.phase5_fids_seven_rest_release_v39",
   "clean.phase5_fids_cycle_rest_category_cap_v39","clean.phase5_fids_utc_rest_category_budget_v39"];
  await admin.query("GRANT SELECT ON "+all.join(",")+" TO "+ROLE);
  await admin.query("GRANT INSERT ON "+stageTables.join(",")+" TO "+ROLE);
  writer=new Pool({connectionString:RESTRICTED,max:1});
  await admin.query("CREATE ROLE "+BUDGET_ROLE+" LOGIN PASSWORD 'ci-only' NOSUPERUSER NOCREATEROLE NOCREATEDB NOINHERIT");
  await admin.query("GRANT USAGE ON SCHEMA clean TO "+BUDGET_ROLE);
  await admin.query("GRANT SELECT ON "+[
   "clean.adb_phase6_authorization","clean.adb_phase6_calendar_day",
   "clean.phase5_fids_cycle_budget_v39","clean.phase5_fids_utc_charge_budget_v39",
   "clean.phase5_fids_allowed_query_v39","clean.phase5_fids_seven_rest_release_v39",
   "clean.phase5_fids_cycle_rest_category_cap_v39","clean.phase5_fids_utc_rest_category_budget_v39"
  ].join(",")+" TO "+BUDGET_ROLE);
  await admin.query("GRANT INSERT ON "+[
   "clean.phase5_fids_seven_rest_release_v39","clean.phase5_fids_cycle_rest_category_cap_v39",
   "clean.phase5_fids_utc_rest_category_budget_v39"].join(",")+" TO "+BUDGET_ROLE);
  budgetWriter=new Pool({connectionString:BUDGET_URL,max:1});
  await commitP5InertB0062UtcStageOnce(writer,old,oldReview);
  await commitP5V0093CostOnlySevenRestOnce(budgetWriter,old,oldReview,oldBudget.permit);
 });
 afterAll(async()=>{await budgetWriter?.end();await writer?.end();await admin?.end();});

 it("admits only the exact minimal Day-1 +24h reviewed revision",()=>{
  const c=compileP6ProspectiveDisabledStageRevisionV39(ctx);
  expect(c.changedParentDays).toBe(1);
  expect(Date.parse(c.firstNewServiceUtc)-Date.parse(c.firstOldServiceUtc)).toBe(24*H);
  expect(c.providerCalls).toBe(0);expect(c.phase6PaidGo).toBe(false);
  const bad=structuredClone(ctx);
  bad.newInput.calendarDays[2].anchorIcao="WSSS";
  bad.newInput.expectedSignedCalendarRowsSha256=digest(bad.newInput.calendarDays);
  bad.review.expectedNewStageInputSha256=digest(bad.newInput);
  expect(()=>compileP6ProspectiveDisabledStageRevisionV39(bad)).toThrow();
  expect(()=>compileP6ProspectiveDisabledStageRevisionV39({...ctx,now:new Date("2027-01-04T00:00:00.000Z")}))
   .toThrow("FIRST_PROSPECTIVE_T24_WINDOW_ALREADY_DUE");
 });

 it("rolls back atomically if a late calendar row refuses the revision",async()=>{
  await admin.query("CREATE FUNCTION clean.ci_p6_revision_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN "+
   "IF NEW.run_day_index=31 THEN RAISE EXCEPTION 'CI_EXPECTED_P6_REVISION_ROLLBACK'; END IF; RETURN NEW; END $$");
  await admin.query("CREATE TRIGGER ci_p6_revision_fail BEFORE UPDATE ON clean.adb_phase6_calendar_day "+
   "FOR EACH ROW EXECUTE FUNCTION clean.ci_p6_revision_fail()");
  try{
   await expect(commitP6ProspectiveDisabledStageRevisionOnceV39(admin,ctx))
    .rejects.toThrow("CI_EXPECTED_P6_REVISION_ROLLBACK");
   const auth=(await admin.query("SELECT manifest_sha256,calendar_hash,code_sha,enabled FROM clean.adb_phase6_authorization")).rows[0];
   expect(auth).toMatchObject({manifest_sha256:old.manifestSha256,calendar_hash:old.calendarSha256,
    code_sha:old.codeSha40,enabled:false});
   expect((await admin.query("SELECT COUNT(*)::int n FROM clean.phase5_fids_seven_rest_release_v39")).rows[0].n).toBe(1);
  }finally{
   await admin.query("DROP TRIGGER ci_p6_revision_fail ON clean.adb_phase6_calendar_day");
   await admin.query("DROP FUNCTION clean.ci_p6_revision_fail()");
  }
 });

 it("moves only the disabled singleton stage, appends new immutable cost evidence, and passes fresh readback",async()=>{
  const receipt=await commitP6ProspectiveDisabledStageRevisionOnceV39(admin,ctx);
  expect(receipt).toMatchObject({oldCostRowsPreserved:true,changedParentDays:1,
   providerCalls:0,databaseAuthorizationEnabled:false,phase6PaidGo:false});
  expect((await admin.query("SELECT COUNT(*)::int n FROM clean.phase5_fids_seven_rest_release_v39")).rows[0].n).toBe(2);
  expect((await admin.query("SELECT COUNT(*)::int n FROM clean.phase5_fids_seven_rest_release_v39 WHERE manifest_sha256=$1",
   [old.manifestSha256])).rows[0].n).toBe(1);
  const auth=(await admin.query("SELECT manifest_sha256,calendar_hash,config_hash,code_sha,enabled FROM clean.adb_phase6_authorization")).rows[0];
  expect(auth).toMatchObject({manifest_sha256:next.input.manifestSha256,
   calendar_hash:next.input.calendarSha256,config_hash:next.input.configSha256,
   code_sha:next.input.codeSha40,enabled:false});
  const verified=await verifyP6ProspectiveDisabledStageRevisionReadOnlyV39(admin,ctx,receipt);
  expect(verified).toEqual({status:"P6_PROSPECTIVE_DISABLED_STAGE_REVISION_READBACK_PASS_NO_GO",
   exactNewStage:true,archivedOldCostPreserved:true,verifiedReadOnly:true,
   providerCalls:0,databaseWrites:0,phase6PaidGo:false});
 });

 it("refuses replay once the current stage no longer matches the archived disabled stage",async()=>{
  await expect(commitP6ProspectiveDisabledStageRevisionOnceV39(admin,ctx))
   .rejects.toThrow(/OLD_DISABLED_AUTH_NOT_IDENTICAL|NEW_MANIFEST_OR_REVISION_ALREADY_PRESENT/);
 });
});
