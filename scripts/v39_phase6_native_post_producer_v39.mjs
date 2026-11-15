/** STOP-default nonpaid producer. Existing private roles and actual PRE
 * source metadata, existing separate POST/day keys, no provider or GH
 * dispatch credentials. The existing POST parent/child alone dispatch/spend.
 */
import pg from "pg";
import {createHash,createPrivateKey} from "node:crypto";
import {pathToFileURL} from "node:url";
import {readP6StablePostTrust} from "../server/lib/disruption/phase6StoredSourceRuntimeTrust_v39.mjs";
import {readP6T24ProtectedQueueTrust,checkedP6T24TlsUrl,readP6T24RoutingClock} from "./v39_phase6_private_t24_restartable_enrollment_v39.mjs";
import {loadP6PostWindows,selectP6PostDays} from "./v39_phase6_stored_post_child_dispatcher_v39.mjs";
import {verifyP6NativePostDelegation,scanP6CurrentPostWindowHints,runP6NativePostPublication} from "../server/lib/disruption/phase6NativePostSignedPublication_v39.mjs";
import {makeP5Stage28DedicatedRolePool} from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39.ts";
const hold=s=>{throw Error("HOLD_P6_NATIVE_POST_PRODUCER_"+s);};
const H=/^[a-f0-9]{64}$/;
const sha=b=>createHash("sha256").update(b).digest("hex");
function decoded(raw,max){
 if(typeof raw!=="string"||raw.length<100||raw.length>Math.ceil(max*4/3)+4||!/^[A-Za-z0-9+/]+={0,2}$/.test(raw))hold("PROTECTED_BYTES_MISSING");
 const b=Buffer.from(raw,"base64");
 if(b.length>max||b.toString("base64")!==raw)hold("NONCANONICAL_PROTECTED_BYTES");return b;
}
function key(raw){const b=decoded(raw,8192);try{return createPrivateKey(b);}finally{b.fill(0);}}
export function admitP6NativePostProducer(env,read){
 if(env.GITHUB_ACTIONS!=="true"||env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||env.GITHUB_EVENT_NAME!=="schedule"||env.GITHUB_RUN_ATTEMPT!=="1"||
    !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA??"")||env.GITHUB_SHA!==env.V39_P5_POST_APPROVED_CODE_SHA||
    !/^[0-9]{5,25}$/.test(env.GITHUB_RUN_ID??"")||
    env.P6_NATIVE_POST_PRODUCER_ENABLED!=="1"||env.P6_NATIVE_POST_PRODUCER_APPROVED!=="1"||
    env.ADB_AUTO_COLLECT!=="0"||env.V39_PHASE6_PROCESS_ARMED!=="0"||env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
    env.P5_POST_AUTO_DISPATCH_ENABLED==="true"||env.P6_PRIVATE_POST_OUTCOME_TAIL_HOURS!=="48"||
    ["V39_PHASE5_FREEZE_SIGNED","V39_PHASE5_SOURCE_RIGHTS_APPROVED","V39_P5_SEVEN_REST_BUDGET_SIGNED",
     "V39_P5_POST_OWNER_APPROVED","V39_P5_POST_INDEPENDENT_REST_ROLES_APPROVED"].some(k=>env[k]!=="1")||
    ["AERODATABOX_API_KEY","AERODATABOX_WEBHOOK_SECRET","RAPIDAPI_KEY","DATABASE_URL","V39_DATABASE_RUNTIME_URL",
     "P5_V39_PRE_DATABASE_URL","P5_V39_PREPARE_DATABASE_URL","P5_V39_T24_WITNESS_DATABASE_URL",
     "P5_V39_OTHER_REST_REVIEW_DATABASE_URL","P5_V39_OTHER_REST_RESERVE_DATABASE_URL","P6_PRIVATE_LATER_REVIEWER_KEY_BASE64",
     "P6_PRIVATE_T24_CUSTODY_REVIEWER_KEY_BASE64","GITHUB_TOKEN"].some(k=>Boolean(env[k])))
  hold("SEPARATE_NONPAID_PRODUCER_APPROVAL_REQUIRED");
 const trust=readP6StablePostTrust(env),t24Trust=readP6T24ProtectedQueueTrust(env);
 const policyBytes=decoded(env.P6_NATIVE_POST_POLICY_BASE64,35000),expectedPolicySha256=env.P6_NATIVE_POST_POLICY_SHA256;
 if(!H.test(expectedPolicySha256??"")||sha(policyBytes)!==expectedPolicySha256)hold("POST_POLICY_HASH_DRIFT");
 const authority={policyBytes,expectedPolicySha256,postReviewerKey:key(env.P6_PRIVATE_POST_REVIEWER_KEY_BASE64),
  dayReviewerKey:key(env.P6_PRIVATE_DAY_REVIEWER_KEY_BASE64),independentDelegatedPostAndDayAppendApproved:true,noProviderCredentialsInReviewer:true};
 const p=verifyP6NativePostDelegation(trust,authority);
 if(p.reviewedFrameSha256!==env.V39_P5_FRAME_HASH||p.reviewedFrameSha256!==t24Trust.expectedFrameSha256||
    p.reviewedProviderContractSha256!==env.V39_P5_POST_PROVIDER_CONTRACT_SHA256||
    p.reviewedProviderPriceSha256!==env.V39_P5_POST_PRICE_SHA256||p.reviewedCategoryBudgetSha256!==env.V39_P5_POST_CATEGORY_BUDGET_SHA256||
    t24Trust.expectedT24ReviewerFingerprintSha256===trust.postReviewerFingerprintSha256)
  hold("APPROVED_POST_RELEASE_PINS_DRIFT");
 const reader=checkedP6T24TlsUrl(env.P6_PRIVATE_READER_DATABASE_URL,trust.expectedReaderSessionLogin);
 const source=checkedP6T24TlsUrl(env.V39_P5_SOURCE_DATABASE_URL,"phase5_p5_source_login_20261108",reader);
 const publisher=checkedP6T24TlsUrl(env.P6_PRIVATE_PUBLISHER_DATABASE_URL,p.expectedPublisherSessionLogin,reader);
 if(new Set([reader.username,source.username,publisher.username]).size!==3||
    reader.hostname.split(".")[0].endsWith("-pooler")||publisher.hostname.split(".")[0].endsWith("-pooler"))
  hold("DISTINCT_DIRECT_PRIVATE_ROLE_SESSIONS_REQUIRED");
 const calendar=loadP6PostWindows(env,trust,read);
 if(Date.parse(p.validFromUtc)>calendar.days[0].start||Date.parse(p.validUntilUtc)<Math.max(...calendar.days.map(d=>d.end)))
  hold("POST_POLICY_DOES_NOT_COVER_STUDY_OUTCOME_TAIL");
 return {trust,t24Trust,authority,calendar};
}
/** One producer per scheduler tick. Never retry an uncertain writer. A
 * later tick begins with fresh actual readback and can recover an existing
 * signed packet, not reinsert it. Ordinary absent evidence stays local. */
