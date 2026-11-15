import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {V0097_PATH,V0097_BLOB,V0097_APPROVAL,reviewV0097Sql,admitV0097OwnerInstall}
 from "../scripts/v39_phase6_v0097_day_epoch_owner_schema_readonly_and_once.mjs";
const bytes=readFileSync(V0097_PATH);
const old=readFileSync("migrations/staged/PHASE6_DAY_SCOPED_INDEX_REPLACEMENT_CANDIDATE_NOT_FOR_INSTALL.sql","utf8");
const body=s=>s.slice(s.indexOf("BEGIN;\n"),s.indexOf("\nCOMMIT;\n")+8);
test("exact independently tested per-day SQL body, staged release artifact not global V0096",()=>{
 assert.equal(body(reviewV0097Sql(bytes)),body(old));
 assert.throws(()=>reviewV0097Sql(Buffer.concat([bytes,Buffer.from(" ")])),/PINNED_STAGED_SQL/);
 assert.doesNotMatch(reviewV0097Sql(bytes),/\bCREATE ROLE\b|\bCREATE USER\b|\bDROP TABLE\b|\bTRUNCATE\b/i);
});
test("owner admission requires explicit review and exact pins; cannot run from GitHub or paid context",()=>{
 const pin="a".repeat(40);
 const env={DATABASE_URL:"dummy-owner-never-connected",
 P5_V0097_OWNER_APPROVAL:V0097_APPROVAL,P5_V0097_REVIEWED_MAIN_SHA:pin,
 P5_V0097_REVIEWED_SQL_BLOB:V0097_BLOB,
 P5_V0097_INDEPENDENT_RELEASE_REVIEW_SHA256:"b".repeat(64),
 ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",V39_PHASE6_OWNER_APPROVED:"0"};
 assert.equal(admitV0097OwnerInstall(env,pin,pin),true);
 for(const bad of [{GITHUB_ACTIONS:"true"},{P5_V0097_INDEPENDENT_RELEASE_REVIEW_SHA256:""},
 {P5_V0097_REVIEWED_SQL_BLOB:"c".repeat(40)},{V39_PHASE6_PROCESS_ARMED:"1"},
 {V39_PHASE6_OWNER_APPROVED:"1"},{ADB_AUTO_COLLECT:"1"},{AERODATABOX_API_KEY:"blocked"},
 {V39_DATABASE_RUNTIME_URL:"different"},{NODE_TLS_REJECT_UNAUTHORIZED:"0"}])
 assert.throws(()=>admitV0097OwnerInstall({...env,...bad},pin,pin),/EXACT_OWNER_RELEASE/);
 assert.throws(()=>admitV0097OwnerInstall(env,pin,"c".repeat(40)),/EXACT_OWNER_RELEASE/);
});
