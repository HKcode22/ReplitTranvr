/**
 * Private signed LATER_PRE day shard -> exact existing C+D roster.
 * READ ONLY. No independent reviewer signature is manufactured: the
 * compatibility roster digest is derived from the authenticated day-index
 * signature, registry SHA and packet-byte hashes. It is not a GO token.
 * The original publisher checked the external later-shard review; this
 * reader does NOT claim to reverify the original (not stored) review wire.
 */
import {createHash} from "node:crypto";
import {readP6StoredPrivateReviewOnce} from "./phase6StoredPrivateReviewReadOnce_v39.mjs";
import {hydrateP6DayEpochFullRegistriesReadOnly} from "./phase6DayEpochFullRegistryReadOnce_v39.mjs";
import {inspectP6DayEpochExistingShardSemanticsNoGo} from "./phase6DayEpochOriginalSemanticHandoff_v39.mjs";
import {hydrateP5PrivateLaterPreFromPg16ReadOnly} from "./phase5Phase6Pg16PrivateLaterPreHydrator_v39.ts";
import {verifyP5CdFrozenRoster} from "./phase5CdGithubBoundedPreTick_v39.ts";
import {preflightP5Stage14ReviewedPermitV39} from "./phase5V0079SingleBoundFlightPreWriter_v39.ts";
const SHA=/^[a-f0-9]{64}$/,CODE=/^[a-f0-9]{40}$/;
const hold=s=>{throw Error("HOLD_P6_PRIVATE_LATER_QUEUE_ROSTER_"+s);};
const hash=b=>createHash("sha256").update(b).digest("hex");
const utc=x=>{
 if(typeof x!=="string"||!Number.isFinite(Date.parse(x))||new Date(x).toISOString()!==x)hold("INVALID_CLOCK");
 return Date.parse(x);
};
function selectorCheck(s,trust,policy){
 if(policy?.independentLaterQueueTransportProjectionApproved!==true||
    policy.existingPaidDispatchApproved!==false||
    trust?.independentStudyTrustPinsApproved!==true||
    !CODE.test(trust.reviewedCodeSha??"")||
    ![trust.manifestSha256,trust.rightsSha256,trust.calendarSha256,trust.releaseSha256].every(x=>SHA.test(x??""))||
    (policy.independentlyApprovedStandaloneProtocolSha256!==undefined&&
     !SHA.test(policy.independentlyApprovedStandaloneProtocolSha256))||
    !Number.isSafeInteger(s?.runDayIndex)||s.runDayIndex<1||s.runDayIndex>31||
    !Number.isSafeInteger(s.indexRevision)||s.indexRevision<1||s.indexRevision>1024||
    !Number.isSafeInteger(s.shardIndex)||s.shardIndex<1||s.shardIndex>100000||
    !SHA.test(s.indexSha256??"")||!SHA.test(s.laterRegistrySha256??""))
  hold("NO_EXACT_INDEPENDENT_PROJECTION_SCOPE");
}
export function selectP6PrivateLaterQueueShard(index,selector,trust,policy){
 selectorCheck(selector,trust,policy);
 const sum=index?.redactedSummary,signed=index?.privateParsedIndex;
 if(sum?.status!=="SIGNED_DAY_EPOCH_FULL_REGISTRY_READONLY_NO_DISPATCH"||
    sum.indexSha256!==selector.indexSha256||sum.indexRevision!==selector.indexRevision||
    sum.runDayIndex!==selector.runDayIndex||sum.externalEd25519ReviewerVerified!==true||
    sum.restrictedPrivatePg16ReaderVerified!==true||sum.providerCalls!==0||
    sum.databaseWrites!==0||sum.phase6PaidGo!==false||
    !Buffer.isBuffer(index.privateCurrentIndexBytes)||hash(index.privateCurrentIndexBytes)!==selector.indexSha256||
    signed?.reviewedCodeSha!==trust.reviewedCodeSha||signed.manifestSha256!==trust.manifestSha256||
    signed.calendarSha256!==trust.calendarSha256||signed.reviewedReleaseSha256!==trust.releaseSha256||
    signed.reviewedRightsSha256!==trust.rightsSha256)
  hold("WRONG_AUTHENTICATED_DAY_STUDY");
 // Existing semantic validator checks duplicates across the entire signed day,
 // not merely the selected shard. It also validates the exact prior revision.
 inspectP6DayEpochExistingShardSemanticsNoGo(index);
 const hits=signed.entries.filter(e=>e.lane==="LATER_PRE"&&e.shardIndex===selector.shardIndex);
 if(hits.length!==1||hits[0].fileSha256!==selector.laterRegistrySha256)
  hold("EXACT_LATER_SHARD_NOT_FOUND");
 const later=hits[0],sources=signed.entries.filter(e=>e.lane==="SOURCE"&&
  e.filePath===later.sourceRegistryFilePath&&e.fileSha256===later.sourceRegistrySha256);
 if(sources.length!==1||utc(sum.observedDbClockUtc)>=utc(later.hardLatestUtc))
  hold("SOURCE_LINK_OR_SHARD_WINDOW_EXPIRED");
 return {later,source:sources[0]};
}
export function projectP6VerifiedLaterQueueRoster({index,hydrated,selector,trust,policy}){
 const {later,source}=selectP6PrivateLaterQueueShard(index,selector,trust,policy);
 const v=hydrated?.verified,z=hydrated?.redactedSummary;
 if(hydrated?.schema!=="v39.phase5.phase6-pg16-private-later-hydration.v1"||
    z?.privateReaderRoleVerified!==true||z.providerCalls!==0||z.databaseWrites!==0||
    z.githubDispatches!==0||z.phase6PaidGoGranted!==false||
    v?.registryFilePath!==later.filePath||v.registrySha256!==later.fileSha256||
    v.sourceDayRegistrySha256!==source.fileSha256||v.runDayIndex!==selector.runDayIndex||
    v.shardIndex!==selector.shardIndex||v.manifestSha256!==trust.manifestSha256||
    v.approvedCodeSha!==trust.reviewedCodeSha||!Array.isArray(v.entries)||
    v.entries.length<1||v.entries.length>96)
  hold("WRONG_VERIFIED_PRIVATE_LATER_REGISTRY");
 const now=utc(hydrated.observedDbClockUtc),before=utc(index.redactedSummary.observedDbClockUtc);
 if(now<before||now-before>120000||now>=utc(later.hardLatestUtc))
  hold("SHARD_CLOCK_EXPIRED_OR_DRIFTED");
 // Rebind the exact hydrated packet bytes to the registry authenticated by
 // the upstream day signature; do not trust a caller-supplied queue roster.
 const registryBytes=index.getFrozen(later.filePath);
 const registry=JSON.parse(registryBytes.toString("utf8"));
 if(hash(registryBytes)!==later.fileSha256||registry.entries.length!==v.entries.length)
  hold("REGISTRY_BYTES_DRIFT");
 const entries=v.entries.map((x,i)=>{
  const e=registry.entries[i];
  if(!e||e.filePath!==x.filePath||e.expectedPacketSha256!==x.packetSha256||
     !Buffer.isBuffer(x.bytes)||hash(x.bytes)!==e.expectedPacketSha256)
   hold("PACKET_BYTES_OUTSIDE_SIGNED_REGISTRY");
  return {filePath:x.filePath,packetSha256:x.packetSha256,bytes:Buffer.from(x.bytes)};
 });
 const roster={schema:"v39.phase5.cd-existing-signed-pre-packet-roster.v1",
  reviewedCodeSha:trust.reviewedCodeSha,manifestSha256:trust.manifestSha256,
  rightsSha256:trust.rightsSha256,entries:entries.map(({filePath,packetSha256})=>({filePath,packetSha256}))};
 const rosterBytes=Buffer.from(JSON.stringify(roster)),rosterSha256=hash(rosterBytes);
 // Compatibility-only projection. This is not an independently signed
 // roster digest, and not a call to the actual protected release gate.
 const packets=verifyP5CdFrozenRoster(rosterBytes,roster,entries,{
  approvedCodeSha:trust.reviewedCodeSha,manifestSha256:trust.manifestSha256,
  rightsSha256:trust.rightsSha256,rosterSha256,
  independentlyApprovedStandaloneProtocolSha256:policy.independentlyApprovedStandaloneProtocolSha256
 });
 let nearCutoffCount=0,expiredCutoffCount=0,standaloneCount=0;
 for(const {permit} of packets.values()){
  preflightP5Stage14ReviewedPermitV39(permit,policy.independentlyApprovedStandaloneProtocolSha256);
  const cutoff=utc(permit.selectedTNativeTUtc)-(permit.horizon==="T-6h"?21600000:5400000);
  if(cutoff>utc(later.hardLatestUtc)||cutoff<=utc(later.notBeforeUtc))
   hold("NATIVE_CUTOFF_OUTSIDE_SIGNED_SHARD_WINDOW");
  if(cutoff<=now+2000)expiredCutoffCount++;
  else if(cutoff<=now+660000)nearCutoffCount++;
  if(permit.reviewedStandaloneLaterNoT24)standaloneCount++;
 }
 const out={status:"VERIFIED_PRIVATE_LATER_QUEUE_ROSTER_PROJECTION_NO_GO",
  day:selector.runDayIndex,revision:selector.indexRevision,shard:selector.shardIndex,
  signedIndexSha256:selector.indexSha256,signedLaterRegistrySha256:later.fileSha256,
  derivedCompatibilityRosterSha256:rosterSha256,packetCount:packets.size,nearCutoffCount,
  expiredCutoffCount,standaloneCount,observedDbClockUtc:hydrated.observedDbClockUtc,
  independentlySignedDerivedRoster:false,originalLaterReviewWireReverified:false,
  databaseWrites:0,providerCalls:0,queueClaims:0,tasksEnqueued:0,phase6PaidGo:false};
 Object.defineProperties(out,{privateRosterBytes:{value:rosterBytes,enumerable:false},
  privateEntries:{value:entries,enumerable:false}});
 return Object.freeze(out);
}
export async function readP6PrivateLaterQueueRoster({client,trust,selector,policy}){
 selectorCheck(selector,trust,policy);
 const scope={privateStoredReviewReadOnlyApproved:true,existingPaidDispatchApproved:false};
 const review=await readP6StoredPrivateReviewOnce({client,trust,scope,selector:{
  kind:"EXACT_DAY",runDayIndex:selector.runDayIndex,indexRevision:selector.indexRevision,indexSha256:selector.indexSha256}});
 const index=await hydrateP6DayEpochFullRegistriesReadOnly({client,pins:review.pins,wire:review.wire,
  publicKeyPem:review.publicKeyPem,scope:{privateDayRegistryReadOnlyApproved:true,
   existingPaidDispatchApproved:false,requireCurrentRevisionForPlanning:true}});
 const {later,source}=selectP6PrivateLaterQueueShard(index,selector,trust,policy);
 const hydrated=await hydrateP5PrivateLaterPreFromPg16ReadOnly(client,{
  registryFilePath:later.filePath,expectedRegistrySha256:later.fileSha256,
  expectedSourceRegistryPath:source.filePath,expectedSourceDayRegistrySha256:source.fileSha256,
  expectedSourceReviewEvidenceSha256:source.reviewEvidenceSha256,
  expectedLaterReviewEvidenceSha256:later.reviewEvidenceSha256,
  expectedManifestSha256:trust.manifestSha256,expectedApprovedMainSha:trust.reviewedCodeSha,
  expectedRunDayIndex:selector.runDayIndex,expectedReleaseSha256:trust.releaseSha256,
  expectedRightsSha256:trust.rightsSha256,expectedPrivateSessionLogin:trust.expectedReaderSessionLogin,
  privateReadOnlyApproved:true,paidProviderCallsAllowed:false});
 if(utc(hydrated.observedDbClockUtc)>=utc(review.wire.review.validUntilUtc)||
    utc(hydrated.observedDbClockUtc)>=utc(review.wire.review.retentionNotAfterUtc))
  hold("DAY_SIGNATURE_EXPIRED_DURING_HYDRATION");
 return projectP6VerifiedLaterQueueRoster({index,hydrated,selector,trust,policy});
}
