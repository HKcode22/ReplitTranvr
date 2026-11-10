import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {reviewP5OneNativeT24RealSourceHandoff,
 type P5T24ActualOriginalReadback}
 from "../server/lib/disruption/phase5T24OriginalBoundReadonlyHandoff_v39";
import {admitP5T24SourceReadonlyObserver,
 auditP5T24ActualOriginalReadyReadonly}
 from "../scripts/v39_phase5_native_t24_source_original_readonly_owner_v39";
import {P5_STAGE28_GROUPS}
 from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";
import type {P5NativeT24SignedReleasePacket}
 from "../scripts/v39_phase5_one_signed_native_t24_pre_witness_github_owner_v39";
const h=(s:string)=>s.repeat(64),code="f".repeat(40);
const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const T="2027-03-01T12:00:00.000Z";
const cutoff="2027-02-28T12:00:00.000Z";
const iso=(minutes:number)=>new Date(Date.parse(cutoff)+minutes*60000).toISOString();
const UUID="a23e4567-e89b-42d3-a456-426614174000";
const frozen="data-collection/phase5/frozen/native_t24_future01.json";
function fixture(){
 const pre={
  manifestSha256:h("a"),queryDigestSha256:h("b"),
  expectedSourcePopulationQueryId:UUID,
  expectedSourceResponseSha256:h("c"),
  runDayIndex:1,slot:"HUB",horizon:"T-24h",airportIcao:"WSSS",
  flightInstanceId:"leg:ci:100",expectedGithubSourceRunId:"42363348762",
  expectedReviewedReleaseSha256:h("d"),
  expectedReviewedSourceRightsSha256:h("e"),
  expectedProviderContractSha256:h("f"),
  expectedEarlyDrawSha256:h("1"),
  reviewedFrameSha256:h("2"),reviewedConfigSha256:h("3"),
  independentlyReviewedOperatingLegEvidenceSha256:h("4"),
  independentlyReviewedNativeTEvidenceSha256:h("5"),
  independentlyReviewedRunAndRetentionEvidenceSha256:h("6"),
  frozenBuilderSha256:h("7"),
  builderFrozenAtUtc:iso(-30*60),
  selectedTConfig:{
   milestone:"departure.scheduledTime.utc",version:"native-ci-only",
   artifactHash:h("8"),verifiedProviderNativeSchedule:true,
   semanticsEvidenceSha256:h("5")
  },selectedTNativeUtc:T,
  maxPopulationStalenessSeconds:3600,
  expectedRestrictedPreWriterRole:P5_STAGE28_GROUPS.pre,
  externalNativeTPhysicalLegAndSourceUseReviewed:true
 };
 const witness={
  flightInstanceId:pre.flightInstanceId,
  sourcePopulationQueryId:pre.expectedSourcePopulationQueryId,
  expectedSourceResponseSha256:pre.expectedSourceResponseSha256,
  expectedSourceQueryDigestSha256:pre.queryDigestSha256,
  expectedFrameSha256:pre.reviewedFrameSha256,
  expectedConfigSha256:pre.reviewedConfigSha256,
  selectedTNativeUtc:T,expectedT24CutoffUtc:cutoff,
  expectedSelectedTVersion:"departure.scheduledTime.utc:native-ci-only:"+h("8"),
  expectedWitnessOnlyRole:P5_STAGE28_GROUPS.witness
 };
 const packet={
  schema:"v39.phase5.github-native-t24-pre-witness-reviewed.v1",
  reviewedCodeSha:code,
  independentNativeT24AndSourceReviewAttested:true,
  prePermit:pre,witnessReview:witness
 } as P5NativeT24SignedReleasePacket;
 const bytes=Buffer.from(JSON.stringify(packet));
 const pins={
  frozenPacketPath:frozen,
  expectedPacketSha256:sha(bytes),
  expectedApprovedMainSha:code,
  expectedManifestSha256:h("a"),
  expectedQueryDigestSha256:h("b"),
  expectedReleaseSha256:h("d"),
  expectedRightsSha256:h("e"),
  expectedFrameSha256:h("2"),
  expectedConfigSha256:h("3"),
  expectedNativeSemanticsSha256:h("5")
 };
 const original={
  manifest_sha256:h("a"),query_digest:h("b"),run_day_index:1,
  slot_id:"HUB",horizon:"T-24h",airport_icao:"WSSS",
  github_run_id:"42363348762",attempt_run_id:"42363348762",
  state:"ACTIVE",early_draw_sha256:h("1"),
  reviewed_release_sha256:h("d"),rights_review_sha256:h("e"),
  provider_contract_sha256:h("f"),
  population_query_id:UUID,original_response_hash:h("c"),
  fids_response_hash:h("c"),fids_airport_icao:"WSSS",
  bound_rights:h("e"),
  original_current:true,normalized_members_count:3,
  service_window_start_utc:"2027-03-01T11:00:00.000Z",
  service_window_end_utc:"2027-03-01T15:00:00.000Z",
  reserved_at:iso(-51),fids_retrieval_utc:iso(-50),
  raw_persisted_at_utc:iso(-49),source_available:iso(-48),
  bound_at_utc:iso(-47),source_expires_at_utc:iso(23*60-48)
 };
 const member={
  population_query_id:UUID,analytic_identity_id:"leg:ci:100",
  canonical_flight_instance_id:"leg:ci:100",
  source_airport_icao:"WSSS",dep_airport_icao:"WSSS",
  population_role:"requested_airport_primary",
  scope_classification:"confirmed_core",
  codeshare_resolution_status:"confirmed_operating_leg",
  source_type:"fids",response_hash:h("c"),
  provider_content_expired_at_utc:null,
  population_member_id:"member-ci-1",dep_scheduled_utc:T,
  available_at:iso(-47)
 };
 const actual:P5T24ActualOriginalReadback={
  observedDbClockUtc:iso(-45),
  effectiveRole:P5_STAGE28_GROUPS.pre,
  databaseName:"neondb",transactionReadOnly:"on",
  originalRows:[original],memberRows:[member],
  priorSnapshotCount:0,priorWitnessCount:0
 };
 const env:NodeJS.ProcessEnv={
  GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
  GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"schedule",
  GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:code,
  V39_P5_T24_APPROVED_CODE_SHA:code,
  P5_T24_SOURCE_READONLY_ENABLED:"true",
  ADB_AUTO_COLLECT:"0",AERODATABOX_API_KEY:"",
  DATABASE_URL:"",V39_DATABASE_RUNTIME_URL:"",
  V39_P5_SOURCE_DATABASE_URL:"",
  P5_V39_T24_WITNESS_DATABASE_URL:"",
  V39_P5_T24_OWNER_APPROVED:"1",
  V39_PHASE5_FREEZE_SIGNED:"1",
  V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",
  V39_PHASE6_PROCESS_ARMED:"1",
  P5_T24_READONLY_SIGNED_PACKET_FILE:frozen,
  V39_P5_T24_SIGNED_PACKET_SHA256:sha(bytes),
  V39_P5_MANIFEST_SHA256:h("a"),V39_P5_QUERY_DIGEST:h("b"),
  V39_P5_RELEASE_SHA256:h("d"),V39_P5_RIGHTS_SHA256:h("e"),
  V39_P5_FRAME_HASH:h("2"),V39_P5_CONFIG_HASH:h("3"),
  V39_P5_NATIVE_T_SEMANTICS_SHA256:h("5"),
  P5_V39_PRE_DATABASE_URL:
   "postgresql://phase5_p30_pre_login_20261107:dummy@localhost:5432/neondb"
 };
 return{packet,bytes,pins,original,member,actual,env};
}
const check=(f:ReturnType<typeof fixture>)=>
 reviewP5OneNativeT24RealSourceHandoff(f.bytes,f.packet,f.pins,f.actual);
