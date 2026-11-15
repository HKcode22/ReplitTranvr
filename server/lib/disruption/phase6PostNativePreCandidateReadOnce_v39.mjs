/** Actual current signed SOURCE/LATER_PRE -> private POST candidate evidence.
 * No key, provider, mutation, dispatch, or physical label. A signed PRE permit
 * is only a candidate; the original V0083 actual committed PRE read is mandatory.
 * One bounded SOURCE query page; a caller may plan separate pages, never
 * change the native T or treat a missing/expired PRE as actual evidence.
 */
import {createHash} from "node:crypto";
import {readP6StoredPrivateReviewOnce} from "./phase6StoredPrivateReviewReadOnce_v39.mjs";
import {hydrateP6DayEpochFullRegistriesReadOnly} from "./phase6DayEpochFullRegistryReadOnce_v39.mjs";
import {inspectP6DayEpochExistingShardSemanticsNoGo} from "./phase6DayEpochOriginalSemanticHandoff_v39.mjs";
import {readP6PrivateSourcePostOnce} from "./phase6PrivateSourcePostReadOnce_v39.mjs";
import {selectP6CommittedNativeSourceQuery,deriveP6CommittedNativeQueryScope} from "./phase6StoredSourceNativeCandidateAudit_v39.mjs";
import {auditP5FuturePostActualPriorPreBatch} from "./phase5V0083FuturePostOriginalDb_v39.ts";
const H=/^[a-f0-9]{64}$/;
const ID=/^[-A-Za-z0-9_.:|]{5,200}$/;
const hash=b=>createHash("sha256").update(b).digest("hex");
const hold=s=>{throw Error("HOLD_P6_POST_NATIVE_PRE_"+s);};
const utc=x=>{if(typeof x!=="string"||!Number.isFinite(Date.parse(x))||new Date(x).toISOString()!==x)hold("INVALID_UTC");return Date.parse(x);};
const scope={privateStoredReviewReadOnlyApproved:true,existingPaidDispatchApproved:false};
const privateResult=(summary,privateCandidates)=>Object.freeze(Object.defineProperty(summary,"privateCandidates",
 {value:Object.freeze(privateCandidates),enumerable:false,writable:false}));
/** Pure projection of one already authenticated index and exact query scope.
 * Explicitly limited to the later PRE registry lane; T24 witness receipt
 * retention does not independently extend original SOURCE use rights.
 * No inference of physical flight completion. */
