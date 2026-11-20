import {test} from "node:test";
import assert from "node:assert/strict";
import {checkExactCandidate,checkStop,P7_DETACHED_PINS as p} from "./p7_nov20_detached_inert_owner.mjs";
const pr={number:925,state:"open",merged:false,base:{sha:p.BASE},head:{sha:p.HEAD,repo:{full_name:p.REPO}},mergeable:true},runs=p.RUN_IDS.map(id=>({id,head_sha:p.HEAD,event:"pull_request",run_attempt:1,status:"completed",conclusion:"success"}));
test("requires exact main, exact 36 successful first-attempt workflows, refuses drift",()=>{
 checkExactCandidate(p.BASE,pr,runs);
 assert.throws(()=>checkExactCandidate(p.BASE,{...pr,head:{...pr.head,sha:"a".repeat(40)}},runs));
 assert.throws(()=>checkExactCandidate(p.BASE,pr,runs.slice(1)));
 assert.throws(()=>checkExactCandidate(p.BASE,pr,runs.map((x,i)=>i?x:{...x,conclusion:"failure"})));
 assert.throws(()=>checkExactCandidate(p.HEAD,pr,runs));
});
test("four unchanged STOP secrets and collection mode disabled",()=>{
 const s=p.STOP.map(name=>({name,updated_at:new Date(p.STOP_AT-1000).toISOString()}));
 const v=[{name:"P5_PRIMARY_FIDS_EXPECTED_ENDPOINT_SHA256",value:"a".repeat(64)}];
 assert.equal(checkStop(s,v),"a".repeat(64));
 assert.throws(()=>checkStop(s,[...v,{name:p.MODES[0],value:"0"}]));
 assert.throws(()=>checkStop(s,[...v,{name:"P7_EXPIRY_ENABLED",value:"true"}]));
 assert.throws(()=>checkStop(s.map((x,i)=>i?x:{...x,updated_at:new Date(p.STOP_AT+1000).toISOString()}),v));
});
