/**
 * Gate 0.5 scientific WSSS paid pre-arm review — FREE reads only.
 * No create/delete/refill/FIDS requests, no source writes/DB writes.
 * Observe the current provider subscription inventory, shared credit balance,
 * API quotas and separately published raw-first receiver readiness.
 *
 * The prior NEXT4 runtime is NOT itself a new Gate05 binding.
 */
import "dotenv/config";

const PUBLISHED="https://replit-tranvr--hk84164.replit.app";
const PROVIDER="https://aerodatabox.p.rapidapi.com";
const NEXT4_RECEIVER_SOURCE="1885703c04ba8f24bf8d1183f873eb86d1f83d7c";
const HISTORIC_PROTECTED_FLOOR=1900;
const PROPOSED_ALERT_BUDGET=500;
const PROPOSED_FIDS_REST_UNITS=12;
const MIN_SPACING=2600;
const key=process.env.AERODATABOX_API_KEY;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const fail=stage=>{
  console.log(JSON.stringify({
    schema:"v39.gate05.wsss-new-paid-prearm-readonly.v1",
    status:"PREARM_HOLD",stage,airport:"WSSS",
    providerPaidGets:0,providerMutations:0,databaseWrites:0,
    newGate05ReceiverBindingVerified:false,
    newPaidAuthorizationGranted:false
  }));
  process.exitCode=2;
};
const numberHeader=(h,name)=>{
  const s=h.get(name);
  return s!==null&&/^[0-9]{1,12}$/.test(s)?Number(s):null;
};
let last=0,providerReads=0,publicReads=0,stage="KEY";
try {
  if(!key||key.length<10)throw Error("KEY");
  const auth={
    "x-rapidapi-key":key,
    "x-rapidapi-host":"aerodatabox.p.rapidapi.com",
    accept:"application/json"
  };
  async function getProvider(path){
    if(!["/subscriptions/balance","/subscriptions/webhook"].includes(path))
      throw Error("PROVIDER_ROUTE");
    const n=Date.now(),delta=last+MIN_SPACING-n;
    if(last&&delta>0)await sleep(delta);
    last=Date.now();
    providerReads++;
    const res=await fetch(PROVIDER+path,{
      method:"GET",headers:auth,redirect:"error",
      signal:AbortSignal.timeout(10000)
    });
    if(res.status===204&&path==="/subscriptions/webhook")
      return {body:[],headers:res.headers};
    if(res.status!==200)throw Error("PROVIDER_NON200");
    const body=await res.json();
    return {body,headers:res.headers};
  }
  const parseBalance=v=>{
    const x=v?.balance??v;
    if(!x||typeof x!=="object"||
       !Number.isSafeInteger(x.creditsRemaining)||x.creditsRemaining<0)
      throw Error("BALANCE_SHAPE");
    return x.creditsRemaining;
  };
  stage="BASELINE";
  const before=await getProvider("/subscriptions/balance");
  const creditsBefore=parseBalance(before.body);
  const unitsBefore=numberHeader(before.headers,"x-ratelimit-api-units-remaining");
  if(unitsBefore===null)throw Error("API_QUOTA_HEADER");
  stage="INVENTORY";
  const inv=await getProvider("/subscriptions/webhook");
  const list=Array.isArray(inv.body)?inv.body:
    inv.body?.subscriptions??inv.body?.items;
  if(!Array.isArray(list)||list.length>500)
    throw Error("INVENTORY_SHAPE");
  for(const row of list){
    if(!row||typeof row.id!=="string"||!row.id||
       typeof row.isActive!=="boolean"||
       !["CreditBased","LifetimeBased"].includes(row.billingType))
      throw Error("INVENTORY_ROW");
  }
  const active=list.filter(row=>row.isActive);
  stage="PUBLISHED_RECEIVER";
  publicReads++;
  const healthRes=await fetch(PUBLISHED+"/__v39/workspace-runtime",{
    method:"GET",redirect:"error",signal:AbortSignal.timeout(9000)
  });
  if(healthRes.status!==200)throw Error("RUNTIME_NON200");
  const health=await healthRes.json();
  const runtimeStatus=health?.status==="PASS"&&
    health?.git_head===NEXT4_RECEIVER_SOURCE&&
    health?.published_deployment===true&&
    health?.gate4_alert_ingress_registered===true&&
    health?.provider_mutation===false;
  stage="FINAL_BALANCE";
  const after=await getProvider("/subscriptions/balance");
  const creditsAfter=parseBalance(after.body);
  const unitsAfter=numberHeader(after.headers,"x-ratelimit-api-units-remaining");
  if(unitsAfter===null)throw Error("FINAL_API_QUOTA_HEADER");
  const stable=creditsAfter===creditsBefore&&unitsAfter===unitsBefore;
  const headroom=Math.max(0,creditsAfter-HISTORIC_PROTECTED_FLOOR);
  // Failure of one prerequisite is never proof the other prerequisites pass.
  const operationalReview=stable&&runtimeStatus&&active.length===0&&
    unitsAfter>=PROPOSED_FIDS_REST_UNITS;
  console.log(JSON.stringify({
    schema:"v39.gate05.wsss-new-paid-prearm-readonly.v1",
    status:operationalReview?
      "FREE_PREARM_TECHNICAL_READY_BUT_PAID_SCOPE_AND_BUDGET_NOT_ARMED":
      "FREE_PREARM_OPERATIONS_HOLD",
    observedAtUtc:new Date().toISOString(),
    airport:"WSSS",
    providerGetCount:providerReads,publicHealthGetCount:publicReads,
    activeSubscriptions:active.length,totalSubscriptionRecords:list.length,
    apiUnitsBefore:unitsBefore,apiUnitsAfter:unitsAfter,
    alertCreditsBefore:creditsBefore,alertCreditsAfter:creditsAfter,
    balancesStable:stable,
    priorReceiverSourceExpected:NEXT4_RECEIVER_SOURCE,
    priorReceiverSourceCurrentlyPublished:runtimeStatus,
    selectedNewPilotReceiverScopeVerified:false,
    newIndependentStopArmed:false,
    historicProtectedFloor:HISTORIC_PROTECTED_FLOOR,
    creditHeadroomAboveHistoricFloor:headroom,
    proposedAlertCreditBudget:PROPOSED_ALERT_BUDGET,
    proposedFidsApiUnits:PROPOSED_FIDS_REST_UNITS,
    proposedAlertBudgetWithinOldFloor:headroom>=PROPOSED_ALERT_BUDGET,
    budgetDecisionRequired:true,
    providerPaidGets:0,providerMutations:0,databaseWrites:0,
    newPaidAuthorizationGranted:false,
    originalStrictScientificGate05Passed:false
  }));
  if(!operationalReview)process.exitCode=2;
}catch {
  fail(stage);
}
