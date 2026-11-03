/**
 * GitHub-only finite evidence closeout runner (no provider/source identities).
 * Runs as a normal PR/push CI validation, not a collector or production gate.
 * Original GH job evidence independently inspected in issue #293; the pinned
 * numbers here are a reviewed public aggregate, NOT a signed provider source.
 */
import {evaluateP4G5FiniteSourceCloseoutV39,
 P4_G5_NOV2_VERIFIED_SOURCE_SUMMARIES_V39,
 planP4G5ConservativeRetentionDeadlineV39}
 from "../server/lib/disruption/phase4Gate5BoundedEvidenceCloseout_v39";

const expectedRepo="HKcode22/ReplitTranvr";
const expectedWorkflow="Phase4 Gate5 Finite Bounded Evidence Closeout (No Provider)";
const expectedJob="finite-bounded-closeout";
export function requireP4G5FiniteCloseoutGitHubContextV39(
 e:NodeJS.ProcessEnv
){
 if(e.GITHUB_ACTIONS!=="true"||
   e.GITHUB_REPOSITORY!==expectedRepo||
   !["push","pull_request"].includes(e.GITHUB_EVENT_NAME??"")||
   e.GITHUB_WORKFLOW!==expectedWorkflow||
   e.GITHUB_JOB!==expectedJob||
   e.GITHUB_RUN_ATTEMPT!=="1"||
   !!e.AERODATABOX_API_KEY||!!e.RAPIDAPI_KEY||
   !!e.DATABASE_URL||!!e.V39_DATABASE_RUNTIME_URL||
   !!e.GATE05_AUTOMATION_DATABASE_URL)
  throw Error("P4_G5_BOUNDED_CLOSEOUT_ONLY_PUBLIC_GITHUB_NO_SECRETS");
}
export async function main(){
 requireP4G5FiniteCloseoutGitHubContextV39(process.env);
 const r=evaluateP4G5FiniteSourceCloseoutV39(
  P4_G5_NOV2_VERIFIED_SOURCE_SUMMARIES_V39);
 const retention=planP4G5ConservativeRetentionDeadlineV39({
  // Completely synthetic time-range fixture: NOT an observed provider
  // Content right or future production expiry configuration.
  sourceAvailableAtUtc:"2026-11-04T10:00:00.000Z",
  requestedAuditAtUtc:"2026-11-04T10:30:00.000Z",
  purposeEndsAtUtc:"2026-11-05T00:00:00.000Z",
  projectSelfCapHours:24,cacheControlMaxAgeSeconds:null
 });
 if(!r.gate5OperationalDiagnosticClosed||
    r.scientificGate5Passed!==false||
    r.phase5FreezeAuthorized!==false||r.phase6Authorized!==false||
    r.successfulPhysicalFidsGets!==9||r.headerMeasuredApiUnits!==18||
    !r.byHorizon.every(x=>x.uniquePhysicalOperatingFlights===null&&
      x.verifiedFlightSpecificPRE===null&&x.actualOnlyWheelsOffLabels===null)||
    retention.retentionOrNewPaidCollectionAuthorized!==false)
  throw Error("P4_G5_BOUNDED_CLOSEOUT_UNEXPECTED_SCIENCE_PROMOTION");
 console.log(JSON.stringify({
  schema:r.schema,status:r.status,
  manifestSha256:r.manifestSha256,
  sourceOnlyOriginalRunIds:r.originalGithubRunIds,
  sourceOnlyIndependentAuditRunId:r.independentAuditGithubRunId,
  successfulFidsGets:r.successfulPhysicalFidsGets,
  headerMeasuredApiUnits:r.headerMeasuredApiUnits,
  sourceOnlyByHorizon:r.byHorizon,
  expiredOrUnmeasurableFlightLevelDenominatorsRemainNull:true,
  scientificGate5Passed:false,phase5FreezeAuthorized:false,
  phase6Authorized:false,sourceRetentionAuthorized:false,
  noProviderCalls:true,noDatabaseWrites:true,
  reviewerNote:"LOCAL SOURCE SUMMARY ONLY; NOT AUTHENTICATED PER-FLIGHT PRE OR ACTUAL-ONLY LABELS"
 }));
}
if(process.argv[1]?.endsWith("v39_phase4_gate5_nov2_bounded_closeout_actions.ts"))
 void main().catch(()=>{
  console.error("P4_G5_BOUNDED_CLOSEOUT_HARD_HOLD_NO_PROVIDER");
  process.exitCode=2;
 });
