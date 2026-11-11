/**
 * The source fixture below is the same verified synthetic FIDS-original,
 * normalized flight-population and V0079 binding fixture reused from the
 * 32-flight Stage14 C+D SQL tests. NO provider HTTP or live Neon.
 *
 * This test differs by applying REAL staged V0087 + V0088, not p5_cd_stage14_ci.
 */
import {beforeAll,afterAll,describe,it,expect} from "vitest";
import {Pool} from "pg";
import {createHash} from "node:crypto";
import {URL as NodeURL} from "node:url";
import {
 persistP5V0079SingleBoundFlightPre,
 type P5Stage14SingleFlightPrePermit
} from "../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39";
import {persistPreSnapshot,type PreSnapshot}
 from "../server/lib/disruption/preSnapshotBuilder_v3";

const URL=process.env.DATABASE_URL??"";
const active=process.env.V39_P5_CD_V0088_STAGE14_CI==="1"?describe:describe.skip;
const ROLE="phase5_fids_pre_writer_cd_ciuser01";
const LOGIN_URL=process.env.P5_CD_CI_WRITER_URL??"";
const h=(c:string)=>c.repeat(64),iso=(n:number)=>new Date(n).toISOString();
const manifest=h("a"),query=h("b"),reservation=h("c"),
 rights=h("d"),response=h("e"),contract=h("f");
const qid="c23e4567-e89b-42d3-a456-426614174013";
const FLIGHTS=32;
const RECEIPT=process.env.V39_P5_CD_STAGE14_RECEIPT_DISPOSABLE==="1";
const SCOPED=process.env.V39_P5_CD_STAGE14_SCOPED_DISPOSABLE==="1";
const LEGACY_ROLE="phase5_cd_legacy_ciuser01";
type Claim={id:string;flight_instance_id:string;horizon:"T-24h";
 selected_native_t:string;own_cutoff:string;packet_sha:string;
 generation:number;owner:string;lease_until:string};
