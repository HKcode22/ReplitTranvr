/**
 * Phase 5 Stage10: V0079 provider-original -> per-flight as-of PRE CANDIDATE.
 *
 * READ ONLY. A bound FIDS original is necessary but NOT sufficient for a
 * scientific flight-level PRE. This module never builds/writes a PRE, certifies
 * a provider-native selected-T, reassigns a physical leg, or authorizes Phase6.
 * No CLI, scheduler, provider transport, or production grants are wired.
 *
 * Source: Plan f.8 §§5.1-5.4, 6.0-6.1, Amendment B and Phase5 #416.
 */
import type {Pool} from "pg";

type Horizon="T-24h"|"T-6h"|"T-90m";
type Slot="HUB"|"MID_A"|"MID_B"|"REGIONAL";
type Reason=
 |"NONPRIMARY_MOVEMENT"|"NONCORE_OR_UNKNOWN_SCOPE"
 |"NO_CONFIRMED_OPERATING_LEG"|"AMBIGUOUS_DUPLICATE_LEG"
 |"NO_VERIFIED_FROZEN_T24_ANCHOR"|"NATIVE_T_UNVERIFIED"
 |"FLIGHT_OUTSIDE_FROZEN_WINDOW"|"SOURCE_OR_MEMBER_CLOCK_INVALID"
 |"OBSERVATION_AFTER_FLIGHT_CUTOFF"|"POPULATION_TOO_STALE"
 |"PREDICTION_CUTOFF_NOT_YET_DUE"|"PRE_COMMIT_CUTOFF_PASSED";
const HASH=/^[0-9a-f]{64}$/;
const ROLE=/^phase5_fids_pre_reader_[a-z0-9_]{6,42}$/;
const HORIZONS:Horizon[]=["T-24h","T-6h","T-90m"];
const SLOTS:Slot[]=["HUB","MID_A","MID_B","REGIONAL"];
const OFFSET:Record<Horizon,number>={
 "T-24h":86_400_000,"T-6h":21_600_000,"T-90m":5_400_000
};
function hold(s:string):never{throw Error("REFUSED_P5_STAGE10_PRE_READBACK_"+s);}
function date(v:unknown,label:string):Date{
 if(!(v instanceof Date)&&typeof v!=="string")hold(label);
 const d=v instanceof Date?v:new Date(v);
 if(!Number.isFinite(d.getTime()))hold(label);
 return d;
}
function obj(v:unknown):Record<string,unknown>{
 if(!v||typeof v!=="object"||Array.isArray(v))hold("SOURCE_ROW_INVALID");
 return v as Record<string,unknown>;
}
function integer(v:unknown,label:string):number{
 const n=Number(v);
 if(!Number.isSafeInteger(n)||n<0)hold(label);
 return n;
}
export interface P5Stage10ReadScope {
 expectedManifestSha256:string;
 expectedQueryDigestSha256:string;
 expectedRightsReviewSha256:string;
 expectedFrameSha256:string;
 expectedReaderRole:string;
 runDayIndex:number;
 slot:Slot;horizon:Horizon;airportIcao:string;
 /** An explicitly frozen admission parameter, never a default guess. */
 maxPopulationStalenessSeconds:number;
}
export const P5_STAGE10_BOUND_SOURCE_SQL=[
 "SELECT q.query_digest,q.manifest_sha256,q.run_day_index,",
 "q.slot_id,q.horizon,q.airport_icao,q.github_run_id,q.state,",
 "q.rights_review_sha256,q.service_window_start_utc,",
 "q.service_window_end_utc,q.prediction_cutoff_utc AS planned_cutoff,",
 "a.reservation_sha256,a.github_run_id AS attempt_run_id,",
 "a.committed_at_utc AS reserved_at,",
 "b.population_query_id,b.normalized_members_count,",
 "b.response_hash AS bound_hash,b.source_expires_at_utc,",
 "b.rights_review_sha256 AS bound_rights,",
 "f.response_hash AS source_hash,f.fids_retrieval_utc,",
 "f.raw_persisted_at_utc,f.available_at AS source_available,",
 "(f.raw_payload IS NOT NULL AND f.raw_expired_at_utc IS NULL)",
 "AS raw_current",
 "FROM clean.phase5_fids_allowed_query_v39 q",
 "JOIN clean.phase5_fids_physical_attempt_v39 a",
 "ON a.query_digest=q.query_digest AND a.manifest_sha256=q.manifest_sha256",
 "JOIN clean.phase5_fids_original_binding_v39 b",
 "ON b.reservation_sha256=a.reservation_sha256",
 "AND b.query_digest=q.query_digest AND b.manifest_sha256=q.manifest_sha256",
 "JOIN clean.fids_query_response f",
 "ON f.population_query_id=b.population_query_id",
 "WHERE q.query_digest=$1 AND q.manifest_sha256=$2"
].join(" ");
export const P5_STAGE10_BOUND_MEMBERS_SQL=[
 "SELECT p.population_member_id,p.population_query_id,",
 "p.analytic_identity_id,p.canonical_flight_instance_id,",
 "p.dep_airport_icao,p.population_role,p.scope_classification,",
 "p.codeshare_resolution_status,p.dep_scheduled_utc,",
 "p.available_at AS member_available,p.response_hash AS member_hash,",
 "p.source_airport_icao,p.source_type,",
 "s.selected_t_milestone_utc AS t24_frozen_t,",
 "s.prediction_cutoff_utc AS t24_cutoff,",
 "s.created_at AS t24_created_at,",
 "s.selected_t_version AS t24_version",
 "FROM clean.flight_population p",
 "LEFT JOIN LATERAL (",
 "SELECT x.selected_t_milestone_utc,x.prediction_cutoff_utc,",
 "x.created_at,x.selected_t_version",
 "FROM clean.flight_snapshots x",
 "WHERE x.flight_instance_id=p.canonical_flight_instance_id",
 "AND x.horizon='T-24h' AND x.prediction_state='PRE_DEPARTURE'",
 "AND x.frame_hash=$2 AND x.selected_t_milestone_utc IS NOT NULL",
 "AND x.created_at<=x.prediction_cutoff_utc",
 "ORDER BY x.created_at ASC LIMIT 1",
 ") s ON TRUE",
 "WHERE p.population_query_id=$1",
 "ORDER BY p.population_member_id"
].join(" ");

