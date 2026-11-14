import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {
 bindP6OnePrivateSourceQueryFromVerifiedIndex,
 P6_SOURCE_QUERY_PAIR_SCHEMA
} from "../server/lib/disruption/phase6PrivateSourceQueryBindingInMemory_v39.mjs";
const h=x=>createHash("sha256").update(x).digest("hex");
const H="a".repeat(64),MANIFEST="b".repeat(64),ROUTE="c".repeat(64);
const REG="data-collection/phase5/frozen/source_day001_test_20261114.json";
const PACK="data-collection/phase5/frozen/sourceq_day001_test_20261114.json";
function fixture(){
 const query=Buffer.from(JSON.stringify({
  schema:"v39.phase5.github-source-one-query-template.v2",
  manifestSha256:MANIFEST,queryDigestSha256:H,
  confidentialFixture:"NEVER_LOG_THIS_PRIVATE_AERODATABOX_PAYLOAD",
  plan:{
   acquisition:{runDayIndex:1,maxAttempts:1,
     apiUnitsPerAttempt:2,providerQueryDirection:"Departure"},
   independentlyApprovedSourceAndRetention:true,
   githubOnlyOwnerApproved:true
  }
 }));
 const registry=Buffer.from(JSON.stringify({
  schema:"v39.phase5.signed-per-day-source-batch-readonly.v1",
  manifestSha256:MANIFEST,runDayIndex:1,
  entries:[{filePath:PACK,expectedPacketSha256:h(query),
    expectedQueryDigestSha256:H}]
 }));
 const candidate={
  lane:"SOURCE",runDayIndex:1,shardIndex:1,
  signedFrozenPath:REG,signedFrozenSha256:h(registry),
  boundSourceRegistryPath:null,boundSourceRegistrySha256:null,
  routingIntentSha256:ROUTE,newPaidDispatchAuthorizedHere:false,
  privateBytesOnlyFromRestrictedReader:true,
  independentlyAuthenticatedGHHistoryRequired:true,
  notBeforeUtc:"2026-11-14T04:59:00.000Z",
  hardLatestUtc:"2026-11-14T05:30:00.000Z"
 };
 const handoff={redactedSummary:{
  schema:"v39.phase6.private-index-and-full-registries-memory-handoff-no-dispatch.v1",
  status:"SIGNED_RESTRICTED_INMEMORY_31DAY_REGISTRY_HANDOFF_NO_DISPATCH",
  observedRestrictedPgClockUtc:"2026-11-14T05:00:00.000Z",
  phase6PaidGo:false,githubChildDispatches:0,providerCalls:0,
  databaseWrites:0,underlyingPerFlightPacketsNotHydratedHere:true
 }};
 Object.defineProperty(handoff,"privateRoutingCandidates",{
  value:[candidate],writable:false,enumerable:false
 });
 Object.defineProperty(handoff,"privateRegistryBytes",{
  value:new Map([[REG,registry]]),writable:false,enumerable:false
 });
 const receipt={redactedSummary:{
  schema:"v39.phase6.private-source-post-packet-restricted-read-once.v1",
  status:"VERIFIED_ONE_PRIVATE_PACKET_BYTE_TRANSPORT_NO_GO",
  kind:"SOURCE_QUERY_PACKET",runDayIndex:1,shardIndex:1,
  contentSha256:h(query),verifiedEd25519Review:true,
  actualPhase6PaidGoCertified:false,
  independentlyAuthorizedProviderUseCertified:false,
  contentsWereCopiedToPublicLogs:false,providerCalls:0,databaseWrites:0,
  observedDatabaseClockUtc:"2026-11-14T05:00:30.000Z"
 }};
 Object.defineProperty(receipt,"privateBytes",{
  value:query,enumerable:false,writable:false,configurable:true
 });
 Object.defineProperty(receipt,"privateLogicalPath",{
  value:PACK,enumerable:false,writable:false,configurable:true
 });
 return {handoff,receipt,candidate,query,registry};
}
const run=f=>bindP6OnePrivateSourceQueryFromVerifiedIndex({
 indexHandoff:f.handoff,sourcePacketReceipt:f.receipt,
 expectedRoutingIntentSha256:ROUTE,expectedQueryDigestSha256:H
});
test("valid private query crosses exactly one signed registry in memory",()=>{
 const out=run(fixture());
 assert.equal(out.redactedSummary.schema,P6_SOURCE_QUERY_PAIR_SCHEMA);
 assert.equal(out.redactedSummary.phase6PaidGo,false);
 assert.equal(out.redactedSummary.providerCalls,0);
 assert.equal(out.redactedSummary.githubChildDispatches,0);
 assert.equal(out.redactedSummary.requiresExistingP5SignedDaySourceChildAdmission,true);
 assert.equal(out.privateRegistryPath,REG);
 assert.equal(out.privateQueryPath,PACK);
 assert.equal(h(out.privateQueryBytes),out.redactedSummary.queryPacketSha256);
 const displayed=JSON.stringify(out);
 assert.ok(!displayed.includes("NEVER_LOG_THIS_PRIVATE"));
 assert.ok(!displayed.includes("sourceq_day001"));
 assert.ok(!displayed.includes("source_day001"));
 assert.equal(Object.getOwnPropertyDescriptor(out,"privateQueryBytes").enumerable,false);
});
test("reject a swapped query that did not appear in the signed registry",()=>{
 const f=fixture();
 Object.defineProperty(f.receipt,"privateLogicalPath",{
  value:"data-collection/phase5/frozen/sourceq_otherfutureday_packet.json",
  writable:false,enumerable:false,configurable:true
 });
 assert.throws(()=>run(f),/HOLD_P6_PRIVATE_SOURCE_QUERY_PAIR_QUERY_IDENTITY/);
});
test("reject changed bytes, even if a caller supplies a certified-looking receipt",()=>{
 const f=fixture();
 Object.defineProperty(f.receipt,"privateBytes",{
  value:Buffer.from(JSON.stringify({changed:true,confidentialFixture:"abc"}).padEnd(120)),
  writable:false,enumerable:false,configurable:true
 });
 assert.throws(()=>run(f),/HOLD_P6_PRIVATE_SOURCE_QUERY_PAIR_PRIVATE_QUERY_PACKET_READER/);
});
test("reject a duplicate query or ambiguous entry in the day registry",()=>{
 const f=fixture(),parsed=JSON.parse(f.registry.toString("utf8"));
 parsed.entries.push({...parsed.entries[0]});
 const newBytes=Buffer.from(JSON.stringify(parsed));
 f.handoff.privateRegistryBytes.set(REG,newBytes);
 f.candidate.signedFrozenSha256=h(newBytes);
 assert.throws(()=>run(f),/HOLD_P6_PRIVATE_SOURCE_QUERY_PAIR_DUPLICATED/);
});
test("reject a packet observed after the signed SOURCE cutoff",()=>{
 const f=fixture();
 f.receipt.redactedSummary.observedDatabaseClockUtc=
  "2026-11-14T05:31:00.000Z";
 assert.throws(()=>run(f),/HOLD_P6_PRIVATE_SOURCE_QUERY_PAIR_SOURCE_WINDOW/);
});
test("reject forged in-memory handoff and accidental public enumerable bytes",()=>{
 const f=fixture();
 f.handoff.redactedSummary.status="SOME_UNVERIFIED_PACKET";
 assert.throws(()=>run(f),/HOLD_P6_PRIVATE_SOURCE_QUERY_PAIR_UNVERIFIED/);
 const g=fixture();
 Object.defineProperty(g.receipt,"privateBytes",{
  value:g.query,enumerable:true,writable:false,configurable:true
 });
 assert.throws(()=>run(g),/HOLD_P6_PRIVATE_SOURCE_QUERY_PAIR_PRIVATE_QUERY_PACKET_READER/);
});
test("no pretense that matching index and query grants source rights",()=>{
 const f=fixture();
 const out=run(f);
 assert.equal(out.redactedSummary.independentLegalRetentionAndPaidGoStillRequired,true);
 assert.equal(out.redactedSummary.privateSourcePathsAndBytesNotLogged,true);
 assert.equal(out.redactedSummary.databaseWrites,0);
});
