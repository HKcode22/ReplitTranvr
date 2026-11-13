import test from "node:test";
import assert from "node:assert/strict";
import {
 P6_OWNER_TABLES,P6_OWNER_SAMPLE_LIMIT,inspectP6OwnerDataflowReadOnly,
 classifyP6ReadOnlyTable
} from "../scripts/v39_phase6_owner_31day_dataflow_readonly.mjs";

function mock({deny=false,invalidClock=false,injectError=false}={}){
 const queries=[],events=[];
 const c={async query(sql,params=[]){
  queries.push([sql,params]);
  if(sql.startsWith("BEGIN ")||sql.startsWith("SET LOCAL ")||
     sql==="SAVEPOINT p6_table_view"||
     sql==="ROLLBACK TO SAVEPOINT p6_table_view"||
     sql==="RELEASE SAVEPOINT p6_table_view"||sql==="ROLLBACK")
   return{rows:[]};
  if(sql.includes("current_database() AS db"))
   return{rows:[{db:"neondb",actor:"neondb_owner",ro:"on",
     version:160016,db_now:invalidClock?"garbled":"2026-11-13T23:01:00Z",
     database_bytes:"75415552"}]};
  if(sql.includes("to_regclass($1) IS NOT NULL AS present"))
   return{rows:[{present:params[0]==="clean.fids_query_response",
     can_read:!deny}]};
  if(sql.includes("FROM information_schema.columns"))
   return{rows:[{column_name:"available_at"},{column_name:"raw_payload"},
     {column_name:"raw_expired_at_utc"}]};
  if(sql.includes("SELECT day_utc::text AS day_utc")){
   if(injectError){const e=new Error("secret api key never printed");
    e.code="42501";throw e;}
   return{rows:[{day_utc:"2026-11-13",n:2},{day_utc:"2026-11-12",n:1}]};
  }
  throw Error("UNEXPECTED_TEST_SQL:"+sql.slice(0,100));
 }};
 return{c,queries,events};
}
test("fixed owner 31-day catalog cannot take free-form table SQL",()=>{
 assert(P6_OWNER_TABLES.length>=15);
 assert(P6_OWNER_TABLES.every(x=>/^(clean|phase6_private)\.[a-z0-9_]+$/.test(x[1])));
 assert.equal(new Set(P6_OWNER_TABLES.map(x=>x[1])).size,P6_OWNER_TABLES.length);
 assert.equal(P6_OWNER_SAMPLE_LIMIT,1201);
});
test("cold schema is NOT an observed zero and sampled cap never exact",()=>{
 assert.equal(classifyP6ReadOnlyTable({present:false,canRead:false,columns:[],rows:null}),
  "ABSENT_NOT_A_ZERO");
 assert.equal(classifyP6ReadOnlyTable({present:true,canRead:false,columns:[],rows:null}),
  "DENIED_NOT_A_ZERO");
 assert.equal(classifyP6ReadOnlyTable({present:true,canRead:true,columns:["x"],rows:1201}),
  "AT_LEAST_SAMPLE_LIMIT_ROWS");
 assert.equal(classifyP6ReadOnlyTable({present:true,canRead:true,columns:["x"],rows:3}),
  "EXACT_ROWS_IN_LOOKBACK_UNDER_CAP");
 assert.throws(()=>classifyP6ReadOnlyTable({
  present:true,canRead:true,columns:["x"],rows:1202}),/BAD_CAPPED_COUNT/);
});
test("read-only pipeline emits chronological stage counts and never selects data bytes",async()=>{
 const x=mock();
 const t=await inspectP6OwnerDataflowReadOnly(x.c,{emit:e=>x.events.push(e)});
 assert.equal(t["SOURCE ORIGINALS"].rowsSampled,3);
 assert.equal(t["PRE SNAPSHOTS"].status,"ABSENT_NOT_A_ZERO");
 assert(x.events.some(e=>e.stage==="SOURCE ORIGINALS"&&e.event==="STAGE_START"));
 assert(x.events.some(e=>e.stage==="SOURCE ORIGINALS"&&e.event==="STAGE_RESULT"&&
  e.hasSensitiveProviderValues===true&&e.contentsRead===false));
 const end=x.events.find(e=>e.event==="RUN_SUMMARY");
 assert(end&&end.databaseWrites===0&&end.providerCalls===0&&end.paidPhase6Go===false);
 assert.equal(x.events.filter(e=>e.event==="STAGE_RESULT").length,P6_OWNER_TABLES.length);
 assert(x.queries.some(q=>q[0]==="ROLLBACK"));
 assert(!x.queries.some(q=>/\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bCREATE\b|\bCOMMIT\b/.test(q[0])));
 assert(!x.queries.some(q=>/SELECT\s+.*(?:raw_payload|raw_body|payload_bytes)/.test(q[0])));
 assert(!JSON.stringify(x.events).includes("raw_payload"));
});
test("permission denied is UNKNOWN, not zero",async()=>{
 const x=mock({deny:true});
 await inspectP6OwnerDataflowReadOnly(x.c,{emit:e=>x.events.push(e)});
 assert.equal(x.events.find(e=>e.stage==="SOURCE ORIGINALS"&&e.event==="STAGE_RESULT").status,
  "DENIED_NOT_A_ZERO");
});
test("SQL error stays redacted and savepoint rolls back before next stage",async()=>{
 const x=mock({injectError:true});
 await inspectP6OwnerDataflowReadOnly(x.c,{emit:e=>x.events.push(e)});
 const f=x.events.find(e=>e.stage==="SOURCE ORIGINALS"&&e.event==="STAGE_RESULT");
 assert.equal(f.status,"UNKNOWN_NOT_ZERO");
 assert.equal(f.sqlstate,"42501");
 assert(!JSON.stringify(x.events).includes("secret api key"));
 assert(x.queries.some(q=>q[0]==="ROLLBACK TO SAVEPOINT p6_table_view"));
});
test("unverified DB clock holds without collecting or printing provider rows",async()=>{
 const x=mock({invalidClock:true});
 await assert.rejects(inspectP6OwnerDataflowReadOnly(x.c,{
  emit:e=>x.events.push(e)}),/HOLD_P6_OWNER_VISIBILITY_UNVERIFIED_DB_CLOCK/);
 assert.equal(x.events.length,0);
 assert(x.queries.some(q=>q[0]==="ROLLBACK"));
});
