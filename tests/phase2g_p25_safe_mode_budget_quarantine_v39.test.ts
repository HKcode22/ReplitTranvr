import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
const s=readFileSync("scripts/v39_p25_safe_mode_budget_uncertainty_quarantine_v39.ts","utf8");
describe("P25 prepaid safe-mode historical budget quarantine",()=>{
 it("cannot mutate until independent exact operator consent and apply flag",()=>{
   expect(s).toContain('const APPLY=process.argv.includes("--apply")');
   expect(s).toContain('I_APPROVE_QUARANTINE_EXACT_FAILED_P2G24_BUDGET_AS_MISMATCH_NOT_RECONCILED');
   expect(s).toContain('if(APPLY&&process.env.P25_EXACT_OLD_BUDGET_QUARANTINE_CONSENT!==REQUIRED)');
   expect(s).toContain('APPLY?"BEGIN":"BEGIN TRANSACTION READ ONLY"');
   expect(s).toContain('await client.query("ROLLBACK")');
 });
 it("requires exactly failed pre-paid safe-mode probe18 with 500 reserved and both credits NULL",()=>{
   expect(s).toContain('const DAY="P2G-S1-20261009-23"');
   expect(s).toContain('const SESSION="6267293e-75a0-42a7-b977-89543f200ebc"');
   for(const x of [
    'probes.length===1&&p.probe_id===18',
    'p.status==="failed"&&p.duration_censored===true',
    'p.reconciliation_status==="UNRESOLVED"',
    'p.provider_content_safe_mode===true&&Number(p.reserved_credits)===500',
    'p.credits_spent==null&&p.internal_send_credits==null',
    'Number(totals.open_days)===1',
    'Number(totals.retained_refs)===30',
    'active.length===0',
    'i.resolved===true'
   ])expect(s).toContain(x);
 });
 it("never converts unknown spend to zero or scientific MATCH",()=>{
   expect(s).toContain("SET state='MISMATCH',closed_at=clock_timestamp()");
   expect(s).toContain("old_reconciliation_status:\"UNRESOLVED\"");
   expect(s).toContain("historical_credit_totals_left_null:true");
   expect(s).toContain("actual_provider_credit_spend_verified:false");
   expect(s).toContain("new_paid_stage1_authorized:false");
   expect(s).not.toMatch(/\bUPDATE\s+clean\.adb_anchor_probe\b|\bDELETE\s+FROM\b|\bUPDATE\s+clean\.provider_content_blob_ref\b/i);
 });
});
