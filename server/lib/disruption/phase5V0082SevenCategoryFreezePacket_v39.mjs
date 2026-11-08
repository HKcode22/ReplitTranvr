/**
 * Phase5 V0082 exact seven-category input FREEZE candidate, no database IO.
 * Only the canonical binding Stage22 31-batch-day source coverage auditor can
 * produce an eligible charge-day source plan; do NOT substitute guessed 4h
 * or a claimed already-passed hash. A valid plan is not provider use rights.
 */
import {createHash} from "node:crypto";
import {auditP5F8SegmentedSourceCoverage,
 P5_STAGE22_CATEGORIES} from "./phase5F8SegmentedSourceCoverage_v39.mjs";

const SHA=/^[a-f0-9]{64}$/;
const DIGEST=x=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const DENY=s=>{throw Error("REFUSED_P5_V0082_SEVEN_REST_FREEZE_"+s);};
const isInt=(x,a,b)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
const cats=P5_STAGE22_CATEGORIES;
const sourceCat=new Set(["FIDS_BASE_UNITS","FIDS_SPLIT_UNITS"]);
const DATE=/^\d{4}-\d\d-\d\d$/;
function exactSeven(obj,label){
 if(!obj||typeof obj!=="object"||Array.isArray(obj)||
    Object.keys(obj).length!==7||cats.some(c=>!Object.hasOwn(obj,c)||
    !isInt(obj[c],0,50000)))DENY(label+"_NOT_EXACT_SEVEN");
 return obj;
}
function utcDate(day){
 if(typeof day!=="string"||!DATE.test(day)||
    !Number.isFinite(Date.parse(day+"T00:00:00.000Z"))||
    new Date(Date.parse(day+"T00:00:00.000Z")).toISOString().slice(0,10)!==day)
  DENY("CHARGE_DAY_NOT_CANONICAL_UTC_DATE");
 return day;
}
/** Returned digest must be independently reviewed/pinned before any DB write. */
export function createP5V0082SevenRestFreezeCandidate(p){
 if(!p||p.schema!=="v39.phase5.v0082.seven-rest-freeze-input.v1"||
    !SHA.test(p.manifestSha256)||!SHA.test(p.configSha256)||
    !SHA.test(p.frameSha256)||!SHA.test(p.reviewedProviderRangeEvidenceSha256)||
    !SHA.test(p.expectedStage22CoverageInputSha256)||
    !p.coverageInput||typeof p.coverageInput!=="object"||
    DIGEST(p.coverageInput)!==p.expectedStage22CoverageInputSha256)
   DENY("RAW_31_DAY_COVERAGE_PACKET_UNREVIEWED_OR_MUTATED");
 const c=p.coverageInput;
 if(c.reviewedProviderRangeContractSha256!==
    p.reviewedProviderRangeEvidenceSha256||
    !isInt(c.providerMaxRangeMinutes,1,360)||
    c.apiUnitsPerPhysicalGet!==2)
   DENY("UNMEASURED_PROVIDER_RANGE_OR_V0079_PRICE_MISMATCH");
 let audit;
 try{audit=auditP5F8SegmentedSourceCoverage(c);}
 catch{DENY("BINDING_STAGE22_COVERAGE_REJECTED");}
 if(audit.status!=="CANDIDATE_EXPOSED_SEGMENTS_TEMPORALLY_COVERED_NOT_RELEASE"||
    audit.allHypotheticalExposedCutoffsCovered!==true||
    audit.batchDays!==31||audit.unobservedCutoffGroupCount!==0||
    audit.candidateCalendarSha256!==c.calendar.calendarSha256||
    audit.candidateRequestSetSha256!==c.expectedRequestSetSha256||
    audit.providerCalls!==0||audit.databaseWrites!==0||
    audit.phase5FreezePassed!==false||audit.phase6Go!==false)
   DENY("STAGE22_31_DAY_COVERAGE_NOT_PROVEN");
 const rawCaps=exactSeven(c.cycleCategoryCaps,"CYCLE_CAPS");
 const caps=cats.map(category=>({
    category,ceilingUnits:rawCaps[category]
 }));
 if(!isInt(c.projectCycleApiCeiling,2,50000)||
    !isInt(c.protectedApiFloorUnits,0,50000)||
    !Array.isArray(c.utcChargeBudgets)||c.utcChargeBudgets.length<1||
    c.utcChargeBudgets.length>100)
   DENY("UNSUPPORTED_CYCLE_OR_UTC_DAYS");
 const days=c.utcChargeBudgets.map(day=>{
  const chargeDayUtc=utcDate(day.utcDay);
  const category=exactSeven(day.categoryReservedUnits,"UTC_"+chargeDayUtc);
  if(!isInt(day.restDailyCeilingUnits,2,1900))
   DENY("ACTUAL_UTC_REST_CEILING_NOT_FROZEN");
  const rows=cats.map(cat=>({category:cat,plannedUnits:category[cat],
    physicallyReservedUnits:0}));
  const otherUnits=rows.filter(x=>!sourceCat.has(x.category)).
    reduce((a,x)=>a+x.plannedUnits,0);
  const fidsBaseUnits=category.FIDS_BASE_UNITS;
  const fidsSplitUnits=category.FIDS_SPLIT_UNITS;
  if(otherUnits+fidsBaseUnits+fidsSplitUnits>
     day.restDailyCeilingUnits||fidsBaseUnits%2!==0||
     fidsSplitUnits%2!==0)
   DENY("FROZEN_UTC_CATEGORY_PRICE_OR_CEILING_MISMATCH");
  return {chargeDayUtc,dailyApiCeiling:day.restDailyCeilingUnits,
    dailyOtherReservedUnits:otherUnits,
    fidsBaseUnits,fidsSplitUnits,categoryRows:rows};
 }).sort((a,b)=>a.chargeDayUtc.localeCompare(b.chargeDayUtc));
 if(new Set(days.map(d=>d.chargeDayUtc)).size!==days.length)
   DENY("DUPLICATE_UTC_DAY");
 const sums=Object.fromEntries(cats.map(cat=>[cat,0]));
 for(const d of days)for(const row of d.categoryRows)
  sums[row.category]+=row.plannedUnits;
 if(cats.some(cat=>sums[cat]!==audit.projectRestCategoryReservations[cat]||
    sums[cat]>rawCaps[cat]))
   DENY("CYCLE_RESERVATIONS_CHANGED_FROM_STAGE22");
 const otherReserved=cats.filter(cat=>!sourceCat.has(cat)).
   reduce((a,cat)=>a+sums[cat],0);
 const sourceReserved=sums.FIDS_BASE_UNITS+sums.FIDS_SPLIT_UNITS;
 const cycleTotal=otherReserved+sourceReserved+c.protectedApiFloorUnits;
 if(cycleTotal>c.projectCycleApiCeiling||
    audit.projectRestTotalReservedUnits!==otherReserved+sourceReserved||
    audit.plannedPhysicalGets*2!==sourceReserved)
   DENY("PROTECTED_CYCLE_REST_BUDGET_OR_PHYSICAL_COUNT_CHANGED");
 const canonical={
  schema:"v39.phase5.v0082.seven-rest-category-freeze-candidate.v1",
  manifestSha256:p.manifestSha256,
  calendarSha256:audit.candidateCalendarSha256,
  configSha256:p.configSha256,frameSha256:p.frameSha256,
  stage22CoverageInputSha256:p.expectedStage22CoverageInputSha256,
  reviewed31DaySourceRequestGridSha256:audit.candidateRequestSetSha256,
  reviewedProviderRangeEvidenceSha256:p.reviewedProviderRangeEvidenceSha256,
  verifiedProviderMaxRangeMinutes:c.providerMaxRangeMinutes,
  timingContractSha256:c.reviewedTimingContractSha256,
  cycleApiCeiling:c.projectCycleApiCeiling,
  protectedApiFloorUnits:c.protectedApiFloorUnits,
  cycleOtherReservedUnits:otherReserved,cycleSourceReservedUnits:sourceReserved,
  categoryCaps:caps,days
 };
 const reviewedCategoryBudgetSha256=DIGEST(canonical);
 return {
  ...canonical,reviewedCategoryBudgetSha256,
  reviewedCategoryBudgetSha256NotYetExternallySigned:true,
  mathematicalStatus:"STAGE22_EXPOSURE_COVERAGE_CANDIDATE_NOT_RELEASE",
  providerRightsCertified:false,providerRangeMeasuredByThisCode:false,
  real31DayEarlyAirportsBound:false,realSourceOriginals:0,
  databaseWrites:0,providerGets:0,phase5ScientificFreeze:false,phase6PaidGo:false
 };
}
