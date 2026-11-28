import test from "node:test";
import assert from "node:assert/strict";
import {exactReceipt,verifyDerivedReceipt,approvalFromPreview} from "../scripts/v39_phase5b_resume_conditional_commission_owner.mjs";
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
