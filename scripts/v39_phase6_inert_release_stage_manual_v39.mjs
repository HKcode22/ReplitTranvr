/** One-time inert stage execution using existing commissioned credentials,
 * existing B0062/V0093 writers and independent login ACL verifier.
 * No provider, owner DB URL, DDL, enable authorization, or auto-replay.
 */
import pg from "pg";
import {createHash} from "node:crypto";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {P5_TWO_STAGE_ROLES,verifyP5TwoStageOneLiveSession} from "./v39_phase5_two_stage_logins_independent_live_readonly_once.mjs";
import {compileP5InertB0062UtcStagePacket,commitP5InertB0062UtcStageOnce} from "../server/lib/disruption/phase5B0062InertCalendarUtcBudgetStage_v39.mjs";
import {compileP5V0093CostOnlySevenRestReview,commitP5V0093CostOnlySevenRestOnce} from "../server/lib/disruption/phase5V0093CostOnlySevenRestFreezeWriter_v39.mjs";
const H=/^[a-f0-9]{64}$/,C=/^[a-f0-9]{40}$/;
const hold=s=>{throw Error("HOLD_P6_INERT_RELEASE_"+s);};
const confirm={calendar:"STAGE_EXACT_31_DAY_CALENDAR_DISABLED_AUTH_NO_PROVIDER",cost:"STAGE_EXACT_SEVEN_COST_UPPER_BOUNDS_DISABLED_AUTH_NO_PROVIDER"};
const hash=s=>createHash("sha256").update(s).digest("hex");
export function admitP6InertReleaseStage(env){
 const mode=env?.P6_INERT_STAGE_MODE;
 if(!Object.hasOwn(confirm,mode??"")||env.GITHUB_ACTIONS!=="true"||env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||env.GITHUB_EVENT_NAME!=="workflow_dispatch"||env.GITHUB_RUN_ATTEMPT!=="1"||
    !C.test(env.GITHUB_SHA??"")||env.V39_P5_APPROVED_CODE_SHA!==env.GITHUB_SHA||
    env.P6_INERT_STAGE_CONFIRM!==confirm[mode]||env.P6_INERT_CALENDAR_REVIEW_APPROVED!=="1"||
    env.ADB_AUTO_COLLECT!=="0"||env.V39_PHASE6_PROCESS_ARMED!=="0"||env.V39_PHASE6_OWNER_APPROVED!=="0"||
    env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||
    [env.AERODATABOX_API_KEY,env.AERODATABOX_WEBHOOK_SECRET,env.RAPIDAPI_KEY,env.DATABASE_URL,env.V39_DATABASE_RUNTIME_URL,
     env.V39_P5_SOURCE_DATABASE_URL,env.P5_V39_PRE_DATABASE_URL,env.P5_V39_PREPARE_DATABASE_URL,env.P5_V39_T24_WITNESS_DATABASE_URL,
     env.P5_V39_OTHER_REST_RESERVE_DATABASE_URL,env.P5_V39_OTHER_REST_REVIEW_DATABASE_URL,env.P6_PRIVATE_READER_DATABASE_URL,
     env.P6_PRIVATE_PUBLISHER_DATABASE_URL].some(Boolean))
  hold("NO_EXACT_NONPAID_OWNER_STAGE_APPROVAL");
 const raw=env.P6_INERT_STAGE_INPUT_JSON;
 if(typeof raw!=="string"||Buffer.byteLength(raw)<100||Buffer.byteLength(raw)>48000||
    !H.test(env.P6_INERT_STAGE_INPUT_SHA256??"")||hash(raw)!==env.P6_INERT_STAGE_INPUT_SHA256)
  hold("EXACT_REVIEWED_PACKET_BYTES_REQUIRED");
 let input;try{input=JSON.parse(raw);}catch{hold("INVALID_REVIEWED_JSON");}
 if(JSON.stringify(input)!==raw||input.codeSha40!==env.GITHUB_SHA||input.manifestSha256!==env.V39_P5_MANIFEST_SHA256)
  hold("NONCANONICAL_PACKET_OR_MAIN_MANIFEST_DRIFT");
 const spec=P5_TWO_STAGE_ROLES[mode==="calendar"?0:1],other=P5_TWO_STAGE_ROLES[mode==="calendar"?1:0];
 if(env[other.key])hold("OTHER_STAGE_CREDENTIAL_MUST_NOT_BE_PRESENT");
 let u;try{u=new URL(env[spec.key]);}catch{hold("NO_EXISTING_RESTRICTED_WRITER");}
 if(!["postgresql:","postgres:"].includes(u.protocol)||decodeURIComponent(u.username)!==spec.role||
    !u.password||!u.hostname.endsWith(".neon.tech")||u.pathname!=="/neondb"||u.hash||
    (u.port!==""&&u.port!=="5432")||u.searchParams.getAll("sslmode").length!==1||
    !["require","verify-full"].includes(u.searchParams.get("sslmode"))||
    [...u.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k))||
    (u.searchParams.has("channel_binding")&&(u.searchParams.getAll("channel_binding").length!==1||u.searchParams.get("channel_binding")!=="require")))
  hold("WRONG_COMMISSIONED_TLS_WRITER");
 // Explicit independently reviewed packet digest and protected approval
 // cover these fields. They are not derived from a test/unsigned proposal.
 const review={expectedSignedStagePacketSha256:env.P6_INERT_STAGE_INPUT_SHA256,
  expectedExactWriterRole:P5_TWO_STAGE_ROLES[0].role,independentCalendarTreatmentReviewApproved:true,
  independentProviderAccountAndRestBudgetReviewApproved:true,narrowPrelaunchOwnerApproved:true};
 const p=compileP5InertB0062UtcStagePacket(input,review);
 let freezeReview=null;
 if(mode==="cost"){
  if(env.P6_INERT_COST_REVIEW_APPROVED!=="1"||env.V39_PHASE5_SOURCE_RIGHTS_APPROVED!=="1"||
     !H.test(env.P6_INERT_COST_ENVELOPE_SHA256??""))hold("NO_DISTINCT_COST_AND_RIGHTS_APPROVAL");
  freezeReview={expectedStagedB0062PacketSha256:p.stagePacketSha256,
   expectedSignedSevenCategoryCostSha256:env.P6_INERT_COST_ENVELOPE_SHA256,
   expectedExactBudgetWriterRole:P5_TWO_STAGE_ROLES[1].role,
   independentProspectiveCalendarAndTreatmentApproved:true,independentRealProviderRangeAndRestBudgetApproved:true,
   independentSourceContentsRightsForIntendedUseApproved:true,exactRestrictedNoProviderBudgetFreezeApproved:true};
  compileP5V0093CostOnlySevenRestReview(input,review,freezeReview);
 }
 const receipt={mode,role:spec.role,stagePacketSha256:p.stagePacketSha256,codeSha:input.codeSha40,phase6PaidGo:false};
 Object.defineProperties(receipt,Object.fromEntries(Object.entries({spec,url:env[spec.key],input,review,freezeReview}).map(([k,value])=>[k,{value,enumerable:false}])));
 return Object.freeze(receipt);
}
export async function runP6InertReleaseStage(env){
 const ctx=admitP6InertReleaseStage(env);
 const pool=new pg.Pool({connectionString:ctx.url,max:1,connectionTimeoutMillis:8000,query_timeout:40000,application_name:"p6_inert_release_stage"});
 try{
  await verifyP5TwoStageOneLiveSession(pool,ctx.spec);
  // One commit attempt only. Original writers independently check empty
  // or disabled exact preceding state. No retry or implicit second stage.
  const out=ctx.mode==="calendar"?await commitP5InertB0062UtcStageOnce(pool,ctx.input,ctx.review):
   await commitP5V0093CostOnlySevenRestOnce(pool,ctx.input,ctx.review,ctx.freezeReview);
  return {...out,mode:ctx.mode,independentPostStageOwnerReadbackStillRequired:true,phase6PaidGo:false};
 }finally{await pool.end().catch(()=>{});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(await runP6InertReleaseStage(process.env)));}
 catch(e){const s=String(e?.message??"");console.error(/^(?:HOLD_P6_INERT_RELEASE|HOLD_P5_TWO_STAGE_INDEPENDENT_READONLY|REFUSED_P5)_[A-Z0-9_]+$/.test(s)?s:"HOLD_P6_INERT_RELEASE_UNKNOWN_REVIEW_BEFORE_ANY_RETRY");process.exitCode=2;}
}
