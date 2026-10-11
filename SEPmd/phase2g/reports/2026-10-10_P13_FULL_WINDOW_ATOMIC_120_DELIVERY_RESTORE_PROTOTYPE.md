# P13 full-window atomic reconstruction — deterministic 120-delivery YSSY stress fixture

**Status: full-window isolated tests VERIFIED GREEN, NOT PAID READY.** Date: October 10, 2026. **Strictly disposable PostgreSQL16, no AeroDataBox API calls, no credits, no Replit deployment and no Cloudflare account changes.** The implementation is under `experiments/phase2g_rehearsal/` on the investigation branch, not under the live V3.9 paid owner.

## Purpose and test boundaries

Extends the earlier P13 **one original delivery with two physical flights** quarantined recovery to **120 original synthetic deliveries over the exact 03:00–05:00 UTC YSSY window**, one distinct operator flight per delivery, fifteen deterministic synthetic arrivals in each 15-minute interval. The 120 attempts and 15 evenly spread observations per bucket are **stress-fixture specifications, not frozen F.8 real-airport arrival counts, sample quotas, minimum flight traffic, or validation of full live 120-minute uptime**. Actual provider event counts and distribution may be very different. No dates or missing events are synthesized by the algorithm.

### Source and restore contracts

1. Build 120 original synthetic HTTP-style provider notifications by the **actual V3.9 lower-level persistence** code on a local disposable PostgreSQL instance with a frozen `receivedAtUtc`, read and sign per-delivery original body SHA, per-flight canonical SHA, physical-flight instance ID, exact item indexes, source first-edge UTC, logical provider attempt ID and a frozen owner/session/subscription. Original content is retained in an isolated fake App Storage memory map and its own LOGGED reference.
2. Independently sign a **synthetic sender attempt manifest** containing exact 120 attempts, notification IDs, original wire SHA, canonical content SHA, attempts/cost, provider-generated UTC and sender response status. The signer is another test fixture key, not an AeroDataBox verification key. All source and snapshot material is signed **after initial processing**, so it cannot establish genuine durable-before-2xx external ingress.
3. A synthetic LOGGED journal and complete signed original runtime-column snapshot are created for each uniquely bound delivery. **These full-row LOGGED tables are forbidden for real production** under V3.9's original PITR/privacy design and used only in the disposable test. Before replay the complete journal must match the frozen sender inventory exactly (no missing or extra attempts), raw original wire and every canonical physical-v2 item, exactly 168h+ retained unexpired blob metadata, exact original UTC, zero provider delivery retries, 120 synthetic credits and all eight deterministic original 15-minute buckets.
4. Following simulated local `UNLOGGED` loss, a **single PostgreSQL SERIALIZABLE transaction + per-session advisory lock** verifies every source object / frozen journal / snapshot / LOGGED blob-ref and all sources in the sender manifest. It refuses any unexpected or missing registered source. Only after complete successful validation does it reconstruct all original UNLOGGED delivery/item rows, preserving source time. No source blob is uploaded or another LOGGED reference created.
5. The reconstructed runtime is **`quarantined`** with `callback_success_2xx=0`, original window end, and is not eligible for paid webhook acceptance. A second identical restore is idempotent; any existing active, partially restored, or changed data cause a hard failure, never silent repair or overwriting. After insertion, original item identity/time/route comparisons are repeated before transaction commit.
6. Test also deliberately removes the **last** durable record and corrupts a middle original raw payload before replay. These preflight failures must leave **zero** partial recovery writes. A later missing item after a successful restore must be diagnosed, not imputed or silently recreated.

## Measurable tests

The connected CI workflow `.github/workflows/phase2g-p2g24-offline-fault-injection.yml` runs 321 offline regressions and the disposable V3.9 PostgreSQL integration cases; the new full-window case increases the latter to 42 when passing. Other CI confirms a truly unclean PostgreSQL16 SIGKILL resets UNLOGGED and preserves LOGGED ownership evidence. The new test uses a **TRUNCATE to simulate lost runtime state** (its accompanying existing real SIGKILL test independently proves PG UNLOGGED crash behavior).

