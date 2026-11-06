# Gate 5 from first principles — a guided code-reading course

**Source version:** reviewed November 6 WSSS G5A prospective cohort, pinned to `main` commit `66ff4908cbd63a19668485c935da49fc18652654`. **Documentation only.** These lessons never trigger paid collection, grant content rights, change database state or certify a scientific PASS.

## The question the software is trying to answer

> When a traveler asks about a departing flight **at a particular moment**, what information could our system really know **by that moment**, and can we later measure a valid outcome without inventing one when evidence is absent?

The current G5A study is an actual prospective, narrowly scoped **WSSS (Singapore Changi) departure cohort**, not a production-grade prediction model yet. It collects FIDS data *before* scheduled departures at three time horizons, saves timestamped, source-linked PRE snapshots, then uses later FIDS observations for **provider-reported scheduled-departure revisions**. A planned actual-wheels-off or ADS-B feature must not be confused with what this particular workflow does today.

## Suggested reading order

| Module | Question it answers | Principal code |
|---|---|---|
| [01: Count the right things](01-three-captures-forty-eight-rows-twelve-flights.md) | Why 3 / 48 / 12 / 12 are all correct, but count different units | `fidsCensus_v3.ts`, `flight_snapshots` |
| [02: Understand the clocks](02-frozen-t-sampling-and-timelines.md) | Why 4:00, 4:30, 5:00 source GETs, 4:35–5:25 cutoffs, 7:40–8:40 POST | Frozen grid and grid generator |
| [03: GitHub runner and prearm](03-workflows-prearm-and-live-owner-guards.md) | What starts the job, what is YAML, what is a real owner | Workflows and owner |
| [04: Flights, codeshares and normalization](04-fids-data-normalization-and-identity.md) | Why a provider row ≠ a distinct physical operating leg | `fidsCensus_v3.ts` |
| [05: Custody and data-rights clocks](05-atomic-original-bindings-paid-ledger-and-ttl.md) | Database reservation, SHA, original vs normalized row, 23h expiry | V0076/V0077 and atomic source |
| [06: Stage as-of PRE candidates](06-sql-staging-frozen-t-and-source-availability.md) | Why SQL uses CTEs, joins, LATERAL, earliest schedule and latest eligible source | `phase4Gate5ScopedPreStaging_v39.ts` |
| [07: Build and commit PRE correctly](07-pre-builder-transaction-and-nonbackfill.md) | Three-minute writing window, feature missingness, idempotency, DB clock | `preSnapshotBuilder_v3.ts`, writer |
| [08: The real owner, top-to-bottom](08-owner-script-block-by-block.md) | Follow the giant 714-line program as eight smaller functions | G5A owner script |
| [09: POST and outcome semantics](09-post-collector-and-two-hour-watermark.md) | What the POST workflow truly measures and what it cannot measure | POST script |
| [10: Independent audit and verdict](10-independent-audit-and-scientific-boundaries.md) | How the separate auditor checks data, and why green Actions ≠ scientific PASS | Audit script |
| [11: Learn to read this TypeScript/SQL](11-language-reference-call-graph-and-exercises.md) | Imports, types, closures, async, transactions and traced practice | Shared source |

## One picture to keep open

```text
FROZEN GRID (one WSSS airport + one hour of scheduled departures)
    |
    v
GitHub Actions runner, real clock verified
    |
    v
PREPARED -> ACTIVE DB owner for horizon, immutable 3 query slots
    |
    +--> original FIDS GET #0 (and #1, #2 30m apart)
             |
             +--> V0076 irreversible attempt record
             +--> original decoded body, hashed and bound by V0077
             +--> normalized population rows (48 in this run)
             +--> eligible operating identity keys (12 in this run)
                         |
                         v
                per-flight frozen T and PRE cutoff
                         |
                         v
                 one PRE record at each horizon
                         |
                         v
                  later 3 POST FIDS GETs
                         |
                         v
            observable schedule revision or UNKNOWN
                         |
                         v
                independent read-only audit
```

## Facts vs examples: our contract

- **Measured in the user's Nov 6 read-only database audits:** T−24h and T−6h had 12 on-time distinct PRE each; a 04:44 PST T−90m read showed 2 out of 2 *due* cutoffs valid. GH owner logs subsequently showed third T−90m original committed. Later final totals require an actual closeout and readback, not inference.
- **Illustrations:** fictional "Flight A" in these lessons exists only to make the math and code understandable. It is not a real airline/flight ID extracted from private original bytes.
- **Limitations:** these source counts do not certify native identity for every row, lawful extended retention, actual aircraft wheels-off, ADS-B coverage, unbiased world-wide population sampling or scientific Gate 5 PASS.
- **Source preservation:** the first T−24h original use right expired at 04:30 PST Nov 6, *after* its PRE snapshot had been saved. Saved snapshot/hash does not authorize later re-use of expired raw body.

### How to read each lesson

Each starts with the question and relevant file paths, then walks through **blocks** in running order: **inputs → checks → work → writes → output → failure behavior**. Code examples are trimmed excerpts or explicitly marked pseudocode. Find the original function using repository search before drilling into unrelated imports. No need to understand 700 lines at once.

For chronological evidence rather than learning material see the [Nov 6 live checkpoint](../2026-11-06_G5A_WSSS_14Z_LIVE_THREE_HORIZON_CUSTODY_AND_POST_HANDOFF.md) and [issue #293](https://github.com/HKcode22/ReplitTranvr/issues/293).
