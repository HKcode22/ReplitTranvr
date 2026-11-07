/**
 * Phase5 Stage8: convert one independently read Stage7 committed-day grid into
 * the exact 12 V0079 PREPARED row *PROPOSALS*. This is a pure deterministic
 * packet, not a producer, provider GET, DB INSERT, signed legal permission,
 * or Phase6 activation. It must never make up an adaptive airport, fake
 * Github run ID or convert a planned source query into actual flight-level PRE.
 */
import {createHash} from "node:crypto";
import {
  materializeP5DynamicDaySourceGrid,P5_DYNAMIC_DAY_GRID_SCHEMA,
  type P5DynamicDayGridInput
} from "./phase5DynamicDaySourceGrid_v39";
import type {P5CommittedDayReadonlyResult}
 from "./phase5CommittedDayGridReadonly_v39";
import type {PreparedDayForReadback,PreparedDrawRow}
 from "./phase5EarlyPreselectionReadback_v39";

const HASH=/^[a-f0-9]{64}$/,ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const SLOTS=["HUB","MID_A","MID_B","REGIONAL"] as const;
const sha=(x:unknown)=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
function refuse(x:string):never{throw Error("REFUSED_P5_STAGE8_PREPARED_PROPOSAL_"+x);}
const stamp=(s:string):number=>{
 if(typeof s!=="string"||!ISO.test(s)||!Number.isFinite(Date.parse(s))||
   new Date(Date.parse(s)).toISOString()!==s)refuse("INVALID_UTC_INSTANT");
 return Date.parse(s);
};
function local(utc:string,zone:string):string{
 if(typeof zone!=="string"||!/^[-_A-Za-z0-9/]{3,80}$/.test(zone))
   refuse("INVALID_IANA_TIMEZONE");
 let parts:Intl.DateTimeFormatPart[];
 try{parts=new Intl.DateTimeFormat("en-US",{
   timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit",
   hour:"2-digit",minute:"2-digit",hourCycle:"h23"
 }).formatToParts(new Date(stamp(utc)));}
 catch{refuse("UNRECOGNIZED_IANA_TIMEZONE");}
 const part=(type:string)=>{
  const v=parts.find(p=>p.type===type)?.value;
  if(!v||!/^\d{2,4}$/.test(v))refuse("LOCAL_TIME_CONVERSION");
  return v;
 };
 return part("year")+"-"+part("month")+"-"+part("day")+"T"+
   part("hour")+":"+part("minute");
}

