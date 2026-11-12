/**
 * The V0091 source enrollment login is the EXISTING Stage30 PREPARE-only
 * login. It cannot execute Stage14 PRE, source HTTP, raw-content mutation,
 * or direct V0087 INSERT. This independent release gate is not permission
 * to run the paid FIDS source GET or to declare Phase6 GO.
 */
const H=/^[a-f0-9]{64}$/,CODE=/^[a-f0-9]{40}$/;
const CONFIRM="REGISTER_ONE_BOUND_EXISTING_FIDS_ORIGINAL_NO_PROVIDER";
const fail=(s:string):never=>{
 throw Error("REFUSED_P5_CD_GH_SOURCE_ENROLL_"+s);
};
export interface P5CdGithubSourceEnrollRelease{
 schema:"v39.phase5.cd-v0091-github-source-enrollment-release.v1";
 releaseMode:"PHASE5_CANARY"|"PHASE6_APPROVED";
 approvedCodeSha:string;
 manifestSha256:string;
 rightsSha256:string;
 rosterSha256:string;
 packetSha256:string;
 stop:false;
 paidProviderCalls:0;
 phase5FreezeGrantedHere:false;
 phase6GoGrantedHere:false;
}
export function requireP5CdGithubSourceEnrollRelease(
 e:NodeJS.ProcessEnv
):P5CdGithubSourceEnrollRelease{
 const canary=e.P5_CD_GH_PRE_MODE==="PHASE5_CANARY"&&
   e.P5_CD_GH_PHASE5_CANARY_APPROVED==="1"&&
   e.V39_PHASE6_PROCESS_ARMED==="0"&&
   e.V39_PHASE5_FREEZE_SIGNED!=="1";
 const phase6=e.P5_CD_GH_PRE_MODE==="PHASE6_APPROVED"&&
   e.P5_CD_GH_PHASE5_CANARY_APPROVED!=="1"&&
   e.V39_PHASE6_PROCESS_ARMED==="1"&&
   e.V39_PHASE5_FREEZE_SIGNED==="1";
 if((!canary&&!phase6)||e.GITHUB_ACTIONS!=="true"||
    e.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    e.GITHUB_REF!=="refs/heads/main"||
    !["schedule","workflow_dispatch"].includes(e.GITHUB_EVENT_NAME??"")||
    e.GITHUB_RUN_ATTEMPT!=="1"||
    !CODE.test(e.GITHUB_SHA??"")||
    e.GITHUB_SHA!==e.P5_CD_GH_ENROLL_APPROVED_CODE_SHA||
    e.P5_CD_GH_ENROLL_CONFIRM!==CONFIRM||
    e.P5_CD_GH_ENROLL_ARMED!=="1"||
    e.P5_CD_GH_ENROLL_APPROVED!=="1"||
    e.P5_CD_GH_ENROLL_STOP!=="0"||
    e.P5_CD_GH_PRE_STOP!=="0"||
    e.V39_PHASE5_SOURCE_RIGHTS_APPROVED!=="1"||
    ![e.P5_CD_GH_PRE_ROSTER_SHA256,e.P5_CD_GH_ENROLL_PACKET_SHA256,
      e.V39_P5_RIGHTS_SHA256,e.V39_P5_MANIFEST_SHA256]
     .every(x=>typeof x==="string"&&H.test(x))||
    e.ADB_AUTO_COLLECT!=="0"||
    e.AERODATABOX_API_KEY||e.AERODATABOX_WEBHOOK_SECRET||
    e.DATABASE_URL||e.V39_DATABASE_RUNTIME_URL||
    e.V39_P5_SOURCE_DATABASE_URL||
    e.P5_V39_PRE_DATABASE_URL||
    e.P5_V39_T24_WITNESS_DATABASE_URL||
    e.P5_V39_OTHER_REST_REVIEW_DATABASE_URL||
    e.P5_V39_OTHER_REST_RESERVE_DATABASE_URL)
  fail("NO_EXACT_MAIN_APPROVAL_ROSTER_RIGHTS_OR_STOP_CLEAR");
 const value=e.P5_V39_PREPARE_DATABASE_URL;
 if(typeof value!=="string"||value.length<35)
  return fail("STAGE30_PREPARE_LOGIN_NOT_SUPPLIED");
 let url:URL;
 try{url=new URL(value);}catch{return fail("STAGE30_PREPARE_URL_INVALID");}
 if(!["postgres:","postgresql:"].includes(url.protocol)||
    decodeURIComponent(url.username)!=="phase5_p30_prepare_login_20261107"||
    !url.password||url.pathname!=="/neondb"||url.hash||
    !url.hostname||["localhost","127.0.0.1","::1"].includes(url.hostname))
  fail("CROSS_ROLE_OR_NONPRODUCTION_PREPARE_URL");
 return{
  schema:"v39.phase5.cd-v0091-github-source-enrollment-release.v1",
  releaseMode:canary?"PHASE5_CANARY":"PHASE6_APPROVED",
  approvedCodeSha:e.GITHUB_SHA!,
  manifestSha256:e.V39_P5_MANIFEST_SHA256!,
  rightsSha256:e.V39_P5_RIGHTS_SHA256!,
  rosterSha256:e.P5_CD_GH_PRE_ROSTER_SHA256!,
  packetSha256:e.P5_CD_GH_ENROLL_PACKET_SHA256!,
  stop:false,paidProviderCalls:0,
  phase5FreezeGrantedHere:false,phase6GoGrantedHere:false
 };
}
