/** Detached owner-only successor for the two exact unused Monday packets.
 * Never enables SOURCE, dispatches Actions, reads flight contents, or calls a
 * provider. Current main remains authoritative for runtime execution.
 */
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {lstatSync,readFileSync,realpathSync} from "node:fs";
import {join,resolve} from "node:path";
import {Pool} from "pg";
import {compileP6ProspectiveDisabledStageRevisionV39,commitP6ProspectiveDisabledStageRevisionOnceV39,
 verifyP6ProspectiveDisabledStageRevisionReadOnlyV39,P6_EXACT_MONDAY_IDENTITY_SUCCESSOR as K} from "../server/lib/disruption/phase6ProspectiveDisabledStageRevision_v39";
import {inspectP5V0093IndependentExactPostStage} from "../server/lib/disruption/phase5V0093IndependentPostStageReadback_v39.mjs";
import {verifyP6MondayRevisedExecutableBridge,P6_MONDAY_BRIDGE_REVIEW_PATH} from "../scripts/v39_phase6_revised_stage_executable_bridge_v39";
import {p6SourceAuthorizationStageContentSha} from "../scripts/v39_phase6_enable_source_owner_v39";
const REPO="HKcode22/ReplitTranvr",CODE=/^[a-f0-9]{40}$/,H=/^[a-f0-9]{64}$/;
const BRIDGE="d18c40640096f09a7a72c27e05fa63c227336849d11db7c266dbb6b2cb067fa9";
const hold=(s:string):never=>{throw Error("HOLD_P6_EXACT_IDENTITY_OWNER_"+s)};
const need=(x:unknown,s:string)=>{if(!x)hold(s)};
const sha=(s:Buffer|string)=>createHash("sha256").update(s).digest("hex");
const git=(args:string[])=>execFileSync("git",args,{stdio:["ignore","pipe","ignore"],timeout:30000,maxBuffer:5*1024*1024}).toString("utf8");
const gh=(args:string[])=>execFileSync("gh",args,{stdio:["ignore","pipe","ignore"],timeout:30000,maxBuffer:5*1024*1024}).toString("utf8");
const remote=()=>gh(["api","repos/"+REPO+"/git/ref/heads/main","--jq",".object.sha"]).trim();
function privatePackage(dir:string){
 const full=resolve(dir),home=realpathSync(process.env.HOME!);
 need(full.startsWith(home+"/.travnr-")&&realpathSync(full)===full,"PRIVATE_DIR");
 // Every containing directory between HOME and the package is owner-only.
 let base=full;
 while(base!==home){
  const s=lstatSync(base);need(s.isDirectory()&&!s.isSymbolicLink()&&s.uid===process.getuid?.()&&(s.mode&0o077)===0,"PRIVATE_DIR_MODE");
  base=resolve(base,"..");
 }
 const read=(n:string,max=2*1024*1024)=>{
  const p=join(full,n),s=lstatSync(p);need(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1&&s.uid===process.getuid?.()&&(s.mode&0o077)===0&&s.size>100&&s.size<=max,"PRIVATE_FILE");
  return readFileSync(p,"utf8");
 };
 const ctx=JSON.parse(read("prospective-revision-package.json")),raw=read("new-stage-input.json",48000),manifest=read("new-manifest.json"),config=read("new-config.json");
 need(JSON.stringify(ctx.newInput)===raw&&ctx.newManifestRaw===manifest&&sha(manifest)===ctx.newInput.manifestSha256&&sha(config)===ctx.newInput.configSha256,"PACKAGE_BYTES");
 return {ctx,raw};
}
function checkBridge(main:string,stageRaw:string){
 const raw=Buffer.from(git(["show",main+":"+P6_MONDAY_BRIDGE_REVIEW_PATH]),"utf8");
 need(sha(raw)===BRIDGE,"EXACT_EXISTING_BRIDGE_BYTES");
 const review=JSON.parse(raw.toString("utf8")),reviewed=review.reviewedExecutableCommit;
 need(CODE.test(reviewed),"REVIEWED_COMMIT");
 const ancestor=(a:string,b:string)=>{try{git(["merge-base","--is-ancestor",a,b]);return true}catch{return false}};
 const diff=(h:string)=>git(["diff","--no-renames","--name-only",K.newCode,h]).trim().split("\n").filter(Boolean);
 return verifyP6MondayRevisedExecutableBridge({stageCode:K.newCode,stageSha:K.newStage,costSha:K.newCost,currentHead:main,reviewBytes:raw,
 expectedOperationalEvidenceSha256:BRIDGE,now:new Date(),stageIsAncestor:ancestor(K.newCode,main),reviewedCommitIsAncestor:ancestor(K.newCode,reviewed)&&ancestor(reviewed,main),
 reviewedDiff:diff(reviewed),currentDiff:diff(main),readReviewedBlob:p=>git(["ls-tree",reviewed,"--",p]).split("\t")[0],readCurrentBlob:p=>git(["ls-tree",main,"--",p]).split("\t")[0]},
 stageRaw,p6SourceAuthorizationStageContentSha(JSON.parse(stageRaw)),K.newCost);
}
function verifyExactCI(helperHead:string){
 const runs=JSON.parse(gh(["api","repos/"+REPO+"/actions/runs?head_sha="+helperHead+"&per_page=100"])).workflow_runs;
 const names=["Phase6 Prospective Disabled Stage Revision PG16 (No Provider)","V3.9 Offline Safety"];
 const ids=names.map(name=>{
  const matches=runs.filter((x:any)=>x.head_sha===helperHead&&x.name===name&&x.event==="pull_request");
  need(matches.length>0,"EXACT_HEAD_CI_MISSING");
  const latest=matches.sort((a:any,b:any)=>b.id-a.id)[0];
  need(latest.status==="completed"&&latest.conclusion==="success","EXACT_HEAD_CI_NOT_GREEN");
  return latest.id;
 });
 return ids;
}
async function stageIdentity(pool:Pool){
 const c=await pool.connect();
 try{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const z=(await c.query("SELECT current_database() db,current_user actor,session_user session_actor,current_setting('server_version_num')::int ver,current_setting('transaction_read_only') ro,pg_is_in_recovery() replica")).rows[0];
  need(z.db==="neondb"&&z.actor==="neondb_owner"&&z.actor===z.session_actor&&z.ver>=160000&&z.ver<170000&&z.ro==="on"&&z.replica===false,"OWNER_READONLY_IDENTITY");
  const r=(await c.query("SELECT code_sha,manifest_sha256,calendar_hash,config_hash,enabled,revoked_at_utc FROM clean.adb_phase6_authorization")).rows;
  need(r.length===1&&r[0].enabled===false&&r[0].revoked_at_utc===null,"EXACT_DISABLED_AUTH");
  await c.query("ROLLBACK");return r[0];
 }finally{c.release();}
}
async function main(){
 const [mode,oldDir,newDir]=process.argv.slice(2),head=git(["rev-parse","HEAD"]).trim();
 need(process.argv.length===5&&["--inspect","--apply-reviewed-disabled-only"].includes(mode)&&CODE.test(head)&&git(["status","--porcelain","--untracked-files=no"]).trim()===""&&process.env.GITHUB_ACTIONS!=="true"&&process.env.ADB_AUTO_COLLECT==="0"&&process.env.V39_PHASE6_PROCESS_ARMED==="0"&&process.env.V39_PHASE6_OWNER_APPROVED==="0"&&process.env.NODE_TLS_REJECT_UNAUTHORIZED!=="0"&&![process.env.AERODATABOX_API_KEY,process.env.AERODATABOX_WEBHOOK_SECRET,process.env.RAPIDAPI_KEY,process.env.V39_DATABASE_RUNTIME_URL].some(Boolean),"DISARMED_CLEAN_OWNER_SCOPE");
 const a=privatePackage(oldDir),b=privatePackage(newDir);
 need(sha(a.raw)===K.oldStage&&sha(b.raw)===K.newStage,"EXACT_TWO_PACKETS");
 const ctx={oldInput:a.ctx.newInput,oldStageReview:a.ctx.newStageReview,oldFreezeReview:a.ctx.newFreezeReview,newInput:b.ctx.newInput,newStageReview:b.ctx.newStageReview,newFreezeReview:b.ctx.newFreezeReview,newManifestRaw:b.ctx.newManifestRaw,
 review:{...b.ctx.review,schema:K.schema,expectedOldStageInputSha256:K.oldStage,expectedOldCostEnvelopeSha256:K.oldCost,expectedOriginalFrozenManifestSha256:K.oldManifest,expectedPriorCodeSha40:K.oldCode}};
 const compiled=compileP6ProspectiveDisabledStageRevisionV39(ctx);
 need(compiled.changedParentDays===0,"NO_CALENDAR_CHANGE");
 const u=new URL(process.env.DATABASE_URL??"");
 need(["postgres:","postgresql:"].includes(u.protocol)&&decodeURIComponent(u.username)==="neondb_owner"&&u.password&&u.hostname.endsWith(".neon.tech")&&u.pathname==="/neondb"&&!u.hash&&u.searchParams.getAll("sslmode").length===1&&["require","verify-full"].includes(u.searchParams.get("sslmode")??""),"OWNER_PRIMARY_TLS");
 const opt={connectionString:u.toString(),max:2,connectionTimeoutMillis:8000,query_timeout:30000,application_name:"p6_exact_monday_identity_successor"};
 const pool=new Pool({...opt,options:"-c default_transaction_read_only=on"});
 try{
  const live=await stageIdentity(pool);
  const isNew=live.code_sha===K.newCode&&live.manifest_sha256===K.newManifest&&live.config_hash===K.newConfig&&live.calendar_hash===K.calendar;
  const isOld=live.code_sha===K.oldCode&&live.manifest_sha256===K.oldManifest&&live.config_hash===K.oldConfig&&live.calendar_hash===K.calendar;
  need(isNew||isOld,"LIVE_NOT_EXACT_OLD_OR_NEW");
  const receipt=await inspectP5V0093IndependentExactPostStage(pool,isNew?ctx.newInput:ctx.oldInput,isNew?ctx.newStageReview:ctx.oldStageReview,isNew?ctx.newFreezeReview:ctx.oldFreezeReview);
  need(receipt.status==="INDEPENDENT_EXACT_B0062_V0093_POST_STAGE_READONLY_MATCH_NO_GO"&&receipt.authorizationEnabled===false&&receipt.exactReviewedStagePacketSha256===(isNew?K.newStage:K.oldStage)&&receipt.exactReviewedCostEnvelopeSha256===(isNew?K.newCost:K.oldCost),"LIVE_FULL_READBACK");
  console.log(JSON.stringify({status:isNew?"P6_SUCCESSOR_ALREADY_INSTALLED_NO_REPLAY_NO_GO":"P6_SAME_CALENDAR_SUCCESSOR_READY_READONLY_NO_GO",receipt,changedParentDays:0,providerCalls:0,databaseWrites:0,phase6PaidGo:false}));
  if(isNew||mode==="--inspect")return;
 }finally{await pool.end();}
 need(process.env.P6_EXACT_MONDAY_IDENTITY_OWNER_APPROVAL==="APPLY_REVIEWED_EXACT_DISABLED_SAME_CALENDAR_NO_PROVIDER"&&process.env.P6_EXACT_MONDAY_HELPER_SHA===head,"EXPLICIT_OWNER_SCOPE_AND_PIN");
 const main=remote();
 need(CODE.test(main)&&main===process.env.P6_EXACT_MONDAY_RUNTIME_MAIN_SHA,"RUNTIME_MAIN_PIN");
 const ci=verifyExactCI(head),bridge=checkBridge(main,b.raw);
 need(remote()===main,"MAIN_CHANGED_BEFORE_MUTATION");
 console.log(JSON.stringify({status:"P6_EXACT_SAME_CALENDAR_SCOPE_VERIFIED",ci,bridge,phase6PaidGo:false}));
 const writer=new Pool(opt);
 try{
  const receipt=await commitP6ProspectiveDisabledStageRevisionOnceV39(writer,ctx);
  console.log(JSON.stringify(receipt));
  const fresh=await verifyP6ProspectiveDisabledStageRevisionReadOnlyV39(writer,ctx,receipt);
  console.log(JSON.stringify(fresh));
 }finally{await writer.end();}
}
main().catch(e=>{const m=String(e?.message??"");console.error(/^HOLD_P6_[A-Z0-9_]+$/.test(m)?m:"HOLD_P6_EXACT_IDENTITY_OWNER_REDACTED_RECONCILE_NO_REPLAY");process.exitCode=2});
