/**
 * Phase 4 Gate5 prospective PRE materializer: ONE frozen cohort only.
 * Preserves earliest observed schedule and all availability timestamps.
 * No live entrypoint is wired: the required reviewed native-T, identity and
 * source-rights attestations cannot be invented from FIDS or CLI flags.
 */
import {buildPreSnapshot,persistPreSnapshot,
 type PreHorizon,type PreSnapshot,type SelectedTMilestoneConfig}
 from "./preSnapshotBuilder_v3";

const H=["T-24h","T-6h","T-90m"] as const;
const SHA=/^[a-f0-9]{64}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
export interface P4G5ScopedPreScope {
 airportIcao:string;serviceStartUtc:string;serviceEndUtc:string;
 observedAtUtc:string;reviewedFrozenManifestSha256:string;
}
export interface P4G5ReviewedPrePermit {
 manifestSha256:string;nativeSemanticsArtifactSha256:string;
 operatingLegArtifactSha256:string;retentionRightsArtifactSha256:string;
 exactRunAuthorizationArtifactSha256:string;
 verifiedSelectedTConfig:SelectedTMilestoneConfig;
 separateIndependentEvidenceReviewComplete:true;
}
export interface P4G5PreDb {
 query(sql:string,args?:unknown[]):Promise<{rows:any[];rowCount:number|null}>;
}
const offset:Record<PreHorizon,number>={
 "T-24h":24*3600000,"T-6h":6*3600000,"T-90m":90*60000
};
function time(s:string,why:string):number{
 if(typeof s!=="string"||!UTC.test(s)||!Number.isFinite(Date.parse(s))||
    new Date(s).toISOString()!==s)
  throw Error("P4_G5_PRE_INVALID_UTC:"+why);
 return Date.parse(s);
}
export function assertP4G5ScopedPreScope(s:P4G5ScopedPreScope){
 if(!s||!/^[A-Z]{4}$/.test(s.airportIcao)||
  !SHA.test(s.reviewedFrozenManifestSha256))
  throw Error("P4_G5_PRE_MANIFEST_OR_AIRPORT_HOLD");
 const a=time(s.serviceStartUtc,"start"),b=time(s.serviceEndUtc,"end");
 const at=time(s.observedAtUtc,"observed");
 if(b<=a||b-a<10*60000||b-a>4*3600000||at<a-48*3600000)
  throw Error("P4_G5_PRE_WINDOW_OR_READ_CLOCK_HOLD");
}
// Query yields exactly one row per earliest provisional identity and horizon.
// All FIDS originals are time-bounded; a future raw source can never be used
// as an earlier cutoff. No source roles are silently reclassified.
export const P4_G5_SCOPED_PRE_SOURCE_SQL=[
 "WITH q AS (SELECT f.population_query_id,f.response_hash,f.available_at",
 "FROM clean.fids_query_response f WHERE f.source_airport_icao=$1",
 "AND service_window_start_utc=$2::timestamptz",
 "AND service_window_end_utc=$3::timestamptz",
 "AND available_at<=$4::timestamptz",
 "AND raw_payload IS NOT NULL AND raw_expired_at_utc IS NULL),",
 "p AS (SELECT m.analytic_identity_id,m.canonical_flight_instance_id,",
 "m.population_member_id,m.population_query_id,m.dep_scheduled_utc,",
 "m.response_hash,m.available_at AS member_available,",
 "q.response_hash AS original_hash,q.available_at AS source_available,",
 "m.population_role,m.scope_classification,m.codeshare_resolution_status,",
 "GREATEST(m.available_at,q.available_at) AS effective_available",
 "FROM clean.flight_population m JOIN q",
 "ON q.population_query_id=m.population_query_id",
 "WHERE m.source_type='fids' AND m.source_airport_icao=$1",
 "AND m.window_start_utc=$2::timestamptz",
 "AND m.window_end_utc=$3::timestamptz",
 "AND m.provider_content_expired_at_utc IS NULL",
 "AND m.available_at<=$4::timestamptz),",
 "source_integrity AS (SELECT analytic_identity_id,",
 "bool_and(response_hash IS NOT NULL AND original_hash IS NOT NULL AND",
 "member_available IS NOT NULL AND source_available IS NOT NULL AND",
 "response_hash=original_hash AND member_available>=source_available)",
 "AS all_parent_member_provenance_valid",
 "FROM p WHERE analytic_identity_id IS NOT NULL",
 "GROUP BY analytic_identity_id),",
 "firsts AS (SELECT DISTINCT ON (analytic_identity_id)",
 "analytic_identity_id,dep_scheduled_utc AS first_schedule",
 "FROM p WHERE population_role='requested_airport_primary'",
 "AND analytic_identity_id IS NOT NULL",
 "ORDER BY analytic_identity_id,effective_available ASC,population_query_id ASC),",
 "h AS (SELECT * FROM (VALUES ('T-24h'::text,interval '24 hours'),",
 "('T-6h'::text,interval '6 hours'),",
 "('T-90m'::text,interval '90 minutes')) AS g(horizon,lag))",
 "SELECT f.analytic_identity_id,f.first_schedule,h.horizon,",
 "si.all_parent_member_provenance_valid,",
 "f.first_schedule-h.lag AS prediction_cutoff_utc,",
 "obs.canonical_flight_instance_id,obs.population_member_id,",
 "obs.population_query_id,obs.response_hash,obs.dep_scheduled_utc,",
 "obs.effective_available,obs.member_available,obs.source_available,",
 "obs.original_hash,obs.population_role,obs.scope_classification,",
 "obs.codeshare_resolution_status",
 "FROM firsts f JOIN source_integrity si",
 "ON si.analytic_identity_id=f.analytic_identity_id CROSS JOIN h",
 "LEFT JOIN LATERAL (SELECT * FROM p WHERE",
 "p.analytic_identity_id=f.analytic_identity_id",
 "AND p.population_role='requested_airport_primary'",
 "AND p.effective_available<=f.first_schedule-h.lag",
 "ORDER BY p.effective_available DESC,p.population_query_id DESC",
 "LIMIT 1) obs ON TRUE",
 "ORDER BY f.analytic_identity_id,h.horizon"
].join(" ");
/**
 * Optional *source-owner-bound* staging for the reviewed PRE writer only.
 * Unbound staging remains an INERT candidate preview. A proof SHA is not an
 * authorization: the writer also needs independently authenticated rights,
 * native selected T and an operating-leg identity outside this library.
 */
