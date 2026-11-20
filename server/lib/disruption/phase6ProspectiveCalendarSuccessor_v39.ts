import {createHash} from "node:crypto";
import type {Pool, PoolClient} from "pg";

const SHA=/^[a-f0-9]{64}$/;
const CODE=/^[a-f0-9]{40}$/;
const AUTH=/^AUTH-\d{8}-[A-Z0-9]+$/;
const HOUR=3600000;
const hold=(s:string):never=>{throw Error("HOLD_P6_CALENDAR_SUCCESSOR_"+s);};
const sha=(s:string)=>createHash("sha256").update(s,"utf8").digest("hex");
const utc=(v:unknown)=>{
  const d=v instanceof Date?v:new Date(String(v));
  if(!Number.isFinite(d.getTime()))hold("NONCANONICAL_TIME");
  return d.toISOString();
};

export const P6_ORIGINAL_FROZEN_RELEASE=Object.freeze({
  authorizationId:"AUTH-20261119-P5INERTFREEZE",
  manifestSha256:"bd14ff3e558b975a889741380da807644ca9d3573a23e2416986ee6f71e1e41f",
  calendarSha256:"7125264304fe658028d54eb95b5e18b243a1d66100c9d1620d0d93c419c7077c",
  configSha256:"9cb7f3dcb2ee0d857f585fe8433a8dc2b7ac7bb3e3ad384a469c13530856642c",
  stagePacketSha256:"b833c9f52a24a6f953ebf5e2f3df481310b6bedd25a1d41c4f7a5d5833b2e745",
  costEnvelopeSha256:"abc19fc266558940b43fc2bad580178174e7e5877feb6bfff599a49427f50e7a",
  freezeReceiptSha256:"f82a27057b0bf8b8f6ac95e1ca4d14ce14f32ca5ef6997e5746dbbeb7984fe20",
});
export const P6_NOV20_SUCCESSOR_REVIEW=Object.freeze({
  firstSourceUtc:"2026-11-20T23:45:00.000Z",
  firstServiceUtc:"2026-11-22T00:00:00.000Z",
  calendarRowsSha256:"9ee062ab6d82de8b3949f88ba390d4bcb9121890be592797ec0b4c498ff289a6",
  sourceTemplates:6144,
  totalReservedUnits:36740,
  peakUtcDayReserveUnits:1280,
});

export interface P6SuccessorCalendarDay {
  runDayIndex:number; budgetDayId:string; startUtc:string; utcSlot:string;
  timeClass:string; windowShape:"4h"|"2x2h"|"up-to-6h"; partition:"train"|"validation"|"test";
  pairId:string|null; crossoverPeriod:number|null; pairRole:string|null; drawType:string;
  slotRegions:Record<string,string>; anchorIcao:string; pairAirportSet:Record<string,unknown>|null;
  frozenDrawSeed:string; frameSha256:string; activeDurationMinutes:number;
}
export interface P6SuccessorUtcBudget {
  chargeDayUtc:string; dailyApiCeiling:number; dailyOtherReservedUnits:number;
}
export interface P6SuccessorCategoryCap {category:string; ceilingUnits:number}
export interface P6SuccessorCategoryDay {chargeDayUtc:string; category:string; plannedUnits:number}
export interface P6ProspectiveCalendarSuccessorPacket {
  schema:"v39.phase6.prospective-calendar-successor.v1";
  reviewedMainSha:string;
  original:typeof P6_ORIGINAL_FROZEN_RELEASE;
  successor:{
    authorizationId:string; manifestSha256:string; manifestJson:string;
    calendarSha256:string; configSha256:string; codeSha40:string; phase6StartDateUtc:string;
    predecessorEvidenceIds:string[];
    calendarDays:P6SuccessorCalendarDay[];
    cycleBudget:{cycleApiCeiling:number; otherCategoryReservedUnits:number; protectedApiFloorUnits:number};
    utcBudgets:P6SuccessorUtcBudget[];
    sevenRestRelease:{
      reviewedProviderRangeSha256:string; verifiedProviderMaxRangeMinutes:number;
      reviewedCategoryBudgetSha256:string;
    };
    cycleCategoryCaps:P6SuccessorCategoryCap[];
    utcCategoryBudgets:P6SuccessorCategoryDay[];
    sourceTemplates:6144; totalReservedUnits:36740; peakUtcDayReserveUnits:1280;
    firstSourceUtc:"2026-11-20T23:45:00.000Z";
  };
  review:{
    originalFreezeReceiptSha256:string;
    boundedSourceUseEvidenceSha256:string;
    prospectiveDateRevisionEvidenceSha256:string;
    recoveryControlEvidenceSha256:string;
    independentDateRevisionApproved:true;
    originalSeedAndTreatmentPreserved:true;
    ownerApproved:true;
    sourceAuthorizationStillSeparate:true;
    paidGoStillSeparate:true;
  };
  phase6PaidGo:false;
}

