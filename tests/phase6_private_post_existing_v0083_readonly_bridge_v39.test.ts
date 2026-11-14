import {describe,it,expect} from "vitest";
import {createHash} from "node:crypto";
import {
 reviewP6PrivatePostWithOriginalV0083NoDispatch,
 P6_PRIVATE_POST_ORIGINAL_V0083_BRIDGE_SCHEMA
} from "../server/lib/disruption/phase6PrivatePostExistingV0083ReadOnlyBridge_v39";

const H=(x:string)=>x.repeat(64);
const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const SOURCE="data-collection/phase5/frozen/source_registry_day01.json";
const POST="data-collection/phase5/frozen/post_native_reviewed_0001.json";
const CODE="f".repeat(40),ROUTE=H("9"),FLIGHT="leg:ci:100";
function fixture(clock="2027-03-01T10:10:00.000Z"){
 const packet={
  schema:"v39.phase5.github-future-post-reviewed-release.v1",
  approvedCodeSha:CODE,
  independentSourceContentsUseAndRESTReleaseAttested:true,
  reviewed:{
   schema:"v39.phase5.future-post-reviewed-outcome-one-get.v1",
   manifestSha256:H("a"),requestSha256:H("b"),
   reviewedSourceRightsSha256:H("c"),
   reviewedProviderPriceSha256:H("d"),
   reviewedCategoryBudgetSha256:H("e"),
   reviewedRequestContextSha256:H("1"),
   reviewedProviderContractSha256:H("2"),
   reviewedFrameSha256:H("3"),
   runDayIndex:1,slot:"HUB",airportIcao:"WSSS",
   flightInstanceId:FLIGHT,
   expectedSelectedTNativeUtc:"2027-03-01T09:00:00.000Z",
   plannedSourceFromUtc:"2027-03-01T08:00:00.000Z",
   plannedSourceToUtc:"2027-03-01T14:00:00.000Z",
   fromLocal:"2027-03-01T16:00",toLocal:"2027-03-01T22:00",
   airportIanaTimezone:"Asia/Singapore",
   postDispatchEarliestUtc:"2027-03-01T10:00:00.000Z",
   postDispatchHardLatestUtc:"2027-03-01T10:30:00.000Z",
   expectedApiUnitsPerGet:2,
   independentFuturePostRequestAndRightsReview:true
  }
 };
 const bytes=Buffer.from(JSON.stringify(packet));
 const sourceRaw=Buffer.from(JSON.stringify({
  schema:"v39.phase5.signed-per-day-source-batch-readonly.v1",
  manifestSha256:H("a"),runDayIndex:1,
  entries:[{filePath:"data-collection/phase5/frozen/sourceq_reviewed_0001.json",
   expectedPacketSha256:H("5"),expectedQueryDigestSha256:H("6")}]
 }));
 const t=Date.parse(clock);
 const earlier=new Date(t-120000).toISOString(),
  readerAt=new Date(t-60000).toISOString();
 const route={
  lane:"POST",runDayIndex:1,shardIndex:2,
  signedFrozenPath:POST,signedFrozenSha256:sha(bytes),
  boundSourceRegistryPath:SOURCE,boundSourceRegistrySha256:sha(sourceRaw),
  routingIntentSha256:ROUTE,
  privateBytesOnlyFromRestrictedReader:true,
  independentlyAuthenticatedGHHistoryRequired:true,
  newPaidDispatchAuthorizedHere:false,
  notBeforeUtc:"2027-03-01T09:30:00.000Z",
  hardLatestUtc:"2027-03-01T10:30:00.000Z"
 };
 const indexHandoff:any={redactedSummary:{
  schema:"v39.phase6.private-index-and-full-registries-memory-handoff-no-dispatch.v1",
  status:"SIGNED_RESTRICTED_INMEMORY_31DAY_REGISTRY_HANDOFF_NO_DISPATCH",
  phase6PaidGo:false,providerCalls:0,databaseWrites:0,
  githubChildDispatches:0,
  underlyingPerFlightPacketsNotHydratedHere:true,
  observedRestrictedPgClockUtc:earlier
 }};
 Object.defineProperties(indexHandoff,{
  privateRoutingCandidates:{value:[route],writable:false,enumerable:false},
  privateRegistryBytes:{
   value:new Map([[SOURCE,sourceRaw],[POST,bytes]]),
   writable:false,enumerable:false
  }
 });
 const postPacketReceipt:any={redactedSummary:{
  schema:"v39.phase6.private-source-post-packet-restricted-read-once.v1",
  status:"VERIFIED_ONE_PRIVATE_PACKET_BYTE_TRANSPORT_NO_GO",
  kind:"POST_PACKET",runDayIndex:1,shardIndex:2,
  contentSha256:sha(bytes),observedDatabaseClockUtc:readerAt,
  verifiedEd25519Review:true,
  independentlyAuthorizedProviderUseCertified:false,
  reviewerOrganizationalIndependenceCertified:false,
  actualPhase6PaidGoCertified:false,
  contentsWereCopiedToPublicLogs:false,
  providerCalls:0,databaseWrites:0,githubDispatches:0
 }};
 Object.defineProperties(postPacketReceipt,{
  privateBytes:{value:bytes,enumerable:false,writable:false,configurable:true},
  privateLogicalPath:{value:POST,enumerable:false,writable:false}
 });
 const actualPre={
  status:"ACTUAL_SAME_FLIGHT_SOURCE_BOUND_PRE_PARTIAL_ALLOWED",
  manifestSha256:H("a"),runDayIndex:1,flightInstanceId:FLIGHT,
  observedValidHorizonCount:1,observedValidHorizons:["T-6h"],
  missingPreHorizons:["T-24h","T-90m"],
  actualSourcePREReferenceIds:["123456"],
  observedFromIndependentRestrictedDb:true,
  providerCalls:0,databaseWrites:0
 };
 const env:NodeJS.ProcessEnv={
  GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
  GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"schedule",
  GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:CODE,
  GITHUB_RUN_ID:"12345678901",
  V39_P5_POST_APPROVED_CODE_SHA:CODE,
  P5_POST_AUTO_DISPATCH_ENABLED:"true",
  ADB_AUTO_COLLECT:"0",AERODATABOX_API_KEY:"",
  DATABASE_URL:"",V39_DATABASE_RUNTIME_URL:"",
  P5_V39_OTHER_REST_REVIEW_DATABASE_URL:"",
  P5_V39_OTHER_REST_RESERVE_DATABASE_URL:"",
  V39_P5_POST_OWNER_APPROVED:"1",
  V39_P5_POST_INDEPENDENT_REST_ROLES_APPROVED:"1",
  V39_PHASE5_FREEZE_SIGNED:"1",
  V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",
  V39_PHASE6_PROCESS_ARMED:"1",
  P5_POST_FROZEN_PACKET_FILE:POST,
  V39_P5_POST_SIGNED_PACKET_SHA256:sha(bytes),
  V39_P5_MANIFEST_SHA256:H("a"),
  V39_P5_RIGHTS_SHA256:H("c"),
  V39_P5_POST_CATEGORY_BUDGET_SHA256:H("e"),
  V39_P5_POST_PROVIDER_CONTRACT_SHA256:H("2"),
  V39_P5_POST_REVIEWED_REQUEST_SHA256:H("b"),
  V39_P5_POST_CONTEXT_SHA256:H("1"),
  V39_P5_FRAME_HASH:H("3"),
  V39_P5_POST_PRICE_SHA256:H("d"),
  V39_P5_SOURCE_DATABASE_URL:
   "postgresql://phase5_p5_source_login_20261108:ci-only@localhost:5432/neondb",
  GITHUB_TOKEN:"github_only_synthetic_action_token_123456"
 };
 const pins={
  expectedRoutingIntentSha256:ROUTE,expectedPostPacketPath:POST,
  expectedPostPacketSha256:sha(bytes),expectedSourceRegistryPath:SOURCE,
  expectedFlightInstanceId:FLIGHT
 };
 const args:any={indexHandoff,postPacketReceipt,actualPre,
  actualSourcePreDbClockUtc:clock,env,pins};
 return {args,bytes,indexHandoff,postPacketReceipt,route,actualPre,env};
}
const run=(f:ReturnType<typeof fixture>):any=>
 reviewP6PrivatePostWithOriginalV0083NoDispatch(f.args);