describe("authentic provider original -> native T24 no-provider readonly readiness handoff",()=>{
 it("marks exactly source-bound eligible flight in prospective 90..15m lead without dispatch",()=>{
  const f=fixture(),d=check(f);
  expect(d.status).toBe("SIGNED_T24_READY_FOR_DISTINCT_WITNESS_CHILD_NO_DISPATCH");
  expect(d.flightInstanceId).toBe("leg:ci:100");
  expect(d.originalRowCount).toBe(1);
  expect(d.memberRowCount).toBe(1);
  expect(d.selectedT24CutoffUtc).toBe(cutoff);
  expect(d.providerCalls).toBe(0);
  expect(d.productionDatabaseWrites).toBe(0);
  expect(d.githubChildDispatches).toBe(0);
  expect(d.nativePhysicalLegCertifiedByThisReadback).toBe(false);
  expect(d.legalSourceRightsCertifiedByThisReadback).toBe(false);
 });
 it("does not fabricate missing genuine original or normalized member",()=>{
  const f=fixture();
  f.actual.originalRows=[];
  expect(check(f).status).toBe("SIGNED_T24_SOURCE_ORIGINAL_NOT_YET_BOUND");
  const g=fixture();g.actual.memberRows=[];
  expect(check(g).status).toBe("SIGNED_T24_SOURCE_ORIGINAL_NOT_YET_BOUND");
 });
 it("does not auto-dispatch early, too late or after cutoff",()=>{
  const f=fixture();f.actual.observedDbClockUtc=iso(-91);
  // For a genuinely early T24 review, the source must ALSO have
  // pre-existed this DB instant; an original bound in the future is
  // impossible. This fixture explicitly allows a 2h source age.
  (f.packet.prePermit as any).maxPopulationStalenessSeconds=7200;
  f.bytes=Buffer.from(JSON.stringify(f.packet));
  f.pins.expectedPacketSha256=sha(f.bytes);
  f.original.reserved_at=iso(-120);
  f.original.fids_retrieval_utc=iso(-119);
  f.original.raw_persisted_at_utc=iso(-118);
  f.original.source_available=iso(-117);
  f.original.bound_at_utc=iso(-116);
  f.original.source_expires_at_utc=iso(22*60);
  f.member.available_at=iso(-116);
  expect(check(f).status).toBe("SIGNED_T24_NOT_YET_WITHIN_90_MINUTE_LEAD");
  const g=fixture();g.actual.observedDbClockUtc=iso(-10);
  expect(check(g).status).toBe("SIGNED_T24_CUTOFF_TOO_CLOSE_FOR_SCHEDULED_DISPATCH");
  const h2=fixture();h2.actual.observedDbClockUtc=iso(0);
  expect(check(h2).status).toBe("SIGNED_T24_CUTOFF_MISSED_CENSOR_NO_BACKFILL");
 });
 it("suppresses already witnessed PRE, holds incomplete witness or duplicates",()=>{
  const a=fixture();a.actual.priorSnapshotCount=1;a.actual.priorWitnessCount=1;
  expect(check(a).status).toBe(
   "SIGNED_T24_ALREADY_COMMITTED_AND_WITNESSED_NO_REDISPATCH");
  const b=fixture();b.actual.priorSnapshotCount=1;
  expect(check(b).status).toBe(
   "SIGNED_T24_PRE_EXISTS_WITNESS_UNCERTAIN_NO_REPLAY");
  const c=fixture();c.actual.priorSnapshotCount=2;
  expect(()=>check(c)).toThrow("DUPLICATE_OR_ORPHANED_T24_WITNESS_RECORD");
  const d=fixture();d.actual.priorWitnessCount=1;
  expect(()=>check(d)).toThrow("DUPLICATE_OR_ORPHANED_T24_WITNESS_RECORD");
 });
 it("rejects stale/expired source, wrong operating flight member, wrong native schedule",()=>{
  const a=fixture();a.original.source_expires_at_utc=iso(-1);
  expect(check(a).status).toBe("SIGNED_T24_SOURCE_INVALID_OR_EXPIRED_HOLD");
  const b=fixture();b.member.canonical_flight_instance_id="leg:other:100";
  expect(check(b).status).toBe("SIGNED_T24_SOURCE_INVALID_OR_EXPIRED_HOLD");
  const c=fixture();c.member.dep_scheduled_utc="2027-03-01T13:00:00.000Z";
  expect(check(c).status).toBe("SIGNED_T24_SOURCE_INVALID_OR_EXPIRED_HOLD");
  const d=fixture();d.original.early_draw_sha256=h("0");
  expect(check(d).status).toBe("SIGNED_T24_SOURCE_INVALID_OR_EXPIRED_HOLD");
 });
 it("rejects unsigned modified packet, changed independently reviewed code/source and forged tier",()=>{
  const a=fixture();a.bytes=Buffer.concat([a.bytes,Buffer.from(" ")]);
  expect(()=>check(a)).toThrow("FROZEN_PRE_PACKET_NOT_BYTE_AUTHENTICATED");
  const b=fixture();b.pins.expectedApprovedMainSha="a".repeat(40);
  expect(()=>check(b)).toThrow("UNREVIEWED_NATIVE_T_SOURCE_WITNESS_OR_RELEASE");
  const c=fixture();
  (c.packet.prePermit as any).identityEvidenceTier="CONDITIONAL_QUERY_FILTERED_SERVICE";
  expect(()=>check(c)).toThrow("UNREVIEWED_NATIVE_T_SOURCE_WITNESS_OR_RELEASE");
  const d=fixture();d.actual.effectiveRole=P5_STAGE28_GROUPS.source;
  expect(()=>check(d)).toThrow("UNTRUSTED_DB_ROLE_OR_SOURCE_MULTIPLICITY");
 });
 it("refuses a schedule without independently reviewed T24/rights/GO or correct login",()=>{
  const f=fixture();
  expect(admitP5T24SourceReadonlyObserver(f.env).path).toBe(frozen);
  for(const [key,value] of [
   ["V39_PHASE6_PROCESS_ARMED","0"],
   ["V39_PHASE5_SOURCE_RIGHTS_APPROVED","0"],
   ["P5_T24_SOURCE_READONLY_ENABLED","false"],
   ["GITHUB_EVENT_NAME","pull_request"],
   ["GITHUB_SHA","a".repeat(40)],
   ["AERODATABOX_API_KEY","provider-key-must-not-be-present"],
   ["V39_P5_T24_OWNER_APPROVED","0"]
  ])expect(()=>admitP5T24SourceReadonlyObserver({
   ...f.env,[key]:value
  })).toThrow("UNSIGNED_MAIN_OR_UNREVIEWED_T24_RELEASE");
  expect(()=>admitP5T24SourceReadonlyObserver({
   ...f.env,P5_V39_PRE_DATABASE_URL:
   "postgresql://phase5_p30_witness_login_20261107:dummy@localhost/neondb"
  })).toThrow("UNCOMMISSIONED_SOURCE_READONLY_PRE_LOGIN");
 });
 it("actually executes only REPEATABLE READ READ ONLY SQL, no provider/insert, commits",async()=>{
  const f=fixture(),sqls:string[]=[];
  const fakeClient={
   async query(sql:string){
    sqls.push(sql);
    if(sql.includes("SELECT current_user AS actor"))return{
     rowCount:1,rows:[{
      actor:P5_STAGE28_GROUPS.pre,db:"neondb",ro:"on",replica:false,
      now:new Date(iso(-45))
     }]
    };
    if(sql.includes("FROM clean.phase5_fids_allowed_query_v39 q"))
     return{rowCount:1,rows:[f.original]};
    if(sql.includes("FROM clean.flight_population p"))
     return{rowCount:1,rows:[f.member]};
    if(sql.includes("FROM clean.flight_snapshots s"))
     return{rowCount:0,rows:[]};
    if(sql.includes("FROM clean.phase5_t24_postcommit_witness_v39 w"))
     return{rowCount:0,rows:[]};
    return{rowCount:0,rows:[]};
   },
   release(){}
  };
  const pool={connect:async()=>fakeClient};
  const d=await auditP5T24ActualOriginalReadyReadonly(
   pool as any,f.bytes,f.packet,f.pins);
  expect(d.status).toBe("SIGNED_T24_READY_FOR_DISTINCT_WITNESS_CHILD_NO_DISPATCH");
  expect(sqls[0]).toBe("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  expect(sqls).toContain("COMMIT");
  expect(sqls.some(x=>/^\s*(INSERT|UPDATE|DELETE)\b/i.test(x))).toBe(false);
 });
});
