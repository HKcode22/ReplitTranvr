/** Concrete independent-review consumer. The caller must commission an
 * actual private review transport; an empty transport or unsigned decision
 * cannot pass. The paid worker has no signing key. Never retry provider GET. */
import type {Pool} from "pg";
import type {P5ReviewedFuturePostOneGet} from "./phase5V0083FuturePostOriginalDb_v39";
import type {P6PostCommittedScope,P6PostPreservationAnchor} from "./phase6ActualPostOutcomeObservability_v39";
import type {Phase7DerivedReleaseContract} from "./phase6DerivedTrainingReleaseContract_v39";
import type {Phase7ReviewedTransformationProfile} from "./phase7ReviewedSourceTransformation_v39";
import type {Phase7StoredPreFragment} from "./phase7FinalGroupAssembly_v39";
import {readPhase7PostScopedGroup,preflightPhase7PostScopedReader} from "./phase7PostScopedGroup_v39";
import {verifyPhase7SignedPostSettlement,readPhase7PostReviewerPublicKey} from "./phase7SignedPostReview_v39";
import {hashPhase7DurableCandidate,persistOrReconcileReviewedPhase7Bundle,preflightPhase7DurableBundleActors} from "./phase7DurableDerivedBundleCandidate_v39";
import {phase7AuditedPreservationGroups,type Phase7PostConsumer} from "./phase7PostPreservationBridge_v39";
import {requirePhase7RecoveryReceiptBeforeSettlement,type Phase7RecoveryReceiptCustodyPort} from "./phase7CommittedPostRecovery_v39";
const hold=(s:string):never=>{throw Error("HOLD_P7_SIGNED_POST_CONSUMER_"+s);};
export interface Phase7PrivateOutcomeReviewTransport extends Phase7RecoveryReceiptCustodyPort{
 /** The real separate reviewer transport must demonstrate its independent
  * read-only availability before a paid request. Never dispatch source I/O. */
 preflight(p:Readonly<P5ReviewedFuturePostOneGet>):Promise<{providerCalls:0;writeAuthority:false;independentReviewerAvailable:true;recoveryReceiptCustodyAvailable:true}>;
 readExactReview(input:{committed:Readonly<P6PostCommittedScope>;anchor:Readonly<P6PostPreservationAnchor>;
  fragments:readonly Phase7StoredPreFragment[];observedDbClockUtc:string}):Promise<unknown>;
}
type Deps={env:NodeJS.ProcessEnv;contract:Phase7DerivedReleaseContract;profile:Phase7ReviewedTransformationProfile;
 scopedReader:Pool;scopedReaderRole:string;bundleWriter:Pool;bundleWriterRole:string;bundleReader:Pool;bundleReaderRole:string;
 transport:Phase7PrivateOutcomeReviewTransport};
