/**
 * Phase4 Gate5: REAL historical PostgreSQL source-as-of PRE SQL schema smoke,
 * fixed old WSSS cohort only, no PRE INSERT and no provider credentials.
 * Safe even when scientific source certainty remains HOLD. Distinct new
 * future cohorts will need their own reviewed manifest and audit runner.
 */
import pg from "pg";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {stageP4G5ScopedPreV39}
 from "../server/lib/disruption/phase4Gate5ScopedPreStaging_v39";

export const P4_G5_PRE_HIST_MANIFEST=
 "data-collection/phase4/2026-10-31_GATE5_HISTORICAL_SCHEMA_SMOKE_MANIFEST.json";
export const P4_G5_PRE_HIST_SHA=
 "c3785cfae051fd0cf4ef3dd68a3a9d8b0079c89cd34c002fe5610000ff318853";

export function requireP4G5PreHistoricalContext(env:NodeJS.ProcessEnv,
 checkedOutSha:string,sourceBytes:string){
 if(env.GITHUB_ACTIONS!=="true"||
  env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
  env.GITHUB_EVENT_NAME!=="push"||
  env.GITHUB_REF!=="refs/heads/main"||
  env.GITHUB_RUN_ATTEMPT!=="1"||
  env.GITHUB_JOB!=="historical-pre-source-sql-smoke"||
  env.GITHUB_WORKFLOW!=="Phase4 Gate5 Original-as-of PRE Source SQL Read-Only Smoke"||
  env.GITHUB_WORKFLOW_REF!=="HKcode22/ReplitTranvr/.github/workflows/phase4-gate5-scoped-pre-original-sql-readonly.yml@refs/heads/main"||
  env.P4_PRE_HIST_SMOKE_INTENT!=="OCT31_SOURCE_ASOF_ONLY_NO_PROVIDER"||
  !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA??"")||
  env.GITHUB_SHA!==checkedOutSha||
  !!env.AERODATABOX_API_KEY||!!env.RAPIDAPI_KEY||
  !!env.DATABASE_URL||!!env.V39_DATABASE_RUNTIME_URL)
   throw Error("P4_G5_PRE_HIST_EVENT_OR_SOURCE_SECRET_HOLD");
 if(createHash("sha256").update(sourceBytes,"utf8").digest("hex")!==
    P4_G5_PRE_HIST_SHA)
   throw Error("P4_G5_PRE_HIST_SOURCE_MANIFEST_MUTATED");
 let m:Record<string,unknown>;
 try{m=JSON.parse(sourceBytes);}catch{
  throw Error("P4_G5_PRE_HIST_SOURCE_MANIFEST_PARSE_HOLD");
 }
 if(m.mode!=="HISTORICAL_SOURCE_SCHEMA_SMOKE_ONLY"||
  m.airportIcao!=="WSSS"||
  m.serviceWindowStartUtc!=="2026-10-31T17:00:00.000Z"||
  m.serviceWindowEndUtc!=="2026-10-31T18:00:00.000Z"||
  m.sourceOriginalT6h!=="UNOBSERVED"||
  m.sourceOriginalT24h!=="UNOBSERVED_AS_OF_FIXED_CUTOFF"||
  m.phase5FreezeAuthorized!==false||m.phase6Authorized!==false)
   throw Error("P4_G5_PRE_HIST_SCOPE_NOT_FIXED");
}
export async function mainP4G5PreHistoricalSqlSmoke(){
 const bytes=readFileSync(P4_G5_PRE_HIST_MANIFEST,"utf8");
 const sha=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
 requireP4G5PreHistoricalContext(process.env,sha,bytes);
 const url=process.env.GATE05_AUTOMATION_DATABASE_URL;
 if(!url)throw Error("P4_G5_PRE_HIST_READER_SECRET_UNAVAILABLE");
 const db=new pg.Client({
  connectionString:url,application_name:"p4_g5_pre_source_sql_smoke_readonly",
  connectionTimeoutMillis:9000,query_timeout:15000,
  options:"-c default_transaction_read_only=on"
 });
 let inTx=false;
 try{
  await db.connect();
  await db.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  inTx=true;
  await db.query("SET LOCAL statement_timeout = '12000ms'");
  await db.query("SET LOCAL lock_timeout = '2000ms'");
  const s=await stageP4G5ScopedPreV39(db,{
   airportIcao:"WSSS",
   serviceStartUtc:"2026-10-31T17:00:00.000Z",
   serviceEndUtc:"2026-10-31T18:00:00.000Z",
   observedAtUtc:new Date().toISOString(),
   reviewedFrozenManifestSha256:P4_G5_PRE_HIST_SHA
  });
  console.log(JSON.stringify({
   audit:"OCT31_RETAINED_ORIGINAL_PRE_STAGING_READONLY_NOT_SCIENCE_PASS",
   history:"T24_UNOBSERVED;T6_UNOBSERVED;T90_SOURCE_ONLY",
   sourceAsOfCandidateCounts:s.counts,
   candidateInMemoryRows:s.candidateInMemoryRows,
   independentSelectedNativeT:false,certifiedPreRowsPersisted:0,
   providerCalls:0,databaseWrites:0,
   strictGate5Passed:false,phase5FreezeAuthorized:false,
   phase6Authorized:false
  }));
  console.log("P4_G5_PRE_HIST_REAL_DB_READONLY_DONE_NOT_CERTIFIED");
 }finally{
  if(inTx)await db.query("ROLLBACK").catch(()=>undefined);
  await db.end().catch(()=>undefined);
 }
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_scoped_pre_historical_smoke_actions.ts"))
 void mainP4G5PreHistoricalSqlSmoke().catch(error=>{
  const code=error&&typeof error==="object"?
   (error as {code?:unknown}).code:null;
  console.error(typeof code==="string"&&/^[A-Z0-9]{5}$/.test(code)?
   "P4_G5_PRE_HIST_READONLY_SQLSTATE_"+code:
   "P4_G5_PRE_HIST_READONLY_HOLD_NO_PROVIDER");
  process.exitCode=2;
 });
