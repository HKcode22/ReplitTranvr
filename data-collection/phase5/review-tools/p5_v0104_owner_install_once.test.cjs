'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('./p5_v0104_owner_install_once.cjs');
const who={db:'neondb',actor:'neondb_owner',login:'neondb_owner',schema_owner:'neondb_owner',ver:160016,ro:'on',replica:false,repl:'origin'};
const stop={enabled:0,batches:0,segments:0,subscriptions:0,incidents:0,active_unreserved:0};
const guard={oid:'123',owner:'neondb_owner',prosrc:'reviewed body',nargs:0,definer:true,vol:'v',kind:'f',ret_trigger:true,lang:'plpgsql',owner_only:true,config:['search_path=pg_catalog, pg_temp']};
const shape={owner:'neondb_owner',enabled:'O',type:7,nargs:0,no_when:true,attrs:'',no_constraint:true,deferred:false,initdeferred:false,oldtable:null,newtable:null};
const legacy=['phase5_fids_require_actual_prearm_v39','phase5_fids_v0082_seven_rest_before_physical'].map((name,i)=>({...shape,name,tbl:M.TABLES[0],fn:String(i+10)}));
const triggers=M.TRIGGERS.map((name,i)=>({...shape,name,tbl:M.TABLES[i],fn:guard.oid}));
const counters={source_attempts:0,other_attempts:0};
function fixture({installed=false,identity={},blocked={},pred=6,customF,customT,fail,commitFail=false}={}){
 const calls=[];let write=false,open=false,applied=installed;
 return {calls,c:{async query(q){
 calls.push(q);if(q===fail)throw Error('FIXTURE_QUERY_ERROR');
 if(q.startsWith('BEGIN')){open=true;write=q.includes('READ WRITE');}
 if(q===M.WHO_SQL)return {rows:[{...who,ro:write?'off':'on',...identity}]};
 if(q===M.STOP_SQL)return {rows:[{...stop,...blocked}]};
 if(q===M.EXISTING_SQL)return {rows:[{n:pred}]};
 if(q===M.FN_SQL)return {rows:customF??(applied?[guard]:[])};
 if(q===M.TRIGGER_SQL)return {rows:customT??(applied?[...legacy,...triggers]:legacy)};
 if(q===M.COUNTS_SQL)return {rows:[counters]};
 if(q==='REVIEWED_DDL'){applied=true;return {rows:[]};}
 if(q==='COMMIT'&&commitFail)throw Error('MOCK_ACK_LOST');
 if(q==='COMMIT'||q==='ROLLBACK'){open=false;write=false;}
 return {rows:[]};
 }}};
}
test('exact catalog state or absence, no provider content query',async()=>{
 for(const installed of [false,true]){
  const {c,calls}=fixture({installed});const out=await M.readonly(c,guard.prosrc);
  assert.equal(out.installed,installed);assert.deepEqual(out.legacy,legacy);assert.deepEqual(out.counts,counters);
  assert.equal(calls.at(-1),'ROLLBACK');
  assert.equal(calls.includes('REVIEWED_DDL'),false);
 }
});
test('rejects partial installation, wrong body, broad ACL and disabled or misbound triggers',async()=>{
 for(const args of [
 {customF:[guard],customT:legacy},
 {customF:[],customT:[...legacy,...triggers]},
 {customF:[{...guard,prosrc:'changed'}],customT:[...legacy,...triggers]},
 {customF:[{...guard,owner_only:false}],customT:[...legacy,...triggers]},
 {customF:[guard],customT:[...legacy,{...triggers[0],enabled:'D'},triggers[1]]},
 {customF:[guard],customT:[...legacy,...triggers,{...triggers[0],name:'extra'}]},
 {customT:[legacy[0]]}
 ])await assert.rejects(M.readonly(fixture(args).c,guard.prosrc),/HOLD_P5_V0104_OWNER/);
});
test('wrong identity, stopped-state drift or missing predecessors fail before DDL',async()=>{
 for(const args of [{identity:{db:'other'}},{identity:{login:'other'}},{identity:{repl:'replica'}},{identity:{ver:170000}},{blocked:{enabled:1}},{blocked:{incidents:1}},{blocked:{active_unreserved:1}},{pred:5}]){
  const {c,calls}=fixture(args);await assert.rejects(M.readonly(c,guard.prosrc),/HOLD_P5_V0104_OWNER/);assert.equal(calls.at(-1),'ROLLBACK');assert(!calls.includes('REVIEWED_DDL'));
 }
});
test('transaction fences state, checks old triggers and unchanged ledger counts, commits once',async()=>{
 const {c,calls}=fixture();await M.apply(c,{body:'REVIEWED_DDL',prosrc:guard.prosrc},{installed:false,legacy,counts:counters});
 assert.equal(calls.filter(x=>x==='REVIEWED_DDL').length,1);assert.equal(calls.at(-1),'COMMIT');assert(calls.some(x=>x.startsWith('LOCK TABLE')));
});
test('never replay already installed or uncertain commit; definite failure rolls back',async()=>{
 const expected={installed:false,legacy,counts:counters},parsed={body:'REVIEWED_DDL',prosrc:guard.prosrc};
 let x=fixture({installed:true});await assert.rejects(M.apply(x.c,parsed,expected),/ALREADY_INSTALLED/);assert(!x.calls.includes('REVIEWED_DDL'));
 x=fixture({fail:'REVIEWED_DDL'});await assert.rejects(M.apply(x.c,parsed,expected),/FIXTURE_QUERY_ERROR/);assert.equal(x.calls.at(-1),'ROLLBACK');
 x=fixture({commitFail:true});await assert.rejects(M.apply(x.c,parsed,expected),/COMMIT_UNKNOWN_READONLY_RECONCILE_NO_REPLAY/);assert.equal(x.calls.at(-1),'COMMIT');assert.equal(x.calls.filter(q=>q==='REVIEWED_DDL').length,1);
});
test('invalid migration and ambiguous TLS/source environment are refused',()=>{
 assert.throws(()=>M.parseMigration(Buffer.from('BEGIN; COMMIT;')),/EXACT_SQL_BLOB_REQUIRED/);
 const env={DATABASE_URL:'postgresql://neondb_owner:synthetic@example.neon.tech/neondb?sslmode=require',ADB_AUTO_COLLECT:'0',V39_PHASE6_PROCESS_ARMED:'0',V39_PHASE6_OWNER_APPROVED:'0'};
 assert.equal(new URL(M.safeUrl(env)).searchParams.get('sslmode'),'verify-full');
 for(const other of [{GITHUB_ACTIONS:'true'},{AERODATABOX_API_KEY:'synthetic'},{NODE_TLS_REJECT_UNAUTHORIZED:'0'},{DATABASE_URL:env.DATABASE_URL+'&sslmode=disable'},{V39_DATABASE_RUNTIME_URL:env.DATABASE_URL}])assert.throws(()=>M.safeUrl({...env,...other}),/HOLD_P5_V0104_OWNER/);
});
