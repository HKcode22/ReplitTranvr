"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { createHmac } = require("node:crypto");
const { join } = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const EXPECTED = "5de44ba66d59c26d9e5ef3b339b7f729ca2f3653";
const FAKE_SECRET = "offline-test-only-secret-not-real-1234567890";
const FAKE_DB = "postgresql://offline.invalid/never_connect";
const SOURCE = readFileSync(join(process.cwd(), "scripts/v39_phase2g_stage1_logged_supervisor_v39.ts"), "utf8");

const start = SOURCE.indexOf("type CallbackHealthResultV39 =");
const end = SOURCE.indexOf("\nasync function main()", start);
assert.ok(start >= 0 && end > start, "supervisor health function must exist");

const compiled = ts.transpileModule(SOURCE.slice(start, end), {
  compilerOptions: { target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.None }
}).outputText;

const defaults = {
  wrong_secret_route: [404, {error:"Not found"}],
  published_runtime: [200, {
    schema:"v39.phase2f-workspace-runtime.v1",status:"PASS",git_head:EXPECTED,
    prepaid_route_registered:true,retention_hours:168,provider_mutation:false,
    runtime_owner_mode:"replit-published-deployment",
    managed_replit_workflow:false,published_deployment:true,runtime_durability_class:"autoscale"
  }],
  webhook_secret_binding: [200, {
    schema:"v39.phase2g-webhook-secret-match.v1",status:"PASS",
    provider_call:false,provider_mutation:false,alert_credits_spent:0
  }],
  runtime_db_binding: [200, {
    schema:"v39.phase2g-runtime-db-binding.v1",status:"PASS",
    provider_call:false,provider_mutation:false,database_mutation:false,alert_credits_spent:0
  }]
};

function identify(path) {
  if(path.startsWith("/api/v1/webhooks/")) return "wrong_secret_route";
  if(path==="/__v39/workspace-runtime") return "published_runtime";
  if(path==="/__v39/phase2g/webhook-secret-match") return "webhook_secret_binding";
  if(path==="/__v39/phase2g/runtime-db-binding") return "runtime_db_binding";
  throw new Error("UNEXPECTED_NETWORK_ROUTE:" + path);
}

function makeHarness(overrides = {}, envOverride = {}, mode = "published") {
  const requests = [];
  const fakeFetch = async (input, init={}) => {
    const url = new URL(input);
    assert.equal(url.origin,"https://offline.invalid","no real outbound connection");
    const stage = identify(url.pathname);
    requests.push(stage);
    assert.equal(init.signal instanceof AbortSignal,true,"every health call must be bounded");

    if(stage==="wrong_secret_route") {
      assert.equal(init.method,"POST");
      assert.equal(url.pathname.includes("healthcheck-intentionally-wrong"),true);
      assert.equal(url.pathname.includes("00000000-0000-4000-8000-000000000000"),true);
    }
    if(stage==="webhook_secret_binding") {
      assert.equal(init.headers["x-v39-phase2g-webhook-secret"],FAKE_SECRET);
    }
    if(stage==="runtime_db_binding") {
      const challenge = init.headers["x-v39-phase2g-db-challenge"];
      const proof = init.headers["x-v39-phase2g-db-proof"];
      assert.equal(proof,createHmac("sha256",FAKE_DB)
        .update("phase2g-db-binding:"+challenge).digest("hex"));
    }

    if(overrides[stage]?.throwName) {
      const error = new Error("offline injected error");
      error.name = overrides[stage].throwName;
      throw error;
    }
    const [normalStatus,normalBody] = defaults[stage];
    const status = overrides[stage]?.status ?? normalStatus;
    const body = {...normalBody,...(overrides[stage]?.body ?? {})};
    return {status,json:async()=>body};
  };

  const sandbox = {
    Error,Date,AbortSignal,createHmac,fetch:fakeFetch,
    process:{ env:{
      AERODATABOX_WEBHOOK_SECRET:FAKE_SECRET,
      V39_DATABASE_RUNTIME_URL:FAKE_DB,
      ...envOverride
    }}
  };
  const callbackHealthy = vm.runInNewContext(
    compiled+"\ncallbackHealthy;",sandbox,{timeout:1500}
  );
  return {
    requests,
    run:()=>callbackHealthy("https://offline.invalid",EXPECTED,mode)
  };
}

