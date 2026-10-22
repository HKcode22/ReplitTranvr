import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {reviewGate4ExternalSafetyBoundaryV39,
  type Gate4ExternalSafetyCandidateV39,
  type Gate4ExternalSafetyReviewPinsV39
} from "../server/lib/disruption/gate4ExternalSafetyBoundary_v39";

const pins:Gate4ExternalSafetyReviewPinsV39={
  approvedSourceCommit:"a".repeat(40),
  approvedScopeId:"11111111-2222-3333-4444-555555555555",
  approvedControllerOrigin:"https://app.example.test/",
  approvedStopGatewayOrigin:"https://stop.example.test/",
  approvedCustodyOrigin:"https://custody.example.test/",
  approvedServiceIdentity:"gate4-safety-separate-supervisor"
};
const candidate:Gate4ExternalSafetyCandidateV39={
  expectedSourceCommit:pins.approvedSourceCommit,
  expectedScopeId:pins.approvedScopeId,
  controllerOrigin:pins.approvedControllerOrigin,
  stopGatewayUrl:"https://stop.example.test/v39/gate4/safety/exact-owned-stop",
  custodyReadUrl:"https://custody.example.test/v39/gate4/safety/custody-read",
  serviceIdentity:pins.approvedServiceIdentity,
  inheritedEnvironment:{
    GATE4_EXTERNAL_STOP_GATEWAY_TOKEN:"s".repeat(48),
    GATE4_EXTERNAL_CUSTODY_READ_TOKEN:"r".repeat(48)
  }
};
const check=(c:Gate4ExternalSafetyCandidateV39=candidate,
  p:Gate4ExternalSafetyReviewPinsV39=pins)=>
  reviewGate4ExternalSafetyBoundaryV39(c,p);

