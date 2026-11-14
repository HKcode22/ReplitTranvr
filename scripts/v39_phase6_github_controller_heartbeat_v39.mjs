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
  "| Existing controller | GitHub schedule observation | Last age (minutes) |",
  "| --- | --- | ---: |"
 ];
 for(const c of heartbeat.controllerStates){
  const age=c.mostRecentRun?.ageMinutes;
  lines.push("| "+c.lane+" | "+c.state+" | "+
   (age===undefined?"Not observed":String(age))+" |");
 }
 lines.push(
  "",
  "**Not yet proved by this heartbeat:** authentic private SOURCE/publisher; "+
  "live V0094 schema; signed 31-day calendar, day rollover and charge budgets; "+
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
    recentFailed:x.runStateCounts.completedFailed
   })),
   missingAutonomousLanes:report.honestMissingAutonomousEndToEndLanes,
   signed31DayRolloverVerified:false,providerCalls:0,databaseWrites:0,
   dispatches:0,paidPhase6Go:false,phase5Freeze:false
  }));
  if(process.env.GITHUB_STEP_SUMMARY)
   appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    formatP6ControllerHeartbeatHuman(report)+"\n","utf8");
 }catch(e){
  // Deliberate no-exception object printing (errors may include credentials).
  console.error(codeOnly(e));
  process.exitCode=2;
 }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 await main();
