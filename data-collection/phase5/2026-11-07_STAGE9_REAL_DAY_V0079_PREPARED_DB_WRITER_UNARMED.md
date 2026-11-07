# Phase5 Stage9 — reviewed same-day V0079 PREPARED rows, DB-only adapter

**Status November 7, 2026:** source-only proposal; **not runnable from GitHub Actions**, not deployed, no Neon production migration or grants installed, no AeroDataBox or Alert request, no actual flight-level PRE. Built after [Stage8](2026-11-07_STAGE8_EXACT_DAILY_V0079_PREPARED_QUERY_PROPOSALS.md), which itself is an offline proposal, not a right to bill.

`phase5Stage9V0079CommittedDayPrepare_v39.ts` is a deliberately **export-only** adapter without any CLI, command-line process or GitHub paid/scheduled workflow. A future approved and correctly isolated GitHub source owner may call it using independently reviewed final freeze, retention/source-use rights, manifest/query/proposal/UTC Day0 charge-budget hashes, and dedicated `phase5_fids_prepare_*` role. It checks that the actual Postgres identity is `neondb`, primary, read-write transaction but the restricted role is **INSERT-only on the new V0079 exact-query ledger**, with no UPDATE or DELETE privileges. If V0079 is not installed, it fails closed. The user’s personal authorization to spend does not by itself establish lawful ML retention rights.

The adapter uses one SERIALIZABLE transaction, exact frozen `clean.adb_phase6_authorization`, saved calendar hashes, true four persisted adaptive airport-draw rows and canonical selected SHA, service/request clocks before the first prospective T24 GET, exact 12 slot×horizon rows/ICAOs and deterministic Stage8 digests, per-service-day and cycle ceilings and frozen **actual UTC physical charge day including Day0**, and full absence of prior day query rows. It admits only `github_run_id='00000'`, `PREPARED`, one physical attempt priced 2 units. It atomically inserts exactly 12 V0079 query rows, or rolls back. It never mutates budget counters: those are only reserved by a *future* charged GET under the V0079 function. Ambiguous COMMIT must be independently read back, never blindly re-run. It does not create V0080 prearm rows or pretend a future GitHub job ID is already known.

The test harness uses only a simulated PostgreSQL client and no secrets: asserts 12 inserts in one transaction, no provider GET, rejects unreviewed rights, hash tampering, ordinary owner DB role, changed saved REGIONAL airport, missed cutoff, already-present partial day rows and Day0 budget mismatch. The separate isolated CI workflow never executes a write.

**Future release needs real work:** reviewed rights/retention and signed final freeze; V0079/V0080 installed through independently reviewed narrow-role migration and live ACL verification; first real prospective one-day four-airport saved draw; exact source GET/decoded original and true on-time flight-level PRE writer; real POST / AIRBORNE actual labels; independent QA and 31-day representativeness audit. Full Phase4 original Gate5 science HOLD, Phase5 final FREEZE HOLD, Phase6 paid NO-GO.

## Stage9 least-privilege PostgreSQL 16 repair (Nov 7)
The exact Stage9 source previously used `SELECT ... FOR SHARE` on the
saved calendar/airport draw/budgets and `SELECT ... FOR UPDATE` on the query
ledger. PostgreSQL 16 requires UPDATE privilege even for those read locks,
contradicting the required restricted SELECT+INSERT-only writer role. The
repaired reader queries use plain SELECT under the existing SERIALIZABLE
transaction, transaction-scoped advisory day lock, unique query keys and
no-blind-retry policy. No UPDATE/DELETE grant was added. Mock CI now rejects
row-locking SELECTs; an isolated real PostgreSQL 16 workflow demonstrates
that the role can select, insert and RETURNING while UPDATE/DELETE and
row-locking SELECT are unavailable. This is not production installation,
source rights, a real 12-row source commit, a GitHub timer or Phase6 GO.