function whole(n:unknown,min=0,max=100000):n is number{
  return typeof n==="number"&&Number.isSafeInteger(n)&&n>=min&&n<=max;
}
function validDay(d:P6SuccessorCalendarDay,i:number){
  const t=Date.parse(d.startUtc);
  if(d.runDayIndex!==i+1||!Number.isFinite(t)||new Date(t).toISOString()!==d.startUtc||
    typeof d.budgetDayId!=="string"||d.budgetDayId.length<8||
    !/^(?:0[048]|1[26]|20)$/.test(d.utcSlot)||typeof d.timeClass!=="string"||
    !["4h","2x2h","up-to-6h"].includes(d.windowShape)||
    d.partition!==(i<20?"train":i<25?"validation":"test")||
    typeof d.drawType!=="string"||!d.slotRegions||typeof d.slotRegions!=="object"||
    !/^[A-Z0-9]{4}$/.test(d.anchorIcao)||!SHA.test(d.frozenDrawSeed)||!SHA.test(d.frameSha256)||
    d.activeDurationMinutes!==(d.windowShape==="up-to-6h"?360:d.windowShape==="2x2h"?240:240))
    hold("INVALID_CALENDAR_DAY");
}
export function validateP6ProspectiveCalendarSuccessorPacket(
  p:P6ProspectiveCalendarSuccessorPacket, now=new Date()
){
  if(!p||p.schema!=="v39.phase6.prospective-calendar-successor.v1"||
    p.phase6PaidGo!==false||!CODE.test(p.reviewedMainSha??"")||
    JSON.stringify(p.original)!==JSON.stringify(P6_ORIGINAL_FROZEN_RELEASE))
    hold("PACKET_IDENTITY");
  const s=p.successor,r=p.review;
  if(!AUTH.test(s.authorizationId)||s.authorizationId===P6_ORIGINAL_FROZEN_RELEASE.authorizationId||
    ![s.manifestSha256,s.calendarSha256,s.configSha256,
      s.sevenRestRelease.reviewedProviderRangeSha256,s.sevenRestRelease.reviewedCategoryBudgetSha256].
      every(x=>SHA.test(x??""))||!CODE.test(s.codeSha40)||
    s.calendarSha256!==P6_NOV20_SUCCESSOR_REVIEW.calendarRowsSha256||
    s.firstSourceUtc!==P6_NOV20_SUCCESSOR_REVIEW.firstSourceUtc||
    s.sourceTemplates!==6144||s.totalReservedUnits!==36740||s.peakUtcDayReserveUnits!==1280||
    !Array.isArray(s.predecessorEvidenceIds)||s.predecessorEvidenceIds.length<1||
    new Set(s.predecessorEvidenceIds).size!==s.predecessorEvidenceIds.length)
    hold("SUCCESSOR_IDENTITY");
  if(typeof s.manifestJson!=="string"||sha(s.manifestJson)!==s.manifestSha256)
    hold("MANIFEST_BYTES");
  let m:any; try{m=JSON.parse(s.manifestJson);}catch{hold("MANIFEST_JSON");}
  if(!m||m.scientificFreezeApproved!==true||m.phase6PaidGo!==false||
    m.sourceUseDeferredToPhase6Activation!==true||m.calendarRowsSha256!==s.calendarSha256||
    m.configSha256!==s.configSha256||m.originalPhase5ManifestSha256!==P6_ORIGINAL_FROZEN_RELEASE.manifestSha256||
    m.prospectiveDateSuccessorApproved!==true)
    hold("MANIFEST_SCOPE");
  if(!Array.isArray(s.calendarDays)||s.calendarDays.length!==31)hold("CALENDAR_COUNT");
  s.calendarDays.forEach(validDay);
  if(s.calendarDays[0].startUtc!==P6_NOV20_SUCCESSOR_REVIEW.firstServiceUtc||
    s.phase6StartDateUtc!=="2026-11-22")hold("FIRST_SERVICE_DATE");
  if(Date.parse(s.calendarDays[0].startUtc)-now.getTime()<=24*HOUR+50*60000)
    hold("FIRST_T24_WINDOW_ALREADY_DUE");
  if(Date.parse(s.firstSourceUtc)<=now.getTime())hold("FIRST_SOURCE_ALREADY_DUE");
  if(!whole(s.cycleBudget.cycleApiCeiling,1,60000)||
    !whole(s.cycleBudget.otherCategoryReservedUnits)||!whole(s.cycleBudget.protectedApiFloorUnits)||
    !Array.isArray(s.utcBudgets)||s.utcBudgets.length<31||
    s.utcBudgets.some(x=>!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(x.chargeDayUtc)||
      !whole(x.dailyApiCeiling,1,60000)||!whole(x.dailyOtherReservedUnits))||
    !whole(s.sevenRestRelease.verifiedProviderMaxRangeMinutes,1,1440)||
    !Array.isArray(s.cycleCategoryCaps)||s.cycleCategoryCaps.length!==7||
    new Set(s.cycleCategoryCaps.map(x=>x.category)).size!==7||
    s.cycleCategoryCaps.some(x=>typeof x.category!=="string"||!whole(x.ceilingUnits))||
    !Array.isArray(s.utcCategoryBudgets)||s.utcCategoryBudgets.length!==7*s.utcBudgets.length||
    s.utcCategoryBudgets.some(x=>typeof x.category!=="string"||!whole(x.plannedUnits)||
      !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(x.chargeDayUtc)))
    hold("BUDGET_SHAPE");
  if(r.originalFreezeReceiptSha256!==P6_ORIGINAL_FROZEN_RELEASE.freezeReceiptSha256||
    ![r.boundedSourceUseEvidenceSha256,r.prospectiveDateRevisionEvidenceSha256,
      r.recoveryControlEvidenceSha256].every(x=>SHA.test(x??""))||
    r.independentDateRevisionApproved!==true||r.originalSeedAndTreatmentPreserved!==true||
    r.ownerApproved!==true||r.sourceAuthorizationStillSeparate!==true||r.paidGoStillSeparate!==true)
    hold("REVIEW_SCOPE");
  return {pass:true,authorizationId:s.authorizationId,calendarSha256:s.calendarSha256,
    manifestSha256:s.manifestSha256,firstSourceUtc:s.firstSourceUtc,phase6PaidGo:false as const};
}

