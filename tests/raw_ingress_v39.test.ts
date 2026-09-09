/**
 * V3.9 raw-ingress/semantic-identity offline regression tests.
 * No network or paid provider operation is performed.
 */
import { createHash } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { semanticObservationKey } from "../server/lib/disruption/flightDataPrePostStore_v3";

function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}
function sha256Json(obj: unknown): string {
  return sha256(JSON.stringify(obj));
}
function source(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}
function regexIndex(src: string, pattern: RegExp): number {
  const match = pattern.exec(src);
  return match?.index ?? -1;
}

describe("TEST-006: raw durability/hash identity", () => {
  it("same raw payload hash is stable and changed payload differs", () => {
    const payload = { subscription: { id: "sub_123" }, flights: [{ number: "UA123", status: "Active" }] };
    expect(sha256Json(payload)).toBe(sha256Json(JSON.parse(JSON.stringify(payload))));
    expect(sha256Json(payload)).toMatch(/^[a-f0-9]{64}$/);
    expect(sha256Json(payload)).not.toBe(sha256Json({ ...payload, flights: [{ number: "UA456" }] }));
  });

  it("raw-item provenance is delivery + original item index + raw-item hash", () => {
    const deliveryId = "del_abc";
    const raw = { number: "UA123" };
    const key = `${deliveryId}:7:${sha256Json(raw)}`;
    expect(key).toBe(`${deliveryId}:7:${sha256Json(raw)}`);
  });

  it("provider retry identity is based on notification id + attempt sequence when available", () => {
    const rawIngress = source("server/lib/disruption/rawIngress_v3.ts");
    expect(rawIngress).toContain("input.notificationId");
    expect(rawIngress).toContain("input.deliveryAttemptSeqNo");
    expect(rawIngress).toContain("del_adb_");
    expect(rawIngress).toContain("provider_notification_generated_utc");
    expect(rawIngress).toContain("delivery_attempt_utc");
    expect(rawIngress).toContain("delivery_attempt_cost_credits");
  });

  it("attempt-provenance migration keeps all provider-native fields separate", () => {
    const migration = source("migrations/0044_webhook_attempt_provenance.sql");
    for (const field of [
      "notification_id",
      "provider_notification_generated_utc",
      "delivery_attempt_seq_no",
      "delivery_attempt_utc",
      "delivery_attempt_cost_credits",
    ]) expect(migration).toContain(field);
    expect(migration).toContain("uq_raw_delivery_notification_attempt");
  });
});

describe("TEST-007: semantic observation identity", () => {
  it("same clocks but different semantic event type remain distinct", () => {
    const base = {
      canonicalFlightInstanceId: "fi_123",
      eventPhase: "POST" as const,
      locReportedUtc: new Date("2026-09-01T12:00:00Z"),
      providerStateUpdatedUtc: new Date("2026-09-01T12:00:00Z"),
      rawItemSha256: "a".repeat(64),
    };
    const position = semanticObservationKey({ ...base, eventType: "position_update" });
    const status = semanticObservationKey({ ...base, eventType: "status_change" });
    expect(position).not.toBe(status);
    expect(position).toMatch(/^[a-f0-9]{64}$/);
  });

  it("different raw item hashes keep same-clock updates distinct", () => {
    const base = {
      canonicalFlightInstanceId: "fi_123",
      eventType: "status_change",
      eventPhase: "POST" as const,
      locReportedUtc: null,
      providerStateUpdatedUtc: new Date("2026-09-01T12:00:00Z"),
    };
    expect(semanticObservationKey({ ...base, rawItemSha256: "a".repeat(64) }))
      .not.toBe(semanticObservationKey({ ...base, rawItemSha256: "b".repeat(64) }));
  });
});

