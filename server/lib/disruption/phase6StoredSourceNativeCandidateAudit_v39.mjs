/** Post-COMMIT, nonpaid existing V0079 source audit from the actual
 * day-index and signed query bytes. Does NOT use the due dispatch route:
 * a source can be audited after its HTTP window, before each own PRE cutoff.
 * No application DB, new queue, provider or independent signer certifier.
 */
import {createHash} from "node:crypto";
import {readP6StoredPrivateReviewOnce} from "./phase6StoredPrivateReviewReadOnce_v39.mjs";
import {readP6PrivateSourcePostOnce} from "./phase6PrivateSourcePostReadOnce_v39.mjs";
import {hydrateP6DayEpochFullRegistriesReadOnly} from "./phase6DayEpochFullRegistryReadOnce_v39.mjs";
import {inspectP6DayEpochExistingShardSemanticsNoGo} from "./phase6DayEpochOriginalSemanticHandoff_v39.mjs";
import {verifyP5F8ExactSourcePartition} from "./phase5ScopedFidsSourceBridge_v39.ts";
import {auditP5RealSourceToNativeFlightCandidatesReadonly}
 from "../../../scripts/v39_phase5_actual_source_native_flight_candidate_readonly_owner_v39.ts";
import {digestP5ActualSourceCandidateAudit} from "./phase5ActualSourceNativeFlightCandidateAudit_v39.ts";
const SHA=/^[a-f0-9]{64}$/;
const REG=/^data-collection\/phase5\/frozen\/source_[A-Za-z0-9_.-]{8,125}\.json$/;
const QUERY=/^data-collection\/phase5\/frozen\/sourceq_[A-Za-z0-9_.-]{8,110}\.json$/;
const fail=s=>{throw Error("HOLD_P6_STORED_SOURCE_NATIVE_AUDIT_"+s);};
const hash=b=>createHash("sha256").update(b).digest("hex");
const sealed=(x,k)=>{const d=Object.getOwnPropertyDescriptor(x??{},k);return Boolean(d&&!d.enumerable&&!d.writable);};
const iso=x=>typeof x==="string"&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
const checkSelector=s=>s&&Number.isSafeInteger(s.runDayIndex)&&s.runDayIndex>=1&&s.runDayIndex<=31&&
 Number.isSafeInteger(s.indexRevision)&&s.indexRevision>=1&&s.indexRevision<=1024&&
 [s.indexSha256,s.queryDigestSha256].every(x=>typeof x==="string"&&SHA.test(x));
export function selectP6CommittedNativeSourceQuery(index,selector,trust){
 const z=index?.redactedSummary;
 if(!checkSelector(selector)||!z||z.status!=="SIGNED_DAY_EPOCH_FULL_REGISTRY_READONLY_NO_DISPATCH"||
    z.indexSha256!==selector.indexSha256||z.indexRevision!==selector.indexRevision||z.runDayIndex!==selector.runDayIndex||
    z.externalEd25519ReviewerVerified!==true||z.restrictedPrivatePg16ReaderVerified!==true||
    z.actualPrivateRegistryBytesRead!==true||z.providerCalls!==0||z.databaseWrites!==0||z.phase6PaidGo!==false||
    !sealed(index,"privateParsedIndex")||!sealed(index,"privateCurrentIndexBytes")||!sealed(index,"getFrozen")||
    !Buffer.isBuffer(index.privateCurrentIndexBytes)||hash(index.privateCurrentIndexBytes)!==selector.indexSha256||
    !Array.isArray(index.privateParsedIndex?.entries)||index.privateParsedIndex.entries.length>1024||
    index.privateParsedIndex.manifestSha256!==trust.manifestSha256||
    index.privateParsedIndex.reviewedCodeSha!==trust.reviewedCodeSha||
    index.privateParsedIndex.reviewedRightsSha256!==trust.rightsSha256||
    index.privateParsedIndex.reviewedReleaseSha256!==trust.releaseSha256||
    index.privateParsedIndex.calendarSha256!==trust.calendarSha256||
    JSON.stringify(JSON.parse(index.privateCurrentIndexBytes.toString("utf8")))!==JSON.stringify(index.privateParsedIndex))
  fail("UNAUTHENTICATED_EXACT_DAY_REGISTRY");
 const matches=[];
 for(const entry of index.privateParsedIndex.entries.filter(e=>e.lane==="SOURCE")){
  if(entry.runDayIndex!==selector.runDayIndex||!REG.test(entry.filePath??"")||
     !SHA.test(entry.fileSha256??"")||!Number.isSafeInteger(entry.shardIndex)||entry.shardIndex<1)
   fail("SIGNED_SOURCE_SHARD_SCOPE");
  const bytes=index.getFrozen(entry.filePath);
  if(!Buffer.isBuffer(bytes)||hash(bytes)!==entry.fileSha256)fail("SOURCE_REGISTRY_SHA_DRIFT");
  const registry=JSON.parse(bytes.toString("utf8"));
  if(registry?.schema!=="v39.phase5.signed-per-day-source-batch-readonly.v1"||
     registry.manifestSha256!==trust.manifestSha256||registry.runDayIndex!==selector.runDayIndex||
     !Array.isArray(registry.entries)||registry.entries.length<1||registry.entries.length>96)
   fail("SOURCE_REGISTRY_IDENTITY_DRIFT");
  for(const q of registry.entries){
   if(!QUERY.test(q?.filePath??"")||!SHA.test(q.expectedPacketSha256??"")||!SHA.test(q.expectedQueryDigestSha256??""))
    fail("INVALID_SIGNED_SOURCE_QUERY_ENTRY");
   if(q.expectedQueryDigestSha256===selector.queryDigestSha256)matches.push({entry,q});
  }
 }
 if(matches.length!==1)fail("SOURCE_QUERY_NOT_UNIQUE_IN_SIGNED_DAY");
 return matches[0];
}
/** Derive all query identity pins from authenticated signed bytes; only
 * stable externally reviewed staleness policy is supplied separately. */
