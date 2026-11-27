import {hasP6NativePreFeatureReview} from "../server/lib/disruption/phase6NativePreFeaturePolicy_v39.mjs";
import {p6ReviewedPolicyMatchesRuntime} from "../server/lib/disruption/phase6ReviewedRuntimeCode_v39.mjs";
/**
 * STOP-default, one-day protected GitHub SOURCE preparation/publication
 * entrypoint. No paid provider or child dispatch; existing Stage28 PREPARE
 * login plus separate private reader/publisher, approved stable policy and
 * keys. Exact future metadata-only day plans are independently SHA-pinned.
 * Actual checked-in planning files/keys/rights not commissioned here.
 */
import pg from "pg";
import {createHash,createPublicKey,createPrivateKey,sign} from "node:crypto";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {makeP5Stage28DedicatedRolePool,P5_STAGE28_GROUPS} from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39.ts";
import {readP6StableSourceTrust} from "../server/lib/disruption/phase6StoredSourceRuntimeTrust_v39.mjs";
import {normalizeP5TypedSourceBudgetBinding,sameP5TypedSourceBudgetBinding} from "../server/lib/disruption/phase5TypedSourceBudgetBinding_v39.mjs";
import {readP6DayEpochRestrictedReaderClock} from "../server/lib/disruption/phase6DayEpochSignedIndexOnce_v39.mjs";
import {runP6DurableDailySourcePreparation} from "../server/lib/disruption/phase6DurableDailySourcePreparationRuntime_v39.ts";
import {runP6StoredSourceDayPublication} from "../server/lib/disruption/phase6StoredSourceDayPublicationRuntime_v39.mjs";
import {commitP6Day1LateFixedRegistration} from "../server/lib/disruption/phase5EarlyAdaptiveDrawOwner_v39.ts";
import {verifyP6Day1CommittedLateScope} from "../server/lib/disruption/phase6Day1LateRegistrationScope_v39.mjs";
import {verifyP5EarlyDrawReadonlyAcl} from "./v39_phase5_github_six_slot_early_draw_owner_v39.ts";
const SHA=/^[a-f0-9]{64}$/,CODE=/^[a-f0-9]{40}$/;
const PREPARE_LOGIN="phase5_p30_prepare_login_20261107";
const CONFIRM="ONE_APPROVED_PROSPECTIVE_SOURCE_DAY_NONPAID_PREPARE_PUBLISH";
const CURRENT_CONFIRM="PREPARE_PUBLISH_NEXT_DUE_SIGNED_SOURCE_DAY_NO_PROVIDER";
const DAY1_CONFIRM="RECOVER_EXACT_DAY1_T6_T90_NO_PROVIDER";
const CONDITIONAL_CUSTODY_CONFIRM="VERIFY_FUTURE_CONDITIONAL_POLICY_CUSTODY_NO_PROVIDER";
const hold=s=>{throw Error("HOLD_P6_NONPAID_SOURCE_DAY_GITHUB_"+s);};
const h=b=>createHash("sha256").update(b).digest("hex");
const fp=k=>h(k.export({format:"der",type:"spki"}));
function utc(s){if(typeof s!=="string"||!Number.isFinite(Date.parse(s))||new Date(Date.parse(s)).toISOString()!==s)hold("INVALID_REVIEWED_CLOCK");return Date.parse(s);}
function raw64(s,max,name){
 if(typeof s!=="string"||s.length<8||s.length>Math.ceil(max/3)*4||!/^[A-Za-z0-9+/]+={0,2}$/.test(s))hold("INVALID_"+name);
 const b=Buffer.from(s,"base64");
 if(b.length<8||b.length>max||b.toString("base64")!==s)hold("INVALID_"+name);
 return b;
}
function json(b,sha,max){
 if(!Buffer.isBuffer(b)||b.length<100||b.length>max||!SHA.test(sha??"")||h(b)!==sha)hold("UNPINNED_APPROVAL_BYTES");
 try{return JSON.parse(b.toString("utf8"));}catch{hold("INVALID_APPROVED_JSON");}
}
function privateKey(raw,expected){
 try{
  const k=createPrivateKey(raw64(raw,4096,"PRIVATE_KEY"));
  if(k.asymmetricKeyType!=="ed25519"||fp(createPublicKey(k))!==expected)hold("WRONG_REVIEWER_PRIVATE_KEY");
  return k;
 }catch{hold("WRONG_REVIEWER_PRIVATE_KEY");}
}
function url(raw,login){
 try{
  const u=new URL(raw);
  if(!["postgres:","postgresql:"].includes(u.protocol)||decodeURIComponent(u.username)!==login||
   !u.password||!u.hostname.endsWith(".neon.tech")||u.pathname!=="/neondb"||u.hash||
   (u.port!==""&&u.port!=="5432")||u.searchParams.getAll("sslmode").length!==1||
   u.searchParams.get("sslmode")!=="require"||[...u.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k))||
   (u.searchParams.has("channel_binding")&&(u.searchParams.getAll("channel_binding").length!==1||u.searchParams.get("channel_binding")!=="require")))
   hold("RESTRICTED_TLS_DATABASE_URL_REQUIRED");
  return {raw,endpoint:u.hostname.replace(/-pooler(?=\.)/,"")};
 }catch{hold("RESTRICTED_TLS_DATABASE_URL_REQUIRED");}
}
const modeOf=env=>env.GITHUB_EVENT_NAME==="schedule"?"schedule":
 env.P6_NONPAID_SOURCE_CONFIRM===CONDITIONAL_CUSTODY_CONFIRM?"conditional_custody":
 env.P6_NONPAID_SOURCE_CONFIRM===CURRENT_CONFIRM?"current_dispatch":env.P6_NONPAID_SOURCE_CONFIRM===DAY1_CONFIRM?"day1_recovery":"manual";
