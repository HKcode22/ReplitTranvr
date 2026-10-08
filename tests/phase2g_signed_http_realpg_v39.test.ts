import {
  beforeAll, afterAll, describe, expect, it, vi,
} from "vitest";
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import express from "express";

const storage = vi.hoisted(() => ({
  objects: new Set<string>(),
  deleteCalls: 0,
}));

vi.mock(
  "../server/lib/disruption/db_v39",
  async () => {
    const pg = (await import("pg")).default;
    return {
      v39Pool: new pg.Pool({
        host: process.env.P2G_TEST_PG_SOCKET,
        port: Number(process.env.P2G_TEST_PG_PORT),
        user: process.env.P2G_TEST_PG_ROLE,
        database: "postgres",
        connectionTimeoutMillis: 5000,
        max: 10,
      }),
    };
  },
);

vi.mock(
  "../server/lib/disruption/replitProviderBlobStore_v39",
  () => ({
    normalizeProviderBlobBucketIdV39: (id: string) => id,
    createRequiredProviderBlobStoreV39: () => ({
      uploadBytes: async (name: string) => {
        storage.objects.add(name);
      },
      downloadBytes: async () => new Uint8Array(),
      exists: async (name: string) =>
        storage.objects.has(name),
      delete: async (name: string) => {
        storage.deleteCalls++;
        storage.objects.delete(name);
      },
    }),
  }),
);

import { v39Pool as pool } from
  "../server/lib/disruption/db_v39";

import { registerV3Routes } from
  "../server/routes_v3";

import { runSchemaMigrationsV39 } from
  "../server/lib/disruption/schemaMigration_v39";

import {
  signPhase2gCleanupAttestationV39,
  type Phase2gCleanupAttestationV39,
} from "../server/lib/disruption/phase2gCleanupAttestation_v39";

import { phase2gCleanupScopeHashV39 } from
  "../server/lib/disruption/phase2gCleanupReplay_v39";

const enabled =
  process.env.P2G_HTTP_PG_TEST === "1" &&
  process.env.P2G_TEST_PG_ROLE === "p2g_local" &&
  /^\/tmp\/p2g-c9-pg\.[A-Za-z0-9]+\/socket$/.test(
    process.env.P2G_TEST_PG_SOCKET ?? "",
  );

const suite = enabled ? describe : describe.skip;

const ORIGIN =
  "https://replit-tranvr--hk84164.replit.app";
const KEY = "synthetic-local-c9-signing-key-" +
  "not-a-production-credential";
const BUDGET = "P2G-S1-20261008-24";
const SUB = "synthetic-local-subscription";

