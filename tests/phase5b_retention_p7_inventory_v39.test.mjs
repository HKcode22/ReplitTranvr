import test from "node:test";
import assert from "node:assert/strict";
import {project,projectNearExpiryRows,readInventory} from "../scripts/v39_phase5b_retention_p7_inventory_owner.mjs";
const row={"run_day_index":2,"horizon":"T-6h","bindings":44,"timely_bindings":44,"live_payloads":0,"expired_metadata_only":44,"other_custody":0,"historical_members":500,"linked_pre_rows":0,"cutoff_safe_pre_rows":0},b={"rows":0,"unexpired":0,"links":0,"policies":1},at="2026-11-27T08:41:46.236Z";
test("T114 expired original metadata remains an acquisition, not a retained PRE",()=>{
 const x=project([row],[],b,at);
 assert.equal(x.days[1].bindings,44);assert.equal(x.days[1].expired_metadata_only,44);
 assert.equal(x.days[1].live_payloads,0);assert.equal(x.totals.historical_members,500);
 assert.equal(x.totals.linked_pre_rows,0);assert.equal(x.storagePresenceNotTrainingEligibility,true);
 assert.equal(x.days[0].status,"NO_BINDING_METADATA_OBSERVED");
});
test("T114 distinguish live, unknown custody and global research fragments",()=>{
 const x=project([{...row,live_payloads:40,expired_metadata_only:0,other_custody:4}],[{split:"train",horizon:"T-6h",rows:3,unexpired:2}],{...b,rows:1,unexpired:1},at);
 assert.equal(x.totals.other_custody,4);assert.equal(x.phase7Storage.fragmentCounts[0].unexpired,2);
 assert.equal(x.phase7Storage.scope,"GLOBAL_PRIVATE_STORAGE_NOT_EXACT_STUDY_OR_DAY_ATTRIBUTION");
});
test("T114 contradicting counts, duplicate cells and invalid storage counts refuse",()=>{
 for(const args of [[[row,row],[],b,at],[[{...row,expired_metadata_only:43}],[],b,at],[[{...row,timely_bindings:45}],[],b,at],[[{...row,cutoff_safe_pre_rows:1}],[],b,at],[[],[{split:"train",horizon:"T-6h",rows:1,unexpired:2}],b,at],[[],[],{...b,unexpired:1},at]])assert.throws(()=>project(...args),/COUNT_CONTRADICTION/);
});
test("T114 read-only owner transaction emits no successful receipt on rollback failure",async()=>{
 const calls=[];const c={async query(sql){calls.push(sql);if(sql.startsWith("SELECT current_database"))return {rows:[{db:true,owner:true,login:true,primary:true,ro:true,at:new Date(at)}]};if(sql.startsWith("SELECT manifest_sha256"))return {rows:[{manifest_sha256:"a".repeat(64)}]};if(sql.includes("WITH bound"))return {rows:[row]};if(sql.startsWith("SELECT split,horizon"))return {rows:[]};if(sql.includes("derived_release_bundle_v39"))return {rows:[b]};if(sql==="ROLLBACK")throw Error("fixture lost rollback");return {rows:[]};}};
 await assert.rejects(()=>readInventory(c),/lost rollback/);
 assert.equal(calls[0],"BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
 assert.equal(calls.filter(x=>x==="ROLLBACK").length,1);
 assert.ok(calls.every(x=>!/^(INSERT|UPDATE|DELETE|COMMIT|ALTER|CREATE)\b/i.test(x)));
});

const near={candidate_ordinal:1,global_count:1,study_scope_status:"ACTIVE_STUDY_SCOPE",
 run_day_index:4,slot_id:"HUB",horizon:"T-24h",query_state:"ACTIVE",
 source_available_at_utc:"2026-11-27T20:00:00.000Z",raw_persisted_at_utc:"2026-11-27T19:59:00.000Z",
 access_deadline_utc:"2026-11-28T01:00:00.000Z",expected_members:18,observed_members:18,
 native_shape_pass_members:0,cutoff_lead_prescreen_members:0,task_count:0,
 task_ready:0,task_claimed:0,task_write_started_unknown:0,task_verified_on_time:0,
 task_missed:0,task_quarantined:0,source_linked_pre_rows:0,cutoff_safe_pre_rows:0,
 day_private_packet_rows:0,day_t24_pre_packet_rows:0};
test("T127 reconciles each next-hour original to study scope and existing work without certifying eligibility",()=>{
 const x=projectNearExpiryRows([near],"2026-11-28T00:30:00.000Z",1);
 assert.equal(x.candidates[0].runDayIndex,4);
 assert.equal(x.candidates[0].airportStratum,"HUB");
 assert.equal(x.candidates[0].horizon,"T-24h");
 assert.equal(x.candidates[0].reconciliation,"NO_NATIVE_CUTOFF_LEAD_PRESCREEN_MEMBER");
 assert.equal(x.candidates[0].existingV0087Tasks.total,0);
 assert.equal(x.candidates[0].sourceLinkedPreRows,0);
 assert.equal(x.candidates[0].privatePacketsForStudyDay.sourceLinkedToThisOriginal,false);
 assert.equal(x.finalScientificEligibilityCertified,false);
 assert.equal(x.stage14PermitIssued,false);
 assert.equal(x.approachingExpiryWithNativePreScreenOriginals,0);
 assert.equal(x.databaseWrites,0);
 assert.equal("population_query_id" in x.candidates[0],false);
});
test("T127 no scoped open prescreen member cannot become a pending near-expiry original",()=>{
 const first={...near,global_count:2,access_deadline_utc:"2026-11-28T00:40:00.000Z"};
 const second={...near,candidate_ordinal:2,global_count:2,study_scope_status:"OTHER_MANIFEST",
  run_day_index:null,slot_id:null,horizon:null,query_state:null,expected_members:null,
  observed_members:0,native_shape_pass_members:0,cutoff_lead_prescreen_members:0,
  access_deadline_utc:"2026-11-28T01:20:00.000Z"};
 const x=projectNearExpiryRows([first,second],"2026-11-28T00:30:00.000Z",2);
 assert.equal(x.approachingExpiryWithNativePreScreenOriginals,0);
 assert.equal(x.nativeCutoffLeadPreScreenMembers,0);
});
test("T127 rejects a denominator mismatch, expired candidate, malformed scope, and unsafe row identity",()=>{
 assert.throws(()=>projectNearExpiryRows([near],"2026-11-28T00:30:00.000Z",2),/COUNT_OR_CLOCK/);
 assert.throws(()=>projectNearExpiryRows([{...near,access_deadline_utc:"2026-11-28T00:29:59.000Z"}],"2026-11-28T00:30:00.000Z",1),/ROW_SHAPE/);
 assert.throws(()=>projectNearExpiryRows([{...near,slot_id:"UNKNOWN"}],"2026-11-28T00:30:00.000Z",1),/SIGNED_SCOPE/);
 const redacted=projectNearExpiryRows([{...near,population_query_id:"must-not-leak"}],"2026-11-28T00:30:00.000Z",1);
 assert.equal(JSON.stringify(redacted).includes("must-not-leak"),false);
});