export function deriveP6CommittedNativeQueryScope(receipt,selected,selector,trust,policy){
 const s=receipt?.redactedSummary;
 if(policy?.independentNativeCandidateReadOnlyApproved!==true||
    !Number.isSafeInteger(policy.maximumPopulationStalenessSeconds)||
    policy.maximumPopulationStalenessSeconds<1||policy.maximumPopulationStalenessSeconds>86400||
    !SHA.test(policy.providerContractSha256??"")||
    s?.status!=="VERIFIED_ONE_PRIVATE_PACKET_BYTE_TRANSPORT_NO_GO"||s.kind!=="SOURCE_QUERY_PACKET"||
    s.verifiedEd25519Review!==true||s.runDayIndex!==selector.runDayIndex||
    s.shardIndex!==selected.entry.shardIndex||s.contentSha256!==selected.q.expectedPacketSha256||
    s.providerCalls!==0||s.databaseWrites!==0||s.githubDispatches!==0||
    !sealed(receipt,"privateBytes")||!sealed(receipt,"privateLogicalPath")||
    receipt.privateLogicalPath!==selected.q.filePath||!Buffer.isBuffer(receipt.privateBytes)||
    hash(receipt.privateBytes)!==s.contentSha256)
  fail("UNVERIFIED_SOURCE_QUERY_RECEIPT_OR_POLICY");
 const packet=JSON.parse(receipt.privateBytes.toString("utf8")),p=packet.plan,a=p?.acquisition;
 if(packet.schema!=="v39.phase5.github-source-one-query-template.v2"||
    packet.manifestSha256!==trust.manifestSha256||packet.queryDigestSha256!==selector.queryDigestSha256||
    Object.hasOwn(packet,"githubRunId")||Object.hasOwn(packet,"approvedCodeSha")||
    p?.independentlyApprovedSourceAndRetention!==true||p.githubOnlyOwnerApproved!==true||
    p.reviewedProviderRightsSha256!==trust.rightsSha256||p.reviewedReleaseSha256!==trust.releaseSha256||
    p.openapiSha256!==policy.providerContractSha256||!SHA.test(p.expectedEarlyDrawSha256??"")||
    !a||a.runDayIndex!==selector.runDayIndex||!["HUB","MID_A","MID_B","REGIONAL"].includes(a.slot)||
    !["T-24h","T-6h","T-90m"].includes(a.horizon)||!/^[A-Z]{4}$/.test(a.icao??"")||
    a.providerQueryDirection!=="Departure"||a.apiUnitsPerAttempt!==2||a.maxAttempts!==1||
    !iso(a.serviceWindowStartUtc)||!iso(a.serviceWindowEndUtc)||a.serviceWindowStartUtc>=a.serviceWindowEndUtc||
    !iso(p.day?.scheduledStartUtc))
  fail("SIGNED_QUERY_SCOPE_OR_CONTRACT_DRIFT");
 verifyP5F8ExactSourcePartition({...p,day:{...p.day,scheduledStartUtc:new Date(p.day.scheduledStartUtc)}});
 return Object.freeze({manifestSha256:trust.manifestSha256,queryDigestSha256:selector.queryDigestSha256,
  reviewedReleaseSha256:trust.releaseSha256,rightsReviewSha256:trust.rightsSha256,
  providerContractSha256:p.openapiSha256,earlyDrawSha256:p.expectedEarlyDrawSha256,
  runDayIndex:a.runDayIndex,slot:a.slot,horizon:a.horizon,airportIcao:a.icao,
  maxPopulationStalenessSeconds:policy.maximumPopulationStalenessSeconds,
  expectedServiceWindowStartUtc:a.serviceWindowStartUtc,expectedServiceWindowEndUtc:a.serviceWindowEndUtc});
}
export async function auditP6StoredCommittedNativeSource({readerClient,sourcePool,trust,selector,policy}){
 if(!checkSelector(selector)||trust?.independentStudyTrustPinsApproved!==true||
    policy?.independentNativeCandidateReadOnlyApproved!==true||
    policy.existingPaidDispatchApproved!==false||policy.noProviderCredentialsInAudit!==true)
  fail("NO_EXPLICIT_NONPAID_COMMITTED_QUERY_SCOPE");
 const scope={privateStoredReviewReadOnlyApproved:true,existingPaidDispatchApproved:false};
 const review=await readP6StoredPrivateReviewOnce({client:readerClient,trust,scope,
  selector:{kind:"EXACT_DAY",runDayIndex:selector.runDayIndex,indexRevision:selector.indexRevision,indexSha256:selector.indexSha256}});
 const index=await hydrateP6DayEpochFullRegistriesReadOnly({client:readerClient,pins:review.pins,wire:review.wire,
  publicKeyPem:review.publicKeyPem,scope:{privateDayRegistryReadOnlyApproved:true,existingPaidDispatchApproved:false,
   requireCurrentRevisionForPlanning:true}});
 const selected=selectP6CommittedNativeSourceQuery(index,selector,trust);
 const signed=await readP6StoredPrivateReviewOnce({client:readerClient,trust,scope,
  selector:{kind:"SOURCE_QUERY",runDayIndex:selector.runDayIndex,shardIndex:selected.entry.shardIndex,
   logicalPath:selected.q.filePath,contentSha256:selected.q.expectedPacketSha256}});
 const packet=await readP6PrivateSourcePostOnce(readerClient,signed.pins,signed.wire,signed.publicKeyPem);
 const auditedScope=deriveP6CommittedNativeQueryScope(packet,selected,selector,trust,policy);
 const audit=await auditP5RealSourceToNativeFlightCandidatesReadonly(sourcePool,auditedScope);
 const now=Date.parse(audit.actualDbClockUtc),read=Date.parse(packet.redactedSummary.observedDatabaseClockUtc);
 if(!Number.isFinite(now)||!Number.isFinite(read)||now<read||now-read>120000||
    typeof audit.sourceGithubRunId!=="string"||!/^[0-9]{5,25}$/.test(audit.sourceGithubRunId))
  fail("ACTUAL_SOURCE_AUDIT_CLOCK_OR_RUN_DRIFT");
 const out={status:"ACTUAL_COMMITTED_SOURCE_CANDIDATES_AWAIT_INDEPENDENT_PRE_REVIEW",
  runDayIndex:selector.runDayIndex,horizon:auditedScope.horizon,
  candidateAuditSha256:digestP5ActualSourceCandidateAudit(audit),observedMemberCount:audit.observedMemberCount,
  candidateCount:audit.candidateCount,censoredCount:audit.censoredCount,classifications:audit.classifications,
  actualDbClockUtc:audit.actualDbClockUtc,providerCalls:0,databaseWrites:0,signedPrePacketsIssued:0,phase6PaidGo:false};
 Object.defineProperties(out,{privateAuditBytes:{value:Buffer.from(JSON.stringify(audit)),enumerable:false},
  privateSourceScope:{value:Object.freeze({...auditedScope,expectedSourceGithubRunId:audit.sourceGithubRunId}),enumerable:false},
  privateSourceRegistrySha256:{value:selected.entry.fileSha256,enumerable:false}});
 return Object.freeze(out);
}

