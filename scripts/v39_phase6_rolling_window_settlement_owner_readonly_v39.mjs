/** Owner-side, no-provider, read-only diagnostic. Authenticate the exact
 * independent GitHub readback artifact, then join to the existing actual
 * owner database's V0102/V0079/V0082/V0083 metadata. No close or replay.
 */
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {unpackP6ControllerArtifactArchive} from "./v39_phase6_rolling_window_terminal_readback_v39.mjs";
import {readP6RestLedgerAccounting} from "../server/lib/disruption/phase6RollingRestSettlementReadback_v39.mjs";
const REPO="HKcode22/ReplitTranvr",WF=".github/workflows/phase6-autonomous-gh-controller-heartbeat-no-provider.yml";
const JOB="actual-main-nonpaid-controller-heartbeat",STEPS=["Read only GH workflow-run history for nine existing controllers","Preserve independent exact window readback (operational metadata only)"];
const ID=x=>Number.isSafeInteger(x)&&x>0&&x<1e15,CODE=/^[a-f0-9]{40}$/,HASH=/^[a-f0-9]{64}$/;
const hold=s=>{throw Error("HOLD_P6_OWNER_SETTLEMENT_"+s);};
const digest=b=>createHash("sha256").update(b).digest("hex");
function exactScope(x){
 if(!x||!ID(x.runId)||!CODE.test(x.readerMainSha??"")||!HASH.test(x.manifestSha256??""))hold("SCOPE");
 return x;
}
function complete(x,key,max){
 if(!Number.isSafeInteger(x?.total_count)||x.total_count<0||x.total_count>max||!Array.isArray(x[key])||x[key].length!==x.total_count)hold("INCOMPLETE_HISTORY");
 return x[key];
}
export async function readP6IndependentOwnerHandoff(input,{get,readArchive}){
 const s=exactScope(input);
 if(typeof get!=="function"||typeof readArchive!=="function")hold("READER");
 if((await get("/git/ref/heads/main"))?.object?.sha!==s.readerMainSha)hold("MAIN_CHANGED");
 const run=await get("/actions/runs/"+s.runId);
 if(run?.id!==s.runId||run.path!==WF||run.head_branch!=="main"||run.head_sha!==s.readerMainSha||
  run.event!=="workflow_dispatch"||run.run_attempt!==1||run.status!=="completed"||run.conclusion!=="success")hold("READER_RUN_IDENTITY");
 const jobs=complete(await get("/actions/runs/"+s.runId+"/jobs?filter=latest&per_page=100"),"jobs",100);
 if(new Set(jobs.map(j=>j.id)).size!==jobs.length||jobs.some(j=>!ID(j.id)||j.run_id!==s.runId||j.head_sha!==s.readerMainSha||j.run_attempt!==1||j.status!=="completed"))hold("READER_JOB_IDENTITY");
 const matching=jobs.filter(j=>j.name===JOB);
 if(matching.length!==1||matching[0].conclusion!=="success")hold("READER_REQUIRED_JOB");
 for(const name of STEPS){
  const steps=matching[0].steps?.filter(x=>x.name===name)??[];
  if(steps.length!==1||steps[0].status!=="completed"||steps[0].conclusion!=="success")hold("READER_REQUIRED_STEP");
 }
 const name="p6-independent-window-readback-"+s.runId;
 async function metadata(){
  const ar=complete(await get("/actions/runs/"+s.runId+"/artifacts?per_page=100"),"artifacts",100);
  if(ar.length!==1||ar[0].name!==name||ar[0].expired!==false||!ID(ar[0].id)||
   !Number.isSafeInteger(ar[0].size_in_bytes)||ar[0].size_in_bytes<1||ar[0].size_in_bytes>262144||
   (ar[0].workflow_run&&Number(ar[0].workflow_run.id)!==s.runId)||!/^sha256:[a-f0-9]{64}$/.test(ar[0].digest??""))hold("READER_ARTIFACT_METADATA");
  return {id:ar[0].id,size:ar[0].size_in_bytes,digest:ar[0].digest};
 }
 const before=await metadata(),archive=await readArchive(before.id);
 const bytes=unpackP6ControllerArtifactArchive(archive,before,"INDEPENDENT"),after=await metadata();
 if(JSON.stringify(before)!==JSON.stringify(after))hold("READER_ARTIFACT_CHANGED");
 let e;try{e=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));}catch{hold("READER_RECEIPT_BYTES");}
 if(!e||e.status!=="INDEPENDENT_WINDOW_OPERATIONAL_CHAIN_VERIFIED_NOT_SETTLEMENT_NOT_GO"||
   e.reviewedReaderMainSha!==s.readerMainSha||!ID(e.rootRunId)||!ID(e.terminalRunId)||!CODE.test(e.reviewedMainSha??"")||
   !HASH.test(e.terminalReceiptSha256??"")||!HASH.test(e.policyCommitment??"")||
   e.completeOperationalChainVerified!==true||e.controllerOwnedChildJobsVerified!==true||
   e.archiveDigestIndependentlyVerified!==true||e.artifactMetadataBeforeAfterBound!==true||
   e.independentScheduledOrManualChildrenCovered!==false||
   e.providerSettlementVerified!==false||e.permitClose!==false||e.permitNewRoot!==false||e.permitReplay!==false||
   e.providerCalls!==0||e.databaseWrites!==0||e.dispatchCount!==0||e.phase6PaidGo!==false||
   !Array.isArray(e.controllerRunIds)||!e.controllerRunIds.length||e.controllerRunIds.length>4||
   e.controllerRunIds[0]!==e.rootRunId||e.controllerRunIds.at(-1)!==e.terminalRunId||
   e.controllerRunIds.some(id=>!ID(id)||id===s.runId)||new Set(e.controllerRunIds).size!==e.controllerRunIds.length||
   !Array.isArray(e.paidCapableChildRuns)||e.paidCapableChildRuns.length!==e.independentlyVerifiedPaidCapableChildJobs||
   e.paidCapableChildRuns.length>384||e.paidCapableChildRuns.some(x=>x?.runId===s.runId||e.controllerRunIds.includes(x?.runId))||
   !e.recordedWindowCustody)hold("READER_RECEIPT_IDENTITY");
 if((await get("/git/ref/heads/main"))?.object?.sha!==s.readerMainSha)hold("MAIN_CHANGED");
 return {evidence:e,readbackRunId:s.runId,artifactId:before.id,receiptSha256:digest(bytes)};
}
export async function inspectP6OwnerSettlement(input,{get,readArchive,client,readLedger=readP6RestLedgerAccounting}){
 const s=exactScope(input),r=await readP6IndependentOwnerHandoff(s,{get,readArchive});
 const e=r.evidence,scope={manifestSha256:s.manifestSha256,epochUtc:e.epochUtc,chainDeadlineUtc:e.chainDeadlineUtc,paidCapableChildRuns:e.paidCapableChildRuns};
 const out=await readLedger(scope,client,{rootEvidence:e});
 if(!out||out.status!=="READONLY_RESERVATION_AND_ORIGINAL_METADATA_NOT_PROVIDER_SETTLEMENT"||out.actualDbClock!==true||
   out.readOnlyRepeatableRead!==true||out.rootCustody?.actualDbOwnershipMetadataMatched!==true||out.rootCustody.rootRunId!==e.rootRunId||
   out.providerSettlementVerified!==false||out.permitClose!==false||out.permitNewRoot!==false||out.permitReplay!==false||
   out.providerCalls!==0||out.databaseWrites!==0||out.phase6PaidGo!==false)hold("DB_RECEIPT_IDENTITY");
 if((await get("/git/ref/heads/main"))?.object?.sha!==s.readerMainSha)hold("MAIN_CHANGED_AFTER_DATABASE_READ");
 return {...out,independentGithubReadbackArtifactVerified:true,readbackRunId:r.readbackRunId,
  readbackArtifactId:r.artifactId,independentReadbackReceiptSha256:r.receiptSha256,
  rootRunId:e.rootRunId,terminalRunId:e.terminalRunId,reviewedReaderMainSha:s.readerMainSha,reviewedWindowCodeSha:e.reviewedMainSha};
}
export function ownerSettlementConnection(raw,env){
 let u,user,password;
 try{u=new URL(raw);user=decodeURIComponent(u.username);password=decodeURIComponent(u.password);}catch{hold("OWNER_TLS_URL");}
 if(!["postgres:","postgresql:"].includes(u.protocol)||user!=="neondb_owner"||!password||!u.hostname.endsWith(".neon.tech")||
   u.pathname!=="/neondb"||u.hash||(u.port&&u.port!=="5432")||u.searchParams.getAll("sslmode").length!==1||
   !["require","verify-full"].includes(u.searchParams.get("sslmode"))||
   [...u.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k))||
   (u.searchParams.has("channel_binding")&&(u.searchParams.getAll("channel_binding").length!==1||u.searchParams.get("channel_binding")!=="require"))||
   env.NODE_TLS_REJECT_UNAUTHORIZED==="0")hold("OWNER_TLS_URL");
 return {host:u.hostname,port:5432,database:"neondb",user,password,ssl:{rejectUnauthorized:true},enableChannelBinding:true,
  connectionTimeoutMillis:8000,query_timeout:20000,application_name:"p6_owner_rolling_settlement_readonly"};
}
async function main(){
 if(process.argv.length!==5||!/^\d{5,15}$/.test(process.argv[2]??"")||
   process.env.GITHUB_ACTIONS==="true"||process.env.ADB_AUTO_COLLECT!=="0"||process.env.V39_PHASE6_PROCESS_ARMED!=="0"||
   process.env.V39_PHASE6_OWNER_APPROVED!=="0"||["AERODATABOX_API_KEY","RAPIDAPI_KEY","AERODATABOX_WEBHOOK_SECRET","V39_DATABASE_RUNTIME_URL"].some(k=>process.env[k]))
  hold("OWNER_READONLY_LOCAL_ENTRYPOINT");
 const input=exactScope({runId:Number(process.argv[2]),readerMainSha:process.argv[3],manifestSha256:process.argv[4]});
 const safeEnv={PATH:process.env.PATH,HOME:process.env.HOME,GH_PROMPT_DISABLED:"1",
  ...(process.env.GH_TOKEN?{GH_TOKEN:process.env.GH_TOKEN}:{})};
 const run=(cmd,args,maxBuffer=524288)=>execFileSync(cmd,args,{env:safeEnv,timeout:30000,maxBuffer,stdio:["ignore","pipe","ignore"]});
 if(run("git",["rev-parse","HEAD"]).toString().trim()!==input.readerMainSha||
   run("git",["status","--porcelain","--untracked-files=no"]).toString().trim())hold("REVIEWED_CHECKOUT");
 const api=path=>run("gh",["api","--hostname","github.com","--method","GET","repos/"+REPO+path]);
 const get=async path=>JSON.parse(api(path).toString("utf8"));
 const readArchive=async id=>{if(!ID(id))hold("READER_ARTIFACT_ID");return api("/actions/artifacts/"+id+"/zip");};
 const pg=(await import("pg")).default,client=new pg.Client(ownerSettlementConnection(process.env.DATABASE_URL,process.env));
 try{await client.connect();console.log(JSON.stringify(await inspectP6OwnerSettlement(input,{get,readArchive,client})));}
 finally{await client.end().catch(()=>{});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(e=>{const m=e?.message??"";console.error(/^HOLD_P6_(OWNER_SETTLEMENT|REST_SETTLEMENT|WINDOW_READBACK)_[A-Z0-9_]+$/.test(m)?m:"HOLD_P6_OWNER_SETTLEMENT_REDACTED_READONLY");process.exitCode=2;});
}
