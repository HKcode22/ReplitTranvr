/**
 * Phase5 C+D: independent bounded lease watchdog, using the EXISTING
 * V0087/V0090 reaper, existing Stage30 restricted PRE role, and V0092
 * signed-roster admission. No new task, claim, flight write, provider
 * request, agent, login or SQL migration.
 *
 * Reclaimed CLAIMED leases return to READY only if Stage14 was never
 * entered. WRITE_STARTED_UNKNOWN becomes QUARANTINED with NO automatic
 * retry, even if a PRE COMMIT actually succeeded.
 */
import {
 reapP5CdExpiredLeasesOnceV39,type P5CdTaskExecutor
} from "./phase5CdDurableQueueClient_v39";
import {requireP5CdGithubPreRelease}
 from "./phase5CdGithubPreReleaseGate_v39";

const CONFIRM="REAP_EXISTING_CD_LEASES_ONLY_NO_REPLAY_NO_PROVIDER";
const deny=(why:string):never=>{
 throw Error("REFUSED_P5_CD_GH_LEASE_WATCHDOG_"+why);
};
export function requireP5CdLeaseWatchdogRelease(env:NodeJS.ProcessEnv){
 if(env.P5_CD_GH_WATCHDOG_ENABLED!=="1"||
    env.P5_CD_GH_WATCHDOG_EXECUTE!=="1"||
    env.P5_CD_GH_WATCHDOG_CONFIRM!==CONFIRM||
    !["schedule","workflow_dispatch"].includes(env.GITHUB_EVENT_NAME??""))
  deny("NOT_SEPARATELY_ENABLED_OR_CONFIRMED");
 return requireP5CdGithubPreRelease(env);
}
export interface P5CdLeaseWatchdogResult{
 schema:"v39.phase5.gh-lease-watchdog-no-autoretry.v1";
 status:"EMPTY_OR_SAFE_RECOVERY"|"UNKNOWN_WRITE_QUARANTINED_NO_AUTORETRY";
 inspectedAndMoved:number;
 readyAfterUnstartedLease:number;
 missedDeadlineOrExpiredSource:number;
 quarantinedUnknownWrite:number;
 taskResults:Array<{taskId:string;state:"READY"|"MISSED"|"QUARANTINED"}>;
 providerCalls:0;paidProviderCalls:0;
 directSnapshotWrites:0;taskEnrollments:0;claims:0;
 unknownWriteAutomaticallyRetried:false;
 phase5ScientificFreezePassed:false;phase6PaidGo:false;
}
export async function runP5CdGithubLeaseWatchdog(
 env:NodeJS.ProcessEnv,db:P5CdTaskExecutor
):Promise<P5CdLeaseWatchdogResult>{
 requireP5CdLeaseWatchdogRelease(env);
 if(!db||typeof db.query!=="function")
  deny("EXISTING_RESTRICTED_PRE_EXECUTOR_MISSING");
 // Independent function privilege readback before the only state change.
 // The V0092 scoped claim MUST be installed live and the legacy broad
 // claim privilege revoked. No SELECT or UPDATE on the queue table.
 const p=await db.query(
  "SELECT current_database() AS db,current_user AS role,"+
  "pg_catalog.to_regprocedure("+
  "'clean.phase5_cd_claim_signed_roster_v39(text[],text[],text,integer,integer)') IS NOT NULL AS v0092,"+
  "pg_catalog.has_function_privilege(current_user,"+
  "'clean.phase5_cd_reap_once_v39(integer)','EXECUTE') AS can_reap,"+
  "pg_catalog.has_function_privilege(current_user,"+
  "'clean.phase5_cd_claim_due_v39(text,integer,integer)','EXECUTE') AS old_claim,"+
  "pg_catalog.has_table_privilege(current_user,"+
  "'clean.phase5_cd_pre_task_v39','UPDATE') AS direct_update"
 );
 const a=p?.rows?.[0];
 if(p.rows.length!==1||a?.db!=="neondb"||
    a.role!=="phase5_fids_pre_writer_prod_20261107"||
    a.v0092!==true||a.can_reap!==true||
    a.old_claim!==false||a.direct_update!==false)
  deny("V0092_OR_RESTRICTED_QUEUE_REAPER_NOT_COMMISSIONED");
 requireP5CdLeaseWatchdogRelease(env);
 const moved=await reapP5CdExpiredLeasesOnceV39(db,64);
 const ready=moved.filter(x=>x.state==="READY").length;
 const missed=moved.filter(x=>x.state==="MISSED").length;
 const unknown=moved.filter(x=>x.state==="QUARANTINED").length;
 return{
  schema:"v39.phase5.gh-lease-watchdog-no-autoretry.v1",
  status:unknown>0?"UNKNOWN_WRITE_QUARANTINED_NO_AUTORETRY":
   "EMPTY_OR_SAFE_RECOVERY",
  inspectedAndMoved:moved.length,
  readyAfterUnstartedLease:ready,
  missedDeadlineOrExpiredSource:missed,
  quarantinedUnknownWrite:unknown,
  taskResults:moved,
  providerCalls:0,paidProviderCalls:0,
  directSnapshotWrites:0,taskEnrollments:0,claims:0,
  unknownWriteAutomaticallyRetried:false,
  phase5ScientificFreezePassed:false,phase6PaidGo:false
 };
}
