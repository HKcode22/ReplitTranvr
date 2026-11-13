# Nov 12 PST / Nov 13 UTC — independent exact B0062/V0093 poststage auditor (NO GO)

**Status:** new candidate, source-only PR. This is **not a live Neon audit of a staged 31-day calendar**, because the production B0062 calendar and seven-category charge-date budgets were genuinely empty at owner snapshot 2026-11-13T04:35:08Z. It neither installs V0093 again nor stages data or contacts any provider.

## What the existing inventory did and did not do

The existing [release inventory](../../scripts/v39_phase5_final_freeze_readonly_release_inventory_once.mjs) already verifies row-count structural coverage: B0062 31 days, V0093 typed release one row, seven REST category caps, seven category rows **per physical UTC charge date**. It intentionally does not authenticate the actual independently reviewed calendar row values, original treatment seeds or individual REST category ceilings against an external signed candidate.

The previous #603 and #608 commit functions compare signed inputs **before** writing, but a successful writer acknowledgement is not an independent fresh-session readback of the committed production state.

## New narrow code, not another staging writer

[`phase5V0093IndependentPostStageReadback_v39.mjs`](../../server/lib/disruption/phase5V0093IndependentPostStageReadback_v39.mjs) exports `inspectP5V0093IndependentExactPostStage(pool,stagingInput,stagingReview,freezeReview)`.

- Independently **recomputes** the #603 exact 31-day B0062 stage packet and #608 typed V0093 seven-category cost plan from **externally supplied, already independently reviewed** original input and review digests. It never derives the expected hashes/costs from DB state.
- Opens a new pool connection and a PostgreSQL **REPEATABLE READ, READ ONLY** transaction; requires real `neondb`, PostgreSQL >=16, primary, and identical session/current user. The supplied production connection must be separately read-only approved; the function does not create credentials.
- Checks one **disabled and unrevoked** authorization row and every exact calendar field across 31 rows: slot/UTC time, treatment shape, 20/5/6 split, predeclared draw seed, region, four matched real airport identities on 10 crossover days, and 21 ordinary days with **NULL** future airport identities.
- Checks one cycle REST cap, every true physical UTC charge date and independently reviewed daily source/other units, typed `COST_UPPER_BOUND` provenance (not a fabricated exact source grid), exactly seven cycle category ceilings and every one of the **seven per-UTC-date** category units with zero physical reservations. Rejects missing/extra/tampered/replayed or activated data.
- Checks source query and physical-attempt surfaces remain zero. It cannot authenticate the independent human/source rights signatures, verify an actual provider balance, establish live PRE/POST, or authorize paid Phase6.
- Returns `INDEPENDENT_EXACT_B0062_V0093_POST_STAGE_READONLY_MATCH_NO_GO` only if all exact comparisons pass. A signature-shaped SHA supplied by the user is not treated as legal-use approval.

## CI reuse — no duplicate collector or migration

The **existing** `phase5-v0093-cost-only-seven-freeze-real-pg16.yml` integration suite now calls the fresh read-only auditor **after** staging the synthetic full 31-day B0062 and V0093 budget on disposable PostgreSQL 16. It uses actual archived B0062 five-pair ICAO/region evidence but **synthetic** dates, seeds, cost account and approvals; never interpret CI as live Neon evidence. It verifies a separate client and explicitly false GO/provenance flags.

## What remains outside this component

1. Current independently reviewed future calendar, 21 ordinary HUB/region cells and 31 separate seeds/treatment commitment; actual paired airport/window passenger support, no retrospective selection.
2. Actual REST provider quota/balance/range/rights/retention and physical UTC seven-category source/other + Alert SEND/STOP reservations, with independent published source-use contract review.
3. Commission two **specific narrow** prelaunch DB logins, exact reviewed SHA-bound one-use #603 B0062 staging and #608 cost-only freeze, no V0079–V0093 reinstall, then pass this **separate** exact readback as well as existing count inventory.
4. One independently adjudicated Phase5 scientific freeze and separately approved paid Phase6 GO before any real prospective SOURCE/PRE/POST operations. Day1 source and actual PRE outcomes cannot be fabricated in prelaunch CI.

**Truth:** V0093 schema independently live verified previously; production calendar/budget still unstaged at last snapshot; this new checker is code only; **Phase5 scientific FREEZE HOLD / paid Phase6 GO NO**.
