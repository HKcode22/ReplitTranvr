/**
 * Phase5 C+D: one explicit future GitHub-main PRE release gate.
 * This module AUTHORIZES NO paid provider requests, queue enrollment,
 * Phase5 scientific freeze or Phase6 paid GO by itself.
 * In live use, release secrets and reviewed code SHA must be established
 * separately by the owner/independent reviewer. Default is STOP.
 */
const SHA=/^[a-f0-9]{40}$/;
const SHA256=/^[a-f0-9]{64}$/;
const HOLDER="ONE_SIGNED_SOURCE_BOUND_CD_PRE_NO_PROVIDER";
function hold(reason:string):never{
 throw Error("REFUSED_P5_CD_GITHUB_PRE_"+reason);
}
export interface P5CdGithubPreRelease{
 schema:"v39.phase5.cd-gh-pre-explicit-release.v1";
 approvedCodeSha:string;
 rosterSha256:string;
 rightsSha256:string;
 manifestSha256:string;
 stop:false;
 providerCalls:0;
 scientificFreezeEstablishedByThisFunction:false;
}
export function requireP5CdGithubPreRelease(
 env:NodeJS.ProcessEnv
):P5CdGithubPreRelease{
 if(env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||
    !["schedule","workflow_dispatch"].includes(env.GITHUB_EVENT_NAME??"")||
    env.GITHUB_RUN_ATTEMPT!=="1"||
    !SHA.test(env.GITHUB_SHA??"")||
    env.GITHUB_SHA!==env.P5_CD_GH_PRE_APPROVED_CODE_SHA||
    env.P5_CD_GH_PRE_CONFIRM!==HOLDER||
    env.P5_CD_GH_PRE_ARMED!=="1"||
    env.P5_CD_GH_PRE_STOP!=="0"||
    env.V39_PHASE5_FREEZE_SIGNED!=="1"||
    env.V39_PHASE5_SOURCE_RIGHTS_APPROVED!=="1"||
    env.V39_PHASE6_PROCESS_ARMED!=="1"||
    env.ADB_AUTO_COLLECT!=="0"||
    env.AERODATABOX_API_KEY||
    env.AERODATABOX_WEBHOOK_SECRET||
    env.DATABASE_URL||env.V39_DATABASE_RUNTIME_URL||
    env.V39_P5_SOURCE_DATABASE_URL||
    env.P5_V39_PREPARE_DATABASE_URL||
    env.P5_V39_T24_WITNESS_DATABASE_URL||
    env.P5_V39_OTHER_REST_REVIEW_DATABASE_URL||
    env.P5_V39_OTHER_REST_RESERVE_DATABASE_URL||
    !SHA256.test(env.P5_CD_GH_PRE_ROSTER_SHA256??"")||
    !SHA256.test(env.V39_P5_RIGHTS_SHA256??"")||
    !SHA256.test(env.V39_P5_MANIFEST_SHA256??""))
  hold("NO_REVIEWED_MAIN_SOURCE_RIGHTS_FROZEN_GO_OR_STOP_ACTIVE");
 const raw=env.P5_V39_PRE_DATABASE_URL;
 if(!raw)hold("MISSING_EXISTING_STAGE30_PRE_LOGIN");
 let url:URL;
 try{url=new URL(raw);}catch{hold("INVALID_PRE_ONLY_CREDENTIAL");}
 if(!["postgres:","postgresql:"].includes(url.protocol)||
    decodeURIComponent(url.username)!=="phase5_p30_pre_login_20261107"||
    !url.password||url.pathname!=="/neondb"||url.hash||
    !url.hostname||
    ["localhost","127.0.0.1","::1"].includes(url.hostname))
  hold("NOT_REAL_EXISTING_RESTRICTED_PRE_LOGIN");
 return{
  schema:"v39.phase5.cd-gh-pre-explicit-release.v1",
  approvedCodeSha:env.GITHUB_SHA!,
  rosterSha256:env.P5_CD_GH_PRE_ROSTER_SHA256!,
  rightsSha256:env.V39_P5_RIGHTS_SHA256!,
  manifestSha256:env.V39_P5_MANIFEST_SHA256!,
  stop:false,
  providerCalls:0,
  scientificFreezeEstablishedByThisFunction:false
 };
}
export function requireP5CdGithubEFeatures(
 env:NodeJS.ProcessEnv
):P5CdGithubPreRelease{
 const gate=requireP5CdGithubPreRelease(env);
 if(env.P5_CD_GH_E_ROUTE_FEATURES_APPROVED!=="1")
  hold("AMENDMENT_E_SOURCE_FEATURE_RELEASE_NOT_APPROVED");
 return gate;
}
