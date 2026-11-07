/**
 * True staged PRE writer integration on disposable PostgreSQL16:
 * B0062+staged V0079, one synthetic ORIGINAL, one primary operating member,
 * exact restricted SELECT+INSERT-only PRE writer with immutable deadline.
 * No real provider call or production migration/retention authority.
 */
import {beforeAll,afterAll,describe,it,expect} from "vitest";
import {Pool} from "pg";
import {createHash} from "node:crypto";
import {persistP5V0079SingleBoundFlightPre,
 type P5Stage14SingleFlightPrePermit}
 from "../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39";

const URL="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
const ROLE="phase5_fids_pre_writer_ciuser01";
const RW_URL="postgresql://"+ROLE+":ci-only@localhost:5432/neondb?sslmode=disable";
const active=process.env.V39_P5_STAGE14_REAL_PG16==="1"?describe:describe.skip;
const h=(c:string)=>c.repeat(64);
const manifest=h("a"),query=h("b"),reservation=h("c");
const rights=h("d"),response=h("e"),contract=h("f");
const qid="a23e4567-e89b-42d3-a456-426614174000";
const payload=Buffer.from(JSON.stringify({departures:[{flight:"CI100"}]}));
const bodyHash=createHash("sha256").update(payload).digest("hex");
const iso=(n:number)=>new Date(n).toISOString();
active("Phase5 Stage14 one physical original flight PRE, disposable real PG16",()=>{
 let admin:Pool,writer:Pool,permit:P5Stage14SingleFlightPrePermit;
 beforeAll(async()=>{
  if(process.env.GITHUB_ACTIONS!=="true"||
    process.env.V39_P5_STAGE14_REAL_PG16!=="1"||
    process.env.DATABASE_URL!==URL||
    process.env.AERODATABOX_API_KEY||
    process.env.V39_PHASE6_PROCESS_ARMED!=="0")
    throw Error("REFUSED_STAGE14_NOT_DISPOSABLE_NO_PROVIDER");
  admin=new Pool({connectionString:URL,max:2});
  const now=new Date((await admin.query("SELECT clock_timestamp() AS at")).rows[0].at).getTime();
  const cutoff=new Date(now+150_000);
  const serviceStart=new Date(cutoff.getTime()+24*3600_000);
  const serviceEnd=new Date(serviceStart.getTime()+4*3600_000);
  const dispatch=new Date(now-15*60_000);
  const hardLatest=new Date(now-10*60_000);
  const builderFrozen=iso(now-2*86_400_000);
  await admin.query(
    "INSERT INTO clean.phase5_fids_cycle_budget_v39"+
    "(manifest_sha256,cycle_api_ceiling,other_category_reserved_units,"+
    "protected_api_floor_units) VALUES($1,50000,100,100)",[manifest]);
  await admin.query(
    "INSERT INTO clean.phase5_fids_day_budget_v39"+
    "(manifest_sha256,run_day_index,budget_day_utc,calendar_hash,config_hash,"+
    "frame_hash,early_draw_sha256,daily_api_ceiling,"+
    "daily_other_reserved_units,daily_source_reserved_units)"+
    "VALUES($1,1,$2::date,$3,$4,$5,$6,1900,100,0)",
    [manifest,serviceStart.toISOString().slice(0,10),
      h("1"),h("2"),h("3"),h("4")]);
  await admin.query(
    "INSERT INTO clean.phase5_fids_utc_charge_budget_v39"+
    "(manifest_sha256,charge_day_utc,daily_api_ceiling,"+
    "daily_other_reserved_units) VALUES($1,$2::date,1900,100)",
    [manifest,dispatch.toISOString().slice(0,10)]);
  await admin.query(
    "INSERT INTO clean.phase5_fids_allowed_query_v39"+
    "(query_digest,manifest_sha256,run_day_index,query_key,slot_id,horizon,"+
    "airport_icao,early_draw_sha256,reviewed_release_sha256,"+
    "rights_review_sha256,provider_contract_sha256,github_run_id,"+
    "service_window_start_utc,service_window_end_utc,from_local,to_local,"+
    "airport_iana_timezone,provider_api_version,fids_protocol_version,"+
    "planned_dispatch_utc,planned_charge_utc_date,hard_latest_dispatch_utc,"+
    "prediction_cutoff_utc,api_units_per_attempt,max_physical_attempts,state)"+
    "VALUES($1,$2,1,'stage14_ci_flight_pre','HUB','T-24h','WSSS',"+
    "$3,$4,$5,$6,'42363348762',$7,$8,'2027-01-01T00:00',"+
    "'2027-01-01T04:00','Asia/Singapore','1.15.4','v39',"+
    "$9,$10::date,$11,$12,2,1,'ACTIVE')",
    [query,manifest,h("4"),h("5"),rights,contract,
     serviceStart,serviceEnd,dispatch,
     dispatch.toISOString().slice(0,10),hardLatest,cutoff]);
  await admin.query(
    "INSERT INTO clean.phase5_fids_physical_attempt_v39"+
    "(reservation_sha256,query_digest,manifest_sha256,github_run_id,"+
    "observed_selected_at_utc,charged_utc_date)"+
    "VALUES($1,$2,$3,'42363348762',$4,$5::date)",
    [reservation,query,manifest,new Date(now-48*3600_000),
      dispatch.toISOString().slice(0,10)]);
  const original={
    originalDecodedEntityBodyPreserved:true,
    originalHttpWireBytesPreserved:false,
    originalDecodedEntityBodyEvidence:{
      representation:"FETCH_DECODED_RESPONSE_BODY_BYTES_NOT_HTTP_WIRE",
      bodySha256:bodyHash,bodyBase64:payload.toString("base64"),
      bodyLengthBytes:payload.length
    }
  };
  await admin.query(
    "WITH t AS (SELECT clock_timestamp() AS at)"+
    " INSERT INTO clean.fids_query_response"+
    "(population_query_id,source_airport_icao,query_direction,"+
    "service_window_start_utc,service_window_end_utc,from_local,to_local,"+
    "airport_iana_timezone,fids_retrieval_utc,raw_persisted_at_utc,"+
    "available_at,response_hash,raw_payload,provider_api_version,"+
    "fids_protocol_version,openapi_sha256)"+
    "SELECT $1,'WSSS','Departure',$2,$3,"+
    "'2027-01-01T00:00','2027-01-01T04:00','Asia/Singapore',"+
    "t.at,t.at,t.at,$4,$5::jsonb,'1.15.4','v39',$6 FROM t",
    [qid,serviceStart,serviceEnd,response,JSON.stringify(original),contract]);
  await admin.query(
    "INSERT INTO clean.flight_population"+
    "(source_airport_icao,dep_airport_icao,dep_scheduled_utc,"+
    "window_start_utc,window_end_utc,cutoff_utc,"+
    "source_type,population_query_id,analytic_identity_id,"+
    "canonical_flight_instance_id,population_role,scope_classification,"+
    "available_at,response_hash,flight_number,"+
    "query_direction,from_local,to_local,airport_iana_timezone,"+
    "codeshare_resolution_status,fids_retrieval_utc,"+
    "provider_api_version,fids_protocol_version,openapi_sha256)"+
    "VALUES('WSSS','WSSS',$1,$2,$3,$4,'fids',$5,'leg:ci:100',"+
    "'leg:ci:100','requested_airport_primary','confirmed_core',"+
    "clock_timestamp(),$6,'CI100','Departure',"+
    "'2027-01-01T00:00','2027-01-01T04:00','Asia/Singapore',"+
    "'confirmed_operating_leg',clock_timestamp(),'1.15.4','v39',$7)",
    [serviceStart,serviceStart,serviceEnd,cutoff,qid,response,contract]);
  await admin.query(
    "INSERT INTO clean.phase5_fids_original_binding_v39"+
    "(population_query_id,reservation_sha256,query_digest,manifest_sha256,"+
    "response_hash,decoded_original_body_sha256,rights_review_sha256,"+
    "normalized_members_count,source_expires_at_utc)"+
    "VALUES($1,$2,$3,$4,$5,$6,$7,1,clock_timestamp()+interval '1 hour')",
    [qid,reservation,query,manifest,response,bodyHash,rights]);
  await admin.query("CREATE ROLE "+ROLE+
    " LOGIN PASSWORD 'ci-only' NOSUPERUSER NOCREATEDB NOCREATEROLE");
  await admin.query("GRANT USAGE ON SCHEMA clean TO "+ROLE);
  await admin.query("GRANT SELECT ON clean.phase5_fids_allowed_query_v39,"+
    "clean.phase5_fids_physical_attempt_v39,"+
    "clean.phase5_fids_original_binding_v39,"+
    "clean.fids_query_response,clean.flight_population,"+
    "clean.flight_snapshots TO "+ROLE);
  await admin.query("GRANT INSERT ON clean.flight_snapshots TO "+ROLE);
  await admin.query("GRANT USAGE ON SEQUENCE clean.flight_snapshots_id_seq TO "+ROLE);
  writer=new Pool({connectionString:RW_URL,max:2});
  permit={
    manifestSha256:manifest,queryDigestSha256:query,
    expectedSourcePopulationQueryId:qid,expectedSourceResponseSha256:response,
    runDayIndex:1,slot:"HUB",horizon:"T-24h",airportIcao:"WSSS",
    flightInstanceId:"leg:ci:100",expectedGithubSourceRunId:"42363348762",
    expectedReviewedReleaseSha256:h("5"),
    expectedReviewedSourceRightsSha256:rights,
    expectedProviderContractSha256:contract,
    expectedEarlyDrawSha256:h("4"),
    reviewedFrameSha256:h("3"),reviewedConfigSha256:h("2"),
    independentlyReviewedOperatingLegEvidenceSha256:h("8"),
    independentlyReviewedNativeTEvidenceSha256:h("7"),
    independentlyReviewedRunAndRetentionEvidenceSha256:h("9"),
    frozenBuilderSha256:h("c"),builderFrozenAtUtc:builderFrozen,
    selectedTConfig:{
     milestone:"departure.scheduledTime.utc",version:"ci-only-native-T",
     artifactHash:h("6"),verifiedProviderNativeSchedule:true,
     semanticsEvidenceSha256:h("7")
    },selectedTNativeUtc:serviceStart.toISOString(),
    maxPopulationStalenessSeconds:3600,
    expectedRestrictedPreWriterRole:ROLE,
    externalNativeTPhysicalLegAndSourceUseReviewed:true
  };
 });
 afterAll(async()=>{if(writer)await writer.end();if(admin)await admin.end();});
 it("commits one genuine synthetic source-bound PRE before its own T24 cutoff",async()=>{
  const result=await persistP5V0079SingleBoundFlightPre(writer,permit);
  expect(result.preSnapshotsInserted).toBe(1);
  expect(result.flightPreCommittedBeforeOwnCutoff).toBe(true);
  expect(result.providerCalls).toBe(0);
  expect(result.alertCreates).toBe(0);
  expect(result.externalNativeTIndependentlyAuthenticatedByThisFunction).toBe(false);
  expect(result.phase5FreezePassed).toBe(false);
  expect(result.phase6PaidGo).toBe(false);
  const q=await admin.query(
    "SELECT prediction_state,horizon,population_query_id,"+
    "fids_response_hash,population_member_id IS NOT NULL AS member_linked,"+
    "created_at<=prediction_cutoff_utc AS timely"+
    " FROM clean.flight_snapshots");
  expect(q.rows).toHaveLength(1);
  expect(q.rows[0]).toEqual({
    prediction_state:"PRE_DEPARTURE",horizon:"T-24h",
    population_query_id:qid,fids_response_hash:response,
    member_linked:true,timely:true
  });
 });
 it("refuses to relabel or duplicate an existing PRE",async()=>{
  await expect(persistP5V0079SingleBoundFlightPre(writer,permit))
   .rejects.toThrow("EXISTING_PRE_NEVER_OVERWRITE_OR_RETCON");
  const q=await admin.query("SELECT count(*)::integer AS n FROM clean.flight_snapshots");
  expect(q.rows[0].n).toBe(1);
 });
 it("rejects unauthorized production role, absent native evidence and late cutoff",async()=>{
  await expect(persistP5V0079SingleBoundFlightPre(admin,permit))
    .rejects.toThrow("WRONG_RESTRICTED_PRE_ONLY_DB_ROLE");
  await expect(persistP5V0079SingleBoundFlightPre(writer,{
    ...permit,externalNativeTPhysicalLegAndSourceUseReviewed:false as any
  })).rejects.toThrow("INDEPENDENT_PERMIT");
  const now=Date.now();
  await expect(persistP5V0079SingleBoundFlightPre(writer,{
    ...permit,selectedTNativeUtc:iso(now-15*60_000)
  })).rejects.toThrow("MISSED_OWN_FLIGHT_PRE_CUTOFF_NO_BACKFILL");
  const q=await admin.query("SELECT count(*)::integer AS n FROM clean.flight_snapshots");
  expect(q.rows[0].n).toBe(1);
 });
});
