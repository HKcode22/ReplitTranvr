/**
 * Existing main-only reviewed manual GitHub source owner.
 * One approved, signed, prospective source query; ONE physical paid GET max.
 * Does NOT create Flight Alerts, PRE, POST, original rights, or Phase6 GO.
 */
import {readFileSync,statSync} from "node:fs";
import {Pool} from "pg";
import {makeP5Stage28DedicatedRolePool,P5_STAGE28_GROUPS}
 from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";
import {admitP5GitHubOneQueryRelease,
 type P5GitHubOneQueryReleaseEnvelope}
 from "../server/lib/disruption/phase5GitHubOneQueryReleaseAdmission_v39";
import {auditP5UpcomingSourceQueue,
 requireP5SignedOneGetInActualDueQueue,
 requireP5PaidGetBeforeHardLatest}
 from "../server/lib/disruption/phase5SourceUpcomingDueQueueReadonly_v39";
import {createP5V0079ScopedDbPorts}
 from "../server/lib/disruption/phase5V0079ScopedDbPorts_v39";
import {prearmP5V0080ActualGitHubRun,waitForP5ScheduledPhysicalDispatch}
 from "../server/lib/disruption/phase5V0080GitHubPrearm_v39";
import {runP5ScopedFidsSource,
 type P5SourceSingleQueryPlan}
 from "../server/lib/disruption/phase5ScopedFidsSourceBridge_v39";

