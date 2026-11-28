import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {
 requireP5CdGithubPrepareAdmission
} from "../server/lib/disruption/phase5CdGithubPrepareRegistrationGate_v39";
import {
 makeP5CdV0091RegisterArgs,makeP5CdReviewedSourceRegistrationCall,requireP5CdFrozenStage17WitnessForEnrollment
} from "../scripts/v39_phase5_cd_github_one_source_bound_enqueue_v39";
import {digestP5Stage24ReviewedReceipt}
 from "../server/lib/disruption/phase5T24WitnessedLaterHorizonGuard_v39";
import {executeP6PrivateEnrollmentBatch} from "../scripts/v39_phase6_private_later_restartable_enrollment_v39";
import type {P5Stage14SingleFlightPrePermit} from
 "../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39";
const head="a".repeat(40),hash="b".repeat(64);
const prepareUrl=
 "postgresql://phase5_p30_prepare_login_20261107:mock"+
 "@reviewed.example.com/neondb?sslmode=verify-full";
const env=():NodeJS.ProcessEnv=>({
 GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
 GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"workflow_dispatch",
 GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:head,
 P5_CD_GH_PRE_APPROVED_CODE_SHA:head,
  P5_CD_GH_CODE_LINEAGE_VERIFIED:head+":"+head,
 P5_CD_GH_PREPARE_CONFIRM:
  "REGISTER_ONE_ALREADY_BOUND_SOURCE_FLIGHT_NO_PROVIDER",
 P5_CD_GH_PREPARE_ARMED:"1",
 P5_CD_GH_PRE_ARMED:"1",
 P5_CD_GH_PRE_STOP:"0",
 P5_CD_GH_PRE_MODE:"PHASE5_CANARY",
 P5_CD_GH_PHASE5_CANARY_APPROVED:"1",
 V39_PHASE6_PROCESS_ARMED:"0",
 V39_PHASE5_FREEZE_SIGNED:"0",
 V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",
 ADB_AUTO_COLLECT:"0",
 AERODATABOX_API_KEY:"",AERODATABOX_WEBHOOK_SECRET:"",
 DATABASE_URL:"",V39_DATABASE_RUNTIME_URL:"",
 V39_P5_SOURCE_DATABASE_URL:"",
 P5_V39_PRE_DATABASE_URL:"",
 P5_CD_GH_PRE_ROSTER_SHA256:hash,
 V39_P5_MANIFEST_SHA256:hash,
 V39_P5_RIGHTS_SHA256:hash,
 P5_V39_PREPARE_DATABASE_URL:prepareUrl
});
describe("Phase5 C+D one GH-only PREPARE FIDS original → V0091 queue admission",()=>{
 it("permits distinct nonpaid PREPARE-only 1-flight canary before Phase6 GO",()=>{
  const result=requireP5CdGithubPrepareAdmission(env());
  expect(result.gate.releaseMode).toBe("PHASE5_CANARY");
  expect(result.gate.providerCalls).toBe(0);
  expect(result.databaseUrl).toBe(prepareUrl);
  expect(result.sourceRightsIndependentlyCertifiedByThisFunction).toBe(false);
 });
 it.each([
  ["STOP",{P5_CD_GH_PRE_STOP:"1"}],
  ["no source/rights review",{V39_PHASE5_SOURCE_RIGHTS_APPROVED:""}],
  ["no PREPARE arm",{P5_CD_GH_PREPARE_ARMED:"0"}],
  ["no PRE arm",{P5_CD_GH_PRE_ARMED:""}],
  ["wrong code SHA",{P5_CD_GH_PRE_APPROVED_CODE_SHA:"c".repeat(40)}],
  ["PR event",{GITHUB_EVENT_NAME:"pull_request"}],
  ["schedule not manual",{GITHUB_EVENT_NAME:"schedule"}],
  ["rerun",{GITHUB_RUN_ATTEMPT:"2"}],
  ["off branch",{GITHUB_REF:"refs/heads/other"}],
  ["off repo",{GITHUB_REPOSITORY:"other/repository"}],
  ["paid API key",{AERODATABOX_API_KEY:"paid-key-present"}],
  ["app runtime credential",{DATABASE_URL:"postgresql://app:secret@host/neondb"}],
  ["raw source role present",{V39_P5_SOURCE_DATABASE_URL:"source-secret"}],
  ["PRE role present",{P5_V39_PRE_DATABASE_URL:"pre-secret"}],
  ["wrong group URL",{P5_V39_PREPARE_DATABASE_URL:
   "postgresql://phase5_p30_pre_login_20261107:secret@reviewed.example.com/neondb"}],
  ["missing source roster SHA",{P5_CD_GH_PRE_ROSTER_SHA256:""}],
  ["improper early Phase6 arm",{V39_PHASE6_PROCESS_ARMED:"1"}],
  ["missing explicit one-task ACK",{P5_CD_GH_PREPARE_CONFIRM:""}]
 ])("refuses %s before any PG16 transaction or provider call",(_label,delta)=>{
  expect(()=>requireP5CdGithubPrepareAdmission({...env(),...delta}))
   .toThrow("REFUSED_P5_CD_GH_PREPARE_");
 });
 it("also supports only separate post-freeze approved Phase6 mode",()=>{
  const valid={
   ...env(),P5_CD_GH_PRE_MODE:"PHASE6_APPROVED",
   P5_CD_GH_PHASE5_CANARY_APPROVED:"",
   V39_PHASE5_FREEZE_SIGNED:"1",
   V39_PHASE6_PROCESS_ARMED:"1"
  };
  expect(requireP5CdGithubPrepareAdmission(valid).gate.releaseMode)
   .toBe("PHASE6_APPROVED");
  expect(()=>requireP5CdGithubPrepareAdmission({
   ...valid,P5_CD_GH_PHASE5_CANARY_APPROVED:"1"
  })).toThrow("NO_REVIEWED_MAIN_SOURCE_RIGHTS_EXPLICIT_PREPARE_ARM_OR_STOP");
 });
 it("refuses forged or retimed T24 Stage17 witness before source queue insertion",()=>{
  const s="2035-11-25T12:00:00.000Z";
  const cfg={milestone:"departure.scheduledTime.utc",version:"ci-native",
    artifactHash:"a".repeat(64),verifiedProviderNativeSchedule:true,
    semanticsEvidenceSha256:"b".repeat(64)};
  const witness={
   schema:"v39.phase5.stage24.externally-reviewed-stage17-receipt.v1" as const,
   snapshotId:"42",
   flightInstanceId:"leg:ci:later:001",
   selectedTNativeUtc:s,
   frozenT24CutoffUtc:"2035-11-24T12:00:00.000Z",
   expectedSelectedTVersion:cfg.milestone+":"+cfg.version+":"+
     cfg.artifactHash,
   t24OriginalFidsSha256:"c".repeat(64),
   t24SourceQueryDigestSha256:"d".repeat(64),
   t24FrameSha256:"e".repeat(64),
   t24ConfigSha256:"f".repeat(64),
   witnessDbObservedAtUtc:"2035-11-24T11:59:00.000Z",
   stage17PostCommitReadbackAtUtc:"2035-11-24T11:59:10.000Z"
  };
  const w={...witness,receiptSha256:digestP5Stage24ReviewedReceipt(witness)};
  const permit={
   horizon:"T-6h",flightInstanceId:w.flightInstanceId,
   selectedTNativeUtc:s,selectedTConfig:cfg,
   reviewedFrameSha256:w.t24FrameSha256,
   reviewedConfigSha256:w.t24ConfigSha256,
   reviewedT24WitnessReceipt:w
  } as P5Stage14SingleFlightPrePermit;
  expect(()=>requireP5CdFrozenStage17WitnessForEnrollment(permit))
   .not.toThrow();
  expect(()=>requireP5CdFrozenStage17WitnessForEnrollment({
   ...permit,reviewedT24WitnessReceipt:{
    ...w,t24FrameSha256:"1".repeat(64)
   }
  })).toThrow("FROZEN_STAGE17_T24_WITNESS_DIGEST_OR_IDENTITY_DRIFT");
  expect(()=>requireP5CdFrozenStage17WitnessForEnrollment({
   ...permit,selectedTNativeUtc:"2035-11-25T13:00:00.000Z"
  })).toThrow("FROZEN_STAGE17_T24_WITNESS_DIGEST_OR_IDENTITY_DRIFT");
  expect(()=>requireP5CdFrozenStage17WitnessForEnrollment({
   ...permit,reviewedT24WitnessReceipt:undefined
  })).toThrow("FROZEN_STAGE17_T24_WITNESS_DIGEST_OR_IDENTITY_DRIFT");
 });
 it("sends exactly real V0091 signature and NEVER accepts source expiry",()=>{
  const permit={
   manifestSha256:"a".repeat(64),
   queryDigestSha256:"b".repeat(64),
   flightInstanceId:"leg:ci:enrol:01",
   horizon:"T-6h",
   selectedTNativeUtc:"2030-11-24T12:00:00.000Z",
   expectedSourcePopulationQueryId:"c23e4567-e89b-42d3-a456-426614174013",
   expectedSourceResponseSha256:"c".repeat(64),
   expectedReviewedSourceRightsSha256:"d".repeat(64),
   maxPopulationStalenessSeconds:3600
  } as P5Stage14SingleFlightPrePermit;
  const got=makeP5CdV0091RegisterArgs(permit,"f".repeat(64));
  expect(got).toHaveLength(10);
  expect(got[4]).toBe(permit.selectedTNativeUtc);
  expect(got[5]).toBe("f".repeat(64));
  expect(got[9]).toBe(3600);
  expect(got).not.toContain("source_expires_at_utc");
  expect(()=>makeP5CdV0091RegisterArgs(permit,"BAD"))
   .toThrow("UNAPPROVED_SIGNED_PACKET_SHA256");
 });
 it("T140 selects the receipt overload only for explicit conditional witnessed packets in both real callers",async()=>{
  const selected="2035-11-25T12:00:00.000Z",flight="leg:g5a:"+"a".repeat(64);
  const cfg={milestone:"departure.scheduledTime.utc",version:"ci-native",artifactHash:"a".repeat(64),verifiedProviderNativeSchedule:true,semanticsEvidenceSha256:hash};
  const bare={schema:"v39.phase5.stage24.externally-reviewed-stage17-receipt.v1" as const,snapshotId:"42",flightInstanceId:flight,
   selectedTNativeUtc:selected,frozenT24CutoffUtc:"2035-11-24T12:00:00.000Z",expectedSelectedTVersion:cfg.milestone+":"+cfg.version+":"+cfg.artifactHash,
   t24OriginalFidsSha256:"c".repeat(64),t24SourceQueryDigestSha256:"d".repeat(64),t24FrameSha256:"e".repeat(64),t24ConfigSha256:"f".repeat(64),
   witnessDbObservedAtUtc:"2035-11-24T11:59:00.000Z",stage17PostCommitReadbackAtUtc:"2035-11-24T11:59:10.000Z"};
  const w={...bare,receiptSha256:digestP5Stage24ReviewedReceipt(bare)};
  for(const horizon of ["T-6h","T-90m"] as const){
   const p={manifestSha256:hash,queryDigestSha256:hash,flightInstanceId:flight,horizon,selectedTNativeUtc:selected,
    identityEvidenceTier:"CONDITIONAL_QUERY_FILTERED_SERVICE",selectedTConfig:cfg,reviewedFrameSha256:w.t24FrameSha256,reviewedConfigSha256:w.t24ConfigSha256,
    expectedSourcePopulationQueryId:"c23e4567-e89b-42d3-a456-426614174013",expectedSourceResponseSha256:hash,
    expectedReviewedSourceRightsSha256:hash,maxPopulationStalenessSeconds:3600,reviewedT24WitnessReceipt:w} as P5Stage14SingleFlightPrePermit;
   for(const mode of ["REGISTER","ENSURE"] as const){
    const call=makeP5CdReviewedSourceRegistrationCall(p,hash,mode);
    expect(call.sql).toContain(mode==="REGISTER"?"phase5_cd_register_source_flight_v39(":"phase5_cd_ensure_exact_source_flight_v39(");
    expect(call.sql).toContain("$11::jsonb");expect(call.args).toHaveLength(11);
    expect(call.args.slice(0,10)).toEqual(makeP5CdV0091RegisterArgs(p,hash));
    expect(call.args[10]).toBe(JSON.stringify(w));
    const nativeBare={...bare,flightInstanceId:"leg:ci:native"},nativeWitness={...nativeBare,receiptSha256:digestP5Stage24ReviewedReceipt(nativeBare)};
    for(const strict of [{...p,identityEvidenceTier:undefined,flightInstanceId:nativeBare.flightInstanceId,reviewedT24WitnessReceipt:nativeWitness},
     {...p,reviewedT24WitnessReceipt:undefined,reviewedStandaloneLaterNoT24:{schema:"v39.phase5.standalone-later-asof-no-t24.v1"}},
     {...p,horizon:"T-24h",reviewedT24WitnessReceipt:undefined}]){
     const original=makeP5CdReviewedSourceRegistrationCall(strict as P5Stage14SingleFlightPrePermit,hash,mode);
     expect(original.args).toHaveLength(10);expect(original.sql).not.toContain("$11");
    }
    expect(()=>makeP5CdReviewedSourceRegistrationCall({...p,reviewedT24WitnessReceipt:{...w,receiptSha256:hash}},hash,mode)).toThrow("FROZEN_STAGE17_T24_WITNESS");
    expect(()=>makeP5CdReviewedSourceRegistrationCall({...p,reviewedT24WitnessReceipt:undefined},hash,mode)).toThrow("FROZEN_STAGE17_T24_WITNESS");
    expect(()=>makeP5CdReviewedSourceRegistrationCall({...p,reviewedStandaloneLaterNoT24:{}} as P5Stage14SingleFlightPrePermit,hash,mode)).toThrow("FROZEN_STAGE17_T24_WITNESS");
   }
   const cutoff=Date.parse(selected)-(horizon==="T-6h"?21600000:5400000),calls:{sql:string;args:unknown[]|undefined}[]=[];
   const got=await executeP6PrivateEnrollmentBatch({query:async(sql,args)=>{
    if(sql.startsWith("SELECT clock"))return {rows:[{now:new Date("2035-11-25T05:55:00.000Z")}],rowCount:1};
    calls.push({sql,args});return {rows:[{task_id:"42",newly_registered:true}],rowCount:1};
   }},[{entry:{packetSha256:hash,permit:p} as any,cutoff}]);
   expect(got.newlyRegistered).toBe(1);expect(calls).toHaveLength(1);
   expect(calls[0]).toEqual({sql:makeP5CdReviewedSourceRegistrationCall(p,hash,"ENSURE").sql,args:makeP5CdReviewedSourceRegistrationCall(p,hash,"ENSURE").args});
  }
 });
 it("keeps T24 source registration SHA distinct from concurrent T6/T90 roster",()=>{
  const yaml=readFileSync(
   ".github/workflows/phase5-cd-github-one-source-register-main-manual.yml",
   "utf8");
  const w24=readFileSync(
   ".github/workflows/phase5-cd-github-one-queued-t24-witness-main-manual.yml",
   "utf8");
  const later=readFileSync(
   ".github/workflows/phase5-cd-github-bounded-pre-tick.yml",
   "utf8");
  expect(yaml).toContain(
   "format('{0}{1}', inputs.horizon_mode == 'T-24h' && secrets.P5_CD_GH_T24_ROSTER_SHA256 || '', inputs.horizon_mode == 'T-6h_OR_T-90m' && secrets.P5_CD_GH_PRE_ROSTER_SHA256 || '')");
  expect(yaml).toContain(
   "P5_CD_GH_REGISTER_HORIZON: ${{ inputs.horizon_mode }}");
  expect(w24).toContain(
   "P5_CD_GH_PRE_ROSTER_SHA256: ${{ secrets.P5_CD_GH_T24_ROSTER_SHA256 }}");
  expect(later).toContain(
   "P5_CD_GH_PRE_ROSTER_SHA256: ${{ !((github.event_name == 'schedule' || (github.event_name == 'workflow_dispatch' && inputs.private_transport == 'PRIVATE_CURRENT_SCHEDULE' && inputs.current_dispatch_confirm == 'RUN_CURRENT_SIGNED_PRE_TICK_NO_PROVIDER')) && vars.P6_PRIVATE_CURRENT_PRE_SCHEDULE_ENABLED == '1') && secrets.P5_CD_GH_PRE_ROSTER_SHA256 || '' }}");
  expect(yaml).toContain(
   "vars.P5_CD_GH_PREPARE_SOURCE_ENABLED == '1'");
  expect(yaml).not.toContain("P5_CD_GH_T24_ROSTER_SHA256: ${{ secrets.P5_CD_GH_PRE_ROSTER_SHA256 }}");
 });
});

describe("protected standalone protocol on original V0091 PREPARE admission",()=>{
 it("is optional and never reads a protocol digest from the flight permit",()=>{
  expect(requireP5CdGithubPrepareAdmission(env()).gate.independentlyApprovedStandaloneProtocolSha256).toBeUndefined();
  expect(()=>requireP5CdGithubPrepareAdmission({...env(),P5_CD_GH_STANDALONE_LATER_PROTOCOL_SHA256:hash})).toThrow("STANDALONE_PROTOCOL_PRESENT_WITHOUT_APPROVAL");
  expect(requireP5CdGithubPrepareAdmission({...env(),P5_CD_GH_STANDALONE_LATER_APPROVED:"1",P5_CD_GH_STANDALONE_LATER_PROTOCOL_SHA256:hash}).gate.independentlyApprovedStandaloneProtocolSha256).toBe(hash);
 });
});
