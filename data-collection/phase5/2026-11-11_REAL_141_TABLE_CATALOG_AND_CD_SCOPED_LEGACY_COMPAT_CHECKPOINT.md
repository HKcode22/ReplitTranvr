# November 11, 2026 — 141-table real catalog, existing PRE actors and V0086 scoped C+D compatibility

> Source of truth: GitHub `main` `40815cdbbf70acc936887fed262746c50b9c7ade` before this review branch. Owner ran the exact pinned private read-only catalog script with no provider calls or SQL writes. **Scientific Phase5 FREEZE HOLD / Phase6 paid GO NO**. This document does not authorize running V0084/V0085/V0086 on production.

## 1. Real owner results, distinct from hypotheses

Owner-pasted result: `v39.phase5.cd-all-user-schemas-metadata-only-readonly.v1`, observed **2026-11-11T21:47:55.403Z**, PostgreSQL **16**, **141 tables across six discoverable user schemas**. Those six include normal application data and vendor-managed schemas; their inventory is not a justification to modify them. Catalog-only scan completed with **0 provider requests and 0 database writes**. The echoed pasted Shell command showed some visually malformed text, but the **pinned hash-verification success marker and final JSON success marker** demonstrate that the reviewed Node script executed. The `pg-connection-string` SSL warning is a driver compatibility notice, not a reported TLS failure or authorization to weaken SSL.

Only task-like table found by the bounded classifier: `clean.phase4_g5_fids_physical_owner_v39`. Columns include `owner_digest`, `manifest_sha256`, `horizon`, `github_run_id`, `hard_owner_expires_at_utc` and `state`. Unique constraints are by **owner/manifest** and **manifest/horizon**, not canonical **flight/horizon**. It is an **owner/supervisor ledger** for prior Phase4, not an interchangeable Phase6 per-flight PRE queue. **No reusable per-flight C+D queue was confirmed.** Because the catalog is metadata-only, no queue row content/actor authorization was proven and this is not a formal complete data-use audit.

`clean.flight_snapshots` is still unique only on `(flight_instance_id,horizon,prediction_cutoff_utc)`, allowing a changed-native-T new cutoff as a potential duplicate identity. Preserve the original Stage14 source/clock protections, plus an immutable C+D flight/horizon registration boundary.

Existing table trigger: **`trg_flight_snapshots_population_member`**, function `clean.attach_population_member_to_snapshot`, enabled. Do **not** replace or disable it.

Snapshot INSERT-capable roles include `p4_g5_g5a_owner_20261103`, the Phase5 restricted NOLOGIN writer role `phase5_fids_pre_writer_prod_20261107`, and multiple application/runtime/administrative roles (`travnr_runtime`, `travnr_v39_runtime_recovery1`, `neondb_owner`, provider/service privileges). Some can UPDATE/DELETE as well; `neondb_owner` and privileged administrators can manage triggers. The user catalog is a **roles grant report, not a mapping of which specific workloads currently perform INSERTs**. No production privilege revocation is approved until every legitimate historical writer is identified.

## 2. Non-breaking design selection

**Rejected:** installing the current experimental **V0085 blanket PRE trigger** unchanged in shared production `clean.flight_snapshots`. It would reject historic, non-C+D PRE writes, because its CI role check is deliberately hard-coded and uses `session_user`. Production Phase5 writer NOLOGIN role is used through a separate login/SET ROLE arrangement: role identity and session identity are different concepts.

**Chosen for disposable compatibility experiment only:** `V0086__phase5_cd_disposable_scoped_legacy_compatible_pre_trigger_v39.sql` enhances the already tested V0084/V0085 test trigger. It scopes enrollment at the **flight level**: if *any* C+D task exists for a flight, **all horizons** of that flight are protected, including not-yet-enqueued T−90m/T−6h. For a currently enrolled flight and exact horizon, the trigger requires the same transaction’s admission receipt and signed/source-bound Stage14 guards; a shifted cutoff cannot escape the scope. A completely unrelated, unregistered flight has its existing INSERT path, constraints and population-member trigger preserved. The trigger in CI has an explicit CI session role and a privileged temporary function owner; **neither is production-compatible**. None of V0084/85/86 is installed in live Neon.

An application/actor can still try to invent a different flight identity to evade enrollment. The real production design **must** ensure immutable canonical identity from signed SOURCE, bounded queue registration timing, independent provider-original binding and a separate Phase6-only writer login/credential boundary. Role-based checks alone do not authenticate legal rights or physical flight labels. The trigger is an additional defense, not the sole source of admission trust.

### New test contract

- Keep original real Stage14 SERIALIZABLE SQL writer and earlier one-flight/1–8-lane CI code; do not add a duplicate PRE writer.
- Run STAGED V0084 + V0085 + V0086 on isolated `postgres:16` only, with no provider/API secrets.
- A restricted *legacy* user with INSERT-only snapshots rights can write a synthetic **unenrolled** flight under pre-existing table constraints, without C+D receipt.
- The same legacy user cannot write a protected enrolled C+D flight.
- A Phase5 PRE writer cannot insert a protected flight at a shifted cutoff or T−90m just because no task has been enqueued for that horizon.
- Real Stage14 still writes the 32 approved synthetic source-bound flight rows and acknowledges post-commit readback; stale owner/reclaimer tests remain.
- **Status at author time:** PR and tests are being prepared; no claims of CI pass until the exact-head checks are seen.

