# Phase 5 P0 — early airport-selection and YSSY evidence handoff

**As of Friday Nov 6, 2026 ~20:25 PST.** This is a **readiness / software safety** checkpoint, not a frozen 31-day manifest, provider observation or paid test.

## Real source-vs-software finding

The Phase6 parent `server/lib/disruption/adbCollectionController_v3.ts::startBatch()` previously chose four adaptive airports at the **service-window start**, then wrote `clean.adb_sampling_draw` and created Alert subscriptions. But a prospective FIDS-based T−24h PRE observation must already be acquired and persisted before its flight-specific cutoff, often about a day earlier. The separate Phase6 Safety Watchdog explicitly does not fetch FIDS. This is a **real scheduling/design defect independent of AeroDataBox availability**, not a reason to repeat G5A FIDS-only paid trials.

[PR #415](https://github.com/HKcode22/ReplitTranvr/pull/415), merged to main SHA `e44d94cc9c448cd10f4ab93f0ec6a89b616254dc`, added a pure 31-day FIDS source acquisition-grid timing/budget validator, 19/19 focused offline passing. It does not run the real 31-day collector, select real airports, or authorize billing.

**Current follow-up:** [PR #417](https://github.com/HKcode22/ReplitTranvr/pull/417) adds the parent/child *fail-closed guard*: parent `startBatch()` must consume **four already committed, mutually consistent daily selections** with identical DB selected-at timestamp and at least the necessary broad **24h+30m** lead before day-window start, no late draw/write. Child segments re-read the same draw and compare a stored batch digest **before** additional Flight Alert CREATE. Anchors, frozen pair replay, regions, seed, group probabilities and pins must agree. Missing, late, inconsistent or mutated rows refuse. This has no current code to WRITE an early selection; Phase6 remains blocked. The guard proves only a necessary calendar-level early selection, **not real flight-level source available_at≤cutoff**. The actual early adaptive owner, persisted as-of state/identity, GitHub FIDS T24/T6/T90 acquisition, original/raw readback, POST and independent QA must still be implemented under [issue #416](https://github.com/HKcode22/ReplitTranvr/issues/416).

**Safety principle:** no falsely on-time PRE; never infer a missing notification or optional ADS-B position is a zero delay. Required protocol target availability/retention rights are separate. Production execution remains disabled. Any future one-flight paid diagnostics require a confirmed published receiver SHA and source-use permissions.

## User live Replit database audit — no raw Content read

At `2026-11-07T04:17:08.687Z` and `2026-11-07T04:17:14.850Z` the user ran two pinned **READ ONLY** scripts from main against the actual Replit DATABASE_URL, both exited successfully. **Every named table was found/selectable**, no provider calls, zero DB writes.

- **Past 24h:** `clean.fids_query_response` **9** original rows; `clean.flight_population` **1,207** repeated population observation rows (not 1,207 unique operating flights); `clean.flight_snapshots` **24** PRE rows. These are recent rows, not proof of 24 distinct flights or all three prospective horizons for the same cohort.
- **All-time:** `clean.flight_population` **1,574** repeated rows. Generic `clean.adb_collection_subs`, `clean.raw_delivery`, `clean.raw_delivery_item`, `clean.adb_ingest_events`, `clean.flight_events`, `clean.raw_airborne_events`, `clean.clean_airborne_points`, `clean.airborne_eligibility_evidence`, `clean.flight_airborne_snapshots` and `clean.flight_outcomes`: all zero. `clean.adb_collection_batches` also had zero recent24h rows (not established all-time).
- **Historical YSSY PREPAID separate storage path:** `clean.prepaid_probe_session_runtime`, `clean.prepaid_probe_delivery_runtime`, `clean.prepaid_probe_item_runtime` all **UNLOGGED, currently 0**; cannot conclude historical paid provider SEND or receipt never occurred. `clean.provider_content_blob_ref` is **LOGGED with 838 webhook reference rows**; all **838 expired**; **773 deletion-verified**, **65 lacking verified deletion**. Missing delete verification does *not* establish object survival or 65 failed deliveries. Do not inspect expired contents or reconstitute historical blobs; separate retention compliance question and Phase2G [issue #28](https://github.com/HKcode22/ReplitTranvr/issues/28).

## Phase5 decision

Phase4 G5A schedule-revision pilot **complete with limitations**, original strict full Gate5 scientific HOLD, no need to re-run it. **Phase5 nonpaid engineering GO**, [freeze checklist](2026-11-06_PHASE5_FREEZE_CHECKLIST_AND_VERSIONED_COLLECTION_QA.md) still OPEN; no Phase6 live GO until actual day-by-day early adaptive selection, binding source as-of PRE, receiver deployment/ingest, budget/rights, and independent signoff. One positive paid micro-test would show a tested transport path works once but not estimate population capture/reliability.

No paid actions, provider subscription CREATE/DELETE, content access, database mutation, migrations, or production Replit deployment occurred as a result of this checkpoint.
