import {describe,it,expect,vi} from "vitest";
import type {Pool} from "pg";
import {sha256HexString,type AuthRecord} from
  "../server/lib/disruption/authRecord_v39";
import {
  verifyGate3PublishedPrepaidHostV39,
  reviewGate3CurrentProviderAccountV39,
  prepareGate3AfterLiveReadOnlyEvidenceV39,
} from "../server/lib/disruption/gate3OwnedPreExposure_v39";
import type {StrictBalanceEvidence,WebhookSubscription}
  from "../server/lib/disruption/aerodataboxLimiter_v3";

const now=new Date("2026-10-17T12:00:00Z");
const publishedSha="b".repeat(40);
const window="WSSS/departures/2026-10-17T12:01:00Z+300s";
const auth:AuthRecord={
  authorizationId:"AUTH-20261017-GATE3",
  phaseGate:"Phase 3 / Gate 3",
  airportFilterWindow:window,
  maxAlertCredits:12,maxRestUnitsByCategory:null,
  startNotBeforeUtc:"2026-10-17T11:59:00Z",
  expiresAtUtc:"2026-10-17T13:00:00Z",
  cleanupOwner:"operator",
  predecessorEvidenceIds:["GATE-20261016-QUALIFIED"],
};
const authArtifactRaw=JSON.stringify(auth);
const sha=sha256HexString(authArtifactRaw);
const ledger="GATE-20261016-QUALIFIED\nAUTH_ARTIFACT_SHA256:"+sha;
vi.mock("node:fs",async(loader)=>{
  const actual=await loader<typeof import("node:fs")>();
  return {...actual,readFileSync:(path:Parameters<typeof actual.readFileSync>[0],
    encoding?:BufferEncoding)=>{
    if(String(path).endsWith("SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md"))
      return ledger;
    return actual.readFileSync(path,encoding);
  }};
});
const input={
  authArtifactRaw,expectedAuthId:auth.authorizationId,
  expectedAirportFilterWindow:window,
  icao:"WSSS",canaryCreditCeiling:12,
  fixedExposureSeconds:300,nowUtc:now,
  expectedPublishedGitHead:publishedSha,
};
function host(overrides:Record<string,unknown>={}){
  let count=0;
  const fn:typeof fetch=async ()=>{
    count++;
    return new Response(JSON.stringify({
      schema:"v39.phase2f-workspace-runtime.v1",
      status:"PASS",git_head:publishedSha,
      prepaid_route_registered:true,prepaid_source_custody_ready:true,
      retention_hours:168,bucket_prefix:"replit-objstore-test",
      provider_mutation:false,
      runtime_owner_mode:"replit-published-deployment",
      published_deployment:true,runtime_durability_class:"autoscale",
      ...overrides,
    }),{status:200,headers:{"content-type":"application/json"}});
  };
  return {fn,get count(){return count;}};
}
const balance=(creditsRemaining=2300)=>({
  balance:{creditsRemaining},
  quota:{apiUnitsRemaining:56000},
} as StrictBalanceEvidence);
function db(opts:{existing?:boolean,commitFails?:boolean}={}){
  const sql:string[]=[];const released:boolean[]=[];
  const pool={
    async connect(){
      return {
        async query(q:string){
          const kind=q.startsWith("SELECT pg_advisory")?"LOCK":
            q.startsWith("SELECT session_id,state")?"EXISTING":
            q.startsWith("INSERT INTO clean.phase3_gate3")?"OWNER":
            q.startsWith("INSERT INTO clean.prepaid")?"RUNTIME":q;
          sql.push(kind);
          if(kind==="EXISTING")
            return opts.existing?{rowCount:1,rows:[{state:"PREPARED"}]}:
              {rowCount:0,rows:[]};
          if(kind==="COMMIT"&&opts.commitFails)throw Error("LOST_COMMIT");
          return {rowCount:1,rows:[]};
        },
        release(discard?:boolean){released.push(discard===true);},
      };
    },
  } as unknown as Pick<Pool,"connect">;
  return {pool,sql,released};
}
const list=async():Promise<WebhookSubscription[]>=>[];
describe("Gate3 actual published host + strict account + source owner preexposure (NO paid calls in CI)",()=>{
  it("honors Autoscale and existing callback identity without requiring Reserved VM",async()=>{
    const h=host();
    await expect(verifyGate3PublishedPrepaidHostV39(publishedSha,h.fn))
      .resolves.toBeUndefined();
    expect(h.count).toBe(1);
    await expect(verifyGate3PublishedPrepaidHostV39(publishedSha,
      host({runtime_durability_class:"reserved-vm"}).fn))
      .resolves.toBeUndefined();
  });
  it("fails closed on changed callback, missing custody, wrong SHA or unrecognized runtime",async()=>{
    for(const patch of [
      {git_head:"c".repeat(40)},
      {prepaid_source_custody_ready:false},
      {prepaid_route_registered:false},
      {retention_hours:24},
      {runtime_durability_class:"unknown"},
      {provider_mutation:true},
      {bucket_prefix:"not-objstore"},
      {published_deployment:false},
    ]){
      await expect(verifyGate3PublishedPrepaidHostV39(publishedSha,host(patch).fn))
        .rejects.toThrow("GATE3_OWNER_PUBLISHED_HOST_CONTRACT_MISMATCH_HOLD");
    }
    await expect(verifyGate3PublishedPrepaidHostV39("unpinned",host().fn))
      .rejects.toThrow("GATE3_OWNER_PUBLISHED_HEAD_NOT_PINNED_HOLD");
  });
  it("current provider balance and inventory gates enforce protected floor, no foreign billables",async()=>{
    await expect(reviewGate3CurrentProviderAccountV39(12,
      async()=>balance(),list)).resolves.toBeUndefined();
    for(const remaining of [1400,1000,900,0]){
      await expect(reviewGate3CurrentProviderAccountV39(12,
        async()=>balance(remaining),list))
        .rejects.toThrow("GATE3_OWNER_PROVIDER_CREDIT_OR_QUOTA_FLOOR_HOLD");
    }
    await expect(reviewGate3CurrentProviderAccountV39(12,
      async()=>balance(),async()=>[{
        id:"other",isActive:true,billingType:"CreditBased",
      }])).rejects.toThrow("GATE3_OWNER_ACTIVE_BILLABLE_SUBSCRIPTION_PRESENT_HOLD");
    await expect(reviewGate3CurrentProviderAccountV39(12,
      async()=>balance(),async()=>[{id:"old",isActive:false,
        billingType:"CreditBased"}])).resolves.toBeUndefined();
  });
  it("invalid ledger AUTH never opens host GET, provider account or DB",async()=>{
    const d=db(),h=host();let provider=0;
    await expect(prepareGate3AfterLiveReadOnlyEvidenceV39(d.pool,{
      ...input,authArtifactRaw:authArtifactRaw+" ",
    },{
      fetchImpl:h.fn,getBalanceEvidence:async()=>{provider++;return balance();},
      getSubscriptions:list,
    })).rejects.toThrow("GATE3_LEDGER_PREPARE_AUTH_NOT_INDEPENDENTLY_APPROVED_HOLD");
    expect(h.count).toBe(0);expect(provider).toBe(0);expect(d.sql).toEqual([]);
  });
  it("no provider account check or DB reservation if actual published host fails",async()=>{
    const d=db(),h=host({prepaid_route_registered:false});let provider=0;
    await expect(prepareGate3AfterLiveReadOnlyEvidenceV39(d.pool,input,{
      fetchImpl:h.fn,getBalanceEvidence:async()=>{provider++;return balance();},
      getSubscriptions:list,
    })).rejects.toThrow("GATE3_OWNER_PUBLISHED_HOST_CONTRACT_MISMATCH_HOLD");
    expect(h.count).toBe(1);expect(provider).toBe(0);expect(d.sql).toEqual([]);
  });
  it("active paid subscription never opens DB and never tries a new CREATE",async()=>{
    const d=db(),h=host();let balances=0,lists=0;
    await expect(prepareGate3AfterLiveReadOnlyEvidenceV39(d.pool,input,{
      fetchImpl:h.fn,getBalanceEvidence:async()=>{balances++;return balance();},
      getSubscriptions:async()=>{
        lists++;
        return [{id:"foreign",isActive:true,billingType:"CreditBased"}];
      },
    })).rejects.toThrow("GATE3_OWNER_ACTIVE_BILLABLE_SUBSCRIPTION_PRESENT_HOLD");
    expect(balances).toBe(1);expect(lists).toBe(1);expect(d.sql).toEqual([]);
  });
  it("real host/account observations lead to ONE atomic matched source reservation, never paid GO",async()=>{
    const d=db(),h=host();
    const x=await prepareGate3AfterLiveReadOnlyEvidenceV39(d.pool,input,{
      fetchImpl:h.fn,getBalanceEvidence:async()=>balance(),
      getSubscriptions:list,
    });
    expect(d.sql).toEqual(["BEGIN","LOCK","EXISTING","OWNER","RUNTIME","COMMIT"]);
    expect(d.released).toEqual([false]);
    // The live provider starting balance is needed by the exact window
    // reconciler, but remains a process-local handoff, not a SQL receipt.
    expect(x.balanceBeforeInMemory).toBe(2300);
    expect(x).toMatchObject({
      status:"SOURCE_PREPARED_LEDGER_MATCH_NOT_PAID_AUTH",
      stage:"REAL_HOST_AND_ACCOUNT_READS_SOURCE_PREPARED_ONLY",
      signedOperatorAuthorizationVerifiedHere:false,
      liveSignedCallbackShaReadbackVerified:false,
      humanPaidAuthorizationVerified:false,
      paidCanaryCertified:false,
      providerSubscriptionCreatedHere:false,
      authorizesPaidProviderCalls:false,
    });
  });
  it("ambiguous source COMMIT never creates a second owner",async()=>{
    const d=db({commitFails:true});
    await expect(prepareGate3AfterLiveReadOnlyEvidenceV39(d.pool,input,{
      fetchImpl:host().fn,getBalanceEvidence:async()=>balance(),
      getSubscriptions:list,
    })).rejects.toThrow("GATE3_PREPARE_COMMIT_OUTCOME_UNKNOWN_DURABLE_AUDIT_REQUIRED");
    expect(d.sql.filter(x=>x==="OWNER")).toHaveLength(1);
    expect(d.sql.filter(x=>x==="COMMIT")).toHaveLength(1);
    expect(d.released).toEqual([true]);
  });
});
