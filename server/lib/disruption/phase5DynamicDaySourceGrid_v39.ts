/**
 * Phase5 Stage6: materialize a SINGLE DAY's signed-source candidates from
 * the actual four-slot immutable early-draw readback.
 *
 * Pure/no provider/no database/no GitHub workflow. A 31-day static schedule
 * cannot preselect adaptive REGIONAL airports before the earlier selection
 * transaction. This adapter never guesses future airports or uses candidate
 * simulation as evidence of live committed selection.
 *
 * Results require a separate reviewed V0079/V0080 query preparation,
 * permissions, source-use rights, REST/Alert budgets and independent PRE
 * certification BEFORE any physical GET or Phase6 activation.
 */
import { createHash } from "node:crypto";
import {
 P5_EARLY_DRAW_MIN_STRICT_LEAD_MS,
 P5_EARLY_DRAW_MAX_INCLUSIVE_LEAD_MS
} from "./phase5ProspectiveEarlyDrawClockContract_v39";
import {
  verifyPreparedDailyDraw,
  type PreparedDayForReadback,
  type PreparedDrawRow,
} from "./phase5EarlyPreselectionReadback_v39";
import type {
  P5FidsAcquisition, P5Slot, P5FidsHorizon,
} from "./phase5FidsFreezeGridAdmission_v39";

export const P5_DYNAMIC_DAY_GRID_SCHEMA =
  "v39.phase5.early-draw-to-12-source-candidates.v1" as const;
export const P5_DYNAMIC_DAY_MULTI_GRID_SCHEMA =
  "v39.phase5.early-draw-to-multirefresh-source-candidates.v2" as const;
export const P5_DYNAMIC_DAY_SEGMENTED_MULTI_GRID_SCHEMA =
  "v39.phase5.early-draw-to-segmented-multirefresh-source-candidates.v3" as const;
const MAX_QUERIES_PER_GROUP=32;
const MAX_QUERIES_PER_DAY=12*MAX_QUERIES_PER_GROUP;
const HOUR=3_600_000,MINUTE=60_000;
const T_OFFSET:Record<P5FidsHorizon,number>={
 "T-24h":86_400_000,"T-6h":21_600_000,"T-90m":5_400_000
};
/** Pure timing assumptions; the SHA is a cross-reference, not legal clearance. */
export interface P5DayReviewedRefreshTiming {
 reviewed31DayCoverageGridSha256:string;
 maxPopulationStalenessSeconds:number;
 maxSchedulerSlipSeconds:number;
 minimumPreCommitMarginSeconds:number;
 verifiedProviderMaxFidsWindowMinutes:number;
}
/** Reviewed request-range geometry; this SHA does not certify provider rights. */
export interface P5DayReviewedSegmentedSource {
 windowShape:"4h"|"2x2h"|"up-to-6h";
 verifiedProviderMaxRangeMinutes:number;
 reviewedProviderRangeEvidenceSha256:string;
}
export interface P5DaySourcePartitionPin {
 queryKey:string;segmentIndex:number;partitionIndex:number;
 windowShape:P5DayReviewedSegmentedSource["windowShape"];
 serviceWindowStartUtc:string;serviceWindowEndUtc:string;
 reviewedProviderRangeEvidenceSha256:string;
}
const HASH=/^[a-f0-9]{64}$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const SLOTS:P5Slot[]=["HUB","MID_A","MID_B","REGIONAL"];
const HORIZONS:P5FidsHorizon[]=["T-24h","T-6h","T-90m"];
const MIN_EARLY=P5_EARLY_DRAW_MIN_STRICT_LEAD_MS;
const MAX_EARLY=P5_EARLY_DRAW_MAX_INCLUSIVE_LEAD_MS;
const MAX_LATENCY=3_600;
type WithoutUnknownIcao=Omit<P5FidsAcquisition,"icao"|"plannedAirportSelectionUtc">;

