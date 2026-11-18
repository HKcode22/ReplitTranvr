'use strict';
// Exact current-main unsigned rebind from already verified owner review.
// Does not regenerate plans, stage calendar, set a secret, or use the database.
const fs=require("node:fs"),os=require("node:os"),path=require("node:path"),crypto=require("node:crypto");
const {execFileSync}=require("node:child_process");
const REPO="HKcode22/ReplitTranvr",OLD="6f518add10d00567a95fbcaf3650ebf608da8a60",NEW="ea89308f468494d848f549539200f73f848a4fa7";
const OLD_TREE="ccf9f6665e3a8547476651a17efcf2261d32c53c",NEW_TREE="d4d976f2bd67f01137ac46a2d09c74a2c8113780";
const EXPECT=[[".github/workflows/phase5-autonomous-clock-canary-no-provider.yml","9844aefcce4940620e0b777071a066e96c71a617","c1356a0aa278745708b5bb9d20e1cdc0bc2bdf2a"],[".github/workflows/phase5-detached-source-outage-accounting.yml",null,"bbba1305660e9ffc1832629c5ab0b493dd6c42c4"],[".github/workflows/phase5-primary-fids-expiry-no-provider.yml","cfc05a5ebed5c76cff41d7987e775d81b2ce1f3e","fe6768a52899f05b208baa316a0686011abf46a7"],[".github/workflows/phase6-autonomous-gh-controller-heartbeat-no-provider.yml","5467733d8fb2fc69e261ebae3415325f1057a1dc","0c25eb168766713b3c7b18b166f494e181f64522"],[".github/workflows/phase6-direct-recovery-tick.yml",null,"30339146704e9d168e4be12f63a314ef5e5a9945"],["scripts/v39_phase5_primary_fids_expiry_github_v39.mjs","de31a0d0e4b4176978f12b296fe422e669eb8c50","4aa89ebee6c441e5e43315b344c08a76c716100a"],["scripts/v39_phase5_primary_github_backstop_v39.mjs",null,"70fb7bd6ceed00496a3f6676ce68c9813fa80f79"],["scripts/v39_phase5_rolling_continuation_rehearsal.mjs","58bcc5a9264cd4114efc71e525e47f280f66c666","52141ceb5afe277e24e23955f247a70ee060fee3"],["scripts/v39_phase5_rolling_preview_actual_diagnostic_v39.mjs",null,"bc1f3df9aada0c7a4e5671d0c4786199351c628c"],["scripts/v39_phase6_direct_recovery_readonly_probe_v39.mjs",null,"64cb47a42725b0d4f65b42bc4aff5007bfdb6fd7"],["scripts/v39_phase6_direct_recovery_tick_v39.mjs",null,"53e0b5e7b3a1b67c8b3c30c56dd702bad132f4fd"],["scripts/v39_phase6_github_controller_heartbeat_v39.mjs","9c83cf683bde69d1f61e0462e62e90397ebdf33a","99a485fdef1809a0eb3dbd8fa68ede9664e495e3"],["scripts/v39_phase6_rolling_github_preview_v39.mjs","66d5f4223581c7f158e2dc3faf630f141b214fa4","41c4e4b32be582e377d53e5e234698aa5434f5b4"],["scripts/v39_phase6_rolling_window_settlement_owner_readonly_v39.mjs","d7909d2d40c9619346b563a8b966d3a9dbb59b4c","adf4fccc313ea4e85c59fdaca96cb70215eb18a8"],["scripts/v39_phase6_rolling_window_terminal_readback_v39.mjs","59eb7951ef1e6da706db35582eae83fd56ac89d0","6c03f1cad7bd83775bd76d735980518caebd492d"],["server/lib/disruption/phase6AutonomousGithubControllerHeartbeat_v39.mjs","1fefe9ea9cae5709189f92a3c4fccc78864cb2da","058a737fe8caba0d2928a66fceed827c5a08af4b"],["server/lib/disruption/phase6RollingCalendarHints_v39.mjs","b9c51b45ab229046eb2f57476c399ed7494aa817","39faabe8dcf1e8e9f3e9399f157bc69dbdf7e4a0"],["server/lib/disruption/phase6RollingGithubController_v39.mjs","3d6fa3ef4d4ad3cab2561db61098da041e1b6b48","9e0577b68b471134dcfa64302334491806233cc9"],["server/lib/disruption/phase6RollingSessionAckLedger_v39.mjs","4043c0d8e2e010761e3ab433e2f6c7308d2fdb17","318572b7bb121fd53540b2c5d7f515f31d18fd2d"],["tests/phase5_primary_fids_expiry_real_pg_v39.test.ts","c3473369a3096edf8ed3a45774999e741bf86dfd","083bfcd39375822a515c88ab7076d0626e490b0f"],["tests/phase5_primary_github_backstop_v39.test.mjs",null,"1c4bbd32bc5ffb17fb8aa748d77a70ff7b925c1f"],["tests/phase5_rolling_continuation_rehearsal_v39.test.mjs","0002b6bc6f0900b9b12879669ca40da17eb458f3","6a68d0cb22c69b5d2edda65611985e1fe57e3982"],["tests/phase6_autonomous_github_controller_heartbeat_v39.test.mjs","707ebdabd40f3e1b03c870eac0022cb491fd3871","d7d7361d984f4ab99b01a277609e74b4465c9665"],["tests/phase6_direct_recovery_tick_v39.test.mjs",null,"1b4b7571ee37498a012c4d4914769de839b47c0b"],["tests/phase6_rolling_calendar_hints_v39.test.mjs","d67c94085dc5dea7779a64e1da86b1ca42470ba7","d4a7b79591640c754787db16f6df1555a502a534"],["tests/phase6_rolling_github_controller_v39.test.mjs","72b0a6d49f9c8ba7cb836182543afc10d7b6049a","1b8c32df71e7260b71c4c42a497b5b22aa434e6b"],["tests/phase6_rolling_window_settlement_owner_readonly_v39.test.mjs","a02803891a2eb619ba6ec59c8b3bdab90ee16487","0ca7c511835cbd1a92a53a0b32d455988cd16478"]];
const OLD_MANIFEST="fc6b594ec0e458d8810981ac8f170a3a91384be609e3c16a09c25f5a91449041";
const OLD_INV="9b47e3bfc1d52fbded77bb3b83a1bd967aafa3721dd954508f835bbf97e6ab95";
const HELPER="62ffb5537748e4d50ed5c2d54be92e5d16c51814",INDEX="6b626c5f34a0891d1322eb150d97456a7ed95d02";
const h=b=>crypto.createHash("sha256").update(b).digest("hex"),bytes=x=>Buffer.from(JSON.stringify(x));
const gitBlob=b=>crypto.createHash("sha1").update(Buffer.from("blob "+b.length+"\0")).update(b).digest("hex");
const hold=s=>{throw Error("HOLD_P5_NOV18_MANIFEST_"+s);},need=(x,s)=>{if(!x)hold(s);};
const scope=p=>/^(?:server|scripts|migrations|tests|shared|client|patches|\.github\/(?:workflows|actions))\//.test(p)||/^(?:package(?:-lock)?\.json|npm-shrinkwrap\.json|tsconfig(?:\.[\w-]+)?\.json|[\w-]+\.config\.[cm]?[jt]s|\.npmrc|\.nvmrc|\.node-version)$/.test(p);
function api(endpoint){
 return JSON.parse(execFileSync("gh",["api","--hostname","github.com","--method","GET","repos/"+REPO+"/"+endpoint],
 {encoding:"utf8",timeout:30000,maxBuffer:20*1024*1024,stdio:["ignore","pipe","ignore"],env:{...process.env,GH_PROMPT_DISABLED:"1"}}));
}
function main(){return api("git/ref/heads/main").object.sha;}
function blob(sha){
 const x=api("git/blobs/"+sha);
 need(x.sha===sha&&x.encoding==="base64"&&typeof x.content==="string","BLOB_RESPONSE");
 const b=Buffer.from(x.content.replace(/\s+/g,""),"base64");
 need(x.size===b.length&&gitBlob(b)===sha,"BLOB_BYTES");return b;
}
function tree(commit,expected){
 const c=api("git/commits/"+commit);need(c.sha===commit&&c.tree.sha===expected,"TREE_PIN");
 const t=api("git/trees/"+expected+"?recursive=1");
 need(t.sha===expected&&t.truncated===false&&Array.isArray(t.tree)&&new Set(t.tree.map(x=>x.path)).size===t.tree.length,"TREE_COMPLETENESS");
 return new Map(t.tree.filter(x=>x.type==="blob").map(x=>[x.path,x]));
}
function rebind(oldReview,oldTree,newTree,readBlob){
 const r=oldReview.releaseIdentityReview;
 need(r.checkout.codeSha===OLD&&r.checkout.treeSha===OLD_TREE&&r.manifestCandidate.sha256===OLD_MANIFEST&&h(bytes(r.manifestCandidate.content))===OLD_MANIFEST,"OLD_MANIFEST");
 need(r.sourceInventory.length===2180&&h(bytes(r.sourceInventory))===OLD_INV&&r.manifestCandidate.content.sourceInventorySha256===OLD_INV,"OLD_INVENTORY");
 const a=new Map([...oldTree].filter(([p])=>scope(p))),b=new Map([...newTree].filter(([p])=>scope(p)));
 need(a.size===2180&&b.size===2188,"INVENTORY_SIZE");
 const oldRows=new Map(r.sourceInventory.map(x=>[x.path,x]));
 need(oldRows.size===a.size&&[...a].every(([p,x])=>oldRows.get(p)?.mode===x.mode),"OLD_SOURCE_PATHS");
 const diff=[...new Set([...a.keys(),...b.keys()])].sort().filter(p=>a.get(p)?.sha!==b.get(p)?.sha||a.get(p)?.mode!==b.get(p)?.mode).map(p=>[p,a.get(p)?.sha??null,b.get(p)?.sha??null]);
 need(JSON.stringify(diff)===JSON.stringify(EXPECT),"UNREVIEWED_SOURCE_DELTA");
 const sourceInventory=[...b].sort(([p],[q])=>p<q?-1:p>q?1:0).map(([p,x])=>{
  need(["100644","100755"].includes(x.mode)&&/^[a-f0-9]{40}$/.test(x.sha),"SOURCE_IDENTITY");
  if(a.get(p)?.sha===x.sha&&a.get(p)?.mode===x.mode)return oldRows.get(p);
  const raw=readBlob(x.sha);need(gitBlob(raw)===x.sha,"SOURCE_BLOB");
  return {path:p,mode:x.mode,sha256:h(raw)};
 });
 const m=r.manifestCandidate.content;
 need(m.scientificFreezeApproved===false&&m.finalPredecessorsApproved===false&&m.phase6PaidGo===false,"MANIFEST_FLAGS");
 const refs=[...m.bindingDocuments,m.originalSeed,m.calendarRevisionReceipt].filter(Boolean);
 for(const x of refs)need(typeof x.path==="string"&&oldTree.get(x.path)?.sha&&oldTree.get(x.path).sha===newTree.get(x.path)?.sha,"BINDING_DOC_DRIFT");
 for(const x of [r.configCandidate,r.timingEvidenceCandidate,r.rangeEvidenceCandidate])need(h(bytes(x.content))===x.sha256,"CONFIG_EVIDENCE_DIGEST");
 const inventorySha=h(bytes(sourceInventory));
 const manifest={...m,sourceInventorySha256:inventorySha,executableFileCount:sourceInventory.length};
 const manifestSha=h(bytes(manifest));
 need(manifestSha!==OLD_MANIFEST,"UNEXPECTED_MANIFEST_EQUAL");
 return {manifest,manifestSha,sourceInventory,inventorySha};
}
function secureFile(p,b){
 if(fs.existsSync(p)){need(fs.lstatSync(p).isFile()&&fs.readFileSync(p).equals(b),"EXISTING_FILE_CONFLICT");return;}
 fs.writeFileSync(p,b,{flag:"wx",mode:0o600});
}
function execute(){
 need(process.env.GITHUB_ACTIONS!=="true"&&process.argv.length===4&&main()===NEW,"OWNER_MAIN_SCOPE");
 const helperRaw=fs.readFileSync(process.argv[2]),indexRaw=fs.readFileSync(process.argv[3]);
 need(gitBlob(helperRaw)===HELPER&&gitBlob(indexRaw)===INDEX,"HELPER_INDEX_HASH");
 const recover=require(path.resolve(process.argv[2])).recover;
 const dir=path.join(os.homedir(),".phase5-final-review-kkddqaou");
 need(fs.lstatSync(dir).isDirectory()&&fs.lstatSync(path.join(dir,"review-only.json")).isFile(),"EXISTING_REVIEW_DIRECTORY");
 const raw=fs.readFileSync(path.join(dir,"review-only.json")),prior=JSON.parse(raw),r=prior.releaseIdentityReview;
 const recovered=recover(raw,indexRaw);
 need(recovered.receipt.manifestCandidateSha256===OLD_MANIFEST&&recovered.receipt.sourceInventorySha256===OLD_INV,"EXISTING_RECEIPT_IDENTITY");
 const a=tree(OLD,OLD_TREE),b=tree(NEW,NEW_TREE),idx=JSON.parse(indexRaw);
 need(idx.dayPlanSha256s.length===31&&idx.dayPlanSha256s.every((x,i)=>{
  const f="data-collection/phase5/planning/phase6-source-day-"+String(i+1).padStart(2,"0")+".json";
  return x.runDayIndex===i+1&&b.get(f)?.sha===x.gitBlob&&b.get(f)?.size===x.byteCount&&a.get(f)?.sha===x.gitBlob;
 }),"COMMITTED_PLAN_DRIFT");
 const data=rebind(prior,a,b,blob);
 const draft={...recovered.files["external-input-offline-review-NOT-STAGE.json"],codeSha40:NEW,manifestSha256:data.manifestSha};
 need(draft.phase6AuthorizationId===null&&draft.predecessorEvidenceIds===null,"DRAFT_APPROVAL_DRIFT");
 need(main()===NEW,"MAIN_MOVED");
 const receipt={status:"P5_NOV18_EXACT_MAIN_UNSIGNED_MANIFEST_DELTA_REBOUND_NO_GO",oldMain:OLD,main:NEW,tree:NEW_TREE,
  previousManifestSha256:OLD_MANIFEST,manifestCandidateSha256:data.manifestSha,sourceInventorySha256:data.inventorySha,
  executableFiles:2188,changedExistingFiles:19,addedFiles:8,verifiedUnchangedDayPlans:31,plannedQueries:6144,reservedRestUnits:37388,
  calendarRowsSha256:r.configCandidate.content.calendarRowsSha256,configCandidateSha256:r.configCandidate.sha256,
  historicalTimingEvidenceSha256:r.timingEvidenceCandidate.sha256,rangeEvidenceCandidateSha256:r.rangeEvidenceCandidate.sha256,
  externalReviewDraftSha256:h(bytes(draft)),actualAuthorizationId:null,stagePacketExported:false,
  schedulerEvidenceStillRequiresIndependentReview:true,sourceRightsApproved:false,scientificFreezeApproved:false,providerCalls:0,databaseWrites:0,githubMutations:0,phase6PaidGo:false};
 const out=path.join(dir,"nov18-"+NEW.slice(0,12));
 if(!fs.existsSync(out))fs.mkdirSync(out,{mode:0o700});
 need(fs.lstatSync(out).isDirectory(),"OUTPUT_SCOPE");
 const files={"manifest-candidate.json":data.manifest,"source-inventory.json":data.sourceInventory,"config-candidate.json":r.configCandidate.content,
 "external-input-offline-review-NOT-STAGE.json":draft,"timing-input-offline-review.json":recovered.files["timing-input-offline-review.json"],
 "receipt.json":receipt};
 for(const [n,x] of Object.entries(files))if(fs.existsSync(path.join(out,n)))need(fs.lstatSync(path.join(out,n)).isFile()&&fs.readFileSync(path.join(out,n)).equals(bytes(x)),"EXISTING_OUTPUT_CONFLICT");
 for(const [n,x] of Object.entries(files))secureFile(path.join(out,n),bytes(x));
 console.log(JSON.stringify({...receipt,reviewDirectory:out}));
}
module.exports={rebind};
if(require.main===module)try{execute()}catch(e){console.error(/^HOLD_P5_NOV18_MANIFEST_[A-Z0-9_]+$/.test(e?.message??"")?e.message:"HOLD_P5_NOV18_MANIFEST_REDACTED");process.exitCode=2;}
