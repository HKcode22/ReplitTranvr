import { describe, expect, it } from "vitest";
import {
  resolvePrepaidFlightIdentityV39,
} from "../server/lib/disruption/prepaidProbeRuntime_v39";

type FakeResult = {
  rowCount: number;
  rows: any[];
};

function fakeClient(results: FakeResult[] = []) {
  const queries: string[] = [];

  return {
    queries,
    client: {
      async query(sql: string) {
        queries.push(sql);

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

const BASE = {
  id: "provider-flight-123",
  number: "AA100",
  callSign: "AAL100",
  airline: {
    iata: "AA",
    icao: "AAL",
  },
  departure: {
    airport: {
      icao: "MMUN",
      timeZone: "America/Cancun",
    },
    scheduledTime: {
      utc: "2026-09-25T11:30:00Z",
    },
  },
  arrival: {
    airport: {
      icao: "KDFW",
    },
    scheduledTime: {
      utc: "2026-09-25T14:15:00Z",
    },
  },
  aircraft: {
    reg: "N123AA",
  },
};

describe("V3.9 prepaid item identity orchestration", () => {
  it("resolves an operator record through the session-local physical resolver", async () => {
    const { client, queries } = fakeClient([
      {
        rowCount: 0,
        rows: [],
      },
    ]);

    const result = await resolvePrepaidFlightIdentityV39(
      client,
      SESSION,
      {
        ...BASE,
        codeshareStatus: 1,
      },
    );

    expect(result.codeshareStatus).toBe("IsOperator");
    expect(result.codeshareResolutionStatus)
      .toBe("resolved_operator");
    expect(result.identityResolutionStatus).toBe("resolved");
    expect(result.flightInstanceId).toMatch(/^leg:/);
    expect(result.initialServiceDate).toBe("2026-09-25");

    expect(queries.some((sql) =>
      sql.includes("clean.prepaid_probe_item_runtime"),
    )).toBe(true);

    expect(queries.join("\n"))
      .not.toContain("clean.webhook_flight_identity");
  });

  it("classifies a marketing record without creating a physical identity", async () => {
    const { client, queries } = fakeClient();

    const result = await resolvePrepaidFlightIdentityV39(
      client,
      SESSION,
      {
        ...BASE,
        codeshareStatus: 2,
      },
    );

    expect(result.codeshareStatus).toBe("IsCodeshared");
    expect(result.codeshareResolutionStatus)
      .toBe("resolved_marketing");
    expect(result.identityResolutionStatus).toBe("quarantined");
    expect(result.flightInstanceId).toBeNull();

    // Known marketing aliases must not enter physical identity resolution.
    expect(queries).toHaveLength(0);
  });

  it("keeps provider Unknown explicitly ambiguous without physical resolution", async () => {
    const { client, queries } = fakeClient();

    const result = await resolvePrepaidFlightIdentityV39(
      client,
      SESSION,
      {
        ...BASE,
        codeshareStatus: 0,
      },
    );

    expect(result.codeshareStatus).toBe("Unknown");
    expect(result.codeshareResolutionStatus)
      .toBe("ambiguous_unknown");
    expect(result.identityResolutionStatus).toBe("quarantined");
    expect(result.flightInstanceId).toBeNull();
    expect(result.provisionalIdentityKey)
      .toMatch(/^amb:[a-f0-9]{64}$/);

    expect(queries).toHaveLength(0);
  });

  it("quarantines an operator whose canonical identity prerequisites are incomplete", async () => {
    const { client, queries } = fakeClient();

    const result = await resolvePrepaidFlightIdentityV39(
      client,
      SESSION,
      {
        ...BASE,
        codeshareStatus: 1,
        departure: {
          airport: {
            icao: "MMUN",
            // timezone intentionally absent
          },
          scheduledTime: {
            utc: "2026-09-25T11:30:00Z",
          },
        },
      },
    );

    expect(result.codeshareResolutionStatus)
      .toBe("resolved_operator");
    expect(result.identityResolutionStatus).toBe("quarantined");
    expect(result.flightInstanceId).toBeNull();

    // Canonical resolver rejects before persistence when timezone is absent.
    expect(queries).toHaveLength(0);
  });
});
