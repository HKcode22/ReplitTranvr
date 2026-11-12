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
 releaseMode:"PHASE5_CANARY"|"PHASE6_APPROVED";
 approvedCodeSha:string;
 rosterSha256:string;
 rightsSha256:string;
 manifestSha256:string;
 stop:false;
 providerCalls:0;
 scientificFreezeEstablishedByThisFunction:false;
}
export function requireP5CdGithubPreRelease(
 env:NodeJS.ProcessEnv,
 options?:{allowReviewedT24Witness?:true}
):P5CdGithubPreRelease{
 // A small, no-provider Phase5 PRE pilot can furnish prospective
 // evidence BEFORE final scientific freeze. It requires its own explicit
 // owner/reviewer authorization, never reuses a Phase6 paid GO.
 const canary=env.P5_CD_GH_PRE_MODE==="PHASE5_CANARY"&&
  env.P5_CD_GH_PHASE5_CANARY_APPROVED==="1"&&
  env.V39_PHASE6_PROCESS_ARMED==="0"&&
  env.V39_PHASE5_FREEZE_SIGNED!=="1";
 const phase6=env.P5_CD_GH_PRE_MODE==="PHASE6_APPROVED"&&
  env.P5_CD_GH_PHASE5_CANARY_APPROVED!=="1"&&
  env.V39_PHASE5_FREEZE_SIGNED==="1"&&
  env.V39_PHASE6_PROCESS_ARMED==="1";
 if((!canary&&!phase6)||
    env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||
    !["schedule","workflow_dispatch"].includes(env.GITHUB_EVENT_NAME??"")||
    env.GITHUB_RUN_ATTEMPT!=="1"||
    !SHA.test(env.GITHUB_SHA??"")||
    !SHA.test(env.P5_CD_GH_PRE_APPROVED_CODE_SHA??"")||
    env.P5_CD_GH_CODE_LINEAGE_VERIFIED!==env.GITHUB_SHA+":"+
      env.P5_CD_GH_PRE_APPROVED_CODE_SHA||
    env.P5_CD_GH_PRE_CONFIRM!==HOLDER||
    env.P5_CD_GH_PRE_ARMED!=="1"||
    env.P5_CD_GH_PRE_STOP!=="0"||
    env.V39_PHASE5_SOURCE_RIGHTS_APPROVED!=="1"||
    env.ADB_AUTO_COLLECT!=="0"||
    env.AERODATABOX_API_KEY||
    env.AERODATABOX_WEBHOOK_SECRET||
    env.DATABASE_URL||env.V39_DATABASE_RUNTIME_URL||
    env.V39_P5_SOURCE_DATABASE_URL||
    env.P5_V39_PREPARE_DATABASE_URL||
    (env.P5_V39_T24_WITNESS_DATABASE_URL&&
     options?.allowReviewedT24Witness!==true)||
    env.P5_V39_OTHER_REST_REVIEW_DATABASE_URL||
    env.P5_V39_OTHER_REST_RESERVE_DATABASE_URL||
    !SHA256.test(env.P5_CD_GH_PRE_ROSTER_SHA256??"")||
    !SHA256.test(env.V39_P5_RIGHTS_SHA256??"")||
    !SHA256.test(env.V39_P5_MANIFEST_SHA256??""))
  hold("NO_REVIEWED_MAIN_SOURCE_RIGHTS_FROZEN_GO_OR_STOP_ACTIVE");
 if(options?.allowReviewedT24Witness){
  // T24 is the sole explicit exception to PRE-only process credentials:
  // the 2nd transaction MUST use the already installed Stage30 witness-only
  // login and the same Neon DB host with a distinct identity. No fallback
  // to the PRE application login, admin, or runtime role.
  if(env.P5_CD_GH_T24_WITNESS_APPROVED!=="1")
   hold("SEPARATE_T24_WITNESS_RELEASE_NOT_REVIEWED");
  let w:URL,p:URL;
  try{
   w=new URL(env.P5_V39_T24_WITNESS_DATABASE_URL??"");
   p=new URL(env.P5_V39_PRE_DATABASE_URL??"");
  }catch{hold("INDEPENDENT_STAGE30_T24_WITNESS_CREDENTIAL_MISSING");}
  if(!["postgres:","postgresql:"].includes(w.protocol)||
     decodeURIComponent(w.username)!=="phase5_p30_witness_login_20261107"||
     !w.password||w.pathname!=="/neondb"||w.hash||
     !w.hostname||w.host!==p.host||w.pathname!==p.pathname||
     decodeURIComponent(w.username)===decodeURIComponent(p.username)||
     ["localhost","127.0.0.1","::1"].includes(w.hostname))
   hold("T24_MUST_USE_DISTINCT_EXISTING_WITNESS_ONLY_ROLE");
 }
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
  releaseMode:canary?"PHASE5_CANARY":"PHASE6_APPROVED",
  approvedCodeSha:env.P5_CD_GH_PRE_APPROVED_CODE_SHA!,
  rosterSha256:env.P5_CD_GH_PRE_ROSTER_SHA256!,
  rightsSha256:env.V39_P5_RIGHTS_SHA256!,
  manifestSha256:env.V39_P5_MANIFEST_SHA256!,
  stop:false,
  providerCalls:0,
  scientificFreezeEstablishedByThisFunction:false
 };
}
export function requireP5CdGithubEFeatures(
 env:NodeJS.ProcessEnv,
 options?:{allowReviewedT24Witness?:true}
):P5CdGithubPreRelease{
 const gate=requireP5CdGithubPreRelease(env,options);
 if(env.P5_CD_GH_E_ROUTE_FEATURES_APPROVED!=="1")
  hold("AMENDMENT_E_SOURCE_FEATURE_RELEASE_NOT_APPROVED");
 return gate;
}
