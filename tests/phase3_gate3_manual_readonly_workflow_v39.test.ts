import {readFileSync} from "node:fs";
import {join} from "node:path";
import {describe,expect,it} from "vitest";

const file=()=>readFileSync(join(process.cwd(),
  ".github/workflows/phase3-gate3-owner-readonly.yml"),"utf8");

describe("Phase3 GitHub Actions: manual exact owner admission NEVER paid",()=>{
  it("exposes one manual dispatch and no scheduled, push or PR side entrance",()=>{
    const y=file();
    expect(y).toMatch(/^on:\n {2}workflow_dispatch:/m);
    expect(y).not.toMatch(/^ {2}(?:push|pull_request|schedule|repository_dispatch|workflow_run):/m);
    expect(y).toContain("github.ref == 'refs/heads/main'");
    expect(y).toContain("inputs.confirm == 'READ_ONLY_GATE3_NO_PROVIDER'");
    expect(y).toContain('group: phase3-gate3-readonly-admission');
    expect(y).toContain("cancel-in-progress: false");
    expect(y).toContain("permissions:\n  contents: read");
  });
  it("pins exact committed head, AUTH bytes by tracked path, and own no-go",()=>{
    const y=file();
    expect(y).toContain('[[ "$REVIEWED_HEAD" == "$GITHUB_SHA" ]]');
    expect(y).toContain("git ls-files --error-unmatch");
    expect(y).toContain("v39:gate3:owner:read-only");
    expect(y).toContain("V39_DATABASE_RUNTIME_URL:");
    expect(y).toContain("environment: phase3-readonly");
    expect(y).toContain("NOT a paid launch");
    expect(y).toContain("No provider balance or financial source custody was checked.");
  });
  it("cannot invoke the old paid collector, AeroDataBox SDK or writable SQL",()=>{
    const y=file();
    for(const prohibited of [
      "AERODATABOX_API_KEY",
      "scripts/credit_canary.ts",
      "v39:gate3:canary",
      "RUN_PAID",
      "createSubscription(",
      "deleteSubscription(",
      "BEGIN\n",
      "ON: schedule",
      " --apply",
    ]){
      expect(y).not.toContain(prohibited);
    }
    expect(y).not.toMatch(/^\s+- name: Run exact paid owner/m);
  });
});
