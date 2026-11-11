/**
 * Phase5 Stage14: write ONE prospective source-bound flight PRE snapshot.
 *
 * STAGED / NO LIVE ENTRYPOINT / NO GITHUB OWNER / NO PROVIDER REQUESTS.
 * Unlike the historical generic materializer this REQUIRES a DB-clock
 * commit before that specific flight's cutoff (no retrospective backfill).
 *
 * A permit hash or boolean does NOT authenticate legal retention, native T,
 * a real physical operating leg or independent Phase5 scientific FREEZE.
 * The separately commissioned reviewer must verify those outside this code.
 */
import type {Pool,PoolClient} from "pg";
import {
 buildPreSnapshot,persistPreSnapshot,PRE_HORIZON_OFFSET_MIN,
 type SelectedTMilestoneConfig,type PreHorizon
} from "./preSnapshotBuilder_v3";
import {verifyP5Stage24WitnessedFrozenT,
 type P5Stage24ReviewedT24Receipt} from "./phase5T24WitnessedLaterHorizonGuard_v39";
import {selectP5EStage14BoundRouteFeatures}
 from "./phase5AmendmentEStage14BoundRouteFeatures_v39";
import {decideP5LaterPreEvidencePath,
 type P5StandaloneLaterNoT24Review} from "./phase5StandaloneLaterPreWithoutT24Decision_v39";
const SHA=/^[0-9a-f]{64}$/;
const ID=/^[a-zA-Z0-9_.:|-]{5,200}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ROLE=/^phase5_fids_pre_writer_[a-z0-9_]{6,40}$/;
const GITHUB=/^[0-9]{5,25}$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const SLOTS=["HUB","MID_A","MID_B","REGIONAL"];
const HORIZONS=["T-24h","T-6h","T-90m"];
const MAX_EARLY_MS=180_000;
const COMMIT_MARGIN_MS=2000;
const CONDITIONAL_G5A_ID=/^leg:g5a:[a-f0-9]{64}$/;
/** Only emitted for PostgreSQL SQLSTATE 40001 BEFORE COMMIT, after an
 * ACKNOWLEDGED ROLLBACK. Never emitted for ambiguous COMMIT or readback.
 * Not permission by itself to retry without read-only identity check.
 */
export class P5Stage14ConfirmedPrecommitSerializationAbort extends Error{
 readonly code="P5_STAGE14_PRECOMMIT_40001_ABORT_CONFIRMED";
 constructor(){super("P5_STAGE14_PRECOMMIT_40001_ROLLBACK_ACKNOWLEDGED");}
}
/** PostgreSQL itself definitively returned 40001 from COMMIT (transaction
 * aborted, not a lost ACK), and a separate ROLLBACK was acknowledged.
 * Still requires read-only canonical flight reconciliation before retry.
 */
export class P5Stage14ConfirmedCommitSerializationAbort extends Error{
 readonly code="P5_STAGE14_COMMIT_40001_ABORT_CONFIRMED";
 constructor(){super("P5_STAGE14_COMMIT_40001_ROLLBACK_ACKNOWLEDGED");}
}

export type P5Stage14IdentityTier=
 "PROVIDER_NATIVE_OPERATING_LEG"|"CONDITIONAL_QUERY_FILTERED_SERVICE";
const hold=(s:string):never=>{throw Error("REFUSED_P5_STAGE14_PRE_"+s);};
const instant=(s:unknown,label:string):Date=>{
 if(typeof s!=="string")
  throw Error("REFUSED_P5_STAGE14_PRE_"+label);
 if(!ISO.test(s)||!Number.isFinite(Date.parse(s))||
   new Date(s).toISOString()!==s)
  throw Error("REFUSED_P5_STAGE14_PRE_"+label);
 return new Date(s);
};
const dbTime=(v:unknown,label:string):Date=>{
 const d=v instanceof Date?v:typeof v==="string"?new Date(v):null;
 if(!d||!Number.isFinite(d.getTime()))
  throw Error("REFUSED_P5_STAGE14_PRE_"+label);
 return d;
};
export interface P5Stage14SingleFlightPrePermit{
 manifestSha256:string;queryDigestSha256:string;
 expectedSourcePopulationQueryId:string;
 expectedSourceResponseSha256:string;
 runDayIndex:number;slot:string;horizon:PreHorizon;airportIcao:string;
 flightInstanceId:string;expectedGithubSourceRunId:string;
 expectedReviewedReleaseSha256:string;
 expectedReviewedSourceRightsSha256:string;
 expectedProviderContractSha256:string;
 expectedEarlyDrawSha256:string;
 reviewedFrameSha256:string;reviewedConfigSha256:string;
 independentlyReviewedOperatingLegEvidenceSha256:string;
 independentlyReviewedNativeTEvidenceSha256:string;
 independentlyReviewedRunAndRetentionEvidenceSha256:string;
 frozenBuilderSha256:string;builderFrozenAtUtc:string;
 selectedTConfig:SelectedTMilestoneConfig;
 selectedTNativeUtc:string;
 maxPopulationStalenessSeconds:number;
 expectedRestrictedPreWriterRole:string;
 /** Normal T6/T90 path: real Stage17 readback and V0081 witness. */
 reviewedT24WitnessReceipt?:P5Stage24ReviewedT24Receipt;
 /** Opt-in independently reviewed later-only as-of protocol when T24 was
  * missed. Requires separate approved protocol SHA passed to the writer. */
 reviewedStandaloneLaterNoT24?:P5StandaloneLaterNoT24Review;
 /** Caller review attestations are metadata, NOT self-authenticating proof. */
 externalNativeTPhysicalLegAndSourceUseReviewed?:true;
 /** An explicitly adopted protocol may use Phase4's conditional-service tier
  * without reclassifying it as a provider-certified operating aircraft leg. */
 identityEvidenceTier?:P5Stage14IdentityTier;
 reviewedProtocolAmendmentSha256?:string;
 reviewedStableServiceKeySha256?:string;
 expectedOperatorFlightNumber?:string;
 expectedDestinationIcao?:string;
 externalConditionalScheduleSourceAndUseReviewed?:true;
}
/** Experimental isolated PostgreSQL16 C+D claim evidence. NOT a production
 * queue permit. The real source-rights/role/lease security review is separate.
 */
