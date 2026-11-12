/**
 * Phase5 C+D source-to-queue admission gate for the EXISTING Stage30
 * PREPARE-only login. Separate from Stage14 PRE, never a paid source.
 *
 * A signed packet digest is still not a provider Contents license.
 * All facts and native first T must be verified in V0091 PG16.
 */
import type {P5CdGithubPreRelease}
 from "./phase5CdGithubPreReleaseGate_v39";
const SHA=/^[0-9a-f]{40}$/;
const HASH=/^[0-9a-f]{64}$/;
const ACK="REGISTER_ONE_ALREADY_BOUND_SOURCE_FLIGHT_NO_PROVIDER";
function deny(s:string):never{
 throw Error("REFUSED_P5_CD_GH_PREPARE_"+s);
}
export interface P5CdGithubPrepareAdmission{
 gate:P5CdGithubPreRelease;
 databaseUrl:string;
 /** GH cannot self-certify ML/legal rights or scientific freeze. */
 sourceRightsIndependentlyCertifiedByThisFunction:false;
}
export function requireP5CdGithubPrepareAdmission(
 env:NodeJS.ProcessEnv
):P5CdGithubPrepareAdmission{
 const canary=env.P5_CD_GH_PRE_MODE==="PHASE5_CANARY"&&
  env.P5_CD_GH_PHASE5_CANARY_APPROVED==="1"&&
  env.V39_PHASE6_PROCESS_ARMED==="0"&&
  env.V39_PHASE5_FREEZE_SIGNED!=="1";
 const phase6=env.P5_CD_GH_PRE_MODE==="PHASE6_APPROVED"&&
  env.P5_CD_GH_PHASE5_CANARY_APPROVED!=="1"&&
  env.V39_PHASE6_PROCESS_ARMED==="1"&&
  env.V39_PHASE5_FREEZE_SIGNED==="1";
 if((!canary&&!phase6)||
    env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||
    env.GITHUB_EVENT_NAME!=="workflow_dispatch"||
    env.GITHUB_RUN_ATTEMPT!=="1"||
    !SHA.test(env.GITHUB_SHA??"")||
    !SHA.test(env.P5_CD_GH_PRE_APPROVED_CODE_SHA??"")||
    env.P5_CD_GH_CODE_LINEAGE_VERIFIED!==env.GITHUB_SHA+":"+
      env.P5_CD_GH_PRE_APPROVED_CODE_SHA||
    env.P5_CD_GH_PREPARE_CONFIRM!==ACK||
    env.P5_CD_GH_PREPARE_ARMED!=="1"||
    env.P5_CD_GH_PRE_ARMED!=="1"||
    env.P5_CD_GH_PRE_STOP!=="0"||
    env.V39_PHASE5_SOURCE_RIGHTS_APPROVED!=="1"||
    env.ADB_AUTO_COLLECT!=="0"||
    env.AERODATABOX_API_KEY||env.AERODATABOX_WEBHOOK_SECRET||
    env.DATABASE_URL||env.V39_DATABASE_RUNTIME_URL||
    env.V39_P5_SOURCE_DATABASE_URL||
    env.P5_V39_PRE_DATABASE_URL||
    env.P5_V39_T24_WITNESS_DATABASE_URL||
    env.P5_V39_OTHER_REST_REVIEW_DATABASE_URL||
    env.P5_V39_OTHER_REST_RESERVE_DATABASE_URL||
    !HASH.test(env.P5_CD_GH_PRE_ROSTER_SHA256??"")||
    !HASH.test(env.V39_P5_MANIFEST_SHA256??"")||
    !HASH.test(env.V39_P5_RIGHTS_SHA256??""))
  deny("NO_REVIEWED_MAIN_SOURCE_RIGHTS_EXPLICIT_PREPARE_ARM_OR_STOP");
 const raw=env.P5_V39_PREPARE_DATABASE_URL;
 let url:URL;
 try{url=new URL(raw??"");}catch{deny("MISSING_STAGE30_PREPARE_CREDENTIAL");}
 if(!["postgres:","postgresql:"].includes(url.protocol)||
    decodeURIComponent(url.username)!=="phase5_p30_prepare_login_20261107"||
    !url.password||url.pathname!=="/neondb"||url.hash||
    !url.hostname||["localhost","127.0.0.1","::1"].includes(url.hostname))
  deny("UNREVIEWED_OR_SHARED_APPLICATION_DB_ROLE");
 return {
  gate:{
   schema:"v39.phase5.cd-gh-pre-explicit-release.v1",
   releaseMode:canary?"PHASE5_CANARY":"PHASE6_APPROVED",
   approvedCodeSha:env.P5_CD_GH_PRE_APPROVED_CODE_SHA!,
   rosterSha256:env.P5_CD_GH_PRE_ROSTER_SHA256!,
   rightsSha256:env.V39_P5_RIGHTS_SHA256!,
   manifestSha256:env.V39_P5_MANIFEST_SHA256!,
   stop:false,providerCalls:0,
   scientificFreezeEstablishedByThisFunction:false
  },
  databaseUrl:raw!,
  sourceRightsIndependentlyCertifiedByThisFunction:false
 };
}