/** Intake only, NOT authorization or a PRE observation. The current signed
 * day already contains immutable reviewed flight/horizon choices. Overlapping
 * SOURCE refreshes must not replace them, nor block other new flights.
 * Preserve the complete original audit bytes and classify a private subset.
 * Final publisher still independently rechecks latest revision/duplicates. */
export function selectP6PendingNativeLaterReview(a,index,selector,trust){
 const selected=selectP6CommittedNativeSourceQuery(index,selector,trust);
 inspectP6DayEpochExistingShardSemanticsNoGo(index);
 const s=a?.privateSourceScope,b=a?.privateAuditBytes;
 if(a?.status!=="ACTUAL_COMMITTED_SOURCE_CANDIDATES_AWAIT_INDEPENDENT_PRE_REVIEW"||
    !sealed(a,"privateAuditBytes")||!sealed(a,"privateSourceScope")||!sealed(a,"privateSourceRegistrySha256")||
    !Buffer.isBuffer(b)||b.length<100||b.length>6000000||hash(b)!==a.candidateAuditSha256||
    a.privateSourceRegistrySha256!==selected.entry.fileSha256||
    a.runDayIndex!==selector.runDayIndex||s?.runDayIndex!==selector.runDayIndex||
    s.queryDigestSha256!==selector.queryDigestSha256||s.manifestSha256!==trust.manifestSha256||
    s.rightsReviewSha256!==trust.rightsSha256||s.reviewedReleaseSha256!==trust.releaseSha256||
    !["T-6h","T-90m"].includes(a.horizon)||s.horizon!==a.horizon||
    a.providerCalls!==0||a.databaseWrites!==0||a.signedPrePacketsIssued!==0||a.phase6PaidGo!==false)
  fail("PENDING_REVIEW_UNVERIFIED_OR_WRONG_HORIZON");
 const audit=JSON.parse(b.toString("utf8")),clock=index.redactedSummary.observedDbClockUtc;
 if(!iso(clock)||!iso(a.actualDbClockUtc)||audit.actualDbClockUtc!==a.actualDbClockUtc||
    Date.parse(clock)<Date.parse(a.actualDbClockUtc)||Date.parse(clock)-Date.parse(a.actualDbClockUtc)>120000||
    digestP5ActualSourceCandidateAudit(audit)!==a.candidateAuditSha256||
    audit.sourceGithubRunId!==s.expectedSourceGithubRunId||audit.queryDigestSha256!==s.queryDigestSha256||
    !Array.isArray(audit.candidates)||audit.candidates.length>2500||
    audit.candidates.length!==a.observedMemberCount||audit.observedMemberCount!==a.observedMemberCount||
    audit.candidateCount!==a.candidateCount||audit.censoredCount!==a.censoredCount||
    audit.candidateCount+audit.censoredCount!==audit.candidates.length)
  fail("PENDING_REVIEW_AUDIT_OR_CLOCK_DRIFT");
 const used=new Map();
 for(const e of index.privateParsedIndex.entries.filter(x=>x.lane==="LATER_PRE")){
  const raw=index.getFrozen(e.filePath);
  if(!Buffer.isBuffer(raw)||hash(raw)!==e.fileSha256)fail("PENDING_REVIEW_FROZEN_REGISTRY_DRIFT");
  const registry=JSON.parse(raw.toString("utf8"));
  for(const f of registry.entries){
   const key=f.expectedFlightInstanceId+"|"+f.expectedHorizon;
   if(used.has(key)||!iso(f.expectedSelectedTNativeUtc))fail("PENDING_REVIEW_INVALID_FROZEN_NATIVE_T");
   used.set(key,f.expectedSelectedTNativeUtc);
  }
 }
 const now=Date.parse(clock),offset=a.horizon==="T-6h"?21600000:5400000;
 const pending=[],seen=new Set();
 let alreadyIndexed=0,changedNativeT=0,tooLate=0,notYetWithinShardWindow=0,eligible=0;
 for(const c of audit.candidates){
  if(c.status!=="ACTUAL_SOURCE_CANDIDATE_INDEPENDENT_REVIEW_REQUIRED")continue;
  eligible++;
  const key=c.flightInstanceId+"|"+c.horizon;
  if(!/^[a-zA-Z0-9_.:|-]{5,200}$/.test(c.flightInstanceId??"")||seen.has(key)||
     c.manifestSha256!==s.manifestSha256||c.queryDigestSha256!==s.queryDigestSha256||
     c.runDayIndex!==s.runDayIndex||c.slot!==s.slot||c.horizon!==s.horizon||c.sourceAirportIcao!==s.airportIcao||
     c.sourcePopulationQueryId!==audit.sourcePopulationQueryId||c.sourceResponseSha256!==audit.sourceResponseSha256||
     c.externalNativeTAndPhysicalIdentityReviewRequired!==true||c.contentsRightsCertifiedHere!==false||
     c.stage14PermitIssuedHere!==false||c.providerCalls!==0||c.databaseWrites!==0||
     !iso(c.selectedTNativeUtc)||!iso(c.ownCutoffUtc)||!iso(c.actualMemberAvailableUtc)||
     Date.parse(c.selectedTNativeUtc)-offset!==Date.parse(c.ownCutoffUtc)||
     Date.parse(c.actualMemberAvailableUtc)>Date.parse(a.actualDbClockUtc))
   fail("PENDING_REVIEW_INVALID_CANDIDATE");
  seen.add(key);
  if(used.has(key)){alreadyIndexed++;if(used.get(key)!==c.selectedTNativeUtc)changedNativeT++;continue;}
  const cutoff=Date.parse(c.ownCutoffUtc);
  if(cutoff<=now+900000){tooLate++;continue;}
  if(cutoff>now+10800000){notYetWithinShardWindow++;continue;}
  pending.push(Object.freeze({...c}));
 }
 if(eligible!==audit.candidateCount)fail("PENDING_REVIEW_ELIGIBLE_COUNT_DRIFT");
 pending.sort((x,y)=>Date.parse(x.ownCutoffUtc)-Date.parse(y.ownCutoffUtc)||
  (x.flightInstanceId<y.flightInstanceId?-1:x.flightInstanceId>y.flightInstanceId?1:0));
 const out={status:"NATIVE_LATER_PENDING_INDEPENDENT_REVIEW_ONLY",runDayIndex:a.runDayIndex,horizon:a.horizon,
  originalAuditSha256:a.candidateAuditSha256,indexSha256:selector.indexSha256,indexRevision:selector.indexRevision,
  observedDbClockUtc:clock,originalEligibleCount:eligible,alreadyIndexed,changedNativeT,tooLate,notYetWithinShardWindow,
  pendingCount:pending.length,providerCalls:0,databaseWrites:0,signedPrePacketsIssued:0,phase6PaidGo:false};
 Object.defineProperties(out,{privatePendingCandidates:{value:Object.freeze(pending),enumerable:false},
  privateOriginalAuditBytes:{value:Buffer.from(b),enumerable:false}});
 return Object.freeze(out);
}
/** Runtime authenticates the actual newest day and all retained registries.
 * No reliance on a guessed index, stale cached roster or log artifact. */
