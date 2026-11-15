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
function trustPolicyCheck(trust,policy){
 if(policy?.independentLaterQueueTransportProjectionApproved!==true||
    policy.existingPaidDispatchApproved!==false||
    trust?.independentStudyTrustPinsApproved!==true||
    !CODE.test(trust.reviewedCodeSha??"")||
    ![trust.manifestSha256,trust.rightsSha256,trust.calendarSha256,trust.releaseSha256].every(x=>SHA.test(x??""))||
    (policy.independentlyApprovedStandaloneProtocolSha256!==undefined&&
     !SHA.test(policy.independentlyApprovedStandaloneProtocolSha256)))
  hold("NO_EXACT_INDEPENDENT_PROJECTION_SCOPE");
}
function selectorCheck(s,trust,policy){
 trustPolicyCheck(trust,policy);
 if(!Number.isSafeInteger(s?.runDayIndex)||s.runDayIndex<1||s.runDayIndex>31||
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
  const cutoff=utc(permit.selectedTNativeUtc)-(permit.horizon==="T-6h"?21600000:5400000);
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

/** Pure scheduling proposal only. The runtime below independently retrieves
 * and verifies the current signed index; do not use this as write admission. */
export function selectP6DueLaterQueueSelectors(index,trust,policy){
 trustPolicyCheck(trust,policy);
 const routed=inspectP6DayEpochExistingShardSemanticsNoGo(index);
 const signed=index.privateParsedIndex,sum=index.redactedSummary;
 if(signed.reviewedCodeSha!==trust.reviewedCodeSha||
    signed.manifestSha256!==trust.manifestSha256||
    signed.calendarSha256!==trust.calendarSha256||
    signed.reviewedReleaseSha256!==trust.releaseSha256||
    signed.reviewedRightsSha256!==trust.rightsSha256)
  hold("WRONG_AUTHENTICATED_DAY_STUDY");
 const lane=routed.redactedSummary.lanes.find(x=>x.lane==="LATER_PRE");
 const selectors=routed.privateRoutingCandidates.filter(x=>x.lane==="LATER_PRE").map(x=>{
  const selector={runDayIndex:x.runDayIndex,indexRevision:sum.indexRevision,
   indexSha256:sum.indexSha256,shardIndex:x.shardIndex,
   laterRegistrySha256:x.signedFrozenSha256,hardLatestUtc:x.hardLatestUtc};
  selectorCheck(selector,trust,policy);
  return Object.freeze(selector);
 });
 if(!lane||selectors.length!==lane.proposed||selectors.length>4)
  hold("DUE_LANE_COUNT_DRIFT");
 const out={due:lane.due,proposed:lane.proposed,deferred:lane.deferred,
  missed:lane.missed,notYetDue:lane.notYetDue,phase6PaidGo:false};
 // The original semantic audit validates EVERY index member and reports
 // the entire due count, although its routing output is limited to four.
 // Keep an in-memory private list for fair bounded enrollment, never
 // return it as public metadata or use it as write authority.
 const now=utc(sum.observedDbClockUtc);
 const all=signed.entries.filter(e=>e.lane==="LATER_PRE"&&
  utc(e.notBeforeUtc)<=now&&now<utc(e.hardLatestUtc)).map(e=>{
   const x={runDayIndex:e.runDayIndex,indexRevision:sum.indexRevision,
    indexSha256:sum.indexSha256,shardIndex:e.shardIndex,
    laterRegistrySha256:e.fileSha256,hardLatestUtc:e.hardLatestUtc};
   selectorCheck(x,trust,policy);
   return Object.freeze(x);
 }).sort(compareP6LaterSelectors);
 if(all.length!==lane.due||all.length>1024||
    JSON.stringify(all.slice(0,4))!==JSON.stringify(selectors))
  hold("FULL_DUE_SET_OR_ORIGINAL_EDF_DRIFT");
 // PRE claims need the earliest *individual* native cutoff, not the
 // end of a whole 96-packet shard. A long shard may contain a much more
 // urgent flight than an apparently earlier-ending short shard.
 const nativeCandidates=all.map(selector=>{
  const e=signed.entries.find(x=>x.lane==="LATER_PRE"&&x.shardIndex===selector.shardIndex);
  const raw=index.getFrozen(e.filePath);
  if(!Buffer.isBuffer(raw)||hash(raw)!==selector.laterRegistrySha256)
   hold("NATIVE_PRE_PRIORITY_REGISTRY_SHA_DRIFT");
  const registry=JSON.parse(raw.toString("utf8"));
  if(!Array.isArray(registry.entries)||registry.entries.length<1||registry.entries.length>96)
   hold("NATIVE_PRE_PRIORITY_REGISTRY_BOUND");
  const cutoffs=registry.entries.map(f=>{
   const offset=f.expectedHorizon==="T-6h"?21600000:f.expectedHorizon==="T-90m"?5400000:null;
   if(offset===null)hold("NATIVE_PRE_PRIORITY_WRONG_HORIZON");
   const c=utc(f.expectedSelectedTNativeUtc)-offset;
   if(c<=utc(e.notBeforeUtc)||c>utc(e.hardLatestUtc))
    hold("NATIVE_PRE_PRIORITY_OUTSIDE_SIGNED_WINDOW");
   return c;
  });
  // Retain the bounded list, not just the first cutoff; another day read
  // can advance the actual planning clock past an already examined member.
  return Object.freeze({selector,cutoffs:Object.freeze(cutoffs)});
 });
 Object.defineProperties(out,{
  privateSelectors:{value:Object.freeze(selectors),enumerable:false},
  privateAllDueSelectors:{value:Object.freeze(all),enumerable:false},
  privateNativePreCandidates:{value:Object.freeze(nativeCandidates),enumerable:false}
 });
 return Object.freeze(out);
}

function compareP6LaterSelectors(a,b){
 return utc(a.hardLatestUtc)-utc(b.hardLatestUtc)||
  a.runDayIndex-b.runDayIndex||a.shardIndex-b.shardIndex;
}
/**
 * Deterministic bounded fairness for restartable enrollment:
 * preserve strict EDF across distinct 10-minute deadline bands;
 * rotate equally urgent shards using actual PostgreSQL clock.
 * No persisted scheduler cursor, no claim/write authority; a missed
 * invocation can still mean missingness. Only signed current selectors
 * may be consumed by the real reauthentication below.
 */
export function chooseP6BoundedLaterEnrollmentSelectors(selectors,observedDbClockUtc){
 const now=utc(observedDbClockUtc);
 if(!Array.isArray(selectors)||selectors.length>2048)
  hold("UNBOUNDED_DUE_SELECTION");
 const all=selectors.slice().sort(compareP6LaterSelectors),seen=new Set(),groups=new Map();
 for(const x of all){
  const key=x.runDayIndex+":"+x.shardIndex;
  const end=utc(x.hardLatestUtc);
  if(end<=now)continue;
  if(seen.has(key))hold("DUPLICATE_DUE_SHARD");
  seen.add(key);
  const band=Math.floor(end/600000);
  const list=groups.get(band)??[];list.push(x);groups.set(band,list);
 }
 const picked=[];
 for(const list of groups.values()){
  const remaining=4-picked.length;
  if(remaining===0)break;
  if(list.length<=remaining)picked.push(...list);
  else{
   // Step one per 10-min DB-clock slot (not the number of available
   // slots, which can alias modulo list length). Equal-band order is
   // stable for the same signed current revision.
   const offset=Math.floor(now/600000)%list.length;
   for(let i=0;i<remaining;i++)picked.push(list[(offset+i)%list.length]);
  }
 }
 return picked.sort(compareP6LaterSelectors);
}
/** Urgent PRE differs from restartable enrollment. Match original 3-min
 * claim + 8-min lookahead; expired or far-future members cannot monopolize
 * four lanes. EDF on actual remaining signed per-flight cutoffs. No claim
 * or source evidence here; the original restricted packet reader and Stage14
 * are still invoked. A future unprocessed flight may remain missing if the
 * GitHub scheduler is late; no coverage guarantee or increased spend. */
export function chooseP6BoundedNativePreSelectors(candidates,observedDbClockUtc){
 const now=utc(observedDbClockUtc);
 if(!Array.isArray(candidates)||candidates.length>2048)
  hold("UNBOUNDED_NATIVE_PRE_SELECTION");
 const seen=new Set(),ranked=[];
 for(const x of candidates){
  const s=x?.selector,key=s?.runDayIndex+":"+s?.shardIndex;
  if(!s||seen.has(key)||!Array.isArray(x.cutoffs)||x.cutoffs.length<1||x.cutoffs.length>96||
     x.cutoffs.some(c=>!Number.isSafeInteger(c)||c>utc(s.hardLatestUtc)))
   hold("INVALID_OR_DUPLICATE_NATIVE_PRE_SELECTION");
  seen.add(key);
  const eligible=x.cutoffs.filter(c=>c>now+2000&&c<=now+660000);
  if(eligible.length)ranked.push({selector:s,first:Math.min(...eligible)});
 }
 ranked.sort((a,b)=>a.first-b.first||compareP6LaterSelectors(a.selector,b.selector));
 return ranked.slice(0,4).map(x=>x.selector);
}
/** Read at most two independently selected study days and four due shards
 * per invocation. No wall-clock inference of the study day, no GH checkout,
 * no queue writes, no paid dispatch. A revision change during re-read holds
 * rather than allowing the superseded route to execute. */
export async function readP6CurrentLaterQueueRosters({client,trust,policy,runDayIndices,selectionPurpose="ENROLLMENT"}){
 trustPolicyCheck(trust,policy);
 if(!["ENROLLMENT","PRE_EXECUTION"].includes(selectionPurpose))hold("UNKNOWN_SELECTION_PURPOSE");
 if(!Array.isArray(runDayIndices)||runDayIndices.length<1||runDayIndices.length>2||
    new Set(runDayIndices).size!==runDayIndices.length||
    runDayIndices.some(d=>!Number.isSafeInteger(d)||d<1||d>31))
  hold("INVALID_BOUNDED_STUDY_DAY_SELECTION");
 const scope={privateStoredReviewReadOnlyApproved:true,existingPaidDispatchApproved:false};
 const selectors=[],unavailable=[],nativeCandidates=[];
 let due=0,missed=0,notYetDue=0,latestClock=null;
 for(const day of runDayIndices){
  let review;
  try{
   review=await readP6StoredPrivateReviewOnce({client,trust,scope,
    selector:{kind:"CURRENT_DAY",runDayIndex:day}});
  }catch(e){
   if(e?.message!=="HOLD_P6_STORED_REVIEW_CURRENT_DAY_NOT_PUBLISHED_OR_RETAINED")throw e;
   unavailable.push(day);continue;
  }
  const index=await hydrateP6DayEpochFullRegistriesReadOnly({client,pins:review.pins,
   wire:review.wire,publicKeyPem:review.publicKeyPem,
   scope:{privateDayRegistryReadOnlyApproved:true,
    existingPaidDispatchApproved:false,requireCurrentRevisionForPlanning:true}});
  if(index.redactedSummary.runDayIndex!==day||
     utc(index.redactedSummary.observedDbClockUtc)>=utc(review.wire.review.validUntilUtc)||
     utc(index.redactedSummary.observedDbClockUtc)>=utc(review.wire.review.retentionNotAfterUtc))
   hold("CURRENT_DAY_OR_REVIEW_EXPIRY_DRIFT");
  const plan=selectP6DueLaterQueueSelectors(index,trust,policy);
  due+=plan.due;missed+=plan.missed;notYetDue+=plan.notYetDue;
  selectors.push(...plan.privateAllDueSelectors);
  nativeCandidates.push(...plan.privateNativePreCandidates);
  if(latestClock===null||utc(index.redactedSummary.observedDbClockUtc)>utc(latestClock))latestClock=index.redactedSummary.observedDbClockUtc;
 }
 const chosen=latestClock===null?[]:selectionPurpose==="PRE_EXECUTION"?
  chooseP6BoundedNativePreSelectors(nativeCandidates,latestClock):
  chooseP6BoundedLaterEnrollmentSelectors(selectors,latestClock);
 const rosters=[];
 // Reauthenticate exact current revision and all native permit bytes.
 // Serial reads avoid overlapping transactions on the restricted client.
 for(const selector of chosen)
  rosters.push(await readP6PrivateLaterQueueRoster({client,trust,selector,policy}));
 const out={status:"CURRENT_SIGNED_LATER_QUEUE_ROSTERS_READONLY_NO_GO",
  requestedDayCount:runDayIndices.length,unavailableDayCount:unavailable.length,selectionPurpose,
  due,missed,notYetDue,hydratedShardCount:rosters.length,deferredDueShardCount:due-rosters.length,
  providerCalls:0,databaseWrites:0,queueClaims:0,tasksEnqueued:0,phase6PaidGo:false};
 Object.defineProperty(out,"privateRosters",{value:Object.freeze(rosters),enumerable:false});
 return Object.freeze(out);
}
