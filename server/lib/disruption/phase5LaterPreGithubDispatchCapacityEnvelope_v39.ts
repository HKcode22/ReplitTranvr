/**
 * Mathematical, NO-PROVIDER, NO-SQL, NO-GH-ACTION simulation of the existing
 * Phase5 signed later-PRE scheduler's four-child/ten-minute upper bound.
 *
 * All inputs represent explicitly supplied/prospective registry/native T
 * and future assumed successful GitHub poll times. The result is optimistic
 * feasibility analysis, NEVER an assertion that GH ran, PRE committed,
 * source rights were granted or Phase6 may start. A failure even under
 * perfect polls reveals a real design capacity shortfall before release.
 */
const FILE=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_-]{8,100}\.json$/;
const ID=/^[a-zA-Z0-9_.:|-]{5,200}$/;
const SHA=/^[a-f0-9]{64}$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const MS_MIN=60000;
const LEAD_START=90*MS_MIN;
const LEAD_END=15*MS_MIN;
const POLL_MIN=10*MS_MIN;
const MAX=30000;
const hold=(s:string):never=>{
 throw Error("REFUSED_P5_LATER_PRE_CAPACITY_"+s);
};
function time(s:string):number{
 if(typeof s!=="string"||!ISO.test(s)||
    !Number.isFinite(Date.parse(s))||
    new Date(s).toISOString()!==s)
  hold("NON_NATIVE_OR_UNREVIEWED_CLOCK");
 return Date.parse(s);
}
const iso=(x:number)=>new Date(x).toISOString();
export interface P5CapacitySignedLaterFlightHorizon{
 packetPath:string;
 flightInstanceId:string;
 horizon:"T-6h"|"T-90m";
 selectedTNativeUtc:string;
 /** Earliest actual external signature/publication time, provided by
  * independent signing evidence; NOT invented from scheduled T. */
 registeredAtUtc:string;
 packetSha256:string;
}
export type P5CapacityOutcome=
 "OPTIMISTIC_GITHUB_REQUEST_SLOT"|
 "CENSORED_PACKET_ISSUED_TOO_LATE_FOR_HORIZON"|
 "CENSORED_NOT_ENOUGH_GITHUB_POLL_CAPACITY"|
 "INCOMPLETE_SIMULATED_POLL_WINDOW";
export interface P5CapacityPerHorizonResult{
 packetPath:string;flightInstanceId:string;
 horizon:"T-6h"|"T-90m";
 nativeSelectedTUtc:string;
 cutoffUtc:string;
 registeredAtUtc:string;
 optimisticDispatchPollUtc:string|null;
 status:P5CapacityOutcome;
}
export interface P5LaterPreCapacityEnvelope{
 schema:"v39.phase5.later-pre-gh-capacity-envelope.v1";
 status:"MATHEMATICAL_ONLY_NOT_REAL_GITHUB_OR_PRE";
 simulationEndUtc:string;
 simulatedPolls:number;
 maxRequestsPerPoll:number;
 nominalRequestsPerContinuousHour:number;
 proposedFlightHorizons:number;
 optimisticAcceptedRequests:number;
 publishedTooLate:number;
 prospectiveCapacityMisses:number;
 futureUnassessed:number;
 results:P5CapacityPerHorizonResult[];
 providerCalls:0;databaseReads:0;databaseWrites:0;
 realGithubDispatches:0;actualPreSnapshotsCommitted:0;
 lawfulSourceUseCertified:false;
 capacityMeasuredFromProduction:false;
 phase5ScientificFreezeGranted:false;phase6PaidGoGranted:false;
}
/**
 * Earliest-deadline-first schedule for already independently signed future
 * flight/horizon packets. No artificial T24 requirement: a T6/T90 with
 * HONEST_T24_UNOBSERVED remains independently classifiable for capacity,
 * but this analysis never authorizes that separate scientific amendment.
 */