export interface P5DynamicDayGridInput {
  schema:typeof P5_DYNAMIC_DAY_GRID_SCHEMA|typeof P5_DYNAMIC_DAY_MULTI_GRID_SCHEMA|
  typeof P5_DYNAMIC_DAY_SEGMENTED_MULTI_GRID_SCHEMA;
  /** Required only for multi-refresh; must come from independently reviewed grid. */
  reviewedRefreshTiming?:P5DayReviewedRefreshTiming;
  /** V3 Amendment C only: Stage7 verifies against persisted calendar shape. */
  reviewedSegmentedSource?:P5DayReviewedSegmentedSource;
  /** Same frozen protocol scope as the eventual V0079 signed query set. */
  reviewedCalendarSha256:string;
  reviewedConfigSha256:string;
  reviewedFrameSha256:string;
  providerContractSha256:string;
  day:PreparedDayForReadback;
  /** Source rows must be read from actual committed DB transaction elsewhere. */
  committedEarlyDrawRows:PreparedDrawRow[];
  /** Independent readback evidence, not caller-invented future airport names. */
  expectedCommittedEarlyDrawSha256:string;
  /** Templates intentionally do NOT contain selected airport ICAOs. */
  templates:WithoutUnknownIcao[];
}
export interface P5DynamicDayGridResult {
  schema:"v39.phase5.early-draw-to-12-source-candidates-result.v1"|
    "v39.phase5.early-draw-to-multirefresh-source-candidates-result.v2"|
    "v39.phase5.early-draw-to-segmented-multirefresh-source-candidates-result.v3";
  status:"DYNAMIC_DAY_CANDIDATES_MATCH_COMMITTED_DRAW_NOT_RELEASED"|
    "DYNAMIC_MULTI_REFRESH_CANDIDATES_COVER_CUTOFFS_NOT_RELEASED"|
    "DYNAMIC_SEGMENTED_MULTI_REFRESH_CANDIDATES_NOT_RELEASED";
  runDayIndex:number;
  selectedAtUtc:string;
  committedDrawSha256:string;
  dynamicTemplateSha256:string;
  sourceCandidateDigestSha256:string;
  acquisitionCount:number;
  plannedPhysicalGetCount:number;
  candidateFidsApiUnits:number;
  reviewedRefreshTiming?:P5DayReviewedRefreshTiming;
  reviewedSegmentedSource?:P5DayReviewedSegmentedSource;
  sourcePartitionPins?:P5DaySourcePartitionPin[];
  actualChargeDayUtcCounts:{day:string;physicalRequests:number;candidateApiUnits:number}[];
  acquisitions:P5FidsAcquisition[];
  actualGithubRunPrearmVerified:false;
  actualSourceOriginalCommitted:false;
  actualFlightLevelPreCertified:false;
  authorizedSourceRights:false;
  authorizesPaidGet:false;
  phase5FreezePassed:false;
  phase6Go:false;
}
function hold(code:string):never{throw Error("REFUSED_P5_DYNAMIC_DAY_GRID_"+code);}
function time(v:unknown,label:string):number{
 if(typeof v!=="string"||!ISO.test(v))hold(label+"_FORMAT");
 const t=Date.parse(v);
 if(!Number.isFinite(t)||new Date(t).toISOString()!==v)hold(label+"_UTC");
 return t;
}
function digest(o:unknown):string{
 return createHash("sha256").update(JSON.stringify(o)).digest("hex");
}
/**
 * Candidate producer for a previously committed adaptive selection.
 * No database access: the calling release must independently verify these
 * four rows actually came from the frozen committed DB draw, not a fixture.
 */