export interface P5CdDisposableQueueFence{
 taskId:string;owner:string;generation:number|string;packetSha256:string;
}
function assertP5CdDisposableFenceArguments(f:P5CdDisposableQueueFence|undefined){
 const required=process.env.V39_P5_CD_STAGE14_FENCE_DISPOSABLE==="1";
 const receipt=process.env.V39_P5_CD_STAGE14_RECEIPT_DISPOSABLE==="1";
 if(receipt&&!required)
  hold("CD_RECEIPT_NEVER_WITHOUT_LOCAL_FENCE");
 if(!required&&f!==undefined)
  hold("CD_FENCE_NOT_AN_APPROVED_PRODUCTION_ENTRYPOINT");
 if(!required)return;
 if(process.env.GITHUB_ACTIONS!=="true"||
    process.env.ADB_AUTO_COLLECT!=="0"||
    process.env.V39_PHASE6_PROCESS_ARMED!=="0"||
    process.env.AERODATABOX_API_KEY||
    process.env.AERODATABOX_WEBHOOK_SECRET||
    process.env.DATABASE_URL!==
      "postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable")
  hold("CD_FENCE_REQUIRES_LOCAL_CI_ONLY_NO_PAID_PROVIDER");
 if(!f||!/^[1-9][0-9]{0,17}$/.test(f.taskId??"")||
    typeof f.owner!=="string"||
    !/^[a-zA-Z0-9_.:-]{5,96}$/.test(f.owner)||
    !(typeof f.generation==="string"?
      /^[1-9][0-9]{0,18}$/.test(f.generation):
      Number.isSafeInteger(f.generation)&&f.generation>=1)||
    !SHA.test(f.packetSha256??""))
  hold("CD_FENCE_CLAIM_ARGUMENTS_MISSING_OR_UNREVIEWED");
}
async function assertP5CdSameTxGuard(
 c:PoolClient,p:P5Stage14SingleFlightPrePermit,
 f:P5CdDisposableQueueFence,cutoff:Date){
 // V0085 experimental DB trigger requires a transaction receipt. V0084
 // remains a distinct, earlier CI test with only the row-lock function.
 // These are STATIC, reviewed function names, never caller-controlled SQL.
 const receiptRequired=
  process.env.V39_P5_CD_STAGE14_RECEIPT_DISPOSABLE==="1";
 const fixedFunction=receiptRequired
  ?"p5_cd_stage14_ci.begin_admitted_write"
  :"p5_cd_stage14_ci.assert_write_fence";
 const proof=await c.query(
  "SELECT "+fixedFunction+"("+
  "$1::bigint,$2,$3,$4::timestamptz,$5::timestamptz,"+
  "$6,$7,$8::bigint) AS ok",
  [f.taskId,p.flightInstanceId,p.horizon,p.selectedTNativeUtc,
   cutoff.toISOString(),f.packetSha256,f.owner,f.generation]);
 if(proof.rowCount!==1||proof.rows[0]?.ok!==true)
  hold("CD_SAME_TRANSACTION_QUEUE_LOCK_PROOF_MISSING");
}

/** V0088: the REAL V0087 task table, DISPOSABLE PG16 integration only.
 * A separate audited owner/role release is required for actual live use.
 */
export type P5CdV0088RealQueueCiFence=P5CdDisposableQueueFence;
/** Narrow, synthetic CI-only entrypoint. No change to the real
 * Stage14 default feature array until source rights and field set are frozen.
 */