export function assessP5SignedLaterPreGithubCapacity(
 horizons:readonly P5CapacitySignedLaterFlightHorizon[],
 assumedPollUtc:readonly string[],
 simulationEndUtc:string,
 maxRequestsPerPoll=4
):P5LaterPreCapacityEnvelope{
 if(!Array.isArray(horizons)||horizons.length<1||
    horizons.length>MAX||
    !Array.isArray(assumedPollUtc)||assumedPollUtc.length<1||
    assumedPollUtc.length>5000||
    !Number.isSafeInteger(maxRequestsPerPoll)||
    maxRequestsPerPoll<1||maxRequestsPerPoll>4)
  hold("UNBOUNDED_OR_OVERCAPACITY_MODEL");
 const end=time(simulationEndUtc);
 const polls=assumedPollUtc.map(time);
 for(let i=0;i<polls.length;i++){
  if(polls[i]>end||
     (i>0&&polls[i]-polls[i-1]<POLL_MIN))
   hold("IMPOSSIBLE_OR_FUTURE_GITHUB_POLL_GRID");
 }
 type Entry={
  src:P5CapacitySignedLaterFlightHorizon;
  registered:number;native:number;cutoff:number;close:number;
 };
 const seenPath=new Set<string>(),seenPair=new Set<string>();
 const entries:Entry[]=horizons.map(h=>{
  if(!h||!FILE.test(h.packetPath??"")||
     !ID.test(h.flightInstanceId??"")||
     !SHA.test(h.packetSha256??"")||
     !["T-6h","T-90m"].includes(h.horizon)||
     seenPath.has(h.packetPath)||
     seenPair.has(h.flightInstanceId+"|"+h.horizon))
   hold("UNSIGNED_DUPLICATE_OR_INVALID_NATIVE_HORIZON");
  seenPath.add(h.packetPath);
  seenPair.add(h.flightInstanceId+"|"+h.horizon);
  const native=time(h.selectedTNativeUtc),registered=time(h.registeredAtUtc);
  const cutoff=native-(h.horizon==="T-6h"?6*3600_000:90*MS_MIN);
  return{src:h,registered,native,cutoff,close:cutoff-LEAD_END};
 });
 const selected=new Map<string,number>();
 for(const tick of polls){
  const eligible=entries
   .filter(e=>!selected.has(e.src.packetPath)&&
      e.registered<=tick&&
      tick>=e.cutoff-LEAD_START&&
      tick<e.close)
   .sort((a,b)=>a.close-b.close||
     a.src.packetPath.localeCompare(b.src.packetPath));
  for(const e of eligible.slice(0,maxRequestsPerPoll))
   selected.set(e.src.packetPath,tick);
 }
 const results:P5CapacityPerHorizonResult[]=entries.map(e=>{
  const accepted=selected.get(e.src.packetPath);
  const status:P5CapacityOutcome=accepted!==undefined?
   "OPTIMISTIC_GITHUB_REQUEST_SLOT":
   e.registered>=e.close?
    "CENSORED_PACKET_ISSUED_TOO_LATE_FOR_HORIZON":
    end<e.close?
     "INCOMPLETE_SIMULATED_POLL_WINDOW":
     "CENSORED_NOT_ENOUGH_GITHUB_POLL_CAPACITY";
  return{
   packetPath:e.src.packetPath,
   flightInstanceId:e.src.flightInstanceId,
   horizon:e.src.horizon,
   nativeSelectedTUtc:iso(e.native),
   cutoffUtc:iso(e.cutoff),
   registeredAtUtc:iso(e.registered),
   optimisticDispatchPollUtc:
    accepted===undefined?null:iso(accepted),
   status
  };
 });
 const count=(s:P5CapacityOutcome)=>
   results.filter(r=>r.status===s).length;
 return{
  schema:"v39.phase5.later-pre-gh-capacity-envelope.v1",
  status:"MATHEMATICAL_ONLY_NOT_REAL_GITHUB_OR_PRE",
  simulationEndUtc:iso(end),
  simulatedPolls:polls.length,
  maxRequestsPerPoll,
  nominalRequestsPerContinuousHour:6*maxRequestsPerPoll,
  proposedFlightHorizons:entries.length,
  optimisticAcceptedRequests:count("OPTIMISTIC_GITHUB_REQUEST_SLOT"),
  publishedTooLate:count("CENSORED_PACKET_ISSUED_TOO_LATE_FOR_HORIZON"),
  prospectiveCapacityMisses:
   count("CENSORED_NOT_ENOUGH_GITHUB_POLL_CAPACITY"),
  futureUnassessed:count("INCOMPLETE_SIMULATED_POLL_WINDOW"),
  results,
  providerCalls:0,databaseReads:0,databaseWrites:0,
  realGithubDispatches:0,actualPreSnapshotsCommitted:0,
  lawfulSourceUseCertified:false,
  capacityMeasuredFromProduction:false,
  phase5ScientificFreezeGranted:false,phase6PaidGoGranted:false
 };
}
