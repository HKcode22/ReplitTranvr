/**
 * Authenticated GitHub runner for ONE previously signed future Phase6 day's
 * Stage7 -> Stage8 -> Stage9 PREPARED source query/partition operation.
 *
 * REUSE: existing stage30 dedicated PREPARE login/group and Stage7/8/9 code.
 * Zero AeroDataBox HTTP, Alert, provider original, PRE/POST or source rights
 * inference. No Replit Shell, no new migrations, no retiming missed cutoffs.
 * This worker is MANUAL and INERT unless a separately signed Day1+ packet
 * exists AFTER its real early four-airport draw and Phase6 GO.
 */
import {readFileSync,statSync} from "node:fs";
import {createHash} from "node:crypto";
import {Pool} from "pg";
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";
import {makeP5Stage28DedicatedRolePool,P5_STAGE28_GROUPS}
 from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";
import {prepareP5ReviewedSourceDayFromSavedDraw,
 type P5ReviewedDaySourcePreparationInput}
 from "../server/lib/disruption/phase5ReviewedSourceDayPrepareOrchestrator_v39";

const SHA=/^[a-f0-9]{64}$/,CODE=/^[a-f0-9]{40}$/;
const FILE=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_-]{8,100}\.json$/;
const PREFIX="REFUSED_P5_SIGNED_DAY_PREPARE_";
const hold=(why:string):never=>{throw Error(PREFIX+why);};

