/**
 * Phase5/Phase6 PRE-GO V0082 physical-UTC seven-category cost-envelope
 * adapter. Real prospective ordinary-day airport IDs are not yet available.
 *
 * The prelaunch budget is an independently REVIEWABLE upper bound, not an
 * invoice or a claim that every future source GET is already signed.
 *
 * This is an OFFLINE DRAFT, NOT an input to the EXISTING Stage22-only V0082
 * production writer and NOT a substitute for exact query partition validation.
 * No database, provider API, paid billing, network, activation or role changes.
 */
import {createHash} from "node:crypto";
import {buildP5PrelaunchSlotBudgetEnvelope} from
 "./phase5PrelaunchUnknownAirportSlotBudgetEnvelope_v39.mjs";

const sha=x=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const SHA=/^[0-9a-f]{64}$/;
const ICAO=/^[A-Z]{4}$/;
const DATE=/^\d{4}-\d\d-\d\d$/;
const ALL=[
 "FIDS_BASE_UNITS","FIDS_SPLIT_UNITS","FIDS_RETRY_UNIT_BUDGET",
 "VALIDATION_UNIT_BUDGET","OUTCOME_REST_UNIT_BUDGET",
 "HISTORY_BOOTSTRAP_UNIT_BUDGET","DIAGNOSTIC_UNIT_BUDGET"
];
const PHYSICAL=["FIDS_BASE_UNITS","FIDS_SPLIT_UNITS"];
const hold=x=>{throw Error("REFUSED_P5_V0082_COST_ONLY_PRELAUNCH_"+x);};
const num=x=>Number.isSafeInteger(x)&&x>=0&&x<=50000;
const canonicalDate=x=>typeof x==="string"&&DATE.test(x)&&
 Number.isFinite(Date.parse(x+"T00:00:00.000Z"))&&
 new Date(Date.parse(x+"T00:00:00.000Z")).toISOString().slice(0,10)===x;
const isKey=(p,keys)=>p&&typeof p==="object"&&!Array.isArray(p)&&
 Object.keys(p).length===keys.length&&
 keys.every(k=>Object.hasOwn(p,k));
const DAY=["chargeDayUtc","dailyApiCeiling","dailyOtherReservedUnits",
 "fidsBaseUnits","fidsSplitUnits","categoryRows"];
const SOURCE=["queryDigest","manifestSha256","plannedChargeUtcDate",
 "restCategory","airportIcao","earlyDrawSha256",
 "reviewedReleaseSha256","rightsReviewSha256",
 "reviewedProviderRangeSha256"];

