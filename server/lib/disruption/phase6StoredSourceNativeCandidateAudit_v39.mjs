/** Post-COMMIT, nonpaid existing V0079 source audit from the actual
 * day-index and signed query bytes. Does NOT use the due dispatch route:
 * a source can be audited after its HTTP window, before each own PRE cutoff.
 * No application DB, new queue, provider or independent signer certifier.
 */
import {createHash,createPublicKey,sign} from "node:crypto";
import {readP6StoredPrivateReviewOnce} from "./phase6StoredPrivateReviewReadOnce_v39.mjs";
import {readP6PrivateSourcePostOnce} from "./phase6PrivateSourcePostReadOnce_v39.mjs";
import {hydrateP6DayEpochFullRegistriesReadOnly} from "./phase6DayEpochFullRegistryReadOnce_v39.mjs";
import {inspectP6DayEpochExistingShardSemanticsNoGo} from "./phase6DayEpochOriginalSemanticHandoff_v39.mjs";
import {verifyP5F8ExactSourcePartition} from "./phase5ScopedFidsSourceBridge_v39.ts";
import {auditP5RealSourceToNativeFlightCandidatesReadonly}
 from "../../../scripts/v39_phase5_actual_source_native_flight_candidate_readonly_owner_v39.ts";
import {digestP5ActualSourceCandidateAudit} from "./phase5ActualSourceNativeFlightCandidateAudit_v39.ts";
import {buildP5UnsignedNativePreReviewDossier,digestP5UnsignedNativePreDossier} from "./phase5SourceBoundUnsignedPreDossier_v39.ts";
import {completeP5NativeLaterPrePacketForIndependentSigning,completeP5NativeT24PrePacketForIndependentSigning} from "./phase5IndependentLaterPrePacketCompletion_v39.ts";
import {proposeP5ReviewedLaterPacketsAsUnsignedDayShard} from "./phase5ReviewedLaterPacketToUnsignedDayRegistryProposal_v39.ts";
import {digestP5LaterShardPrivatePacketFileManifest,signedP5ExternalLaterReviewBytes,verifyP5ExternalEd25519ReviewOfLaterShard} from "./phase5ExternalEd25519LaterShardReviewerVerify_v39.ts";
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
  expectedServiceWindowStartUtc:a.serviceWindowStartUtc,expectedServiceWindowEndUtc:a.serviceWindowEndUtc,
  ...(iso(a.scheduledRequestUtc)?{plannedRequestUtc:a.scheduledRequestUtc}:{})});
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
  sourceTimingDiagnostics:audit.sourceTimingDiagnostics,
  actualDbClockUtc:audit.actualDbClockUtc,providerCalls:0,databaseWrites:0,signedPrePacketsIssued:0,phase6PaidGo:false};
 Object.defineProperties(out,{privateAuditBytes:{value:Buffer.from(JSON.stringify(audit)),enumerable:false},
  privateSourceScope:{value:Object.freeze({...auditedScope,expectedSourceGithubRunId:audit.sourceGithubRunId}),enumerable:false},
  privateSourceRegistrySha256:{value:selected.entry.fileSha256,enumerable:false},
  privateSourceRegistryPath:{value:selected.entry.filePath,enumerable:false},
  privateSourceRegistryBytes:{value:Buffer.from(index.getFrozen(selected.entry.filePath)),enumerable:false}});
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


/** In-process SOURCE -> existing unsigned PRE review handoff.
 * Keep the whole authenticated audit/dossier intact. For later horizons,
 * give the reviewer only the chosen pending entries; never rewrite the
 * original audit or pretend its digest is independent reviewer authority.
 * All flight-bearing objects are nonenumerable and never CLI output.
 */
