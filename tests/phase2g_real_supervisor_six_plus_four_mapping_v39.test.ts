import {createHmac} from "node:crypto";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import vm from "node:vm";
import ts from "typescript";
import {describe,it,expect} from "vitest";
import {
  classifyActualSupervisorHealthForSixPlusFourV39
} from "../experiments/phase2g_rehearsal/synthetic_real_health_6plus4_adapter_v39";
import {
  evaluateSyntheticSixPlusFourWatchdogV39,
  type SixPlusFourEvidenceV39
} from "../experiments/phase2g_rehearsal/synthetic_watchdog_six_plus_four_v39";

const SRC=readFileSync(join(process.cwd(),
  "scripts/v39_phase2g_stage1_logged_supervisor_v39.ts"),"utf8");
const a=SRC.indexOf("type CallbackHealthResultV39 =");
const z=SRC.indexOf("\nasync function main()",a);
if(a<0||z<0)throw new Error("REAL_SUPERVISOR_CHECKER_NOT_EXTRACTABLE");
const CODE=ts.transpileModule(SRC.slice(a,z),{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}
}).outputText;
const HEAD="5de44ba66d59c26d9e5ef3b339b7f729ca2f3653";
const KEY="offline-fake-key",DATABASE="postgresql://offline.invalid/never_connect";
type Stage="wrong_secret_route"|"published_runtime"|
  "webhook_secret_binding"|"runtime_db_binding";
const fixtures:Record<Stage,{status:number;body:Record<string,unknown>}>={
  wrong_secret_route:{status:404,body:{error:"Not found"}},
  published_runtime:{status:200,body:{
    schema:"v39.phase2f-workspace-runtime.v1",
    status:"PASS",git_head:HEAD,prepaid_route_registered:true,
    retention_hours:168,provider_mutation:false,
    runtime_owner_mode:"replit-published-deployment",
    managed_replit_workflow:false,published_deployment:true,
    runtime_durability_class:"autoscale"
  }},
  webhook_secret_binding:{status:200,body:{
    schema:"v39.phase2g-webhook-secret-match.v1",status:"PASS",
    provider_call:false,provider_mutation:false,alert_credits_spent:0
  }},
  runtime_db_binding:{status:200,body:{
    schema:"v39.phase2g-runtime-db-binding.v1",status:"PASS",
    provider_call:false,provider_mutation:false,database_mutation:false,
    alert_credits_spent:0
  }}
};
const stageFor=(path:string):Stage=>{
  if(path.startsWith("/api/v1/webhooks/"))return "wrong_secret_route";
  if(path==="/__v39/workspace-runtime")return "published_runtime";
  if(path==="/__v39/phase2g/webhook-secret-match")
    return "webhook_secret_binding";
  if(path==="/__v39/phase2g/runtime-db-binding")
    return "runtime_db_binding";
  throw new Error("UNEXPECTED_TEST_URL");
};
type Failure=Partial<{stage:Stage;status:number;
  patch:Record<string,unknown>;throwName:string}>;
