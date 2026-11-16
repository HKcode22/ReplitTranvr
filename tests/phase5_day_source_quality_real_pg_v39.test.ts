import {P6_SOURCE_RESERVATION_SQL} from "../server/lib/disruption/phase6RollingRestSettlementReadback_v39.mjs";
/**
 * Phase5 daily PRE denominator regression against authentic disposable
 * B0062 + staged V0079 PostgreSQL16. All bodies/IDs synthetic CI fixtures;
 * no AeroDataBox GET, production DB or account-specific source-use proof.
 */
import {beforeAll,afterAll,describe,it,expect} from "vitest";
import {Pool} from "pg";
import {createHash} from "node:crypto";
import {auditPhase5SourceDay,P5_DAILY_PRE_SNAPSHOT_CANDIDATE_SQL}
 from "../server/lib/disruption/phase5DaySourceQualityReadonly_v39";

const URL="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
const suite=process.env.V39_P5_DAILY_QA_REAL_PG16==="1"?describe:describe.skip;
const sha=(c:string)=>c.repeat(64);
const manifest=sha("a"),query=sha("b"),reservation=sha("c");
const rights=sha("d"),fidsHash=sha("e"),contract=sha("f");
const pid="d23e4567-e89b-42d3-a456-426614174000";
const body=Buffer.from(JSON.stringify({departures:[{number:"AB123"}]}));
const bodySha=createHash("sha256").update(body).digest("hex");

