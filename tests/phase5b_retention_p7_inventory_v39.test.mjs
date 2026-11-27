import test from "node:test";
import assert from "node:assert/strict";
import {project,readInventory} from "../scripts/v39_phase5b_retention_p7_inventory_owner.mjs";
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
