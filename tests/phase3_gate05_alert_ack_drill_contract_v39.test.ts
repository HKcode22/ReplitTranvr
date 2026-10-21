/** No provider, no DB, no GitHub dispatch. Source policy regression only. */
import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";

const source=readFileSync(
  ".github/workflows/phase3-gate05-alert-ack-drill.yml","utf8"
);
describe("Gate05 opt-in zero-provider alert ACK drill contract",()=>{
  it("is manual-only with exact owner/main/confirmation guard",()=>{
    expect(source).toContain("workflow_dispatch:");
    expect(source).toContain("GATE05_TEST_NOTIFICATION_ONLY");
    expect(source).toContain("context.ref!=='refs/heads/main'");
    expect(source).toContain("context.eventName!=='workflow_dispatch'");
    expect(source).toContain("context.payload.inputs?.confirmation!==confirm");
    expect(source).not.toMatch(/^\s{2}(push|schedule|pull_request):/m);
    expect(source).not.toContain("workflow_call:");
  });
  it("assigns a clearly labeled harmless issue and reads it back",()=>{
    expect(source).toContain("[GATE05 NOTIFICATION DRILL — TEST ONLY]");
    expect(source).toContain("github.rest.issues.create");
    expect(source).toContain("github.rest.issues.get");
    expect(source).toContain("assignees:[owner]");
    expect(source).toContain("GATE05_ALERT_DRILL_ISSUE_READBACK_OR_ASSIGNEE_HOLD");
    expect(source).toContain("GATE05_TEST_ALERT_ACK_RECEIVED");
    expect(source).toContain("A green workflow alone is NOT delivery.");
    expect(source).toContain("This does not independently prove actual failed-STOP triggers.");
  });
  it("has no provider, database or signed-authorization secret access",()=>{
    expect(source).toContain("permissions: {}");
    expect(source).toContain("issues: write");
    expect(source).not.toContain("AERODATABOX_API_KEY:");
    expect(source).not.toContain("secrets.AERODATABOX_API_KEY");
    expect(source).not.toContain("GATE05_SAFETY_DATABASE_URL:");
    expect(source).not.toContain("secrets.GATE05_SAFETY_DATABASE_URL");
    expect(source).not.toContain("secrets.GATE05_SIGNED_BUNDLE_B64");
    expect(source).not.toContain("secrets.GATE05_INDEPENDENT_PINS_B64");
    expect(source).not.toContain("DATABASE_URL:");
    expect(source).not.toContain("runs-on: self-hosted");
  });
});