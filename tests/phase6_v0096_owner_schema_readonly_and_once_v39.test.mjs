import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 V0096_MIGRATION_PATH,V0096_REVIEWED_SQL_BLOB_SHA,
 V0096_ONE_TIME_OWNER_APPROVAL,
 reviewExactV0096Sql,classifyV0096OwnerState
} from "../scripts/v39_phase6_v0096_owner_schema_readonly_and_once.mjs";
import {gitBlobSha1}
 from "../scripts/v39_phase6_v0094_owner_schema_readonly_and_once.mjs";

const prior={state:"V0095_INSTALLED_EMPTY_PRIVATE_KIND_EXTENSION_INERT_NO_GO",
 tableRows:0};
function table(){
 return{
  rows:0,owner:"neondb_owner",
  constraints:[
   "p6_v0096_index_previous_sha_guard",
   "p6_v0096_index_bytes_guard",
   "p6_v0096_index_retention_guard"
  ],
  triggers:[
   "phase6_private_signed_index_insert_chain_hold_v39",
   "phase6_private_signed_index_update_hold_v39"
  ],
  readerSelect:true,readerInsert:false,readerUpdate:false,
  readerDelete:false,publisherSelect:true,publisherInsert:true,
  publisherUpdate:false,publisherDelete:false,publicSelect:false,
  previousShaNonNullCheck:true,
  actualBytesShaGuard:true,conservativeExpiryCheck:true
 };
}
test("exact hash pinned V0096 source once only and no new accounts",()=>{
 const bytes=readFileSync(V0096_MIGRATION_PATH);
 assert.equal(gitBlobSha1(bytes),V0096_REVIEWED_SQL_BLOB_SHA);
 const code=reviewExactV0096Sql(bytes,V0096_REVIEWED_SQL_BLOB_SHA);
 assert.match(code,/^BEGIN;$/m);
 assert.match(code,/^COMMIT;$/m);
 assert.equal((code.match(/^COMMIT;$/gm)||[]).length,1);
 assert.equal((code.match(/^BEGIN;$/gm)||[]).length,1);
 assert.match(V0096_ONE_TIME_OWNER_APPROVAL,/^INSTALL_ONCE_V0096_/);
 for(const bad of [
  Buffer.from(bytes.toString()+"\n"),
  Buffer.from(bytes.toString().replace("NOLOGIN",
   "LOGIN CREATED OUT OF POLICY")),
  Buffer.from("-- invalid\nBEGIN;\nCOMMIT;\n")
 ])assert.throws(()=>reviewExactV0096Sql(
  bad,V0096_REVIEWED_SQL_BLOB_SHA
 ),/HOLD_V0096_OWNER_ONCE_/);
 assert.throws(()=>reviewExactV0096Sql(bytes,"0".repeat(40)),
  /PINNED_MIGRATION_BLOB_NOT_EXACT/);
});
test("cold or uninstalled V0095 cannot authorize V0096 once",()=>{
 assert.equal(classifyV0096OwnerState(
  {state:"V0094_MISSING_V0095_NOT_INSTALLED_NO_GO",tableRows:null},null),
  "V0095_NOT_READY_V0096_CANNOT_INSTALL_NO_GO");
 assert.equal(classifyV0096OwnerState(prior,null),
  "V0095_READY_EMPTY_V0096_NOT_INSTALLED_NO_GO");
});
test("installed V0096 must remain empty with strict private roles + triggers",()=>{
 assert.equal(classifyV0096OwnerState(prior,table()),
  "V0096_INSTALLED_EMPTY_INERT_SIGNED_INDEX_NO_GO");
 for(const change of [
  {rows:1},{owner:"postgres"},
  {readerInsert:true},{publisherUpdate:true},{publicSelect:true},
  {actualBytesShaGuard:false},{conservativeExpiryCheck:false},
  {previousShaNonNullCheck:false},
  {constraints:table().constraints.slice(0,-1)},
  {triggers:table().triggers.slice(0,-1)}
 ]){
  assert.throws(()=>classifyV0096OwnerState(prior,{
    ...table(),...change
  }),/HOLD_V0096_OWNER_ONCE_INSTALLED_INDEX_TABLE_ACL/);
 }
});
