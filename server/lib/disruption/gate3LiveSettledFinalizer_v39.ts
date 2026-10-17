/**
 * GATE3: LIVE owner post-exposure verification (NEVER a subscription creator).
 *
 * Call only after a SINGLE bounded `runPrepaidLiveWindowV39` returns
 * status=settling with provider DELETE verified and >=3 settled account reads.
 *
 * This bridges authoritative in-memory provider evidence, independently
 * downloaded real-original bytes, real hosted build identity and durable
 * SETTLED candidate SQL. It cannot mint an operator AUTH, create/delete a
 * subscription, clear a past incident, erase historical originals or release
 * the separate paid-provider source seal.
 *
 * The current callback uses a secret URL, not an AeroDataBox HMAC signature.
 * Therefore even a verified and immutable SQL candidate is NOT an
 * independently cryptographic provider-origin certificate.
 */
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {execFileSync} from "node:child_process";
import type {Pool} from "pg";
import {approvedArtifactHashesFromLedger,sha256HexString,verifyAuthRecord,
  type AuthRecord} from "./authRecord_v39";
import {getBalanceEvidenceStrict,listSubscriptionsStrictWithRetry}
  from "./aerodataboxLimiter_v3";
import {verifyGate3PublishedPrepaidHostV39}
  from "./gate3OwnedPreExposure_v39";
import {createRequiredProviderBlobStoreV39}
  from "./replitProviderBlobStore_v39";
import {verifyGate3OriginalCustodyV39}
  from "./gate3LiveOriginalCustody_v39";
import {commitGate3TerminalDispositionV39}
  from "./gate3CanaryTerminalOwner_v39";
import type {PrepaidLiveWindowInputV39,PrepaidLiveWindowResultV39}
  from "./prepaidProbeWindow_v39";

const SHA=/^[a-f0-9]{40}$/;
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
function refuse(why:string):never{throw Error(why)}
function ledgerIds(raw:string):string[]{
  return Array.from(new Set(Array.from(raw.matchAll(
    /\b((?:RUN|GATE|AUTH|ISS|DEC)-\d{8}-[0-9A-Z]+)\b/g
  )).map(m=>m[1])));
}

