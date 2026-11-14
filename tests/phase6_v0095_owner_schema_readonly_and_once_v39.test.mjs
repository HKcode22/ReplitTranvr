import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 V0095_MIGRATION_PATH,V0095_REVIEWED_SQL_BLOB_SHA,
 V0095_ONE_TIME_OWNER_APPROVAL,
 reviewExactV0095Sql,classifyV0095ConstraintState
} from "../scripts/v39_phase6_v0095_owner_schema_readonly_and_once.mjs";
import {gitBlobSha1}
 from "../scripts/v39_phase6_v0094_owner_schema_readonly_and_once.mjs";

test("one separately pinned V0095 SQL blob only, never create LOGIN or override V0094",()=>{
 const bytes=readFileSync(V0095_MIGRATION_PATH);
 assert.equal(gitBlobSha1(bytes),V0095_REVIEWED_SQL_BLOB_SHA);
 assert(reviewExactV0095Sql(bytes,V0095_REVIEWED_SQL_BLOB_SHA).includes("BEGIN;"));
 assert.match(V0095_ONE_TIME_OWNER_APPROVAL,/^INSTALL_ONCE_V0095_/);
 for(const bad of [
  Buffer.from(bytes.toString().replace("p5_v0095_kind_allowed",
   "unreviewed_v0095_kind_allowed")),
  Buffer.from("-- fake migration\nBEGIN;\nCOMMIT;"),
  Buffer.from(bytes.toString()+"\n")
 ]){
  assert.throws(()=>reviewExactV0095Sql(
   bad,V0095_REVIEWED_SQL_BLOB_SHA
  ),/HOLD_V0095_OWNER_SCHEMA_/);
 }
 assert.throws(()=>reviewExactV0095Sql(bytes,"0".repeat(40)),
  /HOLD_V0095_OWNER_SCHEMA_EXACT_PINNED/);
});
test("cold V0094 is NOT a V0095 migration greenlight",()=>{
 assert.equal(classifyV0095ConstraintState([],{},
  "COLD_V0094_NOT_INSTALLED"),
  "V0094_MISSING_V0095_NOT_INSTALLED_NO_GO");
 assert.throws(()=>classifyV0095ConstraintState(
  ["p5_v0095_kind_allowed"],{},
  "COLD_V0094_NOT_INSTALLED"),
  /IMPOSSIBLE_COLD/);
});
test("exact two previous V0094 kind/path checks can be migrated only once",()=>{
 const v9="INSTALLED_EMPTY_INERT_V0094_NOLOGIN_NO_GO";
 const a=["frozen_native_packet_v39_kind_check",
          "p5_v0094_kind_path_guard"];
 assert.equal(classifyV0095ConstraintState(a,{},v9),
  "V0094_READY_EMPTY_V0095_NOT_INSTALLED_NO_GO");
 const n=["p5_v0095_kind_allowed","p5_v0095_kind_path_guard"];
 const defs={
  p5_v0095_kind_allowed:"CHECK kind IN ("+
  ["SOURCE_DAY_REGISTRY","SOURCE_QUERY_PACKET","LATER_PRE_PACKET",
   "LATER_PRE_DAY_REGISTRY","POST_PACKET"].map(x=>"'"+x+"'").join(",")+")",
  p5_v0095_kind_path_guard:"CHECK source_ sourceq_ post_ frozen/"
 };
 assert.equal(classifyV0095ConstraintState(n,defs,v9),
  "V0095_INSTALLED_EMPTY_PRIVATE_KIND_EXTENSION_INERT_NO_GO");
 assert.throws(()=>classifyV0095ConstraintState(
  a.concat(n),defs,v9),/PARTIAL_OR_DRIFTED/);
 assert.throws(()=>classifyV0095ConstraintState(n,{
  ...defs,p5_v0095_kind_allowed:"CHECK ('SOURCE_QUERY_PACKET')"
 },v9),/CONSTRAINT_DEFINITION_UNREVIEWED/);
 assert.throws(()=>classifyV0095ConstraintState(a.concat(a),{},v9),
  /V0094_NOT_INDEPENDENTLY_READY_OR_PARTIAL/);
});
