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
  privateSourceQueryBytes:{value:Buffer.from(receipt.privateBytes),enumerable:false},
  privateSourceRegistryPath:{value:selected.entry.filePath,enumerable:false},
  privateSourceRegistrySha256:{value:selected.entry.fileSha256,enumerable:false},
  privateIndexSha256:{value:exact.indexSha256,enumerable:false},
  privateNextCursor:{value:page.remainingAfterPageCount?page.privateCandidates.at(-1).flightInstanceId:null,enumerable:false}
 }));
}
