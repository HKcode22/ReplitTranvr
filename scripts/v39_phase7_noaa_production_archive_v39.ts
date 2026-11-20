/** Protected calendar-clock NOAA archive capture + independent review.
 * Uses existing JSON station decoders and exact original GitHub ZIP, no
 * paid provider, DB URLs, flight input, reference code storage or raw ADB.
 * Capture has no token or private signing key. Review has only existing
 * PRE-proof reviewer key, GitHub actions:read, public study pins.
 */
import {createPrivateKey,createHash} from "node:crypto";
import {mkdirSync,writeFileSync,readFileSync,appendFileSync,realpathSync} from "node:fs";
import {join} from "node:path";
import {execFileSync} from "node:child_process";
import {captureP7NoaaPublicSource,verifyP7NoaaArchive,issueP7NoaaArchiveWires,type P7NoaaCapture} from "../server/lib/disruption/phase7NoaaPublicArchive_v39";
import {readP7ProtectedNoaaPlans,publicP7WeatherStationGroups,P7_NOAA_PRODUCTION_WORKFLOW,P7_NOAA_PRODUCTION_RAW} from "../server/lib/disruption/phase7NoaaProductionArchivePlan_v39";
import {openP7NoaaGithubArchiveReader,validateP7ProductionNoaaRun,validateP7NoaaGithubArtifact,readP7NoaaZipMembers} from "../server/lib/disruption/phase7NoaaGithubArchiveReader_v39";
import {signP7PublicNoaaSnapshot,verifyP7PublicNoaaSnapshot} from "../server/lib/disruption/phase7NoaaProductionReviewedSnapshot_v39";
import type {P7SignedPublicNoaaArtifact} from "../server/lib/disruption/phase7IndependentNoaaReceipt_v39";
const e=process.env,repo="HKcode22/ReplitTranvr",N=/^[1-9][0-9]{4,24}$/,H=/^[a-f0-9]{64}$/;
const hold=(s:string):never=>{throw Error("HOLD_P7_NOAA_PRODUCTION_ARCHIVE_"+s)};
const at=(x:unknown)=>{if(typeof x!=="string"||!Number.isFinite(Date.parse(x))||new Date(Date.parse(x)).toISOString()!==x)return hold("CLOCK");return Date.parse(x)};
const exact=(x:unknown,k:string[])=>!!x&&typeof x==="object"&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(v=>Object.hasOwn(x,v));
const wait=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const sha=(x:Buffer)=>createHash("sha256").update(x).digest("hex");
function context(job:string){
 if(e.GITHUB_ACTIONS!=="true"||e.GITHUB_REPOSITORY!==repo||e.GITHUB_REF!=="refs/heads/main"||e.GITHUB_WORKFLOW_REF!==repo+"/"+P7_NOAA_PRODUCTION_WORKFLOW+"@refs/heads/main"||
  !["schedule","workflow_dispatch"].includes(e.GITHUB_EVENT_NAME??"")||e.GITHUB_RUN_ATTEMPT!=="1"||e.GITHUB_JOB!==job||!N.test(e.GITHUB_RUN_ID??"")||
  e.P6_NOAA_PUBLIC_ARCHIVE_ENABLED!=="1"||e.P6_PHASE7_NOAA_ARCHIVE_ISSUER_APPROVED!=="1"||e.ADB_AUTO_COLLECT!=="0"||e.V39_PHASE6_PROCESS_ARMED!=="0"||
  (e.GITHUB_EVENT_NAME==="workflow_dispatch"&&e.P7_NOAA_MANUAL_CONFIRM!=="ONE_PUBLIC_CALENDAR_NOAA_ARCHIVE_NO_PROVIDER")||
  [e.AERODATABOX_API_KEY,e.RAPIDAPI_KEY,e.AERODATABOX_WEBHOOK_SECRET,e.DATABASE_URL,e.V39_DATABASE_RUNTIME_URL,e.V39_P5_SOURCE_DATABASE_URL,e.P6_PRIVATE_READER_DATABASE_URL,e.P6_PRIVATE_PUBLISHER_DATABASE_URL,e.P5_V39_PRE_DATABASE_URL,e.P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_PRIVATE_KEY_BASE64,e.P6_PHASE7_POST_OUTCOME_PRIVATE_KEY_BASE64].some(Boolean))hold("PROTECTED_CONTEXT");
 if(execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8",timeout:5000,stdio:["ignore","pipe","ignore"]}).trim()!==e.GITHUB_SHA)hold("EXACT_CHECKOUT");
 const temp=e.RUNNER_TEMP??"";if(!temp||realpathSync(temp)!==temp)hold("RUNNER_SCRATCH");
 return {plans:readP7ProtectedNoaaPlans(e),temp};
}
async function capture(){
 const {plans,temp}=context("capture");
 if(e.GH_TOKEN||e.P6_PHASE7_PRE_PROOF_REVIEWER_PRIVATE_KEY_BASE64)hold("CAPTURE_NO_SIGNER_OR_TOKEN");
 const scopeAtUtc=new Date().toISOString(),scope=publicP7WeatherStationGroups(plans,scopeAtUtc);
 if(!e.GITHUB_OUTPUT)hold("STEP_OUTPUT");
 if(!scope.groups.length){appendFileSync(e.GITHUB_OUTPUT,"captured=0\n");console.log(JSON.stringify({status:"OUTSIDE_PUBLIC_WEATHER_PLAN_WINDOW_NO_REQUESTS",paidProviderCalls:0,databaseWrites:0}));return;}
 const dir=join(temp,"p7-noaa-production-raw");mkdirSync(dir,{mode:0o700});
 writeFileSync(join(dir,"index.json"),JSON.stringify({schema:"v39.phase7.noaa-production-archive-index.v1",githubRunId:e.GITHUB_RUN_ID,codeSha:e.GITHUB_SHA,scopeAtUtc,groups:scope.groups,runDayIndexes:scope.runDayIndexes}),{flag:"wx",mode:0o600});
 let metarRows=0,tafRows=0;
 for(const [i,stations] of scope.groups.entries()){
  if(i>0)await wait(1100);
  const m=await captureP7NoaaPublicSource("METAR",stations);await wait(1100);
  const t=await captureP7NoaaPublicSource("TAF",stations);
  const meta:P7NoaaCapture={schema:"v39.phase7.noaa-public-source-production.v1",githubRunId:e.GITHUB_RUN_ID!,codeSha:e.GITHUB_SHA!,sources:[m.receipt,t.receipt]};
  for(const [name,body] of [["capture.json",JSON.stringify(meta)],["metar.json",m.body],["taf.json",t.body]])writeFileSync(join(dir,"g"+i+"-"+name),body,{flag:"wx",mode:0o600});
  metarRows+=m.rowCount;tafRows+=t.rowCount;
 }
 appendFileSync(e.GITHUB_OUTPUT,"captured=1\n");
 console.log(JSON.stringify({status:"PUBLIC_NOAA_ARCHIVE_CAPTURED_AWAIT_INDEPENDENT_READBACK",publicStationCount:scope.groups.flat().length,groups:scope.groups.length,METAR:metarRows,TAF:tafRows,freePublicRequests:scope.groups.length*2,paidProviderCalls:0,databaseWrites:0}));
}
function readSigner(){
 const s=e.P6_PHASE7_PRE_PROOF_REVIEWER_PRIVATE_KEY_BASE64??"";if(s.length<4||s.length>12000||!(/^[A-Za-z0-9+/]+={0,2}$/).test(s))return hold("SIGNING_KEY");
 const b=Buffer.from(s,"base64");try{if(b.toString("base64")!==s)hold("SIGNING_KEY");return createPrivateKey(b)}finally{b.fill(0)}
}
async function review(){
 const {plans,temp}=context("review"),id=e.P7_NOAA_ARTIFACT_ID??"",digest=(e.P7_NOAA_ARTIFACT_DIGEST??"").replace(/^sha256:/,"");
 if(!N.test(id)||!H.test(digest)||!e.GH_TOKEN)hold("ARTIFACT_SCOPE");
 const gh=openP7NoaaGithubArchiveReader(e.GH_TOKEN),run=validateP7ProductionNoaaRun(await gh.run(e.GITHUB_RUN_ID!),e.GITHUB_SHA!,e.GITHUB_RUN_ID);
 const a=validateP7NoaaGithubArtifact(await gh.artifact(id),run,P7_NOAA_PRODUCTION_RAW,18000000,new Date().toISOString());
 if(String(a.id)!==id||a.digest!=="sha256:"+digest)hold("ARTIFACT_PIN");
 const archiveBytes=await gh.download(a,18000000);
 // Extract index without writing its path to disk. The bounded archive
 // membership is checked after group count is derived independently.
 // Determine the allowed member set by enumerating at most four valid
 // public groups, not by untrusted arbitrary ZIP names.
 let members:Record<string,string>|null=null;
 for(let n=1;n<=4;n++){
  const spec:Record<string,number>={"index.json":15000};
  for(let i=0;i<n;i++){spec["g"+i+"-capture.json"]=15000;spec["g"+i+"-metar.json"]=1000000;spec["g"+i+"-taf.json"]=1000000}
  try{members=readP7NoaaZipMembers(archiveBytes,spec);break}catch(err){if((err as Error)?.message!=="HOLD_P7_NOAA_GITHUB_ARCHIVE_EXACT_ZIP_MEMBERS")throw err}
 }
 if(!members)return hold("ARCHIVE_MEMBERS");
 const idx=JSON.parse(members["index.json"]),created=new Date(a.created_at).toISOString();
 if(!exact(idx,["schema","githubRunId","codeSha","scopeAtUtc","groups","runDayIndexes"])||idx.schema!=="v39.phase7.noaa-production-archive-index.v1"||idx.githubRunId!==e.GITHUB_RUN_ID||idx.codeSha!==e.GITHUB_SHA||
  at(idx.scopeAtUtc)<Date.parse(run.run_started_at)||at(idx.scopeAtUtc)>at(created)||at(created)-at(idx.scopeAtUtc)>12*60000)hold("ACTUAL_CAPTURE_CLOCK");
 const scope=publicP7WeatherStationGroups(plans,idx.scopeAtUtc);
 if(!scope.groups.length||JSON.stringify(scope.groups)!==JSON.stringify(idx.groups)||JSON.stringify(scope.runDayIndexes)!==JSON.stringify(idx.runDayIndexes)||Object.keys(members).length!==1+scope.groups.length*3)hold("EXACT_REVIEWED_PUBLIC_PLAN_SCOPE");
 const durableReadAtUtc=new Date().toISOString(),reviewedAtUtc=new Date().toISOString(),signer=readSigner(),wires:P7SignedPublicNoaaArtifact[]=[];
 for(const [i,stations] of scope.groups.entries()){
  const metar=members["g"+i+"-metar.json"],taf=members["g"+i+"-taf.json"],capture=JSON.parse(members["g"+i+"-capture.json"]);
  const verified=verifyP7NoaaArchive({capture,metar,taf,githubRunId:e.GITHUB_RUN_ID!,codeSha:e.GITHUB_SHA!,githubArtifactId:id,artifactDigest:digest,archiveBytes,artifactCreatedAtUtc:created,durableReadAtUtc,reviewedAtUtc,expectedProductionStations:stations});
  if(verified.sources.some(s=>at(s.fetchedAtUtc)<at(idx.scopeAtUtc)))hold("CAPTURE_BEFORE_SCOPE");
  wires.push(...issueP7NoaaArchiveWires({env:e,verified,metar,taf,signer}));
 }
 const snapshot=signP7PublicNoaaSnapshot(e,signer,{githubRunId:e.GITHUB_RUN_ID!,rawArtifactId:id,rawArchiveSha256:digest,scopeAtUtc:idx.scopeAtUtc,reviewedAtUtc,groups:scope.groups,wires});
 const v=verifyP7PublicNoaaSnapshot(e,snapshot),out=join(temp,"p7-noaa-production-reviewed");mkdirSync(out,{mode:0o700});
 writeFileSync(join(out,"reviewed.json"),JSON.stringify(snapshot),{flag:"wx",mode:0o600});
 console.log(JSON.stringify({status:"PUBLIC_NOAA_ARCHIVE_INDEPENDENT_SIGNED_SNAPSHOT_READY_FOR_UPLOAD",stationCount:v.stationCount,receiptCount:v.wires.length,snapshotSha256:v.snapshotSha256,paidProviderCalls:0,databaseWrites:0,phase6PaidGo:false}));
}
Promise.resolve().then(()=>process.argv[2]==="capture"?capture():process.argv[2]==="review"?review():hold("MODE")).catch(err=>{const m=String(err?.message??"");console.error(/^HOLD_P7_[A-Z0-9_]+$/.test(m)?m:"HOLD_P7_NOAA_PRODUCTION_ARCHIVE_REDACTED");process.exitCode=2});
