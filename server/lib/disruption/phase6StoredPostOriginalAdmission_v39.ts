/** Connect actual independently signed stored POST to the existing V0083
 * read-only admission and actual same-flight source PRE audit. No dispatch,
 * new paid worker, permission grant, SQL write or source-use verdict.
 */
import {createHash} from "node:crypto";
import {readP6StoredPrivateReviewOnce} from "./phase6StoredPrivateReviewReadOnce_v39.mjs";
import {hydrateAndInspectP6DayEpochOriginalSemanticsReadOnly} from "./phase6DayEpochOriginalSemanticHandoff_v39.mjs";
import {readP6PrivateSourcePostOnce} from "./phase6PrivateSourcePostReadOnce_v39.mjs";
import {admitP5FuturePostGithubParent,readActualValidPreAndClock}
 from "../../../scripts/v39_phase5_future_post_github_child_dispatcher_v39";
import {admitP5FuturePostFrozenForReadOnly} from "./phase5FuturePostGithubReadonlyRelease_v39";
import {reviewP6PrivatePostWithOriginalV0083NoDispatch} from "./phase6PrivatePostExistingV0083ReadOnlyBridge_v39";
import type {P5SignedFuturePostPacket} from "../../../scripts/v39_phase5_one_signed_future_post_outcome_v0083_owner_v39";
const SHA=/^[a-f0-9]{64}$/;
const POST=/^data-collection\/phase5\/frozen\/post_[A-Za-z0-9_-]{8,95}\.json$/;
const SOURCE=/^data-collection\/phase5\/frozen\/source_[A-Za-z0-9_.-]{8,125}\.json$/;
const hold=(x:string):never=>{throw Error("HOLD_P6_STORED_POST_ORIGINAL_"+x);};
const hash=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
type Selector={runDayIndex:number;indexRevision:number;indexSha256:string;routingIntentSha256:string};
type Client={query:(sql:string,values?:any[])=>Promise<any>};
const privateValue=(object:any,key:string)=>{const d=Object.getOwnPropertyDescriptor(object??{},key);return d&&d.enumerable===false&&d.writable===false?d.value:null;};
/** Exact route must come from authenticated restricted index reader. Pure
 * route selection is not a substitute for the real read at runtime. */
