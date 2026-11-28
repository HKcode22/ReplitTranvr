import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,chmodSync,symlinkSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {spawnSync} from "node:child_process";
import {createHash} from "node:crypto";
import {inspectP6OwnerLocalPolicyPredecessor as inspect} from "../scripts/v39_phase5b_owner_local_policy_predecessor.mjs";
const hash=x=>createHash("sha256").update(JSON.stringify(x)).digest("hex"),m=hash("manifest"),r=hash("rights");
const names=["V39_P5_APPROVED_CODE_SHA","P6_NONPAID_SOURCE_APPROVED_MAIN_SHA","V39_P5_ACTUAL_NATIVE_REVIEW_APPROVED_CODE_SHA","P5_CD_GH_PRE_APPROVED_CODE_SHA","V39_P5_POST_APPROVED_CODE_SHA","P6_PRIVATE_SOURCE_PARENT_RO_MAIN_SHA","V39_P5_QUEUE_APPROVED_CODE_SHA","V39_P5_MANIFEST_SHA256","V39_P5_CALENDAR_HASH","V39_P5_CONFIG_HASH","V39_P5_FRAME_HASH","V39_P5_RELEASE_SHA256","V39_P5_RIGHTS_SHA256","V39_P5_PROVIDER_CONTRACT_SHA256","P6_INERT_STAGE_INPUT_JSON","P6_INERT_STAGE_INPUT_SHA256","P6_INERT_COST_ENVELOPE_SHA256","P6_PRIVATE_POST_OUTCOME_TAIL_HOURS","V39_P5_POST_PROVIDER_CONTRACT_SHA256","V39_P5_POST_CATEGORY_BUDGET_SHA256","V39_P5_POST_PRICE_SHA256","P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64","P6_NONPAID_DAILY_POLICY_BASE64","P6_NONPAID_SIGNING_POLICY_BASE64","P6_NONPAID_TRANSPORT_TRUST_BASE64","P6_PRIVATE_POST_REVIEWER_TRUST_BASE64","P6_NATIVE_POST_POLICY_BASE64","P6_NONPAID_DAILY_POLICY_SHA256","P6_NONPAID_SIGNING_POLICY_SHA256","P6_NONPAID_TRANSPORT_TRUST_SHA256","P6_NATIVE_POST_POLICY_SHA256"];
function fixture(home,suffix,change={}){
 const d=join(home,".travnr-phase6-final-policies-"+suffix);mkdirSync(d,{mode:0o700});
 const v=Object.fromEntries(names.map(n=>[n,"private-fixture-do-not-print"]));v.V39_P5_MANIFEST_SHA256=m;v.V39_P5_RIGHTS_SHA256=r;
 const p={schema:"v39.phase6.delegated-daily-source-review-policy.v1",manifestSha256:m,rightsSha256:r,nativeLaterReview:{},...change};
 const q={schema:"v39.phase6.delegated-source-review-policy.v1",manifestSha256:m,rightsSha256:r};
 const t={schema:"v39.phase6.approved-nonpaid-source-transport-trust.v1",dailyPolicySha256:hash(p),signingPolicySha256:hash(q)};
 const w={P6_NONPAID_DAILY_POLICY_BASE64:p,P6_NONPAID_SIGNING_POLICY_BASE64:q,P6_NONPAID_TRANSPORT_TRUST_BASE64:t,
 P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64:{fixture:"stable"},P6_PRIVATE_POST_REVIEWER_TRUST_BASE64:{fixture:"post trust"},P6_NATIVE_POST_POLICY_BASE64:{fixture:"post policy"}};
 for(const [n,x] of Object.entries(w)){v[n]=Buffer.from(JSON.stringify(x)).toString("base64");const k=n.replace("_BASE64","_SHA256");if(Object.hasOwn(v,k))v[k]=hash(x);}
 const b={status:"SIX_EXACT_REVISED_POLICY_BYTES_PREPARED_AWAITING_BYTE_REVIEW_NO_GO",main:"a".repeat(40),staticCount:31,staticValuesSha256:hash(v),policyBundleSha256:hash(w),phase6PaidGo:false};
 for(const [n,x] of Object.entries({"static-values-PRIVATE.json":v,"six-policy-objects-PRIVATE.json":w,"bundle-receipt.json":b}))writeFileSync(join(d,n),JSON.stringify(x),{mode:0o600,flag:"wx"});
 return {d,commitment:hash({schema:"v39.phase5b.custody-base-commitment.v1",daily:hash(p),signing:hash(q),transport:hash(t)})};
}
test("T120 unique exact local native policy commitment, duplicate copies, no secret output or protected proof",()=>{
 const home=mkdtempSync(join(tmpdir(),"p6-local-"));
 try{
  const a=fixture(home,"a"),b=fixture(home,"b");assert.equal(a.commitment,b.commitment);
  const out=inspect(home,m,r);assert.equal(out.basePolicyCommitmentSha256,a.commitment);assert.equal(out.matchingLocalCopies,2);
  assert.equal(out.actualProtectedBytesVerified,false);assert.equal(out.databaseReads,0);assert.equal(out.githubWrites,0);
  assert.doesNotMatch(JSON.stringify(out),/private-fixture|\.travnr|static-values|dailyPolicySha256/);
  fixture(home,"c",{fixture:"different"});const amb=inspect(home,m,r);
  assert.equal(amb.status,"HOLD_MULTIPLE_DISTINCT_LOCAL_PREDECESSORS");assert.equal(amb.basePolicyCommitmentSha256,null);
 }finally{rmSync(home,{recursive:true,force:true});}
});
test("T120 reject changed receipt, wrong manifest, conditional marker, unsafe permissions and symlink",()=>{
 const home=mkdtempSync(join(tmpdir(),"p6-local-"));
 try{
  const a=fixture(home,"a"),b=fixture(home,"b"),c=fixture(home,"c",{conditionalPreFeatureReview:null});
  writeFileSync(join(a.d,"bundle-receipt.json"),"{}",{mode:0o600});chmodSync(join(b.d,"static-values-PRIVATE.json"),0o644);
  symlinkSync(c.d,join(home,".travnr-phase6-final-policies-linked"));
  const out=inspect(home,m,r);assert.equal(out.status,"HOLD_NO_EXACT_LOCAL_PREDECESSOR");assert.equal(out.rejectedDirectories,4);
  const d=fixture(home,"d");assert.equal(inspect(home,hash("wrong"),r).basePolicyCommitmentSha256,null);
  assert.equal(inspect(home,m,r).basePolicyCommitmentSha256,d.commitment);
 }finally{rmSync(home,{recursive:true,force:true});}
});

test("T131 CLI through a symlinked temporary path emits the actual bounded receipt",()=>{
 const home=mkdtempSync(join(tmpdir(),"p6-local-cli-"));
 try{
  const a=fixture(home,"a");
  const alias=join(home,"check.mjs");
  symlinkSync(resolve("scripts/v39_phase5b_owner_local_policy_predecessor.mjs"),alias);
  const call=manifest=>spawnSync(process.execPath,[alias,manifest,r],{env:{...process.env,HOME:home},encoding:"utf8",timeout:10000});
  const good=call(m);assert.equal(good.status,0,good.stderr);
  assert.equal(JSON.parse(good.stdout).basePolicyCommitmentSha256,a.commitment);
  assert.doesNotMatch(good.stdout,/private-fixture|static-values-PRIVATE/);
  const bad=call(hash("wrong"));assert.equal(bad.status,2);
  assert.equal(JSON.parse(bad.stdout).status,"HOLD_NO_EXACT_LOCAL_PREDECESSOR");
 }finally{rmSync(home,{recursive:true,force:true});}
});
