/** Source-only contract. Absolutely no database or provider call in tests. */
import {describe,it,expect} from "vitest";
import {
  inspectGate05DispatcherLaunchV39,assertGate05SafetyJobLiveV39
} from "../scripts/v39_gate05_scoped_fids_feasibility_operator_v39";
const head="a".repeat(40);
const input={head,confirm:"OWNER_APPROVED_WSSS12_PAID_GET"};
const secrets=()=>({
  GATE05_DISPATCH_DATABASE_URL:
    "postgresql://gate05_fids_dispatch_login_20261021_213f1f:"+ 
    "NOT_A_REAL_PASSWORD@db.example.invalid/neondb?sslmode=verify-full",
  GATE05_EXPECTED_DB_HOST:"db.example.invalid",
  AERODATABOX_API_KEY:"FIXTURE_ONLY_DO_NOT_USE"
});
describe("Gate05 paid dispatcher startup isolation (pure no-IO)",()=>{
  it("accepts only exact TLS dispatcher and explicit confirmation",()=>{
    const p=inspectGate05DispatcherLaunchV39(input,secrets());
    expect(p).toMatchObject({head,login:
      "gate05_fids_dispatch_login_20261021_213f1f",
      maximumApiUnits:12,activationAllowed:false,
      dedicatedDispatchRequired:true});
    expect(p).not.toHaveProperty("password");
  });
  it("requires a real in-progress main safety STOP workflow step",()=>{
    const scope="32273d90-f8f1-46e7-a7e8-82f02edebed9";
    const digest="a".repeat(64);
    const active={
      id:39535000000,status:"in_progress",event:"workflow_dispatch",
      display_title:`Gate05 STOP ${scope} ${digest}`,
      head_branch:"main",head_sha:head,run_attempt:1,
      path:".github/workflows/phase3-gate05-independent-stop.yml@refs/heads/main"
    };
    const jobs={jobs:[{name:"safety-only-stop",status:"in_progress",
      steps:[{name:"Run independent safety-only signed expiry STOP",
        status:"in_progress"}]}]};
    expect(assertGate05SafetyJobLiveV39(active,jobs,head,scope,digest))
      .toMatchObject({headSha:head,safetyStepActive:true});
    for(const bad of [
      {...active,status:"completed"},
      {...active,event:"pull_request"},
      {...active,head_sha:"b".repeat(40)},
      {...active,head_branch:"feature"},
      {...active,path:"phase3-gate3-independent-safety.yml"},
      {...active,run_attempt:2},
      {...active,display_title:`Gate05 STOP ${scope} ${"b".repeat(64)}`},
      {...active,display_title:"Unbound Gate05 safety job"}
    ])expect(()=>assertGate05SafetyJobLiveV39(bad,jobs,head,scope,digest))
      .toThrow("GATE05_DISPATCH_HOLD_INDEPENDENT_SAFETY_NOT_LIVE");
    expect(()=>assertGate05SafetyJobLiveV39(active,{jobs:[]},head,scope,digest))
      .toThrow("GATE05_DISPATCH_HOLD_INDEPENDENT_SAFETY_NOT_LIVE");
    expect(()=>assertGate05SafetyJobLiveV39(active,{
      jobs:[{name:"safety-only-stop",status:"completed",
        steps:jobs.jobs[0].steps}]
    },head,scope,digest)).toThrow("GATE05_DISPATCH_HOLD_INDEPENDENT_SAFETY_NOT_LIVE");
  });
  it("refuses missing provider credentials, general DB, mismatch host",()=>{
    const good=secrets();
    for(const env of [
      {...good,GATE05_DISPATCH_DATABASE_URL:undefined},
      {...good,AERODATABOX_API_KEY:undefined},
      {...good,GATE05_DISPATCH_DATABASE_URL:
        good.GATE05_DISPATCH_DATABASE_URL.replace(
          "gate05_fids_dispatch_login_20261021_213f1f","neondb_owner")},
      {...good,GATE05_DISPATCH_DATABASE_URL:
        good.GATE05_DISPATCH_DATABASE_URL.replace(
          "sslmode=verify-full","sslmode=require")},
      {...good,GATE05_EXPECTED_DB_HOST:"other.example.invalid"}
    ])expect(()=>inspectGate05DispatcherLaunchV39(input,env))
      .toThrow(/^GATE05_DISPATCH_HOLD_/);
  });
  it("refuses wrong paid command, invalid source pin and localhost",()=>{
    const good=secrets();
    expect(()=>inspectGate05DispatcherLaunchV39(
      {...input,confirm:"YES"},good
    )).toThrow("GATE05_DISPATCH_HOLD_EXACT_COMMAND");
    expect(()=>inspectGate05DispatcherLaunchV39(
      {...input,head:"wrong"},good
    )).toThrow("GATE05_DISPATCH_HOLD_EXACT_COMMAND");
    expect(()=>inspectGate05DispatcherLaunchV39(input,{
      ...good,GATE05_DISPATCH_DATABASE_URL:
        "postgresql://gate05_fids_dispatch_login_20261021_213f1f:fixture@"+
        "localhost/neondb?sslmode=verify-full",
      GATE05_EXPECTED_DB_HOST:"localhost"
    })).toThrow("GATE05_DISPATCH_HOLD_RESTRICTED_CONNECTION");
  });
});
