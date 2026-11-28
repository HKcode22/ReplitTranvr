import test from "node:test";
import assert from "node:assert/strict";
import {project,readInventory,projectScientificYieldReconciliation} from "../scripts/v39_phase5b_retention_p7_inventory_owner.mjs";
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

test("P0-A/P0-G scientific yield reconciliation projects day x horizon x stratum and escalates zero yield or approaching expiry",()=>{
 const cell={run_day_index:4,horizon:"T-24h",slot_id:"HUB",airport_icao:"WSSS",signed_queries:16,prearmed_queries:16,reservations:16,bindings:16,timely_bindings:16,live_originals:16,expired_originals:0,other_custody_originals:0,live_approaching_expiry_1h:4,live_approaching_expiry_2h:8,live_open_opportunity:2,live_past_cutoff_unrecoverable:14,live_with_conditional_marker:0,live_without_conditional_marker:16,historical_members:800,distinct_native_eligible_flights:0,distinct_conditional_eligible_flights:0,ineligible_members:800,linked_pre_rows:0,cutoff_safe_pre_rows:0,native_pre_rows:0,conditional_pre_rows:0,t24_witness_rows:0,p7_fragments:0,p7_live_links:0,p7_fragments_surviving_raw_expiry:0,matched_t6_t90_pairs:0};
 const storage={p7_total_fragments:0,p7_unexpired_fragments:0,p7_total_bundles:0,p7_unexpired_bundles:0,p7_live_links:0,p7_policies:1,post_outcome_reservations:0};
 const zero=projectScientificYieldReconciliation([cell],storage,at);
 assert.equal(zero.alerts.zeroScientificYield,true);
 assert.equal(zero.alerts.escalationStatus,"CRITICAL_ZERO_SCIENTIFIC_YIELD");
 assert.equal(zero.alerts.approachingExpiryWithPendingEligible,2);
 assert.equal(zero.byStratum.find(s=>s.slot_id==="HUB").live_originals,16);
 assert.equal(zero.bySplit.find(s=>s.split==="train").signed_queries,16);
 const positive=projectScientificYieldReconciliation([{...cell,run_day_index:5,live_approaching_expiry_1h:0,live_approaching_expiry_2h:0,live_open_opportunity:16,live_past_cutoff_unrecoverable:0,live_with_conditional_marker:16,live_without_conditional_marker:0,distinct_conditional_eligible_flights:120,ineligible_members:680,linked_pre_rows:100,cutoff_safe_pre_rows:100,conditional_pre_rows:100,t24_witness_rows:100,p7_fragments:100,p7_live_links:100}],{...storage,p7_total_fragments:100,p7_unexpired_fragments:100,p7_live_links:100},at);
 assert.equal(positive.alerts.zeroScientificYield,false);
 assert.equal(positive.alerts.escalationStatus,"NOMINAL_OR_PARTIAL_YIELD_VERIFY_COVERAGE");
 assert.equal(positive.totals.conditional_pre_rows,100);
 assert.throws(()=>projectScientificYieldReconciliation([{...cell,live_open_opportunity:10}],storage,at),/COUNT_CONTRADICTION/);
 assert.throws(()=>projectScientificYieldReconciliation([{...cell,live_approaching_expiry_1h:9}],storage,at),/COUNT_CONTRADICTION/);
 assert.throws(()=>projectScientificYieldReconciliation([cell],{...storage,p7_unexpired_fragments:1},at),/STORAGE_CONTRADICTION/);
});
