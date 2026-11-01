/**
 * GitHub push-only offline compiler for synthetic next Gate5 cohort.
 * Actual jobs, provider access, DB writes and billing are never activated.
 */
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {compileP4G5OfflinePrearms,requireP4G5PrearmOfflineActionsContext,
 type P4G5OfflineTemplate}
 from "../server/lib/disruption/phase4Gate5OfflineThreeOwnerPrearm_v39";

export async function mainP4G5OfflinePrearm(){
 const gitSha=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
 requireP4G5PrearmOfflineActionsContext(process.env,gitSha);
 const data=readFileSync(
  "data-collection/phase4/GATE5_NEXT_COHORT_PREARM_SYNTHETIC_HOLD.json","utf8");
 const input=JSON.parse(data) as P4G5OfflineTemplate;
 const result=compileP4G5OfflinePrearms(input,data);
 console.log(JSON.stringify({
  status:result.status,
  templateSha256:result.templateSha256,
  threeIndependentOwners:result.owners.map(({horizon,ownerDigest,queryCount,
   runningGitHubJobMustBeVerifiedByUtc,prearmWindowOpensUtc,
   firstPlannedDispatchUtc,lastPlannedDispatchUtc,
   reservedPhysicalAttempts,reservedApiUnits})=>({
    horizon,ownerDigest,queryCount,prearmWindowOpensUtc,
    runningGitHubJobMustBeVerifiedByUtc,firstPlannedDispatchUtc,
    lastPlannedDispatchUtc,reservedPhysicalAttempts,reservedApiUnits
   })),
  fullGridRequests:result.fullGridRequests,
  fullGridWorstCaseApiUnits:result.fullGridWorstCaseApiUnits,
  actualRunnersArmed:false,providerCalls:0,databaseWrites:0,
  scientificGate5Passed:false,phase5FreezeAuthorized:false,
  phase6Authorized:false
 }));
 console.log("P4_G5_THREE_OWNER_PLAN_COMPILED_OFFLINE_NOT_ARMED");
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_prearm_offline_actions.ts"))
 void mainP4G5OfflinePrearm().catch(()=>{
  console.error("P4_G5_PREARM_OFFLINE_HOLD_NO_PROVIDER");
  process.exitCode=2;
 });
