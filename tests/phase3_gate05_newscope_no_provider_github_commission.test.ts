import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";

const scriptPath="scripts/v39_gate05_newscope_commission_github_no_provider_20261028.mjs";
const workflowPath=".github/workflows/phase3-gate05-fresh-science-owner-no-provider.yml";
const src=readFileSync(scriptPath,"utf8");
const flow=readFileSync(workflowPath,"utf8");

describe("Gate05 NEW WSSS science owner and independent STOP no-provider preparation",()=>{
  it("requires an explicit protected manual dispatch of exact reviewed main",()=>{
    expect(flow).toContain("workflow_dispatch:");
    expect(flow).toContain("reviewed_main_sha:");
    expect(flow).toContain("COMMISSION_FRESH_WSSS_OWNER_NO_PROVIDER_NO_PAID_CREATE");
    expect(flow).not.toMatch(/\n {2}(?:push|schedule):|cron:/);
    expect(flow).toContain("environment: phase2g-paid");
    expect(flow).toContain('test "${GITHUB_RUN_ATTEMPT}" = 1');
    expect(flow).toContain('test "$(git rev-parse FETCH_HEAD)" = "${REVIEWED}"');
    expect(src).toContain('process.env.GITHUB_EVENT_NAME!=="workflow_dispatch"');
    expect(src).toContain('process.env.GITHUB_RUN_ATTEMPT!=="1"');
    expect(src).toContain("project?.permissions?.admin!==true");
    expect(src).toContain('p.type==="required_reviewers"');
  });
  it("never calls the provider's paid endpoints, does not commission on push",()=>{
    expect(src).toContain('["/subscriptions/balance","/subscriptions/webhook"].includes(path)');
    expect(src).toContain("lastFreeAt+2600-Date.now()");
    expect(src).toContain("const settled=await free");
    expect(src).toContain("ACCOUNT_CHANGED_BEFORE_COMMISSION");
    expect(src).toContain("ACTIVE_OR_UNVERIFIED_PROVIDER_SUBSCRIPTIONS");
    expect(src).toContain("providerCreates:0,providerDeletes:0");
    expect(src).toContain("providerRefills:0,fidsGets:0");
    expect(src).not.toMatch(/createGate4SingleWithRawReceipt|deleteSubscriptionVerifiedStrict|createSubscription|refillBalance|\/fids\//);
    expect(flow).toContain('GATE05_PROVIDER_CREATE_ALLOWED: ""');
    expect(flow).toContain('RAPIDAPI_KEY: ""');
    expect(flow).not.toContain("secrets.GITHUB_TOKEN");
    expect(flow).not.toContain("gh workflow run");
    expect(src).toContain('newPaidApproval:false');
    expect(src).toContain('newPaidAuthorization:false');
  });
  it("retains historical STOPPED owner and never replays V0074 or V0075 DDL",()=>{
    expect(src).toContain('const PRIOR="e69ffa34-d8a6-456f-a49c-9dd459e6d294"');
    expect(src).toContain("state IN ('PREPARED','ACTIVE')");
    expect(src).toContain("session_id=$1::uuid AND state='STOPPED'");
    expect(src).toContain("owners?.open!==0||owners?.old!==1");
    expect(src).toContain("recheck?.open!==0||recheck?.old!==1");
    expect(src).toContain("clean.gate05_science_delivery_custody_v39");
    expect(src).toContain("pg_advisory_xact_lock");
    expect(src).not.toContain("CREATE TABLE");
    expect(src).not.toContain("migrations/staged/");
    expect(src).not.toContain("UPDATE clean.phase3_gate05_science_owner_v39");
  });
  it("only provisions one forward-only scope, exactly scoped STOP and minimal SELECT reader",()=>{
    expect(src).toContain("scope=randomUUID()");
    expect(src).toContain("session_id,owner_kind,owner_probe_id,stage,icao,state");
    expect(src).toContain("'phase3_gate05_science'");
    expect(src).toContain("createHmac");
    expect(src).toContain("/__v39/phase2g/webhook-secret-match");
    expect(src).toContain("/__v39/phase2g/runtime-db-binding");
    expect(src).toContain("prepaid_route_registered");
    expect(src).toContain("gate05_durable_custody_ready");
    expect(src).toContain("GH_TOKEN");
    expect(src).toContain("GATE05_SAFETY_APPROVED_RUNNER_SHA");
    expect(src).toContain("GATE05_SAFETY_APPROVED_STOP_TICKET_SHA256");
    expect(src).toContain("GATE05_SCIENCE_SAFETY_DATABASE_URL");
    expect(src).toContain("NOINHERIT NOREPLICATION");
    expect(src).toContain("SAFETY_READER_NOT_SELECT_ONLY");
    expect(src).toContain('await db.query("COMMIT")');
    expect(src).toContain("COMMIT_AMBIGUOUS_NO_BLIND_RETRY");
    expect(src).toContain("independentStopLive:false");
    expect(src).toContain("strictSciencePassed:false");
  });
  it("records the unresolved credit-floor and future-science status accurately",()=>{
    expect(src).toContain("historical1900FloorWaived:false");
    expect(src).toContain("old1900FloorWaiver:false");
    expect(src).toContain("actualRunwaySourceSemanticsProven:false");
    expect(src).toContain("minItems:100,minFlights:50,minCompleted:20,minAirborne:30");
    expect(src).toContain("minPoints:100,minMinutes:60");
    expect(src).toContain("plannedEarlyStop:350,plannedRestUnits:12");
    expect(src).toContain("newPaidAuthorization:false");
    expect(flow).toContain("The STOP is NOT yet ARMED");
  });
  it("is valid Node syntax without executing any live mutation",()=>{
    const chk=spawnSync(process.execPath,["--check",scriptPath],
      {encoding:"utf8",timeout:10000});
    expect(chk.status).toBe(0);
    expect(chk.error).toBeUndefined();
  });
});