export function buildP5V0082UnknownAirportSevenCostOnlyDraft(p){
 if(!p||p.schema!=="v39.phase5.v0082-cost-only-from-slot-input.v1"||
    !p.slotBudgetInput||p.expectedReviewerSlotEnvelopeSha256!==undefined&&
     !SHA.test(p.expectedReviewerSlotEnvelopeSha256))
  hold("UNREVIEWED_OR_MALFORMED_SLOT_BUDGET_INPUT");
 // Recompute all 31×3×four-slot physical UTC dates from actual shape
 // and bounds; NEVER trust supplied cap rows or guessed airports.
 const source=buildP5PrelaunchSlotBudgetEnvelope(p.slotBudgetInput);
 if(p.expectedReviewerSlotEnvelopeSha256!==undefined&&
    p.expectedReviewerSlotEnvelopeSha256!==source.prelaunchEnvelopeSha256)
  hold("REVIEWED_SLOT_ENVELOPE_DIGEST_CHANGED");
 if(source.status!=="SLOT_BUDGET_ONLY_CANDIDATE_AIRPORT_IDENTITIES_NOT_FROZEN"||
    source.actualFlightQueryGridCertified!==false||
    source.ordinaryAdaptiveAirportDaysUnselected!==21||
    source.physicalGetReservations!==0||source.phase6PaidGo!==false||
    source.providerCalls!==0||source.databaseWrites!==0)
  hold("FALSE_POSITIVE_PRELAUNCH_AUTHORIZATION");
 const caps=new Map(ALL.map(c=>[c,0]));
 const days=source.utcCategoryRows.map(d=>{
  if(!canonicalDate(d.chargeDayUtc)||
     !isKey(d.categories,ALL)||
     ALL.some(k=>!num(d.categories[k]))||
     d.fidsBaseUnits!==d.categories.FIDS_BASE_UNITS||
     d.fidsSplitUnits!==d.categories.FIDS_SPLIT_UNITS||
     (d.fidsBaseUnits+d.fidsSplitUnits)%2!==0)
   hold("INCOMPLETE_SEVEN_REST_OR_FIDS_PHYSICAL_PRICE");
  const categoryRows=ALL.map(category=>{
   const plannedUnits=d.categories[category];
   caps.set(category,caps.get(category)+plannedUnits);
   return {category,plannedUnits,physicallyReservedUnits:0};
  });
  if(categoryRows.reduce((n,c)=>n+c.plannedUnits,0)>d.dailyRestCeilingUnits)
   hold("UTC_CHARGE_DAY_FROZEN_CAP_OVERDRAW");
  return {
   chargeDayUtc:d.chargeDayUtc,
   dailyApiCeiling:d.dailyRestCeilingUnits,
   dailyOtherReservedUnits:d.dailyOtherReservedUnits,
   fidsBaseUnits:d.fidsBaseUnits,fidsSplitUnits:d.fidsSplitUnits,
   categoryRows
  };
 });
 if(days.length<31||days.length>100||
    new Set(days.map(x=>x.chargeDayUtc)).size!==days.length)
  hold("INCOMPLETE_ALL_REAL_UTC_CHARGE_DATES");
 const categoryCaps=ALL.map(category=>({
  category,ceilingUnits:caps.get(category)
 }));
 if(categoryCaps.some(c=>!num(c.ceilingUnits)))
  hold("CYCLE_CATEGORY_CAP_TOO_LARGE");
 const cycleSourceReservedUnits=PHYSICAL.reduce(
  (n,c)=>n+caps.get(c),0);
 const cycleOtherReservedUnits=ALL.filter(x=>!PHYSICAL.includes(x)).
  reduce((n,c)=>n+caps.get(c),0);
 if(cycleSourceReservedUnits!==source.cycleSourceUnits||
    cycleOtherReservedUnits!==source.cycleOtherUnits||
    cycleSourceReservedUnits!==source.physicalGetsUpperBound*2||
    cycleOtherReservedUnits+cycleSourceReservedUnits+
      source.protectedRestFloorUnits>source.cycleRestCeilingUnits)
  hold("SOURCE_CHARGE_DATE_TOTALS_NOT_RECONCILED");
 const canonical={
  schema:"v39.phase5.v0082-cost-only-seven-category-draft.v1",
  sourceSlotBudgetSha256:source.prelaunchEnvelopeSha256,
  manifestSha256:source.manifestSha256,
  calendarSha256:source.calendarSha256,
  configSha256:source.configSha256,
  frameSha256:source.frameSha256,
  reviewedProviderRangeEvidenceSha256:source.providerRangeEvidenceSha256,
  timingEvidenceSha256:source.timingEvidenceSha256,
  providerMaxRangeMinutes:source.providerMaxRangeMinutes,
  plannedPhysicalGetsUpperBound:source.physicalGetsUpperBound,
  cycleApiCeiling:source.cycleRestCeilingUnits,
  protectedApiFloorUnits:source.protectedRestFloorUnits,
  cycleSourceReservedUnits,cycleOtherReservedUnits,
  categoryCaps,days
 };
 return {
  ...canonical,costOnlyCategoryDraftSha256:sha(canonical),
  status:"COST_ONLY_SEVEN_CATEGORY_UTC_DRAFT_NOT_V0082_STAGE22_SOURCE_RELEASE",
  originalExistingV0082WriterCompatible:false,
  originalExistingV0082ExactQueryEqualityCompatible:false,
  unsignedFutureOrdinaryAirports:21,
  exactActualSourceQueriesAuthenticated:0,
  sourceRequestGridSha256:null,
  sourceLicenseAuthenticatedByThisDraft:false,
  exactRequestPartitionAuthenticatedByThisDraft:false,
  separateCostOnlyV0082ReleaseImplementationInstalled:false,
  physicallyReservedUnits:0,providerCalls:0,dbWrites:0,
  phase5ScientificFreeze:false,phase6PaidGo:false
 };
}

/**
 * Pure unit-accounting comparison for one physical UTC date AFTER some
 * future real airport draws have released signed source metadata.
 *
 * Does NOT inspect the live DB, authenticate signing credentials, verify
 * provider response, perform physical reservation, or mark a query ACTIVE.
 * The existing V0079 immutable early_draw, rights, original, and
 * V0082 exact partition guards must all STILL hold at physical dispatch.
 */