export interface P5SignedOneDayPreparePacket{
 schema:"v39.phase5.github-signed-one-day-source-preparation.v1";
 approvedCodeSha:string;
 manifestSha256:string;
 runDayIndex:number;
 reviewedPrepareInput:P5ReviewedDaySourcePreparationInput;
 /** This is an external review *claim*. Its integrity is backed by the
  * separately pinned raw packet hash, not by a boolean alone. */
 independentlyReviewedExactDaySourcePacket:true;
}
export function admitP5SignedDayGitHubPrepare(
 env:NodeJS.ProcessEnv,raw:Buffer,
 packet:P5SignedOneDayPreparePacket,filePath:string
){
 if(env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||
    env.GITHUB_EVENT_NAME!=="workflow_dispatch"||
    env.GITHUB_RUN_ATTEMPT!=="1"||
    env.P5_DAY_PREPARE_CONFIRM!==
     "ONE_SIGNED_FUTURE_DAY_PREPARED_NO_PROVIDER_GET"||
    !CODE.test(env.GITHUB_SHA??"")||
    !CODE.test(env.V39_P5_PREPARE_APPROVED_CODE_SHA??"")||
    env.GITHUB_SHA!==env.V39_P5_PREPARE_APPROVED_CODE_SHA||
    env.ADB_AUTO_COLLECT!=="0"||
    env.AERODATABOX_API_KEY||
    env.V39_P5_PREPARE_OWNER_APPROVED!=="1"||
    env.V39_PHASE5_FREEZE_SIGNED!=="1"||
    env.V39_PHASE5_SOURCE_RIGHTS_APPROVED!=="1"||
    env.V39_PHASE6_PROCESS_ARMED!=="1")
  hold("UNSIGNED_GITHUB_MAIN_OR_SEPARATE_PHASE6_GO");
 if(!FILE.test(filePath??"")||
    !Buffer.isBuffer(raw)||raw.length<100||raw.length>500_000||
    !SHA.test(env.V39_P5_SIGNED_PREPARE_DAY_PACKET_SHA256??"")||
    createHash("sha256").update(raw).digest("hex")!==
      env.V39_P5_SIGNED_PREPARE_DAY_PACKET_SHA256)
  hold("REVIEWED_PACKET_BYTES_OR_ALLOWED_FILE_MISMATCH");
 const r=packet?.reviewedPrepareInput,stage7=r?.readScope,
  stage8=r?.sourceReview,stage9=r?.stage9Review;
 const manifest=env.V39_P5_MANIFEST_SHA256,
  calendar=env.V39_P5_CALENDAR_HASH,
  config=env.V39_P5_CONFIG_HASH,
  frame=env.V39_P5_FRAME_HASH;
 if(![manifest,calendar,config,frame].every(x=>
       typeof x==="string"&&SHA.test(x))||
    !packet||packet.schema!==
       "v39.phase5.github-signed-one-day-source-preparation.v1"||
    packet.approvedCodeSha!==env.GITHUB_SHA||
    packet.independentlyReviewedExactDaySourcePacket!==true||
    !Number.isInteger(packet.runDayIndex)||
    packet.runDayIndex<1||packet.runDayIndex>31||
    packet.manifestSha256!==manifest||
    !stage7||!stage8||!stage9||
    stage7.runDayIndex!==packet.runDayIndex||
    stage7.expectedManifestSha256!==manifest||
    stage7.expectedCalendarSha256!==calendar||
    stage7.expectedConfigSha256!==config||
    stage7.expectedFrameSha256!==frame||
    stage7.expectedRestrictedReaderRole!==P5_STAGE28_GROUPS.prepare||
    stage9.expectedRestrictedWriterRole!==P5_STAGE28_GROUPS.prepare||
    stage9.expectedManifestSha256!==manifest||
    stage9.expectedCalendarSha256!==calendar||
    stage9.expectedConfigSha256!==config||
    stage9.expectedFrameSha256!==frame||
    stage8.manifestSha256!==manifest||
    stage8.calendarSha256!==calendar||
    stage8.configSha256!==config||
    stage8.frameSha256!==frame||
    stage9.independentFreezeApproved!==true||
    stage9.independentRightsReviewApproved!==true||
    stage9.githubOnlyProspectiveOwnerApproved!==true)
  hold("DAY_SOURCE_REVIEW_SCENE_OR_ROLE_DRIFT");
 const url=env.P5_V39_PREPARE_DATABASE_URL;
 if(!url||typeof url!=="string")hold("REVIEWED_EXISTING_PREPARE_LOGIN_MISSING");
 let parsed:URL;
 try{parsed=new URL(url);}catch{return hold("BAD_PREPARE_DB_URL");}
 if(!["postgres:","postgresql:"].includes(parsed.protocol)||
    parsed.username!=="phase5_p30_prepare_login_20261107"||
    !parsed.hostname||!parsed.password||!parsed.pathname)
  hold("NOT_ALREADY_COMMISSIONED_PREPARE_LOGIN");
 const other=[env.DATABASE_URL,env.V39_DATABASE_RUNTIME_URL,
   env.P5_V39_PRE_DATABASE_URL,env.V39_P5_SOURCE_DATABASE_URL];
 if(other.some(v=>{
  if(!v)return false;
  try{
   const x=new URL(v);
   return x.username===parsed.username&&
      x.hostname===parsed.hostname&&x.pathname===parsed.pathname;
  }catch{return false;}
 }))hold("NO_CROSS_ROLE_OR_APPLICATION_CONNECTION");
 return {
  schema:"v39.phase5.github-one-day-prepare-admitted.v1" as const,
  runDayIndex:packet.runDayIndex,
  signedPacketSha256:env.V39_P5_SIGNED_PREPARE_DAY_PACKET_SHA256!,
  manifestSha256:manifest!,
  reviewedPrepareInput:r
 };
}
export async function runP5SignedDayGitHubPrepare(
 env:NodeJS.ProcessEnv,filePath:string,
 bytes:Buffer,packet:P5SignedOneDayPreparePacket
){
 const admitted=admitP5SignedDayGitHubPrepare(env,bytes,packet,filePath);
 const raw=new Pool({
  connectionString:env.P5_V39_PREPARE_DATABASE_URL,max:1,
  connectionTimeoutMillis:8_000,idleTimeoutMillis:2_000,
  application_name:"v39_phase5_github_one_signed_day_prepare"
 });
 const restricted=makeP5Stage28DedicatedRolePool(raw,{
  group:"prepare",
  reviewedDedicatedLogin:"phase5_p30_prepare_login_20261107",
  forbiddenApplicationLogin:"phase5_p30_pre_login_20261107",
 });
 try{
  // Stage7 does a READ ONLY transaction; its checked-out SET ROLE session
  // is destroyed. Stage9 creates a FRESH connection and SERIALIZABLE
  // transaction with INSERT only on approved query+partition tables.
  // Separate actual reviewer authority is the signed SHA-256 packet.
  const r=await prepareP5ReviewedSourceDayFromSavedDraw(
   restricted,restricted,admitted.reviewedPrepareInput);
  return {
   schema:"v39.phase5.github-one-signed-day-prepared.v1" as const,
   status:r.status,codeSha:env.GITHUB_SHA,
   runDayIndex:r.runDayIndex,
   signedPacketSha256:admitted.signedPacketSha256,
   preparedQueryRows:r.preparedQueryRows,
   preparedPartitionRows:r.preparedPartitionRows,
   providerCalls:0 as const,flightPreRows:0 as const,
   realGitHubSourcePrearmBound:false as const,
   phase5ScienceFreezeGrantedHere:false as const,
   phase6PaidGoGrantedHere:false as const
  };
 }finally{
  await raw.end().catch(()=>{});
 }
}
async function main(){
 if(process.argv.length!==3)hold("ONE_PACKET_FILE_REQUIRED");
 const path=process.argv[2];
 if(!FILE.test(path))hold("UNREVIEWED_FILE_PATH");
 const stat=statSync(path);
 if(!stat.isFile()||stat.size<100||stat.size>500_000)
  hold("INVALID_REVIEWED_PACKET_SIZE");
 const bytes=readFileSync(path);
 const packet=JSON.parse(bytes.toString("utf8")) as P5SignedOneDayPreparePacket;
 const r=await runP5SignedDayGitHubPrepare(process.env,path,bytes,packet);
 console.log(JSON.stringify(r));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{
  const m=e instanceof Error?e.message:"";
  const safe=/^REFUSED_(?:P5|PHASE5)_[A-Z0-9_]+$/.test(m)?
    m:"REFUSED_P5_SIGNED_DAY_PREPARE_UNVERIFIED_DB_OR_PACKET";
  console.error(safe);process.exitCode=2;
 });
