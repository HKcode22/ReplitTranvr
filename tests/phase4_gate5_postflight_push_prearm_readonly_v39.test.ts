import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";

const newPath=".github/workflows/phase4-wsss-postflight-push-prearm-20261031.yml";
const oldPath=".github/workflows/phase4-gate5-wsss-postwindow-outcomes-readonly.yml";
const source="scripts/v39_gate5_source_inventory_readonly_actions.ts";
const read=(p:string)=>readFileSync(p,"utf8");
describe("Oct31 Phase4 read-only protected after-flight GitHub push prearm",()=>{
 it("uses one push event and exactly two bounded sequential same-day audit jobs",()=>{
  const y=read(newPath);
  expect(y).toContain("on:\n  push:\n    branches: [main]");
  expect(y).toContain('".github/workflows/phase4-wsss-postflight-push-prearm-20261031.yml"');
  expect(y).not.toContain("workflow_dispatch");
  expect(y).not.toContain("on:\n  schedule:");
  expect(y).toContain("timeout-minutes: 350");
  expect(y).toContain("timeout-minutes: 340");
  expect(y).toContain("needs: [early-postflight-audit]");
  expect(y).toContain("always() && github.event_name == 'push'");
  expect(y).toContain("github.run_attempt == 1");
  expect(y).toContain("GITHUB_WORKFLOW_REF");
  expect(y).toContain("2026-10-31T19:15:00+00:00");
  expect(y).toContain("2026-10-31T22:15:00+00:00");
  expect(y.match(/node --import tsx scripts\/v39_gate5_source_inventory_readonly_actions.ts/g)).toHaveLength(2);
  expect(y.match(/time\.time\(\)<target/g)).toHaveLength(2);
 });
 it("cannot invoke paid AeroDataBox or any write transaction",()=>{
  const y=read(newPath),s=read(source),old=read(oldPath);
  expect(y).not.toContain("secrets.AERODATABOX_API_KEY");
  expect(y).not.toContain("scripts/v39_phase4_one_prospective_fids_paid_actions.ts");
  expect(y).not.toContain("P4_ONE_FIDS_EXACT_INTENT");
  expect(y).not.toContain("P4_FIDS_SCHEDULE_CRON:");
  expect(y.match(/test -z "\$\{AERODATABOX_API_KEY:-\}"/g)).toHaveLength(4);
  expect(y.match(/GATE05_AUTOMATION_DATABASE_URL: \$\{\{ secrets.GATE05_AUTOMATION_DATABASE_URL \}\}/g)).toHaveLength(2);
  expect(y).toContain("group: phase4-wsss-postflight-push-prearm-no-provider");
  expect(old).toContain('cron: "15 19 31 10 *"');
  expect(old).toContain('cron: "15 22 31 10 *"');
  expect(s).toContain("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  expect(s).toContain("ROLLBACK");
  expect(s).not.toContain("fetchFidsAirport");
 });
 it("logs actual as-of results, no premature/late audit or scientific promotion",()=>{
  const y=read(newPath);
  expect(y.match(/if not target <= time\.time\(\) <= target\+4\*3600:/g)).toHaveLength(2);
  expect(y).toContain("P4_EARLY_POSTFLIGHT_REAL_AUDIT_DATE_HOLD");
  expect(y).toContain("P4_LATER_POSTFLIGHT_REAL_AUDIT_DATE_HOLD");
  expect(y).toContain("strict Gate5 PASS false");
  expect(y).toContain("No Phase5 freeze or Phase6 authorization");
 });
});