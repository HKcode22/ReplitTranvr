# P06/P07/P14 — independent GitHub-side READ-ONLY PostgreSQL snapshot against actual V3.9 schema

Prepared Oct 10, 2026 PDT. **Isolated draft only; no provider traffic, no live production database inspection or mutation, no app deployment, no Cloudflare, no paid 6+6 activation, no new hosting, no merge.**

## Intended scope

The user recalls real AeroDataBox webhooks successfully persisted to Neon/PostgreSQL even when Replit callback health was periodically unreliable. Correct topology: AeroDataBox original HTTPS POST → existing Replit callback (already received) → original raw bytes in Replit App Storage + V3.9 SQL. Direct PostgreSQL from GitHub Actions may remain reachable independently of unhealthy Replit HTTP **when the DB itself and credentials/network are available**. It is an independent forensic/health **observer, not a primary or backup AeroDataBox HTTPS receiver**. It cannot discover lost notifications that never arrived or exact external provider billed sends, and cannot validate published actual build SHA.

A 6+6 proposed health-check watchdog and scientific partial/censored interpretation must use **independently verified original sender attempts and per-item credits**, not mere SQL success/GET recovery. This observer cannot substitute for that missing upstream source.

## Actual implementation and proof

`scripts/v39_phase2g_independent_pg_delivery_readonly_observer.ts` now exports `readReadOnlyPgSnapshotV39(reader,args)` using the same V3.9 session/delivery schema and eight immutable 15-minute UTC bins as receiver code, including `pg_postmaster_start_time()` lifecycle, session `callback_requests_seen`, `callback_success_2xx`, `callback_failures`, all receiver delivery rows and notification item counts, locally claimed costs, per-bin counts and count of received records **outside** the exact frozen 120m time window. The CLI wraps it in `BEGIN TRANSACTION READ ONLY` and short SQL timeout, prints only sanitized aggregations plus hashed session identifier, never a URL/secret/body. Runtime absent after UNLOGGED reset is explicitly `runtimeSessionMissing:true`, **not** a zero-provider-sends finding; external missing credits and flight items remain `null`.

P14 additional accounting guard: two separate counts for **missing explicit per-attempt cost claims** and **cost/notification item disagreement**, and explicit `locallyClaimedCreditReconciliationNeedsReview`; SQL cost total remains exact NUMERIC, never rounded via `::bigint` to conceal fractional/invalid claimed delivery credits. The observer explicitly labels these as **database-local credits**, not source-authenticated AeroDataBox billing; the historical 260 external / 259 internal discrepancy is STILL UNRESOLVED.

The disposable real-PostgreSQL integration suite extends `tests/phase2g_p2g24_actual_postgres_persistence_integration_v39.test.ts` and exercises: the actual V3.9 persistence code -> LOGGED blob reference/UNLOGGED committed delivery -> direct read-only snapshot -> mutation rejected by PostgreSQL SQLSTATE 25006; original 8 15m bins and one out-of-window row preserved/distinguished; missing UNLOGGED runtime session not mistaken for no billable sends; and a fractional `delivery_attempt_cost_credits=0.5` anomaly cannot be rounded to a matching integer. The offline pure observer tests also separately check mismatch/missing credit claims and no false external source completeness.

## Residual blockers / release requirements

- This verifies our **disposable schema fixture matching production V3.9 source**, not live production DB or its exact schema release. Need permission and read-only credential/network test before operator relies on it.
- Need real GitHub-owner **read-only live** integration with cryptographically frozen session/window/source/build and load/cost bounds; no CI job or always-on service may silently use production secrets or spend credits.
- DB-only observer remains blind to original AeroDataBox paid POSTs rejected during a Replit outage, true sender original UTC/wire, delivery retry billing and raw App Storage permission/readback across the proposed 2-3 Replit accounts.
- Unknown provider 260/259 origin, correlated Replit outage, UNLOGGED crash reconstruction and full hosted no-credit 120-minute failure rehearsal still gate actual paid six-primary +six-emergency policy.
- Keep original frozen F.8 data and all historical failed/censored labels. A future prospectively approved *censored partial-data* question is distinct from original complete-science PASS.

**Paid YSSY remains NO-GO.** Current actual supervisor still uses original three-health-failure default and refuses six-plus-six mode prelaunch absent external authenticated sender witness. No user approval to mutate source, deploy Replit, launch provider or create new paid resources implied by this report.
