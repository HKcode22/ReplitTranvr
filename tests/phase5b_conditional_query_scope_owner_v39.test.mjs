import test from "node:test";
import assert from "node:assert/strict";
import {classifyP6ConditionalQueryMarker as classify,projectP6ConditionalQueryScope as project,readP6ConditionalQueryScope as read} from "../scripts/v39_phase5b_conditional_query_scope_owner.mjs";
const r={day:4,horizon:"T-24h",planned_utc:"2026-11-27T11:45:00.000Z",cohort_utc:"2026-11-28T00:00:00.000Z",
 packet_present:true,packet_scope_match:true,content_hash_match:true,packet_reviewed_utc:"2026-11-26T23:49:00.000Z",
 packet_planned_utc:"2026-11-27T11:45:00.000Z",packet_cohort_utc:"2026-11-28T00:00:00.000Z",
 marker_present:true,marker_exact_shape:true,marker_protocol_shape:true,marker_reviewed:true,
 marker_effective_utc:"2026-11-26T23:00:00.000Z",marker_cohort_utc:"2026-11-28T00:00:00.000Z"};
test("T085 exact prospective marker distinct from absent, expired/unavailable, drift and unverified signature",()=>{
 assert.equal(classify(r),"CONDITIONAL_MARKER_CLOCK_AND_SHAPE_MATCH_NOT_SIGNATURE_PROOF");
 assert.equal(classify({...r,marker_present:false}),"NO_CONDITIONAL_SOURCE_MARKER");
 assert.equal(classify({...r,packet_present:false}),"LIVE_PACKET_UNAVAILABLE");
 for(const delta of [{content_hash_match:false},{packet_scope_match:false},{packet_planned_utc:"2026-11-27T11:46:00.000Z"},{packet_reviewed_utc:r.planned_utc}])
  assert.equal(classify({...r,...delta}),"PACKET_LEDGER_PARITY_UNVERIFIED");
 for(const delta of [{marker_exact_shape:false},{marker_protocol_shape:false},{marker_reviewed:false},{marker_effective_utc:r.planned_utc},{marker_cohort_utc:"2026-11-29T00:00:00.000Z"}])
  assert.equal(classify({...r,...delta}),"CONDITIONAL_MARKER_INVALID");
 const x=project([r,{...r,marker_present:false}],"2026-11-27T00:00:00.000Z");
 assert.equal(x.cells.length,6);assert.equal(x.cells[3].prepared,2);assert.equal(x.cells[3].futurePrepared,2);
 assert.equal(x.cells[3].counts.NO_CONDITIONAL_SOURCE_MARKER,1);
 assert.equal(x.cells[0].status,"NO_PREPARED_DENOMINATOR");
 for(const k of ["packetSignatureVerified","protectedPolicyAdmitted","actualConditionalMemberVerified","actualPreCommitVerified","trainingEligibilityCertified"])assert.equal(x[k],false);
 assert.doesNotMatch(JSON.stringify(x),/marker_effective_utc|protocolSha256|queryDigest/);
 assert.throws(()=>project([{...r,day:5}],"2026-11-27T00:00:00.000Z"),/LEDGER_ROW/);
});
test("T085 owner query uses only retained private instructions, explicit readonly and rollback",async()=>{
 const calls=[];
 const c={async query(sql,params){calls.push([sql,params]);
  if(sql.startsWith("SELECT current_database"))return {rows:[{db:true,owner:true,login:true,primary:true,ro:true,at:new Date("2026-11-27T00:00:00.000Z")}]};
  if(sql.startsWith("SELECT manifest_sha256"))return {rows:[{manifest_sha256:"a".repeat(64),calendar_hash:"b".repeat(64)}]};
  if(sql.trimStart().startsWith("WITH packets"))return {rows:[r]};
  return {rows:[]};
 }};
 const x=await read(c);assert.equal(x.cells[3].prepared,1);
 assert.match(calls[0][0],/READ ONLY/);assert.equal(calls.at(-1)[0],"ROLLBACK");
 const q=calls.find(([s])=>s.trimStart().startsWith("WITH packets"))[0];
 assert.match(q,/p.kind='SOURCE_QUERY_PACKET'/);assert.match(q,/p.retention_not_after_utc>transaction_timestamp\(\)/);
 assert.match(q,/q.run_day_index IN \(3,4\) LIMIT 577/);
 assert.doesNotMatch(q,/clean\.fids_query_response|clean\.flight_population|INSERT INTO|UPDATE phase6_private|DELETE FROM/);
});

test("T086 real SQL errors return a safe stage and position, never raw SQL or secret text",async()=>{
 const calls=[];
 const c={async query(sql){calls.push(sql);
  if(sql.startsWith("SELECT current_database"))return {rows:[{db:true,owner:true,login:true,primary:true,ro:true,at:new Date("2026-11-27T00:00:00.000Z")}]};
  if(sql.startsWith("SELECT manifest_sha256"))return {rows:[{manifest_sha256:"a".repeat(64),calendar_hash:"b".repeat(64)}]};
  if(sql.trimStart().startsWith("WITH packets"))throw Object.assign(new Error("private value"),{code:"42601",position:"42"});
  return {rows:[]};
 }};
 await assert.rejects(()=>read(c),e=>e.message==="HOLD_P6_CONDITIONAL_QUERY_SCOPE_QUERY_PROJECTION"&&e.stage==="QUERY_PROJECTION"&&e.code==="42601"&&e.position==="42");
 assert.equal(calls.at(-1),"ROLLBACK");
});
