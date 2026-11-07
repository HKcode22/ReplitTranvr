/**
 * STAGED ONLY. No GitHub workflow calls this script yet.
 * One approved, signed, prospective source query; ONE physical paid GET max.
 * Does NOT create Flight Alerts, PRE, POST, original rights, or Phase6 GO.
 */
import {readFileSync,statSync} from "node:fs";
import {Pool} from "pg";
import {admitP5GitHubOneQueryRelease,
 type P5GitHubOneQueryReleaseEnvelope}
 from "../server/lib/disruption/phase5GitHubOneQueryReleaseAdmission_v39";
import {createP5V0079ScopedDbPorts}
 from "../server/lib/disruption/phase5V0079ScopedDbPorts_v39";
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
 const pool=new Pool({
  connectionString:process.env.V39_P5_SOURCE_DATABASE_URL,
  max:1,
  connectionTimeoutMillis:10000,
  application_name:"v39_phase5_github_only_one_query_source",
 });
 try{
  const ports=createP5V0079ScopedDbPorts({
   plan,
   manifestSha256:admitted.manifestSha256,
   exactQueryDigest:admitted.queryDigestSha256,
   githubRunId:input.githubRunId,
   scopedPool:pool,
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
  await pool.end().catch(()=>{});
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
