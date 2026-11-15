import assert from "node:assert/strict";
import {test} from "node:test";
import {SCOPE,admitEmptyOwnerChain,runEmptyOwnerChain,emptyOwnerConnectionConfig,redactedEmptyOwnerFailure} from "../scripts/v39_phase6_empty_private_schema_owner_chain_v39.mjs";
const sha="a".repeat(40);
const env={P6_EMPTY_PRIVATE_SCHEMA_OWNER_SCOPE:SCOPE,P6_EMPTY_PRIVATE_SCHEMA_REVIEWED_MAIN:sha,
 ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",V39_PHASE6_OWNER_APPROVED:"0",
 DATABASE_URL:"postgresql://neondb_owner:ci@ep-test.neon.tech/neondb?sslmode=require"};
test("separate exact inert owner scope never requires fabricated external review SHA",()=>{
 assert.equal(admitEmptyOwnerChain(env,sha,sha),true);
 for(const d of [{P6_EMPTY_PRIVATE_SCHEMA_OWNER_SCOPE:""},{ADB_AUTO_COLLECT:"1"},
 {V39_PHASE6_PROCESS_ARMED:"1"},{AERODATABOX_API_KEY:"x"},{GITHUB_ACTIONS:"true"},
 {P6_PRIVATE_PUBLISHER_DATABASE_URL:"x"},{V39_DATABASE_RUNTIME_URL:"other"},
 {P6_EMPTY_PRIVATE_SCHEMA_REVIEWED_MAIN:"b".repeat(40)}])
  assert.throws(()=>admitEmptyOwnerChain({...env,...d},sha,sha),/EXACT_EMPTY_SCOPE/);
 assert.throws(()=>admitEmptyOwnerChain(env,sha,"b".repeat(40)),/EXACT_EMPTY_SCOPE/);
 assert.throws(()=>admitEmptyOwnerChain({...env,DATABASE_URL:env.DATABASE_URL.replace("sslmode=require","sslmode=disable")},sha,sha),/NEON_TLS/);
});
test("all pinned bytes checked before opening any session",async()=>{
 let opened=0;
 await assert.rejects(runEmptyOwnerChain({open:async()=>{opened++;throw Error("unexpected");},
 readBytes:()=>Buffer.from("tampered"),installAllowed:true}),/PINNED_STAGED_SQL_REQUIRED/);
 assert.equal(opened,0);
});

test("Neon-compatible startup: original transaction inventory enforces read only, not startup options",()=>{
 const c=emptyOwnerConnectionConfig(env.DATABASE_URL);
 assert.equal(c.connectionString,env.DATABASE_URL);
 assert.equal(Object.hasOwn(c,"options"),false);
});
test("read-only failure distinguishable from uncertain DDL, only SQLSTATE is exposed",()=>{
 const e=Object.assign(Error("postgresql://private:password@private-host"),{code:"08P01"});
 assert.deepEqual(redactedEmptyOwnerFailure(e,"inventory"),{status:"HOLD_P6_EMPTY_OWNER_CHAIN_READONLY_FAILED_NO_DDL",mode:"inventory",sqlstate:"08P01"});
 assert.equal(redactedEmptyOwnerFailure(e,"install").status,"HOLD_P6_EMPTY_OWNER_CHAIN_UNKNOWN_OR_COMMIT_UNKNOWN_NO_RETRY");
 assert.deepEqual(redactedEmptyOwnerFailure(Error("HOLD_V0097_OLD_GLOBAL_V0096_PRESENT_NEVER_MIGRATE"),"inventory"),{status:"HOLD_V0097_OLD_GLOBAL_V0096_PRESENT_NEVER_MIGRATE",mode:"inventory"});
});
