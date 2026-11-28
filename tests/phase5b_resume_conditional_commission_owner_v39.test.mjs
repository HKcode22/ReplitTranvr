import test from "node:test";
import assert from "node:assert/strict";
import {exactReceipt,verifyDerivedReceipt,approvalFromPreview,exactDispatchIds,newDispatchId} from "../scripts/v39_phase5b_resume_conditional_commission_owner.mjs";
const base="a".repeat(64),candidate="b".repeat(64);
const baseReceipt={status:"P6_ACTUAL_INACTIVE_CONDITIONAL_DERIVATION_READBACK_NO_PROVIDER",phase6PaidGo:false,actualConditionalPreCommitVerified:false,prospective:{runDayIndex:5,genesisAbsent:true,preparedQueryCount:0},providerCalls:0,databaseWrites:0,githubWrites:0,signaturesIssued:0,actualConditionalDerivationVerified:true,actualConditionalPolicyInstalledVerified:false,candidatePublicCommitmentLetters:"l".repeat(64),basePolicyPublicCommitmentLetters:"k".repeat(64)};
const wire=x=>"protected job\t"+JSON.stringify(x);
test("S002 exact inactive proof refuses wrong mode, scope, effects, commitment and duplicate receipts",()=>{
 verifyDerivedReceipt(wire(baseReceipt),false,candidate,base);
 for(const patch of [{actualConditionalPolicyInstalledVerified:true},{actualConditionalDerivationVerified:false},{providerCalls:1},{databaseWrites:1},{githubWrites:1},{signaturesIssued:1},{phase6PaidGo:true},{prospective:{...baseReceipt.prospective,preparedQueryCount:1}},{candidatePublicCommitmentLetters:"m".repeat(64)}])assert.throws(()=>verifyDerivedReceipt(wire({...baseReceipt,...patch}),false,candidate,base));
 assert.throws(()=>verifyDerivedReceipt(wire(baseReceipt)+"\n"+wire(baseReceipt),false,candidate,base),/CARDINALITY/);
 assert.throws(()=>verifyDerivedReceipt(wire(baseReceipt),true,candidate,base));
 assert.throws(()=>approvalFromPreview({reviewBase64:Buffer.from("{}").toString("base64"),reviewSha256:"a".repeat(64)},"",Date.now()),/REVIEW_BYTES/);
});

test("S002 dispatch correlation handles URL-less gh, refuses incomplete pages and competing runs",()=>{
 const at="2026-11-28T12:45:00Z",since=Date.parse(at),row={id:100,workflow_id:418926752,head_sha:"a02e3d6eddc378871f030848235746de160b71e5",head_branch:"main",event:"workflow_dispatch",actor:{login:"HKcode22"},path:".github/workflows/phase6-nonpaid-source-day-prepare-publish.yml",created_at:at};
 assert.deepEqual(exactDispatchIds({total_count:1,workflow_runs:[row]},since),[100]);
 assert.throws(()=>exactDispatchIds({total_count:2,workflow_runs:[row]},since),/INCOMPLETE/);
 assert.throws(()=>exactDispatchIds({total_count:2,workflow_runs:[row,row]},since),/SCOPE/);
 for(const patch of [{head_sha:"b".repeat(40)},{actor:{login:"other"}},{workflow_id:3},{created_at:"2026-11-28T12:44:59Z"}])assert.throws(()=>exactDispatchIds({total_count:1,workflow_runs:[{...row,...patch}]},since),/SCOPE/);
 assert.equal(newDispatchId([100],[100,101],""),101);
 assert.equal(newDispatchId([100],[100],""),null);
 assert.equal(newDispatchId([100],[100,101],"https://github.com/HKcode22/ReplitTranvr/actions/runs/101"),101);
 assert.throws(()=>newDispatchId([100],[100,101,102],""),/AMBIGUOUS/);
 assert.throws(()=>newDispatchId([100],[100,101],"https://github.com/HKcode22/ReplitTranvr/actions/runs/102"),/MISMATCH/);
});