export async function executeP6PostProducerTick(scan,runOne,monotonic=()=>performance.now()){
 if(scan?.status!=="BOUNDED_POST_WINDOW_HINT_SELECTION"||scan.providerCalls!==0||scan.phase6PaidGo!==false||
    Object.getOwnPropertyDescriptor(scan,"privateWindows")?.enumerable!==false||
    !Array.isArray(scan.privateWindows)||scan.privateWindows.length>4||typeof runOne!=="function")
  hold("UNBOUNDED_WINDOW_TICK");
 const started=monotonic();let attemptedWindows=0,attemptedQueries=0,verified=0,recovered=0,already=0,noEligible=0,deferred=0;
 const ordinary=new Set(["NO_ACTUAL_RETAINED_BOUND_PRE_FOR_POST","BOUND_PRE_EXPIRES_BEFORE_POST_DISPATCH_WINDOW",
  "POST_ANCHOR_NO_LONGER_ELIGIBLE","POST_CANDIDATE_PAGE_BOUND_DEFERRED","POST_PROSPECTIVE_WINDOW_TOO_CLOSE",
  "POST_WINDOW_NOT_PROSPECTIVE_NO_BACKFILL","POST_RETENTION_OR_EXISTING_ROUTE_WINDOW_CONFLICT",
  "POST_DAY_INDEX_CAPACITY_DEFERRED","POST_WINDOW_CROSSES_UTC_CHARGE_DAY_REVIEW_REQUIRED"]);
 for(const g of scan.privateWindows){
  if(!Array.isArray(g.hints)||g.hints.length<1||g.hints.length>3)hold("UNBOUNDED_WINDOW_HINTS");
  if(monotonic()-started>=240000){deferred++;continue;}
  attemptedWindows++;let ended=false;
  for(const h of g.hints){
   if(monotonic()-started>=240000){deferred++;ended=true;break;}
   attemptedQueries++;
   const result=await runOne(h);
   if(result?.providerCalls!==0||result.phase6PaidGo!==false)hold("PRODUCER_RETURNED_UNEXPECTED_SCOPE");
   if(result.status==="NATIVE_POST_PACKET_AND_DAY_APPEND_VERIFIED_NO_GO"){
    verified++;if(result.existingPacketRecoveredWithoutReinsert)recovered++;ended=true;break;
   }
   if(["POST_PHYSICAL_REQUEST_ALREADY_INDEXED_NO_REPLAY","POST_PHYSICAL_REQUEST_EXISTS_OTHER_DAY_NO_REPLAY",
       "POST_PHYSICAL_REQUEST_ALREADY_EXPIRED_NO_REPLAY","EXISTING_POST_ANCHOR_NO_LONGER_ELIGIBLE_NO_REPLAY"].includes(result.status)){
    already++;ended=true;break;
   }
   if(!ordinary.has(result.status))hold("UNRECOGNIZED_POST_PRODUCER_RESULT_NO_REPLAY");
  }
  if(!ended)noEligible++;
 }
 return {status:"BOUNDED_NATIVE_POST_PRODUCER_TICK_COMPLETE_NO_GO",attemptedWindows,attemptedQueries,verified,recovered,already,noEligible,
  deferred:deferred+scan.deferredWindowCount,missingDays:scan.missingDays,providerCalls:0,paidReservations:0,phase6PaidGo:false};
}
export async function runP6NativePostProducer(env){
 const c=admitP6NativePostProducer(env),reader=new pg.Client({connectionString:env.P6_PRIVATE_READER_DATABASE_URL,connectionTimeoutMillis:8000,query_timeout:25000}),
  publisher=new pg.Client({connectionString:env.P6_PRIVATE_PUBLISHER_DATABASE_URL,connectionTimeoutMillis:8000,query_timeout:35000}),
  raw=new pg.Pool({connectionString:env.V39_P5_SOURCE_DATABASE_URL,max:1,connectionTimeoutMillis:8000,query_timeout:20000});
 try{
  await reader.connect();await reader.query("SET ROLE phase6_private_frozen_reader_v39");
  const clock=await readP6T24RoutingClock(reader,c.trust),days=selectP6PostDays(c.calendar,clock).map(d=>d.day);
  if(!days.length)return {status:"NO_CURRENT_POST_OUTCOME_DAYS",providerCalls:0,phase6PaidGo:false};
  const sourcePool=makeP5Stage28DedicatedRolePool(raw,{group:"source",reviewedDedicatedLogin:"phase5_p5_source_login_20261108",
   forbiddenApplicationLogin:"phase5_runtime_application_login"});
  const scan=await scanP6CurrentPostWindowHints({readerClient:reader,sourcePool,trust:c.trust,authority:c.authority,runDayIndices:days,clock});
  if(!scan.privateWindows.length)return {status:"NO_PROSPECTIVE_NATIVE_POST_WINDOW",missingDays:scan.missingDays,
   late:scan.late,notYet:scan.notYet,alreadyIndexedHints:scan.already,crossUtc:scan.crossUtc,providerCalls:0,phase6PaidGo:false};
  await publisher.connect();await publisher.query("SET ROLE phase6_private_frozen_publisher_v39");
  return await executeP6PostProducerTick(scan,h=>runP6NativePostPublication({readerClient:reader,publisherClient:publisher,sourcePool,
   trust:c.trust,authority:c.authority,t24Trust:c.t24Trust,selector:h,githubRunId:env.GITHUB_RUN_ID}));
 }finally{await Promise.allSettled([raw.end(),reader.end(),publisher.end()]);}
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 try{console.log(JSON.stringify(await runP6NativePostProducer(process.env)));}
 catch(e){const m=String(e?.message??"");console.error(/^HOLD_P6_NATIVE_POST_[A-Z0-9_]+$/.test(m)?m:"HOLD_P6_NATIVE_POST_PRODUCER_REDACTED_NO_BLIND_REPLAY");process.exitCode=2;}
}
