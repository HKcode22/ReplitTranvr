/**
 * PROPOSED operational flexibility, NOT a change to binding f.8, not an
 * approved calendar amendment, nor a live scheduler/POST/STOP implementation.
 *
 * Read-only target-neutral incident triage. Reuses a previously reviewed,
 * limited future fallback pool; never creates a convenient new date *after*
 * seeing a flight outcome. An exact signed re-release and full affected-day
 * population/UTC budget, prior/future airport washout and cutoff review remain
 * necessary before any actual calendar mutation or paid dispatch.
 */
import {createHash} from "node:crypto";
export const P5_BOUNDED_RECOVERY_REVIEW_SCHEMA=
 "v39.phase5.prelisted-future-calendar-recovery-review.v1";
const SHA=/^[0-9a-f]{64}$/;
const ICAO=/^[A-Z]{4}$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const D=86400000,H=3600000,MIN_EARLY=24*H+45*60000;
const SLOTS=["00","04","08","12","16","20"];
const SHAPES=["4h","2x2h","up-to-6h"];
const CAUSES=[
 "GITHUB_FAILURE_BEFORE_SOURCE",
 "PROVIDER_UNAVAILABLE_BEFORE_SOURCE",
 "OPTIONAL_WEATHER_OR_ADSB_MISSING",
 "PAID_QUERY_CUTOFF_MISSED",
 "POST_OR_CALLBACK_PARTIAL",
 "BUDGET_OR_SECURITY_HOLD",
 "SOURCE_RIGHTS_OR_RETENTION_HOLD"
];
const refuse=s=>{throw Error("REFUSED_P5_BOUNDED_RECOVERY_"+s);};
const time=(v)=>{
 if(typeof v!=="string"||!ISO.test(v)||
    !Number.isFinite(Date.parse(v))||
    new Date(Date.parse(v)).toISOString()!==v)
  refuse("INVALID_CANONICAL_UTC_TIMESTAMP");
 return Date.parse(v);
};
const sha=o=>createHash("sha256").update(JSON.stringify(o)).digest("hex");
const isInt=x=>Number.isSafeInteger(x)&&x>=0&&x<=1000000;
const unique=xs=>new Set(xs).size===xs.length;
function siteSet(a){
 if(!Array.isArray(a)||![0,4].includes(a.length)||
    !unique(a)||a.some(x=>typeof x!=="string"||!ICAO.test(x)))
  refuse("INVALID_OR_DUPLICATE_SELECTED_SITE_SET");
 return a;
}
function day(x,original=false){
 if(!x||!Number.isInteger(x.runDayIndex)||x.runDayIndex<1||
    x.runDayIndex>31||!SLOTS.includes(x.utcSlot)||
    !SHAPES.includes(x.windowShape)||
    !["train","validation","test"].includes(x.partition)||
    (x.pairId!==null&&
      (typeof x.pairId!=="string"||!/^pair-[1-5]$/.test(x.pairId)))||
    typeof x.startUtc!=="string"||
    typeof x.endUtc!=="string")
  refuse("MALFORMED_DAY_OR_SAMPLE_STRATUM");
 const start=time(x.startUtc),end=time(x.endUtc);
 const sites=siteSet(x.selectedAirports);
 if(start>=end||end-start>6*H||
    x.startUtc.slice(11,13)!==x.utcSlot||x.startUtc.slice(14,16)!=="00"||
    (x.windowShape==="4h"&&end-start!==4*H)||
    (x.windowShape==="up-to-6h"&&end-start>6*H)||
    (x.windowShape==="2x2h"&&end-start<=4*H)||
    (x.pairId!==null&&sites.length!==4)||
    (original&&sites.length===0&&x.pairId!==null))
  refuse("INVALID_PLANNED_EXPOSURE_OR_KNOWN_PAIR_AIRPORTS");
 return {start,end,sites};
}
export function digestP5PrelistedFallbackCandidates(
 calendarSha256,runDayIndex,candidates
){
 if(!SHA.test(calendarSha256)||!Number.isSafeInteger(runDayIndex)||
    runDayIndex<1||runDayIndex>31||!Array.isArray(candidates))
  refuse("INVALID_PRELISTED_FALLBACK_DIGEST_SCOPE");
 return sha({calendarSha256,runDayIndex,candidates});
}
const result=(status,x,extra={})=>({
 schema:"v39.phase5.bounded-recovery-review-only.v1",
 status,runDayIndex:x?.plannedDay?.runDayIndex??null,
 originalCalendarSha256:x?.reviewedCalendarSha256??null,
 ...extra,
 actualDbCalendarOrSourceCustodyIndependentlyRead:false,
 callerClaimOfExternalFallbackApprovalAuthenticated:false,
 actualFutureAdaptiveAirportDrawAndWashoutVerified:false,
 final31DayShapeOrBudgetReaudited:false,
 independentSignedCalendarRevisionApproved:false,
 automaticRetiming:false,
 oldSourceOriginalsDeleted:false,
 historicalPreBackfilled:false,
 modelPrimaryOrAmendmentsChanged:false,
 paidProviderCalls:0,databaseWrites:0,githubDispatches:0,
 scientificPhase5FreezePassed:false,paidPhase6GoGranted:false
});
function collision(candidate,known,sites){
 if(candidate.start<known.end&&candidate.end>known.start)
  return "OVERLAPS_OTHER_PARENT_BATCH";
 if(sites.length>0&&known.sites.length>0&&
    sites.some(x=>known.sites.includes(x))){
  if(candidate.start>=known.end&&candidate.start-known.end<D)
   return "REUSED_AIRPORT_BEFORE_24H_WASHOUT";
  if(known.start>=candidate.end&&known.start-candidate.end<D)
   return "FUTURE_REUSED_AIRPORT_BEFORE_24H_WASHOUT";
 }
 return null;
}
function classOf(t){
 const w=new Date(t).getUTCDay();
 return w===0||w===6?"weekend":"weekday";
}
export function reviewP5PrelistedCalendarRecovery(input){
 if(!input||input.schema!==P5_BOUNDED_RECOVERY_REVIEW_SCHEMA||
    !SHA.test(input.manifestSha256??"")||
    !SHA.test(input.reviewedCalendarSha256??"")||
    !SHA.test(input.externallyReviewedFallbackSetSha256??"")||
    input.protectedTestOutcomeValuesInspected!==false||
    !input.plannedDay||!input.incident||
    !Array.isArray(input.otherPlannedDays)||
    input.otherPlannedDays.length!==30||
    !Array.isArray(input.candidates)||input.candidates.length>4||
    !CAUSES.includes(input.incident.cause))
  refuse("INCOMPLETE_REVIEWED_CALENDAR_OR_OUTCOME_BLINDNESS");
 const p=input.plannedDay,original=day(p,true);
 const observed=input.incident;
 const caught=time(observed.detectedAtUtc);
 const prelistedAt=time(input.prelistedAtUtc);
 for(const label of [
  "sourcePhysicalReservations","sourceOriginalBindings","preRows",
  "callbackReceipts","postOriginalBindings","savedEarlyDrawRows"
 ]){
  if(!isInt(observed[label]))refuse("MISSING_INCIDENT_CUSTODY_"+label);
 }
 if(digestP5PrelistedFallbackCandidates(
    input.reviewedCalendarSha256,p.runDayIndex,input.candidates)!==
    input.externallyReviewedFallbackSetSha256||
    prelistedAt>caught||prelistedAt>=original.start)
  refuse("CANDIDATE_POOL_WAS_NOT_PRELISTED_BEFORE_INCIDENT");
 const others=input.otherPlannedDays.map(x=>({...x,...day(x)}));
 const indexes=[p.runDayIndex,...others.map(x=>x.runDayIndex)];
 if(!unique(indexes)||indexes.length!==31||
    Math.min(...indexes)!==1||Math.max(...indexes)!==31)
  refuse("INCOMPLETE_OTHER_THIRTY_OR_CHANGED_DAY_NUMBERING");
 const pairOthers=others.filter(x=>x.pairId===p.pairId);
 if(p.pairId!==null&&
    (pairOthers.length!==1||
     pairOthers[0].partition!==p.partition||
     pairOthers[0].utcSlot!==p.utcSlot||
     JSON.stringify([...pairOthers[0].sites].sort())!==
       JSON.stringify([...original.sites].sort())))
  refuse("ALTERED_PAIRED_AIRPORT_OR_PARTITION_OR_UTC_SLOT");
 // A missing *optional* feature never invalidates a valid source PRE.
 if(observed.cause==="OPTIONAL_WEATHER_OR_ADSB_MISSING")
  return result("CONTINUE_ORIGINAL_WINDOW_RECORD_OPTIONAL_MISSINGNESS",input);
 if(["BUDGET_OR_SECURITY_HOLD","SOURCE_RIGHTS_OR_RETENTION_HOLD"]
    .includes(observed.cause))
  return result("HOLD_RIGHTS_OR_PHYSICAL_BUDGET_NO_RESCHEDULE",input);
 if(observed.sourcePhysicalReservations>0||
    observed.sourceOriginalBindings>0||observed.preRows>0||
    observed.callbackReceipts>0||observed.postOriginalBindings>0||
    observed.cause==="POST_OR_CALLBACK_PARTIAL")
  return result("PRESERVE_PARTIAL_DAY_AND_CENSOR_NO_ERASE_OR_REPLACE",input);
 if(observed.cause==="PAID_QUERY_CUTOFF_MISSED")
  return result("RECORD_MISSED_QUERY_CUTOFF_NO_BACKFILL",input);
 // Changing a saved four-airport draw requires separate independently
 // authorized lineage/role handling; a calendar-only pure function cannot
 // silently replace the already committed prospective site selection.
 if(observed.savedEarlyDrawRows>0)
  return result("SAVED_EARLY_DRAW_SEPARATE_REPLAN_REQUIRED",input);
 if(caught>=original.start)
  return result("INCIDENT_NOT_BEFORE_ORIGINAL_WINDOW_NO_AUTO_RETIME",input);
 if(input.candidates.length===0)
  return result("NO_PRELISTED_FALLBACK_PRESERVE_MISSED_DAY",input);
 const failures=[],seen=new Set();
 let priorRank=0;
 for(const c of input.candidates){
  if(!c||!Number.isInteger(c.rank)||c.rank!==priorRank+1||
     typeof c.startUtc!=="string"||typeof c.endUtc!=="string")
   refuse("INVALID_FALLBACK_SEQUENCE");
  priorRank=c.rank;
  const start=time(c.startUtc),end=time(c.endUtc);
  if(seen.has(c.startUtc))refuse("DUPLICATE_FALLBACK_START");
  seen.add(c.startUtc);
  // 'Same slot, same exposure geometry' prevents incident-triggered
  // treatment, time-of-day and weekday-class outcome shopping.
  const candidate={start,end};
  let why=null;
  if(start<=caught+MIN_EARLY||start<=original.start)
   why="INSUFFICIENT_NEW_T24_EARLY_DRAW_LEAD";
  else if(end-start!==original.end-original.start||
          c.startUtc.slice(11,13)!==p.utcSlot||
          c.startUtc.slice(14,16)!=="00")
   why="CHANGED_TREATMENT_DURATION_OR_UTC_SLOT";
  else if(p.pairId!==null&&classOf(start)!==classOf(original.start))
   why="PAIRED_WEEKDAY_CLASS_CHANGED";
  else if(p.pairId!==null&&
          classOf(start)!==classOf(pairOthers[0].start))
   why="PAIR_PARTNER_WEEKDAY_CLASS_MISMATCH";
  else{
   for(const other of others){
    // Preserve run-day ordering, not only non-overlap.
    if(other.runDayIndex<p.runDayIndex&&start<other.end){
     why="CANNOT_PASS_PRIOR_PARENT";break;
    }
    if(other.runDayIndex>p.runDayIndex&&end>other.start){
     why="CANNOT_PASS_NEXT_PARENT";break;
    }
    why=collision(candidate,other,original.sites);
    if(why)break;
   }
  }
  if(!why){
   return result("FIRST_PRELISTED_BACKUP_STRUCTURALLY_ELIGIBLE_FOR_INDEPENDENT_REVIEW",input,{
    backupRank:c.rank,proposedFutureStartUtc:c.startUtc,
    proposedFutureEndUtc:c.endUtc,
    plannedOriginalStartUtc:p.startUtc,
    reason:observed.cause,
    needsExactNewCalendarManifestSha256:true,
    needsIndependentUpdatedRESTAndAlertBudgets:true,
    needsSourceRightsAndActualEarlyDrawReapproval:true,
    originalFailureAndAnyMissingnessMustRemainAppendOnly:true,
    futureUnknownOrdinaryAirportWashoutRequiresLiveReadback:
      others.some(x=>x.sites.length===0)
   });
  }
  failures.push({rank:c.rank,code:why});
 }
 return result("NO_STRUCTURALLY_ELIGIBLE_PRELISTED_BACKUP_PRESERVE_MISSED_DAY",input,{
  candidateRefusals:failures,
  replanWholeExperimentAutomatically:false
 });
}
