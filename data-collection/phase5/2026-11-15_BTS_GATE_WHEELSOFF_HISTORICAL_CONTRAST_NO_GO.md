# August 2026 BTS actual historical gate-out / wheels-off contrast (NO GO)

One-time analysis of the already preserved normalized US historical artifact from run 43808240282, ID 14198898471. Reuse exact existing original normalized gzip SHA256 and original raw ZIP provenance (raw not reverified). No new data download from BTS or ADB, no DB or flight snapshot writes.

Estimate same-origin local clock difference from gate-out to wheels-off modulo 24 hours, retaining 0–180 min plausible pairs with scheduled gate/actual gate/reported signed delay exact local modulo consistency. Report excluded missing/clock inconsistent/out-of-bounds rows. This is **not** a certified independent taxi-out duration (date offsets and UTC/DST not reconstructed), nor an actual wheels-off delay versus a separately scheduled runway milestone. The diagnostic wheels-off minus originally scheduled gate proxy equals reported gate delay plus plausible local-clock difference. Compare same paired cohort at 15 min; do not compare rates with different denominators without explicit labeling. Canceled rows are separate; no fabricated zero-minute labels. US reporting-carrier historical only, no original actual global ADB identity match, PRE timestamp or model accuracy claim. Preserve canonical Amendment E unchanged. Actual aggregate result and exact CI evidence to be recorded after successful run.

## Actual whole-month execution — PASS (November 16 UTC)

Run [43815471140](https://github.com/HKcode22/ReplitTranvr/actions/runs/43815471140), job 133126413611, exact source d0cb04a954ecc37458f4dd458594603e7931b3e5. Preserved input 14198898471 downloaded successfully; exact outer digest reported by Actions and normalized inner gzip SHA matched. Aggregate artifact [14201678275](https://github.com/HKcode22/ReplitTranvr/actions/runs/43815471140/artifacts/14201678275), outer digest sha256:eb86e3dc9679abe3e41d04772c1dca52d3a98503323402751030afecc9f9dc17, expires 2027-02-14T06:15:05Z. Raw aggregate JSON SHA256 f28d109e8e5b17a6c84ef8fb860564c969272836360cca8ee1a7f7c61de0e408 (canonical CI output with trailing newline). No source rows released in analysis artifact. Exact aggregate copied from actual log to evidence JSON.

| Denominator/check | Observed |
|---|---:|
| Total US reporting-carrier scheduled rows | 608,389 |
| Canceled rows | 11,313 |
| Noncanceled rows | 597,076 |
| Noncanceled reported signed gate delay | 597,076 |
| All rows with reported gate delay incl. canceled | 597,734 |
| Canceled rows with reported gate delay (do not use as primary conditional label) | 658 |
| All reported normalized wheels-off rows incl. canceled and 2400 | 597,129 |
| All wheels-off 2400 marker rows | 102 |
| Exact prior Phase4 noncanceled wheels-off excluding 2400 | 596,974 |
| Eligible paired noncanceled rows | 597,074 |
| Excluded local-clock contrast >180 minutes | 2 |
| Clock wrap rows among paired | 2,256 |
| Noncanceled diverted rows (retained for departure contrast, not independent arrival-label claim) | 2,869 |

First two analysis attempts held because the historical count used a different definition, not because source bytes were corrupt. The Phase4 parser excludes midnight 2400 and canceled rows; Phase5 normalized explicitly preserves the midnight representation and all reported clocks. Reproduced both definitions exactly against immutable original counts and normalized manifest. No relaxation of SHA or denominator checks. Zero missing/inconsistent paired fields (zero Counter keys may be absent from JSON). The two paired exclusions are above the declared 180-minute plausibility cap.

| Paired cohort (n=597,074) | Mean min | Median min | P90 | P95 | P99 |
|---|---:|---:|---:|---:|---:|
| Reported signed gate departure delay | 18.6190 | -1 | 63 | 111 | 259 |
| Plausible local gate-to-wheels-off contrast | 19.5309 | 16 | 32 | 41 | 69 |
| Wheels-off minus scheduled gate proxy | 38.1499 | 18 | 88 | 137 | 284 |

At 15 minutes, 159,615 / 597,074 (26.7329%) have reported gate departure delay >=15; the mismatched wheels-off minus scheduled gate proxy yields 356,633 / 597,074 (59.7301%). 197,018 of 437,459 gate-delay-below-15 rows (45.0369%) cross the threshold solely under this alternative proxy. This is **not** a measured real scheduled runway delay distribution. Different milestones yield different targets; do not use the proxy as Amendment E gate-out label or claim ADSB.lol wheels-off supplies gate-out. No independently matched global ADB data, PRE or model performance evidence; no source-rights conclusion or scientific freeze.

The 180-minute cap and modulo local-clock method are analysis choices; full actual taxi-out field and UTC date offsets were not preserved in the normalized reference, so no certified taxi duration. No claim that the US historical contrast generalizes to global prospective flights. No paid provider/DB operation, no original ZIP re-download. Native study budget and seed unchanged.
