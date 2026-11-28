import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {spawnSync} from "node:child_process";
import {PATH,BLOB,READY_STATUS,INSTALLED_STATUS,RELEASE_READY,inspectV0114,installV0114Once}
 from "../scripts/v39_phase5b_v0114_owner_once_v39.mjs";

// Transport/catalog mocks cover outcome ambiguity and guard failure only.
// Actual pg16 functions, permissions and row preservation run in the separate
// existing disposable lifecycle fixture; these mocks do not substitute for it.
const bytes=readFileSync(PATH),sql=bytes.toString("utf8");
const sha=x=>createHash("sha256").update(x).digest("hex");
const copy=x=>JSON.parse(JSON.stringify(x));
const OWNER="phase5_cd_source_registration_owner_v39",PREP="phase5_fids_prepare_prod_20261107";
const LOGIN="phase5_p30_prepare_login_20261107",ACTOR="phase5_cd_ci_owner";
const columns=["snapshot_id","flight_instance_id","population_query_id","fids_response_hash","source_query_digest",
 "rights_review_sha256","selected_t_native_utc","selected_t_version","t24_cutoff_utc","frame_hash","config_hash",
 "post_pre_commit_db_observed_at_utc"].sort();
const oldHashes=["70ad33929da9a97d30a4f88fa0283328c15bd03160bc560ffd3c4937f3de5cd7",
 "6779aba6f887a9137b6e0f1dce048048f98c1454b7f3badf4e1331b94a5e3057",
 "6ca4b9c0939dbbff56ff1a57a1a4a246dd7532dd75323d4c5955f8f0b13dee6c",
 "b085f669a28eff6b35f003c020a5453dc5aa8bde38d9565cbf126bb65de5ef02"];
const hashes=[...oldHashes,...["register_witnessed","ensure_witnessed"].map(t=>sha(sql.split("$"+t+"$")[1]))];
const relations=["clean.phase5_fids_allowed_query_v39","clean.phase5_fids_physical_attempt_v39",
 "clean.phase5_fids_original_binding_v39","clean.fids_query_response","clean.flight_population",
 "clean.flight_snapshots","clean.phase5_cd_pre_task_v39","clean.phase5_cd_pre_task_v39_task_id_seq",
 "clean.phase5_t24_postcommit_witness_v39"];
const acl=()=>[OWNER,PREP].map(grantee=>({grantee,grantor:OWNER,privilege:"EXECUTE",grantable:false}));
function fixture(installed=false){
 const count=installed?6:4;
 return {context:{database:"neondb",actor:ACTOR,login:ACTOR,version:160011,replica:false,
  actor_super:false,actor_createrole:true,schema_owner:ACTOR,queue_owner:ACTOR,owner_set:false,owner_create:false,
  owner_table_access:false,owner_column_write:false,prepare_column_access:false,login_column_access:false,overload_count:installed?4:2},
 routines:Array.from({length:count},(_,i)=>({slot:i+1,oid:String(100+i),owner:i===2||i===3?"postgres":OWNER,
  definer:![2,3].includes(i),config:[2,3].includes(i)?null:["search_path=pg_catalog, pg_temp"],kind:"f",language:"plpgsql",
  returns_set:[1,5].includes(i),return_type:[2,3].includes(i)?"trigger":[1,5].includes(i)?"record":"bigint",
  body_sha256:hashes[i],acl:[2,3].includes(i)?[{grantee:"PUBLIC",grantor:"postgres",privilege:"EXECUTE",grantable:false}]:acl()})),
 metadata:{roles:[ACTOR,OWNER,PREP,LOGIN].map(name=>({name,login:[ACTOR,LOGIN].includes(name),inherit:false,
  super:false,createdb:false,createrole:name===ACTOR,replication:false,bypassrls:false})),memberships:[],schemaAcl:[],
  relations:relations.map((name,i)=>({name,oid:String(200+i),owner:ACTOR,acl:[]})),
  triggers:[{name:"p5_t24_witness_before_insert_v39",oid:"301",function_oid:"102",enabled:"O",type:7,definition:"unchanged insert trigger"},
   {name:"p5_t24_witness_no_rewrite_v39",oid:"302",function_oid:"103",enabled:"O",type:27,definition:"unchanged immutable trigger"}],
  columns:columns.map(name=>({name,owner_select:installed,owner_grantable:false,
   acl:installed?[{grantee:OWNER,grantor:ACTOR,privilege:"SELECT",grantable:false}]:[]}))},
 queue:{rows:"7",unsettled:"0",fingerprint:sha("seven unchanged historical terminal tasks")}};
}
function world(options={}){
 let db=fixture(Boolean(options.installed)),journal=[];
 options.change?.(db);
 const connections=[],events=[];
 const port={async read(){return journal.at(-1)??null;},async append(r){events.push("journal:"+r.event);journal.push(copy(r));}};
 async function open(){
  const id=connections.length+1,c={id,staged:null,locked:false,ended:false,queries:[],
   async query(text){
    this.queries.push(text);events.push("query:"+id+":"+text.slice(0,28));
    if(options.readbackUnavailable&&id===3)throw new Error("private connection failure must not leak");
    if(text.startsWith("LOCK TABLE")){if(options.lockConflict)throw Object.assign(new Error("secret lock detail"),{code:"55P03"});this.locked=true;return {rows:[]};}
    if(text.includes("/* V0114_CONTEXT */"))return {rows:[copy((this.staged??db).context)]};
    if(text.includes("/* V0114_ROUTINES */"))return {rows:copy((this.staged??db).routines)};
    if(text.includes("/* V0114_METADATA */"))return {rows:[{metadata:copy((this.staged??db).metadata)}]};
    if(text.includes("/* V0114_QUEUE */"))return {rows:[copy((this.staged??db).queue)]};
    if(text.includes("CREATE FUNCTION clean.phase5_cd_register_source_flight_v39")){
     assert.equal(this.locked,true,"The real queue lock must precede DDL");
     assert.equal(journal.at(-1)?.event,"DDL_ATTEMPT_STARTED","Durable intent must precede DDL");
     this.staged=fixture(true);options.afterDDL?.(this.staged);return {rows:[]};
    }
    if(text==="COMMIT"){
     assert.equal(journal.at(-1)?.event,"COMMIT_ATTEMPTED");
     if(options.commitApplied!==false)db=this.staged??db;
     this.staged=null;
     if(options.unknownCommit)throw new Error("private network error after server outcome");
     return {rows:[]};
    }
    if(text==="ROLLBACK"){this.staged=null;return {rows:[]};}
    return {rows:[]};
   },async end(){this.ended=true;}};
  connections.push(c);return c;
 }
 return {open,journal:port,connections,events,get records(){return journal;},get db(){return db;},
  ddlCount:()=>connections.flatMap(c=>c.queries).filter(q=>q.includes("CREATE FUNCTION clean.phase5_cd_register_source_flight_v39")).length};
}

