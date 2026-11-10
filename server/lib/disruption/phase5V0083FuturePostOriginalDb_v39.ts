/**
 * Phase5 future OUTCOME one-GET: V0083 physical UTC REST reservation and
 * actual same-source FIDS original custody. This is a REAL PG adapter, not
 * another synthetic approval. NOT a workflow, an approved source-use license,
 * a signed reviewed-call installer, or an automatic paid owner.
 *
 * Independent reviewed-call insertion + isolated REST reserve login/grants,
 * actual Phase6 auth, provider source rights and exact source POST frame are
 * necessary; absent privileges, this code MUST refuse, not fall back to app DB.
 */
import {createHash} from "node:crypto";
import type {Pool,PoolClient} from "pg";
import {persistFidsObservation,type FidsQueryObservation,
 type PopulationRow} from "./fidsCensus_v3";
const H=/^[0-9a-f]{64}$/,G=/^[0-9]{5,25}$/,ICAO=/^[A-Z]{4}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const fail=(why:string):never=>{throw Error("REFUSED_P5_FUTURE_POST_V0083_"+why);};
const utc=(s:unknown):string=>{
 if(typeof s!=="string"||!UTC.test(s)||!Number.isFinite(Date.parse(s))||
    new Date(s).toISOString()!==s)fail("INVALID_UTC");
 return s as string;
};
const sqlClock=(d:unknown):string=>{
 const v=d instanceof Date?d:new Date(String(d));
 if(!Number.isFinite(v.getTime()))fail("NO_ACTUAL_DATABASE_CLOCK");
 return v.toISOString();
};
const sha=(x:string)=>createHash("sha256").update(x).digest("hex");
const dbUtcDate=(value:unknown):string=>{
 const d=value instanceof Date?value.toISOString().slice(0,10):
  typeof value==="string"&&/^\d{4}-\d\d-\d\d$/.test(value)?
    value:"";
 if(!/^\d{4}-\d\d-\d\d$/.test(d)||
    !Number.isFinite(Date.parse(d+"T00:00:00.000Z"))||
    new Date(d+"T00:00:00.000Z").toISOString().slice(0,10)!==d)
  fail("INVALID_ACTUAL_PHYSICAL_UTC_CHARGE_DATE");
 return d;
};
export interface P5ReviewedFuturePostOneGet {
 schema:"v39.phase5.future-post-reviewed-outcome-one-get.v1";
 manifestSha256:string;
 requestSha256:string;
 githubRunId:string;
 reviewedSourceRightsSha256:string;
 reviewedProviderPriceSha256:string;
 reviewedCategoryBudgetSha256:string;
 reviewedRequestContextSha256:string;
 reviewedProviderContractSha256:string;
 reviewedFrameSha256:string;
 runDayIndex:number;
 slot:"HUB"|"MID_A"|"MID_B"|"REGIONAL";
 airportIcao:string;
 flightInstanceId:string;
 expectedSelectedTNativeUtc:string;
 plannedSourceFromUtc:string;
 plannedSourceToUtc:string;
 fromLocal:string;toLocal:string;airportIanaTimezone:string;
 postDispatchEarliestUtc:string;
 postDispatchHardLatestUtc:string;
 expectedApiUnitsPerGet:2;
 independentFuturePostRequestAndRightsReview:true;
}
export function p5V0083FuturePostReservationSha256(
 p:Pick<P5ReviewedFuturePostOneGet,
 "manifestSha256"|"requestSha256"|"githubRunId"|
 "expectedApiUnitsPerGet"|"reviewedSourceRightsSha256"|
 "reviewedProviderPriceSha256">
):string {
 if(![p?.manifestSha256,p?.requestSha256,
  p?.reviewedSourceRightsSha256,p?.reviewedProviderPriceSha256].every(x=>
    typeof x==="string"&&H.test(x))||
    !G.test(p.githubRunId)||p.expectedApiUnitsPerGet!==2)
  fail("UNREVIEWED_RESERVATION_DIGEST_INPUT");
 return sha([p.manifestSha256,p.requestSha256,p.githubRunId,
  String(p.expectedApiUnitsPerGet),p.reviewedSourceRightsSha256,
  p.reviewedProviderPriceSha256].join("|"));
}
export function verifyP5FuturePostReviewedFrame(p:P5ReviewedFuturePostOneGet){
 if(!p||p.schema!=="v39.phase5.future-post-reviewed-outcome-one-get.v1"||
    ![p.manifestSha256,p.requestSha256,p.reviewedSourceRightsSha256,
      p.reviewedProviderPriceSha256,p.reviewedCategoryBudgetSha256,
      p.reviewedRequestContextSha256,p.reviewedProviderContractSha256,
      p.reviewedFrameSha256].every(
        x=>typeof x==="string"&&H.test(x))||
    !G.test(p.githubRunId??"")||
    !Number.isInteger(p.runDayIndex)||p.runDayIndex<1||
    p.runDayIndex>31||
    !["HUB","MID_A","MID_B","REGIONAL"].includes(p.slot)||
    !ICAO.test(p.airportIcao??"")||
    typeof p.flightInstanceId!=="string"||
    !/^[a-zA-Z0-9_.:|-]{5,200}$/.test(p.flightInstanceId)||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(p.fromLocal??"")||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(p.toLocal??"")||
    typeof p.airportIanaTimezone!=="string"||
    p.airportIanaTimezone.length<3||p.airportIanaTimezone.length>60||
    p.expectedApiUnitsPerGet!==2||
    p.independentFuturePostRequestAndRightsReview!==true)
  fail("MISSING_REVIEWED_POST_SOURCE_QUERY");
 const t=Date.parse(utc(p.expectedSelectedTNativeUtc));
 const from=Date.parse(utc(p.plannedSourceFromUtc)),
 to=Date.parse(utc(p.plannedSourceToUtc));
 const start=Date.parse(utc(p.postDispatchEarliestUtc)),
 end=Date.parse(utc(p.postDispatchHardLatestUtc));
 if(from>=to||to-from>6*3600000||t<from||t>=to||
    start<t||start>end||end-start>30*60000||
    p.postDispatchEarliestUtc.slice(0,10)!==
      p.postDispatchHardLatestUtc.slice(0,10))
  fail("POST_SOURCE_WINDOW_NOT_PROSPECTIVE_OR_BOUNDED");
 return {reservedSha256:p5V0083FuturePostReservationSha256(p),
  chargeDateUtc:p.postDispatchEarliestUtc.slice(0,10),
  t,from,to,start,end};
}
export interface P5ActualV0083PostReserved {
 schema:"v39.phase5.v0083.future-post-physical-reservation.v1";
 reservationSha256:string;requestSha256:string;
 manifestSha256:string;githubRunId:string;
 reservedAtUtc:string;physicallyChargedUtcDate:string;
 category:"OUTCOME_REST_UNIT_BUDGET";
 approvedApiUnits:2;
 physicalPaidAttemptReserved:true;
 // This is a physical attempt, not proof of provider acceptance or delivery.
 providerResponseSucceeded:false;
 providerOriginalCommitted:false;
 phase5ScientificFreezeGrantedByThisCode:false;
 phase6PaidGoGrantedByThisCode:false;
}
/**
 * The independently approved V0083 reviewed_call row must already exist
 * and bind the actual GitHub-run ID. It is NEVER inserted here. Thus the
 * original immutable source review and category plan must be prepared by
 * a distinct authorized reviewer, not self-signed by this POST worker.
 */
