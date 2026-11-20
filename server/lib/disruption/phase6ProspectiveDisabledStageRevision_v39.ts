/**
 * Phase6 prospective revision of the already-commissioned DISABLED B0062/V0093
 * stage. This is intentionally not a cold-start writer and never deletes the
 * immutable historical cost envelope. It may move the singleton calendar/auth
 * pointer to a separately reviewed future stage only while no Phase6 source
 * query, physical reservation, sampling draw, batch or subscription exists.
 *
 * Packet A remains preserved in the original immutable private package and
 * stored manifest. The prior cost rows remain append-only evidence under their
 * old manifest SHA.
 */
import {createHash} from "node:crypto";
import type {Pool,PoolClient} from "pg";
import {compileP5InertB0062UtcStagePacket} from
 "./phase5B0062InertCalendarUtcBudgetStage_v39.mjs";
import {compileP5V0093CostOnlySevenRestReview} from
 "./phase5V0093CostOnlySevenRestFreezeWriter_v39.mjs";
import {inspectP5V0093IndependentExactPostStage} from
 "./phase5V0093IndependentPostStageReadback_v39.mjs";

const SHA=/^[0-9a-f]{64}$/;
const CODE=/^[0-9a-f]{40}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const H=3600000;
const hold=(s:string):never=>{throw Error("HOLD_P6_PROSPECTIVE_RESTAGE_"+s);};
const digest=(x:unknown)=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const rawDigest=(x:string)=>createHash("sha256").update(x,"utf8").digest("hex");
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const utcDate=(x:unknown)=>{
 const d=new Date(x as any);
 return Number.isFinite(d.getTime())?d.toISOString().slice(0,10):null;
};

export interface P6ProspectiveDisabledStageRevisionReviewV39{
 schema:"v39.phase6.prospective-disabled-stage-revision-review.v1";
 expectedOldStageInputSha256:string;
 expectedOldCostEnvelopeSha256:string;
 expectedNewStageInputSha256:string;
 expectedNewCostEnvelopeSha256:string;
 expectedOriginalFrozenManifestSha256:string;
 expectedNewManifestSha256:string;
 expectedPriorCodeSha40:string;
 expectedCurrentCodeSha40:string;
 reviewedCalendarRevisionEvidenceSha256:string;
 independentProspectiveRevisionApproved:true;
 originalScientificDesignPreserved:true;
 oldStageRemainsArchivedEvidence:true;
 noBackfillApproved:true;
}

type StageReview={
 expectedSignedStagePacketSha256:string;
 expectedExactWriterRole:string;
 independentCalendarTreatmentReviewApproved:true;
 independentProviderAccountAndRestBudgetReviewApproved:true;
 narrowPrelaunchOwnerApproved:true;
};
type FreezeReview={
 expectedStagedB0062PacketSha256:string;
 expectedSignedSevenCategoryCostSha256:string;
 expectedExactBudgetWriterRole:string;
 independentProspectiveCalendarAndTreatmentApproved:true;
 independentRealProviderRangeAndRestBudgetApproved:true;
 independentSourceContentsRightsForIntendedUseApproved:false;
 sourceUseDeferredToPhase6Activation:true;
 exactRestrictedNoProviderBudgetFreezeApproved:true;
};

