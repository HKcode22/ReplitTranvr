/**
 * True staged PRE writer integration on disposable PostgreSQL16:
 * B0062+staged V0079, one synthetic ORIGINAL, one primary operating member,
 * exact restricted SELECT+INSERT-only PRE writer with immutable deadline.
 * Optional Stage29 tests execute the real T24 PRE + Stage17 witness
 * through dedicated Stage28 SET-only logins and Stage27 NOLOGIN groups.
 * No real provider call or production migration/retention authority.
 */
import {beforeAll,afterAll,describe,it,expect} from "vitest";
import {Pool} from "pg";
import {createHash} from "node:crypto";
import {makeP5Stage28DedicatedRolePool,P5_STAGE28_GROUPS}
 from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";
import {persistP5V0079SingleBoundFlightPre,
 type P5Stage14SingleFlightPrePermit}
 from "../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39";
import {persistP5T24SeparateTransactionWitness,
 type P5Stage17T24WitnessPermit}
 from "../server/lib/disruption/phase5T24IndependentPostCommitWitness_v39";
import {persistP5ReviewedT24PreAndIndependentWitness,
 type P5IndependentT24WitnessReview}
 from "../server/lib/disruption/phase5T24PreIndependentWitnessChain_v39";

const URL="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
const STAGE29=process.env.V39_P5_STAGE29_RESTRICTED_GROUPS_REAL_PG16==="1";
const ROLE=STAGE29?P5_STAGE28_GROUPS.pre:"phase5_fids_pre_writer_ciuser01";
const WITNESS_ROLE=STAGE29?P5_STAGE28_GROUPS.witness:"phase5_fids_t24_witness_ciuser01";
const PRE_LOGIN=STAGE29?"phase5_stage29_pre_ci":ROLE;
const WITNESS_LOGIN=STAGE29?"phase5_stage29_witness_ci":WITNESS_ROLE;
const WITNESS_URL="postgresql://"+WITNESS_LOGIN+
 ":ci-only@localhost:5432/neondb?sslmode=disable";
