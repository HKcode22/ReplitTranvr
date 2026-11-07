/**
 * Phase5 Stage22: scientific source-range × cutoff-time coverage for binding
 * f.8 31 BATCH DAYS (26×4h, 3×2×2h, 2×up-to-6h).
 *
 * Accepts ONLY structurally admissible Stage21 candidate calendars. A 2×2
 * gap is NEVER in the flight population; each child segment is a separate
 * half-open service interval. Six-hour exposure is partitioned by the
 * externally VERIFIED provider request range, never assumed supported.
 *
 * Pure calculation. No DB, provider HTTP, billing, source rights, or GO.
 * Actual original availability / per-flight T are independent release gates.
 */
import {createHash} from "node:crypto";
import {auditP5F8CrossoverCandidate}
  from "./phase5F8CrossoverCalendarFreezeGuard_v39.mjs";

const SHA=/^[0-9a-f]{64}$/;
const TIME=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const MS=1000,MIN=60_000,HOUR=3_600_000;
const HORIZONS={"T-24h":24*HOUR,"T-6h":6*HOUR,"T-90m":90*MIN};
const SLOTS=["HUB","MID_A","MID_B","REGIONAL"];
export const P5_STAGE22_CATEGORIES=[
 "FIDS_BASE_UNITS","FIDS_SPLIT_UNITS","FIDS_RETRY_UNIT_BUDGET",
 "VALIDATION_UNIT_BUDGET","OUTCOME_REST_UNIT_BUDGET",
 "HISTORY_BOOTSTRAP_UNIT_BUDGET","DIAGNOSTIC_UNIT_BUDGET"
];
const deny=s=>{throw Error("REFUSED_P5_STAGE22_"+s);};
const iso=n=>new Date(n).toISOString();
const stamp=(s,label)=>{
 if(typeof s!=="string"||!TIME.test(s)||!Number.isFinite(Date.parse(s))||
    iso(Date.parse(s))!==s)deny(label+"_INVALID_UTC");
 return Date.parse(s);
};
const integer=(n,low,high,label)=>{
 if(!Number.isSafeInteger(n)||n<low||n>high)deny(label);
 return n;
};
const hash=o=>createHash("sha256").update(JSON.stringify(o)).digest("hex");

/** Keep the source candidate hash stable; it is a pin, NOT provider proof. */
export const digestP5Stage22Requests=req=>hash(req);

/**
 * Split only a real exposed segment, independent of the inactive 2×2 gap.
 * All partitions are half-open [start,end), never overlap.
 */
