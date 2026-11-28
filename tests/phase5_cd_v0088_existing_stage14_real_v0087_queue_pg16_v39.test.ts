import {auditP5ConditionalPostActualT6Batch} from "../server/lib/disruption/phase5V0083FuturePostOriginalDb_v39";
import {readP6ConditionalPostT6PreservationBatch} from "../scripts/v39_phase6_conditional_post_preservation_read_v39";
import {digestP5Stage24ReviewedReceipt,type P5Stage24ReviewedT24Receipt} from "../server/lib/disruption/phase5T24WitnessedLaterHorizonGuard_v39";
import {verifyP5SignedLaterPreDayRegistry,type P5SignedLaterPreDayRegistry} from "../server/lib/disruption/phase5SignedLaterPreDayRegistry_v39";
import type {P5SignedSourceBatchRegistry} from "../server/lib/disruption/phase5SignedPerDaySourceBatchReadonly_v39";
import {verifyP5CdFrozenRoster,type P5CdFrozenRoster} from "../server/lib/disruption/phase5CdGithubBoundedPreTick_v39";
import {verifyPhase7SignedPreFieldProof} from "../server/lib/disruption/phase7SignedPreFieldProof_v39";
import {executeP6PrivateEnrollmentBatch} from "../scripts/v39_phase6_private_later_restartable_enrollment_v39";
import {makeP5CdV0091RegisterArgs,makeP5CdReviewedSourceRegistrationCall} from "../scripts/v39_phase5_cd_github_one_source_bound_enqueue_v39";
/**
 * The source fixture below is the same verified synthetic FIDS-original,
 * normalized flight-population and V0079 binding fixture reused from the
 * 32-flight Stage14 C+D SQL tests. NO provider HTTP or live Neon.
 *
 * This test differs by applying REAL staged V0087 + V0088, not p5_cd_stage14_ci.
 */
