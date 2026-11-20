/** Dedicated completion-event recovery. Separate issuer/publication/settlement
 * processes, private bounded runner-local signed receipt only. Never POST replay.
 * No private source bytes or signed receipt emitted to stdout or an artifact.
 */
import {createPrivateKey} from "node:crypto";
import {lstatSync,readFileSync,writeFileSync,realpathSync,unlinkSync} from "node:fs";
import {join,resolve} from "node:path";
import {admitP7StoredPostRecovery,discoverP7WorkflowRunRecoverySelector,prepareP7RecoveryReceiptFromOriginal,executeP7StoredPostRecovery,type P7RecoverySelector} from "../server/lib/disruption/phase7StoredPostRecoveryAdmission_v39";
import {p7ReviewPath,publishP7RecoveryWireFromProtectedEnv,type P7ReviewSelector} from "../server/lib/disruption/phase7PrivateSignedReviewTransport_v39";
const e=process.env;
const hold=(s:string):never=>{throw Error("HOLD_P7_RECOVERY_"+s)};
function n(s:string|undefined,max:number){
 if(!/^[1-9][0-9]{0,5}$/.test(s??"")||Number(s)>max)return hold("SELECTOR");
 return Number(s);
}
function workfile(){
 if(e.GITHUB_ACTIONS!=="true"||e.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||e.GITHUB_REF!=="refs/heads/main"||
  e.GITHUB_RUN_ATTEMPT!=="1"||!/^[1-9][0-9]{4,14}$/.test(e.GITHUB_RUN_ID??"")||
  e.P6_PHASE7_POST_RECOVERY_CONFIRM!=="RECOVER_EXACT_COMMITTED_POST_NO_PROVIDER"||
  !e.RUNNER_TEMP||resolve(e.RUNNER_TEMP)!==realpathSync(e.RUNNER_TEMP))return hold("PRIVATE_RUNNER_SCOPE");
 return join(e.RUNNER_TEMP,"p7-recovery-"+e.GITHUB_RUN_ID+".json");
}
async function selector(env:NodeJS.ProcessEnv):Promise<P7RecoverySelector>{
 if(env.GITHUB_EVENT_NAME==="workflow_run"){
  if([env.P6_PRIVATE_POST_DAY,env.P6_PRIVATE_POST_REVISION,env.P6_PRIVATE_POST_INDEX_SHA,env.P6_PRIVATE_POST_SHARD,env.P6_PRIVATE_POST_PACKET_SHA,env.P6_PRIVATE_POST_ROUTE_SHA].some(Boolean))hold("MIXED_MODE");
  return discoverP7WorkflowRunRecoverySelector(env,env.P6_PHASE7_ORIGINAL_POST_RUN_ID??"");
 }
 if(env.GITHUB_EVENT_NAME!=="workflow_dispatch")return hold("EVENT");
 return {runDayIndex:n(env.P6_PRIVATE_POST_DAY,31),indexRevision:n(env.P6_PRIVATE_POST_REVISION,1024),
  indexSha256:env.P6_PRIVATE_POST_INDEX_SHA??"",shardIndex:n(env.P6_PRIVATE_POST_SHARD,100000),
  packetSha256:env.P6_PRIVATE_POST_PACKET_SHA??"",routingIntentSha256:env.P6_PRIVATE_POST_ROUTE_SHA??"",originalGithubRunId:env.P6_PHASE7_ORIGINAL_POST_RUN_ID??""};
}
type Work={schema:"v39.phase7.recovery-runner-wire.v1";runId:string;selector:P7RecoverySelector;reviewSelector:P7ReviewSelector;wire:unknown;existing:boolean};
function load(file:string):Work{
 const x=lstatSync(file);
 if(!x.isFile()||x.isSymbolicLink()||x.uid!==process.getuid?.()||x.nlink!==1||(x.mode&0o077)!==0||x.size<100||x.size>14000)return hold("PRIVATE_HANDOFF_FILE");
 const w=JSON.parse(readFileSync(file,"utf8")) as Work;
 if(!w||Object.keys(w).sort().join("|")!=="existing|reviewSelector|runId|schema|selector|wire"||
  w.schema!=="v39.phase7.recovery-runner-wire.v1"||w.runId!==e.GITHUB_RUN_ID||
  w.selector?.originalGithubRunId!==e.P6_PHASE7_ORIGINAL_POST_RUN_ID||w.reviewSelector?.kind!=="POST_RECOVERY"||
  w.reviewSelector.runDayIndex!==w.selector.runDayIndex||typeof w.existing!=="boolean")hold("PRIVATE_HANDOFF_SCOPE");
 p7ReviewPath(w.reviewSelector);
 return w;
}
async function main(){
 const file=workfile(),mode=process.argv[2];
 if(process.argv.length!==3||!["issue","publish","settle","cleanup"].includes(mode))hold("MODE");
 if(mode==="cleanup"){
  try{unlinkSync(file)}catch(err){if((err as NodeJS.ErrnoException).code!=="ENOENT")throw err}
  return;
 }
 if(mode==="issue"){
  const raw=e.P6_PHASE7_POST_OUTCOME_PRIVATE_KEY_BASE64;
  if(!raw||raw.length>6000||!(/^[A-Za-z0-9+/]+={0,2}$/).test(raw))return hold("SIGNER_REQUIRED");
  const bytes=Buffer.from(raw,"base64");
  if(bytes.toString("base64")!==raw||!bytes.toString("utf8").startsWith("-----BEGIN PRIVATE KEY-----"))return hold("SIGNER_ENCODING");
  const key=createPrivateKey(bytes);
  // Actual original admission does not receive a signer credential. The
  // separately approved independent issuer receives a KeyObject only.
  const env={...e};delete env.P6_PHASE7_POST_OUTCOME_PRIVATE_KEY_BASE64;
  if(env.P6_PRIVATE_PUBLISHER_DATABASE_URL||env.P6_PHASE7_POST_BUNDLE_WRITER_DATABASE_URL)hold("ISSUER_WRITE_SCOPE");
  const sel=await selector(env);
  const v=await prepareP7RecoveryReceiptFromOriginal(env,sel,key);
  const w:Work={schema:"v39.phase7.recovery-runner-wire.v1",runId:e.GITHUB_RUN_ID!,selector:sel,reviewSelector:v.selector,wire:v.wire,existing:v.existing};
  writeFileSync(file,JSON.stringify(w),{flag:"wx",mode:0o600});
  console.log(JSON.stringify({status:v.existing?"P7_EXISTING_RECOVERY_RECEIPT_INDEPENDENTLY_VERIFIED":"P7_NEW_RECOVERY_RECEIPT_FROM_ACTUAL_ORIGINAL_NO_GO",providerCalls:0,paidReservations:0}));
  return;
 }
 if(e.P6_PHASE7_POST_OUTCOME_PRIVATE_KEY_BASE64)hold("SIGNER_FORBIDDEN");
 const w=load(file);
 if(mode==="publish"){
  // This purpose-specific publisher may not use settlement credentials.
  console.log(JSON.stringify(await publishP7RecoveryWireFromProtectedEnv(e,w.reviewSelector,w.wire,w.existing)));
  return;
 }
 admitP7StoredPostRecovery(e,w.selector);
 console.log(JSON.stringify(await executeP7StoredPostRecovery(e,w.selector)));
}
main().catch(err=>{const s=String(err?.message??"");console.error(/^HOLD_P7_[A-Z0-9_]+$/.test(s)?s:"HOLD_P7_RECOVERY_REDACTED_NO_PAID_REPLAY");process.exitCode=2});
