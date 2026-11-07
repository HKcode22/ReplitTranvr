import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {admitP5GitHubOneQueryRelease,
 type P5GitHubOneQueryReleaseEnvelope}
 from "../server/lib/disruption/phase5GitHubOneQueryReleaseAdmission_v39";
import {waitForP5ScheduledPhysicalDispatch}
 from "../server/lib/disruption/phase5V0080GitHubPrearm_v39";
const H=(c:string)=>c.repeat(64);
function fixture(){
 const code="a".repeat(40);
 const payload={
  schema:"v39.phase5.github-source-one-query-template.v2",
  manifestSha256:H("1"),queryDigestSha256:H("2"),
  plan:{
   reviewedReleaseSha256:H("3"),
   reviewedProviderRightsSha256:H("4"),
   expectedEarlyDrawSha256:H("5"),
   independentlyApprovedSourceAndRetention:true,
   githubOnlyOwnerApproved:true,
   acquisition:{
    runDayIndex:1,slot:"HUB",horizon:"T-24h",
    providerQueryDirection:"Departure",
    apiUnitsPerAttempt:2,maxAttempts:1,
   },
  },
 } as P5GitHubOneQueryReleaseEnvelope;
 const bytes=Buffer.from(JSON.stringify(payload));
 const env:NodeJS.ProcessEnv={
  GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",
  GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"workflow_dispatch",
  GITHUB_RUN_ATTEMPT:"1",GITHUB_SHA:code,
  GITHUB_RUN_ID:"12345678912",V39_P5_SOURCE_OWNER_APPROVED:"1",
  V39_PHASE5_FREEZE_SIGNED:"1",V39_PHASE5_SOURCE_RIGHTS_APPROVED:"1",
  V39_P5_SOURCE_DB_ROLE_REVIEWED:"1",V39_P5_REST_UNIT_PRICE_APPROVED:"2",
  V39_P5_APPROVED_CODE_SHA:code,
  V39_P5_SIGNED_QUERY_JSON_SHA256:createHash("sha256").update(bytes).digest("hex"),
  V39_P5_MANIFEST_SHA256:payload.manifestSha256,
  V39_P5_QUERY_DIGEST:payload.queryDigestSha256,
  V39_P5_RELEASE_SHA256:payload.plan.reviewedReleaseSha256,
  V39_P5_RIGHTS_SHA256:payload.plan.reviewedProviderRightsSha256,
  V39_P5_SOURCE_DATABASE_URL:"postgresql://p5_scoped:p4ss@localhost:5432/v39_ci",
  V39_DATABASE_RUNTIME_URL:"postgresql://app_role:another@localhost:5432/v39_ci",
  AERODATABOX_API_KEY:"ci-placeholder-never-used",
 };
 return {env,payload,bytes};
}
describe("Phase5 GitHub one-query strict source-admission, zero provider",()=>{
 it("admits internally consistent synthetic context but never claims Phase6/real PRE",()=>{
  const {env,payload,bytes}=fixture();
  const out=admitP5GitHubOneQueryRelease(env,bytes,payload);
  expect(out.approvedOnePhysicalAttempt).toBe(true);
  expect(out.githubRunId).toBe(env.GITHUB_RUN_ID);
  expect(out.codeSha).toBe(env.GITHUB_SHA);
  expect(out.actualFlightPreCertified).toBe(false);
  expect(out.phase6Go).toBe(false);
 });
 it("refuses running from local Replit shell or any non-main branch",()=>{
  const f=fixture();
  f.env.GITHUB_ACTIONS="false";
  expect(()=>admitP5GitHubOneQueryRelease(f.env,f.bytes,f.payload))
   .toThrow("GITHUB_RELEASE_FLAGS_OR_RUN_ID");
  f.env.GITHUB_ACTIONS="true";
  f.env.GITHUB_REF="refs/heads/fork";
  expect(()=>admitP5GitHubOneQueryRelease(f.env,f.bytes,f.payload))
   .toThrow("GITHUB_RELEASE_FLAGS_OR_RUN_ID");
 });
 it("refuses PR CI, re-runs and mismatched GitHub job IDs",()=>{
  const f=fixture();
  f.env.GITHUB_EVENT_NAME="pull_request";
  expect(()=>admitP5GitHubOneQueryRelease(f.env,f.bytes,f.payload))
   .toThrow("GITHUB_RELEASE_FLAGS_OR_RUN_ID");
  f.env.GITHUB_EVENT_NAME="schedule";
  f.env.GITHUB_RUN_ATTEMPT="2";
  expect(()=>admitP5GitHubOneQueryRelease(f.env,f.bytes,f.payload))
   .toThrow("GITHUB_RELEASE_FLAGS_OR_RUN_ID");
  f.env.GITHUB_RUN_ATTEMPT="1";
  // GitHub assigns the ID AFTER template freeze. A valid new ID must
  // pass this pure admission and be verified against real V0080 prearm later.
  f.env.GITHUB_RUN_ID="12345678999";
  expect(admitP5GitHubOneQueryRelease(f.env,f.bytes,f.payload).githubRunId)
   .toBe("12345678999");
  f.env.GITHUB_RUN_ID="non-numeric";
  expect(()=>admitP5GitHubOneQueryRelease(f.env,f.bytes,f.payload))
   .toThrow("GITHUB_RELEASE_FLAGS_OR_RUN_ID");
 });
 it("refuses embedding future run ID or code SHA in a signed immutable template",()=>{
  const f=fixture();
  const expanded={...f.payload,githubRunId:"12345678999"} as any;
  const bytes=Buffer.from(JSON.stringify(expanded));
  f.env.V39_P5_SIGNED_QUERY_JSON_SHA256=createHash("sha256").update(bytes).digest("hex");
  expect(()=>admitP5GitHubOneQueryRelease(f.env,bytes,expanded))
   .toThrow("RUNTIME_GITHUB_ID_NOT_ALLOWED_IN_TEMPLATE");
  const g=fixture();
  const withCode={...g.payload,approvedCodeSha:g.env.GITHUB_SHA} as any;
  const raw=Buffer.from(JSON.stringify(withCode));
  g.env.V39_P5_SIGNED_QUERY_JSON_SHA256=createHash("sha256").update(raw).digest("hex");
  expect(()=>admitP5GitHubOneQueryRelease(g.env,raw,withCode))
   .toThrow("RUNTIME_GITHUB_ID_NOT_ALLOWED_IN_TEMPLATE");
 });

 it("refuses changed source JSON or source code SHA even when flags are set",()=>{
  const f=fixture();
  f.bytes=Buffer.concat([f.bytes,Buffer.from("x")]);
  expect(()=>admitP5GitHubOneQueryRelease(f.env,f.bytes,f.payload))
   .toThrow("EXACT_QUERY_JSON_HASH_UNVERIFIED");
  const g=fixture();
  g.env.GITHUB_SHA="b".repeat(40);
  expect(()=>admitP5GitHubOneQueryRelease(g.env,g.bytes,g.payload))
   .toThrow("CODE_COMMIT_NOT_APPROVED");
 });
 it("refuses absence of actual signed rights or unapproved REST price",()=>{
  const f=fixture();
  f.env.V39_PHASE5_SOURCE_RIGHTS_APPROVED="0";
  expect(()=>admitP5GitHubOneQueryRelease(f.env,f.bytes,f.payload))
   .toThrow("GITHUB_RELEASE_FLAGS_OR_RUN_ID");
  f.env.V39_PHASE5_SOURCE_RIGHTS_APPROVED="1";
  f.env.V39_P5_REST_UNIT_PRICE_APPROVED="3";
  expect(()=>admitP5GitHubOneQueryRelease(f.env,f.bytes,f.payload))
   .toThrow("GITHUB_RELEASE_FLAGS_OR_RUN_ID");
 });
 it("refuses silently reusing the ordinary application PostgreSQL role",()=>{
  const f=fixture();
  f.env.V39_DATABASE_RUNTIME_URL=f.env.V39_P5_SOURCE_DATABASE_URL;
  expect(()=>admitP5GitHubOneQueryRelease(f.env,f.bytes,f.payload))
   .toThrow("APPLICATION_RUNTIME_DB_ROLE_NOT_ISOLATED");
 });
 it("refuses changing airport horizon/attempt pricing inside a signed fixture",()=>{
  const f=fixture();
  f.payload.plan.acquisition.maxAttempts=3;
  const newBytes=Buffer.from(JSON.stringify(f.payload));
  f.env.V39_P5_SIGNED_QUERY_JSON_SHA256=
    createHash("sha256").update(newBytes).digest("hex");
  expect(()=>admitP5GitHubOneQueryRelease(f.env,newBytes,f.payload))
   .toThrow("UNREVIEWED_SOURCE_ROLE_PRICE_OR_ATTEMPTS");
 });
});