## 3. Why there is still a separate production GO gate

Even if the compatibility test passes, the real shared table contains varied historical owners, INSERT roles, and pre-existing triggers. **No one should install any experimental staged migration into production.** A future separately approved migration needs a dedicated least-privilege NOLOGIN function owner, verified caller's effective role and session identity, rigorously reviewed grants, rollback, historical-writer compatibility, rules for pre-existing PRE and changed native T, and independent security review before any live activation. An admin with ownership/trigger rights can always bypass a user-level trigger, so the stronger production boundary is **separation of duties, narrowly held credentials, immutable source registry and protected transaction state**.

## 4. Phase5/6 continuation, prioritized without over-constraining the science

1. If V0086 CI succeeds, settle the Phase6 C+D minimal schema/actor design (no duplicate queue), then build GitHub Actions rolling worker controller, heartbeat, watchdog, durable source/POST/STOP and uncertain-commit reconciliation. It must **not** depend on a human waking overnight.
2. Source-side feature bridge: current Stage14 passes `features:[]` into `preSnapshotBuilder_v3.ts`; reuse the existing Phase4 weather as-of selector, `historicalFeatureStore_v3.ts`, Gate05 FIDS temporal join, and Phase5 Amendment E issue-time selector rather than duplicating collection. Real source/use rights must be verified before passing data into Stage14.
3. Use **ONE canonical Amendment E**: T−6h actual departure delay minutes **candidate**, paired T−90m update, T−24h comparator, separate genuinely AIRBORNE ETA. Do not convert wheels-off proxies from free ADSB.lol into certified gate-out labels; preserve the existing Nov9 ADSB.lol study, free-tier/ODbL limits and no paid airborne provider.
4. Finish source content/derived use, retention/backup and physical labels; independently freeze modest primary/horizon/calendar/budget comparators only when actual evidence exists. Accept bounded missingness and source limitations rather than backfilling retrospective PRE.
5. Phase6 remains paid **NO-GO** until a separate owner/independent approval. Provider quota is only last verified at 2026-11-11T13:34:38Z (60,000 total, 59,968 remaining; 1,830 Alert credits); this metadata read is not a fresh budget/spend check.

The previously reported **141 tables** measure catalog complexity and legacy system reuse, **not** volume of independent flight training examples or a predictive accuracy guarantee.


## 5. Actual first PG16 test and correction (not production)

The first V0086 GitHub Actions **disposable PostgreSQL16** run completed **8/9 tests**, one failure in the synthetic *legacy role* fixture. This was not a C+D admission bypass or flight-source damage: our newly created legacy CI login had direct snapshot INSERT permission but lacked `SELECT` on `clean.flight_population`. The **existing** `clean.attach_population_member_to_snapshot()` trigger executes as an invoker and reads that table. Its error was SQLSTATE **42501, permission denied for table flight_population**. This confirms that a future privilege migration must account for the original trigger's SELECT dependency, rather than disabling it.

The fixture was corrected by granting **SELECT on `clean.flight_population` to the disposable synthetic legacy writer** (not to a real database user). The exact-head rerun `9647d13d8284d2394558c3191320e9ccbe85d594`, [isolated V0086 scoped-compatibility CI job](https://github.com/HKcode22/ReplitTranvr/actions/runs/43107518738/job/130814616717), **PASSED 9/9 tests**, including:

- An unenrolled flight may be INSERTed through the simulated restricted legacy role, with the original population-member trigger left enabled.
- A registered C+D flight cannot be written by that legacy role, cannot bypass a receipt through a shifted native-T cutoff, and cannot bypass through a T−90m horizon not yet registered in the queue.
- True existing Stage14 SQL uses same-transaction lease and admission receipt; 32/32 synthetic source-bound snapshots were saved and verified before cutoff using 1,2,4,8 worker lanes, preserving old source and no-backfill logic.
- Stale generation refusals, lease-row lock blocking of controller reclaim, non-overwrite/unique flight+horizon invariants still pass.

**Measured one CI run only (eight flights per configuration):**

| Lanes | 8-flight batch time | Confirmed 40001 aborted transaction retries |
| ---: | ---: | ---: |
| 1 | 103 ms | 0 |
| 2 | 88 ms | 1 |
| 4 | 142 ms | 3 |
| 8 | 264 ms | 7 |

These are tiny synthetic examples, not production throughput estimates or evidence that two lanes is definitively optimal. The initial 42501 fixture failure is important, preserved here rather than hidden.

**Security boundary still pending:** an admitted task may not be deleted while the flight remains part of the protected cohort; production must protect the queue/tombstone register with ownership/grants, immutable identity, and a reviewed retention policy. Reusing external credentials, privileged owner bypass or dynamically modifying identity are not proven safe by this CI-only trigger. Do not install V0086 on production.