const archiveKey=(calendarSha:string)=>"phase6_calendar_successor_original:"+calendarSha;
const transitionKey=(calendarSha:string)=>"phase6_calendar_successor_applied:"+calendarSha;
const manifestKey=(manifestSha:string)=>"phase5_frozen_manifest:"+manifestSha;

async function exactZeroBlockers(c:PoolClient){
  const q=(await c.query(`SELECT
    (SELECT count(*)::int FROM clean.adb_sampling_draw) draws,
    (SELECT count(*)::int FROM clean.phase5_fids_day_budget_v39) day_budget,
    (SELECT count(*)::int FROM clean.phase5_fids_allowed_query_v39) allowed_query,
    (SELECT count(*)::int FROM clean.phase5_fids_exact_query_partition_v39) query_partition,
    (SELECT count(*)::int FROM clean.phase5_fids_physical_attempt_v39) physical_attempt,
    (SELECT count(*)::int FROM clean.phase5_other_rest_physical_reservation_v39) other_reservation,
    (SELECT count(*)::int FROM clean.adb_collection_batches WHERE status='ACTIVE' OR run_day_index IS NOT NULL) batches,
    (SELECT count(*)::int FROM clean.adb_collection_subs WHERE ended_at IS NULL) subscriptions,
    (SELECT count(*)::int FROM clean.adb_incident_stop WHERE NOT resolved) incidents`)).rows[0];
  if(!q||Object.values(q).some(v=>Number(v)!==0))hold("NONZERO_RUNTIME_OR_INCIDENT");
}