describe("V0080 signed DB-clock prospectivity after prearm, no real timers",()=>{
 const planned="2026-11-10T15:00:00.000Z";
 const cutoff="2026-11-10T15:10:00.000Z";
 it("waits before the physical GET and crosses planned timestamp only on DB clock",async()=>{
  let clock=Date.parse(planned)-12_000,delays=0;
  await waitForP5ScheduledPhysicalDispatch(planned,cutoff,60,
   async()=>new Date(clock),
   async ms=>{delays++;clock+=ms;});
  expect(delays).toBeGreaterThan(0);
  expect(clock).toBe(Date.parse(planned));
 });
 it("refuses late GitHub run without any paid attempt",async()=>{
  await expect(waitForP5ScheduledPhysicalDispatch(planned,cutoff,60,
   async()=>new Date(Date.parse(planned)+16*60_000),
   async()=>{})).rejects.toThrow("MISSED_PROSPECTIVE_DISPATCH");
 });
 it("refuses flight cutoff too close for conservative response+commit bound",async()=>{
  await expect(waitForP5ScheduledPhysicalDispatch(planned,cutoff,60,
   async()=>new Date(Date.parse(cutoff)-10_000),
   async()=>{})).rejects.toThrow("MISSED_PROSPECTIVE_DISPATCH");
 });
 it("does not run a two-plus-hour background hold for an incorrectly scheduled owner",async()=>{
  await expect(waitForP5ScheduledPhysicalDispatch(planned,cutoff,60,
   async()=>new Date(Date.parse(planned)-2*3600_000-1000),
   async()=>{throw Error("SHOULD_NOT_SLEEP");})).rejects.toThrow("GITHUB_JOB_STARTED_TOO_EARLY");
 });
});
