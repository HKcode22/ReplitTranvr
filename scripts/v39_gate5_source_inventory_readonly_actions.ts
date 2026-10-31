/** Phase4 Gate5 metadata-only source inventory; protected READ ONLY Actions. */
import pg from "pg";
import {auditP4Gate5OriginalSourceInventory}
 from "../server/lib/disruption/phase4Gate5SourceInventory_v39";
import {auditP4Gate5SourceCutoffsV39}
 from "../server/lib/disruption/phase4Gate5SourceCutoffAudit_v39";
import {auditStoredDecodedFidsReadbackV39}
 from "../server/lib/disruption/phase4Gate5DecodedFidsReadback_v39";
import {auditP4LiveGate5FunnelV39}
 from "../server/lib/disruption/phase4Gate5LiveFunnel_v39";
import {auditP4LiveCaptureOutcomeV39}
 from "../server/lib/disruption/phase4Gate5LiveCaptureOutcome_v39";
import {auditP4LivePreBuilderCandidatesV39}
 from "../server/lib/disruption/phase4Gate5LivePreBuilderCandidates_v39";
import {auditP4WsssRetainedAsOfDriftV39}
 from "../server/lib/disruption/phase4Gate5RetainedCohortDrift_v39";
// The two fixed, no-provider post-service audits are distinct from the
// three paid FIDS source cutoffs. GitHub schedule delay never creates a new
// paid authorization or an undated retrospective observation.
export const P4_WSSS_POSTWINDOW_AUDIT_SLOTS_V39={
 "15 19 31 10 *":"2026-10-31T19:15:00.000Z",
 "15 22 31 10 *":"2026-10-31T22:15:00.000Z"
} as const;
export function requireP4PostWindowAuditScheduleV39(
 env:NodeJS.ProcessEnv,now:number
):void {
 const cron=env.P4_GATE5_POSTWINDOW_CRON as
   keyof typeof P4_WSSS_POSTWINDOW_AUDIT_SLOTS_V39;
 const slot=P4_WSSS_POSTWINDOW_AUDIT_SLOTS_V39[cron];
 if(!slot||env.P4_FIDS_SCHEDULE_CRON||
    env.GITHUB_EVENT_NAME!=="schedule"||
    env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    !Number.isFinite(now)||
    now<Date.parse(slot)||
    now>Date.parse(slot)+4*3_600_000)
   throw Error("P4_GATE5_POSTWINDOW_AUDIT_SCHEDULE_HOLD");
}
export function requireP4InventoryActionsContext(
 env:NodeJS.ProcessEnv,now=Date.now()
):{airport:string}{
 if(env.GITHUB_ACTIONS!=="true"||
  env.GITHUB_REF!=="refs/heads/main"||
  env.GITHUB_RUN_ATTEMPT!=="1"||
  !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA??"")||
  !["push","workflow_dispatch","schedule"].includes(env.GITHUB_EVENT_NAME??"")||
 (env.GITHUB_EVENT_NAME==="schedule" &&
   !["7 16 30 10 *","7 10 31 10 *","37 14 31 10 *"]
     .includes(env.P4_FIDS_SCHEDULE_CRON??"") &&
   !env.P4_GATE5_POSTWINDOW_CRON)||
 (env.GITHUB_EVENT_NAME!=="schedule" && !!env.P4_GATE5_POSTWINDOW_CRON)||
  env.P4_GATE5_READONLY_APPROVAL!=="GATE5_SOURCE_METADATA_NO_PROVIDER"||
  env.P4_GATE5_SOURCE_AIRPORT!=="WSSS")
  throw Error("P4_GATE5_INVENTORY_ACTIONS_CONTEXT_HOLD");
 if(env.GITHUB_EVENT_NAME==="schedule"&&env.P4_GATE5_POSTWINDOW_CRON)
  requireP4PostWindowAuditScheduleV39(env,now);
 return {airport:"WSSS"};
}
async function main():Promise<void>{
 const ctx=requireP4InventoryActionsContext(process.env);
 const url=process.env.GATE05_AUTOMATION_DATABASE_URL;
 if(!url)throw Error("P4_GATE5_INVENTORY_READER_CREDENTIAL_UNAVAILABLE");
 const client=new pg.Client({connectionString:url,
  application_name:"phase4_gate5_readonly_source_inventory",
  connectionTimeoutMillis:9000,query_timeout:10000});
 let transaction=false;
 try{
  await client.connect();
  await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  transaction=true;
  await client.query("SET LOCAL statement_timeout = '10000ms'");
  const readAt=new Date().toISOString();
  const report=await auditP4Gate5OriginalSourceInventory(client,{
   airport:ctx.airport,auditUtc:readAt
  });
  // Same dedicated transaction and audit UTC; no provider access.
  const cohort=await auditP4Gate5SourceCutoffsV39(client,{
   airport:ctx.airport,auditUtc:readAt
  });
  if(cohort.latestSourceReceiptSample!==report.latestFidsQuerySample)
   throw Error("P4_GATE5_SOURCE_SAMPLE_PARITY_HOLD");
  // Same repeatable-read snapshot and 24h raw source age guard. This
  // immediately verifies the newly stored prospective source body; older
  // rows must remain LEGACY or EXPIRED, never be reconstructed.
  const bodyReadback=await auditStoredDecodedFidsReadbackV39(client,{
    airport:ctx.airport,readAsOfUtc:readAt
  });
  // Phase4 production implementation: one real, same-service-window funnel.
  // Unlike the broad airport inventory, this counts candidate identities,
  // pre-cutoff source availability and persisted snapshots for ONE cohort.
  const liveFunnel=await auditP4LiveGate5FunnelV39(client,{
    airport:"WSSS",
    windowStartUtc:"2026-10-31T17:00:00.000Z",
    windowEndUtc:"2026-10-31T18:00:00.000Z",
    auditUtc:readAt
  });
  const captureAndOutcomes=await auditP4LiveCaptureOutcomeV39(client,{
    airport:"WSSS",
    windowStartUtc:"2026-10-31T17:00:00.000Z",
    windowEndUtc:"2026-10-31T18:00:00.000Z",
    auditUtc:readAt
  });
  if(captureAndOutcomes.retainedFidsReceipts!==
     liveFunnel.sourceQueryReceipts)
    throw Error("P4_GATE5_CAPTURE_COHORT_FIDS_RECEIPT_PARITY_HOLD");
  // Exercise the actual PRE cutoff/feature builder on immutable source
  // observations, independent of callbacks. No INSERT/UPDATE is possible
  // inside this protected repeatable-read, read-only transaction.
  const preBuilderCandidates=await auditP4LivePreBuilderCandidatesV39(client,{
    airport:"WSSS",
    windowStartUtc:"2026-10-31T17:00:00.000Z",
    windowEndUtc:"2026-10-31T18:00:00.000Z",
    auditUtc:readAt
  });
  // Report actual retained FIDS candidate turnover between the SAME
  // service cohort's three earliest fixed sampling cutoffs. The 24h hard
  // ceiling may erase T-24h source by T-90m; that is UNKNOWN, not zero.
  const prospectiveCandidateTurnover=await auditP4WsssRetainedAsOfDriftV39(client,{
    airport:"WSSS",
    windowStartUtc:"2026-10-31T17:00:00.000Z",
    windowEndUtc:"2026-10-31T18:00:00.000Z",
    auditUtc:readAt
  });
  if(preBuilderCandidates.provisionalDistinctIdentityCount!==
     liveFunnel.horizons[0].candidateDistinctAnalyticIds)
    throw Error("P4_GATE5_PRE_BUILDER_COHORT_POPULATION_PARITY_HOLD");
  for(const candidate of preBuilderCandidates.horizons){
    const compare=liveFunnel.horizons.find(x=>x.horizon===candidate.horizon);
    if(!compare ||
       candidate.previewBuilt!==compare.candidateAsOfEligibleIds)
      throw Error("P4_GATE5_PRE_BUILDER_CUTOFF_PARITY_HOLD");
  }
  console.log(JSON.stringify({sourceInventory:report,
    cutoffAndSnapshotEvidence:cohort,
    originalBodyAndEnvelopeReadback:bodyReadback,
    sameCohortOperationalFunnel:liveFunnel,
    sameCohortResolvedCaptureAndOutcomes:captureAndOutcomes,
    sameCohortPreBuilderCandidates:preBuilderCandidates,
    sameCohortRetainedAsOfCandidateTurnover:prospectiveCandidateTurnover,
    strictGate5Passed:false,phase6Authorized:false,
    providerCalls:0,databaseWrites:0
  }));
  if(bodyReadback.rejectedIntegrity>0)
    throw Error("P4_GATE5_SOURCE_READBACK_INTEGRITY_HOLD");
  console.log("PHASE4_GATE5_AUDIT_EXECUTED_ONLY_NOT_SCIENTIFIC_GATE5_PASS");
 }finally{
  if(transaction)await client.query("ROLLBACK").catch(()=>undefined);
  await client.end().catch(()=>undefined);
 }
}
if(process.argv[1]?.endsWith("v39_gate5_source_inventory_readonly_actions.ts")){
 void main().catch(()=>{
  console.error("P4_GATE5_METADATA_READONLY_HOLD_DB_SCHEMA_OR_PERMISSION");
  process.exitCode=2;
 });
}