export function admitP6NonpaidSourceDayGithub(env){
 if(!env||env.GITHUB_ACTIONS!=="true"||env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||!["workflow_dispatch","schedule"].includes(env.GITHUB_EVENT_NAME)||
    env.GITHUB_RUN_ATTEMPT!=="1"||!CODE.test(env.GITHUB_SHA??"")||!p6ReviewedPolicyMatchesRuntime(env,env.P6_NONPAID_SOURCE_APPROVED_MAIN_SHA)||
    env.P6_NONPAID_SOURCE_RUNTIME_APPROVED!=="1"||env.V39_P5_PREPARE_OWNER_APPROVED!=="1"||
    env.V39_PHASE5_FREEZE_SIGNED!=="1"||env.V39_PHASE5_SOURCE_RIGHTS_APPROVED!=="1"||
    env.ADB_AUTO_COLLECT!=="0"||env.V39_PHASE6_PROCESS_ARMED!=="0"||env.V39_PHASE6_OWNER_APPROVED!=="0"||
    [env.AERODATABOX_API_KEY,env.AERODATABOX_WEBHOOK_SECRET,env.RAPIDAPI_KEY,env.DATABASE_URL,
     env.V39_DATABASE_RUNTIME_URL,env.V39_P5_SOURCE_DATABASE_URL,env.P5_V39_PRE_DATABASE_URL,
     env.P5_V39_OTHER_REST_RESERVE_DATABASE_URL,env.P5_V39_OTHER_REST_REVIEW_DATABASE_URL].some(Boolean)||
    env.NODE_TLS_REJECT_UNAUTHORIZED==="0")
  hold("NOT_APPROVED_REAL_MAIN_NONPAID_RUNTIME");
 const mode=modeOf(env);
 if(mode==="conditional_custody"?env.GITHUB_EVENT_NAME!=="workflow_dispatch"||env.GITHUB_ACTOR!=="HKcode22"||!/^(?:[5-9]|[12][0-9]|3[01])$/.test(env.P6_NONPAID_SOURCE_REQUESTED_DAY??""):
    mode==="day1_recovery"?env.GITHUB_EVENT_NAME!=="workflow_dispatch"||env.P6_NONPAID_SOURCE_REQUESTED_DAY!=="1":mode!=="manual"?env.P6_NONPAID_SOURCE_SCHEDULE_ENABLED!=="true"||Boolean(env.P6_NONPAID_SOURCE_REQUESTED_DAY)||
    (mode==="schedule"?Boolean(env.P6_NONPAID_SOURCE_CONFIRM):env.P6_NONPAID_SOURCE_CONFIRM!==CURRENT_CONFIRM):
    env.P6_NONPAID_SOURCE_CONFIRM!==CONFIRM||!/^([1-9]|[12][0-9]|3[01])$/.test(env.P6_NONPAID_SOURCE_REQUESTED_DAY??""))
  hold("NO_EXACT_MANUAL_OR_SCHEDULE_APPROVAL");
 const trust=readP6StableSourceTrust(env);
 const policyBytes=raw64(env.P6_NONPAID_DAILY_POLICY_BASE64,35000,"DAILY_POLICY");
 const signingPolicyBytes=raw64(env.P6_NONPAID_SIGNING_POLICY_BASE64,20000,"SIGNING_POLICY");
 const p=json(policyBytes,env.P6_NONPAID_DAILY_POLICY_SHA256,35000);
 const q=json(signingPolicyBytes,env.P6_NONPAID_SIGNING_POLICY_SHA256,20000);
 const reviewed=json(raw64(env.P6_NONPAID_TRANSPORT_TRUST_BASE64,8000,"TRANSPORT_TRUST"),env.P6_NONPAID_TRANSPORT_TRUST_SHA256,8000);
 const budget=normalizeP5TypedSourceBudgetBinding(p);
 if(p?.schema!=="v39.phase6.delegated-daily-source-review-policy.v1"||
    q?.schema!=="v39.phase6.delegated-source-review-policy.v1"||
    p.delegatedDailyPacketProductionApproved!==true||q.delegatedAutomatedSourceSigningApproved!==true||
    p.approvedCodeSha!==trust.reviewedCodeSha||q.approvedCodeSha!==trust.reviewedCodeSha||
    p.expectedPrepareRole!==P5_STAGE28_GROUPS.prepare||q.expectedPrepareRole!==P5_STAGE28_GROUPS.prepare||
    !budget||!sameP5TypedSourceBudgetBinding(p,q)||
    !["manifestSha256","calendarSha256","releaseSha256","rightsSha256"].every(k=>p[k]===trust[k]&&q[k]===trust[k])||
    !["configSha256","frameSha256","providerContractSha256","reviewedCategoryBudgetSha256"].every(k=>SHA.test(p[k]??"")&&q[k]===p[k])||
    p.configSha256!==env.V39_P5_CONFIG_HASH||p.frameSha256!==env.V39_P5_FRAME_HASH||
    p.calendarSha256!==env.V39_P5_CALENDAR_HASH||p.providerContractSha256!==env.V39_P5_PROVIDER_CONTRACT_SHA256||
    q.queryReviewerFingerprintSha256!==trust.queryReviewerFingerprintSha256||q.registryReviewerFingerprintSha256!==trust.dayReviewerFingerprintSha256||
    !Array.isArray(p.dayPlanSha256s)||p.dayPlanSha256s.length!==31||
    p.dayPlanSha256s.some((d,i)=>d?.runDayIndex!==i+1||!SHA.test(d.sha256??""))||
    new Set(p.dayPlanSha256s.map(d=>d.sha256)).size!==31||
    utc(p.validUntilUtc)<=utc(p.validFromUtc)||utc(q.validUntilUtc)<=utc(q.validFromUtc)||
    reviewed?.schema!=="v39.phase6.approved-nonpaid-source-transport-trust.v1"||
    reviewed.independentTransportAndSigningScopeApproved!==true||
    reviewed.reviewedMainSha!==trust.reviewedCodeSha||reviewed.dailyPolicySha256!==env.P6_NONPAID_DAILY_POLICY_SHA256||
    reviewed.signingPolicySha256!==env.P6_NONPAID_SIGNING_POLICY_SHA256||
    reviewed.expectedReaderSessionLogin!==trust.expectedReaderSessionLogin||
    !/^phase6_private_publisher_login_[a-z0-9_]{6,50}$/.test(reviewed.expectedPublisherSessionLogin??"")||
    !Number.isSafeInteger(reviewed.maximumDailyReviewRetentionHours)||reviewed.maximumDailyReviewRetentionHours<1||reviewed.maximumDailyReviewRetentionHours>168||
    !Number.isSafeInteger(reviewed.minimumPreparationLeadMinutes)||reviewed.minimumPreparationLeadMinutes<15||reviewed.minimumPreparationLeadMinutes>180||
    !Number.isSafeInteger(reviewed.maximumPreparationLookaheadMinutes)||reviewed.maximumPreparationLookaheadMinutes<reviewed.minimumPreparationLeadMinutes||reviewed.maximumPreparationLookaheadMinutes>2880||
    !SHA.test(reviewed.dailyReviewerFingerprintSha256??"")||reviewed.dailyReviewerFingerprintSha256===trust.dayReviewerFingerprintSha256||
    reviewed.dailyReviewerFingerprintSha256===trust.queryReviewerFingerprintSha256)
  hold("STUDY_POLICY_OR_TRANSPORT_REVIEW_DRIFT");
 let dailyPublic;
 try{dailyPublic=createPublicKey(reviewed.dailyReviewerPublicKeyPem);
  if(dailyPublic.asymmetricKeyType!=="ed25519"||fp(dailyPublic)!==reviewed.dailyReviewerFingerprintSha256)hold("INVALID_DAILY_REVIEWER_TRUST");
 }catch{hold("INVALID_DAILY_REVIEWER_TRUST");}
 // Custody is read-only, not a signing or publisher readiness probe.
 // Never inject private reviewer material or a publisher password into this
 // branch. Ordinary prepare/publish still validates all original credentials.
 const custodyOnly=mode==="conditional_custody";
 if(custodyOnly&&[env.P6_NONPAID_DAILY_REVIEWER_PRIVATE_KEY_BASE64,env.P6_NONPAID_QUERY_REVIEWER_PRIVATE_KEY_BASE64,
   env.P6_NONPAID_REGISTRY_REVIEWER_PRIVATE_KEY_BASE64,env.P6_PRIVATE_PUBLISHER_DATABASE_URL].some(Boolean))
  hold("CONDITIONAL_CUSTODY_WRITE_CAPABILITY_FORBIDDEN");
 const dailyKey=custodyOnly?undefined:privateKey(env.P6_NONPAID_DAILY_REVIEWER_PRIVATE_KEY_BASE64,reviewed.dailyReviewerFingerprintSha256);
 const queryKey=custodyOnly?undefined:privateKey(env.P6_NONPAID_QUERY_REVIEWER_PRIVATE_KEY_BASE64,trust.queryReviewerFingerprintSha256);
 const registryKey=custodyOnly?undefined:privateKey(env.P6_NONPAID_REGISTRY_REVIEWER_PRIVATE_KEY_BASE64,trust.dayReviewerFingerprintSha256);
 const prepare=url(env.P5_V39_PREPARE_DATABASE_URL,PREPARE_LOGIN),
  reader=url(env.P6_PRIVATE_READER_DATABASE_URL,trust.expectedReaderSessionLogin),
  publisher=custodyOnly?undefined:url(env.P6_PRIVATE_PUBLISHER_DATABASE_URL,reviewed.expectedPublisherSessionLogin);
 if(new Set([prepare.endpoint,reader.endpoint,...(publisher?[publisher.endpoint]:[])]).size!==1)hold("CROSS_DATABASE_ENDPOINT");
 const lateRole=mode==="day1_recovery"?env.V39_P5_EARLY_DRAW_EFFECTIVE_ROLE:undefined;
 const late=mode==="day1_recovery"?url(env.V39_P5_EARLY_DRAW_DATABASE_URL,lateRole):undefined;
 if(late&& (lateRole!=="phase5_early_draw_prod20261115"||late.endpoint!==prepare.endpoint||p.manifestSha256!=="a596feb9b3d8a1d75c8856a2f2f6bc559a87d58fd18132bbfa0f48428965118e"||budget.budgetReleaseMode!=="COST_UPPER_BOUND"))hold("EXACT_EXISTING_DAY1_RECOVERY_ROLE_AND_MANIFEST");
 const receipt={mode,mainSha:env.GITHUB_SHA,requestedDay:["manual","day1_recovery","conditional_custody"].includes(mode)?Number(env.P6_NONPAID_SOURCE_REQUESTED_DAY):null,
  providerCalls:0,phase6PaidGo:false};
 Object.defineProperties(receipt,Object.fromEntries(Object.entries({p,q,reviewed,policyBytes,signingPolicyBytes,trust,
  prepareUrl:prepare.raw,readerUrl:reader.raw,publisherUrl:publisher?.raw,dailyKey,queryKey,registryKey,lateUrl:late?.raw,lateRole,
  dailyPolicySha:env.P6_NONPAID_DAILY_POLICY_SHA256,signingPolicySha:env.P6_NONPAID_SIGNING_POLICY_SHA256})
  .map(([k,value])=>[k,{value,enumerable:false}])));
 return Object.freeze(receipt);
}
/** The only checkout files admitted here are reviewed prospective planning
 * metadata (slot/timing/template geometry), not actual provider Contents.
 * This code creates no real files; signed study approval must supply all 31. */
