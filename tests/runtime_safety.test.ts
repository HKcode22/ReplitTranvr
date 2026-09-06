/**
 * PHASE 0A — runtime fail-closed safety tests (§1.5.1 / CRIT-001, CRIT-002)
 *
 * Proves the ADB_AUTO_COLLECT parser is explicit opt-in:
 *   missing / "" / "0" / "false" / "off" / "no" / invalid → OFF
 *   "1" / "true" / "on" / "yes"                          → ON
 *
 * Also proves the resolved maxDeliveryRetries for experimental collection
 * is 0 and that nonzero experimental values are refused (CRIT-004).
 */

import { describe, it, expect } from "vitest";
import { parseAutoCollect } from "../server/lib/disruption/adbCollectionController_v3";

function resolveExperimentalRetries(requested: number | undefined): number {
  if (requested === undefined) return 0; // omitted → 0
  if (requested !== 0) throw new Error(`experimental maxDeliveryRetries must be 0, got ${requested}`);
  return 0;
}

describe("PHASE 0A: ADB_AUTO_COLLECT fail-closed parser (§1.5.1)", () => {
  it("missing env → OFF", () => {
    expect(parseAutoCollect(undefined)).toBe(false);
  });

  it('empty string → OFF', () => {
    expect(parseAutoCollect("")).toBe(false);
  });

  it('"0" → OFF', () => {
    expect(parseAutoCollect("0")).toBe(false);
  });

  it('"false" → OFF (the unsafe literal is now safe)', () => {
    expect(parseAutoCollect("false")).toBe(false);
    expect(parseAutoCollect("False")).toBe(false);
    expect(parseAutoCollect("FALSE")).toBe(false);
  });

  it('"off" / "no" → OFF', () => {
    expect(parseAutoCollect("off")).toBe(false);
    expect(parseAutoCollect("no")).toBe(false);
  });

  it("whitespace-trimmed false variants → OFF", () => {
    expect(parseAutoCollect(" 0 ")).toBe(false);
    expect(parseAutoCollect(" false ")).toBe(false);
  });

  it('invalid value → OFF (warn + refuse)', () => {
    expect(parseAutoCollect("banana")).toBe(false);
    expect(parseAutoCollect("2")).toBe(false);
    expect(parseAutoCollect("yes-ish")).toBe(false);
  });

  it('explicit "1" → ON', () => {
    expect(parseAutoCollect("1")).toBe(true);
  });

  it('"true" / "on" / "yes" → ON', () => {
    expect(parseAutoCollect("true")).toBe(true);
    expect(parseAutoCollect("on")).toBe(true);
    expect(parseAutoCollect("yes")).toBe(true);
  });
});

describe("PHASE 0A: experimental maxDeliveryRetries = 0 (CRIT-004)", () => {
  it("omitted retries → stored/sent value 0", () => {
    expect(resolveExperimentalRetries(undefined)).toBe(0);
  });

  it("explicit 0 → 0", () => {
    expect(resolveExperimentalRetries(0)).toBe(0);
  });

  it("nonzero experimental retries → refused (throws)", () => {
    expect(() => resolveExperimentalRetries(1)).toThrow();
    expect(() => resolveExperimentalRetries(2)).toThrow();
  });
});