import {beforeAll,afterAll,describe,it,expect} from "vitest";
import {Pool} from "pg";
import {createHash,generateKeyPairSync,sign} from "node:crypto";
import {URL as NodeURL} from "node:url";
import {readFileSync} from "node:fs";
import {P5_E_ALLOWED_PRE_FEATURES} from "../server/lib/disruption/phase5AmendmentEAsOfFeatureSelectionOffline_v39";
import type {Phase7CanonicalFieldDisposition} from "../server/lib/disruption/phase7CanonicalFieldParity_v39";
import type {Phase7DerivedReleaseContract} from "../server/lib/disruption/phase6DerivedTrainingReleaseContract_v39";
import {P7_NATIVE_STATUS_DOMAIN,type Phase7ReviewedTransformationProfile} from "../server/lib/disruption/phase7ReviewedSourceTransformation_v39";
import type {Phase7ProspectivePrePreservationPolicy} from "../server/lib/disruption/phase7PreFragmentTransaction_v39";
import {hashPhase7DurableCandidate} from "../server/lib/disruption/phase7DurableDerivedBundleCandidate_v39";
const sha=(s:string)=>createHash("sha256").update(s).digest("hex");
const P7=process.env.V39_P7_STAGE14_PRESERVATION_DISPOSABLE==="1";
const P7READER="phase7_pre_fragment_ci_reader";
const P7SCOPED="phase7_post_group_ci_reader";
import {readPhase7PostScopedGroup,readPhase7ConditionalT6ScopedGroup} from "../server/lib/disruption/phase7PostScopedGroup_v39";
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
const CONDITIONAL_QUEUE=process.env.V39_P5B_CONDITIONAL_QUEUE_CI==="1";
const manifest=P7||CONDITIONAL_QUEUE?sha("synthetic stage14 manifest"):h("a"),query=P7?sha("synthetic stage14 query"):h("b"),reservation=h("c"),
 rights=P7||CONDITIONAL_QUEUE?sha("synthetic stage14 rights"):h("d"),response=h("e"),contract=h("f");
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
 let cutoffMs=0,p7Reader:Pool|undefined,p7Scoped:Pool|undefined;
 let p7:NonNullable<NonNullable<Parameters<typeof persistP5V0079SingleBoundFlightPre>[2]>["phase7PrePreservation"]>|undefined;
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
   flight:"CD"+String(i+1).padStart(3,"0"),
   status:"Boarding"
  }));
  const conditional=process.env.V39_P5B_CONDITIONAL_QUEUE_CI==="1";
  const conditionalId="leg:g5a:"+h("7");
  const cohort=new Date(Math.floor(native.getTime()/60000)*60000).toISOString();
  if(conditional)arr.push({flight:"CD900",status:"Boarding"});
  const payload=Buffer.from(JSON.stringify({departures:arr}));
  const bodyHash=createHash("sha256").update(payload).digest("hex");
  const original={
   ...(conditional?{phase5PopulationIdentityVersion:"P5_CANONICAL_SHA256_V1",fidsRequestContract:{
    schema:"v39.fids-request-frame.application-intent.v1",endpointKind:"airport_local_fids",direction:"Departure",withLeg:true,withCargo:false,withPrivate:false,withCancelled:true,withCodeshared:true,withLocation:false,airportIcao:"WSSS",openapiSha256:contract,
    phase5ConditionalService:{protocolSha256:h("8"),cohortStartUtc:cohort}}}:{}),
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
    "(source_airport_icao,dep_airport_icao,arr_airport_icao,dep_scheduled_utc,"+
    "window_start_utc,window_end_utc,cutoff_utc,"+
    "source_type,population_query_id,analytic_identity_id,"+
    "canonical_flight_instance_id,population_role,scope_classification,"+
    "available_at,response_hash,flight_number,"+
    "query_direction,from_local,to_local,airport_iana_timezone,"+
    "codeshare_resolution_status,fids_retrieval_utc,"+
    "provider_api_version,fids_protocol_version,openapi_sha256)"+
    "VALUES('WSSS','WSSS','YSSY',$1,$2,$3,$4,'fids',$5,$6,"+
    "$6,'requested_airport_primary','confirmed_core',"+
    "statement_timestamp(),$7,$8,'Departure',"+
    "'2027-01-01T00:00','2027-01-01T04:00','Asia/Singapore',"+
    "'confirmed_operating_leg',statement_timestamp(),'1.15.4','v39',$9)",
    [native,native,end,cutoff,qid,flight,response,fn,contract]);
  }
  if(conditional){
   await admin.query(
    "INSERT INTO clean.flight_population"+
    "(source_airport_icao,dep_airport_icao,arr_airport_icao,dep_scheduled_utc,window_start_utc,window_end_utc,cutoff_utc,source_type,population_query_id,analytic_identity_id,canonical_flight_instance_id,population_role,scope_classification,available_at,response_hash,flight_number,query_direction,from_local,to_local,airport_iana_timezone,codeshare_resolution_status,fids_retrieval_utc,provider_api_version,fids_protocol_version,openapi_sha256)"+
    " VALUES('WSSS','WSSS','YSSY',$1,$1,$2,$3,'fids',$4,$5,$5,'requested_airport_primary','unknown',statement_timestamp(),$6,'CD900','Departure','2027-01-01T00:00','2027-01-01T04:00','Asia/Singapore','g5a_conditional_operator_composite_no_native_id',statement_timestamp(),'1.15.4','v39',$7)",
    [native,end,cutoff,qid,conditionalId,response,contract]);
  }
  await admin.query(
   "INSERT INTO clean.phase5_fids_original_binding_v39"+
   "(population_query_id,reservation_sha256,query_digest,manifest_sha256,"+
   "response_hash,decoded_original_body_sha256,rights_review_sha256,"+
   "normalized_members_count,source_expires_at_utc)"+
   "VALUES($1,$2,$3,$4,$5,$6,$7,$8,clock_timestamp()+interval '1 hour')",
   [qid,reservation,query,manifest,response,bodyHash,rights,FLIGHTS+Number(conditional)]);
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
  if(CONDITIONAL_QUEUE)await admin.query("GRANT SELECT ON clean.phase5_t24_postcommit_witness_v39 TO "+ROLE);
  await admin.query("GRANT USAGE ON SEQUENCE clean.flight_snapshots_id_seq TO "+ROLE);
  writer=new Pool({connectionString:LOGIN_URL,max:10});
  if(P7){
   // Synthetic prospective profile only, NOT an actual field rights approval.
   // The existing source, native route selector and actual Stage14 transaction
   // are exercised, including rollback of both rows when preservation fails.
   await admin.query(readFileSync("data-collection/phase5/review-tools/p7_derived_release_storage_candidate_NOT_FOR_INSTALL.sql","utf8"));
   await admin.query(readFileSync("data-collection/phase5/review-tools/p7_pre_fragment_storage_candidate_NOT_FOR_INSTALL.sql","utf8"));
   await admin.query("CREATE ROLE "+P7READER+" LOGIN PASSWORD 'ci-only' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOINHERIT");
   await admin.query("GRANT USAGE ON SCHEMA phase7_private TO "+ROLE+","+P7READER);
   await admin.query("GRANT SELECT ON phase7_private.pre_fragment_v39 TO "+P7READER);
   await admin.query("GRANT EXECUTE ON FUNCTION phase7_private.persist_bound_pre_fragment_v39(text,text,bigint,uuid,uuid,text,text,text,text,bytea,text,timestamptz,timestamptz,integer,timestamptz) TO "+ROLE);
   p7Reader=new Pool({connectionString:LOGIN_URL.replace(ROLE,P7READER),max:2});
   await admin.query("CREATE ROLE "+P7SCOPED+" LOGIN PASSWORD 'ci-only' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOINHERIT; GRANT USAGE ON SCHEMA phase7_private TO "+P7SCOPED+"; GRANT EXECUTE ON FUNCTION phase7_private.read_bound_pre_group_v39(text,bigint,text,text,integer,text,text) TO "+P7SCOPED);
   if(process.env.V39_P5B_CONDITIONAL_POST_T6_CI==="1"){
    await admin.query(readFileSync("migrations/staged/V0115__phase5b_conditional_t6_scoped_packet_b_read_v39.sql","utf8"));
    await admin.query("GRANT EXECUTE ON FUNCTION phase7_private.read_bound_conditional_t6_group_v39(text,bigint,text,text,integer,text,text,text) TO "+P7SCOPED);
   }
   p7Scoped=new Pool({connectionString:LOGIN_URL.replace(ROLE,P7SCOPED),max:1});
   const shared={version:"v01",featureDictionarySha256:sha("synthetic dictionary"),termsReviewSha256:sha("synthetic terms"),derivedWorkReviewSha256:sha("synthetic derived review")};
   const expires=iso(now+7*86400000);
   const statusGroups=[["Unknown","Expected"],["CheckIn","Boarding","GateClosed"],["Departed","EnRoute","Approaching","Arrived"],["Delayed","Diverted"],["Canceled"],["CanceledUncertain"]];
   const p7Contract:Phase7DerivedReleaseContract={schema:"v39.phase6.phase7-derived-release-contract.v2",...shared,sourceToReleaseMappingExpiryHours:24,researchExpiryUtc:expires,cohortBucketCount:31,features:[{name:"status_bin",bucketCount:6,fieldClass:"approved_derived",transformEvidenceSha256:sha("status"),nonReconstructable:true},{name:"context_bin",bucketCount:3,fieldClass:"approved_derived",transformEvidenceSha256:sha("context"),nonReconstructable:true}],labels:[{name:"delay_bin",bucketCount:3,fieldClass:"approved_derived",transformEvidenceSha256:sha("target"),nonReconstructable:true}],allowedHorizons:["T-24h","T-6h","T-90m"]};
   const profile:Phase7ReviewedTransformationProfile={schema:"v39.phase7.reviewed-source-transformation.v1",...shared,mappingExpiryHours:24,approvedForUse:true,fields:[
    {sourceField:"reported_pre_departure_status",outputField:"status_bin",role:"feature",kind:"categorical_group_dictionary",bucketCount:6,boundaries:null,categories:statusGroups,transformEvidenceSha256:sha("status"),nonReconstructable:true},
    {sourceField:"prior_route_departure_delay_median_minutes",outputField:"context_bin",role:"feature",kind:"numeric_threshold_bucket",bucketCount:3,boundaries:[10,20],categories:null,transformEvidenceSha256:sha("context"),nonReconstructable:true},
    {sourceField:"gate_out_delay_minutes",outputField:"delay_bin",role:"label",kind:"numeric_threshold_bucket",bucketCount:3,boundaries:[0,15],categories:null,transformEvidenceSha256:sha("target"),nonReconstructable:true}
   ]};
   const dispositions:Phase7CanonicalFieldDisposition[]=P5_E_ALLOWED_PRE_FEATURES.map(field=>{
    const mapped=profile.fields.find(x=>x.role==="feature"&&x.sourceField===field);
    return {field,disposition:mapped?"REVIEWED_DERIVED_BUCKET":["origin_icao","destination_icao"].includes(field)?"PURPOSE_BOUND_REFERENCE_LANE":"INDEPENDENT_SOURCE_EXACT_LANE",outputField:mapped?.outputField??null,reviewSha256:mapped?.transformEvidenceSha256??sha("synthetic disposition "+field)};
   });
   const review:Phase7ProspectivePrePreservationPolicy={schema:"v39.phase7.prospective-pre-preservation-review.v1",manifestSha256:manifest,rightsSha256:rights,contractSha256:hashPhase7DurableCandidate(p7Contract),profileSha256:hashPhase7DurableCandidate(profile),dispositionsSha256:hashPhase7DurableCandidate(dispositions),mappingHours:24,researchExpiryUtc:expires,approvedForPreDurableStorage:true,boundedSameLegLinkApproved:true};
   const reviewSha256=hashPhase7DurableCandidate(review);
   await admin.query("INSERT INTO phase7_private.pre_preservation_policy_v39(manifest_sha256,contract_sha256,profile_sha256,rights_sha256,policy_review_sha256,valid_from_utc,valid_until_utc,feature_dictionary_sha256,contract_version,feature_bucket_limits,label_bucket_limits,mapping_hours,research_expiry_utc) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12,$13)",[manifest,review.contractSha256,review.profileSha256,rights,reviewSha256,iso(now-60000),iso(now+86400000),shared.featureDictionarySha256,shared.version,JSON.stringify({status_bin:6,context_bin:3}),JSON.stringify({delay_bin:3}),24,expires]);
   p7={contract:p7Contract,profile,review,reviewSha256,dispositions,separatelyVerifiedFields:["origin_icao","destination_icao"],reader:p7Reader,expectedReaderRole:P7READER};
  }
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
  if(process.env.V39_P5_CD_V0089_GUARD_CI==="1"){
   // The real Phase5 PRE NOLOGIN group, NOT this synthetic login, is the
   // principal allowed to execute the V0088 security-definer guard.
   await admin.query("GRANT phase5_fids_pre_writer_prod_20261107 TO "+ROLE);
   const attrs=(await admin.query(
    "SELECT r.rolcanlogin,r.rolsuper,"+
    "has_function_privilege($1,'clean.phase5_cd_admit_stage14_pre_v39("+
    "bigint,text,bigint,text,text,text,text,timestamptz,timestamptz,"+
    "text,text,text)','EXECUTE') AS can_guard,"+
    "has_table_privilege($1,'clean.phase5_cd_pre_task_v39','UPDATE') AS can_update,"+
    "has_table_privilege($1,'clean.phase5_cd_pre_admission_receipt_v39','SELECT') AS can_read_receipt"+
    " FROM pg_catalog.pg_roles r WHERE r.rolname='phase5_cd_admission_guard_owner_v39'",
    [ROLE])).rows[0];
   if(!attrs||attrs.rolcanlogin||attrs.rolsuper||
      !attrs.can_guard||attrs.can_update||attrs.can_read_receipt)
    throw Error("V0089_REAL_LEAST_PRIVILEGE_OR_PRE_GROUP_NOT_VERIFIED");
  }else{
  await admin.query(
   "GRANT EXECUTE ON FUNCTION clean.phase5_cd_admit_stage14_pre_v39("+
   "bigint,text,bigint,text,text,text,text,timestamptz,timestamptz,"+
   "text,text,text) TO "+ROLE);
  }
  // Actual queue migration is already installed by the disposable CI job.
  // Source packet/rights hashes are SYNTHETIC and do not certify a license.
  if(process.env.V39_P5_CD_V0091_REGISTRATION_CI==="1"){
   const PREP="phase5_fids_prepare_prod_20261107";
   const sig="clean.phase5_cd_register_source_flight_v39("+
    "text,text,text,text,timestamptz,text,text,text,text,integer)";
   const prep=new Pool({connectionString:
    "postgresql://phase5_p30_prepare_login_20261107:ci-only"+
    "@localhost:5432/neondb?sslmode=disable",max:1});
   try{
    const before=(await admin.query(
     "SELECT count(*)::integer n FROM clean.phase5_cd_pre_task_v39")).rows[0];
    expect(before.n).toBe(0);
    expect((await admin.query(
     "SELECT has_function_privilege($1,$2,'EXECUTE') AS permitted,"+
     "has_table_privilege($1,'clean.phase5_cd_pre_task_v39','INSERT') AS direct",
     [PREP,sig])).rows[0]).toEqual({permitted:true,direct:false});
    const client=await prep.connect();
    try{
     await client.query("BEGIN");
     await client.query("SET LOCAL ROLE "+PREP);
     const actor=(await client.query("SELECT current_user AS role")).rows[0];
     expect(actor.role).toBe(PREP);
     // Original source expiry is read exclusively from V0079 inside
     // registration SQL; the untrusted packet may NOT supply an expiry.
     const args=[manifest,query,permit.flightInstanceId,permit.horizon,
      permit.selectedTNativeUtc,
      createHash("sha256").update("v0088-ci-packet-001").digest("hex"),
      qid,response,rights,3600];
     // PREPARE has only EXECUTE on scoped registration; direct queue
     // INSERT is forbidden before any signed packet is considered.
     await expect(client.query(
      "INSERT INTO clean.phase5_cd_pre_task_v39 DEFAULT VALUES"))
      .rejects.toMatchObject({code:"42501"});
     // Use parameterized arguments to the fixed reviewed function.
     const call="SELECT clean.phase5_cd_register_source_flight_v39("+
       "$1,$2,$3,$4,$5::timestamptz,$6,$7,$8,$9,$10) "+
       "AS task";
     await client.query("ROLLBACK");
     await client.query("BEGIN");
     await client.query("SET LOCAL ROLE "+PREP);
     await expect(client.query(call,[
      ...args.slice(0,4),
      new Date(Date.parse(permit.selectedTNativeUtc)+900_000).toISOString(),
      ...args.slice(5)])).rejects.toThrow("P5_CD_V0091_SOURCE_MEMBER_NOT_NATIVE_OPERATING_LEG");
     await client.query("ROLLBACK");
     await client.query("BEGIN");
     await client.query("SET LOCAL ROLE "+PREP);
     const restartable=process.env.V39_P6_V0100_RESTARTABLE_CI==="1";
     const ensure="SELECT * FROM clean.phase5_cd_ensure_exact_source_flight_v39("+
       "$1,$2,$3,$4,$5::timestamptz,$6,$7,$8,$9,$10)";
     if(restartable){
      await expect(client.query(ensure,[
       ...args.slice(0,4),
       new Date(Date.parse(permit.selectedTNativeUtc)+900_000).toISOString(),
       ...args.slice(5)])).rejects.toThrow("P5_CD_V0091_SOURCE_MEMBER_NOT_NATIVE_OPERATING_LEG");
      await client.query("ROLLBACK");
      await client.query("BEGIN");
      await client.query("SET LOCAL ROLE "+PREP);
     }
     if(conditional){
      // Real PREPARE login and the existing V0100 wrapper: prospectively
      // marked conditional member gets a task, not a native reclassification.
      // Roll back synthetic test task to preserve native test denominator.
      const ca=[...args];ca[2]=conditionalId;ca[5]=h("9");
      const got=await client.query(restartable?ensure:call,ca);
      expect(String(got.rows[0].task_id??got.rows[0].task)).toMatch(/^[1-9][0-9]*$/);
      await client.query("ROLLBACK");
      await client.query("BEGIN");
      await client.query("SET LOCAL ROLE "+PREP);
      const wrong=[...ca];wrong[2]="leg:g5a:"+h("6");
      await expect(client.query(restartable?ensure:call,wrong)).rejects.toThrow("P5_CD_V0091_SOURCE_MEMBER_MISSING_OR_DUPLICATED");
      await client.query("ROLLBACK");
      await client.query("BEGIN");
      await client.query("SET LOCAL ROLE "+PREP);
     }
     const raw=await client.query(restartable?ensure:call,args);
     const inserted=restartable?{task:raw.rows[0].task_id}:raw.rows[0];
     if(restartable)expect(raw.rows[0].newly_registered).toBe(true);
     expect(String(inserted.task)).toMatch(/^[1-9][0-9]*$/);
     await client.query("COMMIT");
     const final=(await admin.query(
      "SELECT task_id::text AS id,flight_instance_id AS flight,state,"+
      "packet_sha256 AS packet FROM clean.phase5_cd_pre_task_v39")).rows[0];
     expect(final).toMatchObject({
      id:String(inserted.task),flight:permit.flightInstanceId,state:"READY",
      packet:args[5]
     });
     await client.query("BEGIN");
     await client.query("SET LOCAL ROLE "+PREP);
     await expect(client.query(call,args)).rejects.toMatchObject({code:"23505"});
     await client.query("ROLLBACK");
     if(restartable){
      await client.query("BEGIN");
      await client.query("SET LOCAL ROLE "+PREP);
      const repeat=(await client.query(ensure,args)).rows[0];
      expect(repeat).toEqual({task_id:String(inserted.task),newly_registered:false});
      await client.query("COMMIT");
      await client.query("BEGIN");
      await client.query("SET LOCAL ROLE "+PREP);
      const conflicting=[...args];conflicting[5]="f".repeat(64);
      await expect(client.query(ensure,conflicting)).rejects.toThrow("P6_V0100_EXISTING_TASK_IDENTITY_OR_PACKET_CONFLICT");
      await client.query("ROLLBACK");
      expect((await admin.query("SELECT count(*)::int n FROM clean.phase5_cd_pre_task_v39")).rows[0].n).toBe(1);
      console.log("P6_V0100_REAL_ORIGINAL_EXACT_REPLAY_CONFLICT_PREPARE_ROLE_PASS");
     }
     console.log("P5_V0091_REAL_V0079_ORIGINAL_TO_V0087_QUEUE_TO_STAGE14_PREPARE_ROLE_PASS");
    }finally{client.release();}
   }finally{await prep.end();}
  }else{
   await admin.query(
    "INSERT INTO clean.phase5_cd_pre_task_v39("+
    "manifest_sha256,flight_instance_id,horizon,selected_native_t_utc,"+
    "prediction_cutoff_utc,packet_sha256,source_population_query_id,"+
    "source_response_sha256,reviewed_source_rights_sha256,source_expires_at_utc)"+
    " VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,clock_timestamp()+INTERVAL '1 hour')",
    [manifest,permit.flightInstanceId,permit.horizon,permit.selectedTNativeUtc,
     new Date(cutoffMs),createHash("sha256").update("v0088-ci-packet-001").digest("hex"),
     qid,response,rights]);
  }
 });
 afterAll(async()=>{
  if(p7Reader)await p7Reader.end();
  if(p7Scoped)await p7Scoped.end();
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
 it("enrolled flight preserves POST observation edits, but cannot promote POST to PRE",async()=>{
  const post=(await admin.query(
   "INSERT INTO clean.flight_snapshots("+
   "flight_instance_id,prediction_state,horizon,prediction_cutoff_utc,"+
   "selected_t_milestone_utc,selected_t_version,population_query_id,"+
   "fids_response_hash,builder_version)"+
   " VALUES($1,'POST_OBSERVATION','T-24h',$2,$3,'post-v1',$4,$5,'ci-post')"+
   " RETURNING id",
   [permit.flightInstanceId,new Date(cutoffMs+60_000),
    new Date(permit.selectedTNativeUtc),qid,response])).rows[0];
  expect(post?.id).toBeDefined();
  // An untrusted non-PRE row may NEVER preempt the exact unique-key
  // slot reserved for the genuine C+D PRE.
  await expect(admin.query(
   "INSERT INTO clean.flight_snapshots("+
   "flight_instance_id,prediction_state,horizon,prediction_cutoff_utc,"+
   "selected_t_milestone_utc,selected_t_version,population_query_id,"+
   "fids_response_hash,builder_version)"+
   " VALUES($1,'POST_OBSERVATION','T-24h',$2,$3,'post-preempt',$4,$5,'ci-post')",
   [permit.flightInstanceId,new Date(cutoffMs),
    new Date(permit.selectedTNativeUtc),qid,response]
  )).rejects.toThrow("P5_CD_V0088_RESERVED_PRE_KEY_COLLISION");
  await expect(admin.query(
   "UPDATE clean.flight_snapshots SET prediction_cutoff_utc=$1 WHERE id=$2",
   [new Date(cutoffMs),post.id]
  )).rejects.toThrow("P5_CD_V0088_RESERVED_PRE_KEY_COLLISION");
  const changed=await admin.query(
   "UPDATE clean.flight_snapshots SET selected_t_version='post-v2'"+
   " WHERE id=$1",[post.id]);
  expect(changed.rowCount).toBe(1);
  await expect(admin.query(
   "UPDATE clean.flight_snapshots SET prediction_state='PRE_DEPARTURE'"+
   " WHERE id=$1",[post.id])).rejects.toThrow(
    "P5_CD_V0088_ENROLLED_SNAPSHOT_IMMUTABLE");
  const del=await admin.query("DELETE FROM clean.flight_snapshots WHERE id=$1",
   [post.id]);
  expect(del.rowCount).toBe(1);
  console.log("P5_CD_V0088_POST_COMPAT_RESERVED_PRE_KEY_AND_PROMOTION_REFUSED");
 });
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
  // Synthetic as-of receipts exercise the original Stage14 DB feature path.
  // They neither imply physical FIDS rights nor represent measured flights.
  const member=(await admin.query(
   "SELECT available_at FROM clean.flight_population"+
   " WHERE analytic_identity_id=$1",[permit.flightInstanceId]
  )).rows[0];
  const memberAt=new Date(member.available_at).toISOString();
  const nowCi=new Date((await admin.query(
   "SELECT clock_timestamp() AS at")).rows[0].at).getTime();
  const observations=[
   {flightInstanceId:permit.flightInstanceId,
    field:"reported_pre_departure_status" as const,value:"Boarding",
    source:"AERODATABOX_FIDS" as const,sourceRecordId:response,
    observedAtUtc:memberAt,availableAtUtc:memberAt,
    rightsDisposition:"EXTERNALLY_REVIEWED_ALLOW" as const},
   {flightInstanceId:permit.flightInstanceId,
    field:"prior_route_departure_delay_median_minutes" as const,value:13,
    source:"REVIEWED_HISTORIC_CONTEXT" as const,sourceRecordId:h("9"),
    observedAtUtc:iso(nowCi-50*60_000),
    availableAtUtc:iso(nowCi-45*60_000),
    validFromUtc:iso(nowCi-60*60_000),validToUtc:null,
    rightsDisposition:"EXTERNALLY_REVIEWED_ALLOW" as const}
  ];
  const extendedPermit={
   ...permit,reviewedSupplementalFeatureBundle:{
    schema:"v39.phase5.e-signed-source-supplement.v1" as const,
    flightInstanceId:permit.flightInstanceId,
    populationQueryId:qid,
    originalResponseSha256:response,
    observationsSha256:createHash("sha256").update(
     JSON.stringify(observations)).digest("hex"),
    externalSourceAndContentsReviewReceiptSha256:h("c"),
    fields:["reported_pre_departure_status",
     "prior_route_departure_delay_median_minutes"] as Array<
     "reported_pre_departure_status"|
     "prior_route_departure_delay_median_minutes">,
    observations
   }
  } satisfies P5Stage14SingleFlightPrePermit;
  process.env.V39_P5_E_SUPPLEMENT_CI="1";
  let saved:Awaited<ReturnType<typeof persistP5V0079SingleBoundFlightPre>>;
  try{
   if(p7){
    await expect(persistP5V0079SingleBoundFlightPre(writer,extendedPermit,{
     realV0088QueueFenceCi:claimInfo,amendmentENativeRouteBoundCi:true,phase7PrePreservation:{...p7,separatelyVerifiedFields:[]}
    })).rejects.toThrow(/unpreserved-present-field/);
    expect((await admin.query("SELECT count(*)::int n FROM clean.flight_snapshots")).rows[0].n).toBe(0);
    expect((await admin.query("SELECT count(*)::int n FROM phase7_private.pre_fragment_v39")).rows[0].n).toBe(0);
   }
   saved=await persistP5V0079SingleBoundFlightPre(writer,extendedPermit,{
    realV0088QueueFenceCi:claimInfo,
    amendmentENativeRouteBoundCi:true,
    ...(p7?{phase7PrePreservation:p7}:{})
   });
  }finally{delete process.env.V39_P5_E_SUPPLEMENT_CI;}
  expect(saved.preSnapshotsInserted).toBe(1);
  expect(saved.postCommitDatabaseReadbackVerified).toBe(true);
  if(p7){
   expect(saved.phase7DerivedPreFragmentIndependentlyVerified).toBe(true);
   const pre=(await admin.query("SELECT f.packet_bytes,l.expires_at_utc,b.source_expires_at_utc FROM phase7_private.pre_fragment_v39 f JOIN phase7_private.pre_source_link_v39 l ON l.row_id=f.row_id JOIN clean.flight_snapshots s ON s.id=l.snapshot_id JOIN clean.phase5_fids_original_binding_v39 b ON b.population_query_id::text=s.population_query_id WHERE l.snapshot_id=$1",[saved.committedSnapshotId])).rows;
   expect(pre).toHaveLength(1);
   const bytes=pre[0].packet_bytes.toString("utf8"),row=JSON.parse(bytes).rows[0];
   expect(row.featureBuckets).toEqual({status_bin:1,context_bin:1});
   expect(row.labelBuckets).toEqual({delay_bin:null});
   expect(row.censoring).toBe("not_due");
   expect(bytes).not.toMatch(/WSSS|YSSY|leg:ci:cd|Boarding|2026-|population_query_id/);
   expect(pre[0].expires_at_utc.getTime()).toBeLessThanOrEqual(pre[0].source_expires_at_utc.getTime());
   await expect(p7Reader!.query("SELECT * FROM phase7_private.pre_source_link_v39")).rejects.toMatchObject({code:"42501"});
   await expect(writer.query("SELECT * FROM phase7_private.pre_fragment_v39")).rejects.toMatchObject({code:"42501"});
   // Actual scoped function, not a mocked result. It may read only through
   // the still-live exact source link and returns no source identity.
   const anchor={manifestSha256:permit.manifestSha256,rightsSha256:permit.expectedReviewedSourceRightsSha256,
    queryDigestSha256:permit.queryDigestSha256,snapshotId:saved.committedSnapshotId,runDayIndex:permit.runDayIndex,
    airportIcao:permit.airportIcao,frameSha256:permit.reviewedFrameSha256,flightInstanceId:permit.flightInstanceId,
    horizon:permit.horizon,selectedNativeTUtc:permit.selectedTNativeUtc,preIssuedAtUtc:memberAt,
    originalSourceAvailableAtUtc:memberAt,sourceExpiresAtUtc:pre[0].source_expires_at_utc.toISOString(),
    sourceResponseSha256:permit.expectedSourceResponseSha256,ambiguousIdentity:false};
   const group=await readPhase7PostScopedGroup(p7Scoped!,P7SCOPED,p7.contract,p7.profile,anchor);
   expect(group.fragments).toHaveLength(1);
   expect(group.fragments[0].packet.rows[0]).toEqual(row);
   await expect(readPhase7PostScopedGroup(p7Scoped!,P7SCOPED,p7.contract,p7.profile,{...anchor,queryDigestSha256:sha("wrong query")})).rejects.toThrow();
   await expect(p7Scoped!.query("SELECT * FROM phase7_private.pre_fragment_v39")).rejects.toMatchObject({code:"42501"});
   expect((await admin.query("SELECT phase7_private.sweep_due_pre_links_v39(10) n")).rows[0].n).toBe(0);
   // Synthetic forced expiry only, proves deletion is restricted to links
   // and that an earlier derived row survives original-link expiry.
   await admin.query("UPDATE phase7_private.pre_source_link_v39 SET expires_at_utc=clock_timestamp()-interval '1 second' WHERE snapshot_id=$1",[saved.committedSnapshotId]);
   expect((await admin.query("SELECT phase7_private.sweep_due_pre_links_v39(10) n")).rows[0].n).toBe(1);
   expect((await admin.query("SELECT count(*)::int n FROM phase7_private.pre_fragment_v39")).rows[0].n).toBe(1);
   await expect(readPhase7PostScopedGroup(p7Scoped!,P7SCOPED,p7.contract,p7.profile,anchor)).rejects.toThrow();
   console.log("P7_STAGE14_ATOMIC_PRE_FRAGMENT_INDEPENDENT_READBACK_EXPIRED_LINK_REMOVED_NO_GO");
  }
  const features=(await admin.query(
   "SELECT features_json,missingness_flags FROM clean.flight_snapshots"+
   " WHERE id=$1",[saved.committedSnapshotId])).rows[0];
  expect(features.features_json).toEqual([
   {name:"origin_icao",value:"WSSS"},
   {name:"destination_icao",value:"YSSY"},
   {name:"reported_pre_departure_status",value:"Boarding"},
   {name:"prior_route_departure_delay_median_minutes",value:13}
  ]);
  expect(features.missingness_flags).toMatchObject({
   origin_icao:null,destination_icao:null,
   reported_pre_departure_status:null,
   prior_route_departure_delay_median_minutes:null
  });
  console.log("P5_E_STAGE14_ACTUAL_SOURCE_BOUND_PRE_ROUTE_FEATURES_PERSISTED");

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
 (CONDITIONAL_QUEUE?it:it.skip).each([["T-6h",false],["T-90m",false],["T-6h",true],["T-90m",true]] as const)("T070/T129 conditional %s witnessed=%s exact registry to committed queue PRE",async (horizon,witnessed)=>{
  const dbNow=new Date((await admin.query(
   "SELECT clock_timestamp() AS at")).rows[0].at).getTime();
  const ownCutoff=dbNow+150_000, t=new Date(ownCutoff+(horizon==="T-6h"?21600000:5400000));
  const end=new Date(t.getTime()+4*3600_000);
  // I143/T139 downstream contract: a witnessed service may be reported
  // 15 minutes later in its current original; its original T stays frozen.
  const reportedT=new Date(t.getTime()+(witnessed?15*60_000:0));
  const caseKey=horizon+(witnessed?"-witnessed":"-standalone"),suffix=(witnessed?3:1)+(horizon==="T-90m"?1:0);
  const q2=sha("conditional later query "+caseKey),r2=sha("conditional reservation "+caseKey),qid2="a23e4567-e89b-42d3-a456-42661417400"+suffix;
  const stable=sha("conditional service "+caseKey),flight="leg:g5a:"+stable,protocol=sha("CI conditional protocol"),standalone=sha("CI-only standalone protocol"),content=sha("CI content review");
  const payload=Buffer.from(JSON.stringify({departures:[{flight:"CI300",status:"Boarding",
   ...(witnessed?{departure:{scheduledTime:{utc:reportedT.toISOString()}}}:{})}]})),bodyHash=sha(payload.toString("utf8"));
  const dispatch=new Date(dbNow-15*60_000);
  await admin.query("INSERT INTO clean.phase5_fids_utc_charge_budget_v39(manifest_sha256,charge_day_utc,daily_api_ceiling,daily_other_reserved_units) VALUES($1,$2,1900,100) ON CONFLICT DO NOTHING",[manifest,dispatch.toISOString().slice(0,10)]);
  await admin.query(
   "INSERT INTO clean.phase5_fids_allowed_query_v39"+
   "(query_digest,manifest_sha256,run_day_index,query_key,slot_id,horizon,"+
   "airport_icao,early_draw_sha256,reviewed_release_sha256,"+
   "rights_review_sha256,provider_contract_sha256,github_run_id,"+
   "service_window_start_utc,service_window_end_utc,from_local,to_local,"+
   "airport_iana_timezone,provider_api_version,fids_protocol_version,"+
   "planned_dispatch_utc,planned_charge_utc_date,hard_latest_dispatch_utc,"+
   "prediction_cutoff_utc,api_units_per_attempt,max_physical_attempts,state)"+
   " VALUES($1,$2,1,$13,'MID_A',$14,'WSSS',"+
   "$3,$4,$5,$6,'42363348763',$7,$8,'2027-01-01T00:00',"+
   "'2027-01-01T04:00','Asia/Singapore','1.15.4','v39',"+
   "$9,$10::date,$11,$12,2,1,'ACTIVE')",
   [q2,manifest,h("4"),h("5"),rights,contract,t,end,dispatch,
    dispatch.toISOString().slice(0,10),
    new Date(dbNow-10*60_000),new Date(ownCutoff),"ci_later_"+caseKey,horizon]);
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
    phase5PopulationIdentityVersion:"P5_CANONICAL_SHA256_V1",fidsRequestContract:{schema:"v39.fids-request-frame.application-intent.v1",endpointKind:"airport_local_fids",direction:"Departure",withLeg:true,withCargo:false,withPrivate:false,withCancelled:true,withCodeshared:true,withLocation:false,airportIcao:"WSSS",openapiSha256:contract,phase5ConditionalService:{protocolSha256:protocol,cohortStartUtc:iso(Math.floor(t.getTime()/60000)*60000)}},
    originalDecodedEntityBodyPreserved:true,
    originalHttpWireBytesPreserved:false,
    originalDecodedEntityBodyEvidence:{
     representation:"FETCH_DECODED_RESPONSE_BODY_BYTES_NOT_HTTP_WIRE",
     bodySha256:bodyHash,bodyBase64:payload.toString("base64"),
     bodyLengthBytes:payload.length}
   }),contract]);
  await admin.query(
   "INSERT INTO clean.flight_population"+
   "(source_airport_icao,dep_airport_icao,arr_airport_icao,dep_scheduled_utc,"+
   "window_start_utc,window_end_utc,cutoff_utc,"+
   "source_type,population_query_id,analytic_identity_id,"+
   "canonical_flight_instance_id,population_role,scope_classification,"+
   "available_at,response_hash,flight_number,"+
   "query_direction,from_local,to_local,airport_iana_timezone,"+
   "codeshare_resolution_status,fids_retrieval_utc,"+
   "provider_api_version,fids_protocol_version,openapi_sha256)"+
   " VALUES('WSSS','WSSS','YSSY',$1,$2,$3,$4,'fids',$5,$6,"+
   "$6,'requested_airport_primary','unknown',"+
   "clock_timestamp(),$7,'CI300','Departure',"+
   "'2027-01-01T00:00','2027-01-01T04:00','Asia/Singapore',"+
   "'g5a_conditional_operator_composite_no_native_id',clock_timestamp(),'1.15.4','v39',$8)",
   [reportedT,t,end,new Date(ownCutoff),qid2,flight,response,contract]);
  await admin.query(
   "INSERT INTO clean.phase5_fids_original_binding_v39"+
   "(population_query_id,reservation_sha256,query_digest,manifest_sha256,"+
   "response_hash,decoded_original_body_sha256,rights_review_sha256,"+
   "normalized_members_count,source_expires_at_utc)"+
   " VALUES($1,$2,$3,$4,$5,$6,$7,1,CASE WHEN $8::boolean THEN"+
   " (SELECT available_at+interval '22 hours' FROM clean.fids_query_response WHERE population_query_id=$1::uuid)"+
   " ELSE clock_timestamp()+interval '1 hour' END)",
   [qid2,r2,q2,manifest,response,bodyHash,rights,process.env.V39_P5B_CONDITIONAL_POST_T6_CI==="1"&&horizon==="T-6h"]);

  const memberAt=(await admin.query("SELECT available_at FROM clean.flight_population WHERE analytic_identity_id=$1 AND population_query_id=$2",[flight,qid2])).rows[0].available_at.toISOString();
  const observations=[{flightInstanceId:flight,field:"reported_pre_departure_status" as const,value:"Boarding",source:"AERODATABOX_FIDS" as const,sourceRecordId:response,observedAtUtc:memberAt,availableAtUtc:memberAt,rightsDisposition:"EXTERNALLY_REVIEWED_ALLOW" as const}];
  const {externalNativeTPhysicalLegAndSourceUseReviewed:unused,...base}=permit;
  // Historical synthetic T24 precondition only: 18h/22.5h cannot elapse
  // in this disposable CI job. T074 separately exercises real Stage17
  // commit clocks; this tests the actual later consumer, not T24 issuance.
  let witness:P5Stage24ReviewedT24Receipt|undefined;
  if(witnessed){
   expect(P7).toBe(true);
   const t24=t.getTime()-86400000,preAt=iso(t24-90000),witnessAt=iso(t24-60000),readbackAt=iso(t24-45000);
   // PostgreSQL keeps microseconds; the existing pg/JS receipt transports
   // milliseconds. This positive case must not lose an authentic anchor.
   const storedWitnessAt=witnessAt.replace(/Z$/,"456Z");
   const qid24="b23e4567-e89b-42d3-a456-42661417400"+suffix,hash24=sha("historical CI T24 response "+caseKey),query24=sha("historical CI T24 query "+caseKey);
   const version=base.selectedTConfig.milestone+":"+base.selectedTConfig.version+":"+base.selectedTConfig.artifactHash;
   const fixture=await admin.connect();
   try{
    await fixture.query("BEGIN");
    await fixture.query("INSERT INTO clean.fids_query_response(population_query_id,source_airport_icao,query_direction,service_window_start_utc,service_window_end_utc,from_local,to_local,airport_iana_timezone,fids_retrieval_utc,raw_persisted_at_utc,available_at,response_hash,provider_api_version,fids_protocol_version,openapi_sha256) VALUES($1,'WSSS','Departure',$2,$3,'2027-01-01T00:00','2027-01-01T04:00','Asia/Singapore',$4,$4,$4,$5,'1.15.4','v39',$6)",[qid24,t,end,iso(t24-120000),hash24,contract]);
    await fixture.query("INSERT INTO clean.flight_population(source_airport_icao,dep_airport_icao,arr_airport_icao,dep_scheduled_utc,window_start_utc,window_end_utc,cutoff_utc,source_type,population_query_id,analytic_identity_id,canonical_flight_instance_id,population_role,scope_classification,available_at,response_hash,flight_number,query_direction,from_local,to_local,airport_iana_timezone,codeshare_resolution_status,fids_retrieval_utc,provider_api_version,fids_protocol_version,openapi_sha256) VALUES('WSSS','WSSS','YSSY',$1,$1,$2,$3,'fids',$4,$5,$5,'requested_airport_primary','unknown',$6,$7,'CI300','Departure','2027-01-01T00:00','2027-01-01T04:00','Asia/Singapore','g5a_conditional_operator_composite_no_native_id',$6,'1.15.4','v39',$8)",[t,end,iso(t24),qid24,flight,iso(t24-120000),hash24,contract]);
    const row=(await fixture.query("INSERT INTO clean.flight_snapshots(flight_instance_id,prediction_state,horizon,prediction_cutoff_utc,selected_t_milestone_utc,selected_t_version,population_query_id,fids_response_hash,frame_hash,config_hash,builder_version,created_at) VALUES($1,'PRE_DEPARTURE','T-24h',$2,$3,$4,$5,$6,$7,$8,'historical-ci',$9) RETURNING id::text AS id,population_member_id",[flight,iso(t24),t,version,qid24,hash24,base.reviewedFrameSha256,base.reviewedConfigSha256,preAt])).rows[0];
    expect(row.population_member_id).toBeTruthy();
    // Seed only a historical synthetic row under the guarded disposable
    // admin. Restore the one time-dependent trigger in the same transaction.
    await fixture.query("ALTER TABLE clean.phase5_t24_postcommit_witness_v39 DISABLE TRIGGER p5_t24_witness_before_insert_v39");
    await fixture.query("INSERT INTO clean.phase5_t24_postcommit_witness_v39(snapshot_id,flight_instance_id,population_query_id,fids_response_hash,source_query_digest,rights_review_sha256,selected_t_native_utc,selected_t_version,t24_cutoff_utc,frame_hash,config_hash,post_pre_commit_db_observed_at_utc) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",[row.id,flight,qid24,hash24,query24,rights,t,version,iso(t24),base.reviewedFrameSha256,base.reviewedConfigSha256,storedWitnessAt]);
    await fixture.query("ALTER TABLE clean.phase5_t24_postcommit_witness_v39 ENABLE TRIGGER p5_t24_witness_before_insert_v39");
    const bare:Omit<P5Stage24ReviewedT24Receipt,"receiptSha256">={schema:"v39.phase5.stage24.externally-reviewed-stage17-receipt.v1",snapshotId:row.id,flightInstanceId:flight,selectedTNativeUtc:t.toISOString(),frozenT24CutoffUtc:iso(t24),expectedSelectedTVersion:version,t24OriginalFidsSha256:hash24,t24SourceQueryDigestSha256:query24,t24FrameSha256:base.reviewedFrameSha256,t24ConfigSha256:base.reviewedConfigSha256,witnessDbObservedAtUtc:witnessAt,stage17PostCommitReadbackAtUtc:readbackAt};
    witness={...bare,receiptSha256:digestP5Stage24ReviewedReceipt(bare)};
    await fixture.query("COMMIT");
   }catch(e){await fixture.query("ROLLBACK");throw e;}finally{fixture.release();}
   expect((await admin.query("SELECT tgenabled FROM pg_trigger WHERE tgrelid='clean.phase5_t24_postcommit_witness_v39'::regclass AND tgname='p5_t24_witness_before_insert_v39'")).rows[0].tgenabled).toBe("O");
  }
  const p:P5Stage14SingleFlightPrePermit={...base,horizon,slot:"MID_A",queryDigestSha256:q2,expectedGithubSourceRunId:"42363348763",expectedSourcePopulationQueryId:qid2,flightInstanceId:flight,selectedTNativeUtc:t.toISOString(),
   identityEvidenceTier:"CONDITIONAL_QUERY_FILTERED_SERVICE",externalConditionalScheduleSourceAndUseReviewed:true,reviewedProtocolAmendmentSha256:protocol,reviewedStableServiceKeySha256:stable,expectedOperatorFlightNumber:"CI300",expectedDestinationIcao:"YSSY",requireProspectiveConditionalSourceMarker:true,
   ...(witness?{reviewedT24WitnessReceipt:witness}:{reviewedStandaloneLaterNoT24:{schema:"v39.phase5.standalone-later-asof-no-t24.v1" as const,reviewedProtocolSha256:standalone,reviewedOriginalResponseSha256:response,reviewedNativeTSemanticsSha256:base.independentlyReviewedNativeTEvidenceSha256,missingT24Class:"HONEST_T24_UNOBSERVED_NOT_BACKFILLED" as const,independentLaterAsOfAndMissingnessReviewAttested:true as const}}),
   reviewedSupplementalFeatureBundle:{schema:"v39.phase5.e-signed-source-supplement.v1",flightInstanceId:flight,populationQueryId:qid2,originalResponseSha256:response,observationsSha256:sha(JSON.stringify(observations)),externalSourceAndContentsReviewReceiptSha256:content,fields:["reported_pre_departure_status"],observations}};
  const issued=(await admin.query("SELECT clock_timestamp() AS at")).rows[0].at.toISOString(),code="a".repeat(40),policy=sha("CI proof policy"),proof=generateKeyPairSync("ed25519");
  const proofRaw=Buffer.from(JSON.stringify({schema:"v39.phase7.separate-pre-field-proof.v1",manifestSha256:manifest,rightsSha256:rights,policySha256:policy,permitSha256:hashPhase7DurableCandidate(p),issuedAtUtc:issued,validUntilUtc:iso(ownCutoff),fields:[]}));
  const wire={payloadBase64:proofRaw.toString("base64"),signatureBase64:sign(null,proofRaw,proof.privateKey).toString("base64")};
  expect(verifyPhase7SignedPreFieldProof({P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256:policy,P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256:createHash("sha256").update(proof.publicKey.export({type:"spki",format:"der"})).digest("hex"),P6_PHASE7_PRE_PROOF_REVIEWER_PUBLIC_KEY_BASE64:Buffer.from(proof.publicKey.export({type:"spki",format:"pem"})).toString("base64")},p,policy,[],wire).permitSha256).toBe(hashPhase7DurableCandidate(p));
  const bytes=Buffer.from(JSON.stringify({schema:witnessed?"v39.phase5.github-conditional-witnessed-later-pre-reviewed.v1":"v39.phase5.github-conditional-standalone-later-pre-asof-reviewed.v1",reviewedCodeSha:code,reviewArtifactSha256:sha("CI review artifact"),independentlyReviewedConditionalScheduleServiceAndSourceAttested:true,reviewedConditionalProtocolSha256:protocol,prePermit:p,phase7FieldProof:wire})),packetSha=sha(bytes.toString("utf8")),path="data-collection/phase5/frozen/conditional_ci_packet.json",sourcePath="data-collection/phase5/frozen/conditional_ci_source.json",registryPath="data-collection/phase5/frozen/conditional_ci_registry.json";
  const source:P5SignedSourceBatchRegistry={schema:"v39.phase5.signed-per-day-source-batch-readonly.v1",manifestSha256:manifest,runDayIndex:1,entries:[{filePath:"data-collection/phase5/frozen/conditional_ci_query.json",expectedPacketSha256:sha("CI source packet"),expectedQueryDigestSha256:q2}]};
  const sourceRaw=Buffer.from(JSON.stringify(source)),sourceSha=sha(sourceRaw.toString("utf8")),reg:P5SignedLaterPreDayRegistry={schema:"v39.phase5.signed-later-pre-day-registry.v1",manifestSha256:manifest,reviewedCodeSha:code,sourceDayRegistryFilePath:sourcePath,sourceDayRegistrySha256:sourceSha,runDayIndex:1,shardIndex:1,entries:[{filePath:path,expectedPacketSha256:packetSha,expectedQueryDigestSha256:q2,expectedFlightInstanceId:flight,expectedHorizon:horizon,expectedSelectedTNativeUtc:p.selectedTNativeUtc,expectedSourcePopulationQueryId:qid2,...(witness?{expectedT24ReceiptSha256:witness.receiptSha256}:{})}]};
  const regRaw=Buffer.from(JSON.stringify(reg)),regSha=sha(regRaw.toString("utf8")),conditionalPreScope={protocolSha256:protocol,externalContentUseReviewSha256:content};
  const pins={registryFilePath:registryPath,expectedRegistrySha256:regSha,expectedSourceDayRegistrySha256:sourceSha,expectedManifestSha256:manifest,expectedApprovedMainSha:code,expectedRunDayIndex:1,expectedReleaseSha256:h("5"),expectedRightsSha256:rights,conditionalPreScope,...(!witnessed?{independentlyApprovedStandaloneProtocolSha256:standalone}:{})};
  if(!witnessed)expect(()=>verifyP5SignedLaterPreDayRegistry(regRaw,reg,sourceRaw,source,{...pins,independentlyApprovedStandaloneProtocolSha256:undefined},()=>bytes)).toThrow("MISSING_SIGNED_INDEPENDENT_STANDALONE_REVIEW");
  if(witnessed){
    const wrongReg={...reg,entries:reg.entries.map(e=>({...e,expectedT24ReceiptSha256:sha("wrong witness digest")}))},wrongRaw=Buffer.from(JSON.stringify(wrongReg));
    expect(()=>verifyP5SignedLaterPreDayRegistry(wrongRaw,wrongReg,sourceRaw,source,{...pins,expectedRegistrySha256:sha(wrongRaw.toString("utf8"))},()=>bytes)).toThrow("T24_WITNESS_RECEIPT_NOT_BOUND_TO_SIGNED_REGISTRY");
   }
   const verified=verifyP5SignedLaterPreDayRegistry(regRaw,reg,sourceRaw,source,pins,()=>bytes);
  const roster:P5CdFrozenRoster={schema:"v39.phase5.cd-existing-signed-pre-packet-roster.v1",reviewedCodeSha:code,manifestSha256:manifest,rightsSha256:rights,entries:verified.entries.map(x=>({filePath:x.filePath,packetSha256:x.packetSha256}))},rr=Buffer.from(JSON.stringify(roster));
  const packets=verifyP5CdFrozenRoster(rr,roster,verified.entries,{schema:"v39.phase5.cd-gh-pre-explicit-release.v1",releaseMode:"PHASE6_APPROVED",approvedCodeSha:code,rosterSha256:sha(rr.toString("utf8")),manifestSha256:manifest,rightsSha256:rights,conditionalPreScope,...(!witnessed?{independentlyApprovedStandaloneProtocolSha256:standalone}:{}),stop:false,providerCalls:0,scientificFreezeEstablishedByThisFunction:false});
  const entry=packets.get(packetSha)!;expect(entry.permit).toEqual(p);
  const prep=new Pool({connectionString:"postgresql://phase5_p30_prepare_login_20261107:ci-only@localhost:5432/neondb?sslmode=disable",max:1});
  try{const c=await prep.connect();try{
   await c.query("SET ROLE phase5_fids_prepare_prod_20261107");
   const oldSql="SELECT clean.phase5_cd_register_source_flight_v39($1,$2,$3,$4,$5::timestamptz,$6,$7,$8,$9,$10) AS task_id";
   const args=makeP5CdV0091RegisterArgs(p,packetSha);
   if(witnessed){
    // Old native/standalone signature stays strict even when a genuine
    // witness exists. Only an explicit reviewed receipt selects V0114.
    await expect(c.query(oldSql,args)).rejects.toThrow("P5_CD_V0091_SOURCE_MEMBER_NOT_NATIVE_OPERATING_LEG");
    const exact=makeP5CdReviewedSourceRegistrationCall(p,packetSha,"REGISTER");
    const rehash=(delta:Record<string,unknown>)=>{const r={...witness!,...delta};return {...r,receiptSha256:digestP5Stage24ReviewedReceipt(r as P5Stage24ReviewedT24Receipt)};};
    const malformed=[null,[],{...witness!,snapshotId:[witness!.snapshotId]},{...witness!,snapshotId:Number(witness!.snapshotId)},
     {...witness!,unexpected:true},{...witness!,receiptSha256:sha("incorrect receipt digest")},
     rehash({snapshotId:"999999999999999999"}),rehash({flightInstanceId:"leg:g5a:"+sha("wrong service")}),
     rehash({selectedTNativeUtc:iso(t.getTime()+60000)}),rehash({frozenT24CutoffUtc:iso(t.getTime()-86400000+1)}),
     rehash({t24OriginalFidsSha256:sha("wrong T24 original")}),rehash({t24SourceQueryDigestSha256:sha("wrong T24 query")}),
     rehash({t24FrameSha256:sha("wrong T24 frame")}),rehash({t24ConfigSha256:sha("wrong T24 config")}),
     rehash({expectedSelectedTVersion:"wrong-version"}),rehash({witnessDbObservedAtUtc:iso(t.getTime()-86400000-181000)}),
     rehash({stage17PostCommitReadbackAtUtc:iso(t.getTime()-86400000)})];
    for(const receipt of malformed)
     await expect(c.query(exact.sql,[...args,JSON.stringify(receipt)])).rejects.toThrow(/P5B_V0114_/);
    const wrongRights=[...exact.args];wrongRights[8]=sha("wrong rights");
    await expect(c.query(exact.sql,wrongRights)).rejects.toThrow("P5B_V0114_PERSISTED_T24_WITNESS_MISMATCH");
    const stale=[...exact.args];stale[9]=1;
    await expect(c.query(exact.sql,stale)).rejects.toThrow("P5_CD_V0091_REAL_SOURCE_OR_FRAME_TIME_NOT_QUALIFIED");
    const wrongOriginal=[...exact.args];wrongOriginal[7]=sha("wrong current original");
    await expect(c.query(exact.sql,wrongOriginal)).rejects.toThrow("P5_CD_V0091_REAL_SOURCE_OR_FRAME_TIME_NOT_QUALIFIED");
    const guards=()=>admin.query("SELECT c.relname,t.tgname,t.tgenabled FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE t.tgname IN ('trg_flight_population_fids_immutable','trg_fids_query_response_immutable') ORDER BY t.tgname");
    const constraints=()=>admin.query("SELECT c.relname,k.conname,k.convalidated,pg_get_constraintdef(k.oid) AS definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid WHERE k.conrelid IN ('clean.flight_population'::regclass,'clean.fids_query_response'::regclass) AND k.contype='c' ORDER BY c.relname,k.conname");
    const originalGuards=(await guards()).rows,originalConstraints=(await constraints()).rows;
    // Corrupt-state refusal tests only, inside a disposable admin rollback.
    // Reenable the immutable UPDATE trigger before calling the real
    // restricted admission; retain every CHECK throughout. NULL member
    // response/availability/role are already forbidden by fids_complete.
    for(const bad of [
     {table:"flight_population",trigger:"trg_flight_population_fids_immutable",column:"canonical_flight_instance_id",value:null},
     {table:"flight_population",trigger:"trg_flight_population_fids_immutable",column:"dep_airport_icao",value:null},
     {table:"flight_population",trigger:"trg_flight_population_fids_immutable",column:"dep_scheduled_utc",value:end},
     {table:"flight_population",trigger:"trg_flight_population_fids_immutable",column:"available_at",value:new Date(ownCutoff+1000)},
     {table:"fids_query_response",trigger:"trg_fids_query_response_immutable",column:"response_hash",value:null}
    ]){
     const corrupt=await admin.connect();
     try{
      await corrupt.query("BEGIN");
      await corrupt.query("ALTER TABLE clean."+bad.table+" DISABLE TRIGGER "+bad.trigger);
      const changed=await corrupt.query("UPDATE clean."+bad.table+" SET "+bad.column+"=$1 WHERE population_query_id=$2::uuid"+
       (bad.table==="flight_population"?" AND analytic_identity_id=$3":"")+" RETURNING "+bad.column+" AS poisoned",bad.table==="flight_population"?[bad.value,qid2,flight]:[bad.value,qid2]);
      expect(changed.rowCount).toBe(1);expect(changed.rows[0].poisoned).toEqual(bad.value);
      await corrupt.query("ALTER TABLE clean."+bad.table+" ENABLE TRIGGER "+bad.trigger);
      await corrupt.query("SET LOCAL ROLE phase5_fids_prepare_prod_20261107");
      await expect(corrupt.query(exact.sql,exact.args)).rejects.toThrow(bad.table==="flight_population"?
       "P5_CD_V0091_SOURCE_MEMBER_NOT_NATIVE_OPERATING_LEG":"P5_CD_V0091_REAL_SOURCE_OR_FRAME_TIME_NOT_QUALIFIED");
     }finally{await corrupt.query("ROLLBACK");corrupt.release();}
    }
    const ambiguous=await admin.connect();
    try{
     await ambiguous.query("BEGIN");
     const added=await ambiguous.query("INSERT INTO clean.flight_snapshots(flight_instance_id,prediction_state,horizon,prediction_cutoff_utc,selected_t_milestone_utc,selected_t_version,population_query_id,fids_response_hash,frame_hash,config_hash,builder_version,created_at) SELECT flight_instance_id,prediction_state,horizon,prediction_cutoff_utc-interval '1 minute',selected_t_milestone_utc-interval '1 minute',selected_t_version,population_query_id,fids_response_hash,frame_hash,config_hash,'historical-ci-ambiguous',created_at FROM clean.flight_snapshots WHERE id=$1::bigint RETURNING id",[witness!.snapshotId]);
     expect(added.rowCount).toBe(1);
     await ambiguous.query("SET LOCAL ROLE phase5_fids_prepare_prod_20261107");
     await expect(ambiguous.query(exact.sql,exact.args)).rejects.toThrow("P5B_V0114_PERSISTED_T24_WITNESS_MISMATCH");
    }finally{await ambiguous.query("ROLLBACK");ambiguous.release();}
    expect((await guards()).rows).toEqual(originalGuards);expect((await constraints()).rows).toEqual(originalConstraints);
    expect((await admin.query("SELECT count(*)::int n FROM clean.flight_snapshots WHERE flight_instance_id=$1 AND horizon='T-24h'",[flight])).rows[0].n).toBe(1);
    expect((await admin.query("SELECT count(*)::int n FROM clean.phase5_cd_pre_task_v39 WHERE flight_instance_id=$1",[flight])).rows[0].n).toBe(0);
   }else{
    const shifted=[...args];shifted[4]=iso(t.getTime()+60000);
    await expect(c.query(oldSql,shifted)).rejects.toThrow("P5_CD_V0091_SOURCE_MEMBER_NOT_NATIVE_OPERATING_LEG");
   }
   expect((await executeP6PrivateEnrollmentBatch(c,[{entry,cutoff:ownCutoff}])).newlyRegistered).toBe(1);
   expect((await executeP6PrivateEnrollmentBatch(c,[{entry,cutoff:ownCutoff}])).alreadyRegistered).toBe(1);
   if(witnessed){
    const exact=makeP5CdReviewedSourceRegistrationCall(p,packetSha,"ENSURE");
    await expect(c.query(exact.sql,[...args,JSON.stringify({...witness!,receiptSha256:sha("invalid replay receipt")})])).rejects.toThrow("P5B_V0114_REVIEWED_RECEIPT_DIGEST");
    const changed={...witness!,t24SourceQueryDigestSha256:sha("changed replay anchor")};
    await expect(c.query(exact.sql,[...args,JSON.stringify({...changed,receiptSha256:digestP5Stage24ReviewedReceipt(changed)})])).rejects.toThrow("P5B_V0114_PERSISTED_T24_WITNESS_MISMATCH");
   }
   await expect(executeP6PrivateEnrollmentBatch(c,[{entry:{...entry,packetSha256:sha("different signed packet")},cutoff:ownCutoff}])).rejects.toThrow("P6_V0100_EXISTING_TASK_IDENTITY_OR_PACKET_CONFLICT");
  }finally{c.release(true);}}finally{await prep.end();}
  const claimed=(await admin.query("SELECT * FROM clean.phase5_cd_claim_due_v39('ci-conditional-later',1,90)")).rows;
  expect(claimed).toHaveLength(1);const c=claimed[0];expect(c.packet_sha256).toBe(packetSha);
  expect((await admin.query("SELECT clean.phase5_cd_mark_write_started_v39($1::bigint,$2,$3::bigint) ok",[c.task_id,c.lease_owner,c.lease_generation])).rows[0].ok).toBe(true);
  const fence={taskId:String(c.task_id),owner:String(c.lease_owner),generation:String(c.lease_generation),packetSha256:packetSha};
  process.env.V39_P5_E_SUPPLEMENT_CI="1";
  try{
   const options={realV0088QueueFenceCi:fence,amendmentENativeRouteBoundCi:true as const};
   if(!witnessed)await expect(persistP5V0079SingleBoundFlightPre(writer,p,options)).rejects.toThrow("MISSING_SIGNED_INDEPENDENT_STANDALONE_REVIEW");
   else{
    await expect(persistP5V0079SingleBoundFlightPre(writer,{...p,reviewedT24WitnessReceipt:undefined},options)).rejects.toThrow("LATER_HORIZON_REQUIRES_DURABLE_T24_AFTER_COMMIT_WITNESS");
    const wrong={...witness!,t24OriginalFidsSha256:sha("wrong historical original")};
    await expect(persistP5V0079SingleBoundFlightPre(writer,{...p,reviewedT24WitnessReceipt:{...wrong,receiptSha256:digestP5Stage24ReviewedReceipt(wrong)}},options)).rejects.toThrow("PERSISTED_T24_WITNESS_ORIGINAL_T_CHANGED");
   }
   const laterApproval=witnessed?{}:{independentlyApprovedStandaloneProtocolSha256:standalone};
   const fragmentsBefore=p7?(await admin.query("SELECT count(*)::int n FROM phase7_private.pre_fragment_v39")).rows[0].n:0;
   if(p7){
    // Atomic transaction rollback: missing separate field proof leaves zero partial PRE or Packet B rows.
    await expect(persistP5V0079SingleBoundFlightPre(writer,entry.permit,{...options,...laterApproval,phase7PrePreservation:{...p7,separatelyVerifiedFields:[]}})).rejects.toThrow(/unpreserved-present-field/);
    expect((await admin.query("SELECT count(*)::int n FROM clean.flight_snapshots WHERE flight_instance_id=$1 AND horizon=$2",[flight,horizon])).rows[0].n).toBe(0);
    expect((await admin.query("SELECT count(*)::int n FROM phase7_private.pre_fragment_v39")).rows[0].n).toBe(fragmentsBefore);
   }
   const saved=await persistP5V0079SingleBoundFlightPre(writer,entry.permit,{...options,...laterApproval,...(p7?{phase7PrePreservation:p7}:{})});
   expect(saved).toMatchObject({horizon,identityEvidenceTier:"CONDITIONAL_QUERY_FILTERED_SERVICE",conditionalServiceCertifiedPhysicalLeg:false,authenticPersistedT24WitnessAnchoredForLaterHorizon:witnessed,missingT24ExplicitlyRecordedWithoutBackfill:!witnessed,postCommitDatabaseReadbackVerified:true,preSnapshotsInserted:1,providerCalls:0,...(p7?{phase7DerivedPreFragmentIndependentlyVerified:true}:{})});
   expect((await admin.query("SELECT clean.phase5_cd_ack_verified_v39($1::bigint,$2,$3::bigint,$4::bigint,$5) ok",[c.task_id,c.lease_owner,c.lease_generation,saved.committedSnapshotId,sha("CI conditional ACK "+horizon)])).rows[0].ok).toBe(true);
   const queued=(await admin.query("SELECT state,verified_snapshot_id::text AS snapshot,selected_native_t_utc,prediction_cutoff_utc FROM clean.phase5_cd_pre_task_v39 WHERE task_id=$1",[c.task_id])).rows[0];
   expect(queued).toEqual({state:"VERIFIED_ON_TIME",snapshot:saved.committedSnapshotId,selected_native_t_utc:t,prediction_cutoff_utc:new Date(ownCutoff)});
   const snapshots=(await admin.query("SELECT horizon,selected_t_milestone_utc,prediction_cutoff_utc,features_json FROM clean.flight_snapshots WHERE flight_instance_id=$1 AND horizon=$2",[flight,horizon])).rows;
   expect(snapshots).toEqual([{horizon,selected_t_milestone_utc:t,prediction_cutoff_utc:new Date(ownCutoff),features_json:[{name:"origin_icao",value:"WSSS"},{name:"destination_icao",value:"YSSY"},{name:"reported_pre_departure_status",value:"Boarding"}]}]);
   if(witnessed){
    // Independent persisted readback, not the permit or fixture object.
    // The synthetic original's own decoded-body integrity stays bound.
    const current=(await admin.query(
     "SELECT p.dep_scheduled_utc,r.raw_payload->'originalDecodedEntityBodyEvidence' AS body_evidence,b.decoded_original_body_sha256"+
     " FROM clean.flight_population p JOIN clean.fids_query_response r ON r.population_query_id=p.population_query_id"+
     " JOIN clean.phase5_fids_original_binding_v39 b ON b.population_query_id=r.population_query_id"+
     " WHERE p.analytic_identity_id=$1 AND p.population_query_id=$2",[flight,qid2])).rows;
    expect(current).toHaveLength(1);
    const observed=current[0],decoded=Buffer.from(observed.body_evidence.bodyBase64,"base64");
    expect(observed.body_evidence.bodyLengthBytes).toBe(decoded.length);
    expect(sha(decoded.toString("utf8"))).toBe(bodyHash);
    expect(observed.body_evidence.bodySha256).toBe(bodyHash);expect(observed.decoded_original_body_sha256).toBe(bodyHash);
    expect(JSON.parse(decoded.toString("utf8")).departures[0].departure.scheduledTime.utc).toBe(observed.dep_scheduled_utc.toISOString());
    expect(observed.dep_scheduled_utc.toISOString()).toBe(reportedT.toISOString());
    expect(observed.dep_scheduled_utc.getTime()-snapshots[0].selected_t_milestone_utc.getTime()).toBe(15*60_000);
    expect(observed.dep_scheduled_utc.getTime()).toBeLessThan(end.getTime());
    expect(queued.selected_native_t_utc.toISOString()).toBe(witness!.selectedTNativeUtc);
   }
   expect((await admin.query("SELECT count(*)::int n FROM clean.phase5_t24_postcommit_witness_v39 WHERE flight_instance_id=$1",[flight])).rows[0].n).toBe(Number(witnessed));
   if(process.env.V39_P5B_CONDITIONAL_POST_T6_CI==="1"&&horizon==="T-6h"){
    const source=new Pool({connectionString:"postgresql://phase5_p5_source_login_20261108:ci-only@localhost:5432/neondb?sslmode=disable",max:1});
    const scoped={connect:async()=>{const db=await source.connect();try{await db.query("SET ROLE phase5_fids_source_prod_20261107");return db;}catch(e){db.release(true);throw e;}}};
    const scope={manifestSha256:manifest,runDayIndex:1,airportIcao:"WSSS",reviewedFrameSha256:p.reviewedFrameSha256,
     queryDigestSha256:q2,rightsSha256:rights,protocolSha256:protocol,releaseSha256:h("5"),providerContractSha256:contract,
     slot:"MID_A",serviceWindowStartUtc:t.toISOString(),serviceWindowEndUtc:end.toISOString(),
     cohortStartUtc:iso(Math.floor(t.getTime()/60000)*60000),
     candidates:[{flightInstanceId:flight,expectedSelectedTNativeUtc:t.toISOString(),expectedPacketSha256:packetSha,boundSourceQueryDigests:[q2]}]};
    try{
     const actual=await auditP5ConditionalPostActualT6Batch(scoped,scope);
     expect(actual).toMatchObject({status:"ACTUAL_CONDITIONAL_T6_POST_CANDIDATE_BATCH_NO_GO",eligibleCount:1,independentT24WitnessVerified:false,packetBAnchorVerified:false,providerCalls:0,databaseWrites:0,phase6PaidGo:false});
     expect(actual.privateDecisions[0]).toMatchObject({snapshotId:saved.committedSnapshotId,originalPopulationQueryId:qid2,
      originalSourceResponseSha256:response,selectedScheduledDepartureUtc:t.toISOString(),reportedScheduledDepartureUtc:reportedT.toISOString(),
      predictionCutoffUtc:iso(ownCutoff),assessmentWatermarkUtc:iso(t.getTime()+7200000)});
     expect(JSON.stringify(actual)).not.toContain(flight);
     for(const altered of [{...scope,protocolSha256:sha("wrong conditional marker")},{...scope,rightsSha256:sha("wrong rights")},
      {...scope,slot:"HUB"},{...scope,queryDigestSha256:sha("wrong query"),candidates:[{...scope.candidates[0],boundSourceQueryDigests:[sha("wrong query")]}]}])
       expect((await auditP5ConditionalPostActualT6Batch(scoped,altered)).eligibleCount).toBe(0);
     await expect(auditP5ConditionalPostActualT6Batch(admin,scope)).rejects.toThrow("CONDITIONAL_POST_T6_RESTRICTED_SOURCE_SESSION");
     console.log("I147_T143_REAL_RESTRICTED_CONDITIONAL_POST_T6_READER_PASS");
     if(p7&&p7Scoped){
      const input={reader:p7Scoped,readerRole:P7SCOPED,contract:p7.contract,profile:p7.profile,
       scope:{independentConditionalPostPreservationReadApproved:true as const,existingPaidDispatchApproved:false as const,
        noProviderCredentialsInAudit:true as const,manifestSha256:manifest,rightsSha256:rights,
        expectedContractSha256:hashPhase7DurableCandidate(p7.contract),expectedProfileSha256:hashPhase7DurableCandidate(p7.profile)}};
      const verified=await readP6ConditionalPostT6PreservationBatch(scoped,scope,input);
      expect(verified).toMatchObject({status:"ACTUAL_CONDITIONAL_POST_T6_AND_PACKET_B_GROUP_READ_NO_GO",candidateCount:1,
       verifiedPacketBGroupCount:1,unavailableCount:0,independentT24WitnessVerified:false,postIssuerCommissioned:false,
       physicalGateOutCertified:false,providerCalls:0,databaseWrites:0,postPacketsIssued:0,phase6PaidGo:false});
      expect(verified.privateDecisions[0].anchor).toMatchObject({snapshotId:saved.committedSnapshotId,flightInstanceId:flight,
       selectedNativeTUtc:t.toISOString(),sourceResponseSha256:response});
      expect(verified.privateDecisions[0].fragments.some(f=>f.packet.rows[0].horizon==="T-6h")).toBe(true);
      expect(JSON.stringify(verified)).not.toContain(flight);expect(JSON.stringify(verified)).not.toContain(response);
      await expect(readP6ConditionalPostT6PreservationBatch(scoped,scope,{...input,scope:{...input.scope,expectedProfileSha256:sha("wrong profile")}})).rejects.toThrow("EXACT_SEPARATE_READ_SCOPE");
      await expect(readP6ConditionalPostT6PreservationBatch(scoped,scope,{...input,reader:admin})).rejects.toThrow("READER_SCOPE_OR_CLOCK");
      // Original source still present, but the actual temporary mapping is
      // expired. Never plan a POST from a standalone T6 row without Packet B.
      const anchor=verified.privateDecisions[0].anchor;
      await expect(readPhase7PostScopedGroup(p7Scoped,P7SCOPED,p7.contract,p7.profile,anchor)).rejects.toMatchObject({code:"P0002"});
      await expect(readPhase7ConditionalT6ScopedGroup(p7Scoped,P7SCOPED,p7.contract,p7.profile,anchor,sha("wrong protocol"))).rejects.toMatchObject({code:"P0002"});
      // F048/T146: exercise the real restricted session and simulate a lost
      // ROLLBACK acknowledgement at its adapter boundary. No positive receipt
      // and no reuse of the uncertain connection, on success or refusal.
      for(const protocolToRead of [protocol,sha("wrong protocol")]){
       let rollbackCount=0;const releases:(boolean|Error|undefined)[]=[];
       const lostRollback={connect:async()=>{
        const client=await p7Scoped!.connect();
        return new Proxy(client,{get(target,key){
         if(key==="query")return (sql:string,...args:unknown[])=>{
          if(sql==="ROLLBACK"){rollbackCount++;return Promise.reject(Error("CI_ROLLBACK_ACK_LOST"));}
          return Reflect.apply(target.query,target,[sql,...args]);
         };
         if(key==="release")return (err?:boolean|Error)=>{releases.push(err);target.release(err);};
         const val=Reflect.get(target,key);return typeof val==="function"?val.bind(target):val;
        }});
       }};
       const attempt=readPhase7ConditionalT6ScopedGroup(lostRollback,P7SCOPED,p7.contract,p7.profile,anchor,protocolToRead);
       if(protocolToRead===protocol)await expect(attempt).rejects.toThrow("ROLLBACK_UNACKNOWLEDGED");
       else await expect(attempt).rejects.toMatchObject({code:"P0002"});
       expect(rollbackCount).toBe(1);expect(releases).toEqual([true]);
      }
      // A fresh independent session remains usable after discarded sessions.
      await expect(readPhase7ConditionalT6ScopedGroup(p7Scoped,P7SCOPED,p7.contract,p7.profile,anchor,protocol)).resolves.toMatchObject({fragments:expect.any(Array)});
      // Leave the fixture link expired for the existing due-only sweep below.
      // Never extend or resurrect a link, even in this regression.
      await admin.query("UPDATE phase7_private.pre_source_link_v39 SET expires_at_utc=clock_timestamp()-interval '1 second' WHERE snapshot_id=$1",[saved.committedSnapshotId]);
      await expect(readP6ConditionalPostT6PreservationBatch(scoped,scope,input)).rejects.toThrow();
      console.log("I149_T146_REAL_RESTRICTED_CONDITIONAL_T6_PACKET_B_GROUP_PASS");
     }
    }finally{await source.end();}
   }
   if(p7){
    // Durable Packet B fragment survives authorized temporary link sweep and real tombstone-gated raw FIDS expiry.
    const linked=(await admin.query("SELECT f.row_id,f.packet_bytes FROM phase7_private.pre_source_link_v39 l JOIN phase7_private.pre_fragment_v39 f ON f.row_id=l.row_id WHERE l.snapshot_id=$1",[saved.committedSnapshotId])).rows;
    expect(linked).toHaveLength(1);
    expect(linked[0].packet_bytes.toString("utf8")).not.toMatch(/WSSS|YSSY|leg:g5a:|CI300|Boarding/);
    await admin.query("UPDATE phase7_private.pre_source_link_v39 SET expires_at_utc=clock_timestamp()-interval '1 second' WHERE snapshot_id=$1",[saved.committedSnapshotId]);
    expect((await admin.query("SELECT phase7_private.sweep_due_pre_links_v39(10) n")).rows[0].n).toBe(1);
    await admin.query("INSERT INTO clean.retention_tombstone(surface,record_id,content_hash,expired_at,plan_hash) VALUES('primary','fids_query_response:'||$1::text||':raw_payload',$2,clock_timestamp(),$3)",[qid2,bodyHash,manifest]);
    await admin.query("UPDATE clean.fids_query_response SET raw_payload=NULL,raw_expired_at_utc=clock_timestamp() WHERE population_query_id=$1",[qid2]);
    expect((await admin.query("SELECT count(*)::int n FROM clean.fids_query_response WHERE population_query_id=$1 AND raw_payload IS NULL AND raw_expired_at_utc IS NOT NULL",[qid2])).rows[0].n).toBe(1);
    expect((await p7Reader!.query("SELECT count(*)::int n FROM phase7_private.pre_fragment_v39 WHERE row_id=$1",[linked[0].row_id])).rows[0].n).toBe(1);
   }
   // P0-D real PG16 worker interruption / lease expiry recovery: unstarted CLAIMED -> READY, WRITE_STARTED_UNKNOWN -> QUARANTINED.
   const crashFlight="leg:g5a:"+sha("CI crash recovery "+caseKey),crashPacket=sha("CI crash packet "+caseKey);
   await admin.query(
    "INSERT INTO clean.phase5_cd_pre_task_v39(manifest_sha256,flight_instance_id,horizon,selected_native_t_utc,prediction_cutoff_utc,packet_sha256,source_population_query_id,source_response_sha256,reviewed_source_rights_sha256,source_expires_at_utc,state)"+
    " VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,clock_timestamp()+interval '1 hour','READY')",
    [manifest,crashFlight,horizon,t,new Date(ownCutoff),crashPacket,qid2,response,rights]);
   const c1=(await admin.query("SELECT * FROM clean.phase5_cd_claim_due_v39('ci-crash-w1',1,90)")).rows;
   expect(c1).toHaveLength(1);expect(c1[0].flight_instance_id).toBe(crashFlight);
   await admin.query("UPDATE clean.phase5_cd_pre_task_v39 SET lease_until_utc=clock_timestamp()-interval '1 second' WHERE task_id=$1",[c1[0].task_id]);
   const r1=(await admin.query("SELECT * FROM clean.phase5_cd_reap_once_v39(16)")).rows;
   expect(r1.find((x:any)=>String(x.task_id)===String(c1[0].task_id))?.new_state).toBe("READY");
   const c2=(await admin.query("SELECT * FROM clean.phase5_cd_claim_due_v39('ci-crash-w2',1,90)")).rows;
   expect(c2).toHaveLength(1);expect(Number(c2[0].lease_generation)).toBeGreaterThan(Number(c1[0].lease_generation));
   expect((await admin.query("SELECT clean.phase5_cd_mark_write_started_v39($1::bigint,$2,$3::bigint) ok",[c2[0].task_id,c2[0].lease_owner,c2[0].lease_generation])).rows[0].ok).toBe(true);
   await admin.query("UPDATE clean.phase5_cd_pre_task_v39 SET lease_until_utc=clock_timestamp()-interval '1 second' WHERE task_id=$1",[c2[0].task_id]);
   const r2=(await admin.query("SELECT * FROM clean.phase5_cd_reap_once_v39(16)")).rows;
   expect(r2.find((x:any)=>String(x.task_id)===String(c2[0].task_id))?.new_state).toBe("QUARANTINED");
  }finally{delete process.env.V39_P5_E_SUPPLEMENT_CI;}
  console.log("T070_CONDITIONAL_REGISTRY_V0100_V0087_STAGE14_P7_CRASH_RECOVERY_REAL_PG16_ACK_"+caseKey+"_CI_ONLY_NO_PROVIDER");
 });

});
