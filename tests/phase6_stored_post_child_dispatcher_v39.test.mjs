import {test} from "node:test";
import assert from "node:assert/strict";
import {chooseP6PostRoutes,selectP6PostDays,proveP6NoUncertainPostParent,admitP6StoredPostParent} from "../scripts/v39_phase6_stored_post_child_dispatcher_v39.mjs";
const clock="2026-11-22T00:00:00.000Z";
const digest=i=>i.toString(16).padStart(64,"0");
const route=i=>({lane:"POST",runDayIndex:1,shardIndex:i,signedFrozenSha256:digest(i),notBeforeUtc:clock,hardLatestUtc:"2026-11-22T00:20:00.000Z"});
const run=(i,status="completed")=>({id:i,display_title:"P5 POST "+digest(i),status,conclusion:status==="completed"?"success":null,created_at:clock});
test("skip previously submitted first four and use next due routes; preserve global cap",()=>{
 const history={total_count:6,workflow_runs:[run(1),run(2),run(3),run(4),run(10,"in_progress"),run(11,"queued")]};
 const z=chooseP6PostRoutes(Array.from({length:9},(_,i)=>route(i+1)),history,clock);
 assert.equal(z.capacity,4);assert.equal(z.active,2);assert.deepEqual(z.pending.map(r=>r.shardIndex),[5,6,7,8,9]);
 assert.throws(()=>chooseP6PostRoutes([route(1),route(1)],history,clock),/DUPLICATE/);
 assert.throws(()=>chooseP6PostRoutes([route(9)],{total_count:1,workflow_runs:[{...run(1),display_title:"P5 POST old/path"}]},clock),/LEGACY/);
});
test("bounded outcome day selection; no implicit expired tail",()=>{
 const n=Date.parse(clock);
 const windows={from:n-1000,until:n+1000,days:[{day:1,start:n-100,end:n},{day:2,start:n,end:n+100},{day:3,start:n+1,end:n+100}]};
 assert.deepEqual(selectP6PostDays(windows,clock).map(x=>x.day),[2]);
 assert.throws(()=>selectP6PostDays({...windows,days:Array.from({length:5},(_,i)=>({day:i+1,start:n-10,end:n+10}))},clock),/FOUR/);
});
test("uncertain prior POST parent step blocks another paid dispatch",async()=>{
 const history={total_count:2,workflow_runs:[run(1),run(2)]};
 const reply=conclusion=>async()=>new Response(JSON.stringify({total_count:1,jobs:[{name:"separately-authorized-current-private-post-children",status:"completed",
 conclusion:"failure",steps:[{name:"Dispatch current private POST exact children",conclusion}]}]}),{status:200});
 await assert.rejects(proveP6NoUncertainPostParent(history,2,reply("failure"),{}),/UNKNOWN_PREVIOUS/);
 await proveP6NoUncertainPostParent(history,2,reply("success"),{});
 await assert.rejects(proveP6NoUncertainPostParent(history,3,reply("success"),{}),/NOT_VISIBLE/);
});
test("missing release never accesses provider or database",()=>assert.throws(()=>admitP6StoredPostParent({}),/NO_SEPARATE/));
