/**
 * One explicit nonpaid GitHub-only PG16 SOURCE-to-flight-PRE candidate
 * inspection, not a signer or worker. Only existing restricted SOURCE
 * credential, verified by successful real GH run #42443811669 (Nov 8).
 * The user's Nov 12 Neon catalog proved PRE has NO source-original SELECT,
 * while SOURCE has SELECT on the exact source and population tables.
 *
 * It reuses the Stage14 exact bound SOURCE SQL, discovers ALL (<=2500)
 * normalized members from that real SOURCE population query, and audits
 * each member's native scheduled T against actual DB clock and own cutoff.
 * Prints only aggregate statistics and SHA; candidate IDs/Contents are
 * NOT printed or written to workflow artifacts here. No paid Phase6 GO.
 */
import {Pool} from "pg";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {makeP5Stage28DedicatedRolePool,P5_STAGE28_GROUPS}
 from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";
import {P5_STAGE14_BOUND_SOURCE_SQL}
 from "../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39";
import {P5_ACTUAL_SOURCE_ALL_MEMBERS_READONLY_SQL,
 auditP5ActualSourceFlightCandidates,digestP5ActualSourceCandidateAudit,
 type P5ActualSourceCandidateScope,
 type P5ActualSourceCandidateAudit,
 type P5ActualBoundOriginalRow,
 type P5ActualFlightPopulationRow}
 from "../server/lib/disruption/phase5ActualSourceNativeFlightCandidateAudit_v39";

