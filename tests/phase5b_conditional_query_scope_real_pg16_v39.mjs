// Disposable local PG16 only; exact owner audit executes real SQL, not a mock.
import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import pg from "pg";
import {readP6ConditionalQueryScope} from "../scripts/v39_phase5b_conditional_query_scope_owner.mjs";
const adminUrl="postgresql://postgres:postgres@127.0.0.1:5432/neondb?sslmode=disable";
const ownerUrl="postgresql://neondb_owner:ci-only-scope@127.0.0.1:5432/neondb?sslmode=disable";
const digest=x=>createHash("sha256").update(x).digest("hex");
test("T086 real PostgreSQL 16 parses and executes the actual owner query with production-shaped columns",async()=>{
 assert.equal(process.env.P6_SCOPE_DISPOSABLE_PG16,"1");
 assert.equal(process.env.DATABASE_URL,adminUrl);
 assert.equal(process.env.ADB_AUTO_COLLECT,"0");
 assert.equal(process.env.V39_PHASE6_PROCESS_ARMED,"0");
 for(const key of ["AERODATABOX_API_KEY","RAPIDAPI_KEY","AERODATABOX_WEBHOOK_SECRET","V39_DATABASE_RUNTIME_URL"])assert.ok(!process.env[key]);
 const a=new pg.Client({connectionString:adminUrl});
 const c=new pg.Client({connectionString:ownerUrl});
 try{
  await a.connect();
  const identity=(await a.query("SELECT current_database() db, current_user AS actor, current_setting('server_version_num')::int v, inet_server_addr()::text ip")).rows[0];
  assert.equal(identity.db,"neondb");assert.equal(identity.actor,"postgres");assert.ok(identity.v>=160000&&identity.v<170000);
  // Deliberately use a fresh fixture schema, no migration or production DSN.
  await a.query("CREATE ROLE neondb_owner LOGIN NOSUPERUSER NOCREATEROLE NOCREATEDB PASSWORD 'ci-only-scope'");
  await a.query("ALTER DATABASE neondb OWNER TO neondb_owner");
  await c.connect();
  await c.query("CREATE SCHEMA clean; CREATE SCHEMA phase6_private");
  await c.query("CREATE TABLE clean.adb_phase6_authorization(manifest_sha256 text,calendar_hash text,enabled boolean,revoked_at_utc timestamptz); CREATE TABLE clean.adb_phase6_calendar_day(calendar_hash text,run_day_index integer,scheduled_start_utc timestamptz,PRIMARY KEY(calendar_hash,run_day_index)); CREATE TABLE clean.phase5_fids_allowed_query_v39(query_digest text PRIMARY KEY,manifest_sha256 text,run_day_index integer,horizon text,planned_dispatch_utc timestamptz,rights_review_sha256 text); CREATE TABLE phase6_private.frozen_native_packet_v39(logical_path text PRIMARY KEY,run_day_index integer,manifest_sha256 text,kind text,retention_not_after_utc timestamptz,externally_reviewed_at_utc timestamptz,rights_sha256 text,content_sha256 text,payload_bytes bytea)");
  const m=digest("manifest"),cal=digest("calendar"),rights=digest("rights"),protocol=digest("protocol");
  const at=Date.now(),stamp=n=>new Date(at+n*3600000).toISOString();
  const reviewed=stamp(-1),planned=stamp(2),cohort=stamp(26),expiry=stamp(30);
  await c.query("INSERT INTO clean.adb_phase6_authorization VALUES($1,$2,true,NULL)",[m,cal]);
  await c.query("INSERT INTO clean.adb_phase6_calendar_day VALUES($1,3,$2),($1,4,$3)",[cal,stamp(24),cohort]);
  async function fixture(name,{marker=true,extra=false,expired=false,absent=false,drift=false,hashDrift=false,wrongRights=false,late=false}={}){
   const q=digest(name);
   await c.query("INSERT INTO clean.phase5_fids_allowed_query_v39 VALUES($1,$2,4,'T-24h',$3,$4)",[q,m,planned,rights]);
   if(absent)return;
   const body={schema:"v39.phase5.github-source-one-query-template.v2",manifestSha256:m,queryDigestSha256:q,plan:{
    independentlyApprovedSourceAndRetention:true,githubOnlyOwnerApproved:true,reviewedProviderRightsSha256:wrongRights?digest("other"):rights,
    day:{runDayIndex:4,scheduledStartUtc:cohort},acquisition:{runDayIndex:4,horizon:"T-24h",scheduledRequestUtc:drift?stamp(3):planned}
   }};
   if(marker)body.plan.conditionalService={cohortStartUtc:cohort,effectiveUtc:stamp(-2),protocolSha256:protocol,reviewedConditionalServiceScope:true,...(extra?{extra:true}:{})};
   const b=Buffer.from(JSON.stringify(body));
   await c.query("INSERT INTO phase6_private.frozen_native_packet_v39 VALUES($1,4,$2,'SOURCE_QUERY_PACKET',$3,$4,$5,$6,$7)",["data-collection/phase5/frozen/sourceq_d4_"+q+".json",m,expired?stamp(-1):expiry,late?planned:reviewed,wrongRights?digest("other"):rights,hashDrift?digest("wrong"):digest(b),b]);
  }
  await fixture("valid");await fixture("native",{marker:false});await fixture("extra",{extra:true});
  await fixture("expired",{expired:true});await fixture("absent",{absent:true});await fixture("drift",{drift:true});
  await fixture("hash",{hashDrift:true});await fixture("rights",{wrongRights:true});await fixture("late",{late:true});
  const x=await readP6ConditionalQueryScope(c),cell=x.cells.find(z=>z.day===4&&z.horizon==="T-24h");
  assert.equal(cell.prepared,9);assert.equal(cell.futurePrepared,9);
  assert.deepEqual(cell.counts,{LIVE_PACKET_UNAVAILABLE:2,PACKET_LEDGER_PARITY_UNVERIFIED:4,NO_CONDITIONAL_SOURCE_MARKER:1,CONDITIONAL_MARKER_INVALID:1,CONDITIONAL_MARKER_CLOCK_AND_SHAPE_MATCH_NOT_SIGNATURE_PROOF:1});
  assert.equal(x.packetSignatureVerified,false);assert.equal(x.actualPreCommitVerified,false);
  assert.equal(x.databaseWrites,0);assert.equal(x.providerCalls,0);
  const counts=(await c.query("SELECT (SELECT count(*)::int FROM clean.phase5_fids_allowed_query_v39) q,(SELECT count(*)::int FROM phase6_private.frozen_native_packet_v39) p")).rows[0];
  assert.deepEqual(counts,{q:9,p:8});
  const who=(await c.query("SELECT current_user=session_user AS same, NOT rolsuper AS non_super FROM pg_roles WHERE rolname=current_user")).rows[0];
  assert.deepEqual(who,{same:true,non_super:true});
 }finally{await c.end().catch(()=>{});await a.end().catch(()=>{});}
});
