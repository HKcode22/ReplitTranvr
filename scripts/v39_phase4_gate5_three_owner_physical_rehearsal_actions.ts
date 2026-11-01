/**
 * Executed separately by THREE actual GitHub jobs on main, with no secrets.
 * Simulates frozen 2027 planned clock timestamps only. This is NOT a live
 * owner prearm, actual physical dispatch, API spend or historical source.
 */
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {
 prepareP4G5PhysicalOwnerV39,assessP4G5PhysicalAttemptV39,
 assertP4G5OwnerGitHubContextV39,
 type P4G5PhysicalOwnerPlanInputV39
} from "../server/lib/disruption/phase4Gate5PhysicalOwnerDispatchGuard_v39";
import type {P4Gate5GridHorizonV39}
 from "../server/lib/disruption/phase4Gate5FrozenGridDraft_v39";

const path="data-collection/phase4/GATE5_NEXT_COHORT_PREARM_SYNTHETIC_HOLD.json";
const horizons:Record<string,P4Gate5GridHorizonV39>={
 "owner-t24":"T-24h","owner-t6":"T-6h","owner-t90":"T-90m"
};
export function runP4G5ThreeOwnerRehearsalV39(){
 const job=process.env.GITHUB_JOB??"";
 const h=horizons[job];
 if(!h)throw Error("P4_REHEARSAL_JOB_NOT_AN_OWNER");
 const sha=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
 assertP4G5OwnerGitHubContextV39(process.env,sha,h);
 const bytes=readFileSync(path,"utf8");
 const m=JSON.parse(bytes) as {
  cohortId:string;mode:string;grid:P4G5PhysicalOwnerPlanInputV39["grid"];
  paidSourceActivationAuthorized:boolean
 };
 if(m.mode!=="HOLD_NO_PROVIDER"||
    m.paidSourceActivationAuthorized!==false||
    !m.cohortId.startsWith("SYNTHETIC_"))
  throw Error("P4_REHEARSAL_PRODUCTION_COHORT_FORBIDDEN");
 const hash=createHash("sha256").update(bytes).digest("hex");
 // The following is explicitly a SIMULATED 2027 time for test execution.
 // The real GitHub execution timestamp is printed separately, never
 // substituted into a physical paid prearm record.
 const from=m.grid.serviceWindowStartUtc;
 const lag=h==="T-24h"?1440:h==="T-6h"?360:90;
 const firstPhysical=Date.parse(from)-lag*60000-
  m.grid.acquisitionGuardMinutes*60000;
 const simulatedOwnerStart=new Date(firstPhysical-
  m.grid.githubPrearmLeadMinutes*60000-5*60000).toISOString();
 const owner=prepareP4G5PhysicalOwnerV39({
  cohortId:m.cohortId,frozenManifestBytes:bytes,
  reviewedManifestSha256:hash,grid:m.grid,
  horizon:h,actualOwnerProcessStartedAtUtc:simulatedOwnerStart
 });
 const checks=owner.entries.map((slot,index)=>{
  const planned=Date.parse(slot.plannedPhysicalStartUtc);
  const a=assessP4G5PhysicalAttemptV39({
   owner,queryIndex:index,physicalAttemptNumber:1,
   actualReservationCommittedAtUtc:new Date(planned-1000).toISOString(),
   actualFetchStartUtc:new Date(planned).toISOString(),
   currentAccountApiUnitsRemaining:59974,
   currentProjectApiUnitsRemaining:50000,
   projectUnitsAlreadyReservedForOtherSourceQueries:0,
   accountedThisOwnerPhysicalAttemptUnits:index*owner.perAttemptApiUnits
  });
  return {index,expectedUniqueReservationId:a.expectedUniqueReservationId,
   physicalAttemptNumber:1,dispatchTimingBudgetChecked:true,
   durableDbReservationProven:false,authorizedProviderDispatch:false};
 });
 const distinct=new Set(checks.map(x=>x.expectedUniqueReservationId));
 if(distinct.size!==checks.length)throw Error("P4_REHEARSAL_DUPLICATE_RESERVATION_ID");
 console.log(JSON.stringify({
  schema:"v39.phase4.gate5-3-separate-github-owner-dryrun.v1",
  status:"THREE_GITHUB_JOBS_SIMULATED_TIMES_ZERO_PROVIDER",
  actualGitHubJob:job,
  actualGitHubJobBeganCheckUtc:new Date().toISOString(),
  simulatedOwnerStartUtc:simulatedOwnerStart,
  cohortId:m.cohortId,manifestSha256:hash,
  horizon:h,ownerDigest:owner.ownerDigest,
  physicalSourceRequestsSimulated:checks.length,
  physicalAttemptReservationsSimulated:checks.length,
  allHorizonWorstCaseApiUnits:owner.horizonWorstCaseApiUnits,
  allFullGridWorstCaseApiUnits:owner.fullGridWorstCaseApiUnits,
  noActualTimedWaiting:true,noActualPrearmVerified:true,
  durableLedgerMissing:true,providerDispatchAuthorized:false,
  providerCalls:0,databaseWrites:0,
  strictGate5Passed:false,phase5FreezeAuthorized:false,phase6Authorized:false
 }));
 console.log("P4_G5_THREE_JOB_PHYSICAL_OWNER_REHEARSAL_PASS_NO_PROVIDER");
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_three_owner_physical_rehearsal_actions.ts")){
 try{runP4G5ThreeOwnerRehearsalV39();}catch{
  console.error("P4_G5_THREE_OWNER_REHEARSAL_HOLD_NO_PROVIDER");
  process.exitCode=2;
 }
}
