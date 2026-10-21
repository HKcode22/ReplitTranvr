/**
 * Test-only GitHub Actions downstream failure-branch contract.
 * NEVER dispatches workflow, accesses DB, or uses AeroDataBox.
 */
import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";

const source=readFileSync(
  ".github/workflows/phase3-gate05-stop-failure-escalation-drill.yml","utf8"
);
const segments=source.split("\n  simulated-failure-incident:\n");
describe("Gate05 isolated no-provider failure-to-issue rehearsal",()=>{
  it("can only run by exact manual main branch confirmation",()=>{
    expect(source).toContain("workflow_dispatch:");
    expect(source).toContain("GATE05_SYNTHETIC_FAILURE_TEST_ONLY");
    expect(source).not.toMatch(/^\s{2}(push|schedule|pull_request|workflow_call):/m);
    expect(source).toContain("github.ref == 'refs/heads/main'");
    expect(source).toContain("github.event_name == 'workflow_dispatch'");
    expect(source).toContain("permissions: {}");
  });
  it("deliberately fails one isolated job and runs second on exact failure",()=>{
    expect(segments).toHaveLength(2);
    const [upstream,downstream]=segments;
    expect(upstream).toContain("simulated-stop-failure:");
    expect(upstream).toContain("exit 42");
    expect(upstream).toContain("GATE05_TEST_ONLY_INTENTIONAL_FAILURE_EXPECTED");
    expect(downstream).toContain("needs: simulated-stop-failure");
    expect(downstream).toContain("always()");
    expect(downstream).toContain("needs.simulated-stop-failure.result == 'failure'");
    expect(downstream).toContain("github.rest.issues.create");
    expect(downstream).toContain("github.rest.issues.get");
    expect(downstream).toContain("assignees:[owner]");
    expect(downstream).toContain("GATE05_SYNTHETIC_FAILURE_ALERT_ACK");
    expect(downstream).toContain("overall workflow conclusion FAILURE");
  });
  it("uses zero production secrets and never references live safety deployment",()=>{
    expect(source).not.toContain("environment: gate05-safety");
    expect(source).not.toContain("AERODATABOX_API_KEY:");
    expect(source).not.toMatch(/\$\{\{\s*secrets\./);
    expect(source).not.toContain("DATABASE_URL:");
    expect(source).not.toContain("node --import");
    expect(source).not.toContain("npx tsx");
    expect(source).not.toContain("curl ");
    expect(source).not.toContain("runs-on: self-hosted");
    const [a,b]=segments;
    expect(a).not.toContain("issues: write");
    expect(b).toContain("issues: write");
    expect(b).toContain("[GATE05 SYNTHETIC STOP FAILURE — TEST ONLY]");
  });
});