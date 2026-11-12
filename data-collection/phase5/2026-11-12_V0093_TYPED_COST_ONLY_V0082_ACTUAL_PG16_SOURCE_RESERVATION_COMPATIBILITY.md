# Phase 5 — Nov 12 V0093 staged V0082 **typed** cost ceiling, no fake future airport grid

**Status: STAGED ADDITIVE SQL ONLY; NOT INSTALLED ON REAL NEON. Science FREEZE HOLD / paid Phase6 GO NO.** This document follows merged #603–#606. The existing V0079–V0092 scripts are already live inert and must **not** be reinstalled.

## Actual correctness conflict, reproduced and fixed in a disposable database

Installed V0082 has two mutually dependent rules: its prelaunch budget writer requires a fully signed 31-day real-ICAO Stage22 source query grid, even though **21 ordinary-day airport identities must not be chosen until prospectively due**, while its live physical GET trigger demands **all signed same-UTC-date requests must exactly consume the entire planned FIDS BASE and SPLIT category ceiling**. Source budget accounting and a prospective selection process cannot both satisfy that equality without either inventing tomorrow's sites or pretending to spend an unspent budget. This is not a reason to relax per-request identity or physical spending.

The new **staged** [V0093 SQL](../../migrations/staged/V0093__phase5_v0082_typed_cost_only_upper_bound_inert_v39.sql) adds exactly two fields to the existing V0082 release record:
- `budget_release_mode = EXACT_SOURCE_GRID` (existing original semantics, **default**): a true full request-grid SHA is mandatory, cost-only SHA must be NULL; existing exact equality of counted mapped signed requests to planned BASE/SPLIT units is retained.
- `budget_release_mode = COST_UPPER_BOUND`: request-grid SHA MUST be NULL (no fabricated signed 21-day grid), cost-only seven-category envelope SHA MUST be present, and `2×` mapped signed prospective requests on a real physical UTC date may be **less than or equal to** that date's frozen BASE/SPLIT budget. Date/manifest, seven category totals, cycle caps, exact V0082 real exposure range and partition, V0079 signed four-slot early draw and rights/clock, durable prearm and immutable per-attempt +2 debit are unchanged.

**For both modes**, a future physical query still needs a non-null exact matching V0082 query-partition row for **every** currently prepared query on that date, with the right manifest and previously reviewed provider range. Neither mode makes an unsigned airport or wrong source partition eligible. Zero actual source means an **unused** budget, not a valid paid request or a recorded PRE. Bad category/cycle planning, overspending and duplicated reservation remain HOLD.

The V0093 SQL is a single SERIALIZABLE transaction with a refusal on wrong PG database or PG version, existing source/query/GET/release rows, or enabled Phase6 authorization. It **replaces the function definition in place** under its existing V0082 trigger; it does NOT remove triggers, create or modify worker roles, mutate installed V0087–V0092 schemas, call provider HTTP, install anything remotely, or flip B0062 auth. Applying this SQL to real Neon is **not authorized by merging a PR**.

## Real PG16 validation, not a simulation of production quota

The new [PG16 CI](../../.github/workflows/phase5-v0093-typed-cost-only-pg16-no-provider.yml) creates **two independent disposable PostgreSQL 16 databases** (one for each job, each called local `v39_ci` with no shared production credentials):
1. **COST_UPPER_BOUND**: claims a typed cost-only seven-category release, refuses supplying a fictional simultaneous exact request-grid SHA, prepares real V0079/V0080 synthetic signed queries under 2 units/GET, leaves some BASE/SPLIT units intentionally unspent and proves both irreversible 2-unit source debits succeed; rejects missing categories/caps, invalid exact source range, repeated GET and an over-ceiling mapped future query count.
2. **EXACT_SOURCE_GRID**: reruns the original complete V0082 PG16 tests **after** installing V0093 in the disposable database, proving the prior exact-source validation, cycle/charge-date constraints and immutable 2-unit spending are preserved.

Real verified provider maximum FIDS partition range, true account remaining quota/Alert headroom, original content license/TTL and customer ML-use rights, finite independent calendar seed commitment and the 31-day future source population are **not** established by these tests.

## Explicit remaining steps before production

- **Next separate engineering task:** a narrowly restricted typed COST_UPPER_BOUND V0082 category freeze writer must validate independently signed *real* #605 cost-only candidate, rechecked inactive B0062 authorization and all 31 calendar rows, exactly matching V0079 cycle and physical UTC budgets, immutable seven category caps and 7×date row insert. It cannot claim Stage22 request-grid approval or call current exact-source-only writer as-is.
- Actual future per-day V0079 `early_draw_sha256` budgets and exact V0082 source partitions must be written **only after** their real prospective 21-day draws. Build a reviewed input/reconciler to stop over-budget before physical reservation, without backfill.
- Review this V0093 SQL, separately PIN its exact Git blob and production owner role. No use of a generic `psql -f` on the real database until independent approval; do not reinstall preceding migrations.
- Combine genuine source rights, provider range/price, 31-date calendar/treatment seed and current physical UTC budget receipts; commission one-use narrow owners, independent readbacks, a finite Phase5 scientific FREEZE verdict and a **separate** paid Phase6 GO.

**Latest state represented by this PR:** code/test advancement only. Real Neon B0062 and budget cold-start from Nov12 remains **not verified updated**; do not infer staged rows now exist. No Replit Shell command for the user yet.