export function loadP6ReviewedDayPlans(ctx,read=readFileSync){
 const plans=[];
 for(const d of ctx.p.dayPlanSha256s){
  const path="data-collection/phase5/planning/phase6-source-day-"+String(d.runDayIndex).padStart(2,"0")+".json";
  let bytes;
  try{bytes=read(path);}catch{hold("APPROVED_DAY_PLAN_FILE_MISSING");}
  const plan=json(bytes,d.sha256,500000);
  if(plan?.schema!=="v39.phase6.reviewed-future-day-source-plan.v1"||plan.runDayIndex!==d.runDayIndex||
   !Array.isArray(plan.templates)||plan.templates.length<12||plan.templates.length>384||
   plan.templates.some(t=>t?.runDayIndex!==d.runDayIndex))
   hold("INVALID_EXACT_FUTURE_DAY_PLAN");
  const first=Math.min(...plan.templates.map(t=>utc(t.scheduledRequestUtc)));
  plans.push({runDayIndex:d.runDayIndex,serviceStartUtc:plan.expectedServiceStartUtc,
   firstRequestUtc:new Date(first).toISOString(),bytes,sha256:d.sha256});
 }
 return plans;
}
/** Actual DB clock, no selection of airports or guessed calendar date. */
export function selectP6NonpaidSourceDay(ctx,plans,calendar,indexRows,observedUtc){
 const now=utc(observedUtc),minimum=ctx.reviewed.minimumPreparationLeadMinutes*60000,
  maximum=ctx.reviewed.maximumPreparationLookaheadMinutes*60000;
 if(!Array.isArray(calendar)||calendar.length!==31||new Set(calendar.map(x=>x.run_day_index)).size!==31||
  !Array.isArray(indexRows)||indexRows.length!==31||new Set(indexRows.map(x=>x.run_day_index)).size!==31)
  hold("INCOMPLETE_ACTUAL_CALENDAR_OR_INDEX_METADATA");
 const byDay=new Map(calendar.map(x=>[x.run_day_index,x])),indexes=new Map(indexRows.map(x=>[x.run_day_index,x]));
 let tooLate=0,missingDraw=0,alreadyIndexed=0;const eligible=[];
 // Content-free operational evidence, separate from provider or flight
 // outcomes. A past first-request deadline is not a valid backfill window.
 const missedUnpublishedDays=[],atRiskMissingDrawDays=[],pastIncompleteGenesisDays=[],futurePreparation=[];
 for(const plan of plans){
  if(ctx.requestedDay!==null&&plan.runDayIndex!==ctx.requestedDay)continue;
  const c=byDay.get(plan.runDayIndex),i=indexes.get(plan.runDayIndex);
  if(!c||!i||c.calendar_hash!==ctx.p.calendarSha256||c.config_hash!==ctx.p.configSha256||
     c.frame_hash!==ctx.p.frameSha256||new Date(c.scheduled_start_utc).toISOString()!==plan.serviceStartUtc||
     !Number.isSafeInteger(c.draw_n)||c.draw_n<0||c.draw_n>4||
     !Number.isSafeInteger(i.claim_n)||i.claim_n<0||i.claim_n>1||
     !Number.isSafeInteger(i.index_n)||i.index_n<0||i.index_n>1024)
   hold("ACTUAL_DAY_PLAN_OR_INDEX_STATE_DRIFT");
  const lead=utc(plan.firstRequestUtc)-now;
  const deadline={runDayIndex:plan.runDayIndex,firstRequestUtc:plan.firstRequestUtc,
   preparationDeadlineUtc:new Date(utc(plan.firstRequestUtc)-minimum).toISOString()};
  // Completed genesis metadata must not be called a missed preparation
  // simply because its first request is now close or in the past.
  const indexed=i.claim_n===1&&i.index_n>=1;
  if(lead<minimum){
   if(indexed)continue;
   if(lead>=0)tooLate++;
   if(i.claim_n!==0||i.index_n!==0)pastIncompleteGenesisDays.push(deadline);
   else missedUnpublishedDays.push(deadline);
   continue;
  }
  if(lead>maximum){
   if(!indexed)futurePreparation.push({...deadline,preparationOpensUtc:new Date(utc(plan.firstRequestUtc)-maximum).toISOString(),
    drawCount:c.draw_n,genesisState:i.claim_n===0&&i.index_n===0?"ABSENT": "PARTIAL_REQUIRES_REVIEW"});
   continue;
  }
  if(indexed){alreadyIndexed++;continue;}
  if(i.claim_n!==0||i.index_n!==0)hold("INCOMPLETE_FUTURE_INDEX_GENESIS_NO_REPLAY");
  if(c.draw_n!==4){
   missingDraw++;
   // One hour before the existing minimum lead boundary: notification
   // only, does not alter selection, lookahead or authorization.
   if(lead<=minimum+3600000)atRiskMissingDrawDays.push(deadline);
   continue;
  }
  eligible.push(plan);
 }
 eligible.sort((a,b)=>a.firstRequestUtc.localeCompare(b.firstRequestUtc)||a.runDayIndex-b.runDayIndex);
 return {selected:eligible[0]??null,eligibleDayCount:eligible.length,missingDraw,tooLate,alreadyIndexed,
  missedUnpublishedDays,atRiskMissingDrawDays,pastIncompleteGenesisDays,
  nextFuturePreparation:futurePreparation.sort((a,b)=>a.firstRequestUtc.localeCompare(b.firstRequestUtc)||a.runDayIndex-b.runDayIndex)[0]??null,
  futureOutsideLookaheadCount:futurePreparation.length};
}
async function calendarRead(restricted,ctx){
 const c=await restricted.connect();
 try{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  await c.query("SET LOCAL statement_timeout='12000ms'");
  const clock=(await c.query("SELECT clock_timestamp() AS now, current_setting('transaction_read_only') AS ro")).rows[0];
  if(clock?.ro!=="on")hold("NO_ACTUAL_CALENDAR_READONLY");
  const rs=await c.query("SELECT c.run_day_index,c.scheduled_start_utc,c.calendar_hash,c.config_hash,c.frame_hash,"+
   "(SELECT count(*)::int FROM clean.adb_sampling_draw d WHERE d.run_day_index=c.run_day_index) AS draw_n "+
   "FROM clean.adb_phase6_calendar_day c ORDER BY run_day_index LIMIT 32");
  await c.query("ROLLBACK");return{calendar:rs.rows,clock:new Date(clock.now).toISOString()};
 }finally{c.release();}
}
async function indexRead(reader,ctx){
 let tx=false;
 try{
  await reader.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
  await reader.query("SET LOCAL statement_timeout='8000ms'");
  const now=await readP6DayEpochRestrictedReaderClock(reader,ctx.trust.expectedReaderSessionLogin);
  const z=await reader.query("SELECT d AS run_day_index,"+
   "(SELECT count(*)::int FROM phase6_private.signed_run_day_epoch_claim_v39 c WHERE c.run_day_index=d) AS claim_n,"+
   "(SELECT count(*)::int FROM phase6_private.signed_run_day_index_revision_v39 i WHERE i.run_day_index=d) AS index_n "+
   "FROM generate_series(1,31) d ORDER BY d");
  await reader.query("ROLLBACK");tx=false;return{rows:z.rows,now};
 }finally{if(tx)await reader.query("ROLLBACK").catch(()=>{});}
}
/** Owner-only conditional commissioning inspection, not issuance, signing,
 * installation or new SOURCE authority. Existing admission validates the
 * protected three policies, real signer identities and exact 31 plan pins.
 * Do not serialize policy bytes, key material, digests or database URLs. */
