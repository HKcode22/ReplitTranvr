/**
 * Scheduled, nonpaid GitHub-only Phase6 control-plane heartbeat.
 * No database connection, provider client, flight payload or workflow dispatch.
 * Only the Github Actions read-only metadata for existing scheduled lanes.
 */
import {appendFileSync} from "node:fs";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {
 readP6GithubAutoControllerHeartbeat,
 P6_EXISTING_CONTROLLER_LANES
} from "../server/lib/disruption/phase6AutonomousGithubControllerHeartbeat_v39.mjs";

const codeOnly=(e)=>{
 const m=typeof e?.message==="string"?e.message:"";
 return /^HOLD_P6_AUTO_HEARTBEAT_[A-Z0-9_]+$/.test(m)?
  m:"HOLD_P6_AUTO_HEARTBEAT_UNKNOWN_NO_PROVIDER_NO_DB";
};
export function formatP6ControllerHeartbeatHuman(heartbeat){
 if(!heartbeat||!Array.isArray(heartbeat.controllerStates)||
    heartbeat.controllerStates.length!==P6_EXISTING_CONTROLLER_LANES.length)
  throw Error("HOLD_P6_HEARTBEAT_BAD_SUMMARY");
 const lines=[
  "### Phase6 automatic GitHub control-plane health (NO PAID GO)",
  "",
  "**"+heartbeat.status+"**",
  "",
  "| Existing controller | GitHub schedule observation | Last age (min) | Largest recent gap (min) | Gaps above expected max |",
  "| --- | --- | ---: | ---: | ---: |"
 ];
 for(const c of heartbeat.controllerStates){
  const age=c.mostRecentRun?.ageMinutes;
  lines.push("| "+c.lane+" | "+c.state+" | "+
   (age===undefined?"Not observed":String(age))+" | "+
   (c.historicalCadence?.maxObservedGapMinutes??"Not observed")+" | "+
   (c.historicalCadence?.intervalsExceedingExpectedMax??"Not observed")+" |");
 }
 if(heartbeat.primaryFidsExpiry){
  const p=heartbeat.primaryFidsExpiry;
  lines.push("", "**Primary FIDS expiry (separate from object sentinel):** "+p.state,
   "Exact-main pin matches: "+p.approvalPinMatchesCurrentMain+
   " | scheduled apply: "+p.scheduledApplyEnabled+
   " | actual latest scheduled expiry step executed: "+p.latestExecutedJobVerified,
   "This does not verify the deletion receipt or guarantee the retention deadline.");
 }
 if(heartbeat.directRecovery?.state!=="DIRECT_RECOVERY_DISABLED"&&heartbeat.directRecovery){
  lines.push("","**Direct external recovery (separate observation):** "+heartbeat.directRecovery.state,
   "Native schedule gaps remain visible; a controller marker is not an actual SOURCE/PRE/POST receipt.");
 }
 if(heartbeat.activeNotifications?.incidentCount){
  lines.push("","**Current operational incident — review required:**");
  for(const i of heartbeat.activeNotifications.incidents)lines.push("- "+i.lane+": "+i.reason+(i.runId?" — [run "+i.runId+"](https://github.com/HKcode22/ReplitTranvr/actions/runs/"+i.runId+")":""));
 }
 lines.push(
  "",
  "Recent interarrival gaps use GitHub run creation metadata, including skipped runs. They are not exact missing cron slots, provider latency or execution-time guarantees.",
  "",
  "**Not yet proved by this heartbeat:** authentic private SOURCE/publisher; "+
  "production schema/readback (separately evidenced); signed 31-day calendar, day rollover and charge budgets; "+
  "actual operating PRE/POST; provider rights/retention, callback storage "+
  "and physical-label quality.",
  "",
  "Manual owner Replit Shell **is not** a recurring Phase6 operation; "+
  "production Phase6 must use reviewed restricted GitHub workers.",
  "",
  "Provider calls: **0** | Database reads/writes: **0/0** | "+
  "GitHub dispatches: **0** | Phase5 FREEZE: **HOLD** | "+
  "Phase6 paid GO: **NO**",
  ""
 );
 return lines.join("\n");
}
async function main(){
 try{
  const report=await readP6GithubAutoControllerHeartbeat(process.env);
  console.log(JSON.stringify({
   status:report.status,observedAtGithubRunnerUtc:report.observedAtGithubRunnerUtc,
   controllers:report.controllerStates.map(x=>({
    lane:x.lane,state:x.state,
    lastRunId:x.mostRecentRun?.id??null,
    lastRunAgeMinutes:x.mostRecentRun?.ageMinutes??null,
    recentSucceeded:x.runStateCounts.completedSuccess,
    recentSkipped:x.runStateCounts.completedSkipped,
    recentFailed:x.runStateCounts.completedFailed,
    historicalCadence:x.historicalCadence
   })),
   primaryFidsExpiry:report.primaryFidsExpiry,
   primaryFidsExpiryNeedsAttention:report.primaryFidsExpiryNeedsAttention,
   activeNotifications:report.activeNotifications,
   directRecovery:report.directRecovery,
   controllerProblemCount:report.controllerProblemCount,
   controllerHistoricalGapCount:report.controllerHistoricalGapCount,
   releaseLanesNotProvedByHeartbeat:report.honestMissingAutonomousEndToEndLanes,
   signed31DayRolloverVerified:false,providerCalls:0,databaseWrites:0,
   dispatches:0,paidPhase6Go:false,phase5Freeze:false
  }));
  if(process.env.GITHUB_STEP_SUMMARY)
   appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    formatP6ControllerHeartbeatHuman(report)+"\n","utf8");
  // Fail this observation only, never a collector or a paid child, so native
  // GitHub failure notifications can surface actionable current incidents.
  if(report.activeNotifications.incidentCount>0){
   console.error("P6_CONTROLLER_CURRENT_INCIDENT_REVIEW_REQUIRED");
   process.exitCode=2;
  }
 }catch(e){
  // Deliberate no-exception object printing (errors may include credentials).
  console.error(codeOnly(e));
  process.exitCode=2;
 }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 await main();