export function selectP6PostNativePreCandidatePage({index,selector,trust,sourceScope,afterFlightId=null,pageSize=96}){
 const selected=selectP6CommittedNativeSourceQuery(index,selector,trust);
 if(!sourceScope||sourceScope.queryDigestSha256!==selector.queryDigestSha256||
    sourceScope.manifestSha256!==trust.manifestSha256||sourceScope.runDayIndex!==selector.runDayIndex||
    sourceScope.reviewedReleaseSha256!==trust.releaseSha256||sourceScope.rightsReviewSha256!==trust.rightsSha256||
    !["T-6h","T-90m"].includes(sourceScope.horizon)||!/^[A-Z]{4}$/.test(sourceScope.airportIcao??"")||
    !Number.isSafeInteger(pageSize)||pageSize<1||pageSize>384||
    (afterFlightId!==null&&!ID.test(afterFlightId)))hold("UNBOUND_PAGE_SCOPE");
 const begin=utc(sourceScope.expectedServiceWindowStartUtc),end=utc(sourceScope.expectedServiceWindowEndUtc);
 if(begin>=end)hold("INVALID_SOURCE_WINDOW");
 const by=new Map(),all=new Set();
 for(const e of index.privateParsedIndex.entries.filter(x=>x.lane==="LATER_PRE")){
  const b=index.getFrozen(e.filePath);
  if(!Buffer.isBuffer(b)||hash(b)!==e.fileSha256)hold("LATER_REGISTRY_BYTES_DRIFT");
  const r=JSON.parse(b.toString("utf8"));
  if(r.schema!=="v39.phase5.signed-later-pre-day-registry.v1"||
     r.manifestSha256!==trust.manifestSha256||r.reviewedCodeSha!==trust.reviewedCodeSha||
     r.runDayIndex!==selector.runDayIndex||r.shardIndex!==e.shardIndex||
     r.sourceDayRegistryFilePath!==e.sourceRegistryFilePath||r.sourceDayRegistrySha256!==e.sourceRegistrySha256||
     !Array.isArray(r.entries)||r.entries.length<1||r.entries.length>96)hold("LATER_REGISTRY_SCOPE_DRIFT");
  for(const f of r.entries){
   if(!f||!ID.test(f.expectedFlightInstanceId??"")||!["T-6h","T-90m"].includes(f.expectedHorizon)||
      !H.test(f.expectedQueryDigestSha256??"")||!H.test(f.expectedPacketSha256??""))hold("INVALID_LATER_ENTRY");
   const key=f.expectedFlightInstanceId+"|"+f.expectedHorizon;
   if(all.has(key))hold("DUPLICATE_NATIVE_HORIZON_IN_DAY");
   all.add(key);
   if(f.expectedQueryDigestSha256!==selector.queryDigestSha256)continue;
   if(e.sourceRegistryFilePath!==selected.entry.filePath||e.sourceRegistrySha256!==selected.entry.fileSha256||
      f.expectedHorizon!==sourceScope.horizon||by.has(f.expectedFlightInstanceId))hold("CROSS_SOURCE_OR_HORIZON");
   const t=utc(f.expectedSelectedTNativeUtc);
   if(t<begin||t>=end)hold("NATIVE_T_OUTSIDE_SIGNED_SOURCE");
   // Never substitute a valid PRE from another query to qualify this exact query.
   by.set(f.expectedFlightInstanceId,Object.freeze({flightInstanceId:f.expectedFlightInstanceId,
    expectedSelectedTNativeUtc:f.expectedSelectedTNativeUtc,boundSourceQueryDigests:Object.freeze([selector.queryDigestSha256])}));
  }
 }
 const ordered=[...by.values()].sort((a,b)=>a.flightInstanceId<b.flightInstanceId?-1:a.flightInstanceId>b.flightInstanceId?1:0);
 const rest=ordered.filter(x=>afterFlightId===null||x.flightInstanceId>afterFlightId),page=rest.slice(0,pageSize);
 return privateResult({status:"SIGNED_LATER_NATIVE_POST_CANDIDATE_PAGE_NOT_ACTUAL_PRE",runDayIndex:selector.runDayIndex,
  totalCandidateCount:ordered.length,pageCandidateCount:page.length,remainingAfterPageCount:rest.length-page.length,
  providerCalls:0,databaseWrites:0,phase6PaidGo:false},page);
}
/** Actual restricted clients, current independently signed day + source query,
 * original native source partition validator, then actual V0083 DB read.
 * The cursor and all flight/native/permit material stay private. */
