/** Build and validate the exact non-secret commitment-review metadata package
 * for prospective conditional commissioning (default Day 5) against the real
 * checked-in 31 day plans. Zero secrets, DB reads/writes, signatures or paid
 * provider calls. Independent scientific review approval remains external. */
import {readFileSync} from "node:fs";
import {pathToFileURL} from "node:url";
import {buildP6ConditionalCommitmentReviewArtifact} from "./v39_phase5b_conditional_policy_candidate_v39.mjs";

export function loadCheckedIn31PlanBytes(read=readFileSync){
 return Array.from({length:31},(_,i)=>read("data-collection/phase5/planning/phase6-source-day-"+String(i+1).padStart(2,"0")+".json"));
}

export function buildOwnerConditionalPreviewCommand(artifact){
 return [
  "gh workflow run phase6-nonpaid-source-day-prepare-publish.yml --ref main",
  "-f run_day_index="+artifact.firstEligibleRunDayIndex,
  "-f confirm=VERIFY_FUTURE_CONDITIONAL_POLICY_CUSTODY_NO_PROVIDER",
  "-f conditional_review_sha256="+artifact.reviewSha256,
  "-f conditional_review_base64="+artifact.reviewBase64
 ].join(" ");
}

if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 const args=Object.fromEntries(process.argv.slice(2).map(a=>{
  const m=/^--([a-zA-Z0-9-]+)=(.*)$/.exec(a);
  if(!m)throw Error("HOLD_P6_COMMISSIONING_PACKAGE_ARG");
  return [m[1],m[2]];
 }));
 const artifact=buildP6ConditionalCommitmentReviewArtifact({
  protocolSha256:args["protocol-sha256"],
  externalContentUseReviewSha256:args["external-use-sha256"],
  manifestSha256:args["manifest-sha256"],
  rightsSha256:args["rights-sha256"],
  basePolicyCommitmentSha256:args["base-commitment-sha256"],
  firstEligibleRunDayIndex:Number(args["day"]??"5"),
  effectiveUtc:args["effective-utc"],
  validUntilUtc:args["valid-until-utc"]??"2026-12-27T17:00:00.000Z",
  reviewedPlanBytes:loadCheckedIn31PlanBytes()
 });
 console.log(JSON.stringify({
  ...artifact,
  protectedPreviewCommand:buildOwnerConditionalPreviewCommand(artifact)
 },null,2));
}
