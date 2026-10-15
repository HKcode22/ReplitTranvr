# Phase 2G Prospective Hardening — UNLOGGED Runtime Reset Integrity

**Frozen before:** MMUN-v2 corrected-contract Stage-1 paid run  
**Date:** 2026-09-30  
**Scope:** MMUN-v2 and subsequent Phase-2G Stage-1 probes  
**Effect on scoring:** none  
**Effect on candidate order:** none  
**Effect on duration/time class:** none  
**Effect on credit caps:** none  
**Effect on retry policy:** none  
**Purpose:** fail closed if transient UNLOGGED runtime state disappears or regresses during a paid measurement, and strengthen terminal consistency checks.

---

## 1. Observed condition

Both successful corrected-contract runs later showed the same post-measurement closeout condition:

- WSSS-v2: transient prepaid session/delivery/item rows were absent while the expected retained callback blobs still existed.
- OMAA-v2: transient prepaid session/delivery/item rows were absent while exactly 30 expected retained callback blobs still existed.

In both cases the measurement had already reached full duration, provider exposure was stopped, reconciliation evidence had been durably persisted, scientific-health evidence had been independently preserved by GitHub Actions, and the raw retained blobs remained available.

The condition therefore did not invalidate those completed measurements, but its recurrence is an operational/runtime-integrity signal that requires prospective hardening.

---

## 2. What repository review rules out

The intended purpose-cleanup function:

1. deletes/tombstones the retained provider blobs;
2. only then deletes the UNLOGGED item/delivery/session rows;
3. verifies both are absent.

The observed state had the opposite ordering: runtime rows were absent while all expected live blobs remained.

The expiry path calls that same ordered cleanup function.

The prepaid runtime session lifetime is 24 hours, while the WSSS-v2 and OMAA-v2 disappearances were observed before the corresponding session expiry.

Boot migration 0055 uses `CREATE UNLOGGED TABLE IF NOT EXISTS`; the application boot path does not intentionally truncate the prepaid runtime tables.

Therefore the known normal repository cleanup, expiry, and boot-migration paths do not explain the observed ordering.

---

## 3. Leading technical explanation and uncertainty

Migration 0055 intentionally defines:

- `clean.prepaid_probe_session_runtime`
- `clean.prepaid_probe_delivery_runtime`
- `clean.prepaid_probe_item_runtime`

as PostgreSQL UNLOGGED tables so provider-identifying working data are not written into WAL/PITR history.

The migration itself documents that PostgreSQL resets these tables after crash recovery.

The repeated post-measurement condition is therefore consistent with a PostgreSQL crash/unclean-recovery or equivalent database lifecycle event that reset UNLOGGED relations.

This is **not proven** because the project does not possess authoritative database-provider crash/failover logs for the exact disappearance interval.

A Replit Node/watch-process restart alone is not treated as sufficient proof of the cause. Application restart and PostgreSQL server recovery are distinct events.

---

## 4. Why changing the runtime tables to LOGGED is not authorized

The UNLOGGED boundary is deliberate.

The runtime item table contains normalized provider-derived working fields such as flight number, aircraft registration, callsign, provider-flight linkage fields, schedule fields, and physical-identity working state.

Changing these tables to ordinary LOGGED tables would write this transient provider-derived content into PostgreSQL WAL/PITR history and would violate the existing provider-content-safe design.

This hardening therefore keeps the tables UNLOGGED.

---

## 5. New live monotonicity guards

The independent GitHub Actions safety watchdog now preserves prior observed aggregate runtime counters in process memory.

While the durable probe remains `probing`, it fails closed if any of the following occur:

- the durably bound runtime session row is missing;
- delivery count decreases;
- internal received-credit count decreases;
- callback-request count decreases;
- scientific item-row count decreases.

Durable stop reasons are restricted to:

```text
runtime_state_loss:session_row_missing
runtime_state_loss:delivery_count_regressed
runtime_state_loss:internal_credit_regressed
runtime_state_loss:callback_count_regressed
runtime_state_loss:item_count_regressed
```

These are data-integrity/infrastructure failures. They are not scientific outcome thresholds.

A low yield, high ambiguity rate, low score, or other unfavorable outcome still cannot stop a run.

---

## 6. PostgreSQL lifecycle diagnostic

The independent watchdog also records:

```text
pg_postmaster_start_time()
```

as aggregate operational evidence.

It reports whether the observed PostgreSQL postmaster start timestamp changed during the watchdog lifetime.

A timestamp change is diagnostic only and is not, by itself, an automatic stop condition.

If runtime state regresses at the same time, the runtime regression—not the timestamp itself—is the fail-closed trigger.

---

## 7. Terminal owner consistency guard

Before a deferred-cleanup run can be written as successful/settling, the paid owner now re-reads the exact runtime state using the same scientific time window:

```text
received_at_utc >= window_start
received_at_utc <  window_end
```

It requires:

- exactly one exact runtime session row;
- terminal in-window delivery count == metric reducer delivery count;
- terminal in-window item count == metric reducer rowsDelivered;
- terminal in-window resolved physical-ID count == metric reducer confirmedUniqueLower.

A mismatch produces:

```text
runtime_state_loss:terminal_snapshot_mismatch
```

and the probe is marked failed rather than being converted to a clean settling/success state.

This specifically closes the race where runtime state could be reset between final metric computation and durable success persistence.

---

## 8. No scientific protocol change

This hardening does not modify:

- physical-flight identity v2;
- ambiguity-key construction;
- WSSS -> OMAA -> MMUN recovery order;
- 120-minute Stage-1 target;
- weekday 12:00 UTC time class;
- credit reservation/cap;
- complete-bucket stability formula;
- anchor scoring;
- promotion/ranking;
- one-attempt v2 recovery limit.

It only strengthens runtime-integrity detection and terminal consistency.

---

## 9. MMUN-v2 admission requirement

MMUN-v2 must not launch until:

1. this hardening is committed;
2. the exact new source HEAD is synced to Replit;
3. the targeted static suite and TypeScript compile pass;
4. live schema/runtime/provider preflight remains clean;
5. the frozen selector independently returns MMUN;
6. fresh MMUN runtime and AUTH are generated only after the hardened HEAD is frozen;
7. fresh zero-credit callback/runtime binding evidence passes;
8. the exact paid preflight returns `PASS_READY_FOR_PAID_STAGE1`.

No provider mutation is authorized by this amendment itself.