async function realCallback(f:Failure={}){
  const calls:Stage[]=[];
  const fetcher=async(input:string,init:Record<string,any>={})=>{
    const u=new URL(input);
    if(u.origin!=="https://offline.invalid")throw new Error("REAL_NETWORK_REFUSED");
    const s=stageFor(u.pathname);
    calls.push(s);
    if(s==="runtime_db_binding"){
      const ch=init.headers["x-v39-phase2g-db-challenge"];
      expect(init.headers["x-v39-phase2g-db-proof"])
        .toBe(createHmac("sha256",DATABASE)
          .update("phase2g-db-binding:"+ch).digest("hex"));
    }
    if(s==="webhook_secret_binding")
      expect(init.headers["x-v39-phase2g-webhook-secret"]).toBe(KEY);
    if(f.stage===s&&f.throwName){
      const err=new Error("TEST_INJECTED");
      err.name=f.throwName;
      throw err;
    }
    const base=fixtures[s];
    return {
      status:f.stage===s&&f.status!==undefined?f.status:base.status,
      json:async()=>({...base.body,...(f.stage===s?f.patch:{} )})
    };
  };
  const sandbox={
    Error,Date,AbortSignal,createHmac,fetch:fetcher,
    process:{env:{
      AERODATABOX_WEBHOOK_SECRET:KEY,
      V39_DATABASE_RUNTIME_URL:DATABASE
    }}
  };
  const cb=vm.runInNewContext(CODE+"\ncallbackHealthy;",sandbox,{timeout:1500})
    as ((base:string,head:string,mode:string)=>Promise<{
      healthy:boolean;check:string;reason:string;http_status:number|null;
      elapsed_ms:number;
    }>);
  const result=await cb("https://offline.invalid",HEAD,"published");
  return {result,calls,classification:
    classifyActualSupervisorHealthForSixPlusFourV39(result)};
}
const verified=():SixPlusFourEvidenceV39=>({
  sourceEvidenceIndependentlyAuthenticated:true,
  currentSenderWatermarkComplete:true,
  senderAttemptCount:4,durableExactAttemptCount:4,
  senderAttemptCredits:4,durableExactAttemptCredits:4,
  unambiguousFirstEdgeUtcAndWireSha:true,
  fullOriginalBytesReadBackVerified:true,rawRetentionHours:168,
  originalPhysicalFlightV2Continuity:true,
  elapsedScientificBinsThroughWatermarkVerified:true,
  signedOwnerAndSubscriptionMatch:true,oneActiveOwnerLease:true,
  unloggedRecoverySourceComplete:true,durableQueueAvailable:true,
  queueBacklogAgeSeconds:0,queueRetentionSeconds:86400,
  providerMaxDeliveryRetries:0,frozenCreditCeiling:500,
  independentEstimatedUpperBoundSpend:10,currentEvidenceAgeSeconds:0
});
describe("P15 6+4 adapter executes REAL supervisor health function offline",()=>{
  it("normal full four-stage health contract classifies healthy but never scientific pass",async()=>{
    const r=await realCallback();
    expect(r.calls).toHaveLength(4);
    expect(r.classification).toBe("healthy");
    const policy=evaluateSyntheticSixPlusFourWatchdogV39({
      mode:"synthetic-only",pollMs:15000,primaryChecks:6,backupChecks:4,
      samples:[{health:r.classification,evidence:verified()}]
    });
    expect(policy.stopOwner).toBe(false);
    expect(policy.paidLaunchAuthorized).toBe(false);
  });
  it("real supervisor stage HTTP 503 is potentially transient, not a verified scientific recovery",async()=>{
    const h=await realCallback({stage:"published_runtime",status:503});
    expect(h.result.check).toBe("published_runtime");
    expect(h.classification).toBe("transient_http_502_503_504");
    const policy=evaluateSyntheticSixPlusFourWatchdogV39({
      mode:"synthetic-only",pollMs:15000,primaryChecks:6,backupChecks:4,
      samples:Array.from({length:6},()=>({
        health:h.classification,evidence:verified()
      }))
    });
    expect(policy.state).toBe("PRIMARY_GRACE");
    expect(policy.scientificAdjudication)
      .toBe("PENDING_OR_CENSORED_NOT_AUTOMATIC_PASS");
  });
  it("actual network timeout remains conditional on independent source proof",async()=>{
    const h=await realCallback({
      stage:"runtime_db_binding",throwName:"TimeoutError"
    });
    expect(h.classification).toBe("transient_timeout");
    const e=verified();
    const blocked=evaluateSyntheticSixPlusFourWatchdogV39({
      mode:"synthetic-only",pollMs:15000,primaryChecks:6,backupChecks:4,
      samples:[{health:h.classification,evidence:{
        ...e,sourceEvidenceIndependentlyAuthenticated:false
      }}]
    });
    expect(blocked).toMatchObject({
      stopOwner:true,stopAtIndex:0,state:"STOP_SAFE_NO_PROOF"
    });
  });
  it("real network fetch exception is not confused with wrong authorization key",async()=>{
    const h=await realCallback({
      stage:"webhook_secret_binding",throwName:"TypeError"
    });
    expect(h.classification).toBe("transient_network_error");
  });
  it("real HTTP 200 but wrong deployed revision classified as hard wrong-build",async()=>{
    const h=await realCallback({
      stage:"published_runtime",patch:{git_head:"0".repeat(40)}
    });
    expect(h.classification).toBe("wrong_build");
    const p=evaluateSyntheticSixPlusFourWatchdogV39({
      mode:"synthetic-only",pollMs:15000,primaryChecks:6,backupChecks:4,
      samples:[{health:h.classification,evidence:verified()}]
    });
    expect(p.stopAtIndex).toBe(0);
    expect(p.state).toBe("STOP_HARD_CONTRACT");
  });
  it("real HTTP 200 but invalid webhook binding classified as hard secret failure",async()=>{
    const h=await realCallback({
      stage:"webhook_secret_binding",patch:{provider_call:true}
    });
    expect(h.classification).toBe("bad_secret");
  });
  it("real HTTP 403 at secret match is a hard mismatch, not a transient Replit 503",async()=>{
    const h=await realCallback({
      stage:"webhook_secret_binding",status:403
    });
    expect(h.classification).toBe("bad_secret");
  });
  it("real 200 database-binding false-positive never receives 6+4 grace",async()=>{
    const h=await realCallback({
      stage:"runtime_db_binding",patch:{database_mutation:true}
    });
    expect(h.classification).toBe("db_identity_or_lifecycle_violation");
  });
  it("wrong-secret endpoint malformed 404 response is a hard contract failure",async()=>{
    const h=await realCallback({
      stage:"wrong_secret_route",patch:{error:"wrong body"}
    });
    expect(h.classification).toBe("webhook_contract_violation");
  });
  it("nine actual offline Replit HTTP 503 checks followed by real health recovery exercise the FOUR backup checks",async()=>{
    const outcomes=[];
    for(let i=0;i<9;i++)outcomes.push((await realCallback({
      stage:"published_runtime",status:503
    })).classification);
    outcomes.push((await realCallback()).classification);
    const result=evaluateSyntheticSixPlusFourWatchdogV39({
      mode:"synthetic-only",pollMs:15000,primaryChecks:6,backupChecks:4,
      samples:outcomes.map(health=>({health,evidence:verified()}))
    });
    expect(result).toMatchObject({
      stopOwner:false,enteredContingency:true,
      contingencyChecksUsed:3,recoveredHealth:true,
      maximumObservedConsecutiveFailures:9,
      state:"HEALTH_RECOVERED_AUDIT_PENDING",
      scientificAdjudication:"PENDING_OR_CENSORED_NOT_AUTOMATIC_PASS",
      paidLaunchAuthorized:false
    });
  });
  it("ten actual offline Replit HTTP 503 health outcomes STOP at bounded tenth check",async()=>{
    const outcomes=[];
    for(let i=0;i<10;i++)outcomes.push((await realCallback({
      stage:"published_runtime",status:503
    })).classification);
    const r=evaluateSyntheticSixPlusFourWatchdogV39({
      mode:"synthetic-only",pollMs:15000,primaryChecks:6,backupChecks:4,
      samples:outcomes.map(health=>({health,evidence:verified()}))
    });
    expect(r).toMatchObject({
      stopOwner:true,stopAtIndex:9,
      maximumObservedConsecutiveFailures:10,
      state:"STOP_AT_TEN",contingencyChecksUsed:4
    });
  });
  it("real Replit HTTP 503 with missing independent original bytes never earns six extra tries",async()=>{
    const h=await realCallback({stage:"published_runtime",status:503});
    const r=evaluateSyntheticSixPlusFourWatchdogV39({
      mode:"synthetic-only",pollMs:15000,primaryChecks:6,backupChecks:4,
      samples:[{health:h.classification,evidence:{
        ...verified(),fullOriginalBytesReadBackVerified:false
      }}]
    });
    expect(r).toMatchObject({
      stopOwner:true,stopAtIndex:0,
      reasons:["ORIGINAL_RAW_SOURCE_OR_UTC_NOT_DURABLE"]
    });
  });
  it("an arbitrary unknown future diagnostic is fail-closed, not silently a transient timeout",()=>{
    expect(classifyActualSupervisorHealthForSixPlusFourV39({
      healthy:false,check:"unknown-new-check",reason:"request_timeout",
      http_status:null,elapsed_ms:1
    })).toBe("webhook_contract_violation");
  });
  it("invalid recovered status can never be classified as healthy",()=>{
    expect(classifyActualSupervisorHealthForSixPlusFourV39({
      healthy:true,check:"all_checks",reason:"ok",
      http_status:503,elapsed_ms:1
    })).toBe("webhook_contract_violation");
  });
});