suite("Phase5 authentic PG16 PRE quality / exact bound original flight lineage",()=>{
 let db:Pool;let cutoff:Date;
 beforeAll(async()=>{
  if(process.env.GITHUB_ACTIONS!=="true"||
    process.env.DATABASE_URL!==URL||
    process.env.V39_PHASE6_PROCESS_ARMED!=="0"||
    process.env.AERODATABOX_API_KEY)
    throw Error("REFUSED_NOT_DISPOSABLE_P5_PRE_QA");
  db=new Pool({connectionString:URL,max:2});
  const now=new Date((await db.query("SELECT clock_timestamp() AS at")).rows[0].at);
  const serviceStart=new Date(now.getTime()+30*3600_000);
  cutoff=new Date(serviceStart.getTime()-24*3600_000);
  const requested=new Date(now.getTime()+60_000);
  const hardLatest=new Date(now.getTime()+120_000);
  // These budget/queries and proof flags are synthetic disposable test data.
  await db.query("INSERT INTO clean.phase5_fids_cycle_budget_v39"+
    "(manifest_sha256,cycle_api_ceiling,other_category_reserved_units,"+
    "protected_api_floor_units) VALUES($1,50000,10,100)",[manifest]);
  await db.query("INSERT INTO clean.phase5_fids_day_budget_v39"+
    "(manifest_sha256,run_day_index,budget_day_utc,calendar_hash,config_hash,"+
    "frame_hash,early_draw_sha256,daily_api_ceiling,"+
    "daily_other_reserved_units,daily_source_reserved_units)"+
    "VALUES($1,1,$2::date,$3,$4,$5,$6,1900,5,0)",[
      manifest,serviceStart.toISOString().slice(0,10),sha("1"),sha("2"),
      sha("3"),sha("4")]);
  await db.query("INSERT INTO clean.phase5_fids_utc_charge_budget_v39"+
    "(manifest_sha256,charge_day_utc,daily_api_ceiling,"+
    "daily_other_reserved_units) VALUES($1,$2::date,1900,0)",
    [manifest,requested.toISOString().slice(0,10)]);
  await db.query("INSERT INTO clean.phase5_fids_allowed_query_v39"+
    "(query_digest,manifest_sha256,run_day_index,query_key,slot_id,horizon,"+
    "airport_icao,early_draw_sha256,reviewed_release_sha256,"+
    "rights_review_sha256,provider_contract_sha256,github_run_id,"+
    "service_window_start_utc,service_window_end_utc,from_local,to_local,"+
    "airport_iana_timezone,provider_api_version,fids_protocol_version,"+
    "planned_dispatch_utc,planned_charge_utc_date,hard_latest_dispatch_utc,"+
    "prediction_cutoff_utc,api_units_per_attempt,max_physical_attempts,state)"+
    "VALUES($1,$2,1,'ci_qa_bound_fids_01','HUB','T-24h','WSSS',$3,$4,$5,$6,"+
    "'42360764143',$7,$8,'2027-01-01T00:00','2027-01-01T04:00',"+
    "'Asia/Singapore','1.15.4','v39',$9,$10::date,$11,$12,2,1,'ACTIVE')",
    [query,manifest,sha("4"),sha("5"),rights,contract,serviceStart,
      new Date(serviceStart.getTime()+4*3600_000),requested,
      requested.toISOString().slice(0,10),hardLatest,cutoff]);
  await db.query("INSERT INTO clean.phase5_fids_physical_attempt_v39"+
    "(reservation_sha256,query_digest,manifest_sha256,github_run_id,"+
    "observed_selected_at_utc,charged_utc_date)"+
    "VALUES($1,$2,$3,'42360764143',$4,$5::date)",
    [reservation,query,manifest,new Date(now.getTime()-30*3600_000),
     requested.toISOString().slice(0,10)]);
  // One single timestamp for source retrieval/raw durability/availability;
  // authentic V0079 trigger sees this ORIGINAL exactly after reservation.
  const raw={
    originalDecodedEntityBodyPreserved:true,
    originalHttpWireBytesPreserved:false,
    originalDecodedEntityBodyEvidence:{
      representation:"FETCH_DECODED_RESPONSE_BODY_BYTES_NOT_HTTP_WIRE",
      bodySha256:bodySha,bodyBase64:body.toString("base64"),
      bodyLengthBytes:body.length
    }
  };
  await db.query("WITH t AS (SELECT clock_timestamp() AS at)"+
    " INSERT INTO clean.fids_query_response"+
    "(population_query_id,source_airport_icao,query_direction,"+
    "service_window_start_utc,service_window_end_utc,from_local,to_local,"+
    "airport_iana_timezone,fids_retrieval_utc,raw_persisted_at_utc,"+
    "available_at,response_hash,raw_payload,provider_api_version,"+
    "fids_protocol_version,openapi_sha256)"+
    "SELECT $1,'WSSS','Departure',$2,$3,"+
    "'2027-01-01T00:00','2027-01-01T04:00','Asia/Singapore',"+
    "t.at,t.at,t.at,$4,$5::jsonb,'1.15.4','v39',$6 FROM t",
    [pid,serviceStart,new Date(serviceStart.getTime()+4*3600_000),
     fidsHash,JSON.stringify(raw),contract]);
  await db.query("INSERT INTO clean.flight_population"+
    "(source_airport_icao,window_start_utc,window_end_utc,cutoff_utc,"+
    "source_type,population_query_id,analytic_identity_id,"+
    "canonical_flight_instance_id,population_role,scope_classification,"+
    "available_at,response_hash,flight_number,"+
    "query_direction,from_local,to_local,airport_iana_timezone,"+
    "codeshare_resolution_status,fids_retrieval_utc,"+
    "provider_api_version,fids_protocol_version,openapi_sha256)"+
    "VALUES('WSSS',$1,$2,$3,'fids',$4,'leg:ci:one',"+
    "'leg:ci:one','requested_airport_primary','confirmed_core',"+
    "clock_timestamp(),$5,'AB123','Departure',"+
    "'2027-01-01T00:00','2027-01-01T04:00','Asia/Singapore',"+
    "'confirmed_operating_leg',clock_timestamp(),'1.15.4','v39',$6)",
    [serviceStart,new Date(serviceStart.getTime()+4*3600_000),
     cutoff,pid,fidsHash,contract]);
  await db.query("INSERT INTO clean.phase5_fids_original_binding_v39"+
    "(population_query_id,reservation_sha256,query_digest,manifest_sha256,"+
    "response_hash,decoded_original_body_sha256,rights_review_sha256,"+
    "normalized_members_count,source_expires_at_utc)"+
    "VALUES($1,$2,$3,$4,$5,$6,$7,1,clock_timestamp()+interval '1 hour')",
    [pid,reservation,query,manifest,fidsHash,bodySha,rights]);
  // persistPreSnapshot() in production leaves population_member_id NULL.
  // The approved QA readback MUST NOT rely on this optional UUID.
  for(const [id,state,hash] of [
    ["leg:ci:one","PRE_DEPARTURE",fidsHash],
    ["leg:ci:unknown","PRE_DEPARTURE",fidsHash],
    ["leg:ci:airborne","AIRBORNE",fidsHash],
    ["leg:ci:one-wronghash","PRE_DEPARTURE",sha("0")]
  ]){
   await db.query("INSERT INTO clean.flight_snapshots"+
     "(flight_instance_id,prediction_state,horizon,prediction_cutoff_utc,"+
     "selected_t_milestone_utc,selected_t_version,population_query_id,"+
     "fids_response_hash,builder_version)"+
     "VALUES($1,$2,'T-24h',$3,$4,'ci-native-T-pending',$5,$6,'ci')",
     [id,state,cutoff,serviceStart,pid,hash]);
  }
 });
 afterAll(async()=>{if(db)await db.end()});
 it("compiles source/physical-leg joins on real B0062 and staged V0079",async()=>{
  const plan=await db.query("EXPLAIN "+P5_DAILY_PRE_SNAPSHOT_CANDIDATE_SQL,
    [manifest,1,new Date()]);
  expect(plan.rows.length).toBeGreaterThan(0);
 });
 it("counts 3 matching-original PRE rows but only ONE source-clock and leg-valid candidate",async()=>{
  const r=await auditPhase5SourceDay(db,manifest,1);
  expect(r.sourceQueryGroups[0].plannedQueries).toBe(1);
  expect(r.totalBoundOriginals).toBe(1);
  expect(r.sourceQueryGroups[0].populationObservationRows).toBe(1);
  expect(r.sourceQueryGroups[0].currentlyLinkedPopulationRows).toBe(1);
  const t24=r.preCandidateSnapshots.find(x=>x.horizon==="T-24h");
  expect(t24).toEqual({horizon:"T-24h",rowsSeen:3,clockOrderCandidates:1,
   unexpiredClockOrderCandidates:1,expiredClockOrderCandidates:0,expiredSourceLinkedSnapshots:0});
  expect(r.actualFlightLevelPreCertified).toBe(false);
  expect(r.providerRawContentsRead).toBe(false);
  expect(r.providerCalls).toBe(0);
  expect(r.databaseWrites).toBe(0);
  const nullIds=(await db.query("SELECT COUNT(*)::int n FROM clean.flight_snapshots"+
    " WHERE population_member_id IS NULL")).rows[0].n;
  // The B0062 BEFORE INSERT trigger positively attaches the one matching
  // primary member, but cannot attach the other three synthetic identities.
  // The audit must count by exact source/query identity and never rely on
  // the optional population-member UUID for all historical PRE observations.
  expect(nullIds).toBe(3);
  const linked=(await db.query("SELECT population_member_id IS NOT NULL AS linked"+
    " FROM clean.flight_snapshots WHERE flight_instance_id='leg:ci:one'")).rows[0];
  expect(linked.linked).toBe(true);
 });
 it("distinguishes a source whose retention clock has elapsed from collection failure without altering originals",async()=>{
  // Preserve PostgreSQL microseconds at the exact equality boundary; JS Date truncates them.
  const afterExpiry=(await db.query("SELECT source_expires_at_utc::text AS exact_expiry FROM clean.phase5_fids_original_binding_v39 WHERE population_query_id=$1",[pid])).rows[0].exact_expiry;
  const rows=(await db.query(P5_DAILY_PRE_SNAPSHOT_CANDIDATE_SQL,[manifest,1,afterExpiry])).rows;
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({horizon:"T-24h",snapshots_seen:3,clock_order_candidate_pre:1,
   unexpired_clock_order_candidate_pre:0,expired_clock_order_candidate_pre:1,expired_source_linked_pre:2});
 });
 it("preserves historical counts and expired linkage after the actual B0062 tombstoned purge",async()=>{
  const c=await db.connect();
  try{
   await c.query("BEGIN");
   // Disposable test-only: exercise real audited expiry, not a mocked NULL.
   await c.query("INSERT INTO clean.retention_tombstone(surface,record_id,content_hash,expired_at,plan_hash,content_class,source_table,content_columns,retention_rule,expiry_run_id,deletion_mode) VALUES('primary',$1,$2,clock_timestamp(),$3,'fids_population','clean.fids_query_response',ARRAY['raw_payload'],'synthetic-ci-only','ci-expiry','content-nullification')",["fids_query_response:"+pid+":raw_payload",bodySha,manifest]);
   await c.query("UPDATE clean.fids_query_response SET raw_payload=NULL,raw_expired_at_utc=clock_timestamp() WHERE population_query_id=$1",[pid]);
   await c.query("COMMIT");
  }catch(e){await c.query("ROLLBACK");throw e;}finally{c.release();}
  const meta=(await db.query("SELECT response_hash IS NULL AS hash_cleared,raw_expired_at_utc IS NOT NULL AS expired FROM clean.fids_query_response WHERE population_query_id=$1",[pid])).rows[0];
  expect(meta).toEqual({hash_cleared:true,expired:true});
  const members=(await db.query("SELECT COUNT(*)::int n FROM clean.flight_population WHERE population_query_id=$1",[pid])).rows[0].n;
  expect(members).toBe(0);
  const settlement=(await db.query(P6_SOURCE_RESERVATION_SQL,[manifest,["42360764143"]])).rows;
  expect(settlement).toHaveLength(1);
  expect(settlement[0]).toMatchObject({units:2,original_state:"EXPIRED_SOURCE_BINDING_METADATA_ONLY"});
  const audit=await auditPhase5SourceDay(db,manifest,1);
  expect(audit.sourceQueryGroups[0]).toMatchObject({boundOriginals:1,populationObservationRows:1,currentlyLinkedPopulationRows:0});
  expect(audit.preCandidateSnapshots).toEqual([{horizon:"T-24h",rowsSeen:3,clockOrderCandidates:0,
   unexpiredClockOrderCandidates:0,expiredClockOrderCandidates:0,expiredSourceLinkedSnapshots:2}]);
  expect(audit.day1SourceSafetyReview?.measuredSourceLoss).toContain("EXPIRED_LINKED_PRE_RECEIPTS_NOT_MISSED_COLLECTION_OR_CURRENT_USABLE_DATA");
  expect(audit.day1SourceSafetyReview?.expiredReceiptCertifiesHistoricalPreOrCurrentTrainingData).toBe(false);
 });

});
