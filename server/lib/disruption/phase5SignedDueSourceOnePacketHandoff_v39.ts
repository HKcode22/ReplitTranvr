/**
 * Phase5: bridge ONE exact signed future SOURCE packet to the real V0079
 * database queue. This is an unattended-readiness decision, NOT dispatch.
 *
 * The existing observer authenticates SOURCE-role SQL / DB time separately.
 * Neither SHA equality nor a due row supplies provider rights, 7-REST
 * budget certification, flight truth, GH dispatch authority or Phase6 GO.
 */
import {createHash} from "node:crypto";
import type {P5GitHubOneQueryReleaseEnvelope}
 from "./phase5GitHubOneQueryReleaseAdmission_v39";
import {requireP5SignedOneGetInActualDueQueue,
 type P5SourceUpcomingCandidate}
 from "./phase5SourceUpcomingDueQueueReadonly_v39";
import type {classifyP5SignedUpcomingSourceQueue}
 from "./phase5SourceUpcomingDueQueueReadonly_v39";
import type {P5SourceSingleQueryPlan}
 from "./phase5ScopedFidsSourceBridge_v39";

const SHA=/^[0-9a-f]{64}$/;
const PATH=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_.-]{8,125}\.json$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const fail=(s:string):never=>{
 throw Error("REFUSED_P5_UNATTENDED_SOURCE_HANDOFF_"+s);
};
type Scan=ReturnType<typeof classifyP5SignedUpcomingSourceQueue>;

export interface P5OneSignedPacketPins {
 filePath:string;
 expectedPacketSha256:string;
 expectedManifestSha256:string;
 expectedQueryDigestSha256:string;
 expectedReleaseSha256:string;
 expectedRightsSha256:string;
 expectedProviderContractSha256:string;
}
function clock(value:string,label:string):number{
 if(typeof value!=="string"||!ISO.test(value)||
    !Number.isFinite(Date.parse(value))||
    new Date(value).toISOString()!==value)
  fail("INVALID_"+label);
 return Date.parse(value);
}
export type P5OneSignedHandoffStatus=
 "SIGNED_QUERY_NOT_YET_IN_DB_QUEUE_LOOKAHEAD"|
 "SIGNED_QUERY_DUE_FOR_INDEPENDENT_RELEASE_NO_DISPATCH"|
 "SIGNED_QUERY_TOO_EARLY_FOR_SAFE_DISPATCH"|
 "SIGNED_QUERY_ALREADY_PREARMED_OR_RESERVED_NO_REDISPATCH"|
 "SIGNED_QUERY_STOPPED_NO_DISPATCH"|
 "SIGNED_QUERY_MISSED_OR_TOO_LATE_CENSOR"|
 "SIGNED_QUERY_EXPECTED_DB_ROW_MISSING_HOLD";