export interface Stage8UtcChargeBudget {
 chargeDayUtc:string;
 dailyApiCeiling:number;
 otherCategoriesReserved:number;
 existingSourceReserved:number;
}
export interface Stage8LocalFrame {
 slot:typeof SLOTS[number];
 icao:string;
 ianaTimezone:string;
 providerApiVersion:string;
 fidsProtocolVersion:string;
}
export interface Stage8DayProposalInput {
 stage7:P5CommittedDayReadonlyResult;
 /** Rechecked against the canonical hash Stage7 returned. */
 day:PreparedDayForReadback;
 savedEarlyDrawRows:PreparedDrawRow[];
 manifestSha256:string;
 calendarSha256:string;
 configSha256:string;
 frameSha256:string;
 providerContractSha256:string;
 reviewedReleaseSha256:string;
 rightsReviewSha256:string;
 localFrames:Stage8LocalFrame[];
 chargeDayBudgets:Stage8UtcChargeBudget[];
 /** Independently frozen cycle remaining units available for this day. */
 cycleUnitsAvailable:number;
}
export interface Stage8V0079PreparedProposal {
 query_digest:string;
 manifest_sha256:string;run_day_index:number;query_key:string;
 slot_id:string;horizon:string;airport_icao:string;early_draw_sha256:string;
 reviewed_release_sha256:string;rights_review_sha256:string;
 provider_contract_sha256:string;github_run_id:"00000";
 service_window_start_utc:string;service_window_end_utc:string;
 from_local:string;to_local:string;airport_iana_timezone:string;
 provider_api_version:string;fids_protocol_version:string;
 planned_dispatch_utc:string;planned_charge_utc_date:string;
 hard_latest_dispatch_utc:string;prediction_cutoff_utc:string;
 api_units_per_attempt:2;max_physical_attempts:1;state:"PREPARED";
}
export interface Stage8DayProposalResult {
 schema:"v39.phase5.stage8.v0079-day-prepared-proposals.v1";
 status:"EXACT_DAY_QUERY_PROPOSALS_NOT_DATABASE_PREPARED_OR_SIGNED";
 manifestSha256:string;runDayIndex:number;earlyDrawSha256:string;
 dayProposalSha256:string;sourceQueryCount:12;maximumCandidateGetUnits:24;
 actualUtcChargeBudgets:{day:string;queries:number;candidateUnits:number;
     otherReserved:number;alreadyReserved:number;remainingAfterProposal:number}[];
 queries:Stage8V0079PreparedProposal[];
 databaseReadbackClaimOnly:true;
 databaseWrites:0;providerCalls:0;
 installedV0079:false;actualGitHubPrearmVerified:false;
 independentlyReviewedSourceRights:false;providerOriginalCommitted:false;
 flightLevelPreCertified:false;phase5FreezePassed:false;phase6Go:false;
}
export function planStage8P5DayV0079Proposals(
 p:Stage8DayProposalInput
):Stage8DayProposalResult{
 if(!p||!p.stage7||p.stage7.schema!=="v39.phase5.db-readback-day-grid.v1"||
   p.stage7.status!=="SAVED_SOURCE_DAY_READ_ONLY_CANDIDATES_NOT_RELEASED"||
   p.stage7.restrictedReaderRoleVerified!==true||
   p.stage7.databaseReadOnlySnapshot!==true||
   p.stage7.databaseWrites!==0||p.stage7.providerCalls!==0)
   refuse("STAGE7_READBACK_NOT_PROVEN");
 if(![p.manifestSha256,p.calendarSha256,p.configSha256,p.frameSha256,
   p.providerContractSha256,p.reviewedReleaseSha256,p.rightsReviewSha256]
    .every(x=>typeof x==="string"&&HASH.test(x)))
   refuse("MISSING_FROZEN_SHA_CHAIN");
 const candidate=p.stage7.selectedDayCandidateGrid;
 if(candidate?.schema!=="v39.phase5.early-draw-to-12-source-candidates-result.v1"||
    candidate.status!=="DYNAMIC_DAY_CANDIDATES_MATCH_COMMITTED_DRAW_NOT_RELEASED"||
    candidate.acquisitionCount!==12||candidate.plannedPhysicalGetCount!==12||
    candidate.candidateFidsApiUnits!==24||
    candidate.authorizesPaidGet!==false||candidate.phase6Go!==false||
    !Array.isArray(candidate.acquisitions)||candidate.acquisitions.length!==12||
    candidate.runDayIndex!==p.day?.runDayIndex)
    refuse("UNTRUSTWORTHY_SOURCE_CANDIDATES");
 if(stamp(p.stage7.dbClockAtReadUtc)>=Math.min(
    ...candidate.acquisitions.map(a=>stamp(a.scheduledRequestUtc))))
    refuse("SAVED_DAY_READBACK_AFTER_FIRST_GET");
 const templates:P5DynamicDayGridInput["templates"]=
   candidate.acquisitions.map(q=>{
     const {icao,plannedAirportSelectionUtc,...rest}=q;
     void icao;void plannedAirportSelectionUtc;
     return rest;
   });
 const verified=materializeP5DynamicDaySourceGrid({
   schema:P5_DYNAMIC_DAY_GRID_SCHEMA,
   reviewedCalendarSha256:p.calendarSha256,
   reviewedConfigSha256:p.configSha256,
   reviewedFrameSha256:p.frameSha256,
   providerContractSha256:p.providerContractSha256,
   day:p.day,committedEarlyDrawRows:p.savedEarlyDrawRows,
   expectedCommittedEarlyDrawSha256:candidate.committedDrawSha256,
   templates
 });
 if(verified.sourceCandidateDigestSha256!==candidate.sourceCandidateDigestSha256||
   verified.dynamicTemplateSha256!==candidate.dynamicTemplateSha256||
   verified.committedDrawSha256!==candidate.committedDrawSha256)
   refuse("TAMPERED_COMMITTED_DAY_OR_PROVIDER_CONTRACT");
 // Stage7's digest can remain unchanged if a caller mutates just one
 // acquisition in-memory. Compare *every actual candidate field* against
 // independently reconstructed immutable draw and source template values.
 const observedByKey=new Map(candidate.acquisitions.map(q=>[q.queryKey,q]));
 if(observedByKey.size!==12||verified.acquisitions.some(q=>
   !observedByKey.has(q.queryKey)||
   JSON.stringify(observedByKey.get(q.queryKey))!==JSON.stringify(q)))
   refuse("TAMPERED_IN_MEMORY_SOURCE_QUERY");
 if(!Number.isInteger(p.cycleUnitsAvailable)||p.cycleUnitsAvailable<24||
    p.cycleUnitsAvailable>50000)refuse("CYCLE_BUDGET_NOT_AVAILABLE");
 if(!Array.isArray(p.localFrames)||p.localFrames.length!==4||
    !Array.isArray(p.chargeDayBudgets))refuse("FOUR_LOCAL_FRAMES_AND_CHARGE_DAY");
 const frames=new Map(p.localFrames.map(x=>[x.slot,x]));
 if(frames.size!==4||SLOTS.some(slot=>!frames.has(slot)))
   refuse("MISSING_OR_DUPLICATE_LOCAL_FRAMES");
 const proposals:Stage8V0079PreparedProposal[]=[];
 for(const a of verified.acquisitions){
   const f=frames.get(a.slot);
   if(!f||f.icao!==a.icao||
      !/^[a-zA-Z0-9._-]{2,50}$/.test(f.providerApiVersion)||
      !/^[a-zA-Z0-9._-]{2,50}$/.test(f.fidsProtocolVersion))
     refuse("UNREVIEWED_SOURCE_FRAME_FOR_SELECTED_AIRPORT");
   const planned=stamp(a.scheduledRequestUtc),
      cutoff=stamp(a.earliestPlannedCutoffUtc);
   const hardLatest=Math.min(planned+60_000,
     cutoff-a.maxResponseAndPersistSeconds*1000-120_000);
   if(hardLatest<=planned||hardLatest>cutoff-120_000||
      stamp(a.serviceWindowStartUtc)>=stamp(a.serviceWindowEndUtc))
     refuse("INFEASIBLE_LATEST_DISPATCH_FOR_PRE_CUTOFF_SOURCE");
   const rowWithoutDigest={
      manifest_sha256:p.manifestSha256,run_day_index:a.runDayIndex,
      query_key:a.queryKey,slot_id:a.slot,horizon:a.horizon,
      airport_icao:a.icao,early_draw_sha256:verified.committedDrawSha256,
      reviewed_release_sha256:p.reviewedReleaseSha256,
      rights_review_sha256:p.rightsReviewSha256,
      provider_contract_sha256:p.providerContractSha256,
      github_run_id:"00000" as const,
      service_window_start_utc:a.serviceWindowStartUtc,
      service_window_end_utc:a.serviceWindowEndUtc,
      from_local:local(a.serviceWindowStartUtc,f.ianaTimezone),
      to_local:local(a.serviceWindowEndUtc,f.ianaTimezone),
      airport_iana_timezone:f.ianaTimezone,
      provider_api_version:f.providerApiVersion,
      fids_protocol_version:f.fidsProtocolVersion,
      planned_dispatch_utc:a.scheduledRequestUtc,
      planned_charge_utc_date:a.physicalChargeDayUtc,
      hard_latest_dispatch_utc:new Date(hardLatest).toISOString(),
      prediction_cutoff_utc:a.earliestPlannedCutoffUtc,
      api_units_per_attempt:2 as const,max_physical_attempts:1 as const,
      state:"PREPARED" as const
   };
   proposals.push({query_digest:sha({
     schema:"v39.phase5.v0079.query-prepared-proposal.v1",...rowWithoutDigest
   }),...rowWithoutDigest});
 }
 if(new Set(proposals.map(q=>q.query_digest)).size!==12||
    new Set(proposals.map(q=>q.query_key)).size!==12)
   refuse("DUPLICATE_V0079_QUERY_PROPOSAL");
 const actual=verified.actualChargeDayUtcCounts;
 const budgets=new Map(p.chargeDayBudgets.map(x=>[x.chargeDayUtc,x]));
 if(budgets.size!==actual.length||p.chargeDayBudgets.length!==actual.length)
   refuse("MISSING_OR_EXTRA_UTC_CHARGE_DAY_BUDGET");
 const checked=actual.map(t=>{
   const b=budgets.get(t.day);
   if(!b||b.chargeDayUtc!==t.day||
      ![b.dailyApiCeiling,b.otherCategoriesReserved,b.existingSourceReserved]
       .every(x=>Number.isSafeInteger(x)&&x>=0)||
       b.dailyApiCeiling>1900||b.dailyApiCeiling<2||
       b.otherCategoriesReserved+b.existingSourceReserved+
        t.candidateApiUnits>b.dailyApiCeiling)
     refuse("INSUFFICIENT_FROZEN_UTC_CHARGE_BUDGET");
   return {day:t.day,queries:t.physicalRequests,
     candidateUnits:t.candidateApiUnits,
     otherReserved:b.otherCategoriesReserved,
     alreadyReserved:b.existingSourceReserved,
     remainingAfterProposal:b.dailyApiCeiling-
       b.otherCategoriesReserved-b.existingSourceReserved-
       t.candidateApiUnits};
 });
 return {
   schema:"v39.phase5.stage8.v0079-day-prepared-proposals.v1",
   status:"EXACT_DAY_QUERY_PROPOSALS_NOT_DATABASE_PREPARED_OR_SIGNED",
   manifestSha256:p.manifestSha256,runDayIndex:p.day.runDayIndex,
   earlyDrawSha256:verified.committedDrawSha256,
   dayProposalSha256:sha({manifest:p.manifestSha256,
     source:verified.sourceCandidateDigestSha256,proposals,checked}),
   sourceQueryCount:12,maximumCandidateGetUnits:24,
   actualUtcChargeBudgets:checked,queries:proposals,
   databaseReadbackClaimOnly:true,databaseWrites:0,providerCalls:0,
   installedV0079:false,actualGitHubPrearmVerified:false,
   independentlyReviewedSourceRights:false,providerOriginalCommitted:false,
   flightLevelPreCertified:false,phase5FreezePassed:false,phase6Go:false
 };
}
