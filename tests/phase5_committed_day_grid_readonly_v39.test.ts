import { describe,expect,it } from "vitest";
import {
 readCommittedP5DayCandidateGrid,type P5CommittedDayReadonlyScope
} from "../server/lib/disruption/phase5CommittedDayGridReadonly_v39";
import {verifyPreparedDailyDraw} from
 "../server/lib/disruption/phase5EarlyPreselectionReadback_v39";
import {planP5Stage8FromCommittedDayReadback}
 from "../server/lib/disruption/phase5V0079DailyPreparedQueryProposals_v39";

import {readFileSync} from "node:fs";
import {proposeP5Adaptive31ShapeEnvelope}
 from "../server/lib/disruption/phase5Prospective31DayShapeEnvelope_v39";
import {p5TreatmentCommitmentForSeed}
 from "../server/lib/disruption/phase5IndependentPairedTreatmentSourcePreview_v39";

const sha=(x:string)=>x.repeat(64);
const start=Date.parse("2026-11-09T14:00:00.000Z");
const fmt=(x:number)=>new Date(x).toISOString();
const list=[
 ["HUB","WSSS","ASIA"],["MID_A","OMAA","MIDDLE_EAST"],
 ["MID_B","SKBO","SOUTH_AMERICA"],["REGIONAL","KGPT","NORTH_AMERICA"]
] as const;
const horizons=[["T-24h",1440,"T24"],["T-6h",360,"T6"],
 ["T-90m",90,"T90"]] as const;