/** Narrow paid owner finalizer; no boolean authenticity proof is accepted. */
export async function finalizeGate3LiveSettledCandidateV39(
  pool:Pick<Pool,"connect">,
  input:Readonly<{
    plan:PrepaidLiveWindowInputV39;
    result:PrepaidLiveWindowResultV39;
    expectedPublishedGitHead:string;
  }>,
):Promise<Readonly<{
  schema:"v39.phase3.gate3.finalized-real-source-candidate.v1";
  status:"SETTLED_CANDIDATE_RECORDED_NOT_CRYPTOGRAPHIC_ORIGIN_PASS";
  sessionId:string;
  verifiedDeliveryCount:number;
  verifiedReceivedCredits:number;
  originalEvidenceSha256:string;
  loggedTerminalReceiptCommitted:true;
  ownerSubscriptionDeleted:true;
  authorizesAnotherPaidRun:false;
  liveGate3Certified:false;
}>>{
  const p=input?.plan?.prearmedGate3,plan=input?.plan,result=input?.result;
  if(!pool||typeof pool.connect!=="function"||
     plan?.ownerKind!=="phase3_credit_canary"||
     plan.deferCleanup!==true||!p||!uuid.test(p.sessionId)||
     result?.runtimeSessionId!==p.sessionId||
     result.status!=="settling"||
     result.subscriptionDeleted!==true||
     result.reconciliationStatus!=="MATCH"||
     result.durationCensored!==false||result.stopReason!==null||
     !Number.isSafeInteger(result.settlementReads)||result.settlementReads<3||
     !result.metrics||
     typeof result.externalCredits!=="number"||
     !Number.isSafeInteger(result.externalCredits)||
     result.externalCredits<1||
     result.externalCredits!==result.internalSendCredits||
     result.internalSendCredits!==result.metrics.internalSendCredits||
     !Number.isSafeInteger(p.canaryCreditCeiling)||
     p.canaryCreditCeiling<1||p.canaryCreditCeiling>100||
     result.internalSendCredits>p.canaryCreditCeiling||
     plan.hardCapCredits!==p.canaryCreditCeiling||
     plan.icao!==p.icao||
     !Number.isSafeInteger(plan.balanceBefore)||plan.balanceBefore<1500||
     plan.balanceBefore-p.canaryCreditCeiling<1000||
     !SHA.test(input.expectedPublishedGitHead))
    refuse("GATE3_FINALIZER_UNSETTLED_OR_SCOPE_INVALID");

  // An AUTH record must be pinned by the existing independently checked-in
  // ledger. Neither an operator flag nor a locally crafted AUTH can approve.
  const ledger=readFileSync(join(process.cwd(),
    "data-collection","evidence","ledgers","V3.9_RUN_REPORTS_AND_EVIDENCE.md"),"utf8") + "\n" +
    readFileSync(join(process.cwd(),"data-collection","phase3",
      "2026-10-16_GATE3_WSSS_AUTH_SHA_APPROVAL_ADDENDUM.md"),"utf8");
  const raw=p.authArtifactRaw;
  if(typeof raw!=="string"||sha256HexString(raw)!==p.authorizationEvidenceSha256)
    refuse("GATE3_FINALIZER_AUTH_BYTES_INVALID");
  let auth:AuthRecord;
  try{auth=JSON.parse(raw) as AuthRecord}
  catch{refuse("GATE3_FINALIZER_AUTH_JSON_INVALID")}
  if(!auth||!Array.isArray(auth.predecessorEvidenceIds))
    refuse("GATE3_FINALIZER_AUTH_SHAPE_INVALID");
  const verdict=verifyAuthRecord(auth,{
    nowUtc:new Date(),expectedPhaseGate:"Phase 3 / Gate 3",
    existingEvidenceIds:ledgerIds(ledger),
    artifactHash:p.authorizationEvidenceSha256,
    approvedArtifactHashes:approvedArtifactHashesFromLedger(ledger),
  });
  if(!verdict.verified||
     auth.authorizationId!==p.expectedAuthId||
     auth.airportFilterWindow!==p.expectedAirportFilterWindow||
     auth.maxAlertCredits!==p.canaryCreditCeiling||
     !auth.cleanupOwner?.trim()||
     plan.targetHours!==p.fixedExposureSeconds/3600)
    refuse("GATE3_FINALIZER_AUTH_OR_WINDOW_MISMATCH");

  // Exact reviewed source tree; harmless Replit 'Published your App' metadata
  // descendants are allowed only when their tracked tree is IDENTICAL.
  let tree:string,pinnedTree:string;
  try{
    tree=execFileSync("git",["rev-parse","HEAD^{tree}"],{encoding:"utf8"}).trim();
    pinnedTree=execFileSync("git",["rev-parse",
      `${input.expectedPublishedGitHead}^{tree}`],{encoding:"utf8"}).trim();
  }catch{refuse("GATE3_FINALIZER_REVIEWED_SOURCE_UNAVAILABLE")}
  if(tree!==pinnedTree)
    refuse("GATE3_FINALIZER_REVIEWED_SOURCE_TREE_MISMATCH");

  await verifyGate3PublishedPrepaidHostV39(input.expectedPublishedGitHead);

  // Fail closed if the exact owned subscription id was lost by UNLOGGED DB
  // restart. No ambiguous account state or another run may be inferred.
  const client=await pool.connect();
  let begun=false,discard=false,subscriptionId:string|null=null;
  try{
    await client.query("BEGIN TRANSACTION READ ONLY");
    begun=true;
    const r=await client.query(`
      SELECT provider_subscription_id,owner_kind,state,icao
        FROM clean.prepaid_probe_session_runtime
       WHERE session_id=$1::uuid
    `,[p.sessionId]);
    if(r.rows.length!==1||
       r.rows[0].owner_kind!=="phase3_credit_canary"||
       r.rows[0].state!=="settling"||
       r.rows[0].icao!==p.icao||
       typeof r.rows[0].provider_subscription_id!=="string"||
       r.rows[0].provider_subscription_id.length===0)
      refuse("GATE3_FINALIZER_BOUND_PROVIDER_ID_LOST");
    subscriptionId=r.rows[0].provider_subscription_id;
    await client.query("ROLLBACK");
    begun=false;
  }catch(e){
    if(begun)try{await client.query("ROLLBACK")}catch{discard=true}
    throw e;
  }finally{client.release(discard)}
  if(!subscriptionId)refuse("GATE3_FINALIZER_PROVIDER_ID_UNVERIFIED");

  const original=await verifyGate3OriginalCustodyV39(
    pool,createRequiredProviderBlobStoreV39(),{
      sessionId:p.sessionId,icao:p.icao,
      authorizationEvidenceSha256:p.authorizationEvidenceSha256,
      providerSubscriptionId:subscriptionId,
      creditCeiling:p.canaryCreditCeiling,
    });
  if(original.internalCredits!==result.internalSendCredits||
     original.notificationItems!==result.metrics.notificationItemsReceived||
     original.deliveries!==result.metrics.deliveryCount)
    refuse("GATE3_FINALIZER_ORIGINAL_METRICS_MISMATCH");

  // Independently obtain live account facts, NOT caller-supplied success bools.
  const subscriptions=await listSubscriptionsStrictWithRetry();
  if(subscriptions.some(s=>s.isActive&&s.billingType==="CreditBased"))
    refuse("GATE3_FINALIZER_ACTIVE_BILLABLE_SUBSCRIPTION_HOLD");
  const ending=await getBalanceEvidenceStrict();
  const remaining=ending.balance.creditsRemaining;
  if(!Number.isSafeInteger(remaining)||
     remaining<1000||
     plan.balanceBefore-remaining!==result.externalCredits)
    refuse("GATE3_FINALIZER_AUTHORITATIVE_SPEND_NOT_MATCHED");

  // SQL terminal writes ONE immutable metadata-only receipt. This reports
  // durable candidate only: current callback has NO provider HMAC signature.
  const terminal=await commitGate3TerminalDispositionV39(pool,{
    sessionId:p.sessionId,icao:p.icao,
    authorizationEvidenceSha256:p.authorizationEvidenceSha256,
    canaryCreditCeiling:p.canaryCreditCeiling,
    fixedExposureSeconds:p.fixedExposureSeconds,
    sourceReadbackVerified:true,
    publishedReceiverParityVerified:true,
    foreignActiveBillableCount:0,result,
  });
  if(terminal.disposition!=="SETTLED_CANDIDATE_DURABLY_RECORDED")
    refuse("GATE3_FINALIZER_TERMINAL_RECEIPT_INVALID");

  return {
    schema:"v39.phase3.gate3.finalized-real-source-candidate.v1",
    status:"SETTLED_CANDIDATE_RECORDED_NOT_CRYPTOGRAPHIC_ORIGIN_PASS",
    sessionId:p.sessionId,
    verifiedDeliveryCount:original.deliveries,
    verifiedReceivedCredits:original.internalCredits,
    originalEvidenceSha256:original.evidenceSha256,
    loggedTerminalReceiptCommitted:true,
    ownerSubscriptionDeleted:true,
    authorizesAnotherPaidRun:false,
    liveGate3Certified:false,
  };
}
