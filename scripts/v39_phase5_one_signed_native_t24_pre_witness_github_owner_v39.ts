/**
 * GitHub-only ONE reviewed future native-operating-leg T24 PRE and
 * independently durable V0081 witness, reusing existing Stage14/17/28.
 *
 * No provider API, no webhook subscription, no role installer, no automatic
 * legal/scientific approval. The exact per-flight permit is signed AFTER
 * authentic source-original binding; both DB connections are dedicated.
 */
import {readFileSync,statSync} from "node:fs";
import {createHash} from "node:crypto";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {Pool} from "pg";
import {
 makeP5Stage28DedicatedRolePool,P5_STAGE28_GROUPS
} from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";
import {
 persistP5ReviewedT24PreAndIndependentWitness,
 verifyP5T24PreWitnessCrossReview,
 type P5IndependentT24WitnessReview
} from "../server/lib/disruption/phase5T24PreIndependentWitnessChain_v39";
import type {P5Stage14SingleFlightPrePermit}
 from "../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39";

const SHA=/^[a-f0-9]{64}$/;
const CODE=/^[a-f0-9]{40}$/;
const PACKET=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_-]{8,100}\.json$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const deny=(what:string):never=>{
 throw Error("REFUSED_P5_GITHUB_T24_PRE_WITNESS_"+what);
};
const validInstant=(s:unknown)=>{
 if(typeof s!=="string"||!ISO.test(s)||
    !Number.isFinite(Date.parse(s))||
    new Date(s).toISOString()!==s)deny("INVALID_FROZEN_T24_INSTANT");
 return Date.parse(s as string);
};
export interface P5NativeT24SignedReleasePacket{
 schema:"v39.phase5.github-native-t24-pre-witness-reviewed.v1";
 reviewedCodeSha:string;
 independentNativeT24AndSourceReviewAttested:true;
 prePermit:P5Stage14SingleFlightPrePermit;
 witnessReview:P5IndependentT24WitnessReview;
}
export interface P5T24GitHubReleaseAdmission{
 packetSha256:string;
 cutoffMs:number;
 preDatabaseUrl:string;
 witnessDatabaseUrl:string;
 prePermit:P5Stage14SingleFlightPrePermit;
 witnessReview:P5IndependentT24WitnessReview;
}
function strictDbUrl(raw:unknown,login:string):URL{
 if(typeof raw!=="string")return deny("MISSING_INDEPENDENT_DATABASE_CREDENTIALS");
 let u:URL;
 try{u=new URL(raw);}catch{return deny("INVALID_DATABASE_CREDENTIAL_URL");}
 if(!["postgres:","postgresql:"].includes(u.protocol)||
    decodeURIComponent(u.username)!==login||!u.password||
    !u.hostname||u.pathname!=="/neondb"||u.hash)
  deny("NONCOMMISSIONED_OR_CROSS_SCOPE_LOGIN");
 return u;
}
export function admitP5NativeT24GitHubRelease(
 env:NodeJS.ProcessEnv,
 bytes:Buffer,
 packet:P5NativeT24SignedReleasePacket,
 path:string
):P5T24GitHubReleaseAdmission{
 if(env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||
    env.GITHUB_EVENT_NAME!=="workflow_dispatch"||
    env.GITHUB_RUN_ATTEMPT!=="1"||
    !CODE.test(env.GITHUB_SHA??"")||
    env.GITHUB_SHA!==env.V39_P5_T24_APPROVED_CODE_SHA||
    env.P5_NATIVE_T24_CONFIRM!==
      "ONE_SIGNED_NATIVE_T24_PRE_AND_WITNESS_NO_PROVIDER"||
    env.ADB_AUTO_COLLECT!=="0"||env.AERODATABOX_API_KEY||
    env.V39_P5_T24_OWNER_APPROVED!=="1"||
    env.V39_PHASE5_FREEZE_SIGNED!=="1"||
    env.V39_PHASE5_SOURCE_RIGHTS_APPROVED!=="1"||
    env.V39_PHASE6_PROCESS_ARMED!=="1")
   deny("UNSIGNED_MAIN_OR_SEPARATE_RELEASE_GO");
 if(!PACKET.test(path)||!Buffer.isBuffer(bytes)||
    bytes.length<100||bytes.length>200000||
    !SHA.test(env.V39_P5_T24_SIGNED_PACKET_SHA256??"")||
    createHash("sha256").update(bytes).digest("hex")!==
      env.V39_P5_T24_SIGNED_PACKET_SHA256)
  deny("PACKET_BYTES_NOT_INDEPENDENTLY_REVIEWED");
 const pre=packet?.prePermit, witness=packet?.witnessReview;
 if(!packet||
    packet.schema!=="v39.phase5.github-native-t24-pre-witness-reviewed.v1"||
    packet.reviewedCodeSha!==env.GITHUB_SHA||
    packet.independentNativeT24AndSourceReviewAttested!==true||
    !pre||!witness||
    pre.manifestSha256!==env.V39_P5_MANIFEST_SHA256||
    pre.queryDigestSha256!==env.V39_P5_QUERY_DIGEST||
    pre.expectedReviewedReleaseSha256!==env.V39_P5_RELEASE_SHA256||
    pre.expectedReviewedSourceRightsSha256!==env.V39_P5_RIGHTS_SHA256||
    pre.reviewedFrameSha256!==env.V39_P5_FRAME_HASH||
    pre.reviewedConfigSha256!==env.V39_P5_CONFIG_HASH||
    pre.independentlyReviewedNativeTEvidenceSha256!==
      env.V39_P5_NATIVE_T_SEMANTICS_SHA256||
    pre.expectedRestrictedPreWriterRole!==P5_STAGE28_GROUPS.pre||
    witness.expectedWitnessOnlyRole!==P5_STAGE28_GROUPS.witness||
    pre.horizon!=="T-24h"||
    (pre.identityEvidenceTier??"PROVIDER_NATIVE_OPERATING_LEG")!==
       "PROVIDER_NATIVE_OPERATING_LEG"||
    pre.externalNativeTPhysicalLegAndSourceUseReviewed!==true)
  deny("NATIVE_SOURCE_T24_FLIGHT_OR_ROLE_NOT_REVIEWED");
 verifyP5T24PreWitnessCrossReview(pre,witness);
 const native=validInstant(pre.selectedTNativeUtc);
 const cutoff=native-24*3600_000;
 if(!Number.isFinite(cutoff))deny("INVALID_FROZEN_T24_CUTOFF");
 const preUrl=strictDbUrl(env.P5_V39_PRE_DATABASE_URL,
   "phase5_p30_pre_login_20261107");
 const witnessUrl=strictDbUrl(env.P5_V39_T24_WITNESS_DATABASE_URL,
   "phase5_p30_witness_login_20261107");
 if(preUrl.host!==witnessUrl.host||
    preUrl.pathname!==witnessUrl.pathname||
    env.P5_V39_PRE_DATABASE_URL===env.P5_V39_T24_WITNESS_DATABASE_URL)
  deny("T24_PRE_AND_WITNESS_DATABASE_NOT_DISTINCT_ROLES_SAME_DB");
 // Work cannot use ordinary runtime credentials. This is also checked
 // independently by the SET-only Stage28 production role adapter.
 for(const ordinary of [env.DATABASE_URL,env.V39_DATABASE_RUNTIME_URL]){
  if(!ordinary)continue;
  let old:URL;
  try{old=new URL(ordinary);}catch{continue;}
  if((old.host===preUrl.host&&old.username===preUrl.username&&
      old.pathname===preUrl.pathname)||
     (old.host===witnessUrl.host&&old.username===witnessUrl.username&&
      old.pathname===witnessUrl.pathname))
    deny("ORDINARY_APPLICATION_WORKER_CREDENTIAL_REUSE");
 }
 return {packetSha256:env.V39_P5_T24_SIGNED_PACKET_SHA256!,
  cutoffMs:cutoff,preDatabaseUrl:env.P5_V39_PRE_DATABASE_URL!,
  witnessDatabaseUrl:env.P5_V39_T24_WITNESS_DATABASE_URL!,
  prePermit:pre,witnessReview:witness};
}
/** DB clock, NOT GitHub runner time. Start ahead; never arrive late. */
export function p5T24DueDecision(nowMs:number,cutoffMs:number):
 "WAIT"|"DUE"{
 if(!Number.isFinite(nowMs)||!Number.isFinite(cutoffMs))
  deny("DATABASE_CLOCK_INVALID");
 if(nowMs>=cutoffMs-2000)
  deny("MISSED_T24_CUTOFF_NO_BACKFILL_OR_RETRY");
 if(nowMs<cutoffMs-180000)return "WAIT";
 return "DUE";
}
export async function waitForP5ActualT24DatabaseClock(
 cutoffMs:number,readClock:()=>Promise<Date>,
 sleep:(ms:number)=>Promise<void>=ms=>new Promise(r=>setTimeout(r,ms))
):Promise<void>{
 for(let n=0;n<1600;n++){
  const at=await readClock();
  if(!(at instanceof Date)||!Number.isFinite(at.getTime()))
   deny("UNTRUSTED_POSTGRES_CLOCK");
  if(cutoffMs-at.getTime()>90*60_000)
   deny("SIGNED_T24_JOB_STARTED_TOO_EARLY");
  if(p5T24DueDecision(at.getTime(),cutoffMs)==="DUE")return;
  await sleep(Math.min(5000,Math.max(1000,cutoffMs-180000-at.getTime())));
 }
 deny("GITHUB_WAIT_LIMIT_EXCEEDED_NO_BACKFILL");
}
export async function runP5NativeT24GitHubRelease(
 env:NodeJS.ProcessEnv,bytes:Buffer,
 packet:P5NativeT24SignedReleasePacket,path:string
){
 const admit=admitP5NativeT24GitHubRelease(env,bytes,packet,path);
 const preRaw=new Pool({connectionString:admit.preDatabaseUrl,
   max:1,connectionTimeoutMillis:8000,idleTimeoutMillis:1500,
   application_name:"p5_native_t24_pre_reviewed_gh"});
 const witnessRaw=new Pool({connectionString:admit.witnessDatabaseUrl,
   max:1,connectionTimeoutMillis:8000,idleTimeoutMillis:1500,
   application_name:"p5_t24_witness_reviewed_gh"});
 try{
  const pre=makeP5Stage28DedicatedRolePool(preRaw,{
   group:"pre",reviewedDedicatedLogin:"phase5_p30_pre_login_20261107",
   forbiddenApplicationLogin:"phase5_runtime_application_login"
  });
  const witness=makeP5Stage28DedicatedRolePool(witnessRaw,{
   group:"witness",reviewedDedicatedLogin:"phase5_p30_witness_login_20261107",
   forbiddenApplicationLogin:"phase5_runtime_application_login"
  });
  await waitForP5ActualT24DatabaseClock(admit.cutoffMs,async()=>{
   const r=await pre.query("SELECT clock_timestamp() AS t");
   if(r.rowCount!==1)deny("DATABASE_CLOCK_READBACK_INVALID");
   const clock=r.rows[0].t;
   const d=clock instanceof Date?clock:new Date(String(clock));
   return d;
  });
  const out=await persistP5ReviewedT24PreAndIndependentWitness(
   pre,witness,admit.prePermit,admit.witnessReview);
  return {
   schema:"v39.phase5.github-native-t24-pre-witness-once.v1" as const,
   status:out.status,packetSha256:admit.packetSha256,
   runDayIndex:out.runDayIndex,
   committedSnapshotId:out.committedSnapshotId,
   preCommitWitnessVerified:true as const,
   // Stage17 source+DB-clock proof candidate for the later T6/T90 worker.
   // Public Actions logs contain hashes/times, never raw provider payload.
   // This digest is NOT an independent source-use or scientific signoff.
   unsignedStage24ReceiptCandidate:out.unsignedStage24ReceiptCandidate,
   providerCalls:0 as const,alertCreates:0 as const,
   scientificFreezeGrantedByWorker:false as const,
   paidPhase6GoGrantedByWorker:false as const
  };
 }finally{
  await Promise.all([
   preRaw.end().catch(()=>{}),witnessRaw.end().catch(()=>{})
  ]);
 }
}
async function main(){
 if(process.argv.length!==3)deny("ONE_SIGNED_FLIGHT_FILE_REQUIRED");
 const path=process.argv[2];
 if(!PACKET.test(path))deny("UNREVIEWED_FILE_PATH");
 const stat=statSync(path);
 if(!stat.isFile()||stat.size<100||stat.size>200000)
  deny("INVALID_PACKET_FILE_SIZE");
 const bytes=readFileSync(path);
 const packet=JSON.parse(bytes.toString("utf8")) as P5NativeT24SignedReleasePacket;
 const out=await runP5NativeT24GitHubRelease(process.env,bytes,packet,path);
 console.log(JSON.stringify(out));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(e=>{
  const msg=e instanceof Error?e.message:"";
  const safe=/^REFUSED_(?:P5|PHASE5)_[A-Z0-9_]+$/.test(msg)?
   msg:"REFUSED_P5_GITHUB_T24_PRE_WITNESS_UNVERIFIED_OR_AMBIGUOUS_HOLD_NO_RETRY";
  console.error(safe);process.exitCode=2;
 });
}
