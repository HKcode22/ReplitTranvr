/**
 * STOP-default, one-day protected GitHub SOURCE preparation/publication
 * entrypoint. No paid provider or child dispatch; existing Stage28 PREPARE
 * login plus separate private reader/publisher, approved stable policy and
 * keys. Exact future metadata-only day plans are independently SHA-pinned.
 * Actual checked-in planning files/keys/rights not commissioned here.
 */
import pg from "pg";
import {createHash,createPublicKey,createPrivateKey} from "node:crypto";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {makeP5Stage28DedicatedRolePool,P5_STAGE28_GROUPS} from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39.ts";
import {readP6StableSourceTrust} from "../server/lib/disruption/phase6StoredSourceRuntimeTrust_v39.mjs";
import {normalizeP5TypedSourceBudgetBinding,sameP5TypedSourceBudgetBinding} from "../server/lib/disruption/phase5TypedSourceBudgetBinding_v39.mjs";
import {readP6DayEpochRestrictedReaderClock} from "../server/lib/disruption/phase6DayEpochSignedIndexOnce_v39.mjs";
import {runP6DurableDailySourcePreparation} from "../server/lib/disruption/phase6DurableDailySourcePreparationRuntime_v39.ts";
import {runP6StoredSourceDayPublication} from "../server/lib/disruption/phase6StoredSourceDayPublicationRuntime_v39.mjs";
const SHA=/^[a-f0-9]{64}$/,CODE=/^[a-f0-9]{40}$/;
const PREPARE_LOGIN="phase5_p30_prepare_login_20261107";
const CONFIRM="ONE_APPROVED_PROSPECTIVE_SOURCE_DAY_NONPAID_PREPARE_PUBLISH";
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
const modeOf=env=>env.GITHUB_EVENT_NAME==="schedule"?"schedule":"manual";
export function admitP6NonpaidSourceDayGithub(env){
 if(!env||env.GITHUB_ACTIONS!=="true"||env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||!["workflow_dispatch","schedule"].includes(env.GITHUB_EVENT_NAME)||
    env.GITHUB_RUN_ATTEMPT!=="1"||!CODE.test(env.GITHUB_SHA??"")||env.GITHUB_SHA!==env.P6_NONPAID_SOURCE_APPROVED_MAIN_SHA||
    env.P6_NONPAID_SOURCE_RUNTIME_APPROVED!=="1"||env.V39_P5_PREPARE_OWNER_APPROVED!=="1"||
    env.V39_PHASE5_FREEZE_SIGNED!=="1"||env.V39_PHASE5_SOURCE_RIGHTS_APPROVED!=="1"||
    env.ADB_AUTO_COLLECT!=="0"||env.V39_PHASE6_PROCESS_ARMED!=="0"||env.V39_PHASE6_OWNER_APPROVED!=="0"||
    [env.AERODATABOX_API_KEY,env.AERODATABOX_WEBHOOK_SECRET,env.RAPIDAPI_KEY,env.DATABASE_URL,
     env.V39_DATABASE_RUNTIME_URL,env.V39_P5_SOURCE_DATABASE_URL,env.P5_V39_PRE_DATABASE_URL,
     env.P5_V39_OTHER_REST_RESERVE_DATABASE_URL,env.P5_V39_OTHER_REST_REVIEW_DATABASE_URL].some(Boolean)||
    env.NODE_TLS_REJECT_UNAUTHORIZED==="0")
  hold("NOT_APPROVED_REAL_MAIN_NONPAID_RUNTIME");
 const mode=modeOf(env);
 if(mode==="schedule"?env.P6_NONPAID_SOURCE_SCHEDULE_ENABLED!=="true"||Boolean(env.P6_NONPAID_SOURCE_REQUESTED_DAY):
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
    p.approvedCodeSha!==env.GITHUB_SHA||q.approvedCodeSha!==env.GITHUB_SHA||
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
    reviewed.reviewedMainSha!==env.GITHUB_SHA||reviewed.dailyPolicySha256!==env.P6_NONPAID_DAILY_POLICY_SHA256||
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
 const dailyKey=privateKey(env.P6_NONPAID_DAILY_REVIEWER_PRIVATE_KEY_BASE64,reviewed.dailyReviewerFingerprintSha256);
 const queryKey=privateKey(env.P6_NONPAID_QUERY_REVIEWER_PRIVATE_KEY_BASE64,trust.queryReviewerFingerprintSha256);
 const registryKey=privateKey(env.P6_NONPAID_REGISTRY_REVIEWER_PRIVATE_KEY_BASE64,trust.dayReviewerFingerprintSha256);
 const prepare=url(env.P5_V39_PREPARE_DATABASE_URL,PREPARE_LOGIN),
  reader=url(env.P6_PRIVATE_READER_DATABASE_URL,trust.expectedReaderSessionLogin),
  publisher=url(env.P6_PRIVATE_PUBLISHER_DATABASE_URL,reviewed.expectedPublisherSessionLogin);
 if(new Set([prepare.endpoint,reader.endpoint,publisher.endpoint]).size!==1)hold("CROSS_DATABASE_ENDPOINT");
 const receipt={mode,mainSha:env.GITHUB_SHA,requestedDay:mode==="manual"?Number(env.P6_NONPAID_SOURCE_REQUESTED_DAY):null,
  providerCalls:0,phase6PaidGo:false};
 Object.defineProperties(receipt,Object.fromEntries(Object.entries({p,q,reviewed,policyBytes,signingPolicyBytes,trust,
  prepareUrl:prepare.raw,readerUrl:reader.raw,publisherUrl:publisher.raw,dailyKey,queryKey,registryKey,
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
  if(lead<minimum){if(lead>=0)tooLate++;continue;}
  if(lead>maximum)continue;
  if(i.claim_n===1&&i.index_n>=1){alreadyIndexed++;continue;}
  if(i.claim_n!==0||i.index_n!==0)hold("INCOMPLETE_FUTURE_INDEX_GENESIS_NO_REPLAY");
  if(c.draw_n!==4){missingDraw++;continue;}
  eligible.push(plan);
 }
 eligible.sort((a,b)=>a.firstRequestUtc.localeCompare(b.firstRequestUtc)||a.runDayIndex-b.runDayIndex);
 return {selected:eligible[0]??null,eligibleDayCount:eligible.length,missingDraw,tooLate,alreadyIndexed};
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
export async function runP6NonpaidSourceDayGithub(env){
 const ctx=admitP6NonpaidSourceDayGithub(env),plans=loadP6ReviewedDayPlans(ctx);
 const raw=new pg.Pool({connectionString:ctx.prepareUrl,max:1,connectionTimeoutMillis:8000,query_timeout:40000});
 const restricted=makeP5Stage28DedicatedRolePool(raw,{group:"prepare",reviewedDedicatedLogin:PREPARE_LOGIN,
  forbiddenApplicationLogin:"phase5_p30_pre_login_20261107"});
 const reader=new pg.Client({connectionString:ctx.readerUrl,connectionTimeoutMillis:8000,query_timeout:40000});
 const publisher=new pg.Client({connectionString:ctx.publisherUrl,connectionTimeoutMillis:8000,query_timeout:40000});
 try{
  await reader.connect();
  await reader.query("SET ROLE phase6_private_frozen_reader_v39");
  const c=await calendarRead(restricted,ctx),i=await indexRead(reader,ctx);
  if(Math.abs(utc(c.clock)-utc(i.now))>120000)hold("CROSS_SNAPSHOT_DB_CLOCK_DRIFT");
  const selection=selectP6NonpaidSourceDay(ctx,plans,c.calendar,i.rows,i.now);
  const base={schema:"v39.phase6.github-nonpaid-source-day-runtime.v1",mainSha:ctx.mainSha,
   eligibleDayCount:selection.eligibleDayCount,missingDrawDayCount:selection.missingDraw,
   tooLateDayCount:selection.tooLate,alreadyIndexedMetadataDayCount:selection.alreadyIndexed,
   providerCalls:0,githubDispatches:0,phase6PaidGo:false};
  if(!selection.selected)return Object.freeze({...base,status:"NO_ELIGIBLE_UNPUBLISHED_FUTURE_DAY_NO_WRITE"});
  const plan=selection.selected,p=ctx.p;
  const dailyTrust={independentDailyReviewerTrustApproved:true,runDayIndex:plan.runDayIndex,
   reviewedCodeSha:ctx.mainSha,manifestSha256:p.manifestSha256,calendarSha256:p.calendarSha256,
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
   policyBytes:ctx.policyBytes,dayPlanBytes:plan.bytes,pins:{independent31DayDelegationPolicyApproved:true,
    expectedPolicySha256:ctx.dailyPolicySha,expectedReviewedMainSha:ctx.mainSha,expectedRunDayIndex:plan.runDayIndex,
    noProviderCredentialsInReviewer:true,existingPaidDispatchApproved:false}},
   preparePool:restricted,readerClient:reader,publisherClient:publisher,dailyReviewerKey:ctx.dailyKey,
   trust:dailyTrust,scope:{...common,independentlyApprovedDurableDailyPrepareRuntime:true}});
  const published=await runP6StoredSourceDayPublication({readerClient:reader,publisherClient:publisher,
   prepareReadPool:restricted,dailyTrust,sourceTrust:{...ctx.trust,
    registryReviewerFingerprintSha256:ctx.trust.dayReviewerFingerprintSha256,
    registryReviewerPublicKeyPem:ctx.trust.dayReviewerPublicKeyPem},
   signingPolicyBytes:ctx.signingPolicyBytes,expectedSigningPolicySha256:ctx.signingPolicySha,
   queryKey:ctx.queryKey,registryKey:ctx.registryKey,scope:{...common,independentlyApprovedSourceDayPublicationRuntime:true,
    independentlyApprovedReadbackRecovery:true}});
  return Object.freeze({...base,status:"ONE_PROSPECTIVE_DAY_PREPARED_AND_PUBLISHED_NO_PAID_GO",runDayIndex:plan.runDayIndex,
   insertedDailyReviewRow:prep.insertedDailyReviewRow,preparedLedgerInserts:prep.preparedLedgerInserts,
   verifiedPreparedQueryCount:prep.verifiedQueryCount,...published});
 }finally{await publisher.end().catch(()=>{});await reader.end().catch(()=>{});await raw.end().catch(()=>{});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 runP6NonpaidSourceDayGithub(process.env).then(r=>console.log(JSON.stringify(r))).catch(e=>{
  const msg=String(e?.message??"");
  console.error(/^(HOLD_P6|REFUSED_P5)_[A-Z0-9_]+$/.test(msg)?msg:"HOLD_P6_NONPAID_SOURCE_DAY_RUNTIME_REDACTED");
  process.exitCode=2;
 });
}
