/** F042: bind the already existing conditional T6 SOURCE reader to
 * the independently restricted, source-linked Packet B group reader.
 * This is a bounded, nonpaid planning read, not a POST issuer, a new
 * retention surface, or a numerical/physical label authorization.
 */
import type {Pool} from "pg";
import {auditP5ConditionalPostActualT6Batch,type P5ConditionalPostT6BatchScope} from "../server/lib/disruption/phase5V0083FuturePostOriginalDb_v39";
import {readP6ActualConditionalT6PostPreCandidatePage} from "../server/lib/disruption/phase6PostNativePreCandidateReadOnce_v39.mjs";
import {readPhase7ConditionalT6ScopedGroup} from "../server/lib/disruption/phase7PostScopedGroup_v39";
import type {P6PostPreservationAnchor} from "../server/lib/disruption/phase6ActualPostOutcomeObservability_v39";
import type {Phase7DerivedReleaseContract} from "../server/lib/disruption/phase6DerivedTrainingReleaseContract_v39";
import type {Phase7ReviewedTransformationProfile} from "../server/lib/disruption/phase7ReviewedSourceTransformation_v39";
import {hashPhase7DurableCandidate} from "../server/lib/disruption/phase7DurableDerivedBundleCandidate_v39";
const H=/^[a-f0-9]{64}$/,ID=/^leg:g5a:[a-f0-9]{64}$/;
const hold=(s:string):never=>{throw Error("HOLD_P6_CONDITIONAL_POST_PRESERVATION_"+s)};
const hash=(x:unknown):x is string=>typeof x==="string"&&H.test(x);
const utc=(x:unknown):number=>{
 if(typeof x!=="string"||!Number.isFinite(Date.parse(x))||new Date(x).toISOString()!==x)return hold("CLOCK");
 return Date.parse(x);
};
const MAX=16;
type T6Batch=Awaited<ReturnType<typeof auditP5ConditionalPostActualT6Batch>>;
type T6Decision=T6Batch["privateDecisions"][number];
type BaseScope=Pick<P5ConditionalPostT6BatchScope,"manifestSha256"|"rightsSha256"|"queryDigestSha256"|"runDayIndex"|"airportIcao"|"reviewedFrameSha256"|"protocolSha256">;
export interface P6ConditionalPostPreservationReadScope {
 independentConditionalPostPreservationReadApproved:true;
 existingPaidDispatchApproved:false;
 noProviderCredentialsInAudit:true;
 manifestSha256:string;
 rightsSha256:string;
 expectedContractSha256:string;
 expectedProfileSha256:string;
}
type Reader={reader:Pick<Pool,"connect">;readerRole:string;contract:Phase7DerivedReleaseContract;profile:Phase7ReviewedTransformationProfile;scope:P6ConditionalPostPreservationReadScope};
function check(input:Reader,base:BaseScope){
 const s=input?.scope;
 if(!s||s.independentConditionalPostPreservationReadApproved!==true||s.existingPaidDispatchApproved!==false||
  s.noProviderCredentialsInAudit!==true||s.manifestSha256!==base.manifestSha256||s.rightsSha256!==base.rightsSha256||
  ![s.manifestSha256,s.rightsSha256,s.expectedContractSha256,s.expectedProfileSha256,base.queryDigestSha256,base.reviewedFrameSha256,base.protocolSha256].every(hash)||
  hashPhase7DurableCandidate(input.contract)!==s.expectedContractSha256||hashPhase7DurableCandidate(input.profile)!==s.expectedProfileSha256||
  typeof input.reader?.connect!=="function"||typeof input.readerRole!=="string"||!input.readerRole)
  hold("EXACT_SEPARATE_READ_SCOPE");
}
async function join(input:Reader,base:BaseScope,actual:{status:string;privateDecisions:readonly T6Decision[];
 candidateCount:number;eligibleCount:number;observedDbClockUtc:string;providerCalls:number;databaseWrites:number;phase6PaidGo:boolean}){
 check(input,base);
 if(!["ACTUAL_CONDITIONAL_T6_POST_CANDIDATE_BATCH_NO_GO","ACTUAL_CONDITIONAL_T6_POST_PRE_CANDIDATE_PAGE_NO_GO"].includes(actual.status)||
  actual.providerCalls!==0||actual.databaseWrites!==0||actual.phase6PaidGo!==false||
  !Array.isArray(actual.privateDecisions)||actual.privateDecisions.length!==actual.candidateCount||
  actual.candidateCount>MAX||Object.getOwnPropertyDescriptor(actual,"privateDecisions")?.enumerable!==false||
  !Object.isFrozen(actual.privateDecisions))hold("ACTUAL_SOURCE_READ_REQUIRED");
 const start=utc(actual.observedDbClockUtc),groups=new Set<string>(),rows=new Set<string>(),flights=new Set<string>();
 let observed=start;
 const decisions=[];
 for(const d of actual.privateDecisions){
  if(typeof d.flightInstanceId!=="string"||!ID.test(d.flightInstanceId)||flights.has(d.flightInstanceId))hold("FLIGHT_SCOPE");
  flights.add(d.flightInstanceId);
  if(d.status!=="ACTUAL_RETAINED_CONDITIONAL_T6_FOR_POST_REVIEW")continue;
  if(d.queryDigestSha256!==base.queryDigestSha256||!hash(d.originalSourceResponseSha256)||!hash(d.expectedSignedPacketSha256)||
   !/^[1-9][0-9]{0,17}$/.test(d.snapshotId)||utc(d.preIssuedAtUtc)>utc(d.predictionCutoffUtc)||
   utc(d.originalSourceAvailableAtUtc)>utc(d.preIssuedAtUtc)||
   utc(d.selectedScheduledDepartureUtc)-utc(d.predictionCutoffUtc)!==21600000||
   utc(d.assessmentWatermarkUtc)-utc(d.selectedScheduledDepartureUtc)!==7200000||
   utc(d.sourceExpiresAtUtc)<=utc(d.assessmentWatermarkUtc)||start>=utc(d.assessmentWatermarkUtc))
   hold("SOURCE_CUTOFF_OR_RETENTION_DRIFT");
  const anchor:P6PostPreservationAnchor={manifestSha256:base.manifestSha256,rightsSha256:base.rightsSha256,
   queryDigestSha256:base.queryDigestSha256,snapshotId:d.snapshotId,runDayIndex:base.runDayIndex,airportIcao:base.airportIcao,
   frameSha256:base.reviewedFrameSha256,flightInstanceId:d.flightInstanceId,horizon:"T-6h",
   selectedNativeTUtc:d.selectedScheduledDepartureUtc,preIssuedAtUtc:d.preIssuedAtUtc,
   originalSourceAvailableAtUtc:d.originalSourceAvailableAtUtc,sourceExpiresAtUtc:d.sourceExpiresAtUtc,
   sourceResponseSha256:d.originalSourceResponseSha256,ambiguousIdentity:false};
  // Missing, ambiguous, expired or wrong-scope groups fail closed before
  // planning a paid POST. Never turn a read failure into a negative label.
  const result=await readPhase7ConditionalT6ScopedGroup(input.reader,input.readerRole,input.contract,input.profile,anchor,base.protocolSha256);
  const at=utc(result.observedAtUtc);
  if(at<observed||at-start>120000||at>=utc(d.assessmentWatermarkUtc)||at>=utc(d.sourceExpiresAtUtc))hold("GROUP_READ_CLOCK_OR_WINDOW_DRIFT");
  observed=at;
  const groupId=result.fragments[0]?.groupId;
  const t6=result.fragments.filter(f=>f.packet.rows[0]?.horizon==="T-6h");
  if(!groupId||groups.has(groupId)||t6.length!==1||result.fragments.some(f=>f.groupId!==groupId))hold("GROUP_OR_T6_FRAGMENT_DRIFT");
  groups.add(groupId);
  for(const f of result.fragments){
   const id=f.packet.rows[0]?.releaseRowId;
   if(typeof id!=="string"||!id||rows.has(id))hold("FRAGMENT_REUSE");
   rows.add(id);
  }
  decisions.push(Object.freeze({flightInstanceId:d.flightInstanceId,status:"ACTUAL_T6_AND_PACKET_B_GROUP_VERIFIED_FOR_SEPARATE_POST_REVIEW" as const,
   anchor:Object.freeze(anchor),expectedSignedPacketSha256:d.expectedSignedPacketSha256,
   originalPopulationQueryId:d.originalPopulationQueryId,reportedScheduledDepartureUtc:d.reportedScheduledDepartureUtc,
   assessmentWatermarkUtc:d.assessmentWatermarkUtc,groupId,fragments:Object.freeze(result.fragments)}));
 }
 if(decisions.length!==actual.eligibleCount)hold("ELIGIBLE_DENOMINATOR_DRIFT");
 const result={status:"ACTUAL_CONDITIONAL_POST_T6_AND_PACKET_B_GROUP_READ_NO_GO",runDayIndex:base.runDayIndex,
  candidateCount:actual.candidateCount,verifiedPacketBGroupCount:decisions.length,
  unavailableCount:actual.candidateCount-decisions.length,observedDbClockUtc:new Date(observed).toISOString(),
  independentT24WitnessVerified:false,postIssuerCommissioned:false,physicalGateOutCertified:false,
  providerCalls:0,databaseWrites:0,postPacketsIssued:0,phase6PaidGo:false};
 return Object.freeze(Object.defineProperty(result,"privateDecisions",{value:Object.freeze(decisions),enumerable:false})) as typeof result&
  {readonly privateDecisions:readonly (typeof decisions)[number][]};
}
/** Restricted actual T6+group integration for the existing source-bound
 * batch path. A production caller must first authenticate the signed index;
 * use the separate full signed wrapper below. */