active("Phase5 C+D actual Stage14 source-bound parallel PRE on disposable PG16",()=>{
 let admin:Pool,writer:Pool,legacy:Pool|undefined,permit:P5Stage14SingleFlightPrePermit;
 let cutoffMs=0;
 beforeAll(async()=>{
  if(process.env.GITHUB_ACTIONS!=="true"||
    process.env.V39_P5_CD_V0088_STAGE14_CI!=="1"||
    process.env.DATABASE_URL!==URL||
    process.env.V39_PHASE6_PROCESS_ARMED!=="0"||
    process.env.ADB_AUTO_COLLECT!=="0"||
    process.env.AERODATABOX_API_KEY||
    process.env.AERODATABOX_WEBHOOK_SECRET||
    process.env.P5_V39_PRE_DATABASE_URL||
    process.env.P5_V39_OTHER_REST_RESERVE_DATABASE_URL)
   throw Error("REFUSED_CD_STAGE14_NOT_DISPOSABLE_NO_PROVIDER");
  if(!/^[A-Za-z0-9-]{6,40}$/.test(process.env.P5_CD_CI_PASSWORD??"")||
    !LOGIN_URL.includes("localhost:5432/neondb"))
   throw Error("REFUSED_CD_TEST_LOCAL_DUMMY_CREDENTIALS_MISSING");
  let localOnly=false;
  try{
   const u=new NodeURL(URL);
   localOnly=u.protocol==="postgresql:"&&u.hostname==="localhost"&&
    u.port==="5432"&&u.pathname==="/neondb"&&
    u.username==="postgres"&&u.searchParams.get("sslmode")==="disable";
  }catch{}
  if(!localOnly)throw Error("REFUSED_CD_TEST_NONLOCAL_DATABASE");
  admin=new Pool({connectionString:URL,max:3});
  const who=(await admin.query(
   "SELECT current_database() AS db,current_user AS role,"+
   "current_setting('server_version_num')::integer AS ver"
  )).rows[0];
  if(who.db!=="neondb"||who.role!=="postgres"||who.ver<160000)
   throw Error("REFUSED_CD_STAGE14_WRONG_PG_TARGET");
  const now=new Date((await admin.query(
   "SELECT clock_timestamp() AS at")).rows[0].at).getTime();
  // Real Stage14 accepts only last three minutes and requires COMMIT
  // plus readback before cutoff. Allow 165 seconds for this small test.
  cutoffMs=now+165_000;
  const cutoff=new Date(cutoffMs),native=new Date(cutoffMs+86_400_000);
  const end=new Date(native.getTime()+4*3600_000);
  const dispatch=new Date(now-15*60_000);
  const arr=Array.from({length:FLIGHTS},(_,i)=>({
   flight:"CD"+String(i+1).padStart(3,"0")
  }));
  const payload=Buffer.from(JSON.stringify({departures:arr}));
  const bodyHash=createHash("sha256").update(payload).digest("hex");
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
   "INSERT INTO clean.phase5_fids_cycle_budget_v39"+
   "(manifest_sha256,cycle_api_ceiling,other_category_reserved_units,"+
   "protected_api_floor_units) VALUES($1,50000,100,100)",[manifest]);
  await admin.query(
   "INSERT INTO clean.phase5_fids_day_budget_v39"+
   "(manifest_sha256,run_day_index,budget_day_utc,calendar_hash,config_hash,"+
   "frame_hash,early_draw_sha256,daily_api_ceiling,"+
   "daily_other_reserved_units,daily_source_reserved_units)"+
   "VALUES($1,1,$2::date,$3,$4,$5,$6,1900,100,0)",
   [manifest,native.toISOString().slice(0,10),h("1"),h("2"),h("3"),h("4")]);
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
   "VALUES($1,$2,1,'cd_parallel_stage14_ci','HUB','T-24h','WSSS',"+
   "$3,$4,$5,$6,'42363348888',$7,$8,'2027-01-01T00:00',"+
   "'2027-01-01T04:00','Asia/Singapore','1.15.4','v39',"+
   "$9,$10::date,$11,$12,2,1,'ACTIVE')",
   [query,manifest,h("4"),h("5"),rights,contract,native,end,
    dispatch,dispatch.toISOString().slice(0,10),
    new Date(now-10*60_000),cutoff]);
  await admin.query(
   "INSERT INTO clean.phase5_fids_physical_attempt_v39"+
   "(reservation_sha256,query_digest,manifest_sha256,github_run_id,"+
   "observed_selected_at_utc,charged_utc_date)"+
   "VALUES($1,$2,$3,'42363348888',$4,$5::date)",
   [reservation,query,manifest,new Date(now-48*3600_000),
    dispatch.toISOString().slice(0,10)]);
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
   [qid,native,end,response,JSON.stringify(original),contract]);
  for(let i=1;i<=FLIGHTS;i++){
   const flight="leg:ci:cd:"+String(i).padStart(3,"0");
   const fn="CD"+String(i).padStart(3,"0");
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
    "VALUES('WSSS','WSSS',$1,$2,$3,$4,'fids',$5,$6,"+
    "$6,'requested_airport_primary','confirmed_core',"+
    "clock_timestamp(),$7,$8,'Departure',"+
    "'2027-01-01T00:00','2027-01-01T04:00','Asia/Singapore',"+
    "'confirmed_operating_leg',clock_timestamp(),'1.15.4','v39',$9)",
    [native,native,end,cutoff,qid,flight,response,fn,contract]);
  }
  await admin.query(
   "INSERT INTO clean.phase5_fids_original_binding_v39"+
   "(population_query_id,reservation_sha256,query_digest,manifest_sha256,"+
   "response_hash,decoded_original_body_sha256,rights_review_sha256,"+
   "normalized_members_count,source_expires_at_utc)"+
   "VALUES($1,$2,$3,$4,$5,$6,$7,$8,clock_timestamp()+interval '1 hour')",
   [qid,reservation,query,manifest,response,bodyHash,rights,FLIGHTS]);
  await admin.query("CREATE ROLE "+ROLE+
   " LOGIN PASSWORD '"+process.env.P5_CD_CI_PASSWORD+"' NOSUPERUSER NOCREATEDB NOCREATEROLE");
  await admin.query("GRANT USAGE ON SCHEMA clean TO "+ROLE);
  await admin.query(
   "GRANT SELECT ON clean.phase5_fids_allowed_query_v39,"+
   "clean.phase5_fids_physical_attempt_v39,"+
   "clean.phase5_fids_original_binding_v39,"+
   "clean.fids_query_response,clean.flight_population,"+
   "clean.flight_snapshots TO "+ROLE);
  await admin.query("GRANT INSERT ON clean.flight_snapshots TO "+ROLE);
  await admin.query("GRANT USAGE ON SEQUENCE clean.flight_snapshots_id_seq TO "+ROLE);
  writer=new Pool({connectionString:LOGIN_URL,max:10});
  if(SCOPED){
   if(!RECEIPT)throw Error("REFUSED_SCOPED_CI_WITHOUT_RECEIPT");
   await admin.query("CREATE ROLE "+LEGACY_ROLE+
    " LOGIN PASSWORD '"+process.env.P5_CD_CI_PASSWORD+"'"+
    " NOSUPERUSER NOCREATEDB NOCREATEROLE");
   await admin.query("GRANT USAGE ON SCHEMA clean TO "+LEGACY_ROLE);
   await admin.query("GRANT SELECT,INSERT ON clean.flight_snapshots TO "+LEGACY_ROLE);
   // The pre-existing population-member attachment trigger is INVOKER
   // security: even the old writer needs SELECT on flight_population.
   await admin.query("GRANT SELECT ON clean.flight_population TO "+LEGACY_ROLE);
   await admin.query("GRANT USAGE ON SEQUENCE clean.flight_snapshots_id_seq TO "+LEGACY_ROLE);
   legacy=new Pool({
    connectionString:LOGIN_URL.replace(ROLE,LEGACY_ROLE),max:2
   });
  }

  permit={
   manifestSha256:manifest,queryDigestSha256:query,
   expectedSourcePopulationQueryId:qid,expectedSourceResponseSha256:response,
   runDayIndex:1,slot:"HUB",horizon:"T-24h",airportIcao:"WSSS",
   flightInstanceId:"leg:ci:cd:001",expectedGithubSourceRunId:"42363348888",
   expectedReviewedReleaseSha256:h("5"),
   expectedReviewedSourceRightsSha256:rights,
   expectedProviderContractSha256:contract,
   expectedEarlyDrawSha256:h("4"),
   reviewedFrameSha256:h("3"),reviewedConfigSha256:h("2"),
   independentlyReviewedOperatingLegEvidenceSha256:h("8"),
   independentlyReviewedNativeTEvidenceSha256:h("7"),
   independentlyReviewedRunAndRetentionEvidenceSha256:h("9"),
   frozenBuilderSha256:h("c"),builderFrozenAtUtc:iso(now-2*86_400_000),
   selectedTConfig:{
    milestone:"departure.scheduledTime.utc",version:"cd-ci-native-T",
    artifactHash:h("6"),verifiedProviderNativeSchedule:true,
    semanticsEvidenceSha256:h("7")
   },selectedTNativeUtc:native.toISOString(),
   maxPopulationStalenessSeconds:3600,
   expectedRestrictedPreWriterRole:ROLE,
   externalNativeTPhysicalLegAndSourceUseReviewed:true
  };
  const registry=(await admin.query(
   "SELECT to_regclass('clean.phase5_cd_pre_task_v39') AS task,"+
   "to_regprocedure('clean.phase5_cd_admit_stage14_pre_v39("+
   "bigint,text,bigint,text,text,text,text,timestamptz,timestamptz,"+
   "text,text,text)') AS admission")).rows[0];
  if(!registry?.task||!registry.admission)
   throw Error("V0087_OR_V0088_REAL_DISPOSABLE_SCHEMA_NOT_INSTALLED");
  await admin.query(
   "GRANT EXECUTE ON FUNCTION clean.phase5_cd_admit_stage14_pre_v39("+
   "bigint,text,bigint,text,text,text,text,timestamptz,timestamptz,"+
   "text,text,text) TO "+ROLE);
  // Actual queue migration is already installed by the disposable CI job.
  // Source packet/rights hashes are SYNTHETIC and do not certify a license.
  await admin.query(
   "INSERT INTO clean.phase5_cd_pre_task_v39("+
   "manifest_sha256,flight_instance_id,horizon,selected_native_t_utc,"+
   "prediction_cutoff_utc,packet_sha256,source_population_query_id,"+
   "source_response_sha256,reviewed_source_rights_sha256,source_expires_at_utc)"+
   " VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,clock_timestamp()+INTERVAL '1 hour')",
   [manifest,permit.flightInstanceId,permit.horizon,permit.selectedTNativeUtc,
    new Date(cutoffMs),createHash("sha256").update("v0088-ci-packet-001").digest("hex"),
    qid,response,rights]);
 });
 afterAll(async()=>{
  if(writer)await writer.end();
  if(admin)await admin.end();
 });
 function syntheticPre(flightInstanceId:string,horizon:"T-24h"|"T-90m"="T-24h"):PreSnapshot{
  const native=new Date(permit.selectedTNativeUtc);
  const cutoff=new Date(native.getTime()-(horizon==="T-24h"?86400000:5400000));
  return {
   flightInstanceId,predictionState:"PRE_DEPARTURE",horizon,
   predictionCutoffUtc:cutoff,selectedTMilestoneUtc:native,
   selectedTVersion:"v0088-ci",
   populationQueryId:qid,features:[],
   provenance:{
    builderVersion:"v0088-ci",populationQueryId:qid,
    fidsResponseHash:response,scheduleVersion:null,
    frameHash:permit.reviewedFrameSha256,
    configHash:permit.reviewedConfigSha256,missingnessFlags:{}
   }
  };
 }
 async function claim(){
  const r=await admin.query(
   "SELECT * FROM clean.phase5_cd_claim_due_v39($1,1,90)",
   ["ci-owner-v0088"]);
  expect(r.rows).toHaveLength(1);
  const t=r.rows[0];
  expect((await admin.query(
   "SELECT clean.phase5_cd_mark_write_started_v39("+
   "$1::bigint,$2,$3::bigint) ok",
   [t.task_id,t.lease_owner,t.lease_generation])).rows[0].ok).toBe(true);
  return t;
 }
 it("real V0087 queue prevents PRE INSERT without in-transaction admission",async()=>{
  await expect(persistPreSnapshot(writer,syntheticPre(permit.flightInstanceId)))
    .rejects.toThrow("P5_CD_V0088_INSERT_REQUIRES_SAME_TX_RECEIPT");
  expect((await admin.query(
   "SELECT count(*)::integer n FROM clean.flight_snapshots"
  )).rows[0].n).toBe(0);
 });
 it("enrolled flight cannot bypass by sending a different horizon",async()=>{
  await expect(persistPreSnapshot(writer,
    syntheticPre(permit.flightInstanceId,"T-90m")))
    .rejects.toThrow("P5_CD_V0088_ENROLLED_FLIGHT_HORIZON_NOT_REGISTERED");
 });
 it("unregistered historical flight retains existing PRE INSERT path",async()=>{
  const historical=syntheticPre("leg:ci:historical:unregistered:001");
  expect(await persistPreSnapshot(admin,historical)).toBe(1);
  const id=(await admin.query(
   "SELECT id FROM clean.flight_snapshots WHERE flight_instance_id=$1",
   [historical.flightInstanceId])).rows[0]?.id;
  expect(id).toBeDefined();
  await admin.query("DELETE FROM clean.flight_snapshots WHERE id=$1",[id]);
 });
 it("stale or forged lease owner refused inside actual Stage14 before source write",async()=>{
  const t=await claim();
  await expect(persistP5V0079SingleBoundFlightPre(writer,permit,{
   realV0088QueueFenceCi:{
    taskId:String(t.task_id),owner:"ci-stale-generation",generation:"0",
    packetSha256:t.packet_sha256
   }
  })).rejects.toThrow("V0088_REAL_QUEUE_CLAIM_FIELDS_INVALID");
  await expect(persistP5V0079SingleBoundFlightPre(writer,permit,{
   realV0088QueueFenceCi:{
    taskId:String(t.task_id),owner:"ci-forged-owner",
    generation:String(t.lease_generation),packetSha256:t.packet_sha256
   }
  })).rejects.toThrow("P5_CD_V0088_LEASE_SOURCE_OR_CUTOFF_FENCE_FAILED");
  expect((await admin.query(
   "SELECT count(*)::integer n FROM clean.flight_snapshots"
  )).rows[0].n).toBe(0);
 });
 it("actual Stage14 writes source-bound PRE under real V0087 lock, then acknowledges",async()=>{
  const t=(await admin.query(
   "SELECT * FROM clean.phase5_cd_pre_task_v39 WHERE flight_instance_id=$1",
   [permit.flightInstanceId])).rows[0];
  const claimInfo={
   taskId:String(t.task_id),owner:String(t.lease_owner),
   generation:String(t.lease_generation),packetSha256:t.packet_sha256
  };
  const saved=await persistP5V0079SingleBoundFlightPre(writer,permit,{
   realV0088QueueFenceCi:claimInfo
  });
  expect(saved.preSnapshotsInserted).toBe(1);
  expect(saved.postCommitDatabaseReadbackVerified).toBe(true);
  const receipt=createHash("sha256").update(
   JSON.stringify([saved.committedSnapshotId,saved.cutoffUtc,
    saved.postCommitDbClockAtUtc,claimInfo.taskId])
  ).digest("hex");
  const ack=(await admin.query(
   "SELECT clean.phase5_cd_ack_verified_v39($1::bigint,$2,$3::bigint,"+
   "$4::bigint,$5) ok",
   [t.task_id,t.lease_owner,t.lease_generation,
    saved.committedSnapshotId,receipt])).rows[0];
  expect(ack.ok).toBe(true);
  expect((await admin.query(
   "SELECT state,verified_snapshot_id::text AS snapshot FROM "+
   "clean.phase5_cd_pre_task_v39 WHERE task_id=$1",[t.task_id]
  )).rows[0]).toEqual({
   state:"VERIFIED_ON_TIME",snapshot:saved.committedSnapshotId
  });
  const witness=(await admin.query(
   "SELECT transaction_id,login_role FROM clean.phase5_cd_pre_admission_receipt_v39"+
   " WHERE task_id=$1",[t.task_id])).rows;
  expect(witness).toHaveLength(1);
  expect(witness[0].login_role).toBe(ROLE);
  console.log("P5_V0088_REAL_STAGE14_V0087_QUEUE_ONTIME_RECEIPT_PASS");
 });
 it("registered PRE row cannot be UPDATE or DELETE modified by legacy/admin",async()=>{
  await expect(admin.query(
   "UPDATE clean.flight_snapshots SET selected_t_version='changed'"+
   " WHERE flight_instance_id=$1",[permit.flightInstanceId]
  )).rejects.toThrow("P5_CD_V0088_ENROLLED_SNAPSHOT_IMMUTABLE");
  await expect(admin.query(
   "DELETE FROM clean.flight_snapshots WHERE flight_instance_id=$1",
   [permit.flightInstanceId]
  )).rejects.toThrow("P5_CD_V0088_ENROLLED_SNAPSHOT_IMMUTABLE");
  const no=(await admin.query(
   "SELECT count(*)::integer n FROM clean.flight_snapshots WHERE flight_instance_id=$1",
   [permit.flightInstanceId])).rows[0];
  expect(no.n).toBe(1);
 });
});
