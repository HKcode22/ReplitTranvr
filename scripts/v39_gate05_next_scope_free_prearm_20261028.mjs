/**
 * WSSS Gate05 next-scope planning preflight. LIVE FREE READS ONLY.
 * Independent of the retired retry5 controller and its one-use intent.
 * No provider CREATE/DELETE/FIDS/refill. No database writes or secret output.
 * A PASS is an account/receiver readiness FACT, never authorization to spend.
 */
import pg from "pg";

const PUB="https://replit-tranvr--hk84164.replit.app";
const PROVIDER="https://aerodatabox.p.rapidapi.com";
const RECEIVER="84b7f1565d0402facc8c3b9aacedc599eb6e2af1";
const OLD_OWNER="e69ffa34-d8a6-456f-a49c-9dd459e6d294";
const REST_BUDGET=12,ALERT_BUDGET=500,SOFT_STOP=350;
const HISTORICAL_FLOOR=1900,MIN_GET_SPACING_MS=2600;
const key=String(process.env.AERODATABOX_API_KEY??"");
const dbUrl=String(process.env.DATABASE_URL??"");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const report={
  schema:"v39.gate05.next-scope-free-prearm.v1",
  status:"HOLD",stage:"ENV",
  observedAtUtc:new Date().toISOString(),
  airport:"WSSS",
  sourceReceiverExpected:RECEIVER,
  publishedSourceMatches:false,prepaidRouteRegistered:false,
  durableCustodyReady:false,activeSubscriptions:null,
  oldHistoricalOwnerStopped:false,nonterminalScienceOwners:null,
  v0075LoggedJournalPresent:false,
  initialAlertCredits:null,finalAlertCredits:null,
  initialRestApiUnits:null,finalRestApiUnits:null,
  accountBalancesStable:false,
  proposedAlertBudget:ALERT_BUDGET,proposedSoftStop:SOFT_STOP,
  proposedRestApiUnitBudget:REST_BUDGET,
  historicalNext4CreditFloor:HISTORICAL_FLOOR,
  observedHeadroomAboveOldFloor:null,
  proposedNewFloorAfterFull500:null,
  old1900FloorCompatibleWith500:null,
  providerFreeGets:0,providerPaidGets:0,providerMutations:0,
  databaseReadsOnly:true,databaseWrites:0,
  paidScopeCommissioned:false,stopArmed:false,
  paidCreateAuthorizedByThisCheck:false,
  providerHard500CapExists:false,fullSciencePassed:false
};
let client;
let lastProviderGet=0;
const guard=(condition,code)=>{if(!condition)throw Error(code);};
const headerInt=(headers,name)=>{
  const value=headers.get(name);
  return value!==null&&/^[0-9]{1,12}$/.test(value)?Number(value):null;
};
async function getFree(path){
  guard(["/subscriptions/balance","/subscriptions/webhook"].includes(path),
    "UNAPPROVED_PROVIDER_ROUTE");
  const wait=Math.max(0,lastProviderGet+MIN_GET_SPACING_MS-Date.now());
  if(lastProviderGet&&wait)await sleep(wait);
  lastProviderGet=Date.now();
  report.providerFreeGets++;
  const res=await fetch(PROVIDER+path,{
    method:"GET",redirect:"error",
    headers:{
      "x-rapidapi-key":key,
      "x-rapidapi-host":"aerodatabox.p.rapidapi.com",
      accept:"application/json"
    },
    signal:AbortSignal.timeout(12000)
  });
  const body=path==="/subscriptions/webhook"&&res.status===204?
    []:await res.json().catch(()=>null);
  guard(res.status===200||(path==="/subscriptions/webhook"&&res.status===204),
    "FREE_PROVIDER_RESPONSE_NOT_OK");
  return {body,headers:res.headers};
}
function parseBalance(p){
  const x=p.body?.balance??p.body;
  const credits=x?.creditsRemaining;
  const units=headerInt(p.headers,"x-ratelimit-api-units-remaining");
  guard(Number.isSafeInteger(credits)&&credits>=0&&
    Number.isSafeInteger(units)&&units>=0,"FREE_BALANCE_SHAPE");
  return {credits,units};
}
try{
  guard(process.env.GITHUB_ACTIONS==="true"&&
    process.env.GITHUB_REF==="refs/heads/main"&&
    process.env.GITHUB_RUN_ATTEMPT==="1","NOT_FIRST_ATTEMPT_MAIN_ACTION");
  guard(key.length>=10&&dbUrl.startsWith("postgres"),"MISSING_CREDENTIALS");
  report.stage="PUBLIC_SOURCE";
  const health=await fetch(PUB+"/__v39/workspace-runtime",{
    method:"GET",redirect:"error",cache:"no-store",
    signal:AbortSignal.timeout(12000)
  });
  const h=await health.json().catch(()=>null);
  report.publishedSourceMatches=health.status===200&&h?.status==="PASS"&&
    h?.git_head===RECEIVER&&h?.published_deployment===true;
  report.prepaidRouteRegistered=h?.prepaid_route_registered===true;
  report.durableCustodyReady=h?.gate05_durable_custody_ready===true;
  guard(report.publishedSourceMatches&&report.prepaidRouteRegistered&&
    report.durableCustodyReady&&h?.provider_mutation===false,
    "PUBLIC_SOURCE_OR_CUSTODY");
  report.stage="DATABASE_OWNER_STATE";
  client=new pg.Client({
    connectionString:dbUrl,
    options:"-c default_transaction_read_only=on",
    connectionTimeoutMillis:8000,query_timeout:9000,
    statement_timeout:9000,
    application_name:"gate05_next_scope_free_prearm"
  });
  await client.connect();
  await client.query("BEGIN TRANSACTION READ ONLY");
  const id=(await client.query(
    "SELECT current_database() AS db,current_user AS actor"
  )).rows[0];
  guard(id?.db==="neondb"&&id?.actor==="neondb_owner",
    "OWNER_DATABASE_IDENTITY_HOLD");
  const facts=(await client.query(
    "SELECT count(*) FILTER(WHERE state IN ('PREPARED','ACTIVE'))::int AS open,"+
    "count(*) FILTER(WHERE session_id=$1::uuid AND state='STOPPED')::int AS previous "+
    "FROM clean.phase3_gate05_science_owner_v39",
    [OLD_OWNER]
  )).rows[0];
  report.nonterminalScienceOwners=facts?.open??null;
  report.oldHistoricalOwnerStopped=facts?.previous===1;
  const journal=(await client.query(
    "SELECT c.relpersistence='p' AND c.relkind='r' AS logged "+
    "FROM pg_class c WHERE c.oid="+
    "to_regclass('clean.gate05_science_delivery_custody_v39')"
  )).rows[0];
  report.v0075LoggedJournalPresent=journal?.logged===true;
  await client.query("ROLLBACK");
  guard(report.nonterminalScienceOwners===0&&
    report.oldHistoricalOwnerStopped&&report.v0075LoggedJournalPresent,
    "OLD_OWNER_OR_CUSTODY_NOT_SETTLED");
  report.stage="FREE_PROVIDER_BALANCE_BEFORE";
  const before=parseBalance(await getFree("/subscriptions/balance"));
  report.initialAlertCredits=before.credits;
  report.initialRestApiUnits=before.units;
  report.stage="FREE_PROVIDER_INVENTORY";
  const inv=await getFree("/subscriptions/webhook");
  const data=Array.isArray(inv.body)?inv.body:
    inv.body?.subscriptions??inv.body?.items;
  guard(Array.isArray(data)&&data.length<=500,"PROVIDER_INVENTORY_SHAPE");
  guard(data.every(x=>x&&typeof x.id==="string"&&
    typeof x.isActive==="boolean"&&
    ["CreditBased","LifetimeBased"].includes(x.billingType)),
    "PROVIDER_INVENTORY_ITEM_SHAPE");
  report.activeSubscriptions=data.filter(x=>x.isActive).length;
  report.stage="FREE_PROVIDER_BALANCE_AFTER";
  const after=parseBalance(await getFree("/subscriptions/balance"));
  report.finalAlertCredits=after.credits;
  report.finalRestApiUnits=after.units;
  report.accountBalancesStable=
    before.credits===after.credits&&before.units===after.units;
  report.observedHeadroomAboveOldFloor=Math.max(0,after.credits-HISTORICAL_FLOOR);
  report.proposedNewFloorAfterFull500=after.credits-ALERT_BUDGET;
  report.old1900FloorCompatibleWith500=
    after.credits-ALERT_BUDGET>=HISTORICAL_FLOOR;
  guard(report.activeSubscriptions===0&&report.accountBalancesStable&&
    after.credits>=ALERT_BUDGET&&after.units>=REST_BUDGET,
    "PAID_SCOPE_PREARM_ACCOUNT_NOT_STABLE");
  report.stage="COMPLETE";
  // Approval of a new paid scope, explicit budget floor policy, user-owned
  // independent STOP, scientific cohort and final provider CREATE are
  // SEPARATE protected steps. Never infer a hard 500 provider-side cap.
  report.status="FREE_ACCOUNT_AND_CUSTODY_FACTS_OBSERVED_NEW_SCOPE_NOT_ARMED";
}catch{
  report.status="FREE_PREARM_HOLD_NO_PROVIDER_MUTATION";
  process.exitCode=2;
}finally{
  if(client)await client.end().catch(()=>undefined);
  console.log(JSON.stringify(report,null,2));
}