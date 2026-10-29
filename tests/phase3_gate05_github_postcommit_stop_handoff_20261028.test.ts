import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {planGate05ProspectiveGridV39} from
  "../server/lib/disruption/gate05ProspectiveAcquisitionGrid_v39";

const commission=readFileSync(
  "scripts/v39_gate05_newscope_commission_github_no_provider_20261028.mjs","utf8");
const dispatch=readFileSync(
  "scripts/v39_gate05_dispatch_newscope_independent_stop_20261028.mjs","utf8");
const workflow=readFileSync(
  ".github/workflows/phase3-gate05-fresh-science-owner-no-provider.yml","utf8");
const stop=readFileSync(
  ".github/workflows/phase3-gate05-science-exact-owned-stop-retry5.yml","utf8");

describe("Gate05 single manual commission -> independent retry6 STOP dispatch",()=>{
  it("publishes only verified post-COMMIT, nonsecret output to GitHub",()=>{
    expect(commission).toContain('stage="READ_AFTER_COMMIT"');
    expect(commission).toContain('if(out?.state!=="PREPARED"');
    expect(commission).toContain('stage="PUBLISH_NON_SECRET_POSTCOMMIT_STOP_HANDOFF"');
    expect(commission).toContain("appendFileSync(outputFile");
    expect(commission).toContain("Object.entries(handoff)");
    expect(commission.indexOf('stage="PUBLISH_NON_SECRET_POSTCOMMIT_STOP_HANDOFF"'))
      .toBeGreaterThan(commission.indexOf('stage="READ_AFTER_COMMIT"'));
    for(const field of [
      "scope_id","runner_sha","receiver_sha","authorization_sha256",
      "stop_ticket_sha256","start_utc","stop_utc","starting_credits"
    ]){
      expect(commission).toContain(field+":");
      expect(workflow).toContain("steps.commission.outputs."+field);
      expect(workflow).toContain("needs.one-new-owner-and-protected-stop.outputs."+field);
    }
    expect(commission).not.toContain("GITHUB_OUTPUT_REPLAY_ALLOWED");
  });
  it("dispatches STOP only after successful protected commission",()=>{
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).not.toMatch(/\n {2}(?:push|schedule):|cron:/);
    expect(workflow).toContain("id: commission");
    expect(workflow).toContain("dispatch-independent-retry6-stop-no-provider:");
    expect(workflow).toContain("needs: one-new-owner-and-protected-stop");
    expect(workflow).toContain("needs.one-new-owner-and-protected-stop.result == 'success'");
    expect(workflow).toContain("environment: phase2g-paid");
    expect(workflow).toContain("scripts/v39_gate05_dispatch_newscope_independent_stop_20261028.mjs");
    expect(workflow).toContain('AERODATABOX_API_KEY: ""');
    expect(workflow).toContain('RAPIDAPI_KEY: ""');
    expect(workflow).toContain('GATE05_PROVIDER_CREATE_ALLOWED: ""');
    expect(workflow).toContain("independent exact worker issued authenticated LIVE_STOP_WATCH_ARMED_NO_PROVIDER_CREATE");
    expect(workflow).not.toContain("phase3-gate05-github-automated-retry5.yml");
  });
  it("pins exact STOP scope to the committed LOGGED owner in a read-only transaction",()=>{
    expect(dispatch).toContain("phase3-gate05-science-exact-owned-stop-retry5.yml");
    expect(dispatch).toContain("default_transaction_read_only=on");
    expect(dispatch).toContain("BEGIN TRANSACTION READ ONLY");
    expect(dispatch).toContain('await db.query("ROLLBACK")');
    expect(dispatch).toContain("POSTCOMMIT_NEW_SCOPE_NOT_EXACT");
    expect(dispatch).toContain('state!=="PREPARED"');
    expect(dispatch).toContain("GATE05_STOP_SCOPE");
    expect(dispatch).toContain("GATE05_STOP_TICKET");
    expect(dispatch).toContain("MAIN_MOVED_NO_DISPATCH");
    expect(dispatch).toContain("PREVIOUS_IDENTICAL_STOP_DISPATCH_NO_RETRY");
    expect(dispatch).toContain("doNotRetryAfterDispatchUncertainty:dispatchAttempted");
    expect(dispatch).toContain("independentStopArmed:false");
    expect(dispatch).toContain("paidCreateAuthorized:false");
    expect(dispatch).toContain("providerRequests:0,databaseWrites:0");
    expect(dispatch).not.toMatch(/\b(INSERT INTO|UPDATE clean|DELETE FROM|CREATE ROLE|CREATE TABLE)\b/i);
    expect(dispatch).not.toContain("createGate4SingleWithRawReceipt");
    expect(dispatch).not.toContain("refillBalance");
  });
  it("continues using original protected retry6 STOP and not an unreviewed replacement",()=>{
    expect(stop).toContain("environment: gate05-safety");
    expect(stop).toContain("scripts/v39_gate05_science_exact_owned_actions_stop_retry6_v39.ts");
    expect(stop).toContain("WATCH_GATE05_SCIENCE_500_STOP_NO_CREATE");
    expect(stop).toContain("GATE05_SCIENCE_SAFETY_DATABASE_URL");
    expect(stop).not.toContain("createGate4SingleWithRawReceipt");
    expect(dispatch).toContain('const confirm="WATCH_GATE05_SCIENCE_500_STOP_NO_CREATE"');
  });
  it("does not confuse an imminent Alert observation window with prospective T−24h",()=>{
    const args={
      airportIcao:"WSSS",planningClockUtc:"2026-10-28T00:00:00.000Z",
      horizonSet:["T-24h","T-6h","T-90m"] as const,
      populationAcquisitionGuardMinutes:10,
      populationRefreshCadenceMinutes:30,
      populationMaxStalenessMinutes:60,
      proposedMaximumFidsGets:6,assumedApiUnitsPerGet:2,
      proposedMaximumApiUnits:12,
      selectedNativeTMilestoneSourceVerified:true
    };
    const near=planGate05ProspectiveGridV39({
      ...args,serviceWindowStartUtc:"2026-10-28T01:00:00.000Z",
      serviceWindowEndUtc:"2026-10-28T02:00:00.000Z"
    });
    expect(near.expectedFidsGets).toBe(6);
    expect(near.expectedApiUnits).toBe(12);
    expect(near.status).toBe("BLOCKED_GRID_HAS_ALREADY_STARTED");
    expect(near.ownerPaidAuthorizationGranted).toBe(false);
    const future=planGate05ProspectiveGridV39({
      ...args,serviceWindowStartUtc:"2026-10-29T03:00:00.000Z",
      serviceWindowEndUtc:"2026-10-29T04:00:00.000Z"
    });
    expect(future.status).toBe("ELIGIBLE_FOR_OWNER_REVIEW");
    const unknown=planGate05ProspectiveGridV39({
      ...args,selectedNativeTMilestoneSourceVerified:false,
      serviceWindowStartUtc:"2026-10-29T03:00:00.000Z",
      serviceWindowEndUtc:"2026-10-29T04:00:00.000Z"
    });
    expect(unknown.status).toBe("BLOCKED_UNVERIFIED_NATIVE_T");
    expect(unknown.ownerPaidAuthorizationGranted).toBe(false);
  });
  it("parses both executable operators offline without network or billing",()=>{
    for(const path of [
      "scripts/v39_gate05_newscope_commission_github_no_provider_20261028.mjs",
      "scripts/v39_gate05_dispatch_newscope_independent_stop_20261028.mjs"
    ]){
      const r=spawnSync(process.execPath,["--check",path],
        {timeout:10000,encoding:"utf8"});
      expect(r.error).toBeUndefined();
      expect(r.status).toBe(0);
    }
  });
});
