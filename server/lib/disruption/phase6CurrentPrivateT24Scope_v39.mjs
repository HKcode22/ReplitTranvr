/** No caller-supplied roster SHA is authority. A genuine restricted reader
 * authenticates exact signed T24 registry, SOURCE and packet bytes; only
 * then does the original Stage14/V0081 worker get its singleton digest.
 * No mutation of process.env and no authority survives callback exit. */
import {AsyncLocalStorage} from "node:async_hooks";
import {createHash} from "node:crypto";
import {sameP6NeonDatabaseEndpoint} from "./phase6SameNeonEndpoint_v39.ts";
const storage=new AsyncLocalStorage(),hold=s=>{throw Error("HOLD_P6_CURRENT_T24_SCOPE_"+s);};
const H=/^[a-f0-9]{64}$/;
const digest=b=>createHash("sha256").update(b).digest("hex");
export function assertP6CurrentPrivateT24Mode(env){
 if(env.P5_CD_GH_PRIVATE_T24_MODE!=="PRIVATE_CURRENT_T24_SCHEDULE"||
    env.P5_CD_GH_PRIVATE_CURRENT_T24_APPROVED!=="1"||env.P6_PRIVATE_CURRENT_T24_SCHEDULE_ENABLED!=="1"||
    env.P6_PRIVATE_T24_ENROLL_ENABLED!=="1"||env.P6_PRIVATE_T24_ENROLL_SCHEDULE_ENABLED!=="1"||env.GITHUB_EVENT_NAME!=="schedule"||
    env.P5_CD_GH_PRE_MODE!=="PHASE6_APPROVED"||env.V39_PHASE5_FREEZE_SIGNED!=="1"||env.V39_PHASE6_PROCESS_ARMED!=="1"||
    env.P5_CD_GH_PRE_STOP!=="0"||env.P5_CD_GH_PRE_APPROVED_CODE_SHA!==env.GITHUB_SHA||
    env.P5_CD_GH_PRE_ROSTER_SHA256||env.P5_CD_GH_PRE_ROSTER_PATH||env.P5_CD_GH_ROSTER_PATH||
    env.P5_CD_GH_PRIVATE_LATER_MODE||env.P5_CD_GH_PRIVATE_CURRENT_APPROVED==="1"||env.P5_CD_GH_PRIVATE_LATER_APPROVED==="1"||
    env.P5_CD_GH_T24_SCHEDULE_ENABLED==="1"||env.P5_T24_AUTO_DISPATCH_ENABLED==="true"||
    env.P6_T24_CUSTODY_ENABLED!=="1"||env.P6_T24_CUSTODY_APPROVED!=="1"||
    env.AERODATABOX_API_KEY||env.RAPIDAPI_KEY||env.AERODATABOX_WEBHOOK_SECRET||env.P6_PRIVATE_LATER_REVIEWER_KEY_BASE64||
    env.P6_PRIVATE_DAY_REVIEWER_KEY_BASE64||env.P5_V39_PREPARE_DATABASE_URL||
    !env.P6_PRIVATE_READER_DATABASE_URL||!env.P6_PRIVATE_PUBLISHER_DATABASE_URL)
  hold("SEPARATE_CURRENT_T24_RELEASE_NO_LEGACY_MODE");
 let reader,pre;
 try{reader=new URL(env.P6_PRIVATE_READER_DATABASE_URL);pre=new URL(env.P5_V39_PRE_DATABASE_URL);}catch{hold("MISSING_RESTRICTED_URL");}
 if(!sameP6NeonDatabaseEndpoint(reader,pre)||reader.username===pre.username||!reader.password||
    reader.searchParams.getAll("sslmode").length!==1||reader.searchParams.get("sslmode")!=="require"||
    [...reader.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k))||
    (reader.searchParams.has("channel_binding")&&(reader.searchParams.getAll("channel_binding").length!==1||reader.searchParams.get("channel_binding")!=="require")))
  hold("WRONG_SEPARATE_READER_ENDPOINT");
}
const scopeKeys=["P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64","P6_NONPAID_DAILY_POLICY_BASE64","P6_NONPAID_DAILY_POLICY_SHA256",
 "P6_PRIVATE_READER_DATABASE_URL","P6_PRIVATE_PUBLISHER_DATABASE_URL","P5_V39_PRE_DATABASE_URL","P5_V39_T24_WITNESS_DATABASE_URL",
 "P6_PRIVATE_T24_CUSTODY_REVIEWER_KEY_BASE64","GITHUB_SHA","P5_CD_GH_PRE_APPROVED_CODE_SHA"];
const envWire=env=>scopeKeys.map(k=>env[k]??"");
export function readP6ScopedCurrentT24RosterDigest(env){
 assertP6CurrentPrivateT24Mode(env);
 const x=storage.getStore();
 if(!x?.active||!H.test(x.digest)||JSON.stringify(x.envWire)!==JSON.stringify(envWire(env)))hold("NO_AUTHENTICATED_T24_SINGLETON");
 return x.digest;
}
export async function withP6AuthenticatedCurrentT24Roster({client,env,runDayIndex,registrySha256,packetSha256,expectedDigest},work){
 assertP6CurrentPrivateT24Mode(env);
 if(storage.getStore()?.active||typeof work!=="function"||!Number.isSafeInteger(runDayIndex)||runDayIndex<1||runDayIndex>31||
    !H.test(registrySha256??"")||!H.test(packetSha256??"")||(expectedDigest!==undefined&&!H.test(expectedDigest)))hold("BAD_AUTHENTICATED_T24_REQUEST");
 const routing=await import("./phase6PrivateT24QueueRouting_v39.mjs");
 const {readP6T24ProtectedQueueTrust}=await import("../../../scripts/v39_phase6_private_t24_restartable_enrollment_v39.mjs");
 const {readP6T24PrivateRegistryPackets}=await import("./phase6PrivateT24RegistryTransport_v39.mjs");
 const trust=readP6T24ProtectedQueueTrust(env);
 if(decodeURIComponent(new URL(env.P6_PRIVATE_READER_DATABASE_URL).username)!==trust.expectedReaderSessionLogin)hold("WRONG_READER_LOGIN");
 const p=await readP6T24PrivateRegistryPackets({client,trust,runDayIndex,registrySha256});
 const selected=routing.projectP6T24QueuePackets(p,trust,"ENROLLMENT").filter(x=>x.entry.packetSha256===packetSha256);
 if(!selected.length&&p.privateRegistry.entries.some(e=>e.packetSha256===packetSha256&&Date.parse(e.cutoffUtc)<=Date.parse(p.observedDbClockUtc)+2000))hold("CUTOFF_ALREADY_PASSED");
 if(selected.length!==1)hold("T24_SINGLETON_NOT_FOUND");
 const q=selected[0],x={raw:q.rosterBytes,roster:q.roster,files:q.files,digest:q.rosterSha256};
 if(p.runDayIndex!==runDayIndex||p.registrySha256!==registrySha256||x.files.length!==1||digest(x.raw)!==x.digest||
    (expectedDigest!==undefined&&expectedDigest!==x.digest))hold("CHANGED_T24_SINGLETON");
 const ctx={active:true,digest:x.digest,envWire:envWire(env)};
 return storage.run(ctx,async()=>{
  try{readP6ScopedCurrentT24RosterDigest(env);return await work(x);}
  finally{ctx.active=false;}
 });
}