export function projectP6ConditionalPolicyCustody(ctx,plans,calendar,indexRows,observedUtc,preparedCount,env){
 if(ctx.mode!=="conditional_custody"||!Number.isSafeInteger(ctx.requestedDay)||ctx.requestedDay<5||ctx.requestedDay>31||
    plans.length!==31||!Number.isSafeInteger(preparedCount)||preparedCount<0)
  hold("CONDITIONAL_CUSTODY_SCOPE");
 const selected=selectP6NonpaidSourceDay(ctx,plans,calendar,indexRows,observedUtc);
 const day=selected.nextFuturePreparation;
 if(!day||day.runDayIndex!==ctx.requestedDay||day.genesisState!=="ABSENT"||preparedCount!==0||utc(observedUtc)>=utc(day.preparationOpensUtc))
  hold("CONDITIONAL_CUSTODY_NOT_UNSIGNED_BEFORE_PREPARATION");
 // The requested day selector is intentionally scoped for ordinary manual
 // preparation. Commissioning instead needs the next unsigned prospective
 // conditional day, not a caller-selected later day which skips one.
 for(const earlier of plans.filter(x=>x.runDayIndex>=5&&x.runDayIndex<ctx.requestedDay&&utc(x.firstRequestUtc)>utc(observedUtc))){
  const earlierCtx={requestedDay:earlier.runDayIndex,p:ctx.p,reviewed:ctx.reviewed};
  selectP6NonpaidSourceDay(earlierCtx,plans,calendar,indexRows,observedUtc);
  const prior=indexRows.find(x=>x.run_day_index===earlier.runDayIndex);
  if(prior?.claim_n!==1||prior.index_n<1)hold("CONDITIONAL_CUSTODY_EARLIER_UNSIGNED_PROSPECTIVE_DAY");
 }
 const p=ctx.p,q=ctx.q,v=p.nativeLaterReview;
 const fields=[p.conditionalPreFeatureReview,p.conditionalT24PermitReview,p.conditionalLaterPermitReview,
  q.conditionalServicePolicy,v?.conditionalT24Scope,v?.conditionalLaterDayAppendPolicy,v?.nativeT24PolicyTransition,
  v?.conditionalLaterDayAppendPolicy?.conditionalLaterPreScope];
 // The original native append policy must remain unchanged. A marker there
 // is unexpected even if the separate conditional successor is complete.
 const unexpectedNativeMarker=v?.dayAppendPolicy?.conditionalLaterPreScope!==undefined;
 const present=fields.filter(x=>x!==undefined).length;
 let last=-Infinity;
 for(const x of plans.filter(z=>z.runDayIndex>=ctx.requestedDay)){
  const plan=JSON.parse(x.bytes.toString("utf8"));
  for(const row of plan.templates){const end=utc(row.serviceWindowEndUtc);if(end<=utc(row.scheduledRequestUtc))hold("CONDITIONAL_CUSTODY_PLAN_WINDOW");last=Math.max(last,end);}
 }
 const nativePolicyPresent=Boolean(hasP6NativePreFeatureReview(p.nativePreFeatureReview,ctx.trust.rightsSha256)&&v?.approved===true&&v.nativeT24ReviewApproved===true&&
  v.independentT24WitnessProtocolReviewed===true&&v.dayAppendPolicy?.delegatedAutomatedLaterDayAppendApproved===true);
 const timePolicies=[p,q,v,v?.dayAppendPolicy];
 const baseIntervalCoversRemainingStudy=Boolean(nativePolicyPresent&&timePolicies.every(x=>utc(x.validFromUtc)<=utc(day.preparationOpensUtc)&&utc(x.validUntilUtc)>last));
 let publicActorsVerified=false;
 try{
  const lane=createPublicKey(raw64(env.P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_PUBLIC_KEY_BASE64,4096,"CONDITIONAL_LANE_PUBLIC"));
  const proof=createPublicKey(raw64(env.P6_PHASE7_PRE_PROOF_REVIEWER_PUBLIC_KEY_BASE64,4096,"CONDITIONAL_PROOF_PUBLIC"));
  const keys=[fp(lane),fp(proof),v?.laterReviewerFingerprintSha256,ctx.trust.dayReviewerFingerprintSha256,ctx.trust.queryReviewerFingerprintSha256];
  publicActorsVerified=lane.asymmetricKeyType==="ed25519"&&proof.asymmetricKeyType==="ed25519"&&
   keys.every(k=>SHA.test(k??""))&&new Set(keys).size===5&&keys[0]===env.P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_FINGERPRINT_SHA256&&keys[1]===env.P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256;
 }catch{/* explicitly false; never expose invalid key bytes */}
 return Object.freeze({status:"P6_ACTUAL_PROTECTED_CONDITIONAL_POLICY_CUSTODY_READONLY",
  prospective:{runDayIndex:day.runDayIndex,firstRequestUtc:day.firstRequestUtc,preparationOpensUtc:day.preparationOpensUtc,genesisAbsent:true,preparedQueryCount:0},
  observedDbClockUtc:observedUtc,exactThreePolicyDigestsValidated:true,exact31PlanPinsValidated:true,
  // Commitment to exact admitted policy digests (not the secret digest
  // values themselves). Recompute inside the protected context when
  // reviewing a candidate; never use as a substitute for the individual pins.
  basePolicyCommitmentSha256:h(JSON.stringify({schema:"v39.phase5b.custody-base-commitment.v1",
   daily:env.P6_NONPAID_DAILY_POLICY_SHA256,signing:env.P6_NONPAID_SIGNING_POLICY_SHA256,transport:env.P6_NONPAID_TRANSPORT_TRUST_SHA256})),
  signingPrivateKeysVerified:false,publisherEndpointVerified:false,
  signingOrPublishingCapabilityPresent:false,
  canonicalNativePredecessorBytes:Buffer.from(JSON.stringify(p)).equals(ctx.policyBytes),
  nativePolicyPresent,baseIntervalCoversRemainingStudy,remainingServiceEndUtc:new Date(last).toISOString(),
  conditionalPolicyFieldState:unexpectedNativeMarker?"PARTIAL_HOLD":present===0?"ABSENT":present===fields.length?"ALL_FIELDS_PRESENT_NOT_COMMISSIONED_PROOF":"PARTIAL_HOLD",
  publicActorsVerified,conditionalMetadataEnabled:env.P6_CONDITIONAL_LATER_METADATA_READ_ENABLED==="1",
  actualConditionalPolicyInstalledVerified:false,actualConditionalPreCommitVerified:false,
  providerCalls:0,databaseWrites:0,githubWrites:0,signaturesIssued:0,phase6PaidGo:false});
}
export async function conditionalPreparedRead(restricted,ctx){
 const c=await restricted.connect();let tx=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
  await c.query("SET LOCAL statement_timeout='12000ms'");
  const z=await c.query("SELECT count(*)::int AS prepared,transaction_timestamp() AS observed,current_setting('transaction_read_only') AS ro FROM clean.phase5_fids_allowed_query_v39 WHERE manifest_sha256=$1 AND run_day_index=$2",[ctx.trust.manifestSha256,ctx.requestedDay]);
  const r=z.rows[0];
  if(z.rowCount!==1||r?.ro!=="on"||!Number.isSafeInteger(r.prepared)||r.prepared<0)hold("CONDITIONAL_CUSTODY_PREPARED_READ");
  return {count:r.prepared,clock:new Date(r.observed).toISOString()};
 }finally{
  // An unacknowledged BEGIN or ROLLBACK leaves transaction state unknown.
  // Discard the pooled connection; never emit a successful custody receipt
  // if the read-only transaction's cleanup could not be confirmed.
  if(!tx)c.release(true);
  else{
   try{await c.query("ROLLBACK");}
   catch{c.release(true);hold("CONDITIONAL_CUSTODY_ROLLBACK_UNVERIFIED");}
   c.release();
  }
 }
}
/** One explicit owner-approved incident using existing protected credentials.
 * The existing daily reviewer signs the exact late fixed registration scope
 * under the successor code pin. No new key, credential or paid dispatch. */