export async function reserveP5FuturePostV0083OnePhysicalGet(
 pool:Pick<Pool,"connect">,p:P5ReviewedFuturePostOneGet
):Promise<P5ActualV0083PostReserved>{
 const f=verifyP5FuturePostReviewedFrame(p);
 if(!pool||typeof pool.connect!=="function")fail("NO_RESTRICTED_RESERVE_POOL");
 const db:PoolClient=await pool.connect();let tx=false;
 try{
  await db.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ WRITE");
  tx=true;
  await db.query("SET LOCAL statement_timeout='12000ms'");
  await db.query("SET LOCAL lock_timeout='2000ms'");
  const session=await db.query(
   "SELECT current_user AS role,session_user AS login,"+
   "current_database() AS db,clock_timestamp() AS now,"+
   "current_setting('transaction_read_only') AS ro");
  const role=session.rows[0];
  if(session.rowCount!==1||role?.role!==
      "phase5_other_rest_reserve_prod_20261108"||
     role.db!=="neondb"||role.ro!=="off")
   fail("NOT_RESTRICTED_V0083_REST_RESERVE_ROLE");
  const now=Date.parse(sqlClock(role.now));
  if(now<f.start||now>f.end)
   fail("ACTUAL_DB_CLOCK_OUTSIDE_REVIEWED_GET_WINDOW");
  // Only OUTCOME REST, not a generic extra FIDS source/RETRY credit.
  const q=await db.query(
   "SELECT rest_category,manifest_sha256,request_sha256,"+
   " github_run_id,rights_review_sha256,provider_price_sha256,"+
   " reviewed_category_budget_sha256,reviewed_request_context_sha256,"+
   " api_units_per_get,planned_charge_day_utc,"+
   " earliest_dispatch_utc,hard_latest_dispatch_utc,source_query_digest"+
   " FROM clean.phase5_other_rest_reviewed_call_v39"+
   " WHERE request_sha256=$1 AND manifest_sha256=$2 FOR UPDATE",
   [p.requestSha256,p.manifestSha256]);
  const a=q.rows[0];
  if(q.rowCount!==1||a.rest_category!=="OUTCOME_REST_UNIT_BUDGET"||
     a.manifest_sha256!==p.manifestSha256||
     a.request_sha256!==p.requestSha256||
     a.github_run_id!==p.githubRunId||
     a.rights_review_sha256!==p.reviewedSourceRightsSha256||
     a.provider_price_sha256!==p.reviewedProviderPriceSha256||
     a.reviewed_category_budget_sha256!==p.reviewedCategoryBudgetSha256||
     a.reviewed_request_context_sha256!==p.reviewedRequestContextSha256||
     Number(a.api_units_per_get)!==2||
     a.source_query_digest!==null||
     dbUtcDate(a.planned_charge_day_utc)!==f.chargeDateUtc||
     sqlClock(a.earliest_dispatch_utc)!==p.postDispatchEarliestUtc||
     sqlClock(a.hard_latest_dispatch_utc)!==p.postDispatchHardLatestUtc)
   fail("NO_ACTUAL_IMMUTABLE_OUTCOME_REST_REVIEWED_CALL");
  const reserved=await db.query(
   "SELECT clean.reserve_phase5_other_rest_once_v39("+
   "$1,$2,$3,$4,$5,$6) AS reserved_at",
   [p.manifestSha256,p.requestSha256,p.githubRunId,
    p.reviewedSourceRightsSha256,p.reviewedProviderPriceSha256,
    f.reservedSha256]);
  if(reserved.rowCount!==1||!reserved.rows[0]?.reserved_at)
   fail("NO_DURABLE_V0083_ONE_SHOT_RESERVATION");
  const clock=sqlClock(reserved.rows[0].reserved_at);
  await db.query("COMMIT");tx=false;
  // Read BACK independently after commit. Ambiguous COMMIT never retries.
  const check=await pool.connect();
  try{
   const x=await check.query(
    "SELECT reservation_sha256,request_sha256,manifest_sha256,"+
    " rest_category,approved_api_units,github_run_id,rights_review_sha256,"+
    " provider_price_sha256,charged_utc_date,reserved_at_utc"+
    " FROM clean.phase5_other_rest_physical_reservation_v39"+
    " WHERE reservation_sha256=$1",[f.reservedSha256]);
   const v=x.rows[0];
   if(x.rowCount!==1||v.reservation_sha256!==f.reservedSha256||
      v.request_sha256!==p.requestSha256||
      v.manifest_sha256!==p.manifestSha256||
      v.rest_category!=="OUTCOME_REST_UNIT_BUDGET"||
      Number(v.approved_api_units)!==2||
      v.github_run_id!==p.githubRunId||
      v.rights_review_sha256!==p.reviewedSourceRightsSha256||
      v.provider_price_sha256!==p.reviewedProviderPriceSha256||
      dbUtcDate(v.charged_utc_date)!==f.chargeDateUtc||
      sqlClock(v.reserved_at_utc)!==clock)
    fail("POST_COMMIT_RESV_READBACK_NOT_EXACT_NO_PROVIDER");
  }finally{check.release();}
  return{
   schema:"v39.phase5.v0083.future-post-physical-reservation.v1",
   reservationSha256:f.reservedSha256,requestSha256:p.requestSha256,
   manifestSha256:p.manifestSha256,githubRunId:p.githubRunId,
   reservedAtUtc:clock,physicallyChargedUtcDate:f.chargeDateUtc,
   category:"OUTCOME_REST_UNIT_BUDGET",approvedApiUnits:2,
   physicalPaidAttemptReserved:true,providerResponseSucceeded:false,
   providerOriginalCommitted:false,
   phase5ScientificFreezeGrantedByThisCode:false,
   phase6PaidGoGrantedByThisCode:false
  };
 }catch(e){
  if(tx)await db.query("ROLLBACK").catch(()=>{});
  throw e;
 }finally{db.release();}
}
/**
 * This hook is called INSIDE persistFidsObservation's same transaction,
 * after raw source insert and all normalized population members, BEFORE
 * final COMMIT; requires narrow SELECT on V0083 reservation metadata for
 * the independent FIDS SOURCE group. A separate postcommit original
 * readback must follow. No separate V0084 schema required.
 */
