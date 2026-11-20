/** Owner-local exact static runtime rebind preparation. No DB, provider, GitHub
 * mutation, approval or signer access. Never publish private stage/package bytes. */
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {lstatSync,readFileSync,realpathSync,mkdirSync,writeFileSync} from "node:fs";
import {resolve,dirname,join,relative,isAbsolute} from "node:path";
import {fileURLToPath} from "node:url";
import {compileP6ActualCandidateExport} from "../scripts/v39_phase6_actual_release_candidate_export_v39";
const BASE="0a7b1a28f243de76d4c83026d15f585265ef6f7b";
const SHA={
 stage:"6d06cd56f3cf09b7d4f5a6033b70f253e6247a9e1b27dbb839b0080a66e771fc",
 manifest:"3a0e3667dbbd3eb9bc101618b1858755d3814f4676d61f1487586463c6d91ba7",
 calendar:"9ee062ab6d82de8b3949f88ba390d4bcb9121890be592797ec0b4c498ff289a6",
 config:"001a3f0634cc41b8d1327be36404efa74feaaea21fe4ef6eead7e993acaf4c88",
 cost:"a3d3525a890bfe542f9588b18d3b5d9367ba657ccae2c1c0401edc625ac46124"};
const H=/^[a-f0-9]{64}$/;
const sha=(v:string|Buffer)=>createHash("sha256").update(v).digest("hex");
const hold=(s:string):never=>{throw Error("HOLD_P6_PLAN_REBIND_"+s)};
const need=(ok:unknown,s:string)=>{if(!ok)hold(s)};
const cmd=(c:string,args:string[])=>execFileSync(c,args,{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:20000,maxBuffer:4*1024*1024}).trim();
const live=()=>cmd("gh",["api","repos/HKcode22/ReplitTranvr/git/ref/heads/main","--jq",".object.sha"]);
const outside=(root:string,p:string)=>{const r=relative(root,p);return r===".."||r.startsWith("../")||isAbsolute(r)};
function privateDir(p:string){const s=lstatSync(p);need(s.isDirectory()&&!s.isSymbolicLink()&&s.uid===process.getuid?.()&&(s.mode&0o077)===0,"PRIVATE_DIR");return realpathSync(p)}
function read(d:string,name:string,max:number){const p=join(d,name),s=lstatSync(p);need(s.isFile()&&!s.isSymbolicLink()&&s.uid===process.getuid?.()&&s.nlink===1&&(s.mode&0o077)===0&&s.size>0&&s.size<=max,"PRIVATE_FILE");const raw=readFileSync(p);const x=JSON.parse(raw.toString("utf8"));need(Buffer.from(JSON.stringify(x)).equals(raw),"CANONICAL_JSON");return {raw,x}}
type Exported=ReturnType<typeof compileP6ActualCandidateExport>;
export function verifyRuntimePlans(result:Exported,stageRaw:string,readCommitted:(p:string)=>Buffer){
 const sum=result.summary;
 need(sha(stageRaw)===SHA.stage&&sum.unsignedStageInputSha256===SHA.stage&&sum.unsignedCostOnlyEnvelopeSha256===SHA.cost&&sum.sourceQueries===6144&&sum.totalReservedUnits===36740&&sum.peakDailyUnits===1280,"EXACT_REVISED_EXPORT");
 need(result.files.length===32&&sum.dayPlanSha256s.length===31,"PLAN_COUNT");
 const diffs:{runDayIndex:number;oldSha256:string;newSha256:string;changed:boolean}[]=[];
 let count=0;
 for(let i=0;i<31;i++){
  const f=result.files[i],d=sum.dayPlanSha256s[i];
  const expected="data-collection/phase5/planning/phase6-source-day-"+String(i+1).padStart(2,"0")+".json";
  need(f.path===expected&&d.runDayIndex===i+1&&d.sha256===f.sha256&&sha(f.bytes)===f.sha256,"DAY_PLAN_IDENTITY");
  const oldRaw=readCommitted(expected),old=JSON.parse(oldRaw.toString("utf8")),next=JSON.parse(f.bytes);
  need(old.runDayIndex===i+1&&next.runDayIndex===i+1&&Array.isArray(old.templates)&&Array.isArray(next.templates)&&old.templates.length===next.templates.length,"DAY_TEMPLATE_COUNT");
  need(JSON.stringify(old.pairedIcaos)===JSON.stringify(next.pairedIcaos)&&old.expectedDrawType===next.expectedDrawType,"SAMPLING_IDENTITY_DRIFT");
  const expectedTime=i===0?Date.parse(old.expectedServiceStartUtc)+86400000:Date.parse(old.expectedServiceStartUtc);
  need(Number.isFinite(expectedTime)&&Date.parse(next.expectedServiceStartUtc)===expectedTime,"PROSPECTIVE_START_DRIFT");
  // The revised plan may update evidence hashes globally, but the sampler,
  // horizons, query keys and per-template price/attempt units cannot drift.
  for(let j=0;j<next.templates.length;j++){
   const a=old.templates[j],b=next.templates[j];
   for(const k of ["queryKey","runDayIndex","slot","horizon","providerQueryDirection","apiUnitsPerAttempt","maxAttempts","maxResponseAndPersistSeconds"])need(a[k]===b[k],"QUERY_IDENTITY_DRIFT");
   for(const k of ["budgetDayUtc","physicalChargeDayUtc","serviceWindowStartUtc","serviceWindowEndUtc","earliestPlannedCutoffUtc","scheduledRequestUtc"])need(Date.parse(b[k])===Date.parse(a[k])+(i===0?86400000:0),"QUERY_CLOCK_DRIFT");
  }
  count+=next.templates.length;diffs.push({runDayIndex:i+1,oldSha256:sha(oldRaw),newSha256:f.sha256,changed:!oldRaw.equals(Buffer.from(f.bytes))});
 }
 const final=result.files[31];
 need(count===6144&&final.path==="unsigned-stage-input.json"&&final.bytes===stageRaw&&sha(final.bytes)===SHA.stage,"STAGE_OR_TOTAL_MISMATCH");
 return diffs;
}
function main(){
 const [mode,revisionDir,outDir]=process.argv.slice(2);
 need(mode==="--prepare-private"&&process.argv.length===5&&process.env.GITHUB_ACTIONS!=="true"&&process.env.ADB_AUTO_COLLECT==="0"&&process.env.V39_PHASE6_PROCESS_ARMED==="0"&&process.env.V39_PHASE6_OWNER_APPROVED==="0"&&!["AERODATABOX_API_KEY","RAPIDAPI_KEY","AERODATABOX_WEBHOOK_SECRET","DATABASE_URL","V39_DATABASE_RUNTIME_URL"].some(k=>process.env[k]),"NO_PROVIDER_OR_DB");
 const root=realpathSync(process.cwd()),head=cmd("git",["rev-parse","HEAD"]);
 need(root===realpathSync(cmd("git",["rev-parse","--show-toplevel"]))&&head===BASE&&live()===BASE&&cmd("git",["status","--porcelain","--untracked-files=no"])==="","EXACT_BASE");
 const d=privateDir(revisionDir),out=resolve(outDir);
 need(outside(root,d)&&outside(root,out)&&realpathSync(dirname(out))===dirname(out),"PRIVATE_OUTSIDE_CHECKOUT");
 const stage=read(d,"new-stage-input.json",48000),manifest=read(d,"new-manifest.json",2000000),config=read(d,"new-config.json",2000000),external=read(d,"new-external.json",100000),timing=read(d,"new-timing.json",10000);
 need(sha(stage.raw)===SHA.stage&&sha(manifest.raw)===SHA.manifest&&sha(config.raw)===SHA.config&&stage.x.codeSha40===BASE&&stage.x.manifestSha256===SHA.manifest&&stage.x.calendarSha256===SHA.calendar&&stage.x.configSha256===SHA.config&&H.test(stage.x.frameSha256??""),"PRIVATE_EXACT_REVISION");
 const result=compileP6ActualCandidateExport({externalBytes:external.raw,expectedExternalFileSha256:sha(external.raw),timingBytes:timing.raw,expectedTimingFileSha256:sha(timing.raw),calendarVariant:"COMPACT_NOV22"});
 const differences=verifyRuntimePlans(result,stage.raw.toString("utf8"),p=>execFileSync("git",["show",BASE+":"+p],{stdio:["ignore","pipe","ignore"],timeout:15000,maxBuffer:600000}));
 // Only exact known revised static input bytes, not a complete installation bundle.
 const staticCandidates={V39_P5_MANIFEST_SHA256:SHA.manifest,V39_P5_CALENDAR_HASH:SHA.calendar,V39_P5_CONFIG_HASH:SHA.config,V39_P5_FRAME_HASH:stage.x.frameSha256,V39_P5_POST_CATEGORY_BUDGET_SHA256:SHA.cost,P6_INERT_STAGE_INPUT_JSON:stage.raw.toString("utf8"),P6_INERT_STAGE_INPUT_SHA256:SHA.stage,P6_INERT_COST_ENVELOPE_SHA256:SHA.cost};
 const paper={schema:"v39.phase6.runtime-plan-rebind-candidate.v1",status:"EXACT_REVISED_RUNTIME_PLAN_BYTES_PREPARED_NOT_COMMITTED_NO_GO",stageCodeSha:BASE,...SHA,frameSha256:stage.x.frameSha256,planCount:31,sourceQueries:6144,totalReservedUnits:36740,changedPlanCount:differences.filter(x=>x.changed).length,differences,staticCandidateNames:Object.keys(staticCandidates),staticCandidatesSha256:sha(JSON.stringify(staticCandidates)),exactPolicyApproval:false,githubWrites:0,databaseWrites:0,providerCalls:0,phase6PaidGo:false};
 need(live()===BASE,"MAIN_DRIFT");
 mkdirSync(out,{mode:0o700});
 for(const f of result.files.slice(0,31)){const dest=join(out,f.path);mkdirSync(dirname(dest),{recursive:true,mode:0o700});writeFileSync(dest,f.bytes,{flag:"wx",mode:0o600})}
 writeFileSync(join(out,"static-stage-candidates-PRIVATE.json"),JSON.stringify(staticCandidates),{flag:"wx",mode:0o600});
 writeFileSync(join(out,"runtime-plan-rebind-receipt.json"),JSON.stringify(paper),{flag:"wx",mode:0o600});
 console.log(JSON.stringify(paper,null,2));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))try{main()}catch(e){const m=e instanceof Error?e.message:"";console.error(/^HOLD_P6_PLAN_REBIND_[A-Z0-9_]+$/.test(m)?m:"HOLD_P6_PLAN_REBIND_REDACTED");process.exitCode=2}