**[Verified GitHub Actions #38093195638](https://github.com/HKcode22/ReplitTranvr/actions/runs/38093195638), tested code SHA `997fe577ab11162b8f96d3dc2151113fae066f55` — BOTH JOBS COMPLETED SUCCESS.** Evidence: **321/321 offline Vitest in 31 suites; 42/42 actual disposable V3.9/PostgreSQL16 integration cases**, plus separate real PostgreSQL SIGKILL/UNLOGGED reset proving retained LOGGED owner binding. The full-window integration logs explicitly report `P13_FULL_WINDOW_8X15_SOURCE_UTC_RESTORED=true`, `P13_FULL_WINDOW_120_PHYSICAL_V2_ROWS_RESTORED=true`, `P13_FULL_WINDOW_NEW_LOGGED_BLOBS=0`, `P13_FULL_WINDOW_ATOMIC_MISSING_ITEM_ROLLBACK=true`, `P13_FULL_WINDOW_STAYS_QUARANTINED=true`, `P13_FULL_WINDOW_REAL_SENDER_AUTHENTICATED=false`, and `P13_FULL_WINDOW_PAID_GO_AUTHORIZED=false`.

**Failure history retained:** Prior attempts [#38092925445](https://github.com/HKcode22/ReplitTranvr/actions/runs/38092925445) and [#38093040019](https://github.com/HKcode22/ReplitTranvr/actions/runs/38093040019) failed correctly rather than silently PASSing, first because leftover LOGGED test fixture records broke the strict 120 source inventory and then because PostgreSQL `DATE` formatting broke the strict physical-v2 witness type. The test now isolates only its disposable LOGGED fixture tables and normalizes journal dates to `YYYY-MM-DD`; the strict source-inventory and identity validators were **not relaxed**.

## Scientific and operational limitations

- Still **no independent actual AeroDataBox sender-attempt or credited subscription evidence**, and no independent deployed edge/UTC before provider ACK. External billed 260 vs internal 259 remains a hard scientific veto, not a permissible tolerance.
- Connected Cloudflare account has **zero Queues and R2 is disabled (code 10042)**. Actual 168h externally durable replay, cost, quota and cold-start proof are outstanding. A free Queue's 24h retention is not sufficient alone.
- No actual hosted two-hour wall-clock R0–R11 full POST test, full operational source preservation in independent failure domains, delivered build/hash equivalence, subscription owner exclusivity under cold start, budget/floor admission, or new Stage-1 human authorization.
- **Proposed 6 primary + 6 backup health checks remain TEST ONLY. Live paid supervisor still stops after 3 consecutive failed health cycles.** `maxDeliveryRetries=0` remains frozen at provider level. Do not silently change the scientific release thresholds or retroactively reclassify P2G24.
- **YSSY paid collection Sunday October 11 20:00 PDT / Monday October 12 03:00 UTC remains NO-GO** pending actual P09–P20 hard gates. This test demonstrates an isolated recovery primitive, not scientific sampling continuity or paid-ready production failover.

## Source of truth

- `experiments/phase2g_rehearsal/disposable_exact_science_restore_v39.ts` — `restoreSyntheticCompleteWindowV39`, `recordSyntheticExactRuntimeSnapshotV39`
- `experiments/phase2g_rehearsal/signed_attempt_reconciliation_v39.ts` — signed source attempt test ledger
- `experiments/phase2g_rehearsal/disposable_logged_science_recovery_journal_v39.ts` — HMAC science journal and SHA/readback tests
- `tests/phase2g_p2g24_actual_postgres_persistence_integration_v39.test.ts` — actual local Postgres/V3.9 full-window fault integration
- [Phase2G issue #28](https://github.com/HKcode22/ReplitTranvr/issues/28) — master release/no-go checklist
