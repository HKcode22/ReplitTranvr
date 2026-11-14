import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";

const p="migrations/staged/V0096__phase6_private_signed_day_shard_index_revisions_inert_v39.sql";
const sql=readFileSync(p,"utf8");
test("V0096 is separately staged ONE USE, not a rewritten V0094/V0095",()=>{
 assert.match(sql,/^-- V0096: STAGED ONLY/);
 assert.equal((sql.match(/^BEGIN;$/gm)||[]).length,1);
 assert.equal((sql.match(/^COMMIT;$/gm)||[]).length,1);
 assert(sql.includes("P6_V0096_ALREADY_PRESENT_NEVER_REINSTALL"));
 assert(sql.includes("P6_V0096_REQUIRES_VERIFIED_V0094_AND_V0095_FIRST"));
 assert(sql.includes("P6_V0096_REQUIRES_EMPTY_PRIVATE_PACKET_TABLE_PRECOMMISSION"));
 assert(sql.includes("P6_V0096_PRIVATE_WORKER_MEMBERS_OR_PRIVILEGE_DRIFT"));
 assert(!/\b(?:CREATE ROLE|ALTER ROLE|CREATE USER|DROP TABLE|TRUNCATE|DELETE FROM|UPDATE .* SET|DISABLE TRIGGER)\b/i.test(sql));
 assert.equal(createHash("sha256").update(sql).digest("hex").length,64);
});
test("MAX 1MB index bytes, SHA, previous revision chain, 7d cap and immutable updates",()=>{
 for(const s of [
  "signed_day_shard_index_revision_v39","revision integer PRIMARY KEY",
  "revision BETWEEN 1 AND 1024","previous_index_sha256",
  "reviewed_code_sha","manifest_sha256","calendar_sha256",
  "release_sha256","rights_sha256","external_review_sha256",
  "sha256(payload_bytes)","octet_length(payload_bytes) BETWEEN 100 AND 1048576",
  "revision=1 AND previous_index_sha256 IS NULL",
  "revision>1 AND previous_index_sha256 IS NOT NULL",
  "previous_row.content_sha256 IS DISTINCT FROM NEW.previous_index_sha256",
  "interval '7 days'",
  "phase6_private.refuse_frozen_update_v39",
  "GRANT SELECT,INSERT",
  "GRANT SELECT ON",
  "P6_V0096_INDEX_IMMUTABLE_UPDATE_TRIGGER_MISSING",
  "phase6_private.guard_signed_index_insert_v39",
  "P6_V0096_MISSING_OR_DRIFTED_PREVIOUS_COMMITTED_REVISION",
  "P6_V0096_INDEX_CHAIN_INSERT_TRIGGER_MISSING"
 ]) assert(sql.includes(s),s);
});
test("no broader PUBLIC/old app service access, no derived 31d rights",()=>{
 assert(sql.includes("REVOKE ALL ON TABLE phase6_private.signed_day_shard_index_revision_v39"));
 assert(sql.includes("FROM PUBLIC"));
 for(const s of [
  "phase6_private_frozen_reader_v39",
  "phase6_private_frozen_publisher_v39",
  "rolcanlogin","rolcreaterole","rolbypassrls",
  "P6_V0096_INDEX_TABLE_ACL_NOT_PRIVATE",
  "P6_V0096_SCHEMA_ONLY_BOTH_PRIVATE_TABLES_MUST_BE_EMPTY",
  "31-day Contents rights"
 ])assert(sql.includes(s),s);
});
