import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import pg from "pg";
import {inspectP6PrivateDueGuardCatalog} from "../scripts/v39_phase6_private_due_guard_owner_v39.mjs";
const url="postgresql://postgres:postgres@127.0.0.1:5432/neondb?sslmode=disable";
const admitted=process.env.GITHUB_ACTIONS==="true"&&process.env.P6_PRIVATE_GUARD_DISPOSABLE_URL===url&&!process.env.DATABASE_URL&&!process.env.V39_DATABASE_RUNTIME_URL&&!process.env.AERODATABOX_API_KEY&&!process.env.RAPIDAPI_KEY;
test("private due guard preserves V0104 and blocks both physical boundaries on every manifest (disposable PG16)",{skip:!admitted,timeout:40000},async()=>{
 const pool=new pg.Pool({connectionString:url,max:1}),c=await pool.connect();
 const manifest="a".repeat(64),foreign="b".repeat(64);
 const physical=["phase5_fids_physical_attempt_v39","phase5_other_rest_physical_reservation_v39"];
 const sources=["frozen_native_packet_v39","signed_run_day_index_revision_v39"];
 try{
  await c.query("CREATE ROLE neondb_owner LOGIN; GRANT CREATE ON DATABASE neondb TO neondb_owner; SET ROLE neondb_owner; CREATE SCHEMA clean; CREATE SCHEMA phase6_private;");
  await c.query("CREATE TABLE clean.adb_phase6_authorization(singleton_key boolean PRIMARY KEY,enabled boolean,revoked_at_utc timestamptz,manifest_sha256 text); CREATE TABLE clean.adb_incident_stop(cause text,resolved boolean); CREATE TABLE clean.fids_query_response(raw_payload jsonb,raw_expired_at_utc timestamptz,raw_persisted_at_utc timestamptz);");
  for(const t of physical)await c.query("CREATE TABLE clean."+t+"(manifest_sha256 text)");
  for(const t of sources)await c.query("CREATE TABLE phase6_private."+t+"(manifest_sha256 text,retention_not_after_utc timestamptz,payload_bytes bytea)");
  // Minimal boundary fixtures for dependencies, not claims of V0105 behavior.
  await c.query("CREATE FUNCTION clean.phase5_primary_fids_expiry_stop_v39(text) RETURNS boolean LANGUAGE sql AS 'SELECT true'; CREATE FUNCTION clean.reserve_phase5_fids_physical_get_v39(text,text,text,text,text,text) RETURNS boolean LANGUAGE sql AS 'SELECT true'; CREATE FUNCTION clean.reserve_phase5_other_rest_once_v39(text,text,text,text,text,text) RETURNS boolean LANGUAGE sql AS 'SELECT true'; CREATE FUNCTION clean.phase6_private_epoch_expiry_status_v39(text) RETURNS jsonb LANGUAGE sql AS 'SELECT ''{}''::jsonb'; CREATE FUNCTION clean.phase6_private_epoch_expiry_sweep_v39(text,integer) RETURNS jsonb LANGUAGE sql AS 'SELECT ''{}''::jsonb';");
  await c.query("INSERT INTO clean.adb_phase6_authorization VALUES(true,false,NULL,$1)",[manifest]);
  await c.query(readFileSync("migrations/staged/V0104__phase5_physical_rest_live_authority_retention_guard_v39.sql","utf8"));
  const old=(await c.query("SELECT prosrc,oid::text oid FROM pg_proc WHERE oid='clean.phase5_physical_rest_live_guard_v39()'::regprocedure")).rows[0];
  const candidate=readFileSync("data-collection/phase5/review-tools/p6_private_due_physical_rest_guard_candidate_NOT_FOR_INSTALL.sql","utf8");
  const before=await inspectP6PrivateDueGuardCatalog(c,candidate);
  assert.equal(before.installed,false);
  await c.query(candidate);
  const after=await inspectP6PrivateDueGuardCatalog(c,candidate);
  assert.deepEqual(after,{...before,installed:true});
  await c.query("ALTER TABLE clean.phase5_fids_physical_attempt_v39 DISABLE TRIGGER a01_phase6_fids_private_due_guard_v39");
  await assert.rejects(inspectP6PrivateDueGuardCatalog(c,candidate),/EXACT_TRIGGER_SCOPE/);
  await c.query("ALTER TABLE clean.phase5_fids_physical_attempt_v39 ENABLE TRIGGER a01_phase6_fids_private_due_guard_v39");
  assert.deepEqual(await inspectP6PrivateDueGuardCatalog(c,candidate),after);
  assert.deepEqual((await c.query("SELECT prosrc,oid::text oid FROM pg_proc WHERE oid='clean.phase5_physical_rest_live_guard_v39()'::regprocedure")).rows[0],old);
  assert.equal((await c.query("SELECT count(*)::int n FROM pg_trigger WHERE NOT tgisinternal AND tgenabled='O'")).rows[0].n,4);
  await c.query("UPDATE clean.adb_phase6_authorization SET enabled=true");
  const attempt=async(t)=>c.query("INSERT INTO clean."+t+" VALUES($1)",[manifest]);
  for(const t of sources)await c.query("INSERT INTO phase6_private."+t+" VALUES($1,clock_timestamp()+interval '1 hour',decode('00','hex'))",[manifest]);
  for(const t of physical)await attempt(t);
  for(const t of sources)for(const m of [manifest,foreign]){
   await c.query("INSERT INTO phase6_private."+t+" VALUES($1,clock_timestamp()-interval '1 second',decode('ff','hex'))",[m]);
   for(const target of physical)await assert.rejects(attempt(target),/P6_PRIVATE_CUSTODY_DUE_PHYSICAL_REST_REFUSED/);
   // Failed admission must not mutate/delete source data.
   assert.equal((await c.query("SELECT count(*)::int n FROM phase6_private."+t+" WHERE retention_not_after_utc<=clock_timestamp()")).rows[0].n,1);
   await c.query("DELETE FROM phase6_private."+t+" WHERE retention_not_after_utc<=clock_timestamp()");
  }
  for(const t of physical)assert.equal((await c.query("SELECT count(*)::int n FROM clean."+t)).rows[0].n,1);
  for(const t of sources)assert.equal((await c.query("SELECT count(*)::int n FROM phase6_private."+t)).rows[0].n,1);
  await c.query("UPDATE clean.adb_phase6_authorization SET enabled=false");
  for(const t of physical)await assert.rejects(attempt(t),/P5_PHYSICAL_REST_LIVE_AUTH_NOT_ENABLED_OR_MISMATCHED/);
 }finally{c.release();await pool.end()}
});