export function selectP6ExactStoredPostRoute(index:any,selector:Selector){
 const z=index?.redactedSummary,routes=privateValue(index,"privateRoutingCandidates"),getter=privateValue(index,"getFrozen");
 if(z?.schema!=="v39.phase6.day-epoch-exact-source-pre-post-original-semantics-no-go.v1"||
    z.status!=="ED25519_DAY_EPOCH_ORIGINAL_SOURCE_PRE_POST_SEMANTICS_PASS_NO_GO"||
    z.externallySignedDayEpochIndexSha256!==selector.indexSha256||
    z.runDayIndex!==selector.runDayIndex||z.phase6PaidGo!==false||
    z.reviewedEd25519SourceWasOriginalDayBytes!==true||
    z.originalV0096GlobalChainNotUsed!==true||
    !Array.isArray(routes)||routes.length>12||typeof getter!=="function")
  hold("UNAUTHENTICATED_EXACT_DAY_ROUTE");
 const hits=routes.filter((v:any)=>v?.routingIntentSha256===selector.routingIntentSha256);
 if(hits.length!==1)hold("POST_ROUTE_MISSING_OR_AMBIGUOUS");
 const r=hits[0];
 if(r.lane!=="POST"||r.runDayIndex!==selector.runDayIndex||
    !Number.isSafeInteger(r.shardIndex)||r.shardIndex<1||r.shardIndex>100000||
    !POST.test(r.signedFrozenPath??"")||!SOURCE.test(r.boundSourceRegistryPath??"")||
    !SHA.test(r.signedFrozenSha256??"")||!SHA.test(r.boundSourceRegistrySha256??"")||
    r.privateBytesOnlyFromRestrictedReader!==true||r.newPaidDispatchAuthorizedHere!==false||
    r.independentlyAuthenticatedGHHistoryRequired!==true)
  hold("EXACT_POST_ROUTE_OR_SOURCE_LINK_DRIFT");
 const post=getter(r.signedFrozenPath),source=getter(r.boundSourceRegistryPath);
 if(!Buffer.isBuffer(post)||!Buffer.isBuffer(source)||hash(post)!==r.signedFrozenSha256||
    hash(source)!==r.boundSourceRegistrySha256)hold("PRIVATE_ROUTE_BYTES_DRIFT");
 return r;
}
export async function inspectP6StoredPostOriginalV0083({
 readerClient,trust,selector,env
}:{readerClient:Client;trust:any;selector:Selector;env:NodeJS.ProcessEnv}){
 if(env.P6_PRIVATE_POST_STORED_REVIEW_APPROVED!=="1"||
    trust?.independentStudyTrustPinsApproved!==true||trust.independentPostReviewerPinsApproved!==true||
    env.GITHUB_ACTIONS!=="true"||env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||env.GITHUB_EVENT_NAME!=="schedule"||
    env.GITHUB_RUN_ATTEMPT!=="1"||env.GITHUB_SHA!==trust.reviewedCodeSha||
    env.V39_P5_MANIFEST_SHA256!==trust.manifestSha256||env.V39_P5_RIGHTS_SHA256!==trust.rightsSha256||
    env.ADB_AUTO_COLLECT!=="0"||[env.AERODATABOX_API_KEY,env.RAPIDAPI_KEY,
     env.AERODATABOX_WEBHOOK_SECRET,env.DATABASE_URL,env.V39_DATABASE_RUNTIME_URL,
     env.P5_V39_OTHER_REST_REVIEW_DATABASE_URL,env.P5_V39_OTHER_REST_RESERVE_DATABASE_URL,
     env.P5_POST_FROZEN_PACKET_FILE,env.V39_P5_POST_SIGNED_PACKET_SHA256,
     env.V39_P5_POST_REVIEWED_REQUEST_SHA256,env.V39_P5_POST_CONTEXT_SHA256].some(Boolean)||
    !Number.isSafeInteger(selector?.runDayIndex)||selector.runDayIndex<1||selector.runDayIndex>31||
    !Number.isSafeInteger(selector.indexRevision)||selector.indexRevision<1||selector.indexRevision>1024||
    !SHA.test(selector.indexSha256??"")||!SHA.test(selector.routingIntentSha256??""))
  hold("NO_SEPARATE_STORED_POST_READONLY_SCOPE");
 const scope={privateStoredReviewReadOnlyApproved:true,existingPaidDispatchApproved:false};
 const indexReview=await readP6StoredPrivateReviewOnce({client:readerClient,trust,scope,
  selector:{kind:"EXACT_DAY",runDayIndex:selector.runDayIndex,indexRevision:selector.indexRevision,indexSha256:selector.indexSha256}});
 const index=await hydrateAndInspectP6DayEpochOriginalSemanticsReadOnly({
  client:readerClient,pins:indexReview.pins,wire:indexReview.wire,publicKeyPem:indexReview.publicKeyPem,
  scope:{privateDayRegistryReadOnlyApproved:true,existingPaidDispatchApproved:false,requireCurrentRevisionForPlanning:true}});
 const route=selectP6ExactStoredPostRoute(index,selector);
 const stored=await readP6StoredPrivateReviewOnce({client:readerClient,trust,scope,
  selector:{kind:"POST",runDayIndex:route.runDayIndex,shardIndex:route.shardIndex,
   logicalPath:route.signedFrozenPath,contentSha256:route.signedFrozenSha256}});
 const receipt=await readP6PrivateSourcePostOnce(readerClient,stored.pins,stored.wire,stored.publicKeyPem);
 // Dynamic per-flight request and context digests come only from the
 // separately verified exact POST bytes. All study and release pins,
 // original parent approvals and source-role login stay external.
 let packet:P5SignedFuturePostPacket;
 try{packet=JSON.parse(receipt.privateBytes.toString("utf8"));}catch{return hold("PRIVATE_POST_PACKET_JSON");}
 if(!receipt.privateBytes.equals(index.getFrozen(route.signedFrozenPath))||
    !packet?.reviewed||!SHA.test(packet.reviewed.requestSha256??"")||
    !SHA.test(packet.reviewed.reviewedRequestContextSha256??""))
  hold("EXACT_REVIEWED_POST_PACKET_OR_REQUEST_DIGEST_DRIFT");
 const local={...env,P5_POST_FROZEN_PACKET_FILE:route.signedFrozenPath,
  V39_P5_POST_SIGNED_PACKET_SHA256:route.signedFrozenSha256,
  V39_P5_POST_REVIEWED_REQUEST_SHA256:packet.reviewed.requestSha256,
  V39_P5_POST_CONTEXT_SHA256:packet.reviewed.reviewedRequestContextSha256};
 const admission=admitP5FuturePostGithubParent(local);
 const exact=admitP5FuturePostFrozenForReadOnly(receipt.privateBytes,packet,admission.pins);
 if(exact.runDayIndex!==route.runDayIndex)hold("NATIVE_POST_DAY_DRIFT");
 // Apply original signed-route and restricted-reader clock checks even if
 // the later actual PRE audit proves zero valid horizons (not an outage).
 reviewP6PrivatePostWithOriginalV0083NoDispatch({indexHandoff:index,postPacketReceipt:receipt,
  actualPre:null,actualSourcePreDbClockUtc:receipt.redactedSummary.observedDatabaseClockUtc,env:local,
  pins:{expectedRoutingIntentSha256:selector.routingIntentSha256,expectedDayEpochIndexSha256:selector.indexSha256,
   expectedPostPacketPath:route.signedFrozenPath,expectedPostPacketSha256:route.signedFrozenSha256,
   expectedSourceRegistryPath:route.boundSourceRegistryPath,expectedFlightInstanceId:exact.flightInstanceId}});
 let actual;
 try{actual=await readActualValidPreAndClock(admission.conn,exact);}
 catch(e){
  if(e instanceof Error&&e.message==="REFUSED_P5_FUTURE_POST_V0083_NO_VALID_NATIVE_T_SOURCE_PRE_FOR_THIS_POST")
   return Object.freeze({redactedSummary:Object.freeze({
    status:"SKIP_VERIFIED_NO_VALID_SOURCE_BOUND_PRE_NO_DISPATCH",
    runDayIndex:route.runDayIndex,shardIndex:route.shardIndex,
    verifiedValidPreHorizonCount:0,providerCalls:0,sqlWrites:0,githubDispatches:0,phase6PaidGo:false
   })});
  throw e;
 }
 return reviewP6PrivatePostWithOriginalV0083NoDispatch({
  indexHandoff:index,postPacketReceipt:receipt,actualPre:actual.pre,actualSourcePreDbClockUtc:actual.dbClockUtc,env:local,
  pins:{expectedRoutingIntentSha256:selector.routingIntentSha256,expectedDayEpochIndexSha256:selector.indexSha256,
   expectedPostPacketPath:route.signedFrozenPath,expectedPostPacketSha256:route.signedFrozenSha256,
   expectedSourceRegistryPath:route.boundSourceRegistryPath,expectedFlightInstanceId:exact.flightInstanceId}
 });
}
