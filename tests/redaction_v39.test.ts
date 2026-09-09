/**
 * Phase 0A — redaction tests (§1.5.1 offline security/retention machinery).
 *
 * Proves API keys, webhook secrets, authorization headers, and raw PII do not
 * enter normal command/error telemetry: the redact()/mask*() utilities must
 * mask every sensitive class while keeping non-sensitive telemetry readable.
 */

import { describe, it, expect } from "vitest";
import {
  redact,
  redactJSON,
  maskEmail,
  maskPhone,
  maskToken,
} from "../server/lib/redact";

describe("Phase 0A: secret redaction (§1.5.1)", () => {
  it("API keys never appear in redacted output", () => {
    const out = redact({ apiKey: "be0840c6SECRET", nested: { api_key: "xyz" } }) as any;
    expect(JSON.stringify(out)).not.toContain("be0840c6SECRET");
    expect(JSON.stringify(out)).not.toContain("xyz");
  });

  it("authorization headers are masked", () => {
    const out = redact({ authorization: "Bearer abc123", headers: { Authorization: "key" } }) as any;
    expect(JSON.stringify(out)).not.toContain("abc123");
    expect(JSON.stringify(out)).not.toContain("key");
  });

  it("webhook secrets and passwords are masked", () => {
    const out = redact({ secret: "whsec_123", password: "hunter2" }) as any;
    expect(JSON.stringify(out)).not.toContain("whsec_123");
    expect(JSON.stringify(out)).not.toContain("hunter2");
  });

  it("emails/phones masked but distinguishable", () => {
    expect(maskEmail("alice@example.com")).not.toContain("alice");
    expect(maskEmail("alice@example.com")).toContain("example.com");
    expect(maskEmail("alice@example.com")).not.toBe(maskEmail("bob@example.com"));
    expect(maskPhone("+14155550123")).not.toContain("14155550123");
    expect(maskPhone("+14155550123")).toContain("0123");
  });

  it("tokens correlate without leaking (prefix + length only)", () => {
    const m = maskToken("tok_abcdefghijklmnop");
    expect(m).not.toContain("abcdefghijklmnop");
    expect(m).toContain("tok_ab");
    expect(maskToken("tok_abcdefghijklmnop")).toBe(maskToken("tok_abcdefghijklmnop"));
  });

  it("transcripts/summaries become length markers, not content", () => {
    const out = redact({ transcript: "my secret travel plans", summary: "x".repeat(50) }) as any;
    expect(String(out.transcript)).toContain("length=");
    expect(String(out.transcript)).not.toContain("secret travel");
  });

  it("non-sensitive telemetry stays readable", () => {
    const out = redact({ flightNumber: "UA123", status: "Active", count: 5 }) as any;
    expect(out).toEqual({ flightNumber: "UA123", status: "Active", count: 5 });
  });

  it("redactJSON never throws and never leaks", () => {
    const s = redactJSON({ apiKey: "K", email: "a@b.com", ok: true });
    expect(s).not.toContain("\"K\"");
    expect(s).toContain("true");
    expect(redactJSON(null)).toBe("null");
  });

  it("null/empty scalars pass through safely", () => {
    expect(maskEmail(null)).toBe("—");
    expect(maskPhone(undefined)).toBe("—");
    expect(maskToken("")).toBe("—");
    expect(redact(null)).toBeNull();
  });
});