async function readOriginalSnapshot(c:PoolClient){
  const auth=(await c.query(`SELECT authorization_id,manifest_sha256,calendar_hash,config_hash,code_sha,
    schema_version,phase6_start_date,enabled,revoked_at_utc,predecessor_evidence_ids
    FROM clean.adb_phase6_authorization WHERE singleton_key=true`)).rows;
  const calendar=(await c.query(`SELECT run_day_index,budget_day_id,calendar_hash,config_hash,frame_hash,
    scheduled_start_utc,date_utc,utc_slot,time_class,window_shape,evaluation_partition,
    crossover_group_id,crossover_period,pair_role,draw_type,slot_regions,anchor_icao,pair_airport_set,
    frozen_draw_seed,active_duration_minutes FROM clean.adb_phase6_calendar_day ORDER BY run_day_index`)).rows;
  const cycle=(await c.query(`SELECT manifest_sha256,cycle_api_ceiling,other_category_reserved_units,
    protected_api_floor_units,physically_reserved_units FROM clean.phase5_fids_cycle_budget_v39`)).rows;
  const utcBudget=(await c.query(`SELECT manifest_sha256,charge_day_utc,daily_api_ceiling,
    daily_other_reserved_units,physically_reserved_units FROM clean.phase5_fids_utc_charge_budget_v39
    ORDER BY charge_day_utc`)).rows;
  const release=(await c.query(`SELECT manifest_sha256,reviewed_source_request_grid_sha256,
    reviewed_provider_range_sha256,verified_provider_max_range_minutes,reviewed_category_budget_sha256,
    budget_release_mode,reviewed_cost_envelope_sha256 FROM clean.phase5_fids_seven_rest_release_v39`)).rows;
  const caps=(await c.query(`SELECT manifest_sha256,category,ceiling_units
    FROM clean.phase5_fids_cycle_rest_category_cap_v39 ORDER BY category`)).rows;
  const categoryDays=(await c.query(`SELECT manifest_sha256,charge_day_utc,category,planned_units
    FROM clean.phase5_fids_utc_rest_category_budget_v39 ORDER BY charge_day_utc,category`)).rows;
  if(auth.length!==1||calendar.length!==31||cycle.length!==1||release.length!==1||caps.length!==7||
    utcBudget.length<31||categoryDays.length!==utcBudget.length*7)hold("ORIGINAL_ROW_COUNTS");
  const a=auth[0];
  if(a.authorization_id!==P6_ORIGINAL_FROZEN_RELEASE.authorizationId||
    a.manifest_sha256!==P6_ORIGINAL_FROZEN_RELEASE.manifestSha256||
    a.calendar_hash!==P6_ORIGINAL_FROZEN_RELEASE.calendarSha256||
    a.config_hash!==P6_ORIGINAL_FROZEN_RELEASE.configSha256||
    a.enabled!==false||a.revoked_at_utc!==null||
    calendar.some(x=>x.calendar_hash!==P6_ORIGINAL_FROZEN_RELEASE.calendarSha256||
      x.config_hash!==P6_ORIGINAL_FROZEN_RELEASE.configSha256)||
    cycle[0].manifest_sha256!==P6_ORIGINAL_FROZEN_RELEASE.manifestSha256||
    Number(cycle[0].physically_reserved_units)!==0||
    utcBudget.some(x=>x.manifest_sha256!==P6_ORIGINAL_FROZEN_RELEASE.manifestSha256||
      Number(x.physically_reserved_units)!==0)||
    release[0].manifest_sha256!==P6_ORIGINAL_FROZEN_RELEASE.manifestSha256||
    caps.some(x=>x.manifest_sha256!==P6_ORIGINAL_FROZEN_RELEASE.manifestSha256)||
    categoryDays.some(x=>x.manifest_sha256!==P6_ORIGINAL_FROZEN_RELEASE.manifestSha256))
    hold("ORIGINAL_FROZEN_STATE_DRIFT");
  return {auth,calendar,cycle,utcBudget,release,caps,categoryDays};
}

