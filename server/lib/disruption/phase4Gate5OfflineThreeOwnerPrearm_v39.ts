/**
 * Phase 4 Gate 5: three INDEPENDENT future GitHub prearm owner plans.
 * Prepares a full nonadaptive FIDS query grid, never dispatches/authorizes
 * paid calls, and never promotes generic FIDS times to actual labels.
 * A runner physically armed and verified in GitHub is a separate fact.
 */
import {createHash} from "node:crypto";
import {draftP4Gate5ThreeHorizonGridV39,
 type P4Gate5GridDraftInputV39}
 from "./phase4Gate5FrozenGridDraft_v39";

export interface P4G5OfflineTemplate {
 schema:"v39.phase4.gate5-offline-three-owners.v1";
 mode:"HOLD_NO_PROVIDER";
 cohortId:string;
 grid:P4Gate5GridDraftInputV39;
 verifiedFirstNativeT:false;
 actualOnlyWheelsOffVerified:false;
 physicalOperatingLegVerified:false;
 legallyPermittedSourceRetentionVerified:false;
 providerBoundaryVerified:false;
 currentCycleRestBudgetVerified:false;
 paidSourceActivationAuthorized:false;
}
const horizons=["T-24h","T-6h","T-90m"] as const;
function ms(v:string):number {
 if(typeof v!=="string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v))
  throw Error("P4_PREARM_INVALID_EXACT_UTC");
 const n=Date.parse(v);
 if(!Number.isFinite(n)||new Date(n).toISOString()!==v)
  throw Error("P4_PREARM_INVALID_EXACT_UTC");
 return n;
}
export function compileP4G5OfflinePrearms(input:P4G5OfflineTemplate, originalBytes:string){
 if(!input||input.schema!=="v39.phase4.gate5-offline-three-owners.v1"||
  input.mode!=="HOLD_NO_PROVIDER"||
  typeof input.cohortId!=="string"||
  !/^[A-Z0-9_-]{8,90}$/.test(input.cohortId)||
  !input.cohortId.startsWith("SYNTHETIC_")||
  input.verifiedFirstNativeT!==false||
  input.actualOnlyWheelsOffVerified!==false||
  input.physicalOperatingLegVerified!==false||
  input.legallyPermittedSourceRetentionVerified!==false||
  input.providerBoundaryVerified!==false||
  input.currentCycleRestBudgetVerified!==false||
  input.paidSourceActivationAuthorized!==false||
  Object.keys(input).length!==11)
   throw Error("P4_PREARM_SYNTHETIC_HOLD_TEMPLATE_REQUIRED");
 if(typeof originalBytes!=="string"||originalBytes.length>20000)
  throw Error("P4_PREARM_TEMPLATE_BYTES_HOLD");
 let parsed:unknown;
 try{parsed=JSON.parse(originalBytes);}catch{
  throw Error("P4_PREARM_TEMPLATE_BYTES_HOLD");
 }
 if(JSON.stringify(parsed)!==JSON.stringify(input))
  throw Error("P4_PREARM_ORIGINAL_TEMPLATE_CHANGED_HOLD");
 const grid=draftP4Gate5ThreeHorizonGridV39(input.grid);
 if(input.grid.acquisitionGuardMinutes<15)
  throw Error("P4_PREARM_DISPATCH_GUARD_BELOW_15M");
 const digest=createHash("sha256").update(originalBytes,"utf8").digest("hex");
 const owners=grid.horizonOwners.map((o)=>{
  const qs=grid.queries.filter(q=>q.horizon===o.horizon);
  if(qs.length!==o.queryCount||qs.length===0)
   throw Error("P4_PREARM_HORIZON_COUNT_HOLD");
  const start=ms(o.earliestPhysicalStartUtc),end=ms(o.latestPhysicalStartUtc);
  const duration=(end-start)/60000;
  const wait=Math.min(240,330-duration);
  const prearmOpen=start-wait*60000;
  const prearmDeadline=ms(o.verifiedPrearmDeadlineUtc);
  if(wait<60||prearmOpen>=prearmDeadline||
    prearmDeadline>=start||end<start)
   throw Error("P4_PREARM_HOSTED_RUNNER_LIFETIME_HOLD");
  const entries=qs.map((q,index)=>{
   const dispatch=ms(q.plannedPhysicalStartUtc);
   const cutoff=ms(q.candidateGridCutoffUtc);
   const hardLatest=cutoff-15*60000;
   if(dispatch>hardLatest || cutoff-dispatch!==
      input.grid.acquisitionGuardMinutes*60000 ||
      (index>0&&dispatch<=ms(qs[index-1].plannedPhysicalStartUtc)))
    throw Error("P4_PREARM_HARD_CUTOFF_OR_ORDER_HOLD");
   return {
    candidateCutoffUtc:q.candidateGridCutoffUtc,
    targetPhysicalDispatchUtc:q.plannedPhysicalStartUtc,
    latestPermittedPhysicalDispatchUtc:new Date(hardLatest).toISOString(),
    providerFromLocal:q.providerQueryFromLocal,
    providerToLocal:q.providerQueryToLocal
   };
  });
  return {
   horizon:o.horizon,
   ownerDigest:createHash("sha256").update(
    digest+"|"+input.cohortId+"|"+o.horizon+"|"+
    o.earliestPhysicalStartUtc+"|"+o.latestPhysicalStartUtc
   ).digest("hex"),
   prearmWindowOpensUtc:new Date(prearmOpen).toISOString(),
   runningGitHubJobMustBeVerifiedByUtc:o.verifiedPrearmDeadlineUtc,
   firstPlannedDispatchUtc:o.earliestPhysicalStartUtc,
   lastPlannedDispatchUtc:o.latestPhysicalStartUtc,
   maximalPrearmWaitMinutes:wait,
   queryCount:qs.length,
   reservedPhysicalAttempts:qs.length*input.grid.maxAttemptsPerQuery,
   reservedApiUnits:qs.length*input.grid.maxAttemptsPerQuery*
    input.grid.apiUnitsPerPhysicalAttempt,
   entries,
   actualGitHubRunnerObserved:false as const,
   paidDispatchAllowed:false as const
  };
 });
 if(owners.length!==3||
  owners.some((o,i)=>o.horizon!==horizons[i])||
  owners.reduce((s,o)=>s+o.queryCount,0)!==grid.queries.length||
  owners.reduce((s,o)=>s+o.reservedApiUnits,0)!==grid.expectedMaxApiUnits||
  owners[0].lastPlannedDispatchUtc>=owners[1].firstPlannedDispatchUtc||
  owners[1].lastPlannedDispatchUtc>=owners[2].firstPlannedDispatchUtc)
  throw Error("P4_PREARM_THREE_OWNER_BUDGET_OR_SCOPE_HOLD");
 return {
  schema:"v39.phase4.gate5-three-independent-horizon-owners.v1" as const,
  status:"ENGINEERING_OFFLINE_NOT_ARMED" as const,
  cohortId:input.cohortId,
  templateSha256:digest,
  owners,
  fullGridRequests:grid.queries.length,
  fullGridWorstCaseApiUnits:grid.expectedMaxApiUnits,
  actualGitHubRunnersVerified:false as const,
  paidSourceActivationAuthorized:false as const,
  certifiedPrePersisted:false as const,
  strictGate5Passed:false as const,
  phase5FreezeAuthorized:false as const,
  phase6Authorized:false as const,
  providerCalls:0 as const,
  databaseWrites:0 as const
 };
}
export function requireP4G5PrearmOfflineActionsContext(
 env:NodeJS.ProcessEnv,checkoutSha:string
){
 if(env.GITHUB_ACTIONS!=="true"||
  env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
  env.GITHUB_EVENT_NAME!=="push"||
  env.GITHUB_REF!=="refs/heads/main"||
  env.GITHUB_RUN_ATTEMPT!=="1"||
  env.GITHUB_JOB!=="compile-offline-three-owners"||
  env.GITHUB_WORKFLOW!=="Phase4 Gate5 Offline Three Horizon GitHub Prearm Planner"||
  env.GITHUB_WORKFLOW_REF!=="HKcode22/ReplitTranvr/.github/workflows/phase4-gate5-offline-three-horizon-owner-prearm.yml@refs/heads/main"||
  env.P4_G5_PREARM_INTENT!=="SYNTHETIC_THREE_HORIZONS_ZERO_PROVIDER"||
  !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA??"")||
  checkoutSha!==env.GITHUB_SHA||
  !!env.AERODATABOX_API_KEY||!!env.RAPIDAPI_KEY||
  !!env.DATABASE_URL||!!env.V39_DATABASE_RUNTIME_URL||
  !!env.GATE05_AUTOMATION_DATABASE_URL)
  throw Error("P4_PREARM_GITHUB_EVENT_OR_SECRET_HOLD");
}