function assertP5ENativeRouteCi(flag:true|undefined){
 const enabled=process.env.V39_P5_E_NATIVE_ROUTE_STAGE14_CI==="1";
 if(!enabled&&flag!==undefined)
  hold("E_ROUTE_SOURCE_FEATURE_BRIDGE_UNAPPROVED");
 if(!enabled)return;
 if(flag!==true||process.env.GITHUB_ACTIONS!=="true"||
    process.env.DATABASE_URL!==
     "postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable"||
    process.env.V39_PHASE6_PROCESS_ARMED!=="0"||
    process.env.ADB_AUTO_COLLECT!=="0"||
    process.env.AERODATABOX_API_KEY||
    process.env.AERODATABOX_WEBHOOK_SECRET||
    process.env.P5_V39_PRE_DATABASE_URL)
  hold("E_ROUTE_REQUIRES_EXPLICIT_LOCAL_NONPAID_SOURCE_BOUND_CI");
}
function assertP5CdV0088CiFence(f:P5CdV0088RealQueueCiFence|undefined){
 const enabled=process.env.V39_P5_CD_V0088_STAGE14_CI==="1";
 if(!enabled&&f!==undefined)
  hold("V0088_REAL_QUEUE_FENCE_NOT_APPROVED_OUTSIDE_DISPOSABLE_CI");
 if(!enabled)return;
 if(process.env.GITHUB_ACTIONS!=="true"||
   process.env.DATABASE_URL!==
    "postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable"||
   process.env.V39_PHASE6_PROCESS_ARMED!=="0"||
   process.env.ADB_AUTO_COLLECT!=="0"||
   process.env.AERODATABOX_API_KEY||
   process.env.AERODATABOX_WEBHOOK_SECRET||
   process.env.V39_P5_CD_STAGE14_FENCE_DISPOSABLE==="1"||
   process.env.P5_V39_PRE_DATABASE_URL||
   process.env.P5_V39_OTHER_REST_RESERVE_DATABASE_URL)
  hold("V0088_REAL_QUEUE_REQUIRES_NO_PROVIDER_LOCAL_CI_ONLY");
 if(!f||!/^[1-9][0-9]{0,17}$/.test(f.taskId??"")||
    typeof f.owner!=="string"||
    !/^[a-zA-Z0-9_.:-]{5,96}$/.test(f.owner)||
    !(typeof f.generation==="string"?
      /^[1-9][0-9]{0,18}$/.test(f.generation):
      Number.isSafeInteger(f.generation)&&f.generation>=1)||
    !SHA.test(f.packetSha256??""))
  hold("V0088_REAL_QUEUE_CLAIM_FIELDS_INVALID");
}
async function assertP5CdV0088RealSameTx(
 c:PoolClient,p:P5Stage14SingleFlightPrePermit,
 f:P5CdV0088RealQueueCiFence,cutoff:Date){
 const result=await c.query(
  "SELECT clean.phase5_cd_admit_stage14_pre_v39("+
  "$1::bigint,$2,$3::bigint,$4,$5,$6,$7,"+
  "$8::timestamptz,$9::timestamptz,$10,$11,$12) AS ok",
  [f.taskId,f.owner,f.generation,f.packetSha256,
   p.manifestSha256,p.flightInstanceId,p.horizon,
   p.selectedTNativeUtc,cutoff.toISOString(),
   p.expectedSourcePopulationQueryId,p.expectedSourceResponseSha256,
   p.expectedReviewedSourceRightsSha256]);
 if(result.rowCount!==1||result.rows[0]?.ok!==true)
  hold("V0088_REAL_QUEUE_SAME_TX_PROOF_NOT_VERIFIED");
}

