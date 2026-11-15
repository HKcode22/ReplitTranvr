/** Actual prospective metadata reveal -> original calendar and shape draft.
 * No source-content access, database, provider, signing key, released budget,
 * or independent approval. Compile once, following a previously recorded
 * commitment; same bundle produces the same candidate on every readback.
 */
import {createHash} from "node:crypto";
import {readFileSync,writeFileSync,existsSync} from "node:fs";
import {pathToFileURL} from "node:url";
import {verifyP5ProspectiveStudySeedBundle} from "./v39_phase5_prospective_study_seed_commit_reveal_v39.mjs";
import {proposeP5OrdinaryHubRegionRotation} from "../server/lib/disruption/phase5ProspectiveOrdinaryHubRegionRotation_v39.ts";
import {buildP5ActualFivePairB0062CalendarOnlyDraft} from "../server/lib/disruption/phase5RealFivePairB0062CalendarOnlyDraft_v39.ts";
import {proposeP5Adaptive31ShapeEnvelope} from "../server/lib/disruption/phase5Prospective31DayShapeEnvelope_v39.ts";
const hash=b=>createHash("sha256").update(b).digest("hex");
const gitBlob=b=>createHash("sha1").update(Buffer.from("blob "+b.length+"\0")).update(b).digest("hex");
const fail=s=>{throw Error("HOLD_P5_SEED_CALENDAR_PREVIEW_"+s);};
export function buildP5ProspectiveSeedCalendarPreview({seedBundle,expected,ownerEvidenceBytes,dateCandidateBytes}){
 if(!Buffer.isBuffer(ownerEvidenceBytes)||gitBlob(ownerEvidenceBytes)!=="12ce1415a268660aa1b65d82807230e171ad8741"||
    !Buffer.isBuffer(dateCandidateBytes)||hash(dateCandidateBytes)!==expected?.dateCandidateBytesSha256)
  fail("EXACT_REAL_PAIR_AND_PRECOMMITTED_DATE_BYTES_REQUIRED");
 const seedRead=verifyP5ProspectiveStudySeedBundle(seedBundle,expected);
 const o=JSON.parse(ownerEvidenceBytes.toString("utf8")),date=JSON.parse(dateCandidateBytes.toString("utf8"));
 if(date.status!=="PROPOSED_NOT_SIGNED_NOT_APPROVED_NO_GO"||date.firstRunDateUtc!==seedBundle.firstRunDateUtc||
    date.basisOwnerPairBlobSha!==gitBlob(ownerEvidenceBytes)||date.days?.length!==31||date.treatmentAssigned!==false)
  fail("DATE_PROPOSAL_SCOPE");
 const input={ownerCorrectedReadback:o,firstRunDateUtc:date.firstRunDateUtc,
  claimedTreatment:{treatmentSeedHex:seedBundle.treatmentSeedHex,
   announcedCommitmentSha256:seedBundle.announcedCommitmentSha256,
   claimedCommitmentObservedAtUtc:seedBundle.claimedCommitmentObservedAtUtc}};
 const rotation=proposeP5OrdinaryHubRegionRotation({...input,claimedRotationSeeds:seedBundle.claimedRotationSeeds});
 const shape=proposeP5Adaptive31ShapeEnvelope(input);
 const draft=buildP5ActualFivePairB0062CalendarOnlyDraft({
  schema:"v39.phase5.actual-five-pair-31-b0062-draft-input.v1",...input,
  ordinaryHubsAndRegions:rotation.ordinaryHubsAndRegions,
  predeclaredDailyDrawSeeds:seedBundle.predeclaredDailyDrawSeeds,
  assembledAtUtc:seedBundle.claimedCommitmentObservedAtUtc
 });
 if(draft.proposedDateMapSha256!==rotation.dateMapSha256||draft.proposedShapeEnvelopeSha256!==shape.shapeEnvelopeSha256||
    draft.calendarDays.length!==31||draft.futureOrdinaryAirportsSelected!==0||draft.phase6PaidGo!==false||
    draft.providerCalls!==0||draft.databaseWrites!==0||
    draft.calendarDays.some((x,i)=>x.startUtc!==date.days[i].conservativeStartUtc||
     x.runDayIndex!==date.days[i].runDayIndex||x.anchorIcao!==rotation.all31SlotMetadata[i].anchorIcao||
     x.slotRegions.HUB!==rotation.all31SlotMetadata[i].slotRegions.HUB||
     ["MID_A","MID_B","REGIONAL"].some(s=>x.slotRegions[s]!==rotation.all31SlotMetadata[i].slotRegions[s])))
  fail("REVEALED_CALENDAR_DRIFT");
 // This bundle deliberately contains only prospective metadata, no native
 // provider rows or credentials. Seed provenance remains a separate review.
 const result={schema:"v39.phase5.revealed-prospective-calendar-review-candidate.v1",
  status:"ACTUAL_SEED_BYTES_TO_UNSIGNED_31_DAY_CALENDAR_NO_GO",
  seedCommitmentSha256:seedRead.bundleCommitmentSha256,seedWorkflowRunId:seedBundle.workflowRunId,
  seedReviewedCodeSha:seedBundle.reviewedCodeSha,dateCandidateBytesSha256:expected.dateCandidateBytesSha256,
  rotationSha256:rotation.rotationSha256,calendarDraftJsonSha256:hash(JSON.stringify(draft)),
  shapeEnvelope:shape,calendarDraft:draft,rotation,
  independentSeedWitnessVerified:false,calendarIndependentlyApproved:false,
  currentAccountAndSevenCategoryBudgetVerified:false,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
 const bytes=JSON.stringify(result);
 return {result,bytes,sha256:hash(bytes)};
}
function run(){
 const e=process.env,seed=process.argv[2],out=process.argv[3];
 if(e.GITHUB_ACTIONS!=="true"||e.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    e.GITHUB_REF!=="refs/heads/main"||e.GITHUB_EVENT_NAME!=="workflow_dispatch"||e.GITHUB_RUN_ATTEMPT!=="1"||
    e.P5_SEED_CONFIRM!=="ONE_PROSPECTIVE_METADATA_SEED_COMMIT_REVEAL_NO_PROVIDER"||
    e.P5_SEED_APPROVED_MAIN!==e.GITHUB_SHA||e.ADB_AUTO_COLLECT!=="0"||
    e.V39_PHASE6_PROCESS_ARMED!=="0"||e.V39_PHASE6_OWNER_APPROVED!=="0"||
    [e.DATABASE_URL,e.V39_DATABASE_RUNTIME_URL,e.AERODATABOX_API_KEY,e.RAPIDAPI_KEY,e.AERODATABOX_WEBHOOK_SECRET].some(Boolean)||
    !seed||!out||existsSync(out))
  fail("EXPLICIT_REVEAL_MAIN_ONLY_NO_OVERWRITE");
 const bytes=readFileSync(seed);if(bytes.length>12000)fail("SEED_TOO_LARGE");
 const bundle=JSON.parse(bytes.toString("utf8"));if(JSON.stringify(bundle)!==bytes.toString("utf8"))fail("NONCANONICAL_SEED_REVEAL");
 const dateCandidateBytes=readFileSync("data-collection/phase5/planning/2026-11-15_nov22_service_start_date_only_candidate.json");
 const ownerEvidenceBytes=readFileSync("data-collection/phase5/evidence/2026-11-09_five_full_frame_pairs_post_selection_kteb_to_kbuf_readonly.json");
 const result=buildP5ProspectiveSeedCalendarPreview({seedBundle:bundle,expected:{
  bundleCommitmentSha256:e.P5_SEED_EXPECTED_COMMITMENT,reviewedCodeSha:e.GITHUB_SHA,workflowRunId:e.GITHUB_RUN_ID,
  dateCandidateBytesSha256:hash(dateCandidateBytes),firstRunDateUtc:"2026-11-22"},ownerEvidenceBytes,dateCandidateBytes});
 writeFileSync(out,result.bytes,{flag:"wx",mode:0o600});
 const d=result.result.calendarDraft,s=result.result.shapeEnvelope;
 console.log(JSON.stringify({status:result.result.status,calendarPreviewSha256:result.sha256,
  seedWorkflowRunId:result.result.seedWorkflowRunId,seedCommitmentSha256:result.result.seedCommitmentSha256,
  calendarDraftJsonSha256:result.result.calendarDraftJsonSha256,calendarRowsSha256:d.proposedCalendarRowsSha256,
  shapeEnvelopeSha256:s.shapeEnvelopeSha256,rotationSha256:result.result.rotationSha256,
  dateMapSha256:d.proposedDateMapSha256,calendarRows:d.calendarDays.length,ordinaryFutureAirportsSelected:0,
  activeChildExposureSegments:s.activeChildExposureSegments,
  maximumExposureHours:s.allExperimentExposureHoursAtMaximum,
  independentSeedWitnessVerified:false,phase6PaidGo:false,providerCalls:0,databaseWrites:0}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{run();}catch(e){console.error(/^HOLD_P5_SEED_CALENDAR_PREVIEW_[A-Z0-9_]+$/.test(e?.message??"")?e.message:"HOLD_P5_SEED_CALENDAR_PREVIEW_REDACTED");process.exitCode=2;}
}