export function inspectP5V0082DynamicSignedSourceAgainstCostOnlyCap(p){
 const {candidate:c,chargeDayUtc,knownSignedQueryMetadata:q}=p??{};
 if(!c||c.schema!=="v39.phase5.v0082-cost-only-seven-category-draft.v1"||
    c.status!=="COST_ONLY_SEVEN_CATEGORY_UTC_DRAFT_NOT_V0082_STAGE22_SOURCE_RELEASE"||
    c.originalExistingV0082WriterCompatible!==false||
    c.phase6PaidGo!==false||
    !SHA.test(c.costOnlyCategoryDraftSha256)||
    !Array.isArray(c.days)||!Array.isArray(c.categoryCaps)||
    !canonicalDate(chargeDayUtc)||!Array.isArray(q))
  hold("NOT_AN_INERT_SEVEN_CATEGORY_REVIEW_CANDIDATE");
 const {costOnlyCategoryDraftSha256,status,
  originalExistingV0082WriterCompatible,
  originalExistingV0082ExactQueryEqualityCompatible,
  unsignedFutureOrdinaryAirports,
  exactActualSourceQueriesAuthenticated,
  sourceRequestGridSha256,
  sourceLicenseAuthenticatedByThisDraft,
  exactRequestPartitionAuthenticatedByThisDraft,
  separateCostOnlyV0082ReleaseImplementationInstalled,
  physicallyReservedUnits,providerCalls,dbWrites,
  phase5ScientificFreeze,phase6PaidGo,...canonical}=c;
 if(sha(canonical)!==c.costOnlyCategoryDraftSha256||
    c.unsignedFutureOrdinaryAirports!==21||
    c.sourceRequestGridSha256!==null||
    c.originalExistingV0082ExactQueryEqualityCompatible!==false||
    c.separateCostOnlyV0082ReleaseImplementationInstalled!==false||
    c.providerCalls!==0||c.dbWrites!==0)
  hold("COST_ONLY_REVIEW_PACKET_TAMPERED");
 const day=c.days.find(x=>x.chargeDayUtc===chargeDayUtc);
 if(!day||!isKey(day,DAY)||day.categoryRows.length!==7||
    day.categoryRows.some(x=>!ALL.includes(x.category)||
      !num(x.plannedUnits)||x.physicallyReservedUnits!==0)||
    new Set(day.categoryRows.map(x=>x.category)).size!==7)
  hold("NO_SIGNED_CHARGE_DATE_ENVELOPE");
 const base=day.categoryRows.find(x=>x.category==="FIDS_BASE_UNITS");
 const split=day.categoryRows.find(x=>x.category==="FIDS_SPLIT_UNITS");
 if(!base||!split||base.plannedUnits!==day.fidsBaseUnits||
    split.plannedUnits!==day.fidsSplitUnits)
  hold("SOURCE_COST_CATEGORIES_DIFFER");
 const visited=new Set(),observed={"FIDS_BASE_UNITS":0,"FIDS_SPLIT_UNITS":0};
 for(const row of q){
  if(!isKey(row,SOURCE)||!SHA.test(row.queryDigest)||
     !SHA.test(row.earlyDrawSha256)||
     !SHA.test(row.reviewedReleaseSha256)||
     !SHA.test(row.rightsReviewSha256)||
     !SHA.test(row.reviewedProviderRangeSha256)||
     row.reviewedProviderRangeSha256!==c.reviewedProviderRangeEvidenceSha256||
     row.manifestSha256!==c.manifestSha256||
     row.plannedChargeUtcDate!==chargeDayUtc||
     !PHYSICAL.includes(row.restCategory)||!ICAO.test(row.airportIcao)||
     visited.has(row.queryDigest))
    hold("UNAUTHENTICATED_OR_DUPLICATE_FUTURE_SIGNED_QUERY_METADATA");
  visited.add(row.queryDigest);
  observed[row.restCategory]+=2;
 }
 if(observed.FIDS_BASE_UNITS>base.plannedUnits||
    observed.FIDS_SPLIT_UNITS>split.plannedUnits||
    observed.FIDS_BASE_UNITS+observed.FIDS_SPLIT_UNITS+
       day.dailyOtherReservedUnits>day.dailyApiCeiling)
  hold("ACTUAL_SIGNED_QUERY_UNITS_EXCEED_PRELAUNCH_CAP");
 return {
  schema:"v39.phase5.v0082-dynamic-source-cost-only-reconciliation.v1",
  status:q.length?
    "SIGNED_QUERY_METADATA_WITHIN_UPPER_CAP_NOT_DB_VERIFIED_NO_GO":
    "UNSPENT_BUDGET_NO_QUERIES_YET_NOT_RELEASE",
  chargeDayUtc,sourceSlotBudgetSha256:c.sourceSlotBudgetSha256,
  candidateCostOnlySha256:c.costOnlyCategoryDraftSha256,
  actualKnownQueries:q.length,
  reviewedSignedMetadataSha256:q.length?sha(q):null,
  observedBaseSourceUnits:observed.FIDS_BASE_UNITS,
  observedSplitSourceUnits:observed.FIDS_SPLIT_UNITS,
  unspentUpperBoundBaseUnits:base.plannedUnits-observed.FIDS_BASE_UNITS,
  unspentUpperBoundSplitUnits:split.plannedUnits-observed.FIDS_SPLIT_UNITS,
  exactSourceRequestAndFlightIdentityDbVerified:false,
  realFrozenEarlyDrawAuthenticated:false,
  providerRequestActuallySent:false,
  physicalReservationCommitted:false,
  requiredV0093CostOnlyAdmissionInstalled:false,
  independentlyVerifiedProviderRights:false,
  providerCalls:0,dbWrites:0,phase5ScientificFreeze:false,
  phase6PaidGo:false
 };
}
