#!/usr/bin/env node
import "dotenv/config";
const HOLD=s=>{throw Error("HOLD_P6_FREE_ACCOUNT_PREARM_"+s);};
const key=process.env.AERODATABOX_API_KEY;
if(typeof key!=="string"||key.length<8)HOLD("API_KEY_UNAVAILABLE");
const host="aerodatabox.p.rapidapi.com";
const base="https://"+host;
const headers={"x-rapidapi-key":key,"x-rapidapi-host":host,accept:"application/json"};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let last=0,reads=0;
async function get(path){
 if(!["/subscriptions/balance","/subscriptions/webhook"].includes(path))HOLD("ROUTE_NOT_FREE_READ");
 const wait=last+2600-Date.now(); if(last&&wait>0)await sleep(wait); last=Date.now();
 const res=await fetch(base+path,{method:"GET",headers,redirect:"error",signal:AbortSignal.timeout(12000)});
 reads++;
 if(path==="/subscriptions/webhook"&&res.status===204)return {body:[],headers:res.headers};
 if(res.status!==200)HOLD("PROVIDER_NON200_"+res.status);
 let body;try{body=await res.json();}catch{HOLD("INVALID_JSON");}
 return {body,headers:res.headers};
}
const intHeader=(h,n)=>{
 const v=h.get(n);
 return v!==null&&/^[0-9]{1,12}$/.test(v)?Number(v):null;
};
const balance=v=>{
 const x=v?.balance??v;
 if(!x||typeof x!=="object"||!Number.isSafeInteger(x.creditsRemaining)||x.creditsRemaining<0)
  HOLD("BALANCE_SHAPE");
 return x.creditsRemaining;
};
const inventory=v=>{
 const a=Array.isArray(v)?v:(v?.subscriptions??v?.items);
 if(!Array.isArray(a)||a.length>500)HOLD("INVENTORY_SHAPE");
 return a.map(row=>{
  if(!row||typeof row.id!=="string"||row.id.length<1||typeof row.isActive!=="boolean"||
     !["CreditBased","LifetimeBased"].includes(row.billingType))HOLD("INVENTORY_ROW");
  return {isActive:row.isActive,billingType:row.billingType};
 });
};
async function main(){
 const before=await get("/subscriptions/balance");
 const unitsBefore=intHeader(before.headers,"x-ratelimit-api-units-remaining");
 const limit=intHeader(before.headers,"x-ratelimit-api-units-limit");
 const requestsRemaining=intHeader(before.headers,"x-ratelimit-requests-remaining");
 if(unitsBefore===null)HOLD("MISSING_API_UNITS_REMAINING");
 const inv=inventory((await get("/subscriptions/webhook")).body);
 const after=await get("/subscriptions/balance");
 const unitsAfter=intHeader(after.headers,"x-ratelimit-api-units-remaining");
 if(unitsAfter===null)HOLD("MISSING_FINAL_API_UNITS_REMAINING");
 const creditsBefore=balance(before.body),creditsAfter=balance(after.body);
 const active=inv.filter(x=>x.isActive);
 const result={
  schema:"v39.phase6.launch-free-account-prearm.v1",
  status:active.length===0&&unitsBefore===unitsAfter&&creditsBefore===creditsAfter?
   "FREE_ACCOUNT_PREARM_STABLE_ZERO_ACTIVE_SUBSCRIPTIONS_NO_PAID_PROVIDER":
   "FREE_ACCOUNT_PREARM_HOLD",
  observedAtUtc:new Date().toISOString(),
  apiUnitsLimit:limit,
  apiUnitsRemaining:unitsAfter,
  requestsRemaining,
  alertCreditsRemaining:creditsAfter,
  balancesStable:unitsBefore===unitsAfter&&creditsBefore===creditsAfter,
  activeBillableSubscriptions:active.length,
  totalSubscriptionRecords:inv.length,
  providerFreeReads:reads,
  providerPaidGets:0,
  providerMutations:0,
  sourceFidsCalls:0,
  databaseWrites:0,
  sourceContentsRetrieved:false,
  phase6PaidGo:false
 };
 console.log(JSON.stringify(result));
 if(result.status!=="FREE_ACCOUNT_PREARM_STABLE_ZERO_ACTIVE_SUBSCRIPTIONS_NO_PAID_PROVIDER")
  process.exitCode=2;
}
main().catch(e=>{
 const m=String(e?.message??"");
 console.error(/^HOLD_P6_FREE_ACCOUNT_PREARM_[A-Z0-9_]+$/.test(m)?m:"HOLD_P6_FREE_ACCOUNT_PREARM_REDACTED");
 process.exitCode=2;
});