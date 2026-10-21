/** Policies only. No production PostgreSQL, GH secret writes or provider. */
import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {planGate05PreparedCommissionV39} from
  "../scripts/v39_gate05_owner_commission_exact_scope_once_v39";
import {checkGate05ActivationWindowV39} from
  "../scripts/v39_gate05_activate_after_safety_once_v39";

const start="2026-10-22T03:00:00.000Z";
const expiry="2026-10-22T03:40:00.000Z";
const credExpiry="2026-10-22T05:00:00.000Z";
const expected="a".repeat(40);
const digest="b".repeat(64);
const signer="c".repeat(64);
const confirmPrep="OWNER_APPROVED_G05_PREPARE_ONLY_NO_PROVIDER";
const confirmActive="OWNER_APPROVED_G05_ACTIVATE_AFTER_ARMED_SAFETY_NO_PROVIDER";

describe("Gate05 finite signed PREPARED-only and independent ACTIVE policy",()=>{
  it("permits reviewed PREPARED plan but never paid GO",()=>{
    const p=planGate05PreparedCommissionV39({
      expectedHead:expected,authSha256:digest,
      signerSha256:signer,startUtc:start,expiryUtc:expiry,
      credentialExpiryUtc:credExpiry,
      now:Date.parse(start)-60*60000,confirmation:confirmPrep
    });
    expect(p.scopeState).toBe("PREPARED");
    expect(p.activationAllowed).toBe(false);
    expect(p.providerRequests).toBe(0);
  });
  it("rejects incomplete owner approval, invalid fingerprint and timing",()=>{
    const base={
      expectedHead:expected,authSha256:digest,signerSha256:signer,
      startUtc:start,expiryUtc:expiry,
      credentialExpiryUtc:credExpiry,now:Date.parse(start)-60*60000,
      confirmation:confirmPrep
    };
    for(const change of [
      {expectedHead:"bad"},{authSha256:"bad"},{signerSha256:"bad"},
      {confirmation:"yes"},
      {now:Date.parse(start)-10*60000},
      {now:Date.parse(start)-6*3600000},
      {expiryUtc:"2026-10-22T04:00:00.000Z"},
      {credentialExpiryUtc:"2026-10-22T03:45:00.000Z"}
    ])expect(()=>planGate05PreparedCommissionV39({
      ...base,...change
    })).toThrow("GATE05_PREPARE_HOLD_");
  });
  it("allows activation only inside signed time with exact confirmation",()=>{
    const p=checkGate05ActivationWindowV39(
      Date.parse(start)+1000,start,expiry,confirmActive
    );
    expect(p.activateEligible).toBe(true);
    expect(p.paidGo).toBe(false);
    for(const [now,c] of [
      [Date.parse(start)-1,confirmActive],
      [Date.parse(expiry),confirmActive],
      [Date.parse(expiry)-14000,confirmActive],
      [Date.parse(start)+1000,"approved"]
    ] as const)expect(()=>checkGate05ActivationWindowV39(
      now,start,expiry,c
    )).toThrow("GATE05_ACTIVATE_HOLD_");
  });
  it("no FIDS GET/import, signed permit via admin and SECURITY DEFINER commissioning only",()=>{
    const source=readFileSync(
      "scripts/v39_gate05_owner_commission_exact_scope_once_v39.ts","utf8"
    );
    expect(source).toContain("INSERT INTO clean.gate05_fids_commission_permit_v39");
    expect(source).toContain("clean.prepare_gate05_permitted_scope_v39");
    expect(source).toContain("SET LOCAL ROLE gate05_fids_commission_v39");
    expect(source).toContain("PERMIT_COMMITTED_NOT_YET_PREPARED");
    expect(source).toContain("EXACT_PREPARED_NO_PAID_PROVIDER");
    expect(source).toContain("GATE05_SIGNED_BUNDLE_B64");
    expect(source).toContain("GATE05_INDEPENDENT_PINS_B64");
    expect(source).not.toContain("fetchFidsAirport(");
    expect(source).not.toContain("getBalanceEvidenceStrict(");
    expect(source).not.toContain("activate_gate05_prepared_scope_v39(");
    expect(source).toContain("noBlindRetry:true");
  });
  it("activation requires current in-progress exact safety identity",()=>{
    const source=readFileSync(
      "scripts/v39_gate05_activate_after_safety_once_v39.ts","utf8"
    );
    expect(source).toContain("assertGate05SafetyJobLiveV39");
    expect(source).toContain("assertLive();");
    expect(source).toContain("SET LOCAL ROLE gate05_fids_activate_v39");
    expect(source).toContain("ACTIVE_VERIFIED_NO_PROVIDER");
    expect(source).toContain("BEFORE_ACTIVE_COMMIT");
    expect(source).toContain("AFTER_ACTIVE_COMMIT");
    expect(source).not.toContain("fetchFidsAirport(");
    expect(source).not.toContain("gh workflow run");
    expect(source).toContain("noBlindRetry:true");
  });
});