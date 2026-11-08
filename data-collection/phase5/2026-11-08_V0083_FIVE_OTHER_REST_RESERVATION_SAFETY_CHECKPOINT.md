# Phase 5 — V0083 five non-BASE/SPLIT REST charges, source-bound retry (STAGED, INERT)

**Engineering date:** 2026-11-07 Pacific / 2026-11-08 UTC. [PR #475](https://github.com/HKcode22/ReplitTranvr/pull/475). This document is a technical/checkpoint companion to [Plan f.8 Amendment C](../plans/V3.9_DataCollectPlan_f.8_Amendment_C_20261107_Segmented_Source_Coverage.md), [V0082 budget inputs](2026-11-08_STAGE22_TO_V0082_SIGNED_SEVEN_REST_INPUT_FREEZE_CHECKPOINT.md), and [SQL database table guide](PHASE5_DATABASE_ATLAS_SQL_TABLES_AND_RELATIONSHIPS_20261108.md). **Tested SQL source alone does not mean V0083 was deployed on the production Neon database.** No future provider-account rights, paid requests, observed flights, POST, PRE, or Phase6 GO are implied.

## The remaining accounting gap this closes in engineering code

V0082 records and physically reserves two source categories, FIDS_BASE and FIDS_SPLIT, as an irreversible **+2 REST API-unit increment** within V0079's genuine FIDS GET reservation transaction. Its original budget-row immutability trigger deliberately rejected *all* counter updates for five additional REST categories; simply inserting planned amounts for them was NOT an actual physical provider-GET debit.

**V0083** is a **staged additive migration** `migrations/staged/V0083__phase5_nonfids_five_category_physical_rest_reservation_v39.sql` that provides a **separate reserved physical attempt** for those five without changing the previously installed V0079 source reservation function or inventing paid HTTP activity.

### Exactly two new relational tables

| Table | Grain / primary key | Why it exists |
|---|---|---|
| `clean.phase5_other_rest_reviewed_call_v39` | one immutable externally approved **future physical request**, keyed by `request_sha256` | Frozen manifest, category, actual UTC charge date, start/latest dispatch, reviewed rights and cost SHA, immutable request-context SHA, signed source-budget SHA, **exact expected units**, GitHub run ID; for FIDS_RETRY, mandatory reference to original V0079 `query_digest` |
| `clean.phase5_other_rest_physical_reservation_v39` | one immutable reservation for that request, keyed by `reservation_sha256` and UNIQUE `request_sha256` | Real DB clock, actual UTC billing day, approved units, independent GitHub run/rights/price SHA, the **prior category counter**, and `txid_current()` for same-transaction provenance. No refund on failure or ambiguous GET |

A `FOREIGN KEY` means the source-linked retry must refer to a genuine saved approved V0079 query, not an arbitrary caller string. It is NOT enough by itself; the reservation function independently checks that the **first irreversible V0079 physical attempt exists**, with matching GitHub run, still-active original query, no already-bound original, exact rights and cutoff, and one V0082 source partition mapping. **A generic validation/diagnostic call cannot be misrepresented as FIDS_RETRY.**

### The exact SQL transaction, in order

```text
externally reviewed approved future GET (unchangeable)
     |
     |  only a separately reviewed restricted NOLOGIN worker may call
     V
SECURITY DEFINER reserve_phase5_other_rest_once_v39(...)
     | 1. lock V0079 cycle budget; check live B0062 enabled auth
     | 2. lock reviewed request; check manifest/right/use/price+GitHub run
     | 3. verify actual DB UTC date and prospective planned/expiry clocks
     | 4. FIDS_RETRY only: first real V0079 physical attempt and no original
     | 5. lock V0079 physical-UTC day and V0082 category; 7 day/cycle caps
     | 6. INSERT immutable physical attempt once
     | 7. UPDATE matching V0082 physically_reserved_units by exact approved units
     |    and verify inserted attempt has same txid + prior counter
     V
COMMIT before external HTTP (actual provider GET is separate/not here)

Any error after step 6 --> whole transaction ROLLBACK: 0 attempt, 0 debit.
```

**Why don't we increment V0079's cycle/day `physically_reserved_units` for these other charges?** V0079 already holds the frozen **whole other-category reservation envelope** in `other_category_reserved_units`; it increments its physical counter for FIDS SOURCE BASE/SPLIT. Adding other REST's actual spent units into both fields would **double-count** against the same project credit cap. Instead V0083 updates each frozen V0082 category's `physically_reserved_units` while V0079 continues to reserve the full other-category envelope. This is mathematically conservative: actual other spend must never exceed the frozen other-category total and each exact category-day/cycle cap. A failed paid request is still reserved as spent for safety; no refund claim is made.

### V0082 immutability remains strict

V0083 `CREATE OR REPLACE FUNCTION` modifies **only** the existing V0082 category-immutability **trigger body** (it does not overwrite historical V0079 migrations or their installed function). For BASE/SPLIT, the prior `+2` rule is retained. For the other five, a counter change is admitted only if a matching physical attempt row was inserted in **the same PostgreSQL transaction** (`reserved_txid=txid_current()`), with the same manifest/date/category/approved amount and **exact previously reserved units**. The previous-units condition prevents reusing a single attempt to increment the category twice, even within the same transaction. Input budgets/planned units/category identities remain immutable and DELETE is always refused.

### Why a separate scoped role matters

The function defaults to **no PUBLIC EXECUTE**, no raw-flights table grant, no invocation by the four already commissioned SOURCE/PREPARE/PRE/WITNESS roles, and **no credentials / membership / production installer** provided by this PR. When eventually independently reviewed and installed, only a distinct NOLOGIN role with a separately reviewed SET-only GitHub LOGIN should receive EXECUTE. The immutable approved-call writer must also be a **different** independent role; a REST worker must never approve its own price, request, or rights. A SHA and application boolean are not provider approval.

### Safety test and scientific limitations

Dedicated real disposable PostgreSQL 16 (authentic B0062+V0079+V0082+V0083) CI uses **only fabricated test** signatures, requests, a local test login and fake prices:
- LOGIN without SET-only permission cannot call the SECURITY DEFINER function or modify raw tables; after SET ROLE, it can invoke only the guarded reservation function.
- altered price/rights SHA and request/reservation identity REFUSE before debit.
- FIDS_RETRY with an approved source query but **without a previously committed real V0079 attempt** refuses, even if category budget is available.
- injected AFTER UPDATE failure rolls back both an inserted actual-attempt receipt and the V0082 category debit.
- four independently priced validation/outcome/history/diagnostic GETs can each reserve once, correctly update their **separate** frozen UTC category counter; FIDS_RETRY remains at zero until valid failed-source evidence exists. Replay and category overspend refuse.
- direct arbitrary non-FIDS counter UPDATE refuses, frozen plan retuning refuses, and the old FIDS_BASE +2 immutability branch remains valid (tested inside a rolled-back CI-only transaction).
- no actual HTTP, provider charges, original response, PRE/POST or science PASS.

**Exact-head GitHub Actions and full V3.9 Offline Safety must pass before merge.** If real PostgreSQL tests expose a contradiction, repair and re-run; never bypass budget or rights gates.

## Still missing after code-level accounting

Actual V0082 and V0083 **production** schema/strict-role installation and authorizing/funding real non-FIDS category request plans; four-airport eligible/crossover 31-day calendar and actual source entitlement/latency, nonexpired licensed AeroDataBox Contents #300, measured REST price by endpoint and retained normalized rows, separately real Alert SEND credits, true early GH-only source PRE/witness/POST and receiver/STOP evidence, independent adopted first-cycle scientific target/Amendment D, one Phase5 scientific FREEZE, and separate Phase6 paid GO. This PR does not create a real paid-dispatch worker or schedule. User approval of paid actions does not substitute for provider Contents permission.

**Phase5 scientific FREEZE = HOLD; Phase6 paid GO = NO.**
