import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
const source=readFileSync("scripts/v39_phase2g_verify_live_callback_v39.ts","utf8");
describe("P25 published signed POST executable never uses unreviewed old image",()=>{
 it("uses exact PUBLIC published SHA and contract BEFORE even a disposable SQL session is armed",()=>{
  const i=source.indexOf('if(!isDevContingency){');
  const veto=source.indexOf('REFUSED:PUBLISHED_RUNTIME_GIT_HEAD_OR_CONTRACT_MISMATCH');
  const incident=source.indexOf('const incidents = await pool.query(');
  const arm=source.indexOf('const session = await armPrepaidProbeSessionV39(');
  const post=source.indexOf('accepted = await fetch(');
  expect(i).toBeGreaterThan(0);
  expect(source.slice(i,veto)).toContain('String(j?.git_head??"").toLowerCase()!==expectedHead');
  expect(source.slice(i,veto)).toContain('j?.published_deployment!==true');
  expect(source.slice(i,veto)).toContain('j?.prepaid_route_registered!==true');
  expect(veto).toBeGreaterThan(i);
  expect(veto).toBeLessThan(incident);
  expect(veto).toBeLessThan(arm);
  expect(veto).toBeLessThan(post);
 });
 it("requires signed payload, exact bytes and 8s budget after release parity",()=>{
  expect(source).toContain('PHASE2G_CALLBACK_ADMISSION_BUDGET_MS = 8_000');
  expect(source).toContain('REFUSED:PUBLISHED_RUNTIME_GIT_HEAD_OR_CONTRACT_MISMATCH');
  expect(source).toContain('provider_called: false');
  expect(source).toContain('provider_subscription_created: false');
 });
});
