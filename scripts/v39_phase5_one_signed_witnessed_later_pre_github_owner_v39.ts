/**
 * Phase5 ONE reviewed prospective T-6h or T-90m PRE — GitHub main manual.
 * Reuses already commissioned restricted Stage14 PRE-only writer, Stage24
 * T24 immutable witness verification, Stage28 role adapter and T24 DB clock
 * waiter. No new database role, provider call, POST, Alert or Phase6 GO.
 *
 * This is an independently signed future-flight operation, NOT an
 * automatic 31-day scheduler or a scientific/legal source-use attestation.
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
 persistP5V0079SingleBoundFlightPre,
 type P5Stage14SingleFlightPrePermit
} from "../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39";
import {digestP5Stage24ReviewedReceipt}
 from "../server/lib/disruption/phase5T24WitnessedLaterHorizonGuard_v39";
import {waitForP5ActualT24DatabaseClock}
 from "./v39_phase5_one_signed_native_t24_pre_witness_github_owner_v39";

const SHA=/^[a-f0-9]{64}$/;
const CODE=/^[a-f0-9]{40}$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const PACKET=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_-]{8,100}\.json$/;
const deny=(what:string):never=>{
 throw Error("REFUSED_P5_GITHUB_WITNESSED_LATER_PRE_"+what);
};
export interface P5SignedWitnessedLaterPrePacket{
 schema:"v39.phase5.github-witnessed-later-pre-reviewed.v1"|
 "v39.phase5.github-standalone-later-pre-asof-reviewed.v2";
 reviewedCodeSha:string;
 independentLaterHorizonAndT24ReviewAttested?:true;
 independentlyReviewedLaterWithoutT24AsOfAttested?:true;
 prePermit:P5Stage14SingleFlightPrePermit;
}
export function admitP5SignedWitnessedLaterPre(
 env:NodeJS.ProcessEnv,
 bytes:Buffer,packet:P5SignedWitnessedLaterPrePacket,path:string
){
 if(env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||
    env.GITHUB_EVENT_NAME!=="workflow_dispatch"||
    env.GITHUB_RUN_ATTEMPT!=="1"||
    !CODE.test(env.GITHUB_SHA??"")||
    env.GITHUB_SHA!==env.V39_P5_LATER_PRE_APPROVED_CODE_SHA||
    env.P5_LATER_PRE_CONFIRM!=="ONE_SIGNED_WITNESSED_T6_OR_T90_PRE_NO_PROVIDER"||
    env.ADB_AUTO_COLLECT!=="0"||env.AERODATABOX_API_KEY||
    env.V39_P5_LATER_PRE_OWNER_APPROVED!=="1"||
    env.V39_PHASE5_FREEZE_SIGNED!=="1"||
    env.V39_PHASE5_SOURCE_RIGHTS_APPROVED!=="1"||
    env.V39_PHASE6_PROCESS_ARMED!=="1")
  deny("UNSIGNED_MAIN_OR_SEPARATE_RELEASE_GO");
 if(!PACKET.test(path)||!Buffer.isBuffer(bytes)||
    bytes.length<100||bytes.length>200000||
    !SHA.test(env.V39_P5_LATER_PRE_SIGNED_PACKET_SHA256??"")||
    createHash("sha256").update(bytes).digest("hex")!==
       env.V39_P5_LATER_PRE_SIGNED_PACKET_SHA256)
  deny("PACKET_BYTES_NOT_INDEPENDENTLY_REVIEWED");
 const pre=packet?.prePermit;
 if(!packet||
    !["v39.phase5.github-witnessed-later-pre-reviewed.v1",
      "v39.phase5.github-standalone-later-pre-asof-reviewed.v2"]
      .includes(packet.schema)||
    packet.reviewedCodeSha!==env.GITHUB_SHA||
    (packet.schema==="v39.phase5.github-witnessed-later-pre-reviewed.v1"?
       packet.independentLaterHorizonAndT24ReviewAttested!==true:
       packet.independentlyReviewedLaterWithoutT24AsOfAttested!==true)||
    !pre||!["T-6h","T-90m"].includes(pre.horizon)||
    pre.expectedRestrictedPreWriterRole!==P5_STAGE28_GROUPS.pre||
    // Do not silently recertify conditional scheduled services as
    // native operated legs. A separate amended future tier needs review.
    (pre.identityEvidenceTier??"PROVIDER_NATIVE_OPERATING_LEG")!==
      "PROVIDER_NATIVE_OPERATING_LEG"||
    pre.externalNativeTPhysicalLegAndSourceUseReviewed!==true||
    pre.manifestSha256!==env.V39_P5_MANIFEST_SHA256||
    pre.queryDigestSha256!==env.V39_P5_QUERY_DIGEST||
    pre.expectedReviewedReleaseSha256!==env.V39_P5_RELEASE_SHA256||
    pre.expectedReviewedSourceRightsSha256!==env.V39_P5_RIGHTS_SHA256||
    pre.reviewedFrameSha256!==env.V39_P5_FRAME_HASH||
    pre.reviewedConfigSha256!==env.V39_P5_CONFIG_HASH||
    pre.independentlyReviewedNativeTEvidenceSha256!==
       env.V39_P5_NATIVE_T_SEMANTICS_SHA256||
    !SHA.test(pre.expectedSourceResponseSha256??"")||
    !SHA.test(pre.expectedEarlyDrawSha256??""))
  deny("LATER_SOURCE_IDENTITY_OR_ROLE_NOT_REVIEWED");

 const witness=pre.reviewedT24WitnessReceipt;
 const standalone=
  packet.schema==="v39.phase5.github-standalone-later-pre-asof-reviewed.v2";
 if(standalone){
  const a=pre.reviewedStandaloneLaterNoT24;
  if(witness||!a||
     packet.independentLaterHorizonAndT24ReviewAttested===true||
     env.V39_P5_STANDALONE_LATER_PRE_INDEPENDENT_APPROVED!=="1"||
     !SHA.test(env.V39_P5_STANDALONE_LATER_PRE_AMENDMENT_SHA256??"")||
     a.reviewedProtocolSha256!==
       env.V39_P5_STANDALONE_LATER_PRE_AMENDMENT_SHA256||
     a.reviewedOriginalResponseSha256!==pre.expectedSourceResponseSha256||
     a.reviewedNativeTSemanticsSha256!==
       pre.independentlyReviewedNativeTEvidenceSha256||
     a.independentLaterAsOfAndMissingnessReviewAttested!==true||
     a.missingT24Class!=="HONEST_T24_UNOBSERVED_NOT_BACKFILLED")
   deny("INDEPENDENT_STANDALONE_LATER_ASOF_AND_MISSING_T24_NOT_REVIEWED");
 }else{
  if(pre.reviewedStandaloneLaterNoT24||
    !witness||
    witness.schema!=="v39.phase5.stage24.externally-reviewed-stage17-receipt.v1"||
    !SHA.test(env.V39_P5_LATER_PRE_T24_RECEIPT_SHA256??"")||
    witness.receiptSha256!==env.V39_P5_LATER_PRE_T24_RECEIPT_SHA256||
    digestP5Stage24ReviewedReceipt(witness)!==witness.receiptSha256||
    witness.flightInstanceId!==pre.flightInstanceId||
    witness.selectedTNativeUtc!==pre.selectedTNativeUtc||
    witness.t24FrameSha256!==pre.reviewedFrameSha256||
    witness.t24ConfigSha256!==pre.reviewedConfigSha256||
    witness.expectedSelectedTVersion!==
      pre.selectedTConfig?.milestone+":"+
      pre.selectedTConfig?.version+":"+pre.selectedTConfig?.artifactHash)
   deny("INDEPENDENT_T24_RECEIPT_SCOPE_NOT_REVIEWED");
 }
 const native=pre.selectedTNativeUtc;
 if(typeof native!=="string"||!ISO.test(native)||
    !Number.isFinite(Date.parse(native))||
    new Date(native).toISOString()!==native)
  deny("INVALID_FROZEN_NATIVE_TIME");
 const cutoff=Date.parse(native)-
    (pre.horizon==="T-6h"?6*3600_000:90*60_000);
 if(!Number.isFinite(cutoff)||
    (!standalone&&witness?.frozenT24CutoffUtc!==
       new Date(Date.parse(native)-24*3600_000).toISOString()))
  deny("T24_ANCHOR_NOT_FROZEN_FOR_LATER_HORIZON");

 let u:URL;
 try{u=new URL(env.P5_V39_PRE_DATABASE_URL??"");}
 catch{return deny("MISSING_RESTRICTED_PRE_DATABASE_LOGIN");}
 if(!["postgres:","postgresql:"].includes(u.protocol)||
    decodeURIComponent(u.username)!=="phase5_p30_pre_login_20261107"||
    !u.password||!u.hostname||u.pathname!=="/neondb"||u.hash)
  deny("UNCOMMISSIONED_OR_CROSS_ROLE_PRE_DATABASE_LOGIN");
 for(const raw of [env.DATABASE_URL,env.V39_DATABASE_RUNTIME_URL,
                   env.V39_P5_SOURCE_DATABASE_URL,
                   env.P5_V39_T24_WITNESS_DATABASE_URL]){
  if(!raw)continue;
  let old:URL;
  try{old=new URL(raw);}catch{continue;}
  if(old.username===u.username&&old.host===u.host&&
     old.pathname===u.pathname)
   deny("FORBIDDEN_APPLICATION_OR_OTHER_ROLE_REUSE");
 }
 return {
  prePermit:pre,cutoffMs:cutoff,
  preDatabaseUrl:env.P5_V39_PRE_DATABASE_URL!,
  reviewedPacketSha256:env.V39_P5_LATER_PRE_SIGNED_PACKET_SHA256!,
  standaloneProtocolSha256:standalone?
   env.V39_P5_STANDALONE_LATER_PRE_AMENDMENT_SHA256:undefined
 };
}
export async function runP5SignedWitnessedLaterPre(
 env:NodeJS.ProcessEnv,bytes:Buffer,
 packet:P5SignedWitnessedLaterPrePacket,path:string
){
 const approved=admitP5SignedWitnessedLaterPre(env,bytes,packet,path);
 const raw=new Pool({connectionString:approved.preDatabaseUrl,max:1,
  connectionTimeoutMillis:8000,idleTimeoutMillis:1500,
  application_name:"p5_reviewed_t6_t90_pre_github"});
 try{
  const scoped=makeP5Stage28DedicatedRolePool(raw,{
   group:"pre",reviewedDedicatedLogin:"phase5_p30_pre_login_20261107",
   forbiddenApplicationLogin:"phase5_runtime_application_login"
  });
  // Reuse the SAME tried DB-clock wait as T24: 90m prestart limit,
  // <=180s due window, at least 2 seconds pre-COMMIT. Writer rechecks
  // exact T24 witness and its reviewed receipt INSIDE its serializable tx.
  await waitForP5ActualT24DatabaseClock(approved.cutoffMs,async()=>{
   const q=await scoped.query("SELECT clock_timestamp() AS t");
   if(q.rowCount!==1)deny("MISSING_POSTGRES_CLOCK");
   const at=q.rows[0]?.t;
   return at instanceof Date?at:new Date(String(at));
  });
  const result=await persistP5V0079SingleBoundFlightPre(
   scoped,approved.prePermit,approved.standaloneProtocolSha256?
    {independentlyApprovedStandaloneProtocolSha256:
      approved.standaloneProtocolSha256}:undefined);
  const hasWitness=!approved.standaloneProtocolSha256;
  if(result.horizon!==approved.prePermit.horizon||
     result.preSnapshotsInserted!==1||
     result.postCommitDatabaseReadbackVerified!==true||
     result.authenticPersistedT24WitnessAnchoredForLaterHorizon!==hasWitness||
     result.missingT24ExplicitlyRecordedWithoutBackfill===hasWitness)
   deny("INCOMPLETE_LATER_PRE_PROOF_NO_RETRY");
  return {
   schema:"v39.phase5.github-one-witnessed-later-pre.v1" as const,
   status:hasWitness?
    "LATER_PRE_COMMITTED_WITH_EXISTING_T24_WITNESS_NOT_SCIENTIFIC_GO" as const:
    "STANDALONE_LATER_ASOF_PRE_COMMITTED_T24_MISSING_NOT_SCIENTIFIC_GO" as const,
   packetSha256:approved.reviewedPacketSha256,
   runDayIndex:result.runDayIndex,horizon:result.horizon,
   committedSnapshotId:result.committedSnapshotId,
   postCommitDbClockAtUtc:result.postCommitDbClockAtUtc,
   providerCalls:0 as const,alertCreates:0 as const,
   t24WitnessVerified:hasWitness,
   t24MissingExplicitlyRecorded:!hasWitness,
   noBackfill:true as const,phase5FreezeGrantedHere:false as const,
   phase6PaidGoGrantedHere:false as const
  };
 }finally{await raw.end().catch(()=>{});}
}
async function main(){
 if(process.argv.length!==3||!PACKET.test(process.argv[2]??""))
  deny("ONE_FUTURE_REVIEWED_FLIGHT_PACKET_REQUIRED");
 const path=process.argv[2],stat=statSync(path);
 if(!stat.isFile()||stat.size<100||stat.size>200000)
  deny("INVALID_PACKET_FILE_SIZE");
 const bytes=readFileSync(path);
 const packet=JSON.parse(bytes.toString("utf8")) as P5SignedWitnessedLaterPrePacket;
 console.log(JSON.stringify(await runP5SignedWitnessedLaterPre(
  process.env,bytes,packet,path)));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(e=>{
  const msg=e instanceof Error?e.message:"";
  console.error(/^REFUSED_(?:P5|PHASE5)_[A-Z0-9_]+$/.test(msg)?
   msg:"REFUSED_P5_GITHUB_WITNESSED_LATER_PRE_UNVERIFIED_OR_AMBIGUOUS_HOLD_NO_RETRY");
  process.exitCode=2;
 });
}
