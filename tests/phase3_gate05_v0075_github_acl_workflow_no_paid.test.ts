import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";

const path=".github/workflows/phase3-gate05-v0075-acl-readonly.yml";
const workflow=readFileSync(path,"utf8");
const diagnostic=readFileSync(
  "scripts/v39_gate05_v0075_runtime_acl_readonly_20261028.mjs","utf8"
);

describe("Gate05 V0075 GitHub-hosted no-provider permission diagnosis",()=>{
  it("starts automatically only when reviewed diagnostic files reach main",()=>{
    expect(workflow).toContain("push:");
    expect(workflow).toContain("branches: [main]");
    expect(workflow).toContain(`- "${path}"`);
    expect(workflow).toContain(
      '- "scripts/v39_gate05_v0075_runtime_acl_readonly_20261028.mjs"'
    );
    expect(workflow).toContain("READONLY_GATE05_V0075_ACL_NO_PROVIDER_NO_DDL");
    expect(workflow).not.toMatch(/schedule:\s*\n|cron:/);
    expect(workflow).toContain("github.ref == 'refs/heads/main'");
    expect(workflow).toContain("permissions:\n  contents: read");
  });
  it("isolates existing protected DB credentials to the final read-only step",()=>{
    expect(workflow).toContain("environment: phase2g-paid");
    expect(workflow).toContain("persist-credentials: false");
    expect(workflow).toContain("npm ci --omit=dev --ignore-scripts --no-audit --no-fund");
    const credentialStep=workflow.indexOf("name: Exactly pinned PostgreSQL READ ONLY");
    expect(credentialStep).toBeGreaterThan(0);
    expect(workflow.indexOf("secrets.GATE05_AUTOMATION_DATABASE_URL")).toBeGreaterThan(credentialStep);
    expect(workflow.indexOf("secrets.V39_DATABASE_RUNTIME_URL")).toBeGreaterThan(credentialStep);
    expect(workflow).not.toContain("secrets.AERODATABOX_API_KEY");
    expect(workflow).not.toContain("secrets.GATE05_GH_ADMIN_TOKEN");
    expect(workflow).toContain('GH_TOKEN: ""');
    expect(workflow).toContain('AERODATABOX_API_KEY: ""');
    expect(workflow).toContain("node --check scripts/v39_gate05_v0075_runtime_acl_readonly_20261028.mjs");
    expect(workflow).toContain("node scripts/v39_gate05_v0075_runtime_acl_readonly_20261028.mjs");
  });
  it("uses catalog READ ONLY, never DDL/paid request",()=>{
    expect(diagnostic).toContain("default_transaction_read_only=on");
    expect(diagnostic).toContain("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    expect(diagnostic).toContain('await db.query("ROLLBACK")');
    expect(diagnostic).not.toMatch(/\b(?:CREATE\s+TABLE|ALTER\s+TABLE|INSERT\s+INTO|DELETE\s+FROM|GRANT\s+INSERT|UPDATE\s+clean)\b/i);
    expect(diagnostic).not.toContain("AERODATABOX_API_KEY");
    expect(workflow).not.toContain("gh workflow run");
    expect(workflow).not.toContain("publish_app");
  });
});
