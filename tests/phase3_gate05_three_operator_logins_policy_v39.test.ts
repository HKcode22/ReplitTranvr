import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {planGate05ThreeLoginIssueV39} from
  "../scripts/v39_gate05_issue_three_operator_logins_once_v39";

const head="a".repeat(40);
const start="2026-10-22T03:00:00.000Z";
const clock=Date.parse(start)-3*3600000;
const confirm="ISSUE_G05_THREE_RESTRICTED_LOGINS_NO_PROVIDER";
const code=readFileSync(
  "scripts/v39_gate05_issue_three_operator_logins_once_v39.ts","utf8"
);

describe("Gate05 three-login one-session issuance safety policy",()=>{
  it("allows a 3h-ahead explicitly approved source and caps local roles",()=>{
    const p=planGate05ThreeLoginIssueV39(clock,start,head,confirm);
    expect(p.roles).toEqual(["commission","activate","dispatch"]);
    expect(p.providerRequests).toBe(0);
    expect(p.scopeMutations).toBe(0);
    expect(p.automaticActivation).toBe(false);
    expect(Date.parse(p.expiresUtc)).toBe(clock+6*3600000);
  });
  it("rejects unreviewed time, wrong SHA, early/late window and confirmation",()=>{
    for(const [now,utc,h,c] of [
      [clock,start,"bad",confirm],
      [clock,start,head,"approve"],
      [clock,start.replace("03:00","03:01"),head,confirm],
      [Date.parse(start)-3600000,start,head,confirm],
      [Date.parse(start)-6*3600000,start,head,confirm],
      [clock,"2026-10-22T03:15:01.000Z",head,confirm]
    ] as const)expect(()=>planGate05ThreeLoginIssueV39(
      now,utc,h,c
    )).toThrow("GATE05_OPERATOR_ISSUE_HOLD_");
  });
  it("has no external paid provider, scope write or GitHub secret mutation path",()=>{
    expect(code).not.toContain("aerodataboxLimiter_v3");
    expect(code).not.toContain("fetchFidsAirport(");
    expect(code).not.toContain("INSERT INTO clean.gate05_fids_commission_permit");
    expect(code).not.toContain("activate_gate05_prepared_scope_v39(");
    expect(code).not.toContain("gh secret set");
    expect(code).not.toContain("gh workflow run");
    expect(code).toContain('await admin.query("COMMIT")');
    expect(code).toContain('writeFileSync(output,JSON.stringify(saved)');
    expect(code).toContain('flag:"wx",mode:0o600');
    expect(code).toContain("AFTER_ROLE_COMMIT");
    expect(code).toContain("noBlindRetry:true");
  });
  it("enforces exclusive functions and random distinct actual password login",()=>{
    expect(code).toContain("randomBytes(32).toString");
    expect(code).toContain("LOGIN NOINHERIT NOSUPERUSER");
    expect(code).toContain("SET TRUE");
    expect(code).toContain("has_function_privilege");
    expect(code).toContain('await client.connect()');
    expect(code).toContain('await client.query("BEGIN READ ONLY")');
    expect(code).toContain("NOLOGIN_GROUP_");
    expect(code).toContain("OPEN_SCOPE_OR_PERMIT");
    expect(code).toContain("PRIVATE_DIRECTORY_NOT_TEMP_0700");
  });
});