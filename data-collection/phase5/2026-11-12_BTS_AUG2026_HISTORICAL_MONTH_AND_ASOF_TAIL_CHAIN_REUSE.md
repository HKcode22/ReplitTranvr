# November 12, 2026 — reuse BTS August 2026 month + honest as-of aircraft tail chain

**STATUS: optional additive, NOT a new Phase6 requirement; Phase5 scientific FREEZE HOLD / paid GO NO.**

## The project already has official BTS source verification

Phase4 already implemented a no-cost BTS month downloader, an independent ZIP/hash verifier, a 2-day Actions archive, a strict source-domain guard and a physically matched BTS actual wheels-off research assessor. Existing files:

- Phase4 checkpoint: [Nov 2 BTS verification](../phase4/2026-11-02_GATE5_FREE_BTS_ACTUAL_WHEELSOFF_MONTHLY_SOURCE_VERIFICATION.md)
- Original downloader: [BTS one-off capture](../../scripts/v39_phase4_gate5_free_bts_aug2026_reference_actions.py)
- [Original two-job GitHub Actions workflow](../../.github/workflows/phase4-gate5-free-bts-actual-reference.yml)
- [Existing typed postflight BTS reference](../../server/lib/disruption/phase4Gate5BtsIndependentReference_v39.ts)

Official references: [BTS release info](https://transtats.bts.gov/releaseinfo.asp), [official 2026-08 PREZIP directory](https://www.transtats.bts.gov/PREZIP/), [original flight fields](https://www.transtats.bts.gov/Fields.asp?gnoyr_VQ=FGJ). As checked November 12, the latest reporting-carrier on-time month is **August 2026**. The **table** was released **October 19, 2026**; the exact official **ZIP** file carries **October 26, 2026** directory date. Since the ZIP time zone isn't known, this new adapter conservatively treats its original source content as available **no earlier than October 27, 2026 00:00 UTC**, plus actual later verified receipt where applicable. NEVER infer this ZIP was available at an August departure forecast.

## What the incremental Phase5 one-month pipeline adds

The new [BTS historical-only normalizer](../../scripts/v39_phase5_bts_aug2026_historical_training_lane.py) **never downloads an additional ZIP**. It reads the existing Phase4 official verified ZIP as the only input, and first checks the independent Phase4 source SHA/provenance. Bounded streaming conversion produces:

- An isolated gzip CSV of 2026-08 US reporting-carrier operations, preserving reported date/carrier/operating number/IATA route/tail, scheduled versus actual local gate clocks, separately reported local wheels-off/on, signed gate departure/arrival delay minutes (including negative earliness), cancellations, diversions, and reported late-aircraft delay.
- A SHA256 manifest of the original official ZIP and normalized gzip data; counts of rows, reported tails, cancellations and missing outcomes; explicit historical publication floor.
- Every normalized row tagged **historical outcome, not a real PRE, not a real-time live physical tail chain, not independently matched to AeroDataBox**.

The existing [Phase4 BTS workflow](../../.github/workflows/phase4-gate5-free-bts-actual-reference.yml) receives a **third** no-network/no-credentials stage *after* the original source capture and independent verification, keeping a **30-day GitHub Actions artifact** of the normalized CSV.gz+manifest. This is short-term system staging, **not permanent Phase7 archival storage**. A separately approved private durable object path and immutable manifest/checksum must be provided before the expiry (or re-download official BTS data under strict version and checksum review). It never touches Neon flight_population, flight_snapshots, POST/PRE, budgets, rights or provider calls.

## Model science: valuable U.S. historical labels, not universal PRE backfill

This is an **optional separately evaluated U.S. reporting-carrier domain**. It can support historical gate-out delay training and baseline distribution checks, cancellation/diversion/late-aircraft causal research, tail-coverage analysis and future independently joined postflight comparisons. It does **NOT** provide worldwide 31-day source population, an August T−24h/T−6h/T−90m original, source-issued August schedule versions, or real-time features. Report BTS population bias, domestic-only coverage, missingness and distribution shift; protect the 20 TRAIN / 5 VALIDATION / 6 TEST prospective partition from external label contamination.

**Do not** use BTS published outcome timestamps, actual delay, final cancellation, late-aircraft attribution, actual wheels-off, or the later *reported* schedule as if they were observed at an earlier cutoff. Do not use the same August data to train and independently benchmark the identical model without a declared temporal split. Delayed BTS U.S. reference for a genuine matched postflight leg is possible only via the existing Phase4 BTS guard after physical operating identity, carrier/date/route/IATA vs ICAO, time zones/DST/rollovers, source publication and intended-use evidence.

## Tail-chain current implementation vs the remaining real gap

The repo already has a bitemporal [historical feature store](../../server/lib/disruption/historicalFeatureStore_v3.ts) with tail-family history, and Amendment E's [as-of selector](../../server/lib/disruption/phase5AmendmentEAsOfFeatureSelectionOffline_v39.ts) already allows a prior-aircraft turnaround feature. Original Stage14 currently defaults to no extra features; optional linked source only in reviewed/offline states. **No genuine live preceding-tail flight chain was established by these components alone.**

The new [pure same-tail as-of candidate](../../server/lib/disruption/phase5AmendmentETailChainAsOfCandidate_v39.ts) requires separately verified and legally permitted **distinct physical operating legs**, same independently matched tail, previous **destination = current origin**, previous **actual GATE-IN** with a source receipt before the issued forecast and originally known current **scheduled GATE-OUT**. It refuses missing/different tails, codeshares without physical authority, postcutoff evidence, missing gate events, impossible negative turn and unknown rights. It reuses the existing Amendment E prior-aircraft feature slot and emits only a conditional **planned turnaround buffer**: scheduled outbound gate-out minus actual inbound gate-in. It is NOT the observed final gate-to-gate turn, not a wheels-on/wheels-off proxy and not a ready production feature. A previous BTS flight only published later cannot supply a retroactive PRE feature.

The next live engineering task is to bind real as-of tail and prior physical operating leg to immutable original FIDS/source rows, with independent identity/availability timestamps, then test real GitHub Stage14 issue time and per-airport/tail missingness. Don't build a second collector or bypass immutable PRE.

## Phase5 mainline continues in parallel

Real independent future 31-day treatment and regional calendar, actually reviewed provider range/current quota/budget/Alert credits and source-use rights, restricted one-use B0062/V0093 production staging/independent readback and real first-day GitHub source/T24/T6/T90/POST/STOP correctness remain the release path. BTS does not become a new blocking Phase5 gate. No cloud provider, extra paid airborne source, source login reinstall or provider email wait.

**Evidence boundary:** code/CI construction alone is NOT proof that a new real August archive was successfully downloaded/normalized into the Actions artifact. That must be checked on the postmerge main workflow's actual run. Zero live Neon writes/provider charges, Phase5 FREEZE HOLD and paid Phase6 GO NO.
