/**
 * Gate4 DRAFT independent custody anchor CAS operation contract.
 * This module has no store connection, DB credentials, HTTP, provider calls,
 * deployment or real persistent writes. The *injected* store MUST be a
 * separately authenticated, permissioned, linearizable compare-and-swap
 * implementation with durable readback, outside Replit controller privileges.
 * A caller-supplied mock or forged trust anchor does not establish that.
 *
 * In particular "COMMITTED" from any injected store is NOT proof that
 * the source is externally durable. Unknown/timeout outcome MUST NOT be
 * blindly retried; independently reconcile the current authenticated tip.
 */
import {
  gate4CustodyRecordDigestV39,
  reviewGate4CustodySnapshotV39,
  type Gate4CustodyEntryV39,
  type Gate4CustodyRecordV39,
  type Gate4CustodyExternalAnchorV39
} from "./gate4DurableCustodyReview_v39";

export type Gate4CustodyCasOutcomeV39=
  "COMMITTED"|"CONFLICT"|"UNKNOWN";
export type Gate4CustodyAnchorStoreCandidateV39=Readonly<{
  readCurrentAnchor:()=>Promise<Gate4CustodyExternalAnchorV39|null>;
  compareAndSwap:(
    expected:Gate4CustodyExternalAnchorV39,
    next:Gate4CustodyExternalAnchorV39
  )=>Promise<Gate4CustodyCasOutcomeV39>;
}>;
export type Gate4CustodyCasReviewResultV39=Readonly<{
  status:
    "MOCK_CAS_READBACK_MATCH_NOT_LIVE"|
    "HOLD_STALE_OR_FOREIGN_ANCHOR"|
    "HOLD_CAS_CONFLICT"|
    "HOLD_CAS_UNKNOWN_OUTCOME"|
    "HOLD_READBACK_NOT_VERIFIED";
  revision:number|null;
  externallyAuthenticatedStoreVerified:false;
  linearizableStoreIndependentlyVerified:false;
  rollbackResistantAnchorAttested:false;
  durableSourceCustodyVerified:false;
  independentSupervisorArmed:false;
  paidAuthorization:false;
  providerRequests:0;
}>;
const result=(status:Gate4CustodyCasReviewResultV39["status"],
  revision:number|null):Gate4CustodyCasReviewResultV39=>({
  status,revision,
  externallyAuthenticatedStoreVerified:false,
  linearizableStoreIndependentlyVerified:false,
  rollbackResistantAnchorAttested:false,
  durableSourceCustodyVerified:false,
  independentSupervisorArmed:false,paidAuthorization:false,
  providerRequests:0
});
function exact(
  a:Gate4CustodyExternalAnchorV39|null,
  b:Gate4CustodyExternalAnchorV39
):boolean{
  return a!==null && a.schema===b.schema &&
    a.sourceCommit===b.sourceCommit &&
    a.scopeId===b.scopeId &&
    a.authorizationSha256===b.authorizationSha256 &&
    a.subjectId===b.subjectId &&
    a.exactOwnedSubscriptionId===b.exactOwnedSubscriptionId &&
    a.independentlyReviewedCreateReceiptSha256===
      b.independentlyReviewedCreateReceiptSha256 &&
    a.anchoredRevision===b.anchoredRevision &&
    a.anchoredHeadDigestSha256===b.anchoredHeadDigestSha256;
}
/**
 * Offline CAS flow:
 *  1. Verify current whole journal against separately reviewed anchor.
 *  2. Verify exactly one proposed next event+digest+independently reviewed tip.
 *  3. Compare authenticated stored tip to expected; never overwrite blind.
 *  4. Call atomic CAS once, then READ BACK independent current anchor.
 *  5. Unknown response or missing readback stays HOLD, NEVER auto-retry.
 */
export async function previewGate4CustodyAnchorCasV39(args:{
  priorEntries:readonly Gate4CustodyEntryV39[];
  expectedAnchor:Gate4CustodyExternalAnchorV39;
  nextRecord:Gate4CustodyRecordV39;
  nextAnchor:Gate4CustodyExternalAnchorV39;
  store:Gate4CustodyAnchorStoreCandidateV39;
}):Promise<Gate4CustodyCasReviewResultV39>{
  const before=reviewGate4CustodySnapshotV39(
    args.priorEntries,args.expectedAnchor);
  if(before.revision!==args.expectedAnchor.anchoredRevision||
    args.nextRecord?.revision!==before.revision+1||
    args.nextRecord.previousDigestSha256!==
      args.expectedAnchor.anchoredHeadDigestSha256)
    throw Error("GATE4_CUSTODY_CAS_REVISION_OR_PARENT_HOLD");

  const proposed:Gate4CustodyEntryV39={
    record:args.nextRecord,
    digestSha256:gate4CustodyRecordDigestV39(args.nextRecord)
  };
  reviewGate4CustodySnapshotV39(
    [...args.priorEntries,proposed],args.nextAnchor
  );
  if(!args.store || typeof args.store.readCurrentAnchor!=="function"||
    typeof args.store.compareAndSwap!=="function")
    throw Error("GATE4_CUSTODY_CAS_EXTERNAL_STORE_NOT_PROVIDED_HOLD");

  let observed:Gate4CustodyExternalAnchorV39|null=null;
  try {observed=await args.store.readCurrentAnchor();}
  catch{return result("HOLD_READBACK_NOT_VERIFIED",null);}
  if(!exact(observed,args.expectedAnchor))
    return result("HOLD_STALE_OR_FOREIGN_ANCHOR",null);
  let outcome:Gate4CustodyCasOutcomeV39="UNKNOWN";
  try{
    outcome=await args.store.compareAndSwap(
      args.expectedAnchor,args.nextAnchor
    );
  }catch{return result("HOLD_CAS_UNKNOWN_OUTCOME",null);}
  if(outcome==="CONFLICT")
    return result("HOLD_CAS_CONFLICT",null);
  if(outcome!=="COMMITTED")
    return result("HOLD_CAS_UNKNOWN_OUTCOME",null);
  let after:Gate4CustodyExternalAnchorV39|null=null;
  try{after=await args.store.readCurrentAnchor();}
  catch{return result("HOLD_READBACK_NOT_VERIFIED",null);}
  if(!exact(after,args.nextAnchor))
    return result("HOLD_READBACK_NOT_VERIFIED",null);
  return result("MOCK_CAS_READBACK_MATCH_NOT_LIVE",
    args.nextAnchor.anchoredRevision);
}