function scientificDayIdentity(d:any){
 return {
  runDayIndex:d.runDayIndex,utcSlot:d.utcSlot,timeClass:d.timeClass,
  windowShape:d.windowShape,partition:d.partition,
  pairId:d.pairId,crossoverPeriod:d.crossoverPeriod,pairRole:d.pairRole,
  drawType:d.drawType,slotRegions:d.slotRegions,anchorIcao:d.anchorIcao,
  pairAirportSet:d.pairAirportSet,frozenDrawSeed:d.frozenDrawSeed
 };
}
function exactManifest(raw:string,expectedSha:string,input:any,originalManifestSha:string){
 if(typeof raw!=="string"||Buffer.byteLength(raw)<120||Buffer.byteLength(raw)>2*1024*1024||
    !SHA.test(expectedSha)||rawDigest(raw)!==expectedSha)
  hold("NEW_MANIFEST_BYTES_NOT_EXACT");
 let m:any;try{m=JSON.parse(raw);}catch{hold("NEW_MANIFEST_INVALID_JSON");}
 if(!m||typeof m!=="object"||Array.isArray(m)||
    typeof m.schema!=="string"||!m.schema.startsWith("v39.")||
    m.scientificFreezeApproved!==true||
    m.originalFrozenPacketPreserved!==true||
    m.originalFrozenManifestSha256!==originalManifestSha||
    m.sourceRightsApproved!==false||
    m.sourceUseDeferredToPhase6Activation!==true||
    m.phase6PaidGo!==false||
    m.calendarRowsSha256!==input.calendarSha256||
    m.configSha256!==input.configSha256)
  hold("NEW_MANIFEST_NOT_REVIEWED_PROSPECTIVE_REVISION");
 return m;
}

export function compileP6ProspectiveDisabledStageRevisionV39(input:{
 oldInput:any;oldStageReview:StageReview;oldFreezeReview:FreezeReview;
 newInput:any;newStageReview:StageReview;newFreezeReview:FreezeReview;
 newManifestRaw:string;review:P6ProspectiveDisabledStageRevisionReviewV39;
 now?:Date;
}){
 const r=input.review;
 if(!r||r.schema!=="v39.phase6.prospective-disabled-stage-revision-review.v1"||
    ![r.expectedOldStageInputSha256,r.expectedOldCostEnvelopeSha256,
      r.expectedNewStageInputSha256,r.expectedNewCostEnvelopeSha256,
      r.expectedOriginalFrozenManifestSha256,r.expectedNewManifestSha256,
      r.reviewedCalendarRevisionEvidenceSha256].every(x=>SHA.test(x??""))||
    !CODE.test(r.expectedPriorCodeSha40??"")||!CODE.test(r.expectedCurrentCodeSha40??"")||
    r.independentProspectiveRevisionApproved!==true||
    r.originalScientificDesignPreserved!==true||
    r.oldStageRemainsArchivedEvidence!==true||
    r.noBackfillApproved!==true)
  hold("REVIEW_NOT_EXACTLY_APPROVED");
 if(digest(input.oldInput)!==r.expectedOldStageInputSha256||
    digest(input.newInput)!==r.expectedNewStageInputSha256||
    input.oldInput.codeSha40!==r.expectedPriorCodeSha40||
    input.newInput.codeSha40!==r.expectedCurrentCodeSha40)
  hold("STAGE_INPUT_OR_CODE_SHA_DRIFT");

 const oldCompiled=compileP5V0093CostOnlySevenRestReview(
  input.oldInput,input.oldStageReview,input.oldFreezeReview);
 const next=compileP5V0093CostOnlySevenRestReview(
  input.newInput,input.newStageReview,input.newFreezeReview);
 if(oldCompiled.cost.costOnlyCategoryDraftSha256!==r.expectedOldCostEnvelopeSha256||
    next.cost.costOnlyCategoryDraftSha256!==r.expectedNewCostEnvelopeSha256||
    oldCompiled.staged.manifestSha256!==r.expectedOriginalFrozenManifestSha256||
    next.staged.manifestSha256!==r.expectedNewManifestSha256)
  hold("COMPILED_STAGE_OR_COST_SHA_DRIFT");

 exactManifest(input.newManifestRaw,r.expectedNewManifestSha256,input.newInput,
  r.expectedOriginalFrozenManifestSha256);

 const a=oldCompiled.staged,b=next.staged;
 if(a.authorizationId!==b.authorizationId||
    a.frameSha256!==b.frameSha256||
    !same(a.alertSafety,b.alertSafety)||
    a.calendarDays.length!==31||b.calendarDays.length!==31||
    input.oldInput.predecessorEvidenceIds.some(
      (id:string,i:number)=>input.newInput.predecessorEvidenceIds[i]!==id))
  hold("FROZEN_IDENTITY_ALERT_OR_PREDECESSOR_CHANGED");

 let changed=0;
 for(let i=0;i<31;i++){
  const oldDay=a.calendarDays[i],newDay=b.calendarDays[i];
  if(!same(scientificDayIdentity(oldDay),scientificDayIdentity(newDay)))
   hold("SCIENTIFIC_DAY_IDENTITY_CHANGED");
  const delta=Date.parse(newDay.startUtc)-Date.parse(oldDay.startUtc);
  if(!Number.isFinite(delta)||delta<0||delta>24*H)
   hold("DATE_REVISION_OUTSIDE_REVIEWED_FORWARD_BOUND");
  if(delta!==0)changed++;
 }
 // Current reviewed case2 is intentionally minimal: only Day 1 moves +24h.
 if(changed!==1||
    Date.parse(b.calendarDays[0].startUtc)-Date.parse(a.calendarDays[0].startUtc)!==24*H||
    b.calendarDays.slice(1).some((d:any,i:number)=>d.startUtc!==a.calendarDays[i+1].startUtc))
  hold("NOT_EXACT_REVIEWED_DAY1_PLUS_24H_REVISION");

 const now=(input.now??new Date()).getTime();
 if(!Number.isFinite(now)||!UTC.test(b.calendarDays[0].startUtc)||
    Date.parse(b.calendarDays[0].startUtc)-now<=24*H+50*60000)
  hold("FIRST_PROSPECTIVE_T24_WINDOW_ALREADY_DUE");
 if(b.phase6PaidGo!==false||next.phase6PaidGo!==false||
    next.cost.sourceRequestGridSha256!==null)
  hold("REVISION_IS_NOT_INERT_COST_ONLY");
 return Object.freeze({
  schema:"v39.phase6.prospective-disabled-stage-revision.v1" as const,
  old:oldCompiled,new:next,
  newManifestSha256:r.expectedNewManifestSha256,
  changedParentDays:1 as const,
  firstOldServiceUtc:a.calendarDays[0].startUtc,
  firstNewServiceUtc:b.calendarDays[0].startUtc,
  sourceQueriesExistingRequired:0 as const,
  providerCalls:0 as const,phase6PaidGo:false as const
 });
}

