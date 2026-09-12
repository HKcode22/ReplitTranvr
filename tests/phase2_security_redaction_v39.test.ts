import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("prerequisite-P provider log redaction", () => {
  it("never logs AeroDataBox historical response content", () => {
    const text = source("server/lib/disruption/historicalOtp.ts");
    expect(text).not.toContain("raw response (first 500 chars)");
    expect(text).not.toContain("rawText.slice(0, 500)");
    expect(text).toContain("response received bytes=");
  });

  it("never prints the secret-bearing AeroDataBox webhook target", () => {
    const text = source("scripts/anchor_probe.ts");
    expect(text).not.toContain("defaultWebhookUrl() : ${url}");
    expect(text).toContain("/api/v1/webhooks/aerodatabox/[REDACTED]");
  });

  it("does not print provider error bodies from subscription creation", () => {
    const text = source("server/lib/disruption/aerodataboxLimiter_v3.ts");
    expect(text).not.toContain("createSubscription ${subjectType}/${subjectId} ${resp.status}: ${text.slice(0, 300)}");
    expect(text).toContain("createSubscription ${subjectType}/${subjectId} HTTP ${resp.status} (body redacted)");
  });
});
