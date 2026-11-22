import {describe,it,expect} from "vitest";
import {admitP7ActorOnlyPost,P7_POST_ACTOR_CONFIRM} from "../scripts/v39_phase7_post_actor_preflight_v39";
import {readFileSync} from "node:fs";
const base={GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",GITHUB_REF:"refs/heads/main",
 GITHUB_WORKFLOW_REF:"HKcode22/ReplitTranvr/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml@refs/heads/main",GITHUB_EVENT_NAME:"workflow_dispatch",
 GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:"a".repeat(40),V39_P5_POST_APPROVED_CODE_SHA:"a".repeat(40),P6_POST_ACTOR_PREFLIGHT_CONFIRM:P7_POST_ACTOR_CONFIRM,
 ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",V39_PHASE6_OWNER_APPROVED:"0"};
const reviewer={...base,P6_PHASE7_POST_OUTCOME_PRIVATE_KEY_BASE64:"fixture",V39_P5_SOURCE_DATABASE_URL:"fixture",P6_PHASE7_POST_SCOPED_DATABASE_URL:"fixture"};
const publisher={...base,P6_PRIVATE_PUBLISHER_DATABASE_URL:"fixture"};
const storage={...base,P6_PHASE7_POST_SCOPED_DATABASE_URL:"fixture",P6_PHASE7_POST_BUNDLE_WRITER_DATABASE_URL:"fixture",P6_PHASE7_POST_BUNDLE_READER_DATABASE_URL:"fixture"};
describe("exact main actor-only POST commissioning, no observation",()=>{
 it("admits each isolated role without inventing a request",()=>{expect(()=>admitP7ActorOnlyPost(reviewer,"reviewer")).not.toThrow();expect(()=>admitP7ActorOnlyPost(publisher,"publisher")).not.toThrow();expect(()=>admitP7ActorOnlyPost(storage,"storage")).not.toThrow()});
 it.each([{GITHUB_REF:"refs/heads/detached"},{GITHUB_RUN_ATTEMPT:"2"},{GITHUB_WORKFLOW_REF:"wrong"},{V39_P5_POST_APPROVED_CODE_SHA:"b".repeat(40)},{P6_POST_ACTOR_PREFLIGHT_CONFIRM:"wrong"},{V39_PHASE6_PROCESS_ARMED:"1"},{V39_PHASE6_OWNER_APPROVED:"1"},{AERODATABOX_API_KEY:"fixture"},{DATABASE_URL:"fixture"},{P6_PRIVATE_POST_PACKET_SHA:"fixture"},{P6_PRIVATE_PUBLISHER_DATABASE_URL:"fixture"},{P6_PHASE7_POST_BUNDLE_WRITER_DATABASE_URL:"fixture"},{P6_PHASE7_PRE_PROOF_REVIEWER_PRIVATE_KEY_BASE64:"fixture"}])("rejects unsafe scope %j",delta=>expect(()=>admitP7ActorOnlyPost({...reviewer,...delta},"reviewer")).toThrow("SCOPE"));
 it("separates publisher and storage from signing and source credentials",()=>{expect(()=>admitP7ActorOnlyPost({...publisher,V39_P5_SOURCE_DATABASE_URL:"fixture"},"publisher")).toThrow("SCOPE");expect(()=>admitP7ActorOnlyPost({...storage,P6_PHASE7_POST_OUTCOME_PRIVATE_KEY_BASE64:"fixture"},"storage")).toThrow("SCOPE")});
 it("keeps actor-only job separate from paid job and provider secrets",()=>{const y=readFileSync(".github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml","utf8"),s=y.slice(y.indexOf("  exact-main-post-actors-only:"),y.indexOf("  exact-signed-one-v0083-future-post:"));expect(s).toContain(P7_POST_ACTOR_CONFIRM);expect(s).toContain("inputs.post_packet_sha256 == ''");expect(s).not.toMatch(/secrets\.(AERODATABOX_API_KEY|DATABASE_URL|P5_V39_OTHER_REST_RESERVE_DATABASE_URL)/);expect(y.slice(y.indexOf("  exact-signed-one-v0083-future-post:"))).toContain("inputs.confirm == 'ONE_SIGNED_FUTURE_POST_V0083_MAX_2_UNITS_NO_RETRY'")})
});