export interface P4G5BoundPreSourceOwnerV39 {
 horizon:PreHorizon;
 expectedOwnerGithubRunId:string;
 reviewedRunAuthorizationSha256:string;
}
const GH_RUN=/^\d{5,25}$/;
export const P4_G5_SCOPED_PRE_V0077_BOUND_SOURCE_SQL_V39=
 P4_G5_SCOPED_PRE_SOURCE_SQL.replace(
  "FROM clean.fids_query_response f WHERE f.source_airport_icao=$1",
  [
   "FROM clean.fids_query_response f",
   "JOIN clean.phase4_g5_fids_original_binding_v39 b",
   "ON b.population_query_id=f.population_query_id",
   "AND b.original_response_sha256=f.response_hash",
   "JOIN clean.phase4_g5_fids_allowed_query_v39 aq",
   "ON aq.query_digest=b.query_digest",
   "JOIN clean.phase4_g5_fids_physical_owner_v39 ow",
   "ON ow.owner_digest=aq.owner_digest",
   "AND ow.manifest_sha256=b.manifest_sha256",
   "JOIN clean.phase4_g5_fids_physical_attempt_v39 att",
   "ON att.expected_reservation_sha256=b.expected_reservation_sha256",
   "AND att.query_digest=aq.query_digest",
   "AND att.owner_digest=ow.owner_digest",
   "AND att.github_run_id=ow.github_run_id",
   "WHERE f.source_airport_icao=$1 AND f.query_direction='Departure'",
   "AND b.manifest_sha256=$5 AND ow.horizon=$6",
   "AND ow.github_run_id=$7",
   "AND ow.reviewed_authorization_sha256=$8",
   "AND b.source_use_expires_at_utc>clock_timestamp()"
  ].join(" ")
 );
