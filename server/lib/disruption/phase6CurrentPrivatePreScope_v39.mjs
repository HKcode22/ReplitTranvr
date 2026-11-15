/** Ephemeral same-process authority for an actually authenticated private
 * current-day shard. No GitHub input or env setter can mint a roster pin.
 * The original protected study trust and current retained Ed25519 day index
 * are the authorities, not an additional signature on the derived roster.
 */
import {AsyncLocalStorage} from "node:async_hooks";
import {createHash} from "node:crypto";
import {isP6CurrentPreTrigger} from "./phase6LaterCalendarDueDays_v39.mjs";
import {readP6StableSourceTrust} from "./phase6StoredSourceRuntimeTrust_v39.mjs";
import {readP6PrivateLaterQueueRoster} from "./phase6PrivateLaterQueueRosterReadOnce_v39.mjs";
import {readP6StoredPrivateReviewOnce} from "./phase6StoredPrivateReviewReadOnce_v39.mjs";
const storage=new AsyncLocalStorage();
const fail=s=>{throw Error("REFUSED_P5_CD_GH_CURRENT_PRIVATE_SCOPE_"+s);};
const HASH=/^[a-f0-9]{64}$/;
export function assertP6CurrentPrivatePreMode(env){
 if(env.P5_CD_GH_PRIVATE_LATER_MODE!=="PRIVATE_CURRENT_SCHEDULE"||
    env.P5_CD_GH_PRIVATE_CURRENT_APPROVED!=="1"||
    env.P6_PRIVATE_CURRENT_PRE_SCHEDULE_ENABLED!=="1"||
    !isP6CurrentPreTrigger(env)||
    env.P5_CD_GH_PRE_MODE!=="PHASE6_APPROVED"||
    env.V39_PHASE5_FREEZE_SIGNED!=="1"||
    env.V39_PHASE6_PROCESS_ARMED!=="1"||
    env.P5_CD_GH_PRE_STOP!=="0"||
    env.P5_CD_GH_PRE_ROSTER_SHA256||env.P5_CD_GH_PRE_ROSTER_PATH||
    env.P5_CD_GH_ROSTER_PATH||env.P5_CD_GH_PRIVATE_DAY||
    env.P5_CD_GH_PRIVATE_REVISION||env.P5_CD_GH_PRIVATE_SHARD||
    env.P5_CD_GH_PRIVATE_INDEX_SHA||env.P5_CD_GH_PRIVATE_REGISTRY_SHA||
    env.P5_CD_GH_PRIVATE_LATER_APPROVED==="1"||
    env.P6_PRIVATE_PUBLISHER_DATABASE_URL||env.RAPIDAPI_KEY||
    env.GITHUB_SHA!==env.P5_CD_GH_PRE_APPROVED_CODE_SHA)
  fail("SCHEDULED_PRIVATE_MODE_ONLY_NO_LEGACY_PIN");
 const trust=readP6StableSourceTrust(env);
 if(!env.P6_PRIVATE_READER_DATABASE_URL)fail("MISSING_RESTRICTED_READER");
 return trust;
}
export function readP6ScopedCurrentPrivateRosterDigest(env){
 const trust=assertP6CurrentPrivatePreMode(env),x=storage.getStore();
 if(!x?.active||!HASH.test(x.digest)||
    x.trustWire!==env.P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64||
    x.readerUrl!==env.P6_PRIVATE_READER_DATABASE_URL||
    x.preUrl!==env.P5_V39_PRE_DATABASE_URL||
    x.protocol!== (env.P5_CD_GH_STANDALONE_LATER_PROTOCOL_SHA256||"")||
    x.protocolEnabled!==(env.P5_CD_GH_STANDALONE_LATER_APPROVED||"")||
    x.codeSha!==trust.reviewedCodeSha)
  fail("NO_LIVE_AUTHENTICATED_ROSTER_CONTEXT");
 return x.digest;
}
/** Always execute the actual restricted private read, never accept a
 * caller-supplied projection/receipt as a capability. AsyncLocalStorage
 * prevents parallel lanes leaking roster authority into other lanes.
 * The caller must still invoke the old code-lineage/release/role/claim/
 * writer guards. A callback cannot retain the context after it returns.
 */