export interface P5OneSignedHandoffReview {
 schema:"v39.phase5.one-signed-unattended-due-queue-handoff.v1";
 status:P5OneSignedHandoffStatus;
 queryDigestSha256:string;
 runDayIndex:number;
 slot:string;
 horizon:string;
 airportIcao:string;
 observedDbClockUtc:string;
 plannedDispatchUtc:string;
 expectedFrozenPacketSha256:string;
 independentPaidReleaseStillRequired:true;
 sevenPhysicalUtcRestCategoriesCertifiedHere:false;
 productionPaidGetExecuted:false;
 githubChildWorkflowDispatched:false;
 sourceContentsRightsIndependentlyCertifiedHere:false;
 preOrPostFlightLabelsCertifiedHere:false;
 providerCalls:0;
 databaseWrites:0;
 phase5FreezeGrantedHere:false;
 phase6PaidGoGrantedHere:false;
}
export function reviewP5OneSignedPacketAgainstActualDueQueue(
 scan:Scan,
 rawBytes:Buffer,
 packet:P5GitHubOneQueryReleaseEnvelope,
 pins:P5OneSignedPacketPins
):P5OneSignedHandoffReview{
 if(!scan||scan.schema!==
     "v39.phase5.source-upcoming-queue-readonly.v1"||
    scan.status!=="METADATA_ONLY_NOT_AN_AUTOMATIC_PAID_DISPATCH"||
    scan.providerCalls!==0||scan.dbWrites!==0||
    scan.paidGetDispatched!==false||
    scan.requiresIndependentDynamicQueryByteSignature!==true||
    !pins||!PATH.test(pins.filePath??"")||
    ![pins.expectedPacketSha256,pins.expectedManifestSha256,
      pins.expectedQueryDigestSha256,pins.expectedReleaseSha256,
      pins.expectedRightsSha256,pins.expectedProviderContractSha256]
      .every(x=>typeof x==="string"&&SHA.test(x))||
    !Buffer.isBuffer(rawBytes)||rawBytes.length<100||
    rawBytes.length>200000||
    createHash("sha256").update(rawBytes).digest("hex")!==
      pins.expectedPacketSha256)
  fail("UNSIGNED_FILE_OR_QUEUE_NOT_AUTHENTICATED");
 if(!packet||packet.schema!=="v39.phase5.github-source-one-query-template.v2"||
    packet.manifestSha256!==pins.expectedManifestSha256||
    packet.queryDigestSha256!==pins.expectedQueryDigestSha256||
    packet.manifestSha256!==scan.manifestSha256||
    Object.hasOwn(packet,"githubRunId")||
    Object.hasOwn(packet,"approvedCodeSha")||
    !packet.plan||
    packet.plan.independentlyApprovedSourceAndRetention!==true||
    packet.plan.githubOnlyOwnerApproved!==true||
    packet.plan.reviewedReleaseSha256!==pins.expectedReleaseSha256||
    packet.plan.reviewedProviderRightsSha256!==pins.expectedRightsSha256||
    packet.plan.openapiSha256!==pins.expectedProviderContractSha256||
    !SHA.test(packet.plan.expectedEarlyDrawSha256??""))
  fail("FROZEN_PACKET_OR_SOURCE_RIGHTS_PINS_DRIFT");
 const q=packet.plan.acquisition;
 if(!q||!Number.isInteger(q.runDayIndex)||q.runDayIndex<1||
    q.runDayIndex>31||
    !["HUB","MID_A","MID_B","REGIONAL"].includes(q.slot)||
    !["T-24h","T-6h","T-90m"].includes(q.horizon)||
    !/^[A-Z]{4}$/.test(q.icao??"")||
    typeof q.queryKey!=="string"||
    q.apiUnitsPerAttempt!==2||q.maxAttempts!==1||
    q.providerQueryDirection!=="Departure")
  fail("UNREVIEWED_FLIGHT_SOURCE_OR_PHYSICAL_ATTEMPT");
 const planned=clock(q.scheduledRequestUtc,"SOURCE_PLANNED_UTC");
 const now=clock(scan.dbClockUtc,"DATABASE_UTC");
 const matching=scan.candidates.filter(
  x=>x.queryDigestSha256===packet.queryDigestSha256);
 if(matching.length>1)fail("DUPLICATE_DB_QUERY_DIGEST");
 let status:P5OneSignedHandoffStatus;
 if(matching.length===0){
  // Queue reader only inspects planned GETs within [-3h,+2h].
  // If the signed candidate is outside the lookahead, it is not missing.
  status=planned-now>=2*3600000?
   "SIGNED_QUERY_NOT_YET_IN_DB_QUEUE_LOOKAHEAD":
   "SIGNED_QUERY_EXPECTED_DB_ROW_MISSING_HOLD";
 }else{
  const row:P5SourceUpcomingCandidate=matching[0];
  if(row.runDayIndex!==q.runDayIndex||
     row.queryKey!==q.queryKey||row.slot!==q.slot||
     row.horizon!==q.horizon||
     row.selectedAirportIcao!==q.icao||
     row.earlyDrawSha256!==packet.plan.expectedEarlyDrawSha256||
     clock(row.plannedDispatchUtc,"DB_PLANNED_UTC")!==planned||
     clock(row.latestDispatchUtc,"HARD_LATEST_UTC")<=planned)
   fail("ACTUAL_DB_SOURCE_ROW_DRIFT");
  switch(row.status){
   case "DUE_SOON_REVIEW_REQUIRED_NO_PAID_DISPATCH": {
    // Reuse existing strict READ ONLY bridge, including DB time and
    // currently unreserved/prearm-free SAME physical query.
    const serializablePlan={
      ...packet.plan,
      day:{
       ...packet.plan.day,
       scheduledStartUtc:packet.plan.day.scheduledStartUtc
      }
    } as unknown as P5SourceSingleQueryPlan;
    requireP5SignedOneGetInActualDueQueue(
     scan,serializablePlan,packet.manifestSha256,packet.queryDigestSha256);
    status="SIGNED_QUERY_DUE_FOR_INDEPENDENT_RELEASE_NO_DISPATCH";
    break;
   }
   case "TOO_EARLY_FOR_REVIEWED_PREARM":
    status="SIGNED_QUERY_TOO_EARLY_FOR_SAFE_DISPATCH";break;
   case "PREARMED_OR_RESERVED_REQUIRES_SEPARATE_READBACK":
    status="SIGNED_QUERY_ALREADY_PREARMED_OR_RESERVED_NO_REDISPATCH";break;
   case "ALREADY_STOPPED_NO_DISPATCH":
    status="SIGNED_QUERY_STOPPED_NO_DISPATCH";break;
   case "MISSED_DISPATCH_CUTOFF_NO_BACKFILL":
   case "TOO_LATE_FOR_SAFE_SCHEDULED_DISPATCH":
    status="SIGNED_QUERY_MISSED_OR_TOO_LATE_CENSOR";break;
   default: fail("UNRECOGNIZED_DB_QUEUE_STATE");
  }
 }
 return{
  schema:"v39.phase5.one-signed-unattended-due-queue-handoff.v1",
  status,queryDigestSha256:packet.queryDigestSha256,
  runDayIndex:q.runDayIndex,slot:q.slot,horizon:q.horizon,
  airportIcao:q.icao,observedDbClockUtc:scan.dbClockUtc,
  plannedDispatchUtc:new Date(planned).toISOString(),
  expectedFrozenPacketSha256:pins.expectedPacketSha256,
  independentPaidReleaseStillRequired:true,
  sevenPhysicalUtcRestCategoriesCertifiedHere:false,
  productionPaidGetExecuted:false,
  githubChildWorkflowDispatched:false,
  sourceContentsRightsIndependentlyCertifiedHere:false,
  preOrPostFlightLabelsCertifiedHere:false,
  providerCalls:0,databaseWrites:0,
  phase5FreezeGrantedHere:false,phase6PaidGoGrantedHere:false
 };
}
