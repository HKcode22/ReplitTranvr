/** Ephemeral same-process authority for an actually authenticated private
 * current-day shard. No GitHub input or env setter can mint a roster pin.
 * The original protected study trust and current retained Ed25519 day index
 * are the authorities, not an additional signature on the derived roster.
 */
import {AsyncLocalStorage} from "node:async_hooks";
import {createHash} from "node:crypto";
import {readP6StableSourceTrust} from "./phase6StoredSourceRuntimeTrust_v39.mjs";
import {readP6PrivateLaterQueueRoster} from "./phase6PrivateLaterQueueRosterReadOnce_v39.mjs";
const storage=new AsyncLocalStorage();
const fail=s=>{throw Error("REFUSED_P5_CD_GH_CURRENT_PRIVATE_SCOPE_"+s);};
const HASH=/^[a-f0-9]{64}$/;
export function assertP6CurrentPrivatePreMode(env){
 if(env.P5_CD_GH_PRIVATE_LATER_MODE!=="PRIVATE_CURRENT_SCHEDULE"||
    env.P5_CD_GH_PRIVATE_CURRENT_APPROVED!=="1"||
    env.P6_PRIVATE_CURRENT_PRE_SCHEDULE_ENABLED!=="1"||
    env.GITHUB_EVENT_NAME!=="schedule"||
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
export async function withP6AuthenticatedCurrentPrivateRoster({client,env,selector,policy},work){
 const trust=assertP6CurrentPrivatePreMode(env);
 if(typeof work!=="function"||storage.getStore()?.active)fail("NESTED_OR_MISSING_WORK");
 const originalTrust=env.P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64,
  readerUrl=env.P6_PRIVATE_READER_DATABASE_URL,preUrl=env.P5_V39_PRE_DATABASE_URL,
  protocol=env.P5_CD_GH_STANDALONE_LATER_PROTOCOL_SHA256||"",
  protocolEnabled=env.P5_CD_GH_STANDALONE_LATER_APPROVED||"";
 if(policy?.independentlyApprovedStandaloneProtocolSha256!==(protocolEnabled==="1"?protocol:undefined))
  fail("STANDALONE_PROTOCOL_DRIFT");
 // Imported function is called only here, after module initialization.
 const p=await readP6PrivateLaterQueueRoster({client,trust,selector,policy});
 if(p.status!=="VERIFIED_PRIVATE_LATER_QUEUE_ROSTER_PROJECTION_NO_GO"||
    p.day!==selector.runDayIndex||p.revision!==selector.indexRevision||
    p.shard!==selector.shardIndex||p.signedIndexSha256!==selector.indexSha256||
    p.signedLaterRegistrySha256!==selector.laterRegistrySha256||
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
