// Disposable local PG16 only; exact owner audit executes real SQL, not a mock.
import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import pg from "pg";
import {readInventory,readNativeShapeInventory} from "../scripts/v39_phase5b_retention_p7_inventory_owner.mjs";
import {conditionalPreparedRead} from "../scripts/v39_phase6_nonpaid_source_day_github_runtime_v39.mjs";
import {readP6ConditionalQueryScope} from "../scripts/v39_phase5b_conditional_query_scope_owner.mjs";
import {readP6SourceSlotRows,readP6SourceRunReceiptRows} from "../scripts/v39_phase5b_signed_calendar_coverage_owner.mjs";
const adminUrl="postgresql://postgres:postgres@127.0.0.1:5432/neondb?sslmode=disable";
const ownerUrl="postgresql://neondb_owner:ci-only-scope@127.0.0.1:5432/neondb?sslmode=disable";
const digest=x=>createHash("sha256").update(x).digest("hex");
test("T086 real PostgreSQL 16 parses and executes the actual owner query with production-shaped columns",async t=>{
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
  await t.test("T102 exact protected custody SQL uses a restricted login and always rolls back",async()=>{
   // Fixture ACL only: no production grant or proof of production permissions.
   const role="phase5_p30_prepare_login_20261107";
   await a.query("CREATE ROLE phase5_p30_prepare_login_20261107 LOGIN NOSUPERUSER NOCREATEROLE NOCREATEDB PASSWORD 'ci-only-custody'");
   await c.query("GRANT USAGE ON SCHEMA clean TO phase5_p30_prepare_login_20261107");
   await c.query("GRANT SELECT ON clean.phase5_fids_allowed_query_v39 TO phase5_p30_prepare_login_20261107");
   const pool=new pg.Pool({connectionString:"postgresql://"+role+":ci-only-custody@127.0.0.1:5432/neondb?sslmode=disable",max:1});
   const ctx={trust:{manifestSha256:m},requestedDay:4};
   try{
    const who=(await pool.query("SELECT current_user AS actor, NOT rolsuper AS non_super FROM pg_roles WHERE rolname=current_user")).rows[0];
    assert.deepEqual(who,{actor:role,non_super:true});
    const positive=await conditionalPreparedRead(pool,ctx);
    assert.equal(positive.count,9);assert.equal(new Date(positive.clock).toISOString(),positive.clock);
    assert.equal((await conditionalPreparedRead(pool,{...ctx,requestedDay:5})).count,0);
    assert.equal((await conditionalPreparedRead(pool,{...ctx,trust:{manifestSha256:digest("foreign")}})).count,0);
    // The same reusable connection must leave read-only transaction state.
    assert.equal((await pool.query("SHOW transaction_read_only")).rows[0].transaction_read_only,"off");
    await assert.rejects(pool.query("UPDATE clean.phase5_fids_allowed_query_v39 SET run_day_index=5"),e=>e.code==="42501");
    await c.query("REVOKE SELECT ON clean.phase5_fids_allowed_query_v39 FROM phase5_p30_prepare_login_20261107");
    await assert.rejects(conditionalPreparedRead(pool,ctx),e=>e.code==="42501");
    assert.equal((await pool.query("SHOW transaction_read_only")).rows[0].transaction_read_only,"off");
    await c.query("GRANT SELECT ON clean.phase5_fids_allowed_query_v39 TO phase5_p30_prepare_login_20261107");
    assert.equal((await conditionalPreparedRead(pool,ctx)).count,9);
   }finally{await pool.end();}
  });
  await t.test("T092 execute actual slot aggregate with real PG16, bound and missing reservations separated",async()=>{
   await c.query("ALTER TABLE clean.phase5_fids_allowed_query_v39 ADD COLUMN slot_id text NOT NULL DEFAULT 'HUB', ADD COLUMN airport_icao text NOT NULL DEFAULT 'WSSS', ADD COLUMN state text NOT NULL DEFAULT 'PREPARED', ADD COLUMN hard_latest_dispatch_utc timestamptz, ADD COLUMN prediction_cutoff_utc timestamptz");
   await c.query("UPDATE clean.phase5_fids_allowed_query_v39 SET hard_latest_dispatch_utc=$1,prediction_cutoff_utc=$2",[stamp(4),stamp(5)]);
   await c.query("CREATE TABLE clean.phase5_fids_physical_attempt_v39(manifest_sha256 text,query_digest text, reservation_sha256 text,charged_reserved_units int); CREATE TABLE clean.phase5_fids_original_binding_v39(manifest_sha256 text,query_digest text,reservation_sha256 text,population_query_id uuid,bound_at_utc timestamptz,normalized_members_count int)");
   await c.query("INSERT INTO clean.phase5_fids_physical_attempt_v39 VALUES($1,$2,$3,2),($1,$4,$5,2)",[m,digest("valid"),digest("r1"),digest("native"),digest("r2")]);
   await c.query("INSERT INTO clean.phase5_fids_original_binding_v39 VALUES($1,$2,$3,'00000000-0000-0000-0000-000000000001',$4,12)",[m,digest("valid"),digest("r1"),stamp(2)]);
   await c.query("ALTER TABLE clean.phase5_fids_physical_attempt_v39 ADD COLUMN github_run_id text");
   await c.query("UPDATE clean.phase5_fids_physical_attempt_v39 SET github_run_id=CASE WHEN query_digest=$1 THEN '123' ELSE '456' END",[digest("valid")]);
   await c.query("UPDATE clean.phase5_fids_allowed_query_v39 SET slot_id='MID_A',airport_icao='KBUF' WHERE query_digest=$1",[digest("native")]);
   await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
   try{
    const rows=await readP6SourceSlotRows(c,m);
    const hub=rows.find(x=>x.slot_id==="HUB"),mid=rows.find(x=>x.slot_id==="MID_A");
    assert.deepEqual(hub,{run_day_index:4,horizon:"T-24h",slot_id:"HUB",airport_icao:"WSSS",prepared:8,reservations:1,bindings:1,timely_bindings:1,stopped_unreserved:0,elapsed_unreserved:0,open_unreserved:0,future_unreserved:7,reserved_units:2,normalized_member_observations:12});
    assert.deepEqual(mid,{run_day_index:4,horizon:"T-24h",slot_id:"MID_A",airport_icao:"KBUF",prepared:1,reservations:1,bindings:0,timely_bindings:0,stopped_unreserved:0,elapsed_unreserved:0,open_unreserved:0,future_unreserved:0,reserved_units:2,normalized_member_observations:0});
    const receipts=[{runId:123,status:"TIMELY_ORIGINAL_REPORTED_BY_CHILD"},{runId:456,status:"HTTP_NO_CONTENT_UNOBSERVED_NO_ORIGINAL_PROOF"}];
    const corroborated=await readP6SourceRunReceiptRows(c,m,receipts);
    assert.deepEqual(corroborated.rows.map(x=>[x.slot_id,x.runs,x.bound,x.timely_bindings]),[["HUB",1,1,1],["MID_A",1,0,0]]);
    await assert.rejects(readP6SourceRunReceiptRows(c,m,[{...receipts[0],runId:999}]),/RUN_RECEIPT_LEDGER_IDENTITY/);
    await assert.rejects(readP6SourceRunReceiptRows(c,m,[{...receipts[1],runId:123}]),/RUN_RECEIPT_CUSTODY_CONTRADICTION/);
   }finally{await c.query("ROLLBACK");}
  });

  await t.test("T118 native field census uses actual PG16, overlapping failures, exact live originals and count parity",async()=>{
   await c.query("ALTER TABLE clean.phase5_fids_original_binding_v39 ADD COLUMN response_hash text, ADD COLUMN source_expires_at_utc timestamptz");
   await c.query("UPDATE clean.phase5_fids_original_binding_v39 SET response_hash=$1,source_expires_at_utc=$2,bound_at_utc=$3,normalized_members_count=7",[digest("response"),stamp(3),stamp(-1)]);
   await c.query("CREATE TABLE clean.fids_query_response(population_query_id uuid PRIMARY KEY,response_hash text,raw_payload jsonb,raw_expired_at_utc timestamptz,source_airport_icao text,query_direction text); CREATE TABLE clean.flight_population(id integer PRIMARY KEY,population_query_id uuid,analytic_identity_id text,canonical_flight_instance_id text,source_airport_icao text,dep_airport_icao text,population_role text,scope_classification text,codeshare_resolution_status text,source_type text,response_hash text,provider_content_expired_at_utc timestamptz,query_direction text,population_member_id text,dep_scheduled_utc timestamptz)");
   const pop="00000000-0000-0000-0000-000000000001",expiredPop="00000000-0000-0000-0000-000000000002";
   const response=digest("response");
   await c.query("INSERT INTO clean.fids_query_response VALUES($1,$2,'{}',NULL,'WSSS','Departure'),($3,NULL,NULL,$4,'KBUF','Departure')",[pop,response,expiredPop,stamp(-1)]);
   await c.query("INSERT INTO clean.phase5_fids_original_binding_v39(manifest_sha256,query_digest,reservation_sha256,population_query_id,bound_at_utc,normalized_members_count,response_hash,source_expires_at_utc) VALUES($1,$2,$3,$4,$5,1,$6,$5)",[m,digest("native"),digest("r2"),expiredPop,stamp(-1),digest("expired")]);
   const row=async(id,identity,canonical,dep,scope,leg,hash,scheduled)=>{
    await c.query("INSERT INTO clean.flight_population VALUES($1,$2,$3,$4,'WSSS',$5,'requested_airport_primary',$6,$7,'fids',$8,NULL,'Departure','member',$9)",[id,pop,identity,canonical,dep,scope,leg,hash,scheduled]);
   };
   await row(1,"native-good","native-good","WSSS","confirmed_core","confirmed_operating_leg",response,stamp(30));
   await row(2,"provisional-1",null,null,"unknown","unknown",response,null);
   await row(3,"native-dup","native-dup","WSSS","confirmed_core","confirmed_operating_leg",response,stamp(30));
   await row(4,"native-dup","native-dup","WSSS","confirmed_core","confirmed_operating_leg",response,stamp(30));
   await row(5,"native-other","native-other","WSSS","confirmed_core","confirmed_operating_leg",digest("wrong"),stamp(30));
   await row(6,"leg:p5v1:invalid","leg:p5v1:invalid","WSSS","confirmed_core","confirmed_operating_leg",response,stamp(30));
   await c.query("INSERT INTO clean.flight_population VALUES(7,$1,'native-bad','native-bad','KBUF','WSSS','context','confirmed_core','confirmed_operating_leg','other',$2,$3,'Arrival',NULL,$4)",[pop,response,stamp(-1),stamp(30)]);
   const result=await readNativeShapeInventory(c,4);
   assert.equal(result.cells.length,1);
   const cell=result.cells[0];
   assert.equal(cell.live_originals,1);assert.equal(cell.observed_members,7);assert.equal(cell.expected_members,7);
   assert.equal(cell.all_shape_fields_pass,1);assert.equal(cell.duplicate_identity,2);
   assert.equal(cell.invalid_identity_shape,1);assert.equal(cell.source_airport_mismatch,1);assert.equal(cell.nonprimary_role,1);
   assert.equal(cell.nonfids_source,1);assert.equal(cell.expired_member_marker,1);assert.equal(cell.wrong_direction,1);assert.equal(cell.missing_member_id,1);
   assert.equal(cell.canonical_mismatch,1);assert.equal(cell.departure_airport_mismatch,1);
   assert.equal(cell.noncore_scope,1);assert.equal(cell.unconfirmed_operating_leg,1);
   assert.equal(cell.response_mismatch,1);assert.equal(cell.missing_scheduled_time,1);
   assert.equal(cell.member_count_mismatch_originals,0);assert.equal(result.actualPreCommitVerified,false);
   assert.equal(result.databaseWrites,0);assert.equal(result.providerCalls,0);
   assert.ok(!JSON.stringify(result).includes("native-good"));assert.ok(!JSON.stringify(result).includes(response));
   assert.deepEqual((await readNativeShapeInventory(c,5)).cells,[]);
   await c.query("UPDATE clean.phase5_fids_original_binding_v39 SET normalized_members_count=8 WHERE population_query_id=$1",[pop]);
   assert.equal((await readNativeShapeInventory(c,4)).cells[0].member_count_mismatch_originals,1);
   await assert.rejects(readNativeShapeInventory(c,32),/NATIVE_SHAPE_SCOPE/);
   assert.equal((await c.query("SHOW transaction_read_only")).rows[0].transaction_read_only,"off");
  });
  await t.test("T127 exact near-expiry owner reconciliation executes on restricted PG16 with no writes",async()=>{
   const q=digest("near-expiry"),pqi="00000000-0000-0000-0000-000000000003",response=digest("near-response");
   await c.query("ALTER TABLE clean.phase5_fids_allowed_query_v39 ADD COLUMN service_window_start_utc timestamptz, ADD COLUMN service_window_end_utc timestamptz");
   await c.query("UPDATE clean.phase5_fids_allowed_query_v39 SET service_window_start_utc=$1,service_window_end_utc=$2",[stamp(-1),stamp(4)]);
   await c.query("ALTER TABLE clean.fids_query_response ADD COLUMN available_at timestamptz, ADD COLUMN raw_persisted_at_utc timestamptz");
   await c.query("UPDATE clean.fids_query_response SET available_at=$1,raw_persisted_at_utc=$2 WHERE population_query_id=$3",[stamp(-1),stamp(-2),"00000000-0000-0000-0000-000000000001"]);
   await c.query("ALTER TABLE clean.flight_population ADD COLUMN available_at timestamptz");
   await c.query("INSERT INTO clean.phase5_fids_allowed_query_v39(query_digest,manifest_sha256,run_day_index,horizon,planned_dispatch_utc,rights_review_sha256,slot_id,airport_icao,state,prediction_cutoff_utc,service_window_start_utc,service_window_end_utc) VALUES($1,$2,4,'T-90m',$3,$4,'HUB','WSSS','ACTIVE',$5,$6,$7)",[q,m,stamp(-1),rights,stamp(30),stamp(-1),stamp(4)]);
   await c.query("INSERT INTO clean.fids_query_response(population_query_id,response_hash,raw_payload,raw_expired_at_utc,source_airport_icao,query_direction,available_at,raw_persisted_at_utc) VALUES($1,$2,'{}',NULL,'WSSS','Departure',$3,$4)",[pqi,response,stamp(-1),stamp(-2)]);
   await c.query("INSERT INTO clean.phase5_fids_original_binding_v39(manifest_sha256,query_digest,reservation_sha256,population_query_id,bound_at_utc,normalized_members_count,response_hash,source_expires_at_utc) VALUES($1,$2,$3,$4,$5,1,$6,$7)",[m,q,digest("near-reservation"),pqi,stamp(-0.5),response,stamp(40/60)]);
   await c.query("INSERT INTO clean.flight_population(id,population_query_id,analytic_identity_id,canonical_flight_instance_id,source_airport_icao,dep_airport_icao,population_role,scope_classification,codeshare_resolution_status,source_type,response_hash,provider_content_expired_at_utc,query_direction,population_member_id,dep_scheduled_utc,available_at) VALUES(8,$1,'near-valid','near-valid','WSSS','WSSS','requested_airport_primary','confirmed_core','confirmed_operating_leg','fids',$2,NULL,'Departure','member-near',$3,$4)",[pqi,response,stamp(120/60),stamp(-50/60)]);
   await c.query("CREATE TABLE clean.phase5_cd_pre_task_v39(manifest_sha256 text,source_population_query_id text,source_response_sha256 text,horizon text,state text); CREATE TABLE clean.flight_snapshots(id bigint,population_query_id text,fids_response_hash text,horizon text,prediction_state text,created_at timestamptz,prediction_cutoff_utc timestamptz); CREATE SCHEMA phase7_private; CREATE TABLE phase7_private.pre_fragment_v39(split text,horizon text,research_expiry_utc timestamptz); CREATE TABLE phase7_private.derived_release_bundle_v39(research_expiry_utc timestamptz); CREATE TABLE phase7_private.pre_source_link_v39(id bigint); CREATE TABLE phase7_private.pre_preservation_policy_v39(id bigint)");
   const before=(await c.query("SELECT count(*)::int n FROM clean.fids_query_response WHERE raw_payload IS NOT NULL AND raw_expired_at_utc IS NULL")).rows[0].n;
   const x=await readInventory(c);
   assert.equal(x.nearExpiry.globalEligibleNextHour,1);
   assert.equal(x.nearExpiry.studyScopedCandidates,1);
   assert.equal(x.nearExpiry.candidates[0].runDayIndex,4);
   assert.equal(x.nearExpiry.candidates[0].airportStratum,"HUB");
   assert.equal(x.nearExpiry.candidates[0].horizon,"T-90m");
   assert.equal(x.nearExpiry.candidates[0].cutoffLeadPreScreenMembers,1);
   assert.equal(x.nearExpiry.candidates[0].existingV0087Tasks.total,0);
   assert.equal(x.nearExpiry.candidates[0].sourceLinkedPreRows,0);
   assert.equal(x.nearExpiry.candidates[0].privatePacketsForStudyDay.sourceLinkedToThisOriginal,false);
   assert.equal(x.nearExpiry.finalScientificEligibilityCertified,false);
   assert.equal(x.nearExpiry.stage14PermitIssued,false);
   assert.equal(x.databaseWrites,0);
   assert.equal((await c.query("SELECT count(*)::int n FROM clean.fids_query_response WHERE raw_payload IS NOT NULL AND raw_expired_at_utc IS NULL")).rows[0].n,before);
   assert.equal((await c.query("SHOW transaction_read_only")).rows[0].transaction_read_only,"off");
   assert.ok(!JSON.stringify(x).includes(pqi));
  });
 }finally{await c.end().catch(()=>{});await a.end().catch(()=>{});}
});
