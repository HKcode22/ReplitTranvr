import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";

const p="migrations/staged/V0095__phase6_private_source_query_post_packet_kind_scope_inert_v39.sql";
const bytes=readFileSync(p);
const sql=bytes.toString("utf8");
test("V0095 is separate from frozen V0094, schema-only and one use",()=>{
 assert(sql.length>3000&&sql.length<15000);
 assert(sql.startsWith("-- V0095 Phase5→6: staged ONE-USE"));
 assert.equal((sql.match(/^BEGIN;$/gm)||[]).length,1);
 assert.equal((sql.match(/^COMMIT;$/gm)||[]).length,1);
 assert(sql.includes("P5_V0095_V0094_MUST_EXIST_DO_NOT_INSTALL_OUT_OF_ORDER"));
 assert(sql.includes("P5_V0095_ALREADY_INSTALLED_NEVER_REPLAY"));
 assert(sql.includes("P5_V0095_EXISTING_PRIVATE_ROWS_HOLD_INDEPENDENT_REVIEW"));
 assert(sql.includes("P5_V0095_SCHEMA_ONLY_NO_PRIVATE_DATA_ALLOWED"));
 assert(!/\b(?:CREATE ROLE|CREATE USER|GRANT LOGIN|ALTER ROLE|TRUNCATE|DELETE FROM|UPDATE .* SET|DROP TABLE)\b/i.test(sql));
 assert.equal(createHash("sha256").update(bytes).digest("hex").length,64);
});
test("five kind scopes: SOURCE/POST private plus all three V0094 originals",()=>{
 for(const k of ["SOURCE_DAY_REGISTRY","SOURCE_QUERY_PACKET",
   "LATER_PRE_PACKET","LATER_PRE_DAY_REGISTRY","POST_PACKET"]){
  assert(sql.includes("'"+k+"'"),"missing "+k);
 }
 assert(sql.includes("DROP CONSTRAINT frozen_native_packet_v39_kind_check"));
 assert(sql.includes("DROP CONSTRAINT p5_v0094_kind_path_guard"));
 assert(sql.includes("ADD CONSTRAINT p5_v0095_kind_allowed"));
 assert(sql.includes("ADD CONSTRAINT p5_v0095_kind_path_guard"));
 assert(sql.includes("phase6_private.frozen_native_packet_v39"));
 assert(sql.includes("ALTER TABLE phase6_private.frozen_native_packet_v39"));
 assert(!sql.includes("DISABLE TRIGGER"));
});
test("requires PG16 real owner/roles/empty table and no relaxed ACL",()=>{
 for(const name of [
  "current_database()<>'neondb'",
  "current_user<>'neondb_owner'",
  "current_setting('server_version_num')",
  "pg_catalog.pg_is_in_recovery()",
  "row_n<>0",
  "phase6_private_frozen_reader_v39",
  "phase6_private_frozen_publisher_v39",
  "rolcanlogin","rolinherit","rolsuper",
  "p5_v0095_PRIVATE_ACL_WEAKENED"
 ])assert(sql.includes(name),name);
});