export interface P5Stage14SingleFlightPreResult{
 schema:"v39.phase5.stage14.single-bound-flight-pre-writer.v1";
 status:"ONE_SOURCE_BOUND_PROSPECTIVE_PRE_SAVED_NOT_SCIENTIFIC_FREEZE";
 identityEvidenceTier:P5Stage14IdentityTier;
 conditionalServiceCertifiedPhysicalLeg:false;
 runDayIndex:number;slot:string;horizon:PreHorizon;
 cutoffUtc:string;boundPopulationQueryId:string;
 /** Exact durable ID read BACK after acknowledged PG COMMIT; Stage17 must
  * use this rather than a guessed or separately copied snapshot identity. */
 committedSnapshotId:string;
 sourceOriginalCommittedBeforeFlightCutoff:true;
 flightPreCommittedBeforeOwnCutoff:true;
 postCommitDatabaseReadbackVerified:true;
 postCommitDbClockAtUtc:string;
 preSnapshotsInserted:1;providerCalls:0;alertCreates:0;
 authenticPersistedT24WitnessAnchoredForLaterHorizon:boolean;
 laterPreEvidenceTier:"NATIVE_T24"|"WITNESSED_T24_LATER"|"STANDALONE_ASOF_LATER_MISSING_T24";
 missingT24ExplicitlyRecordedWithoutBackfill:boolean;
 externalNativeTIndependentlyAuthenticatedByThisFunction:false;
 externalPhysicalOperatingLegIndependentlyAuthenticatedByThisFunction:false;
 providerRightsIndependentlyCertifiedByThisFunction:false;
 actualOnlyWheelsOffAndOutcomeCertified:false;
 phase5FreezePassed:false;phase6PaidGo:false;
}
export const P5_STAGE14_BOUND_SOURCE_SQL=[
 "SELECT q.manifest_sha256,q.run_day_index,q.slot_id,q.horizon,",
 "q.airport_icao,q.github_run_id,q.state,q.early_draw_sha256,",
 "q.reviewed_release_sha256,q.rights_review_sha256,q.provider_contract_sha256,",
 "q.service_window_start_utc,q.service_window_end_utc,",
 "a.github_run_id AS attempt_run_id,a.committed_at_utc AS reserved_at,",
 "b.population_query_id,b.response_hash AS original_response_hash,",
 "b.rights_review_sha256 AS bound_rights,b.source_expires_at_utc,",
 "b.normalized_members_count,b.bound_at_utc,",
 "r.available_at AS source_available,r.fids_retrieval_utc,",
 "r.raw_persisted_at_utc,r.response_hash AS fids_response_hash,",
 "r.source_airport_icao AS fids_airport_icao,",
 "(r.raw_payload IS NOT NULL AND r.raw_expired_at_utc IS NULL)",
 " AS original_current",
 "FROM clean.phase5_fids_allowed_query_v39 q",
 "JOIN clean.phase5_fids_physical_attempt_v39 a",
 " ON a.query_digest=q.query_digest AND a.manifest_sha256=q.manifest_sha256",
 "JOIN clean.phase5_fids_original_binding_v39 b",
 " ON b.query_digest=q.query_digest AND b.reservation_sha256=a.reservation_sha256",
 " AND b.manifest_sha256=q.manifest_sha256",
 "JOIN clean.fids_query_response r",
 " ON r.population_query_id=b.population_query_id",
 "WHERE q.manifest_sha256=$1 AND q.query_digest=$2"
].join(" ");
export const P5_STAGE14_PHYSICAL_MEMBER_SQL=[
 "SELECT p.population_query_id,p.analytic_identity_id,",
 "p.canonical_flight_instance_id,p.source_airport_icao,",
 "p.dep_airport_icao,p.population_role,p.scope_classification,",
 "p.codeshare_resolution_status,p.source_type,p.response_hash,",
 "p.provider_content_expired_at_utc,p.available_at,",
 "p.dep_scheduled_utc,p.population_member_id,",
 "p.flight_number,p.arr_airport_icao,p.query_direction",
 "FROM clean.flight_population p",
 "WHERE p.population_query_id=$1::uuid AND p.analytic_identity_id=$2",
 "ORDER BY p.available_at,p.id"
].join(" ");
export const P5_STAGE14_PREVIOUS_T24_SQL=[
 "SELECT selected_t_milestone_utc,selected_t_version,",
 "prediction_cutoff_utc,created_at,fids_response_hash",
 "FROM clean.flight_snapshots WHERE flight_instance_id=$1",
 "AND horizon='T-24h' AND prediction_state='PRE_DEPARTURE'",
 "AND frame_hash=$2 AND config_hash=$3",
 "ORDER BY created_at ASC"
].join(" ");
export const P5_STAGE24_REVIEWED_WITNESSED_T24_SQL=[
 "SELECT w.snapshot_id::text AS snapshot_id,",
 "s.id::text AS joined_snapshot_id,w.flight_instance_id,",
 "w.selected_t_version,w.fids_response_hash,w.source_query_digest,",
 "w.frame_hash,w.config_hash,w.selected_t_native_utc,",
 "w.t24_cutoff_utc,w.post_pre_commit_db_observed_at_utc,",
 "s.population_query_id AS source_t24_population_query_id,",
 "s.prediction_state AS snapshot_prediction_state,",
 "s.horizon AS snapshot_horizon",
 " FROM clean.phase5_t24_postcommit_witness_v39 w",
 " JOIN clean.flight_snapshots s ON s.id=w.snapshot_id",
 " WHERE w.flight_instance_id=$1 LIMIT 2"
].join(" ");
function assertPermit(p:P5Stage14SingleFlightPrePermit,
 independentlyApprovedStandaloneProtocolSha256?:string):Date{
 if(!p||![p.manifestSha256,p.queryDigestSha256,
  p.expectedSourceResponseSha256,p.expectedReviewedReleaseSha256,
  p.expectedReviewedSourceRightsSha256,p.expectedProviderContractSha256,
  p.expectedEarlyDrawSha256,p.reviewedFrameSha256,p.reviewedConfigSha256,
  p.independentlyReviewedOperatingLegEvidenceSha256,
  p.independentlyReviewedNativeTEvidenceSha256,
  p.independentlyReviewedRunAndRetentionEvidenceSha256,
  p.frozenBuilderSha256].every(v=>typeof v==="string"&&SHA.test(v))||
  !UUID.test(p.expectedSourcePopulationQueryId??"")||
  !GITHUB.test(p.expectedGithubSourceRunId??"")||
  !ROLE.test(p.expectedRestrictedPreWriterRole??"")||
  !ID.test(p.flightInstanceId??"")||
  !SLOTS.includes(p.slot)||!HORIZONS.includes(p.horizon)||
  !/^[A-Z]{4}$/.test(p.airportIcao??"")||
  !Number.isInteger(p.runDayIndex)||p.runDayIndex<1||p.runDayIndex>31||
  !Number.isSafeInteger(p.maxPopulationStalenessSeconds)||
  p.maxPopulationStalenessSeconds<1||
  p.maxPopulationStalenessSeconds>86_400)
  hold("INDEPENDENT_PERMIT_IDENTITY_SCOPE_OR_SOURCE_RIGHTS_MISSING");
 const tier=p.identityEvidenceTier??"PROVIDER_NATIVE_OPERATING_LEG";
 if(tier==="PROVIDER_NATIVE_OPERATING_LEG"){
  if(p.externalNativeTPhysicalLegAndSourceUseReviewed!==true||
     p.externalConditionalScheduleSourceAndUseReviewed===true||
     p.reviewedProtocolAmendmentSha256!==undefined||
     p.reviewedStableServiceKeySha256!==undefined||
     p.expectedOperatorFlightNumber!==undefined||
     p.expectedDestinationIcao!==undefined)
   hold("INDEPENDENT_PERMIT_IDENTITY_SCOPE_OR_SOURCE_RIGHTS_MISSING");
 }else if(tier==="CONDITIONAL_QUERY_FILTERED_SERVICE"){
  if(p.externalNativeTPhysicalLegAndSourceUseReviewed===true||
     p.externalConditionalScheduleSourceAndUseReviewed!==true||
     !SHA.test(p.reviewedProtocolAmendmentSha256??"")||
     !SHA.test(p.reviewedStableServiceKeySha256??"")||
     p.flightInstanceId!=="leg:g5a:"+p.reviewedStableServiceKeySha256||
     typeof p.expectedOperatorFlightNumber!=="string"||
     !/^[A-Za-z0-9 -]{3,24}$/.test(p.expectedOperatorFlightNumber)||
     !/^[A-Z]{4}$/.test(p.expectedDestinationIcao??"")||
     p.expectedDestinationIcao===p.airportIcao)
   hold("CONDITIONAL_PROTOCOL_OR_STABLE_SERVICE_KEY_UNAPPROVED");
 }else hold("UNKNOWN_IDENTITY_TIER_NOT_AUTHORIZED");
 // Preserve the original default refusal for all legacy callers.
 if(p.horizon!=="T-24h"&&!p.reviewedT24WitnessReceipt&&
    !p.reviewedStandaloneLaterNoT24)
  hold("LATER_HORIZON_REQUIRES_DURABLE_T24_AFTER_COMMIT_WITNESS");
 // A separately reviewed standalone later-only path is opt-in, never auto.
 decideP5LaterPreEvidencePath(p,independentlyApprovedStandaloneProtocolSha256);
 const frozen=instant(p.builderFrozenAtUtc,"FROZEN_BUILDER_UTC_INVALID");
 const native=instant(p.selectedTNativeUtc,"NATIVE_T_UTC_INVALID");
 if(!p.selectedTConfig||
   p.selectedTConfig.verifiedProviderNativeSchedule!==true||
   p.selectedTConfig.milestone!=="departure.scheduledTime.utc"||
   p.selectedTConfig.semanticsEvidenceSha256!==
      p.independentlyReviewedNativeTEvidenceSha256||
   !SHA.test(p.selectedTConfig.artifactHash??"")||
   !p.selectedTConfig.version?.trim()||
   frozen.getTime()>native.getTime()-PRE_HORIZON_OFFSET_MIN[p.horizon]*60_000)
    hold("NATIVE_T_SOURCE_SEMANTICS_OR_FROZEN_TRANSFORM_UNVERIFIED");
 return native;
}
function exactSource(v:Record<string,unknown>,p:P5Stage14SingleFlightPrePermit,
 cutoff:Date,dbNow:Date,native:Date){
 const eq:Record<string,string|number>={
  manifest_sha256:p.manifestSha256,run_day_index:p.runDayIndex,
  slot_id:p.slot,horizon:p.horizon,airport_icao:p.airportIcao,
  github_run_id:p.expectedGithubSourceRunId,state:"ACTIVE",
  early_draw_sha256:p.expectedEarlyDrawSha256,
  reviewed_release_sha256:p.expectedReviewedReleaseSha256,
  rights_review_sha256:p.expectedReviewedSourceRightsSha256,
  provider_contract_sha256:p.expectedProviderContractSha256,
  attempt_run_id:p.expectedGithubSourceRunId,
  population_query_id:p.expectedSourcePopulationQueryId,
  original_response_hash:p.expectedSourceResponseSha256,
  fids_response_hash:p.expectedSourceResponseSha256,
  fids_airport_icao:p.airportIcao,bound_rights:p.expectedReviewedSourceRightsSha256
 };
 if(Object.entries(eq).some(([k,x])=>v[k]!==x)||
   v.original_current!==true||Number(v.normalized_members_count)<1)
   hold("MISSING_OR_CHANGED_AUTHENTIC_BOUND_ORIGINAL");
 const start=dbTime(v.service_window_start_utc,"FRAME_START").getTime(),
  end=dbTime(v.service_window_end_utc,"FRAME_END").getTime();
 if(native.getTime()<start||native.getTime()>=end)
   hold("NATIVE_T_OUTSIDE_SIGNED_SOURCE_WINDOW");
 const reserved=dbTime(v.reserved_at,"RESERVED_AT").getTime(),
  retrieved=dbTime(v.fids_retrieval_utc,"SOURCE_RETRIEVED_AT").getTime(),
  persisted=dbTime(v.raw_persisted_at_utc,"SOURCE_PERSISTED_AT").getTime(),
  available=dbTime(v.source_available,"SOURCE_AVAILABLE_AT").getTime(),
  bound=dbTime(v.bound_at_utc,"SOURCE_BOUND_AT").getTime(),
  expires=dbTime(v.source_expires_at_utc,"SOURCE_EXPIRES_AT").getTime(),
  now=dbNow.getTime();
 if(reserved>retrieved||retrieved>persisted||persisted>available||
   available>bound||bound>now||available>cutoff.getTime()||
   expires<=now||expires<=cutoff.getTime()||
   expires>available+23*3600_000||
   cutoff.getTime()-available>p.maxPopulationStalenessSeconds*1000)
   hold("SOURCE_CLOCK_STALE_RIGHTS_OR_CUTOFF_INVALID");
 return {available,expires};
}
function strictMember(rows:Record<string,unknown>[],
 p:P5Stage14SingleFlightPrePermit,cutoff:Date,sourceAvailable:number){
 if(rows.length!==1)hold("AMBIGUOUS_OR_ABSENT_PHYSICAL_LEG_MEMBER");
 const m=rows[0];
 if(m.population_query_id!==p.expectedSourcePopulationQueryId||
    m.analytic_identity_id!==p.flightInstanceId||
    m.canonical_flight_instance_id!==p.flightInstanceId||
    m.source_airport_icao!==p.airportIcao||
    m.dep_airport_icao!==p.airportIcao||
    m.population_role!=="requested_airport_primary"||
    m.source_type!=="fids"||
    m.response_hash!==p.expectedSourceResponseSha256||
    m.provider_content_expired_at_utc!==null||
    !m.population_member_id)
   hold("PHYSICAL_OPERATING_LEG_SOURCE_PROVENANCE_NOT_QUALIFIED");
 if(p.identityEvidenceTier==="CONDITIONAL_QUERY_FILTERED_SERVICE"){
  // Reuse EXACT Phase4 G5A conditional status, never relabel physical.
  if(m.scope_classification!=="unknown"||
     m.codeshare_resolution_status!=="g5a_conditional_operator_composite_no_native_id"||
     !CONDITIONAL_G5A_ID.test(String(m.canonical_flight_instance_id??""))||
     m.flight_number!==p.expectedOperatorFlightNumber||
     m.arr_airport_icao!==p.expectedDestinationIcao||
     m.query_direction!=="Departure")
   hold("CONDITIONAL_SOURCE_SERVICE_SCOPE_NOT_QUALIFIED");
 }else if(m.scope_classification!=="confirmed_core"||
          m.codeshare_resolution_status!=="confirmed_operating_leg")
   hold("PHYSICAL_OPERATING_LEG_SOURCE_PROVENANCE_NOT_QUALIFIED");
 const member=dbTime(m.available_at,"MEMBER_AVAILABLE_AT").getTime();
 if(member<sourceAvailable||member>cutoff.getTime())
   hold("MEMBER_NOT_KNOWN_AT_OWN_CUTOFF");
 return member;
}
function due(cutoff:Date,now:Date){
 const left=cutoff.getTime()-now.getTime();
 if(left<=COMMIT_MARGIN_MS)hold("MISSED_OWN_FLIGHT_PRE_CUTOFF_NO_BACKFILL");
 if(left>MAX_EARLY_MS)hold("FLIGHT_PRE_NOT_YET_DUE");
}
/**
 * One-source/one-flight/one-horizon transactional PRE. No batch grouping and
 * no retry after unknown COMMIT. Source joins are read on one SERIALIZABLE
 * snapshot; external legal/selected-T review cannot be inferred by code.
 */