const LOCK_TABLES=[
 "clean.adb_phase6_authorization","clean.adb_phase6_calendar_day",
 "clean.phase5_fids_cycle_budget_v39","clean.phase5_fids_utc_charge_budget_v39",
 "clean.phase5_fids_seven_rest_release_v39","clean.phase5_fids_cycle_rest_category_cap_v39",
 "clean.phase5_fids_utc_rest_category_budget_v39",
 "clean.adb_sampling_draw","clean.phase5_fids_day_budget_v39",
 "clean.phase5_fids_allowed_query_v39","clean.phase5_fids_exact_query_partition_v39",
 "clean.phase5_fids_physical_attempt_v39","clean.phase5_other_rest_physical_reservation_v39",
 "clean.adb_collection_batches","clean.adb_collection_subs","clean.adb_collection_meta"
];
async function one(c:PoolClient,sql:string,args:any[]=[]){
 const rows=(await c.query(sql,args)).rows;
 if(rows.length!==1)hold("DB_CARDINALITY_NOT_ONE");
 return rows[0];
}
function num(x:any){return Number.isSafeInteger(Number(x))?Number(x):NaN;}

async function assertOldDisabledVirgin(c:PoolClient,compiled:any){
 const p=compiled.staged,cost=compiled.cost;
 const auth=await one(c,
  "SELECT authorization_id,manifest_sha256,calendar_hash,config_hash,code_sha,enabled,revoked_at_utc "+
  "FROM clean.adb_phase6_authorization");
 if(auth.authorization_id!==p.authorizationId||auth.manifest_sha256!==p.manifestSha256||
    auth.calendar_hash!==p.calendarSha256||auth.config_hash!==p.configSha256||
    auth.code_sha!==p.codeSha40||auth.enabled!==false||auth.revoked_at_utc!==null)
  hold("OLD_DISABLED_AUTH_NOT_IDENTICAL");
 const state=await one(c,"SELECT "+
  "(SELECT COUNT(*)::int FROM clean.adb_phase6_calendar_day) calendar,"+
  "(SELECT COUNT(*)::int FROM clean.adb_sampling_draw) draws,"+
  "(SELECT COUNT(*)::int FROM clean.phase5_fids_day_budget_v39) day_budget,"+
  "(SELECT COUNT(*)::int FROM clean.phase5_fids_allowed_query_v39) allowed_query,"+
  "(SELECT COUNT(*)::int FROM clean.phase5_fids_exact_query_partition_v39) partitions,"+
  "(SELECT COUNT(*)::int FROM clean.phase5_fids_physical_attempt_v39) attempts,"+
  "(SELECT COUNT(*)::int FROM clean.phase5_other_rest_physical_reservation_v39) other_attempts,"+
  "(SELECT COUNT(*)::int FROM clean.adb_collection_batches) batches,"+
  "(SELECT COUNT(*)::int FROM clean.adb_collection_subs) subs");
 if(num(state.calendar)!==31||
    ["draws","day_budget","allowed_query","partitions","attempts","other_attempts","batches","subs"].
      some(k=>num(state[k])!==0))
  hold("PHASE6_NOT_VIRGIN_DISABLED_STAGE");
 const cal=(await c.query(
  "SELECT run_day_index,calendar_hash,config_hash,frame_hash,scheduled_start_utc "+
  "FROM clean.adb_phase6_calendar_day ORDER BY run_day_index")).rows;
 if(cal.length!==31||cal.some((x:any,i:number)=>
    num(x.run_day_index)!==i+1||x.calendar_hash!==p.calendarSha256||
    x.config_hash!==p.configSha256||x.frame_hash!==p.frameSha256||
    new Date(x.scheduled_start_utc).toISOString()!==p.calendarDays[i].startUtc))
  hold("OLD_CALENDAR_NOT_IDENTICAL");
 const reserve=await one(c,"SELECT "+
  "(SELECT COALESCE(SUM(physically_reserved_units),0)::bigint FROM clean.phase5_fids_cycle_budget_v39 WHERE manifest_sha256=$1) cycle,"+
  "(SELECT COALESCE(SUM(physically_reserved_units),0)::bigint FROM clean.phase5_fids_utc_charge_budget_v39 WHERE manifest_sha256=$1) utc,"+
  "(SELECT COALESCE(SUM(physically_reserved_units),0)::bigint FROM clean.phase5_fids_utc_rest_category_budget_v39 WHERE manifest_sha256=$1) cat",
  [p.manifestSha256]);
 if([reserve.cycle,reserve.utc,reserve.cat].some(x=>Number(x)!==0))
  hold("OLD_STAGE_HAS_PHYSICAL_RESERVATIONS");
 const rel=await one(c,"SELECT reviewed_cost_envelope_sha256,budget_release_mode "+
  "FROM clean.phase5_fids_seven_rest_release_v39 WHERE manifest_sha256=$1",[p.manifestSha256]);
 if(rel.budget_release_mode!=="COST_UPPER_BOUND"||
    rel.reviewed_cost_envelope_sha256!==cost.costOnlyCategoryDraftSha256)
  hold("OLD_COST_ENVELOPE_NOT_IDENTICAL");
}

