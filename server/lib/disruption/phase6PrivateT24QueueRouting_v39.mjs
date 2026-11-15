/** Current private T24 registry -> exact existing C+D singleton roster.
 * No new queue, signer, provider, storage or rights certification. Each
 * native T24 packet is reauthenticated by its registry's distinct reviewer
 * and exact current signed SOURCE provenance before becoming a candidate.
 * The original V0100 enrollment and V0092 claim own real write authority. */
import {createHash,createPublicKey} from "node:crypto";
import {readP6T24CurrentRegistrySet,readP6T24PrivateRegistryPackets} from "./phase6PrivateT24RegistryTransport_v39.mjs";
import {verifyP5CdFrozenRoster} from "./phase5CdGithubBoundedPreTick_v39.ts";
import {verifyP5T24PreWitnessCrossReview} from "./phase5T24PreIndependentWitnessChain_v39.ts";
const H=/^[a-f0-9]{64}$/;
const hash=b=>createHash("sha256").update(b).digest("hex");
const hold=s=>{throw Error("HOLD_P6_PRIVATE_T24_QUEUE_"+s);};
const utc=s=>{if(typeof s!=="string"||!Number.isFinite(Date.parse(s))||new Date(s).toISOString()!==s)hold("INVALID_UTC");return Date.parse(s);};
const sealed=(x,k)=>{const d=Object.getOwnPropertyDescriptor(x??{},k);return Boolean(d&&!d.writable&&!d.enumerable);};
/** Read the SAME independently approved policy used by the producer.
 * Consumers receive public key material only, not a signing credential. */
export function deriveP6T24QueueTrust({trust:t,policyBytes:b,expectedPolicySha256,reviewerPublicKeyPem}){
 if(t?.independentStudyTrustPinsApproved!==true||!Buffer.isBuffer(b)||b.length<100||b.length>35000||
    !H.test(expectedPolicySha256??"")||hash(b)!==expectedPolicySha256)
  hold("UNPINNED_POLICY");
 let p;try{p=JSON.parse(b.toString("utf8"));}catch{hold("INVALID_POLICY");}
 const v=p?.nativeLaterReview,c=v?.selectedTConfig;
 if(p.schema!=="v39.phase6.delegated-daily-source-review-policy.v1"||p.delegatedDailyPacketProductionApproved!==true||
    p.approvedCodeSha!==t.reviewedCodeSha||!["manifestSha256","calendarSha256","releaseSha256","rightsSha256"].every(k=>p[k]===t[k])||
    v?.approved!==true||v.nativeT24ReviewApproved!==true||v.independentT24WitnessProtocolReviewed!==true||
    v.reviewedWitnessOnlyRole!=="phase5_fids_t24_witness_prod_20261107"||
    ![v.frameSha256,v.configSha256,v.laterReviewerFingerprintSha256,c?.artifactHash,c?.semanticsEvidenceSha256].every(x=>H.test(x??""))||
    v.frameSha256!==p.frameSha256||v.configSha256!==p.configSha256||
    c?.verifiedProviderNativeSchedule!==true||c.milestone!=="departure.scheduledTime.utc"||
    typeof c.version!=="string"||!c.version.length||
    !Number.isSafeInteger(v.maximumPrivateRetentionHours)||v.maximumPrivateRetentionHours<1||v.maximumPrivateRetentionHours>168||
    utc(v.validFromUtc)>=utc(v.validUntilUtc)||
    [t.dayReviewerFingerprintSha256,t.queryReviewerFingerprintSha256].includes(v.laterReviewerFingerprintSha256))
  hold("T24_PROTOCOL_NOT_APPROVED");
 try{
  if(typeof reviewerPublicKeyPem!=="string"||reviewerPublicKeyPem.length>4096||!reviewerPublicKeyPem.startsWith("-----BEGIN PUBLIC KEY-----"))
   hold("PUBLIC_KEY_ONLY");
  const k=createPublicKey(reviewerPublicKeyPem);
  if(k.asymmetricKeyType!=="ed25519"||hash(k.export({format:"der",type:"spki"}))!==v.laterReviewerFingerprintSha256)
   hold("WRONG_REVIEWER_KEY");
 }catch{hold("WRONG_REVIEWER_KEY");}
 return Object.freeze({...t,independentNativeT24RegistryApproved:true,
  expectedT24ReviewerFingerprintSha256:v.laterReviewerFingerprintSha256,expectedT24PolicySha256:expectedPolicySha256,
  expectedFrameSha256:v.frameSha256,expectedConfigSha256:v.configSha256,
  expectedSelectedTVersion:c.milestone+":"+c.version+":"+c.artifactHash,
  maximumPrivateRetentionHours:v.maximumPrivateRetentionHours,policyValidFromUtc:v.validFromUtc,policyValidUntilUtc:v.validUntilUtc,
  t24ReviewerPublicKeyPem:reviewerPublicKeyPem});
}
function currentCheck(x,t){
 if(x?.status!=="CURRENT_PRIVATE_T24_REGISTRY_SET_NO_GO"||x.providerCalls!==0||x.databaseWrites!==0||x.phase6PaidGo!==false||
    !sealed(x,"privateRegistries")||!Array.isArray(x.privateRegistries)||x.privateRegistries.length!==x.registryCount||x.registryCount>1024||
    !Number.isSafeInteger(x.runDayIndex)||x.runDayIndex<1||x.runDayIndex>31||
    utc(x.observedDbClockUtc)<utc(t.policyValidFromUtc)||utc(x.observedDbClockUtc)>=utc(t.policyValidUntilUtc))
  hold("NO_AUTHENTICATED_CURRENT_T24_SET");
}
/** Earliest cutoff priority across the actual reviewed study days, not
 * wall-clock guesses. Limit to four full registries for enrollment (<=384
 * packets); execution hydration is restricted to the same 11 minute
 * lookahead as existing Stage14. Do not confuse a selector with a claim. */
