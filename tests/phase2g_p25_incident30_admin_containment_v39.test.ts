import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
const s=readFileSync("scripts/v39_p25_incident30_admin_containment_v39.ts","utf8");
describe("P25 incident30 admin current-risk-only containment, default no mutation",()=>{
 it("uses READ ONLY unless explicit exact operator consent and apply flag",()=>{
   expect(s).toContain('const APPLY=process.argv.includes("--apply")');
   expect(s).toContain('I_APPROVE_ONLY_CURRENT_RISK_CONTAINMENT_OF_INCIDENT_30_KEEP_HISTORICAL_CLEANUP_UNVERIFIED');
   expect(s).toContain('if(APPLY&&!approved)');
   expect(s).toContain('BEGIN TRANSACTION READ ONLY');
   expect(s).toContain('await client.query("ROLLBACK")');
 });
 it("requires exact failed YSSY probe18 and incident30, all 30 retained refs, no billable or open budgets",()=>{
   for(const t of [
     'String(i.id)==="30"','i.cause==="reconciliation"','i.resolved===false',
     'String(metadata.runtimeCleanupVerified)===\"false\"','String(metadata.providerDeleteVerified)===\"true\"',
     'p.status==="failed"','p.duration_censored===true',
     'p.reconciliation_status==="UNRESOLVED"',
     'Number(t.untombstoned_historical_refs)===30','Number(t.open_incidents)===1',
     'Number(t.open_budget_days)===0','activeBillable.length===0'
   ])expect(s).toContain(t);
 });
 it("only marks incident30 administratively contained, preserves cleanup-unverified and no science promotion",()=>{
   expect(s).toContain("WHERE id=30 AND cause='reconciliation' AND resolved=false");
   expect(s).toContain("historicalRuntimeCleanupVerified:false");
   expect(s).toContain("historicalScientificAccepted:false");
   expect(s).toContain("originalThirtyBlobRefsPreserved:true");
   expect(s).toContain("paidYssyAuthorizedByAdminClose:false");
   expect(s).toContain("UPDATE clean.adb_incident_stop");
   expect(s).not.toMatch(/\bDELETE\s+FROM\b|\bTRUNCATE\b|\bUPDATE\s+clean\.adb_anchor_probe\b|\bUPDATE\s+clean\.provider_content_blob_ref\b/i);
   expect(s).toContain('updated.rowCount!==1');
   expect(s).toContain("client.query(\"COMMIT\")");
   expect(s).toContain("paid_yssy_authorized:false");
 });
});