/**
 * Count the *planned* slots independently of retained original observations.
 * Zero rows, source expiry or a missing original is HOLD/unknown, never
 * interpreted as an empty, fully-observed flight population.
 */
export const P4_G5_SCOPED_PRE_V0077_FRAME_SQL_V39=[
 "SELECT count(DISTINCT aq.query_index)::int AS expected_slots,",
 "count(DISTINCT b.population_query_id)::int AS bound_originals,",
 "count(DISTINCT CASE WHEN f.source_airport_icao=$1",
 "AND f.query_direction='Departure'",
 "AND f.service_window_start_utc=$2::timestamptz",
 "AND f.service_window_end_utc=$3::timestamptz",
 "AND f.available_at<=$4::timestamptz",
 "AND f.raw_payload IS NOT NULL AND f.raw_expired_at_utc IS NULL",
 "AND b.original_response_sha256=f.response_hash",
 "AND b.source_use_expires_at_utc>clock_timestamp()",
 "THEN b.population_query_id END)::int AS valid_originals,",
 "count(DISTINCT CASE WHEN f.source_airport_icao=$1",
 "AND f.query_direction='Departure'",
 "AND f.service_window_start_utc=$2::timestamptz",
 "AND f.service_window_end_utc=$3::timestamptz",
 "AND f.available_at<=$4::timestamptz",
 "AND f.raw_payload IS NOT NULL AND f.raw_expired_at_utc IS NULL",
 "AND b.original_response_sha256=f.response_hash",
 "AND b.source_use_expires_at_utc>clock_timestamp()",
 "THEN aq.query_index END)::int AS valid_slots",
 "FROM clean.phase4_g5_fids_physical_owner_v39 ow",
 "JOIN clean.phase4_g5_fids_allowed_query_v39 aq",
 "ON aq.owner_digest=ow.owner_digest",
 "LEFT JOIN clean.phase4_g5_fids_original_binding_v39 b",
 "ON b.query_digest=aq.query_digest AND b.manifest_sha256=ow.manifest_sha256",
 "LEFT JOIN clean.phase4_g5_fids_physical_attempt_v39 att",
 "ON att.expected_reservation_sha256=b.expected_reservation_sha256",
 "AND att.query_digest=aq.query_digest",
 "AND att.owner_digest=ow.owner_digest",
 "AND att.github_run_id=ow.github_run_id",
 "LEFT JOIN clean.fids_query_response f",
 "ON f.population_query_id=b.population_query_id",
 "WHERE ow.manifest_sha256=$5 AND ow.horizon=$6",
 "AND ow.github_run_id=$7 AND ow.reviewed_authorization_sha256=$8",
 "AND (b.population_query_id IS NULL OR att.expected_reservation_sha256 IS NOT NULL)"
].join(" ");

type Counts={horizon:PreHorizon;sourceObserved:number;sourceUnobserved:number;
 provisionalCore:number;queryFilteredUnknownScopeOperating:number;
 unverifiedScopeOrIdentity:number;built:number};
/** Only authenticated V0077-bound G5A owner observations, not legacy PRE:
 * an operating leg with UNKNOWN commercial scope can enter a separately
 * flagged conditional stratum. It must NEVER become confirmed_core.
 */