const SHA=/^[a-f0-9]{64}$/;
const CODE=/^[a-f0-9]{40}$/;
const GH=/^[0-9]{5,25}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const hold=(s:string):never=>{
 throw Error("REFUSED_P5_ACTUAL_NATIVE_CANDIDATE_READONLY_"+s);
};
export function admitP5ActualNativeSourceReviewEnv(env:NodeJS.ProcessEnv){
 if(env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||
    env.GITHUB_EVENT_NAME!=="workflow_dispatch"||
    env.GITHUB_RUN_ATTEMPT!=="1"||
    !CODE.test(env.GITHUB_SHA??"")||
    env.GITHUB_SHA!==env.V39_P5_ACTUAL_NATIVE_REVIEW_APPROVED_CODE_SHA||
    env.P5_ACTUAL_NATIVE_SOURCE_READONLY_CONFIRM!==
      "REVIEW_ONLY_ACTUAL_BOUND_SOURCE_NATIVE_FLIGHT_CANDIDATES_NO_GO"||
    env.V39_P5_ACTUAL_NATIVE_REVIEW_OWNER_APPROVED!=="1"||
    env.V39_PHASE5_SOURCE_RIGHTS_APPROVED!=="1"||
    env.ADB_AUTO_COLLECT!=="0"||env.AERODATABOX_API_KEY||
    env.AERODATABOX_WEBHOOK_SECRET||
    env.DATABASE_URL||env.V39_DATABASE_RUNTIME_URL||
    env.P5_V39_PRE_DATABASE_URL||
    env.P5_V39_T24_WITNESS_DATABASE_URL||
    env.P5_V39_OTHER_REST_REVIEW_DATABASE_URL||
    env.P5_V39_OTHER_REST_RESERVE_DATABASE_URL||
    env.V39_PHASE6_PROCESS_ARMED!=="0"||
    !GH.test(env.V39_P5_ACTUAL_SOURCE_GITHUB_RUN_ID??""))
  hold("MAIN_REVIEW_ONLY_RIGHTS_OR_SOURCE_RUN_NOT_SIGNED");
 const hashes=[
  env.V39_P5_MANIFEST_SHA256,env.V39_P5_QUERY_DIGEST,
  env.V39_P5_RELEASE_SHA256,env.V39_P5_RIGHTS_SHA256,
  env.V39_P5_PROVIDER_CONTRACT_SHA256,
  env.V39_P5_ACTUAL_SOURCE_EARLY_DRAW_SHA256
 ];
 if(!hashes.every(v=>typeof v==="string"&&SHA.test(v)))
  hold("MISSING_SOURCE_QUERY_OR_EARLY_DRAW_HASH_PINS");
 const day=Number(env.P5_ACTUAL_SOURCE_RUN_DAY_INDEX??"");
 const maxAge=Number(env.P5_ACTUAL_SOURCE_MAX_STALENESS_SECONDS??"");
 const slot=env.P5_ACTUAL_SOURCE_SLOT??"";
 const horizon=env.P5_ACTUAL_SOURCE_HORIZON??"";
 const airport=env.P5_ACTUAL_SOURCE_AIRPORT_ICAO??"";
 if(!Number.isSafeInteger(day)||day<1||day>31||
    !Number.isSafeInteger(maxAge)||maxAge<1||maxAge>86400||
    !["HUB","MID_A","MID_B","REGIONAL"].includes(slot)||
    !["T-24h","T-6h","T-90m"].includes(horizon)||
    !/^[A-Z]{4}$/.test(airport))
  hold("FUTURE_SELECTED_SOURCE_AIRPORT_DAY_OR_HORIZON_NOT_REVIEWED");
 let url:URL;
 try{url=new URL(env.V39_P5_SOURCE_DATABASE_URL??"");}
 catch{return hold("RESTRICTED_SOURCE_LOGIN_MISSING");}
 if(!["postgres:","postgresql:"].includes(url.protocol)||
    decodeURIComponent(url.username)!=="phase5_p5_source_login_20261108"||
    !url.password||!url.hostname||url.pathname!=="/neondb"||url.hash)
  hold("SOURCE_NATIVE_REVIEW_CANNOT_USE_APPLICATION_OR_OTHER_ROLE");
 const scope:P5ActualSourceCandidateScope={
  manifestSha256:env.V39_P5_MANIFEST_SHA256!,
  queryDigestSha256:env.V39_P5_QUERY_DIGEST!,
  reviewedReleaseSha256:env.V39_P5_RELEASE_SHA256!,
  rightsReviewSha256:env.V39_P5_RIGHTS_SHA256!,
  providerContractSha256:env.V39_P5_PROVIDER_CONTRACT_SHA256!,
  earlyDrawSha256:env.V39_P5_ACTUAL_SOURCE_EARLY_DRAW_SHA256!,
  runDayIndex:day,slot,horizon:horizon as P5ActualSourceCandidateScope["horizon"],
  airportIcao:airport,
  expectedSourceGithubRunId:env.V39_P5_ACTUAL_SOURCE_GITHUB_RUN_ID!,
  maxPopulationStalenessSeconds:maxAge
 };
 return{scope,connectionString:env.V39_P5_SOURCE_DATABASE_URL!};
}
export interface P5PgReadonlyClient{
 query(sql:string,args?:unknown[]):Promise<{
  rowCount:number|null;rows:Record<string,unknown>[]
 }>;
 release():void;
}
export interface P5PgReadonlyPool{
 connect():Promise<P5PgReadonlyClient>;
}
export async function auditP5RealSourceToNativeFlightCandidatesReadonly(
 pool:P5PgReadonlyPool,scope:P5ActualSourceCandidateScope
):Promise<P5ActualSourceCandidateAudit>{
 if(!pool||typeof pool.connect!=="function")
  hold("UNVERIFIED_RESTRICTED_PG_POOL");
 const client=await pool.connect();
 let tx=false;
 try{
  await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  tx=true;
  await client.query("SET LOCAL statement_timeout='15000ms'");
  await client.query("SET LOCAL lock_timeout='2000ms'");
  const who=await client.query(
   "SELECT current_user AS actor,session_user AS session_login,"+
   "current_database() AS db,"+
   "current_setting('transaction_read_only') AS ro,"+
   "pg_is_in_recovery() AS replica,clock_timestamp() AS now");
  if(who.rowCount!==1||who.rows[0]?.actor!==P5_STAGE28_GROUPS.source||
    who.rows[0]?.session_login!=="phase5_p5_source_login_20261108"||
    who.rows[0]?.db!=="neondb"||who.rows[0]?.ro!=="on"||
    who.rows[0]?.replica!==false)
   hold("ACTUAL_PG16_SOURCE_ONLY_READONLY_IDENTITY_UNVERIFIED");
  const original=await client.query(P5_STAGE14_BOUND_SOURCE_SQL,
    [scope.manifestSha256,scope.queryDigestSha256]);
  if(original.rowCount!==1||original.rows.length!==1)
   hold("SOURCE_ORIGINAL_ABSENT_OR_AMBIGUOUS_NO_BACKFILL");
  const source=original.rows[0];
  const id=source.population_query_id;
  if(typeof id!=="string"||!UUID.test(id))
   hold("SOURCE_ORIGINAL_INVALID_POPULATION_QUERY_ID");
  const members=await client.query(
   P5_ACTUAL_SOURCE_ALL_MEMBERS_READONLY_SQL,[id]);
  if(members.rows.length>2500)
   hold("SOURCE_POPULATION_EXCEEDS_REVIEW_CAP_NO_SILENT_TRUNCATION");
  const report=auditP5ActualSourceFlightCandidates(
   scope,original.rows as unknown as P5ActualBoundOriginalRow[],
   members.rows as unknown as P5ActualFlightPopulationRow[],
   who.rows[0].now as Date|string);
  await client.query("ROLLBACK");tx=false;
  return report;
 }catch(e){
  if(tx)await client.query("ROLLBACK").catch(()=>{});
  throw e;
 }finally{client.release();}
}
export async function runP5ActualSourceNativeCandidateOwner(
 env:NodeJS.ProcessEnv
){
 const approved=admitP5ActualNativeSourceReviewEnv(env);
 const raw=new Pool({
  connectionString:approved.connectionString,max:1,
  connectionTimeoutMillis:8000,idleTimeoutMillis:1500,
  application_name:"p5_actual_native_candidate_readonly"
 });
 try{
  const scoped=makeP5Stage28DedicatedRolePool(raw,{
   group:"source",reviewedDedicatedLogin:"phase5_p5_source_login_20261108",
   forbiddenApplicationLogin:"phase5_runtime_application_login"
  });
  const audit=await auditP5RealSourceToNativeFlightCandidatesReadonly(
   scoped as unknown as P5PgReadonlyPool,approved.scope);
  // Intentionally redacted. A fingerprint is NOT an independently signed
  // flight-level packet and must never be passed to the PRE writer as one.
  return{
   schema:"v39.phase5.actual-native-flight-candidate-aggregate-owner.v1" as const,
   status:"NONPAID_REAL_SOURCE_REVIEW_NOT_SIGNED_PACKET" as const,
   candidateAuditSha256:
    digestP5ActualSourceCandidateAudit(audit),
   aggregate:{
    actualDbClockUtc:audit.actualDbClockUtc,
    runDayIndex:approved.scope.runDayIndex,
    horizon:approved.scope.horizon,
    observedMemberCount:audit.observedMemberCount,
    candidateCount:audit.candidateCount,
    censoredCount:audit.censoredCount,
    classifications:audit.classifications
   },
   flightIdentitiesPrinted:0 as const,
   providerContentsPrinted:false as const,
   rawProviderPayloadPrinted:false as const,
   databaseWrites:0 as const,providerCalls:0 as const,
   signedPrePacketsCreated:0 as const,
   sourceRightsCertifierHere:false as const,
   phase5ScientificFreezeGrantedHere:false as const,
   phase6PaidGoGrantedHere:false as const
  };
 }finally{await raw.end().catch(()=>{});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 runP5ActualSourceNativeCandidateOwner(process.env)
  .then(x=>console.log(JSON.stringify(x)))
  .catch(e=>{
   const msg=e instanceof Error?e.message:"";
   console.error(/^REFUSED_P5_ACTUAL_(?:SOURCE_CANDIDATES|NATIVE_CANDIDATE_READONLY)_[A-Z0-9_]+$/.test(msg)?
    msg:"REFUSED_P5_ACTUAL_NATIVE_CANDIDATE_UNVERIFIED_OR_AMBIGUOUS_HOLD");
   process.exitCode=2;
  });
}
