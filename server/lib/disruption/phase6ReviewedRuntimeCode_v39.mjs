/**
 * Phase5B explicit executable approval, distinct from the frozen reviewed
 * study/code lineage. Never override GITHUB_SHA or re-sign old artifacts.
 * Only this exact historical policy anchor is eligible for this transition.
 * The owner-controlled runtime pin must match the real first-attempt main
 * checkout. Existing non-successor admissions retain their exact checks.
 */
export const P6_PHASE5B_REVIEWED_POLICY_ANCHOR="9c9cddb1aaeb04934d94af2937ee158e6d991f6c";
const CODE=/^[a-f0-9]{40}$/;
export function p6ReviewedPolicyMatchesRuntime(env,reviewed){
 const head=env?.GITHUB_SHA,approved=env?.P6_PHASE5B_RUNTIME_EXECUTABLE_SHA;
 if(!CODE.test(head??"")||!CODE.test(reviewed??""))return false;
 if(!approved)return reviewed===head;
 return CODE.test(approved)&&head===approved&&reviewed===P6_PHASE5B_REVIEWED_POLICY_ANCHOR&&
  env.GITHUB_ACTIONS==="true"&&env.GITHUB_REPOSITORY==="HKcode22/ReplitTranvr"&&
  env.GITHUB_REF==="refs/heads/main"&&env.GITHUB_RUN_ATTEMPT==="1"&&
  (["schedule","workflow_dispatch"].includes(env.GITHUB_EVENT_NAME)||
   (env.GITHUB_EVENT_NAME==="workflow_run"&&env.GITHUB_WORKFLOW_REF==="HKcode22/ReplitTranvr/.github/workflows/phase6-stored-post-recovery-no-provider.yml@refs/heads/main"&&env.P6_PHASE7_POST_RECOVERY_CONFIRM==="RECOVER_EXACT_COMMITTED_POST_NO_PROVIDER"));
}
export function p6ApprovedRuntimeSuccessor(env,reviewed){
 return Boolean(env?.P6_PHASE5B_RUNTIME_EXECUTABLE_SHA)&&p6ReviewedPolicyMatchesRuntime(env,reviewed);
}
