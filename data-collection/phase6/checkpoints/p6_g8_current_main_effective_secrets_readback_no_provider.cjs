"use strict";
/* Hosted secret-context verification only, no data/DB/provider or writes.
 * Run once in BOTH repository and phase6-protected-runtime secret contexts,
 * showing no secret string/hash except approved successor bundle digests. */
const {createHash}=require("node:crypto");
const e=process.env;
const main="b432eb9a5bac7bc3c4537249e75ec7df41e8727c";
const expectedStatic="3bb538896d2023ed1ff54b1b0d914a8a134299eac3a5068827e93d82400864b0";
const expectedPost="0916015a99b379d4ff703f59530794577c5c5ab2404e6cdfc1112921f165b54d";
const names=[
"V39_P5_APPROVED_CODE_SHA","P6_NONPAID_SOURCE_APPROVED_MAIN_SHA","V39_P5_ACTUAL_NATIVE_REVIEW_APPROVED_CODE_SHA",
"P5_CD_GH_PRE_APPROVED_CODE_SHA","V39_P5_POST_APPROVED_CODE_SHA","P6_PRIVATE_SOURCE_PARENT_RO_MAIN_SHA",
"V39_P5_QUEUE_APPROVED_CODE_SHA","V39_P5_MANIFEST_SHA256","V39_P5_CALENDAR_HASH",
"V39_P5_CONFIG_HASH","V39_P5_FRAME_HASH","V39_P5_RELEASE_SHA256",
"V39_P5_RIGHTS_SHA256","V39_P5_PROVIDER_CONTRACT_SHA256","P6_INERT_STAGE_INPUT_JSON",
"P6_INERT_STAGE_INPUT_SHA256","P6_INERT_COST_ENVELOPE_SHA256","P6_PRIVATE_POST_OUTCOME_TAIL_HOURS",
"V39_P5_POST_PROVIDER_CONTRACT_SHA256","V39_P5_POST_CATEGORY_BUDGET_SHA256",
"V39_P5_POST_PRICE_SHA256","P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64",
"P6_NONPAID_DAILY_POLICY_BASE64","P6_NONPAID_SIGNING_POLICY_BASE64",
"P6_NONPAID_TRANSPORT_TRUST_BASE64","P6_PRIVATE_POST_REVIEWER_TRUST_BASE64",
"P6_NATIVE_POST_POLICY_BASE64","P6_NONPAID_DAILY_POLICY_SHA256",
"P6_NONPAID_SIGNING_POLICY_SHA256","P6_NONPAID_TRANSPORT_TRUST_SHA256",
"P6_NATIVE_POST_POLICY_SHA256"
];
const hold=s=>{throw Error("HOLD_P6_G8_CURRENT_MAIN_EFFECTIVE_SECRET_"+s)};
const assert=(p,s)=>{if(!p)hold(s)};
const sha=b=>createHash("sha256").update(b).digest("hex");
const digest=x=>sha(JSON.stringify(x));
const context=e.P6_G8_SECRET_READBACK_SCOPE;
assert(e.GITHUB_ACTIONS==="true"&&e.GITHUB_REPOSITORY==="HKcode22/ReplitTranvr"&&
 e.GITHUB_REF==="refs/heads/phase6/20261122-g8-502-readback-evidence"&&
 e.GITHUB_EVENT_NAME==="push"&&e.GITHUB_RUN_ATTEMPT==="1"&&
 ["repository","phase6-protected-runtime"].includes(context)&&
 e.ADB_AUTO_COLLECT==="0"&&
 !e.DATABASE_URL&&!e.AERODATABOX_API_KEY&&!e.RAPIDAPI_KEY,
 "EXACT_HOST_AND_OFFLINE_SCOPE");
