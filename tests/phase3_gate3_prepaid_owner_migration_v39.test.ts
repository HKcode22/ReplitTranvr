import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
import {loadMigrationFilesV39,planPendingMigrationsV39}
  from "../server/lib/disruption/schemaMigration_v39";
const name="V0065__phase3_gate3_prepaid_canary_owner_v39.sql";
const sql=readFileSync(`migrations/current/${name}`,"utf8");
describe("Phase3 Gate3 additive SQL is owned, logged and NO paid authorization",()=>{
  it("keeps historical owner kind, adds independent canary kind and positive guard",()=>{
    expect(sql).toContain("DROP CONSTRAINT prepaid_probe_session_runtime_owner_kind_check");
    expect(sql).toContain("DROP CONSTRAINT prepaid_probe_session_runtime_check2");
    for(const required of [
      "'phase2_safety_smoke'","'anchor_probe'","'phase3_credit_canary'",
      "owner_probe_id IS NULL","stage IS NULL",
      "icao ~ '^[A-Z]{4}$'",
    ])expect(sql).toContain(required);
    expect(sql).not.toMatch(/DROP TABLE|TRUNCATE|DELETE FROM/i);
  });
  it("requires independent logged receipt and evidence; no raw body or secret",()=>{
    expect(sql).toContain("CREATE TABLE clean.phase3_gate3_canary_owner_v39");
    expect(sql).not.toContain("CREATE UNLOGGED TABLE clean.phase3");
    for(const s of [
      "session_id UUID PRIMARY KEY",
      "authorization_evidence_sha256 TEXT NOT NULL",
      "canary_credit_ceiling INTEGER NOT NULL",
      "state IN ('PREPARED','SETTLED','FAILED')",
      "exact_reconciliation_verified IS TRUE",
      "internal_received_credits <= canary_credit_ceiling",
      "stable_read_count >= 3",
      "owned_subscription_delete_verified IS TRUE",
      "foreign_billable_count = 0",
      "Gate3 canary terminal receipt immutable",
      "Gate3 owner identity and budget cannot be rewritten",
    ])expect(sql).toContain(s);
    expect(sql).not.toMatch(/raw_body|access_token|api_key|webhook_secret|private_key/i);
    // Vendor account balances and external delta are forbidden in LOGGED
    // source-safe Gate3 metadata; reconciliation occurs in volatile memory.
    expect(sql).not.toMatch(/balance_before\s+INTEGER|balance_stable\s+INTEGER|external_credits\s+INTEGER/i);
  });
  it("blocks direct UNLOGGED canary session insertion without independent LOGGED owner",()=>{
    expect(sql).toContain("CREATE FUNCTION clean.guard_gate3_prepaid_runtime_session_v39()");
    expect(sql).toContain("REFUSED_GATE3_CANARY_DURABLE_OWNER_REQUIRED");
    expect(sql).toContain("owner.session_id=NEW.session_id");
    expect(sql).toContain("owner.icao=NEW.icao");
    expect(sql).toContain("owner.state='PREPARED'");
    expect(sql).toContain("owner.expires_at_utc >= NEW.expires_at_utc");
    expect(sql).toContain("CREATE TRIGGER trg_guard_gate3_prepaid_runtime_session_v39");
    expect(sql).toContain("Prepaid session owner kind/identity immutable");
  });
  it("requires a new audit ref/paid AUTH and cannot claim Gate3 is already live",()=>{
    expect(sql).toContain("canary_credit_ceiling BETWEEN 1 AND 100");
    expect(sql).toContain("state='PREPARED'");
    expect(sql).toContain("state='SETTLED'");
    expect(sql).toContain("internal_received_credits > 0");
    expect(sql).toContain("CREATE TRIGGER phase3_gate3_canary_owner_guard_v39");
    expect(sql).not.toMatch(/CREATE SUBSCRIPTION|HTTP|CALL .*provider/i);
  });
  it("is planned AFTER baseline, Phase2 cleanup V63 and V64 without executing SQL",async()=>{
    const files=await loadMigrationFilesV39();
    const b=files.find(x=>x.kind==="BASELINE"&&x.version===62);
    expect(b).toBeDefined();
    const pending=planPendingMigrationsV39(files,[{
      version:62,kind:"BASELINE",file:b!.file,checksumSha256:b!.checksumSha256,
    }]);
    expect(pending.map(x=>x.file)).toEqual([
      "V0063__phase2g_cleanup_journal_v39.sql",
      "V0064__phase2g_prepaid_source_pending_intent_v39.sql",
      name,
    ]);
  });
});
