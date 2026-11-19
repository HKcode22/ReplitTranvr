#!/usr/bin/env node
"use strict";
// One fresh documented-free balance/LIST/balance observation and one public
// receiver health read. No FIDS, refill, CREATE, DELETE, SQL, dispatch, key
// upload, rights assertion or production mutation. Existing limiter reused.
const fs=require("node:fs"),os=require("node:os"),path=require("node:path"),crypto=require("node:crypto");
const {execFileSync}=require("node:child_process");
const {pathToFileURL}=require("node:url");
const REPO="HKcode22/ReplitTranvr",PIN="70580b3749544dfcbeff39da181b2aa42b1b4476",EXPECTED_RECEIVER="bfbfcdc15035995b8d2ed7f4befa1db74d71b7ac";
const need=(o,k)=>{if(!o)throw Error("HOLD_P5_FRESH_ACCOUNT_"+k)};
const hash=b=>crypto.createHash("sha256").update(b).digest("hex");
const gh=args=>execFileSync("gh",args,{encoding:"utf8",timeout:20000,maxBuffer:2*1024*1024,stdio:["ignore","pipe","ignore"],env:{...process.env,GH_PROMPT_DISABLED:"1"}}).trim();
const head=()=>gh(["api","repos/"+REPO+"/git/ref/heads/main","--jq",".object.sha"]);
const whole=n=>Number.isSafeInteger(n)&&n>=0;
function summarize(before,rows,after){
 const b=before?.quota,a=after?.quota;
 need(b&&a&&[b.apiUnitsLimit,b.apiUnitsRemaining,b.requestsRemaining,a.apiUnitsLimit,a.apiUnitsRemaining,a.requestsRemaining,b.requestsLimit,a.requestsLimit,before.balance?.creditsRemaining,after.balance?.creditsRemaining].every(whole),"BALANCE_FIELDS");
 need(b.apiUnitsRemaining<=b.apiUnitsLimit&&a.apiUnitsRemaining<=a.apiUnitsLimit&&b.requestsRemaining<=b.requestsLimit&&a.requestsRemaining<=a.requestsLimit&&Number.isFinite(Date.parse(b.observedAtUtc))&&Number.isFinite(Date.parse(a.observedAtUtc))&&Date.parse(a.observedAtUtc)>=Date.parse(b.observedAtUtc),"ACCOUNT_CLOCK");
 need(Array.isArray(rows)&&new Set(rows.map(x=>x.id)).size===rows.length&&rows.every(x=>typeof x.id==="string"&&x.id.length&&typeof x.isActive==="boolean"&&["CreditBased","LifetimeBased"].includes(x.billingType)),"STRICT_LIST");
 const active=rows.filter(x=>x.isActive),credits=after.balance.creditsRemaining;
 const quotaStable=b.apiUnitsLimit===a.apiUnitsLimit&&b.apiUnitsRemaining===a.apiUnitsRemaining&&before.balance.creditsRemaining===credits&&b.apiUnitsResetAtUtc===a.apiUnitsResetAtUtc;
 const priorUse=a.apiUnitsLimit-a.apiUnitsRemaining,net=50000-priorUse-500;
 const headroom=net-37388-1000,alertCap=credits-1000-150;
 return {schema:"v39.phase5.fresh-provider-account-and-list-observation.v1",observedAtUtc:a.observedAtUtc,apiUnitsLimit:a.apiUnitsLimit,apiUnitsRemaining:a.apiUnitsRemaining,apiUnitsResetAtUtc:a.apiUnitsResetAtUtc,requestsLimit:a.requestsLimit,requestsRemaining:a.requestsRemaining,alertCreditsRemaining:credits,subscriptionCount:rows.length,activeSubscriptionCount:active.length,activeCreditBasedCount:active.filter(x=>x.billingType==="CreditBased").length,activeLifetimeBasedCount:active.filter(x=>x.billingType==="LifetimeBased").length,apiUnitsDifferenceAcrossReads:b.apiUnitsRemaining-a.apiUnitsRemaining,alertCreditsDifferenceAcrossReads:before.balance.creditsRemaining-credits,accountStableAcrossObservation:quotaStable,expectedLegacy60kQuota:a.apiUnitsLimit===60000,existingCalendarResetMatches:a.apiUnitsResetAtUtc==="2026-12-04T02:21:21.000Z",noRefillBudgetProposal:{preFreezeProjectApiUnits:priorUse,authorizedFutureRefillApiUnits:0,authorizedFutureRefillAlertCredits:0,endingApiMarginUnits:500,preRunAlertSpendCeilingCredits:0,endingAlertMarginCredits:150,netRestCeiling:net,reservedRestUnits:37388,protectedRestFloor:1000,unallocatedAfterFloor:headroom,alertRunCeilingCandidate:alertCap,priorResetCycleRequired:15996,priorResetCycleFits:a.apiUnitsRemaining>=15996,legacyAlertStartApproved:false},accountAndExternalListCandidateReviewable:quotaStable&&active.length===0&&a.apiUnitsLimit===60000&&a.apiUnitsResetAtUtc==="2026-12-04T02:21:21.000Z"&&headroom>=0&&alertCap>0&&a.apiUnitsRemaining>=15996,paidProviderCalls:0,paidProviderCallBasis:"Three documented-free account GETs; cross-read unit delta separately measured, not a guarantee against concurrent use",freeAccountProviderGets:3,providerWrites:0,databaseWrites:0,sourceRightsCertified:false,phase6PaidGo:false};
}
const flags={P6_NONPAID_SOURCE_SCHEDULE_ENABLED:"false",P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED:"false",P6_PRIVATE_POST_PARENT_ENABLED:"false",P6_NATIVE_LATER_RUNTIME_ENABLED:"0",P6_NATIVE_POST_PRODUCER_ENABLED:"0",P6_PRIVATE_CURRENT_PRE_SCHEDULE_ENABLED:"0",P6_PRIVATE_T24_EXECUTION_ENABLED:"0",P6_PRIVATE_LATER_ENROLL_ENABLED:"0",P6_PRIVATE_T24_ENROLL_ENABLED:"0",P6_PRIVATE_LATER_ENROLL_SCHEDULE_ENABLED:"0",P6_PRIVATE_T24_ENROLL_SCHEDULE_ENABLED:"0",P5_CD_GH_PRE_SCHEDULE_ENABLED:"0",P5_CD_GH_T24_SCHEDULE_ENABLED:"0",P6_ROLLING_CONTROLLER_ENABLED:"0",P5_AUTO_SOURCE_DISPATCH_ENABLED:"false",P5_POST_AUTO_DISPATCH_ENABLED:"false",P5_T24_AUTO_DISPATCH_ENABLED:"false",P5_LATER_PRE_AUTO_DISPATCH_ENABLED:"false",P5_LATER_PRE_BATCH_AUTO_DISPATCH_ENABLED:"false",P6_T24_CUSTODY_ENABLED:"0",P6_STORED_SOURCE_NATIVE_AUDIT_ENABLED:"0"};
async function run(){
 need(process.argv.length===4&&process.env.GITHUB_ACTIONS!=="true"&&typeof process.env.AERODATABOX_API_KEY==="string"&&process.env.AERODATABOX_API_KEY.length>=8&&process.env.NODE_TLS_REJECT_UNAUTHORIZED!=="0","EXISTING_OWNER_API_KEY");
 need(head()===PIN,"MAIN_CHANGED");
 const limiter=await import(pathToFileURL(path.resolve(process.argv[2])).href),health=await import(pathToFileURL(path.resolve(process.argv[3])).href);
 const before=await limiter.getBalanceEvidenceStrict();
 const list=await limiter.listSubscriptionsStrict();
 const after=await limiter.getBalanceEvidenceStrict();
 const q=summarize(before,list,after);
 let pub;
 try{const r=await health.readGate05PublishedReceiverHealthV39({url:"https://replit-tranvr--hk84164.replit.app/__v39/workspace-runtime",expectedReceiver:EXPECTED_RECEIVER,maxAttempts:1,timeoutMs:10000});
 pub={readOnlyHealthPass:true,expectedPublishedSource:EXPECTED_RECEIVER,sourceIdentityMatches:r.git_head===EXPECTED_RECEIVER,publishedDeployment:r.published_deployment,prepaidRouteRegistered:r.prepaid_route_registered,healthProviderMutation:r.provider_mutation};
 }catch{pub={readOnlyHealthPass:false,expectedPublishedSource:EXPECTED_RECEIVER,sourceIdentityMatches:false}}
 const v=gh(["api","--paginate","repos/"+REPO+"/actions/variables?per_page=100","--jq",".variables[] | @json"]);
 const values=new Map((v?v.split("\n"):[]).map(l=>{const x=JSON.parse(l);return [x.name,x.value]}));
 const modeFlags=Object.entries(flags).map(([name,expected])=>({name,state:!values.has(name)?"UNSET":values.get(name)===expected?"MATCHES_INACTIVE":"OTHER_VALUE_REVIEW"}));
 need(head()===PIN,"MAIN_CHANGED_AFTER_OBSERVATION");
 const dir=fs.mkdtempSync(path.join(fs.realpathSync(os.homedir()),".phase5-fresh-release-evidence-"));fs.chmodSync(dir,0o700);
 const record={...q,main:PIN,publicReceiver:pub,githubModeFlags:modeFlags,allInspectedModesInactiveOrUnset:modeFlags.every(f=>f.state!=="OTHER_VALUE_REVIEW"),githubSecretValuesRead:false,globalStopIndependentlyCertified:false,providerRetentionRightsCertified:false,independentAccountAndOperationalReviewApproved:false};
 const raw=JSON.stringify(record);
 fs.writeFileSync(path.join(dir,"fresh-account-external-stop-evidence.json"),raw,{flag:"wx",mode:0o600});
 const receipt={...record,evidenceSha256:hash(raw),privateEvidenceSaved:true,providerCalls:3,publicReceiverGets:1,githubMutations:0,phase6PaidGo:false};
 console.log(JSON.stringify(receipt));
}
module.exports={summarize};
if(require.main===module)run().catch(e=>{const s=String(e?.message??"");console.error(/^HOLD_P5_FRESH_ACCOUNT_[A-Z0-9_]+$/.test(s)?s:"HOLD_P5_FRESH_ACCOUNT_PROVIDER_OR_PRIVATE_IO_REDACTED");process.exitCode=2});
