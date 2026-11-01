/**
 * Disposable PostgreSQL16 integration rehearsal of 3 distinct durable
 * PREPARED horizon owners. Not a real owner, runner attestation, source permit
 * or production database operation.
 */
import pg from "pg";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {prepareP4G5PhysicalOwnerV39}
 from "../server/lib/disruption/phase4Gate5PhysicalOwnerDispatchGuard_v39";
import {stageP4G5PreparedOwnerDbOnlyV39,requireP4G5PreparedLivePromotionV39}
 from "../server/lib/disruption/phase4Gate5DurablePreparedOwner_v39";

const MANIFEST="data-collection/phase4/GATE5_NEXT_COHORT_PREARM_SYNTHETIC_HOLD.json";
export async function main(){
 const env=process.env;
 const sha=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
 if(env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_EVENT_NAME!=="push"||env.GITHUB_REF!=="refs/heads/main"||
    env.GITHUB_RUN_ATTEMPT!=="1"||
    env.GITHUB_JOB!=="disposable-v0076-prepared"||
    env.GITHUB_WORKFLOW!=="Phase4 Gate5 V0076 Disposable Prepared Three Horizon Owners"||
    env.GITHUB_WORKFLOW_REF!==
    "HKcode22/ReplitTranvr/.github/workflows/phase4-gate5-v0076-prepared-owners-disposable-pg16.yml@refs/heads/main"||
    sha!==env.GITHUB_SHA||
    env.P4_G5_PREPARED_DISPOSABLE_INTENT!=="SYNTHETIC_PG16_ZERO_PROVIDER"||
    !!env.V39_DATABASE_RUNTIME_URL||!!env.AERODATABOX_API_KEY||
    !!env.RAPIDAPI_KEY||!!env.GATE05_AUTOMATION_DATABASE_URL||
    !env.DATABASE_URL?.includes("@localhost:5432/gate5_disposable"))
  throw Error("P4_G5_DISPOSABLE_PRODUCTION_SECRETS_OR_CONTEXT_HOLD");
 const bytes=readFileSync(MANIFEST,"utf8");
 const m=JSON.parse(bytes) as Record<string,any>;
 if(m.mode!=="HOLD_NO_PROVIDER"||
    !m.cohortId?.startsWith("SYNTHETIC_")||
    m.paidSourceActivationAuthorized!==false||
    m.verifiedFirstNativeT!==false||
    m.legallyPermittedSourceRetentionVerified!==false)
   throw Error("P4_G5_DISPOSABLE_MUST_STAY_SYNTHETIC_HOLD");
 const hash=createHash("sha256").update(bytes).digest("hex");
 try{
  requireP4G5PreparedLivePromotionV39(hash);
  throw Error("P4_G5_DISPOSABLE_LIVE_RELEASE_UNEXPECTEDLY_ACTIVE");
 }catch(e){
  if(!(e instanceof Error)||
     e.message!=="P4_G5_PREPARED_OWNER_LIVE_RELEASE_AND_RIGHTS_HOLD")
   throw e;
 }
 const c=new pg.Client({
  connectionString:env.DATABASE_URL,
  connectionTimeoutMillis:8000,query_timeout:15000
 });
 await c.connect();
 try{
  const summary=[];
  for(const [idx,h] of (["T-24h","T-6h","T-90m"] as const).entries()){
   const lag=h==="T-24h"?1440:h==="T-6h"?360:90;
   const first=Date.parse(m.grid.serviceWindowStartUtc)-
    (lag+m.grid.acquisitionGuardMinutes)*60000;
   const owner=prepareP4G5PhysicalOwnerV39({
    cohortId:m.cohortId,frozenManifestBytes:bytes,
    reviewedManifestSha256:hash,grid:m.grid,horizon:h,
    actualOwnerProcessStartedAtUtc:new Date(first-
     (m.grid.githubPrearmLeadMinutes+5)*60000).toISOString()
   });
   const inp={owner,githubRunId:String(90000000+idx),
    reviewedRunAuthorizationSha256:"a".repeat(64)};
   const firstRes=await stageP4G5PreparedOwnerDbOnlyV39(c,inp);
   if(firstRes.ownerRowsNewlyInserted!==1||
      firstRes.activeOwnersCreated!==0||
      firstRes.paidAttemptsCreated!==0)
    throw Error("P4_G5_DISPOSABLE_FIRST_STAGING_HOLD");
   const retry=await stageP4G5PreparedOwnerDbOnlyV39(c,inp);
   if(retry.ownerRowsNewlyInserted!==0)
    throw Error("P4_G5_DISPOSABLE_IDEMPOTENCE_HOLD");
   if(idx===0){
    // Disposable-only simulation of T-24h reservation consumption. It is
    // intentionally NOT claimed to be a real V0076 physical attempt:
    // no ACTIVE owner, HTTP, or charged attempt row is created.
    await c.query(
     "UPDATE clean.phase4_g5_fids_cohort_budget_v39 "+
     "SET reserved_units=2 WHERE manifest_sha256=$1",[hash]);
   }
   summary.push({horizon:h,queries:firstRes.plannedQueryCount});
  }
  const check=await c.query([
   "SELECT",
   "(SELECT count(*)::int FROM clean.phase4_g5_fids_cohort_budget_v39) AS cohorts,",
   "(SELECT count(*)::int FROM clean.phase4_g5_fids_physical_owner_v39) AS owners,",
   "(SELECT count(*)::int FROM clean.phase4_g5_fids_physical_owner_v39 WHERE state='ACTIVE') AS active,",
   "(SELECT count(*)::int FROM clean.phase4_g5_fids_allowed_query_v39) AS queries,",
   "(SELECT count(*)::int FROM clean.phase4_g5_fids_physical_attempt_v39) AS attempts,",
   "(SELECT reserved_units FROM clean.phase4_g5_fids_cohort_budget_v39 LIMIT 1) AS reserved"
  ].join(" "));
  const n=check.rows[0];
  if(n.cohorts!==1||n.owners!==3||n.active!==0||n.queries!==9||
     n.attempts!==0||n.reserved!==2)
   throw Error("P4_G5_DISPOSABLE_THREE_HORIZON_DB_RECONCILIATION_HOLD");
  // The protected DB function cannot reserve from a PREPARED owner,
  // even when called directly by a fully privileged disposable DB owner.
  let refused=false;
  try{
   await c.query("SELECT clean.reserve_phase4_g5_fids_physical_attempt_v39("+
     "$1,$2,$3,$4,1,$5)",[
      hash,
      createHash("sha256").update(
       [hash,m.cohortId,"T-24h",
        new Date(Date.parse(m.grid.serviceWindowStartUtc)-
         (1440+m.grid.acquisitionGuardMinutes)*60000).toISOString(),
        new Date(Date.parse(m.grid.serviceWindowEndUtc)-
         (1440+m.grid.acquisitionGuardMinutes)*60000).toISOString(),"3"
       ].join("|")).digest("hex"),
      "90000000","0".repeat(64),"1".repeat(64)
   ]);
  }catch{refused=true;}
  if(!refused)throw Error("P4_G5_DISPOSABLE_PREPARED_OWNER_COULD_RESERVE_HOLD");
  console.log(JSON.stringify({
   status:"V0076_DISPOSABLE_THREE_HORIZONS_PREPARED_IDEMPOTENT_NO_PAID",
   ...n,horizons:summary,syntheticPriorHorizonBudgetReservationUnits:2,
   realPhysicalReservationRows:0,providerCalls:0,realPrearmEvidence:false,
   strictGate5Passed:false,phase5FreezeAuthorized:false,phase6Authorized:false
  }));
 }finally{await c.end().catch(()=>{});}
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_v0076_prepared_owners_disposable_pg16_actions.ts"))
 void main().catch(e=>{
  console.error(e instanceof Error&&
   /^P4_G5_[A-Z0-9_]+$/.test(e.message)?e.message:
   "P4_G5_DISPOSABLE_PREPARED_OWNER_HOLD_NO_PROVIDER");
  process.exitCode=2;
 });
