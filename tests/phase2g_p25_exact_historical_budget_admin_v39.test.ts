import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
const s=readFileSync("scripts/v39_p25_exact_historical_budget_closeout_v39.ts","utf8");
describe("P25 old budget closeout separates admin accounting from failed science",()=>{
 it("only permits exact one historical YSSY failed probe and exact OPEN budget",()=>{
  for(const marker of [
   'const BUDGET="P2G-S1-20261009-23"',
   'const SESSION="6267293e-75a0-42a7-b977-89543f200ebc"',
   'Number(totals.open_budgets)===1',
   'probes.length===1&&p.probe_id===18',
   'p.status==="failed"&&p.reconciliation_status==="UNRESOLVED"',
   'Number(totals.preserved_old_refs)===30',
   'Number(totals.unresolved_incidents)===0',
   'String(i.id)==="30"','i.resolved===true&&i.old_cleanup==="false"'
  ])expect(s).toContain(marker);
 });
 it("requires fresh operator consent and refuses missing spent, fractional cost, cap overage",()=>{
  expect(s).toContain('process.argv.includes("--apply")');
  expect(s).toContain('P25_BUDGET_CLOSE_CONSENT');
  expect(s).toContain('if(APPLY&&process.env.P25_BUDGET_CLOSE_CONSENT!==PHRASE)');
  expect(s).toContain("max_budget_exposure:exposure");
  expect(s).toContain("exposure!==null&&exposure<=500");
  expect(s).toContain("Number.isSafeInteger(Number(s))");
  expect(s).toContain('await c.query("BEGIN TRANSACTION READ ONLY")');
 });
 it("uses established budget close helper, does not write probe or scientific rows",()=>{
  expect(s).toContain("await closeProbeBudgetDay(BUDGET)");
  expect(s).toContain('checked.rows[0].state!=="CLOSED"');
  expect(s).toContain('old_science_reconciliation_preserved:"UNRESOLVED"');
  expect(s).toContain("paid_stage1_authorized:false");
  expect(s).not.toMatch(/\bDELETE FROM\b|\bUPDATE clean\.adb_anchor_probe\b|\bUPDATE clean\.provider_content_blob_ref\b/);
 });
});
