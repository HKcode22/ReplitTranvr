import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";

const path="scripts/v39_gate05_next_scope_free_prearm_20261028.mjs";
const workflowPath=".github/workflows/phase3-gate05-next-free-prearm.yml";
const source=readFileSync(path,"utf8");
const flow=readFileSync(workflowPath,"utf8");

describe("Gate05 prospective WSSS new-scope FREE planning checks",()=>{
  it("auto starts from reviewed main without timed owner shell entry",()=>{
    expect(flow).toContain("push:");
    expect(flow).toContain("branches: [main]");
    expect(flow).toContain(workflowPath);
    expect(flow).toContain(path);
    expect(flow).not.toMatch(/cron:|schedule:/);
    expect(flow).toContain("environment: phase2g-paid");
    expect(flow).toContain("persist-credentials: false");
    expect(flow).toContain("permissions:\n  contents: read");
  });
  it("never grants a paid action or refills credits",()=>{
    expect(flow).toContain('GATE05_PROVIDER_CREATE_ALLOWED: ""');
    expect(flow).toContain('GH_TOKEN: ""');
    expect(flow).not.toContain("secrets.GATE05_GH_ADMIN_TOKEN");
    expect(flow).not.toContain("secrets.V39_DATABASE_RUNTIME_URL");
    expect(source).toContain('method:"GET"');
    expect(source).toContain('["/subscriptions/balance","/subscriptions/webhook"].includes(path)');
    expect(source).toContain("providerPaidGets:0,providerMutations:0");
    expect(source).toContain("paidCreateAuthorizedByThisCheck:false");
    expect(source).toContain("providerHard500CapExists:false");
    expect(source).not.toMatch(/\bcreateSubscription\s*\(|\brefillBalance\s*\(|\bdeleteSubscription\s*\(/);
    expect(source).not.toContain("gh workflow run");
  });
  it("preserves original 1900-floor vs 500-credit disagreement as reported fact",()=>{
    expect(source).toContain("const REST_BUDGET=12,ALERT_BUDGET=500,SOFT_STOP=350");
    expect(source).toContain("const HISTORICAL_FLOOR=1900");
    expect(source).toContain("old1900FloorCompatibleWith500");
    expect(source).toContain("proposedNewFloorAfterFull500");
    expect(source).toContain("nonterminalScienceOwners===0");
    expect(source).toContain("oldHistoricalOwnerStopped");
    expect(source).toContain("accountBalancesStable");
    expect(source).toContain("activeSubscriptions===0");
    expect(source).toContain("fullSciencePassed:false");
    expect(source).toContain("paidScopeCommissioned:false,stopArmed:false");
  });
  it("keeps owner and V0075 checks PostgreSQL READ ONLY",()=>{
    expect(source).toContain("default_transaction_read_only=on");
    expect(source).toContain("BEGIN TRANSACTION READ ONLY");
    expect(source).toContain('await client.query("ROLLBACK")');
    expect(source).toContain("clean.phase3_gate05_science_owner_v39");
    expect(source).toContain("clean.gate05_science_delivery_custody_v39");
    expect(source).not.toMatch(/\b(INSERT INTO|UPDATE clean|DELETE FROM|CREATE ROLE|CREATE TABLE|GRANT SELECT|ALTER TABLE)\b/i);
  });
  it("parses without executing any network/account operation",()=>{
    const check=spawnSync(process.execPath,["--check",path],{encoding:"utf8",timeout:10000});
    expect(check.status).toBe(0);
    expect(check.error).toBeUndefined();
  });
});