const STAGE17=process.env.V39_P5_STAGE17_REAL_PG16==="1";
const witnessIt=STAGE17?it:it.skip;
const RW_URL="postgresql://"+PRE_LOGIN+":ci-only@localhost:5432/neondb?sslmode=disable";
const active=process.env.V39_P5_STAGE14_REAL_PG16==="1"?describe:describe.skip;
const h=(c:string)=>c.repeat(64);
const manifest=h("a"),query=h("b"),reservation=h("c");
const rights=h("d"),response=h("e"),contract=h("f");
const qid="a23e4567-e89b-42d3-a456-426614174000";
const payload=Buffer.from(JSON.stringify({departures:[{flight:"CI100"},{flight:"CI200"}]}));
const bodyHash=createHash("sha256").update(payload).digest("hex");
const iso=(n:number)=>new Date(n).toISOString();
active("Phase5 Stage14 one physical original flight PRE, disposable real PG16",()=>{
 let admin:Pool,rawWriter:Pool,rawWitness:Pool;
 let writer:Pick<Pool,"connect">;
 let witnessWriter:Pick<Pool,"connect">;
 let permit:P5Stage14SingleFlightPrePermit;
 let witnessPermit:P5Stage17T24WitnessPermit;
 let chainedT24SnapshotId:string|undefined;
 beforeAll(async()=>{
  if(process.env.GITHUB_ACTIONS!=="true"||
    process.env.V39_P5_STAGE14_REAL_PG16!=="1"||
    (STAGE29&&process.env.V39_P5_STAGE17_REAL_PG16!=="1")||
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
  if(STAGE29){
   // The real V0080 physical-attempt trigger refuses a source request
   // unless a matching immutable GitHub-run prearm exists. This is a
   // DISPOSABLE fixture only, inserted by test admin (not a real GitHub
   // run or independent signed production release).
   const prearmSha=createHash("sha256").update([
    "phase5-v0080",manifest,query,"42363348762",h("4"),rights
   ].join("|")).digest("hex");
   await admin.query(
    "INSERT INTO clean.phase5_fids_github_prearm_v39("+
    "query_digest,manifest_sha256,github_run_id,early_draw_sha256,"+
    "rights_review_sha256,prearm_sha256) "+
    "VALUES($1,$2,'42363348762',$3,$4,$5)",
    [query,manifest,h("4"),rights,prearmSha]);
  }
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
  // Reuse Phase4's conditional scheduled-service identity in a SECOND
  // eligible member of the same authentic (synthetic) FIDS original.
  // It remains separate from the confirmed native CI100 leg.
  await admin.query(
    "INSERT INTO clean.flight_population"+
    "(source_airport_icao,dep_airport_icao,arr_airport_icao,"+
    "dep_scheduled_utc,window_start_utc,window_end_utc,cutoff_utc,"+
    "source_type,population_query_id,analytic_identity_id,"+
    "canonical_flight_instance_id,population_role,scope_classification,"+
    "available_at,response_hash,flight_number,"+
    "query_direction,from_local,to_local,airport_iana_timezone,"+
    "codeshare_resolution_status,fids_retrieval_utc,"+
    "provider_api_version,fids_protocol_version,openapi_sha256)"+
    "VALUES('WSSS','WSSS','OMAA',$1,$2,$3,$4,'fids',$5,$6,"+
    "$6,'requested_airport_primary','unknown',"+
    "clock_timestamp(),$7,'CI200','Departure',"+
    "'2027-01-01T00:00','2027-01-01T04:00','Asia/Singapore',"+
    "'g5a_conditional_operator_composite_no_native_id',"+
    "clock_timestamp(),'1.15.4','v39',$8)",
    [serviceStart,serviceStart,serviceEnd,cutoff,qid,
     "leg:g5a:"+h("7"),response,contract]);
  await admin.query(
    "INSERT INTO clean.phase5_fids_original_binding_v39"+
    "(population_query_id,reservation_sha256,query_digest,manifest_sha256,"+
    "response_hash,decoded_original_body_sha256,rights_review_sha256,"+
    "normalized_members_count,source_expires_at_utc)"+
    "VALUES($1,$2,$3,$4,$5,$6,$7,2,clock_timestamp()+interval '1 hour')",
    [qid,reservation,query,manifest,response,bodyHash,rights]);
  if(STAGE29){
   // This CI database already has the exact Stage27 NOLOGIN groups.
   const found=(await admin.query(
     "SELECT rolname,rolcanlogin FROM pg_catalog.pg_roles "+
     "WHERE rolname=ANY($1::text[])",[[ROLE,WITNESS_ROLE]])).rows;
   if(found.length!==2||found.some(v=>v.rolcanlogin!==false))
     throw Error("REFUSED_STAGE29_EXACT_STAGE27_NOLOGIN_GROUPS_MISSING");
   await admin.query("CREATE ROLE "+PRE_LOGIN+
     " LOGIN NOINHERIT NOSUPERUSER NOCREATEROLE PASSWORD 'ci-only'");
   await admin.query("GRANT "+ROLE+" TO "+PRE_LOGIN+
     " WITH SET TRUE, INHERIT FALSE, ADMIN FALSE");
  }else{
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
  }
  rawWriter=new Pool({connectionString:RW_URL,max:2});
  writer=STAGE29?makeP5Stage28DedicatedRolePool(rawWriter,{
    group:"pre",reviewedDedicatedLogin:PRE_LOGIN,
    forbiddenApplicationLogin:"phase5_stage29_app_runtime_ci"
   }):rawWriter;
  if(STAGE17){
   if(STAGE29){
    await admin.query("CREATE ROLE "+WITNESS_LOGIN+
      " LOGIN NOINHERIT NOSUPERUSER NOCREATEROLE PASSWORD 'ci-only'");
    await admin.query("GRANT "+WITNESS_ROLE+" TO "+WITNESS_LOGIN+
      " WITH SET TRUE, INHERIT FALSE, ADMIN FALSE");
   }else{
    await admin.query("CREATE ROLE "+WITNESS_ROLE+
      " LOGIN PASSWORD 'ci-only' NOSUPERUSER NOCREATEDB NOCREATEROLE");
    await admin.query("GRANT USAGE ON SCHEMA clean TO "+WITNESS_ROLE);
    await admin.query("GRANT SELECT ON clean.flight_snapshots,"+
      "clean.phase5_fids_allowed_query_v39,"+
      "clean.phase5_fids_physical_attempt_v39,"+
      "clean.phase5_fids_original_binding_v39,"+
      "clean.fids_query_response,clean.flight_population,"+
      "clean.phase5_t24_postcommit_witness_v39 TO "+WITNESS_ROLE);
    await admin.query("GRANT INSERT ON "+
      "clean.phase5_t24_postcommit_witness_v39 TO "+WITNESS_ROLE);
   }
   rawWitness=new Pool({connectionString:WITNESS_URL,max:2});
   witnessWriter=STAGE29?makeP5Stage28DedicatedRolePool(rawWitness,{
     group:"witness",reviewedDedicatedLogin:WITNESS_LOGIN,
     forbiddenApplicationLogin:"phase5_stage29_app_runtime_ci"
    }):rawWitness;
  }
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
 afterAll(async()=>{
  if(rawWitness)await rawWitness.end();
  if(rawWriter)await rawWriter.end();
  if(admin)await admin.end();
 });
 it("commits one source-bound T24 PRE and, where commissioned, its independent second-transaction witness",async()=>{
  if(STAGE17){
   const reviewedWitness:P5IndependentT24WitnessReview={
    flightInstanceId:permit.flightInstanceId,
    sourcePopulationQueryId:qid,
    expectedSourceResponseSha256:response,
    expectedSourceQueryDigestSha256:query,
    expectedFrameSha256:permit.reviewedFrameSha256,
    expectedConfigSha256:permit.reviewedConfigSha256,
    expectedSelectedTVersion:permit.selectedTConfig.milestone+":"+
     permit.selectedTConfig.version+":"+permit.selectedTConfig.artifactHash,
    selectedTNativeUtc:permit.selectedTNativeUtc,
    expectedT24CutoffUtc:iso(
     Date.parse(permit.selectedTNativeUtc)-24*3600_000),
    expectedWitnessOnlyRole:WITNESS_ROLE
   };
   const chain=await persistP5ReviewedT24PreAndIndependentWitness(
    writer,witnessWriter,permit,reviewedWitness);
   chainedT24SnapshotId=chain.committedSnapshotId;
   expect(chain.preCommittedAndReadBackBeforeCutoff).toBe(true);
   expect(chain.witnessCommittedAndReadBackBeforeCutoff).toBe(true);
   expect(chain.phase5ScientificFreezePassed).toBe(false);
   expect(chain.phase6PaidGo).toBe(false);
  }else{
   const result=await persistP5V0079SingleBoundFlightPre(writer,permit);
   expect(result.preSnapshotsInserted).toBe(1);
   expect(result.flightPreCommittedBeforeOwnCutoff).toBe(true);
   expect(result.postCommitDatabaseReadbackVerified).toBe(true);
   expect(/^[1-9][0-9]{0,17}$/.test(result.committedSnapshotId)).toBe(true);
   expect(Date.parse(result.postCommitDbClockAtUtc)).toBeLessThan(
    Date.parse(result.cutoffUtc));
   expect(result.providerCalls).toBe(0);
   expect(result.alertCreates).toBe(0);
   expect(result.externalNativeTIndependentlyAuthenticatedByThisFunction).toBe(false);
   expect(result.phase5FreezePassed).toBe(false);
   expect(result.phase6PaidGo).toBe(false);
  }
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

 witnessIt("commits a second independent witness transaction before cutoff with native commit tracking OFF",async()=>{
  const snap=(await admin.query(
   "SELECT id::text AS id FROM clean.flight_snapshots"+
   " WHERE flight_instance_id='leg:ci:100' AND horizon='T-24h'"
  )).rows;
  expect(snap).toHaveLength(1);
  // Stage14 returned the exact durable ID; this real PG fixture's separate
  // transaction proves the same ID was independently witnessed.
  expect(chainedT24SnapshotId).toBe(snap[0].id);
  witnessPermit={
   expectedSnapshotId:snap[0].id,
   flightInstanceId:permit.flightInstanceId,
   sourcePopulationQueryId:qid,
   expectedSourceResponseSha256:response,
   expectedSourceQueryDigestSha256:query,
   expectedFrameSha256:permit.reviewedFrameSha256,
   expectedConfigSha256:permit.reviewedConfigSha256,
   expectedSelectedTVersion:permit.selectedTConfig.milestone+":"+
     permit.selectedTConfig.version+":"+permit.selectedTConfig.artifactHash,
   selectedTNativeUtc:permit.selectedTNativeUtc,
   expectedT24CutoffUtc:iso(
     Date.parse(permit.selectedTNativeUtc)-24*3600_000),
   expectedWitnessOnlyRole:WITNESS_ROLE
  };
  const tracking=(await admin.query(
   "SELECT current_setting('track_commit_timestamp') AS tracking")).rows[0];
  expect(tracking.tracking).toBe("off");
  // PRE and its witness were already written by the real two-pool chain
  // in the first test. Never replay the successful witness just to inspect it.
  const receipt=(await admin.query(
   "SELECT snapshot_id::text AS snapshot_id,"+
   "post_pre_commit_db_observed_at_utc,"+
   "t24_cutoff_utc FROM clean.phase5_t24_postcommit_witness_v39"
  )).rows;
  expect(receipt).toHaveLength(1);
  expect(receipt[0].snapshot_id).toBe(chainedT24SnapshotId);
  expect(new Date(receipt[0].post_pre_commit_db_observed_at_utc).getTime())
   .toBeLessThan(new Date(receipt[0].t24_cutoff_utc).getTime());
   const saved=(await admin.query(
   "SELECT w.flight_instance_id,w.population_query_id,"+
   "w.source_query_digest,w.post_pre_commit_db_observed_at_utc,"+
   "w.t24_cutoff_utc FROM clean.phase5_t24_postcommit_witness_v39 w"
  )).rows;
  expect(saved).toHaveLength(1);
  expect(saved[0].source_query_digest).toBe(query);
  expect(saved[0].population_query_id).toBe(qid);
 });
 witnessIt("refuses replay or wrong database role and cannot rewrite witness",async()=>{
  await expect(persistP5T24SeparateTransactionWitness(
   witnessWriter,witnessPermit))
   .rejects.toThrow("EXISTING_IMMUTABLE_T24_WITNESS_NO_RETRY");
  await expect(persistP5T24SeparateTransactionWitness(
   admin,witnessPermit))
   .rejects.toThrow("NOT_STRICTLY_INDEPENDENT_WITNESS_ONLY_ROLE");
  await expect(admin.query(
   "UPDATE clean.phase5_t24_postcommit_witness_v39"+
   " SET source_query_digest=source_query_digest"+
   " WHERE snapshot_id=$1",
   [witnessPermit.expectedSnapshotId]))
   .rejects.toThrow("P5_T24_WITNESS_IMMUTABLE_NEVER_UPDATE_OR_DELETE");
  const total=(await admin.query(
   "SELECT count(*)::integer AS n"+
   " FROM clean.phase5_t24_postcommit_witness_v39")).rows[0].n;
  expect(total).toBe(1);
 });
 witnessIt("fails closed on changed T24 anchor and wrong source digest without a new witness",async()=>{
  await expect(persistP5T24SeparateTransactionWitness(
   witnessWriter,{...witnessPermit,selectedTNativeUtc:
    iso(Date.parse(witnessPermit.selectedTNativeUtc)+60_000)}))
   .rejects.toThrow("FROZEN_T24_ANCHOR_SHIFTED");
  await expect(persistP5T24SeparateTransactionWitness(
   witnessWriter,{...witnessPermit,
    expectedSourceResponseSha256:h("0")}))
   .rejects.toThrow("PRE_SNAPSHOT_PROVENANCE_OR_T_CHANGED");
  expect((await admin.query(
    "SELECT count(*)::integer n FROM clean.phase5_t24_postcommit_witness_v39"
  )).rows[0].n).toBe(1);
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
  // A previous T24 snapshot created_at=now() is not evidence of its
  // durable transaction commit time. Lower horizons must HOLD until a
  // separately authenticated T24 post-COMMIT witness is in a real ledger.
  await expect(persistP5V0079SingleBoundFlightPre(writer,{
    ...permit,horizon:"T-6h"
  })).rejects.toThrow("LATER_HORIZON_REQUIRES_DURABLE_T24_AFTER_COMMIT_WITNESS");
  await expect(persistP5V0079SingleBoundFlightPre(writer,{
    ...permit,horizon:"T-90m"
  })).rejects.toThrow("LATER_HORIZON_REQUIRES_DURABLE_T24_AFTER_COMMIT_WITNESS");
  const now=Date.now();
  await expect(persistP5V0079SingleBoundFlightPre(writer,{
    ...permit,selectedTNativeUtc:iso(now-15*60_000)
  })).rejects.toThrow("MISSED_OWN_FLIGHT_PRE_CUTOFF_NO_BACKFILL");
  const q=await admin.query("SELECT count(*)::integer AS n FROM clean.flight_snapshots");
  expect(q.rows[0].n).toBe(1);
 });

 it("reuses Phase4 conditional service records only under an explicit separately reviewed protocol",async()=>{
  const conditional:P5Stage14SingleFlightPrePermit={
   ...permit,flightInstanceId:"leg:g5a:"+h("7"),
   identityEvidenceTier:"CONDITIONAL_QUERY_FILTERED_SERVICE",
   externalNativeTPhysicalLegAndSourceUseReviewed:undefined,
   externalConditionalScheduleSourceAndUseReviewed:true,
   reviewedProtocolAmendmentSha256:h("5"),
   reviewedStableServiceKeySha256:h("7"),
   expectedOperatorFlightNumber:"CI200",
   expectedDestinationIcao:"OMAA",
  };
  // A conditional record may not masquerade as a confirmed native leg.
  await expect(persistP5V0079SingleBoundFlightPre(writer,{
   ...permit,flightInstanceId:conditional.flightInstanceId
  })).rejects.toThrow("PHYSICAL_OPERATING_LEG_SOURCE_PROVENANCE_NOT_QUALIFIED");
  await expect(persistP5V0079SingleBoundFlightPre(writer,{
   ...conditional,reviewedProtocolAmendmentSha256:undefined
  })).rejects.toThrow("CONDITIONAL_PROTOCOL_OR_STABLE_SERVICE_KEY_UNAPPROVED");
  await expect(persistP5V0079SingleBoundFlightPre(writer,{
   ...conditional,externalNativeTPhysicalLegAndSourceUseReviewed:true
  })).rejects.toThrow("CONDITIONAL_PROTOCOL_OR_STABLE_SERVICE_KEY_UNAPPROVED");
  await expect(persistP5V0079SingleBoundFlightPre(writer,{
   ...conditional,expectedDestinationIcao:"SKBO"
  })).rejects.toThrow("CONDITIONAL_SOURCE_SERVICE_SCOPE_NOT_QUALIFIED");

  const result=await persistP5V0079SingleBoundFlightPre(writer,conditional);
  expect(result.identityEvidenceTier).toBe("CONDITIONAL_QUERY_FILTERED_SERVICE");
  expect(result.conditionalServiceCertifiedPhysicalLeg).toBe(false);
  expect(result.externalPhysicalOperatingLegIndependentlyAuthenticatedByThisFunction)
    .toBe(false);
  expect(result.sourceOriginalCommittedBeforeFlightCutoff).toBe(true);
  expect(result.flightPreCommittedBeforeOwnCutoff).toBe(true);
  expect(result.providerCalls).toBe(0);
  expect(result.phase6PaidGo).toBe(false);
  const rows=(await admin.query(
   "SELECT flight_instance_id,population_query_id,fids_response_hash,"+
   "horizon,prediction_state FROM clean.flight_snapshots ORDER BY flight_instance_id"
  )).rows;
  expect(rows).toHaveLength(2);
  expect(rows[0].flight_instance_id).toBe("leg:ci:100");
  expect(rows[1].flight_instance_id).toBe(conditional.flightInstanceId);
  expect(rows[1].population_query_id).toBe(qid);
  expect(rows[1].fids_response_hash).toBe(response);
  expect(rows[1].prediction_state).toBe("PRE_DEPARTURE");
  await expect(persistP5V0079SingleBoundFlightPre(writer,conditional))
   .rejects.toThrow("EXISTING_PRE_NEVER_OVERWRITE_OR_RETCON");
 });
 it("writes genuine later-only T6 in disposable PG16 with no T24 and independent source-as-of approval",async()=>{
  if(STAGE29)return; // Stage29 tests exercise original witnessed route.
  const hasV0081=(await admin.query(
   "SELECT to_regclass('clean.phase5_t24_postcommit_witness_v39') AS obj"
  )).rows[0]?.obj;
  // Stage14's original V0079-only CI fixture has no V0081 ledger.
  // Stage17 CI includes the real V0081 installation and exercises this path.
  if(!hasV0081)return;
  // The test's synthetic Stage14 login was originally commissioned before
  // V0081. This extra SELECT is for disposable Stage17 CI only, never PROD.
  await admin.query(
   "GRANT SELECT ON clean.phase5_t24_postcommit_witness_v39 TO "+ROLE);
  const dbNow=new Date((await admin.query(
   "SELECT clock_timestamp() AS at")).rows[0].at).getTime();
  const ownCutoff=dbNow+150_000, t=new Date(ownCutoff+6*3600_000);
  const end=new Date(t.getTime()+4*3600_000);
  const q2=h("1"),r2=h("0"),qid2="a23e4567-e89b-42d3-a456-426614174001";
  const flight="leg:ci:300";
  const dispatch=new Date(dbNow-15*60_000);
  await admin.query(
   "INSERT INTO clean.phase5_fids_allowed_query_v39"+
   "(query_digest,manifest_sha256,run_day_index,query_key,slot_id,horizon,"+
   "airport_icao,early_draw_sha256,reviewed_release_sha256,"+
   "rights_review_sha256,provider_contract_sha256,github_run_id,"+
   "service_window_start_utc,service_window_end_utc,from_local,to_local,"+
   "airport_iana_timezone,provider_api_version,fids_protocol_version,"+
   "planned_dispatch_utc,planned_charge_utc_date,hard_latest_dispatch_utc,"+
   "prediction_cutoff_utc,api_units_per_attempt,max_physical_attempts,state)"+
   " VALUES($1,$2,1,'stage14_ci_later_only','MID_A','T-6h','WSSS',"+
   "$3,$4,$5,$6,'42363348763',$7,$8,'2027-01-01T00:00',"+
   "'2027-01-01T04:00','Asia/Singapore','1.15.4','v39',"+
   "$9,$10::date,$11,$12,2,1,'ACTIVE')",
   [q2,manifest,h("4"),h("5"),rights,contract,t,end,dispatch,
    dispatch.toISOString().slice(0,10),
    new Date(dbNow-10*60_000),new Date(ownCutoff)]);
  await admin.query(
   "INSERT INTO clean.phase5_fids_physical_attempt_v39"+
   "(reservation_sha256,query_digest,manifest_sha256,github_run_id,"+
   "observed_selected_at_utc,charged_utc_date)"+
   " VALUES($1,$2,$3,'42363348763',$4,$5::date)",
   [r2,q2,manifest,new Date(dbNow-48*3600_000),
    dispatch.toISOString().slice(0,10)]);
  await admin.query(
   "WITH t AS (SELECT clock_timestamp() AS at)"+
   " INSERT INTO clean.fids_query_response"+
   "(population_query_id,source_airport_icao,query_direction,"+
   "service_window_start_utc,service_window_end_utc,from_local,to_local,"+
   "airport_iana_timezone,fids_retrieval_utc,raw_persisted_at_utc,"+
   "available_at,response_hash,raw_payload,provider_api_version,"+
   "fids_protocol_version,openapi_sha256)"+
   " SELECT $1,'WSSS','Departure',$2,$3,"+
   "'2027-01-01T00:00','2027-01-01T04:00','Asia/Singapore',"+
   "t.at,t.at,t.at,$4,$5::jsonb,'1.15.4','v39',$6 FROM t",
   [qid2,t,end,response,JSON.stringify({
    originalDecodedEntityBodyPreserved:true,
    originalHttpWireBytesPreserved:false,
    originalDecodedEntityBodyEvidence:{
     representation:"FETCH_DECODED_RESPONSE_BODY_BYTES_NOT_HTTP_WIRE",
     bodySha256:bodyHash,bodyBase64:payload.toString("base64"),
     bodyLengthBytes:payload.length}
   }),contract]);
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
   " VALUES('WSSS','WSSS',$1,$2,$3,$4,'fids',$5,$6,"+
   "$6,'requested_airport_primary','confirmed_core',"+
   "clock_timestamp(),$7,'CI300','Departure',"+
   "'2027-01-01T00:00','2027-01-01T04:00','Asia/Singapore',"+
   "'confirmed_operating_leg',clock_timestamp(),'1.15.4','v39',$8)",
   [t,t,end,new Date(ownCutoff),qid2,flight,response,contract]);
  await admin.query(
   "INSERT INTO clean.phase5_fids_original_binding_v39"+
   "(population_query_id,reservation_sha256,query_digest,manifest_sha256,"+
   "response_hash,decoded_original_body_sha256,rights_review_sha256,"+
   "normalized_members_count,source_expires_at_utc)"+
   " VALUES($1,$2,$3,$4,$5,$6,$7,1,clock_timestamp()+interval '1 hour')",
   [qid2,r2,q2,manifest,response,bodyHash,rights]);
  const protocol=h("a");
  const signed:P5Stage14SingleFlightPrePermit={
   ...permit,horizon:"T-6h",slot:"MID_A",queryDigestSha256:q2,
   expectedSourcePopulationQueryId:qid2,flightInstanceId:flight,
   expectedGithubSourceRunId:"42363348763",selectedTNativeUtc:t.toISOString(),
   reviewedStandaloneLaterNoT24:{
    schema:"v39.phase5.standalone-later-asof-no-t24.v1",
    reviewedProtocolSha256:protocol,
    reviewedOriginalResponseSha256:response,
    reviewedNativeTSemanticsSha256:
     permit.independentlyReviewedNativeTEvidenceSha256,
    missingT24Class:"HONEST_T24_UNOBSERVED_NOT_BACKFILLED",
    independentLaterAsOfAndMissingnessReviewAttested:true
   }
  };
  await expect(persistP5V0079SingleBoundFlightPre(writer,signed))
   .rejects.toThrow("MISSING_SIGNED_INDEPENDENT_STANDALONE_REVIEW");
  await expect(persistP5V0079SingleBoundFlightPre(writer,signed,{
    independentlyApprovedStandaloneProtocolSha256:h("f")
   })).rejects.toThrow("MISSING_SIGNED_INDEPENDENT_STANDALONE_REVIEW");
  const result=await persistP5V0079SingleBoundFlightPre(writer,signed,{
    independentlyApprovedStandaloneProtocolSha256:protocol
   });
  expect(result.horizon).toBe("T-6h");
  expect(result.laterPreEvidenceTier).toBe(
    "STANDALONE_ASOF_LATER_MISSING_T24");
  expect(result.authenticPersistedT24WitnessAnchoredForLaterHorizon).toBe(false);
  expect(result.missingT24ExplicitlyRecordedWithoutBackfill).toBe(true);
  expect(result.postCommitDatabaseReadbackVerified).toBe(true);
  expect(result.providerCalls).toBe(0);
  const exists=(await admin.query(
   "SELECT horizon FROM clean.flight_snapshots"+
   " WHERE flight_instance_id=$1",[flight])).rows;
  expect(exists.map(x=>x.horizon)).toEqual(["T-6h"]);
  await expect(persistP5V0079SingleBoundFlightPre(writer,signed,{
    independentlyApprovedStandaloneProtocolSha256:protocol
   })).rejects.toThrow("EXISTING_PRE_NEVER_OVERWRITE_OR_RETCON");
 });

});
