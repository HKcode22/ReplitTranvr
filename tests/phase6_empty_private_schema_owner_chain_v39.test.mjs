import assert from "node:assert/strict";
import {test} from "node:test";
import {SCOPE,admitEmptyOwnerChain,runEmptyOwnerChain} from "../scripts/v39_phase6_empty_private_schema_owner_chain_v39.mjs";
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
