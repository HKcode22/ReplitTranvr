#!/usr/bin/env node
"use strict";
/** Canonical independent private review of already-assembled six exact policy bytes. */
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const H=/^[a-f0-9]{64}$/,C=/^[a-f0-9]{40}$/,UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const NAMES=["P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64","P6_NONPAID_DAILY_POLICY_BASE64","P6_NONPAID_SIGNING_POLICY_BASE64","P6_NONPAID_TRANSPORT_TRUST_BASE64","P6_PRIVATE_POST_REVIEWER_TRUST_BASE64","P6_NATIVE_POST_POLICY_BASE64"];
const FLAGS=["independentExactPolicyAndDailyReviewApproved","independentTransportAndSigningScopeApproved","independentStudyTrustPinsApproved","independentPostReviewerPinsApproved","independentDelegatedNativeReviewApproved","independentDelegatedPostAndDayAppendApproved"];
const need=(x,k)=>{if(!x)throw Error("HOLD_P5_PRIVATE_POLICY_REVIEW_MATERIALIZER_"+k)};
const sha=b=>crypto.createHash("sha256").update(b).digest("hex"),canonical=x=>Buffer.from(JSON.stringify(x));
const utc=x=>typeof x==="string"&&UTC.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
function readCanonical(d,n,max=4000000){const p=path.join(d,n),s=fs.lstatSync(p);need(s.isFile()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&s.nlink===1&&(s.mode&0o077)===0&&s.size>0&&s.size<=max,"PRIVATE_FILE");const raw=fs.readFileSync(p),x=JSON.parse(raw);need(canonical(x).equals(raw),"NONCANONICAL_"+n.replace(/[^A-Z0-9]/gi,"_"));return {raw,x,sha256:sha(raw)}}
function pinsFromPolicies(policies,receipt){
 need(policies&&typeof policies==="object"&&!Array.isArray(policies)&&Object.keys(policies).length===NAMES.length&&NAMES.every(n=>Object.hasOwn(policies,n)),"POLICY_SET");
 const [t,d,g,x,pt,post]=NAMES.map(n=>policies[n]);
 need(t.independentStudyTrustPinsApproved===true&&d.delegatedDailyPacketProductionApproved===true&&g.delegatedAutomatedSourceSigningApproved===true&&x.independentTransportAndSigningScopeApproved===true&&pt.independentPostReviewerPinsApproved===true,"POLICY_APPROVAL_SHAPE");
 const l=d.nativeLaterReview,f=d.nativePreFeatureReview;
 need(f?.approved===true&&l?.approved===true&&l.privatePublicationApproved===true&&l.nativeT24ReviewApproved===true&&l.independentT24WitnessProtocolReviewed===true&&l.t24Custody?.independentT24CustodyTrustApproved===true&&l.dayAppendPolicy?.delegatedAutomatedLaterDayAppendApproved===true,"NATIVE_DELEGATED_POLICY_SHAPE");
 need(post.independentPostRequestGeometryApproved===true&&post.delegatedPostPacketAndDayAppendApproved===true&&post.independentSourceContentsUseAndRESTReleaseAttested===true&&post.independentProviderContentRetentionApproved===true,"POST_POLICY_SHAPE");
 const main=t.reviewedCodeSha,manifest=t.manifestSha256,release=t.releaseSha256,rights=t.rightsSha256,config=d.configSha256;
 need(C.test(main??"")&&[manifest,release,rights,config].every(v=>H.test(v??"")),"POLICY_PINS");
 need(d.approvedCodeSha===main&&g.approvedCodeSha===main&&post.reviewedCodeSha===main&&d.manifestSha256===manifest&&g.manifestSha256===manifest&&post.manifestSha256===manifest&&d.releaseSha256===release&&g.releaseSha256===release&&post.releaseSha256===release&&d.rightsSha256===rights&&g.rightsSha256===rights&&post.rightsSha256===rights,"POLICY_CROSS_PIN");
 const raw=canonical(policies),bundle=sha(raw),digests=NAMES.map(name=>({name,sha256:sha(canonical(policies[name]))}));
 need(receipt?.status==="SIX_POLICY_BYTES_ASSEMBLED_EXISTING_INDEPENDENT_BYTE_REVIEW_REQUIRED_NO_GO"&&receipt.main===main&&receipt.policyBundleSha256===bundle&&Array.isArray(receipt.policyDigests)&&receipt.policyDigests.length===6&&digests.every(d=>receipt.policyDigests.some(x=>x.name===d.name&&x.sha256===d.sha256))&&receipt.phase6PaidGo===false,"ASSEMBLY_RECEIPT");
 return {reviewedMainSha:main,manifestSha256:manifest,configSha256:config,releaseSha256:release,rightsSha256:rights,finalPolicyBundleSha256:bundle,policyDigests:digests};
}
function materialize(pins,input,nowMs=Date.now()){
 need(input?.schema==="v39.phase5.private-policy-reviewer-decision-input.v1"&&input.phase6PaidGo===false,"INPUT_SCHEMA");
 need(input.decisions&&Object.keys(input.decisions).length===FLAGS.length&&FLAGS.every(k=>input.decisions[k]===true),"EXPLICIT_DECISIONS");
 need(typeof input.reviewedBy==="string"&&input.reviewedBy.trim().length>=3&&utc(input.reviewedAtUtc)&&Date.parse(input.reviewedAtUtc)<=nowMs,"REVIEW_CLOCK");
 return {schema:"v39.phase5.approved-private-policy-review.v1",...Object.fromEntries(FLAGS.map(k=>[k,true])),...pins,phase6PaidGo:false,reviewedBy:input.reviewedBy.trim(),reviewedAtUtc:input.reviewedAtUtc};
}
function run(){
 need(process.argv.length===4,"ARGS");const d=fs.realpathSync(process.argv[2]),ds=fs.lstatSync(d);need(ds.isDirectory()&&!ds.isSymbolicLink()&&ds.uid===process.getuid()&&(ds.mode&0o077)===0,"PRIVATE_DIRECTORY");
 const policies=readCanonical(d,"approved-policy-objects.json",250000),receipt=readCanonical(d,"six-policy-assembly-receipt.json",200000);
 const ir=fs.readFileSync(process.argv[3]),input=JSON.parse(ir);need(canonical(input).equals(ir),"REVIEW_INPUT_NOT_CANONICAL");
 process.stdout.write(canonical(materialize(pinsFromPolicies(policies.x,receipt.x),input)));
}
module.exports={NAMES,FLAGS,pinsFromPolicies,materialize,canonical};
if(require.main===module)try{run()}catch(e){const s=String(e?.message??"");console.error(/^HOLD_P5_PRIVATE_POLICY_REVIEW_MATERIALIZER_[A-Z0-9_]+$/.test(s)?s:"HOLD_P5_PRIVATE_POLICY_REVIEW_MATERIALIZER_REDACTED");process.exitCode=2}