async function insertNewCostRows(c:PoolClient,p:any,cost:any){
 await c.query("INSERT INTO clean.phase5_fids_cycle_budget_v39 "+
  "(manifest_sha256,cycle_api_ceiling,other_category_reserved_units,protected_api_floor_units,physically_reserved_units) "+
  "VALUES($1,$2,$3,$4,0)",
  [p.manifestSha256,cost.cycleApiCeiling,cost.cycleOtherReservedUnits,cost.protectedApiFloorUnits]);
 for(const d of cost.days)
  await c.query("INSERT INTO clean.phase5_fids_utc_charge_budget_v39 "+
   "(manifest_sha256,charge_day_utc,daily_api_ceiling,daily_other_reserved_units,physically_reserved_units) "+
   "VALUES($1,$2::date,$3,$4,0)",
   [p.manifestSha256,d.chargeDayUtc,d.dailyApiCeiling,d.dailyOtherReservedUnits]);
 await c.query("INSERT INTO clean.phase5_fids_seven_rest_release_v39 "+
  "(manifest_sha256,reviewed_source_request_grid_sha256,reviewed_provider_range_sha256,"+
  "verified_provider_max_range_minutes,reviewed_category_budget_sha256,budget_release_mode,reviewed_cost_envelope_sha256) "+
  "VALUES($1,NULL,$2,$3,$4,'COST_UPPER_BOUND',$4)",
  [p.manifestSha256,cost.reviewedProviderRangeEvidenceSha256,
   cost.providerMaxRangeMinutes,cost.costOnlyCategoryDraftSha256]);
 for(const x of cost.categoryCaps)
  await c.query("INSERT INTO clean.phase5_fids_cycle_rest_category_cap_v39(manifest_sha256,category,ceiling_units) VALUES($1,$2,$3)",
   [p.manifestSha256,x.category,x.ceilingUnits]);
 for(const d of cost.days)for(const x of d.categoryRows)
  await c.query("INSERT INTO clean.phase5_fids_utc_rest_category_budget_v39 "+
   "(manifest_sha256,charge_day_utc,category,planned_units,physically_reserved_units) VALUES($1,$2::date,$3,$4,0)",
   [p.manifestSha256,d.chargeDayUtc,x.category,x.plannedUnits]);
}