export async function commitP6ProspectiveCalendarSuccessorOnce(
  pool:Pool,p:P6ProspectiveCalendarSuccessorPacket
){
  if(!pool||typeof pool.connect!=="function")hold("OWNER_POOL_REQUIRED");
  const c=await pool.connect(); let began=false,commitAttempted=false;
  try{
    await c.query("BEGIN ISOLATION LEVEL SERIALIZABLE");began=true;
    await c.query("SET LOCAL statement_timeout='30000ms'");
    await c.query("SET LOCAL lock_timeout='3000ms'");
    const who=(await c.query(`SELECT current_database() db,current_user actor,session_user session_actor,
      current_setting('server_version_num')::int ver,current_setting('transaction_read_only') ro,
      pg_is_in_recovery() replica,clock_timestamp() now_utc`)).rows[0];
    if(who?.db!=="neondb"||who.actor!==who.session_actor||who.ro!=="off"||
      who.replica!==false||who.ver<160000||who.ver>=170000)hold("OWNER_DB_IDENTITY");
    validateP6ProspectiveCalendarSuccessorPacket(p,new Date(who.now_utc));
    const lock=(await c.query("SELECT pg_try_advisory_xact_lock(hashtext('v39-phase6-provider-mutation')::bigint) ok")).rows[0];
    if(lock?.ok!==true)hold("PROVIDER_MUTATION_LOCK_BUSY");
    const tables=["adb_phase6_authorization","adb_phase6_calendar_day","adb_sampling_draw",
      "phase5_fids_cycle_budget_v39","phase5_fids_utc_charge_budget_v39",
      "phase5_fids_seven_rest_release_v39","phase5_fids_cycle_rest_category_cap_v39",
      "phase5_fids_utc_rest_category_budget_v39","phase5_fids_day_budget_v39",
      "phase5_fids_allowed_query_v39","phase5_fids_exact_query_partition_v39",
      "phase5_fids_physical_attempt_v39","phase5_other_rest_physical_reservation_v39",
      "adb_collection_batches","adb_collection_subs","adb_incident_stop","adb_collection_meta"];
    await c.query("LOCK TABLE "+tables.map(t=>"clean."+t).join(",")+" IN SHARE ROW EXCLUSIVE MODE");
    await exactZeroBlockers(c);
    const marker=(await c.query("SELECT key FROM clean.adb_collection_meta WHERE key=ANY($1::text[])",
      [[archiveKey(p.original.calendarSha256),transitionKey(p.successor.calendarSha256)]])).rows;
    if(marker.length!==0)hold("PRIOR_ARCHIVE_OR_TRANSITION_NO_REPLAY");
    const snapshot=await readOriginalSnapshot(c);
    const snapshotJson=JSON.stringify({schema:"v39.phase6.pre-successor-runtime-snapshot.v1",
      capturedAtUtc:utc(who.now_utc),original:p.original,rows:snapshot});
    const archive=(await c.query("INSERT INTO clean.adb_collection_meta(key,value) VALUES($1,$2)",
      [archiveKey(p.original.calendarSha256),snapshotJson]));
    if(archive.rowCount!==1)hold("ARCHIVE_WRITE");

    const s=p.successor;
    await c.query("DELETE FROM clean.phase5_fids_utc_rest_category_budget_v39 WHERE manifest_sha256=$1",[p.original.manifestSha256]);
    await c.query("DELETE FROM clean.phase5_fids_cycle_rest_category_cap_v39 WHERE manifest_sha256=$1",[p.original.manifestSha256]);
    await c.query("DELETE FROM clean.phase5_fids_seven_rest_release_v39 WHERE manifest_sha256=$1",[p.original.manifestSha256]);
    await c.query("DELETE FROM clean.phase5_fids_utc_charge_budget_v39 WHERE manifest_sha256=$1",[p.original.manifestSha256]);
    const delCycle=await c.query("DELETE FROM clean.phase5_fids_cycle_budget_v39 WHERE manifest_sha256=$1 AND physically_reserved_units=0",[p.original.manifestSha256]);
    if(delCycle.rowCount!==1)hold("OLD_CYCLE_NOT_EMPTY");

    for(const d of s.calendarDays){
      const q=await c.query(`UPDATE clean.adb_phase6_calendar_day SET
        budget_day_id=$2,calendar_hash=$3,config_hash=$4,frame_hash=$5,scheduled_start_utc=$6::timestamptz,
        date_utc=$7::date,utc_slot=$8,time_class=$9,window_shape=$10,evaluation_partition=$11,
        crossover_group_id=$12,crossover_period=$13,pair_role=$14,draw_type=$15,slot_regions=$16::jsonb,
        anchor_icao=$17,pair_airport_set=$18::jsonb,frozen_draw_seed=$19,active_duration_minutes=$20
        WHERE run_day_index=$1 AND calendar_hash=$21 AND config_hash=$22`,
        [d.runDayIndex,d.budgetDayId,s.calendarSha256,s.configSha256,d.frameSha256,d.startUtc,d.startUtc.slice(0,10),
         d.utcSlot,d.timeClass,d.windowShape,d.partition,d.pairId,d.crossoverPeriod,d.pairRole,d.drawType,
         JSON.stringify(d.slotRegions),d.anchorIcao,d.pairAirportSet===null?null:JSON.stringify(d.pairAirportSet),
         d.frozenDrawSeed,d.activeDurationMinutes,p.original.calendarSha256,p.original.configSha256]);
      if(q.rowCount!==1)hold("CALENDAR_UPDATE_NOT_EXACT");
    }
    const auth=await c.query(`UPDATE clean.adb_phase6_authorization SET
      authorization_id=$1,manifest_sha256=$2,calendar_hash=$3,config_hash=$4,code_sha=$5,
      phase6_start_date=$6::date,predecessor_evidence_ids=$7::jsonb
      WHERE singleton_key=true AND authorization_id=$8 AND manifest_sha256=$9 AND
      calendar_hash=$10 AND config_hash=$11 AND enabled=false AND revoked_at_utc IS NULL`,
      [s.authorizationId,s.manifestSha256,s.calendarSha256,s.configSha256,s.codeSha40,s.phase6StartDateUtc,
       JSON.stringify(s.predecessorEvidenceIds),p.original.authorizationId,p.original.manifestSha256,
       p.original.calendarSha256,p.original.configSha256]);
    if(auth.rowCount!==1)hold("AUTH_UPDATE_NOT_EXACT");

    await c.query(`INSERT INTO clean.phase5_fids_cycle_budget_v39
      (manifest_sha256,cycle_api_ceiling,other_category_reserved_units,protected_api_floor_units,physically_reserved_units)
      VALUES($1,$2,$3,$4,0)`,
      [s.manifestSha256,s.cycleBudget.cycleApiCeiling,s.cycleBudget.otherCategoryReservedUnits,s.cycleBudget.protectedApiFloorUnits]);
    for(const d of s.utcBudgets)await c.query(`INSERT INTO clean.phase5_fids_utc_charge_budget_v39
      (manifest_sha256,charge_day_utc,daily_api_ceiling,daily_other_reserved_units,physically_reserved_units)
      VALUES($1,$2::date,$3,$4,0)`,[s.manifestSha256,d.chargeDayUtc,d.dailyApiCeiling,d.dailyOtherReservedUnits]);
    await c.query(`INSERT INTO clean.phase5_fids_seven_rest_release_v39
      (manifest_sha256,reviewed_source_request_grid_sha256,reviewed_provider_range_sha256,
       verified_provider_max_range_minutes,reviewed_category_budget_sha256,budget_release_mode,reviewed_cost_envelope_sha256)
      VALUES($1,NULL,$2,$3,$4,'COST_UPPER_BOUND',$4)`,
      [s.manifestSha256,s.sevenRestRelease.reviewedProviderRangeSha256,
       s.sevenRestRelease.verifiedProviderMaxRangeMinutes,s.sevenRestRelease.reviewedCategoryBudgetSha256]);
    for(const x of s.cycleCategoryCaps)await c.query(`INSERT INTO clean.phase5_fids_cycle_rest_category_cap_v39
      (manifest_sha256,category,ceiling_units) VALUES($1,$2,$3)`,
      [s.manifestSha256,x.category,x.ceilingUnits]);
    for(const x of s.utcCategoryBudgets)await c.query(`INSERT INTO clean.phase5_fids_utc_rest_category_budget_v39
      (manifest_sha256,charge_day_utc,category,planned_units) VALUES($1,$2::date,$3,$4)`,
      [s.manifestSha256,x.chargeDayUtc,x.category,x.plannedUnits]);

    const stored=await c.query("INSERT INTO clean.adb_collection_meta(key,value) VALUES($1,$2)",
      [manifestKey(s.manifestSha256),s.manifestJson]);
    if(stored.rowCount!==1)hold("SUCCESSOR_MANIFEST_STORE");
    const receipt={schema:"v39.phase6.prospective-calendar-successor-transition.v1",
      status:"PROSPECTIVE_CALENDAR_SUCCESSOR_INSTALLED_DISABLED_NO_PROVIDER_NO_GO",
      originalManifestSha256:p.original.manifestSha256,originalCalendarSha256:p.original.calendarSha256,
      successorAuthorizationId:s.authorizationId,successorManifestSha256:s.manifestSha256,
      successorCalendarSha256:s.calendarSha256,successorConfigSha256:s.configSha256,
      archivedOriginalKey:archiveKey(p.original.calendarSha256),firstSourceUtc:s.firstSourceUtc,
      sourceTemplates:s.sourceTemplates,totalReservedUnits:s.totalReservedUnits,
      databaseAuthorizationEnabled:false,providerCalls:0,paidGo:false};
    const marked=await c.query("INSERT INTO clean.adb_collection_meta(key,value) VALUES($1,$2)",
      [transitionKey(s.calendarSha256),JSON.stringify(receipt)]);
    if(marked.rowCount!==1)hold("TRANSITION_MARKER");
    commitAttempted=true;await c.query("COMMIT");began=false;
    return receipt;
  }catch(e){
    if(began&&!commitAttempted)await c.query("ROLLBACK").catch(()=>{});
    if(commitAttempted)hold("UNKNOWN_COMMIT_NO_REPLAY_READBACK");
    throw e;
  }finally{c.release(commitAttempted&&began?new Error("P6_SUCCESSOR_COMMIT_UNKNOWN"):undefined);}
}

