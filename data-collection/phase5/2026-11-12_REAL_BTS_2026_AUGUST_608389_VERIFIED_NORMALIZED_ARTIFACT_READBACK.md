# 2026-11-12 — REAL BTS August 2026 official ZIP + normalized historical source: all three GitHub jobs PASS

**This is the actual postmerge readback for [PR #609](https://github.com/HKcode22/ReplitTranvr/pull/609), NOT synthetic CI and NOT Phase6 flight acquisition.**

## Exact provenance, reproducible links

Main PR merge commit: `2719991468dcd084f3693b6cc040d96d6bc2f0d7`.

[GitHub Actions run #43281032803](https://github.com/HKcode22/ReplitTranvr/actions/runs/43281032803), triggered by main push on November 12, 2026. All three jobs verified **SUCCESS**:
1. `capture-free-bts`: original official BTS 2026-08 Reporting Carrier On-Time Performance PREZIP, **one public nonpaid download**, posted SHA and source-month count, uploaded raw verified ZIP 2-day artifact.
2. `verify-free-bts`: downloaded the original Actions artifact, independently recomputed the full original ZIP SHA and metadata, **no second external HTTP request**.
3. `normalized-aug2026-historical-only`: reused exactly that verified original ZIP + Phase4 summary SHA, streamed all rows through the isolated Phase5 historical-only normalizer, generated normalized gzip CSV and signed provenance manifest, uploaded a 30-day GitHub artifact. The synthetic self-test also passed.

Exact source (government): https://transtats.bts.gov/PREZIP/On_Time_Reporting_Carrier_On_Time_Performance_1987_present_2026_8.zip

### Measured actual official source facts (GitHub job output)

| Check | Actual observed count |
| --- | ---: |
| Reporting-carrier scheduled flight records | **608,389** |
| Flights with BTS actual reported wheels-off populated | **596,974** |
| Canceled flight rows | **11,313** |
| Rows with reported signed gate departure delay | **597,734** |
| Missing tail registration | **1,338** |
| Paid provider REST units | **0** |
| Production database writes | **0** |

**Original official source ZIP SHA-256:**
`203509350f574f81728ca51175a17360d0413aa990512f8e0c8f1342f5baf23a`.

**Normalized 2026-08 historical CSV.gz SHA-256:**
`406587471b44794ea1f574fad2400fc0bafdd85f6898faa8f41b6706294a4614`.

Source month fixed **2026-08**. No sample-only approximation or fabricated rows.

### Actual successful GitHub artifacts and retention

| Artifact | Artifact ID | Size | GitHub expiration |
| --- | ---: | ---: | --- |
| `v39-gate5-bts-aug2026-official-public-source` (original ZIP + independently verified summary) | `13973225677` | 32,028,342 bytes (Actions artifact size) | **2026-11-14 18:33:57 UTC** |
| `v39-phase5-bts-aug2026-us-historical-only-not-pre` (normalized CSV.gz + SHA manifest) | `13973485715` | 41,388,756 bytes (Actions artifact size) | **2026-12-12 18:35:05 UTC** |

The normalized artifact is accessible from [run #43281032803](https://github.com/HKcode22/ReplitTranvr/actions/runs/43281032803), subject to GitHub repository access and expiration. GitHub Actions artifact size is not equal to underlying normalized gzip byte count. Preserve the source/derived SHA, not assumptions about artifact container byte size.

**IMPORTANT: the 30-day normalized artifact is real but NOT durable Phase7 storage.** Before December 12, independently copy the normalized CSV.gz and manifest into an owner-reviewed, private persistent dataset object location with access/retention policy, then verify the SHA matches and record a pointer. Alternatively reproduce via the existing official BTS ZIP downloader and compare official ZIP/source hashes (the federal published archive may be revised, so do not silently replace the observed 2026-11-12 source version). DO NOT upload the full U.S. historical flights into the FIDS V0079 production source-original store or flight_snapshots; plan a separate provider-specific Phase7 historical dataset partition and provenance schema.

## What it DOES and DOES NOT prove

- **Proves:** one genuine official U.S. reporting-carrier month available in our GitHub Actions pipeline, all rows verified at source, normalized field/clock/label category preservation and missing-tail denominator. Enables auxiliary historical U.S. delay/late-aircraft/tail coverage research for Phase7 with a direct audited source lineage.
- **Does not prove:** U.S. BTS equals the four HUB / 31-day AeroDataBox operating population, one BTS tail equals a matched physical AeroDataBox leg, a current tail predecessor exists for future flights, or BTS reported 2026-08 final schedules were actually published at any August predeparture cutoff.
- **Never:** use BTS actual gate-delay/arrivals/wheels-off/cancellation or postflight LateAircraftDelay as as-of PRE features for the same flight; do not change original failed/missing T24/T6/T90 snapshot counts. A matched delayed BTS outcome can later be a separately sourced qualified **POST reference tier** only after strict original physical leg/carrier/codeshare/IATA-to-ICAO/date/local-to-UTC/DST and publication validation through existing Phase4 typed guard.
- **Tail:** the pure [Amendment E cutoff-safe previous-leg candidate](../../server/lib/disruption/phase5AmendmentETailChainAsOfCandidate_v39.ts) was verified by CI; the real live previous-tail SOURCE → unique inbound arrival → current forecast link is **not yet proven installed**. An actual same-tail historical BTS chain cannot be used to fake original 2026-08 PRE; current prospective tail feature still needs true pre-issuance evidence and rights.
- **Scientific scope:** simple baseline and external history-training potential, not a claim of predictive accuracy improvement. Keep protected future 20/5/6 held-out evaluation; model calibration/test comparisons must explicitly stratify US domestic historical vs global prospective cohort.

This is **parallel optional data enrichment** and not a new Phase5 readiness barrier. Main Phase5 priorities remain real independently approved prospective 31-day calendar and cost/rights, restricted B0062/V0093 owner installer and independent readback, real first-day GitHub SOURCE/T24/T6/T90/POST/STOP evidence, then separate scientific FREEZE and paid Phase6 GO.

**As of this readback: Phase5 scientific FREEZE HOLD; Phase6 paid GO NO. No Neon writes, no paid AeroDataBox call, no V0079–V0092 reinstall.**
