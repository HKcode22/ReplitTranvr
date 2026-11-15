/** Shared read-only calendar and registry routing for T24. Reuse the
 * protected study policy, current Ed25519 SOURCE and V0101 T24 registry
 * transport. No new role, writer, private key or provider calls here. */
import {createHash,createPublicKey} from "node:crypto";
import {readP6StableSourceTrust} from "./phase6StoredSourceRuntimeTrust_v39.mjs";
import {loadP6T24CalendarWindows,selectP6LaterCalendarDueDays} from "./phase6LaterCalendarDueDays_v39.mjs";
import {readP6T24CurrentRegistrySet,readP6T24PrivateRegistryPackets} from "./phase6PrivateT24RegistryTransport_v39.mjs";
import {readP6DayEpochRestrictedReaderClock} from "./phase6DayEpochSignedIndexOnce_v39.mjs";
const H=/^[a-f0-9]{64}$/;
const hash=b=>createHash("sha256").update(b).digest("hex");
const hold=s=>{throw Error("HOLD_P6_CURRENT_T24_ROUTING_"+s);};
const utc=s=>{if(typeof s!=="string"||!Number.isFinite(Date.parse(s))||new Date(s).toISOString()!==s)hold("BAD_CLOCK");return Date.parse(s);};
export function readP6T24RegistryRoutingTrust(env){
 const t=readP6StableSourceTrust(env);
 const raw=env.P6_NONPAID_DAILY_POLICY_BASE64??"";
 if(raw.length<100||raw.length>50000||!H.test(env.P6_NONPAID_DAILY_POLICY_SHA256??""))hold("MISSING_POLICY");
 const b=Buffer.from(raw,"base64");
 if(b.length>35000||b.toString("base64")!==raw||hash(b)!==env.P6_NONPAID_DAILY_POLICY_SHA256)hold("POLICY_DIGEST_DRIFT");
 const p=JSON.parse(b.toString("utf8")),v=p.nativeLaterReview,cfg=v?.selectedTConfig;
 if(p.schema!=="v39.phase6.delegated-daily-source-review-policy.v1"||p.delegatedDailyPacketProductionApproved!==true||
    p.approvedCodeSha!==t.reviewedCodeSha||!["manifestSha256","calendarSha256","releaseSha256","rightsSha256"].every(k=>p[k]===t[k])||
    v?.approved!==true||v.privatePublicationApproved!==true||v.nativeT24ReviewApproved!==true||
    v.independentT24WitnessProtocolReviewed!==true||v.reviewedWitnessOnlyRole!=="phase5_fids_t24_witness_prod_20261107"||
    ![v.laterReviewerFingerprintSha256,v.frameSha256,v.configSha256,cfg?.artifactHash].every(x=>H.test(x??""))||
    v.frameSha256!==p.frameSha256||v.configSha256!==p.configSha256||
    [t.dayReviewerFingerprintSha256,t.queryReviewerFingerprintSha256].includes(v.laterReviewerFingerprintSha256)||
    cfg?.verifiedProviderNativeSchedule!==true||cfg.milestone!=="departure.scheduledTime.utc"||typeof cfg.version!=="string"||!cfg.version.trim()||
    !Number.isSafeInteger(v.maximumPrivateRetentionHours)||v.maximumPrivateRetentionHours<1||v.maximumPrivateRetentionHours>168||
    utc(v.validFromUtc)>=utc(v.validUntilUtc))
  hold("T24_PROTECTED_REVIEW_NOT_APPROVED");
 const pem=v.laterReviewerPublicKeyPem;
 try{
  if(typeof pem!=="string"||pem.length>4096||!pem.startsWith("-----BEGIN PUBLIC KEY-----"))hold("PUBLIC_KEY_REQUIRED");
  const k=createPublicKey(pem);
  if(k.asymmetricKeyType!=="ed25519"||hash(k.export({type:"spki",format:"der"}))!==v.laterReviewerFingerprintSha256)hold("WRONG_T24_PUBLIC_KEY");
 }catch{hold("WRONG_T24_PUBLIC_KEY");}
 return Object.freeze({...t,independentNativeT24RegistryApproved:true,
  expectedT24ReviewerFingerprintSha256:v.laterReviewerFingerprintSha256,expectedT24PolicySha256:hash(b),
  expectedFrameSha256:v.frameSha256,expectedConfigSha256:v.configSha256,
  expectedSelectedTVersion:cfg.milestone+":"+cfg.version+":"+cfg.artifactHash,
  maximumPrivateRetentionHours:v.maximumPrivateRetentionHours,policyValidFromUtc:v.validFromUtc,policyValidUntilUtc:v.validUntilUtc,
  t24ReviewerPublicKeyPem:pem});
}
/** Pure prioritization, not admission. A later actual registry packet read
 * revalidates every selected byte. Choose earliest active individual T24
 * cutoff; up to four registry shards, two study days, 384 packets. */