export function partitionP5F8ServiceSegments(day,verifiedMaxRangeMinutes){
 const range=integer(verifiedMaxRangeMinutes,1,360,"UNVERIFIED_PROVIDER_RANGE")*MIN;
 if(!Array.isArray(day?.segments))deny("MISSING_EXPOSURE_SEGMENTS");
 return day.segments.flatMap((segment,segmentIdx)=>{
  const start=stamp(segment.startUtc,"SEGMENT_START");
  const end=stamp(segment.endUtc,"SEGMENT_END");
  if(end<=start)deny("NONPOSITIVE_SERVICE_INTERVAL");
  const p=[];
  for(let cur=start;cur<end;cur+=range){
   const stop=Math.min(cur+range,end);
   p.push({
    segmentIndex:segmentIdx+1,
    partitionIndex:p.length+1,
    partStartUtc:iso(cur),partEndUtc:iso(stop),
    segmentStartUtc:iso(start),segmentEndUtc:iso(end)
   });
  }
  return p;
 });
}
function completeCategories(o,limit,label){
 if(!o||typeof o!=="object"||Array.isArray(o)||
    Object.keys(o).length!==P5_STAGE22_CATEGORIES.length||
    P5_STAGE22_CATEGORIES.some(k=>!Object.hasOwn(o,k)||
      !Number.isSafeInteger(o[k])||o[k]<0||o[k]>limit))
  deny(label+"_SEVEN_FROZEN_CATEGORIES");
 return o;
}
function groupKey(d,slot,h,seg,part){
 return [d,slot,h,seg,part].join("|");
}
function validatePlanInput(p){
 if(!p||p.schema!=="v39.phase5.f8.segmented-fids-coverage-input.v1"||
    !p.calendar||!Array.isArray(p.requests)||
    p.requests.length<1||p.requests.length>12000||
    !SHA.test(p.expectedRequestSetSha256)||
    !SHA.test(p.reviewedProviderRangeContractSha256)||
    !Array.isArray(p.utcChargeBudgets)||p.utcChargeBudgets.length>100||
    !SHA.test(p.reviewedTimingContractSha256))
  deny("INCOMPLETE_FROZEN_COVERAGE_INPUT");
 const audit=auditP5F8CrossoverCandidate(p.calendar);
 if(audit.status!=="SAT_STRUCTURAL_CANDIDATE_NOT_FINAL_FREEZE")
  deny("BINDING_F8_CALENDAR_UNSAT");
 if(digestP5Stage22Requests(p.requests)!==p.expectedRequestSetSha256)
  deny("UNREVIEWED_OR_MUTATED_REQUEST_GRID");
 integer(p.providerMaxRangeMinutes,1,360,"UNVERIFIED_PROVIDER_RANGE");
 integer(p.maxPopulationStalenessSeconds,1,86400,"MAX_STALENESS");
 integer(p.schedulerSlipSeconds,0,3600,"MAX_SCHEDULER_SLIP");
 integer(p.responseAndPersistSeconds,1,3600,"MAX_RESPONSE_AND_PERSIST");
 integer(p.preCommitMarginSeconds,1,900,"COMMIT_MARGIN");
 integer(p.apiUnitsPerPhysicalGet,1,100,"CURRENT_PRICE_UNFROZEN");
 integer(p.projectCycleApiCeiling,1,50000,"PROJECT_REST_CEILING");
 integer(p.protectedApiFloorUnits,0,50000,"PROTECTED_API_FLOOR");
 completeCategories(p.cycleCategoryCaps,50000,"CYCLE");
 const latency=(p.schedulerSlipSeconds+p.responseAndPersistSeconds+
   p.preCommitMarginSeconds)*MS;
 const stale=p.maxPopulationStalenessSeconds*MS;
 if(stale<=latency)deny("STALENESS_CANNOT_COVER_MAX_LATENCY_AND_MARGIN");
 return {latency,stale};
}
export function auditP5F8SegmentedSourceCoverage(p){
 const {latency,stale}=validatePlanInput(p);
 const grouped=new Map(),groups=[];
 const expected=new Map();
 const gapWindows=[];
 const days=new Map();
 let targetGroupCount=0;
 for(const day of p.calendar.days){
  days.set(day.runDayIndex,day);
  const segments=partitionP5F8ServiceSegments(
   day,p.providerMaxRangeMinutes);
  if(day.windowShape==="2x2h"){
   gapWindows.push({
    runDayIndex:day.runDayIndex,
    gapStartUtc:day.segments[0].endUtc,
    gapEndUtc:day.segments[1].startUtc,
    excludedFromPopulation:true
   });
  }
  for(const slot of SLOTS)for(const [horizon,offset] of
    Object.entries(HORIZONS))for(const part of segments){
   const key=groupKey(day.runDayIndex,slot,horizon,
     part.segmentIndex,part.partitionIndex);
   const start=stamp(part.partStartUtc,"PART_START")-offset;
   const end=stamp(part.partEndUtc,"PART_END")-offset;
   const desc={key,runDayIndex:day.runDayIndex,slot,horizon,
    airportIcao:day.airports[slot],...part,
    cutoffStartUtc:iso(start),cutoffEndUtc:iso(end),
    rangeRequests:[]};
   expected.set(key,desc);
   targetGroupCount++;
  }
 }
 const queryIds=new Set();
 const chargeUses=new Map();
 let baseGets=0,splitGets=0;
 for(const q of p.requests){
  if(!q||!Number.isSafeInteger(q.runDayIndex)||
     !SLOTS.includes(q.slot)||!Object.hasOwn(HORIZONS,q.horizon)||
     !Number.isSafeInteger(q.segmentIndex)||
     !Number.isSafeInteger(q.partitionIndex)||
     !/^[A-Za-z0-9_.:-]{8,160}$/.test(q.queryKey??"")||
     queryIds.has(q.queryKey))
   deny("MISSING_OR_DUPLICATE_QUERY_IDENTITY");
  queryIds.add(q.queryKey);
  const key=groupKey(q.runDayIndex,q.slot,q.horizon,
    q.segmentIndex,q.partitionIndex);
  const g=expected.get(key);
  if(!g)deny("REQUEST_OUTSIDE_EXPOSED_SEGMENT_PARTITION");
  if(q.airportIcao!==g.airportIcao||
     q.serviceIntervalStartUtc!==g.partStartUtc||
     q.serviceIntervalEndUtc!==g.partEndUtc||
     q.apiUnitsPerAttempt!==p.apiUnitsPerPhysicalGet||
     q.maxPhysicalAttempts!==1)
   deny("MUTATED_SERVICE_FRAME_PRICE_OR_RETRY");
  const t=stamp(q.scheduledGetUtc,"SCHEDULED_GET");
  const charge=iso(t).slice(0,10);
  if(q.utcChargeDay!==charge)deny("WRONG_PHYSICAL_UTC_CHARGE_DAY");
  if(g.rangeRequests.length>=32)deny("UNBOUNDED_PER_PARTITION_REFRESHES");
  g.rangeRequests.push(t);
  const u=chargeUses.get(charge)??{
   baseGets:0,splitGets:0,baseUnits:0,splitUnits:0
  };
  if(q.partitionIndex===1){
   u.baseGets++;u.baseUnits+=p.apiUnitsPerPhysicalGet;baseGets++;
  }else{
   u.splitGets++;u.splitUnits+=p.apiUnitsPerPhysicalGet;splitGets++;
  }
  chargeUses.set(charge,u);
 }
 const gaps=[];
 for(const g of expected.values()){
  if(!g.rangeRequests.length){
   gaps.push({groupKey:g.key,runDayIndex:g.runDayIndex,
     firstUncoveredCutoffUtc:g.cutoffStartUtc,
     uncoveredSeconds:(Date.parse(g.cutoffEndUtc)-
       Date.parse(g.cutoffStartUtc))/1000,
     reason:"NO_REQUEST_FOR_EXPOSED_PARTITION"});
   continue;
  }
  const start=stamp(g.cutoffStartUtc,"CUTOFF_START");
  const end=stamp(g.cutoffEndUtc,"CUTOFF_END");
  const intervals=g.rangeRequests.map(t=>({
    from:t+latency,to:t+stale
  })).sort((a,b)=>a.from-b.from||a.to-b.to);
  let covered=start;
  for(const {from,to} of intervals){
   if(to<=covered)continue;
   if(from>covered){
    const stop=Math.min(from,end);
    if(stop>covered)gaps.push({groupKey:g.key,
      runDayIndex:g.runDayIndex,
      firstUncoveredCutoffUtc:iso(covered),
      uncoveredSeconds:(stop-covered)/1000,
      reason:"STALENESS_OR_LATENCY_GAP"});
    covered=stop;
   }
   covered=Math.max(covered,Math.min(end,to));
   if(covered>=end)break;
  }
  if(covered<end)gaps.push({groupKey:g.key,
    runDayIndex:g.runDayIndex,
    firstUncoveredCutoffUtc:iso(covered),
    uncoveredSeconds:(end-covered)/1000,
    reason:"END_OF_EXPOSED_PARTITION_UNCOVERED"});
  groups.push({groupKey:g.key,requestCount:g.rangeRequests.length,
    cutoffSpanStartUtc:g.cutoffStartUtc,
    cutoffSpanEndUtc:g.cutoffEndUtc});
 }
 const charges=new Map();
 for(const b of p.utcChargeBudgets){
  if(!b||typeof b.utcDay!=="string"||
    !/^\d{4}-\d\d-\d\d$/.test(b.utcDay)||
    !Number.isFinite(Date.parse(b.utcDay+"T00:00:00.000Z"))||
    iso(Date.parse(b.utcDay+"T00:00:00.000Z")).slice(0,10)!==b.utcDay||
    charges.has(b.utcDay))
   deny("INVALID_OR_DUPLICATE_UTC_CHARGE_DAY");
  integer(b.restDailyCeilingUnits,1,50000,"REST_DAILY_CEILING");
  completeCategories(b.categoryReservedUnits,50000,"CHARGE_DAY");
  charges.set(b.utcDay,b);
 }
 const absent=[...chargeUses.keys()].filter(day=>!charges.has(day));
 if(absent.length)deny("UNBUDGETED_ACTUAL_UTC_CHARGE_DAY");
 const sums=Object.fromEntries(P5_STAGE22_CATEGORIES.map(k=>[k,0]));
 const chargeRows=[];
 for(const [day,b] of [...charges].sort((a,z)=>a[0].localeCompare(z[0]))){
  const observed=chargeUses.get(day)??{baseGets:0,splitGets:0,
   baseUnits:0,splitUnits:0};
  if(b.categoryReservedUnits.FIDS_BASE_UNITS!==observed.baseUnits||
     b.categoryReservedUnits.FIDS_SPLIT_UNITS!==observed.splitUnits)
   deny("FIDS_BASE_OR_SPLIT_CHARGE_RESERVATION_NOT_EXACT");
  const total=P5_STAGE22_CATEGORIES.reduce((v,k)=>
    v+b.categoryReservedUnits[k],0);
  if(total>b.restDailyCeilingUnits)
   deny("ACTUAL_UTC_DAY_REST_CEILING_EXCEEDED");
  for(const category of P5_STAGE22_CATEGORIES)
   sums[category]+=b.categoryReservedUnits[category];
  chargeRows.push({utcDay:day,baseGets:observed.baseGets,
   splitGets:observed.splitGets,restUnitsReserved:total,
   dailyRestCeilingUnits:b.restDailyCeilingUnits});
 }
 if(P5_STAGE22_CATEGORIES.some(k=>sums[k]>p.cycleCategoryCaps[k]))
  deny("SEVEN_CATEGORY_CYCLE_CAP_EXCEEDED");
 const total=P5_STAGE22_CATEGORIES.reduce((v,k)=>v+sums[k],0);
 if(total+p.protectedApiFloorUnits>p.projectCycleApiCeiling)
  deny("PROTECTED_CYCLE_REST_BUDGET_EXCEEDED");
 const noGaps=gaps.length===0;
 return {
  schema:"v39.phase5.f8.segmented-fids-coverage-result.v1",
  status:noGaps?
   "CANDIDATE_EXPOSED_SEGMENTS_TEMPORALLY_COVERED_NOT_RELEASE":
   "HOLD_EXPOSED_FLIGHT_CUTOFF_REFRESH_COVERAGE_GAPS",
  candidateRequestSetSha256:p.expectedRequestSetSha256,
  candidateCalendarSha256:p.calendar.calendarSha256,
  batchDays:31,expectedAirportHorizonPartitionGroups:targetGroupCount,
  plannedBasePhysicalGets:baseGets,plannedSplitPhysicalGets:splitGets,
  plannedPhysicalGets:baseGets+splitGets,
  projectedFidsBaseUnits:sums.FIDS_BASE_UNITS,
  projectedFidsSplitUnits:sums.FIDS_SPLIT_UNITS,
  projectRestCategoryReservations:sums,
  projectRestTotalReservedUnits:total,
  projectRestProtectedFloorUnits:p.protectedApiFloorUnits,
  chargeDayCount:chargeRows.length,
  chargeDays:chargeRows,
  excludedGapWindows:gapWindows,
  unobservedCutoffGroupCount:new Set(gaps.map(x=>x.groupKey)).size,
  temporalCoverageGaps:gaps.slice(0,100),
  allHypotheticalExposedCutoffsCovered:noGaps,
  accountedProviderRangeSplits:true,
  authenticProviderMaxRangeIndependentlyMeasured:false,
  actualFidsSourceAvailableAtVerified:false,
  flightMembershipAndNativeSelectedTVerified:false,
  actualSevenCategoryLiveSpendAndRightsVerified:false,
  adaptiveSelectedAirportsDurablyFrozenBeforeGet:false,
  livePreWriterAndPostOutcomesCertified:false,
  scientificSelectionBiasResolved:false,
  providerCalls:0,databaseWrites:0,paidAlertCreates:0,
  phase5FreezePassed:false,phase6Go:false
 };
}
