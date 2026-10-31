/**
 * Phase4 Gate5 production READ ONLY PRE-builder candidate execution.
 * Executes the real PRE feature cutoff/missingness engine against original
 * received FIDS observations, never silently promoting an unverified selected
 * T / operating leg into certified clean.flight_snapshots.
 *
 * All per-flight values and identities remain in process; output is aggregate
 * only. No callback/airborne feature determines candidate snapshot existence.
 */
import type {P4InventoryDb} from "./phase4Gate5SourceInventory_v39";
import {buildPreSnapshot,type PreHorizon}
 from "./preSnapshotBuilder_v3";

export const P4_LIVE_PREVIEW_SCHEMA_V39 =
 "v39.phase4.gate5-live-pre-builder-candidates.v1" as const;
const H=["T-24h","T-6h","T-90m"] as const;
type Horizon=typeof H[number];

export const P4_LIVE_PREVIEW_SQL_V39=[
 "WITH q AS (SELECT population_query_id,response_hash,available_at",
 "FROM clean.fids_query_response",
 "WHERE source_airport_icao=$1",
 "AND service_window_start_utc=$2::timestamptz",
 "AND service_window_end_utc=$3::timestamptz",
 "AND raw_payload IS NOT NULL AND raw_expired_at_utc IS NULL",
 "AND raw_persisted_at_utc >= $4::timestamptz - interval '24 hours'",
 "AND available_at<=$4::timestamptz",
 "ORDER BY available_at DESC LIMIT 12),",
 "p AS (SELECT m.analytic_identity_id,m.population_query_id,",
 "m.dep_scheduled_utc,m.scope_classification,",
 "m.codeshare_resolution_status,m.response_hash,",
 "GREATEST(m.available_at,q.available_at) AS effective_available,",
 "(m.response_hash=q.response_hash AND",
 "(m.available_at>=q.available_at OR",
 "q.available_at-m.available_at<interval '1 millisecond')",
 "AND m.available_at<=$4::timestamptz) AS source_consistent",
 "FROM clean.flight_population m JOIN q",
 "ON q.population_query_id=m.population_query_id",
 "WHERE m.source_type='fids' AND m.source_airport_icao=$1",
 "AND m.population_role='requested_airport_primary'",
 "AND m.provider_content_expired_at_utc IS NULL",
 "AND m.analytic_identity_id IS NOT NULL),",
 "firsts AS (SELECT DISTINCT ON (analytic_identity_id)",
 "analytic_identity_id,dep_scheduled_utc AS first_schedule",
 "FROM p ORDER BY analytic_identity_id,effective_available ASC,",
 "population_query_id ASC),",
 "h AS (SELECT * FROM (VALUES",
 "('T-24h'::text,interval '24 hours'),",
 "('T-6h'::text,interval '6 hours'),",
 "('T-90m'::text,interval '90 minutes')) AS v(horizon,lag))",
 "SELECT f.analytic_identity_id,f.first_schedule,h.horizon,",
 "f.first_schedule-h.lag AS prediction_cutoff_utc,",
 "obs.population_query_id,obs.response_hash,",
 "obs.dep_scheduled_utc AS observed_schedule,",
 "obs.effective_available AS source_available,",
 "obs.scope_classification,obs.codeshare_resolution_status",
 "FROM firsts f CROSS JOIN h",
 "LEFT JOIN LATERAL (",
 "SELECT p.* FROM p WHERE",
 "p.analytic_identity_id=f.analytic_identity_id",
 "AND p.source_consistent",
 "AND f.first_schedule IS NOT NULL",
 "AND p.effective_available<=f.first_schedule-h.lag",
 "ORDER BY p.effective_available DESC,p.population_query_id DESC",
 "LIMIT 1) obs ON TRUE",
 "ORDER BY f.analytic_identity_id,h.horizon"
].join(" ");

