/**
 * Phase5 Amendment E: existing restricted SOURCE owner reads a V0079
 * original + unique same-flight normalized member and invokes the pure
 * original FIDS feature compiler WITHOUT a paid GET or PRE insert.
 *
 * Owner's Nov12 live role-catalog audit: SOURCE already has SELECT on all
 * five required tables; PREPARE has only allowed-query SELECT. Never give
 * PREPARE raw Content access, assume broader grants, or run as neondb_owner.
 * The SOURCE worker must use the existing Stage28 group:source dedicated
 * login adapter, and this function enforces a repeatable-read READ ONLY TX.
 * Any unavailable/expired original or permission mismatch fails closed.
 */
import {
 P5_STAGE14_BOUND_SOURCE_SQL,P5_STAGE14_PHYSICAL_MEMBER_SQL
} from "./phase5V0079SingleBoundFlightPreWriter_v39";
import {P5_STAGE28_GROUPS}
 from "./phase5Stage28DedicatedRolePool_v39";
import {compileP5AmendmentEFidsOriginalFeaturesV39}
 from "./phase5AmendmentEFidsOriginalFeatureCompiler_v39";
/** Exact SOURCE-only dedicated login commissioned separately from Stage30.
 * Reuse the identity already pinned in the genuine V0079 SOURCE worker. */
export const P5_E_V0079_SOURCE_READONLY_LOGIN_V39=
 "phase5_p5_source_login_20261108" as const;