export async function readP6ActualNativePostPreCandidatePage({readerClient,sourcePool,trust,selector,policy,afterFlightId=null,pageSize=96}){
 if(trust?.independentStudyTrustPinsApproved!==true||
    policy?.independentPostCandidateReadOnlyApproved!==true||
    policy.independentNativeCandidateReadOnlyApproved!==true||
    policy.existingPaidDispatchApproved!==false||policy.noProviderCredentialsInAudit!==true||
    !H.test(policy.reviewedFrameSha256??"")||!["T-6h","T-90m"].includes(policy.horizon)||
    !Number.isSafeInteger(selector?.runDayIndex)||selector.runDayIndex<1||selector.runDayIndex>31||
    !H.test(selector.queryDigestSha256??""))hold("NO_EXACT_NONPAID_SCOPE");
 const day=await readP6StoredPrivateReviewOnce({client:readerClient,trust,scope,
  selector:{kind:"CURRENT_DAY",runDayIndex:selector.runDayIndex}});
 const index=await hydrateP6DayEpochFullRegistriesReadOnly({client:readerClient,pins:day.pins,wire:day.wire,publicKeyPem:day.publicKeyPem,
  scope:{privateDayRegistryReadOnlyApproved:true,existingPaidDispatchApproved:false,requireCurrentRevisionForPlanning:true}});
 inspectP6DayEpochExistingShardSemanticsNoGo(index);
 const exact={...selector,indexRevision:index.redactedSummary.indexRevision,indexSha256:index.redactedSummary.indexSha256};
 const selected=selectP6CommittedNativeSourceQuery(index,exact,trust);
 const signed=await readP6StoredPrivateReviewOnce({client:readerClient,trust,scope,
  selector:{kind:"SOURCE_QUERY",runDayIndex:exact.runDayIndex,shardIndex:selected.entry.shardIndex,
   logicalPath:selected.q.filePath,contentSha256:selected.q.expectedPacketSha256}});
 const receipt=await readP6PrivateSourcePostOnce(readerClient,signed.pins,signed.wire,signed.publicKeyPem);
 const sourceScope=deriveP6CommittedNativeQueryScope(receipt,selected,exact,trust,policy);
 if(sourceScope.horizon!==policy.horizon)hold("SIGNED_HORIZON_DRIFT");
 const page=selectP6PostNativePreCandidatePage({index,selector:exact,trust,sourceScope,afterFlightId,pageSize});
 const observed=receipt.redactedSummary.observedDatabaseClockUtc;
 const result=page.pageCandidateCount?await auditP5FuturePostActualPriorPreBatch(sourcePool,{
  manifestSha256:trust.manifestSha256,runDayIndex:exact.runDayIndex,airportIcao:sourceScope.airportIcao,
  reviewedFrameSha256:policy.reviewedFrameSha256,candidates:page.privateCandidates}):null;
 if(result&&(utc(result.observedDbClockUtc)<utc(observed)||utc(result.completedDbClockUtc)-utc(observed)>120000||
    result.candidateCount!==page.pageCandidateCount||result.providerCalls!==0||result.databaseWrites!==0||result.phase6PaidGo!==false))hold("ACTUAL_PRE_READ_CLOCK_OR_SCOPE_DRIFT");
 const out={status:"ACTUAL_NATIVE_POST_PRE_CANDIDATE_PAGE_NO_GO",runDayIndex:exact.runDayIndex,
  totalCandidateCount:page.totalCandidateCount,pageCandidateCount:page.pageCandidateCount,
  remainingAfterPageCount:page.remainingAfterPageCount,eligibleCount:result?.eligibleCount??0,
  unavailableCount:result?.unavailableCount??0,observedDbClockUtc:result?.completedDbClockUtc??observed,
  providerCalls:0,databaseWrites:0,postPacketsIssued:0,phase6PaidGo:false};
 return Object.freeze(Object.defineProperties(out,{
  privateCandidates:{value:page.privateCandidates,enumerable:false},
  privateDecisions:{value:result?.privateDecisions??Object.freeze([]),enumerable:false},
  privateSourceScope:{value:sourceScope,enumerable:false},
  privateReviewedFrameSha256:{value:policy.reviewedFrameSha256,enumerable:false},
  privateSourceQueryBytes:{value:Buffer.from(receipt.privateBytes),enumerable:false},
  privateSourceRegistryPath:{value:selected.entry.filePath,enumerable:false},
  privateSourceRegistrySha256:{value:selected.entry.fileSha256,enumerable:false},
  privateIndexSha256:{value:exact.indexSha256,enumerable:false},
  privateNextCursor:{value:page.remainingAfterPageCount?page.privateCandidates.at(-1).flightInstanceId:null,enumerable:false}
 }));
}


/** Draft only: one prospective physical departure FIDS request per exact
 * service partition and reviewed follow-up window, not per flight/horizon.
 * A distinct reviewer must still complete and sign the existing POST packet.
 * No authorization, reservation, publication, dispatch or physical label.
 */