export function chooseP6T24QueueRegistries(sets,trust,purpose){
 if(!["ENROLLMENT","PRE_EXECUTION"].includes(purpose)||!Array.isArray(sets)||sets.length>2)
  hold("UNBOUNDED_SELECTION");
 const days=new Set(),ids=new Set(),candidates=[];
 let at=-Infinity,expired=0;
 for(const x of sets){currentCheck(x,trust);if(days.has(x.runDayIndex))hold("DUPLICATE_DAY");days.add(x.runDayIndex);at=Math.max(at,utc(x.observedDbClockUtc));}
 for(const x of sets){
  for(const row of x.privateRegistries){
   const g=row.reg,r=row.review;
   if(g?.runDayIndex!==x.runDayIndex||r?.runDayIndex!==x.runDayIndex||r.shardIndex!==g.shardIndex||
      !H.test(r.registrySha256??"")||!Array.isArray(g.entries)||g.entries.length<1||g.entries.length>96)
    hold("REGISTRY_SCOPE_DRIFT");
   const due=[];
   for(const e of g.entries){
    if(ids.has(e.flightInstanceId))hold("CROSS_DAY_DUPLICATE_FLIGHT");
    ids.add(e.flightInstanceId);
    const c=utc(e.cutoffUtc);
    if(c<=at+2000){expired++;continue;}
    if(purpose==="PRE_EXECUTION"&&c>at+660000)continue;
    due.push(c);
   }
   if(due.length)candidates.push({runDayIndex:x.runDayIndex,registrySha256:r.registrySha256,
    shardIndex:g.shardIndex,firstCutoff:Math.min(...due),eligibleCount:due.length});
  }
 }
 candidates.sort((a,b)=>a.firstCutoff-b.firstCutoff||a.runDayIndex-b.runDayIndex||a.shardIndex-b.shardIndex);
 return {selectors:candidates.slice(0,4),deferredRegistryCount:Math.max(0,candidates.length-4),expiredPacketCount:expired};
}
/** Exact singleton compatibility roster for the original T24 worker.
 * Registry verification has already authenticated all packet bytes; the
 * singleton selection cannot be used to substitute another signed flight. */
