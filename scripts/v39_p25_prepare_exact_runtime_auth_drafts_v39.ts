/**
 * ZERO PROVIDER / ZERO DATABASE: stage exact P25 runtime and AuthRecord DRAFT
 * in a new /tmp directory. Does not approve the AUTH ledger, mutate budget,
 * close an incident, or submit an AeroDataBox subscription.
 * Execute from an isolated audit worktree with the published SHA git object
 * and the frozen P25 science PR available as local git refs.
 */
import {createHash} from "node:crypto";
import {readFileSync,writeFileSync,mkdtempSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {loadGate2RuntimeBindingV39,stage1AuthorizationScopeV39} from "../server/lib/disruption/phase2Gate2Runtime_v39.ts";

const SOURCE_BRANCH="origin/phase2g-p25-20261012-integrated-release-review";
const REVIEWED="9c8ab21e98e86bcee52de2b1bbf0f9c6c20b3e30";
const FROZEN_BRANCH="origin/phase2g-p25-20261012-integrated-release-review";
const FROZEN_PATH="artifacts/phase2g-early-pilot-yssy-p25-recovery-freeze-20261011.json";
const DECISION_PATH="artifacts/phase2g-p25-yssy-prospective-project-lead-approval-20261011.json";
const P25_APPROVED_SHA="4ac004e0150a3816e272cbec37907e598bb0605870c65a63477e526e2ba81c61";
const P25_FROZEN_SHA="b54256346a35354d71e46e18a44d175056cba3228d93313d0036cc08af2f4f94";
const OLD_RUNTIME="artifacts/phase2g-gate2-runtime-P2G-S1-20261008-22.json";
const OLD_AUTH="SEPmd/V3.9_PHASE2G_AUTH_20261008_P2G23.json";
const SMOKE="artifacts/v39-phase2-safety-smoke-AUTH-20260915-P2F095554-20260915T100325Z.json";
const SMOKE_RUNTIME="artifacts/phase2f-smoke-runtime-20260915T095554Z.json";
const PREPROBE="artifacts/preprobe-reference-freeze-record.json";
const BUDGET="P2G-S1-20261013-03";
const AUTH_ID="AUTH-20261013-P2G25";
const sha=(s:string|Buffer)=>createHash("sha256").update(s).digest("hex");
const git=(args:string[],opts?:{encoding?:"utf8"})=>execFileSync("git",args,{encoding:"utf8",maxBuffer:20*1024*1024}).trim();
const show=(ref:string,p:string)=>execFileSync("git",["show",`${ref}:${p}`],{encoding:"utf8",maxBuffer:20*1024*1024});
const SOURCE=git(["rev-parse",SOURCE_BRANCH]);
if(!/^[a-f0-9]{40}$/.test(SOURCE))throw Error("REFUSED:SOURCE_COMMIT_INVALID");
try{
 execFileSync("git",["merge-base","--is-ancestor",REVIEWED,SOURCE],
   {stdio:"ignore"});
}catch{throw Error("REFUSED:REVIEWED_PUBLISHED_BASE_NOT_ANCESTOR")}
// This is a DRAFT from a reviewed future source commit. Committing only
// artifacts after this point must leave protected source tree unchanged.
const decisionRaw=show(FROZEN_BRANCH,DECISION_PATH);
const freezeRaw=show(FROZEN_BRANCH,FROZEN_PATH);
if(sha(decisionRaw)!==P25_APPROVED_SHA||sha(freezeRaw)!==P25_FROZEN_SHA)
 throw Error("REFUSED:SCIENCE_APPROVAL_OR_FREEZE_SHA_NOT_REVIEWED");
const approved=JSON.parse(decisionRaw),freeze=JSON.parse(freezeRaw);
const p25=freeze.p2g25_yssy_published_infrastructure_recovery_rerun;
if(approved.status!=="PROJECT_LEAD_APPROVED_ONE_RECOVERY"||
   approved.provider_mutation_authorized_now!==false||
   approved.paid_launch_authorized_now!==false||
   p25.authorized!==true||
   p25.approval_status!=="PROJECT_LEAD_APPROVED_ONE_RECOVERY"||
   p25.project_lead_decision_sha256!==P25_APPROVED_SHA||
   p25.current_utc_window_start!=="2026-10-13T03:00:00Z"||
   p25.max_alert_credits!==500||
   !p25.no_automatic_retry_after_this_attempt)
 throw Error("REFUSED:PROSPECTIVE_SCIENCE_SCOPE_MISMATCH");
const out=mkdtempSync(path.join(tmpdir(),"yssy-p25-exact-runtime-review-"));
const protectedTree=sha(execFileSync("git",["ls-tree","-r",SOURCE,"--","server","scripts","migrations","tests",".github/workflows"],{encoding:"utf8",maxBuffer:20*1024*1024}));
const previous=JSON.parse(readFileSync(OLD_RUNTIME,"utf8"));
if(previous.stage1ReservationCredits!==450||previous.unsettledBurstMarginCredits!==50||
   previous.watchdogPollMs!==5000||previous.settlementTimeoutSeconds!==600)
 throw Error("REFUSED:OLD_RUNTIME_BASELINE_UNEXPECTED");
const runtime={
 ...previous,sourceGitHead:SOURCE,
 sourceProtectedTreeSha256:protectedTree,
 probeBudgetDayId:BUDGET,
 stage1AmendmentSha256:P25_FROZEN_SHA
};
const runtimePath=path.join(out,`phase2g-gate2-runtime-${BUDGET}.json`);
const runtimeRaw=JSON.stringify(runtime,null,2)+"\n";
writeFileSync(runtimePath,runtimeRaw,{flag:"wx",mode:0o600});
const runtimeSha=sha(runtimeRaw);
const smokeRuntimeSha=sha(readFileSync(SMOKE_RUNTIME));
const binding=loadGate2RuntimeBindingV39({
 probeRuntimePath:runtimePath,probeRuntimeFileSha256:runtimeSha,
 smokePath:SMOKE,smokeRuntimePath:SMOKE_RUNTIME,
 smokeRuntimeFileSha256:smokeRuntimeSha,preprobePath:PREPROBE
});
const priorAuth=JSON.parse(readFileSync(OLD_AUTH,"utf8"));
const auth={
 ...priorAuth,authorizationId:AUTH_ID,
 airportFilterWindow:stage1AuthorizationScopeV39(binding),
 startNotBeforeUtc:"2026-10-13T03:00:00.000Z",
 expiresAtUtc:"2026-10-13T05:25:00.000Z",
 maxAlertCredits:500,
 cleanupOwner:"scripts/v39_phase2g_github_actions_owner_v39.sh",
 predecessorEvidenceIds:[binding.smoke.evidenceId,binding.evidenceId]
};
const authRaw=JSON.stringify(auth,null,2)+"\n";
const authPath=path.join(out,`V3.9_PHASE2G_AUTH_20261013_P2G25_REVIEW_ONLY.json`);
writeFileSync(authPath,authRaw,{flag:"wx",mode:0o600});
const authSha=sha(authRaw);
const ledgerDraft=[
 `### ${AUTH_ID} — approved Phase 2G Stage-1 authorization`,
 "approval_scope: PHASE_2G_STAGE1_ONLY",
 `AUTH_ARTIFACT_SHA256:${authSha}`,
 `original_smoke_evidence_id: ${binding.smoke.evidenceId}`,
 `fresh_gate2_runtime_evidence_id: ${binding.evidenceId}`,
 `source_head: ${SOURCE}`,
 `P25_science_freeze_sha256: ${P25_FROZEN_SHA}`,
 "IMPORTANT: REVIEW ONLY. DO NOT APPEND TO APPROVED LEDGER WITHOUT EXACT PROJECT-LEAD PAID AUTHORIZATION.",
 "historic_incident30_administrative_containment_must_be_proven:true",
 "original_120min_rehearsal:SKIPPED_NOT_PASSED",
 "provider_mutation_authorized_now:false"
].join("\n")+"\n";
const ledgerPath=path.join(out,"P25_AUTH_LEDGER_APPROVAL_REVIEW_ONLY.md");
writeFileSync(ledgerPath,ledgerDraft,{flag:"wx",mode:0o600});
writeFileSync(path.join(out,"P25_FROZEN_SCIENCE_APPROVAL_REVIEW_ONLY.json"),decisionRaw,{flag:"wx",mode:0o600});
writeFileSync(path.join(out,"P25_FROZEN_SCIENCE_AMENDMENT_REVIEW_ONLY.json"),freezeRaw,{flag:"wx",mode:0o600});
console.log(JSON.stringify({
 schema:"v39.p25.runtime-auth-drafts-source-pinned.v1",
 status:"DRAFT_REVIEW_ONLY_NO_PAID_AUTH",
 published_git_head:SOURCE,
 actual_protected_source_tree_sha256:protectedTree,
 stage1_budget_day_id:BUDGET,
 stage1_icao:"YSSY",
 stage1_target_utc_window:"2026-10-13T03:00:00Z/2026-10-13T05:00:00Z",
 runtime_file:runtimePath,runtime_sha256:runtimeSha,
 auth_file:authPath,auth_sha256:authSha,
 science_freeze_sha256:P25_FROZEN_SHA,
 smoke_runtime_sha256:smokeRuntimeSha,
 gate2_evidence_id:binding.evidenceId,
 smoke_evidence_id:binding.smoke.evidenceId,
 draft_auth_ledger_file:ledgerPath,
 prior_auth_reused:false,
 paid_auth_approved:false,incident30_rechecked_by_this_script:false,
 paid_preflight_passed:false,provider_calls:0,
 sql_mutations:0,paid_alert_credits_spent:0
},null,2));