describe("Gate4 external supervisor config: offline trust-boundary candidate",()=>{
  it("even correctly shaped isolated settings NEVER attest a live independent worker",()=>{
    expect(check()).toMatchObject({
      status:"ISOLATION_CONFIGURATION_CANDIDATE_ONLY",
      configShapeMatched:true,paidAuthorization:false,
      externalSupervisorArmed:false,alertAcknowledged:false,
      restrictedCredentialsProven:false,
      deploymentIdentityIndependentlyAttested:false,
      rollbackResistantAnchorAttested:undefined,
      providerRequests:0,databaseWrites:0
    });
    expect(JSON.stringify(check())).not.toContain("s".repeat(48));
    expect(JSON.stringify(check())).not.toContain("r".repeat(48));
  });
  it("cannot share controller, STOP gateway and custody service origin",()=>{
    for(const p of [
      {...pins,approvedControllerOrigin:pins.approvedStopGatewayOrigin},
      {...pins,approvedCustodyOrigin:pins.approvedControllerOrigin},
      {...pins,approvedStopGatewayOrigin:pins.approvedCustodyOrigin}
    ])expect(check(candidate,p).status).toBe("HOLD");
  });
  it("requires fully pinned exact source, UUID and separate service identity",()=>{
    for(const c of [
      {...candidate,expectedSourceCommit:"b".repeat(40)},
      {...candidate,expectedScopeId:"33333333-4444-5555-6666-777777777777"},
      {...candidate,serviceIdentity:"app"},
      {...candidate,controllerOrigin:"https://other.example.test/"}
    ])expect(check(c).reason).toBe("TRUSTED_RELEASE_BINDING_MISMATCH");
  });
  it("denies the general provider or production database credentials",()=>{
    for(const bad of [
      "DATABASE_URL","DATABASE_RUNTIME_URL","V39_DATABASE_RUNTIME_URL",
      "AERODATABOX_API_KEY","RAPIDAPI_KEY","GITHUB_TOKEN","GH_TOKEN",
      "GATE05_SAFETY_DATABASE_URL","GATE3_DISPATCH_DATABASE_URL",
      "GATE4_EXTERNAL_CUSTODY_CAS_TOKEN","GATE4_EXTERNAL_CREATE_TOKEN"
    ]){
      const c={...candidate,inheritedEnvironment:{
        ...candidate.inheritedEnvironment,[bad]:"NEVER_PRINT_THIS"
      }};
      const out=check(c);
      expect(out).toMatchObject({
        status:"HOLD",reason:"INHERITED_APP_OR_WRITE_CREDENTIALS"
      });
      expect(JSON.stringify(out)).not.toContain("NEVER_PRINT_THIS");
    }
  });
  it("rejects extra unreviewed Gate4 capability or stale shared tokens",()=>{
    const extra={...candidate,inheritedEnvironment:{
      ...candidate.inheritedEnvironment,
      GATE4_EXTERNAL_ADMIN_TOKEN:"unapproved"
    }};
    expect(check(extra).reason).toBe("UNREVIEWED_EXTERNAL_CAPABILITY");
    const reused={...candidate,inheritedEnvironment:{
      ...candidate.inheritedEnvironment,
      GATE4_EXTERNAL_CUSTODY_READ_TOKEN:
        candidate.inheritedEnvironment.GATE4_EXTERNAL_STOP_GATEWAY_TOKEN
    }};
    expect(check(reused).reason).toBe("MISSING_OR_REUSED_SAFETY_CREDENTIALS");
    const absent={...candidate,inheritedEnvironment:{
      GATE4_EXTERNAL_CUSTODY_READ_TOKEN:"r".repeat(48)
    }};
    expect(check(absent).status).toBe("HOLD");
  });
  it("refuses non-HTTPS, query strings, wrong paths and credential-bearing URLs",()=>{
    for(const stopGatewayUrl of [
      "http://stop.example.test/v39/gate4/safety/exact-owned-stop",
      "https://stop.example.test/v39/gate4/safety/exact-owned-stop?force=1",
      "https://user:pass@stop.example.test/v39/gate4/safety/exact-owned-stop",
      "https://stop.example.test/v39/gate4/safety/any-other-route",
      "https://stop.example.test/v39/gate4/safety/exact-owned-stop/",
      "https://other.example.test/v39/gate4/safety/exact-owned-stop"
    ]){
      expect(check({...candidate,stopGatewayUrl}).status).toBe("HOLD");
    }
  });
  it("denies a controller URL with URL credentials or noncanonical casing",()=>{
    expect(check(candidate,{
      ...pins,approvedControllerOrigin:"https://user:pw@app.example.test/"
    }).reason).toBe("INDEPENDENT_REVIEW_PINS_INVALID");
    expect(check(candidate,{
      ...pins,approvedControllerOrigin:"HTTPS://app.example.test/"
    }).reason).toBe("INDEPENDENT_REVIEW_PINS_INVALID");
  });
  it("cannot use localhost or a single host for all resources",()=>{
    expect(check(candidate,{
      ...pins,approvedCustodyOrigin:"https://localhost/"
    }).reason).toBe("INDEPENDENT_REVIEW_PINS_INVALID");
  });
  it("rejects unaudited inherited Replit secret names without printing values",()=>{
    const c={...candidate,inheritedEnvironment:{
      ...candidate.inheritedEnvironment,
      REPLIT_BILLING_SECRET:"DO_NOT_LOG_ME"
    }};
    const out=check(c);
    expect(out.reason).toBe("INHERITED_APP_OR_WRITE_CREDENTIALS");
    expect(JSON.stringify(out)).not.toContain("DO_NOT_LOG_ME");
  });
  it("new module cannot make network/provider/SQL calls or run a worker",()=>{
    const s=readFileSync(new URL(
      "../server/lib/disruption/gate4ExternalSafetyBoundary_v39.ts",
      import.meta.url),"utf8");
    expect(s).not.toContain("process.env");
    expect(s).not.toContain("fetch(");
    expect(s).not.toContain("new pg.");
    expect(s).not.toContain("setInterval(");
    expect(s).not.toContain("startBatch(");
    expect(s).not.toContain("deleteSubscription(");
  });
});
