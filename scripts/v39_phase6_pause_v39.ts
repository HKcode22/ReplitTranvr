/**
 * v39:phase6:pause — emergency Phase-6 pause.
 *
 * Pause is intentionally available even when ordinary start prerequisites are
 * failing. It persists a global incident-stop first (blocking all new paid
 * work), then immediately invokes the same serialized Phase-6 runtime owner
 * used for normal DELETE + frozen settlement. It never invents a second
 * settlement implementation.
 */
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { v39Pool as pool } from "../server/lib/disruption/db_v39";
import { listSubscriptionsStrict } from "../server/lib/disruption/aerodataboxLimiter_v3";
import { phase6SafetyTick } from "../server/lib/disruption/phase6SafetyWatchdog_v39";

async function main(): Promise<void> {
  const reason = process.argv.slice(2).join(" ").trim() || "operator pause";
  const requestedAtUtc = new Date();

  // Durable stop request first. Migration 0047 propagates this incident into
  // the active batch delivery-failure signal, so the runtime owner stops the
  // current segment on this invocation rather than waiting for the next poll.
  const incident = await pool.query(
    `INSERT INTO clean.adb_incident_stop(cause,occurred_at_utc,detail,resolved)
     VALUES('reconciliation',$1,$2::jsonb,false)
     RETURNING id`,
    [
      requestedAtUtc,
      JSON.stringify({
        kind: "operator_pause",
        owner: "v39:phase6:pause",
        reason,
        requestedAtUtc: requestedAtUtc.toISOString(),
      }),
    ],
  );
  const incidentId = Number(incident.rows[0]?.id);

  let runtimeError: string | null = null;
  try {
    await phase6SafetyTick(new Date());
  } catch (error: any) {
    runtimeError = error?.message ?? String(error);
  }

  const state = await pool.query(
    `SELECT
       (SELECT count(*)::int FROM clean.adb_collection_subs s
          JOIN clean.adb_collection_batches b ON b.batch_id=s.batch_id
         WHERE b.run_day_index IS NOT NULL AND s.ended_at IS NULL) AS open_owned_subs,
       (SELECT jsonb_build_object('batchId',batch_id,'runDayIndex',run_day_index,'status',status,
                                  'stopReason',stop_reason,'reconciliationStatus',reconciliation_status)
          FROM clean.adb_collection_batches
         WHERE run_day_index IS NOT NULL
         ORDER BY run_day_index DESC LIMIT 1) AS latest_batch`,
  );
  const openOwned = Number(state.rows[0]?.open_owned_subs ?? 0);
  const latestBatch = state.rows[0]?.latest_batch ?? null;

  let activeBillableIds: string[] = [];
  let providerListError: string | null = null;
  try {
    const subscriptions = await listSubscriptionsStrict();
    activeBillableIds = subscriptions
      .filter((s) => s.isActive && s.billingType !== "LifetimeBased")
      .map((s) => s.id);
  } catch (error: any) {
    providerListError = error?.message ?? String(error);
  }

  const dir = join(process.cwd(), ".v39-state");
  mkdirSync(dir, { recursive: true });
  const marker = join(dir, "phase6-paused.json");
  const evidence = {
    schema: "v39.phase6-pause-evidence.v2",
    requestedAtUtc: requestedAtUtc.toISOString(),
    reason,
    incidentId,
    runtimeError,
    openOwnedSubscriptions: openOwned,
    providerActiveBillableSubscriptionIds: activeBillableIds,
    providerListError,
    latestBatch,
  };
  writeFileSync(marker, JSON.stringify(evidence, null, 2));

  console.log(JSON.stringify(evidence));

  // Safety success means the stop is durable AND we can verify no project or
  // other billable subscription remains active. Settlement may legitimately
  // leave the parent BLOCKED/MISMATCH for later reconciliation; that does not
  // make the emergency DELETE itself unsuccessful.
  if (openOwned !== 0 || providerListError !== null || activeBillableIds.length !== 0) {
    throw new Error(
      `PAUSE_NOT_VERIFIED: open_owned=${openOwned} provider_list_error=${providerListError ?? "none"} active_billable=${activeBillableIds.join(",") || "none"}`,
    );
  }

  console.log(`RESULT: PAUSED — incident=${incidentId} provider billable subscriptions=0`);
}

main()
  .catch((error: any) => {
    console.error(`PHASE6-PAUSE FAILED: ${error?.message ?? error}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });
