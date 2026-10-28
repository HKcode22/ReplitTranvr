import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {validateGate05ScienceStopPinsV39,
  type Gate05StopPinsV39
} from "../scripts/v39_gate05_science_exact_owned_actions_stop_v39";
const source=readFileSync("scripts/v39_gate05_science_exact_owned_actions_stop_v39.ts","utf8");
const yml=readFileSync(".github/workflows/phase3-gate05-science-exact-owned-stop.yml","utf8");
function valid(){
  const now=Date.now();
  const start=new Date(now+180000).toISOString();
  const stop=new Date(now+180000+3600000).toISOString();
  const p:Gate05StopPinsV39={
    runner:"a".repeat(40),receiver:"b".repeat(40),
    scope:"b2536cba-330e-4a64-8b3c-165cb55fce22",
    authorization:"c".repeat(64),ticket:"d".repeat(64),
    start,stop,startingCredits:1981
  };
  const env:NodeJS.ProcessEnv={
    GITHUB_ACTIONS:"true",GITHUB_EVENT_NAME:"workflow_dispatch",
    GITHUB_REF:"refs/heads/main",GITHUB_SHA:p.runner,
    GATE05_SAFETY_ENV_NAME:"gate05-safety",
    GATE05_SAFETY_APPROVED_RUNNER_SHA:p.runner,
    GATE05_SAFETY_APPROVED_RECEIVER_SOURCE:p.receiver,
    GATE05_SAFETY_APPROVED_SCOPE:p.scope,
    GATE05_SAFETY_APPROVED_AUTH_SHA256:p.authorization,
    GATE05_SAFETY_APPROVED_STOP_TICKET_SHA256:p.ticket,
    GATE05_SAFETY_APPROVED_START_UTC:start,
    GATE05_SAFETY_APPROVED_STOP_UTC:stop,
    GATE05_SAFETY_APPROVED_STARTING_CREDITS:"1981",
    GATE05_SAFETY_APPROVED_LIMIT:"500",
    GATE05_SAFETY_APPROVED_EARLY_STOP:"350",
    GATE05_SAFETY_APPROVED_REST_LIMIT:"12",
    GATE05_SCIENCE_SAFETY_DATABASE_URL:
      "postgresql://gate05_science_safety_reader_ci012345:pw@db.example.com/neondb?sslmode=verify-full",
    GATE05_SCIENCE_SAFETY_EXPECTED_DB_HOST:"db.example.com",
    AERODATABOX_API_KEY:"synthetic-not-a-provider-key"
  };
  return {p,env,now};
}
describe("Gate05 independent 60m exact-owned science DELETE worker",()=>{
  it("accepts only a source-pinned protected zero-CREATE environment",()=>{
    const {p,env,now}=valid();
    expect(validateGate05ScienceStopPinsV39(p,env,now)).toMatchObject({
      threshold:350,hardProviderCap:false
    });
  });
  it("rejects missing reviewer pins, unexpected production DB URL and changed runner",()=>{
    const {p,env,now}=valid();
    delete env.GATE05_SAFETY_APPROVED_SCOPE;
    expect(()=>validateGate05ScienceStopPinsV39(p,env,now)).toThrow();
    env.GATE05_SAFETY_APPROVED_SCOPE=p.scope;
    env.DATABASE_URL="postgresql://admin:pw@db.example.com/neondb";
    expect(()=>validateGate05ScienceStopPinsV39(p,env,now)).toThrow();
    delete env.DATABASE_URL;
    env.GITHUB_SHA="f".repeat(40);
    expect(()=>validateGate05ScienceStopPinsV39(p,env,now)).toThrow();
  });
  it("rejects a dishonest 40-minute or expired scientific session",()=>{
    const {p,env,now}=valid();
    p.stop=new Date(Date.parse(p.start)+40*60000).toISOString();
    env.GATE05_SAFETY_APPROVED_STOP_UTC=p.stop;
    expect(()=>validateGate05ScienceStopPinsV39(p,env,now)).toThrow();
    p.stop=new Date(Date.parse(p.start)+3600000).toISOString();
    env.GATE05_SAFETY_APPROVED_STOP_UTC=p.stop;
    expect(()=>validateGate05ScienceStopPinsV39(p,env,Date.parse(p.start)+120000)).toThrow();
  });
  it("refuses over-limit credit authority, shared broad DB login or nonGitHub invocation",()=>{
    const {p,env,now}=valid();p.startingCredits=499;
    env.GATE05_SAFETY_APPROVED_STARTING_CREDITS="499";
    expect(()=>validateGate05ScienceStopPinsV39(p,env,now)).toThrow();
    p.startingCredits=1981;env.GATE05_SAFETY_APPROVED_STARTING_CREDITS="1981";
    env.GATE05_SCIENCE_SAFETY_DATABASE_URL=
      "postgresql://neondb_owner:pw@db.example.com/neondb?sslmode=verify-full";
    expect(()=>validateGate05ScienceStopPinsV39(p,env,now)).toThrow();
    env.GATE05_SCIENCE_SAFETY_DATABASE_URL=
      "postgresql://gate05_science_safety_reader_ci012345:pw@db.example.com/neondb?sslmode=verify-full";
    env.GITHUB_ACTIONS="false";
    expect(()=>validateGate05ScienceStopPinsV39(p,env,now)).toThrow();
  });
  it("does not contain subscription CREATE/refill and deletes only an exact LOGGED ID",()=>{
    expect(source).toContain("deleteSubscriptionVerifiedStrict(knownExactId");
    expect(source).toContain("authorization_sha256!==p.authorization");
    expect(source).toContain("reviewed_stop_ticket_sha256!==p.ticket");
    expect(source).toContain('FROM clean.phase3_gate05_science_owner_v39 WHERE session_id=$1::uuid');
    expect(source).not.toContain("createGate4SingleWithRawReceiptV39");
    expect(source).not.toContain("createSubscription(");
    expect(source).not.toContain("refillBalance(");
    expect(source).not.toContain("fetchFidsAirport(");
  });
  it("is manual protected GitHub Actions only, no automatic schedule and no CREATE secrets",()=>{
    expect(yml).toContain("workflow_dispatch:");
    expect(yml).toContain("environment: gate05-safety");
    expect(yml).toContain("cancel-in-progress: false");
    expect(yml).toContain("timeout-minutes: 165");
    expect(yml).not.toContain("schedule:");
    expect(yml).not.toContain("push:");
    expect(yml).not.toContain("RUN_CREATE");
    expect(yml).toContain("GATE05_SCIENCE_SAFETY_DATABASE_URL:");
    expect(yml).toContain("AERODATABOX_API_KEY:");
  });
});
