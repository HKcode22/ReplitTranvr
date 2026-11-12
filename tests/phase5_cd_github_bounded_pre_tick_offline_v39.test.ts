import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {
 verifyP5CdFrozenRoster,bindP5CdTaskToFrozenPermit,
 runP5CdGithubPreTick,type P5CdFrozenRoster
} from "../server/lib/disruption/phase5CdGithubBoundedPreTick_v39";
import type {P5CdClaimedTask} from
 "../server/lib/disruption/phase5CdDurableQueueClient_v39";
import {requireP5CdGithubPreRelease}
 from "../server/lib/disruption/phase5CdGithubPreReleaseGate_v39";

const sha=(x:string)=>x.repeat(64);
const code="a".repeat(40);
const native="2035-11-25T12:00:00.000Z";
const cutoff="2035-11-25T06:00:00.000Z";
const qid="c23e4567-e89b-42d3-a456-426614174013";
const file="data-collection/phase5/frozen/ci_v39_cd_existing_t6_packet.json";
const rights=sha("d"),manifest=sha("a");
function gate(){
 return{
  schema:"v39.phase5.cd-gh-pre-explicit-release.v1" as const,
  approvedCodeSha:code,rosterSha256:"",
  rightsSha256:rights,manifestSha256:manifest,
  stop:false as const,providerCalls:0 as const,
  scientificFreezeEstablishedByThisFunction:false as const
 };
}
function fixture(){
 const permit={
  expectedRestrictedPreWriterRole:"phase5_fids_pre_writer_prod_20261107",
  manifestSha256:manifest,expectedReviewedSourceRightsSha256:rights,
  externalNativeTPhysicalLegAndSourceUseReviewed:true,
  expectedSourceResponseSha256:sha("c"),
  reviewedFrameSha256:sha("e"),
  queryDigestSha256:sha("2"),
  expectedReviewedReleaseSha256:sha("3"),
  expectedProviderContractSha256:sha("4"),
  expectedEarlyDrawSha256:sha("5"),
  reviewedConfigSha256:sha("6"),
  independentlyReviewedOperatingLegEvidenceSha256:sha("7"),
  independentlyReviewedNativeTEvidenceSha256:sha("8"),
  independentlyReviewedRunAndRetentionEvidenceSha256:sha("9"),
  frozenBuilderSha256:sha("c"),
  builderFrozenAtUtc:"2035-11-25T05:00:00.000Z",
  selectedTConfig:{
   milestone:"departure.scheduledTime.utc",
   version:"ci-native-t",
   artifactHash:sha("f"),verifiedProviderNativeSchedule:true,
   semanticsEvidenceSha256:sha("8")
  },
  expectedGithubSourceRunId:"42363348888",
  runDayIndex:1,slot:"HUB",airportIcao:"WSSS",
  maxPopulationStalenessSeconds:3600,
  reviewedT24WitnessReceipt:{schema:"ci-prior-independent-witness"} ,
  flightInstanceId:"leg:ci:cd:t6:001",horizon:"T-6h",
  selectedTNativeUtc:native,expectedSourcePopulationQueryId:qid
 };
 const packetBytes=Buffer.from(JSON.stringify({
  schema:"v39.phase5.github-witnessed-later-pre-reviewed.v1",
  reviewedCodeSha:code,
  independentLaterHorizonAndT24ReviewAttested:true,
  prePermit:permit
 }));
 const packetSha256=createHash("sha256").update(packetBytes).digest("hex");
 const roster:P5CdFrozenRoster={
  schema:"v39.phase5.cd-existing-signed-pre-packet-roster.v1",
  reviewedCodeSha:code,manifestSha256:manifest,rightsSha256:rights,
  entries:[{filePath:file,packetSha256}]
 };
 const rosterBytes=Buffer.from(JSON.stringify(roster));
 const release={...gate(),rosterSha256:createHash("sha256")
  .update(rosterBytes).digest("hex")};
 const packetSet=verifyP5CdFrozenRoster(rosterBytes,roster,
  [{filePath:file,packetSha256,bytes:packetBytes}],release);
 const task:P5CdClaimedTask={
  taskId:"12",manifestSha256:manifest,
  flightInstanceId:permit.flightInstanceId,
  horizon:"T-6h",selectedNativeTUtc:native,
  predictionCutoffUtc:cutoff,packetSha256,
  sourcePopulationQueryId:qid,
  sourceResponseSha256:sha("c"),
  reviewedSourceRightsSha256:rights,
  sourceExpiresAtUtc:"2035-11-26T00:00:00.000Z",
  state:"CLAIMED",leaseOwner:"ci-gh-worker-12",
  leaseGeneration:"1",leaseUntilUtc:"2035-11-25T05:59:00.000Z"
 };
 return {roster,rosterBytes,release,packetSha256,packetBytes,
  packetSet,task,permit};
}
function env():NodeJS.ProcessEnv{
 return{
  GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
  GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"workflow_dispatch",
  GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:code,
  P5_CD_GH_PRE_APPROVED_CODE_SHA:code,
  P5_CD_GH_CODE_LINEAGE_VERIFIED:code+":"+code,
  P5_CD_GH_PRE_CONFIRM:"ONE_SIGNED_SOURCE_BOUND_CD_PRE_NO_PROVIDER",
  P5_CD_GH_PRE_ARMED:"1",P5_CD_GH_PRE_STOP:"0",
  P5_CD_GH_PRE_MODE:"PHASE6_APPROVED",
  P5_CD_GH_PHASE5_CANARY_APPROVED:"",
  V39_PHASE5_FREEZE_SIGNED:"1",
  V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",
  V39_PHASE6_PROCESS_ARMED:"1",ADB_AUTO_COLLECT:"0",
  P5_CD_GH_PRE_ROSTER_SHA256:sha("e"),
  V39_P5_MANIFEST_SHA256:manifest,V39_P5_RIGHTS_SHA256:rights,
  P5_V39_PRE_DATABASE_URL:
   "postgresql://phase5_p30_pre_login_20261107:mock@remote.example.com/neondb?sslmode=verify-full"
 };
}
describe("Phase5 GH bounded tick with existing signed PRE packets",()=>{
 it("pins exact existing T6 packet bytes and all immutable queue source identifiers",()=>{
  const f=fixture();
  expect(f.packetSet.size).toBe(1);
  expect(bindP5CdTaskToFrozenPermit(f.task,f.packetSet).flightInstanceId)
   .toBe("leg:ci:cd:t6:001");
  expect(f.release.rosterSha256).toMatch(/^[0-9a-f]{64}$/);
 });
 it("refuses replaced packet bytes, substituted roster, altered rights and native T",()=>{
  const f=fixture();
  expect(()=>verifyP5CdFrozenRoster(f.rosterBytes,f.roster,
   [{filePath:file,packetSha256:f.packetSha256,
    bytes:Buffer.concat([f.packetBytes,Buffer.from("altered")])}],
   f.release)).toThrow("FROZEN_PACKET_BYTES_OR_FILE_NOT_MATCHED");
  expect(()=>verifyP5CdFrozenRoster(f.rosterBytes,f.roster,
   [{filePath:file,packetSha256:f.packetSha256,bytes:f.packetBytes}],
   {...f.release,rosterSha256:sha("f")}
  )).toThrow("FROZEN_ROSTER_NOT_INDEPENDENTLY_PINNED");
  expect(()=>bindP5CdTaskToFrozenPermit({
   ...f.task,reviewedSourceRightsSha256:sha("f")
  },f.packetSet)).toThrow("QUEUE_TASK_AND_FROZEN_PERMIT_IDENTITY_MISMATCH");
  expect(()=>bindP5CdTaskToFrozenPermit({
   ...f.task,selectedNativeTUtc:"2035-11-25T12:15:00.000Z"
  },f.packetSet)).toThrow("QUEUE_TASK_AND_FROZEN_PERMIT_IDENTITY_MISMATCH");
 });
 it("rejects a forged packet that lacks native-T/source reviewer attestation",()=>{
  const f=fixture();
  const bytes=Buffer.from(JSON.stringify({
   schema:"v39.phase5.github-witnessed-later-pre-reviewed.v1",
   reviewedCodeSha:code,
   independentLaterHorizonAndT24ReviewAttested:false,
   prePermit:f.permit
  }));
  const hash=createHash("sha256").update(bytes).digest("hex");
  const roster={...f.roster,entries:[{filePath:file,packetSha256:hash}]};
  const b=Buffer.from(JSON.stringify(roster));
  expect(()=>verifyP5CdFrozenRoster(
   b,roster,[{filePath:file,packetSha256:hash,bytes}],
   {...f.release,rosterSha256:createHash("sha256").update(b).digest("hex")}
  )).toThrow("FROZEN_PERMIT_SOURCE_RIGHTS_OR_NATIVE_T_UNREVIEWED");
 });
 it("STOP rejects before ANY DB claim or recovery",async()=>{
  let count=0;const fake={query:async()=>{count++;return{rows:[]}}};
  await expect(runP5CdGithubPreTick({...env(),P5_CD_GH_PRE_STOP:"1"},{
    db:fake,pool:{connect:async()=>{throw Error("not called")}} as any,
    packets:fixture().packetSet
   },{owner:"ci-gh-worker-12"})).rejects.toThrow(
    "REFUSED_P5_CD_GITHUB_PRE_");
  expect(count).toBe(0);
 });
 it("unlisted claimed task never starts PRE, never calls writer or ACK",async()=>{
  const f=fixture(),unknown={...f.task,packetSha256:sha("f")};
  const seen:string[]=[];
  const db={query:async(sql:string)=>{
   seen.push(sql);
   if(sql.includes("phase5_cd_reap_once_v39"))return{rows:[]};
   if(sql.includes("phase5_cd_claim_due_v39")){
    return{rows:[{
     task_id:unknown.taskId,manifest_sha256:unknown.manifestSha256,
     flight_instance_id:unknown.flightInstanceId,
     horizon:unknown.horizon,
     selected_native_t_utc:new Date(unknown.selectedNativeTUtc),
     prediction_cutoff_utc:new Date(unknown.predictionCutoffUtc),
     packet_sha256:unknown.packetSha256,
     source_population_query_id:unknown.sourcePopulationQueryId,
     source_response_sha256:unknown.sourceResponseSha256,
     reviewed_source_rights_sha256:unknown.reviewedSourceRightsSha256,
     source_expires_at_utc:new Date(unknown.sourceExpiresAtUtc),
     state:"CLAIMED",lease_owner:unknown.leaseOwner,
     lease_generation:"1",
     lease_until_utc:new Date(unknown.leaseUntilUtc)
    }]};
   }
   throw Error("UNEXPECTED_SQL");
  }};
  const got=await runP5CdGithubPreTick(env(),{
   db,pool:{connect:async()=>{throw Error("MUST_NOT_CONNECT")}} as any,
   packets:f.packetSet
  },{owner:"ci-gh-worker-12",limit:1});
  expect(got.claimed).toBe(1);
  expect(got.verified).toBe(0);
  expect(got.results[0].result).toBe("REJECTED_UNSIGNED_TASK_NO_WRITE");
  expect(seen).toHaveLength(2);
 });
 it("false mark-write-started cannot fall through to Stage14",async()=>{
  const f=fixture();
  const seen:string[]=[];
  const db={query:async(sql:string)=>{
   seen.push(sql);
   if(sql.includes("phase5_cd_reap_once_v39"))return{rows:[]};
   if(sql.includes("phase5_cd_claim_due_v39"))return{rows:[{
     task_id:f.task.taskId,manifest_sha256:f.task.manifestSha256,
     flight_instance_id:f.task.flightInstanceId,
     horizon:f.task.horizon,
     selected_native_t_utc:new Date(f.task.selectedNativeTUtc),
     prediction_cutoff_utc:new Date(f.task.predictionCutoffUtc),
     packet_sha256:f.task.packetSha256,
     source_population_query_id:f.task.sourcePopulationQueryId,
     source_response_sha256:f.task.sourceResponseSha256,
     reviewed_source_rights_sha256:f.task.reviewedSourceRightsSha256,
     source_expires_at_utc:new Date(f.task.sourceExpiresAtUtc),
     state:"CLAIMED",lease_owner:f.task.leaseOwner,
     lease_generation:f.task.leaseGeneration,
     lease_until_utc:new Date(f.task.leaseUntilUtc)
    }]};
   if(sql.includes("phase5_cd_mark_write_started_v39"))
    return{rows:[{ok:false}]};
   throw Error("UNEXPECTED_SQL");
  }};
  const got=await runP5CdGithubPreTick(env(),{
   db,pool:{connect:async()=>{throw Error("MUST_NOT_CONNECT")}} as any,
   packets:f.packetSet
  },{owner:"ci-gh-worker-12",limit:1});
  expect(got.results[0].result).toBe("CLAIMED_NOT_STARTED");
  expect(got.verified).toBe(0);
  expect(seen).toHaveLength(3);
 });
});