export async function commitP6ProspectiveDisabledStageRevisionOnceV39(
 pool:Pool,input:Parameters<typeof compileP6ProspectiveDisabledStageRevisionV39>[0]
){
 if(!pool||typeof pool.connect!=="function")hold("OWNER_POOL_REQUIRED");
 const compiled=compileP6ProspectiveDisabledStageRevisionV39(input);
 const old=compiled.old.staged,next=compiled.new.staged,cost=compiled.new.cost;
 const c=await pool.connect();let begun=false,commitAttempted=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL SERIALIZABLE");begun=true;
  await c.query("SET LOCAL statement_timeout='30000ms'");
  await c.query("SET LOCAL lock_timeout='3000ms'");
  const sys=await one(c,"SELECT current_database() db,current_user actor,session_user session_actor,"+
   "current_setting('server_version_num')::int ver,current_setting('transaction_read_only') ro,"+
   "pg_is_in_recovery() replica,clock_timestamp() now_utc");
  if(sys.db!=="neondb"||sys.actor!==sys.session_actor||sys.ro!=="off"||
     sys.replica!==false||num(sys.ver)<160000||num(sys.ver)>=170000)
    hold("NOT_EXISTING_OWNER_PRIMARY_PG16");
  const lock=await one(c,"SELECT pg_try_advisory_xact_lock(hashtext('v39-phase6-provider-mutation')::bigint) ok");
  if(lock.ok!==true)hold("PROVIDER_OWNER_LOCK_BUSY");
  await c.query("LOCK TABLE "+LOCK_TABLES.join(",")+" IN SHARE ROW EXCLUSIVE MODE");
  await assertOldDisabledVirgin(c,compiled.old);
  // Re-check the prospective window using the DB clock after all mutation
  // surfaces are locked.
  compileP6ProspectiveDisabledStageRevisionV39({...input,now:new Date(sys.now_utc)});

  const manifestKey="phase5_frozen_manifest:"+next.manifestSha256;
  const priorManifest=await c.query("SELECT value FROM clean.adb_collection_meta WHERE key=$1",[manifestKey]);
  if(priorManifest.rowCount!==0)hold("NEW_MANIFEST_OR_REVISION_ALREADY_PRESENT");

  // Append the new cost envelope under the NEW manifest. The old V0093
  // rows remain untouched and immutable as audit evidence.
  await insertNewCostRows(c,next,cost);

  for(const d of next.calendarDays){
   const changed=await c.query("UPDATE clean.adb_phase6_calendar_day SET "+
    "budget_day_id=$2,calendar_hash=$3,config_hash=$4,date_utc=$5::date,utc_slot=$6,time_class=$7,"+
    "window_shape=$8,evaluation_partition=$9,crossover_group_id=$10,crossover_period=$11,pair_role=$12,"+
    "draw_type=$13,slot_regions=$14::jsonb,anchor_icao=$15,pair_airport_set=$16::jsonb,"+
    "frozen_draw_seed=$17,frozen_at_utc=clock_timestamp(),scheduled_start_utc=$18::timestamptz,"+
    "active_duration_minutes=$19,frame_hash=$20 WHERE run_day_index=$1 AND calendar_hash=$21 AND config_hash=$22",
    [d.runDayIndex,d.budgetDayId,next.calendarSha256,next.configSha256,utcDate(d.startUtc),
     d.utcSlot,d.timeClass,d.windowShape,d.partition,d.pairId,d.crossoverPeriod,d.pairRole,d.drawType,
     JSON.stringify(d.slotRegions),d.anchorIcao,d.pairAirportSet===null?null:JSON.stringify(d.pairAirportSet),
     d.frozenDrawSeed,d.startUtc,d.windowShape==="up-to-6h"?360:240,next.frameSha256,
     old.calendarSha256,old.configSha256]);
   if(changed.rowCount!==1)hold("CALENDAR_ATOMIC_UPDATE_NOT_EXACT");
  }
  const a=next.alertSafety;
  const auth=await c.query("UPDATE clean.adb_phase6_authorization SET "+
   "authorization_id=$1,manifest_sha256=$2,calendar_hash=$3,config_hash=$4,code_sha=$5,"+
   "phase6_start_date=$6::date,predecessor_evidence_ids=$7::jsonb,authorized_at_utc=clock_timestamp(),"+
   "unsettled_burst_margin_credits=$8,protected_alert_floor=$9,start_admission_tolerance_seconds=$10,"+
   "phase6_alert_spend_ceiling=$11,daily_soft_stop_margin_credits=$12,production_reconcile_tolerance_credits=$13,"+
   "safety_watchdog_poll_ms=$14,settlement_initial_wait_seconds=$15,settlement_poll_interval_seconds=$16,"+
   "settlement_stable_read_count=$17,settlement_timeout_seconds=$18 "+
   "WHERE singleton_key=true AND enabled=false AND revoked_at_utc IS NULL AND authorization_id=$19 "+
   "AND manifest_sha256=$20 AND calendar_hash=$21 AND config_hash=$22 AND code_sha=$23",
   [next.authorizationId,next.manifestSha256,next.calendarSha256,next.configSha256,next.codeSha40,
    next.phase6StartDateUtc,JSON.stringify(next.predecessorEvidenceIds),
    a.unsettledBurstMarginCredits,a.protectedAlertFloorCredits,a.startAdmissionToleranceSeconds,
    a.alertRunSpendCeilingCredits,a.dailySoftStopMarginCredits,a.productionReconcileToleranceCredits,
    a.safetyWatchdogPollMs,a.settlementInitialWaitSeconds,a.settlementPollIntervalSeconds,
    a.settlementStableReadCount,a.settlementTimeoutSeconds,
    old.authorizationId,old.manifestSha256,old.calendarSha256,old.configSha256,old.codeSha40]);
  if(auth.rowCount!==1)hold("DISABLED_AUTH_ATOMIC_UPDATE_NOT_EXACT");

  await c.query("INSERT INTO clean.adb_collection_meta(key,value) VALUES($1,$2)",
   [manifestKey,input.newManifestRaw]);
  const receipt={
   schema:"v39.phase6.prospective-disabled-stage-revision-receipt.v1",
   status:"DISABLED_STAGE_MOVED_PROSPECTIVELY_NO_SOURCE_NO_PAID_GO",
   authorizationId:next.authorizationId,
   oldManifestSha256:old.manifestSha256,newManifestSha256:next.manifestSha256,
   oldCalendarSha256:old.calendarSha256,newCalendarSha256:next.calendarSha256,
   oldConfigSha256:old.configSha256,newConfigSha256:next.configSha256,
   oldCodeSha:old.codeSha40,newCodeSha:next.codeSha40,
   oldStagePacketSha256:old.stagePacketSha256,newStagePacketSha256:next.stagePacketSha256,
   oldCostEnvelopeSha256:compiled.old.cost.costOnlyCategoryDraftSha256,
   newCostEnvelopeSha256:cost.costOnlyCategoryDraftSha256,
   oldCostRowsPreserved:true,changedParentDays:1,
   firstOldServiceUtc:compiled.firstOldServiceUtc,firstNewServiceUtc:compiled.firstNewServiceUtc,
   providerCalls:0,databaseAuthorizationEnabled:false,databaseWrites:"bounded-atomic-revision",
   phase6PaidGo:false
  };
  const marker="phase6_disabled_stage_revision:"+next.stagePacketSha256;
  await c.query("INSERT INTO clean.adb_collection_meta(key,value) VALUES($1,$2)",[marker,JSON.stringify(receipt)]);
  commitAttempted=true;await c.query("COMMIT");begun=false;
  return receipt;
 }catch(e){
  if(begun&&!commitAttempted)await c.query("ROLLBACK").catch(()=>{});
  if(commitAttempted)hold("UNKNOWN_COMMIT_DO_NOT_REPLAY_READONLY_RECONCILE");
  throw e;
 }finally{c.release(commitAttempted&&begun?new Error("P6_RESTAGE_COMMIT_UNKNOWN"):undefined);}
}

