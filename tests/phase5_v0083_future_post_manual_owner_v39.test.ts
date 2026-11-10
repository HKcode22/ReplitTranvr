import {describe,it,expect} from "vitest";
import {createHash} from "node:crypto";
import {
 admitP5SignedFuturePostGitHub,
 type P5SignedFuturePostPacket
} from "../scripts/v39_phase5_one_signed_future_post_outcome_v0083_owner_v39";
const sh=(c:string)=>c.repeat(64);
function fixture(){
 const packet:P5SignedFuturePostPacket={
  schema:"v39.phase5.github-future-post-reviewed-release.v1",
  approvedCodeSha:"a".repeat(40),
  independentSourceContentsUseAndRESTReleaseAttested:true,
  reviewed:{
   schema:"v39.phase5.future-post-reviewed-outcome-one-get.v1",
   manifestSha256:sh("b"),requestSha256:sh("c"),
   reviewedSourceRightsSha256:sh("d"),
   reviewedProviderPriceSha256:sh("e"),
   reviewedCategoryBudgetSha256:sh("f"),
   reviewedRequestContextSha256:sh("1"),
   reviewedProviderContractSha256:sh("2"),
   reviewedFrameSha256:sh("3"),
   runDayIndex:1,slot:"HUB",airportIcao:"WSSS",
   flightInstanceId:"leg:phase5:abcd012345",
   expectedSelectedTNativeUtc:"2027-02-02T10:00:00.000Z",
   plannedSourceFromUtc:"2027-02-02T09:00:00.000Z",
   plannedSourceToUtc:"2027-02-02T11:00:00.000Z",
   fromLocal:"2027-02-02T17:00",toLocal:"2027-02-02T19:00",
   airportIanaTimezone:"Asia/Singapore",
   postDispatchEarliestUtc:"2027-02-02T12:00:00.000Z",
   postDispatchHardLatestUtc:"2027-02-02T12:20:00.000Z",
   expectedApiUnitsPerGet:2,
   independentFuturePostRequestAndRightsReview:true
  }
 };
 const file="data-collection/phase5/frozen/reviewed_post_20270202.json";
 // Never use credential-looking real secrets or a real DB.
 const env:NodeJS.ProcessEnv={
  GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
  GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"workflow_dispatch",
  GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:"a".repeat(40),
  GITHUB_RUN_ID:"1234567890",
  P5_FUTURE_POST_CONFIRM:"ONE_SIGNED_FUTURE_POST_V0083_MAX_2_UNITS_NO_RETRY",
  V39_P5_POST_OWNER_APPROVED:"1",V39_PHASE5_FREEZE_SIGNED:"1",
  V39_PHASE6_PROCESS_ARMED:"1",V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",
  V39_P5_POST_INDEPENDENT_REST_ROLES_APPROVED:"1",
  V39_P5_POST_APPROVED_CODE_SHA:"a".repeat(40),
  V39_P5_MANIFEST_SHA256:sh("b"),V39_P5_RIGHTS_SHA256:sh("d"),
  V39_P5_POST_CATEGORY_BUDGET_SHA256:sh("f"),
  V39_P5_POST_PROVIDER_CONTRACT_SHA256:sh("2"),
  V39_P5_POST_REVIEWED_REQUEST_SHA256:sh("c"),
  V39_P5_POST_CONTEXT_SHA256:sh("1"),
  V39_P5_FRAME_HASH:sh("3"),V39_P5_POST_PRICE_SHA256:sh("e"),
  P5_V39_OTHER_REST_REVIEW_DATABASE_URL:
   "postgresql://phase5_p5_other_rest_review_login_20261110:mock@db.example.test/neondb",
  P5_V39_OTHER_REST_RESERVE_DATABASE_URL:
   "postgresql://phase5_p5_other_rest_reserve_login_20261110:mock@db.example.test/neondb",
  V39_P5_SOURCE_DATABASE_URL:
   "postgresql://phase5_p5_source_login_20261108:mock@db.example.test/neondb",
  AERODATABOX_API_KEY:"offline_only_not_a_real_key",
  ADB_AUTO_COLLECT:"0",DATABASE_URL:"",V39_DATABASE_RUNTIME_URL:""
 };
 const bytes=Buffer.from(JSON.stringify(packet)+" ".repeat(390),"utf8");
 env.V39_P5_POST_SIGNED_PACKET_SHA256=createHash("sha256")
  .update(bytes).digest("hex");
 return{packet,env,bytes,file};
}
describe("Phase5 V0083 one signed future POST main-only admission",()=>{
 it("compares signed bytes, reviewed code SHA, frozen source frame, distinct DB workers",()=>{
  const f=fixture(),p=admitP5SignedFuturePostGitHub(
   f.env,f.bytes,f.packet,f.file);
  expect(p.githubRunId).toBe("1234567890");
  expect(p.manifestSha256).toBe(sh("b"));
  expect(p.expectedApiUnitsPerGet).toBe(2);
 });
 it("rejects absent independent Phase6 GO and source-use attestation",()=>{
  const a=fixture();delete a.env.V39_PHASE6_PROCESS_ARMED;
  expect(()=>admitP5SignedFuturePostGitHub(a.env,a.bytes,a.packet,a.file))
   .toThrow("MAIN_GITHUB_SIGNED_GO_OR_SOURCE_RIGHTS_NOT_PRESENT");
  const b=fixture();b.env.V39_PHASE5_SOURCE_RIGHTS_APPROVED="0";
  expect(()=>admitP5SignedFuturePostGitHub(b.env,b.bytes,b.packet,b.file))
   .toThrow("MAIN_GITHUB_SIGNED_GO_OR_SOURCE_RIGHTS_NOT_PRESENT");
 });
 it("rejects code drift, invalid or tampered packet, wrong branch or replay",()=>{
  const a=fixture();a.packet.approvedCodeSha="b".repeat(40);
  expect(()=>admitP5SignedFuturePostGitHub(a.env,a.bytes,a.packet,a.file))
   .toThrow("SELF_APPROVED_OR_CROSS_RUN_SOURCE_PACKET");
  const b=fixture();b.bytes=Buffer.from("tampered".repeat(70));
  expect(()=>admitP5SignedFuturePostGitHub(b.env,b.bytes,b.packet,b.file))
   .toThrow("UNREVIEWED_POST_PACKET_BYTES_OR_PATH");
  const c=fixture();c.env.GITHUB_RUN_ATTEMPT="2";
  expect(()=>admitP5SignedFuturePostGitHub(c.env,c.bytes,c.packet,c.file))
   .toThrow("MAIN_GITHUB_SIGNED_GO_OR_SOURCE_RIGHTS_NOT_PRESENT");
 });
 it("rejects app DB reuse and role sharing",()=>{
  const a=fixture();a.env.DATABASE_URL=
   a.env.P5_V39_OTHER_REST_REVIEW_DATABASE_URL;
  expect(()=>admitP5SignedFuturePostGitHub(a.env,a.bytes,a.packet,a.file))
   .toThrow("REST_SOURCE_OR_APP_LOGIN_NOT_SEPARATE");
  const b=fixture();b.env.P5_V39_OTHER_REST_RESERVE_DATABASE_URL=
   b.env.P5_V39_OTHER_REST_REVIEW_DATABASE_URL;
  expect(()=>admitP5SignedFuturePostGitHub(b.env,b.bytes,b.packet,b.file))
   .toThrow("RESERVE_NOT_DEDICATED_REAL_NEONDB_LOGIN");
 });
 it("rejects unauthorized rights or category budget drift",()=>{
  const a=fixture();a.env.V39_P5_POST_CATEGORY_BUDGET_SHA256=sh("9");
  expect(()=>admitP5SignedFuturePostGitHub(a.env,a.bytes,a.packet,a.file))
   .toThrow("POST_FROZEN_MANIFEST_FRAME_RIGHTS_PRICE_DRIFT");
  const b=fixture();b.packet.reviewed.expectedApiUnitsPerGet=3 as 2;
  expect(()=>admitP5SignedFuturePostGitHub(b.env,b.bytes,b.packet,b.file))
   .toThrow("MISSING_REVIEWED_POST_SOURCE_QUERY");
 });
});
