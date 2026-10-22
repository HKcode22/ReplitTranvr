import {describe,it,expect,vi} from "vitest";
import {readFileSync} from "node:fs";
import {assessGate4AlertRouteReadinessV39} from
  "../server/lib/disruption/gate4AlertRouteReadiness_v39";
import {
  gate4ReadOnlyHealthArgsV39,runGate4AlertRouteReadOnlyV39
} from "../scripts/v39_gate4_alert_route_readonly_v39";

const head="a".repeat(40);
const full="server/index.ts+server/routes_v3.ts";
const prepaid="server/phase2gCallbackOnly.ts+server/routes_v3.ts";
const health={
  schema:"v39.phase2f-workspace-runtime.v1",
  status:"PASS",git_head:head,
  runtime_owner_mode:"replit-published-deployment",
  published_deployment:true,
  route_owner:prepaid,
  prepaid_route_registered:true,
  prepaid_source_custody_ready:true,
  gate4_alert_ingress_registered:false,
  gate4_alert_callback_proven:false
};

describe("Gate4 Alert ingress: reject historical published prepaid-only route",()=>{
  it("healthy prepaid path is NOT an Alert webhook receiver",()=>{
    expect(assessGate4AlertRouteReadinessV39(health,head)).toMatchObject({
      status:"HOLD",
      reason:"PUBLISHED_PREPAID_ONLY_ALERT_ROUTE_BLOCKED",
      publishedGitHeadMatched:true,
      prepaidOnlyReceiver:true,
      alertRouteDeclared:false,
      callbackDeliveryAndAckProven:false,
      independentStopArmed:false,
      liveGate4Certified:false,
      paidAuthorization:false
    });
  });
  it("prepaid-only route cannot self-assert Alert readiness",()=>{
    const r=assessGate4AlertRouteReadinessV39({
      ...health,gate4_alert_ingress_registered:true,
      gate4_alert_callback_proven:true
    },head);
    expect(r.status).toBe("HOLD");
    expect(r.reason).toBe("PUBLISHED_PREPAID_ONLY_ALERT_ROUTE_BLOCKED");
  });
  it("unknown legacy health field is HOLD even if app owner is full",()=>{
    const legacy={...health,route_owner:full};
    delete (legacy as {gate4_alert_ingress_registered?:boolean})
      .gate4_alert_ingress_registered;
    const r=assessGate4AlertRouteReadinessV39(legacy,head);
    expect(r).toMatchObject({
      status:"HOLD",reason:"GATE4_ALERT_ROUTE_NOT_DECLARED"
    });
  });
  it("full app route declaration is NOT delivery/ACK evidence",()=>{
    const r=assessGate4AlertRouteReadinessV39({
      ...health,route_owner:full,gate4_alert_ingress_registered:true
    },head);
    expect(r).toMatchObject({
      status:"ROUTE_DECLARED_NOT_LIVE_PROVEN",
      reason:"CALLBACK_AND_PROVIDER_DELIVERY_ACK_STILL_UNVERIFIED",
      alertRouteDeclared:true,
      callbackDeliveryAndAckProven:false,
      liveGate4Certified:false
    });
  });
  it("rejects forged head, unreviewed owner, wrong deployment mode",()=>{
    const cases=[
      {...health,git_head:"b".repeat(40)},
      {...health,route_owner:"other"},
      {...health,runtime_owner_mode:"replit-managed-project"},
      {...health,published_deployment:false},
      {...health,status:"FAIL"}
    ];
    for(const x of cases)
      expect(assessGate4AlertRouteReadinessV39(x,head).status).toBe("HOLD");
  });
  it("wrong delivery status never claims a valid live certificate",()=>{
    const x={...health,route_owner:full,
      gate4_alert_ingress_registered:true,gate4_alert_callback_proven:true};
    expect(assessGate4AlertRouteReadinessV39(x,head)).toMatchObject({
      status:"HOLD",reason:"UNREVIEWED_DELIVERY_PROOF_FLAG"
    });
  });
  it("GET-only diagnostic returns exit 2 for actual prepaid-only mode",async()=>{
    const spy=vi.spyOn(console,"log").mockImplementation(()=>{});
    try{
      const code=await runGate4AlertRouteReadOnlyV39(
        ["--published-head",head],async()=>health
      );
      expect(code).toBe(2);
      expect(spy).toHaveBeenCalled();
      expect(spy.mock.calls.join(" ")).not.toContain("SECRET_TOKEN");
    }finally{spy.mockRestore();}
  });
  it("GET-only diagnostic never returns exit 0 on health failure",async()=>{
    const spy=vi.spyOn(console,"log").mockImplementation(()=>{});
    try{
      expect(await runGate4AlertRouteReadOnlyV39(
        ["--published-head",head],async()=>{throw Error("SECRET_TOKEN");}
      )).toBe(2);
      expect(spy.mock.calls.join(" ")).not.toContain("SECRET_TOKEN");
    }finally{spy.mockRestore();}
  });
  it("rejects CLI arguments that could alter provider or POST behavior",()=>{
    expect(gate4ReadOnlyHealthArgsV39(
      ["--published-head",head])).toBe(head);
    for(const args of [
      [],["--paid"],["--published-head",head,"--create"],
      ["--published-head","bad"],["--url","https://evil.example.com"]
    ])expect(()=>gate4ReadOnlyHealthArgsV39(args)).toThrow(
      "GATE4_ALERT_READONLY_USAGE_HOLD");
  });
  it("full app vs prepaid callback allowlist has explicit registration",()=>{
    const base=new URL("../server/",import.meta.url);
    const minimal=readFileSync(new URL("phase2gCallbackOnly.ts",base),"utf8");
    const app=readFileSync(new URL("index.ts",base),"utf8");
    const healthModule=readFileSync(new URL(
      "lib/disruption/workspaceRuntimeHealth_v39.ts",base),"utf8");
    expect(minimal).toContain("gate4AlertIngressRegistered: gate4AdditiveEnabled");
    expect(minimal).toContain("prepaidPath.test(req.path)");
    expect(minimal).not.toContain("gate4AlertIngressRegistered: true");
    expect(app).toContain("gate4AlertIngressRegistered: true");
    expect(healthModule).toContain("gate4_alert_ingress_registered:");
    expect(healthModule).toContain("gate4_alert_callback_proven: false");
  });
});
