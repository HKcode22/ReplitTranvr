#!/usr/bin/env node
"use strict";
// Explicit owner-local adoption of the exact all-green PR #925, followed by
// nonpaid retention repin/commission. No SOURCE enable, approval-ledger
// edit, new signer, paid switch, source record read, or provider request.
// A journal is fsynced BEFORE each mutation; do not replay after any HOLD.
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const {execFileSync}=require("node:child_process"),{createRequire}=require("node:module");
const P="HKcode22/ReplitTranvr", R="HKcode22/TravnrClockRelay", PR=925;
const OLD="0a7b1a28f243de76d4c83026d15f585265ef6f7b",CANDIDATE="25bef77a489e5667d53a077f28196da5a19f6e1f",RELAY="b3a775b4ec7213af796bb8c727b69c3d0feb8bb7";
const RUNS=[44677675966,44677675994,44677675959,44677675866,44677675750,44677675727,44677675733,44677675784,44677675935,44677675839,44677675824,44677675755,44677675811];
const MANIFEST="3a0e3667dbbd3eb9bc101618b1858755d3814f4676d61f1487586463c6d91ba7",CAL="9ee062ab6d82de8b3949f88ba390d4bcb9121890be592797ec0b4c498ff289a6",CONFIG="001a3f0634cc41b8d1327be36404efa74feaaea21fe4ef6eead7e993acaf4c88";
const STAGE="6d06cd56f3cf09b7d4f5a6033b70f253e6247a9e1b27dbb839b0080a66e771fc",WORK="7925dca816933a401ec97f1d3a1f920b881c8f1e296ab8f70f0563c19cf13b0e",STATIC="f185326d728c0e88e6cdf864e17b7fd2bff7d7d1c8af07713efddc2572621524";
const STOP_BLOB="6c79cd8153819dba2932d465b6f39ea26622a3f5",STOP_SHA="75ebdd9f3e832f9236624221839ed035788288c31b91d08ea0052516f3b43646";
const REPIN_BLOB="72479a85b76a0f6c2e5cd79142e8011cf736da45",EVIDENCE_BLOB="b4a4284f3e031408d45af30458ef03c8c0079cbf";
const GUARD_BLOB="eb6500c1edaa4a50757eec6c8d33efe349aefeff",V104_BLOB="578c76e025bf761f61803e3d70af40ae4a8136e8";
const GUARD_PATH="data-collection/phase5/review-tools/p6_private_due_physical_rest_guard_candidate_NOT_FOR_INSTALL.sql";
const W="phase5-primary-fids-expiry-no-provider.yml",VERIFY="VERIFY_PRIMARY_FIDS_ONLY_NO_WRITES",APPLY="APPLY_REVIEWED_PRIMARY_FIDS_EXPIRY_ONLY_NO_PROVIDER",PRIVATE_APPLY="APPLY_REVIEWED_PRIVATE_EPOCH_EXPIRY_ONLY_NO_PROVIDER";
const C=/^[a-f0-9]{40}$/,H=/^[a-f0-9]{64}$/;
const fail=s=>{throw Error("HOLD_P6_OWNER_COMBINED_"+s)},need=(v,s)=>{if(!v)fail(s)};
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const blobHash=b=>crypto.createHash("sha1").update("blob "+b.length+"\0").update(b).digest("hex");
const gh=(args,o={})=>execFileSync("gh",args,{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:30000,maxBuffer:24*1024*1024,env:{...process.env,GH_PROMPT_DISABLED:"1"},...o}).trim();
const api=(r,p)=>JSON.parse(gh(["api","--method","GET","repos/"+r+"/"+p]));
const main=r=>api(r,"git/ref/heads/main").object.sha;
const blob=id=>{const x=api(P,"git/blobs/"+id);const b=Buffer.from(x.content,"base64");need(x.sha===id&&x.encoding==="base64"&&blobHash(b)===id,"ARCHIVE_BLOB");return b};
const pages=(repo,url,key)=>{const p=JSON.parse(gh(["api","--paginate","--slurp","repos/"+repo+"/"+url+"?per_page=100"]));need(Array.isArray(p)&&p.length>0&&p.length<=10&&p.every(x=>Array.isArray(x[key])&&x.total_count===p[0].total_count),"METADATA_PAGES");const r=p.flatMap(x=>x[key]);need(r.length===p[0].total_count&&new Set(r.map(x=>x.name)).size===r.length,"METADATA_ROWS");return r};
const vars=r=>Object.fromEntries(pages(r,"actions/variables","variables").map(x=>[x.name,x.value]));
const privateDir=d=>{const s=fs.lstatSync(d);need(s.isDirectory()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&(s.mode&0o077)===0,"PRIVATE_DIR");return fs.realpathSync(d)};
function privateFile(f,h,max=2000000){
 const s=fs.lstatSync(f);need(s.isFile()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&s.nlink===1&&(s.mode&0o077)===0&&s.size>0&&s.size<=max,"PRIVATE_INPUT");
 const b=fs.readFileSync(f);need(sha(b)===h,"PRIVATE_INPUT_HASH");return b;
}
function checkCandidate(pr,runs){
 need(pr?.number===PR&&pr.state==="open"&&pr.merged===false&&pr.base?.sha===OLD&&pr.head?.sha===CANDIDATE&&pr.head?.repo?.full_name===P&&pr.mergeable===true,"EXACT_REVIEWED_PR");
 need(Array.isArray(runs)&&runs.length===RUNS.length&&new Set(runs.map(x=>x.id)).size===RUNS.length&&RUNS.every(id=>runs.some(x=>x.id===id&&x.head_sha===CANDIDATE&&x.event==="pull_request"&&x.run_attempt===1&&x.status==="completed"&&x.conclusion==="success")),"EXACT_13_CI");
}
function checkMerged(c,expectedTree,head){
 need(C.test(head)&&head!==OLD&&head!==CANDIDATE&&c?.sha===head&&c.tree?.sha===expectedTree&&Array.isArray(c.parents)&&c.parents.length===2&&c.parents[0].sha===OLD&&c.parents[1].sha===CANDIDATE,"EXACT_MERGED_TREE");
}
function checkInitialVars(p,r){
 need(p.P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA===OLD&&p.P5_PRIMARY_FIDS_EXPIRY_ENABLED==="true"&&p.P5_PRIMARY_FIDS_EXPIRY_APPROVAL===APPLY&&p.P5_PRIMARY_FIDS_BACKSTOP_ENABLED==="true"&&p.P6_PRIVATE_EPOCH_EXPIRY_MODE==="COMMISSION_VERIFY_ONLY"&&!p.P6_PRIVATE_EPOCH_EXPIRY_MANIFEST_SHA256&&!p.P6_PRIVATE_EPOCH_EXPIRY_APPROVAL&&p.P5_RETENTION_READONLY_MONITOR_ENABLED==="true"&&H.test(p.P5_PRIMARY_FIDS_EXPECTED_ENDPOINT_SHA256??""),"PRIMARY_BASELINE");
 need(r.TRAVNR_APPROVED_TARGET_MAIN_SHA===OLD&&r.TRAVNR_CRON_RELAY_SHA===RELAY&&r.TRAVNR_RELAY_MODE==="MULTI_LANE"&&r.TRAVNR_RELAY_PRIMARY_ENABLED==="1"&&r.TRAVNR_RELAY_PRIMARY_VERIFY_RUN_ID==="44673991849"&&r.TRAVNR_RELAY_ROLLING_ROUTE==="DIRECT_VERIFY"&&r.TRAVNR_RELAY_DIRECT_TICK_APPROVED==="0","RELAY_BASELINE");
}
const P_NAMES=["liveOriginals","eligibleOriginals","hardDueOriginals","eligibleNextHour","hardDueNextHour","unboundLiveOriginals","markedExpiredPayloadPresent","unlinkedUnexpiredPopulation","unexpiredPopulationWithoutLiveOriginal"];
const E_NAMES=["duePackets","dueIndexes","expiredHeads","foreignDuePackets","foreignDueIndexes","claims"];
function extract(log,status){
 const rows=[];for(const line of log.split(/\r?\n/)){const i=line.indexOf("{");if(i<0||!line.slice(i).includes('"status":"'+status+'"'))continue;let x;try{x=JSON.parse(line.slice(i).trim())}catch{fail("LOG_RECEIPT_PARSE")};if(x.status===status)rows.push(x)}
 need(rows.length===1,"EXACT_STATUS_"+status);return rows[0];
}
function checkPrivateActual(primary,priv,head,apply){
 const zero=(x,n)=>x&&n.every(k=>x[k]===0)&&x.deletionStopUnresolved===false;
 need(primary.reviewedMainSha===head&&primary.providerCalls===0&&primary.phase6PaidGo===false&&primary.distinctDbActorsVerified===true&&zero(primary.before,P_NAMES)&&primary.objectDeletions===0&&priv.reviewedMainSha===head&&priv.providerCalls===0&&priv.phase6PaidGo===false&&priv.deadlineDueObservedAtInitialRead===false&&zero(priv.before,E_NAMES)&&priv.backupOrPitrVerified===false&&priv.completeRetentionDeploymentVerified===false,"PRIVATE_EXECUTION_SCOPE");
 if(apply)need(primary.status==="PRIMARY_FIDS_ELIGIBLE_AT_READBACK_CLEARED"&&zero(primary.after,P_NAMES)&&primary.databaseWritesPossible===false&&Array.isArray(primary.receipts)&&primary.receipts.length===0&&priv.status==="PRIVATE_EXPIRY_DUE_AT_READBACK_CLEARED"&&zero(priv.after,E_NAMES)&&priv.databaseWritesPossible===false&&Array.isArray(priv.receipts)&&priv.receipts.length===0,"ZERO_WORK_APPLY");
 else need(primary.status==="PRIMARY_FIDS_VERIFY_ONLY_NO_WRITES"&&primary.databaseWrites===0&&priv.status==="PRIVATE_EXPIRY_VERIFY_ONLY_NO_WRITES"&&priv.databaseWrites===0,"EXACT_VERIFY");
 return true;
}
async function dbState(client){
 const q=(await client.query(`SELECT current_database() db,current_user actor,session_user login,
  current_setting('transaction_read_only') ro,current_setting('server_version_num')::int ver,pg_is_in_recovery() replica,
  (SELECT count(*)::int FROM clean.adb_phase6_authorization) auth_count,
  (SELECT count(*)::int FROM clean.adb_phase6_authorization WHERE singleton_key AND NOT enabled AND revoked_at_utc IS NULL AND authorization_id='AUTH-20261119-P5INERTFREEZE' AND manifest_sha256=$1 AND calendar_hash=$2 AND config_hash=$3 AND code_sha=$4) exact_disabled,
  (SELECT count(*)::int FROM clean.adb_incident_stop WHERE NOT resolved) incidents,
  (SELECT count(*)::int FROM clean.adb_collection_batches WHERE status='ACTIVE') batches,
  (SELECT count(*)::int FROM clean.adb_collection_segments WHERE status='ACTIVE') segments,
  (SELECT count(*)::int FROM clean.adb_collection_subs WHERE ended_at IS NULL) subscriptions,
  (SELECT count(*)::int FROM clean.phase5_fids_physical_attempt_v39 WHERE manifest_sha256=$1) attempts,
  (SELECT count(*)::int FROM clean.phase5_other_rest_physical_reservation_v39 WHERE manifest_sha256=$1) other_attempts,
  (SELECT count(*)::int FROM phase6_private.frozen_native_packet_v39) packets,
  (SELECT count(*)::int FROM phase6_private.signed_run_day_index_revision_v39) indexes,
  (SELECT count(*)::int FROM phase6_private.signed_run_day_epoch_claim_v39) claims`,[MANIFEST,CAL,CONFIG,OLD])).rows;
 const x=q[0];need(q.length===1&&x.db==="neondb"&&x.actor==="neondb_owner"&&x.login===x.actor&&x.ro==="on"&&x.ver>=160000&&x.ver<170000&&x.replica===false&&x.auth_count===1&&x.exact_disabled===1&&["incidents","batches","segments","subscriptions","attempts","other_attempts","packets","indexes","claims"].every(k=>x[k]===0),"EXACT_DISABLED_EMPTY_PRODUCTION_SCOPE");
 return {authDisabled:true,privatePackets:x.packets,privateIndexes:x.indexes,providerAttempts:x.attempts+x.other_attempts,incidents:x.incidents};
}
async function inspectGuard(c,oldSql,newSql,installed){
 const query=async(name,body,expected)=>{
 const f=(await c.query(`SELECT p.oid::text oid,p.prosrc body,p.prosecdef definer,p.provolatile vol,p.pronargs::int nargs,p.prokind kind,p.proconfig config,p.prorettype='trigger'::regtype ret,pg_get_userbyid(p.proowner)=current_user owner_matches,l.lanname lang,
  NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee<>p.proowner OR a.privilege_type<>'EXECUTE') owner_only
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang WHERE n.nspname='clean' AND p.proname=$1`,[name])).rows;
 if(!expected){need(f.length===0,"GUARD_ALREADY_OR_PARTLY_INSTALLED_NO_REPLAY");return}
 const x=f[0];need(f.length===1&&x.body===body&&x.definer===true&&x.vol==="v"&&x.nargs===0&&x.kind==="f"&&x.ret===true&&x.owner_matches===true&&x.owner_only===true&&x.lang==="plpgsql"&&Array.isArray(x.config)&&x.config.length===1&&x.config[0].replace(/\s/g,"")==="search_path=pg_catalog,pg_temp","GUARD_FUNCTION_CATALOG_DRIFT");return x.oid;
 };
 const oldBody=oldSql.match(/AS \$guard\$([\s\S]*?)\$guard\$;/)?.[1],newBody=newSql.match(/AS \$guard\$([\s\S]*?)\$guard\$;/)?.[1];need(oldBody&&newBody,"EXACT_SQL_GUARD_BODY");
 const oldOid=await query("phase5_physical_rest_live_guard_v39",oldBody,true),newOid=await query("phase6_private_due_physical_rest_guard_v39",newBody,installed);
 const n=["a00_phase5_fids_physical_rest_live_guard_v39","a00_phase5_other_physical_rest_live_guard_v39","a01_phase6_fids_private_due_guard_v39","a01_phase6_other_private_due_guard_v39"];
 const t=(await c.query(`SELECT t.tgname name,c.relname tbl,n.nspname schema,t.tgfoid::text fn,t.tgenabled enabled,t.tgtype::int type,t.tgnargs::int nargs,t.tgqual IS NULL no_when,t.tgattr::text attrs,t.tgconstraint=0 no_constraint,t.tgdeferrable deferred,t.tginitdeferred initdeferred,t.tgoldtable oldtable,t.tgnewtable newtable,pg_get_userbyid(c.relowner)=current_user owner_matches
  FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE NOT t.tgisinternal AND (t.tgfoid=$1::oid OR t.tgfoid=$2::oid OR (n.nspname='clean' AND t.tgname=ANY($3::text[])))`,[oldOid,newOid??"0",n])).rows;
 need(t.length===(installed?4:2)&&n.slice(0,installed?4:2).every((name,i)=>t.some(x=>x.name===name&&x.schema==="clean"&&x.tbl===(i%2===0?"phase5_fids_physical_attempt_v39":"phase5_other_rest_physical_reservation_v39")&&x.fn===(i<2?oldOid:newOid)&&x.enabled==="O"&&x.type===7&&x.nargs===0&&x.no_when===true&&x.attrs===""&&x.no_constraint===true&&x.deferred===false&&x.initdeferred===false&&x.oldtable===null&&x.newtable===null&&x.owner_matches===true)),"EXACT_GUARD_TRIGGERS");
 return {originalV0104Preserved:true,privateGuardInstalled:installed,enabledPhysicalTriggers:t.length};
}
async function run(){
 const [mode,revision,recovery,journalPath]=process.argv.slice(2);
 need(process.argv.length===6&&mode==="ADOPT_EXACT_925_COMMISSION_NONPAID_RETENTION_ONLY"&&process.env.GITHUB_ACTIONS!=="true"&&process.env.ADB_AUTO_COLLECT==="0"&&process.env.V39_PHASE6_PROCESS_ARMED==="0"&&process.env.V39_PHASE6_OWNER_APPROVED==="0"&&process.env.NODE_TLS_REJECT_UNAUTHORIZED!=="0"&&!["AERODATABOX_API_KEY","RAPIDAPI_KEY","AERODATABOX_WEBHOOK_SECRET","V39_DATABASE_RUNTIME_URL"].some(k=>process.env[k]),"OWNER_STOP_ONLY");
 const root=fs.realpathSync(process.cwd()),home=fs.realpathSync(process.env.HOME),rev=privateDir(revision),rec=privateDir(recovery),out=path.resolve(journalPath);
 need(path.dirname(out)===home&&path.basename(out).startsWith(".travnr-phase6-adopt925-")&&!fs.existsSync(out),"ONE_USE_PRIVATE_JOURNAL");
 privateFile(path.join(rev,"new-stage-input.json"),STAGE,48000);privateFile(path.join(rec,"policy-complete-shape-NOT-RUNTIME.json"),WORK);privateFile(path.join(rec,"revised-static-inputs-PRIVATE.json"),STATIC);
 need(main(P)===OLD&&main(R)===RELAY,"MAIN_DRIFT");
 checkCandidate(api(P,"pulls/"+PR),RUNS.map(id=>api(P,"actions/runs/"+id)));
 const tree=api(P,"git/commits/"+CANDIDATE).tree.sha;need(C.test(tree),"EXACT_CANDIDATE_TREE");
 const p=vars(P),r=vars(R);checkInitialVars(p,r);
 const temp=fs.mkdtempSync(path.join(home,".travnr-owner-adopt-helper-"));
 let pool,fd;
 try{
 const helpers=[["p6_nov20_final_primary_relay_repin.cjs",REPIN_BLOB],["p6_nov20_runtime_repin_evidence.cjs",EVIDENCE_BLOB]];
 for(const [name,id] of helpers)fs.writeFileSync(path.join(temp,name),blob(id),{flag:"wx",mode:0o600});
 const {verifyReceipt}=require(path.join(temp,helpers[0][0])),{STOP_PATH,verifyCurrentStop}=require(path.join(temp,helpers[1][0])),stopRaw=blob(STOP_BLOB);
 need(sha(stopRaw)===STOP_SHA,"STOP_BYTES");
 const e=JSON.parse(stopRaw.toString("utf8")),ledger={evidence:[{evidenceId:e.evidenceId,path:STOP_PATH,sha256:STOP_SHA}],approvals:[]};
 const stopped=()=>verifyCurrentStop(stopRaw.toString("utf8"),ledger,pages(P,"actions/secrets","secrets"),Object.keys(vars(P)).map(name=>({name})));
 stopped();
 const ev=api(R,"environments/travnr-target-forward/variables?per_page=100");need(ev.total_count===ev.variables.length&&(ev.variables.find(x=>x.name==="TRAVNR_TARGET_FORWARD_ENV_READY")?.value??r.TRAVNR_TARGET_FORWARD_ENV_READY)==="1","RELAY_ENV_READY");
 const u=new URL(process.env.DATABASE_URL??"");need(["postgres:","postgresql:"].includes(u.protocol)&&decodeURIComponent(u.username)==="neondb_owner"&&u.password&&u.pathname==="/neondb"&&u.hostname.endsWith(".neon.tech")&&["","5432"].includes(u.port)&&["require","verify-full"].includes(u.searchParams.get("sslmode"))&&u.searchParams.getAll("sslmode").length===1&&!u.hash&&[...u.searchParams.keys()].every(k=>["sslmode","channel_binding"].includes(k))&&sha(u.host.toLowerCase()+u.pathname)===p.P5_PRIMARY_FIDS_EXPECTED_ENDPOINT_SHA256,"EXACT_EXISTING_OWNER_ENDPOINT");
 u.searchParams.set("sslmode","verify-full");
 const {Pool}=createRequire(path.join(root,"package.json"))("pg");pool=new Pool({connectionString:u.toString(),max:1,connectionTimeoutMillis:8000,query_timeout:30000,application_name:"p6_owner_combined_maintenance"});
 const oldSql=blob(V104_BLOB).toString("utf8"),guardSql=blob(GUARD_BLOB).toString("utf8");
 need(api(P,"contents/"+GUARD_PATH+"?ref="+CANDIDATE).sha===GUARD_BLOB,"REVIEWED_GUARD_IN_COMBINED_TREE");
 const read=async(installed)=>{const c=await pool.connect();try{await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");await c.query("SET LOCAL statement_timeout='12000ms'");const s=await dbState(c),g=await inspectGuard(c,oldSql,guardSql,installed);return {...s,...g}}finally{await c.query("ROLLBACK").catch(()=>{});c.release()}};
 const before=await read(false);
 const active=()=>{for(const [repo,wfs] of [[P,[W,"phase6-direct-recovery-tick.yml","phase6-rolling-controller-bounded-session.yml"]],[R,["external-clock.yml"]]])for(const status of ["queued","in_progress","waiting","requested","pending"]){if(api(repo,"actions/workflows/"+w+"/runs?branch=main&status="+status+"&per_page=1").total_count>0)return true}return false};
 // Do not merge while an existing scheduler/relay job is active.
 const until=Date.now()+180000;while(active()){need(main(P)===OLD&&Date.now()<until,"ACTIVE_WORKFLOW_REVIEW");await new Promise(r=>setTimeout(r,5000))}
 need(main(P)===OLD&&main(R)===RELAY,"MAIN_MOVED_BEFORE_ADOPTION");stopped();checkInitialVars(vars(P),vars(R));
 fs.mkdirSync(out,{mode:0o700});fd=fs.openSync(path.join(out,"journal.jsonl"),"wx",0o600);
 const emit=x=>{const z={atUtc:new Date().toISOString(),...x,phase6PaidGo:false};fs.writeSync(fd,JSON.stringify(z)+"\n");fs.fsyncSync(fd);console.log(JSON.stringify(z))};
 emit({status:"EXACT_925_ADOPTION_STARTED_NO_REPLAY",candidate:CANDIDATE,before});
 let pr=api(P,"pulls/"+PR);need(pr.head.sha===CANDIDATE&&pr.base.sha===OLD&&pr.state==="open","PR_DRIFT");
 if(pr.draft){emit({status:"PR_READY_ATTEMPT"});gh(["pr","ready",String(PR),"-R",P]);}
 pr=api(P,"pulls/"+PR);need(pr.head.sha===CANDIDATE&&pr.base.sha===OLD&&!pr.draft&&pr.mergeable===true&&main(P)===OLD,"PR_READY_DRIFT");
 emit({status:"MERGE_ATTEMPT_NO_REPLAY",old:OLD,candidate:CANDIDATE});
 const merged=JSON.parse(gh(["api","--method","PUT","repos/"+P+"/pulls/"+PR+"/merge","-f","sha="+CANDIDATE,"-f","merge_method=merge","-f","commit_title=Phase 6 reviewed runtime maintenance adoption (NO GO)"]));
 need(merged.merged===true&&C.test(merged.sha),"MERGE_UNACKNOWLEDGED");
 const head=merged.sha,stable=()=>need(main(P)===head&&main(R)===RELAY,"MAIN_DRIFT_AFTER_MERGE_NO_REPLAY");
 stable();checkMerged(api(P,"git/commits/"+head),tree,head);emit({status:"EXACT_COMBINED_MAIN_ADOPTED_NO_PAID",main:head});
 const set=(repo,name,value)=>{stable();stopped();emit({status:"VARIABLE_WRITE_ATTEMPT",repo,name});gh(["variable","set",name,"-R",repo,"--body",value]);need(gh(["variable","get",name,"-R",repo])===value,"VARIABLE_READBACK");emit({status:"VARIABLE_READBACK",repo,name});stable()};
 set(P,"P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA",head);
 const dispatch=async(confirm)=>{
  stable();stopped();emit({status:"RETENTION_DISPATCH_ATTEMPT_NO_REPLAY",confirm});
  const a=JSON.parse(gh(["api","--method","POST","-H","X-GitHub-Api-Version: 2026-03-10","repos/"+P+"/actions/workflows/"+W+"/dispatches","--input","-"],{input:JSON.stringify({ref:"main",inputs:{confirm,approved_main_sha:head}}),stdio:["pipe","pipe","ignore"]}));
  const id=a.workflow_run_id;need(Number.isSafeInteger(id)&&id>0&&a.run_url==="https://api.github.com/repos/"+P+"/actions/runs/"+id,"UNKNOWN_DISPATCH_NO_REPLAY");
  emit({status:"RETENTION_DISPATCH_ACK",runId:id,confirm});
  gh(["run","watch",String(id),"-R",P,"--interval","10","--exit-status"],{timeout:720000});
  const run=api(P,"actions/runs/"+id),jobs=api(P,"actions/runs/"+id+"/jobs?filter=latest&per_page=100"),job=jobs.jobs?.[0];
  need(run.id===id&&run.head_sha===head&&run.head_branch==="main"&&run.event==="workflow_dispatch"&&run.run_attempt===1&&run.conclusion==="success"&&jobs.total_count===1&&job?.conclusion==="success"&&job.run_attempt===1&&job.steps?.some(x=>x.name==="Verify exact main and execute only bounded primary FIDS expiry"&&x.conclusion==="success"),"ACTUAL_RETENTION_RUN_REQUIRED");
  return {id,run,jobs,log:gh(["run","view",String(id),"-R",P,"--job",String(job.id),"--log"])};
 };
 const v=await dispatch(VERIFY),proof=verifyReceipt(v.run,v.jobs,v.log,head,v.id,Date.now());emit({status:"INDEPENDENT_NEW_MAIN_PRIMARY_VERIFY",...proof});
 set(R,"TRAVNR_RELAY_PRIMARY_VERIFY_RUN_ID",String(proof.runId));set(R,"TRAVNR_APPROVED_TARGET_MAIN_SHA",head);
 emit({status:"PRIMARY_AND_RELAY_REPIN_COMPLETE_NO_GO",main:head,verifyRunId:proof.runId});
 // The reviewed exact candidate's executable SQL is promoted ONLY by this
 // explicit owner commissioning operation, after actual current-main VERIFY.
 // It adds a function and two triggers; no DELETE/UPDATE/role grants.
 stable();stopped();await read(false);
 const db=await pool.connect();
 try{emit({status:"PRIVATE_DUE_GUARD_INSTALL_ATTEMPT_NO_REPLAY",sqlBlob:GUARD_BLOB});await db.query(guardSql);emit({status:"PRIVATE_DUE_GUARD_COMMIT_ACK"});}
 catch{fail("GUARD_SQL_OUTCOME_RECONCILE_NO_REPLAY")}finally{db.release()}
 const after=await read(true);emit({status:"PRIVATE_DUE_GUARD_INDEPENDENT_CATALOG_READBACK",...after});
 set(P,"P6_PRIVATE_EPOCH_EXPIRY_MANIFEST_SHA256",MANIFEST);set(P,"P6_PRIVATE_EPOCH_EXPIRY_APPROVAL",PRIVATE_APPLY);set(P,"P6_PRIVATE_EPOCH_EXPIRY_MODE","APPLY_DUE_ONLY");
 // Real bounded APPLY on empty exact state; verifies both restricted actors
 // and the actual private extension, not merely variable metadata.
 const z=await dispatch(APPLY),pr1=extract(z.log,"PRIMARY_FIDS_ELIGIBLE_AT_READBACK_CLEARED"),pr2=extract(z.log,"PRIVATE_EXPIRY_DUE_AT_READBACK_CLEARED");
 checkPrivateActual(pr1,pr2,head,true);await read(true);stable();stopped();
 emit({status:"COMBINED_MAIN_ADOPTED_PRIMARY_RELAY_REPINNED_PRIVATE_DUE_ONLY_COMMISSIONED_NO_GO",main:head,guardInstalled:true,privateDueOnlyActive:true,verifyRunId:v.id,applyRunId:z.id,paidProviderCalls:0,sourceAuthorizationEnabled:false,actualNextScheduledRunAndExternalChildNotYetVerified:true,privateDeadlineTimelinessCertified:false,backupOrPitrVerified:false,phase7PreservationDeployed:false,macReadOnlyMonitorRepinStillRequired:true});
 }finally{if(fd!==undefined)fs.closeSync(fd);if(pool)await pool.end().catch(()=>{});fs.rmSync(temp,{recursive:true,force:true})}
}
module.exports={checkCandidate,checkMerged,checkInitialVars,checkPrivateActual,extract,OLD,CANDIDATE,RELAY,RUNS};
if(require.main===module)run().catch(e=>{const m=String(e?.message??"");console.error(/^HOLD_P6_OWNER_COMBINED_[A-Z0-9_]+$/.test(m)?m:"HOLD_P6_OWNER_COMBINED_REDACTED_RECONCILE_JOURNAL_NO_REPLAY");process.exitCode=2});
