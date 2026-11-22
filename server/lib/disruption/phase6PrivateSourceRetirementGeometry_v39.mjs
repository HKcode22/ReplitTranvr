/** Gate 3 scientific bound from the already frozen 31-day SOURCE plans.
 *
 * This is a PURE REVIEW; never signs a terminal consumer, deletes bytes, or
 * authorizes SOURCE reuse / provider caching / paid GO. The 7-day provider cap
 * is an OUTER limit, and signed last-use and purpose limits may be shorter.
 * A green geometric margin cannot replace independent Packet B/derived release.
 */
const HOUR=3600000,MIN=60000;
const HORIZONS=new Set(["T-24h","T-6h","T-90m"]);
const SLOTS=new Set(["HUB","MID_A","MID_B","REGIONAL"]);
const hold=s=>{throw Error("HOLD_P6_SOURCE_RETIREMENT_GEOMETRY_"+s);};
const time=s=>{
 if(typeof s!=="string"||!Number.isFinite(Date.parse(s))||
    new Date(Date.parse(s)).toISOString()!==s)hold("INVALID_UTC");
 return Date.parse(s);
};
export const SOURCE_PROVIDER_STANDARD_MAX_HOURS=168;
export const MAX_REVIEWED_SOURCE_AGE_HOURS=24;
export const MAX_REVIEWED_POST_WINDOW_HOURS=48;
export const MAX_GITHUB_CHILD_DRAIN_HOURS=6;
export const EARLY_RETIRE_READBACK_MARGIN_HOURS=1;

/** Static frozen plan only, NOT live per-flight source use or source-retirement approval. */
export function auditP6PrivateSourceDayGeometry(plan,{signedReviewAtUtc,signedRetentionNotAfterUtc}={}){
 if(!plan||plan.schema!=="v39.phase6.reviewed-future-day-source-plan.v1"||
   !Number.isInteger(plan.runDayIndex)||plan.runDayIndex<1||plan.runDayIndex>31||
   !Array.isArray(plan.templates)||plan.templates.length<13||
   plan.templates.length>384||
   !plan.reviewedRefreshTiming||!Number.isInteger(plan.reviewedRefreshTiming.maxPopulationStalenessSeconds)||
   plan.reviewedRefreshTiming.maxPopulationStalenessSeconds<1||
   plan.reviewedRefreshTiming.maxPopulationStalenessSeconds>86400||
   typeof plan.expectedServiceStartUtc!=="string")
  hold("UNAUTHENTICATED_DAY_PLAN_SHAPE");
 const serviceStart=time(plan.expectedServiceStartUtc),queryKeys=new Set();
 let first=Infinity,lastService=-Infinity,lastRequest=-Infinity;
 const horizons=new Map();
 const slots=new Map();
 for(const q of plan.templates){
  if(!q||q.runDayIndex!==plan.runDayIndex||
   !SLOTS.has(q.slot)||!HORIZONS.has(q.horizon)||
   typeof q.queryKey!=="string"||!new RegExp("^p6[.]d"+plan.runDayIndex+"[.]").test(q.queryKey)||
   queryKeys.has(q.queryKey)||
   q.providerQueryDirection!=="Departure"||q.apiUnitsPerAttempt!==2||q.maxAttempts!==1||
   q.budgetDayUtc!==new Date(serviceStart).toISOString().slice(0,10)||
   !Number.isInteger(q.maxResponseAndPersistSeconds)||q.maxResponseAndPersistSeconds<1||
   q.maxResponseAndPersistSeconds>3600)hold("UNSIGNED_TEMPLATE_MUTATION");
  queryKeys.add(q.queryKey);
  const requested=time(q.scheduledRequestUtc),cutoff=time(q.earliestPlannedCutoffUtc),
   begin=time(q.serviceWindowStartUtc),end=time(q.serviceWindowEndUtc);
  if(requested>=cutoff||begin>=end||end-begin>6*HOUR||
     requested>=end||end<serviceStart||end>serviceStart+30*HOUR)
   hold("INVALID_PROSPECTIVE_TEMPORAL_GEOMETRY");
  first=Math.min(first,requested);lastRequest=Math.max(lastRequest,requested);
  lastService=Math.max(lastService,end);
  horizons.set(q.horizon,(horizons.get(q.horizon)||0)+1);
  slots.set(q.slot,(slots.get(q.slot)||0)+1);
 }
 if(horizons.size!==3||slots.size!==4||
    horizons.get("T-24h")!==horizons.get("T-6h")||
    horizons.get("T-6h")!==horizons.get("T-90m")||
    new Set(slots.values()).size!==1||
    first>=lastService||lastRequest>lastService)
  hold("UNBALANCED_STUDY_FRAME");
 // Reviewed native POST policy has an independent <=48h hard bound.
 // Include 6h GH job ceiling for already admitted in-flight work, 1h
 // positive readback margin. Do not infer Phase7 Packet B completion.
 const lastPost=lastService+MAX_REVIEWED_POST_WINDOW_HOURS*HOUR;
 const pastInflight=lastPost+MAX_GITHUB_CHILD_DRAIN_HOURS*HOUR;
 const requireRetirementBefore=first+
  (SOURCE_PROVIDER_STANDARD_MAX_HOURS-MAX_REVIEWED_SOURCE_AGE_HOURS)*HOUR;
 const hardSourceMarginMs=requireRetirementBefore-pastInflight-
  EARLY_RETIRE_READBACK_MARGIN_HOURS*HOUR;
 if(hardSourceMarginMs<=0)hold("PROVIDER_BOUND_NONPOSITIVE");
 const result={schema:"v39.phase6.source-day-terminal-geometry-audit.v1",
  day:plan.runDayIndex,templates:plan.templates.length,
  firstQueryUtc:new Date(first).toISOString(),
  lastScheduledQueryUtc:new Date(lastRequest).toISOString(),
  lastServiceEndUtc:new Date(lastService).toISOString(),
  maximumProspectivePostEndUtc:new Date(lastPost).toISOString(),
  earliestSafePostJobDrainUtc:new Date(pastInflight).toISOString(),
  hypotheticalProviderCapNotBeforeUtc:new Date(requireRetirementBefore).toISOString(),
  sourceToServiceEndHours:(lastService-first)/HOUR,
  positiveConservativeProviderMarginHours:hardSourceMarginMs/HOUR,
  consumerAndDerivedResearchReleaseVerified:false,
  physicalDeletionScheduledOrVerified:false,phase6PaidGo:false};
 if(signedReviewAtUtc===undefined||signedRetentionNotAfterUtc===undefined)
  return {...result,independentSignedPrivateExpiryVerified:false};
 const reviewed=time(signedReviewAtUtc),expires=time(signedRetentionNotAfterUtc);
 if(reviewed>first||expires<=reviewed||expires>reviewed+96*HOUR||
   expires<=pastInflight+EARLY_RETIRE_READBACK_MARGIN_HOURS*HOUR)
  hold("SIGNED_EXPIRY_TOO_SHORT_OR_REVIEW_AFTER_FIRST_QUERY");
 return {...result,actualSignedRetirementNotAfterUtc:new Date(expires).toISOString(),
  positiveSignedRetirementMarginHours:(expires-pastInflight-
   EARLY_RETIRE_READBACK_MARGIN_HOURS*HOUR)/HOUR,
  independentSignedPrivateExpiryVerified:false};
}