export function buildP6PostcommitUnsignedPreReview(a,trust,pending=null){
 const s=a?.privateSourceScope,b=a?.privateAuditBytes;
 if(trust?.independentStudyTrustPinsApproved!==true||
    a?.status!=="ACTUAL_COMMITTED_SOURCE_CANDIDATES_AWAIT_INDEPENDENT_PRE_REVIEW"||
    !sealed(a,"privateAuditBytes")||!sealed(a,"privateSourceScope")||!sealed(a,"privateSourceRegistrySha256")||
    !Buffer.isBuffer(b)||b.length<100||b.length>6000000||hash(b)!==a.candidateAuditSha256||
    !SHA.test(a.privateSourceRegistrySha256??"")||s?.manifestSha256!==trust.manifestSha256||
    s.rightsReviewSha256!==trust.rightsSha256||s.reviewedReleaseSha256!==trust.releaseSha256||
    s.runDayIndex!==a.runDayIndex||s.horizon!==a.horizon||
    a.providerCalls!==0||a.databaseWrites!==0||a.signedPrePacketsIssued!==0||a.phase6PaidGo!==false)
  fail("UNSIGNED_REVIEW_UNAUTHENTICATED_SOURCE");
 const audit=JSON.parse(b.toString("utf8"));
 if(audit.actualDbClockUtc!==a.actualDbClockUtc||audit.sourceGithubRunId!==s.expectedSourceGithubRunId||
    audit.observedMemberCount!==a.observedMemberCount||audit.candidateCount!==a.candidateCount||
    audit.censoredCount!==a.censoredCount||digestP5ActualSourceCandidateAudit(audit)!==a.candidateAuditSha256)
  fail("UNSIGNED_REVIEW_AUDIT_DRIFT");
 const dossier=buildP5UnsignedNativePreReviewDossier(audit,{
  expectedActualCandidateAuditSha256:a.candidateAuditSha256,expectedManifestSha256:s.manifestSha256,
  expectedQueryDigestSha256:s.queryDigestSha256,expectedSourceResponseSha256:audit.sourceResponseSha256,
  expectedSourcePopulationQueryId:audit.sourcePopulationQueryId,expectedSourceGithubRunId:s.expectedSourceGithubRunId,
  expectedReviewedReleaseSha256:s.reviewedReleaseSha256,expectedReviewedSourceRightsSha256:s.rightsReviewSha256,
  expectedEarlyDrawSha256:s.earlyDrawSha256,expectedProviderContractSha256:s.providerContractSha256,
  expectedSourceDayRegistrySha256:a.privateSourceRegistrySha256,expectedReviewedMainCodeSha:trust.reviewedCodeSha,
  expectedRunDayIndex:s.runDayIndex,expectedSlot:s.slot,expectedHorizon:s.horizon,expectedAirportIcao:s.airportIcao});
 let entries=dossier.entries;
 if(s.horizon==="T-24h"){
  if(pending!==null)fail("UNSIGNED_REVIEW_T24_LATER_SCOPE");
 }else{
  if(!["T-6h","T-90m"].includes(s.horizon)||
     pending?.status!=="NATIVE_LATER_PENDING_INDEPENDENT_REVIEW_ONLY"||
     pending.originalAuditSha256!==a.candidateAuditSha256||pending.runDayIndex!==a.runDayIndex||
     pending.horizon!==a.horizon||pending.originalEligibleCount!==dossier.candidateCount||
     pending.providerCalls!==0||pending.databaseWrites!==0||pending.signedPrePacketsIssued!==0||
     pending.phase6PaidGo!==false||!sealed(pending,"privatePendingCandidates")||
     !sealed(pending,"privateOriginalAuditBytes")||!Buffer.isBuffer(pending.privateOriginalAuditBytes)||
     !pending.privateOriginalAuditBytes.equals(b)||!Array.isArray(pending.privatePendingCandidates)||
     pending.privatePendingCandidates.length!==pending.pendingCount)
   fail("UNSIGNED_REVIEW_PENDING_SCOPE");
  const ids=new Set(),original=new Map(audit.candidates.filter(c=>c.status==="ACTUAL_SOURCE_CANDIDATE_INDEPENDENT_REVIEW_REQUIRED")
   .map(c=>[c.flightInstanceId,c]));
  for(const c of pending.privatePendingCandidates){
   if(ids.has(c.flightInstanceId)||!original.has(c.flightInstanceId)||
      JSON.stringify(original.get(c.flightInstanceId))!==JSON.stringify(c))
    fail("UNSIGNED_REVIEW_PENDING_CANDIDATE_DRIFT");
   ids.add(c.flightInstanceId);
  }
  entries=dossier.entries.filter(e=>ids.has(e.source.flightInstanceId));
  if(entries.length!==pending.pendingCount)fail("UNSIGNED_REVIEW_PENDING_COUNT_DRIFT");
 }
 const out={status:"UNSIGNED_PRE_REVIEW_HANDOFF_NOT_AUTHORIZED",runDayIndex:a.runDayIndex,horizon:a.horizon,
  originalCandidateCount:dossier.candidateCount,reviewEntryCount:entries.length,
  independentReviewStillRequired:true,signedPrePacketsIssued:0,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
 Object.defineProperties(out,{
  privateOriginalDossier:{value:dossier,enumerable:false},
  privateOriginalDossierSha256:{value:digestP5UnsignedNativePreDossier(dossier),enumerable:false},
  privateReviewEntries:{value:Object.freeze(entries.slice()),enumerable:false},
  privateMaximumSourceAgeSeconds:{value:s.maxPopulationStalenessSeconds,enumerable:false},
  privateSourceRegistryPath:{value:a.privateSourceRegistryPath,enumerable:false},
  privateSourceRegistryBytes:{value:Buffer.isBuffer(a.privateSourceRegistryBytes)?Buffer.from(a.privateSourceRegistryBytes):null,enumerable:false}});
 return Object.freeze(out);
}


/** Consume independently supplied, pinned review bytes for at most one
 * existing 96-entry shard. Missing reviews are ordinary missingness;
 * an invalid supplied review is not silently approved. Reuse the original
 * T24/later packet completion and later registry proposal. This is not a
 * reviewer, signature, producer-data write or paid admission. The caller
 * must provide the fresh observed DB clock; actual publisher rechecks it.
 */
export function completeP6PostcommitReviewedPreBatch(handoff,scope,reviews){
 const d=handoff?.privateOriginalDossier, entries=handoff?.privateReviewEntries,
  raw=handoff?.privateSourceRegistryBytes,path=handoff?.privateSourceRegistryPath;
 if(handoff?.status!=="UNSIGNED_PRE_REVIEW_HANDOFF_NOT_AUTHORIZED"||
    handoff.independentReviewStillRequired!==true||handoff.signedPrePacketsIssued!==0||
    handoff.providerCalls!==0||handoff.databaseWrites!==0||handoff.phase6PaidGo!==false||
    !sealed(handoff,"privateOriginalDossier")||!sealed(handoff,"privateOriginalDossierSha256")||
    !sealed(handoff,"privateReviewEntries")||!sealed(handoff,"privateMaximumSourceAgeSeconds")||
    !sealed(handoff,"privateSourceRegistryBytes")||!sealed(handoff,"privateSourceRegistryPath")||
    !Array.isArray(entries)||entries.length!==handoff.reviewEntryCount||
    !scope||scope.expectedDossierSha256!==handoff.privateOriginalDossierSha256||
    digestP5UnsignedNativePreDossier(d)!==scope.expectedDossierSha256||
    !iso(scope.observedDbClockUtc)||Date.parse(scope.observedDbClockUtc)<Date.parse(d.sourceObservedDbClockUtc)||
    handoff.horizon!==d.horizon||handoff.runDayIndex!==d.runDayIndex||
    !Number.isSafeInteger(handoff.privateMaximumSourceAgeSeconds)||handoff.privateMaximumSourceAgeSeconds<1||
    handoff.privateMaximumSourceAgeSeconds>86400||
    !Buffer.isBuffer(raw)||hash(raw)!==d.sourceDayRegistrySha256||!REG.test(path??"")||
    !Array.isArray(reviews)||reviews.length>96)
  fail("REVIEW_BATCH_SCOPE_OR_SOURCE_DRIFT");
 const byId=new Map();
 for(const e of entries){
  const id=e.source.flightInstanceId;
  if(byId.has(id)||!d.entries.some(x=>JSON.stringify(x)===JSON.stringify(e)))
   fail("REVIEW_BATCH_PENDING_ENTRY_DRIFT");
  byId.set(id,e);
 }
 const completed=[],seen=new Set();
 let late=0;
 for(const item of reviews){
  if(!Buffer.isBuffer(item?.reviewBytes)||item.reviewBytes.length<100||item.reviewBytes.length>200000||
     !item.pins||hash(item.reviewBytes)!==item.pins.expectedReviewArtifactSha256||
     item.pins.expectedDossierSha256!==scope.expectedDossierSha256)
   fail("REVIEW_BATCH_UNPINNED_ARTIFACT");
  const v=JSON.parse(item.reviewBytes.toString("utf8")),id=v.reviewedFlightInstanceId,e=byId.get(id);
  if(!e||seen.has(id)||v.maxPopulationStalenessSeconds!==handoff.privateMaximumSourceAgeSeconds||
     !iso(v.reviewedAtUtc)||Date.parse(v.reviewedAtUtc)>Date.parse(scope.observedDbClockUtc))
   fail("REVIEW_BATCH_UNSELECTED_DUPLICATE_OR_POLICY_DRIFT");
  seen.add(id);
  const packet=d.horizon==="T-24h"?
   completeP5NativeT24PrePacketForIndependentSigning(d,e,item.reviewBytes,v,item.pins):
   completeP5NativeLaterPrePacketForIndependentSigning(d,e,item.reviewBytes,v,item.pins);
  if(Date.parse(e.source.ownPreCutoffUtc)<=Date.parse(scope.observedDbClockUtc)+900000){late++;continue;}
  completed.push({proposedFilePath:item.proposedFilePath,
   expectedExternallyPinnedReviewArtifactSha256:item.pins.expectedReviewArtifactSha256,completed:packet});
 }
 let plan=null;
 if(d.horizon!=="T-24h"&&completed.length){
  plan=proposeP5ReviewedLaterPacketsAsUnsignedDayShard(raw,JSON.parse(raw.toString("utf8")),{
   expectedExternallyApprovedSourceRegistrySha256:d.sourceDayRegistrySha256,sourceRegistryFilePath:path,
   proposedLaterRegistryFilePath:scope.proposedLaterRegistryFilePath,reviewedMainCodeSha:d.reviewedMainCodeSha,
   expectedManifestSha256:d.manifestSha256,expectedReviewedReleaseSha256:scope.expectedReviewedReleaseSha256,
   expectedReviewedSourceRightsSha256:scope.expectedReviewedSourceRightsSha256,
   runDayIndex:d.runDayIndex,shardIndex:scope.shardIndex},completed);
 }
 const out={status:"REVIEWED_PRE_BATCH_BYTES_AWAIT_EXISTING_PUBLICATION_APPROVAL",
  runDayIndex:d.runDayIndex,horizon:d.horizon,selectedCount:entries.length,
  suppliedReviewCount:reviews.length,unreviewedCount:entries.length-seen.size,
  lateReviewedCount:late,completedPacketCount:completed.length,laterRegistryProposed:plan!==null,
  independentlySignedRegistry:false,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
 Object.defineProperties(out,{privateCompletedPackets:{value:completed,enumerable:false},
  privateLaterRegistryPlan:{value:plan,enumerable:false}});
 return Object.freeze(out);
}


/** One mechanically reviewed native later-PRE page under an ALREADY
 * independently approved protected study policy and distinct reviewer key.
 * Reuse the existing exact packet and Ed25519 shard formats. This is not a
 * human review, a legal/source-rights decision, an observed gate-out, a
 * private DB writer or permission to run paid collection. Runtime must
 * supply actual authenticated SOURCE/feature/custody/PRE readback objects
 * and fresh PG clock, not manufacture evidence or a delegated policy.
 */
export function signP6DelegatedNativeLaterReviewPage({handoff,featureReview,evidence,authority,scope}){
 const t=authority?.trust,d=handoff?.privateOriginalDossier,sha=authority?.expectedPolicySha256;
 if(t?.independentStudyTrustPinsApproved!==true||authority?.independentDelegatedNativeReviewApproved!==true||
    authority.noProviderCredentialsInReviewer!==true||!Buffer.isBuffer(authority.policyBytes)||
    authority.policyBytes.length<100||authority.policyBytes.length>35000||!SHA.test(sha??"")||hash(authority.policyBytes)!==sha||
    !sealed(handoff,"privateOriginalDossier")||!sealed(handoff,"privateOriginalDossierSha256")||!sealed(handoff,"privateReviewEntries")||
    !Array.isArray(handoff.privateReviewEntries)||handoff.privateReviewEntries.length!==handoff.reviewEntryCount||
    !d||!["T-6h","T-90m"].includes(d.horizon)||d.manifestSha256!==t.manifestSha256||d.reviewedMainCodeSha!==t.reviewedCodeSha||
    scope?.expectedDossierSha256!==handoff.privateOriginalDossierSha256||digestP5UnsignedNativePreDossier(d)!==scope.expectedDossierSha256||
    !iso(scope.observedDbClockUtc)||!iso(scope.reviewValidUntilUtc)||!iso(scope.retentionNotAfterUtc))
  fail("DELEGATED_NATIVE_REVIEW_NO_EXACT_POLICY_OR_DOSSIER");
 let p;
 try{p=JSON.parse(authority.policyBytes.toString("utf8"));}catch{fail("DELEGATED_NATIVE_REVIEW_INVALID_POLICY");}
 const v=p.nativeLaterReview,f=p.nativePreFeatureReview,cfg=v?.selectedTConfig;
 if(p.schema!=="v39.phase6.delegated-daily-source-review-policy.v1"||p.delegatedDailyPacketProductionApproved!==true||
    p.approvedCodeSha!==t.reviewedCodeSha||!["manifestSha256","calendarSha256","rightsSha256","releaseSha256"].every(k=>p[k]===t[k])||
    v?.approved!==true||f?.approved!==true||f.rightsSha256!==t.rightsSha256||
    ![f.externalContentUseReviewSha256,v.laterReviewerFingerprintSha256,v.frameSha256,v.configSha256,v.builderSha256,
      v.runAndRetentionEvidenceSha256,cfg?.artifactHash,cfg?.semanticsEvidenceSha256,p.providerContractSha256].every(x=>SHA.test(x??""))||
    !cfg||cfg.verifiedProviderNativeSchedule!==true||cfg.milestone!=="departure.scheduledTime.utc"||
    typeof cfg.version!=="string"||!cfg.version.trim()||cfg.version.length>150||
    [t.dayReviewerFingerprintSha256,t.queryReviewerFingerprintSha256].includes(v.laterReviewerFingerprintSha256)||
    (v.standaloneNoT24ProtocolSha256!==null&&!SHA.test(v.standaloneNoT24ProtocolSha256??""))||
    !iso(v.builderFrozenAtUtc)||!iso(v.validFromUtc)||!iso(v.validUntilUtc)||
    Date.parse(v.validFromUtc)>=Date.parse(v.validUntilUtc)||
    scope.expectedReviewedReleaseSha256!==t.releaseSha256||scope.expectedReviewedSourceRightsSha256!==t.rightsSha256)
  fail("DELEGATED_NATIVE_REVIEW_PROTECTED_POLICY_DRIFT");
 let pub,fp;
 try{
  if(authority.laterReviewerKey?.type!=="private"||authority.laterReviewerKey.asymmetricKeyType!=="ed25519")fail("DELEGATED_NATIVE_REVIEW_WRONG_KEY");
  pub=createPublicKey(authority.laterReviewerKey);fp=hash(pub.export({format:"der",type:"spki"}));
 }catch{fail("DELEGATED_NATIVE_REVIEW_WRONG_KEY");}
 if(fp!==v.laterReviewerFingerprintSha256)fail("DELEGATED_NATIVE_REVIEW_WRONG_KEY");
 const now=Date.parse(scope.observedDbClockUtc),valid=Date.parse(scope.reviewValidUntilUtc),retention=Date.parse(scope.retentionNotAfterUtc);
 if(now<Date.parse(v.validFromUtc)||now>=Date.parse(v.validUntilUtc)||Date.parse(v.builderFrozenAtUtc)>now||
    valid<=now||valid>retention||retention>Date.parse(v.validUntilUtc)||valid-now>31*86400000||
    featureReview?.status!=="EXACT_BOUND_ORIGINAL_NATIVE_FEATURE_BATCH_NOT_SIGNED"||featureReview.runDayIndex!==d.runDayIndex||
    featureReview.horizon!==d.horizon||featureReview.providerCalls!==0||featureReview.dbWrites!==0||
    featureReview.phase6PaidGo!==false||!sealed(featureReview,"privateDecisions")||!Array.isArray(featureReview.privateDecisions)||
    evidence?.status!=="ACTUAL_T24_EVIDENCE_PAGE_FOR_SEPARATE_LATER_REVIEW_NO_GO"||
    evidence.expectedDossierSha256!==scope.expectedDossierSha256||evidence.runDayIndex!==d.runDayIndex||
    evidence.reviewedPacketsIssued!==0||evidence.providerCalls!==0||evidence.databaseWrites!==0||evidence.phase6PaidGo!==false||
    !sealed(evidence,"privateDecisions")||!Array.isArray(evidence.privateDecisions)||evidence.privateDecisions.length<1||
    evidence.privateDecisions.length>96||evidence.privateDecisions.length!==evidence.candidateCount||
    !iso(featureReview.observedDbClockUtc)||!iso(evidence.observedDbClockUtc)||
    Date.parse(featureReview.observedDbClockUtc)<Date.parse(d.sourceObservedDbClockUtc)||
    Date.parse(evidence.observedDbClockUtc)<Date.parse(d.sourceObservedDbClockUtc)||
    now<Math.max(Date.parse(featureReview.observedDbClockUtc),Date.parse(evidence.observedDbClockUtc)))
  fail("DELEGATED_NATIVE_REVIEW_ACTUAL_EVIDENCE_OR_CLOCK_DRIFT");
 const selected=new Map(handoff.privateReviewEntries.map(e=>[e.source.flightInstanceId,e]));
 if(selected.size!==handoff.privateReviewEntries.length)fail("DELEGATED_NATIVE_REVIEW_DUPLICATE_SELECTION");
 const features=new Map();
 for(const row of featureReview.privateDecisions){
  if(!selected.has(row.flightInstanceId)||features.has(row.flightInstanceId))fail("DELEGATED_NATIVE_REVIEW_CROSS_FEATURE_SCOPE");
  features.set(row.flightInstanceId,row);
 }
 if([...features.values()].filter(x=>x.status==="MATCHED_NATIVE_ORIGINAL").length!==featureReview.matchedCount)
  fail("DELEGATED_NATIVE_REVIEW_FEATURE_COUNT_DRIFT");
 const receipts=new Map();
 if(evidence.privateCustodyReceipts!==undefined){
  if(!sealed(evidence,"privateCustodyReceipts")||!Array.isArray(evidence.privateCustodyReceipts))
   fail("DELEGATED_NATIVE_REVIEW_CUSTODY_SCOPE");
  for(const row of evidence.privateCustodyReceipts){
   const id=row.receipt?.flightInstanceId;
   if(!selected.has(id)||receipts.has(id)||row.expectedReceiptSha256!==row.receipt?.receiptSha256)
    fail("DELEGATED_NATIVE_REVIEW_CUSTODY_SCOPE");
   receipts.set(id,row);
  }
 }
 const reviews=[],seen=new Set(),counts={missingNativeOriginal:0,unresolvedT24:0,lateOrRetention:0};
 for(const decision of evidence.privateDecisions){
  const id=decision.flightInstanceId,e=selected.get(id),s=e?.source;
  if(!s||seen.has(id)||decision.horizon!==d.horizon||s.expectedReviewedReleaseSha256!==t.releaseSha256||
     s.expectedReviewedSourceRightsSha256!==t.rightsSha256||s.expectedProviderContractSha256!==p.providerContractSha256)
   fail("DELEGATED_NATIVE_REVIEW_CROSS_EVIDENCE_SCOPE");
  seen.add(id);
  const cutoff=Date.parse(s.ownPreCutoffUtc);
  if(cutoff<=now+900000||cutoff>=retention||cutoff>valid){counts.lateOrRetention++;continue;}
  const feature=features.get(id)?.compiled,b=feature?.bundle;
  if(features.get(id)?.status!=="MATCHED_NATIVE_ORIGINAL"||feature?.sourceBodyAndCanonicalEnvelopeIntegrityVerified!==true||
     feature.sameOriginalNativeOperatingLegBoundOnly!==true||feature.physicalGateOutCertified!==false||
     feature.sourceRightsIndependentlyCertifiedByThisFunction!==false||feature.providerCalls!==0||feature.databaseWrites!==0||
     b?.flightInstanceId!==id||b.populationQueryId!==s.expectedSourcePopulationQueryId||
     b.originalResponseSha256!==s.expectedSourceResponseSha256||b.externalSourceAndContentsReviewReceiptSha256!==f.externalContentUseReviewSha256){
   counts.missingNativeOriginal++;continue;
  }
  let tier,pinsExtra;
  if(decision.status==="T24_PERSISTED_AND_SEPARATE_RECEIPT_MATCH_REVIEW_REQUIRED"){
   const witness=receipts.get(id);
   if(!witness||decision.receiptSha256!==witness.expectedReceiptSha256){counts.unresolvedT24++;continue;}
   tier={reviewedT24WitnessReceipt:witness.receipt};pinsExtra={expectedT24ReceiptSha256:witness.expectedReceiptSha256};
  }else if(decision.status==="T24_ABSENT_AFTER_CUTOFF_SEPARATE_MISSINGNESS_REVIEW_REQUIRED"&&
     SHA.test(v.standaloneNoT24ProtocolSha256??"")&&now>=Date.parse(s.selectedTNativeUtc)-86400000){
   tier={reviewedStandaloneLaterNoT24:{schema:"v39.phase5.standalone-later-asof-no-t24.v1",
    reviewedProtocolSha256:v.standaloneNoT24ProtocolSha256,reviewedOriginalResponseSha256:s.expectedSourceResponseSha256,
    reviewedNativeTSemanticsSha256:cfg.semanticsEvidenceSha256,missingT24Class:"HONEST_T24_UNOBSERVED_NOT_BACKFILLED",
    independentLaterAsOfAndMissingnessReviewAttested:true}};
   pinsExtra={separatelyApprovedNoT24ProtocolSha256:v.standaloneNoT24ProtocolSha256};
  }else{counts.unresolvedT24++;continue;}
  const featureSha=hash(Buffer.from(JSON.stringify(b)));
  const operatingEvidence=hash(Buffer.from(JSON.stringify({schema:"v39.phase6.delegated-native-original-review-evidence.v1",
   policySha256:sha,originalAuditSha256:d.sourceAuditSha256,sourceRegistrySha256:d.sourceDayRegistrySha256,
   selectedFlightSource:s,verifiedOriginalFeatureBundleSha256:featureSha,observedDbClockUtc:featureReview.observedDbClockUtc})));
  const artifact={schema:"v39.phase5.external-native-later-pre-packet-review.v1",reviewedCodeSha:t.reviewedCodeSha,
   reviewedSourceDossierSha256:scope.expectedDossierSha256,reviewedSourceAuditSha256:d.sourceAuditSha256,
   reviewedSourceDayRegistrySha256:d.sourceDayRegistrySha256,reviewedFlightInstanceId:id,reviewedQueryDigestSha256:s.queryDigestSha256,
   reviewedSourcePopulationQueryId:s.expectedSourcePopulationQueryId,reviewedSourceOriginalResponseSha256:s.expectedSourceResponseSha256,
   reviewedSourceGithubRunId:s.expectedGithubSourceRunId,reviewedRunDayIndex:s.runDayIndex,reviewedHorizon:s.horizon,
   reviewedNativeScheduledTUtc:s.selectedTNativeUtc,reviewedOwnCutoffUtc:s.ownPreCutoffUtc,reviewedAtUtc:scope.observedDbClockUtc,
   independentlyReviewedOperatingLegEvidenceSha256:operatingEvidence,independentlyReviewedNativeTEvidenceSha256:cfg.semanticsEvidenceSha256,
   independentlyReviewedRunAndRetentionEvidenceSha256:v.runAndRetentionEvidenceSha256,reviewedFrameSha256:v.frameSha256,
   reviewedConfigSha256:v.configSha256,frozenBuilderSha256:v.builderSha256,builderFrozenAtUtc:v.builderFrozenAtUtc,
   selectedTConfig:cfg,maxPopulationStalenessSeconds:handoff.privateMaximumSourceAgeSeconds,
   reviewedSupplementalFeatureBundle:b,externalNativeTPhysicalLegAndSourceUseReviewed:true,...tier};
  const reviewBytes=Buffer.from(JSON.stringify(artifact)),reviewHash=hash(reviewBytes);
  reviews.push({reviewBytes,proposedFilePath:"data-collection/phase5/frozen/pre_"+reviewHash+".json",
   pins:{expectedDossierSha256:scope.expectedDossierSha256,expectedReviewArtifactSha256:reviewHash,expectedApprovedMainCodeSha:t.reviewedCodeSha,
    expectedReviewedReleaseSha256:t.releaseSha256,expectedReviewedSourceRightsSha256:t.rightsSha256,
    expectedSourceDayRegistrySha256:d.sourceDayRegistrySha256,expectedReviewedSupplementalFeatureBundleSha256:featureSha,
    expectedExternalSupplementalContentUseReviewSha256:f.externalContentUseReviewSha256,...pinsExtra}});
 }
 const result={status:"DELEGATED_NATIVE_LATER_REVIEW_NO_PUBLISH",runDayIndex:d.runDayIndex,horizon:d.horizon,
  pageCandidateCount:evidence.candidateCount,reviewedCount:reviews.length,...counts,delegatedPolicySha256:sha,
  signatureIssued:false,humanReviewPerformed:false,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
 if(!reviews.length)return Object.freeze(result);
 const completed=completeP6PostcommitReviewedPreBatch(handoff,scope,reviews),plan=completed.privateLaterRegistryPlan;
 if(!plan||completed.completedPacketCount!==reviews.length||completed.privateCompletedPackets.some(x=>
  !x.completed.packet.prePermit.reviewedSupplementalFeatureBundle))
  fail("DELEGATED_NATIVE_REVIEW_ORIGINAL_PACKET_COMPLETION_DRIFT");
 const evidenceDigest=hash(Buffer.from(JSON.stringify({schema:"v39.phase6.delegated-later-shard-review-evidence.v1",
  policySha256:sha,dossierSha256:scope.expectedDossierSha256,registrySha256:plan.proposedRegistrySha256,
  reviewedArtifactSha256s:reviews.map(x=>x.pins.expectedReviewArtifactSha256),observedDbClockUtc:scope.observedDbClockUtc})));
 const review={schema:"v39.phase5.external-ed25519-later-shard-review.v1",audience:"HKcode22/ReplitTranvr:PHASE6_LATER_PRE_REVIEW_ONLY",
  reviewerPublicKeyFingerprintSha256:fp,reviewedMainCodeSha:t.reviewedCodeSha,reviewedManifestSha256:t.manifestSha256,
  reviewedReleaseSha256:t.releaseSha256,reviewedRightsSha256:t.rightsSha256,sourceDayRegistrySha256:plan.sourceRegistrySha256,
  sourceDayRegistryFilePath:plan.registryProposal.sourceDayRegistryFilePath,proposedRegistrySha256:plan.proposedRegistrySha256,
  proposedRegistryFilePath:plan.proposedRegistryFilePath,packetFileManifestSha256:digestP5LaterShardPrivatePacketFileManifest(plan),
  runDayIndex:d.runDayIndex,shardIndex:plan.registryProposal.shardIndex,reviewedAtUtc:scope.observedDbClockUtc,
  validUntilUtc:scope.reviewValidUntilUtc,independentReviewerEvidenceDigestSha256:evidenceDigest};
 const wire={schema:"v39.phase5.external-ed25519-later-shard-envelope.v1",review,
  signatureBase64:sign(null,signedP5ExternalLaterReviewBytes(review),authority.laterReviewerKey).toString("base64")};
 const reviewerPins={expectedReviewerPublicKeyFingerprintSha256:fp,expectedApprovedMainCodeSha:t.reviewedCodeSha,
  expectedReviewedReleaseSha256:t.releaseSha256,expectedReviewedRightsSha256:t.rightsSha256,expectedIndependentReviewerEvidenceDigestSha256:evidenceDigest};
 const reviewerPublicKeyPem=pub.export({format:"pem",type:"spki"}).toString();
 verifyP5ExternalEd25519ReviewOfLaterShard(plan,wire,reviewerPublicKeyPem,reviewerPins,scope.observedDbClockUtc);
 return Object.freeze(Object.defineProperties({...result,signatureIssued:true,reviewedRegistrySha256:plan.proposedRegistrySha256},
  {privatePlan:{value:plan,enumerable:false},privateWire:{value:wire,enumerable:false},
   privateReviewerPins:{value:reviewerPins,enumerable:false},privateReviewerPublicKeyPem:{value:reviewerPublicKeyPem,enumerable:false}}));
}