suite("Phase2G real signed HTTP cleanup", () => {
  let server: Server;
  let base = "";
  let session = "";
  let blobId = "";
  let objectName = "";
  let probeId = 9101;
  let runId = "";

  function proof(): Phase2gCleanupAttestationV39 {
    const now = Date.now();
    return {
      schema:
        "v39.phase2g-provider-inactive-cleanup-attestation.v1",
      callback_origin: ORIGIN,
      session_id: session,
      probe_id: probeId,
      probe_budget_day_id: BUDGET,
      icao: "YSSY",
      provider_subscription_id: SUB,
      deletion_run_id: runId,
      expected_live_blobs: 1,
      active_billable_subscriptions: 0,
      provider_inventory_checked_at_utc:
        new Date(now - 1000).toISOString(),
      expires_at_utc:
        new Date(now + 80000).toISOString(),
    };
  }

  async function post(
    claim: Phase2gCleanupAttestationV39,
    signature: string,
  ) {
    const response = await fetch(
      base + "/__v39/phase2g/runtime-cleanup",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-v39-phase2g-cleanup-proof": signature,
        },
        body: JSON.stringify(claim),
        signal: AbortSignal.timeout(10000),
      },
    );
    return {
      status: response.status,
      body: await response.json(),
    };
  }

  beforeAll(async () => {
    process.env.V39_PHASE2G_CLEANUP_SIGNING_KEY = KEY;
    process.env.V39_PHASE2G_CALLBACK_ORIGIN = ORIGIN;

    const migrated = await runSchemaMigrationsV39(
      pool,
      {
        executionId: "phase2g-c9-http-test",
        dryRun: false,
      },
    );

    expect(migrated.applied).toEqual([
      "B0062__v39_schema_baseline_20261001.sql",
      "V0063__phase2g_cleanup_journal_v39.sql",
    ]);

    session = randomUUID();
    blobId = randomUUID();
    runId = `synthetic-c9-${randomUUID()}`;

    objectName =
      `v39/provider/raw_provider_content/` +
      `${blobId.slice(0,2)}/${blobId}.blob`;

    // Required parent for the frozen Stage-1
    // probe_budget_day_id foreign key.
    // Entirely synthetic: only the isolated C9 database.
    await pool.query(
      `INSERT INTO clean.adb_probe_budget_day
       (probe_budget_day_id,state,cap_credits)
       VALUES ($1,'OPEN',500)`,
      [BUDGET],
    );

    await pool.query(
      `INSERT INTO clean.adb_anchor_probe
       (probe_id,stage,icao,region,
        window_start,window_end,window_hours,
        status,probe_budget_day_id,
        runtime_session_id,reconciliation_status,
        duration_censored,provider_content_safe_mode,
        confirmed_unique_lower_per_credit,
        confirmed_plus_ambiguous_upper_per_credit,
        metric_contract_version)
       VALUES
       ($1,1,'YSSY','Oceania',
        now()-interval '3 hours',
        now()-interval '1 hour',2,
        'settling',$2,$3,'MATCH',false,true,
        0.1,0.2,'v39-physical-flight-instance-v2')`,
      [probeId, BUDGET, session],
    );

    await pool.query(
      `INSERT INTO clean.prepaid_probe_session_runtime
       (session_id,owner_kind,owner_probe_id,stage,
        icao,provider_subscription_id,state,
        expires_at_utc,last_delivery_at_utc)
       VALUES
       ($1,'anchor_probe',$2,1,
        'YSSY',$3,'settling',
        now()+interval '2 hours',
        now()-interval '90 seconds')`,
      [session, probeId, SUB],
    );

    await pool.query(
      `INSERT INTO clean.provider_content_blob_ref
       (blob_ref_id,object_name,content_class,
        content_sha256,content_bytes,source_kind,
        source_record_id,persisted_at_utc,
        retention_hours,expires_at_utc)
       VALUES
       ($1,$2,'raw_provider_content',
        $3,3,'webhook',$4,now(),2,
        now()+interval '2 hours')`,
      [
        blobId,
        objectName,
        "a".repeat(64),
        `prepaid:${session}:synthetic-delivery`,
      ],
    );

    storage.objects.add(objectName);

    const app = express();
    app.use(express.json({ limit: "1mb" }));

    // Only expose the exact local test route.
    app.use((req, res, next) => {
      if (
        req.method !== "POST" ||
        req.path !== "/__v39/phase2g/runtime-cleanup"
      ) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      next();
    });

    registerV3Routes(app);

    server = createServer(app);

    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("C9_HTTP_BIND_FAILED");
    }
    base = `http://127.0.0.1:${address.port}`;
  }, 120000);

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server.close(err => err ? reject(err) : resolve());
      });
    }
    await pool.end();
    delete process.env.V39_PHASE2G_CLEANUP_SIGNING_KEY;
    delete process.env.V39_PHASE2G_CALLBACK_ORIGIN;
  });

  it("rejects unsigned requests without mutation", async () => {
    const result = await post(proof(), "0".repeat(64));
    expect(result.status).toBe(403);

    const journal = await pool.query(
      `SELECT count(*)::int AS n
       FROM clean.phase2g_cleanup_journal_v39
       WHERE session_id=$1`,
      [session],
    );

    expect(journal.rows[0].n).toBe(0);
    expect(storage.objects.has(objectName)).toBe(true);
    console.log("UNSIGNED_HTTP_REFUSAL=PASS");
  });

  it("rejects signed but incorrect session scope", async () => {
    const bad = {
      ...proof(),
      session_id: randomUUID(),
    };
    const signature = signPhase2gCleanupAttestationV39(
      bad, KEY,
    );

    const result = await post(bad, signature);
    expect(result.status).toBe(409);
    expect(storage.deleteCalls).toBe(0);
    console.log("WRONG_SESSION_HTTP_REFUSAL=PASS");
  });

  it("accepts valid signed cleanup and verifies journal", async () => {
    const claim = proof();
    const signature = signPhase2gCleanupAttestationV39(
      claim, KEY,
    );

    const result = await post(claim, signature);
    expect(
      result.status,
      JSON.stringify(result.body),
    ).toBe(200);

    expect(result.body).toMatchObject({
      schema: "v39.phase2g-runtime-cleanup.v1",
      status: "PASS",
      session_id: session,
      probe_id: probeId,
      deleted_blobs: 1,
      provider_inactive_attestation_verified: true,
      provider_mutation: false,
    });

    const q = await pool.query(
      `SELECT
         j.state,j.deleted_blobs,j.request_sha256,
         (SELECT count(*)::int
          FROM clean.prepaid_probe_session_runtime
          WHERE session_id=$1) AS sessions,
         (SELECT count(*)::int
          FROM clean.provider_content_blob_ref
          WHERE source_record_id LIKE $2
            AND deletion_verified_at_utc IS NULL)
          AS live_blobs
       FROM clean.phase2g_cleanup_journal_v39 j
       WHERE j.session_id=$1`,
      [session, `prepaid:${session}:%`],
    );

    expect(q.rows[0]).toMatchObject({
      state: "VERIFIED",
      deleted_blobs: 1,
      sessions: 0,
      live_blobs: 0,
      request_sha256: phase2gCleanupScopeHashV39(claim),
    });

    expect(storage.objects.has(objectName)).toBe(false);
    expect(storage.deleteCalls).toBe(1);
    console.log("SIGNED_HTTP_CLEANUP=PASS");
  });

  it("replays verified result without a second deletion", async () => {
    const claim = proof();
    const signature = signPhase2gCleanupAttestationV39(
      claim, KEY,
    );

    const result = await post(claim, signature);
    expect(
      result.status,
      JSON.stringify(result.body),
    ).toBe(200);

    expect(result.body).toMatchObject({
      status: "PASS",
      deleted_blobs: 1,
      recovery_replay: true,
    });

    expect(storage.deleteCalls).toBe(1);
    console.log("LOST_HTTP_RESPONSE_REPLAY=PASS");
  });

  it("rejects another signed run after verification", async () => {
    const wrong = {
      ...proof(),
      deletion_run_id: `different-c9-${randomUUID()}`,
    };
    const signature = signPhase2gCleanupAttestationV39(
      wrong, KEY,
    );

    const result = await post(wrong, signature);
    expect(result.status).toBe(409);
    expect(storage.deleteCalls).toBe(1);
    console.log("CONFLICTING_REPLAY_REFUSED=PASS");
  });
});