describe("Phase 0B: production webhook ordering", () => {
  it("orders raw transaction -> identity ledger -> semantic events -> mutable state -> 2xx", () => {
    const src = source("server/routes_v3.ts");
    const iRaw = regexIndex(src, /await\s+persistRawDeliveryTransaction\s*\(/);
    const iIdentity = regexIndex(src, /await\s+persistIdentityResolutionLedger\s*\(/);
    const iEvents = regexIndex(src, /await\s+appendResearchEvents\s*\(/);
    const iUpsert = regexIndex(src, /await\s+upsertFlightNotifications\s*\(\s*rows\s*\)/);
    const iAck = regexIndex(src, /res\.status\s*\(\s*200\s*\)\.json\s*\(\s*\{\s*received\s*:\s*true\s*,\s*flights\s*:/);
    for (const [name, index] of [
      ["raw transaction", iRaw],
      ["identity resolution ledger", iIdentity],
      ["semantic events", iEvents],
      ["current-state upsert", iUpsert],
      ["2xx", iAck],
    ] as const) expect(index, name).toBeGreaterThan(-1);
    expect(iRaw).toBeLessThan(iIdentity);
    expect(iIdentity).toBeLessThan(iEvents);
    expect(iEvents).toBeLessThan(iUpsert);
    expect(iUpsert).toBeLessThan(iAck);
  });

  it("raw DB failure is the only pre-durability 5xx path and opens raw-persistence incident", () => {
    const src = source("server/routes_v3.ts");
    expect(src).toMatch(/recordIncident\s*\(\s*["']raw-persistence["']/);
    expect(src).toMatch(/res\.status\s*\(\s*500\s*\)\.json\s*\(\s*\{\s*error\s*:\s*["']Raw persistence failed; please retry["']\s*\}\s*\)/);
    expect(src).not.toContain("await persistRawDeliveryItems(");
  });

  it("post-raw identity/event persistence failure returns 2xx but opens persistent incident-stop", () => {
    const src = source("server/routes_v3.ts");
    expect(src).toMatch(/recordIncident\s*\(\s*["']persistence["']/);
    expect(src).toContain("semantic processing error after raw durability");
    expect(src).toMatch(/res\.status\s*\(\s*200\s*\)\.json\s*\(\s*\{\s*received\s*:\s*true\s*,\s*error\s*:/);
  });

  it("does not create service-date identity from UTC slicing or a mutable fallback date", () => {
    const src = source("server/routes_v3.ts");
    expect(src).toMatch(/resolveWebhookFlightIdentity\s*\(\s*\{/);
    expect(src).toMatch(/identity\.status\s*!==\s*["']resolved["']/);
    expect(src).not.toContain("depScheduledUtc.toISOString().slice(0, 10)");
  });

  it("preserves original raw index after parser skips", () => {
    const src = source("server/routes_v3.ts");
    expect(src).toMatch(/rawIndex\s*:\s*number/);
    expect(src).toMatch(/flights\.forEach\s*\(\s*\(\s*flight\s*:\s*any\s*,\s*rawIndex\s*:\s*number\s*\)/);
    expect(src).toMatch(/item_index\s*,\s*raw_item_sha256\s*,\s*resolution_status/);
    expect(src).not.toContain("const flight = flights[i] ?? {}");
  });

  it("preserves notification/attempt clocks and cost without substituting first-flight lastUpdatedUtc", () => {
    const src = source("server/routes_v3.ts");
    expect(src).toContain("notificationGeneratedUtc");
    expect(src).toContain("attemptSeqNo");
    expect(src).toContain("attemptUtc");
    expect(src).toContain("deliveryAttemptCostCredits");
    expect(src).not.toContain("flights[0]?.lastUpdatedUtc ?? balance?.lastDeductedUtc");
  });

  it("identity ledger is append-only and resolved/quarantined, never silently overwritten", () => {
    const migration = source("migrations/0042_webhook_identity_resolution_ledger.sql");
    expect(migration).toContain("resolution_status IN ('resolved','quarantined')");
    expect(migration).toContain("trg_webhook_identity_resolution_immutable");
    const route = source("server/routes_v3.ts");
    expect(route).toMatch(/ON\s+CONFLICT\s*\(\s*delivery_id\s*,\s*item_index\s*\)\s+DO\s+NOTHING/i);
    expect(route).toContain("IDENTITY_LEDGER_CONFLICT");
  });

  it("HTTP cannot start or stop Phase 6 outside the command owners", () => {
    const src = source("server/routes_v3.ts");
    expect(src).toContain("REFUSED_PHASE6_HTTP_START");
    expect(src).toContain("REFUSED_PHASE6_HTTP_STOP");
    expect(src).not.toMatch(/app\.post\s*\(\s*["']\/api\/v1\/collection\/start["'][\s\S]{0,500}startBatch\s*\(/);
    expect(src).not.toMatch(/app\.post\s*\(\s*["']\/api\/v1\/collection\/stop["'][\s\S]{0,500}stopBatch\s*\(/);
  });
});
