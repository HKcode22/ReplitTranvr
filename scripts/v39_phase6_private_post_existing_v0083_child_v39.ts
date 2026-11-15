/** Stored day and POST review -> original one-GET V0083 child.
 * Exact protected packet pin and existing budget/rights/GO gates remain.
 * No public checkout packet or private path in workflow inputs/logs.
 * Separate restricted reader, source, REVIEW and RESERVE roles.
 */
import {Client} from "pg";
import {createHash} from "node:crypto";
import {readP6StablePostTrust} from "../server/lib/disruption/phase6StoredSourceRuntimeTrust_v39.mjs";
import {readP6StoredPrivateReviewOnce} from "../server/lib/disruption/phase6StoredPrivateReviewReadOnce_v39.mjs";
import {hydrateAndInspectP6DayEpochOriginalSemanticsReadOnly} from "../server/lib/disruption/phase6DayEpochOriginalSemanticHandoff_v39.mjs";
import {readP6PrivateSourcePostOnce} from "../server/lib/disruption/phase6PrivateSourcePostReadOnce_v39.mjs";
import {admitP5SignedFuturePostGitHub,runP5SignedFuturePost,type P5SignedFuturePostPacket} from "./v39_phase5_one_signed_future_post_outcome_v0083_owner_v39";
import {readActualValidPreAndClock} from "./v39_phase5_future_post_github_child_dispatcher_v39";
const SHA=/^[a-f0-9]{64}$/;
const hash=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const hold=(s:string):never=>{throw Error("HOLD_P6_PRIVATE_POST_CHILD_"+s);};
export function admitP6PrivatePostChildTransport(env:NodeJS.ProcessEnv){
 if(env.GITHUB_ACTIONS!=="true"||env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||env.GITHUB_EVENT_NAME!=="workflow_dispatch"||
    env.GITHUB_RUN_ATTEMPT!=="1"||env.P6_PRIVATE_POST_CHILD_MODE!=="stored"||
    env.P6_PRIVATE_POST_CHILD_CONFIRM!=="ONE_PRIVATE_POST_ORIGINAL_V0083_MAX_TWO_UNITS"||
    env.P6_PRIVATE_POST_CHILD_APPROVED!=="1"||
    env.P6_PRIVATE_POST_LEGACY_PATH!=="PRIVATE_STORED"||
    env.P5_FUTURE_POST_CONFIRM!=="ONE_SIGNED_FUTURE_POST_V0083_MAX_2_UNITS_NO_RETRY"||
    env.V39_P5_POST_OWNER_APPROVED!=="1"||env.V39_PHASE5_FREEZE_SIGNED!=="1"||
    env.V39_PHASE6_PROCESS_ARMED!=="1"||env.V39_PHASE5_SOURCE_RIGHTS_APPROVED!=="1"||
    env.V39_P5_POST_INDEPENDENT_REST_ROLES_APPROVED!=="1"||
    env.ADB_AUTO_COLLECT!=="0"||env.GITHUB_SHA!==env.V39_P5_POST_APPROVED_CODE_SHA||
    !env.AERODATABOX_API_KEY||env.DATABASE_URL||env.V39_DATABASE_RUNTIME_URL||
    env.P5_V39_PRE_DATABASE_URL||env.P5_V39_PREPARE_DATABASE_URL||
    env.P5_V39_T24_WITNESS_DATABASE_URL||env.P6_PRIVATE_PUBLISHER_DATABASE_URL)
  hold("WRONG_ORIGINAL_GO_OR_PRIVATE_TRANSPORT_SCOPE");
 const trust=readP6StablePostTrust(env);
 const number=(v:string|undefined,max:number)=>{
  if(!/^[1-9][0-9]{0,5}$/.test(v??"")||Number(v)>max)hold("BAD_EXACT_SELECTOR");
  return Number(v);
 };
 const selector={runDayIndex:number(env.P6_PRIVATE_POST_DAY,31),
  indexRevision:number(env.P6_PRIVATE_POST_REVISION,1024),
  indexSha256:env.P6_PRIVATE_POST_INDEX_SHA??"",
  shardIndex:number(env.P6_PRIVATE_POST_SHARD,100000),
  packetSha256:env.P6_PRIVATE_POST_PACKET_SHA??"",
  routingIntentSha256:env.P6_PRIVATE_POST_ROUTE_SHA??""};
 if(![selector.indexSha256,selector.packetSha256,selector.routingIntentSha256].every(x=>SHA.test(x))||
    selector.packetSha256!==env.V39_P5_POST_SIGNED_PACKET_SHA256)
  hold("PRIVATE_POST_SELECTOR_NOT_PROTECTED_PACKET_PIN");
 let reader:URL,source:URL;
 try{reader=new URL(env.P6_PRIVATE_READER_DATABASE_URL??"");source=new URL(env.V39_P5_SOURCE_DATABASE_URL??"");}
 catch{return hold("MISSING_RESTRICTED_READER_OR_SOURCE_URL");}
 if(!["postgres:","postgresql:"].includes(reader.protocol)||
    decodeURIComponent(reader.username)!==trust.expectedReaderSessionLogin||
    decodeURIComponent(source.username)!=="phase5_p5_source_login_20261108"||
    !reader.password||reader.pathname!=="/neondb"||reader.hash||reader.host!==source.host||
    !reader.hostname.endsWith(".neon.tech")||(reader.port!==""&&reader.port!=="5432")||
    reader.searchParams.getAll("sslmode").length!==1||reader.searchParams.get("sslmode")!=="require"||
    [...reader.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k))||
    (reader.searchParams.has("channel_binding")&&(reader.searchParams.getAll("channel_binding").length!==1||reader.searchParams.get("channel_binding")!=="require")))
  hold("PRIVATE_READER_WRONG_TLS_OR_ROLE");
 return {trust,selector,readerUrl:env.P6_PRIVATE_READER_DATABASE_URL!};
}
export function bindP6PostPrivateDayRoute(handoff:any,ctx:ReturnType<typeof admitP6PrivatePostChildTransport>){
 const s=ctx.selector,z=handoff?.redactedSummary;
 if(z?.status!=="ED25519_DAY_EPOCH_ORIGINAL_SOURCE_PRE_POST_SEMANTICS_PASS_NO_GO"||
    z.runDayIndex!==s.runDayIndex||z.indexRevision!==s.indexRevision||
    z.externallySignedDayEpochIndexSha256!==s.indexSha256||
    z.reviewedEd25519SourceWasOriginalDayBytes!==true||
    z.providerCalls!==0||z.databaseWrites!==0||z.phase6PaidGo!==false||
    !Array.isArray(handoff.privateRoutingCandidates)||typeof handoff.getFrozen!=="function")
  hold("UNAUTHENTICATED_CURRENT_SIGNED_DAY");
 const hits=handoff.privateRoutingCandidates.filter((r:any)=>r.lane==="POST"&&
  r.runDayIndex===s.runDayIndex&&r.shardIndex===s.shardIndex&&
  r.routingIntentSha256===s.routingIntentSha256&&r.signedFrozenSha256===s.packetSha256);
 if(hits.length!==1)hold("EXACT_DUE_POST_ROUTE_MISSING");
 const r=hits[0],post=handoff.getFrozen(r.signedFrozenPath),source=handoff.getFrozen(r.boundSourceRegistryPath);
 if(!Buffer.isBuffer(post)||hash(post)!==s.packetSha256||
    !Buffer.isBuffer(source)||hash(source)!==r.boundSourceRegistrySha256||
    !/^data-collection\/phase5\/frozen\/post_[A-Za-z0-9_-]{8,95}\.json$/.test(r.signedFrozenPath)||
    r.privateBytesOnlyFromRestrictedReader!==true||r.newPaidDispatchAuthorizedHere!==false)
  hold("PRIVATE_POST_OR_BOUND_SOURCE_BYTES_DRIFT");
 const native=JSON.parse(source.toString("utf8"));
 if(native.manifestSha256!==ctx.trust.manifestSha256||native.runDayIndex!==s.runDayIndex||
    !Array.isArray(native.entries)||native.entries.length<1||native.entries.length>96)
  hold("BAD_EXACT_BOUND_SOURCE_REGISTRY");
 const sourceDigests=native.entries.map((x:any)=>x.expectedQueryDigestSha256);
 if(sourceDigests.some((x:any)=>typeof x!=="string"||!SHA.test(x))||
    new Set(sourceDigests).size!==sourceDigests.length)
  hold("BAD_SOURCE_QUERY_DIGEST_SCOPE");
 return {route:r,post,sourceDigests:sourceDigests as string[],observedDbClockUtc:z.observedRealPgClockUtc};
}
export async function runP6PrivatePostExistingV0083Child(env:NodeJS.ProcessEnv){
 const ctx=admitP6PrivatePostChildTransport(env),s=ctx.selector;
 const c=new Client({connectionString:ctx.readerUrl,connectionTimeoutMillis:8000,query_timeout:25000});
 await c.connect();
 let bound:ReturnType<typeof bindP6PostPrivateDayRoute>,packet:P5SignedFuturePostPacket,raw:Buffer;
 try{
  await c.query("SET ROLE phase6_private_frozen_reader_v39");
  const scope={privateStoredReviewReadOnlyApproved:true,existingPaidDispatchApproved:false};
  const day=await readP6StoredPrivateReviewOnce({client:c,trust:ctx.trust,scope,
   selector:{kind:"EXACT_DAY",runDayIndex:s.runDayIndex,indexRevision:s.indexRevision,indexSha256:s.indexSha256}});
  const handoff=await hydrateAndInspectP6DayEpochOriginalSemanticsReadOnly({client:c,pins:day.pins,wire:day.wire,
   publicKeyPem:day.publicKeyPem,scope:{privateDayRegistryReadOnlyApproved:true,existingPaidDispatchApproved:false,
    requireCurrentRevisionForPlanning:true}});
  bound=bindP6PostPrivateDayRoute(handoff,ctx);
  const review=await readP6StoredPrivateReviewOnce({client:c,trust:ctx.trust,scope,
   selector:{kind:"POST",runDayIndex:s.runDayIndex,shardIndex:s.shardIndex,logicalPath:bound.route.signedFrozenPath,contentSha256:s.packetSha256}});
  const read=await readP6PrivateSourcePostOnce(c,review.pins,review.wire,review.publicKeyPem);
  const z=read.redactedSummary,now=Date.parse(z.observedDatabaseClockUtc),prior=Date.parse(bound.observedDbClockUtc);
  if(z.kind!=="POST_PACKET"||z.contentSha256!==s.packetSha256||z.verifiedEd25519Review!==true||
     z.runDayIndex!==s.runDayIndex||z.shardIndex!==s.shardIndex||z.providerCalls!==0||
     !Buffer.isBuffer(read.privateBytes)||!read.privateBytes.equals(bound.post)||
     read.privateLogicalPath!==bound.route.signedFrozenPath||
     !Number.isFinite(now)||!Number.isFinite(prior)||now<prior||now-prior>120000||
     now>=Date.parse(bound.route.hardLatestUtc)||
     now>=Date.parse(day.wire.review.validUntilUtc)||now>=Date.parse(day.wire.review.retentionNotAfterUtc))
   hold("POST_PACKET_READ_OR_SIGNED_WINDOW_DRIFT");
  raw=read.privateBytes;packet=JSON.parse(raw.toString("utf8"));
 }finally{await c.end();}
 const p=admitP5SignedFuturePostGitHub(env,raw,packet,bound.route.signedFrozenPath);
 if(p.runDayIndex!==s.runDayIndex)hold("ORIGINAL_POST_WRONG_RUN_DAY");
 const actual=await readActualValidPreAndClock(env.V39_P5_SOURCE_DATABASE_URL!,p,bound.sourceDigests);
 const clock=Date.parse(actual.dbClockUtc);
 if(!Number.isFinite(clock)||clock<Date.parse(bound.route.notBeforeUtc)||clock>=Date.parse(bound.route.hardLatestUtc)||
    (actual.pre.boundSourceRegistryValidHorizonCount??0)<1)
  hold("ORIGINAL_SAME_FLIGHT_PRE_OUTSIDE_SIGNED_SOURCE_OR_TIME");
 // Existing child rechecks same bound SOURCE PRE, original V0083 review
 // and irreversible exact budget reservation, one GET and atomic custody.
 return runP5SignedFuturePost(env,raw,packet,bound.route.signedFrozenPath,bound.sourceDigests);
}
if(process.env.P6_PRIVATE_POST_CHILD_ENTRYPOINT==="1"){
 runP6PrivatePostExistingV0083Child(process.env).then(x=>{
  console.log(JSON.stringify(x));
  if(x.status!=="ONE_FUTURE_POST_SOURCE_ORIGINAL_DURABLE_NOT_PHYSICAL_LABEL")process.exitCode=3;
 }).catch(()=>{console.error("HOLD_P6_PRIVATE_POST_CHILD_REDACTED_NO_RETRY");process.exitCode=2;});
}
