/** WSSS06 actual live incident: Replit Shell had no WEBHOOK_BASE_URL.
 * The paid owner fell back to a nonpublished dev/travnr origin while the
 * separate GitHub Actions safety sidecar expected the published origin.
 * All tests are offline: no provider, SQL, GitHub Actions or webhook request.
 */
import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {
  assertGate3PinnedCallbackConfigV39,
  gate3PinnedPrepaidCallbackUrlV39,
  GATE3_PINNED_RECEIVER_ORIGIN_V39,
} from "../server/lib/disruption/gate3PinnedCallbackOrigin_v39";
import {isGate3PinnedOwnedCallbackUrlV39}
  from "../scripts/v39_gate3_independent_watchdog_v39";

const session="4fb87aca-d599-4601-9008-bc035ae3f2c9";
const secret="offline+synthetic/wss-06?#";
const origin="https://replit-tranvr--hk84164.replit.app";
const url=origin+"/api/v1/webhooks/aerodatabox/"+
  encodeURIComponent(secret)+"/prepaid/"+session;

describe("WSSS06 incident: paid CREATE and bot watchdog exact pinned callback",()=>{
  it("creates the same explicit published callback even if owner has NO WEBHOOK_BASE_URL",()=>{
    expect(GATE3_PINNED_RECEIVER_ORIGIN_V39).toBe(origin);
    expect(gate3PinnedPrepaidCallbackUrlV39(session,secret,undefined)).toBe(url);
    expect(gate3PinnedPrepaidCallbackUrlV39(session,secret,"")).toBe(url);
    expect(gate3PinnedPrepaidCallbackUrlV39(session,secret,origin)).toBe(url);
    expect(new URL(url).origin).toBe(origin);
    expect(url).not.toContain(":443");
    expect(isGate3PinnedOwnedCallbackUrlV39(url,session,secret)).toBe(true);
  });

  it.each([
    "https://travnr.com",
    "https://some-dev.replit.dev",
    "https://replit-tranvr--hk84164.replit.app.evil.com",
    "http://replit-tranvr--hk84164.replit.app",
    "https://replit-tranvr--hk84164.replit.app:444",
    "https://replit-tranvr--hk84164.replit.app:443",
    "https://replit-tranvr--hk84164.replit.app/",
  ])("rejects explicitly conflicting callback base before PREPARED: %s",(other)=>{
    expect(()=>assertGate3PinnedCallbackConfigV39(secret,other))
      .toThrow("GATE3_CONFIGURED_WEBHOOK_ORIGIN_DIFFERS_FROM_PUBLISHED_HOLD");
    expect(()=>gate3PinnedPrepaidCallbackUrlV39(session,secret,other))
      .toThrow("GATE3_CONFIGURED_WEBHOOK_ORIGIN_DIFFERS_FROM_PUBLISHED_HOLD");
  });

  it("rejects missing webhook secret, invalid session or raw wrong identity",()=>{
    expect(()=>assertGate3PinnedCallbackConfigV39(undefined,undefined))
      .toThrow("GATE3_PINNED_WEBHOOK_SECRET_MISSING_HOLD");
    expect(()=>gate3PinnedPrepaidCallbackUrlV39(session,"",origin))
      .toThrow("GATE3_PINNED_WEBHOOK_SECRET_MISSING_HOLD");
    expect(()=>gate3PinnedPrepaidCallbackUrlV39("bad-session",secret,origin))
      .toThrow();
    expect(isGate3PinnedOwnedCallbackUrlV39(
      url.replace(origin,"https://travnr.com"),session,secret)).toBe(false);
    expect(isGate3PinnedOwnedCallbackUrlV39(
      url.replace(encodeURIComponent(secret),"other"),session,secret))
      .toBe(false);
  });

  it("production owner and independent GH sidecar BOTH invoke shared exact callback builder",()=>{
    const root=process.cwd();
    const runner=readFileSync(root+"/server/lib/disruption/prepaidProbeWindow_v39.ts","utf8");
    const sidecar=readFileSync(root+"/scripts/v39_gate3_independent_watchdog_v39.ts","utf8");
    const operator=readFileSync(root+"/scripts/v39_gate3_one_wsss_operator_v39.ts","utf8");
    expect(runner).toContain('input.ownerKind==="phase3_credit_canary"');
    expect(runner).toContain("gate3PinnedPrepaidCallbackUrlV39(");
    expect(sidecar).toContain("const callback=gate3PinnedPrepaidCallbackUrlV39(");
    expect(sidecar).not.toContain("prepaidProbeWebhookUrlV39(defaultWebhookUrl()");
    expect(operator).toContain("assertGate3PinnedCallbackConfigV39(");
    expect(operator.indexOf("assertGate3PinnedCallbackConfigV39("))
      .toBeLessThan(operator.indexOf("prepareGate3AfterLiveReadOnlyEvidenceV39(v39Pool,input)"));
    // Historical Phase2 owner continues to use its prior callback policy.
    expect(runner).toContain("prepaidProbeWebhookUrlV39(defaultWebhookUrl(),session.sessionId)");
  });
});
