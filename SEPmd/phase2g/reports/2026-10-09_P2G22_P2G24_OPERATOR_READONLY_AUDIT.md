# P2G22–P2G24 operator read-only audit: 260/259 reconciled history and 30 verified P2G24 objects

**Evidence classification:** operator-supplied Replit Shell stdout from 2026-10-09 approximately 23:21 UTC. This is a **read-only production query and object download performed by the operator**, not an independently executed GitHub Action or assistant-issued server request. Raw provider payloads and storage credentials are intentionally not included here.

**Safety:** Script reported `PROVIDER_CALLS=0`, `DATABASE_MUTATIONS=0`, `OBJECT_STORAGE_MUTATIONS=0`. Actual source of script was reproduced in the conversation, and SQL used `BEGIN TRANSACTION READ ONLY` plus `ROLLBACK`. The object access path used `ReplitProviderBlobStoreV39.downloadBytes()`, SHA-256 and byte-length comparisons without delete/upload. This report records what the output supports; it is not a cryptographic, independently signed attestation of operator execution.

## Result A: P2G22 durable reconciliation, exact production record

Join: `clean.adb_anchor_probe` to `clean.adb_probe_reconciliation_evidence`, probe `16`, budget `P2G-S1-20261006-21`, ICAO `YSSY`:

| Field | Value |
|---|---|
| `status` | `failed` |
| `duration_censored` | `false` |
| `stop_reason` | `external_internal_delivery_gap` |
| `reconciliation_status`, `evidence_status` | `DELIVERY_GAP` |
| `external_spend_credits` | **260** |
| `internal_received_credits` | **259** |
| `delivery_gap_credits` | **1** |
| `delivery_completeness` | `0.9961538461538462` |
| `callback_requests_seen` | 56 |
| `callback_success_2xx` | 56 |
| `callback_failures` | 0 |

**Significance:** The 260/259 numbers are now confirmed by the actual logged scientific PostgreSQL reconciliation row, rather than only by existing historical regression fixtures. This validates the specific *failure accounting and refusal*, **not** the reason for one externally spent credit lacking internal matching credit. In particular, 56 successes does not prove all externally attempted provider callbacks reached the server; this must be corroborated with provider delivery-attempt telemetry and receipt identities. Do not modify the ledger or assign MATCH by tolerance.

## Result B: P2G23 and P2G24 unresolved owner failures preserved

| Probe | Budget | Durable status | Censored | Stop reason | Reconciliation |
|---|---|---|---|---|---|
| 17 | `P2G-S1-20261008-22` | `failed` | true | `supervisor_child_exit_recovered` | `UNRESOLVED` |
| 18 | `P2G-S1-20261009-23` | `failed` | true | `supervisor_child_exit_recovered` | `UNRESOLVED` |

Both joined reconciliation rows show null evidence fields; **absence of a durable MATCH is not itself a zero-credit result**. Remain censored and blocked.

## Result C: P2G24 referenced raw objects verified

- Exact session `6267293e-75a0-42a7-b977-89543f200ebc`, probe `18`, budget `P2G-S1-20261009-23`, ICAO `YSSY`.
- Durable probe `failed` / `duration_censored=true` / `reconciliation_status=UNRESOLVED` / `runtime_cleanup_verified_at_utc=NULL` confirmed before object reads.
- Exactly **30** `clean.provider_content_blob_ref` webhook references were present, with no verified deletion; all passed object-storage kind, blob-contract version, raw provider content class, SHA-256 field shape.
- **30/30 object downloads successful, 30/30 SHA-256 and declared-byte-length matches**, **0** mismatches, **0** failed downloads.
- Earliest reference expiry: **2026-10-16T04:02:22.780Z**. This is a reference retention timestamp; the audit does not alter provider retention or certify perpetual preservation.

**Correct conclusion:** All **referenced** P2G24 raw webhook objects were intact at the time of the read-only audit. This does not prove that the 30 objects cover every externally billed delivery, that all webhook retries were captured, or that 132 runtime item rows can be reconstructed exactly. The UNLOGGED tables were found empty in an earlier audit. Do not set P2G24 to completed or synthesize missing reconciliation.

**Important preservation:** Hash verification only *reads* objects; it does not extend their 168-hour retention. Any preservation beyond the existing deadline must be reviewed for the project's approved data-retention/privacy constraints, rather than copying raw provider content to GitHub.

## Result D: development workspace and DB wake/restart signals (not P2G24 root cause)

- Operator source audit at `2026-10-09T23:21:04Z`: development container PID1 started **22:58:34 UTC**, uptime ~22m. Previous read-only audit earlier the same day had PID1 start **08:29:24 UTC**. Hence a **development-container replacement/restart occurred between those checks**. No cause/timestamp of termination supplied; no evidence links it directly to the published P2G24 callback failure at 04:58 UTC.
- Previous local observer folder `$HOME/p2g24-evidence` was missing by this check; its earlier monitoring process disappeared at +9.89m while previous host PID1 persisted. The later workspace replacement may explain loss of **local file persistence**, but cannot explain a process death many hours earlier without more logs.
- Local repo branch `phase2g-p2g24-manual-receiver-repair-20261009`; HEAD `1cc213aadb28cd568d6fc4182d7fa927ca6753c6`, whose tracked tree matched tested repair parent `5de44ba...` at the previous clean-tree audit.
- **New `.replit` uncommitted modification exists.** Do not reset, restore, commit or republish; investigate sanitized diff to determine if Replit runtime settings/start command/ports changed. Current shell process owners include `tsx server/phase2gCallbackOnly.ts` and its Node child, which describes development process and is **not** a published Autoscale instance.
- On DB connection `2026-10-09T23:21:30.357Z`, `pg_postmaster_start_time=2026-10-09T23:21:29.289Z`—about 1.07s old. This is consistent with autosuspend/wake *or restart*, not conclusive crash or historical cause. The earlier postmaster start was about a second before the earlier read-only query as well. Need provider-side DB lifecycle documentation/monitoring to classify.

## Current disposition / Phase6 gates

- [x] P2G22 260/259 durable ledger verified via exact read-only production query; **causal origin remains open**.
- [x] P2G24 30/30 referenced object bytes and SHA-256 verified; **full external delivery completeness remains open**.
- [x] Failed/censored statuses and non-MATCH outcomes remained unmodified.
- [ ] Get platform reason for P2G24 published instance change ~2026-10-09 04:58:21 UTC and historical 404/readiness probe failures.
- [ ] Inspect local changed `.replit` safely and prevent accidental republish / original full app config drift.
- [ ] Complete sparse/idle-to-wake GitHub observer [run #37993757772](https://github.com/HKcode22/ReplitTranvr/actions/runs/37993757772); do not call passed before final results.
- [ ] Reproduce a one-credit gap using mock provider delivery ledger and prove end-to-end retry/idempotency (not only the classifier).
- [ ] Confirm realistic webhook signed ingest with durable object storage, exact database acknowledgment behavior, and restart safety in a *disposable controlled fixture*, no paid subscription.
- [ ] Independently prove actual deployment artifact build hash (runtime reported HEAD may come from `V39_DEPLOYED_GIT_HEAD` environment).

**NO-GO for another paid YSSY or Phase6 collection until gates are evidenced.**

Linked evidence: [P2G22 actual failure and prior regression](2026-10-09_P2G22_DELIVERY_GAP_ROOT_CAUSE_CLASS.md); [P2G24 incident report](2026-10-09_P2G24_CALLBACK_INCIDENT_AND_130M_OBSERVATION.md); [Phase6 gates](../P2G24_CALLBACK_HARDENING_AND_PHASE6_GATES_20261009.md).