export function createPhase7SignedPostConsumer(d:Deps):Phase7PostConsumer{
 readPhase7PostReviewerPublicKey(d.env);
 const policySha256=d.env.P6_PHASE7_POST_PRESERVATION_POLICY_SHA256!;
 const roles=[d.scopedReaderRole,d.bundleWriterRole,d.bundleReaderRole];
 if(new Set(roles).size!==3||roles.some(r=>!/^phase7_[a-z0-9_]{8,55}$/.test(r))||
  new Set([d.scopedReader,d.bundleWriter,d.bundleReader]).size!==3||
  hashPhase7DurableCandidate(d.contract)!==d.env.P6_PHASE7_POST_CONTRACT_SHA256||
  hashPhase7DurableCandidate(d.profile)!==d.env.P6_PHASE7_POST_PROFILE_SHA256||
  typeof d.transport?.preflight!=="function"||typeof d.transport?.readExactReview!=="function"||
  typeof d.transport?.readOrRecordExactRecoveryReceipt!=="function"||typeof d.transport?.readExactRecoveryReceipt!=="function")hold("PROTECTED_SCOPE");
 let admittedRequest:string|null=null;
 return {policySha256,
  async preflight(p){
   if(admittedRequest!==null||p.manifestSha256!==d.env.V39_P5_MANIFEST_SHA256||p.reviewedSourceRightsSha256!==d.env.V39_P5_RIGHTS_SHA256)hold("REQUEST_SCOPE");
   await preflightPhase7PostScopedReader(d.scopedReader,d.scopedReaderRole,d.contract);
   await preflightPhase7DurableBundleActors(d.bundleWriter,d.bundleReader,d.contract,{writerRole:d.bundleWriterRole,readerRole:d.bundleReaderRole});
   const r=await d.transport.preflight(p);
   if(r?.providerCalls!==0||r.writeAuthority!==false||r.independentReviewerAvailable!==true||r.recoveryReceiptCustodyAvailable!==true)hold("REVIEW_TRANSPORT");
   admittedRequest=p.requestSha256;
  },
  async preserveCommitted(c,a){
   if(admittedRequest!==c.packet.requestSha256||!Array.isArray(a.privatePreservationAnchors)||
    Object.getOwnPropertyDescriptor(a,"privatePreservationAnchors")?.enumerable!==false||
    !Number.isSafeInteger(a.uniqueRetainedPreFlights)||a.uniqueRetainedPreFlights<0||a.uniqueRetainedPreFlights>2500)hold("COMMITTED_SCOPE");
   admittedRequest=null;
   // Purely scientific ambiguity is locally excluded by the actual source
   // audit, never by the reviewer or a catch-all error handler. Preserve all
   // other groups; no data is invented, no uncertain reservation is replayed.
   for(const h of a.privatePreservationAnchors){
    if(h.manifestSha256!==c.packet.manifestSha256||h.rightsSha256!==c.packet.reviewedSourceRightsSha256||
     h.airportIcao!==c.packet.airportIcao||h.runDayIndex!==c.packet.runDayIndex||h.frameSha256!==c.packet.reviewedFrameSha256)hold("CROSS_PARTITION");
   }
   const {eligible:byLeg,excluded}=phase7AuditedPreservationGroups(a);
   // Record before reading group reviews. A crash after the first group write must have an independently signed,
   // exact original denominator receipt to reconcile without another GET.
   // Also require the receipt for a zero-group/excluded-only result.
   await requirePhase7RecoveryReceiptBeforeSettlement({env:d.env,scope:c,audit:a,custody:d.transport,
    readRestrictedClock:()=>preflightPhase7PostScopedReader(d.scopedReader,d.scopedReaderRole,d.contract)});

   const seenGroups=new Set<string>();
   // Validate all reviews before any write. This avoids a missing review in
   // the middle silently turning a partial group denominator into success.
   const pending:{verified:ReturnType<typeof verifyPhase7SignedPostSettlement>;anchor:P6PostPreservationAnchor;wire:unknown;fragmentsSha256:string}[]=[];
   for(const live of byLeg.values()){
    if(live.length>3||new Set(live.map(x=>x.horizon)).size!==live.length||
     live.some(x=>x.selectedNativeTUtc!==live[0].selectedNativeTUtc))hold("LIVE_HORIZON_CONFLICT");
    // Latest-expiring live anchor, deterministic tie-breaker.
    const anchor=[...live].sort((x,y)=>Date.parse(y.sourceExpiresAtUtc)-Date.parse(x.sourceExpiresAtUtc)||x.horizon.localeCompare(y.horizon))[0];
    const group=await readPhase7PostScopedGroup(d.scopedReader,d.scopedReaderRole,d.contract,d.profile,anchor);
    const id=group.fragments[0].groupId;
    if(seenGroups.has(id)||live.some(h=>!group.fragments.some(f=>f.packet.rows[0].horizon===h.horizon)))hold("GROUP_REUSED_OR_MISSING_LIVE_PRE");
    seenGroups.add(id);
    const wire=await d.transport.readExactReview({committed:c,anchor,fragments:group.fragments,observedDbClockUtc:group.observedAtUtc});
    // Fresh SQL clock/anchor after external review wait; no stale
    // source proof or changed group may pass.
    const fresh=await readPhase7PostScopedGroup(d.scopedReader,d.scopedReaderRole,d.contract,d.profile,anchor);
    if(hashPhase7DurableCandidate(fresh.fragments)!==hashPhase7DurableCandidate(group.fragments))hold("GROUP_CHANGED_DURING_REVIEW");
    const v=verifyPhase7SignedPostSettlement({env:d.env,wire,committed:c,anchor,fragments:fresh.fragments,contract:d.contract,profile:d.profile,observedDbClockUtc:fresh.observedAtUtc});
    for(const h of live){
     const e=v.scope.evidence[h.horizon];
     if(e&&(e.preIssuedAtUtc!==h.preIssuedAtUtc||e.originalSourceAvailableAtUtc!==h.originalSourceAvailableAtUtc||
       e.frozenSourceOriginalSha256!==h.sourceResponseSha256))hold("LIVE_HORIZON_EVIDENCE_DRIFT");
    }
    pending.push({verified:v,anchor,wire,fragmentsSha256:hashPhase7DurableCandidate(fresh.fragments)});
   }
   let verifiedGroupCount=0;
   for(const item of pending){
    // The earlier validation may precede many other group reviews. Check
    // the real source/contract clock AGAIN before each write/reconciliation.
    const fresh=await readPhase7PostScopedGroup(d.scopedReader,d.scopedReaderRole,d.contract,d.profile,item.anchor);
    if(hashPhase7DurableCandidate(fresh.fragments)!==item.fragmentsSha256)hold("GROUP_CHANGED_BEFORE_SETTLEMENT");
    const v=verifyPhase7SignedPostSettlement({env:d.env,wire:item.wire,committed:c,anchor:item.anchor,fragments:fresh.fragments,contract:d.contract,profile:d.profile,observedDbClockUtc:fresh.observedAtUtc});
    if(v.reviewSha256!==item.verified.reviewSha256||hashPhase7DurableCandidate(v.bundle)!==hashPhase7DurableCandidate(item.verified.bundle))hold("EXACT_REVIEW_CHANGED");
    const r=await persistOrReconcileReviewedPhase7Bundle(d.bundleWriter,d.bundleReader,d.contract,v.bundle,v.approval,{writerRole:d.bundleWriterRole,readerRole:d.bundleReaderRole},new Date(fresh.observedAtUtc));
    if(!["DERIVED_BUNDLE_DURABLE_INDEPENDENT_READBACK","DERIVED_BUNDLE_EXACT_READBACK_NO_REPLAY"].includes(r.status))hold("UNKNOWN_GROUP_COMMIT_NO_REPLAY");
    verifiedGroupCount++;
   }
   return {independentlyReadBack:true,sourceMappingPersisted:false,providerCalls:0,verifiedGroupCount,heldGroupCount:0,excludedAmbiguousGroupCount:excluded.size,accountedRetainedFlightCount:byLeg.size+excluded.size};
  }
 };
}