const cases = [
  {name:"all gates pass",expected:{healthy:true,check:"all_checks",reason:"ok"},requests:4},
  {name:"wrong-secret HTTP 500 rejected",inject:{wrong_secret_route:{status:500}},expected:{healthy:false,check:"wrong_secret_route",reason:"route_contract_mismatch",http_status:500},requests:1},
  {name:"wrong-secret 404 malformed body rejected",inject:{wrong_secret_route:{body:{error:"wrong"}}},expected:{healthy:false,check:"wrong_secret_route",reason:"route_contract_mismatch",http_status:404},requests:1},
  {name:"runtime HTTP 503 rejected",inject:{published_runtime:{status:503}},expected:{healthy:false,check:"published_runtime",reason:"runtime_contract_or_http_mismatch",http_status:503},requests:2},
  {name:"runtime SHA mismatch rejected",inject:{published_runtime:{body:{git_head:"0".repeat(40)}}},expected:{healthy:false,check:"published_runtime",reason:"runtime_contract_or_http_mismatch"},requests:2},
  {name:"runtime owner mode mismatch rejected",inject:{published_runtime:{body:{runtime_owner_mode:"replit-managed-project"}}},expected:{healthy:false,check:"published_runtime",reason:"runtime_contract_or_http_mismatch"},requests:2},
  {name:"runtime flags mismatch rejected",inject:{published_runtime:{body:{published_deployment:false}}},expected:{healthy:false,check:"published_runtime",reason:"runtime_contract_or_http_mismatch"},requests:2},
  {name:"webhook secret HTTP 403 rejected",inject:{webhook_secret_binding:{status:403}},expected:{healthy:false,check:"webhook_secret_binding",reason:"secret_binding_contract_or_http_mismatch",http_status:403},requests:3},
  {name:"webhook secret false-positive response rejected",inject:{webhook_secret_binding:{body:{provider_call:true}}},expected:{healthy:false,check:"webhook_secret_binding",reason:"secret_binding_contract_or_http_mismatch"},requests:3},
  {name:"DB binding HTTP 503 rejected",inject:{runtime_db_binding:{status:503}},expected:{healthy:false,check:"runtime_db_binding",reason:"database_binding_contract_or_http_mismatch",http_status:503},requests:4},
  {name:"DB binding mutation response rejected",inject:{runtime_db_binding:{body:{database_mutation:true}}},expected:{healthy:false,check:"runtime_db_binding",reason:"database_binding_contract_or_http_mismatch"},requests:4},
  {name:"timeout correctly identified",inject:{published_runtime:{throwName:"TimeoutError"}},expected:{healthy:false,check:"published_runtime",reason:"request_timeout",http_status:null},requests:2},
  {name:"abort correctly identified",inject:{runtime_db_binding:{throwName:"AbortError"}},expected:{healthy:false,check:"runtime_db_binding",reason:"request_timeout",http_status:null},requests:4},
  {name:"network error correctly identified",inject:{webhook_secret_binding:{throwName:"TypeError"}},expected:{healthy:false,check:"webhook_secret_binding",reason:"network_or_request_error",http_status:null},requests:3},
  {name:"missing GitHub webhook secret rejected",env:{AERODATABOX_WEBHOOK_SECRET:""},expected:{healthy:false,check:"webhook_secret_binding",reason:"missing_github_binding_environment"},requests:2},
  {name:"missing GitHub DB URL rejected",env:{V39_DATABASE_RUNTIME_URL:""},expected:{healthy:false,check:"webhook_secret_binding",reason:"missing_github_binding_environment"},requests:2},
];

for (const c of cases) {
  test("isolated actual callbackHealthy: "+c.name, async()=>{
    const h=makeHarness(c.inject,c.env);
    const got=await h.run();
    for(const [key,value] of Object.entries(c.expected)) assert.equal(got[key],value,"mismatch in "+key);
    assert.equal(h.requests.length,c.requests);
    assert.equal(Number.isFinite(got.elapsed_ms),true);
    assert.ok(got.elapsed_ms>=0);
    assert.deepEqual([...h.requests],["wrong_secret_route","published_runtime","webhook_secret_binding","runtime_db_binding"].slice(0,c.requests));
  });
}

test("published callback safety policy stays bounded and three-strike fail closed",()=>{
  assert.match(SOURCE,/const CALLBACK_POLL_MS = 15_000/);
  assert.match(SOURCE,/const CALLBACK_CONSECUTIVE_FAILURE_LIMIT = 3/);
  assert.match(SOURCE,/if \(callbackFailureCount >= CALLBACK_CONSECUTIVE_FAILURE_LIMIT && !callbackWatchdogTriggered\)/);
  assert.match(SOURCE,/requestTermination\("SIGTERM", "workspace_callback_unreachable_threshold"\)/);
  assert.match(SOURCE,/callbackFailureCount = callbackHealth\.healthy \? 0 : callbackFailureCount \+ 1/);
});

test("observer and offline fixture cannot accidentally import paid provider API credentials",()=>{
  const workflow=readFileSync(join(process.cwd(),".github/workflows/phase2g-p2g24-zero-credit-observer.yml"),"utf8");
  assert.ok(!workflow.includes("secrets.AERODATABOX_API_KEY"));
  assert.ok(!workflow.includes("createSubscription("));
  assert.ok(!workflow.includes("deleteSubscription("));
  assert.ok(!workflow.includes("getBalance("));
});
