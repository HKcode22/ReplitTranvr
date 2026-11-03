# Phase 4 Gate 5 — private V0077 schema installation preparation

**Date:** 2026-11-02 Pacific / 2026-11-03 UTC. **Engineering-only:** not a paid source launch or scientific-PASS. Binding Plan f.8 §§5–7,16–17 and locked Log §1.9 remain unchanged. The source owner has set a three-day Gate5 engineering completion priority; real postflight science cannot be faked.

## Exact incremental work

Existing V0076 metadata-ledger tables were previously installed in production (restricted roles independently checked), while **V0077 original-response binding remained STAGED, only verified against disposable PostgreSQL 16**. The new `scripts/v39_phase4_gate5_v0077_metadata_only_installer.ts` provides a deliberately narrow **one-time metadata table/trigger installer**:

- Pins **unmodified** staged `V0077__phase4_gate5_original_fids_reservation_binding_v39.sql` to exact Git blob `6783468fccf32de571e7ea77671db7370d9d87a4`, syntax checks for required immutable foreign keys, original-response SHA, rights hash/expiry guard, and no `GRANT`/unrelated content table modification.
- Requires intentional one-shot metadata-only operator wording and exact blob; production `DATABASE_URL` and **distinct** restricted `V39_DATABASE_RUNTIME_URL` roles must point to same PG16 science DB. No source/license changes, original-provider Content bytes, flight identities, HTTP provider request or PRE.
- In **read-only preflights** independently checks exact V0076 four tables and reservation function are present, original FIDS table available, privileged role has `CREATE` on `clean`, restricted worker only `USAGE`, and **no partial or prior V0077 installation**.
- In one **SERIALIZABLE** DDL-only transaction, checks again under advisory lock, executes unmodified staged V0077 metadata DDL, verifies new table empty plus no runtime-role SELECT/INSERT/UPDATE/DELETE or EXECUTE grants on new trigger functions, then commits. Any failure rolls back. A repeat attempt must refuse; no migration auto-applies on app boot.
- A separate [real disposable PostgreSQL 16 workflow](../../.github/workflows/phase4-gate5-v0077-metadata-installer-disposable-pg16.yml) tests the exact installer with a synthetic restricted role, checks ACL and empty ledger, attempts forbidden replay and confirms **no paid provider**. The GitHub workflow never uses production database credentials.
- Offline cases in `tests/phase4_gate5_v0077_private_installer_v39.test.ts` pin exact blob and reject GRANT/modified source/incorrect role/duplicate install/Phase6 armed.

**Current evidence:** This checkpoint is a proposed PR until exact-head checks are green and merged. **Not installed in production by creating this file, not granted to an Actions writer, not a license or source-T certificate.** No commands are required from the owner until the real disposable CI and source/ACL review are complete.

## Exact critical work still needed to scientifically pass Gate5

1. Independently resolve permitted AeroDataBox original/normalized Content use and source-retention/expiry scope; verify selected native T and distinguish actual-only from estimated/proxy outcomes, recording unknowns rather than chasing indefinite provider emails.
2. Review **separate role-specific V0077 runtime and read-only auditor grants** and a future frozen GitHub-only source owner, including V0076 nonrefundable paid-attempt budget/STOP. A schema install by itself grants nobody write permission.
3. Capture a **new real prospective** 3×3 original source cohort under paid/retention authorization and bind genuine FIDS original responses to the physical ledger/unique operating-leg population. Do not rerun the completed Nov2 source-only pilot as a substitute.
4. Wire existing scoped PRE writer **before cutoffs** for every eligible physical operating flight, with per-horizon source-preexpiry original→PRE readback; independent webhook inside/known-late/outside-observed-frame/unresolved/duplicate audit and POST/censored labels.
5. Validate required numerical denominators, coverage-age, strata, AIRBORNE nested flight funnel, selection bias and partial-ID uncertainty, source-use TTL/billing, and independent final science decision. Full Gate5 PASS or measured-limitation PASS only from real evidence. Phase5 FREEZE and Phase6 GO are separate downstream gates.

No Cloudflare or Replit AI Agent, no manual time-critical shell, no new live source and no removal of original Plan/Log constraints.
