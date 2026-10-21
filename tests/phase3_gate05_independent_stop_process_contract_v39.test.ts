/**
 * Static launch-policy tests: no runtime secrets, live PostgreSQL, provider
 * calls, process spawn, signed owner AUTH or activation.
 */
import {describe,it,expect} from "vitest";
import {validateGate05IndependentStopLaunchV39} from
  "../scripts/v39_gate05_independent_stop_process_v39";

const SHA="a".repeat(40);
const args={expectedHead:SHA,confirm:"WATCH_G05_SAFETY_ONLY_NO_PROVIDER"};
const env=()=>({
  GATE05_SAFETY_DATABASE_URL:
    "postgresql://gate05_fids_safety_login_20261021_example:fixture-only@"+
    "neon.example.invalid/neondb?sslmode=verify-full",
  GATE05_EXPECTED_DB_HOST:"neon.example.invalid"
});

describe("Gate05 sidecar launch isolation contract (NO I/O)",()=>{
  it("allows only a pinned source and a separate safety-only TLS role",()=>{
    const result=validateGate05IndependentStopLaunchV39(args,env());
    expect(result).toMatchObject({
      expectedHead:SHA,
      requiredGroup:"gate05_fids_safety_v39",
      targetDatabase:"neondb",
      providersAllowed:0,
      activationAllowed:false,
      independentlyDeployedAttested:false
    });
    expect(result).not.toHaveProperty("password");
  });
  it("rejects stale or unauthorized launch inputs before any I/O",()=>{
    expect(()=>validateGate05IndependentStopLaunchV39(
      {...args,confirm:"START_FIDS"},env()
    )).toThrow("GATE05_SIDE_LAUNCH_INPUT_HOLD");
    expect(()=>validateGate05IndependentStopLaunchV39(
      {...args,expectedHead:"wrong"},env()
    )).toThrow("GATE05_SIDE_LAUNCH_INPUT_HOLD");
  });
  it("refuses provider key, app DB and commissioner/dispatcher credentials",()=>{
    for(const variable of [
      "DATABASE_URL","DATABASE_RUNTIME_URL","V39_DATABASE_RUNTIME_URL",
      "AERODATABOX_API_KEY","GATE05_DISPATCH_DATABASE_URL",
      "GATE05_COMMISSION_DATABASE_URL"
    ]){
      expect(()=>validateGate05IndependentStopLaunchV39(args,{
        ...env(),[variable]:"injected-not-a-key"
      })).toThrow("GATE05_SIDE_SHARED_RUNTIME_CREDENTIALS_HOLD");
    }
  });
  it("rejects admin user, no SSL verification, host spoof and localhost",()=>{
    const good=env();
    expect(()=>validateGate05IndependentStopLaunchV39(args,{
      ...good,GATE05_SAFETY_DATABASE_URL:good.GATE05_SAFETY_DATABASE_URL!
        .replace("gate05_fids_safety_login_20261021_example","neondb_owner")
    })).toThrow("GATE05_SIDE_RESTRICTED_TLS_URL_HOLD");
    expect(()=>validateGate05IndependentStopLaunchV39(args,{
      ...good,GATE05_SAFETY_DATABASE_URL:good.GATE05_SAFETY_DATABASE_URL!
        .replace("verify-full","require")
    })).toThrow("GATE05_SIDE_RESTRICTED_TLS_URL_HOLD");
    expect(()=>validateGate05IndependentStopLaunchV39(args,{
      ...good,GATE05_EXPECTED_DB_HOST:"attacker.example.invalid"
    })).toThrow("GATE05_SIDE_DB_HOST_PIN_HOLD");
    expect(()=>validateGate05IndependentStopLaunchV39(args,{
      ...good,
      GATE05_SAFETY_DATABASE_URL:
        "postgresql://gate05_fids_safety_login_test:p@localhost/neondb?sslmode=verify-full",
      GATE05_EXPECTED_DB_HOST:"localhost"
    })).toThrow("GATE05_SIDE_DB_HOST_PIN_HOLD");
  });
  it("cannot issue an unconfigured service connection",()=>{
    expect(()=>validateGate05IndependentStopLaunchV39(args,{
      GATE05_EXPECTED_DB_HOST:"neon.example.invalid"
    })).toThrow("GATE05_SIDE_SAFETY_ONLY_URL_HOLD");
  });
});
