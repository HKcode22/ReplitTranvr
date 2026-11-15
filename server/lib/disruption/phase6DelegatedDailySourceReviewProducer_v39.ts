/**
 * Read-only daily review producer under a separately approved, exact immutable
 * delegation policy. Never selects airports or changes query clocks. The
 * policy pins all 31 day-plan hashes, the eligible airport timezone catalog,
 * and the approved scientific, rights, release and budget scope.
 *
 * The returned packet is a delegated automated review, NOT fresh human
 * approval or a legal rights verdict. Protected runner commissioning and
 * durable retention of the exact emitted bytes are separate obligations.
 */
import {createHash} from "node:crypto";
import type {Pool} from "pg";
import {verifyPreparedDailyDraw,type PreparedDayForReadback,type PreparedDrawRow}
 from "./phase5EarlyPreselectionReadback_v39";
import {readCommittedP5DayCandidateGrid,type P5CommittedDayReadonlyScope}
 from "./phase5CommittedDayGridReadonly_v39";
import {planP5Stage8FromCommittedDayReadback,type P5Stage8SourceReviewWithoutCopiedDraw}
 from "./phase5V0079DailyPreparedQueryProposals_v39";
import {phase5Stage9ExactWholeUnit} from "./phase5Stage9V0082AtomicSegmentedDayPrepare_v39";
import type {P5SignedOneDayPreparePacket}
 from "../../../scripts/v39_phase5_one_signed_day_source_prepare_github_owner_v39";

const SHA=/^[a-f0-9]{64}$/,CODE=/^[a-f0-9]{40}$/;
const hold=(s:string):never=>{throw Error("HOLD_P6_DAILY_REVIEW_PRODUCER_"+s);};
const hash=(b:Buffer|string)=>createHash("sha256").update(b).digest("hex");
const digest=(x:unknown)=>hash(JSON.stringify(x));
const at=(x:unknown)=>{
 const d=x instanceof Date?x:new Date(String(x));
 if(!Number.isFinite(d.getTime()))hold("INVALID_DATABASE_CLOCK");
 return d.toISOString();
};
type Template=Pick<P5CommittedDayReadonlyScope,"templates"|"reviewedRefreshTiming"|"reviewedSegmentedSource"|"reviewedOrdinaryDayEnvelope">;
type DayPlan=Template&{
 schema:"v39.phase6.reviewed-future-day-source-plan.v1";
 runDayIndex:number;expectedServiceStartUtc:string;
 expectedDrawType:"NEW_TEMPLATE"|"PAIR_REPLAY";
 /** Fixed paired candidates must match all four actual saved ICAOs.
  * Ordinary days instead require the existing independent shape/washout guard. */
 pairedIcaos:Record<"HUB"|"MID_A"|"MID_B"|"REGIONAL",string>|null;
};
type Policy={
 schema:"v39.phase6.delegated-daily-source-review-policy.v1";
 approvedCodeSha:string;manifestSha256:string;calendarSha256:string;configSha256:string;
 frameSha256:string;releaseSha256:string;rightsSha256:string;providerContractSha256:string;
 reviewed31DaySourceRequestGridSha256:string;reviewedCategoryBudgetSha256:string;
 expectedPrepareRole:string;validFromUtc:string;validUntilUtc:string;
 maxQueriesPerDay:number;dailyRestCeiling:number;cycleRestCeiling:number;
 minimumProtectedFloor:number;providerApiVersion:string;fidsProtocolVersion:string;
 airportFrames:{icao:string;ianaTimezone:string}[];
 dayPlanSha256s:{runDayIndex:number;sha256:string}[];
 delegatedDailyPacketProductionApproved:true;
};
type Pins={
 independent31DayDelegationPolicyApproved:true;expectedPolicySha256:string;
 expectedReviewedMainSha:string;expectedRunDayIndex:number;
 noProviderCredentialsInReviewer:true;existingPaidDispatchApproved:false;
};
function parse<T>(b:Buffer,max:number,sha:string):T{
 if(!Buffer.isBuffer(b)||b.length<100||b.length>max||!SHA.test(sha??"")||hash(b)!==sha)
  hold("EXACT_APPROVAL_BYTES_MISMATCH");
 try{return JSON.parse(b.toString("utf8")) as T;}catch{return hold("APPROVAL_JSON_INVALID");}
}
const SLOTS=["HUB","MID_A","MID_B","REGIONAL"] as const;
const CATS=["FIDS_BASE_UNITS","FIDS_SPLIT_UNITS","FIDS_RETRY_UNIT_BUDGET",
 "VALIDATION_UNIT_BUDGET","OUTCOME_REST_UNIT_BUDGET","HISTORY_BOOTSTRAP_UNIT_BUDGET",
 "DIAGNOSTIC_UNIT_BUDGET"];