async function registerOrReadDay1(ctx,plan){
 const p=ctx.p,lead=Math.max(20,ctx.reviewed.minimumPreparationLeadMinutes);
 const policy={schema:"v39.phase6.day1-late-registration-policy.v1",runDayIndex:1,incidentRunId:45293307564,
  originalDayPlanSha256:plan.sha256,manifestSha256:p.manifestSha256,calendarSha256:p.calendarSha256,configSha256:p.configSha256,
  frameSha256:p.frameSha256,reviewedCodeSha:ctx.trust.reviewedCodeSha,reviewerFingerprintSha256:ctx.reviewed.dailyReviewerFingerprintSha256,
  allowLateFixedPairRegistration:true,allowPaidDispatch:false,allowBackdating:false,missingnessClass:"HONESTLY_UNOBSERVED_NOT_BACKFILLED",
  validFromUtc:"2026-11-24T00:00:00.000Z",validUntilUtc:"2026-11-25T02:00:00.000Z",minimumPreparationLeadMinutes:lead};
 const policyBytes=Buffer.from(JSON.stringify(policy)),signed={policyBytes,signatureBase64:sign(null,policyBytes,ctx.dailyKey).toString("base64"),
  reviewerPublicKeyPem:ctx.reviewed.dailyReviewerPublicKeyPem,pins:{...policy,policySha256:h(policyBytes)},dayPlanBytes:plan.bytes};
 const pool=new pg.Pool({connectionString:ctx.lateUrl,max:1,connectionTimeoutMillis:8000,query_timeout:40000});
 const read=async()=>{
  const c=await pool.connect();let tx=false;
  try{
   await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
   const now=(await c.query("SELECT current_user actor,session_user login,clock_timestamp() at,current_database() db,pg_is_in_recovery() replica")).rows[0];
   if(now.actor!==ctx.lateRole||now.login!==ctx.lateRole||now.db!=="neondb"||now.replica!==false||
      new Date(now.at).getTime()>=Date.parse("2026-11-24T17:45:00.000Z")-lead*60000)hold("DAY1_RECOVERY_PREPARATION_DEADLINE");
   const x=(await c.query("SELECT run_day_index,scheduled_start_utc,draw_type,calendar_hash,config_hash,frame_hash,slot_regions,pair_airport_set FROM clean.adb_phase6_calendar_day WHERE run_day_index=1")).rows[0];
   const d=await c.query("SELECT slot_id,selected_icao,selected_at_utc FROM clean.adb_sampling_draw WHERE run_day_index=1 ORDER BY slot_id");
   const future=await c.query("SELECT run_day_index,selected_icao FROM clean.adb_sampling_draw WHERE run_day_index>1 ORDER BY run_day_index,slot_id");
   const hist=(await c.query("SELECT (SELECT count(*)::int FROM clean.phase5_fids_physical_attempt_v39 WHERE manifest_sha256=$1) source,(SELECT count(*)::int FROM clean.phase5_other_rest_physical_reservation_v39 WHERE manifest_sha256=$1) rest,(SELECT count(*)::int FROM clean.adb_incident_stop WHERE NOT resolved) stops",[p.manifestSha256])).rows[0];
   if(!x||!hist||hist.source!==0||hist.rest!==0||hist.stops!==0||![0,4].includes(d.rowCount))hold("DAY1_EXISTING_OR_UNCERTAIN_HISTORY");
   await c.query("ROLLBACK");tx=false;
   return {count:d.rowCount,selectedAt:d.rowCount?new Date(d.rows[0].selected_at_utc).toISOString():null,
    evidence:{calendarDay:{runDayIndex:x.run_day_index,scheduledStartUtc:new Date(x.scheduled_start_utc).toISOString(),drawType:x.draw_type,calendarHash:x.calendar_hash,configHash:x.config_hash,frameHash:x.frame_hash,slotRegions:x.slot_regions,pairAirportSet:x.pair_airport_set},
     futureCommittedDraws:future.rows.map(r=>({runDayIndex:r.run_day_index,icao:r.selected_icao})),existingDrawRows:d.rows,
     sourceAttempts:hist.source,otherRestReservations:hist.rest,unresolvedStops:hist.stops}};
  }finally{if(tx)await c.query("ROLLBACK").catch(()=>{});c.release();}
 };
 try{
  await verifyP5EarlyDrawReadonlyAcl(pool,ctx.lateRole);
  let observed=await read();
  if(observed.count===0){
   await commitP6Day1LateFixedRegistration(pool,{runDayIndex:1,expectedManifestSha256:p.manifestSha256,
    expectedCalendarHash:p.calendarSha256,expectedConfigHash:p.configSha256,expectedFrameHash:p.frameSha256,
    phase5FreezeApproved:true,githubOnlyApproved:true},signed,ctx.lateRole);
   observed=await read();
  }
  if(observed.count!==4)hold("DAY1_LATE_COMMIT_READBACK");
  const scope=verifyP6Day1CommittedLateScope({...signed,...observed.evidence,observedDbUtc:observed.selectedAt});
  if(scope.candidateQueryCount!==128||scope.excludedQueryCount!==64)hold("DAY1_FULL_REMAINING_HORIZONS_NO_LONGER_PROSPECTIVE");
  return scope;
 }finally{await pool.end().catch(()=>{});}
}
export async function runP6NonpaidSourceDayGithub(env){
 const ctx=admitP6NonpaidSourceDayGithub(env),plans=loadP6ReviewedDayPlans(ctx);
 const raw=new pg.Pool({connectionString:ctx.prepareUrl,max:1,connectionTimeoutMillis:8000,query_timeout:40000});
 const restricted=makeP5Stage28DedicatedRolePool(raw,{group:"prepare",reviewedDedicatedLogin:PREPARE_LOGIN,
  forbiddenApplicationLogin:"phase5_p30_pre_login_20261107"});
 const reader=new pg.Client({connectionString:ctx.readerUrl,connectionTimeoutMillis:8000,query_timeout:40000});
 const publisher=ctx.mode==="conditional_custody"?null:new pg.Client({connectionString:ctx.publisherUrl,connectionTimeoutMillis:8000,query_timeout:40000});
 try{
  await reader.connect();
  await reader.query("SET ROLE phase6_private_frozen_reader_v39");
  const c=await calendarRead(restricted,ctx),i=await indexRead(reader,ctx);
  if(Math.abs(utc(c.clock)-utc(i.now))>120000)hold("CROSS_SNAPSHOT_DB_CLOCK_DRIFT");
  if(ctx.mode==="conditional_custody"){
   const count=await conditionalPreparedRead(restricted,ctx);
   if(Math.abs(utc(count.clock)-utc(i.now))>120000)hold("CONDITIONAL_CUSTODY_CLOCK_DRIFT");
   return projectP6ConditionalPolicyCustody(ctx,plans,c.calendar,i.rows,count.clock,count.count,env);
  }
  let selection,lateScope;
  if(ctx.mode==="day1_recovery"){
   const d=c.calendar.find(x=>x.run_day_index===1),idx=i.rows.find(x=>x.run_day_index===1);
   if(!d||!idx||d.calendar_hash!==ctx.p.calendarSha256||d.config_hash!==ctx.p.configSha256||
      d.frame_hash!==ctx.p.frameSha256||idx.claim_n!==0||idx.index_n!==0)hold("DAY1_ALREADY_INDEXED_OR_UNCERTAIN_NO_REPLAY");
   const plan=plans[0];
   lateScope=await registerOrReadDay1(ctx,plan);
   selection={selected:plan,eligibleDayCount:1,missingDraw:0,tooLate:0,alreadyIndexed:0,missedUnpublishedDays:[],atRiskMissingDrawDays:[],pastIncompleteGenesisDays:[]};
  }else selection=selectP6NonpaidSourceDay(ctx,plans,c.calendar,i.rows,i.now);
  const base={schema:"v39.phase6.github-nonpaid-source-day-runtime.v1",mainSha:ctx.mainSha,reviewedPolicySha:ctx.trust.reviewedCodeSha,
   eligibleDayCount:selection.eligibleDayCount,missingDrawDayCount:selection.missingDraw,
   tooLateDayCount:selection.tooLate,alreadyIndexedMetadataDayCount:selection.alreadyIndexed,
   preparationDeadlineEvidence:{schema:"v39.phase6.preparation-deadline-metadata.v1",
    observedDbUtc:i.now,missedUnpublishedDays:selection.missedUnpublishedDays,
    atRiskMissingDrawDays:selection.atRiskMissingDrawDays,
    pastIncompleteGenesisDays:selection.pastIncompleteGenesisDays,
    nextFuturePreparation:selection.nextFuturePreparation??null,futureOutsideLookaheadCount:selection.futureOutsideLookaheadCount??null,
    minimumPreparationLeadMinutes:ctx.reviewed.minimumPreparationLeadMinutes,maximumPreparationLookaheadMinutes:ctx.reviewed.maximumPreparationLookaheadMinutes,
    actualFlightLossVerified:false,actualProviderCollectionVerified:false},
   providerCalls:0,githubDispatches:0,phase6PaidGo:false};
  if(!selection.selected)return Object.freeze({...base,status:"NO_ELIGIBLE_UNPUBLISHED_FUTURE_DAY_NO_WRITE"});
  const plan=selection.selected,p=ctx.p;
  const dailyTrust={independentDailyReviewerTrustApproved:true,runDayIndex:plan.runDayIndex,
   reviewedCodeSha:ctx.trust.reviewedCodeSha,manifestSha256:p.manifestSha256,calendarSha256:p.calendarSha256,
   configSha256:p.configSha256,frameSha256:p.frameSha256,releaseSha256:p.releaseSha256,rightsSha256:p.rightsSha256,
   providerContractSha256:p.providerContractSha256,policySha256:ctx.dailyPolicySha,dayPlanSha256:plan.sha256,
   ...normalizeP5TypedSourceBudgetBinding(p),reviewedCategoryBudgetSha256:p.reviewedCategoryBudgetSha256,
   reviewerFingerprintSha256:ctx.reviewed.dailyReviewerFingerprintSha256,
   reviewerPublicKeyPem:ctx.reviewed.dailyReviewerPublicKeyPem,
   maximumRetentionHours:ctx.reviewed.maximumDailyReviewRetentionHours,
   policyValidFromUtc:p.validFromUtc,policyValidUntilUtc:p.validUntilUtc};
  await publisher.connect();await publisher.query("SET ROLE phase6_private_frozen_publisher_v39");
  const common={existingPaidDispatchApproved:false,adbAutoCollect:"0",phase6ProcessArmed:"0",
   expectedReaderSessionLogin:ctx.trust.expectedReaderSessionLogin,expectedPublisherSessionLogin:ctx.reviewed.expectedPublisherSessionLogin};
  const prep=await runP6DurableDailySourcePreparation({producer:{readPool:restricted,
   policyBytes:ctx.policyBytes,dayPlanBytes:plan.bytes,lateScope,pins:{independent31DayDelegationPolicyApproved:true,
    expectedPolicySha256:ctx.dailyPolicySha,expectedReviewedMainSha:ctx.trust.reviewedCodeSha,expectedRunDayIndex:plan.runDayIndex,
    noProviderCredentialsInReviewer:true,existingPaidDispatchApproved:false}},
   preparePool:restricted,readerClient:reader,publisherClient:publisher,dailyReviewerKey:ctx.dailyKey,
   trust:dailyTrust,scope:{...common,independentlyApprovedDurableDailyPrepareRuntime:true}});
  const published=await runP6StoredSourceDayPublication({readerClient:reader,publisherClient:publisher,
   prepareReadPool:restricted,dailyTrust,sourceTrust:{...ctx.trust,
    registryReviewerFingerprintSha256:ctx.trust.dayReviewerFingerprintSha256,
    registryReviewerPublicKeyPem:ctx.trust.dayReviewerPublicKeyPem},
   signingPolicyBytes:ctx.signingPolicyBytes,expectedSigningPolicySha256:ctx.signingPolicySha,
   queryKey:ctx.queryKey,registryKey:ctx.registryKey,lateScope,scope:{...common,independentlyApprovedSourceDayPublicationRuntime:true,
    independentlyApprovedReadbackRecovery:true}});
  return Object.freeze({...base,status:"ONE_PROSPECTIVE_DAY_PREPARED_AND_PUBLISHED_NO_PAID_GO",runDayIndex:plan.runDayIndex,
   insertedDailyReviewRow:prep.insertedDailyReviewRow,preparedLedgerInserts:prep.preparedLedgerInserts,
   verifiedPreparedQueryCount:prep.verifiedQueryCount,...published});
 }finally{if(publisher)await publisher.end().catch(()=>{});await reader.end().catch(()=>{});await raw.end().catch(()=>{});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 runP6NonpaidSourceDayGithub(process.env).then(r=>console.log(JSON.stringify(r))).catch(e=>{
  const msg=String(e?.message??"");
  console.error(/^(HOLD_P6|REFUSED_P5)_[A-Z0-9_]+$/.test(msg)?msg:"HOLD_P6_NONPAID_SOURCE_DAY_RUNTIME_REDACTED");
  process.exitCode=2;
 });
}
