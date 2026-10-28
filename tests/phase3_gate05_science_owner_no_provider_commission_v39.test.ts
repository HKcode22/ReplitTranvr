import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {gate05SciencePlanWindowV39} from "../scripts/v39_gate05_science_owner_commission_no_provider_v39";
const source=readFileSync("scripts/v39_gate05_science_owner_commission_no_provider_v39.ts","utf8");
describe("Gate05 owner commission: one WSSS 500-credit session, no paid provider",()=>{
  it("picks earliest 15-minute boundary >=45m and exact 60m with 20m callback grace",()=>{
    const now=Date.parse("2026-10-27T21:04:30Z");
    const plan=gate05SciencePlanWindowV39(now);
    expect(plan.start).toBe("2026-10-27T22:00:00.000Z");
    expect(plan.stop).toBe("2026-10-27T23:00:00.000Z");
    expect(plan.sessionExpires).toBe("2026-10-27T23:20:00.000Z");
  });
  it("authorizes a new session only when main/reviewer/live receiver and free account match",()=>{
    for(const token of [
      "GITHUB_MAIN_OWNER_OR_REVIEWER_PROTECTION",
      "LOCAL_HEAD_DRIFT",
      "PROTECTED_SOURCE_TREE_DIRTY",
      "PUBLISHED_SOURCE_NOT_EXACT",
      "FOREIGN_ACTIVE_PROVIDER",
      "PRODUCTION_DATABASE_HOST_IDENTITY",
      "V0065_REQUIRED_V0074_MUST_BE_NEW",
      "getBalanceEvidenceStrict()",
      "listSubscriptionsStrict()",
      'git",["show",head+":"+MIGRATION]',
      'GATE05_SAFETY_APPROVED_EARLY_STOP:"350"',
      'GATE05_SAFETY_APPROVED_LIMIT:"500"'
    ])expect(source).toContain(token);
  });
  it("creates exactly one LOGGED+UNLOGGED same-id WSSS scope and dedicated SELECT-only role",()=>{
    expect(source).toContain("phase3_gate05_science_owner_v39");
    expect(source).toContain("prepaid_probe_session_runtime");
    expect(source).toContain("phase3_gate05_science");
    expect(source).toContain("reviewed_stop_ticket_sha256");
    expect(source).toContain("CREATE ROLE");
    expect(source).toContain("GRANT SELECT ON TABLE");
    expect(source).toContain("GATE05_SAFETY_DATABASE_URL");
    expect(source).toContain("has_table_privilege");
    expect(source).toContain("commitAttempted=true");
    expect(source).toContain("COMMIT");
    expect(source).toContain("NO_BLIND_RETRY");
  });
  it("never sends Alert CREATE, FIDS GET, refill or paid provider DELETE",()=>{
    expect(source).not.toContain("createSubscription(");
    expect(source).not.toContain("createGate4SingleWithRawReceiptV39(");
    expect(source).not.toContain("deleteSubscriptionVerifiedStrict(");
    expect(source).not.toContain("refillBalance(");
    expect(source).not.toContain("fetchFidsAirport(");
    expect(source).toContain("providerMutations:0,paidFidsCalls:0");
    expect(source).toContain("independentStopLive:false");
    expect(source).toContain("scientificPass:false");
  });
  it("seals local recovery without storing an AeroDataBox API key",()=>{
    expect(source).toContain('openSync(path,"wx",0o600)');
    expect(source).toContain("fsyncSync(fd)");
    expect(source).toContain("safetyReaderUrl:restricted.toString()");
    expect(source).not.toContain("providerKey:apiKey");
    expect(source).toContain('gh(["secret","set",k,"--repo",REPO,"--env",ENV],v+');
  });
});