export async function verifyP5FuturePostOriginalBeforeCommit(
 db:Pick<PoolClient,"query">,p:P5ReviewedFuturePostOneGet,
 reservation:P5ActualV0083PostReserved,
 source:FidsQueryObservation,rows:PopulationRow[],
 facts:{durableAvailableAt:Date;normalizedInsertedRows:number}
):Promise<void>{
 const f=verifyP5FuturePostReviewedFrame(p);
 const raw=source.rawPayload as Record<string,unknown>|null;
 const evidence=raw?.originalDecodedEntityBodyEvidence as
  Record<string,unknown>|undefined;
 if(!raw||Array.isArray(raw)||reservation.reservationSha256!==
     f.reservedSha256||reservation.requestSha256!==p.requestSha256||
    raw.phase5PostReservationSha256!==f.reservedSha256||
    raw.phase5PostPurpose!==
     "FUTURE_POST_SOURCE_OBSERVATION_NOT_AN_ACTUAL_PHYSICAL_LABEL"||
    raw.originalDecodedEntityBodyPreserved!==true||
    !evidence||!H.test(String(evidence.bodySha256??""))||
    evidence.representation!==
     "FETCH_DECODED_RESPONSE_BODY_BYTES_NOT_HTTP_WIRE"||
    source.sourceAirportIcao!==p.airportIcao||
    source.queryDirection!=="Departure"||
    source.serviceWindowStartUtc.toISOString()!==p.plannedSourceFromUtc||
    source.serviceWindowEndUtc.toISOString()!==p.plannedSourceToUtc||
    source.fromLocal!==p.fromLocal||source.toLocal!==p.toLocal||
    source.airportIanaTimezone!==p.airportIanaTimezone||
    source.openapiSha256!==p.reviewedProviderContractSha256||
    !Number.isSafeInteger(facts.normalizedInsertedRows)||
    facts.normalizedInsertedRows!==rows.length||
    rows.some(x=>x.batchId!==f.reservedSha256||
       x.populationQueryId!==source.populationQueryId||
       x.responseHash!==source.responseHash)||
    !(facts.durableAvailableAt instanceof Date)||
    !Number.isFinite(facts.durableAvailableAt.getTime())||
    source.fidsRetrievalUtc.getTime()>
      facts.durableAvailableAt.getTime())
  fail("UNBOUND_OR_PARTIAL_POST_SOURCE_ORIGINAL");
 const c=await db.query(
  "SELECT r.reservation_sha256,r.request_sha256,r.manifest_sha256,"+
  "r.rest_category,r.approved_api_units,r.github_run_id,"+
  "r.rights_review_sha256,r.provider_price_sha256,r.reserved_at_utc"+
  " FROM clean.phase5_other_rest_physical_reservation_v39 r"+
  " WHERE r.reservation_sha256=$1",[f.reservedSha256]);
 const a=c.rows[0];
 if(c.rowCount!==1||a.reservation_sha256!==f.reservedSha256||
    a.request_sha256!==p.requestSha256||
    a.manifest_sha256!==p.manifestSha256||
    a.rest_category!=="OUTCOME_REST_UNIT_BUDGET"||
    Number(a.approved_api_units)!==2||
    a.github_run_id!==p.githubRunId||
    a.rights_review_sha256!==p.reviewedSourceRightsSha256||
    a.provider_price_sha256!==p.reviewedProviderPriceSha256||
    Date.parse(sqlClock(a.reserved_at_utc))>
      source.fidsRetrievalUtc.getTime())
  fail("V0083_POST_RESERVATION_NOT_BOUND_TO_ORIGINAL_IN_SAME_TX");
}
export async function verifyP5FuturePostOriginalAfterCommit(
 pool:Pick<Pool,"connect">,p:P5ReviewedFuturePostOneGet,
 reservation:P5ActualV0083PostReserved,
 sourceQueryId:string,expectedResponseSha256:string,
 expectedMembers:number
){
 const f=verifyP5FuturePostReviewedFrame(p);
 if(!/^[a-f0-9-]{36}$/.test(sourceQueryId)||!H.test(expectedResponseSha256)||
    !Number.isSafeInteger(expectedMembers)||expectedMembers<0||
    reservation.reservationSha256!==f.reservedSha256)
  fail("INVALID_POST_COMMIT_ORIGINAL_REFERENCE");
 const db=await pool.connect();
 try{
  const q=await db.query(
   "SELECT q.population_query_id::text AS id,q.response_hash,"+
   "q.source_airport_icao,q.raw_payload,"+
   "(SELECT COUNT(*)::int FROM clean.flight_population fp"+
   " WHERE fp.population_query_id=q.population_query_id"+
   " AND fp.batch_id=$2) AS members"+
   " FROM clean.fids_query_response q WHERE q.population_query_id=$1",
   [sourceQueryId,f.reservedSha256]);
  const row=q.rows[0],raw=row?.raw_payload;
  if(q.rowCount!==1||row.id!==sourceQueryId||
     row.response_hash!==expectedResponseSha256||
     row.source_airport_icao!==p.airportIcao||
     raw?.phase5PostReservationSha256!==f.reservedSha256||
     raw?.originalDecodedEntityBodyPreserved!==true||
     Number(row.members)!==expectedMembers)
   fail("POST_COMMIT_FIDS_ORIGINAL_OR_MEMBERS_NOT_DURABLE");
  return{
   schema:"v39.phase5.future-post-original-after-v0083-reservation.v1" as const,
   status:"FUTURE_POST_ORIGINAL_COMMITTED_NOT_ACTUAL_FLIGHT_OUTCOME" as const,
   reservationSha256:f.reservedSha256,
   populationQueryId:sourceQueryId,
   normalizedMembers:expectedMembers,
   actualPhysicalDepartureCertified:false as const,
   phase6ModelLabelApproved:false as const
  };
 }finally{db.release();}
}


