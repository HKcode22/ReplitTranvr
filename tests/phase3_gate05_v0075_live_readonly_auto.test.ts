import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";

const flowPath=".github/workflows/phase3-gate05-v0075-live-readonly.yml";
const codePath="scripts/v39_gate05_v0075_published_live_readonly_20261028.mjs";
const flow=readFileSync(flowPath,"utf8");
const src=readFileSync(codePath,"utf8");

describe("Gate05 automated published source + Neon V0075 read-only attestation",()=>{
  it("auto-starts on safe main changes with no owner timed shell commands",()=>{
    expect(flow).toContain("push:");
    expect(flow).toContain("branches: [main]");
    expect(flow).toContain(flowPath);
    expect(flow).toContain(codePath);
    expect(flow).toContain("workflow_dispatch:");
    expect(flow).not.toMatch(/cron:|schedule:/);
    expect(flow).toContain("github.ref == 'refs/heads/main'");
    expect(flow).toContain("permissions:\n  contents: read");
  });
  it("uses protected runtime DB secret only in final read-only step",()=>{
    expect(flow).toContain("environment: phase2g-paid");
    expect(flow).toContain("persist-credentials: false");
    expect(flow).toContain("npm ci --omit=dev --ignore-scripts --no-audit --no-fund");
    expect(flow).toContain("secrets.V39_DATABASE_RUNTIME_URL");
    expect(flow).not.toContain("secrets.AERODATABOX_API_KEY");
    expect(flow).not.toContain("secrets.GATE05_AUTOMATION_DATABASE_URL");
    expect(flow).toContain('GH_TOKEN: ""');
    expect(flow).toContain('RAPIDAPI_KEY: ""');
    expect(flow).toContain('AERODATABOX_API_KEY: ""');
    expect(flow).not.toContain("gh workflow run");
  });
  it("authenticates exact published receiver and read-only DB liveness",()=>{
    expect(src).toContain("84b7f1565d0402facc8c3b9aacedc599eb6e2af1");
    expect(src).toContain("gate05_durable_custody_ready");
    expect(src).toContain("gate4_alert_ingress_registered");
    expect(src).toContain("phase2g-db-binding:");
    expect(src).toContain("phase2g-db-live-preflight:");
    expect(src).toContain("createHmac");
    expect(src).toContain("source");
    expect(src).toContain("published_deployment");
    expect(src).toContain("publishedSourceMatches");
    expect(src).toContain("authenticatedDbBinding");
    expect(src).toContain("authenticatedDbLive");
  });
  it("does not turn an uncommissioned Alert ingress into a false database failure",()=>{
    expect(src).toContain("const sourceReady=r.publishedSourceMatches");
    expect(src).toContain("MUST NOT prevent the independent HMAC/DB read-only proof");
    expect(src).toContain("r.alertIngressRegistered;");
    expect(src).toContain("GATE05_V0075_DATABASE_PARITY_PASS_RECEIVER_ADMISSION_HOLD");
    expect(src).toContain("if(!approvedForReceiverSourceAndIngress)process.exitCode=2");
    expect(src.indexOf('r.stage="AUTHENTICATED_PUBLISHED_DB_BINDING"'))
      .toBeLessThan(src.indexOf('const approvedForReceiverSourceAndIngress='));
    expect(src.indexOf('r.stage="POSTGRESQL_RUNTIME_LOGGED_ACL_READONLY"'))
      .toBeLessThan(src.indexOf('const approvedForReceiverSourceAndIngress='));
    expect(src).not.toContain("SOURCE_OR_OPT_IN_HOLD");
  });
  it("proves V0075 logged immutability and minimal privileges with PostgreSQL READ ONLY",()=>{
    expect(src).toContain("default_transaction_read_only=on");
    expect(src).toContain("BEGIN TRANSACTION READ ONLY");
    expect(src).toContain('await db.query("ROLLBACK")');
    expect(src).toContain("to_regclass('clean.gate05_science_delivery_custody_v39')");
    expect(src).toContain("gate05_delivery_custody_immutable_v39");
    expect(src).toContain("has_table_privilege");
    expect(src).toContain("runtimeUpdate===false");
    expect(src).toContain("runtimeDelete===false");
    expect(src).toContain("publicInsert===false");
    expect(src).not.toMatch(/\b(INSERT INTO|UPDATE clean|DELETE FROM|CREATE TABLE|ALTER TABLE|GRANT INSERT|REFILL)\b/i);
    expect(src).not.toContain("AERODATABOX_API_KEY");
    expect(src).not.toContain("createSubscription");
    expect(src).not.toContain("refillBalance");
    expect(src).not.toContain("gh workflow run");
    expect(src).toContain("scienceGate05Passed:false");
  });
  it("parses using native Node without network or credentials",()=>{
    const x=spawnSync(process.execPath,["--check",codePath],{
      encoding:"utf8",timeout:10000
    });
    expect(x.error).toBeUndefined();
    expect(x.status).toBe(0);
  });
});
