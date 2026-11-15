/**
 * One prospective nonpaid day. Protected caller supplies independently
 * pinned policy and reviewer authority. Persist review before Stage9.
 * Only authenticated absence permits creation. Never retry unknown COMMIT.
 */
import {createHash,createPublicKey,sign,type KeyObject} from "node:crypto";
import type {Pool} from "pg";
import {produceP6DelegatedDailySourceReview} from "./phase6DelegatedDailySourceReviewProducer_v39";
import {resumeP5ReviewedSourceDayPreparation} from "./phase5ReviewedSourceDayPrepareOrchestrator_v39";
import {readP6DayEpochRestrictedReaderClock} from "./phase6DayEpochSignedIndexOnce_v39.mjs";
import {p6DailyPrepareReviewPreimage,P6_DAILY_PREPARE_REVIEW_SCHEMA,
 publishP6DailyPrepareReviewOnce,readP6DailyPrepareReviewOnce}
 from "./phase6PrivateDailyPrepareReviewTransport_v39.mjs";
const hash=(bytes:Buffer)=>createHash("sha256").update(bytes).digest("hex");
const hold=(s:string):never=>{throw Error("HOLD_P6_DURABLE_PREPARE_RUNTIME_"+s);};
type ProduceArgs=Parameters<typeof produceP6DelegatedDailySourceReview>[0];
type Trust=Parameters<typeof readP6DailyPrepareReviewOnce>[0]["trust"];
type Client={query:(sql:string,values?:any[])=>Promise<any>};
export async function runP6DurableDailySourcePreparation({
 producer,preparePool,readerClient,publisherClient,dailyReviewerKey,trust,scope
}:{
 producer:ProduceArgs;preparePool:Pick<Pool,"connect">;
 readerClient:Client;publisherClient:Client;dailyReviewerKey:KeyObject;
 trust:Trust;
 scope:{independentlyApprovedDurableDailyPrepareRuntime:true;
  existingPaidDispatchApproved:false;adbAutoCollect:"0";phase6ProcessArmed:"0";
  expectedReaderSessionLogin:string;expectedPublisherSessionLogin:string}
}){
 if(scope?.independentlyApprovedDurableDailyPrepareRuntime!==true||
    scope.existingPaidDispatchApproved!==false||scope.adbAutoCollect!=="0"||
    scope.phase6ProcessArmed!=="0"||
    !readerClient||!publisherClient||readerClient===publisherClient||
    !preparePool||!producer?.readPool||
    producer.pins?.independent31DayDelegationPolicyApproved!==true||
    producer.pins?.noProviderCredentialsInReviewer!==true||
    producer.pins?.existingPaidDispatchApproved!==false||
    trust?.independentDailyReviewerTrustApproved!==true||
    producer.pins.expectedPolicySha256!==trust.policySha256||
    hash(producer.policyBytes)!==trust.policySha256||
    hash(producer.dayPlanBytes)!==trust.dayPlanSha256||
    producer.pins.expectedRunDayIndex!==trust.runDayIndex||
    producer.pins.expectedReviewedMainSha!==trust.reviewedCodeSha)
  hold("UNAPPROVED_DURABLE_REVIEW_RUNTIME");
 // A resumed runner still checks the exact approved policy, rather
 // than letting stored bytes or a caller's widened trust extend its scope.
 let policy;
 try{policy=JSON.parse(producer.policyBytes.toString("utf8"));}catch{return hold("INVALID_APPROVED_POLICY");}
 if(policy?.schema!=="v39.phase6.delegated-daily-source-review-policy.v1"||
    policy.delegatedDailyPacketProductionApproved!==true||
    policy.approvedCodeSha!==trust.reviewedCodeSha||
    policy.validFromUtc!==trust.policyValidFromUtc||policy.validUntilUtc!==trust.policyValidUntilUtc||
    !["manifestSha256","calendarSha256","configSha256","frameSha256","releaseSha256","rightsSha256",
      "providerContractSha256","reviewed31DaySourceRequestGridSha256","reviewedCategoryBudgetSha256"]
     .every(k=>policy[k]===trust[k as keyof Trust])||
    !Array.isArray(policy.dayPlanSha256s)||policy.dayPlanSha256s.length!==31||
    policy.dayPlanSha256s[trust.runDayIndex-1]?.runDayIndex!==trust.runDayIndex||
    policy.dayPlanSha256s[trust.runDayIndex-1]?.sha256!==trust.dayPlanSha256)
  hold("APPROVED_POLICY_AND_STORAGE_TRUST_DRIFT");
 const common={privateDailyReviewTransportApproved:true,existingPaidDispatchApproved:false,
  adbAutoCollect:"0",phase6ProcessArmed:"0"};
 const read=()=>readP6DailyPrepareReviewOnce({client:readerClient,trust,
  scope:{...common,expectedSessionLogin:scope.expectedReaderSessionLogin}});
 let durable:Awaited<ReturnType<typeof read>>,created=false;
 try{durable=await read();}
 catch(e){
  if(!(e instanceof Error)||e.message!=="HOLD_P6_DAILY_PREPARE_TRANSPORT_EXACT_DAILY_REVIEW_ABSENT")
   throw e;
  const key=dailyReviewerKey;
  if(key?.type!=="private"||key.asymmetricKeyType!=="ed25519"||
     hash(createPublicKey(key).export({format:"der",type:"spki"}))!==trust.reviewerFingerprintSha256)
   hold("WRONG_DELEGATED_REVIEWER_KEY");
  const generated=await produceP6DelegatedDailySourceReview(producer);
  const bytes=generated.privatePacketBytes;
  let tx=false,observed="";
  try{
   await readerClient.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
   await readerClient.query("SET LOCAL statement_timeout='12000ms'");
   observed=await readP6DayEpochRestrictedReaderClock(readerClient,scope.expectedReaderSessionLogin);
   await readerClient.query("ROLLBACK");tx=false;
  }finally{if(tx)await readerClient.query("ROLLBACK").catch(()=>{});}
  const expiry=new Date(Math.min(Date.parse(trust.policyValidUntilUtc),
   Date.parse(observed)+trust.maximumRetentionHours*3600000)).toISOString();
  const review={schema:P6_DAILY_PREPARE_REVIEW_SCHEMA,
   audience:"HKcode22/ReplitTranvr:PHASE6_DAILY_PREPARE_REVIEW_ONLY",
   logicalPath:"data-collection/phase5/frozen/prepare_d"+trust.runDayIndex+"_"+trust.manifestSha256+".json",
   runDayIndex:trust.runDayIndex,packetSha256:generated.exactDailyPacketSha256,
   reviewedCodeSha:trust.reviewedCodeSha,manifestSha256:trust.manifestSha256,
   policySha256:trust.policySha256,dayPlanSha256:trust.dayPlanSha256,
   reviewedAtUtc:observed,validUntilUtc:expiry,retentionNotAfterUtc:expiry,
   reviewerPublicKeyFingerprintSha256:trust.reviewerFingerprintSha256};
  const wire={review,signatureBase64:sign(null,p6DailyPrepareReviewPreimage(review),key).toString("base64")};
  await publishP6DailyPrepareReviewOnce({client:publisherClient,trust,wire,packetBytes:bytes,
   scope:{...common,expectedSessionLogin:scope.expectedPublisherSessionLogin}});
  durable=await read();created=true;
  if(durable.exactDailyPacketSha256!==generated.exactDailyPacketSha256||
     !durable.privatePacketBytes.equals(bytes))
   hold("NEW_COMMIT_INDEPENDENT_READBACK_DRIFT");
 }
 const prepared=await resumeP5ReviewedSourceDayPreparation(producer.readPool,preparePool,
  durable.privatePacket.reviewedPrepareInput,{
   authenticatedExactDurableReviewReadbackApproved:true,
   existingPaidDispatchApproved:false,separatePreparationScopeApproved:true});
 const summary={schema:"v39.phase6.durable-daily-source-preparation-runtime.v1" as const,
  runDayIndex:trust.runDayIndex,exactDailyPacketSha256:durable.exactDailyPacketSha256,
  insertedDailyReviewRow:created?1:0,verifiedOriginalReviewWire:true as const,
  preparationStatus:prepared.status,verifiedQueryCount:prepared.verifiedQueryCount,
  verifiedPartitionCount:prepared.verifiedPartitionCount,preparedLedgerInserts:prepared.databaseInserts,
  providerCalls:0 as const,githubDispatches:0 as const,phase6PaidGo:false as const};
 return Object.freeze(Object.defineProperties(summary,{
  privateDailyPreparePacketBytes:{value:durable.privatePacketBytes,enumerable:false}
 })) as typeof summary&{readonly privateDailyPreparePacketBytes:Buffer};
}