const SHA=/^[0-9a-f]{64}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
function hold(code:string):never{
 throw Error("REFUSED_P5_E_V0079_ORIGINAL_READONLY_"+code);
}
function time(v:unknown):number{
 const d=v instanceof Date?v:typeof v==="string"?new Date(v):null;
 if(!d||!Number.isFinite(d.getTime()))hold("UNVERIFIED_DATABASE_CLOCK");
 return d.getTime();
}
function exact(v:unknown):number{
 if(typeof v!=="string"||!UTC.test(v)||
    new Date(v).toISOString()!==v)hold("UNVERIFIED_SOURCE_ISSUE_UTC");
 return Date.parse(v);
}
export const P5_E_READONLY_ORIGINAL_MEMBER_SQL=[
 "SELECT r.raw_payload,r.response_hash AS stored_response_hash,",
 "r.raw_expired_at_utc,r.raw_persisted_at_utc,",
 "b.decoded_original_body_sha256,b.rights_review_sha256 AS binding_rights,",
 "b.source_expires_at_utc,",
 "p.provider_record_key,p.flight_number,p.dep_airport_icao,",
 "p.arr_airport_icao,p.dep_scheduled_utc,p.available_at AS member_available_at,",
 "p.canonical_flight_instance_id,p.analytic_identity_id,",
 "p.population_query_id,p.response_hash AS member_response_hash,",
 "p.provider_content_expired_at_utc,",
 "p.codeshare_resolution_status,p.scope_classification,p.population_role",
 "FROM clean.phase5_fids_original_binding_v39 b",
 "JOIN clean.fids_query_response r ON r.population_query_id=b.population_query_id",
 "JOIN clean.flight_population p ON p.population_query_id=b.population_query_id",
 "WHERE b.manifest_sha256=$1 AND b.query_digest=$2",
 "AND p.analytic_identity_id=$3",
 "AND r.raw_payload IS NOT NULL",
 "AND r.raw_expired_at_utc IS NULL",
 "AND p.provider_content_expired_at_utc IS NULL",
 "ORDER BY p.id LIMIT 3"
].join(" ");
export interface P5EReadOnlyPgClient{
 query(sql:string,params?:unknown[]):Promise<{rows:Record<string,unknown>[];rowCount?:number|null}>;
 release():void;
}
export interface P5EReadOnlyPgPool{
 connect():Promise<P5EReadOnlyPgClient>;
}
export interface P5EV0079BoundFeatureReadScope{
 manifestSha256:string;queryDigestSha256:string;
 flightInstanceId:string;
 expectedPopulationQueryId:string;
 expectedResponseSha256:string;
 expectedRightsReviewSha256:string;
 expectedSelectedNativeTUtc:string;
 expectedForecastCutoffUtc:string;
 expectedOriginIcao:string;
 /** Already independently authenticated (not created by this function). */
 externalContentUseReviewSha256:string;
}
export async function compileP5EOneBoundOriginalReadonly(
 pool:P5EReadOnlyPgPool,s:P5EV0079BoundFeatureReadScope
):Promise<{
 schema:"v39.phase5.e-readonly-bound-original-feature-compiler.v1";
 status:"EXACT_SOURCE_COVERED_FEATURE_PACKET_DRAFT_NOT_SIGNED";
 bundle:ReturnType<typeof compileP5AmendmentEFidsOriginalFeaturesV39>["bundle"];
 evidencedFidsFields:number;missingFidsFields:string[];
 phase5ScientificFreezePassed:false;phase6PaidGo:false;
 sourceRightsAuthenticatedHere:false;
 providerCalls:0;dbWrites:0;
}>{
 if(!s||![s.manifestSha256,s.queryDigestSha256,
   s.expectedResponseSha256,s.expectedRightsReviewSha256,
   s.externalContentUseReviewSha256].every(x=>SHA.test(x??""))||
    !UUID.test(s.expectedPopulationQueryId??"")||
    !/^leg:[a-zA-Z0-9:|._-]{5,196}$/.test(s.flightInstanceId??"")||
    !/^[A-Z]{4}$/.test(s.expectedOriginIcao??"")||
    typeof pool?.connect!=="function")
  hold("UNREVIEWED_BOUND_SOURCE_SCOPE");
 const target=time(s.expectedSelectedNativeTUtc);
 const cutoff=exact(s.expectedForecastCutoffUtc);
 if(target<=cutoff)hold("FROZEN_TARGET_NOT_FUTURE");
 const c=await pool.connect();
 let began=false;
 try{
  await c.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  began=true;
  await c.query("SET LOCAL statement_timeout='12000ms'");
  await c.query("SET LOCAL lock_timeout='2000ms'");
  const who=(await c.query(
   "SELECT current_user AS actor,session_user AS session_login,"+
   "current_database() AS db,"+
   "current_setting('server_version_num')::integer AS version,"+
   "current_setting('transaction_read_only') AS ro,"+
   "pg_is_in_recovery() AS replica,clock_timestamp() AS now"
  )).rows;
  if(who.length!==1||who[0].db!=="neondb"||
     who[0].actor!==P5_STAGE28_GROUPS.source||
     who[0].session_login!==P5_E_V0079_SOURCE_READONLY_LOGIN_V39||
     Number(who[0].version)<160000||
     who[0].ro!=="on"||who[0].replica!==false)
   hold("NOT_EXISTING_RESTRICTED_READONLY_SOURCE_ROLE");
  const dbNow=time(who[0].now);
  if(dbNow>=cutoff)hold("CUTOFF_ALREADY_MISSED_NO_FEATURE_BACKFILL");
  const o=(await c.query(P5_STAGE14_BOUND_SOURCE_SQL,[
   s.manifestSha256,s.queryDigestSha256])).rows;
  const m=(await c.query(P5_STAGE14_PHYSICAL_MEMBER_SQL,[
   s.expectedPopulationQueryId,s.flightInstanceId])).rows;
  const f=(await c.query(P5_E_READONLY_ORIGINAL_MEMBER_SQL,[
   s.manifestSha256,s.queryDigestSha256,s.flightInstanceId])).rows;
  if(o.length!==1||m.length!==1||f.length!==1)
   hold("ORIGINAL_OR_OPERATING_MEMBER_NOT_UNIQUE");
  const src=o[0],member=m[0],raw=f[0];
  if(src.state!=="ACTIVE"||
     src.manifest_sha256!==s.manifestSha256||
     src.original_response_hash!==s.expectedResponseSha256||
     src.fids_response_hash!==s.expectedResponseSha256||
     src.fids_airport_icao!==s.expectedOriginIcao||
     src.bound_rights!==s.expectedRightsReviewSha256||
     src.rights_review_sha256!==s.expectedRightsReviewSha256||
     src.original_current!==true||
     src.population_query_id!==s.expectedPopulationQueryId||
     Number(src.normalized_members_count)<1||
     member.population_query_id!==s.expectedPopulationQueryId||
     member.analytic_identity_id!==s.flightInstanceId||
     member.canonical_flight_instance_id!==s.flightInstanceId||
     member.codeshare_resolution_status!=="confirmed_operating_leg"||
     member.scope_classification!=="confirmed_core"||
     member.population_role!=="requested_airport_primary"||
     member.source_type!=="fids"||
     member.response_hash!==s.expectedResponseSha256||
     member.dep_airport_icao!==s.expectedOriginIcao||
     time(member.dep_scheduled_utc)!==target||
     raw.analytic_identity_id!==s.flightInstanceId||
     raw.canonical_flight_instance_id!==s.flightInstanceId||
     raw.member_response_hash!==s.expectedResponseSha256||
     raw.stored_response_hash!==s.expectedResponseSha256||
     raw.binding_rights!==s.expectedRightsReviewSha256||
     raw.provider_content_expired_at_utc!==null||
     raw.raw_expired_at_utc!==null||
     raw.population_query_id!==s.expectedPopulationQueryId||
     raw.codeshare_resolution_status!=="confirmed_operating_leg"||
     raw.scope_classification!=="confirmed_core"||
     raw.population_role!=="requested_airport_primary"||
     raw.dep_airport_icao!==s.expectedOriginIcao||
     time(raw.dep_scheduled_utc)!==target||
     time(raw.member_available_at)!==time(member.available_at))
   hold("V0079_ORIGINAL_NORMALIZED_IDENTITY_OR_LICENSE_DRIFT");
  if(time(src.source_expires_at_utc)<=dbNow||
     time(src.source_expires_at_utc)<=cutoff||
     time(raw.source_expires_at_utc)<=cutoff||
     time(raw.source_expires_at_utc)>time(src.source_available)+24*3600_000||
     time(raw.raw_persisted_at_utc)>dbNow||
     time(raw.raw_persisted_at_utc)<dbNow-24*3600_000||
     time(src.source_available)>time(member.available_at)||
     time(member.available_at)>dbNow)
   hold("SOURCE_NOT_DURABLE_ACTIVE_AND_BEFORE_CUTOFF");
  const compiled=compileP5AmendmentEFidsOriginalFeaturesV39({
   rawPayload:raw.raw_payload,
   persistedResponseHash:s.expectedResponseSha256,
   expectedBoundV0079ResponseHash:s.expectedResponseSha256,
   expectedDecodedOriginalBodySha256:
    String(raw.decoded_original_body_sha256??""),
   populationQueryId:s.expectedPopulationQueryId,
   flightInstanceId:s.flightInstanceId,
   providerRecordKey:String(raw.provider_record_key??""),
   normalizedOperatingFlightNumber:String(raw.flight_number??""),
   originalSelectedDepartureUtc:new Date(target).toISOString(),
   normalizedOriginIcao:s.expectedOriginIcao,
   normalizedDestinationIcao:String(raw.arr_airport_icao??""),
   normalizedAvailableAtUtc:new Date(time(member.available_at)).toISOString(),
   externallyReviewedSourceAndContentsSha256:
    s.externalContentUseReviewSha256
  });
  await c.query("COMMIT");began=false;
  return{
   schema:"v39.phase5.e-readonly-bound-original-feature-compiler.v1",
   status:"EXACT_SOURCE_COVERED_FEATURE_PACKET_DRAFT_NOT_SIGNED",
   bundle:compiled.bundle,
   evidencedFidsFields:compiled.evidencedFidsFields,
   missingFidsFields:compiled.missingFidsFields,
   sourceRightsAuthenticatedHere:false,providerCalls:0,dbWrites:0,
   phase5ScientificFreezePassed:false,phase6PaidGo:false
  };
 }catch(e){
  if(began)await c.query("ROLLBACK").catch(()=>{});
  throw e;
 }finally{c.release();}
}