test("exact SQL pin rejects any byte change before opening owner session",async()=>{
 assert.equal(createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex"),BLOB);
 const w=world();
 await assert.rejects(installV0114Once({open:w.open,bytes:Buffer.concat([bytes,Buffer.from("\n")]),ci:true,journal:w.journal}),/SQL_BLOB_MISMATCH/);
 assert.equal(w.connections.length,0);assert.equal(w.records.length,0);
});

test("settled historical rows survive single locked install and fresh independent readback",async()=>{
 const w=world();const original=copy(w.db);
 const r=await installV0114Once({open:w.open,bytes,ci:true,journal:w.journal});
 assert.equal(r.state,INSTALLED_STATUS);assert.equal(r.alreadyInstalledNoReplay,false);
 assert.equal(w.connections.length,3);assert.ok(w.connections.every(c=>c.ended));assert.equal(w.ddlCount(),1);
 assert.deepEqual(w.db.queue,original.queue);assert.deepEqual(w.db.routines.slice(0,4),original.routines);
 assert.deepEqual(w.db.metadata.relations,original.metadata.relations);assert.deepEqual(w.db.metadata.roles,original.metadata.roles);
 assert.deepEqual(w.records.map(r=>r.event),["DDL_ATTEMPT_STARTED","COMMIT_ATTEMPTED","COMMIT_ACKNOWLEDGED","READBACK_VERIFIED"]);
 const before=w.connections.length,again=await installV0114Once({open:w.open,bytes,ci:true,journal:w.journal});
 assert.equal(again.alreadyInstalledNoReplay,true);assert.equal(w.connections.length,before+1);assert.equal(w.ddlCount(),1);
});

test("unknown COMMIT with durable effect does not roll back/retry and reconciles independently",async()=>{
 const w=world({unknownCommit:true});
 await assert.rejects(installV0114Once({open:w.open,bytes,ci:true,journal:w.journal}),/COMMIT_OUTCOME_UNKNOWN_RECONCILE_ONLY_NO_RETRY/);
 assert.equal(w.connections.length,2);assert.equal(w.ddlCount(),1);
 assert.equal(w.connections[1].queries.filter(q=>q==="COMMIT").length,1);
 assert.equal(w.connections[1].queries.filter(q=>q==="ROLLBACK").length,0);
 assert.equal(w.records.at(-1).event,"OUTCOME_UNKNOWN");
 const r=await installV0114Once({open:w.open,bytes,ci:true,journal:w.journal});
 assert.equal(r.alreadyInstalledNoReplay,true);assert.equal(r.priorAttemptReconciled,true);assert.equal(w.ddlCount(),1);
});

test("unknown COMMIT without observed install never permits blind replay",async()=>{
 const w=world({unknownCommit:true,commitApplied:false});
 await assert.rejects(installV0114Once({open:w.open,bytes,ci:true,journal:w.journal}),/COMMIT_OUTCOME_UNKNOWN/);
 await assert.rejects(installV0114Once({open:w.open,bytes,ci:true,journal:w.journal}),/PRIOR_ATTEMPT_REQUIRES_READONLY_RECONCILIATION_NO_DDL/);
 assert.equal(w.ddlCount(),1);
 const c=await w.open();assert.equal((await inspectV0114(c,bytes,{ci:true})).state,READY_STATUS);await c.end();
});

test("acknowledged COMMIT without fresh readback is a hold, never claimed installed",async()=>{
 const w=world({readbackUnavailable:true});
 await assert.rejects(installV0114Once({open:w.open,bytes,ci:true,journal:w.journal}),/POSTCOMMIT_READBACK_UNAVAILABLE_RECONCILE_ONLY/);
 assert.equal(w.ddlCount(),1);assert.equal(w.records.at(-1).event,"COMMIT_ACKNOWLEDGED");
 assert.ok(w.connections.every(c=>c.ended));
});

test("live pin recheck fails before durable intent and DDL",async()=>{
 const w=world();let calls=0;
 await assert.rejects(installV0114Once({open:w.open,bytes,ci:true,journal:w.journal,assertPinned:async()=>{
  if(++calls===2)throw new Error("private main metadata drift");
 }}),/EXACT_MAIN_OR_PAUSE_GUARD_FAILED/);
 assert.equal(calls,2);assert.equal(w.ddlCount(),0);assert.equal(w.records.length,0);
 assert.equal(w.connections.length,1,"Fresh external guard must run before opening mutation transaction");
});

test("queue lock contention holds before any DDL and does not retry",async()=>{
 const w=world({lockConflict:true});
 await assert.rejects(installV0114Once({open:w.open,bytes,ci:true,journal:w.journal}),/INSTALL_ROLLED_BACK_NO_RETRY/);
 assert.equal(w.ddlCount(),0);assert.equal(w.records.length,0);
 assert.equal(w.connections[1].queries.filter(q=>q.startsWith("LOCK TABLE")).length,1);
});

test("old OID/body/ACL or queue mutation inside transaction forces rollback",async t=>{
 for(const [name,change] of [
  ["old OID",c=>{c.routines[0].oid="999";}],
  ["old body",c=>{c.routines[0].body_sha256="f".repeat(64);}],
  ["old ACL",c=>{c.routines[0].acl.push({grantee:"PUBLIC",grantor:OWNER,privilege:"EXECUTE",grantable:false});}],
  ["historical queue row",c=>{c.queue.fingerprint=sha("changed row");}],
  ["source privilege",c=>{c.metadata.relations[0].acl.push({grantee:"0",grantor:"1",privilege:"SELECT",grantable:false});}]
 ])await t.test(name,async()=>{
  const w=world({afterDDL:change});
  await assert.rejects(installV0114Once({open:w.open,bytes,ci:true,journal:w.journal}),/HOLD_P5B_V0114_/);
  assert.equal(w.ddlCount(),1);assert.equal(w.connections[1].queries.includes("COMMIT"),false);
  assert.equal(w.records.at(-1).event,"ROLLBACK_ACKNOWLEDGED");assert.equal(w.db.routines.length,4);
 });
});

test("partial install, unsettled task and broadened witness access refuse before DDL",async t=>{
 for(const [name,change] of [
  ["partial overload",c=>{c.routines.push(fixture(true).routines[4]);c.context.overload_count=3;}],
  ["unsettled task",c=>{c.queue.unsettled="1";}],
  ["table SELECT",c=>{c.context.owner_table_access=true;}],
  ["PREPARE witness read",c=>{c.context.prepare_column_access=true;}],
  ["preexisting unexpected column grant",c=>{c.metadata.columns[0].owner_select=true;}]
 ])await t.test(name,async()=>{
  const w=world({change});await assert.rejects(installV0114Once({open:w.open,bytes,ci:true,journal:w.journal}),/HOLD_P5B_V0114_/);
  assert.equal(w.ddlCount(),0);assert.equal(w.records.length,0);
 });
});

test("non-CI execution requires a real live pin guard and durable journal",async()=>{
 const w=world();
 await assert.rejects(installV0114Once({open:w.open,bytes}),/LIVE_PIN_GUARD_REQUIRED/);
 await assert.rejects(installV0114Once({open:w.open,bytes,assertPinned:async()=>{}}),/DURABLE_JOURNAL_REQUIRED/);
 assert.equal(w.connections.length,0);
});

test("CLI without exact reviewed inputs cannot contact GitHub or DB",()=>{
 assert.equal(typeof RELEASE_READY,"boolean");
 const r=spawnSync(process.execPath,["scripts/v39_phase5b_v0114_owner_once_v39.mjs","INSTALL_V0114_ONCE"],{encoding:"utf8",env:{PATH:""}});
 assert.equal(r.status,2);assert.match(r.stderr,RELEASE_READY?/EXACT_MODE_ARGUMENTS_REQUIRED/:/CLI_NOT_RELEASED_PENDING_EXACT_REVIEW_AND_NATIVE_CI/);
 assert.equal(r.stdout,"");
});
