import {
  beforeAll,
  afterAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { randomUUID } from "node:crypto";

const state = vi.hoisted(() => ({
  objects: new Set<string>(),
  deleteCalls: 0,
  failAfterDeleteCall: -1,
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
      uploadBytes: async (
        name: string,
        _bytes: Uint8Array,
      ) => {
        state.objects.add(name);
      },
      downloadBytes: async () => new Uint8Array(),
      exists: async (name: string) =>
        state.objects.has(name),
      delete: async (name: string) => {
        state.deleteCalls++;
        state.objects.delete(name);
        if (
          state.deleteCalls ===
          state.failAfterDeleteCall
        ) {
          throw new Error(
            "INJECTED_FAILURE_AFTER_PHYSICAL_DELETE",
          );
        }
      },
    }),
  }),
);

import {
  v39Pool as pool,
} from "../server/lib/disruption/db_v39";

import {
  runSchemaMigrationsV39,
} from "../server/lib/disruption/schemaMigration_v39";

import {
  cleanupPrepaidProbeSessionLocalV39,
} from "../server/lib/disruption/prepaidProbeRuntime_v39";

// This test can mutate ONLY an explicitly started local
// C8 PostgreSQL fixture. An inherited/stale socket must
// never cause the normal offline suite to connect to it.
const enabled =
  process.env.P2G_REAL_PG_TEST === "1" &&
  process.env.P2G_TEST_PG_ROLE === "p2g_local" &&
  /^\/tmp\/p2g-c8-pg\.[A-Za-z0-9]+\/socket$/.test(
    process.env.P2G_TEST_PG_SOCKET ?? "",
  ) &&
  Number.isSafeInteger(
    Number(process.env.P2G_TEST_PG_PORT),
  ) &&
  Number(process.env.P2G_TEST_PG_PORT) >= 1024;

const runSuite = enabled ? describe : describe.skip;

const SHA = "a".repeat(64);

type Fixture = {
  session: string;
  run: string;
  probeId: number;
  objects: string[];
  journal: {
    probeId: number;
    expectedLiveBlobs: number;
    requestSha256: string;
  };
};

async function fixture(
  count: number,
  probeId: number,
): Promise<Fixture> {
  const session = randomUUID();
  const run = `synthetic-c8-${randomUUID()}`;
  const objects: string[] = [];

  await pool.query(
    `INSERT INTO clean.prepaid_probe_session_runtime
       (session_id,owner_kind,state,expires_at_utc)
     VALUES
       ($1,'phase2_safety_smoke','settling',
        now()+interval '2 hours')`,
    [session],
  );

  for (let i = 0; i < count; i++) {
    const id = randomUUID();

    const name =
      `v39/provider/raw_provider_content/` +
      `${id.substring(0,2)}/${id}.blob`;

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
        id,
        name,
        "b".repeat(64),
        `prepaid:${session}:delivery-${i}`,
      ],
    );

    state.objects.add(name);
    objects.push(name);
  }

  return {
    session,
    run,
    probeId,
    objects,
    journal: {
      probeId,
      expectedLiveBlobs: count,
      requestSha256: SHA,
    },
  };
}

async function cleanup(
  f: Fixture,
  run = f.run,
) {
  return cleanupPrepaidProbeSessionLocalV39(
    f.session,
    run,
    async () => undefined,
    f.journal,
  );
}

