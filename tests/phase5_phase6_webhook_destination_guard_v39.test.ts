import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { requireP5P6WebhookDestinationV39 } from
  "../server/lib/disruption/phase5Phase6WebhookDestinationGuard_v39";

const secret = "phase6Secret_abcdef0123456789";
const env = () => ({
  AERODATABOX_WEBHOOK_SECRET: secret,
  REPLIT_DOMAINS: "replit-tranvr--hk84164.replit.app",
});

describe("Phase5/Phase6 callback preflight before any paid-sending subscription", () => {
  it("builds exactly the hosted receiver route with a valid bound secret", () => {
    const url = requireP5P6WebhookDestinationV39(env());
    const u = new URL(url);
    expect(u.protocol).toBe("https:");
    expect(u.hostname).toBe("replit-tranvr--hk84164.replit.app");
    expect(u.pathname).toBe("/api/v1/webhooks/aerodatabox/" + secret);
    expect(u.username).toBe("");
    expect(u.search).toBe("");
    expect(u.hash).toBe("");
  });

  it("accepts a validated explicit HTTPS base origin without exposing it in errors", () => {
    const url = requireP5P6WebhookDestinationV39({
      ...env(), WEBHOOK_BASE_URL: "https://travnr.com/",
    });
    expect(url).toBe("https://travnr.com/api/v1/webhooks/aerodatabox/" + secret);
  });

  it("refuses missing or short receiver secret and unconfigured implicit fallback", () => {
    for (const e of [
      { ...env(), AERODATABOX_WEBHOOK_SECRET: "" },
      { ...env(), AERODATABOX_WEBHOOK_SECRET: "short" },
      { ...env(), AERODATABOX_WEBHOOK_SECRET: " leading whitespace " },
      { AERODATABOX_WEBHOOK_SECRET: secret },
      { ...env(), REPLIT_DOMAINS: "" },
    ]) {
      expect(() => requireP5P6WebhookDestinationV39(e))
        .toThrow("REFUSED_PHASE6_WEBHOOK_CALLBACK_UNVERIFIED");
    }
  });

  it("refuses HTTP, path injection, credentials, query, fragment or unapproved port", () => {
    const invalid = [
      "http://travnr.com",
      "https://travnr.com/api/v1/webhooks/aerodatabox",
      "https://username:password@travnr.com",
      "https://travnr.com/?key=secret",
      "https://travnr.com/#fragment",
      "https://travnr.com:8080",
      "not-a-url",
    ];
    for (const WEBHOOK_BASE_URL of invalid)
      expect(() => requireP5P6WebhookDestinationV39({
        ...env(), WEBHOOK_BASE_URL,
      })).toThrow("REFUSED_PHASE6_WEBHOOK_CALLBACK_UNVERIFIED");
  });

  it("preserves the generic receiver secret and hides it in hold errors", () => {
    let message = "";
    try {
      requireP5P6WebhookDestinationV39({
        ...env(), WEBHOOK_BASE_URL: "http://unsafe.example", 
      });
    } catch (e) { message = (e as Error).message; }
    expect(message).toBe("REFUSED_PHASE6_WEBHOOK_CALLBACK_UNVERIFIED");
    expect(message).not.toContain(secret);
  });

  it("wires the reviewed callback to parent and child CREATE, never merely to a status output", () => {
    const parent = readFileSync(
      "server/lib/disruption/adbCollectionController_v3.ts", "utf8");
    const child = readFileSync(
      "server/lib/disruption/phase6SegmentActivation_v39.ts", "utf8");
    expect(parent).toContain(
      "requireP5P6WebhookDestinationV39(process.env)");
    expect(child).toContain(
      "requireP5P6WebhookDestinationV39(process.env)");
    expect(parent).toContain("{ url: callbackUrl, maxDeliveryRetries: 0 }");
    expect(child).toContain("{ url: callbackUrl, maxDeliveryRetries: 0 }");
    expect(parent).not.toContain("AERODATABOX_API_KEY: 'fake-paid'");
  });
});