const utc=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/;
function date(x:unknown):Date|null {
 if(x===null)return null;
 const d=x instanceof Date?x:typeof x==="string"&&utc.test(x)?new Date(x):null;
 if(!d||!Number.isFinite(d.getTime()))throw Error("P4_PREVIEW_INVALID_UTC");
 return d;
}
function rec(x:unknown):Record<string,unknown>{
 if(!x||typeof x!=="object"||Array.isArray(x))
  throw Error("P4_PREVIEW_BAD_ROW");
 return x as Record<string,unknown>;
}
function blank(){
 return {sourceEligible:0,previewBuilt:0,requiredScheduleFeaturePresent:0,
  optionalWebhookFeatureMissing:0,optionalWeatherFeatureMissing:0,
  insufficientSourceAtCutoff:0,firstScheduleUnavailable:0,
  classificationUnknownPreviewCount:0,confirmedCoreClassPreviewCount:0,
  cutoffAlreadyReachedPreviewCount:0,
  previewBeforeActualCutoffCount:0};
}

export async function auditP4LivePreBuilderCandidatesV39(
 db:P4InventoryDb,
 params:{airport:"WSSS";windowStartUtc:string;windowEndUtc:string;auditUtc:string}
){
 if(!params||params.airport!=="WSSS"||
  params.windowStartUtc!=="2026-10-31T17:00:00.000Z"||
  params.windowEndUtc!=="2026-10-31T18:00:00.000Z"||
  !utc.test(params.auditUtc)||!Number.isFinite(Date.parse(params.auditUtc)))
  throw Error("P4_PREVIEW_SCOPE_HOLD");
 const rows=await db.query(P4_LIVE_PREVIEW_SQL_V39,[
   params.airport,params.windowStartUtc,params.windowEndUtc,params.auditUtc
 ]);
 if(!rows||!Array.isArray(rows.rows)||rows.rows.length>60000||
  rows.rows.length%3!==0)
  throw Error("P4_PREVIEW_SOURCE_ROWS_BOUND_HOLD");
 const totals:Record<Horizon,ReturnType<typeof blank>>={
  "T-24h":blank(),"T-6h":blank(),"T-90m":blank()
 };
 const seen=new Set<string>(),identityHorizons=new Map<string,Set<string>>();
 const auditTime=Date.parse(params.auditUtc);
 for(const raw of rows.rows){
  const row=rec(raw);
  const id=row.analytic_identity_id,h=row.horizon;
  if(typeof id!=="string"||id.length<1||id.length>180||
    !H.includes(h as Horizon))
   throw Error("P4_PREVIEW_BAD_ID_OR_HORIZON");
  const key=id+"|"+h;
  if(seen.has(key))throw Error("P4_PREVIEW_DUPLICATE_ID_HORIZON");
  seen.add(key);
  const group=totals[h as Horizon];
  const hs=identityHorizons.get(id)??new Set<string>();
  hs.add(String(h));identityHorizons.set(id,hs);
  const first=date(row.first_schedule),cutoff=date(row.prediction_cutoff_utc);
  if(first===null){
   if(cutoff!==null)throw Error("P4_PREVIEW_FIRST_SCHEDULE_CUTOFF_CONTRADICTION");
   group.firstScheduleUnavailable++;continue;
  }
  if(!cutoff)throw Error("P4_PREVIEW_MISSING_CUTOFF");
  const source=date(row.source_available);
  if(!source){
   if(row.population_query_id!==null)throw Error("P4_PREVIEW_NULL_SOURCE_INCONSISTENT");
   group.insufficientSourceAtCutoff++;continue;
  }
  if(typeof row.population_query_id!=="string"||
    !/^[0-9a-f-]{36}$/.test(row.population_query_id)||
    typeof row.response_hash!=="string"||
    !/^[a-f0-9]{64}$/.test(row.response_hash)||
    source.getTime()>cutoff.getTime()||source.getTime()>auditTime)
   throw Error("P4_PREVIEW_LATE_OR_MALFORMED_SOURCE");
  const observed=date(row.observed_schedule);
  if(observed===null)throw Error("P4_PREVIEW_MISSING_SOURCE_SCHEDULE");
  if(typeof row.scope_classification!=="string"||
    typeof row.codeshare_resolution_status!=="string")
   throw Error("P4_PREVIEW_MISSING_PROVENANCE");
  const outcome=buildPreSnapshot({
   flightInstanceId:id,
   populationQueryId:row.population_query_id,
   populationMemberAtCutoff:true,
   populationObservationAvailableAtUtc:source,
   horizonEligible:true,
   horizon:h as PreHorizon,
   // This real native departure schedule is NOT independently certified
   // as the final selected-T; it is ONLY for the candidate preview.
   selectedTMilestoneUtc:first,
   selectedTVersion:"CANDIDATE_NOT_VERIFIED_SELECTED_T",
   predictionCutoffUtc:cutoff,
   features:[
    {featureName:"fids_observed_departure_schedule",
     value:observed.toISOString(),informationAvailableAt:source,
     source:"AeroDataBox FIDS original observation",
     sourceVersion:row.response_hash},
    {featureName:"webhook_last_notification",
     value:null,informationAvailableAt:null,
     source:null,sourceVersion:null},
    {featureName:"airport_weather",
     value:null,informationAvailableAt:null,
     source:null,sourceVersion:null}
   ],
   frameHash:null,configHash:null,fidsResponseHash:row.response_hash,
   scheduleVersion:null
  });
  if(outcome.status!=="snapshot")throw Error("P4_PREVIEW_BUILDER_CUTOFF_HOLD");
  const f=outcome.snapshot.features;
  if(f.length!==3||f[0].missing||!f[1].missing||!f[2].missing||
    f[1].value!==null||f[2].value!==null)
   throw Error("P4_PREVIEW_FEATURE_MISSINGNESS_HOLD");
  group.sourceEligible++;group.previewBuilt++;
  group.requiredScheduleFeaturePresent++;
  group.optionalWebhookFeatureMissing++;
  group.optionalWeatherFeatureMissing++;
  if(row.scope_classification==="confirmed_core"&&
    row.codeshare_resolution_status==="confirmed_operating_leg")
   group.confirmedCoreClassPreviewCount++;
  else group.classificationUnknownPreviewCount++;
  if(cutoff.getTime()<=auditTime)
   group.cutoffAlreadyReachedPreviewCount++;
  else group.previewBeforeActualCutoffCount++;
 }
 if([...identityHorizons.values()].some(x=>x.size!==3)||
   [...Object.values(totals)].some(x=>
    x.previewBuilt!==x.sourceEligible||
    x.sourceEligible!==x.requiredScheduleFeaturePresent||
    x.previewBuilt!==x.optionalWebhookFeatureMissing||
    x.previewBuilt!==x.optionalWeatherFeatureMissing||
    x.previewBuilt!==x.confirmedCoreClassPreviewCount+
      x.classificationUnknownPreviewCount||
    x.previewBuilt!==x.cutoffAlreadyReachedPreviewCount+
      x.previewBeforeActualCutoffCount))
   throw Error("P4_PREVIEW_INCONSISTENT_HORIZON_TOTALS");
 return {
  schema:P4_LIVE_PREVIEW_SCHEMA_V39,
  status:"LIVE_PRE_BUILDER_EXECUTED_CANDIDATE_ONLY_NO_DB_WRITE" as const,
  airport:params.airport,windowStartUtc:params.windowStartUtc,
  windowEndUtc:params.windowEndUtc,auditUtc:params.auditUtc,
  provisionalDistinctIdentityCount:identityHorizons.size,
  horizons:H.map(h=>({horizon:h,...totals[h]})),
  noSnapshotPersistedByPreview:true as const,
  firstTProviderSemanticsIndependentlyVerified:false as const,
  confirmedPhysicalOperatingLegPopulationCertified:false as const,
  futureHorizonPreviewDoesNotEstablishFutureSourceObservation:true as const,
  strictGate5Passed:false as const,phase6Authorized:false as const,
  providerCalls:0 as const,databaseWrites:0 as const
 };
}
