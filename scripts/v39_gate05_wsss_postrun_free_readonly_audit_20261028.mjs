/** Gate05 Oct28 LIVE FREE postrun evidence: NO provider paid operation or DB write. */
import pg from "pg";
import {execFileSync} from "node:child_process";
const SCOPE="618582a3-ea3f-4a10-a756-c974c472af3c";
const SOURCE="84b7f1565d0402facc8c3b9aacedc599eb6e2af1";
const AUTH="1fcded99e76cc974dc518495bd127000a3a7a9cb4344e41b6b89cb9e01b98b23";
const TICKET="cd93866bc18a2d1368981837d4af8c036094e421c7d30dd03570e0b611f43746";
const START="2026-10-29T03:45:00.000Z",END="2026-10-29T04:45:00.000Z";
const BASELINE=1981,P="https://aerodatabox.p.rapidapi.com";
const API=String(process.env.AERODATABOX_API_KEY??"");
const URL=String(process.env.DATABASE_URL??"");
const guard=(v,msg)=>{if(!v)throw Error(msg);};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const report={
 schema:"v39.gate05.wsss-paid-postrun-readonly.v1",scope:SCOPE,
 status:"READONLY_AUDIT_NOT_STARTED",stage:"ENV",
 plannedStartUtc:START,plannedStopUtc:END,
 ownerState:null,dbFinalizationProven:false,exactProviderIdBound:false,
 loggedDeliveryCount:null,loggedItemCountAll:null,
 loggedInWindowDeliveryCount:null,loggedInWindowItemCount:null,
 loggedPostStopItemCount:null,loggedRawRefMismatchCount:null,
 loggedHttpAckVerified:false,originalBlobBytesReadback:false,
 unloggedDeliveryCount:null,unloggedItemCount:null,
 unloggedDistinctFlightKeysNotSourceCertified:null,
 inWindowNotificationThreshold100Met:null,
 physicalOperatingFlightsIndependentlyVerified:false,
 completedOperatingFlightsIndependentlyVerified:false,
 airborneFlightsIndependentlyVerified:false,
 airbornePointsIndependentlyVerified:false,
 sameCohortProspectiveT24T6T90Captured:false,
 actualVsEstimatedRunwaySourceCertified:false,
 originalStrictSciencePassed:false,
 initialCredits:BASELINE,firstCurrentCredits:null,secondCurrentCredits:null,
 accountCreditCounterStable:null,netAccountDebitProvisional:null,
 restApiUnitsRemaining:null,providerExactStillActive:null,
 providerOtherActiveCount:null,
 providerFreeGetCount:0,paidFidsGets:0,
 providerCreateDeleteRefillCalls:0,databaseWrites:0
};
let db=null,tx=false,lastGet=0;
async function getFree(path){
 guard(["/subscriptions/balance","/subscriptions/webhook"].includes(path),
  "UNAPPROVED_PROVIDER_ROUTE");
 const wait=lastGet+2700-Date.now();
 if(lastGet&&wait>0)await sleep(wait);
 lastGet=Date.now();report.providerFreeGetCount++;
 const response=await fetch(P+path,{
  method:"GET",redirect:"error",
  headers:{"x-rapidapi-key":API,
   "x-rapidapi-host":"aerodatabox.p.rapidapi.com",accept:"application/json"},
  signal:AbortSignal.timeout(12000)
 });
 guard(response.status===200||(response.status===204&&path.endsWith("webhook")),
   "FREE_PROVIDER_HTTP");
 return {body:response.status===204?[]:await response.json(),headers:response.headers};
}
function balance(x){
 const credits=(x.body?.balance??x.body)?.creditsRemaining;
 const v=x.headers.get("x-ratelimit-api-units-remaining");
 guard(Number.isSafeInteger(credits)&&credits>=0&&/^[0-9]+$/.test(v??""),
   "CREDIT_OR_REST_COUNTER_UNRELIABLE");
 return {credits,units:Number(v)};
}
function subscriptions(x){
 const rows=Array.isArray(x.body)?x.body:
   x.body?.subscriptions??x.body?.items;
 guard(Array.isArray(rows)&&rows.length<=500&&rows.every(y=>
   y&&typeof y.id==="string"&&typeof y.isActive==="boolean"&&
   ["CreditBased","LifetimeBased"].includes(y.billingType)),
   "PROVIDER_SUBSCRIPTION_SHAPE");
 return rows;
}
try{
 guard(process.env.GITHUB_ACTIONS==="true"&&
   process.env.GITHUB_REF==="refs/heads/main"&&
   process.env.GITHUB_RUN_ATTEMPT==="1"&&
   execFileSync("git",["rev-parse","HEAD"],{
     encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim()===
     process.env.GITHUB_SHA,"REVIEWED_MAIN_RUN_ONLY");
 guard(URL.startsWith("postgres")&&API.length>=10,"PROTECTED_READ_CREDENTIALS_MISSING");
 report.stage="POSTGRESQL_REPEATABLE_READ_ONLY";
 db=new pg.Client({connectionString:URL,connectionTimeoutMillis:8000,
  query_timeout:12000,statement_timeout:12000,lock_timeout:3000,
  options:"-c default_transaction_read_only=on",
  application_name:"gate05_postrun_census_readonly"});
 db.on("error",()=>console.warn("GATE05_AUDIT_DB_READ_DISCONNECTED"));
 await db.connect();
 await db.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
 const identity=(await db.query(
  "SELECT current_database() AS db,current_user AS actor,"+
  "current_setting('transaction_read_only') AS readonly")).rows[0];
 guard(identity.db==="neondb"&&identity.actor==="neondb_owner"&&
  identity.readonly==="on","DATABASE_READONLY_IDENTITY_HOLD");
 const owner=(await db.query(
  "SELECT state,source_commit,authorization_sha256,reviewed_stop_ticket_sha256,"+
  "airport_icao,start_at_utc,stop_at_utc,provider_subscription_id,"+
  "exact_owned_delete_verified,terminal_evidence_sha256,terminal_at_utc "+
  "FROM clean.phase3_gate05_science_owner_v39 WHERE session_id=$1::uuid",
  [SCOPE])).rows;
 guard(owner.length===1,"EXACT_OWNER_NOT_FOUND");
 const o=owner[0];
 guard(o.source_commit===SOURCE&&o.authorization_sha256===AUTH&&
   o.reviewed_stop_ticket_sha256===TICKET&&o.airport_icao==="WSSS"&&
   new Date(o.start_at_utc).toISOString()===START&&
   new Date(o.stop_at_utc).toISOString()===END&&
   ["ACTIVE","STOPPED","FAILED"].includes(o.state),
   "EXACT_OWNER_SCOPE_MISMATCH");
 guard(typeof o.provider_subscription_id==="string"&&
   o.provider_subscription_id.length>=6,"OWNER_PROVIDER_ID_NOT_BOUND");
 report.exactProviderIdBound=true;
 report.ownerState=o.state;
 report.dbFinalizationProven=o.state==="STOPPED"&&
  o.exact_owned_delete_verified===true&&
  typeof o.terminal_evidence_sha256==="string"&&
  o.terminal_evidence_sha256.length===64&&
  o.terminal_at_utc!==null;
 report.stage="LOGGED_CUSTODY_CENSUS";
 const sql=[
  "SELECT count(*)::int AS deliveries,",
  "coalesce(sum(d.item_count),0)::int AS items,",
  "count(*) FILTER(WHERE d.receiver_attempt_at_utc >= $2::timestamptz",
  "AND d.receiver_attempt_at_utc < $3::timestamptz)::int AS in_deliveries,",
  "coalesce(sum(d.item_count) FILTER(WHERE d.receiver_attempt_at_utc >= $2::timestamptz",
  "AND d.receiver_attempt_at_utc < $3::timestamptz),0)::int AS in_items,",
  "coalesce(sum(d.item_count) FILTER(WHERE d.receiver_attempt_at_utc >= $3::timestamptz),0)::int AS post_items,",
  "count(*) FILTER(WHERE r.blob_ref_id IS NULL OR",
  "r.content_sha256 IS DISTINCT FROM d.body_sha256 OR",
  "r.source_kind IS DISTINCT FROM 'webhook' OR",
  "r.content_class IS DISTINCT FROM 'raw_provider_content' OR",
  "r.source_record_id IS DISTINCT FROM 'prepaid:'||d.session_id::text||':'||d.delivery_id)::int AS ref_mismatch",
  "FROM clean.gate05_science_delivery_custody_v39 d",
  "LEFT JOIN clean.provider_content_blob_ref r ON r.blob_ref_id=d.blob_ref_id",
  "WHERE d.session_id=$1::uuid"
 ].join(" ");
 const ledger=(await db.query(sql,[SCOPE,START,END])).rows[0];
 report.loggedDeliveryCount=ledger.deliveries;
 report.loggedItemCountAll=ledger.items;
 report.loggedInWindowDeliveryCount=ledger.in_deliveries;
 report.loggedInWindowItemCount=ledger.in_items;
 report.loggedPostStopItemCount=ledger.post_items;
 report.loggedRawRefMismatchCount=ledger.ref_mismatch;
 report.inWindowNotificationThreshold100Met=ledger.in_items>=100;
 report.stage="UNLOGGED_RUNTIME_CENSUS";
 const q=[
  "SELECT (SELECT count(*)::int FROM clean.prepaid_probe_delivery_runtime",
  "WHERE session_id=$1::uuid) AS deliveries,",
  "(SELECT count(*)::int FROM clean.prepaid_probe_item_runtime",
  "WHERE session_id=$1::uuid) AS items,",
  "(SELECT count(DISTINCT flight_instance_id)::int",
  "FROM clean.prepaid_probe_item_runtime WHERE session_id=$1::uuid",
  "AND flight_instance_id IS NOT NULL) AS flight_keys"
 ].join(" ");
 const runtime=(await db.query(q,[SCOPE])).rows[0];
 report.unloggedDeliveryCount=runtime.deliveries;
 report.unloggedItemCount=runtime.items;
 report.unloggedDistinctFlightKeysNotSourceCertified=runtime.flight_keys;
 await db.query("ROLLBACK");tx=false;
 await db.end();db=null;
 report.stage="FREE_PROVIDER_SETTLEMENT";
 const b1=balance(await getFree("/subscriptions/balance"));
 const ls=subscriptions(await getFree("/subscriptions/webhook"));
 const b2=balance(await getFree("/subscriptions/balance"));
 report.firstCurrentCredits=b1.credits;
 report.secondCurrentCredits=b2.credits;
 report.accountCreditCounterStable=b1.credits===b2.credits;
 report.restApiUnitsRemaining=b2.units;
 report.netAccountDebitProvisional=BASELINE-b2.credits;
 report.providerExactStillActive=ls.some(x=>x.id===o.provider_subscription_id&&x.isActive);
 report.providerOtherActiveCount=ls.filter(x=>x.id!==o.provider_subscription_id&&x.isActive).length;
 const anomalies=[];
 if(report.providerExactStillActive)anomalies.push("EXACT_SUBSCRIPTION_STILL_ACTIVE");
 if(report.providerOtherActiveCount)anomalies.push("FOREIGN_ACTIVE_SUBSCRIPTIONS");
 if(!report.accountCreditCounterStable)anomalies.push("POSTED_CREDITS_MOVING");
 if(report.netAccountDebitProvisional<0)anomalies.push("NEGATIVE_NET_DEBIT_OR_REFILL");
 if(report.netAccountDebitProvisional>500)anomalies.push("EXPOSURE_OVER_500_REVIEW");
 if(ledger.ref_mismatch)anomalies.push("LOGGED_SOURCE_REF_MISMATCH");
 if(runtime.deliveries>ledger.deliveries)anomalies.push("UNLOGGED_DELIVERIES_EXCEED_LOGGED");
 if(runtime.items>ledger.items)anomalies.push("UNLOGGED_ITEMS_EXCEED_LOGGED");
 report.anomalies=anomalies;
 report.status=anomalies.length?
  "POSTRUN_CUSTODY_OR_ACCOUNT_ANOMALY_HOLD":
  "EXACT_PROVIDER_INACTIVE_PROVISIONAL_SETTLEMENT_SCIENCE_NOT_YET_CERTIFIED";
 console.log(JSON.stringify(report));
 if(anomalies.length)process.exitCode=2;
}catch{
 console.log(JSON.stringify({...report,status:"POSTRUN_READONLY_AUDIT_HOLD",
  stage,liveFindingsUnknown:true,strictSciencePassed:false,
  providerCreateDeleteRefillCalls:0,databaseWrites:0}));
 process.exitCode=2;
}finally{
 if(tx&&db)await db.query("ROLLBACK").catch(()=>{});
 if(db)await db.end().catch(()=>{});
}