export interface P5Stage10Readback {
 schema:"v39.phase5.stage10.bound-original-flight-pre-asof-candidates.v1";
 status:"READONLY_CANDIDATES_NOT_PRE_OR_FREEZE";
 asOfDatabaseUtc:string;
 runDayIndex:number;slot:Slot;horizon:Horizon;
 queryDigestSha256:string;
 boundOriginalVerified:true;
 sourceObservationCount:number;
 candidatePhysicalLegCount:number;
 sourceAsOfCandidates:number;
 potentiallyDuePreCandidates:number;
 unverifiedSourceTCount:number;
 reasons:Record<Reason,number>;
 databaseWrites:0;providerCalls:0;preSnapshotsWritten:0;
 operatingLegSemanticsCertified:false;
 legalPurposeAndRetentionCertified:false;
 scientificFlightLevelPreCertified:false;
 finalPhase5FreezePassed:false;phase6PaidGo:false;
}
function assertScope(s:P5Stage10ReadScope){
 if(!s||![s.expectedManifestSha256,s.expectedQueryDigestSha256,
  s.expectedRightsReviewSha256,s.expectedFrameSha256]
  .every(v=>typeof v==="string"&&HASH.test(v))||
  !ROLE.test(s.expectedReaderRole)||
  !Number.isInteger(s.runDayIndex)||s.runDayIndex<1||s.runDayIndex>31||
  !SLOTS.includes(s.slot)||!HORIZONS.includes(s.horizon)||
  !/^[A-Z]{4}$/.test(s.airportIcao)||
  !Number.isSafeInteger(s.maxPopulationStalenessSeconds)||
  s.maxPopulationStalenessSeconds<1||
  s.maxPopulationStalenessSeconds>86_400)
  hold("UNFROZEN_OR_INVALID_SCOPE");
}
function tally(reasons:Record<Reason,number>,r:Reason){
 reasons[r]++;
}
function auditMembers(
 rows:Record<string,unknown>[],header:Record<string,unknown>,
 scope:P5Stage10ReadScope,now:Date
){
 const reasons=Object.fromEntries([
  "NONPRIMARY_MOVEMENT","NONCORE_OR_UNKNOWN_SCOPE",
  "NO_CONFIRMED_OPERATING_LEG","AMBIGUOUS_DUPLICATE_LEG",
  "NO_VERIFIED_FROZEN_T24_ANCHOR","NATIVE_T_UNVERIFIED",
  "FLIGHT_OUTSIDE_FROZEN_WINDOW","SOURCE_OR_MEMBER_CLOCK_INVALID",
  "OBSERVATION_AFTER_FLIGHT_CUTOFF","POPULATION_TOO_STALE",
  "PREDICTION_CUTOFF_NOT_YET_DUE","PRE_COMMIT_CUTOFF_PASSED"
 ].map(k=>[k,0])) as Record<Reason,number>;
 const start=date(header.service_window_start_utc,"SERVICE_START").getTime();
 const end=date(header.service_window_end_utc,"SERVICE_END").getTime();
 const source=date(header.source_available,"SOURCE_AVAILABLE").getTime();
 const sourceHash=header.source_hash;
 const occurrences=new Map<string,number>();
 for(const p of rows){
   const id=p.canonical_flight_instance_id;
   if(typeof id==="string"&&id.length>0)
     occurrences.set(id,(occurrences.get(id)??0)+1);
 }
 let candidates=0,due=0,tUnverified=0,physical=0;
 for(const p of rows){
   if(p.population_query_id!==header.population_query_id||
      p.source_type!=="fids"||
      p.source_airport_icao!==scope.airportIcao||
      p.member_hash!==sourceHash)
     hold("CHANGED_OR_CROSS_SOURCE_POPULATION_ROW");
   // Preserve a separate reasoned denominator for every original member.
   if(p.population_role!=="requested_airport_primary"){
     tally(reasons,"NONPRIMARY_MOVEMENT");continue;
   }
   if(p.scope_classification!=="confirmed_core"){
     tally(reasons,"NONCORE_OR_UNKNOWN_SCOPE");continue;
   }
   const id=p.canonical_flight_instance_id;
   if(typeof id!=="string"||!id.trim()||
      p.codeshare_resolution_status!=="confirmed_operating_leg"||
      p.analytic_identity_id!==id||
      p.dep_airport_icao!==scope.airportIcao){
     tally(reasons,"NO_CONFIRMED_OPERATING_LEG");continue;
   }
   if((occurrences.get(id)??0)!==1){
     tally(reasons,"AMBIGUOUS_DUPLICATE_LEG");continue;
   }
   physical++;
   // T24 source schedule is merely a provider-native CANDIDATE until an
   // independent semantic verifier certifies its schedule meaning.
   // T6/T90 MUST reuse the existing frozen T24 snapshot, never re-anchor
   // to a later, retimed FIDS observation.
   const native=scope.horizon==="T-24h"?
     p.dep_scheduled_utc:p.t24_frozen_t;
   if(scope.horizon!=="T-24h"&&
      (native==null||p.t24_version==null)){
     tally(reasons,"NO_VERIFIED_FROZEN_T24_ANCHOR");continue;
   }
   if(native==null){
     tally(reasons,"NATIVE_T_UNVERIFIED");tUnverified++;continue;
   }
   const t=date(native,"CANDIDATE_T").getTime();
   if(t<start||t>=end){
     tally(reasons,"FLIGHT_OUTSIDE_FROZEN_WINDOW");continue;
   }
   if(scope.horizon!=="T-24h"){
     const prior=date(p.t24_cutoff,"PRIOR_T24_CUTOFF").getTime();
     const stored=date(p.t24_created_at,"PRIOR_T24_CREATED").getTime();
     if(stored>prior||prior!==t-OFFSET["T-24h"]){
       tally(reasons,"NO_VERIFIED_FROZEN_T24_ANCHOR");continue;
     }
   }
   const cutoff=t-OFFSET[scope.horizon];
   const member=p.member_available==null?NaN:date(p.member_available,
     "MEMBER_AVAILABLE").getTime();
   // A member clock later than this DB snapshot is not yet knowable,
   // even if its claimed timestamp precedes a future flight cutoff.
   if(!Number.isFinite(member)||member<source||member>now.getTime()){
     tally(reasons,"SOURCE_OR_MEMBER_CLOCK_INVALID");continue;
   }
   const effective=Math.max(source,member);
   if(effective>cutoff){
     tally(reasons,"OBSERVATION_AFTER_FLIGHT_CUTOFF");continue;
   }
   if(cutoff-effective>scope.maxPopulationStalenessSeconds*1000){
     tally(reasons,"POPULATION_TOO_STALE");continue;
   }
   candidates++;
   // This is ONLY a time-window candidate. Native T semantics, source
   // retention rights, external physical operating identity and actual
   // durable PRE are not certified by this read-only function.
   if(now.getTime()<cutoff-180_000){
     tally(reasons,"PREDICTION_CUTOFF_NOT_YET_DUE");continue;
   }
   if(now.getTime()+2_000>cutoff){
     tally(reasons,"PRE_COMMIT_CUTOFF_PASSED");continue;
   }
   due++;
 }
 return {reasons,physical,candidates,due,tUnverified};
}
/**
 * Intentionally no PRE insert, source GET, rights extension or release path.
 * The caller supplies a real restricted SELECT-only pool and an exact bound
 * source digest. A hash/flag never makes unknown legal permissions valid.
 */
