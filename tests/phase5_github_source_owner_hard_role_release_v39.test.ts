import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
const read=(p:string)=>readFileSync(p,"utf8");
const wf=read(".github/workflows/phase5-one-reviewed-prospective-fids-get-main-manual.yml");
const owner=read("scripts/v39_phase5_one_query_github_fids_source_owner_v39.ts");
const provision=read("scripts/v39_phase5_source_worker_credential_owner_once.mjs");
describe("Phase5 one-source live owner: release and least-privilege provenance",()=>{
 it("requires exact main-only manual, confirmed single GET and no auto schedule",()=>{
  expect(wf).toContain("workflow_dispatch:");
  expect(wf).not.toMatch(/\n  schedule:/);
  expect(wf).not.toMatch(/\n  pull_request:/);
  expect(wf).not.toMatch(/\n  push:/);
  expect(wf).toContain("github.ref == 'refs/heads/main'");
  expect(wf).toContain("ONE_PAID_FIDS_GET_MAX_2_API_UNITS_NO_PHASE6");
  expect(wf).toContain('test "$GITHUB_RUN_ATTEMPT" = 1');
  expect(wf).toContain("cancel-in-progress: false");
  expect(wf).toContain("persist-credentials: false");
 });
 it("gets real release proofs from secrets, not self-approved hardcoded literals",()=>{
  for(const variable of [
   "V39_P5_SOURCE_OWNER_APPROVED","V39_PHASE5_FREEZE_SIGNED",
   "V39_PHASE5_SOURCE_RIGHTS_APPROVED",
   "V39_P5_APPROVED_CODE_SHA","V39_P5_SIGNED_QUERY_JSON_SHA256",
   "V39_P5_MANIFEST_SHA256","V39_P5_QUERY_DIGEST",
   "V39_P5_RELEASE_SHA256","V39_P5_RIGHTS_SHA256",
   "V39_P5_SOURCE_DB_ROLE_REVIEWED","V39_P5_SOURCE_DATABASE_URL"
  ]){
   expect(wf).toContain(variable+": ${{ secrets."+variable+" }}");
  }
  expect(wf).toContain("AERODATABOX_API_KEY: ${{ secrets.AERODATABOX_API_KEY }}");
  expect(wf).toContain("ADB_AUTO_COLLECT: '0'");
  expect(wf).toContain("V39_PHASE6_PROCESS_ARMED: '0'");
  expect(wf).not.toContain("secrets.DATABASE_URL");
 });
 it("forces dedicated PG16 role-bound source pool BEFORE prearm and paid fetch",()=>{
  expect(owner).toContain("makeP5Stage28DedicatedRolePool(rawPool,");
  expect(owner).toContain('group:"source"');
  expect(owner).toContain('reviewedDedicatedLogin:"phase5_p5_source_login_20261108"');
  expect(owner).toContain("pool:scoped,manifestSha256");
  expect(owner).toContain("scopedPool:scoped as unknown as Pool");
  expect(owner).not.toContain("scopedPool:pool");
  expect(owner).not.toContain("pool:rawPool");
  expect(owner.indexOf("makeP5Stage28DedicatedRolePool")).toBeLessThan(
    owner.indexOf("prearmP5V0080ActualGitHubRun({"));
  expect(owner).toContain("const outcome=await runP5ScopedFidsSource(plan,ports)");
 });
 it("source login commissioner never prints passwords, invokes provider or self-triggers",()=>{
  expect(provision).toContain("NOREPLICATION NOBYPASSRLS PASSWORD");
  expect(provision).toContain("WITH SET TRUE, INHERIT FALSE, ADMIN FALSE");
  expect(provision).toContain('secret:"V39_P5_SOURCE_DATABASE_URL"');
  expect(provision).toContain("sourceContentsRightsCertified:false");
  expect(provision).toContain("paidSourceWorkerActivated:false");
  expect(provision).toContain("providerFidsGets:0");
  expect(provision).toContain("if(process.env.P5_SOURCE_CREDENTIAL_ONCE)await main()");
 });
});