export interface P5FuturePostActualPreReadback {
 status:"ACTUAL_SAME_FLIGHT_SOURCE_BOUND_PRE_PARTIAL_ALLOWED";
 manifestSha256:string;
 runDayIndex:number;flightInstanceId:string;
 observedValidHorizonCount:number;
 observedValidHorizons:string[];
 missingPreHorizons:string[];
 actualSourcePREReferenceIds:string[];
 observedFromIndependentRestrictedDb:true;
 providerCalls:0;databaseWrites:0;
}
/**
 * The POST source GET is permitted for usefulness review only if its own
 * preflight CURRENT DB already has at least one truly source-bound PRE for
 * the same flight/manifest/T, committed on-time with a matching original.
 * Distinct T24/T6/T90 PRE may be absent; that is a counted loss, not an
 * experiment-wide reason to abandon a valid future observation.
 *
 * This uses SOURCE-scoped SELECT, requiring narrowly commissioned SELECT
 * on existing PRE metadata; privilege missing => refuses, never app fallback.
 */
export async function auditP5FuturePostActualPriorPre(
 pool:Pick<Pool,"connect">,p:P5ReviewedFuturePostOneGet
):Promise<P5FuturePostActualPreReadback>{
 verifyP5FuturePostReviewedFrame(p);
 const db=await pool.connect();let tx=false;
 try{
  await db.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
  await db.query("SET LOCAL statement_timeout='12000ms'");
  const who=await db.query(
   "SELECT current_user AS role,current_database() AS db,"+
   " current_setting('transaction_read_only') AS ro");
  if(who.rowCount!==1||
     who.rows[0]?.role!=="phase5_fids_source_prod_20261107"||
     who.rows[0]?.db!=="neondb"||who.rows[0]?.ro!=="on")
   fail("POST_PRE_NOT_IN_ACTUAL_RESTRICTED_SOURCE_SESSION");
  const x=await db.query(
   "SELECT s.id::text AS snapshot_id,s.horizon,"+
   " s.created_at,s.prediction_cutoff_utc,"+
   " s.selected_t_milestone_utc,s.fids_response_hash,"+
   " r.available_at AS original_available_at,"+
   " b.source_expires_at_utc,b.response_hash AS binding_response_hash"+
   " FROM clean.flight_snapshots s"+
   " JOIN clean.phase5_fids_original_binding_v39 b"+
   " ON b.population_query_id::text=s.population_query_id"+
   " JOIN clean.phase5_fids_allowed_query_v39 q"+
   " ON q.query_digest=b.query_digest"+
   " AND q.manifest_sha256=b.manifest_sha256"+
   " JOIN clean.fids_query_response r"+
   " ON r.population_query_id=b.population_query_id"+
   " AND r.response_hash=b.response_hash"+
   " JOIN clean.flight_population fp"+
   " ON fp.population_query_id=b.population_query_id"+
   " AND fp.population_member_id=s.population_member_id"+
   " AND fp.canonical_flight_instance_id=s.flight_instance_id"+
   " WHERE q.manifest_sha256=$1 AND q.run_day_index=$2"+
   " AND q.airport_icao=$3 AND s.flight_instance_id=$4"+
   " AND s.frame_hash=$5 AND s.prediction_state='PRE_DEPARTURE'"+
   " AND fp.source_airport_icao=q.airport_icao"+
   " AND fp.population_role='requested_airport_primary'"+
   " AND fp.source_type='fids'"+
   " AND fp.codeshare_resolution_status='confirmed_operating_leg'"+
   " AND fp.available_at<=s.prediction_cutoff_utc"+
   " AND fp.provider_content_expired_at_utc IS NULL"+
   " AND s.fids_response_hash=b.response_hash"+
   " AND q.horizon=s.horizon"+
   " AND s.horizon IN ('T-24h','T-6h','T-90m')",
   [p.manifestSha256,p.runDayIndex,p.airportIcao,
    p.flightInstanceId,p.reviewedFrameSha256]);
  const offsets:Record<string,number>={
   "T-24h":86400000,"T-6h":21600000,"T-90m":5400000
  };
  const t=Date.parse(p.expectedSelectedTNativeUtc);
  const valid=new Map<string,string>();
  for(const row of x.rows){
   const offset=offsets[String(row.horizon)];
   if(!offset)continue;
   const cutoff=Date.parse(sqlClock(row.prediction_cutoff_utc));
   const committed=Date.parse(sqlClock(row.created_at));
   const original=Date.parse(sqlClock(row.original_available_at));
   const expires=Date.parse(sqlClock(row.source_expires_at_utc));
   const native=Date.parse(sqlClock(row.selected_t_milestone_utc));
   if(native!==t||cutoff!==t-offset||original>cutoff||
      committed>cutoff||committed<original||committed>=expires||
      row.fids_response_hash!==row.binding_response_hash||
      !row.snapshot_id||!/^[0-9]+$/.test(String(row.snapshot_id)))continue;
   if(valid.has(row.horizon)&&valid.get(row.horizon)!==row.snapshot_id)
    fail("DUPLICATED_SOURCE_PRE_SAME_FLIGHT_HORIZON");
   valid.set(row.horizon,String(row.snapshot_id));
  }
  await db.query("ROLLBACK");tx=false;
  if(valid.size===0)fail("NO_VALID_NATIVE_T_SOURCE_PRE_FOR_THIS_POST");
  const names=["T-24h","T-6h","T-90m"];
  return{
   status:"ACTUAL_SAME_FLIGHT_SOURCE_BOUND_PRE_PARTIAL_ALLOWED",
   manifestSha256:p.manifestSha256,runDayIndex:p.runDayIndex,
   flightInstanceId:p.flightInstanceId,
   observedValidHorizonCount:valid.size,
   observedValidHorizons:names.filter(n=>valid.has(n)),
   missingPreHorizons:names.filter(n=>!valid.has(n)),
   actualSourcePREReferenceIds:names.filter(n=>valid.has(n))
    .map(n=>valid.get(n)!),
   observedFromIndependentRestrictedDb:true,
   providerCalls:0,databaseWrites:0
  };
 }catch(e){
  if(tx)await db.query("ROLLBACK").catch(()=>{});
  throw e;
 }finally{db.release();}
}