export async function readP5OneBoundSourceFlightPreCandidates(
 pool:Pick<Pool,"connect">,s:P5Stage10ReadScope
):Promise<P5Stage10Readback>{
 assertScope(s);
 if(!pool||typeof pool.connect!=="function")hold("RESTRICTED_READER_POOL_MISSING");
 const c=await pool.connect();
 let inTx=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");inTx=true;
  await c.query("SET LOCAL statement_timeout='8000ms'");
  await c.query("SET LOCAL lock_timeout='2000ms'");
  const who=(await c.query("SELECT current_database() AS db,current_user AS role,"+
   "current_setting('transaction_read_only') AS ro,"+
   "clock_timestamp() AS at,pg_is_in_recovery() AS replica")).rows;
  if(who.length!==1||who[0].db!=="neondb"||
    who[0].role!==s.expectedReaderRole||who[0].ro!=="on"||
    who[0].replica!==false)
    hold("UNVERIFIED_EXACT_READER_ROLE_OR_DB");
  const now=date(who[0].at,"DB_CLOCK");
  const sources=(await c.query(P5_STAGE10_BOUND_SOURCE_SQL,[
    s.expectedQueryDigestSha256,s.expectedManifestSha256])).rows;
  if(sources.length!==1)hold("NO_SINGLE_AUTHENTIC_BOUND_SOURCE");
  const h=obj(sources[0]);
  if(h.query_digest!==s.expectedQueryDigestSha256||
    h.manifest_sha256!==s.expectedManifestSha256||
    Number(h.run_day_index)!==s.runDayIndex||
    h.slot_id!==s.slot||h.horizon!==s.horizon||
    h.airport_icao!==s.airportIcao||
    h.rights_review_sha256!==s.expectedRightsReviewSha256||
    h.bound_rights!==s.expectedRightsReviewSha256||
    h.attempt_run_id!==h.github_run_id||
    h.state==="PREPARED"||
    h.bound_hash!==h.source_hash||
    h.raw_current!==true||
    !h.population_query_id)
    hold("BOUND_SOURCE_IDENTITY_OR_CUSTODY_INCOMPLETE");
  const reserved=date(h.reserved_at,"RESERVED_AT").getTime(),
    retrieved=date(h.fids_retrieval_utc,"RETRIEVAL").getTime(),
    persisted=date(h.raw_persisted_at_utc,"PERSISTED").getTime(),
    available=date(h.source_available,"AVAILABLE").getTime(),
    expires=date(h.source_expires_at_utc,"RIGHTS_EXPIRY").getTime();
  if(reserved>retrieved||retrieved>persisted||
    persisted>available||available>now.getTime()||
    expires<=now.getTime()||
    expires>available+23*3_600_000)
    hold("CLOCK_ORDER_OR_SOURCE_EXPIRED");
  const members=(await c.query(P5_STAGE10_BOUND_MEMBERS_SQL,[
    h.population_query_id,s.expectedFrameSha256])).rows.map(obj);
  const total=integer(h.normalized_members_count,"MEMBER_DENOMINATOR");
  if(members.length!==total||members.length>10000)
    hold("ORIGINAL_POPULATION_DENOMINATOR_CHANGED");
  const a=auditMembers(members,h,s,now);
  await c.query("COMMIT");inTx=false;
  return {
   schema:"v39.phase5.stage10.bound-original-flight-pre-asof-candidates.v1",
   status:"READONLY_CANDIDATES_NOT_PRE_OR_FREEZE",
   asOfDatabaseUtc:now.toISOString(),runDayIndex:s.runDayIndex,
   slot:s.slot,horizon:s.horizon,queryDigestSha256:s.expectedQueryDigestSha256,
   boundOriginalVerified:true,sourceObservationCount:total,
   candidatePhysicalLegCount:a.physical,
   sourceAsOfCandidates:a.candidates,
   potentiallyDuePreCandidates:a.due,unverifiedSourceTCount:a.tUnverified,
   reasons:a.reasons,
   databaseWrites:0,providerCalls:0,preSnapshotsWritten:0,
   operatingLegSemanticsCertified:false,
   legalPurposeAndRetentionCertified:false,
   scientificFlightLevelPreCertified:false,
   finalPhase5FreezePassed:false,phase6PaidGo:false
  };
 }catch(e){if(inTx)await c.query("ROLLBACK").catch(()=>{});throw e;}
 finally{c.release();}
}
