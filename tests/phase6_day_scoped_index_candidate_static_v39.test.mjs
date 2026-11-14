import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const file="migrations/staged/PHASE6_DAY_SCOPED_INDEX_REPLACEMENT_CANDIDATE_NOT_FOR_INSTALL.sql";
const sql=readFileSync(file,"utf8");

test("design is disposable-only; never silently replaces pinned V0094/V0095 or old V0096",()=>{
 assert.match(sql,/NOT A PRODUCTION MIGRATION/);
 assert.match(sql,/DO NOT/);
 assert.match(sql,/P6_DAY_EPOCH_OLD_GLOBAL_V0096_PRESENT_DO_NOT_MIGRATE/);
 assert.match(sql,/P6_DAY_EPOCH_NEEDS_EMPTY_VERIFIED_V0095/);
 for(const s of [
  "BEGIN;","COMMIT;","CREATE TABLE phase6_private.signed_run_day_epoch_claim_v39",
  "CREATE TABLE phase6_private.signed_run_day_index_revision_v39",
  "CREATE FUNCTION phase6_private.guard_run_day_epoch_index_insert_v39()",
  "run_day_index integer PRIMARY KEY CHECK (run_day_index BETWEEN 1 AND 31)",
  "PRIMARY KEY (run_day_index,revision)",
  "WHERE run_day_index=NEW.run_day_index AND revision=NEW.revision-1",
  "retention_not_after_utc<=now_utc",
  "pg_catalog.sha256(payload_bytes)",
  "interval '7 days'",
  "BEFORE UPDATE OR DELETE ON phase6_private.signed_run_day_epoch_claim_v39",
  "GRANT SELECT,INSERT ON phase6_private.signed_run_day_index_revision_v39",
  "REVOKE ALL ON TABLE phase6_private.signed_run_day_index_revision_v39",
 ])assert(sql.includes(s),s);
 assert.equal((sql.match(/^BEGIN;$/gm)||[]).length,1);
 assert.equal((sql.match(/^COMMIT;$/gm)||[]).length,1);
 assert.doesNotMatch(sql,/\bCREATE ROLE\b|\bCREATE USER\b|\bTRUNCATE\b|\bALTER DATABASE\b/i);
});
test("global V0096 old storage requires cumulative history across 31 days and is intentionally not installed",()=>{
 const old=readFileSync(
 "migrations/staged/V0096__phase6_private_signed_day_shard_index_revisions_inert_v39.sql",
 "utf8");
 assert(old.includes("revision integer PRIMARY KEY"));
 assert(!old.includes("PRIMARY KEY (run_day_index,revision)"));
 assert(old.includes("previous_row.content_sha256 IS DISTINCT FROM NEW.previous_index_sha256"));
 assert(sql.includes("run_day_index integer NOT NULL"));
 assert(sql.includes("phase6_private.signed_run_day_epoch_claim_v39"));
});
test("the owner replay fence survives permitted deletion of old private index bytes",()=>{
 assert(sql.includes("INSERT INTO phase6_private.signed_run_day_epoch_claim_v39(run_day_index)"));
 assert(sql.includes("CREATE TRIGGER phase6_private_day_epoch_claim_mutation_hold_v39"));
 assert(!sql.includes("DELETE FROM phase6_private.signed_run_day_epoch_claim_v39"));
});
