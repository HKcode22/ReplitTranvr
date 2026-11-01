/**
 * Phase4 Gate5: one historical, SHA-pinned ORIGINAL-source schema smoke.
 * This is NOT a new prospective data collection, provider call, certifiable
 * snapshot, or a future-cohort manifest approval mechanism.
 * NO provider key. One caller-owned PostgreSQL REPEATABLE READ READ ONLY tx.
 */
import pg from "pg";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {
 auditP4FreshCohortV39,
 type P4FreshCohortScopeV39
} from "../server/lib/disruption/phase4Gate5FreshCohortReadOnly_v39";

export const P4_G5_HISTORICAL_MANIFEST_PATH_V39=
 "data-collection/phase4/2026-10-31_GATE5_HISTORICAL_SCHEMA_SMOKE_MANIFEST.json";
export const P4_G5_HISTORICAL_MANIFEST_SHA256_V39=
 "c3785cfae051fd0cf4ef3dd68a3a9d8b0079c89cd34c002fe5610000ff318853" as const;
export const P4_G5_HISTORICAL_WORKFLOW_REF_V39=
 "HKcode22/ReplitTranvr/.github/workflows/phase4-gate5-historical-cohort-schema-smoke-readonly.yml@refs/heads/main" as const;
export const P4_G5_HISTORICAL_WORKFLOW_NAME_V39=
 "Phase4 Gate5 Historical Cohort SQL Smoke - READ ONLY" as const;
export const P4_G5_HISTORICAL_INTENT_V39=
 "OCT31_HISTORICAL_SCHEMA_ONLY_ZERO_PROVIDER_NO_BACKFILL" as const;
