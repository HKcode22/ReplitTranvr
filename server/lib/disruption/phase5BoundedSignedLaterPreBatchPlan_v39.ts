/**
 * Phase5 signed later-PRE bounded *worker* grouping. Pure mathematical
 * scheduling after the separate SOURCE-day registry byte signature has
 * already been verified. Never creates a packet, approves licensing, or
 * provides physical operating-leg attestation.
 *
 * A batch handles 1..8 already signed T6/T90 entries with own prospective
 * cutoffs clustered within TWO minutes; the existing Stage14 SERIALIZABLE
 * writer still authenticates each real source / own cutoff and performs
 * exactly one PRE write. Missing observations are censored per flight;
 * uncertain COMMIT must quarantine the whole remaining batch, never retry.
 */
import type {P5VerifiedLaterPreRegistryEntry}
 from "./phase5SignedLaterPreDayRegistry_v39";

const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const FILE=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_-]{8,100}\.json$/;
const SHA=/^[a-f0-9]{64}$/;
const MIN_LEAD_MS=15*60000;
const MAX_LEAD_MS=75*60000;
const MAX_CUTOFF_SPREAD_MS=2*60000;
const MAX_BATCH=8;
const hold=(x:string):never=>{throw Error("REFUSED_P5_BOUND_LATER_BATCH_"+x);};
const parse=(s:string):number=>{
 if(typeof s!=="string"||!ISO.test(s)||
    !Number.isFinite(Date.parse(s))||
    new Date(s).toISOString()!==s)
  hold("INVALID_DB_CLOCK_OR_PROVIDER_NATIVE_T");
 return Date.parse(s);
};
const iso=(n:number)=>new Date(n).toISOString();
export interface P5BoundedBatchCandidate{
 entry:P5VerifiedLaterPreRegistryEntry;
 cutoffUtc:string;
}
export interface P5BoundedSignedLaterPrePlan{
 schema:"v39.phase5.bounded-signed-later-pre-batch-plan.v1";
 status:"INDEPENDENTLY_SIGNED_PACKET_CUTOFF_GROUP_NOT_PRE_COMMIT";
 observedDbClockUtc:string;
 count:number;
 firstCutoffUtc:string;
 lastCutoffUtc:string;
 spreadMilliseconds:number;
 ordered:P5BoundedBatchCandidate[];
 providerCalls:0;alertsCreated:0;databaseWrites:0;
 gitHubChildDispatches:0;productionPreSnapshotsCommitted:0;
 phase5ScientificFreezeCertifiedHere:false;phase6PaidGoGrantedHere:false;
}
export function planP5BoundedSignedLaterPreBatch(
 entries:readonly P5VerifiedLaterPreRegistryEntry[],
 observedDbClockUtc:string
):P5BoundedSignedLaterPrePlan{
 if(!Array.isArray(entries)||entries.length<1||entries.length>MAX_BATCH)
  hold("BATCH_SIZE_NOT_INDEPENDENTLY_BOUNDED");
 const now=parse(observedDbClockUtc);
 const seenFile=new Set<string>(),seenFlightHorizon=new Set<string>();
 const work:P5BoundedBatchCandidate[]=[];
 for(const e of entries){
  if(!e||!FILE.test(e.filePath??"")||
     !SHA.test(e.packetSha256??"")||
     !SHA.test(e.queryDigestSha256??"")||
     !["T-6h","T-90m"].includes(e.horizon)||
     typeof e.flightInstanceId!=="string"||
     e.flightInstanceId.length<5||e.flightInstanceId.length>200||
     !Buffer.isBuffer(e.bytes)||e.bytes.length<100||
     seenFile.has(e.filePath)||
     seenFlightHorizon.has(e.flightInstanceId+"|"+e.horizon))
   hold("UNAUTHENTICATED_OR_DUPLICATE_SIGNED_FLIGHT_HORIZON");
  seenFile.add(e.filePath);
  seenFlightHorizon.add(e.flightInstanceId+"|"+e.horizon);
  const native=parse(e.selectedTNativeUtc);
  const cutoff=native-(e.horizon==="T-6h"?6*3600_000:90*60000);
  const lead=cutoff-now;
  if(lead<=MIN_LEAD_MS||lead>MAX_LEAD_MS)
   hold("FLIGHT_NOT_WITHIN_PROSPECTIVE_SIGNED_BATCH_WORK_WINDOW");
  if(e.packet?.prePermit?.flightInstanceId!==e.flightInstanceId||
     e.packet.prePermit.horizon!==e.horizon||
     e.packet.prePermit.selectedTNativeUtc!==e.selectedTNativeUtc||
     e.packet.prePermit.queryDigestSha256!==e.queryDigestSha256)
   hold("FROZEN_PRE_PACKET_IDENTITY_NOT_BOUND_TO_REVIEW");
  work.push({entry:e,cutoffUtc:iso(cutoff)});
 }
 work.sort((a,b)=>a.cutoffUtc.localeCompare(b.cutoffUtc)||
    a.entry.filePath.localeCompare(b.entry.filePath));
 const spread=parse(work[work.length-1].cutoffUtc)-
   parse(work[0].cutoffUtc);
 if(spread>MAX_CUTOFF_SPREAD_MS)
  hold("TOO_MANY_DIFFERENT_DEADLINES_FOR_ONE_BATCH_JOB");
 return{
  schema:"v39.phase5.bounded-signed-later-pre-batch-plan.v1",
  status:"INDEPENDENTLY_SIGNED_PACKET_CUTOFF_GROUP_NOT_PRE_COMMIT",
  observedDbClockUtc,count:work.length,
  firstCutoffUtc:work[0].cutoffUtc,
  lastCutoffUtc:work[work.length-1].cutoffUtc,
  spreadMilliseconds:spread,ordered:work,
  providerCalls:0,alertsCreated:0,databaseWrites:0,
  gitHubChildDispatches:0,productionPreSnapshotsCommitted:0,
  phase5ScientificFreezeCertifiedHere:false,
  phase6PaidGoGrantedHere:false
 };
}
