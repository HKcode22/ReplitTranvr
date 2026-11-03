/**
 * Gate5 original producer custody boundary, DB-ONLY (not a paid collector).
 *
 * Future GitHub producer: authenticate a frozen manifest, actual runner,
 * source Content rights, native T and physical scope OUTSIDE this method;
 * reserve/COMMIT a V0076 physical attempt BEFORE HTTP; then pass the genuine
 * FIDS observation to this atomic source+normalized+V0077 transaction.
 * No GitHub workflow imports this module; live release remains NULL.
 *
 * The database V0077 trigger validates reservation/original/cutoff clocks.
 * A caller-supplied rights SHA is a pointer, NOT legal authorization.
 */
import {createHash} from "node:crypto";
import type {FidsQueryObservation,PopulationRow} from "./fidsCensus_v3";
import {persistFidsObservation} from "./fidsCensus_v3";

const SHA=/^[0-9a-f]{64}$/;
const RUN=/^[0-9]{5,25}$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const H=["T-24h","T-6h","T-90m"] as const;
const DAY=86400000;
/** Hard no-live-release until independent evidence and least-privilege review. */
export const P4_G5_ATOMIC_FIDS_PRODUCER_RELEASE_SHA_V39:string|null=null;
export interface P4G5OriginalBindingScopeV39 {
 manifestSha256:string;
 horizon:typeof H[number];
 expectedOwnerGithubRunId:string;
 reviewedRunAuthorizationSha256:string;
 queryDigest:string;
 expectedReservationSha256:string;
 rightsReviewArtifactSha256:string;
 sourceUseExpiresAtUtc:string;
 expectedAirportIcao:string;
 expectedServiceStartUtc:string;
 expectedServiceEndUtc:string;
 expectedFromLocal:string;
 expectedToLocal:string;
}
function exactMs(raw:string,label:string){
 if(typeof raw!=="string"||!ISO.test(raw)||
    !Number.isFinite(Date.parse(raw))||
    new Date(raw).toISOString()!==raw)
  throw Error("P4_G5_V0077_BOUND_SOURCE_INVALID_UTC_"+label);
 return Date.parse(raw);
}
export function requireP4G5AtomicFidsLiveReleaseV39(
 manifestSha256:string
){
 if(P4_G5_ATOMIC_FIDS_PRODUCER_RELEASE_SHA_V39===null||
    manifestSha256!==P4_G5_ATOMIC_FIDS_PRODUCER_RELEASE_SHA_V39)
  throw Error("P4_G5_V0077_FIDS_LIVE_PRODUCER_NOT_REVIEWED_HOLD");
}
export function assertP4G5AtomicOriginalBindingScopeV39(
 query:FidsQueryObservation,rows:PopulationRow[],
 b:P4G5OriginalBindingScopeV39
){
 if(!b||![b.manifestSha256,b.reviewedRunAuthorizationSha256,
   b.queryDigest,b.expectedReservationSha256,b.rightsReviewArtifactSha256,
   query?.responseHash].every(x=>typeof x==="string"&&SHA.test(x))||
    !H.includes(b.horizon)||!RUN.test(b.expectedOwnerGithubRunId)||
    !/^[A-Z]{4}$/.test(b.expectedAirportIcao)||
    !query||query.queryDirection!=="Departure"||
    query.sourceAirportIcao!==b.expectedAirportIcao||
    query.serviceWindowStartUtc.toISOString()!==b.expectedServiceStartUtc||
    query.serviceWindowEndUtc.toISOString()!==b.expectedServiceEndUtc||
    query.fromLocal!==b.expectedFromLocal||query.toLocal!==b.expectedToLocal||
    !Array.isArray(rows)||rows.length>30000)
  throw Error("P4_G5_V0077_FIDS_SOURCE_SCOPE_OR_OWNER_HOLD");
 const expiration=exactMs(b.sourceUseExpiresAtUtc,"EXPIRY");
 const start=exactMs(b.expectedServiceStartUtc,"START");
 const end=exactMs(b.expectedServiceEndUtc,"END");
 const retrieved=query.fidsRetrievalUtc.getTime();
 const initiallyAvailable=query.availableAtUtc.getTime();
 if(end<=start||end-start>4*3600000||
    !Number.isFinite(retrieved)||!Number.isFinite(initiallyAvailable)||
    initiallyAvailable<retrieved||expiration<=initiallyAvailable||
    expiration>initiallyAvailable+DAY)
  throw Error("P4_G5_V0077_FIDS_CLOCK_OR_TTL_HOLD");
 if(rows.some(r=>r.populationQueryId!==query.populationQueryId||
    r.responseHash!==query.responseHash||r.sourceType!=="fids"||
    r.queryDirection!=="Departure"||
    r.sourceAirportIcao!==b.expectedAirportIcao||
    r.windowStartUtc.getTime()!==start||
    r.windowEndUtc.getTime()!==end))
  throw Error("P4_G5_V0077_NORMALIZED_SOURCE_MISMATCH_HOLD");
 // Source custody requires the original *decoded response body* evidence.
 // The legacy reconstructed JSON alone cannot substitute for provider bytes.
 const envelope=query.rawPayload as Record<string,unknown>|null;
 const evidence=envelope?.originalDecodedEntityBodyEvidence as
  Record<string,unknown>|null;
 if(!envelope||Array.isArray(envelope)||
    envelope.originalDecodedEntityBodyPreserved!==true||
    envelope.originalHttpWireBytesPreserved!==false||
    !evidence||evidence.representation!==
     "FETCH_DECODED_RESPONSE_BODY_BYTES_NOT_HTTP_WIRE"||
    typeof evidence.bodyBase64!=="string"||
    typeof evidence.bodySha256!=="string"||
    !SHA.test(evidence.bodySha256)||
    !Number.isSafeInteger(evidence.bodyLengthBytes)||
    Number(evidence.bodyLengthBytes)<1||
    Number(evidence.bodyLengthBytes)>4*1024*1024)
  throw Error("P4_G5_V0077_ORIGINAL_DECODED_BYTES_UNVERIFIED_HOLD");
 const bytes=Buffer.from(evidence.bodyBase64,"base64");
 if(bytes.length!==evidence.bodyLengthBytes||
    bytes.toString("base64")!==evidence.bodyBase64||
    createHash("sha256").update(bytes).digest("hex")!==evidence.bodySha256)
  throw Error("P4_G5_V0077_ORIGINAL_DECODED_BYTES_SHA_HOLD");
 return {expiration,start,end};
}
export const P4_G5_V0077_COMMITTED_ATTEMPT_READ_SQL_V39=[
 "SELECT a.committed_at_utc,q.prediction_cutoff_utc,",
 "o.state,o.reviewed_authorization_sha256,",
 "o.github_run_id,ow.manifest_sha256",
 "FROM clean.phase4_g5_fids_physical_attempt_v39 a",
 "JOIN clean.phase4_g5_fids_allowed_query_v39 q",
 "ON q.query_digest=a.query_digest",
 "JOIN clean.phase4_g5_fids_physical_owner_v39 o",
 "ON o.owner_digest=q.owner_digest",
 "JOIN clean.phase4_g5_fids_cohort_budget_v39 ow",
 "ON ow.manifest_sha256=o.manifest_sha256",
 "WHERE a.expected_reservation_sha256=$1",
 "AND a.query_digest=$2 AND o.manifest_sha256=$3",
 "AND o.horizon=$4 AND a.github_run_id=$5",
 "AND o.github_run_id=$5 AND o.reviewed_authorization_sha256=$6",
 "AND a.owner_digest=o.owner_digest"
].join(" ");
export const P4_G5_V0077_INSERT_ORIGINAL_BINDING_SQL_V39=[
 "INSERT INTO clean.phase4_g5_fids_original_binding_v39(",
 "population_query_id,expected_reservation_sha256,query_digest,",
 "manifest_sha256,original_response_sha256,",
 "rights_review_artifact_sha256,source_use_expires_at_utc)",
 "VALUES($1::uuid,$2,$3,$4,$5,$6,$7::timestamptz)",
 "RETURNING population_query_id"
].join(" ");
export const P4_G5_V0077_VERIFY_ATOMIC_SOURCE_SQL_V39=[
 "SELECT b.original_response_sha256,f.response_hash,",
 "f.available_at,b.source_use_expires_at_utc,",
 "count(m.population_member_id)::int AS normalized_count",
 "FROM clean.phase4_g5_fids_original_binding_v39 b",
 "JOIN clean.fids_query_response f",
 "ON f.population_query_id=b.population_query_id",
 "LEFT JOIN clean.flight_population m",
 "ON m.population_query_id=f.population_query_id",
 "WHERE b.population_query_id=$1::uuid",
 "AND b.manifest_sha256=$2",
 "GROUP BY b.original_response_sha256,f.response_hash,",
 "f.available_at,b.source_use_expires_at_utc"
].join(" ");
/**
 * DB-ONLY. The future live caller must independently invoke a code-pinned
 * release gate; this method DOES NOT authorize a provider GET, content rights,
 * or certification of a selected T / physical operating flight.
 */
