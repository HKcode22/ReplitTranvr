import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {inspectP5ReadOnlyDbEnvironment,
 P5_PRODUCTION_DB_METADATA_SQL}
 from "../scripts/v39_phase5_native_commit_production_environment_readonly_once.mjs";

function fake(track="off",tables=true,error=false){
 const queries=[];
 let released=0;
 const row={
  db:"neondb",actor:"not-exposed-as-secret",
  ro:"on",track,pg_version_num:"160010",standby:false,
  observed_at:new Date("2026-11-07T10:00:00.000Z"),
  flight_snapshots:tables,fids_originals:tables,
  fids_population:tables,v0079_queries:tables,
  v0079_attempts:tables,v0079_bindings:tables,
  v0079_day_budget:tables,v0079_charge_days:tables
 };
 return {
  queries,get releases(){return released;},
  pool:{connect:async()=>({
   release(){released++;},
   async query(sql){
    queries.push(sql);
    if(error&&sql===P5_PRODUCTION_DB_METADATA_SQL)throw Error("hidden-DB-secret");
    return {rows:sql===P5_PRODUCTION_DB_METADATA_SQL?[row]:[]};
   }
  })}
 };
}
describe("Phase5 live DB read-only environment audit",()=>{
 it("never self-issues a paid release or invents native historical commit proof",async()=>{
  const q=fake("on",true);
  const r=await inspectP5ReadOnlyDbEnvironment(q.pool);
  assert.equal(r.nativeCommitTimestampTrackingEnabledNow,true);
  assert.equal(r.nativeCommitTimestampHistoryActuallyRetained,false);
  assert.equal(r.previouslyWrittenT24NativeCommitEvidenceCertified,false);
  assert.equal(r.expectedDatabaseMatched,true);
  assert.equal(r.v0079RequiredSchemaPresent,true);
  assert.equal(r.phase5FreezePassed,false);
  assert.equal(r.phase6PaidGo,false);
  assert.equal(r.databaseWrites,0);
  assert.equal(r.providerCalls,0);
  assert.equal(r.transactionalReadOnlyVerified,true);
  assert.deepEqual(q.queries,[
   "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY",
   "SET LOCAL statement_timeout='8000ms'",
   "SET LOCAL lock_timeout='1000ms'",
   P5_PRODUCTION_DB_METADATA_SQL,"COMMIT"
  ]);
  assert.equal(q.releases,1);
 });
 it("reports native-tracking disabled and absent V0079 as release-blocking",async()=>{
  const q=fake("off",false);
  const r=await inspectP5ReadOnlyDbEnvironment(q.pool);
  assert.equal(r.nativeCommitTimestampTrackingEnabledNow,false);
  assert.equal(r.v0079RequiredSchemaPresent,false);
  assert.equal(r.blockers.includes("NATIVE_TRANSACTION_COMMIT_TRACKING_OFF"),true);
  assert.equal(r.blockers.includes("PHASE5_V0079_SCHEMA_NOT_INSTALLED_OR_INVISIBLE"),true);
  assert.equal(r.phase6PaidGo,false);
 });
 it("rolls back on missing evidence and never prints database exceptions",async()=>{
  const q=fake("on",true,true);
  await assert.rejects(inspectP5ReadOnlyDbEnvironment(q.pool),/hidden-DB-secret/);
  assert.equal(q.queries.at(-1),"ROLLBACK");
  assert.equal(q.releases,1);
 });
 it("only inspects pg catalog and never reads provider original records",()=>{
  const s=P5_PRODUCTION_DB_METADATA_SQL;
  assert.match(s,/to_regclass/);
  assert.match(s,/track_commit_timestamp/);
  assert.doesNotMatch(s,/\b(?:INSERT|UPDATE|DELETE|ALTER|CREATE|DROP)\b/i);
  assert.doesNotMatch(s,/\bFROM\s+clean\./i);
  assert.doesNotMatch(s,/raw_payload|provider_key|content_base64/i);
 });
});