const SHA=/^[0-9a-f]{40}$/;
function obj(v:unknown):Record<string,unknown>{
 if(!v||typeof v!=="object"||Array.isArray(v))
  throw Error("P4_HIST_SMOKE_BAD_MANIFEST");
 return v as Record<string,unknown>;
}
export function requireP4HistoricalSmokeContextV39(
 env:NodeJS.ProcessEnv,checkedOutSha:string,manifestBytes:string
):P4FreshCohortScopeV39{
 if(env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_EVENT_NAME!=="push"||
    env.GITHUB_REF!=="refs/heads/main"||
    env.GITHUB_RUN_ATTEMPT!=="1"||
    env.GITHUB_JOB!=="historical-cohort-smoke"||
    env.GITHUB_WORKFLOW!==P4_G5_HISTORICAL_WORKFLOW_NAME_V39||
    env.GITHUB_WORKFLOW_REF!==P4_G5_HISTORICAL_WORKFLOW_REF_V39||
    env.P4_G5_HISTORICAL_SMOKE_INTENT!==P4_G5_HISTORICAL_INTENT_V39||
    !SHA.test(env.GITHUB_SHA??"")||checkedOutSha!==env.GITHUB_SHA||
    !!env.AERODATABOX_API_KEY||!!env.RAPIDAPI_KEY||
    !!env.V39_DATABASE_RUNTIME_URL||!!env.DATABASE_URL)
  throw Error("P4_HIST_SMOKE_ACTIONS_PROVENANCE_OR_PROVIDER_HOLD");
 const hash=createHash("sha256").update(manifestBytes,"utf8").digest("hex");
 if(hash!==P4_G5_HISTORICAL_MANIFEST_SHA256_V39)
  throw Error("P4_HIST_SMOKE_FROZEN_MANIFEST_DIGEST_MISMATCH");
 let manifest:unknown;
 try{manifest=JSON.parse(manifestBytes);}catch{
   throw Error("P4_HIST_SMOKE_BAD_MANIFEST_JSON");
 }
 const m=obj(manifest);
 // Exact immutable historical manifest; no operator-controlled future dates.
 if(m.schema!=="v39.phase4.gate5-historical-readonly-smoke-manifest.v1"||
    m.mode!=="HISTORICAL_SOURCE_SCHEMA_SMOKE_ONLY"||
    m.airportIcao!=="WSSS"||
    m.serviceWindowStartUtc!=="2026-10-31T17:00:00.000Z"||
    m.serviceWindowEndUtc!=="2026-10-31T18:00:00.000Z"||
    m.sourcePaidRunId!==41202671665||
    m.sourceOriginalT6h!=="UNOBSERVED"||
    m.sourceOriginalT24h!=="UNOBSERVED_AS_OF_FIXED_CUTOFF"||
    m.phase5FreezeAuthorized!==false||m.phase6Authorized!==false||
    Object.keys(m).length!==10)
  throw Error("P4_HIST_SMOKE_MANIFEST_SCOPE_HOLD");
 return {
   airportIcao:"WSSS",
   serviceWindowStartUtc:"2026-10-31T17:00:00.000Z",
   serviceWindowEndUtc:"2026-10-31T18:00:00.000Z",
   readAsOfUtc:new Date().toISOString(),
   reviewedFrozenManifestSha256:hash
 };
}
export async function mainP4HistoricalSmokeV39(){
 const bytes=readFileSync(P4_G5_HISTORICAL_MANIFEST_PATH_V39,"utf8");
 const sha=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
 const scope=requireP4HistoricalSmokeContextV39(process.env,sha,bytes);
 if(Date.parse(scope.readAsOfUtc)<Date.parse(scope.serviceWindowEndUtc))
  throw Error("P4_HIST_SMOKE_SERVICE_NOT_COMPLETE");
 const url=process.env.GATE05_AUTOMATION_DATABASE_URL;
 if(!url)throw Error("P4_HIST_SMOKE_READER_CREDENTIAL_UNAVAILABLE");
 const client=new pg.Client({
  connectionString:url,
  application_name:"phase4_gate5_historical_readonly_sql_smoke",
  connectionTimeoutMillis:9000,query_timeout:15000,
  options:"-c default_transaction_read_only=on"
 });
 let inTx=false;
 try{
  await client.connect();
  await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  inTx=true;
  await client.query("SET LOCAL statement_timeout = '12000ms'");
  await client.query("SET LOCAL lock_timeout = '2000ms'");
  // This is the only scope used: a fixed completed historical cohort,
  // NEVER a replacement for original T-24h/T-6h missing observations.
  const report=await auditP4FreshCohortV39(client,scope);
  console.log(JSON.stringify({
   auditType:"HISTORICAL_REAL_DB_SCHEMA_SMOKE_ONLY",
   serviceCohort:"WSSS_20261031_1700_1800Z",
   history:"T24_UNOBSERVED;T6_UNOBSERVED;T90_SOURCE_ONLY",
   originalPaidRunId:41202671665,
   ...report,
   scientificGate5Passed:false,phase5FreezeAuthorized:false,
   phase6Authorized:false,providerCalls:0,databaseWrites:0
  }));
  console.log("P4_HIST_REAL_DB_AUDIT_EXECUTED_NOT_SCIENCE_PASS");
 }finally{
  if(inTx)await client.query("ROLLBACK").catch(()=>undefined);
  await client.end().catch(()=>undefined);
 }
}
export function p4HistoricalSafeFailureCodeV39(error:unknown):string{
 const e=(error&&typeof error==="object")?error as Record<string,unknown>:{};
 const code=e.code;
 // SQLSTATE only; NEVER print raw DB error, connection URI, query or source IDs.
 return typeof code==="string"&&/^[A-Z0-9]{5}$/.test(code)
   ?"P4_HIST_READONLY_HOLD_SQLSTATE_"+code
   :"P4_HIST_READONLY_HOLD_NO_PROVIDER";
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_historical_cohort_smoke_readonly_actions.ts")){
 void mainP4HistoricalSmokeV39().catch(error=>{
   console.error(p4HistoricalSafeFailureCodeV39(error));
   process.exitCode=2;
 });
}
