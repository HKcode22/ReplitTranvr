/** Assemble six final runtime policies from already recovered private bytes.
 * No signer creation, approval manufacture, DB write, dispatch or provider call.
 * Requires actual independently approved SOURCE ledger and policy decisions.
 * The historical exact staged packet and reviewed runtime executable are distinct.
 */
import {createHash,createPublicKey} from "node:crypto";
import {execFileSync} from "node:child_process";
import {createRequire} from "node:module";
import {lstatSync,readFileSync,realpathSync,mkdirSync,writeFileSync,mkdtempSync,rmSync} from "node:fs";
import {resolve,join,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {compileP6ActualCandidateExport} from "../scripts/v39_phase6_actual_release_candidate_export_v39";
import {verifyP6SourceEnableAuthFile} from "../scripts/v39_phase6_source_enable_approval_ledger_v39";
import {admitP6InertOwnerReadback} from "../scripts/v39_phase6_inert_release_stage_manual_v39.mjs";
import {verifyP6SourceActivationReview} from "../scripts/v39_phase6_enable_source_owner_v39";
import {P6_NOV22_STAGE_CODE,P6_NOV22_STAGE_SHA,P6_NOV22_COST_SHA,P6_NOV22_BRIDGE_REVIEW_PATH,verifyP6RevisedExecutableBridge} from "../scripts/v39_phase6_revised_stage_executable_bridge_v39";
const REPO="HKcode22/ReplitTranvr";
const WORK="7925dca816933a401ec97f1d3a1f920b881c8f1e296ab8f70f0563c19cf13b0e";
const CATALOG="4264ae7d2d7efc784ae0deab0354c506a943fa51b4a8649d020422853d798534";
const CONTRACT="63b8daf194858a27ea487308f34839def760aadda2acd9f81c82c466f9de7f09";
const MANIFEST="3a0e3667dbbd3eb9bc101618b1858755d3814f4676d61f1487586463c6d91ba7";
const CALENDAR="9ee062ab6d82de8b3949f88ba390d4bcb9121890be592797ec0b4c498ff289a6";
const CONFIG="001a3f0634cc41b8d1327be36404efa74feaaea21fe4ef6eead7e993acaf4c88";
const FRAME="02ec6e78ba1fe3c2923d5a32cc7bd61ed6016a5ed4cfa13ce000a9f52db37c94";
const ASSEMBLER="cf9463ae4c078cf178acd350fbe510cd4d371591",VALIDATOR="34156ac65811165c0d217e7175f8643eeef55761";
const H=/^[a-f0-9]{64}$/,C=/^[a-f0-9]{40}$/;
const hold=(s:string):never=>{throw Error("HOLD_P6_REVISED_POLICY_FINALIZE_"+s)};
const need=(v:unknown,s:string)=>{if(!v)hold(s)};
const sha=(b:string|Buffer)=>createHash("sha256").update(b).digest("hex");
const hash=(x:unknown)=>sha(JSON.stringify(x));
const cmd=(c:string,a:string[])=>execFileSync(c,a,{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:20000,maxBuffer:5*1024*1024}).trim();
const main=()=>cmd("gh",["api","repos/"+REPO+"/git/ref/heads/main","--jq",".object.sha"]);
const ancestor=(a:string,b:string)=>{try{execFileSync("git",["merge-base","--is-ancestor",a,b],{stdio:"ignore",timeout:10000});return true}catch{return false}};
const gitRaw=(h:string,p:string)=>execFileSync("git",["show",h+":"+p],{stdio:["ignore","pipe","ignore"],timeout:15000,maxBuffer:2*1024*1024});
const dirs=(p:string)=>{const s=lstatSync(p);need(s.isDirectory()&&!s.isSymbolicLink()&&s.uid===process.getuid?.()&&(s.mode&0o077)===0,"PRIVATE_DIRECTORY");return realpathSync(p)};
function read(p:string,expected?:string,max=2000000){
 const s=lstatSync(p);need(s.isFile()&&!s.isSymbolicLink()&&s.uid===process.getuid?.()&&s.nlink===1&&(s.mode&0o077)===0&&s.size>0&&s.size<=max,"PRIVATE_FILE");
 const raw=readFileSync(p);need(!expected||sha(raw)===expected,"PRIVATE_DIGEST");
 return {raw,x:JSON.parse(raw.toString("utf8")),sha256:sha(raw)};
}
function archive(id:string,d:string,name:string){
 const raw=Buffer.from(cmd("gh",["api","repos/"+REPO+"/git/blobs/"+id,"--jq",".content"]),"base64");
 need(createHash("sha1").update("blob "+raw.length+"\0").update(raw).digest("hex")===id,"ARCHIVE_BLOB");
 const file=join(d,name);writeFileSync(file,raw,{flag:"wx",mode:0o600});
 return createRequire(import.meta.url)(file);
}
const CODE_NAMES=["V39_P5_APPROVED_CODE_SHA","P6_NONPAID_SOURCE_APPROVED_MAIN_SHA","V39_P5_ACTUAL_NATIVE_REVIEW_APPROVED_CODE_SHA","P5_CD_GH_PRE_APPROVED_CODE_SHA","V39_P5_POST_APPROVED_CODE_SHA","P6_PRIVATE_SOURCE_PARENT_RO_MAIN_SHA","V39_P5_QUEUE_APPROVED_CODE_SHA"];
export function buildRevisedStaticValues(p:any,w:Record<string,unknown>,stageRaw:string,price:string){
 need(C.test(p.codeSha)&&p.codeSha!==P6_NOV22_STAGE_CODE&&sha(stageRaw)===P6_NOV22_STAGE_SHA&&p.manifestSha256===MANIFEST&&p.configSha256===CONFIG&&p.calendarSha256===CALENDAR&&p.frameSha256===FRAME&&p.costSha256===P6_NOV22_COST_SHA&&p.providerContractSha256===CONTRACT&&H.test(p.releaseSha256)&&H.test(p.rightsSha256)&&H.test(price),"STATIC_EXACT_REVISED_PINS");
 const v:Record<string,string>={...Object.fromEntries(CODE_NAMES.map(k=>[k,p.codeSha])),V39_P5_MANIFEST_SHA256:MANIFEST,V39_P5_CALENDAR_HASH:CALENDAR,V39_P5_CONFIG_HASH:CONFIG,V39_P5_FRAME_HASH:FRAME,V39_P5_RELEASE_SHA256:p.releaseSha256,V39_P5_RIGHTS_SHA256:p.rightsSha256,V39_P5_PROVIDER_CONTRACT_SHA256:CONTRACT,P6_INERT_STAGE_INPUT_JSON:stageRaw,P6_INERT_STAGE_INPUT_SHA256:P6_NOV22_STAGE_SHA,P6_INERT_COST_ENVELOPE_SHA256:P6_NOV22_COST_SHA,P6_PRIVATE_POST_OUTCOME_TAIL_HOURS:"48",V39_P5_POST_PROVIDER_CONTRACT_SHA256:CONTRACT,V39_P5_POST_CATEGORY_BUDGET_SHA256:P6_NOV22_COST_SHA,V39_P5_POST_PRICE_SHA256:price};
 const names=["P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64","P6_NONPAID_DAILY_POLICY_BASE64","P6_NONPAID_SIGNING_POLICY_BASE64","P6_NONPAID_TRANSPORT_TRUST_BASE64","P6_PRIVATE_POST_REVIEWER_TRUST_BASE64","P6_NATIVE_POST_POLICY_BASE64"];
 need(Object.keys(w).length===6&&names.every(k=>Object.hasOwn(w,k)),"SIX_POLICY_BYTES");
 for(const name of names)v[name]=Buffer.from(JSON.stringify(w[name])).toString("base64");
 for(const name of ["P6_NONPAID_DAILY_POLICY","P6_NONPAID_SIGNING_POLICY","P6_NONPAID_TRANSPORT_TRUST","P6_NATIVE_POST_POLICY"])v[name+"_SHA256"]=sha(Buffer.from(v[name+"_BASE64"],"base64"));
 need(Object.keys(v).length===31&&Object.values(v).every(x=>typeof x==="string"&&Buffer.byteLength(x)>0&&Buffer.byteLength(x)<=48000),"STATIC_NAME_OR_SIZE");
 return v;
}
async function run(){
 const [mode,recoveryPath,revisionPath,authPath,authSha,decisionPath,decisionSha,outPath]=process.argv.slice(2);
 need(process.argv.length===10&&mode==="--prepare-private"&&H.test(authSha)&&H.test(decisionSha)&&process.env.GITHUB_ACTIONS!=="true"&&process.env.ADB_AUTO_COLLECT==="0"&&process.env.V39_PHASE6_PROCESS_ARMED==="0"&&process.env.V39_PHASE6_OWNER_APPROVED==="0"&&!["AERODATABOX_API_KEY","RAPIDAPI_KEY","AERODATABOX_WEBHOOK_SECRET"].some(k=>process.env[k]),"OWNER_SCOPE");
 const root=realpathSync(cmd("git",["rev-parse","--show-toplevel"])),head=cmd("git",["rev-parse","HEAD"]),home=realpathSync(process.env.HOME!);
 need(root===realpathSync(process.cwd())&&head===main()&&head!==P6_NOV22_STAGE_CODE&&cmd("git",["status","--porcelain","--untracked-files=no"])==="","CLEAN_FINAL_MAIN");
 const d=dirs(recoveryPath),rev=dirs(revisionPath),out=resolve(outPath);
 need(!d.startsWith(root+"/")&&!rev.startsWith(root+"/")&&dirname(out)===home&&out.startsWith(home+"/.travnr-phase6-final-policies-"),"PRIVATE_DIRECTORIES");
 const work=read(join(d,"policy-complete-shape-NOT-RUNTIME.json"),WORK),catalog=read(join(d,"airport-timezone-catalog-CANDIDATE.json"),CATALOG);
 const publicBytes=read(join(d,"public-provider-contract-CANDIDATE.json"),CONTRACT,20000000);
 need(hash({airportTimezoneGroups:work.x.policyDrafts.P6_NONPAID_DAILY_POLICY_BASE64.airportTimezoneGroups})===catalog.sha256&&publicBytes.x.info.version==="1.15.4.0","RECOVERED_CATALOG_AND_CONTRACT");
 const stage=read(join(rev,"new-stage-input.json"),P6_NOV22_STAGE_SHA,48000),manifest=read(join(rev,"new-manifest.json"),MANIFEST),config=read(join(rev,"new-config.json"),CONFIG),external=read(join(rev,"new-external.json")),timing=read(join(rev,"new-timing.json"));
 need(stage.x.codeSha40===P6_NOV22_STAGE_CODE&&stage.x.calendarSha256===CALENDAR&&stage.x.frameSha256===FRAME&&stage.x.configSha256===CONFIG&&stage.x.manifestSha256===MANIFEST&&manifest.x.sourceUseDeferredToPhase6Activation===true&&manifest.x.scientificFreezeApproved===true&&config.x.calendarRowsSha256===CALENDAR,"STAGE_SCOPE");
 const result=compileP6ActualCandidateExport({externalBytes:external.raw,expectedExternalFileSha256:external.sha256,timingBytes:timing.raw,expectedTimingFileSha256:timing.sha256,calendarVariant:"COMPACT_NOV22"});
 need(result.summary.unsignedStageInputSha256===P6_NOV22_STAGE_SHA&&result.summary.unsignedCostOnlyEnvelopeSha256===P6_NOV22_COST_SHA&&result.summary.sourceQueries===6144&&result.summary.totalReservedUnits===36740&&result.files.length===32&&result.files[31].bytes===stage.raw.toString("utf8"),"ACTUAL_REVISED_COMPILER");
 for(const f of result.files.slice(0,31))need(sha(gitRaw(head,f.path))===f.sha256&&readFileSync(join(root,f.path)).equals(Buffer.from(f.bytes)),"EXACT_COMMITTED_DAY_PLANS");
 const auth=read(authPath,authSha,256000),a=verifyP6SourceEnableAuthFile(authPath,head);
 need(a.artifactHash===auth.sha256&&a.verdict.verified===true,"EXACT_APPROVED_SOURCE_AUTH");
 const release=(a.record as any).releaseActivation,raw=gitRaw(head,P6_NOV22_BRIDGE_REVIEW_PATH),b=JSON.parse(raw.toString("utf8")),reviewed=b.reviewedExecutableCommit;
 need(C.test(reviewed),"REVIEWED_EXECUTABLE_COMMIT");
 const diff=(h:string)=>cmd("git",["diff","--no-renames","--name-only",P6_NOV22_STAGE_CODE,h]).split("\n").filter(Boolean);
 verifyP6RevisedExecutableBridge({stageCode:P6_NOV22_STAGE_CODE,stageSha:stage.sha256,costSha:P6_NOV22_COST_SHA,currentHead:head,reviewBytes:raw,expectedOperationalEvidenceSha256:release.operationalReleaseEvidenceSha256,now:new Date(),stageIsAncestor:ancestor(P6_NOV22_STAGE_CODE,head),reviewedCommitIsAncestor:ancestor(P6_NOV22_STAGE_CODE,reviewed)&&ancestor(reviewed,head),reviewedDiff:diff(reviewed),currentDiff:diff(head),readReviewedBlob:p=>cmd("git",["ls-tree",reviewed,"--",p]).split("\t")[0],readCurrentBlob:p=>cmd("git",["ls-tree",head,"--",p]).split("\t")[0]});
 const ctx=admitP6InertOwnerReadback({...process.env,V39_P5_APPROVED_CODE_SHA:P6_NOV22_STAGE_CODE},stage.raw.toString("utf8"),stage.sha256,P6_NOV22_COST_SHA,P6_NOV22_STAGE_CODE);
 verifyP6SourceActivationReview(ctx as any,a,new Date());
 const dec=read(decisionPath,decisionSha),decision=dec.x;
 const p={authVerified:true,authorizationId:a.record.authorizationId,authArtifactSha256:a.artifactHash,codeSha:head,manifestSha256:MANIFEST,configSha256:CONFIG,calendarSha256:CALENDAR,frameSha256:FRAME,rightsSha256:release.sourceRightsEvidenceSha256,providerContractSha256:CONTRACT,costSha256:P6_NOV22_COST_SHA,releaseSha256:decision.releaseSha256,dayPlanSha256s:result.summary.dayPlanSha256s,airportTimezoneCatalogSha256:CATALOG,dailyRestCeiling:1900,cycleRestCeiling:stage.x.slotBudgetInput.cycleRestCeilingUnits,minimumProtectedFloor:stage.x.slotBudgetInput.protectedRestFloorUnits,maxQueriesPerDay:288,nowUtc:new Date().toISOString(),outcomeTailUtc:"2026-12-26T04:00:00.000Z"};
 const ops={hash,publicFingerprint:(pem:string)=>{const k=createPublicKey(pem);need(k.asymmetricKeyType==="ed25519","SIGNER_TYPE");return sha(k.export({type:"spki",format:"der"}))},byteLength:Buffer.byteLength};
 const temp=mkdtempSync(join(home,".travnr-policy-assembler-"));
 try{
 const assembler=archive(ASSEMBLER,temp,"assembler.cjs"),validator=archive(VALIDATOR,temp,"validator.cjs");
 // Existing assembler requires genuine explicit reviewer decisions. The
 // historical deferred manifest stays immutable; source use is instead
 // verified by the actual scoped approved auth and existing stage verifier.
 const policies=assembler.assemble(work.x,p,decision,ops);
 const checked=validator.validateFinalPolicies(policies,p,ops);
 const statics=buildRevisedStaticValues(p,policies,stage.raw.toString("utf8"),decision.reviewedProviderPriceSha256);
 need(main()===head,"MAIN_CHANGED");
 mkdirSync(out,{mode:0o700});
 const write=(n:string,v:unknown)=>writeFileSync(join(out,n),JSON.stringify(v),{flag:"wx",mode:0o600});
 write("six-policy-objects-PRIVATE.json",policies);write("static-values-PRIVATE.json",statics);
 const receipt={schema:"v39.phase6.revised-six-policy-bundle.v1",status:"SIX_EXACT_REVISED_POLICY_BYTES_PREPARED_AWAITING_BYTE_REVIEW_NO_GO",main:head,stageCode:P6_NOV22_STAGE_CODE,stageSha256:stage.sha256,costSha256:P6_NOV22_COST_SHA,authorizationId:a.record.authorizationId,authArtifactSha256:a.artifactHash,decisionSha256:dec.sha256,operationalEvidenceSha256:release.operationalReleaseEvidenceSha256,policyBundleSha256:hash(policies),staticValuesSha256:hash(statics),policyDigests:checked.policyDigests,policySizes:checked.policySizes,staticCount:31,plans:31,sourceQueries:6144,reservedUnits:36740,output:out,staticInstalled:false,providerCalls:0,databaseWrites:0,githubWrites:0,phase6PaidGo:false};
 write("bundle-receipt.json",receipt);console.log(JSON.stringify(receipt));
 }finally{rmSync(temp,{recursive:true,force:true})}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))run().catch(e=>{const m=String(e?.message??"");console.error(/^HOLD_[A-Z0-9_]+$/.test(m)?m:"HOLD_P6_REVISED_POLICY_FINALIZE_REDACTED");process.exitCode=2});