function fixture(){
 const cal={
  run_day_index:1,scheduled_start_utc:new Date(start),
  frozen_draw_seed:"frozen-phase5-day1",
  draw_type:"NEW_TEMPLATE",anchor_icao:"WSSS",
  slot_regions:{HUB:"ASIA",MID_A:"MIDDLE_EAST",
   MID_B:"SOUTH_AMERICA",REGIONAL:"NORTH_AMERICA"},
  pair_airport_set:null,
  calendar_hash:sha("a"),config_hash:sha("b"),frame_hash:sha("c"),
  date_utc:"2026-11-09"
 };
 const draw=list.map(([slot,icao,region])=>({
  slot_id:slot,target_region:region,draw_type:"NEW_TEMPLATE",
  selected_icao:icao,frozen_draw_seed:cal.frozen_draw_seed,
  selected_at_utc:"2026-11-08T10:00:00.000Z",
  adaptive_state_hash:slot==="REGIONAL"?sha("d"):null,
  probability_vector:slot==="REGIONAL"?
   [{icao:"KGPT",probability:1,drawScore:1}]:null,
  airport_layer_design_probability:slot==="REGIONAL"?1:null
 }));
 const day={
  runDayIndex:1,scheduledStartUtc:cal.scheduled_start_utc,
  frozenDrawSeed:cal.frozen_draw_seed,
  drawType:"NEW_TEMPLATE" as const,anchorIcao:cal.anchor_icao,
  slotRegions:cal.slot_regions,pairAirportSet:null,
  calendarHash:cal.calendar_hash,configHash:cal.config_hash,
  frameHash:cal.frame_hash
 };
 const templates:P5CommittedDayReadonlyScope["templates"]=[];
 for(const [slot] of list)for(const [horizon,min,label] of horizons){
  const cutoff=start-min*60_000,request=cutoff-600_000;
  templates.push({
   runDayIndex:1,budgetDayUtc:"2026-11-09",
   physicalChargeDayUtc:fmt(request).slice(0,10),
   slot,horizon,providerQueryDirection:"Departure",
   serviceWindowStartUtc:fmt(start),
   serviceWindowEndUtc:fmt(start+4*3_600_000),
   earliestPlannedCutoffUtc:fmt(cutoff),
   scheduledRequestUtc:fmt(request),
   maxResponseAndPersistSeconds:120,
   maxAttempts:1,apiUnitsPerAttempt:2,
   queryKey:"p5_day1_"+slot+"_"+label
  });
 }
 const scope:P5CommittedDayReadonlyScope={
  expectedManifestSha256:sha("e"),
  expectedCalendarSha256:sha("a"),
  expectedConfigSha256:sha("b"),
  expectedFrameSha256:sha("c"),
  expectedProviderContractSha256:sha("f"),
  expectedEarlyDrawSha256:verifyPreparedDailyDraw(day,draw).stateHash,
  expectedRestrictedReaderRole:"p5_reader",
  runDayIndex:1,templates
 };
 const auth={
  manifest_sha256:sha("e"),calendar_hash:sha("a"),config_hash:sha("b"),
  enabled:true,revoked_at_utc:null
 };
 return {scope,cal,draw,auth};
}
function fake(x=fixture() as ReturnType<typeof fixture> & {priorJoinedRows?:unknown[]},opts:{
  role?:string;readOnly?:string;now?:string;
  missingAuth?:boolean;missingDay?:boolean;partialDraw?:boolean;
 }={}){
 const sql:string[]=[];
 let release=0;
 const client={
  async query(text:string){
   sql.push(text);
   if(text.startsWith("SELECT current_user"))return {rowCount:1,rows:[{
    reader_role:opts.role??"p5_reader",
    read_only:opts.readOnly??"on",
    at:new Date(opts.now??"2026-11-08T12:00:00.000Z")
   }]};
   if(text.includes("FROM clean.adb_phase6_authorization"))
    return {rowCount:opts.missingAuth?0:1,rows:opts.missingAuth?[]:[x.auth]};
   if(text.includes("LEFT JOIN clean.adb_sampling_draw"))
    return {rowCount:x.priorJoinedRows?.length??0,rows:x.priorJoinedRows??[]};
   if(text.includes("FROM clean.adb_phase6_calendar_day"))
    return {rowCount:opts.missingDay?0:1,rows:opts.missingDay?[]:[x.cal]};
   if(text.includes("FROM clean.adb_sampling_draw"))
    return {rowCount:opts.partialDraw?3:4,
     rows:opts.partialDraw?x.draw.slice(0,3):x.draw};
   return {rowCount:0,rows:[]};
  },release(){release++;}
 };
 return {pool:{async connect(){return client;}} as any,
  sql, get release(){return release;}};
}
describe("Phase5 real frozen calendar/early-draw readback (mock PG, NO provider)",()=>{
 it("reads auth, calendar and exact four draws in a repeatable-read read-only tx",async()=>{
  const f=fixture(),o=fake(f);
  const r=await readCommittedP5DayCandidateGrid(o.pool,f.scope);
  expect(r.status).toBe("SAVED_SOURCE_DAY_READ_ONLY_CANDIDATES_NOT_RELEASED");
  expect(r.selectedDayCandidateGrid.acquisitions).toHaveLength(12);
  expect(r.selectedDayCandidateGrid.candidateFidsApiUnits).toBe(24);
  expect(r.databaseReadOnlySnapshot).toBe(true);
  expect(r.databaseWrites).toBe(0);expect(r.providerCalls).toBe(0);
  expect(r.phase6Go).toBe(false);
  expect(o.sql[0]).toBe("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  expect(o.sql.at(-1)).toBe("COMMIT");
  expect(o.sql.some(v=>/INSERT|DELETE|UPDATE|TRUNCATE/i.test(v))).toBe(false);
  expect(o.release).toBe(1);
 });
 it("bridges genuine same-transaction four-airport readback into Stage8 without manually copying draw rows",async()=>{
  const f=fixture(),o=fake(f);
  const stage7=await readCommittedP5DayCandidateGrid(o.pool,f.scope);
  expect(stage7.committedDayAndDrawProof?.verifiedInsideSameReadOnlyTransaction)
   .toBe(true);
  expect(stage7.committedDayAndDrawProof?.drawRows).toHaveLength(4);
  const metadata={
   manifestSha256:sha("e"),calendarSha256:sha("a"),
   configSha256:sha("b"),frameSha256:sha("c"),
   providerContractSha256:sha("f"),
   reviewedReleaseSha256:sha("1"),rightsReviewSha256:sha("2"),
   localFrames:[
    {slot:"HUB" as const,icao:"WSSS",ianaTimezone:"Asia/Singapore",
     providerApiVersion:"1.15.4",fidsProtocolVersion:"v39"},
    {slot:"MID_A" as const,icao:"OMAA",ianaTimezone:"Asia/Dubai",
     providerApiVersion:"1.15.4",fidsProtocolVersion:"v39"},
    {slot:"MID_B" as const,icao:"SKBO",ianaTimezone:"America/Bogota",
     providerApiVersion:"1.15.4",fidsProtocolVersion:"v39"},
    {slot:"REGIONAL" as const,icao:"KGPT",ianaTimezone:"America/Chicago",
     providerApiVersion:"1.15.4",fidsProtocolVersion:"v39"},
   ],
   chargeDayBudgets:[
    {chargeDayUtc:"2026-11-08",dailyApiCeiling:1900,
     otherCategoriesReserved:50,existingSourceReserved:0},
    {chargeDayUtc:"2026-11-09",dailyApiCeiling:1900,
     otherCategoriesReserved:50,existingSourceReserved:0}
   ],
   cycleUnitsAvailable:1000,
  };
  const prepared=planP5Stage8FromCommittedDayReadback(stage7,metadata);
  expect(prepared.sourceQueryCount).toBe(12);
  expect(prepared.maximumCandidateGetUnits).toBe(24);
  expect(prepared.runDayIndex).toBe(1);
  expect(prepared.earlyDrawSha256).toBe(f.scope.expectedEarlyDrawSha256);
  expect(prepared.queries.every(x=>x.github_run_id==="00000"&&
   x.state==="PREPARED")).toBe(true);
  expect(prepared.providerCalls).toBe(0);
  expect(prepared.databaseWrites).toBe(0);
  expect(prepared.phase6Go).toBe(false);

  const forged={...stage7,committedDayAndDrawProof:undefined};
  expect(()=>planP5Stage8FromCommittedDayReadback(forged,metadata))
   .toThrow("NO_SAME_DB_SNAPSHOT_DAY_DRAW_PROOF");
  const replaced={...stage7,
   committedDayAndDrawProof:{
    ...stage7.committedDayAndDrawProof!,
    drawRows:stage7.committedDayAndDrawProof!.drawRows.map(x=>({...x}))
   }
  };
  replaced.committedDayAndDrawProof.drawRows[3].selected_icao="KXYZ";
  expect(()=>planP5Stage8FromCommittedDayReadback(replaced,metadata))
   .toThrow();
  const badBudget={...metadata,chargeDayBudgets:metadata.chargeDayBudgets.slice(1)};
  expect(()=>planP5Stage8FromCommittedDayReadback(stage7,badBudget))
   .toThrow("MISSING_OR_EXTRA_UTC_CHARGE_DAY_BUDGET");
  expect(o.sql.filter(x=>x.startsWith("BEGIN"))).toHaveLength(1);
  expect(o.sql.at(-1)).toBe("COMMIT");
 });
 it("refuses a reviewed segmented shape that disagrees with the actual DB day",async()=>{
   const f=fixture();
   f.scope.reviewedSegmentedSource={
     windowShape:"2x2h",verifiedProviderMaxRangeMinutes:120,
     reviewedProviderRangeEvidenceSha256:sha("9")
   };
   const cal=f.cal as typeof f.cal&{
      window_shape?:string;active_duration_minutes?:number};
   cal.window_shape="4h";cal.active_duration_minutes=240;
   const o=fake(f);
   await expect(readCommittedP5DayCandidateGrid(o.pool,f.scope))
     .rejects.toThrow("SAVED_AMENDMENT_C_TREATMENT_SHAPE_CHANGED");
   expect(o.sql).toContain("ROLLBACK");
   expect(o.sql.some(s=>s.includes("adb_sampling_draw"))).toBe(false);
 });
 it("rejects wrong reader role before any source query, and rolls back",async()=>{
  const f=fixture(),o=fake(f,{role:"app_runtime"});
  await expect(readCommittedP5DayCandidateGrid(o.pool,f.scope))
   .rejects.toThrow("UNVERIFIED_RESTRICTED_READ_ONLY_ROLE");
  expect(o.sql).toContain("ROLLBACK");
  expect(o.sql.some(s=>s.includes("adb_sampling_draw"))).toBe(false);
  expect(o.release).toBe(1);
 });
 it("rejects read-write DB transaction even if role name looks correct",async()=>{
  const f=fixture(),o=fake(f,{readOnly:"off"});
  await expect(readCommittedP5DayCandidateGrid(o.pool,f.scope))
   .rejects.toThrow("UNVERIFIED_RESTRICTED_READ_ONLY_ROLE");
  expect(o.sql).toContain("ROLLBACK");
 });
 it("rejects revoked or wrong frozen authorization",async()=>{
  const f=fixture();f.auth.enabled=false;
  const o=fake(f);
  await expect(readCommittedP5DayCandidateGrid(o.pool,f.scope))
   .rejects.toThrow("ACTIVE_MANIFEST_OR_AUTH_CHANGED");
  expect(o.sql).toContain("ROLLBACK");
 });
 it("rejects day mismatch and partially persisted four-airport set",async()=>{
  const f=fixture();f.cal.frame_hash=sha("1");
  const o=fake(f);
  await expect(readCommittedP5DayCandidateGrid(o.pool,f.scope))
   .rejects.toThrow("SAVED_DAY_PIN_MISMATCH");
  const a=fixture(),p=fake(a,{partialDraw:true});
  await expect(readCommittedP5DayCandidateGrid(p.pool,a.scope))
   .rejects.toThrow("FOUR_COMMITTED_DRAW_ROWS_NOT_FOUND");
 });
 it("refuses wrong expected signed draw without substitute or fallback",async()=>{
  const f=fixture();f.scope.expectedEarlyDrawSha256=sha("0");
  const o=fake(f);
  await expect(readCommittedP5DayCandidateGrid(o.pool,f.scope))
   .rejects.toThrow("UNVERIFIED_EARLY_DRAW_READBACK");
  expect(o.sql).toContain("ROLLBACK");
 });
 it("rejects a retroactive readback after the first source GET time",async()=>{
  const f=fixture(),o=fake(f,{now:"2026-11-08T14:30:00.000Z"});
  await expect(readCommittedP5DayCandidateGrid(o.pool,f.scope))
   .rejects.toThrow("EARLIEST_SOURCE_REQUEST_ALREADY_DUE");
  expect(o.sql).toContain("ROLLBACK");
 });
 it("rejects future-dated source draw rather than pretending it committed",async()=>{
  const f=fixture(),o=fake(f,{now:"2026-11-08T09:00:00.000Z"});
  await expect(readCommittedP5DayCandidateGrid(o.pool,f.scope))
   .rejects.toThrow("DRAW_NOT_YET_PERSISTED_AT_DB_CLOCK");
  expect(o.sql).toContain("ROLLBACK");
 });
 it("rejects unsigned scope and never attempts to connect",async()=>{
  const f=fixture();f.scope.expectedRestrictedReaderRole="!";
  let called=0;
  await expect(readCommittedP5DayCandidateGrid({
   async connect(){called++;throw Error("should not connect");}
  } as any,f.scope)).rejects.toThrow("UNPINNED_READBACK_OR_DAY");
  expect(called).toBe(0);
 });
});


// This adds NO production database connection. The 'pool' is a fake PG
// transport so the authorization SQL/transaction/rollback sequencing and
// same-snapshot envelope binding can be adversarially verified. Exact real
// PG credentials and true DB custody require a separate authenticated run.
const studySeed="31be6f0d392e4d84f72a0e8bc5369eb57a4c916083b962edef7e7319146a0d25";
function syntheticSixthDayReadback(){
 const corrected=JSON.parse(readFileSync(new URL(
  "../data-collection/phase5/evidence/2026-11-09_five_full_frame_pairs_post_selection_kteb_to_kbuf_readonly.json",
  import.meta.url),"utf8"));
 const envelope=proposeP5Adaptive31ShapeEnvelope({
  ownerCorrectedReadback:corrected,firstRunDateUtc:"2026-11-24",
  claimedTreatment:{
   treatmentSeedHex:studySeed,
   announcedCommitmentSha256:p5TreatmentCommitmentForSeed(studySeed),
   claimedCommitmentObservedAtUtc:"2026-11-09T00:00:00.000Z"
  }
 });
 const proposed=envelope.days[5]; // run6 is a genuine future ordinary-day SLOT
 if(proposed.runDayIndex!==6||proposed.pairId!==null)
  throw Error("TEST_EXPECTED_RUN6_ORDINARY");
 const o=fixture() as ReturnType<typeof fixture> & {priorJoinedRows?:any[]};
 // Mock day-six airports must NOT reuse a recent paired site. The old
 // WSSS/OMAA/SKBO/KGPT positive fixture actually violated prior END→START.
 const fresh=["KZAZ","KZBZ","KZCZ","KZDZ"];
 o.cal.anchor_icao=fresh[0];
 for(let i=0;i<4;i++)o.draw[i].selected_icao=fresh[i];
 o.draw[3].probability_vector=[
  {icao:fresh[3],probability:1,drawScore:1}
 ];
 const start6=Date.parse(proposed.startUtc);
 const cal=o.cal as typeof o.cal &{
  window_shape:string;active_duration_minutes:number
 };
 cal.run_day_index=6;
 cal.scheduled_start_utc=new Date(start6);
 cal.date_utc=proposed.dateUtc;
 cal.window_shape="4h";
 cal.active_duration_minutes=240;
 const selectedAt=fmt(start6-26*3_600_000);
 for(const row of o.draw)row.selected_at_utc=selectedAt;
 o.scope.runDayIndex=6;
 const day={
  runDayIndex:6,scheduledStartUtc:cal.scheduled_start_utc,
  frozenDrawSeed:cal.frozen_draw_seed,drawType:"NEW_TEMPLATE" as const,
  anchorIcao:cal.anchor_icao,slotRegions:cal.slot_regions,
  pairAirportSet:null,calendarHash:cal.calendar_hash,
  configHash:cal.config_hash,frameHash:cal.frame_hash
 };
 o.scope.expectedEarlyDrawSha256=verifyPreparedDailyDraw(day,o.draw).stateHash;
 o.scope.reviewedOrdinaryDayEnvelope={
  envelope,independentlyReviewedShapeEnvelopeSha256:envelope.shapeEnvelopeSha256
 };
 o.scope.templates=[];
 for(const [slot] of list)for(const [horizon,min,label] of horizons){
  const cutoff=start6-min*60_000,request=cutoff-600_000;
  o.scope.templates.push({
   runDayIndex:6,budgetDayUtc:proposed.dateUtc,
   physicalChargeDayUtc:fmt(request).slice(0,10),
   slot,horizon,providerQueryDirection:"Departure",
   serviceWindowStartUtc:fmt(start6),
   serviceWindowEndUtc:fmt(start6+4*3_600_000),
   earliestPlannedCutoffUtc:fmt(cutoff),
   scheduledRequestUtc:fmt(request),
   maxResponseAndPersistSeconds:120,
   maxAttempts:1,apiUnitsPerAttempt:2,
   queryKey:"p5_day6_"+slot+"_"+label
  });
 }
 // Mock-only historical committed rows. Each prior day is checked against the
 // real archived study-shape proposal; no live PostgreSQL or airport draw occurs.
 o.priorJoinedRows=[];
 const slotRegions=o.cal.slot_regions;
 for(const p of envelope.days.slice(0,5)){
  const j=p.runDayIndex;
  const names=p.pairedAirportCandidates??Object.fromEntries(
   list.map(([slot],i)=>[
    slot,"K"+String.fromCharCode(65+j)+String.fromCharCode(65+i)+"Z"
   ])
  ) as Record<"HUB"|"MID_A"|"MID_B"|"REGIONAL",string>;
  const pairSet=p.pairId===null?null:Object.fromEntries(
   list.map(([slot])=>[slot,{icao:names[slot],region:slotRegions[slot]}])
  );
  const drawType=p.pairId!==null&&p.crossoverPeriod===2?
   "PAIR_REPLAY":"NEW_TEMPLATE";
  for(const [slot] of list){
   const isRegional=slot==="REGIONAL";
   o.priorJoinedRows.push({
    run_day_index:j,scheduled_start_utc:new Date(p.startUtc),
    frozen_draw_seed:"mock-prior-frozen-seed-"+j,
    draw_type:drawType,anchor_icao:names.HUB,
    slot_regions:slotRegions,pair_airport_set:pairSet,
    calendar_hash:o.scope.expectedCalendarSha256,
    config_hash:o.scope.expectedConfigSha256,
    frame_hash:o.scope.expectedFrameSha256,
    date_utc:p.dateUtc,window_shape:p.windowShape,
    active_duration_minutes:p.windowShape==="up-to-6h"?360:240,
    slot_id:slot,target_region:slotRegions[slot],
    selected_draw_type:drawType,selected_icao:names[slot],
    selected_draw_seed:"mock-prior-frozen-seed-"+j,
    selected_at_utc:fmt(Date.parse(p.startUtc)-26*3_600_000),
    adaptive_state_hash:isRegional&&p.pairId===null?sha("d"):null,
    probability_vector:isRegional?
     [{icao:names[slot],probability:1,drawScore:1}]:null,
    airport_layer_design_probability:isRegional?1:null
   });
  }
 }
 return {o,envelope,proposed,now:fmt(start6-25*3_600_000)};
}

describe("Phase5 shape envelope vs four REAL-scope database rows, no release",()=>{
 it("within one restricted read-only PG mock snapshot binds ordinary run6 four rows and approved shape",async()=>{
  const {o,envelope,now}=syntheticSixthDayReadback();
  const pg=fake(o,{now});
  const result=await readCommittedP5DayCandidateGrid(pg.pool,o.scope);
  const b=result.ordinaryDayEnvelopeReadback;
  expect(b?.status).toBe(
   "ONE_ORDINARY_DAY_DB_ROWS_MATCH_PROVISIONAL_SHAPE_NO_RELEASE"
  );
  expect(b?.withinCheckedReadOnlyTransaction).toBe(true);
  expect(b?.candidate.runDayIndex).toBe(6);
  expect(b?.candidate.sourceShapeEnvelopeSha256).toBe(envelope.shapeEnvelopeSha256);
  expect(b?.candidate.selectedIcaos).toEqual({
   HUB:"KZAZ",MID_A:"KZBZ",MID_B:"KZCZ",REGIONAL:"KZDZ"
  });
  expect(b?.candidate.submittedDrawStateSha256).toBe(o.scope.expectedEarlyDrawSha256);
  expect(b?.candidate.realRestrictedPostgresReadbackAuthenticated).toBe(false);
  expect(b?.priorDaySiteWashoutVerified).toBe(true);
  expect(b?.priorCommittedWashoutAudit.priorParentDaysVerified).toBe(5);
  expect(b?.priorCommittedWashoutAudit.priorAirportDayObservationsVerified).toBe(20);
  expect(b?.realFlightSourceVerified).toBe(false);
  expect(b?.physicalChargeDayBudgetsVerified).toBe(false);
  expect(b?.phase5FreezePassed).toBe(false);
  expect(b?.phase6Go).toBe(false);
  expect(result.selectedDayCandidateGrid.acquisitions).toHaveLength(12);
  expect(result.providerCalls).toBe(0);
  expect(result.databaseWrites).toBe(0);
  expect(pg.sql.at(-1)).toBe("COMMIT");
  expect(pg.sql.filter(q=>q.includes("FROM clean.adb_sampling_draw"))).toHaveLength(1);
  expect(pg.sql.filter(q=>q.includes("LEFT JOIN clean.adb_sampling_draw"))).toHaveLength(1);
  expect(pg.sql.some(q=>/INSERT|UPDATE|DELETE|TRUNCATE/i.test(q))).toBe(false);
 });
 it("fails closed on altered persisted calendar treatment shape before materializing source",async()=>{
  const {o,now}=syntheticSixthDayReadback();
  const cal=o.cal as typeof o.cal&{window_shape:string;active_duration_minutes:number};
  cal.window_shape="2x2h";
  const pg=fake(o,{now});
  await expect(readCommittedP5DayCandidateGrid(pg.pool,o.scope))
   .rejects.toThrow("PERSISTED_ORDINARY_4H_EXPOSURE_MISMATCH");
  expect(pg.sql.at(-1)).toBe("ROLLBACK");
 });
 it("rejects forged reviewed envelope SHA before opening a PostgreSQL session",async()=>{
  const {o}=syntheticSixthDayReadback();
  o.scope.reviewedOrdinaryDayEnvelope!.independentlyReviewedShapeEnvelopeSha256="!";
  let connects=0;
  await expect(readCommittedP5DayCandidateGrid({
   async connect(){connects++;throw Error("should never connect");}
  } as any,o.scope)).rejects.toThrow("UNPINNED_31_DAY_SHAPE_CONTRACT");
  expect(connects).toBe(0);
 });
 it("rejects a mismatched day-index/slot against the reviewed whole 31-day envelope",async()=>{
  const {o,now}=syntheticSixthDayReadback();
  o.scope.reviewedOrdinaryDayEnvelope!.envelope.days[5].startUtc=
   "2026-11-01T00:00:00.000Z";
  const pg=fake(o,{now});
  await expect(readCommittedP5DayCandidateGrid(pg.pool,o.scope))
   .rejects.toThrow("UNREVIEWED_OR_TAMPERED_31_SHAPE");
  expect(pg.sql.at(-1)).toBe("ROLLBACK");
 });
 it("rejects a current four-slot mock set reusing a paired airport before global 24h washout",async()=>{
  const {o,now}=syntheticSixthDayReadback();
  const conflict=["WSSS","OMAA","SKBO","KGPT"];
  o.cal.anchor_icao=conflict[0];
  for(let i=0;i<4;i++)o.draw[i].selected_icao=conflict[i];
  o.draw[3].probability_vector=[
   {icao:"KGPT",probability:1,drawScore:1}
  ];
  const p={
   runDayIndex:6,scheduledStartUtc:o.cal.scheduled_start_utc,
   frozenDrawSeed:o.cal.frozen_draw_seed,drawType:"NEW_TEMPLATE" as const,
   anchorIcao:o.cal.anchor_icao,slotRegions:o.cal.slot_regions,
   pairAirportSet:null,calendarHash:o.cal.calendar_hash,
   configHash:o.cal.config_hash,frameHash:o.cal.frame_hash
  };
  o.scope.expectedEarlyDrawSha256=verifyPreparedDailyDraw(p,o.draw).stateHash;
  const pg=fake(o,{now});
  await expect(readCommittedP5DayCandidateGrid(pg.pool,o.scope))
   .rejects.toThrow("CURRENT_DAY_GLOBAL_AIRPORT_WASHOUT_VIOLATED");
  expect(pg.sql.at(-1)).toBe("ROLLBACK");
 });
 it("rejects incomplete earlier saved airport history before source candidates are released",async()=>{
  const {o,now}=syntheticSixthDayReadback();
  o.priorJoinedRows!.pop();
  const pg=fake(o,{now});
  await expect(readCommittedP5DayCandidateGrid(pg.pool,o.scope))
   .rejects.toThrow("INCOMPLETE_EARLIER_FOUR_ROW_HISTORY");
  expect(pg.sql.at(-1)).toBe("ROLLBACK");
  expect(pg.sql.some(q=>q.includes("LEFT JOIN clean.adb_sampling_draw"))).toBe(true);
 });
 it("rejects altered earlier window shape and loses no DB state",async()=>{
  const {o,now}=syntheticSixthDayReadback();
  o.priorJoinedRows![0].window_shape="up-to-6h";
  const pg=fake(o,{now});
  await expect(readCommittedP5DayCandidateGrid(pg.pool,o.scope))
   .rejects.toThrow("PRIOR_CALENDAR_SHAPE_OR_SIGNATURE_DRIFT");
  expect(pg.sql.at(-1)).toBe("ROLLBACK");
 });
 it("rejects altered earlier pair-airport selection despite a valid four-row count",async()=>{
  const {o,now}=syntheticSixthDayReadback();
  const row=o.priorJoinedRows!.find(x=>x.pair_airport_set!==null)!;
  const old=String(row.selected_icao);
  row.selected_icao=old==="KXYZ"?"KXYY":"KXYZ";
  const pg=fake(o,{now});
  await expect(readCommittedP5DayCandidateGrid(pg.pool,o.scope))
   .rejects.toThrow(/PAIR_TEMPLATE_MISMATCH|PRIOR_PAIRED_CANDIDATE_NOT_MATCHED|INVALID_OR_DUPLICATE_AIRPORT/);
  expect(pg.sql.at(-1)).toBe("ROLLBACK");
 });
 it("preserves pre-existing readback path when no new reviewed 31-day envelope is supplied",async()=>{
  const f=fixture(),pg=fake(f);
  const result=await readCommittedP5DayCandidateGrid(pg.pool,f.scope);
  expect(result.ordinaryDayEnvelopeReadback).toBeUndefined();
  expect(result.selectedDayCandidateGrid.acquisitions).toHaveLength(12);
 });
 it("refuses fake late or future-dated selected rows and rolls back all candidate readback",async()=>{
  const {o,now,proposed}=syntheticSixthDayReadback();
  const at=fmt(Date.parse(proposed.startUtc)-(24*60+45)*60_000);
  for(const row of o.draw)row.selected_at_utc=at;
  const pg=fake(o,{now});
  await expect(readCommittedP5DayCandidateGrid(pg.pool,o.scope))
   .rejects.toThrow("DRAW_TOO_LATE_FOR_T24_SOURCE");
  expect(pg.sql.at(-1)).toBe("ROLLBACK");
 });
});
