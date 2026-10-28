import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {describe,it,expect} from "vitest";
const ddl=readFileSync("migrations/staged/V0075__gate05_logged_delivery_custody_v39.sql","utf8");
const install=readFileSync("scripts/v39_gate05_v0075_release_install_once_20261028.mjs","utf8");
const build=readFileSync("scripts/v39_gate4_reviewed_source_build_v39.sh","utf8");
describe("Gate05 no-paid source-pinned V0075 published receiver release",()=>{
  it("recognizes PG16 canonical search_path formatting without accepting extra GUC settings",()=>{
    // This used to reject legitimate PostgreSQL catalog proconfig strings
    // like "search_path=pg_catalog, clean" and roll back the transaction.
    const exact=(entry:unknown[])=>entry.length===1&&
      typeof entry[0]==="string"&&
      entry[0].replace(/\s*,\s*/g,",")==="search_path=pg_catalog,clean";
    expect(exact(["search_path=pg_catalog, clean"])).toBe(true);
    expect(exact(["search_path=pg_catalog,clean"])).toBe(true);
    expect(exact(["search_path=public, pg_catalog"])).toBe(false);
    expect(exact(["search_path=pg_catalog, clean","statement_timeout=0"])).toBe(false);
    expect(exact([])).toBe(false);
    expect(install).toContain("normalizedProconfig.length!==1");
    expect(install).toContain('normalizedProconfig[0]!=="search_path=pg_catalog,clean"');
    expect(install).toContain("x.replace(/\\s*,\\s*/g");
    expect(install).not.toContain('x==="search_path=pg_catalog,clean"');
  });
  it("supports one native node stdin operator and survives syntax checks",()=>{
    const j=spawnSync(process.execPath,[
      "--check","scripts/v39_gate05_v0075_release_install_once_20261028.mjs"
    ],{encoding:"utf8",timeout:10000});
    expect(j.error).toBeUndefined();
    expect(j.status).toBe(0);
  });
  it("proves old source is retired only after exact original reviewed receiver tree check",()=>{
    expect(build).toContain("PIN=84b7f1565d0402facc8c3b9aacedc599eb6e2af1");
    expect(build).toContain('git diff --quiet "$PIN" HEAD --');
    expect(build).toContain('git merge-base --is-ancestor "$PIN" HEAD');
    expect(build).toContain('V39_BUILD_GIT_HEAD="$PIN" npm run build');
    expect(build).toContain("--verify-only");
    const replit=readFileSync(".replit","utf8");
    expect(replit).toContain('"V39_GATE05_DURABLE_CUSTODY_REQUIRED=1"');
    expect(build).toContain('git show "$PIN:.replit"');
    expect(build).toContain('cmp -s - .replit');
    expect(build).toContain('edits!=1');
    expect(build).toContain("OLD_RUN=");
    expect(build).toContain("NEW_RUN=");
    expect(build).not.toContain("PIN=1885703c04ba8f24bf8d1183f873eb86d1f83d7c");
  });
  it("keeps minimal runtime INSERT rights and guarded immutable metadata only",()=>{
    expect(ddl).toContain("SECURITY DEFINER");
    expect(ddl).toContain("SET search_path=pg_catalog,clean");
    expect(ddl).toContain("REVOKE ALL ON FUNCTION");
    expect(ddl).toContain("REVOKE ALL ON TABLE");
    expect(ddl).toContain("IF TG_OP<>'INSERT'");
    expect(ddl).toContain("GATE05_CUSTODY_SOURCE_REF_MISMATCH");
    expect(ddl).toContain("http_2xx_delivery_verified BOOLEAN NOT NULL DEFAULT FALSE");
    expect(ddl).not.toMatch(/GRANT\s+ALL/i);
    expect(install).toContain("GRANT INSERT ON TABLE");
    expect(install).not.toContain("GRANT UPDATE");
    expect(install).not.toContain("GRANT DELETE");
    expect(install).toContain("has_table_privilege");
    expect(install).toContain("aclexplode");
  });
  it("blocks production migration without explicit source pin + consent + immutable historical state",()=>{
    for(const s of [
      "INSTALL_REVIEWED_V0075_ONE_DB_NO_PROVIDER",
      "GATE05_V0075_REVIEWED_MAIN_SHA",
      "GATE05_V0075_APPLY",
      "GITHUB_MAIN_MOVED",
      "EXACT_FETCH_PIN",
      "WRONG_OR_REPLICA_DATABASE",
      "UNREVIEWED_DB_OWNER_OR_REPLICA",
      "HISTORICAL_OWNER_OR_NEW_SCOPE_NOT_SETTLED",
      "CUSTODY_JOURNAL_IS_NOT_DURABLE_LOGGED_TABLE",
      "STAGED_PRECONDITION_ALREADY_PRESENT_OR_MISSING",
      "COMMIT_OUTCOME_UNCONFIRMED_RECHECK_READONLY_NO_RETRY",
      "BEGIN",
      "ROLLBACK"
    ]){
      if(s==="WRONG_OR_REPLICA_DATABASE"||
         s==="CUSTODY_JOURNAL_IS_NOT_DURABLE_LOGGED_TABLE")continue;
      expect(install).toContain(s);
    }
    expect(install).not.toContain("AERODATABOX_API_KEY");
    expect(install).not.toContain("createGate4SingleWithRawReceiptV39");
    expect(install).not.toContain("deleteSubscriptionVerifiedStrict");
    expect(install).not.toContain("gh workflow run");
  });
});
