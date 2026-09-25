import { describe, expect, it } from "vitest";
import {
  createPrepaidSessionIdentityPersistenceV39,
} from "../server/lib/disruption/prepaidProbeRuntime_v39";

type FakeResult = {
  rowCount: number;
  rows: any[];
};

function fakeClient(results: FakeResult[]) {
  const queries: Array<{ sql: string; params: unknown[] | undefined }> = [];

  return {
    queries,
    client: {
      async query(sql: string, params?: unknown[]) {
        queries.push({ sql, params });

        if (/pg_advisory_xact_lock/i.test(sql)) {
          return { rowCount: 1, rows: [{}] };
        }

        const next = results.shift();
        if (!next) {
          throw new Error(`UNEXPECTED_QUERY: ${sql}`);
        }
        return next;
      },
    },
  };
}

const SESSION = "123e4567-e89b-42d3-a456-426614174000";

const BASE_INPUT = {
  providerFlightId: "provider-123",
  providerRecordKey: "provider-123",
  callsign: "AAL100",
  operatingCarrier: "AA",
  operatingFlightNumber: "100",
  originIcao: "MMUN",
  originalDestinationIcao: "KDFW",
  initialServiceDate: "2026-09-25",
  scheduledGateOutUtc: "2026-09-25T11:30:00Z",
  flightInstanceId: "leg:new-candidate",
};

describe("V3.9 prepaid session-local identity persistence", () => {
  it("reuses prior resolved physical identity for the same provider flight id", async () => {
    const { client, queries } = fakeClient([
      {
        rowCount: 1,
        rows: [{
          flight_instance_id: "leg:existing",
          initial_service_date: "2026-09-25",
        }],
      },
    ]);

    const persistence =
      createPrepaidSessionIdentityPersistenceV39(client, SESSION);

    await expect(
      persistence.resolveOrCreate(BASE_INPUT),
    ).resolves.toEqual({
      flightInstanceId: "leg:existing",
      initialServiceDate: "2026-09-25",
    });

    const sql = queries.map((q) => q.sql).join("\n");

    expect(sql).toContain("clean.prepaid_probe_item_runtime");
    expect(sql).not.toContain("clean.webhook_flight_identity");
    expect(sql).not.toContain("clean.webhook_flight_schedule_version");
  });

  it("accepts the canonical candidate when provider id has no prior session identity", async () => {
    const { client } = fakeClient([
      {
        rowCount: 0,
        rows: [],
      },
    ]);

    const persistence =
      createPrepaidSessionIdentityPersistenceV39(client, SESSION);

    await expect(
      persistence.resolveOrCreate(BASE_INPUT),
    ).resolves.toEqual({
      flightInstanceId: "leg:new-candidate",
      initialServiceDate: "2026-09-25",
    });
  });

  it("reuses a no-provider callsign-linked retime within twelve hours", async () => {
    const { client } = fakeClient([
      {
        rowCount: 1,
        rows: [{
          flight_instance_id: "leg:retime-parent",
          initial_service_date: "2026-09-25",
          scheduled_gate_out_utc: "2026-09-25T10:00:00Z",
          callsign: "AAL100",
        }],
      },
    ]);

    const persistence =
      createPrepaidSessionIdentityPersistenceV39(client, SESSION);

    await expect(
      persistence.resolveOrCreate({
        ...BASE_INPUT,
        providerFlightId: null,
        providerRecordKey: null,
        scheduledGateOutUtc: "2026-09-25T15:00:00Z",
        flightInstanceId: "leg:new-retime-candidate",
      }),
    ).resolves.toEqual({
      flightInstanceId: "leg:retime-parent",
      initialServiceDate: "2026-09-25",
    });
  });

  it("fails closed when a no-provider observation is ambiguous between nearby legs", async () => {
    const { client } = fakeClient([
      {
        rowCount: 2,
        rows: [
          {
            flight_instance_id: "leg:a",
            initial_service_date: "2026-09-25",
            scheduled_gate_out_utc: "2026-09-25T10:00:00Z",
            callsign: null,
          },
          {
            flight_instance_id: "leg:b",
            initial_service_date: "2026-09-25",
            scheduled_gate_out_utc: "2026-09-25T18:00:00Z",
            callsign: null,
          },
        ],
      },
    ]);

    const persistence =
      createPrepaidSessionIdentityPersistenceV39(client, SESSION);

    await expect(
      persistence.resolveOrCreate({
        ...BASE_INPUT,
        providerFlightId: null,
        providerRecordKey: null,
        callsign: null,
        scheduledGateOutUtc: "2026-09-25T14:00:00Z",
      }),
    ).rejects.toMatchObject({
      name: "WebhookIdentityAmbiguityError",
    });
  });
});
