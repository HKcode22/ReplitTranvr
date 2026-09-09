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
    const iRaw = src.indexOf("await persistRawDeliveryTransaction(");
    const iIdentity = src.indexOf("await persistIdentityResolutionLedger(");
    const iEvents = src.indexOf("await appendResearchEvents(");
    const iUpsert = src.indexOf("await upsertFlightNotifications(rows)");
    const iAck = src.indexOf("res.status(200).json({ received: true, flights:");
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
    expect(src).toContain('recordIncident("raw-persistence"');
    expect(src).toContain('res.status(500).json({ error: "Raw persistence failed; please retry" })');
    expect(src).not.toContain("await persistRawDeliveryItems(");
  });

  it("post-raw identity/event persistence failure returns 2xx but opens persistent incident-stop", () => {
    const src = source("server/routes_v3.ts");
    expect(src).toContain('recordIncident("persistence"');
    expect(src).toContain("semantic processing error after raw durability");
    expect(src).toContain('res.status(200).json({ received: true, error:');
  });

  it("does not create service-date identity from UTC slicing or a mutable fallback date", () => {
    const src = source("server/routes_v3.ts");
    expect(src).toContain("resolveWebhookFlightIdentity({");
    expect(src).toContain('identity.status !== "resolved"');
    expect(src).not.toContain("depScheduledUtc.toISOString().slice(0, 10)");
  });

  it("preserves original raw index after parser skips", () => {
    const src = source("server/routes_v3.ts");
    expect(src).toContain("rawIndex: number");
    expect(src).toContain("flights.forEach((flight: any, rawIndex: number)");
    expect(src).toContain("item_index,raw_item_sha256,resolution_status");
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
    expect(route).toContain("ON CONFLICT(delivery_id,item_index) DO NOTHING");
    expect(route).toContain("IDENTITY_LEDGER_CONFLICT");
  });
});