export function proposeP6NativePostPhysicalWindow({page,policyBytes,expectedPolicySha256,trust,existingRequestSha256s=[]}){
 const s=page?.privateSourceScope;
 if(page?.status!=="ACTUAL_NATIVE_POST_PRE_CANDIDATE_PAGE_NO_GO"||page.providerCalls!==0||
    page.databaseWrites!==0||page.postPacketsIssued!==0||page.phase6PaidGo!==false||
    trust?.independentStudyTrustPinsApproved!==true||
    !Buffer.isBuffer(policyBytes)||policyBytes.length<100||policyBytes.length>65536||
    !H.test(expectedPolicySha256??"")||hash(policyBytes)!==expectedPolicySha256||
    !Array.isArray(existingRequestSha256s)||existingRequestSha256s.length>100000||
    existingRequestSha256s.some(x=>!H.test(x??""))||
    !s||s.manifestSha256!==trust.manifestSha256||s.reviewedReleaseSha256!==trust.releaseSha256||
    s.rightsReviewSha256!==trust.rightsSha256||!H.test(page.privateSourceRegistrySha256??"")||
    !H.test(page.privateIndexSha256??"")||!Buffer.isBuffer(page.privateSourceQueryBytes)||
    !Array.isArray(page.privateCandidates)||!Array.isArray(page.privateDecisions)||
    page.privateCandidates.length!==page.pageCandidateCount||page.privateDecisions.length!==page.pageCandidateCount)
  hold("UNAPPROVED_PHYSICAL_WINDOW_SCOPE");
 const policy=JSON.parse(policyBytes.toString("utf8"));
 if(policy.schema!=="v39.phase6.native-post-physical-window-policy.v1"||
    policy.independentPostRequestGeometryApproved!==true||
    policy.manifestSha256!==trust.manifestSha256||policy.releaseSha256!==trust.releaseSha256||
    policy.rightsSha256!==trust.rightsSha256||policy.reviewedCodeSha!==trust.reviewedCodeSha||
    !H.test(policy.reviewedCategoryBudgetSha256??"")||!H.test(policy.reviewedProviderPriceSha256??"")||
    !H.test(policy.reviewedFrameSha256??"")||policy.reviewedFrameSha256!==page.privateReviewedFrameSha256||policy.reviewedProviderContractSha256!==s.providerContractSha256||
    !Number.isSafeInteger(policy.followupAfterPartitionEndSeconds)||policy.followupAfterPartitionEndSeconds<0||
    !Number.isSafeInteger(policy.dispatchWindowSeconds)||policy.dispatchWindowSeconds<1||policy.dispatchWindowSeconds>1800||
    policy.followupAfterPartitionEndSeconds+policy.dispatchWindowSeconds>48*3600||
    policy.expectedApiUnitsPerGet!==2)hold("PHYSICAL_WINDOW_POLICY_DRIFT");
 const q=JSON.parse(page.privateSourceQueryBytes.toString("utf8")),p=q.plan,a=p?.acquisition;
 if(q.queryDigestSha256!==s.queryDigestSha256||q.manifestSha256!==s.manifestSha256||
    p?.openapiSha256!==s.providerContractSha256||a?.icao!==s.airportIcao||a.slot!==s.slot||
    a.horizon!==s.horizon||a.runDayIndex!==page.runDayIndex||
    a.serviceWindowStartUtc!==s.expectedServiceWindowStartUtc||a.serviceWindowEndUtc!==s.expectedServiceWindowEndUtc||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(p.localFrom??"")||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(p.localTo??"")||
    typeof p.ianaTimezone!=="string"||p.ianaTimezone.length<3||p.ianaTimezone.length>60)hold("PHYSICAL_SOURCE_FRAME_DRIFT");
 const now=utc(page.observedDbClockUtc),from=utc(a.serviceWindowStartUtc),to=utc(a.serviceWindowEndUtc);
 if(from>=to||to-from>6*3600000)hold("PHYSICAL_SOURCE_FRAME_RANGE");
 const start=new Date(to+policy.followupAfterPartitionEndSeconds*1000).toISOString();
 const end=new Date(utc(start)+policy.dispatchWindowSeconds*1000).toISOString();
 const base={runDayIndex:page.runDayIndex,eligibleCount:page.eligibleCount,providerCalls:0,databaseWrites:0,
  postPacketsIssued:0,phase6PaidGo:false};
 if(start.slice(0,10)!==end.slice(0,10))return Object.freeze({...base,status:"POST_WINDOW_CROSSES_UTC_CHARGE_DAY_REVIEW_REQUIRED"});
 if(utc(start)<=now)return Object.freeze({...base,status:"POST_WINDOW_NOT_PROSPECTIVE_NO_BACKFILL"});
 // Exclude anchor, horizon, refresh, day and reviewer from the paid request
 // identity. The existing V0083 immutable request key can block repeat spend.
 const key={schema:"v39.phase6.native-post-physical-one-get-key.v1",manifestSha256:trust.manifestSha256,
  providerContractSha256:s.providerContractSha256,direction:"Departure",airportIcao:s.airportIcao,
  plannedSourceFromUtc:a.serviceWindowStartUtc,plannedSourceToUtc:a.serviceWindowEndUtc,
  fromLocal:p.localFrom,toLocal:p.localTo,airportIanaTimezone:p.ianaTimezone,
  postDispatchEarliestUtc:start,postDispatchHardLatestUtc:end};
 const requestSha256=hash(Buffer.from(JSON.stringify(key)));
 if(existingRequestSha256s.includes(requestSha256))return Object.freeze({...base,status:"POST_PHYSICAL_REQUEST_ALREADY_INDEXED_NO_REPLAY"});
 const ids=new Map(page.privateCandidates.map(x=>[x.flightInstanceId,x])),seen=new Set(),eligible=[];
 if(ids.size!==page.privateCandidates.length)hold("DUPLICATE_CANDIDATE_ID");
 for(const x of page.privateDecisions){
  const c=ids.get(x.flightInstanceId);
  if(!c||seen.has(x.flightInstanceId))hold("POST_DECISION_SCOPE_DRIFT");
  seen.add(x.flightInstanceId);
  if(x.status==="POST_PRE_UNAVAILABLE_OR_AMBIGUOUS")continue;
  const pre=x.pre;
  if(x.status!=="VALID_ACTUAL_PRE_FOR_POST_REVIEW"||pre?.status!=="ACTUAL_SAME_FLIGHT_SOURCE_BOUND_PRE_PARTIAL_ALLOWED"||
     pre.flightInstanceId!==c.flightInstanceId||pre.manifestSha256!==trust.manifestSha256||pre.runDayIndex!==page.runDayIndex||
     pre.observedFromIndependentRestrictedDb!==true||pre.providerCalls!==0||pre.databaseWrites!==0||
     !Number.isSafeInteger(pre.boundSourceRegistryValidHorizonCount)||pre.boundSourceRegistryValidHorizonCount<1||
     !Number.isSafeInteger(pre.observedValidHorizonCount)||pre.observedValidHorizonCount<1||pre.observedValidHorizonCount>3||
     !Array.isArray(pre.actualSourcePREReferenceIds)||pre.actualSourcePREReferenceIds.length!==pre.observedValidHorizonCount||
     c.boundSourceQueryDigests.length!==1||c.boundSourceQueryDigests[0]!==s.queryDigestSha256||
     utc(c.expectedSelectedTNativeUtc)<from||utc(c.expectedSelectedTNativeUtc)>=to)hold("POST_ACTUAL_PRE_LINEAGE_DRIFT");
  eligible.push({c,pre,expires:utc(x.boundPreRetentionNotAfterUtc)});
 }
 if(eligible.length!==page.eligibleCount)hold("POST_ACTUAL_PRE_COUNT_DRIFT");
 if(!eligible.length)return Object.freeze({...base,status:"NO_ACTUAL_RETAINED_BOUND_PRE_FOR_POST"});
 const surviving=eligible.filter(x=>x.expires>utc(end));
 if(!surviving.length)return Object.freeze({...base,status:"BOUND_PRE_EXPIRES_BEFORE_POST_DISPATCH_WINDOW"});
 surviving.sort((x,y)=>x.c.flightInstanceId<y.c.flightInstanceId?-1:x.c.flightInstanceId>y.c.flightInstanceId?1:0);
 const {c,pre,expires}=surviving[0];
 const context={schema:"v39.phase6.unsigned-native-post-request-evidence.v1",requestSha256,policySha256:expectedPolicySha256,
  sourceRegistrySha256:page.privateSourceRegistrySha256,sourceQueryDigestSha256:s.queryDigestSha256,
  sourceIndexSha256:page.privateIndexSha256,observedDbClockUtc:page.observedDbClockUtc,anchorPre:pre,
  anchorBoundPreRetentionNotAfterUtc:new Date(expires).toISOString(),
  flightInstanceId:c.flightInstanceId,expectedSelectedTNativeUtc:c.expectedSelectedTNativeUtc};
 const reviewed={schema:"v39.phase5.future-post-reviewed-outcome-one-get.v1",manifestSha256:trust.manifestSha256,
  requestSha256,reviewedSourceRightsSha256:trust.rightsSha256,
  reviewedProviderPriceSha256:policy.reviewedProviderPriceSha256,reviewedCategoryBudgetSha256:policy.reviewedCategoryBudgetSha256,
  reviewedRequestContextSha256:hash(Buffer.from(JSON.stringify(context))),reviewedProviderContractSha256:s.providerContractSha256,
  reviewedFrameSha256:policy.reviewedFrameSha256,runDayIndex:page.runDayIndex,slot:s.slot,airportIcao:s.airportIcao,
  flightInstanceId:c.flightInstanceId,expectedSelectedTNativeUtc:c.expectedSelectedTNativeUtc,
  plannedSourceFromUtc:key.plannedSourceFromUtc,plannedSourceToUtc:key.plannedSourceToUtc,
  fromLocal:key.fromLocal,toLocal:key.toLocal,airportIanaTimezone:key.airportIanaTimezone,
  postDispatchEarliestUtc:start,postDispatchHardLatestUtc:end,expectedApiUnitsPerGet:2};
 return Object.freeze(Object.defineProperties({...base,status:"ONE_UNSIGNED_NATIVE_POST_PHYSICAL_REQUEST",requestSha256,
  independentPostReviewStillRequired:true,physicalOutcomeCertified:false},
  {privateReviewedDraft:{value:Object.freeze(reviewed),enumerable:false},
   privateEvidence:{value:Object.freeze(context),enumerable:false},
   privateSourceRegistryPath:{value:page.privateSourceRegistryPath,enumerable:false},
   privateSourceRegistrySha256:{value:page.privateSourceRegistrySha256,enumerable:false}}));
}