assert(names.length===31&&new Set(names).size===31,"EXACT_31_NAMES");
const v=Object.fromEntries(names.map(k=>[k,e[k]??""]));
assert(names.every(k=>typeof v[k]==="string"&&v[k].length>0),"MISSING_SECRET");
assert(digest(v)===expectedStatic,"SUCCEEDED_BUNDLE_DIGEST_MISMATCH");
assert(names.slice(0,7).every(k=>v[k]===main),"TOP_LEVEL_MAIN_BINDINGS");
assert(e.V39_PHASE6_PROCESS_ARMED==="0"&&e.V39_PHASE6_OWNER_APPROVED==="0",
 "PAID_CONTROLS_NOT_ZERO");
const parse=(name)=>{
 const b=v[name];
 assert(/^[A-Za-z0-9+/]+={0,2}$/.test(b),"INVALID_BASE64");
 const raw=Buffer.from(b,"base64");
 assert(raw.toString("base64")===b,"UNCANONICAL_BASE64");
 let obj;try{obj=JSON.parse(raw.toString("utf8"));}catch{hold("INVALID_JSON")}
 assert(JSON.stringify(obj)===raw.toString("utf8"),"UNCANONICAL_JSON");
 return {raw,obj};
};
const policyKeys=names.slice(21,27),policies=Object.fromEntries(policyKeys.map(k=>[k,parse(k)]));
for(const name of ["P6_NONPAID_DAILY_POLICY","P6_NONPAID_SIGNING_POLICY","P6_NONPAID_TRANSPORT_TRUST","P6_NATIVE_POST_POLICY"]){
 assert(sha(policies[name+"_BASE64"].raw)===v[name+"_SHA256"],"POLICY_DIGEST_LINK");
}
const [source,daily,signing,transport,reviewer,native]=policyKeys.map(k=>policies[k].obj);
assert(source.reviewedCodeSha===main&&daily.approvedCodeSha===main&&
 daily.nativeLaterReview?.dayAppendPolicy?.approvedCodeSha===main&&
 signing.approvedCodeSha===main&&transport.reviewedMainSha===main&&
 native.reviewedCodeSha===main,"EMBEDDED_CODE_PIN");
assert(transport.dailyPolicySha256===digest(daily)&&
 transport.signingPolicySha256===digest(signing),"TRANSPORT_CROSS_LINK");
assert(typeof reviewer.postReviewerFingerprintSha256==="string"&&
 reviewer.postReviewerFingerprintSha256.length===64,"REVIEWER_PRESERVED");
const postBase=e.P6_PHASE7_POST_PRESERVATION_POLICY_BASE64??"";
const postHash=e.P6_PHASE7_POST_PRESERVATION_POLICY_SHA256??"";
assert(/^[A-Za-z0-9+/]+={0,2}$/.test(postBase),"POST_BASE64");
const raw=Buffer.from(postBase,"base64");
assert(raw.toString("base64")===postBase&&sha(raw)===expectedPost&&postHash===expectedPost,
 "POST_POLICY_DIGEST");
let post;try{post=JSON.parse(raw.toString("utf8"));}catch{hold("POST_JSON")}
assert(JSON.stringify(post)===raw.toString("utf8")&&
 post.nativePostPolicySha256===v.P6_NATIVE_POST_POLICY_SHA256&&
 post.independentBoundedSettlementApproved===true,
 "POST_NESTED_HASH_BINDING");
console.log(JSON.stringify({
 status:"P6_G8_CURRENT_MAIN_EFFECTIVE_31_STATIC_VALUES_AND_POST_LINKS_VERIFIED_PAID_OFF",
 scope:context,mainSha:main,staticDigest:expectedStatic,
 linkedPostDigest:expectedPost,repoMainUnchangedExpected:true,
 allCodeBindingsCurrent:true,allFourNestedPolicyDigestsVerified:true,
 effectivePaidControlsZero:true,providerCalls:0,databaseReads:0,
 databaseWrites:0,secretValuesPrinted:false,phase6PaidGo:false
}));
