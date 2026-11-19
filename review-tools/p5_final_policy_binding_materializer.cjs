#!/usr/bin/env node
"use strict";
/**
 * Materialize final policy-binding decisions from an explicit reviewer input
 * plus already-approved core bytes. No network, DB, GitHub, provider or GO.
 */
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const H=/^[a-f0-9]{64}$/,C=/^[a-f0-9]{40}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const FLAGS=[
"independentStudyTrustPinsApproved","delegatedDailyPacketProductionApproved",
"delegatedAutomatedSourceSigningApproved","independentTransportAndSigningScopeApproved",
"independentPostReviewerPinsApproved","nativePreFeatureApproved","nativeLaterApproved",
"privatePublicationApproved","nativeT24ReviewApproved","independentT24WitnessProtocolReviewed",
"verifiedProviderNativeSchedule","independentT24CustodyTrustApproved",
"delegatedAutomatedLaterDayAppendApproved","independentPostRequestGeometryApproved",
"delegatedPostPacketAndDayAppendApproved","independentSourceContentsUseAndRESTReleaseAttested",
"independentProviderContentRetentionApproved"];
const HASHES=["releaseSha256","externalContentUseReviewSha256","builderSha256","runAndRetentionEvidenceSha256","selectedTArtifactHash","selectedTSemanticsEvidenceSha256","t24CustodyPolicySha256","reviewedProviderPriceSha256","externalPostContentsAndBudgetEvidenceSha256"];
const need=(x,k)=>{if(!x)throw Error("HOLD_P5_POLICY_REVIEW_MATERIALIZER_"+k)};
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const canonical=x=>Buffer.from(JSON.stringify(x));
const utc=x=>typeof x==="string"&&UTC.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
function readCanonical(d,n,max=4000000){
 const p=path.join(d,n),s=fs.lstatSync(p);need(s.isFile()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&s.nlink===1&&(s.mode&0o077)===0&&s.size>0&&s.size<=max,"PRIVATE_FILE_"+n.replace(/[^A-Z0-9]/gi,"_"));
 const raw=fs.readFileSync(p),x=JSON.parse(raw);need(canonical(x).equals(raw),"NONCANONICAL_"+n.replace(/[^A-Z0-9]/gi,"_"));return {raw,x,sha256:sha(raw)}
}
function pinsFromCore(files){
 const {auth,manifest,config,external}=files,a=auth.x,m=manifest.x,c=config.x,e=external.x,b=a?.releaseActivation;
 need(a&&/^AUTH-\d{8}-[A-Z0-9]+$/.test(a.authorizationId??"")&&b?.independentSourceUseApproved===true&&b.independentScientificFreezeApproved===true&&b.independentOperationalReleaseApproved===true,"APPROVED_CORE_AUTH");
 need(m?.sourceRightsApproved===true&&m.scientificFreezeApproved===true&&m.finalPredecessorsApproved===true&&m.phase6PaidGo===false,"APPROVED_MANIFEST");
 need(c?.sourceRightsApproved===true&&c.reviewApproved===true&&c.phase6PaidGo===false,"APPROVED_CONFIG");
 need(C.test(e?.codeSha40??"")&&e.manifestSha256===manifest.sha256&&e.configSha256===config.sha256&&e.phase6AuthorizationId===a.authorizationId,"CORE_CROSS_PINS");
 need(H.test(b.sourceRightsEvidenceSha256??"")&&H.test(b.costEnvelopeSha256??""),"RIGHTS_COST_PINS");
 return {authorizationId:a.authorizationId,authArtifactSha256:auth.sha256,reviewedMainSha:e.codeSha40,manifestSha256:manifest.sha256,configSha256:config.sha256,rightsSha256:b.sourceRightsEvidenceSha256,costSha256:b.costEnvelopeSha256};
}
function materialize(pins,input,nowMs=Date.now(),outcomeTailMs=Date.parse("2026-12-26T04:00:00.000Z")){
 need(input?.schema==="v39.phase5.final-policy-binding-reviewer-input.v1"&&input.phase6PaidGo===false,"INPUT_SCHEMA");
 need(typeof input.reviewedBy==="string"&&input.reviewedBy.trim().length>=3&&utc(input.reviewedAtUtc)&&Date.parse(input.reviewedAtUtc)<=nowMs,"REVIEW_CLOCK");
 need(input.decisions&&Object.keys(input.decisions).length===FLAGS.length&&FLAGS.every(k=>input.decisions[k]===true),"EXPLICIT_DECISIONS");
 need(HASHES.every(k=>H.test(input[k]??"")),"REVIEW_EVIDENCE_HASHES");
 need(utc(input.validFromUtc)&&utc(input.validUntilUtc)&&utc(input.builderFrozenAtUtc)&&Date.parse(input.validFromUtc)<=nowMs&&Date.parse(input.validUntilUtc)>=outcomeTailMs&&Date.parse(input.builderFrozenAtUtc)<=Date.parse(input.reviewedAtUtc)&&Date.parse(input.validFromUtc)<Date.parse(input.validUntilUtc),"VALIDITY_WINDOW");
 need(typeof input.selectedTVersion==="string"&&input.selectedTVersion.trim().length>0&&input.selectedTVersion.length<=150&&(input.standaloneNoT24ProtocolSha256===null||H.test(input.standaloneNoT24ProtocolSha256??"")),"SELECTED_T");
 return {
  schema:"v39.phase5.final-six-policy-binding-decisions.v1",
  phase6PaidGo:false,
  authorizationId:pins.authorizationId,
  authArtifactSha256:pins.authArtifactSha256,
  reviewedMainSha:pins.reviewedMainSha,
  manifestSha256:pins.manifestSha256,
  configSha256:pins.configSha256,
  rightsSha256:pins.rightsSha256,
  costSha256:pins.costSha256,
  reviewedBy:input.reviewedBy.trim(),
  reviewedAtUtc:input.reviewedAtUtc,
  decisions:Object.fromEntries(FLAGS.map(k=>[k,true])),
  ...Object.fromEntries(HASHES.map(k=>[k,input[k]])),
  validFromUtc:input.validFromUtc,validUntilUtc:input.validUntilUtc,builderFrozenAtUtc:input.builderFrozenAtUtc,
  selectedTVersion:input.selectedTVersion.trim(),
  standaloneNoT24ProtocolSha256:input.standaloneNoT24ProtocolSha256
 };
}
function run(){
 need(process.argv.length===4,"ARGS");
 const dir=fs.realpathSync(process.argv[2]),ds=fs.lstatSync(dir);need(ds.isDirectory()&&!ds.isSymbolicLink()&&ds.uid===process.getuid()&&(ds.mode&0o077)===0,"PRIVATE_DIRECTORY");
 const inputRaw=fs.readFileSync(process.argv[3]),input=JSON.parse(inputRaw);need(canonical(input).equals(inputRaw),"REVIEW_INPUT_NOT_CANONICAL");
 const files={auth:readCanonical(dir,"approved-auth.json",256000),manifest:readCanonical(dir,"approved-manifest.json"),config:readCanonical(dir,"approved-config.json"),external:readCanonical(dir,"approved-external-input.json",100000)};
 process.stdout.write(canonical(materialize(pinsFromCore(files),input)));
}
module.exports={FLAGS,HASHES,pinsFromCore,materialize,canonical};
if(require.main===module)try{run()}catch(e){const s=String(e?.message??"");console.error(/^HOLD_P5_POLICY_REVIEW_MATERIALIZER_[A-Z0-9_]+$/.test(s)?s:"HOLD_P5_POLICY_REVIEW_MATERIALIZER_REDACTED");process.exitCode=2}