export async function verifyP6ProspectiveCalendarSuccessorReadOnly(
  pool:Pool,p:P6ProspectiveCalendarSuccessorPacket
){
  const c=await pool.connect();let began=false;
  try{
    await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");began=true;
    const who=(await c.query("SELECT current_database() db,current_user actor,session_user session_actor,current_setting('transaction_read_only') ro,clock_timestamp() t")).rows[0];
    if(who?.db!=="neondb"||who.actor!==who.session_actor||who.ro!=="on")hold("READBACK_SCOPE");
    const s=p.successor;
    const a=(await c.query(`SELECT authorization_id,manifest_sha256,calendar_hash,config_hash,code_sha,enabled,revoked_at_utc
      FROM clean.adb_phase6_authorization WHERE singleton_key=true`)).rows;
    const cal=(await c.query("SELECT count(*)::int n,min(scheduled_start_utc) first_start,count(DISTINCT calendar_hash)::int hashes FROM clean.adb_phase6_calendar_day")).rows[0];
    const cycle=(await c.query("SELECT manifest_sha256,physically_reserved_units FROM clean.phase5_fids_cycle_budget_v39")).rows;
    const meta=(await c.query("SELECT key,value FROM clean.adb_collection_meta WHERE key=ANY($1::text[])",
      [[archiveKey(p.original.calendarSha256),manifestKey(s.manifestSha256),transitionKey(s.calendarSha256)]])).rows;
    if(a.length!==1||a[0].authorization_id!==s.authorizationId||a[0].manifest_sha256!==s.manifestSha256||
      a[0].calendar_hash!==s.calendarSha256||a[0].config_hash!==s.configSha256||a[0].code_sha!==s.codeSha40||
      a[0].enabled!==false||a[0].revoked_at_utc!==null||cal?.n!==31||cal?.hashes!==1||
      utc(cal.first_start)!==P6_NOV20_SUCCESSOR_REVIEW.firstServiceUtc||
      cycle.length!==1||cycle[0].manifest_sha256!==s.manifestSha256||Number(cycle[0].physically_reserved_units)!==0||
      meta.length!==3||meta.find(x=>x.key===manifestKey(s.manifestSha256))?.value!==s.manifestJson)
      hold("READBACK_MISMATCH");
    await exactZeroBlockers(c);
    await c.query("ROLLBACK");began=false;
    return {status:"PROSPECTIVE_CALENDAR_SUCCESSOR_READONLY_MATCH_DISABLED_NO_GO",
      authorizationId:s.authorizationId,manifestSha256:s.manifestSha256,
      calendarSha256:s.calendarSha256,firstServiceUtc:P6_NOV20_SUCCESSOR_REVIEW.firstServiceUtc,
      originalSnapshotPreserved:true,authorizationEnabled:false,providerCalls:0,databaseWrites:0,paidGo:false};
  }finally{
    if(began)await c.query("ROLLBACK").catch(()=>{});
    c.release();
  }
}