export function selectP6T24RoutingCandidates(sets,observedDbClockUtc,purpose){
 const now=utc(observedDbClockUtc);
 if(!["ENROLLMENT","PRE_EXECUTION"].includes(purpose)||!Array.isArray(sets)||sets.length>2)hold("BOUNDED_PURPOSE_REQUIRED");
 const candidates=[],seen=new Set(),days=new Set();
 for(const s of sets){
  if(s?.status!=="CURRENT_PRIVATE_T24_REGISTRY_SET_NO_GO"||s.providerCalls!==0||s.databaseWrites!==0||s.phase6PaidGo!==false||
     days.has(s.runDayIndex)||!Array.isArray(s.privateRegistries)||s.privateRegistries.length!==s.registryCount||s.registryCount>1024)
   hold("UNVERIFIED_CURRENT_REGISTRY_SET");
  days.add(s.runDayIndex);
  for(const v of s.privateRegistries){
   const r=v.review,g=v.reg;
   if(!H.test(r?.registrySha256??"")||g.runDayIndex!==s.runDayIndex||!Array.isArray(g.entries)||g.entries.length<1||g.entries.length>96)hold("BAD_PRIVATE_REGISTRY");
   const eligible=[];
   for(const e of g.entries){
    if(seen.has(e.flightInstanceId))hold("DUPLICATE_T24_ACROSS_CURRENT_DAYS");
    seen.add(e.flightInstanceId);
    const cutoff=utc(e.cutoffUtc);
    if(cutoff>now+2000&&(purpose==="ENROLLMENT"||cutoff<=now+660000))eligible.push(cutoff);
   }
   if(eligible.length)candidates.push({runDayIndex:s.runDayIndex,registrySha256:r.registrySha256,firstCutoff:Math.min(...eligible)});
  }
 }
 candidates.sort((a,b)=>a.firstCutoff-b.firstCutoff||a.runDayIndex-b.runDayIndex||a.registrySha256.localeCompare(b.registrySha256));
 return {selectors:candidates.slice(0,4),deferredShards:Math.max(0,candidates.length-4)};
}
export async function readP6CurrentT24Routing({client,env,purpose}){
 const trust=readP6T24RegistryRoutingTrust(env),calendar=loadP6T24CalendarWindows(env,trust);
 await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
 let now;
 try{now=await readP6DayEpochRestrictedReaderClock(client,trust.expectedReaderSessionLogin);}
 finally{await client.query("ROLLBACK");}
 const due=selectP6LaterCalendarDueDays(calendar,now),sets=[];
 let unavailable=0;
 for(const runDayIndex of due.dayIndices){
  try{sets.push(await readP6T24CurrentRegistrySet({client,trust,runDayIndex}));}
  catch(e){if(e?.message!=="HOLD_P6_STORED_REVIEW_CURRENT_DAY_NOT_PUBLISHED_OR_RETAINED")throw e;unavailable++;}
 }
 for(const s of sets){if(utc(s.observedDbClockUtc)>utc(now))now=s.observedDbClockUtc;}
 const plan=selectP6T24RoutingCandidates(sets,now,purpose),packets=[];
 for(const s of plan.selectors)packets.push(await readP6T24PrivateRegistryPackets({client,trust,runDayIndex:s.runDayIndex,registrySha256:s.registrySha256}));
 return Object.freeze(Object.defineProperty({status:"CURRENT_PRIVATE_T24_ROUTING_READONLY_NO_GO",purpose,dayCount:due.dayIndices.length,
  unavailableDayCount:unavailable,deferredDays:due.deferredDays,deferredShards:plan.deferredShards,hydratedShardCount:packets.length,
  providerCalls:0,databaseWrites:0,phase6PaidGo:false},"privatePackets",{value:Object.freeze(packets),enumerable:false}));
}
/** Derive the existing full or singleton roster only from verified packet
 * readback. Caller still needs actual restricted reader and proper release
 * context, not just a caller-created object or a hash. */
export function projectP6T24CompatibilityRoster(p,trust,packetSha256){
 if(p?.status!=="EXACT_PRIVATE_NATIVE_T24_PACKETS_READONLY_NO_GO"||p.providerCalls!==0||p.databaseWrites!==0||p.phase6PaidGo!==false||
    !Array.isArray(p.privateFiles)||p.privateFiles.length!==p.packetCount||p.packetCount<1||p.packetCount>96)
  hold("VERIFIED_T24_PACKET_READBACK_REQUIRED");
 const files=packetSha256===undefined?p.privateFiles:p.privateFiles.filter(f=>f.packetSha256===packetSha256);
 if(!files.length||(packetSha256!==undefined&&files.length!==1)||files.some(f=>!Buffer.isBuffer(f.bytes)||hash(f.bytes)!==f.packetSha256))
  hold("T24_PACKET_BYTES_CHANGED");
 const roster={schema:"v39.phase5.cd-existing-signed-pre-packet-roster.v1",reviewedCodeSha:trust.reviewedCodeSha,
  manifestSha256:trust.manifestSha256,rightsSha256:trust.rightsSha256,entries:files.map(f=>({filePath:f.filePath,packetSha256:f.packetSha256}))};
 const raw=Buffer.from(JSON.stringify(roster));
 return {roster,raw,files,digest:hash(raw)};
}
