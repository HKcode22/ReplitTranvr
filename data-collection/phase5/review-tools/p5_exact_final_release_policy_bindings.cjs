"use strict";
// Independent, pure final commissioning cross-binding. This checks private
// reviewer-approved payload bytes; it never constructs or grants approvals.
const H=/^[a-f0-9]{64}$/,C=/^[a-f0-9]{40}$/;
const NAMES=[
 "P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64","P6_NONPAID_DAILY_POLICY_BASE64",
 "P6_NONPAID_SIGNING_POLICY_BASE64","P6_NONPAID_TRANSPORT_TRUST_BASE64",
 "P6_PRIVATE_POST_REVIEWER_TRUST_BASE64","P6_NATIVE_POST_POLICY_BASE64"];
const F={
 daily:"7639dcd0773f7b21e1194c91e19a941589ac361621a1cadd31edd10c832c7744",
 query:"80d59db77bec734d4e34eb43ed8dfa92ceb220a1ef82a8f4a06a55a30e08b5b2",
 registry:"60538d4035f3bb3132cad7ccd2b459242e5fa9e949aea43cabe974bb29519e67",
 later:"de37f2d4f8736cb92c04a31c94d3d252482667f937ce80a0f65b09df5293e733",
 post:"4c0e85e2834b217eeeb3d96d8f350f6d5c844ea6b29cfa0fb449683db251846b",
 custody:"5d002b5a2cede6da00aab6d3b516aa4766f58858b252ba85e1c67049dd08d23f"};
