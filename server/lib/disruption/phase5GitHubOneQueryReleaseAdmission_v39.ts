/**
 * Pure release/admission guard for one GitHub-only Phase5 FIDS request.
 * No network, DB, provider call or scheduler. Explicit release must exist.
 */
import {createHash} from "node:crypto";
import type {P5SourceSingleQueryPlan}
 from "./phase5ScopedFidsSourceBridge_v39";

const SHA=/^[a-f0-9]{64}$/;
const CODE=/^[a-f0-9]{40}$/;
const RUN=/^[0-9]{5,25}$/;
function hold(message:string):never{
 throw Error("REFUSED_P5_GITHUB_SOURCE_RELEASE_"+message);
}
export interface P5GitHubOneQueryReleaseEnvelope {
 schema:"v39.phase5.github-source-one-query.v1";
 manifestSha256:string;
 queryDigestSha256:string;
 approvedCodeSha:string;
 githubRunId:string;
 plan:P5SourceSingleQueryPlan;
}
export interface P5GitHubSourceAdmitted {
 schema:"v39.phase5.github-source-admitted.v1";
 codeSha:string;
 manifestSha256:string;
 queryDigestSha256:string;
 runDayIndex:number;
 slot:string;
 horizon:string;
 approvedOnePhysicalAttempt:true;
 paidSourceReleaseOnly:true;
 phase6Go:false;
 actualFlightPreCertified:false;
}

/** No secrets, no provider endpoints or local file reads are used here. */
export function admitP5GitHubOneQueryRelease(
 env:NodeJS.ProcessEnv,
 rawJsonBytes:Buffer,
 payload:P5GitHubOneQueryReleaseEnvelope,
):P5GitHubSourceAdmitted{
 if(env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||
    !["workflow_dispatch","schedule"].includes(env.GITHUB_EVENT_NAME??"")||
    env.GITHUB_RUN_ATTEMPT!=="1"||
    !CODE.test(env.GITHUB_SHA??"")||
    !RUN.test(env.GITHUB_RUN_ID??"")||
    env.V39_P5_SOURCE_OWNER_APPROVED!=="1"||
    env.V39_PHASE5_FREEZE_SIGNED!=="1"||
    env.V39_PHASE5_SOURCE_RIGHTS_APPROVED!=="1"||
    env.V39_P5_SOURCE_DB_ROLE_REVIEWED!=="1"||
    env.V39_P5_REST_UNIT_PRICE_APPROVED!=="2")
  hold("GITHUB_RELEASE_FLAGS_OR_RUN_ID");
 const approved=env.V39_P5_APPROVED_CODE_SHA;
 if(!CODE.test(approved??"")||approved!==env.GITHUB_SHA)
  hold("CODE_COMMIT_NOT_APPROVED");
 if(!payload||payload.schema!=="v39.phase5.github-source-one-query.v1"||
    ![payload.manifestSha256,payload.queryDigestSha256].every(x=>SHA.test(x))||
    payload.approvedCodeSha!==approved||
    payload.githubRunId!==env.GITHUB_RUN_ID)
  hold("SIGNED_RELEASE_QUERY_OR_RUN_MISMATCH");
 if(!Buffer.isBuffer(rawJsonBytes)||rawJsonBytes.length<100||
    rawJsonBytes.length>200000||
    !SHA.test(env.V39_P5_SIGNED_QUERY_JSON_SHA256??"")||
    createHash("sha256").update(rawJsonBytes).digest("hex")!==
      env.V39_P5_SIGNED_QUERY_JSON_SHA256)
  hold("EXACT_QUERY_JSON_HASH_UNVERIFIED");
 if(payload.manifestSha256!==env.V39_P5_MANIFEST_SHA256||
    payload.queryDigestSha256!==env.V39_P5_QUERY_DIGEST||
    payload.plan?.reviewedReleaseSha256!==env.V39_P5_RELEASE_SHA256||
    payload.plan?.reviewedProviderRightsSha256!==env.V39_P5_RIGHTS_SHA256||
    !SHA.test(payload.plan?.expectedEarlyDrawSha256??"")||
    payload.plan?.independentlyApprovedSourceAndRetention!==true||
    payload.plan?.githubOnlyOwnerApproved!==true)
  hold("PHASE5_SOURCE_RIGHTS_OR_SELECTED_DRAW_NOT_SIGNED");
 const q=payload.plan?.acquisition;
 if(!q||!Number.isInteger(q.runDayIndex)||
    q.runDayIndex<1||q.runDayIndex>31||
    !["HUB","MID_A","MID_B","REGIONAL"].includes(q.slot)||
    !["T-24h","T-6h","T-90m"].includes(q.horizon)||
    q.providerQueryDirection!=="Departure"||
    q.apiUnitsPerAttempt!==2||q.maxAttempts!==1)
  hold("UNREVIEWED_SOURCE_ROLE_PRICE_OR_ATTEMPTS");
 const str=env.V39_P5_SOURCE_DATABASE_URL;
 if(!str||!env.AERODATABOX_API_KEY)hold("SOURCE_DB_OR_PROVIDER_KEY_MISSING");
 let source:URL;
 try{source=new URL(str);}catch{hold("SOURCE_DB_URL_INVALID");}
 if(!["postgres:","postgresql:"].includes(source.protocol)||
    !source.hostname||!source.username||!source.pathname||
    !source.password)hold("NO_RESTRICTED_POSTGRES_IDENTITY");
 // Prevent silent use of the SAME ordinary application database role.
 for(const ordinary of [
  env.DATABASE_URL,env.V39_DATABASE_RUNTIME_URL
 ]){
  if(!ordinary)continue;
  try{
   const old=new URL(ordinary);
   if(old.username===source.username &&
      old.hostname===source.hostname &&
      old.pathname===source.pathname)
    hold("APPLICATION_RUNTIME_DB_ROLE_NOT_ISOLATED");
  }catch(e){
   if(e instanceof Error&&e.message.startsWith("REFUSED_P5_"))throw e;
  }
 }
 return {
  schema:"v39.phase5.github-source-admitted.v1",
  codeSha:approved!,manifestSha256:payload.manifestSha256,
  queryDigestSha256:payload.queryDigestSha256,
  runDayIndex:q.runDayIndex,slot:q.slot,horizon:q.horizon,
  approvedOnePhysicalAttempt:true,paidSourceReleaseOnly:true,
  phase6Go:false,actualFlightPreCertified:false
 };
}
