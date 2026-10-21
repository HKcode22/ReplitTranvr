/**
 * Static offline guardrail for GitHub STOP-failure issue escalation.
 * This validates source policy, NOT GitHub token permissions, delivery,
 * owner notification receipt, or an actual independent running workflow.
 */
import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";

const path=".github/workflows/phase3-gate05-independent-stop.yml";
const yaml=readFileSync(path,"utf8");
const split=yaml.split("\n  alert-owner-on-stop-failure:\n");
describe("Gate05 STOP failed-job incident contract, zero provider",()=>{
  it("has one separate, failure-only notification job",()=>{
    expect(split).toHaveLength(2);
    const [safety,incident]=split;
    expect(safety).toContain("safety-only-stop:");
    expect(incident).toContain("needs: safety-only-stop");
    expect(incident).toContain("always()");
    expect(incident).toContain("needs.safety-only-stop.result != 'success'");
    expect(incident).toContain("github.ref == 'refs/heads/main'");
    expect(incident).toContain("issues: write");
    expect(incident).toContain("github.rest.issues.create");
    expect(incident).toContain("assignees:['HKcode22']");
    expect(incident).toContain("Status: **UNCONFIRMED");
    expect(incident).toContain("GATE05_STOP_ALERT_DELIVERY_NOT_ATTESTED");
    expect(safety).not.toContain("issues: write");
  });
  it("does not leak database, signed bundle or provider key to the alert job",()=>{
    const alert=split[1];
    expect(alert).not.toContain("secrets.GATE05_SAFETY_DATABASE_URL");
    expect(alert).not.toContain("secrets.GATE05_SIGNED_BUNDLE_B64");
    expect(alert).not.toContain("secrets.GATE05_INDEPENDENT_PINS_B64");
    expect(alert).not.toContain("secrets.AERODATABOX_API_KEY");
    expect(alert).not.toContain("DATABASE_URL:");
    expect(alert).not.toContain("with: \n          ref:");
  });
  it("cannot mistake issue assignment for independently acknowledged alert",()=>{
    expect(split[1]).toContain("not proof of successful STOP or delivered alert");
    expect(split[1]).toContain("if: failure()");
  });
});