const int=phase5Stage9ExactWholeUnit;
export async function produceP6DelegatedDailySourceReview({
 readPool,policyBytes,dayPlanBytes,pins
}:{
 readPool:Pick<Pool,"connect">;policyBytes:Buffer;dayPlanBytes:Buffer;pins:Pins
}){
 if(!pins||pins.independent31DayDelegationPolicyApproved!==true||
    pins.noProviderCredentialsInReviewer!==true||pins.existingPaidDispatchApproved!==false||
    !CODE.test(pins.expectedReviewedMainSha??"")||!Number.isSafeInteger(pins.expectedRunDayIndex)||
    pins.expectedRunDayIndex<1||pins.expectedRunDayIndex>31||
    !readPool||typeof readPool.connect!=="function")
  hold("NO_SEPARATE_REVIEWER_SCOPE");
 const p=parse<Policy>(policyBytes,500000,pins.expectedPolicySha256);
 if(p?.schema!=="v39.phase6.delegated-daily-source-review-policy.v1"||
    p.delegatedDailyPacketProductionApproved!==true||p.approvedCodeSha!==pins.expectedReviewedMainSha||
    ![p.manifestSha256,p.calendarSha256,p.configSha256,p.frameSha256,p.releaseSha256,
      p.rightsSha256,p.providerContractSha256,p.reviewed31DaySourceRequestGridSha256,
      p.reviewedCategoryBudgetSha256].every(x=>SHA.test(x??""))||
    !/^phase5_fids_prepare_[a-z0-9_]{6,42}$/.test(p.expectedPrepareRole??"")||
    !int(p.maxQueriesPerDay,12,384)||!int(p.dailyRestCeiling,2,1900)||
    !int(p.cycleRestCeiling,2,50000)||!int(p.minimumProtectedFloor,0,p.cycleRestCeiling)||
    !/^[a-zA-Z0-9._-]{2,50}$/.test(p.providerApiVersion??"")||
    !/^[a-zA-Z0-9._-]{2,50}$/.test(p.fidsProtocolVersion??"")||
    !Array.isArray(p.dayPlanSha256s)||p.dayPlanSha256s.length!==31||
    p.dayPlanSha256s.some((d,i)=>d?.runDayIndex!==i+1||!SHA.test(d.sha256??""))||
    !Array.isArray(p.airportFrames)||p.airportFrames.length<4||p.airportFrames.length>2000||
    p.airportFrames.some(f=>!f||! /^[A-Z]{4}$/.test(f.icao??"")||
      typeof f.ianaTimezone!=="string"||f.ianaTimezone.length>80)||
    new Set(p.airportFrames.map(f=>f.icao)).size!==p.airportFrames.length)
  hold("INCOMPLETE_INDEPENDENT_31_DAY_POLICY");
 const plan=parse<DayPlan>(dayPlanBytes,500000,p.dayPlanSha256s[pins.expectedRunDayIndex-1].sha256);
 if(plan?.schema!=="v39.phase6.reviewed-future-day-source-plan.v1"||
    plan.runDayIndex!==pins.expectedRunDayIndex||
    !["NEW_TEMPLATE","PAIR_REPLAY"].includes(plan.expectedDrawType)||
    !plan.reviewedSegmentedSource||!plan.reviewedRefreshTiming||
    !Array.isArray(plan.templates)||plan.templates.length<12||plan.templates.length>p.maxQueriesPerDay||
    (plan.pairedIcaos===null?!plan.reviewedOrdinaryDayEnvelope:
      !plan.pairedIcaos||plan.reviewedOrdinaryDayEnvelope!==undefined||
      SLOTS.some(s=>! /^[A-Z]{4}$/.test(plan.pairedIcaos![s]??""))||
      new Set(SLOTS.map(s=>plan.pairedIcaos![s])).size!==4))
  hold("UNAPPROVED_DAILY_PLAN_OR_WASHOUT_SCOPE");
 const from=at(p.validFromUtc),until=at(p.validUntilUtc);
 if(from!==p.validFromUtc||until!==p.validUntilUtc||until<=from||
    at(plan.expectedServiceStartUtc)!==plan.expectedServiceStartUtc)
  hold("POLICY_DATE_INVALID");
 // First restricted snapshot obtains the actual immutable draw digest and
 // current exact physical UTC budget counters. Stage7 independently repeats
 // the draw/calendar/authorization and cutoff validation before returning.
 const client=await readPool.connect();
 let tx=false;
 let readScope!:P5CommittedDayReadonlyScope,sourceReview!:P5Stage8SourceReviewWithoutCopiedDraw;
 let observed:string;
 try{
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
  await client.query("SET LOCAL statement_timeout='12000ms'");
  await client.query("SET LOCAL lock_timeout='2000ms'");
  const id=await client.query("SELECT current_database() db,current_user actor,"+
   "current_setting('server_version_num')::int ver,current_setting('transaction_read_only') ro,"+
   "pg_is_in_recovery() replica,clock_timestamp() at,"+
   "has_table_privilege(current_user,'clean.phase5_fids_physical_attempt_v39','INSERT') paid");
  const a=id.rows[0];observed=at(a?.at);
  if(id.rowCount!==1||a.db!=="neondb"||a.actor!==p.expectedPrepareRole||
     a.ver<160000||a.ver>=170000||a.ro!=="on"||a.replica!==false||a.paid!==false||
     observed<from||observed>=until)
   hold("RESTRICTED_REVIEWER_OR_POLICY_CLOCK");
  const c=await client.query("SELECT run_day_index,scheduled_start_utc,frozen_draw_seed,draw_type,"+
   "anchor_icao,slot_regions,pair_airport_set,calendar_hash,config_hash,frame_hash,window_shape "+
   "FROM clean.adb_phase6_calendar_day WHERE run_day_index=$1",[plan.runDayIndex]);
  const x=c.rows[0];
  if(c.rowCount!==1||at(x.scheduled_start_utc)!==plan.expectedServiceStartUtc||
     x.draw_type!==plan.expectedDrawType||x.calendar_hash!==p.calendarSha256||
     x.config_hash!==p.configSha256||x.frame_hash!==p.frameSha256||
     x.window_shape!==plan.reviewedSegmentedSource.windowShape)
   hold("ACTUAL_CALENDAR_NOT_APPROVED_DAY_PLAN");
  const day:PreparedDayForReadback={runDayIndex:plan.runDayIndex,
   scheduledStartUtc:new Date(x.scheduled_start_utc),frozenDrawSeed:x.frozen_draw_seed,
   drawType:x.draw_type,anchorIcao:x.anchor_icao,slotRegions:x.slot_regions,pairAirportSet:x.pair_airport_set,
   calendarHash:x.calendar_hash,configHash:x.config_hash,frameHash:x.frame_hash};
  const draw=await client.query("SELECT slot_id,target_region,draw_type,selected_icao,frozen_draw_seed,"+
   "selected_at_utc,adaptive_state_hash,probability_vector,airport_layer_design_probability "+
   "FROM clean.adb_sampling_draw WHERE run_day_index=$1 ORDER BY slot_id",[plan.runDayIndex]);
  const actual=verifyPreparedDailyDraw(day,draw.rows as PreparedDrawRow[]);
  if(actual.selectedAtUtc>=observed||
     (plan.pairedIcaos&&actual.selections.some(s=>plan.pairedIcaos![s.slotId]!==s.icao)))
   hold("ACTUAL_DRAW_NOT_APPROVED_OR_PERSISTED");
  const frames=new Map(p.airportFrames.map(f=>[f.icao,f.ianaTimezone]));
  const localFrames=actual.selections.map(s=>{
   const zone=frames.get(s.icao)??hold("ACTUAL_AIRPORT_NOT_IN_APPROVED_TIMEZONE_CATALOG");
   return {slot:s.slotId,icao:s.icao,ianaTimezone:zone,
    providerApiVersion:p.providerApiVersion,fidsProtocolVersion:p.fidsProtocolVersion};
  });
  const release=await client.query("SELECT reviewed_source_request_grid_sha256,reviewed_provider_range_sha256,"+
   "verified_provider_max_range_minutes,reviewed_category_budget_sha256,frozen_at_utc "+
   "FROM clean.phase5_fids_seven_rest_release_v39 WHERE manifest_sha256=$1",[p.manifestSha256]);
  const l=release.rows[0];
  if(release.rowCount!==1||l.reviewed_source_request_grid_sha256!==p.reviewed31DaySourceRequestGridSha256||
     l.reviewed_category_budget_sha256!==p.reviewedCategoryBudgetSha256||
     l.reviewed_provider_range_sha256!==plan.reviewedSegmentedSource.reviewedProviderRangeEvidenceSha256||
     Number(l.verified_provider_max_range_minutes)!==plan.reviewedSegmentedSource.verifiedProviderMaxRangeMinutes||
     at(l.frozen_at_utc)>=observed)
   hold("FROZEN_RELEASE_NOT_REVIEWED_POLICY");
  const cycle=await client.query("SELECT cycle_api_ceiling,other_category_reserved_units,protected_api_floor_units,"+
   "physically_reserved_units FROM clean.phase5_fids_cycle_budget_v39 WHERE manifest_sha256=$1",[p.manifestSha256]);
  const b=cycle.rows[0];
  if(cycle.rowCount!==1||!int(b.cycle_api_ceiling,2,p.cycleRestCeiling)||
     !int(b.other_category_reserved_units)||!int(b.protected_api_floor_units,p.minimumProtectedFloor,50000)||
     !int(b.physically_reserved_units))
   hold("CYCLE_BUDGET_NOT_APPROVED");
  const dates=[...new Set(plan.templates.map(q=>q.physicalChargeDayUtc))].sort();
  if(dates.length<1||dates.length>4||dates.some(d=>!/^\d{4}-\d\d-\d\d$/.test(d)))
   hold("UNBOUNDED_PHYSICAL_CHARGE_DATES");
  const budgets=await client.query("SELECT charge_day_utc::text AS day,daily_api_ceiling,"+
   "daily_other_reserved_units,physically_reserved_units FROM clean.phase5_fids_utc_charge_budget_v39 "+
   "WHERE manifest_sha256=$1 AND charge_day_utc=ANY($2::date[]) ORDER BY charge_day_utc",[p.manifestSha256,dates]);
  if(budgets.rowCount!==dates.length)hold("MISSING_PHYSICAL_UTC_BUDGET");
  const chargeDayBudgets=budgets.rows.map((v,i)=>{
   if(v.day!==dates[i]||!int(v.daily_api_ceiling,2,p.dailyRestCeiling)||
      !int(v.daily_other_reserved_units)||!int(v.physically_reserved_units))
    hold("ACTUAL_DAILY_BUDGET_NOT_APPROVED");
   return{chargeDayUtc:v.day,dailyApiCeiling:Number(v.daily_api_ceiling),
    otherCategoriesReserved:Number(v.daily_other_reserved_units),existingSourceReserved:Number(v.physically_reserved_units)};
  });
  const categories=await client.query("SELECT charge_day_utc::text AS day,category,planned_units "+
   "FROM clean.phase5_fids_utc_rest_category_budget_v39 WHERE manifest_sha256=$1 "+
   "AND charge_day_utc=ANY($2::date[])",[p.manifestSha256,dates]);
  if(categories.rowCount!==dates.length*7)hold("MISSING_SEVEN_CATEGORY_PLAN");
  for(const b of chargeDayBudgets){
   const rows=categories.rows.filter(v=>v.day===b.chargeDayUtc);
   if(rows.length!==7||new Set(rows.map(v=>v.category)).size!==7||
      rows.some(v=>!CATS.includes(v.category)||!int(v.planned_units))||
      rows.reduce((n,v)=>n+Number(v.planned_units),0)>b.dailyApiCeiling||
      rows.filter(v=>!CATS.slice(0,2).includes(v.category)).reduce((n,v)=>n+Number(v.planned_units),0)!==b.otherCategoriesReserved)
    hold("UNRECONCILED_PHYSICAL_UTC_CATEGORIES");
  }
  readScope={expectedManifestSha256:p.manifestSha256,expectedCalendarSha256:p.calendarSha256,
   expectedConfigSha256:p.configSha256,expectedFrameSha256:p.frameSha256,
   expectedProviderContractSha256:p.providerContractSha256,expectedEarlyDrawSha256:actual.stateHash,
   expectedRestrictedReaderRole:p.expectedPrepareRole,runDayIndex:plan.runDayIndex,
   templates:plan.templates,reviewedRefreshTiming:plan.reviewedRefreshTiming,
   reviewedSegmentedSource:plan.reviewedSegmentedSource,
   ...(plan.reviewedOrdinaryDayEnvelope?{reviewedOrdinaryDayEnvelope:plan.reviewedOrdinaryDayEnvelope}:{})};
  sourceReview={manifestSha256:p.manifestSha256,calendarSha256:p.calendarSha256,configSha256:p.configSha256,
   frameSha256:p.frameSha256,providerContractSha256:p.providerContractSha256,reviewedReleaseSha256:p.releaseSha256,
   rightsReviewSha256:p.rightsSha256,localFrames,chargeDayBudgets,
   cycleUnitsAvailable:Number(b.cycle_api_ceiling)-Number(b.other_category_reserved_units)-
    Number(b.protected_api_floor_units)-Number(b.physically_reserved_units)};
  await client.query("ROLLBACK");tx=false;
 }finally{if(tx)await client.query("ROLLBACK").catch(()=>{});client.release();}
 const saved=await readCommittedP5DayCandidateGrid(readPool,readScope);
 if(saved.dbClockAtReadUtc<observed!||saved.dbClockAtReadUtc>=until)
  hold("SECOND_READ_OUTSIDE_APPROVED_CLOCK");
 const proposal=planP5Stage8FromCommittedDayReadback(saved,sourceReview);
 if(proposal.sourceQueryCount>p.maxQueriesPerDay)
  hold("QUERY_COUNT_EXCEEDS_DELEGATION");
 const packet:P5SignedOneDayPreparePacket={
  schema:"v39.phase5.github-signed-one-day-source-preparation.v1",
  approvedCodeSha:p.approvedCodeSha,manifestSha256:p.manifestSha256,runDayIndex:plan.runDayIndex,
  independentlyReviewedExactDaySourcePacket:true,
  reviewedPrepareInput:{readScope,sourceReview,stage9Review:{
   expectedProposalSha256:proposal.dayProposalSha256,
   expectedSourceCandidateDigestSha256:saved.selectedDayCandidateGrid.sourceCandidateDigestSha256,
   expectedManifestSha256:p.manifestSha256,expectedCalendarSha256:p.calendarSha256,
   expectedConfigSha256:p.configSha256,expectedFrameSha256:p.frameSha256,
   expectedProviderContractSha256:p.providerContractSha256,expectedRightsReviewSha256:p.rightsSha256,
   expectedReleaseSha256:p.releaseSha256,expectedRestrictedWriterRole:p.expectedPrepareRole,
   expectedChargeDayBudgetHashSha256:digest(proposal.actualUtcChargeBudgets),
   reviewed31DaySourceRequestGridSha256:p.reviewed31DaySourceRequestGridSha256,
   reviewedCategoryBudgetSha256:p.reviewedCategoryBudgetSha256,independentFreezeApproved:true,
   independentRightsReviewApproved:true,githubOnlyProspectiveOwnerApproved:true
  }}
 };
 const bytes=Buffer.from(JSON.stringify(packet),"utf8");
 if(bytes.length>500000)hold("DAY_PACKET_TOO_LARGE");
 const summary={schema:"v39.phase6.delegated-daily-source-review-receipt.v1" as const,
  runDayIndex:plan.runDayIndex,preparedProposalSha256:proposal.dayProposalSha256,
  independentlyApprovedPolicySha256:pins.expectedPolicySha256,reviewedDayPlanSha256:hash(dayPlanBytes),
  exactDailyPacketSha256:hash(bytes),queryCount:proposal.sourceQueryCount,
  delegatedAutomatedReviewNotHumanReview:true as const,
  exactPacketDurableStorageStillRequired:true as const,
  providerCalls:0 as const,databaseWrites:0 as const,phase6PaidGo:false as const};
 return Object.defineProperties(summary,{privatePacket:{value:packet,enumerable:false},
  privatePacketBytes:{value:bytes,enumerable:false}}) as typeof summary&
  {readonly privatePacket:P5SignedOneDayPreparePacket;readonly privatePacketBytes:Buffer};
}
