import test from "node:test";
import assert from "node:assert/strict";
import {classifyP6ParentOutcome,writeP6ParentOutcome} from "../server/lib/disruption/phase6RollingParentOutcome_v39.mjs";
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