export function materializeP5DynamicDaySourceGrid(input:P5DynamicDayGridInput):P5DynamicDayGridResult {
 if(!input||![P5_DYNAMIC_DAY_GRID_SCHEMA,P5_DYNAMIC_DAY_MULTI_GRID_SCHEMA,
   P5_DYNAMIC_DAY_SEGMENTED_MULTI_GRID_SCHEMA].includes(input.schema))
   hold("SCHEMA");
 const segmented=input.schema===P5_DYNAMIC_DAY_SEGMENTED_MULTI_GRID_SCHEMA;
 const multi=segmented||input.schema===P5_DYNAMIC_DAY_MULTI_GRID_SCHEMA;
 const timing=input.reviewedRefreshTiming;
 const shape=input.reviewedSegmentedSource;
 if(segmented){
   if(!shape||!["4h","2x2h","up-to-6h"].includes(shape.windowShape)||
      !HASH.test(shape.reviewedProviderRangeEvidenceSha256)||
      !Number.isSafeInteger(shape.verifiedProviderMaxRangeMinutes)||
      shape.verifiedProviderMaxRangeMinutes<1||
      shape.verifiedProviderMaxRangeMinutes>360)
      hold("UNVERIFIED_AMENDMENT_C_SEGMENTED_SOURCE");
 }else if(shape)hold("LEGACY_UNREVIEWED_SEGMENTED_SOURCE");
 if(multi){
   if(!timing||!HASH.test(timing.reviewed31DayCoverageGridSha256)||
     !Number.isSafeInteger(timing.maxPopulationStalenessSeconds)||
     timing.maxPopulationStalenessSeconds<1||
     timing.maxPopulationStalenessSeconds>86_400||
     !Number.isSafeInteger(timing.maxSchedulerSlipSeconds)||
     timing.maxSchedulerSlipSeconds<0||
     timing.maxSchedulerSlipSeconds>3600||
     !Number.isSafeInteger(timing.minimumPreCommitMarginSeconds)||
     timing.minimumPreCommitMarginSeconds<120||
     timing.minimumPreCommitMarginSeconds>900||
     !Number.isSafeInteger(timing.verifiedProviderMaxFidsWindowMinutes)||
     timing.verifiedProviderMaxFidsWindowMinutes<(segmented?1:240)||
     timing.verifiedProviderMaxFidsWindowMinutes>(segmented?360:1440)||
     (segmented&&timing.verifiedProviderMaxFidsWindowMinutes!==
      shape?.verifiedProviderMaxRangeMinutes))
     hold("UNVERIFIED_MULTI_REFRESH_TIMING_CONTRACT");
 }else if(timing)hold("LEGACY_GRID_CANNOT_SMUGGLE_MULTI_REFRESH_CONTRACT");
 const day=input.day;
 if(!day||!Number.isInteger(day.runDayIndex)||
   day.runDayIndex<1||day.runDayIndex>31)hold("RUN_DAY");
 if(![input.reviewedCalendarSha256,input.reviewedConfigSha256,
   input.reviewedFrameSha256,input.providerContractSha256,
   input.expectedCommittedEarlyDrawSha256].every(x=>typeof x==="string"&&HASH.test(x)))
   hold("MISSING_SIGNED_PINS");
 if(day.calendarHash!==input.reviewedCalendarSha256||
    day.configHash!==input.reviewedConfigSha256||
    day.frameHash!==input.reviewedFrameSha256)
   hold("FROZEN_CALENDAR_CONFIG_FRAME_CONFLICT");
 const draw=verifyPreparedDailyDraw(day,input.committedEarlyDrawRows);
 if(draw.stateHash!==input.expectedCommittedEarlyDrawSha256)
   hold("UNVERIFIED_EARLY_DRAW_READBACK");
 const start=day.scheduledStartUtc.getTime();
 if(!Number.isFinite(start))hold("FROZEN_SERVICE_START");
 const partitions:{
   segmentIndex:number;partitionIndex:number;start:number;end:number;
 }[]=[];
 if(segmented&&shape){
   const ranges=shape.windowShape==="2x2h"?
     [[0,2],[3,5]]:[[0,shape.windowShape==="4h"?4:6]];
   const maxRangeMs=shape.verifiedProviderMaxRangeMinutes*MINUTE;
   for(let seg=0;seg<ranges.length;seg++){
     const [first,last]=ranges[seg];let idx=0;
     for(let cur=start+first*HOUR;cur<start+last*HOUR;cur+=maxRangeMs){
       partitions.push({segmentIndex:seg+1,partitionIndex:++idx,
         start:cur,end:Math.min(cur+maxRangeMs,start+last*HOUR)});
     }
   }
   if(partitions.length*12>MAX_QUERIES_PER_DAY)
     hold("SEGMENTED_RANGE_NEEDS_MORE_THAN_384_GETS_PER_DAY");
 }
 const selected=time(draw.selectedAtUtc,"SELECTED_AT");
 const advance=start-selected;
 if(advance<=MIN_EARLY||advance>MAX_EARLY)
   hold("REAL_EARLY_OWNER_WINDOW");
 if(!Array.isArray(input.templates)||
   (multi ? input.templates.length<=12||input.templates.length>MAX_QUERIES_PER_DAY :
     input.templates.length!==12))
   hold("MISSING_OR_EXTRA_SLOT_HORIZON_TEMPLATE");
 const seen=new Set<string>();
 const keys=new Set<string>();
 const requests:P5FidsAcquisition[]=[];
 const byCharge=new Map<string,number>();
 const earliestBySlot=new Map<P5Slot,Record<P5FidsHorizon,number>>();
 const byGroup=new Map<string,{request:number;persistentSeconds:number}[]>();
 const partitionByKey=new Map<string,P5DaySourcePartitionPin>();
 for(const candidate of input.templates){
  if(!candidate || Object.hasOwn(candidate,"icao") ||
      Object.hasOwn(candidate,"plannedAirportSelectionUtc"))
    hold("UNAPPROVED_DYNAMIC_AIRPORT_IN_TEMPLATE");
  const slot=candidate.slot,horizon=candidate.horizon;
  if(!SLOTS.includes(slot)||!HORIZONS.includes(horizon))
    hold("UNKNOWN_SLOT_OR_HORIZON");
  if(candidate.runDayIndex!==day.runDayIndex||
     candidate.budgetDayUtc!==day.scheduledStartUtc.toISOString().slice(0,10)||
     candidate.providerQueryDirection!=="Departure")
    hold("SERVICE_DAY_OR_DIRECTION_CHANGED");
  const one=draw.selections.find(v=>v.slotId===slot);
  if(!one)hold("MISSING_COMMITTED_SLOT");
  const group=segmented?
    slot+"|"+horizon+"|"+candidate.serviceWindowStartUtc+"|"+
      candidate.serviceWindowEndUtc:slot+"|"+horizon;
  if(!multi&&seen.has(group))hold("DUPLICATE_SLOT_HORIZON");
  seen.add(group);
  const groupRequests=byGroup.get(group)??[];
  if(groupRequests.length>=MAX_QUERIES_PER_GROUP)
    hold("TOO_MANY_REFRESHES_IN_GROUP");
  if(typeof candidate.queryKey!=="string"||
     !/^[a-zA-Z0-9_.:-]{8,150}$/.test(candidate.queryKey)||
     keys.has(candidate.queryKey))
    hold("DUPLICATE_OR_UNSAFE_QUERY_KEY");
  keys.add(candidate.queryKey);
  const dayWindow=time(candidate.serviceWindowStartUtc,"WINDOW_START");
  const end=time(candidate.serviceWindowEndUtc,"WINDOW_END");
  const request=time(candidate.scheduledRequestUtc,"REQUEST");
  const cutoff=time(candidate.earliestPlannedCutoffUtc,"CUTOFF");
  if(segmented&&shape){
    const part=partitions.find(p=>p.start===dayWindow&&p.end===end);
    if(!part)hold("SOURCE_NOT_EXACT_AMENDMENT_C_PARTITION");
    partitionByKey.set(candidate.queryKey,{
      queryKey:candidate.queryKey,segmentIndex:part.segmentIndex,
      partitionIndex:part.partitionIndex,windowShape:shape.windowShape,
      serviceWindowStartUtc:candidate.serviceWindowStartUtc,
      serviceWindowEndUtc:candidate.serviceWindowEndUtc,
      reviewedProviderRangeEvidenceSha256:
        shape.reviewedProviderRangeEvidenceSha256,
    });
  }else if(dayWindow!==start||end<=dayWindow||
           end>dayWindow+4*HOUR)
    hold("UNFROZEN_SERVICE_WINDOW");
  if(selected>=request||request>=cutoff)
    hold("EARLY_DRAW_OR_QUERY_AFTER_CUTOFF");
  // A source refresh is always tied to a real candidate flight-cutoff
  // instant inside its horizon's complete four-hour service population.
  if(multi && (cutoff<(segmented?dayWindow:start)-T_OFFSET[horizon]||
    cutoff>=end-T_OFFSET[horizon]))
    hold("REFRESH_CUTOFF_OUTSIDE_FROZEN_SERVICE_INTERVAL");
  if(!Number.isSafeInteger(candidate.maxResponseAndPersistSeconds)||
     candidate.maxResponseAndPersistSeconds<1||
     candidate.maxResponseAndPersistSeconds>MAX_LATENCY||
     request+candidate.maxResponseAndPersistSeconds*1000>cutoff)
    hold("SOURCE_COMMIT_MARGIN");
  if(candidate.maxAttempts!==1||candidate.apiUnitsPerAttempt!==2)
    hold("UNREVIEWED_REQUEST_UNIT_PRICE_OR_RETRY");
  const chargeDate=new Date(request).toISOString().slice(0,10);
  if(chargeDate!==candidate.physicalChargeDayUtc)
    hold("ACTUAL_UTC_CHARGE_DAY_MISMATCH");
  const row=earliestBySlot.get(slot)??{
   "T-24h":Number.NaN,"T-6h":Number.NaN,"T-90m":Number.NaN
  };
  row[horizon]=Number.isFinite(row[horizon])?
    Math.min(row[horizon],cutoff):cutoff;
  earliestBySlot.set(slot,row);
  byCharge.set(chargeDate,(byCharge.get(chargeDate)??0)+1);
  groupRequests.push({
    request,persistentSeconds:candidate.maxResponseAndPersistSeconds
  });
  byGroup.set(group,groupRequests);
  requests.push({...candidate,icao:one.icao,
    plannedAirportSelectionUtc:draw.selectedAtUtc});
 }
 const requiredGroupCount=segmented?12*partitions.length:12;
 if(seen.size!==requiredGroupCount||keys.size!==input.templates.length){
   if(segmented&&seen.size<requiredGroupCount)
     hold("MISSING_MULTI_REFRESH_HORIZON_PARTITION");
   hold("INCOMPLETE_SIGNED_QUERY_SLOTS");
 }
 if(multi&&timing){
   const stalenessMs=timing.maxPopulationStalenessSeconds*1000;
   const latencyMs=timing.maxSchedulerSlipSeconds*1000+
     timing.minimumPreCommitMarginSeconds*1000;
   for(const slot of SLOTS)for(const horizon of HORIZONS){
     const required=segmented?partitions:[
       {start,end:start+4*HOUR,segmentIndex:1,partitionIndex:1}];
     for(const part of required){
      const key=segmented?
        slot+"|"+horizon+"|"+new Date(part.start).toISOString()+"|"+
          new Date(part.end).toISOString():slot+"|"+horizon;
      const one=byGroup.get(key);
      if(!one?.length)hold("MISSING_MULTI_REFRESH_HORIZON_PARTITION");
      let covered=part.start-T_OFFSET[horizon];
      const endOfHorizon=part.end-T_OFFSET[horizon];
     for(const x of one.map(x=>({
       begins:x.request+latencyMs+x.persistentSeconds*1000,
       ends:x.request+stalenessMs
     })).sort((a,b)=>a.begins-b.begins)){
       if(x.ends<=covered)continue;
       if(x.begins>covered)
         hold("GAP_IN_ACTUAL_DYNAMIC_DAY_FLIGHT_CUTOFF_COVERAGE");
       covered=Math.max(covered,Math.min(endOfHorizon,x.ends));
       if(covered>=endOfHorizon)break;
     }
     if(covered<endOfHorizon)
       hold("GAP_IN_ACTUAL_DYNAMIC_DAY_FLIGHT_CUTOFF_COVERAGE");
     }
   }
 }
 for(const slot of SLOTS){
  const v=earliestBySlot.get(slot);
  if(!v||!(v["T-24h"]<v["T-6h"]&&v["T-6h"]<v["T-90m"]))
    hold("INCONSISTENT_T24_T6_T90_HORIZONS");
 }
 requests.sort((a,b)=>SLOTS.indexOf(a.slot)-SLOTS.indexOf(b.slot)||
   HORIZONS.indexOf(a.horizon)-HORIZONS.indexOf(b.horizon)||
   a.scheduledRequestUtc.localeCompare(b.scheduledRequestUtc)||
   a.queryKey.localeCompare(b.queryKey));
 const charges=[...byCharge.entries()].sort((a,b)=>a[0].localeCompare(b[0]))
  .map(([day,physicalRequests])=>({day,physicalRequests,candidateApiUnits:physicalRequests*2}));
 return {
  schema:segmented?
   "v39.phase5.early-draw-to-segmented-multirefresh-source-candidates-result.v3":
   multi?"v39.phase5.early-draw-to-multirefresh-source-candidates-result.v2":
   "v39.phase5.early-draw-to-12-source-candidates-result.v1",
  status:segmented?
   "DYNAMIC_SEGMENTED_MULTI_REFRESH_CANDIDATES_NOT_RELEASED":
   multi?"DYNAMIC_MULTI_REFRESH_CANDIDATES_COVER_CUTOFFS_NOT_RELEASED":
   "DYNAMIC_DAY_CANDIDATES_MATCH_COMMITTED_DRAW_NOT_RELEASED",
  runDayIndex:day.runDayIndex,selectedAtUtc:draw.selectedAtUtc,
  committedDrawSha256:draw.stateHash,
  dynamicTemplateSha256:digest({
    schema:input.schema,day:day.runDayIndex,calendar:day.calendarHash,
    config:day.configHash,frame:day.frameHash,
    contract:input.providerContractSha256,
    ...(timing?{reviewedRefreshTiming:timing}:{}),
    ...(segmented?{reviewedSegmentedSource:shape,
      sourcePartitionPins:requests.map(q=>partitionByKey.get(q.queryKey))}:{}),
    templates:requests.map(r=>({...r,icao:undefined,plannedAirportSelectionUtc:undefined}))
  }),
  sourceCandidateDigestSha256:digest({
    day:day.runDayIndex,earlyDraw:draw.stateHash,
    ...(timing?{reviewedRefreshTiming:timing}:{}),
    ...(segmented?{reviewedSegmentedSource:shape,
      sourcePartitionPins:requests.map(q=>partitionByKey.get(q.queryKey))}:{}),
    requests
  }),
  acquisitionCount:requests.length,
  plannedPhysicalGetCount:requests.length,
  candidateFidsApiUnits:requests.length*2,
  ...(timing?{reviewedRefreshTiming:timing}:{}),
  ...(segmented?{reviewedSegmentedSource:shape,
    sourcePartitionPins:requests.map(q=>partitionByKey.get(q.queryKey)!)}:{}),
  actualChargeDayUtcCounts:charges,acquisitions:requests,
  actualGithubRunPrearmVerified:false,actualSourceOriginalCommitted:false,
  actualFlightLevelPreCertified:false,authorizedSourceRights:false,
  authorizesPaidGet:false,phase5FreezePassed:false,phase6Go:false
 };
}