export async function persistP5V0079SingleBoundFlightPre(
 pool:Pick<Pool,"connect">,p:P5Stage14SingleFlightPrePermit,
 options?:{
  independentlyApprovedStandaloneProtocolSha256?:string;
  disposableCdQueueFence?:P5CdDisposableQueueFence;
  realV0088QueueFenceCi?:P5CdV0088RealQueueCiFence;
  amendmentENativeRouteBoundCi?:true;
 }
):Promise<P5Stage14SingleFlightPreResult>{
 assertP5CdDisposableFenceArguments(options?.disposableCdQueueFence);
 assertP5CdV0088CiFence(options?.realV0088QueueFenceCi);
 assertP5ENativeRouteCi(options?.amendmentENativeRouteBoundCi);
 const native=assertPermit(p,options?.independentlyApprovedStandaloneProtocolSha256);
 const laterEvidence=decideP5LaterPreEvidencePath(
  p,options?.independentlyApprovedStandaloneProtocolSha256);
 // For T6/T90 Stage24 requires a *persisted* T24 V0081 witness in
 // the same serializable database view AND an externally reviewed Stage17
 // post-COMMIT readback receipt. Without both, no later-horizon PRE.
 // This is not an independent legal/native-T reviewer by itself.
 const cutoff=new Date(native.getTime()-PRE_HORIZON_OFFSET_MIN[p.horizon]*60_000);
 if(!pool||typeof pool.connect!=="function")hold("NO_RESTRICTED_PRE_WRITER");
 const c:PoolClient=await pool.connect();
 let begun=false,commitAttempted=false,commitAcknowledged=false;
 try{
  await c.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ WRITE");
  begun=true;
  await c.query("SET LOCAL statement_timeout='12000ms'");
  await c.query("SET LOCAL lock_timeout='2000ms'");
  const who=(await c.query(
   "SELECT current_database() AS db,current_user AS actor,"+
   "current_setting('transaction_read_only') AS ro,"+
   "clock_timestamp() AS at,pg_is_in_recovery() AS replica,"+
   "has_table_privilege(current_user,'clean.flight_snapshots','INSERT') AS can_pre,"+
   "has_table_privilege(current_user,'clean.flight_snapshots','UPDATE') AS can_update,"+
   "has_table_privilege(current_user,'clean.flight_snapshots','DELETE') AS can_delete,"+
   "has_table_privilege(current_user,'clean.phase5_fids_allowed_query_v39','INSERT') AS can_source,"+
   "COALESCE(has_table_privilege(current_user,"+
   "to_regclass('clean.phase5_t24_postcommit_witness_v39'),"+
   "'SELECT'),false) AS can_t24_witness"
  )).rows[0];
  if(who?.db!=="neondb"||who.actor!==p.expectedRestrictedPreWriterRole||
    who.ro!=="off"||who.replica!==false||
    who.can_pre!==true||who.can_update!==false||who.can_delete!==false||
    who.can_source!==false||
    (p.horizon!=="T-24h"&&who.can_t24_witness!==true))
   hold("WRONG_RESTRICTED_PRE_ONLY_DB_ROLE");
  const first=dbTime(who.at,"DB_NOW_INITIAL");
  due(cutoff,first);
  // One flight/horizon can have multiple overlapping FIDS observations.
  // Serialize the PRE identity, never turn a second observation into a
  // duplicate or an accidental revised-T PRE.
  await c.query("SELECT pg_advisory_xact_lock(hashtext('p5-one-flight-pre'),"+
   "hashtext($1))",[p.flightInstanceId+"|"+p.horizon]);
  // C+D proof: take and keep the exact task-row fence lock in this SAME
  // SERIALIZABLE transaction before any PRE source read / INSERT.
  // Claim/reclaim UPDATE must wait; stale generation cannot write.
  if(options?.disposableCdQueueFence)
   await assertP5CdSameTxGuard(c,p,options.disposableCdQueueFence,cutoff);
  if(options?.realV0088QueueFenceCi)
   await assertP5CdV0088RealSameTx(c,p,options.realV0088QueueFenceCi,cutoff);
  const sources=(await c.query(P5_STAGE14_BOUND_SOURCE_SQL,
   [p.manifestSha256,p.queryDigestSha256])).rows as Record<string,unknown>[];
  if(sources.length!==1)hold("NO_UNIQUE_BOUND_PROVIDER_SOURCE");
  const source=exactSource(sources[0],p,cutoff,first,native);
  const members=(await c.query(P5_STAGE14_PHYSICAL_MEMBER_SQL,
   [p.expectedSourcePopulationQueryId,p.flightInstanceId])).rows;
  strictMember(members,p,cutoff,source.available);
  const version=p.selectedTConfig.milestone+":"+
    p.selectedTConfig.version+":"+p.selectedTConfig.artifactHash;
  if(p.horizon!=="T-24h"){
   if(laterEvidence==="STANDALONE_ASOF_LATER_MISSING_T24"){
    // Never pretend T24 existed or downgrade an ambiguous T24 snapshot.
    // Retain the same bound-source and protected native cutoff checks.
    const oldT24=await c.query(
     "SELECT id FROM clean.flight_snapshots WHERE flight_instance_id=$1"+
     " AND horizon='T-24h' LIMIT 2",[p.flightInstanceId]);
    const oldWitness=await c.query(P5_STAGE24_REVIEWED_WITNESSED_T24_SQL,
     [p.flightInstanceId]);
    if(oldT24.rows.length!==0||oldWitness.rows.length!==0)
     hold("MISSING_T24_FALLBACK_BLOCKED_BY_EXISTING_T24_OR_WITNESS");
    if(!members[0].dep_scheduled_utc||
       dbTime(members[0].dep_scheduled_utc,
        "STANDALONE_FIRST_NATIVE_T").getTime()!==native.getTime())
     hold("MISSING_T24_FALLBACK_NATIVE_T_NOT_SOURCE_BOUND");
   }else{
   const row=(await c.query(P5_STAGE24_REVIEWED_WITNESSED_T24_SQL,
     [p.flightInstanceId])).rows;
   if(row.length!==1)
     hold("NO_UNIQUE_PERSISTED_T24_WITNESS_AND_SNAPSHOT");
   // Stage17 output receipt must have been separately archived/reviewed.
   // A caller-supplied hash or timestamp does not authenticate itself.
   verifyP5Stage24WitnessedFrozenT(
     row[0],p.reviewedT24WitnessReceipt!,{
       flightInstanceId:p.flightInstanceId,
       selectedTNativeUtc:p.selectedTNativeUtc,
       expectedSelectedTVersion:version,
       expectedFrameSha256:p.reviewedFrameSha256,
       expectedConfigSha256:p.reviewedConfigSha256,
       cutoffUtc:cutoff.toISOString(),horizon:p.horizon
     });
   }
  }else{
   // The source's provider-native first T is independently authenticated,
   // not an inferred actual runway event or later schedule revision.
   if(!members[0].dep_scheduled_utc||
     dbTime(members[0].dep_scheduled_utc,"NATIVE_SCHEDULE_RECORD").getTime()!==
       native.getTime())
     hold("FIRST_NATIVE_T_MUST_MATCH_QUALIFIED_SOURCE_SCHEDULE");
  }
  const eRoute=options?.amendmentENativeRouteBoundCi===true
   ? selectP5EStage14BoundRouteFeatures({
      flightInstanceId:p.flightInstanceId,horizon:p.horizon,
      selectedNativeTUtc:p.selectedTNativeUtc,
      cutoffUtc:cutoff.toISOString(),issuedAtUtc:first.toISOString(),
      expectedOriginalResponseSha256:p.expectedSourceResponseSha256,
      expectedPopulationQueryId:p.expectedSourcePopulationQueryId,
      originalSourceUseIndependentlyReviewedOutsideThisFunction:true,
      normalizedMember:members[0]
    }).features
   : [];
  // No optional weather/ADSB feature is allowed to suppress a real source-
  // covered PRE. Separate feature owner may materialize only lawful as-of
  // features and must be frozen before the prediction cutoff.
  const built=buildPreSnapshot({
   flightInstanceId:p.flightInstanceId,
   populationQueryId:p.expectedSourcePopulationQueryId,
   populationMemberAtCutoff:true,
   populationObservationAvailableAtUtc:new Date(Math.max(
     source.available,dbTime(members[0].available_at,"MEMBER_AT").getTime())),
   horizonEligible:true,horizon:p.horizon,
   selectedTMilestoneUtc:native,selectedTVersion:version,
   predictionCutoffUtc:cutoff,
   features:eRoute,frameHash:p.reviewedFrameSha256,
   configHash:p.reviewedConfigSha256,
   fidsResponseHash:p.expectedSourceResponseSha256,
   scheduleVersion:null
  });
  if(built.status!=="snapshot")
    throw Error("REFUSED_P5_STAGE14_PRE_PRE_BUILDER_SOURCE_ELIGIBILITY_BLOCKED");
  const already=(await c.query(
    "SELECT id FROM clean.flight_snapshots WHERE flight_instance_id=$1"+
    " AND horizon=$2 AND prediction_cutoff_utc=$3"+
    " AND prediction_state='PRE_DEPARTURE'",
    [p.flightInstanceId,p.horizon,cutoff])).rows;
  if(already.length!==0)hold("EXISTING_PRE_NEVER_OVERWRITE_OR_RETCON");
  due(cutoff,dbTime((await c.query("SELECT clock_timestamp() AS at"))
    .rows[0]?.at,"DB_BEFORE_INSERT"));
  const inserted=await persistPreSnapshot(c,built.snapshot);
  if(inserted!==1)hold("PRE_ALREADY_COMMITTED_OR_INSERT_FAILED");
  const immediatelyBeforeCommit=dbTime((await c.query(
    "SELECT clock_timestamp() AS at")).rows[0]?.at,"DB_BEFORE_COMMIT");
  due(cutoff,immediatelyBeforeCommit);
  if(immediatelyBeforeCommit.getTime()+COMMIT_MARGIN_MS>cutoff.getTime())
   hold("PRE_COMMIT_MARGIN_NOT_PROTECTED");
  // Lease must STILL be live immediately before committing the snapshot.
  // The earlier FOR UPDATE lock remains held; reclaimer cannot race us.
  if(options?.disposableCdQueueFence)
   await assertP5CdSameTxGuard(c,p,options.disposableCdQueueFence,cutoff);
  if(options?.realV0088QueueFenceCi)
   await assertP5CdV0088RealSameTx(c,p,options.realV0088QueueFenceCi,cutoff);
  commitAttempted=true;
  await c.query("COMMIT");begun=false;commitAcknowledged=true;
  // Before-COMMIT clock is NOT durable-commit evidence. Confirm the
  // persisted immutable row and DB clock after the COMMIT was acknowledged.
  // If COMMIT succeeded but post-commit proof is unavailable or late,
  // keep the durable row and HOLD scientific acceptance; never blindly retry.
  const confirmed=await c.query(
   "SELECT clock_timestamp() AS readback_at,id::text AS id,"+
   "population_member_id IS NOT NULL AS has_member,created_at,"+
   "selected_t_milestone_utc,selected_t_version,"+
   "population_query_id,fids_response_hash,prediction_cutoff_utc"+
   " FROM clean.flight_snapshots WHERE flight_instance_id=$1"+
   " AND horizon=$2 AND prediction_cutoff_utc=$3"+
   " AND prediction_state='PRE_DEPARTURE' LIMIT 2",
   [p.flightInstanceId,p.horizon,cutoff]
  );
  const checked=confirmed.rows[0];
  const post=dbTime(checked?.readback_at,"POST_COMMIT_DB_CLOCK");
  if(confirmed.rowCount!==1||
    !/^[1-9][0-9]{0,17}$/.test(checked?.id??"")||
    checked?.has_member!==true||
    checked?.population_query_id!==p.expectedSourcePopulationQueryId||
    checked?.fids_response_hash!==p.expectedSourceResponseSha256||
    checked?.selected_t_version!==version||
    dbTime(checked?.selected_t_milestone_utc,"POST_COMMIT_T").getTime()!==
       native.getTime()||
    dbTime(checked?.prediction_cutoff_utc,"POST_COMMIT_CUTOFF").getTime()!==
       cutoff.getTime()||
    post.getTime()>=cutoff.getTime())
    hold("POST_COMMIT_LATE_OR_UNVERIFIED_QUARANTINE_NO_RETRY");
  return {
   schema:"v39.phase5.stage14.single-bound-flight-pre-writer.v1",
   status:"ONE_SOURCE_BOUND_PROSPECTIVE_PRE_SAVED_NOT_SCIENTIFIC_FREEZE",
   identityEvidenceTier:p.identityEvidenceTier??"PROVIDER_NATIVE_OPERATING_LEG",
   conditionalServiceCertifiedPhysicalLeg:false,
   runDayIndex:p.runDayIndex,slot:p.slot,horizon:p.horizon,
   cutoffUtc:cutoff.toISOString(),
   boundPopulationQueryId:p.expectedSourcePopulationQueryId,
   committedSnapshotId:checked.id as string,
   sourceOriginalCommittedBeforeFlightCutoff:true,
   flightPreCommittedBeforeOwnCutoff:true,
   postCommitDatabaseReadbackVerified:true,
   postCommitDbClockAtUtc:post.toISOString(),
   preSnapshotsInserted:1,providerCalls:0,alertCreates:0,
   authenticPersistedT24WitnessAnchoredForLaterHorizon:
    laterEvidence==="WITNESSED_T24_LATER",
   laterPreEvidenceTier:laterEvidence,
   missingT24ExplicitlyRecordedWithoutBackfill:
    laterEvidence==="STANDALONE_ASOF_LATER_MISSING_T24",
   externalNativeTIndependentlyAuthenticatedByThisFunction:false,
   externalPhysicalOperatingLegIndependentlyAuthenticatedByThisFunction:false,
   providerRightsIndependentlyCertifiedByThisFunction:false,
   actualOnlyWheelsOffAndOutcomeCertified:false,
   phase5FreezePassed:false,phase6PaidGo:false
  };
 }catch(e){
  if(begun&&!commitAttempted){
   // PostgreSQL 40001 from a pre-COMMIT statement aborts this transaction.
   // A *confirmed* ROLLBACK allows a separately reviewed queue owner to
   // consider a bounded fresh attempt AFTER read-only snapshot reconciliation.
   // If the ROLLBACK acknowledgment is lost, quarantine instead of guessing.
   let rollbackAcknowledged=false;
   try{await c.query("ROLLBACK");rollbackAcknowledged=true;}catch{}
   if((e as {code?:unknown})?.code==="40001"){
    if(!rollbackAcknowledged)
     hold("SERIALIZATION_ROLLBACK_UNACKNOWLEDGED_QUARANTINE");
    throw new P5Stage14ConfirmedPrecommitSerializationAbort();
   }
  }
  if(commitAttempted){
   // A SQLSTATE 40001 *returned by the PostgreSQL server on COMMIT*
   // definitively aborts the whole serializable transaction. In contrast,
   // a network/timeout/lost ACK or post-COMMIT readback failure has no
   // reliable COMMIT outcome; those always retain the original HOLD.
   if(!commitAcknowledged&&(e as {code?:unknown})?.code==="40001"){
    let rollbackAcknowledged=false;
    try{await c.query("ROLLBACK");rollbackAcknowledged=true;}catch{}
    if(!rollbackAcknowledged)
     hold("COMMIT_40001_ROLLBACK_UNACKNOWLEDGED_QUARANTINE");
    throw new P5Stage14ConfirmedCommitSerializationAbort();
   }
   hold("POST_COMMIT_PROOF_MISSING_OR_AMBIGUOUS_QUARANTINE_NO_RETRY");
  }
  throw e;
 }finally{c.release();}
}