export async function withP6AuthenticatedCurrentPrivateRoster({client,env,selector,policy,expectedUnchangedRosterDigest},work){
 const trust=assertP6CurrentPrivatePreMode(env);
 if(typeof work!=="function"||storage.getStore()?.active)fail("NESTED_OR_MISSING_WORK");
 const originalTrust=env.P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64,
  readerUrl=env.P6_PRIVATE_READER_DATABASE_URL,preUrl=env.P5_V39_PRE_DATABASE_URL,
  protocol=env.P5_CD_GH_STANDALONE_LATER_PROTOCOL_SHA256||"",
  protocolEnabled=env.P5_CD_GH_STANDALONE_LATER_APPROVED||"";
 if(policy?.independentlyApprovedStandaloneProtocolSha256!==(protocolEnabled==="1"?protocol:undefined))
  fail("STANDALONE_PROTOCOL_DRIFT");
 // Imported function is called only here, after module initialization.
 const fresh=expectedUnchangedRosterDigest===undefined?null:
  await readP6UnchangedCurrentPreRoster({client,env,selector,policy,expectedUnchangedRosterDigest});
 const actualSelector=fresh?.selector??selector;
 const p=fresh?.projection??await readP6PrivateLaterQueueRoster({client,trust,selector:actualSelector,policy});
 if(p.status!=="VERIFIED_PRIVATE_LATER_QUEUE_ROSTER_PROJECTION_NO_GO"||
    p.day!==actualSelector.runDayIndex||p.revision!==actualSelector.indexRevision||
    p.shard!==actualSelector.shardIndex||p.signedIndexSha256!==actualSelector.indexSha256||
    p.signedLaterRegistrySha256!==actualSelector.laterRegistrySha256||
    !Buffer.isBuffer(p.privateRosterBytes)||
    createHash("sha256").update(p.privateRosterBytes).digest("hex")!==p.derivedCompatibilityRosterSha256||
    p.providerCalls!==0||p.databaseWrites!==0||p.phase6PaidGo!==false)
  fail("CURRENT_AUTHENTICATED_PROJECTION_REQUIRED");
 const ctx={active:true,digest:p.derivedCompatibilityRosterSha256,codeSha:trust.reviewedCodeSha,
  trustWire:originalTrust,readerUrl,preUrl,protocol,protocolEnabled};
 return storage.run(ctx,async()=>{
  try{readP6ScopedCurrentPrivateRosterDigest(env);return await work(p);}
  finally{ctx.active=false;}
 });
}

/** Re-read the current independently signed day, not a guessed next
 * revision. A prior authenticated shard can remain unchanged across new
 * append-only revisions. The original full registry reader verifies actual
 * current revision, exact registry and packet bytes, study, window and ACL.
 * The expected digest is only an additional equality constraint.
 */
export async function readP6UnchangedCurrentPreRoster({client,env,selector,policy,expectedUnchangedRosterDigest}){
 const trust=assertP6CurrentPrivatePreMode(env);
 if(!selector||!Number.isSafeInteger(selector.runDayIndex)||selector.runDayIndex<1||selector.runDayIndex>31||
    !Number.isSafeInteger(selector.indexRevision)||selector.indexRevision<1||selector.indexRevision>1024||
    !Number.isSafeInteger(selector.shardIndex)||selector.shardIndex<1||selector.shardIndex>100000||
    ![selector.indexSha256,selector.laterRegistrySha256,expectedUnchangedRosterDigest].every(x=>typeof x==="string"&&HASH.test(x)))
  fail("ORIGINAL_AUTHENTICATED_SHARD_AND_DIGEST_REQUIRED");
 const current=await readP6StoredPrivateReviewOnce({client,trust,scope:{
  privateStoredReviewReadOnlyApproved:true,existingPaidDispatchApproved:false},
  selector:{kind:"CURRENT_DAY",runDayIndex:selector.runDayIndex}});
 const pins=current.pins,rev=pins.expectedIndexRevision,sha=pins.expectedIndexSha256;
 if(pins.expectedRunDayIndex!==selector.runDayIndex||!Number.isSafeInteger(rev)||rev<selector.indexRevision||
    rev>1024||!HASH.test(sha??"")||(rev===selector.indexRevision&&sha!==selector.indexSha256))
  fail("CURRENT_SIGNED_DAY_ROLLBACK_OR_IDENTITY_DRIFT");
 const selected={...selector,indexRevision:rev,indexSha256:sha};
 const projection=await readP6PrivateLaterQueueRoster({client,trust,selector:selected,policy});
 if(projection.status!=="VERIFIED_PRIVATE_LATER_QUEUE_ROSTER_PROJECTION_NO_GO"||
    projection.day!==selected.runDayIndex||projection.revision!==rev||projection.shard!==selected.shardIndex||
    projection.signedIndexSha256!==sha||projection.signedLaterRegistrySha256!==selector.laterRegistrySha256||
    projection.providerCalls!==0||projection.databaseWrites!==0||projection.phase6PaidGo!==false||
    !Buffer.isBuffer(projection.privateRosterBytes)||
    createHash("sha256").update(projection.privateRosterBytes).digest("hex")!==projection.derivedCompatibilityRosterSha256||
    projection.derivedCompatibilityRosterSha256!==expectedUnchangedRosterDigest)
  fail("ORIGINAL_ROSTER_CHANGED_OR_CURRENT_READ_UNVERIFIED");
 return {selector:Object.freeze(selected),projection};
}