function refuse():never{throw Error("REFUSED_P5_GITHUB_SOURCE_NOT_ADMITTED");}
async function main():Promise<void>{
 if(process.argv.length!==3||
    !/^data-collection\/phase5\/frozen\/[A-Za-z0-9_.-]{8,125}\.json$/.test(
      process.argv[2]??""))
  refuse();
 const name=process.argv[2];
 const stat=statSync(name);
 if(!stat.isFile()||stat.size<100||stat.size>200000)refuse();
 const bytes=readFileSync(name);
 const input=JSON.parse(bytes.toString("utf8")) as P5GitHubOneQueryReleaseEnvelope;
 const admitted=admitP5GitHubOneQueryRelease(process.env,bytes,input);
 // A JSON representation cannot encode native JS Date; validate it as
 // a strict ISO instant and rebuild only that one required field.
 const raw=input.plan?.day?.scheduledStartUtc as unknown;
 if(typeof raw!=="string"||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(raw)||
    !Number.isFinite(Date.parse(raw)))refuse();
 const plan:P5SourceSingleQueryPlan={
  ...input.plan,
  day:{...input.plan.day,scheduledStartUtc:new Date(raw)},
 };
 // Actual source worker must be its own dedicated NOINHERIT login,
 // with SET-only membership in the previously reviewed NOLOGIN SOURCE group.
 // Raw PG pools are not admissible for paid V0079 custodial writes.
 const rawPool=new Pool({
  connectionString:process.env.V39_P5_SOURCE_DATABASE_URL,
  max:1,
  connectionTimeoutMillis:10000,
  application_name:"v39_phase5_github_only_one_query_source",
 });
 // The forbidden identity is the separately commissioned PREPARE login;
 // checkedOut independently requires the *exact* dedicated SOURCE session
 // login and exactly one approved SOURCE group, denying app/pre/witness users.
 const scoped=makeP5Stage28DedicatedRolePool(rawPool,{
  group:"source",
  reviewedDedicatedLogin:"phase5_p5_source_login_20261108",
  forbiddenApplicationLogin:"phase5_p30_prepare_login_20261107",
 });
 try{
  // Reuse the real PR #528 SOURCE-only metadata queue before V0080 prearm.
  // Both the signed immutable packet AND the current unreserved DB row must
  // match. This must be a fresh read before ANY physical reservation.
  const dueQueue=await auditP5UpcomingSourceQueue(scoped,{
   expectedManifestSha256:admitted.manifestSha256,
   expectedReleaseSha256:plan.reviewedReleaseSha256,
   expectedRightsSha256:plan.reviewedProviderRightsSha256,
   expectedProviderContractSha256:plan.openapiSha256,
   expectedSourceRole:P5_STAGE28_GROUPS.source,
  });
  const due=requireP5SignedOneGetInActualDueQueue(
   dueQueue,plan,admitted.manifestSha256,admitted.queryDigestSha256);
  // A reviewed, immutable template cannot contain the future GitHub run ID.
  // Bind the actual GITHUB_RUN_ID to PREPARED exact V0079 query in an
  // independent durable V0080 DB transaction BEFORE source reservation.
  // Failed/unknown prearm is never retried blindly in this same job.
  await prearmP5V0080ActualGitHubRun({
   pool:scoped,manifestSha256:admitted.manifestSha256,
   queryDigestSha256:admitted.queryDigestSha256,
   githubRunId:admitted.githubRunId,
   earlyDrawSha256:plan.expectedEarlyDrawSha256,
   rightsReviewSha256:plan.reviewedProviderRightsSha256,
  });
  // GH may allocate this job before its exact approved paid GET slot.
  // Prearm has been COMMITTED; do not consume the single physical attempt
  // until the database clock reaches the signed dispatch UTC.
  await waitForP5ScheduledPhysicalDispatch(
   plan.acquisition.scheduledRequestUtc,
   plan.acquisition.earliestPlannedCutoffUtc,
   plan.acquisition.maxResponseAndPersistSeconds,
   async()=>{
    const r=await scoped.query("SELECT clock_timestamp() AS t");
    if(r.rowCount!==1)throw Error("REFUSED_P5_V0080_PREARM_DB_CLOCK_MISSING");
    return new Date(r.rows[0].t);
   },
  );
  // The time of admission is not the time of physical GET. A runner that
  // reaches the signed hard deadline after waiting must not reserve or pay.
  const postWaitClock=await scoped.query("SELECT clock_timestamp() AS t");
  if(postWaitClock.rowCount!==1)
   throw Error("REFUSED_P5_SOURCE_DUE_QUEUE_POST_WAIT_CLOCK_MISSING");
  requireP5PaidGetBeforeHardLatest(
   postWaitClock.rows[0].t,due.hardLatestDispatchUtc);
  const ports=createP5V0079ScopedDbPorts({
   plan,
   manifestSha256:admitted.manifestSha256,
   exactQueryDigest:admitted.queryDigestSha256,
   githubRunId:admitted.githubRunId,
   scopedPool:scoped as unknown as Pool,
   fetchImpl:fetch,
  });
  // Both DB ledger and provider request may have cost even if this fails.
  // Do NOT retry a query after ambiguous dispatch. V0079 makes the
  // reservation irreversible and its same-query replay fail closed.
  const outcome=await runP5ScopedFidsSource(plan,ports);
  console.log(JSON.stringify({
   schema:"v39.phase5.github-one-query-source-result.v1",
   codeSha:admitted.codeSha,
   manifestSha256:admitted.manifestSha256,
   queryDigestSha256:admitted.queryDigestSha256,
   runDayIndex:admitted.runDayIndex,
   slot:admitted.slot,horizon:admitted.horizon,
   status:outcome.status,
   physicallyReservedAttempts:outcome.physicalAttemptsReserved,
   providerOriginalBound:outcome.providerOriginalBound,
   actualFlightPreCertified:false,phase6Go:false,
  }));
  if(outcome.status!=="SOURCE_ORIGINAL_BOUND_TIMELY_NOT_FLIGHT_PRE")
   process.exitCode=3;
 }finally{
  await rawPool.end().catch(()=>{});
 }
}
main().catch(error=>{
 const msg=error instanceof Error?error.message:"";
 // Never print source bodies, usernames, API keys or SQL connection errors.
 const safe=/^(REFUSED_P5_[A-Z0-9_]+|REFUSED_PHASE5_[A-Z0-9_]+|P5_[A-Z0-9_]+)$/.test(msg)
   ?msg:"REFUSED_P5_GITHUB_SOURCE_UNVERIFIED_OR_DB_ERROR";
 console.error(safe);
 process.exitCode=2;
});
