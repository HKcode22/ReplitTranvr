import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {requireP4FidsOriginalReadbackActionsContext}
 from "../scripts/v39_gate5_decoded_fids_readback_actions";
import {P4_FIDS_DECODED_READBACK_SQL_V39}
 from "../server/lib/disruption/phase4Gate5DecodedFidsReadback_v39";

const allowed={
 GITHUB_ACTIONS:"true",GITHUB_REF:"refs/heads/main",
 GITHUB_EVENT_NAME:"push",GITHUB_RUN_ATTEMPT:"1",
 GITHUB_SHA:"a".repeat(40),
 P4_FIDS_READBACK_EXACT_INTENT:"GATE5_FIDS_BODY_RETENTION_SCOPED_READONLY_NO_PROVIDER"
} as NodeJS.ProcessEnv;
describe("Phase4 protected production source-body readback auto-owner",()=>{
 it("accepts only exact main push with explicit metadata-only intent",()=>{
  expect(requireP4FidsOriginalReadbackActionsContext(allowed).airports)
   .toEqual(["WSSS","YSSY"]);
  for(const update of [
    {GITHUB_ACTIONS:"false"},{GITHUB_REF:"refs/heads/evil"},
    {GITHUB_EVENT_NAME:"workflow_dispatch"},{GITHUB_RUN_ATTEMPT:"2"},
    {GITHUB_SHA:"fake"},{P4_FIDS_READBACK_EXACT_INTENT:"SPEND_PAID"}
  ]){
    expect(()=>requireP4FidsOriginalReadbackActionsContext({...allowed,...update}))
     .toThrow("P4_FIDS_READBACK_ACTIONS_CONTEXT_HOLD");
  }
 });
 it("limits live source reads to a project hard 24h ceiling even if expiry worker delayed",()=>{
  expect(P4_FIDS_DECODED_READBACK_SQL_V39)
   .toContain("raw_expired_at_utc IS NULL");
  expect(P4_FIDS_DECODED_READBACK_SQL_V39)
   .toContain("raw_persisted_at_utc >= $2::timestamptz - interval '24 hours'");
  expect(P4_FIDS_DECODED_READBACK_SQL_V39)
   .toContain("LIMIT 5");
  expect(P4_FIDS_DECODED_READBACK_SQL_V39)
   .not.toMatch(/\b(?:UPDATE|INSERT|DELETE|CREATE|TRUNCATE)\b/i);
 });
 it("requires the existing protected environment; never forwards provider secrets",()=>{
  const workflow=readFileSync(".github/workflows/phase4-gate5-protected-fids-original-readback.yml","utf8");
  const script=readFileSync("scripts/v39_gate5_decoded_fids_readback_actions.ts","utf8");
  expect(workflow).toContain("environment: phase2g-paid");
  expect(workflow).toContain("permissions:\n  contents: read");
  expect(workflow).toContain("GATE05_AUTOMATION_DATABASE_URL");
  expect(workflow).not.toContain("AERODATABOX_API_KEY");
  expect(workflow).not.toContain("AERODATABOX_ALERT");
  expect(workflow).toContain('test "$(git rev-parse HEAD)" = "$GITHUB_SHA"');
  expect(script).toContain("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  expect(script).toContain('client.query("ROLLBACK")');
  expect(script).not.toContain("fetchFidsAirport");
  expect(script).not.toContain("createSubscription");
  expect(script).toContain("strictGate5Passed:false");
  expect(script).toContain("phase6Authorized:false");
 });
});
