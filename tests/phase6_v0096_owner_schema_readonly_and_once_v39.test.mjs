import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {gitBlobSha1}
 from "../scripts/v39_phase6_v0094_owner_schema_readonly_and_once.mjs";
import {
 V0096_MIGRATION_PATH,V0096_REVIEWED_SQL_BLOB_SHA,
 V0096_EXPLICIT_OWNER_APPROVAL,reviewExactV0096Sql
} from "../scripts/v39_phase6_v0096_owner_schema_readonly_and_once.mjs";

test("reviewed V0096 SQL exact Git blob, not plaintext path or changed migration",()=>{
 const b=readFileSync(V0096_MIGRATION_PATH);
 assert.equal(gitBlobSha1(b),V0096_REVIEWED_SQL_BLOB_SHA);
 const text=reviewExactV0096Sql(b,V0096_REVIEWED_SQL_BLOB_SHA);
 assert.match(text,/P6_V0096_ALREADY_PRESENT_NEVER_REINSTALL/);
 assert.match(text,/p6_v0096_index_previous_sha_guard/);
 assert.match(text,/P6_V0096_MISSING_OR_DRIFTED_PREVIOUS_COMMITTED_REVISION/);
 assert.match(V0096_EXPLICIT_OWNER_APPROVAL,/^INSTALL_ONCE_V0096_/);
 assert.equal((text.match(/^BEGIN;$/gm)||[]).length,1);
 assert.equal((text.match(/^COMMIT;$/gm)||[]).length,1);
 assert.throws(()=>reviewExactV0096Sql(
  b,"0".repeat(40)),/HOLD_V0096_OWNER_SCHEMA_/);
 for(const corrupt of [
  Buffer.from(text+"-- appended"),
  Buffer.from(text.replace("REVOKE ALL ON TABLE","GRANT ALL ON TABLE")),
  Buffer.from(text.replace("previous_index_sha256 IS NOT NULL","TRUE"))
 ])assert.throws(()=>reviewExactV0096Sql(
  corrupt,V0096_REVIEWED_SQL_BLOB_SHA
 ),/HOLD_V0096_OWNER_SCHEMA_/);
});

test("obsolete V0096 global owner installer refuses both public CLI and directly imported function",()=>{
 const source=readFileSync("scripts/v39_phase6_v0096_owner_schema_readonly_and_once.mjs","utf8");
 const holds=source.match(/fail\("LEGACY_GLOBAL_CHAIN_31DAY_TTL_INCOMPATIBLE_NEVER_INSTALL"\)/g)||[];
 assert.equal(holds.length,2); // direct exported function and CLI main
 assert(source.includes("if(mode===\"install\")"));
});