export async function readP6ConditionalPostT6PreservationBatch(sourcePool:Pick<Pool,"connect">,base:P5ConditionalPostT6BatchScope,input:Reader){
 check(input,base);
 if(!Array.isArray(base.candidates)||base.candidates.length<1||base.candidates.length>MAX)hold("PAGE_BOUND");
 const got=await auditP5ConditionalPostActualT6Batch(sourcePool,base);
 // Use the completed actual source transaction clock, not the earlier
 // transaction-start clock, for the independent subsequent reader.
 const result=Object.freeze(Object.defineProperty({...got,observedDbClockUtc:got.completedDbClockUtc},"privateDecisions",{value:got.privateDecisions,enumerable:false}));
 return join(input,base,result as typeof got);
}
/** Full authenticated current signed registry -> actual SOURCE -> distinct
 * scoped Packet B reader, with no provider, signer, writer or new roles.
 * Do not use the output as a paid admission or physical outcome.
 */
export async function readP6SignedConditionalPostPreservationPage(args:Parameters<typeof readP6ActualConditionalT6PostPreCandidatePage>[0],input:Reader){
 if(args?.policy?.independentConditionalPostCandidateReadOnlyApproved!==true||
  args?.policy?.independentConditionalPostPreservationReadApproved!==true||
  !Number.isSafeInteger(args.pageSize)||args.pageSize<1||args.pageSize>MAX||
  input?.scope?.manifestSha256!==args.trust?.manifestSha256||input.scope.rightsSha256!==args.trust?.rightsSha256)hold("SIGNED_PAGE_SCOPE");
 const page=await readP6ActualConditionalT6PostPreCandidatePage(args);
 const s=page.privateSourceScope;
 const base={manifestSha256:s.manifestSha256,rightsSha256:s.rightsReviewSha256,queryDigestSha256:s.queryDigestSha256,
  runDayIndex:s.runDayIndex,airportIcao:s.airportIcao,reviewedFrameSha256:page.privateReviewedFrameSha256,protocolSha256:s.conditionalServiceScope.protocolSha256};
 const result=await join(input,base,Object.freeze(Object.defineProperty({...page,candidateCount:page.pageCandidateCount},"privateDecisions",{value:page.privateDecisions,enumerable:false})));
 return Object.freeze(Object.defineProperties({...result,totalCandidateCount:page.totalCandidateCount,remainingAfterPageCount:page.remainingAfterPageCount},{
  privateDecisions:{value:result.privateDecisions,enumerable:false},privateNextCursor:{value:page.privateNextCursor,enumerable:false}}));
}