describe("Phase6 private POST V0096→V0095→original Phase5 V0083 + 1 real PRE",()=>{
 it("one true source-bound PRE is enough to ask for history, never paid GO",()=>{
  const f=fixture(),result=run(f);
  expect(result.redactedSummary.schema)
   .toBe(P6_PRIVATE_POST_ORIGINAL_V0083_BRIDGE_SCHEMA);
  expect(result.redactedSummary.status)
   .toBe("ONE_PRIVATE_POST_DUE_NEEDS_AUTHENTICATED_GITHUB_HISTORY_NO_DISPATCH");
  expect(result.redactedSummary.observedValidPreHorizonCount).toBe(1);
  expect(result.redactedSummary.missingPreHorizonCount).toBe(2);
  expect(result.redactedSummary.exactOriginalV0083PaidReservationNotInvoked).toBe(true);
  expect(result.redactedSummary.noPhysicalActualLabelInferred).toBe(true);
  expect(result.redactedSummary.phase6PaidGo).toBe(false);
  expect(result.redactedSummary.providerCalls).toBe(0);
  expect(result.privatePostPacketBytes).toEqual(f.bytes);
  expect(JSON.stringify(result)).not.toContain(FLIGHT);
  expect(JSON.stringify(result)).not.toContain("ci-only");
 });
 it("unknown independent SOURCE PRE readback remains unresolved, not three missing facts or a negative",()=>{
  const f=fixture();f.args.actualPre=null;
  const result=run(f);
  expect(result.redactedSummary.status)
   .toBe("POST_SOURCE_PRE_EVIDENCE_NOT_SUPPLIED_UNRESOLVED_NO_DISPATCH");
  expect(result.redactedSummary.observedValidPreHorizonCount).toBeNull();
  expect(result.redactedSummary.missingPreHorizonCount).toBeNull();
  expect(result.redactedSummary.noFalseNegativeFromAbsentPRE).toBe(true);
  expect(result.redactedSummary.independentSourcePREReadbackStillRequired).toBe(true);
  expect(Object.hasOwn(result,"privatePostPacketBytes")).toBe(false);
 });
 it("not due or late POST remains without private runnable input",()=>{
  const early=run(fixture("2027-03-01T09:40:00.000Z"));
  expect(early.redactedSummary.status)
   .toBe("FUTURE_POST_NOT_YET_IN_REVIEWED_WINDOW");
  expect(Object.hasOwn(early,"privatePostPacketBytes")).toBe(false);
  const late=run(fixture("2027-03-01T10:29:00.000Z"));
  expect(late.redactedSummary.status)
   .toBe("FUTURE_POST_MISSED_OR_TOO_CLOSE_NO_LATE_GET");
  expect(Object.hasOwn(late,"privatePostPacketBytes")).toBe(false);
 });
 it("rejects changed source-registry, POST raw bytes, lane/day or signed route",()=>{
  const a=fixture();
  a.indexHandoff.privateRegistryBytes.set(SOURCE,Buffer.from("changed"));
  expect(()=>run(a)).toThrow("INDEX_POST_OR_SOURCE_REGISTRY_PRIVATE_SHA_CHANGED");
  const b=fixture();
  Object.defineProperty(b.postPacketReceipt,"privateBytes",{
   value:Buffer.from("tampered".repeat(60)),
   enumerable:false,writable:false,configurable:true
  });
  expect(()=>run(b)).toThrow("POST_ED25519_PG16_READER_OR_BYTE_SHA_DRIFT");
  const c=fixture();c.route.lane="LATER_PRE";
  expect(()=>run(c)).toThrow("V0096_POST_ROUTE_OR_SOURCE_LINK_CHANGED");
  const d=fixture();d.args.pins.expectedFlightInstanceId="leg:swapped";
  expect(()=>run(d)).toThrow("POST_NOT_SAME_NATIVE_FLIGHT_OR_DAY_AS_REVIEWED_RELEASE");
 });
 it("rejects missing paid release/rights and wrong SOURCE-only reader role",()=>{
  for(const key of ["V39_PHASE5_FREEZE_SIGNED",
   "V39_PHASE5_SOURCE_RIGHTS_APPROVED",
   "V39_PHASE6_PROCESS_ARMED",
   "V39_P5_POST_INDEPENDENT_REST_ROLES_APPROVED"]){
   const f=fixture();f.env[key]="0";
   expect(()=>run(f)).toThrow("ORIGINAL_P5_POST_PARENT_APPROVAL_HOLD");
  }
  const g=fixture();g.env.V39_P5_SOURCE_DATABASE_URL=
   "postgresql://phase5_p30_pre_login_20261107:bad@localhost/neondb";
  expect(()=>run(g)).toThrow("ORIGINAL_P5_POST_PARENT_APPROVAL_HOLD");
 });
 it("rejects invalid PRE even when a signed POST exists",()=>{
  const f=fixture();
  f.actualPre.observedValidHorizonCount=0;
  expect(()=>run(f)).toThrow("ORIGINAL_SOURCE_BOUND_PRE_OR_POST_WINDOW_INVALID");
 });
 it("stale restricted reader / altered provider contract never authorizes POST",()=>{
  const f=fixture();
  f.postPacketReceipt.redactedSummary.observedDatabaseClockUtc=
   "2027-03-01T10:05:00.000Z";
  expect(()=>run(f)).toThrow("POST_DUE_WINDOW_OR_RESTRICTED_DB_CLOCK_TOO_STALE");
  const g=fixture();g.env.V39_P5_POST_PROVIDER_CONTRACT_SHA256=H("0");
  expect(()=>run(g)).toThrow("ORIGINAL_V0083_SIGNED_POST_RELEASE_REJECTED");
 });
});
