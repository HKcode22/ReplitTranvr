import {describe,it,expect} from "vitest";
import {admitP7ActorOnlyPost,P7_POST_ACTOR_CONFIRM,cleanupP7PostActorScratch} from "../scripts/v39_phase7_post_actor_preflight_v39";
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync,existsSync,realpathSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawnSync} from "node:child_process";
const base={GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",GITHUB_REF:"refs/heads/main",
 GITHUB_WORKFLOW_REF:"HKcode22/ReplitTranvr/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml@refs/heads/main",GITHUB_EVENT_NAME:"workflow_dispatch",
 GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:"a".repeat(40),V39_P5_POST_APPROVED_CODE_SHA:"a".repeat(40),P6_POST_ACTOR_PREFLIGHT_CONFIRM:P7_POST_ACTOR_CONFIRM,
 ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",V39_PHASE6_OWNER_APPROVED:"0"};
const reviewer={...base,P6_PHASE7_POST_OUTCOME_PRIVATE_KEY_BASE64:"fixture",V39_P5_SOURCE_DATABASE_URL:"fixture",P6_PHASE7_POST_SCOPED_DATABASE_URL:"fixture"};
const publisher={...base,P6_PRIVATE_PUBLISHER_DATABASE_URL:"fixture"};
const storage={...base,P6_PHASE7_POST_SCOPED_DATABASE_URL:"fixture",P6_PHASE7_POST_BUNDLE_WRITER_DATABASE_URL:"fixture",P6_PHASE7_POST_BUNDLE_READER_DATABASE_URL:"fixture"};
describe("exact main actor-only POST commissioning, no observation",()=>{
 it("admits each isolated role without inventing a request",()=>{expect(()=>admitP7ActorOnlyPost(reviewer,"reviewer")).not.toThrow();expect(()=>admitP7ActorOnlyPost(publisher,"publisher")).not.toThrow();expect(()=>admitP7ActorOnlyPost(storage,"storage")).not.toThrow()});
 it.each([{GITHUB_REF:"refs/heads/detached"},{GITHUB_RUN_ATTEMPT:"2"},{GITHUB_WORKFLOW_REF:"wrong"},{V39_P5_POST_APPROVED_CODE_SHA:"b".repeat(40)},{P6_POST_ACTOR_PREFLIGHT_CONFIRM:"wrong"},{V39_PHASE6_PROCESS_ARMED:"1"},{V39_PHASE6_OWNER_APPROVED:""},{V39_PHASE6_OWNER_APPROVED:"unknown"},{AERODATABOX_API_KEY:"fixture"},{DATABASE_URL:"fixture"},{P6_PRIVATE_POST_PACKET_SHA:"fixture"},{P6_PRIVATE_PUBLISHER_DATABASE_URL:"fixture"},{P6_PHASE7_POST_BUNDLE_WRITER_DATABASE_URL:"fixture"},{P6_PHASE7_PRE_PROOF_REVIEWER_PRIVATE_KEY_BASE64:"fixture"}])("rejects unsafe scope %j",delta=>expect(()=>admitP7ActorOnlyPost({...reviewer,...delta},"reviewer")).toThrow("SCOPE"));
 it("separates publisher and storage from signing and source credentials",()=>{expect(()=>admitP7ActorOnlyPost({...publisher,V39_P5_SOURCE_DATABASE_URL:"fixture"},"publisher")).toThrow("SCOPE");expect(()=>admitP7ActorOnlyPost({...storage,P6_PHASE7_POST_OUTCOME_PRIVATE_KEY_BASE64:"fixture"},"storage")).toThrow("SCOPE")});
 it("keeps actor-only job separate from paid job and provider secrets",()=>{const y=readFileSync(".github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml","utf8"),s=y.slice(y.indexOf("  exact-main-post-actors-only:"),y.indexOf("  exact-signed-one-v0083-future-post:"));expect(s).toContain(P7_POST_ACTOR_CONFIRM);expect(s).toContain("inputs.post_packet_sha256 == ''");expect(s).not.toMatch(/secrets\.(AERODATABOX_API_KEY|DATABASE_URL|P5_V39_OTHER_REST_RESERVE_DATABASE_URL)/);expect(y.slice(y.indexOf("  exact-signed-one-v0083-future-post:"))).toContain("inputs.confirm == 'ONE_SIGNED_FUTURE_POST_V0083_MAX_2_UNITS_NO_RETRY'")})
});

it("POST actor admits only exact approved successor retaining old review identity",()=>{
 const old="9c9cddb1aaeb04934d94af2937ee158e6d991f6c",head="7".repeat(40);
 const e={...reviewer,GITHUB_SHA:head,V39_P5_POST_APPROVED_CODE_SHA:old,P6_PHASE5B_RUNTIME_EXECUTABLE_SHA:head};
 expect(()=>admitP7ActorOnlyPost(e,"reviewer")).not.toThrow();
 for(const delta of [{P6_PHASE5B_RUNTIME_EXECUTABLE_SHA:""},{P6_PHASE5B_RUNTIME_EXECUTABLE_SHA:"8".repeat(40)},{GITHUB_RUN_ATTEMPT:"2"},{AERODATABOX_API_KEY:"forbidden"}])expect(()=>admitP7ActorOnlyPost({...e,...delta},"reviewer")).toThrow("SCOPE");
});

it("T082 POST actor-only readiness coexists with existing SOURCE owner approval, no provider or new paid capability",()=>{
 for(const role of ["reviewer","publisher","storage"] as const){
  const e=role==="reviewer"?reviewer:role==="publisher"?publisher:storage;
  expect(()=>admitP7ActorOnlyPost({...e,V39_PHASE6_OWNER_APPROVED:"1"},role)).not.toThrow();
  expect(()=>admitP7ActorOnlyPost({...e,V39_PHASE6_OWNER_APPROVED:"1",V39_PHASE6_PROCESS_ARMED:"1"},role)).toThrow("SCOPE");
  expect(()=>admitP7ActorOnlyPost({...e,V39_PHASE6_OWNER_APPROVED:"1",AERODATABOX_API_KEY:"forbidden"},role)).toThrow("SCOPE");
 }
});
it("T082 exact actual workflow admission emits distinct safe hold markers and never cleans before dependencies",()=>{
 const y=readFileSync(".github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml","utf8"),p=y.slice(y.indexOf("  exact-main-post-actors-only:"),y.indexOf("  exact-signed-one-v0083-future-post:"));
 const a=p.indexOf("        run: |\n"),b=p.indexOf("      - uses: actions/setup-node",a);
 const body=p.slice(a+"        run: |\n".length,b).split("\n").map(x=>x.slice(10)).join("\n");
 const head="7".repeat(40),env={...process.env,GITHUB_SHA:head,P6_PHASE5B_RUNTIME_EXECUTABLE_SHA:head,V39_P5_POST_APPROVED_CODE_SHA:"9c9cddb1aaeb04934d94af2937ee158e6d991f6c",V39_PHASE6_PROCESS_ARMED:"0",V39_PHASE6_OWNER_APPROVED:"1",P6_POST_ACTOR_PARENT_ROUTE:"false",P6_POST_ACTOR_PREFLIGHT_CONFIRM:P7_POST_ACTOR_CONFIRM,AERODATABOX_API_KEY:"",RAPIDAPI_KEY:"",AERODATABOX_WEBHOOK_SECRET:"",DATABASE_URL:"",V39_DATABASE_RUNTIME_URL:""};
 const run=(delta:Record<string,string>)=>spawnSync("bash",["-c",'git(){ printf "%s\\n" "$GITHUB_SHA"; }\n'+body],{env:{...env,...delta},encoding:"utf8"});
 expect(run({}).status).toBe(0);
 for(const [delta,marker] of [[{V39_PHASE6_PROCESS_ARMED:"1"},"PROCESS_ARMED"],[{V39_PHASE6_OWNER_APPROVED:""},"OWNER_APPROVAL_UNKNOWN"],[{P6_POST_ACTOR_PARENT_ROUTE:"true"},"POST_PARENT_NOT_DISABLED"],[{AERODATABOX_API_KEY:"never-print-secret"},"FORBIDDEN_CREDENTIAL"],[{V39_P5_POST_APPROVED_CODE_SHA:"b".repeat(40)},"REVIEWED_CODE"]] as const){
  const v=run(delta);expect(v.status).toBe(2);expect(v.stderr).toContain("HOLD_P7_POST_ACTOR_PREFLIGHT_"+marker);expect(v.stderr).not.toContain("never-print-secret");
 }
 expect(p).toContain("steps.post_actor_dependencies.outcome == 'success'");
 expect(p).toContain("id: post_actor_dependencies");
});
it("T082 cleanup is safe on absent/empty scratch after partial startup and refuses unrelated content",()=>{
 const root=mkdtempSync(join(realpathSync(tmpdir()),"p7-actor-fixture-")),dir=join(root,"scratch");
 try{
  expect(()=>cleanupP7PostActorScratch(dir)).not.toThrow();
  mkdirSync(dir,{mode:0o700});cleanupP7PostActorScratch(dir);expect(existsSync(dir)).toBe(false);
  mkdirSync(dir,{mode:0o700});writeFileSync(join(dir,"unrelated"),"fixture",{mode:0o600});
  expect(()=>cleanupP7PostActorScratch(dir)).toThrow();expect(existsSync(join(dir,"unrelated"))).toBe(true);
 }finally{rmSync(root,{recursive:true,force:true})}
});

it("T087 isolated POST actor workflow uses local disarm while existing paid POST keeps global arm",()=>{
 const y=readFileSync(".github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml","utf8");
 const i=y.indexOf("  exact-main-post-actors-only:"),j=y.indexOf("  exact-signed-one-v0083-future-post:");
 expect(i).toBeGreaterThan(0);expect(j).toBeGreaterThan(i);
 const actor=y.slice(i,j),paid=y.slice(j);
 expect(actor).toMatch(/^ {6}V39_PHASE6_PROCESS_ARMED: '0'$/m);
 expect(actor).not.toMatch(/secrets\.V39_PHASE6_PROCESS_ARMED/);
 expect(actor).toContain("P6_POST_ACTOR_PARENT_ROUTE");
 expect(actor).toContain("test \"$P6_POST_ACTOR_PARENT_ROUTE\" = false");
 expect(actor).toContain("inputs.confirm == 'ONLY_POST_INDEPENDENT_ACTOR_PREFLIGHT_NO_PROVIDER'");
 expect(actor).not.toMatch(/secrets\.(AERODATABOX_API_KEY|RAPIDAPI_KEY|P5_V39_OTHER_REST_RESERVE_DATABASE_URL)/);
 expect(paid).toMatch(/V39_PHASE6_PROCESS_ARMED: \$\{\{ secrets\.V39_PHASE6_PROCESS_ARMED \}\}/);
 expect(paid).toContain("inputs.confirm == 'ONE_SIGNED_FUTURE_POST_V0083_MAX_2_UNITS_NO_RETRY'");
 expect(()=>admitP7ActorOnlyPost({...reviewer,V39_PHASE6_PROCESS_ARMED:"1"},"reviewer")).toThrow("SCOPE");
});
