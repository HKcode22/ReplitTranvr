import {test} from "node:test";
import assert from "node:assert/strict";
import {assertP6CurrentPrivateT24Mode,readP6ScopedCurrentT24RosterDigest,withP6AuthenticatedCurrentT24Roster} from "../server/lib/disruption/phase6CurrentPrivateT24Scope_v39.mjs";
import {requireP5CdGithubCurrentPrivateT24Scope,requireP5CdGithubPreRelease} from "../server/lib/disruption/phase5CdGithubPreReleaseGate_v39.ts";
import {requireP5CdT24DispatchEvent} from "../server/lib/disruption/phase5CdGithubQueuedT24Witness_v39.ts";
const code="a".repeat(40),sha="b".repeat(64);
function env(){return {
 GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"schedule",
 GITHUB_RUN_ATTEMPT:"1",GITHUB_RUN_ID:"1234567",GITHUB_SHA:code,
 P5_CD_GH_PRE_APPROVED_CODE_SHA:code,P5_CD_GH_CODE_LINEAGE_VERIFIED:code+":"+code,
 P5_CD_GH_PRIVATE_T24_MODE:"PRIVATE_CURRENT_T24_SCHEDULE",P5_CD_GH_PRIVATE_CURRENT_T24_APPROVED:"1",
 P6_PRIVATE_CURRENT_T24_SCHEDULE_ENABLED:"1",P6_PRIVATE_T24_ENROLL_ENABLED:"1",P6_PRIVATE_T24_ENROLL_SCHEDULE_ENABLED:"1",
 P5_CD_GH_PRE_MODE:"PHASE6_APPROVED",V39_PHASE5_FREEZE_SIGNED:"1",V39_PHASE6_PROCESS_ARMED:"1",
 V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",V39_P5_MANIFEST_SHA256:sha,V39_P5_RIGHTS_SHA256:sha,
 P5_CD_GH_PRE_STOP:"0",P5_CD_GH_PRE_ARMED:"1",P5_CD_GH_PRE_CONFIRM:"ONE_SIGNED_SOURCE_BOUND_CD_PRE_NO_PROVIDER",
 P5_CD_GH_T24_WITNESS_APPROVED:"1",P5_CD_GH_T24_ONE_FLIGHT_CONFIRM:"ONE_REVIEWED_SOURCE_QUEUED_T24_PRE_AND_INDEPENDENT_WITNESS_NO_PROVIDER",
 P6_T24_CUSTODY_ENABLED:"1",P6_T24_CUSTODY_APPROVED:"1",ADB_AUTO_COLLECT:"0",
 P5_V39_PRE_DATABASE_URL:"postgresql://phase5_p30_pre_login_20261107:ci@ep-test-pooler.neon.tech/neondb?sslmode=require",
 P5_V39_T24_WITNESS_DATABASE_URL:"postgresql://phase5_p30_witness_login_20261107:ci@ep-test-pooler.neon.tech/neondb?sslmode=require",
 P6_PRIVATE_READER_DATABASE_URL:"postgresql://phase6_private_reader_login_ci_native:ci@ep-test.neon.tech/neondb?sslmode=require",
 P6_PRIVATE_PUBLISHER_DATABASE_URL:"postgresql://phase6_private_publisher_login_ci_native:ci@ep-test.neon.tech/neondb?sslmode=require"
};}
test("dynamic private T24 release gives stable scope only, no static roster digest or later PRE authority",()=>{
 const e=env();
 assert.doesNotThrow(()=>assertP6CurrentPrivateT24Mode(e));
 assert.equal(requireP5CdT24DispatchEvent(e),"SCHEDULED");
 assert.equal(requireP5CdGithubCurrentPrivateT24Scope(e).rosterSha256,undefined);
 assert.throws(()=>readP6ScopedCurrentT24RosterDigest(e),/NO_AUTHENTICATED_T24_SINGLETON/);
 assert.throws(()=>requireP5CdGithubPreRelease(e),/CURRENT_T24_SEPARATE_WITNESS_ONLY/);
 assert.throws(()=>requireP5CdGithubPreRelease(e,{allowReviewedT24Witness:true}),/NO_AUTHENTICATED_T24_SINGLETON/);
});
test("reject legacy competition, STOP, mixed later scope, old roster injection and paid/source/prepare credentials",()=>{
 for(const delta of [{P5_CD_GH_T24_SCHEDULE_ENABLED:"1"},{P5_T24_AUTO_DISPATCH_ENABLED:"true"},{P5_CD_GH_PRE_STOP:"1"},
  {P5_CD_GH_PRE_ROSTER_SHA256:sha},{P5_CD_GH_ROSTER_PATH:"data-collection/phase5/frozen/test.json"},
  {P5_CD_GH_PRIVATE_LATER_MODE:"PRIVATE_CURRENT_SCHEDULE"},{P6_PRIVATE_T24_ENROLL_ENABLED:"0"},{P6_T24_CUSTODY_APPROVED:"0"},
  {P6_PRIVATE_LATER_REVIEWER_KEY_BASE64:"no"},{RAPIDAPI_KEY:"no"},{P5_V39_PREPARE_DATABASE_URL:"no"},
  {GITHUB_EVENT_NAME:"workflow_dispatch"},{P6_PRIVATE_READER_DATABASE_URL:env().P6_PRIVATE_READER_DATABASE_URL.replace("ep-test.","ep-other.")}])
  assert.throws(()=>assertP6CurrentPrivateT24Mode({...env(),...delta}));
});
test("invalid or untrusted private request cannot get callback admission before genuine DB reader",async()=>{
 let queries=0,called=false;
 const client={query:async()=>{queries++;throw Error("NO")}};
 await assert.rejects(withP6AuthenticatedCurrentT24Roster({client,env:env(),runDayIndex:1,registrySha256:sha,packetSha256:sha},async()=>{called=true;}));
 assert.equal(queries,0);assert.equal(called,false);
});
