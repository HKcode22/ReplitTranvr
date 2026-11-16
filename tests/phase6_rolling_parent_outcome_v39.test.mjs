import test from "node:test";
import assert from "node:assert/strict";
import {classifyP6ParentOutcome,writeP6ParentOutcome,preserveP6ParentChildCustody,writeP6ParentOutcomeWithOptionalCustody} from "../server/lib/disruption/phase6RollingParentOutcome_v39.mjs";
const base={providerCallsByParent:0,databaseWritesByParent:0,paidGetsCertifiedByParent:0,independentPaidChildAdmissionStillRequired:true,acknowledgedGithubChildCount:0};
test("safe preflight hold and evidence missing never count as dispatch or completed flight",()=>{
 assert.equal(classifyP6ParentOutcome("SOURCE",{...base,status:"HOLD_PRE_DISPATCH_NO_POST"}),"SAFE_PREFLIGHT_HOLD");
 assert.equal(classifyP6ParentOutcome("POST",{...base,status:"HOLD_POST_PREFLIGHT_NO_DISPATCH"}),"SAFE_PREFLIGHT_HOLD");
 assert.equal(classifyP6ParentOutcome("SOURCE",{...base,status:"SELECTED_SOURCE_DAY_REVIEWS_UNAVAILABLE_NO_DISPATCH"}),"MISSING_EVIDENCE");
 assert.equal(classifyP6ParentOutcome("SOURCE",{...base,status:"NO_SIGNED_DUE_CHILD_NO_DISPATCH",unavailableSelectedDayCount:1}),"MISSING_EVIDENCE");
 assert.equal(classifyP6ParentOutcome("POST",{...base,status:"NO_SIGNED_DUE_POST",unavailableDays:0}),"NO_DUE_WORK");
});
test("exact ACK remains nonreceipt; no new ACK distinct from no due work",()=>{
 const r={...base,status:"BOUNDED_STORED_SOURCE_CHILD_DISPATCH_ACKS_NOT_PAID_RECEIPTS",acknowledgedGithubRunIds:[]};
 assert.equal(classifyP6ParentOutcome("SOURCE",r),"NO_NEW_ACK");
 assert.equal(classifyP6ParentOutcome("SOURCE",{...r,acknowledgedGithubChildCount:1,acknowledgedGithubRunIds:[12345]}),"ACKNOWLEDGED_NOT_PAID_RECEIPT");
 for(const d of [{acknowledgedGithubChildCount:1},{providerCallsByParent:1},{status:"UNKNOWN_DISPATCH"},
  {acknowledgedGithubChildCount:2,acknowledgedGithubRunIds:[1,1]}])
  assert.throws(()=>classifyP6ParentOutcome("SOURCE",{...r,...d}),/HOLD_P6_PARENT_OUTCOME/);
});
test("only fixed sanitized marker goes to runner output; no supplied reason or ID",()=>{
 const writes=[],r={...base,status:"HOLD_POST_PREFLIGHT_NO_DISPATCH",reason:"private_text"};
 const d=writeP6ParentOutcome("POST",r,{GITHUB_ACTIONS:"true",GITHUB_OUTPUT:"/tmp/mock-ci-output"},(...a)=>writes.push(a));
 assert.equal(d,"SAFE_PREFLIGHT_HOLD");
 assert.deepEqual(writes,[["/tmp/mock-ci-output","parent_disposition=SAFE_PREFLIGHT_HOLD\n","utf8"]]);
 assert.throws(()=>writeP6ParentOutcome("POST",r,{GITHUB_ACTIONS:"true"},()=>{}),/HOLD/);
});

test("parent receipt contains exact acknowledged child IDs and no private input or arbitrary failure message",()=>{
 const r={...base,status:"BOUNDED_STORED_SOURCE_CHILD_DISPATCH_ACKS_NOT_PAID_RECEIPTS",acknowledgedGithubChildCount:2,acknowledgedGithubRunIds:[12345,12346],secret:"forbidden"};
 const env={GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"workflow_dispatch",GITHUB_RUN_ATTEMPT:"1",GITHUB_RUN_ID:"99999",GITHUB_SHA:"a".repeat(40),RUNNER_TEMP:"/tmp/fixture"};
 const writes=[];preserveP6ParentChildCustody("SOURCE",r,env,(...a)=>writes.push(a),()=>Date.parse("2030-01-01T00:00:00.000Z"));
 const [path,bytes,opts]=writes[0];assert.equal(path,"/tmp/fixture/p6-parent-source-custody.json");assert.equal(opts.flag,"wx");assert.equal(opts.mode,0o600);
 assert.deepEqual(JSON.parse(bytes).childRunIds,[12345,12346]);assert(!bytes.toString().includes("forbidden"));
 assert.throws(()=>preserveP6ParentChildCustody("SOURCE",{...r,acknowledgedGithubRunIds:[12345,12345]},env,()=>assert.fail("must not write")),/HOLD/);
 assert.throws(()=>preserveP6ParentChildCustody("SOURCE",{...r,acknowledgedGithubChildCount:0,status:"NO_DUE_SOURCE_NO_DISPATCH"},env,()=>assert.fail("must not write")),/HOLD/);
});

test("native schedules keep parent outcome markers without optional controller artifact or V0102 requirements",()=>{
 const r={...base,status:"HOLD_PRE_DISPATCH_NO_POST"},env={GITHUB_ACTIONS:"true",GITHUB_EVENT_NAME:"schedule",GITHUB_OUTPUT:"/tmp/mock-ci-output",P6_PARENT_CHILD_CUSTODY_REQUIRED:"0"};
 const marks=[];assert.equal(writeP6ParentOutcomeWithOptionalCustody("SOURCE",r,env,{write:()=>assert.fail("native must not create artifact"),append:(...a)=>marks.push(a)}),"SAFE_PREFLIGHT_HOLD");
 assert.equal(marks.length,1);
 assert.throws(()=>writeP6ParentOutcomeWithOptionalCustody("SOURCE",r,{...env,P6_PARENT_CHILD_CUSTODY_REQUIRED:"1"},{write:()=>assert.fail("not controller"),append:()=>{}}),/HOLD/);
});
