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

  it("never puts provider HTTP response bodies into subscription/balance/refill logs or strict errors", () => {
    const text = source("server/lib/disruption/aerodataboxLimiter_v3.ts");
    expect(text).toContain("function safeHttpDiagnostic");
    expect(text).toContain("(body redacted)");
    expect(text).not.toContain("getBalance ${resp.status}: ${(await resp.text()");
    expect(text).not.toContain("refillBalance ${resp.status}: ${(await resp.text()");
    expect(text).not.toContain("listSubscriptions ${resp.status}: ${(await resp.text()");
    expect(text).not.toContain("getSubscription ${subscriptionId} ${resp.status}: ${(await resp.text()");
    expect(text).not.toContain("deleteSubscription ${subscriptionId} ${resp.status}: ${(await resp.text()");
    expect(text).not.toContain("R1_LIST_UNAVAILABLE: HTTP ${resp.status} ${body}");
    expect(text).not.toContain("const body = (await resp.text().catch(() => \"\")).slice(0, 300)");
  });

  it("does not put raw transport exception messages into AeroDataBox logs", () => {
    const text = source("server/lib/disruption/aerodataboxLimiter_v3.ts");
    expect(text).not.toContain('console.error("[adb-v3] getBalance error:", err?.message || err)');
    expect(text).not.toContain('console.error("[adb-v3] refillBalance error:", err?.message || err)');
    expect(text).not.toContain('console.error("[adb-v3] listSubscriptions error:", err?.message || err)');
    expect(text).not.toContain('console.error("[adb-v3] getSubscription error:", err?.message || err)');
    expect(text).not.toContain('console.error("[adb-v3] deleteSubscription error:", err?.message || err)');
  });
});