export function assessG5AConditionalOperatingPREV39(
 scope:unknown,identity:unknown,canonical:unknown,boundOwner:boolean
):{eligible:boolean;scopeUnverified:boolean}{
 const physical=identity==="confirmed_operating_leg"&&
   typeof canonical==="string"&&/^leg:g5a:[a-f0-9]{64}$/.test(canonical);
 const core=physical&&scope==="confirmed_core";
 const conditional=physical&&scope==="unknown"&&boundOwner;
 return {eligible:core||conditional,scopeUnverified:conditional};
}
function t(value:unknown):Date|null {
 if(value===null||value===undefined)return null;
 const d=value instanceof Date?value:
  typeof value==="string"?new Date(value):null;
 if(!d||!Number.isFinite(d.getTime()))throw Error("P4_G5_PRE_MALFORMED_SOURCE_CLOCK");
 return d;
}
export async function stageP4G5ScopedPreV39(
 db:P4G5PreDb,scope:P4G5ScopedPreScope,
 boundOwner?:P4G5BoundPreSourceOwnerV39
){
 assertP4G5ScopedPreScope(scope);
 if(boundOwner&&(!H.includes(boundOwner.horizon)||
    !GH_RUN.test(boundOwner.expectedOwnerGithubRunId)||
    !SHA.test(boundOwner.reviewedRunAuthorizationSha256)))
  throw Error("P4_G5_PRE_V0077_SOURCE_OWNER_SCOPE_HOLD");
 const args:unknown[]=[
  scope.airportIcao,scope.serviceStartUtc,scope.serviceEndUtc,
  scope.observedAtUtc
 ];
 let frameProgress:{expectedSlots:3;validBoundOriginals:number}|null=null;
 if(boundOwner){
  args.push(scope.reviewedFrozenManifestSha256,boundOwner.horizon,
   boundOwner.expectedOwnerGithubRunId,
   boundOwner.reviewedRunAuthorizationSha256);
  const frame=await db.query(P4_G5_SCOPED_PRE_V0077_FRAME_SQL_V39,args);
  const f=frame.rows[0];
  const originals=Number(f?.bound_originals);
  const valid=Number(f?.valid_originals);
  const slots=Number(f?.valid_slots);
  // PRE must be committed near each flight cutoff, BEFORE later query slots
  // have been observed. Requiring a future third receipt for the first
  // cutoff mathematically forbids on-time PRE. Require every already-bound
  // original to be an authenticated, unexpired distinct V0076/V0077 source;
  // keep unobserved planned slots for the later independent 3/3 audit.
  if(frame.rows.length!==1||Number(f?.expected_slots)!==3||
     !Number.isSafeInteger(originals)||originals<1||originals>3||
     valid!==originals||slots!==originals)
   throw Error("P4_G5_PRE_V0077_BOUND_PREFIX_INVALID_OR_UNOBSERVED_HOLD");
  frameProgress={expectedSlots:3,validBoundOriginals:originals};
 }
 const q=await db.query(boundOwner?
  P4_G5_SCOPED_PRE_V0077_BOUND_SOURCE_SQL_V39:
  P4_G5_SCOPED_PRE_SOURCE_SQL,args);
 if(!q||!Array.isArray(q.rows)||q.rows.length>30000||q.rows.length%3!==0)
  throw Error("P4_G5_PRE_SOURCE_RESULT_SHAPE_HOLD");
 const counts:Record<PreHorizon,Counts>={
  "T-24h":{horizon:"T-24h",sourceObserved:0,sourceUnobserved:0,provisionalCore:0,queryFilteredUnknownScopeOperating:0,unverifiedScopeOrIdentity:0,built:0},
  "T-6h":{horizon:"T-6h",sourceObserved:0,sourceUnobserved:0,provisionalCore:0,queryFilteredUnknownScopeOperating:0,unverifiedScopeOrIdentity:0,built:0},
  "T-90m":{horizon:"T-90m",sourceObserved:0,sourceUnobserved:0,provisionalCore:0,queryFilteredUnknownScopeOperating:0,unverifiedScopeOrIdentity:0,built:0}
 };
 const staged:Array<{horizon:PreHorizon;snapshot:PreSnapshot}>=[];
 const seen=new Set<string>();
 for(const r of q.rows){
  if(!r||typeof r!=="object"||Array.isArray(r)||
    typeof r.analytic_identity_id!=="string"||
    !H.includes(r.horizon as PreHorizon))
   throw Error("P4_G5_PRE_MALFORMED_ID_OR_HORIZON");
  if(r.all_parent_member_provenance_valid!==true)
   throw Error("P4_G5_PRE_HISTORICAL_SOURCE_LINEAGE_HOLD");
  const h=r.horizon as PreHorizon;
  const key=r.analytic_identity_id+"|"+h;
  if(seen.has(key))throw Error("P4_G5_PRE_DUPLICATE_FLIGHT_HORIZON");
  seen.add(key);
  const T=t(r.first_schedule),cutoff=t(r.prediction_cutoff_utc);
  if(T===null){
   if(cutoff!==null)throw Error("P4_G5_PRE_T_CUTOFF_CONTRADICTION");
   counts[h].sourceUnobserved++;continue;
  }
  if(!cutoff||T.getTime()-cutoff.getTime()!==offset[h])
   throw Error("P4_G5_PRE_HORIZON_TIMESTAMP_CONTRADICTION");
  const available=t(r.effective_available);
  if(!available){
   counts[h].sourceUnobserved++;continue;
  }
  const parent=t(r.source_available),member=t(r.member_available);
  if(!parent||!member||member.getTime()<parent.getTime()||
    parent.getTime()>cutoff.getTime()||
    available.getTime()>cutoff.getTime()||
    available.getTime()>time(scope.observedAtUtc,"observed")||
    typeof r.response_hash!=="string"||!SHA.test(r.response_hash)||
    r.response_hash!==r.original_hash)
   throw Error("P4_G5_PRE_ORIGINAL_ASOF_OR_HASH_HOLD");
  counts[h].sourceObserved++;
  const eligibility=assessG5AConditionalOperatingPREV39(
   r.scope_classification,r.codeshare_resolution_status,
   r.canonical_flight_instance_id,!!boundOwner);
  if(!eligibility.eligible){
   counts[h].unverifiedScopeOrIdentity++;continue;
  }
  if(eligibility.scopeUnverified)counts[h].queryFilteredUnknownScopeOperating++;
  else counts[h].provisionalCore++;
  const scheduled=t(r.dep_scheduled_utc);
  if(!scheduled||typeof r.population_query_id!=="string")
   throw Error("P4_G5_PRE_VERIFIED_SOURCE_REQUIRED");
  const built=buildPreSnapshot({
   flightInstanceId:r.canonical_flight_instance_id,
   populationQueryId:r.population_query_id,
   populationMemberAtCutoff:true,
   populationObservationAvailableAtUtc:available,
   horizonEligible:true,
   horizon:h,selectedTMilestoneUtc:T,
   selectedTVersion:"CANDIDATE_FIRST_GENERIC_SCHEDULE_NOT_CERTIFIED",
   predictionCutoffUtc:cutoff,
   features:[
    {featureName:"fids_departure_schedule_asof",
     value:scheduled.toISOString(),informationAvailableAt:available,
     source:"AeroDataBox FIDS original",sourceVersion:r.response_hash},
    // PRE-time recorded limitation, not a fabricated confirmed commercial.
    {featureName:"g5a_population_scope_evidence",
     value:eligibility.scopeUnverified?
       "QUERY_FILTERED_SCOPE_UNVERIFIED":"ROW_CONFIRMED_CORE",
     informationAvailableAt:available,
     source:"G5A recorded FIDS scope classification",
     sourceVersion:r.response_hash},
    {featureName:"webhook_optional",value:null,informationAvailableAt:null,
     source:null,sourceVersion:null},
    {featureName:"weather_optional",value:null,informationAvailableAt:null,
     source:null,sourceVersion:null}
   ],
   frameHash:null,configHash:null,
   fidsResponseHash:r.response_hash,scheduleVersion:null
  });
  if(built.status!=="snapshot")
   throw Error("P4_G5_PRE_BUILDER_REFUSED_QUALIFIED_CANDIDATE");
  counts[h].built++;
  staged.push({horizon:h,snapshot:built.snapshot});
 }
 // Independently verified first native T is not present in this source.
 return {
  schema:"v39.phase4.gate5-cohort-scoped-pre-staging.v1" as const,
  status:"REAL_SOURCE_CANDIDATES_ONLY_NATIVE_T_UNVERIFIED" as const,
  counts:H.map(h=>counts[h]),
  // A time-consistent 1/3 or 2/3 prefix is not a full collection success;
  // missing future slots remain unknown and independently auditable.
  sourceBoundPrefixAtRead:frameProgress,
  sourceFullThreeOriginalFrameAsOfRead:frameProgress?.validBoundOriginals===3,
  candidateInMemoryRows:staged.length,
  staged,
  scopedProviderOriginalAsOf:true as const,
  trueScheduledTIndependentlyVerified:false as const,
  certifiedSnapshotRowsPersisted:0 as const,
  strictGate5Passed:false as const,
  providerCalls:0 as const,
  databaseWrites:0 as const
 };
}
