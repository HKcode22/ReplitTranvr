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
 /** Caller review attestations are metadata, NOT self-authenticating proof. */
 externalNativeTPhysicalLegAndSourceUseReviewed:true;
}
export interface P5Stage14SingleFlightPreResult{
 schema:"v39.phase5.stage14.single-bound-flight-pre-writer.v1";
 status:"ONE_SOURCE_BOUND_PROSPECTIVE_PRE_SAVED_NOT_SCIENTIFIC_FREEZE";
 runDayIndex:number;slot:string;horizon:PreHorizon;
 cutoffUtc:string;boundPopulationQueryId:string;
 sourceOriginalCommittedBeforeFlightCutoff:true;
 flightPreCommittedBeforeOwnCutoff:true;
 preSnapshotsInserted:1;providerCalls:0;alertCreates:0;
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
 "p.dep_scheduled_utc,p.population_member_id",
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
function assertPermit(p:P5Stage14SingleFlightPrePermit):Date{
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
  p.maxPopulationStalenessSeconds>86_400||
  p.externalNativeTPhysicalLegAndSourceUseReviewed!==true)
  hold("INDEPENDENT_PERMIT_IDENTITY_SCOPE_OR_SOURCE_RIGHTS_MISSING");
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
    m.scope_classification!=="confirmed_core"||
    m.codeshare_resolution_status!=="confirmed_operating_leg"||
    m.source_type!=="fids"||
    m.response_hash!==p.expectedSourceResponseSha256||
    m.provider_content_expired_at_utc!==null||
    !m.population_member_id)
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
 pool:Pick<Pool,"connect">,p:P5Stage14SingleFlightPrePermit
):Promise<P5Stage14SingleFlightPreResult>{
 const native=assertPermit(p);
 const cutoff=new Date(native.getTime()-PRE_HORIZON_OFFSET_MIN[p.horizon]*60_000);
 if(!pool||typeof pool.connect!=="function")hold("NO_RESTRICTED_PRE_WRITER");
 const c:PoolClient=await pool.connect();
 let begun=false,commitAttempted=false;
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
   "has_table_privilege(current_user,'clean.phase5_fids_allowed_query_v39','INSERT') AS can_source"
  )).rows[0];
  if(who?.db!=="neondb"||who.actor!==p.expectedRestrictedPreWriterRole||
    who.ro!=="off"||who.replica!==false||
    who.can_pre!==true||who.can_update!==false||who.can_delete!==false||
    who.can_source!==false)
   hold("WRONG_RESTRICTED_PRE_ONLY_DB_ROLE");
  const first=dbTime(who.at,"DB_NOW_INITIAL");
  due(cutoff,first);
  // One flight/horizon can have multiple overlapping FIDS observations.
  // Serialize the PRE identity, never turn a second observation into a
  // duplicate or an accidental revised-T PRE.
  await c.query("SELECT pg_advisory_xact_lock(hashtext('p5-one-flight-pre'),"+
   "hashtext($1))",[p.flightInstanceId+"|"+p.horizon]);
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
   const t24=(await c.query(P5_STAGE14_PREVIOUS_T24_SQL,
     [p.flightInstanceId,p.reviewedFrameSha256,p.reviewedConfigSha256])).rows;
   if(t24.length!==1||t24[0].selected_t_version!==version||
      dbTime(t24[0].selected_t_milestone_utc,"PRIOR_T24_T").getTime()!==
       native.getTime()||
      dbTime(t24[0].prediction_cutoff_utc,"PRIOR_T24_CUTOFF").getTime()!==
       native.getTime()-24*3600_000||
      dbTime(t24[0].created_at,"PRIOR_T24_COMMITTED_AT").getTime()>
       native.getTime()-24*3600_000)
     hold("ABSENT_OR_RETCONNED_FROZEN_T24_PROSPECTIVE_PRE");
  }else{
   // The source's provider-native first T is independently authenticated,
   // not an inferred actual runway event or later schedule revision.
   if(!members[0].dep_scheduled_utc||
     dbTime(members[0].dep_scheduled_utc,"NATIVE_SCHEDULE_RECORD").getTime()!==
       native.getTime())
     hold("FIRST_NATIVE_T_MUST_MATCH_QUALIFIED_SOURCE_SCHEDULE");
  }
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
   features:[],frameHash:p.reviewedFrameSha256,
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
  commitAttempted=true;
  await c.query("COMMIT");begun=false;
  return {
   schema:"v39.phase5.stage14.single-bound-flight-pre-writer.v1",
   status:"ONE_SOURCE_BOUND_PROSPECTIVE_PRE_SAVED_NOT_SCIENTIFIC_FREEZE",
   runDayIndex:p.runDayIndex,slot:p.slot,horizon:p.horizon,
   cutoffUtc:cutoff.toISOString(),
   boundPopulationQueryId:p.expectedSourcePopulationQueryId,
   sourceOriginalCommittedBeforeFlightCutoff:true,
   flightPreCommittedBeforeOwnCutoff:true,
   preSnapshotsInserted:1,providerCalls:0,alertCreates:0,
   externalNativeTIndependentlyAuthenticatedByThisFunction:false,
   externalPhysicalOperatingLegIndependentlyAuthenticatedByThisFunction:false,
   providerRightsIndependentlyCertifiedByThisFunction:false,
   actualOnlyWheelsOffAndOutcomeCertified:false,
   phase5FreezePassed:false,phase6PaidGo:false
  };
 }catch(e){
  if(begun&&!commitAttempted)await c.query("ROLLBACK").catch(()=>{});
  if(commitAttempted)hold("AMBIGUOUS_PRE_COMMIT_READONLY_AUDIT_BEFORE_RETRY");
  throw e;
 }finally{c.release();}
}
