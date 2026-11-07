/**
 * STAGED Phase5 source owner V0079: actual PostgreSQL-scoped budget and
 * original FIDS custody ports for phase5ScopedFidsSourceBridge_v39.
 *
 * NOT scheduled; NO production migration/grants/GO. This code never creates
 * a provider request itself. The caller must supply one restricted, exact V39
 * database pool plus its separately reviewed provider transport.
 */
import { createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import {
  persistFidsObservation,
  type FidsQueryObservation,
  type PopulationRow,
} from "./fidsCensus_v3";
import type {
  P5SourcePorts, P5SourceSingleQueryPlan, P5PhysicalReservation,
  P5OriginalCommit,
} from "./phase5ScopedFidsSourceBridge_v39";

const SHA=/^[0-9a-f]{64}$/;
const RUN_ID=/^[0-9]{5,25}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hash=(s:string)=>createHash("sha256").update(s).digest("hex");
function refuse(code:string):never{throw Error("REFUSED_PHASE5_V0079_SCOPED_DB_"+code);}
function asUtc(value:unknown):string {
 const d=value instanceof Date?value:new Date(String(value));
 if(!Number.isFinite(d.getTime()))refuse("DB_TIMESTAMP");
 return d.toISOString();
}
export interface P5V0079SourceDbContext {
  plan:P5SourceSingleQueryPlan;
  manifestSha256:string;
  exactQueryDigest:string;
  githubRunId:string;
  /** Caller must supply a dedicated V39 source role Pool, not the app pool. */
  scopedPool:Pool;
  /** Only the separately reviewed GitHub source runner supplies transport. */
  fetchImpl:typeof fetch;
}
const QUERY_SELECT=[
 "SELECT q.query_digest,q.manifest_sha256,q.run_day_index,q.query_key,",
 "q.slot_id,q.horizon,q.airport_icao,q.early_draw_sha256,",
 "q.reviewed_release_sha256,q.rights_review_sha256,",
 "q.provider_contract_sha256,q.github_run_id,",
 "q.service_window_start_utc,q.service_window_end_utc,",
 "q.from_local,q.to_local,q.airport_iana_timezone,",
 "q.provider_api_version,q.fids_protocol_version,",
 "q.planned_dispatch_utc,q.prediction_cutoff_utc,",
 "q.api_units_per_attempt,q.max_physical_attempts,q.state,",
 "d.calendar_hash,d.config_hash,d.frame_hash",
 " FROM clean.phase5_fids_allowed_query_v39 q",
 " JOIN clean.phase5_fids_day_budget_v39 d",
 " ON d.manifest_sha256=q.manifest_sha256",
 " AND d.run_day_index=q.run_day_index",
 " WHERE q.query_digest=$1 AND q.manifest_sha256=$2",
].join(" ");
function checkExactApprovedQuery(row:any,ctx:P5V0079SourceDbContext):void{
 const q=ctx.plan.acquisition,p=ctx.plan;
 if(!row||row.query_digest!==ctx.exactQueryDigest||
  row.manifest_sha256!==ctx.manifestSha256||
  Number(row.run_day_index)!==q.runDayIndex||
  row.query_key!==q.queryKey||
  row.slot_id!==q.slot||row.horizon!==q.horizon||
  row.airport_icao!==q.icao||
  row.early_draw_sha256!==p.expectedEarlyDrawSha256||
  row.reviewed_release_sha256!==p.reviewedReleaseSha256||
  row.rights_review_sha256!==p.reviewedProviderRightsSha256||
  row.provider_contract_sha256!==p.openapiSha256||
  row.github_run_id!==ctx.githubRunId||
  row.from_local!==p.localFrom||row.to_local!==p.localTo||
  row.airport_iana_timezone!==p.ianaTimezone||
  row.provider_api_version!==p.providerApiVersion||
  row.fids_protocol_version!==p.fidsProtocolVersion||
  row.calendar_hash!==p.day.calendarHash||
  row.config_hash!==p.day.configHash||
  row.frame_hash!==p.day.frameHash||
  asUtc(row.service_window_start_utc)!==q.serviceWindowStartUtc||
  asUtc(row.service_window_end_utc)!==q.serviceWindowEndUtc||
  asUtc(row.planned_dispatch_utc)!==q.scheduledRequestUtc||
  asUtc(row.prediction_cutoff_utc)!==q.earliestPlannedCutoffUtc||
  Number(row.api_units_per_attempt)!==2||
  Number(row.max_physical_attempts)!==1||
  row.state!=="ACTIVE")
  refuse("FROZEN_QUERY_OR_SELECTION_CHANGED");
}
export function validateP5V0079SourceDbContext(ctx:P5V0079SourceDbContext):void{
 if(!ctx||!ctx.plan||!ctx.scopedPool||
  typeof ctx.scopedPool.query!=="function"||
  typeof ctx.scopedPool.connect!=="function"||
  typeof ctx.fetchImpl!=="function"||
  ![ctx.manifestSha256,ctx.exactQueryDigest].every(x=>SHA.test(x))||
  !RUN_ID.test(ctx.githubRunId))
  refuse("NO_EXACT_SIGNED_SCOPED_ROLE");
}
async function readQuery(
 ctx:P5V0079SourceDbContext,
 client?:PoolClient,
):Promise<void>{
 const res=client?
  await client.query(QUERY_SELECT,[ctx.exactQueryDigest,ctx.manifestSha256]):
  await ctx.scopedPool.query(QUERY_SELECT,[ctx.exactQueryDigest,ctx.manifestSha256]);
 if(res.rowCount!==1)refuse("SOURCE_QUERY_NOT_INSTALLED");
 checkExactApprovedQuery(res.rows[0],ctx);
}
function bodyEvidence(query:FidsQueryObservation):{
 bodySha:string;
}{
 const raw=query.rawPayload as any;
 const e=raw?.originalDecodedEntityBodyEvidence;
 if(raw?.originalDecodedEntityBodyPreserved!==true||
    raw?.originalHttpWireBytesPreserved!==false||
    e?.representation!=="FETCH_DECODED_RESPONSE_BODY_BYTES_NOT_HTTP_WIRE"||
    !SHA.test(e?.bodySha256??""))
  refuse("ORIGINAL_BYTES_NOT_PROVEN");
 return {bodySha:e.bodySha256};
}

/**
 * The returned ports are used ONLY by the Stage2 source bridge.
 * There is NO implicit provider fetch, DB pool, retry or mutation here.
 */
export function createP5V0079ScopedDbPorts(ctx:P5V0079SourceDbContext):P5SourcePorts{
 validateP5V0079SourceDbContext(ctx);
 const pool=ctx.scopedPool;
 const plan=ctx.plan;
 const committed=new Set<string>();
 return {
  fetchImpl:ctx.fetchImpl,
  readDbClock:async()=>{
   const r=await pool.query("SELECT clock_timestamp() AS t");
   if(r.rowCount!==1)refuse("DB_CLOCK_READ_FAILED");
   return new Date(asUtc(r.rows[0].t));
  },
  reservePhysicalBeforeGet:async(arg)=>{
   if(arg.queryKey!==plan.acquisition.queryKey||
      arg.runDayIndex!==plan.acquisition.runDayIndex||
      arg.slot!==plan.acquisition.slot||
      arg.horizon!==plan.acquisition.horizon||
      arg.icao!==plan.acquisition.icao||
      arg.sourceReleaseSha256!==plan.reviewedReleaseSha256||
      arg.earlyDrawSha256!==plan.expectedEarlyDrawSha256||
      arg.attemptNumber!==1||arg.units!==2)
    refuse("WRONG_PHYSICAL_QUERY_INTENT");
   if(committed.size!==0)refuse("SAME_WORKER_DOUBLE_RESERVATION");
   await readQuery(ctx);
   const expected=hash([
     ctx.manifestSha256,ctx.exactQueryDigest,ctx.githubRunId,"1"
   ].join("|"));
   // This SELECT mutates the *restricted* DB through a locked stored function.
   // pg's standalone query transaction must return/COMMIT before HTTP GET.
   const r=await pool.query(
    "SELECT clean.reserve_phase5_fids_physical_get_v39($1,$2,$3,$4,$5,$6) AS committed_at",
    [ctx.manifestSha256,ctx.exactQueryDigest,ctx.githubRunId,
     plan.expectedEarlyDrawSha256,plan.reviewedProviderRightsSha256,expected],
   );
   if(r.rowCount!==1||!r.rows[0].committed_at)refuse("PHYSICAL_COMMIT_NOT_CONFIRMED");
   const a=await pool.query([
    "SELECT reservation_sha256,query_digest,manifest_sha256,github_run_id,",
    "physical_attempt_number,charged_reserved_units,committed_at_utc",
    "FROM clean.phase5_fids_physical_attempt_v39",
    "WHERE reservation_sha256=$1"
   ].join(" "),[expected]);
   if(a.rowCount!==1||a.rows[0].reservation_sha256!==expected||
      a.rows[0].query_digest!==ctx.exactQueryDigest||
      a.rows[0].manifest_sha256!==ctx.manifestSha256||
      a.rows[0].github_run_id!==ctx.githubRunId||
      Number(a.rows[0].physical_attempt_number)!==1||
      Number(a.rows[0].charged_reserved_units)!==2||
      asUtc(a.rows[0].committed_at_utc)!==asUtc(r.rows[0].committed_at))
    refuse("PHYSICAL_POSTCOMMIT_READBACK_FAILED_NO_DISPATCH");
   committed.add(expected);
   return {
    reservationSha256:expected,
    queryKey:arg.queryKey,runDayIndex:arg.runDayIndex,
    icao:arg.icao,maxUnits:2,attemptNumber:1
   } satisfies P5PhysicalReservation;
  },
  commitOriginalAndPopulation:async(arg):Promise<P5OriginalCommit>=>{
   if(committed.size!==1||!committed.has(arg.physical.reservationSha256)||
      arg.rightsReviewSha256!==plan.reviewedProviderRightsSha256||
      !UUID.test(arg.sourceQuery.populationQueryId))
    refuse("UNKNOWN_PHYSICAL_OR_SOURCE_ORIGINAL");
   const body=bodyEvidence(arg.sourceQuery);
   // Source-derived Content expiry is a maximum bound, not a license.
   const expires=new Date(arg.expectedExpiresAtUtc);
   if(!Number.isFinite(expires.getTime()))refuse("EXPIRY_INVALID");
   let hooked=false;
   const inserted=await persistFidsObservation(
    arg.sourceQuery,arg.normalizedRows,
    async(client,facts)=>{
      if(hooked)refuse("DUPLICATE_ATOMIC_SOURCE_BINDING");
      hooked=true;
      await readQuery(ctx,client); // query could have changed during GET
      if(facts.normalizedInsertedRows!==arg.normalizedRows.length)
       refuse("POPULATION_PARTIAL_OR_WRONG_COUNT");
      const r=await client.query(
       [
        "INSERT INTO clean.phase5_fids_original_binding_v39(",
        "population_query_id,reservation_sha256,query_digest,",
        "manifest_sha256,response_hash,decoded_original_body_sha256,",
        "rights_review_sha256,normalized_members_count,source_expires_at_utc)",
        "VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING bound_at_utc"
       ].join(" "),
       [arg.sourceQuery.populationQueryId,arg.physical.reservationSha256,
        ctx.exactQueryDigest,ctx.manifestSha256,arg.sourceQuery.responseHash,
        body.bodySha,plan.reviewedProviderRightsSha256,
        arg.normalizedRows.length,expires.toISOString()],
      );
      if(r.rowCount!==1)refuse("ORIGINAL_BINDING_MISSING_INSIDE_ATOMIC_TX");
    },
    pool,
   );
   if(!hooked||inserted!==arg.normalizedRows.length)
    refuse("ORIGINAL_CUSTODY_ROLLBACK_OR_MISSING");
   // Promise resolved only after persistFidsObservation's COMMIT.
   const check=await pool.query([
    "SELECT b.population_query_id,b.reservation_sha256,b.response_hash,",
    "b.decoded_original_body_sha256,b.normalized_members_count,",
    "b.source_expires_at_utc,r.available_at,r.response_hash AS source_hash",
    "FROM clean.phase5_fids_original_binding_v39 b",
    "JOIN clean.fids_query_response r USING(population_query_id)",
    "WHERE b.population_query_id=$1 AND b.reservation_sha256=$2"
   ].join(" "),[arg.sourceQuery.populationQueryId,arg.physical.reservationSha256]);
   if(check.rowCount!==1)refuse("POSTCOMMIT_SOURCE_BINDING_UNAVAILABLE");
   const a=check.rows[0];
   if(a.reservation_sha256!==arg.physical.reservationSha256||
      a.response_hash!==arg.sourceQuery.responseHash||
      a.source_hash!==arg.sourceQuery.responseHash||
      a.decoded_original_body_sha256!==body.bodySha||
      Number(a.normalized_members_count)!==inserted)
    refuse("POSTCOMMIT_ORIGINAL_DIGEST_MISMATCH");
   return {
    persisted:true,reservationSha256:a.reservation_sha256,
    sourcePopulationQueryId:String(a.population_query_id),
    sourceResponseHash:String(a.response_hash),
    originalDecodedBodySha256:String(a.decoded_original_body_sha256),
    normalizedRowsPersisted:inserted,
    sourceAvailableAtUtc:asUtc(a.available_at),
    retentionExpiryUtc:asUtc(a.source_expires_at_utc),
   };
  },
 };
}