const PREPARE="phase5_fids_prepare_prod_20261107",READER="phase6_private_reader_login_prod20261115",PUBLISHER="phase6_private_publisher_login_prod20261115",WITNESS="phase5_fids_t24_witness_prod_20261107";
const hold=s=>{throw Error("HOLD_P5_FINAL_BUNDLE_"+s)},need=(v,s)=>{if(!v)hold(s)};
const plain=o=>o&&typeof o==="object"&&!Array.isArray(o);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const hex=v=>typeof v==="string"&&H.test(v);
const integer=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
function utc(x){need(typeof x==="string"&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x,"EXACT_UTC");return Date.parse(x)}
function approvedWindow(o,now,tail,from="validFromUtc",until="validUntilUtc"){
 need(utc(o[from])<=now&&utc(o[until])>=tail&&utc(o[from])<utc(o[until]),"POLICY_VALIDITY_OR_OUTCOME_TAIL");
}
function shared(o,p,codeField,fields){
 need(plain(o)&&o[codeField]===p.codeSha&&fields.every(k=>o[k]===p[k]),"CROSS_POLICY_PIN_DRIFT");
}
function validateFinalPolicies(w,p,ops){
 need(plain(w)&&Object.keys(w).length===NAMES.length&&NAMES.every(k=>Object.hasOwn(w,k)),"EXACT_SIX_POLICIES");
 need(plain(p)&&C.test(p.codeSha??"")&&["manifestSha256","calendarSha256","configSha256","frameSha256","releaseSha256","rightsSha256","providerContractSha256","costSha256"].every(k=>hex(p[k])),"FINAL_PINS");
 need(Array.isArray(p.dayPlanSha256s)&&p.dayPlanSha256s.length===31&&p.dayPlanSha256s.every((x,i)=>x.runDayIndex===i+1&&hex(x.sha256))&&new Set(p.dayPlanSha256s.map(x=>x.sha256)).size===31,"PLAN_PINS");
 const t=w[NAMES[0]],d=w[NAMES[1]],s=w[NAMES[2]],x=w[NAMES[3]],pt=w[NAMES[4]],post=w[NAMES[5]];
 const basic=["manifestSha256","calendarSha256","releaseSha256","rightsSha256"];
 const extended=[...basic,"configSha256","frameSha256","providerContractSha256"];
 const now=utc(p.nowUtc),tail=utc(p.outcomeTailUtc);
 need(now<tail,"OUTCOME_TAIL_PAST");
 shared(t,p,"reviewedCodeSha",basic);shared(d,p,"approvedCodeSha",extended);shared(s,p,"approvedCodeSha",extended);shared(post,p,"reviewedCodeSha",basic);
 need(t.independentStudyTrustPinsApproved===true&&Object.keys(t).length===11&&t.expectedReaderSessionLogin===READER&&t.dayReviewerFingerprintSha256===F.registry&&t.queryReviewerFingerprintSha256===F.query,"STABLE_SOURCE_TRUST");
 const key=(pem,fp)=>need(typeof pem==="string"&&ops.publicFingerprint(pem)===fp,"PUBLIC_SIGNER_FINGERPRINT");
 key(t.dayReviewerPublicKeyPem,F.registry);key(t.queryReviewerPublicKeyPem,F.query);
 need(d.schema==="v39.phase6.delegated-daily-source-review-policy.v1"&&d.delegatedDailyPacketProductionApproved===true&&s.schema==="v39.phase6.delegated-source-review-policy.v1"&&s.delegatedAutomatedSourceSigningApproved===true,"DAILY_SIGNING_REVIEW");
 for(const v of [d,s]){
  need(v.expectedPrepareRole===PREPARE&&v.budgetReleaseMode==="COST_UPPER_BOUND"&&v.reviewed31DaySourceRequestGridSha256===null&&v.reviewedCostEnvelopeSha256===p.costSha256&&v.reviewedCategoryBudgetSha256===p.costSha256&&v.maxQueriesPerDay===p.maxQueriesPerDay,"EXACT_V0093_COST_MODE");
  approvedWindow(v,now,tail);
 }
 need(d.dailyRestCeiling===p.dailyRestCeiling&&d.cycleRestCeiling===p.cycleRestCeiling&&d.minimumProtectedFloor===p.minimumProtectedFloor&&integer(d.maxQueriesPerDay,12,384)&&/^[a-zA-Z0-9._-]{2,50}$/.test(d.providerApiVersion??"")&&/^[a-zA-Z0-9._-]{2,50}$/.test(d.fidsProtocolVersion??"")&&same(d.dayPlanSha256s,p.dayPlanSha256s),"EXACT_DAILY_SCOPE");
 need(d.providerApiVersion==="1.15.4.0"&&d.airportFrames===undefined&&Array.isArray(d.airportTimezoneGroups)&&ops.hash({airportTimezoneGroups:d.airportTimezoneGroups})===p.airportTimezoneCatalogSha256,"EXACT_VERIFIED_TIMEZONE_CATALOG");
 need(s.queryReviewerFingerprintSha256===F.query&&s.registryReviewerFingerprintSha256===F.registry&&integer(s.maximumReviewRetentionHours,1,168),"SIGNING_SCOPE");
 need(x.schema==="v39.phase6.approved-nonpaid-source-transport-trust.v1"&&x.independentTransportAndSigningScopeApproved===true&&x.reviewedMainSha===p.codeSha&&x.dailyPolicySha256===ops.hash(d)&&x.signingPolicySha256===ops.hash(s)&&x.expectedReaderSessionLogin===READER&&x.expectedPublisherSessionLogin===PUBLISHER&&x.dailyReviewerFingerprintSha256===F.daily&&integer(x.maximumDailyReviewRetentionHours,1,168)&&integer(x.minimumPreparationLeadMinutes,15,180)&&integer(x.maximumPreparationLookaheadMinutes,x.minimumPreparationLeadMinutes,2880),"TRANSPORT_EXACT_HASH_BINDING");
 key(x.dailyReviewerPublicKeyPem,F.daily);
 const f=d.nativePreFeatureReview,l=d.nativeLaterReview,a=l?.dayAppendPolicy,u=l?.t24Custody,cfg=l?.selectedTConfig;
 need(f?.approved===true&&f.rightsSha256===p.rightsSha256&&hex(f.externalContentUseReviewSha256),"NATIVE_PRE_CONTENT_REVIEW");
 need(l?.approved===true&&l.privatePublicationApproved===true&&l.nativeT24ReviewApproved===true&&l.independentT24WitnessProtocolReviewed===true&&l.reviewedWitnessOnlyRole===WITNESS&&l.expectedPublisherSessionLogin===PUBLISHER&&l.laterReviewerFingerprintSha256===F.later&&l.frameSha256===p.frameSha256&&l.configSha256===p.configSha256&&hex(l.builderSha256)&&hex(l.runAndRetentionEvidenceSha256)&&utc(l.builderFrozenAtUtc)<=now&&integer(l.maximumPrivateRetentionHours,1,168)&&cfg?.verifiedProviderNativeSchedule===true&&cfg.milestone==="departure.scheduledTime.utc"&&typeof cfg.version==="string"&&cfg.version.trim()&&cfg.version.length<=150&&hex(cfg.artifactHash)&&hex(cfg.semanticsEvidenceSha256)&&(l.standaloneNoT24ProtocolSha256===null||hex(l.standaloneNoT24ProtocolSha256)),"NATIVE_SELECTED_T_AND_LATER_REVIEW");
 key(l.laterReviewerPublicKeyPem,F.later);approvedWindow(l,now,tail);
 need(u?.independentT24CustodyTrustApproved===true&&hex(u.policySha256)&&u.reviewerFingerprintSha256===F.custody&&integer(u.maximumRetentionHours,1,168),"T24_CUSTODY_REVIEW");
 key(u.reviewerPublicKeyPem,F.custody);approvedWindow(u,now,tail,"policyValidFromUtc","policyValidUntilUtc");
 shared(a,p,"approvedCodeSha",basic);need(a.schema==="v39.phase6.delegated-later-day-append-review-policy.v1"&&a.delegatedAutomatedLaterDayAppendApproved===true&&a.dayReviewerFingerprintSha256===F.registry&&a.queryReviewerFingerprintSha256===F.query&&a.laterReviewerFingerprintSha256===F.later&&integer(a.maximumIndexRevision,2,1024),"DAY_APPEND_SCOPE");approvedWindow(a,now,tail);
 need(pt?.independentPostReviewerPinsApproved===true&&Object.keys(pt).length===3&&pt.postReviewerFingerprintSha256===F.post,"POST_DISTINCT_REVIEWER");key(pt.postReviewerPublicKeyPem,F.post);
 need(post.schema==="v39.phase6.native-post-physical-window-policy.v1"&&post.independentPostRequestGeometryApproved===true&&post.delegatedPostPacketAndDayAppendApproved===true&&post.independentSourceContentsUseAndRESTReleaseAttested===true&&post.independentProviderContentRetentionApproved===true&&post.reviewedFrameSha256===p.frameSha256&&post.reviewedCategoryBudgetSha256===p.costSha256&&post.reviewedProviderContractSha256===p.providerContractSha256&&hex(post.reviewedProviderPriceSha256)&&hex(post.externalPostContentsAndBudgetEvidenceSha256)&&post.postReviewerFingerprintSha256===F.post&&post.dayReviewerFingerprintSha256===F.registry&&post.queryReviewerFingerprintSha256===F.query&&post.expectedPublisherSessionLogin===PUBLISHER&&integer(post.maximumPrivateRetentionHours,1,168)&&integer(post.maximumIndexRevision,2,1024)&&post.maximumPopulationStalenessSeconds===2700&&post.followupAfterPartitionEndSeconds===3600&&post.dispatchWindowSeconds===1200&&post.expectedApiUnitsPerGet===2,"REVIEWED_POST_COST_AND_WINDOW");approvedWindow(post,now,tail);
 const sizes=NAMES.map((name,i)=>({name,rawBytes:ops.byteLength(JSON.stringify(w[name])),sha256:ops.hash(w[name]),base64Bytes:4*Math.ceil(ops.byteLength(JSON.stringify(w[name]))/3),limit:[8000,35000,20000,8000,6000,35000][i]}));
 need(sizes.every(z=>z.rawBytes>=100&&z.rawBytes<=z.limit&&z.base64Bytes<=48000),"GITHUB_SECRET_BYTE_LIMIT");
 return {policyCount:6,policyDigests:sizes.map(({name,sha256})=>({name,sha256})),policySizes:sizes,validThroughOutcomeTail:true};
}
function verifyFinalManifest(m,c,p,ops){
 need(m?.schema?.startsWith("v39.")&&m.scientificFreezeApproved===true&&m.sourceRightsApproved===true&&m.phase6PaidGo===false&&m.finalPredecessorsApproved===true&&!String(m.status??"").includes("UNSIGNED")&&m.calendarRowsSha256===p.calendarSha256&&m.configSha256===p.configSha256&&m.sourceInventorySha256===p.sourceInventorySha256&&m.executableFileCount===p.executableFileCount,"APPROVED_FINAL_MANIFEST");
 need(plain(c)&&c.calendarRowsSha256===p.calendarSha256&&c.frameSha256===p.frameSha256&&c.sourceRightsApproved===true&&c.reviewApproved===true&&c.phase6PaidGo===false&&!String(c.status??"").includes("NOT_FROZEN"),"APPROVED_FINAL_CONFIG");
 need(ops.hash(c)===p.configSha256&&ops.hash(m)===p.manifestSha256,"FINAL_MANIFEST_CONFIG_BYTES");
 return true;
}
function selectManifestWrite(rows,raw){
 need(Array.isArray(rows)&&rows.length<=1,"MANIFEST_KEY_DUPLICATE");
 if(!rows.length)return "INSERT_ONCE";
 need(rows[0].value===raw,"EXISTING_MANIFEST_DIFFERENT_NO_OVERWRITE");return "EXACT_EXISTING_REUSE";
}
function validateEmptyAuthority(rows){
 const keys=["auth","incidents","open_budget","batches","subscriptions","prior_enable"];
 need(Array.isArray(rows)&&rows.length===1&&plain(rows[0])&&Object.keys(rows[0]).length===keys.length&&keys.every(k=>rows[0][k]===0),"PRODUCTION_AUTHORITY_OR_EXPOSURE_NOT_EMPTY");
}
module.exports={NAMES,F,validateFinalPolicies,verifyFinalManifest,selectManifestWrite,validateEmptyAuthority};
