/**
 * GitHub-only existing-queue lease reaper. DOES NOT issue provider GET,
 * insert tasks, claim a flight, call Stage14, or run a new database
 * migration. Disabled by default and restricted to existing Stage30 PRE.
 */
import {Pool} from "pg";
import {verifyP5CdGithubFrozenCodeLineage}
 from "../server/lib/disruption/phase5CdGithubCodeLineage_v39";
import {makeP5Stage28DedicatedRolePool}
 from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";
import {
 requireP5CdLeaseWatchdogRelease,runP5CdGithubLeaseWatchdog
} from "../server/lib/disruption/phase5CdGithubLeaseWatchdog_v39";

export async function runP5CdGithubLeaseWatchdogMain(
 env:NodeJS.ProcessEnv
){
 verifyP5CdGithubFrozenCodeLineage(env);
 requireP5CdLeaseWatchdogRelease(env);
 const raw=new Pool({
  connectionString:env.P5_V39_PRE_DATABASE_URL,
  max:1,connectionTimeoutMillis:8000,idleTimeoutMillis:1000,
  statement_timeout:15000,
  application_name:"phase5_cd_lease_reaper_existing_queue_no_provider"
 });
 try{
  const pre=makeP5Stage28DedicatedRolePool(raw,{
   group:"pre",reviewedDedicatedLogin:"phase5_p30_pre_login_20261107",
   forbiddenApplicationLogin:"phase5_runtime_application_login"
  });
  return await runP5CdGithubLeaseWatchdog(env,pre);
 }finally{
  await raw.end().catch(()=>{});
 }
}
if(process.env.P5_CD_GH_WATCHDOG_EXECUTE==="1"){
 runP5CdGithubLeaseWatchdogMain(process.env).then(report=>{
  console.log(JSON.stringify(report,null,2));
  if(report.quarantinedUnknownWrite>0)process.exitCode=2;
 }).catch(e=>{
  const msg=e instanceof Error?e.message:"";
  console.error(/^REFUSED_P5_CD_GH_(?:LEASE_WATCHDOG|CODE_LINEAGE|PRE)[A-Z0-9_]+$/.test(msg)?
   msg:"REFUSED_P5_CD_GH_LEASE_WATCHDOG_UNEXPECTED_DB_OR_ACK_NO_REPLAY");
  process.exitCode=2;
 });
}