/**
 * Restricted REST REVIEW worker only: binds the true GitHub run ID to an
 * independently signed static reviewed POST request. Review and reservation
 * MUST be different dedicated login/NOLOGIN roles. No provider GET here.
 */
export async function prepareP5FuturePostV0083ReviewedCall(
 pool:Pick<Pool,"connect">,p:P5ReviewedFuturePostOneGet
):Promise<{status:"ONE_REAL_GITHUB_FUTURE_POST_CALL_PREPARED_NO_GET";
 requestSha256:string;physicalReservations:0;providerCalls:0}>{
 const f=verifyP5FuturePostReviewedFrame(p);
 if(!pool||typeof pool.connect!=="function")
  fail("NO_INDEPENDENT_OTHER_REST_REVIEW_POOL");
 const db=await pool.connect();let tx=false;
 try{
  await db.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ WRITE");
  tx=true;
  await db.query("SET LOCAL statement_timeout='12000ms'");
  await db.query("SET LOCAL lock_timeout='2000ms'");
  const session=await db.query(
   "SELECT current_database() AS db,current_user AS role,"+
   " current_setting('transaction_read_only') AS ro,"+
   " clock_timestamp() AS now");
  if(session.rowCount!==1||session.rows[0]?.db!=="neondb"||
     session.rows[0]?.role!=="phase5_other_rest_review_prod_20261108"||
     session.rows[0]?.ro!=="off")
   fail("OTHER_REST_REVIEW_ROLE_NOT_ISOLATED");
  const now=Date.parse(sqlClock(session.rows[0].now));
  if(now>f.end||now<f.start-90*60000)
   fail("REVIEW_NOT_IN_FUTURE_DISPATCH_ADMISSION_WINDOW");
  const release=await db.query(
   "SELECT reviewed_category_budget_sha256"+
   " FROM clean.phase5_fids_seven_rest_release_v39"+
   " WHERE manifest_sha256=$1",[p.manifestSha256]);
  if(release.rowCount!==1||
     release.rows[0].reviewed_category_budget_sha256!==
       p.reviewedCategoryBudgetSha256)
   fail("ACTUAL_SEVEN_REST_RELEASE_NOT_SIGNED");
  const auth=await db.query(
   "SELECT enabled,revoked_at_utc,manifest_sha256"+
   " FROM clean.adb_phase6_authorization WHERE singleton_key=true");
  if(auth.rowCount!==1||auth.rows[0]?.enabled!==true||
     auth.rows[0]?.revoked_at_utc!==null||
     auth.rows[0]?.manifest_sha256!==p.manifestSha256)
   fail("ACTUAL_SEPARATE_PHASE6_GO_DISABLED");
  const ins=await db.query(
   "INSERT INTO clean.phase5_other_rest_reviewed_call_v39("+
   "request_sha256,manifest_sha256,rest_category,source_query_digest,"+
   "planned_charge_day_utc,earliest_dispatch_utc,"+
   "hard_latest_dispatch_utc,github_run_id,rights_review_sha256,"+
   "provider_price_sha256,reviewed_request_context_sha256,"+
   "reviewed_category_budget_sha256,api_units_per_get)"+
   " VALUES($1,$2,'OUTCOME_REST_UNIT_BUDGET',NULL,"+
   "$3,$4,$5,$6,$7,$8,$9,$10,2) RETURNING request_sha256",
   [p.requestSha256,p.manifestSha256,f.chargeDateUtc,
    p.postDispatchEarliestUtc,p.postDispatchHardLatestUtc,p.githubRunId,
    p.reviewedSourceRightsSha256,p.reviewedProviderPriceSha256,
    p.reviewedRequestContextSha256,p.reviewedCategoryBudgetSha256]);
  if(ins.rowCount!==1||ins.rows[0]?.request_sha256!==p.requestSha256)
   fail("V0083_IMMUTABLE_REVIEWED_CALL_NOT_INSERTED");
  await db.query("COMMIT");tx=false;
  // A duplicate workflow cannot replace immutable reviewed-call metadata.
  const other=await pool.connect();
  try{
   const check=await other.query(
    "SELECT request_sha256,github_run_id,manifest_sha256,"+
    "rest_category,reviewed_request_context_sha256"+
    " FROM clean.phase5_other_rest_reviewed_call_v39"+
    " WHERE request_sha256=$1",[p.requestSha256]);
   if(check.rowCount!==1||
      check.rows[0].request_sha256!==p.requestSha256||
      check.rows[0].github_run_id!==p.githubRunId||
      check.rows[0].manifest_sha256!==p.manifestSha256||
      check.rows[0].rest_category!=="OUTCOME_REST_UNIT_BUDGET"||
      check.rows[0].reviewed_request_context_sha256!==
       p.reviewedRequestContextSha256)
    fail("REVIEWED_POST_CALL_POSTCOMMIT_READBACK_MISSING");
  }finally{other.release();}
  return{
   status:"ONE_REAL_GITHUB_FUTURE_POST_CALL_PREPARED_NO_GET",
   requestSha256:p.requestSha256,physicalReservations:0,providerCalls:0
  };
 }catch(e){
  if(tx)await db.query("ROLLBACK").catch(()=>{});
  throw e;
 }finally{db.release();}
}
