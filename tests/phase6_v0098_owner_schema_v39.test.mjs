import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {V0098_PATH,V0098_BLOB,V0098_APPROVAL,reviewV0098Sql,admitV0098OwnerInstall,classifyV0098WireCatalog}
 from "../scripts/v39_phase6_v0098_owner_schema_readonly_and_once.mjs";
test("exact blob and explicit owner-only STOP release",()=>{
 const bytes=readFileSync(V0098_PATH);
 assert.match(reviewV0098Sql(bytes),/p6_v0098_packet_wire_scope/);
 assert.throws(()=>reviewV0098Sql(Buffer.concat([bytes,Buffer.from(" ")])),/PINNED_STAGED_SQL/);
 const pin="a".repeat(40),env={DATABASE_URL:"dummy-never-connect",
  P5_V0098_OWNER_APPROVAL:V0098_APPROVAL,P5_V0098_REVIEWED_MAIN_SHA:pin,
  P5_V0098_REVIEWED_SQL_BLOB:V0098_BLOB,P5_V0098_INDEPENDENT_RELEASE_REVIEW_SHA256:"b".repeat(64),
  ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",V39_PHASE6_OWNER_APPROVED:"0"};
 assert.equal(admitV0098OwnerInstall(env,pin,pin),true);
 for(const bad of [{GITHUB_ACTIONS:"true"},{ADB_AUTO_COLLECT:"1"},{V39_PHASE6_PROCESS_ARMED:"1"},
  {V39_PHASE6_OWNER_APPROVED:"1"},{P5_V0098_INDEPENDENT_RELEASE_REVIEW_SHA256:""},
  {P5_V0098_REVIEWED_SQL_BLOB:"c".repeat(40)},{AERODATABOX_API_KEY:"blocked"},
  {V39_DATABASE_RUNTIME_URL:"different"},{NODE_TLS_REJECT_UNAUTHORIZED:"0"}])
  assert.throws(()=>admitV0098OwnerInstall({...env,...bad},pin,pin),/EXACT_OWNER_RELEASE/);
 assert.throws(()=>admitV0098OwnerInstall(env,pin,"c".repeat(40)),/EXACT_OWNER_RELEASE/);
});
test("absent versus partial or changed V0098 catalog",()=>{
 const idx="phase6_private.signed_run_day_index_revision_v39",pkt="phase6_private.frozen_native_packet_v39";
 const cols=[idx,pkt].map(table_name=>({table_name,column_type:"bytea",not_null:false,has_default:false}));
 const base="review_wire_bytes IS NULL OR octet_length(review_wire_bytes) BETWEEN 100 AND 4096";
 const cons=[{table_name:idx,name:"p6_v0098_index_wire_size",validated:true,definition:base},
  {table_name:pkt,name:"p6_v0098_packet_wire_scope",validated:true,definition:base+" SOURCE_QUERY_PACKET POST_PACKET"}];
 assert.match(classifyV0098WireCatalog([],[]),/NOT_INSTALLED/);
 assert.match(classifyV0098WireCatalog(cols,cons),/INSTALLED_EMPTY/);
 for(const [c,k] of [[cols.slice(1),cons],[cols,cons.slice(1)],[cols.map(x=>({...x,column_type:"jsonb"})),cons],
  [cols,cons.map(x=>({...x,validated:false}))],[cols,cons.map(x=>({...x,definition:"TRUE"}))]])
  assert.throws(()=>classifyV0098WireCatalog(c,k),/PARTIAL_OR_DRIFTED/);
});