export async function readP6PendingNativeLaterReview({readerClient,trust,a,selector,policy}){
 if(!checkSelector(selector)||trust?.independentStudyTrustPinsApproved!==true||
    policy?.independentNativeCandidateReadOnlyApproved!==true||
    policy.existingPaidDispatchApproved!==false||policy.noProviderCredentialsInAudit!==true)
  fail("NO_EXPLICIT_NONPAID_PENDING_REVIEW_SCOPE");
 const review=await readP6StoredPrivateReviewOnce({client:readerClient,trust,
  scope:{privateStoredReviewReadOnlyApproved:true,existingPaidDispatchApproved:false},
  selector:{kind:"CURRENT_DAY",runDayIndex:selector.runDayIndex}});
 const current={...selector,indexRevision:review.pins.expectedIndexRevision,indexSha256:review.pins.expectedIndexSha256};
 if(current.indexRevision<selector.indexRevision||
    (current.indexRevision===selector.indexRevision&&current.indexSha256!==selector.indexSha256))
  fail("PENDING_REVIEW_REVISION_ROLLBACK");
 const index=await hydrateP6DayEpochFullRegistriesReadOnly({client:readerClient,pins:review.pins,wire:review.wire,
  publicKeyPem:review.publicKeyPem,scope:{privateDayRegistryReadOnlyApproved:true,existingPaidDispatchApproved:false,
  requireCurrentRevisionForPlanning:true}});
 return selectP6PendingNativeLaterReview(a,index,current,trust);
}