runSuite(
  "Phase2G actual cleanup on isolated PostgreSQL",
  () => {
    beforeAll(async () => {
      const result = await runSchemaMigrationsV39(
        pool,
        {
          executionId: "p2g-c8-real-runtime",
          dryRun: false,
        },
      );

      expect(result.applied).toEqual([
        "B0062__v39_schema_baseline_20261001.sql",
        "V0063__phase2g_cleanup_journal_v39.sql",
      ]);
    }, 120000);

    afterAll(async () => {
      await pool.end();
    });

    it(
      "finishes actual cleanup with durable VERIFIED journal",
      async () => {
        const f = await fixture(1, 901);

        const result = await cleanup(f);

        expect(result.deletedBlobs).toBe(1);
        expect(result.deletedRuntimeRows).toBeGreaterThan(0);

        const q = await pool.query(
          `SELECT
             j.state,j.deleted_blobs,
             j.deleted_runtime_rows,
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
          [f.session, `prepaid:${f.session}:%`],
        );

        expect(q.rows[0]).toMatchObject({
          state: "VERIFIED",
          deleted_blobs: 1,
          sessions: 0,
          live_blobs: 0,
        });

        expect(state.objects.has(f.objects[0])).toBe(false);
        console.log("ACTUAL_CLEANUP_COMPLETION=PASS");
      },
      30000,
    );

    it(
      "recovers an interrupted physical deletion and rejects a different run",
      async () => {
        const f = await fixture(2, 902);

        state.deleteCalls = 0;
        state.failAfterDeleteCall = 2;

        await expect(
          cleanup(f),
        ).rejects.toThrow(
          "INJECTED_FAILURE_AFTER_PHYSICAL_DELETE",
        );

        state.failAfterDeleteCall = -1;

        const interrupted = await pool.query(
          `SELECT
             (SELECT state
                FROM clean.phase2g_cleanup_journal_v39
               WHERE session_id=$1) AS journal_state,
             (SELECT count(*)::int
                FROM clean.prepaid_probe_session_runtime
               WHERE session_id=$1) AS sessions,
             (SELECT count(*)::int
                FROM clean.provider_content_blob_ref
               WHERE source_record_id LIKE $2
                 AND deletion_run_id=$3
                 AND deletion_verified_at_utc IS NOT NULL)
                AS tombstones,
             (SELECT count(*)::int
                FROM clean.provider_content_blob_ref
               WHERE source_record_id LIKE $2
                 AND deletion_verified_at_utc IS NULL)
                AS live_refs`,
          [
            f.session,
            `prepaid:${f.session}:%`,
            f.run,
          ],
        );

        expect(interrupted.rows[0]).toMatchObject({
          journal_state: "STARTED",
          sessions: 1,
          tombstones: 1,
          live_refs: 1,
        });

        // Physical objects have disappeared, but one DB
        // tombstone has not yet been written.
        for (const name of f.objects) {
          expect(state.objects.has(name)).toBe(false);
        }

        console.log("INTERRUPTED_DELETE_PRESERVED=PASS");

        const callsBeforeConflict = state.deleteCalls;

        await expect(
          cleanup(f, "different-synthetic-run-123"),
        ).rejects.toThrow(
          "PHASE2G_CLEANUP_JOURNAL_CONFLICT",
        );

        expect(state.deleteCalls).toBe(
          callsBeforeConflict,
        );

        console.log("CONFLICTING_RUN_REJECTED=PASS");

        const recovered = await cleanup(f);
        expect(recovered.deletedBlobs).toBe(2);
        expect(recovered.deletedRuntimeRows).toBeGreaterThan(0);

        const final = await pool.query(
          `SELECT
             j.state,j.deleted_blobs,
             (SELECT count(*)::int
                FROM clean.prepaid_probe_session_runtime
               WHERE session_id=$1) AS sessions,
             (SELECT count(*)::int
                FROM clean.provider_content_blob_ref
               WHERE source_record_id LIKE $2
                 AND deletion_verified_at_utc IS NULL)
                AS live_refs,
             (SELECT count(*)::int
                FROM clean.provider_content_blob_ref
               WHERE source_record_id LIKE $2
                 AND deletion_run_id=$3
                 AND deletion_verified_at_utc IS NOT NULL)
                AS tombstones
           FROM clean.phase2g_cleanup_journal_v39 j
          WHERE j.session_id=$1`,
          [
            f.session,
            `prepaid:${f.session}:%`,
            f.run,
          ],
        );

        expect(final.rows[0]).toMatchObject({
          state: "VERIFIED",
          deleted_blobs: 2,
          sessions: 0,
          live_refs: 0,
          tombstones: 2,
        });

        console.log("ACTUAL_INTERRUPTED_RECOVERY=PASS");
      },
      30000,
    );
  },
);
