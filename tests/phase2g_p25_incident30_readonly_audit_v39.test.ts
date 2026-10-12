import {readFileSync} from "node:fs";
import ts from "typescript";
import {describe,it,expect} from "vitest";

/** No DB connection or provider import: inspect the actual CLI source as AST. */
const source=readFileSync(
  "scripts/v39_phase2g_p25_incident30_readonly_audit_v39.ts","utf8"
);
const tree=ts.createSourceFile(
  "incident30.ts",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS
);
function staticQueries():string[]{
  const result:string[]=[];
  const visit=(node:ts.Node):void=>{
    if(ts.isCallExpression(node)&&
      node.expression.getText(tree)==="client.query"&&node.arguments.length){
      const arg=node.arguments[0];
      if(ts.isStringLiteral(arg)||ts.isNoSubstitutionTemplateLiteral(arg))
        result.push(arg.text.trim());
      else throw Error("P25_INCIDENT_AUDIT_NONSTATIC_SQL");
    }
    ts.forEachChild(node,visit);
  };
  visit(tree);
  return result;
}
describe("P25 exact incident30 read-only audit has zero paid/live mutations",()=>{
  it("all SQL is static SELECT, BEGIN READ ONLY or ROLLBACK; no cleanup or migration SQL",()=>{
    const q=staticQueries();
    expect(q.length).toBeGreaterThanOrEqual(6);
    expect(q[0]).toBe("BEGIN TRANSACTION READ ONLY");
    expect(q).toContain("ROLLBACK");
    for(const sql of q)
      expect(sql).toMatch(/^(?:SELECT\b|BEGIN TRANSACTION READ ONLY$|ROLLBACK$)/i);
    expect(q.join("\n")).not.toMatch(/\b(?:DELETE|INSERT|UPDATE|ALTER|CREATE|DROP|TRUNCATE|COMMIT|CALL)\s+/i);
  });
  it("inspects historical exact probe/session and treats UNLOGGED absence as unknown",()=>{
    expect(source).toContain("const HISTORICAL_PROBE_ID=18;");
    expect(source).toContain("const HISTORICAL_INCIDENT_ID=30;");
    expect(source).toContain('probe.rows[0]?.icao==="YSSY"');
    expect(source).toContain("missing_unlogged_runtime_is_not_cleanup_proof:runtime?.rowCount===0");
    expect(source).toContain("to_regclass('clean.phase2g_cleanup_journal_v39')");
    expect(source).toContain("to_regclass('clean.phase2g_prepaid_source_intent_v39')");
    expect(source).toContain("v0064_source_immutability_trigger_enabled:present.v0064_guard_trigger_enabled===true");
    expect(source).toContain("tg.tgenabled='O'");
  });
  it("never authorizes closure, evidence deletion, scientific promotion or paid YSSY",()=>{
    for(const field of [
      "retained_object_bytes_verified_now:false",
      "provider_deletion_reverified_now:false",
      "incident_closure_authorized:false",
      "early_original_deletion_authorized:false",
      "prior_failed_science_reclassification_authorized:false",
      "paid_yssy_go_authorized:false",
      "provider_calls:0",
      "provider_mutations:0",
      "storage_reads:0",
      "storage_mutations:0",
      "database_mutations:0",
      "alert_credits_spent:0"
    ]) expect(source).toContain(field);
    expect(source).not.toMatch(/from\s+["'].*(?:aerodataboxLimiter|providerBlobStore|replitProviderBlobStore)/);
    expect(source).not.toContain("deleteProviderBlobAtExpiryV39(");
    expect(source).not.toContain("cleanupPrepaidProbeSessionV39(");
  });
});
