/**
 * Phase 6: bridge the already-tested externally pinned, PG-clock-qualified
 * append-only day/shard index into bounded handoff candidates for the
 * EXISTING SOURCE, later-PRE, and V0083 POST signed children.
 *
 * NOT a child dispatcher, code-signing key, URL exporter, source reviewer,
 * DB writer or paid GO.  Every handoff still needs the existing per-child
 * signed packet, rights/REST/Alert, cutoff, source/flight membership and
 * no-retry controls. This planner cannot create authentic future flights.
 */
import {createHash} from "node:crypto";
import {
 auditP5Phase6AppendOnlyDayShardIndex,
 type P5Phase6DayShardIndex,
 type P5Phase6DayShardPins,
 type P5Phase6DueShard,
 P5_SHARD_LANES
} from "./phase5Phase6AppendOnlyDayShardIndex_v39";

const SHA=/^[0-9a-f]{64}$/;
const EXACT=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const PATH=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_.-]{8,125}\.json$/;
const MAX_SHARDS_PER_LANE=4;
const forbid=(reason:string):never=>{
 throw Error("HOLD_P6_SIGNED_AUTONOMOUS_SHARD_HANDOFF_"+reason);
};
export const P6_EXISTING_SHARD_CHILD_ADMISSIONS={
 SOURCE:"EXISTING_SIGNED_SOURCE_DAY_PARENT_V0079_V0080_REST_RESERVATION",
 LATER_PRE:"EXISTING_V0091_STAGE14_V0081_T6_T90_HORIZON_BOUND_PRE",
 POST:"EXISTING_V0083_POST_EXTERNAL_RIGHTS_ORIGINAL_CALLBACK_NO_RETRY"
} as const;
type Lane=typeof P5_SHARD_LANES[number];
export interface P6ProspectiveShardHandoff{
 readonly lane:Lane;
 readonly runDayIndex:number;
 readonly shardIndex:number;
 readonly signedFrozenPath:string;
 readonly signedFrozenSha256:string;
 readonly boundSourceRegistryPath:string|null;
 readonly boundSourceRegistrySha256:string|null;
 readonly notBeforeUtc:string;
 readonly hardLatestUtc:string;
 readonly routingIntentSha256:string;
 readonly mustUseExistingChildAdmission:string;
 readonly independentlyAuthenticatedGHHistoryRequired:true;
 readonly privateBytesOnlyFromRestrictedReader:true;
 readonly newPaidDispatchAuthorizedHere:false;
}
function checkedUTC(s:string){
 if(!EXACT.test(s??"")||!Number.isFinite(Date.parse(s))||
    new Date(s).toISOString()!==s)
  forbid("INVALID_ACTUAL_PG_CLOCK_OR_SHARD_WINDOW");
 return Date.parse(s);
}
function validateDueShard(
 s:P5Phase6DueShard,lane:Lane,now:number,
 used:Set<string>
):P6ProspectiveShardHandoff{
 if(!s||s.lane!==lane||
    !Number.isSafeInteger(s.runDayIndex)||s.runDayIndex<1||
    s.runDayIndex>31||
    !Number.isSafeInteger(s.shardIndex)||s.shardIndex<1||
    s.shardIndex>100000||
    !PATH.test(s.filePath??"")||
    !SHA.test(s.fileSha256??"")||
    used.has([lane,s.runDayIndex,s.shardIndex].join(":"))||
    checkedUTC(s.notBeforeUtc)>now||
    now>=checkedUTC(s.hardLatestUtc)||
    checkedUTC(s.hardLatestUtc)<=checkedUTC(s.notBeforeUtc))
  forbid("UNTRUSTED_OR_NO_LONGER_DUE_INDEX_SHARD");
 if(lane==="SOURCE"){
  if(s.sourceRegistryFilePath!==null||
     s.sourceRegistrySha256!==null)
   forbid("SOURCE_REGISTRY_MUST_NOT_REFERENCE_ITSELF");
 }else if(!PATH.test(s.sourceRegistryFilePath??"")||
           !SHA.test(s.sourceRegistrySha256??"")||
           s.sourceRegistryFilePath===s.filePath)
  forbid("UNBOUND_LATER_PRE_OR_POST_SOURCE_REGISTRY");
 used.add([lane,s.runDayIndex,s.shardIndex].join(":"));
 const canonical=[
  "phase6-reviewed-shard-handoff-v39",
  lane,s.runDayIndex,s.shardIndex,s.filePath,s.fileSha256,
  s.sourceRegistryFilePath,s.sourceRegistrySha256,
  s.notBeforeUtc,s.hardLatestUtc
 ];
 const routingIntentSha256=createHash("sha256")
  .update(JSON.stringify(canonical)).digest("hex");
 return{
  lane,runDayIndex:s.runDayIndex,shardIndex:s.shardIndex,
  signedFrozenPath:s.filePath,signedFrozenSha256:s.fileSha256,
  boundSourceRegistryPath:s.sourceRegistryFilePath,
  boundSourceRegistrySha256:s.sourceRegistrySha256,
  notBeforeUtc:s.notBeforeUtc,hardLatestUtc:s.hardLatestUtc,
  routingIntentSha256,
  mustUseExistingChildAdmission:P6_EXISTING_SHARD_CHILD_ADMISSIONS[lane],
  independentlyAuthenticatedGHHistoryRequired:true,
  privateBytesOnlyFromRestrictedReader:true,
  newPaidDispatchAuthorizedHere:false
 };
}
export function planP6ThirtyOneDaySignedShardHandoffs(
 rawIndex:Buffer,index:P5Phase6DayShardIndex,
 pins:P5Phase6DayShardPins,getFrozen:(path:string)=>Buffer,
 priorRaw:Buffer|null=null,prior:P5Phase6DayShardIndex|null=null
){
 // A free-form caller-supplied "verified" report is NEVER sufficient:
 // invoke the existing audited, append-only, exact-byte SHA/source-linked
 // validator again, with the original authoritative PG-clock observation.
 const validated=auditP5Phase6AppendOnlyDayShardIndex(
  rawIndex,index,pins,getFrozen,priorRaw,prior);
 if(validated.schema!=="v39.phase5.phase6-readonly-due-day-shard-selection.v1"||
    validated.indexSha256!==pins.expectedIndexSha256||
    validated.manifestSha256!==pins.expectedManifestSha256||
    validated.ownerReviewedIndexClaimIsNotCryptographicAuthorization!==true||
    validated.doesNotAuthorizeSourceRightsBudgetOrGO!==true||
    validated.providerCalls!==0||validated.databaseWrites!==0||
    validated.githubChildDispatches!==0||
    validated.phase5ScientificFreeze!==false||
    validated.phase6PaidGo!==false)
  forbid("SIGNED_INDEX_AUDIT_NOT_AN_INDEPENDENT_CHILD_RELEASE");
 const now=checkedUTC(validated.observedDbClockUtc);
 const used=new Set<string>();
 const candidates:P6ProspectiveShardHandoff[]=[];
 const laneCounters=[] as {
  lane:Lane,due:number,proposed:number,deferred:number,
  missed:number,notYetDue:number
 }[];
 for(const lane of P5_SHARD_LANES){
  const selected=validated.selectedForIndependentChildReview[lane];
  const due=validated.dueShardCounts[lane];
  const deferred=validated.deferredDueShardCounts[lane];
  const missed=validated.missedCensoredShardCounts[lane];
  const notYetDue=validated.notYetDueShardCounts[lane];
  if(!Array.isArray(selected)||
     selected.length>MAX_SHARDS_PER_LANE||
     ![due,deferred,missed,notYetDue].every(x=>
      Number.isSafeInteger(x)&&x>=0)||
     due!==selected.length+deferred)
    forbid("UNBOUNDED_OR_INCONSISTENT_LANE_COUNTS");
  for(const s of selected)
   candidates.push(validateDueShard(s,lane,now,used));
  laneCounters.push({
   lane,due,proposed:selected.length,deferred,missed,notYetDue
  });
 }
 if(candidates.length>MAX_SHARDS_PER_LANE*P5_SHARD_LANES.length)
  forbid("UNBOUNDED_CHILD_ROUTING_CANDIDATES");
 // Only identifiers, counters, and deadlines in public-readable summary.
 // Actual private packet paths remain restricted to the returned candidates;
 // never automatically JSON.stringify(candidates) to public logs.
 const operatorSummary={
  schema:"v39.phase6.autonomous-31day-signed-shard-review-handoffs.v1",
  status:"SIGNED_DUE_SHARDS_FOR_SEPARATE_CHILD_ADMISSION_NO_DISPATCH",
  signedIndexSha256:validated.indexSha256,
  indexRevision:validated.revision,
  observedRealPgClockUtc:validated.observedDbClockUtc,
  lanes:laneCounters,
  routeIntentSummaries:candidates.map(c=>({
   lane:c.lane,runDayIndex:c.runDayIndex,
   shardIndex:c.shardIndex,routingIntentSha256:c.routingIntentSha256,
   hardLatestUtc:c.hardLatestUtc,
   independentSourceOrFlightRightsCertified:false,
   existingChildApprovalStillRequired:true
  })),
  selectedRouteCount:candidates.length,
  maxFourShardsPerLane:true,
  signedFutureIndexCannotBeManufacturedHere:true,
  singleDayGithubRepositoryVariablesAreNotA31DayRouter:true,
  existingPrivateReaderAndFull31DayDispatchIntegrationStillRequired:true,
  actualProviderOriginalOrPhysicalFlightProvenHere:false,
  authoredSourceRegistryHere:false,
  actualDatabaseWriteCount:0,
  providerCalls:0,githubChildDispatches:0,
  phase5ScientificFreeze:false,phase6PaidGo:false
 } as const;
 return{operatorSummary,privateRoutingCandidates:candidates,
  verifiedExistingShardIndexResult:validated};
}
