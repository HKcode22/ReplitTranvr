import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolveExperimentalRetries } from "../server/lib/disruption/aerodataboxLimiter_v3";

/**
 * Frozen Phase2G Stage-1 delivery-retry guard.
 *
 * Replit Support ticket #564568 confirmed Replit does not replay a webhook
 * that expires during Autoscale startup. AeroDataBox's credit-based
 * Flight Alert API likewise has no provider retries by default.
 *
 * Do not silently enable retries to mask a bad callback receiver:
 * retries are billable, can yield duplicate deliveries and change the
 * frozen exact-match reconciliation contract. Any change must be a
 * new, prospective reviewed amendment.
 *
 * Pure tests. No provider access, DB pool, or real subscriptions.
 */
describe("YSSY Phase2G explicitly zero billable delivery retries", () => {
  it("defaults missing retries to zero, never an unstated two retries", () => {
    expect(resolveExperimentalRetries(undefined)).toBe(0);
  });

  it("allows the protocol-frozen explicit zero retry configuration", () => {
    expect(resolveExperimentalRetries(0)).toBe(0);
  });

  it.each([1, 2, -1, 3])(
    "refuses changing maxDeliveryRetries to %s without new authorization",
    (attempts) => {
      expect(() => resolveExperimentalRetries(attempts)).toThrow(
        /experimental maxDeliveryRetries must be 0/,
      );
    },
  );

  it("still explicitly binds maxDeliveryRetries=0 in real Stage-1 subscription creation", () => {
    const src=readFileSync("server/lib/disruption/prepaidProbeWindow_v39.ts", "utf8");
    expect(src).toMatch(/createSubscription\(\s*"FlightByAirportIcao"\s*,\s*icao\s*,\s*\{[\s\S]*?maxDeliveryRetries:\s*0\s*,?/);
  });
});
