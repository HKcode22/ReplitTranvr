/**
 * Amendment E2: pure research-output structural and mathematical consistency
 * guard. NO model, no prediction training, no source rights certification,
 * no live SQL, no paid provider, no existing PRE writer replacement.
 *
 * Ensures a proposed consumer-friendly set of outputs does not contradict
 * itself or leak AIRBORNE information into a PRE prediction timestamp.
 * Caller must independently authenticate each input's source provenance
 * and meaning; booleans/hash fields cannot certify source truth.
 */
export interface P5E2Base {
  forecastId:string;
  issuedAtUtc:string;
  maxInputAvailableAtUtc:string;
  stage:"PRE_DEPARTURE"|"AIRBORNE";
  modelStatus:"RESEARCH_ONLY_NOT_VALIDATED";
}
export interface P5E2Pre extends P5E2Base{
  stage:"PRE_DEPARTURE";
  horizon:"T-24h"|"T-6h"|"T-90m";
  cutoffUtc:string;
  operatedFlightDelayMinutes:{
   q10:number;q50:number;q90:number;
   pAtLeast15:number;pAtLeast30:number;pAtLeast60:number;pAtLeast120:number;
   isConditionalOnActuallyOperating:true;
  }|null;
  airborneTrackEvidence:null;
  arrivalEtaUtc:null;
}
export interface P5E2Airborne extends P5E2Base{
  stage:"AIRBORNE";
  horizon:null;
  cutoffUtc:null;
  operatedFlightDelayMinutes:null;
  airborneTrackEvidence:{
    independentlyAuthenticatedOutsideThisFunction:false;
    latestPositionReceivedAtUtc:string;
  };
  arrivalEtaUtc:{
    q10:string;q50:string;q90:string;
    requestedArrivalMilestone:"WHEELS_ON"|"GATE_IN";
  }|null;
}
export type P5E2ForecastCandidate=P5E2Pre|P5E2Airborne;
const hold=(message:string):never=>{throw Error("P5_E2_RESEARCH_FORECAST_REFUSED_"+message);};
function utc(s:string):number{
 if(typeof s!=="string"||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(s)||
    !Number.isFinite(Date.parse(s))||
    new Date(Date.parse(s)).toISOString()!==s)hold("INVALID_UTC");
 return Date.parse(s);
}
const prob=(n:number):boolean=>
 typeof n==="number"&&Number.isFinite(n)&&n>=0&&n<=1;
export function reviewP5E2ForecastCandidateOffline(candidate:P5E2ForecastCandidate){
 if(!candidate||typeof candidate!=="object"||
    typeof candidate.forecastId!=="string"||
    candidate.forecastId.length<5||
    candidate.forecastId.length>200||
    candidate.modelStatus!=="RESEARCH_ONLY_NOT_VALIDATED")hold("INVALID_MODEL_AUTHORITY");
 const forecastClock=utc(candidate.issuedAtUtc);
 if(utc(candidate.maxInputAvailableAtUtc)>forecastClock)hold("FUTURE_DATA_LEAKAGE");
 if(candidate.stage==="PRE_DEPARTURE"){
  if(candidate.horizon!=="T-24h"&&candidate.horizon!=="T-6h"&&
     candidate.horizon!=="T-90m")hold("UNRECOGNIZED_PRE_HORIZON");
  // A genuine PRE prediction may be published BEFORE its future cutoff.
  // Do not require exact timestamp equality: Stage14 intentionally commits
  // inside a bounded lead window, and early forecasts are time-valid too.
  if(forecastClock>utc(candidate.cutoffUtc))
   hold("PRE_FORECAST_AFTER_OWN_CUTOFF");
  if(candidate.airborneTrackEvidence!==null||
     candidate.arrivalEtaUtc!==null)hold("POST_DEPARTURE_DATA_IN_PRE");
  const d=candidate.operatedFlightDelayMinutes;
  if(d!==null){
   if(!d||d.isConditionalOnActuallyOperating!==true||
      ![d.q10,d.q50,d.q90].every(x=>
         typeof x==="number"&&Number.isFinite(x)&&x>=-1440&&x<=10080)||
      !(d.q10<=d.q50&&d.q50<=d.q90))
    hold("INVALID_DELAY_QUANTILES");
   const p=[d.pAtLeast15,d.pAtLeast30,d.pAtLeast60,d.pAtLeast120];
   if(!p.every(prob)||!(p[0]>=p[1]&&p[1]>=p[2]&&p[2]>=p[3]))
    hold("IMPOSSIBLE_THRESHOLD_PROBABILITY_ORDER");
  }
 } else if(candidate.stage==="AIRBORNE"){
  if(candidate.horizon!==null||candidate.cutoffUtc!==null||
     candidate.operatedFlightDelayMinutes!==null)
   hold("AIRBORNE_NOT_SEPARATE_MODEL_STATE");
  if(!candidate.airborneTrackEvidence||
     candidate.airborneTrackEvidence.independentlyAuthenticatedOutsideThisFunction!==false||
     utc(candidate.airborneTrackEvidence.latestPositionReceivedAtUtc)>forecastClock)
   hold("MISSING_OR_FUTURE_AIRBORNE_TRACK_PROVENANCE");
  const eta=candidate.arrivalEtaUtc;
  if(eta!==null){
   const q=[utc(eta.q10),utc(eta.q50),utc(eta.q90)];
   if(!["WHEELS_ON","GATE_IN"].includes(eta.requestedArrivalMilestone)||
      !(q[0]<=q[1]&&q[1]<=q[2])||
      q[0]<forecastClock)
    hold("INVALID_OR_PAST_ARRIVAL_ETA_QUANTILES");
  }
 } else hold("INVALID_STAGE");
 return {
  schema:"v39.phase5.e2-research-forecast-consistency-offline.v1",
  status:"STRUCTURALLY_CONSISTENT_RESEARCH_ONLY_NOT_DEPLOYED",
  stage:candidate.stage,forecastId:candidate.forecastId,
  sourceContentsRightsVerifiedByThisFunction:false,
  actualFlightAndLabelTruthCertifiedByThisFunction:false,
  modelFitPerformed:false,modelAccuracyEvaluated:false,
  realPredictionGenerated:false,
  paidProviderCalls:0,liveDatabaseWrites:0,
  phase5ScientificFreeze:false,phase6PaidGo:false
 } as const;
}