export async function persistP4G5BoundFidsDbOnlyV39(
 query:FidsQueryObservation,rows:PopulationRow[],
 b:P4G5OriginalBindingScopeV39
){
 assertP4G5AtomicOriginalBindingScopeV39(query,rows,b);
 let verifiedBound=false;
 const inserted=await persistFidsObservation(query,rows,async (db,facts)=>{
  // Runs after raw + all normalized rows, BEFORE source transaction COMMIT.
  const reservations=await db.query(P4_G5_V0077_COMMITTED_ATTEMPT_READ_SQL_V39,[
   b.expectedReservationSha256,b.queryDigest,b.manifestSha256,
   b.horizon,b.expectedOwnerGithubRunId,b.reviewedRunAuthorizationSha256
  ]);
  const attempt=reservations.rows[0];
  if(reservations.rows.length!==1||attempt?.state!=="ACTIVE"||
    attempt?.manifest_sha256!==b.manifestSha256||
    attempt?.github_run_id!==b.expectedOwnerGithubRunId)
   throw Error("P4_G5_V0077_ORIGINAL_OWNER_NOT_ACTIVE_OR_COMMITTED_HOLD");
  const committed=new Date(attempt.committed_at_utc).getTime();
  const cutoff=new Date(attempt.prediction_cutoff_utc).getTime();
  const durable=new Date(facts.durableAvailableAt).getTime();
  const expire=exactMs(b.sourceUseExpiresAtUtc,"EXPIRY");
  if(!Number.isFinite(committed)||!Number.isFinite(cutoff)||
    !Number.isFinite(durable)||committed>query.fidsRetrievalUtc.getTime()||
    durable>cutoff||expire<=durable||expire>durable+DAY)
   throw Error("P4_G5_V0077_ORIGINAL_RETENTION_OR_CUTOFF_HOLD");
  const bound=await db.query(P4_G5_V0077_INSERT_ORIGINAL_BINDING_SQL_V39,[
   query.populationQueryId,b.expectedReservationSha256,b.queryDigest,
   b.manifestSha256,query.responseHash,b.rightsReviewArtifactSha256,
   b.sourceUseExpiresAtUtc
  ]);
  if(bound.rowCount!==1||bound.rows.length!==1||
    String(bound.rows[0].population_query_id)!==query.populationQueryId)
   throw Error("P4_G5_V0077_ORIGINAL_BINDING_NOT_INSERTED_HOLD");
  const readback=await db.query(P4_G5_V0077_VERIFY_ATOMIC_SOURCE_SQL_V39,[
   query.populationQueryId,b.manifestSha256
  ]);
  const r=readback.rows[0];
  if(readback.rows.length!==1||
    r.original_response_sha256!==query.responseHash||
    r.response_hash!==query.responseHash||
    Number(r.normalized_count)!==facts.normalizedInsertedRows||
    new Date(r.available_at).getTime()>cutoff||
    new Date(r.source_use_expires_at_utc).getTime()!==expire)
   throw Error("P4_G5_V0077_ORIGINAL_ATOMIC_READBACK_HOLD");
  verifiedBound=true;
 });
 if(!verifiedBound)throw Error("P4_G5_V0077_ORIGINAL_TRANSACTION_NOT_VERIFIED_HOLD");
 return {
  schema:"v39.phase4.gate5-v0077-original-normalized-atomic-db-only.v1" as const,
  status:"ORIGINAL_NORMALIZED_AND_V0077_BOUND_SAME_DB_COMMIT_NOT_LIVE_AUTHORIZED" as const,
  populationQueryId:query.populationQueryId,
  originalResponseSha256:query.responseHash,
  originalBound:true as const,
  normalizedRowsInserted:inserted,
  providerCallsMadeByThisMethod:0 as const,
  authorizesProviderRequest:false as const,
  sourceLegalRightsIndependentlyVerified:false as const,
  firstProviderNativeSelectedTIndependentlyVerified:false as const,
  physicalOperatingFlightDenominatorCertified:false as const,
  scientificGate5Passed:false as const,
  phase5FreezeAuthorized:false as const,
  phase6Authorized:false as const
 };
}
