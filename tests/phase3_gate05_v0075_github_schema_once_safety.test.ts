import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";

const release=readFileSync(
  ".github/workflows/phase3-gate05-v0075-schema-once.yml","utf8"
);
const installer=readFileSync(
  "scripts/v39_gate05_v0075_release_install_once_20261028.mjs","utf8"
);

describe("V0075 one-use GitHub-only schema release safety",()=>{
  it("requires one explicit reviewed-main protected dispatch, never push/cron",()=>{
    expect(release).toContain("workflow_dispatch:");
    expect(release).not.toContain("\n  push:");
    expect(release).not.toContain("\n  schedule:");
    expect(release).toContain("permissions:\n  contents: read");
    expect(release).toContain("environment: phase2g-paid");
    expect(release).toContain("GITHUB_RUN_ATTEMPT");
    expect(release).toContain("INSTALL_REVIEWED_V0075_ONE_DB_NO_PROVIDER");
    expect(release).toContain("reviewed_main_sha:");
    expect(release).toContain('test "${EXPECTED}" = "${GITHUB_SHA}"');
    expect(release).toContain('test "$(git rev-parse FETCH_HEAD)" = "${EXPECTED}"');
    expect(release).toContain("persist-credentials: false");
  });
  it("exposes only DB secrets after no-script dependency install",()=>{
    expect(release).toContain("npm ci --omit=dev --ignore-scripts --no-audit --no-fund");
    const install=release.indexOf("name: One explicit transactional production V0075 DDL only");
    expect(install).toBeGreaterThan(0);
    expect(release.indexOf("secrets.GATE05_AUTOMATION_DATABASE_URL")).toBeGreaterThan(install);
    expect(release.indexOf("secrets.V39_DATABASE_RUNTIME_URL")).toBeGreaterThan(install);
    expect(release).not.toContain("secrets.AERODATABOX_API_KEY");
    expect(release).not.toContain("secrets.GATE05_GH_ADMIN_TOKEN");
    expect(release).toContain('AERODATABOX_API_KEY: ""');
    expect(release).toContain('GH_TOKEN: ""');
    expect(release).not.toContain("gh workflow run");
    expect(release).not.toContain("publish_app");
  });
  it("verifies exact transaction and independently checks COMMIT read-only",()=>{
    expect(installer).toContain('await db.query("BEGIN")');
    expect(installer).toContain('await db.query("COMMIT")');
    expect(installer).toContain('await db.query("ROLLBACK")');
    expect(installer).toContain("REVOKE UPDATE, DELETE ON TABLE ");
    expect(release).toContain("node scripts/v39_gate05_v0075_release_install_once_20261028.mjs");
    expect(release).toContain("if: always()");
    expect(release).toContain("BEGIN TRANSACTION READ ONLY");
    expect(release).toContain("default_transaction_read_only=on");
    expect(release).toContain("V0075_POST_COMMIT_MINIMAL_ACL_VERIFIED");
    expect(release).toContain("HOLD_POST_ATTEMPT_CATALOG_NOT_READY");
    expect(release).toContain("result.runtimeUpdate");
    expect(release).toContain("result.runtimeDelete");
    expect(release).toContain("result.publicInsert");
  });
});
