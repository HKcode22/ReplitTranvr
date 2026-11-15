/**
 * Private transport for the original PREPARE and PRE runners. The protected
 * independently approved compatibility roster SHA remains mandatory. Never
 * populate that pin from a DB result, workflow input or collector. The
 * private signed registry proves exact bytes; the gate separately approves
 * the actual roster. This is a bounded first canary, not dynamic GO.
 */
import pg from "pg";
import {readP6StableSourceTrust} from "./phase6StoredSourceRuntimeTrust_v39.mjs";
import {readP6PrivateLaterQueueRoster} from "./phase6PrivateLaterQueueRosterReadOnce_v39.mjs";
import {verifyP5CdFrozenRoster} from "./phase5CdGithubBoundedPreTick_v39.ts";
const HOLD=s=>{throw Error("REFUSED_P5_CD_GH_PRIVATE_ROSTER_"+s);};
const SHA=/^[a-f0-9]{64}$/;
const fields=["runDayIndex","indexRevision","indexSha256","shardIndex","laterRegistrySha256"];
export const P6_PRIVATE_LATER_PINNED_PATH="PRIVATE_STORED";
export function admitP6PrivateLaterPinnedRoster(env,gate,writerUrl){
 if(env.P5_CD_GH_PRE_ROSTER_PATH!==P6_PRIVATE_LATER_PINNED_PATH||
    env.P6_PRIVATE_LATER_PINNED_ROSTER_APPROVED!=="1"||
    env.P5_CD_GH_REGISTER_HORIZON==="T-24h"||
    env.GITHUB_EVENT_NAME!=="workflow_dispatch"||
    gate.releaseMode!=="PHASE5_CANARY"||
    gate.rosterSha256!==env.P5_CD_GH_PRE_ROSTER_SHA256||
    !SHA.test(gate.rosterSha256??"")||
    env.RAPIDAPI_KEY||env.P6_PRIVATE_PUBLISHER_DATABASE_URL)
  HOLD("NO_SEPARATE_MANUAL_PRIVATE_CANARY_APPROVAL");
 const trust=readP6StableSourceTrust(env);
 if(trust.reviewedCodeSha!==gate.approvedCodeSha||
    trust.manifestSha256!==gate.manifestSha256||trust.rightsSha256!==gate.rightsSha256)
  HOLD("STUDY_RELEASE_DRIFT");
 const raw=env.P6_PRIVATE_LATER_PINNED_SELECTOR_JSON;
 let selector,u,w;
 try{
  if(typeof raw!=="string"||raw.length>1024)HOLD("SELECTOR_SIZE");
  selector=JSON.parse(raw);
  u=new URL(env.P6_PRIVATE_READER_DATABASE_URL??"");
  w=new URL(writerUrl??"");
 }catch{HOLD("PRIVATE_SELECTOR_OR_DB_URL_INVALID");}
 if(!selector||Array.isArray(selector)||Object.keys(selector).sort().join("|")!==fields.slice().sort().join("|")||
    !Number.isSafeInteger(selector.runDayIndex)||selector.runDayIndex<1||selector.runDayIndex>31||
    !Number.isSafeInteger(selector.indexRevision)||selector.indexRevision<1||selector.indexRevision>1024||
    !Number.isSafeInteger(selector.shardIndex)||selector.shardIndex<1||selector.shardIndex>100000||
    !SHA.test(selector.indexSha256??"")||!SHA.test(selector.laterRegistrySha256??""))
  HOLD("EXACT_PRIVATE_SELECTOR_REQUIRED");
 if(!["postgres:","postgresql:"].includes(u.protocol)||!u.password||
    decodeURIComponent(u.username)!==trust.expectedReaderSessionLogin||
    u.username===w.username||u.pathname!=="/neondb"||w.pathname!=="/neondb"||
    !u.hostname.endsWith(".neon.tech")||
    u.hostname.replace(/-pooler(?=\.)/,"")!==w.hostname.replace(/-pooler(?=\.)/,"")||
    u.hash||(u.port&&u.port!=="5432")||
    u.searchParams.getAll("sslmode").length!==1||
    !["require","verify-full"].includes(u.searchParams.get("sslmode"))||
    [...u.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k))||
    (u.searchParams.has("channel_binding")&&(u.searchParams.getAll("channel_binding").length!==1||
      u.searchParams.get("channel_binding")!=="require")))
  HOLD("NOT_SEPARATE_RESTRICTED_TLS_READER_SAME_DB");
 const context={selector:Object.freeze(selector),trust,policy:Object.freeze({
  independentLaterQueueTransportProjectionApproved:true,existingPaidDispatchApproved:false,
  independentlyApprovedStandaloneProtocolSha256:gate.independentlyApprovedStandaloneProtocolSha256
 })};
 Object.defineProperty(context,"readerUrl",{value:env.P6_PRIVATE_READER_DATABASE_URL,enumerable:false});
 return Object.freeze(context);
}
/** Reuse the ORIGINAL roster verifier against the independently protected pin,
 * not the derived compatibility hash as its own approval. */
export function verifyP6PrivatePinnedProjection(projected,gate,selector){
 if(projected?.status!=="VERIFIED_PRIVATE_LATER_QUEUE_ROSTER_PROJECTION_NO_GO"||
    projected.day!==selector.runDayIndex||projected.revision!==selector.indexRevision||
    projected.shard!==selector.shardIndex||projected.signedIndexSha256!==selector.indexSha256||
    projected.signedLaterRegistrySha256!==selector.laterRegistrySha256||
    projected.databaseWrites!==0||projected.providerCalls!==0||projected.queueClaims!==0||
    projected.tasksEnqueued!==0||projected.phase6PaidGo!==false||
    projected.derivedCompatibilityRosterSha256!==gate.rosterSha256||
    !Buffer.isBuffer(projected.privateRosterBytes)||!Array.isArray(projected.privateEntries))
  HOLD("PROJECTION_NOT_MATCHED_TO_PROTECTED_ROSTER_PIN");
 let roster;
 try{roster=JSON.parse(projected.privateRosterBytes.toString("utf8"));}
 catch{HOLD("PRIVATE_ROSTER_INVALID_JSON");}
 const entries=projected.privateEntries;
 const packets=verifyP5CdFrozenRoster(projected.privateRosterBytes,roster,entries,gate);
 const out={packetCount:packets.size};
 Object.defineProperties(out,{rosterBytes:{value:projected.privateRosterBytes,enumerable:false},
  roster:{value:roster,enumerable:false},entries:{value:entries,enumerable:false},
  packets:{value:packets,enumerable:false}});
 return Object.freeze(out);
}
export async function readP6PrivatePinnedRosterForOriginalRunner(env,gate,writerUrl){
 const ctx=admitP6PrivateLaterPinnedRoster(env,gate,writerUrl);
 const c=new pg.Client({connectionString:ctx.readerUrl,connectionTimeoutMillis:8000,
  query_timeout:25000,application_name:"phase6_private_later_pinned_roster"});
 try{
  await c.connect();
  await c.query("SET ROLE phase6_private_frozen_reader_v39");
  const p=await readP6PrivateLaterQueueRoster({client:c,trust:ctx.trust,selector:ctx.selector,policy:ctx.policy});
  return verifyP6PrivatePinnedProjection(p,gate,ctx.selector);
 }finally{await c.end().catch(()=>{});}
}
