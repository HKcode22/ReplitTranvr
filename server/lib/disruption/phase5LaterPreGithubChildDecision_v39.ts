/**
 * Default-OFF Phase5 signed later PRE scheduled GitHub child: pure admission
 * and real PostgreSQL readback review. Never provider or SQL write here.
 * The existing Stage14 PRE writer remains authoritative for exact cutoff.
 */
import {createHash} from "node:crypto";
import type {P5SignedWitnessedLaterPrePacket} from
 "../../../scripts/v39_phase5_one_signed_witnessed_later_pre_github_owner_v39";
import {P5_STAGE28_GROUPS} from "./phase5Stage28DedicatedRolePool_v39";
import {verifyP5Stage24WitnessedFrozenT,digestP5Stage24ReviewedReceipt}
 from "./phase5T24WitnessedLaterHorizonGuard_v39";

const SHA=/^[a-f0-9]{64}$/;
const CODE=/^[a-f0-9]{40}$/;
const PATH=/^data-collection\/phase5\/frozen\/[A-Za-z0-9_-]{8,100}\.json$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const PREFIX="P5 LATER PRE ";
const fail=(reason:string):never=>{
 throw Error("REFUSED_P5_AUTO_LATER_PRE_"+reason);
};
function utc(value:unknown):number{
 const d=value instanceof Date?value:typeof value==="string"?new Date(value):null;
 if(!d||!Number.isFinite(d.getTime()))return fail("INVALID_ACTUAL_DB_CLOCK");
 return d.getTime();
}
function exactISO(value:unknown):number{
 if(typeof value!=="string"||!ISO.test(value)||
    !Number.isFinite(Date.parse(value))||
    new Date(value).toISOString()!==value)
  return fail("UNREVIEWED_FROZEN_NATIVE_TIME");
 return Date.parse(value);
}
export interface P5LaterPreAutoPins{
 path:string;sha:string;codeSha:string;token:string;url:string;
}
export function admitP5LaterPreAutoEnv(env:NodeJS.ProcessEnv):P5LaterPreAutoPins{
 if(env.GITHUB_ACTIONS!=="true"||
   env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
   env.GITHUB_EVENT_NAME!=="schedule"||
   env.GITHUB_REF!=="refs/heads/main"||
   env.GITHUB_RUN_ATTEMPT!=="1"||
   !CODE.test(env.GITHUB_SHA??"")||
   env.GITHUB_SHA!==env.V39_P5_LATER_PRE_APPROVED_CODE_SHA||
   env.ADB_AUTO_COLLECT!=="0"||env.AERODATABOX_API_KEY||
   env.AERODATABOX_WEBHOOK_SECRET||env.DATABASE_URL||
   env.V39_DATABASE_RUNTIME_URL||env.V39_P5_SOURCE_DATABASE_URL||
   env.P5_V39_T24_WITNESS_DATABASE_URL||
   env.P5_V39_OTHER_REST_REVIEW_DATABASE_URL||
   env.P5_V39_OTHER_REST_RESERVE_DATABASE_URL||
   env.P5_LATER_PRE_AUTO_DISPATCH_ENABLED!=="true"||
   env.V39_P5_LATER_PRE_AUTO_DISPATCH_APPROVED!=="1"||
   env.V39_P5_LATER_PRE_OWNER_APPROVED!=="1"||
   env.V39_PHASE5_FREEZE_SIGNED!=="1"||
   env.V39_PHASE5_SOURCE_RIGHTS_APPROVED!=="1"||
   env.V39_PHASE6_PROCESS_ARMED!=="1"||
   !PATH.test(env.P5_LATER_PRE_FROZEN_PACKET_FILE??"")||
   !SHA.test(env.V39_P5_LATER_PRE_SIGNED_PACKET_SHA256??"")||
   !env.GITHUB_TOKEN||env.GITHUB_TOKEN.length<20)
  fail("MAIN_RIGHTS_FREEZE_PAID_GO_OR_SIGNED_PACKET_ABSENT");
 let u:URL;
 try{u=new URL(env.P5_V39_PRE_DATABASE_URL??"");}
 catch{return fail("DEDICATED_PRE_LOGIN_MISSING");}
 if(!["postgres:","postgresql:"].includes(u.protocol)||
    decodeURIComponent(u.username)!=="phase5_p30_pre_login_20261107"||
    !u.password||!u.hostname||u.pathname!=="/neondb"||u.hash)
  fail("PRE_ROLE_NOT_SEPARATELY_COMMISSIONED");
 return {
  path:env.P5_LATER_PRE_FROZEN_PACKET_FILE!,
  sha:env.V39_P5_LATER_PRE_SIGNED_PACKET_SHA256!,
  codeSha:env.GITHUB_SHA!,token:env.GITHUB_TOKEN!,
  url:env.P5_V39_PRE_DATABASE_URL!
 };
}
export interface P5LaterPreActualReadback{
 observedDbClockUtc:Date|string;
 actor:string;database:string;readonly:"on";
 originalRows:Record<string,unknown>[];
 memberRows:Record<string,unknown>[];
 sameHorizonCount:number;t24SnapshotCount:number;
 witnessedT24Rows:Record<string,unknown>[];
}
export interface P5LaterPrePlan{
 schema:"v39.phase5.later-pre-real-db-github-child.v1";
 status:"LATER_PRE_SOURCE_PENDING"|"LATER_PRE_WITNESS_PENDING"|
 "LATER_PRE_NOT_YET_WITHIN_LEAD"|"LATER_PRE_TOO_LATE_CENSOR"|
 "LATER_PRE_ALREADY_SAVED_NO_CHILD"|"LATER_PRE_READY_FOR_GITHUB_HISTORY";
 readyForHistory:boolean;
 frozenPacketPath:string;reviewedPacketSha256:string;
 flightInstanceId:string;horizon:"T-6h"|"T-90m";
 observedDbClockUtc:string;cutoffUtc:string;
 evidenceTier:"WITNESSED_T24_LATER"|"STANDALONE_ASOF_T24_MISSING";
 providerCalls:0;databaseWrites:0;childDispatchCount:0;
 legalRightsCertifiedHere:false;phase5FreezeGrantedHere:false;
 phase6GoGrantedHere:false;
}
export function reviewP5LaterPreActualReadback(
 bytes:Buffer,packet:P5SignedWitnessedLaterPrePacket,
 pins:P5LaterPreAutoPins,actual:P5LaterPreActualReadback,
 env:NodeJS.ProcessEnv
):P5LaterPrePlan{
 if(!pins||!PATH.test(pins.path)||!SHA.test(pins.sha)||
    !CODE.test(pins.codeSha)||!Buffer.isBuffer(bytes)||
    bytes.length<100||bytes.length>200000||
    createHash("sha256").update(bytes).digest("hex")!==pins.sha)
  fail("UNAUTHENTICATED_PACKET_BYTES");
 const p=packet?.prePermit;
 if(!p||packet.reviewedCodeSha!==pins.codeSha||
    !["T-6h","T-90m"].includes(p.horizon)||
    p.expectedRestrictedPreWriterRole!==P5_STAGE28_GROUPS.pre||
    (p.identityEvidenceTier??"PROVIDER_NATIVE_OPERATING_LEG")!==
     "PROVIDER_NATIVE_OPERATING_LEG"||
    p.externalNativeTPhysicalLegAndSourceUseReviewed!==true||
    p.manifestSha256!==env.V39_P5_MANIFEST_SHA256||
    p.queryDigestSha256!==env.V39_P5_QUERY_DIGEST||
    p.expectedReviewedReleaseSha256!==env.V39_P5_RELEASE_SHA256||
    p.expectedReviewedSourceRightsSha256!==env.V39_P5_RIGHTS_SHA256||
    p.reviewedFrameSha256!==env.V39_P5_FRAME_HASH||
    p.reviewedConfigSha256!==env.V39_P5_CONFIG_HASH||
    p.independentlyReviewedNativeTEvidenceSha256!==
     env.V39_P5_NATIVE_T_SEMANTICS_SHA256||
    p.selectedTConfig?.milestone!=="departure.scheduledTime.utc"||
    p.selectedTConfig?.verifiedProviderNativeSchedule!==true||
    p.selectedTConfig?.semanticsEvidenceSha256!==
     p.independentlyReviewedNativeTEvidenceSha256)
  fail("UNAPPROVED_NATIVE_FLIGHT_SOURCE_T_OR_RELEASE");
 const standalone=
   packet.schema==="v39.phase5.github-standalone-later-pre-asof-reviewed.v2";
 if(standalone){
  const a=p.reviewedStandaloneLaterNoT24;
  if(packet.independentlyReviewedLaterWithoutT24AsOfAttested!==true||
     p.reviewedT24WitnessReceipt||!a||
     env.V39_P5_STANDALONE_LATER_PRE_INDEPENDENT_APPROVED!=="1"||
     !SHA.test(env.V39_P5_STANDALONE_LATER_PRE_AMENDMENT_SHA256??"")||
     a.reviewedProtocolSha256!==
      env.V39_P5_STANDALONE_LATER_PRE_AMENDMENT_SHA256||
     a.reviewedOriginalResponseSha256!==p.expectedSourceResponseSha256||
     a.reviewedNativeTSemanticsSha256!==
      p.independentlyReviewedNativeTEvidenceSha256||
     a.missingT24Class!=="HONEST_T24_UNOBSERVED_NOT_BACKFILLED"||
     a.independentLaterAsOfAndMissingnessReviewAttested!==true)
   fail("INDEPENDENT_NO_T24_AMENDMENT_NOT_APPROVED");
 }else{
  const r=p.reviewedT24WitnessReceipt;
  if(packet.schema!=="v39.phase5.github-witnessed-later-pre-reviewed.v1"||
     packet.independentLaterHorizonAndT24ReviewAttested!==true||
     p.reviewedStandaloneLaterNoT24||!r||
     !SHA.test(env.V39_P5_LATER_PRE_T24_RECEIPT_SHA256??"")||
     r.receiptSha256!==env.V39_P5_LATER_PRE_T24_RECEIPT_SHA256||
     digestP5Stage24ReviewedReceipt(r)!==r.receiptSha256)
   fail("REAL_T24_RECEIPT_NOT_SIGNED");
 }
 if(!actual||actual.actor!==P5_STAGE28_GROUPS.pre||
    actual.database!=="neondb"||actual.readonly!=="on"||
    !Array.isArray(actual.originalRows)||
    !Array.isArray(actual.memberRows)||
    !Array.isArray(actual.witnessedT24Rows)||
    actual.originalRows.length>1||actual.memberRows.length>1||
    actual.witnessedT24Rows.length>2||
    !Number.isInteger(actual.sameHorizonCount)||
    !Number.isInteger(actual.t24SnapshotCount)||
    actual.sameHorizonCount<0||actual.sameHorizonCount>2||
    actual.t24SnapshotCount<0||actual.t24SnapshotCount>2)
  fail("NON_READONLY_OR_AMBIGUOUS_ACTUAL_PG_READBACK");
 const now=utc(actual.observedDbClockUtc),
   native=exactISO(p.selectedTNativeUtc),
   cutoff=native-(p.horizon==="T-6h"?21600000:5400000);
 if(p.selectedTConfig?.version?.length===0||
    p.builderFrozenAtUtc===undefined||
    exactISO(p.builderFrozenAtUtc)>cutoff||
    actual.sameHorizonCount>1||actual.t24SnapshotCount>1)
  fail("UNSAFE_SNAPSHOT_OR_FROZEN_BUILDER");
 const base={
  schema:"v39.phase5.later-pre-real-db-github-child.v1" as const,
  frozenPacketPath:pins.path,reviewedPacketSha256:pins.sha,
  flightInstanceId:p.flightInstanceId,horizon:p.horizon as "T-6h"|"T-90m",
  observedDbClockUtc:new Date(now).toISOString(),
  cutoffUtc:new Date(cutoff).toISOString(),
  evidenceTier:standalone?"STANDALONE_ASOF_T24_MISSING" as const:
     "WITNESSED_T24_LATER" as const,
  providerCalls:0 as const,databaseWrites:0 as const,
  childDispatchCount:0 as const,legalRightsCertifiedHere:false as const,
  phase5FreezeGrantedHere:false as const,phase6GoGrantedHere:false as const
 };
 const status=(s:P5LaterPrePlan["status"]):P5LaterPrePlan=>
  {...base,status:s,readyForHistory:s==="LATER_PRE_READY_FOR_GITHUB_HISTORY"};
 if(actual.sameHorizonCount===1)
  return status("LATER_PRE_ALREADY_SAVED_NO_CHILD");
 if(now>=cutoff-15*60000)
  return status("LATER_PRE_TOO_LATE_CENSOR");
 // A witnessed PRE cannot exist without exactly one durable T24 witness.
 if(standalone){
  if(actual.t24SnapshotCount!==0||actual.witnessedT24Rows.length!==0)
   fail("STANDALONE_PATH_AMBIGUOUS_EXISTING_T24");
 }else{
  if(actual.t24SnapshotCount!==1||actual.witnessedT24Rows.length!==1)
   return status("LATER_PRE_WITNESS_PENDING");
  const r=p.reviewedT24WitnessReceipt!;
  verifyP5Stage24WitnessedFrozenT(actual.witnessedT24Rows[0],r,{
   flightInstanceId:p.flightInstanceId,
   selectedTNativeUtc:p.selectedTNativeUtc,
   expectedSelectedTVersion:
    p.selectedTConfig.milestone+":"+
    p.selectedTConfig.version+":"+p.selectedTConfig.artifactHash,
   expectedFrameSha256:p.reviewedFrameSha256,
   expectedConfigSha256:p.reviewedConfigSha256,
   cutoffUtc:new Date(cutoff).toISOString(),horizon:p.horizon
  });
 }
 if(!actual.originalRows.length||!actual.memberRows.length)
  return status("LATER_PRE_SOURCE_PENDING");
 const a=actual.originalRows[0],m=actual.memberRows[0];
 const exact:Record<string,string|number>={
  manifest_sha256:p.manifestSha256,
  run_day_index:p.runDayIndex,slot_id:p.slot,
  horizon:p.horizon,airport_icao:p.airportIcao,
  github_run_id:p.expectedGithubSourceRunId,
  attempt_run_id:p.expectedGithubSourceRunId,state:"ACTIVE",
  early_draw_sha256:p.expectedEarlyDrawSha256,
  reviewed_release_sha256:p.expectedReviewedReleaseSha256,
  rights_review_sha256:p.expectedReviewedSourceRightsSha256,
  provider_contract_sha256:p.expectedProviderContractSha256,
  population_query_id:p.expectedSourcePopulationQueryId,
  original_response_hash:p.expectedSourceResponseSha256,
  fids_response_hash:p.expectedSourceResponseSha256,
  fids_airport_icao:p.airportIcao,
  bound_rights:p.expectedReviewedSourceRightsSha256
 };
 const sourceKnown=utc(a.source_available);
 if(Object.entries(exact).some(([key,val])=>a[key]!==val)||
    a.original_current!==true||Number(a.normalized_members_count)<1||
    m.population_query_id!==p.expectedSourcePopulationQueryId||
    m.analytic_identity_id!==p.flightInstanceId||
    m.canonical_flight_instance_id!==p.flightInstanceId||
    m.source_airport_icao!==p.airportIcao||
    m.dep_airport_icao!==p.airportIcao||
    m.population_role!=="requested_airport_primary"||
    m.scope_classification!=="confirmed_core"||
    m.codeshare_resolution_status!=="confirmed_operating_leg"||
    m.source_type!=="fids"||
    m.response_hash!==p.expectedSourceResponseSha256||
    m.provider_content_expired_at_utc!==null||
    !m.population_member_id||
    utc(m.dep_scheduled_utc)!==native||
    utc(a.service_window_start_utc)>native||
    utc(a.service_window_end_utc)<=native||
    utc(a.reserved_at)>utc(a.fids_retrieval_utc)||
    utc(a.fids_retrieval_utc)>utc(a.raw_persisted_at_utc)||
    utc(a.raw_persisted_at_utc)>sourceKnown||
    sourceKnown>utc(a.bound_at_utc)||
    utc(a.bound_at_utc)>now||
    sourceKnown>cutoff||
    utc(a.source_expires_at_utc)<=cutoff||
    utc(a.source_expires_at_utc)<=now||
    utc(a.source_expires_at_utc)>sourceKnown+23*3600000||
    cutoff-sourceKnown>p.maxPopulationStalenessSeconds*1000||
    utc(m.available_at)<sourceKnown||utc(m.available_at)>cutoff)
  fail("ACTUAL_PROVIDER_ORIGINAL_MEMBER_CLOCK_INVALID");
 if(cutoff-now>90*60000)
  return status("LATER_PRE_NOT_YET_WITHIN_LEAD");
 return status("LATER_PRE_READY_FOR_GITHUB_HISTORY");
}
export interface P5LaterGhHistory{
 total_count:number;
 workflow_runs:Array<{
  id:number;display_title:string;status:string;created_at:string;
  conclusion:string|null;
 }>;
}
export function planP5LaterPreGithubChild(
 decision:P5LaterPrePlan,history:P5LaterGhHistory|null
){
 if(!decision||decision.schema!=="v39.phase5.later-pre-real-db-github-child.v1"||
    !PATH.test(decision.frozenPacketPath)||
    !SHA.test(decision.reviewedPacketSha256)||
    decision.providerCalls!==0||decision.databaseWrites!==0||
    decision.childDispatchCount!==0||
    decision.legalRightsCertifiedHere!==false||
    decision.phase5FreezeGrantedHere!==false||
    decision.phase6GoGrantedHere!==false)
  fail("UNTRUSTED_SIGNED_READONLY_DECISION");
 if(decision.status!=="LATER_PRE_READY_FOR_GITHUB_HISTORY"||
    decision.readyForHistory!==true)
  return{shouldDispatch:false as const,status:decision.status,
   providerCalls:0 as const,databaseWrites:0 as const};
 if(!history||!Number.isSafeInteger(history.total_count)||
    history.total_count<0||history.total_count>100||
    !Array.isArray(history.workflow_runs)||
    history.workflow_runs.length!==history.total_count)
  fail("UNBOUNDED_GITHUB_LATER_PRE_HISTORY");
 let seen=false;
 for(const h of history.workflow_runs){
  if(!h||!Number.isSafeInteger(h.id)||h.id<1||
     typeof h.display_title!=="string"||
     !["queued","in_progress","completed","pending","waiting","requested"]
      .includes(h.status)||
     !Number.isFinite(Date.parse(h.created_at))||
     !h.display_title.startsWith(PREFIX))
   fail("UNIDENTIFIABLE_PRIOR_LATER_PRE_ATTEMPT_HOLD");
  if(h.display_title===PREFIX+decision.frozenPacketPath)seen=true;
 }
 return{
  shouldDispatch:!seen,
  status:seen?"EXISTING_LATER_PRE_CHILD_NEVER_BLIND_RETRY" as const:
     "SIGNED_LATER_PRE_CHILD_MAY_DISPATCH" as const,
  providerCalls:0 as const,databaseWrites:0 as const
 };
}