export async function verifyP6ProspectiveDisabledStageRevisionReadOnlyV39(
 pool:Pool,input:Parameters<typeof compileP6ProspectiveDisabledStageRevisionV39>[0],
 receipt:Awaited<ReturnType<typeof commitP6ProspectiveDisabledStageRevisionOnceV39>>
){
 const compiled=compileP6ProspectiveDisabledStageRevisionV39(input);
 const fresh=await inspectP5V0093IndependentExactPostStage(
  pool,input.newInput,input.newStageReview,input.newFreezeReview);
 if(fresh.status!=="INDEPENDENT_EXACT_B0062_V0093_POST_STAGE_READONLY_MATCH_NO_GO"||
    fresh.authorizationEnabled!==false||
    fresh.exactReviewedStagePacketSha256!==compiled.new.staged.stagePacketSha256||
    fresh.exactReviewedCostEnvelopeSha256!==compiled.new.cost.costOnlyCategoryDraftSha256)
  hold("INDEPENDENT_NEW_STAGE_READBACK_NOT_EXACT");
 const c=await pool.connect();let begun=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");begun=true;
  const marker=await c.query("SELECT value FROM clean.adb_collection_meta WHERE key=$1",
   ["phase6_disabled_stage_revision:"+compiled.new.staged.stagePacketSha256]);
  const oldCost=await c.query("SELECT reviewed_cost_envelope_sha256 FROM clean.phase5_fids_seven_rest_release_v39 WHERE manifest_sha256=$1",
   [compiled.old.staged.manifestSha256]);
  if(marker.rows.length!==1||marker.rows[0].value!==JSON.stringify(receipt)||
     oldCost.rows.length!==1||
     oldCost.rows[0].reviewed_cost_envelope_sha256!==compiled.old.cost.costOnlyCategoryDraftSha256)
    hold("REVISION_MARKER_OR_ARCHIVED_OLD_COST_MISSING");
  await c.query("ROLLBACK");begun=false;
  return {status:"P6_PROSPECTIVE_DISABLED_STAGE_REVISION_READBACK_PASS_NO_GO" as const,
   exactNewStage:true,archivedOldCostPreserved:true,verifiedReadOnly:true,
   providerCalls:0,databaseWrites:0,phase6PaidGo:false};
 }finally{
  if(begun)await c.query("ROLLBACK").catch(()=>{});
  c.release();
 }
}
