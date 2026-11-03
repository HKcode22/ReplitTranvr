/**
 * Disposable PostgreSQL16 proof: synthetic FIDS raw-first + normalization
 * + exact precommitted V0076 attempt + V0077 binding share ONE transaction.
 * No real provider, production credentials, live release, or timed owner.
 */
import pg from "pg";
import {createHash} from "node:crypto";
import {
 fetchFidsPopulation,utcIntervalToLocal
} from "../server/lib/disruption/fidsCensus_v3";
import {getV39Pool} from "../server/lib/disruption/db_v39";
import {persistP4G5BoundFidsDbOnlyV39} from
 "../server/lib/disruption/phase4Gate5AtomicBoundSourceV39";

const URL="postgresql://postgres:postgres@localhost:5432/v39_ci?sslmode=disable";
const sha=(x:string)=>createHash("sha256").update(x).digest("hex");
const iso=(v:number)=>new Date(v).toISOString();
const fixed=(c:string)=>c.repeat(64);
const countSql=[
 "SELECT (SELECT count(*)::int FROM clean.fids_query_response) AS originals,",
 "(SELECT count(*)::int FROM clean.flight_population) AS population,",
 "(SELECT count(*)::int FROM clean.phase4_g5_fids_original_binding_v39) AS bindings"
].join(" ");
function context(){
 const e=process.env;
 if(e.GITHUB_ACTIONS!=="true"||e.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    !["pull_request","push"].includes(e.GITHUB_EVENT_NAME??"")||
    e.GITHUB_JOB!=="atomic-original-disposable-pg16"||
    e.GITHUB_WORKFLOW!=="Phase4 Gate5 Atomic Original V0077 Disposable PG16"||
    e.GITHUB_RUN_ATTEMPT!=="1"||
    e.DATABASE_URL!==URL||e.V39_DATABASE_RUNTIME_URL!==URL||
    !!e.AERODATABOX_API_KEY||!!e.RAPIDAPI_KEY||
    !!e.GATE05_AUTOMATION_DATABASE_URL)
   throw Error("P4_G5_ATOMIC_DISPOSABLE_CONTEXT_HOLD");
}
async function expectHold(fn:()=>Promise<unknown>,needle:string){
 try{await fn()}catch(e){
  if(e instanceof Error&&e.message.includes(needle))return;
  throw Error("P4_G5_ATOMIC_WRONG_REFUSAL");
 }
 throw Error("P4_G5_ATOMIC_FAIL_OPEN");
}
export async function main(){
 context();
 const base=Math.floor(Date.now()/60000)*60000;
 const start=base+26*3600000;
 const end=start+3600000;
 const planned=base-3*60000;
 const latest=base+15*60000;
 const cutoff=start-24*3600000;
 const committed=base-60000;
 const shaManifest=fixed("a"),owner=fixed("b"),qdigest=fixed("c");
 const reviewed=fixed("d"),rights=fixed("e");
 const runId="1234567890123";
 const reservation=sha([shaManifest,owner,qdigest,"1"].join("|"));
 const sourceExpiry=iso(base+20*3600000);
 const local=utcIntervalToLocal(new Date(start),new Date(end),"Asia/Singapore");
 const client=new pg.Client({connectionString:URL,connectionTimeoutMillis:8000,
  query_timeout:10000});
 await client.connect();
 try{
  // Fixture-only: pre-HTTP reservation already committed and paid budget
  // journal exists. The producer may NEVER fake this insert in production.
  await client.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ WRITE");
  await client.query(
   "INSERT INTO clean.phase4_g5_fids_cohort_budget_v39("+
   "manifest_sha256,cohort_id,project_unit_ceiling,reserved_units) "+
   "VALUES($1,'WSSS_ATOMIC_DISPOSABLE_ONLY',18,2)",[shaManifest]);
  await client.query(
   "INSERT INTO clean.phase4_g5_fids_physical_owner_v39("+
   "owner_digest,manifest_sha256,horizon,github_run_id,"+
   "reviewed_authorization_sha256,actual_github_runner_started_at_utc,"+
   "verified_prearm_deadline_utc,first_planned_dispatch_utc,"+
   "last_planned_dispatch_utc,hard_owner_expires_at_utc,state) "+
   "VALUES($1,$2,'T-24h',$3,$4,$5,$6,$7,$7,$8,'ACTIVE')",
   [owner,shaManifest,runId,reviewed,iso(base-60*60000),
    iso(base-20*60000),iso(planned),iso(base+30*60000)]);
  await client.query(
   "INSERT INTO clean.phase4_g5_fids_allowed_query_v39("+
   "query_digest,owner_digest,query_index,planned_dispatch_utc,"+
   "hard_latest_dispatch_utc,prediction_cutoff_utc,"+
   "max_physical_attempts,last_reserved_attempt) "+
   "VALUES($1,$2,0,$3,$4,$5,1,1)",
   [qdigest,owner,iso(planned),iso(latest),iso(cutoff)]);
  await client.query(
   "INSERT INTO clean.phase4_g5_fids_physical_attempt_v39("+
   "expected_reservation_sha256,owner_digest,query_digest,github_run_id,"+
   "physical_attempt_number,charged_reserved_units,committed_at_utc) "+
   "VALUES($1,$2,$3,$4,1,2,$5)",
   [reservation,owner,qdigest,runId,iso(committed)]);
  await client.query("COMMIT");
  const raw={
   departures:[{id:"synthetic-flight-pg16",
    number:"SQ 123",codeshareStatus:"IsOperator",
    isCargo:false,isPrivate:false,isCharter:false,
    departure:{scheduledTime:{utc:iso(start+12*60000)},
     airport:{icao:"WSSS",iata:"SIN"}},
    arrival:{scheduledTime:{utc:iso(start+9*3600000)},
     airport:{icao:"YSSY",iata:"SYD"}}}],
   arrivals:[]
  };
  const bytes=Buffer.from(JSON.stringify(raw));
  const body={representation:
    "FETCH_DECODED_RESPONSE_BODY_BYTES_NOT_HTTP_WIRE" as const,
    sha256:sha(bytes.toString("utf8")),
    byteLength:bytes.length,base64:bytes.toString("base64")};
  const fakeFetch=async()=>({...raw,originalDecodedBody:body}) as any;
  const params={
   airportIcao:"WSSS",fromLocal:local.fromLocal,toLocal:local.toLocal,
   ianaTimezone:"Asia/Singapore",withCancelled:true,withCodeshared:true,
   withCargo:false,withPrivate:false,direction:"Departure" as const,
   serviceWindowStartUtc:new Date(start),serviceWindowEndUtc:new Date(end),
   cutoffUtc:new Date(cutoff),providerApiVersion:"1.15.4.0",
   fidsProtocolVersion:"v3.9-f.8",openapiSha256:fixed("f"),
   restCategory:"validation" as const
  };
  const binding={
   manifestSha256:shaManifest,horizon:"T-24h" as const,
   expectedOwnerGithubRunId:runId,
   reviewedRunAuthorizationSha256:reviewed,queryDigest:qdigest,
   expectedReservationSha256:reservation,rightsReviewArtifactSha256:rights,
   sourceUseExpiresAtUtc:sourceExpiry,expectedAirportIcao:"WSSS",
   expectedServiceStartUtc:iso(start),expectedServiceEndUtc:iso(end),
   expectedFromLocal:local.fromLocal,expectedToLocal:local.toLocal
  };
  const persist=(b:typeof binding)=>async (q:any,rows:any[])=>{
   const result=await persistP4G5BoundFidsDbOnlyV39(q,rows,b);
   if(result.originalBound!==true||result.normalizedRowsInserted!==rows.length)
    throw Error("P4_G5_ATOMIC_DISPOSABLE_SOURCE_INCOMPLETE");
   return result.normalizedRowsInserted;
  };
  // Inject wrong query digest. Raw and normalized rows MUST ROLLBACK too.
  await expectHold(()=>fetchFidsPopulation(params,{
   fetchAirport:fakeFetch,persist:persist({...binding,queryDigest:fixed("9")})
  }),"P4_G5_V0077_ORIGINAL_OWNER_NOT_ACTIVE_OR_COMMITTED_HOLD");
  const empty=await client.query(countSql);
  if(empty.rows[0]?.originals!==0||
     empty.rows[0]?.population!==0||empty.rows[0]?.bindings!==0)
   throw Error("P4_G5_ATOMIC_DISPOSABLE_PARTIAL_ROLLBACK_HOLD");
  const accepted=await fetchFidsPopulation(params,{
   fetchAirport:fakeFetch,persist:persist(binding)
  });
  if(!accepted||accepted.persistedPopulationRows!==1||
    accepted.flightCount!==1)
   throw Error("P4_G5_ATOMIC_DISPOSABLE_SOURCE_NO_OPERATING_MEMBER");
  const joined=await client.query(
   "SELECT f.response_hash,b.original_response_sha256,"+
   "count(m.population_member_id)::int AS members "+
   "FROM clean.fids_query_response f "+
   "JOIN clean.phase4_g5_fids_original_binding_v39 b "+
   "ON b.population_query_id=f.population_query_id "+
   "LEFT JOIN clean.flight_population m "+
   "ON m.population_query_id=f.population_query_id "+
   "WHERE f.population_query_id=$1 "+
   "GROUP BY f.response_hash,b.original_response_sha256",
   [accepted.populationQueryId]);
  if(joined.rows.length!==1||joined.rows[0].members!==1||
    joined.rows[0].response_hash!==joined.rows[0].original_response_sha256)
   throw Error("P4_G5_ATOMIC_DISPOSABLE_FINAL_SOURCE_HASH_PARITY_HOLD");
  // Same one-use V0076 reservation cannot bind another original response.
  await expectHold(()=>fetchFidsPopulation(params,{
   fetchAirport:fakeFetch,persist:persist(binding)
  }),"duplicate key value violates unique constraint");
  const final=await client.query(countSql);
  if(final.rows[0].originals!==1||final.rows[0].population!==1||
    final.rows[0].bindings!==1)
   throw Error("P4_G5_ATOMIC_DISPOSABLE_REPLAY_CHANGED_POPULATION_HOLD");
  console.log(JSON.stringify({
   status:"P4_G5_V0077_RAW_NORMALIZED_BINDING_ATOMIC_REAL_PG16_PASS",
   syntheticFidsSource:true,onePhysicalSyntheticOperatingObservation:true,
   originalNormalizedAndV0077SameCommit:true,
   invalidAttemptRolledBackAllThree:true,
   replayAgainstIrreversibleAttemptRolledBack:true,
   normalizedRows:final.rows[0].population,
   providerCalls:0,productionDatabaseWrites:0,
   providerNativeSelectedTVerified:false,retentionRightsVerified:false,
   strictGate5Passed:false,phase5FreezeAuthorized:false,
   phase6Authorized:false
  }));
 }finally{
  await client.end().catch(()=>undefined);
  await getV39Pool().end().catch(()=>undefined);
 }
}
if(process.argv[1]?.endsWith(
 "v39_phase4_gate5_atomic_bound_source_disposable_pg16_actions.ts"
))void main().catch(()=>{
 console.error("P4_G5_V0077_ATOMIC_DISPOSABLE_REAL_PG16_HOLD_NO_PROVIDER");
 process.exitCode=2;
});