export function projectP6T24QueuePackets(got,trust,purpose){
 if(got?.status!=="EXACT_PRIVATE_NATIVE_T24_PACKETS_READONLY_NO_GO"||got.providerCalls!==0||got.databaseWrites!==0||got.phase6PaidGo!==false||
    !H.test(got.registrySha256??"")||!sealed(got,"privateRegistry")||!sealed(got,"privateFiles")||
    !["ENROLLMENT","PRE_EXECUTION"].includes(purpose)||!Array.isArray(got.privateFiles)||
    got.privateFiles.length!==got.packetCount||got.packetCount<1||got.packetCount>96||
    got.privateRegistry.runDayIndex!==got.runDayIndex||got.privateRegistry.entries.length!==got.packetCount||
    hash(Buffer.from(JSON.stringify(got.privateRegistry)))!==got.registrySha256)
  hold("NO_EXACT_AUTHENTICATED_T24_PACKETS");
 const now=utc(got.observedDbClockUtc),out=[];
 for(const [i,e] of got.privateRegistry.entries.entries()){
  const f=got.privateFiles[i],cutoff=utc(e.cutoffUtc);
  if(e.filePath!==f?.filePath||e.packetSha256!==f.packetSha256||!Buffer.isBuffer(f.bytes)||hash(f.bytes)!==e.packetSha256)
   hold("EXACT_PACKET_BYTES_DRIFT");
  const roster={schema:"v39.phase5.cd-existing-signed-pre-packet-roster.v1",reviewedCodeSha:trust.reviewedCodeSha,
   manifestSha256:trust.manifestSha256,rightsSha256:trust.rightsSha256,entries:[{filePath:f.filePath,packetSha256:f.packetSha256}]};
  const rosterBytes=Buffer.from(JSON.stringify(roster)),rosterSha256=hash(rosterBytes);
  const packets=verifyP5CdFrozenRoster(rosterBytes,roster,[f],{approvedCodeSha:trust.reviewedCodeSha,
   manifestSha256:trust.manifestSha256,rightsSha256:trust.rightsSha256,rosterSha256},"T24_WITH_SEPARATE_WITNESS");
  const entry=packets.get(e.packetSha256),p=entry?.permit;
  if(!p||!entry.witnessReview||p.horizon!=="T-24h"||p.flightInstanceId!==e.flightInstanceId||
     p.runDayIndex!==got.runDayIndex||p.queryDigestSha256!==e.queryDigestSha256||p.selectedTNativeUtc!==e.selectedTNativeUtc||
     p.expectedReviewedReleaseSha256!==trust.releaseSha256||p.reviewedFrameSha256!==trust.expectedFrameSha256||
     p.reviewedConfigSha256!==trust.expectedConfigSha256||entry.witnessReview.expectedSelectedTVersion!==trust.expectedSelectedTVersion||
     utc(p.selectedTNativeUtc)-86400000!==cutoff)
   hold("ORIGINAL_T24_PERMIT_DRIFT");
  verifyP5T24PreWitnessCrossReview(p,entry.witnessReview);
  if(cutoff<=now+2000||(purpose==="PRE_EXECUTION"&&cutoff>now+660000))continue;
  out.push({entry,cutoff,runDayIndex:got.runDayIndex,registrySha256:got.registrySha256,roster,rosterBytes,rosterSha256,files:[f]});
 }
 return out;
}
export async function readP6CurrentT24QueuePackets({client,trust,runDayIndices,purpose}){
 if(!Array.isArray(runDayIndices)||runDayIndices.length<1||runDayIndices.length>2||new Set(runDayIndices).size!==runDayIndices.length||
    runDayIndices.some(d=>!Number.isSafeInteger(d)||d<1||d>31))hold("UNBOUNDED_DAY_SELECTION");
 const sets=[];let unavailable=0;
 for(const day of runDayIndices){
  try{sets.push(await readP6T24CurrentRegistrySet({client,trust,runDayIndex:day}));}
  catch(e){if(e?.message!=="HOLD_P6_STORED_REVIEW_CURRENT_DAY_NOT_PUBLISHED_OR_RETAINED")throw e;unavailable++;}
 }
 const selected=chooseP6T24QueueRegistries(sets,trust,purpose),packets=[];
 for(const s of selected.selectors){
  const got=await readP6T24PrivateRegistryPackets({client,trust,runDayIndex:s.runDayIndex,registrySha256:s.registrySha256});
  packets.push(...projectP6T24QueuePackets(got,trust,purpose));
 }
 const seen=new Set();
 for(const p of packets){if(seen.has(p.entry.permit.flightInstanceId))hold("DUPLICATE_SELECTED_FLIGHT");seen.add(p.entry.permit.flightInstanceId);}
 packets.sort((a,b)=>a.cutoff-b.cutoff||a.entry.packetSha256.localeCompare(b.entry.packetSha256));
 if(packets.length>384)hold("BOUNDED_PACKET_COUNT");
 return Object.freeze(Object.defineProperty({status:"CURRENT_SIGNED_T24_QUEUE_PACKET_PROJECTION_NO_GO",
  requestedDayCount:runDayIndices.length,unavailableDayCount:unavailable,purpose,packetCount:packets.length,
  deferredRegistryCount:selected.deferredRegistryCount,expiredPacketCount:selected.expiredPacketCount,
  providerCalls:0,databaseWrites:0,queueClaims:0,phase6PaidGo:false},"privatePackets",{value:Object.freeze(packets),enumerable:false}));
}
