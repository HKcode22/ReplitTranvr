# Actual first seed — transparent provisional 7-category budget, November 15

**NO GO; proposal only.** The true run 43700154416 generated commitment 925b94cbb236d0a981637eeccae985a2924cc3f11afcb47727b3acf93e792bcf and exact calendar-preview SHA 003885e93f3a3daa1098f648502c5a7dd3beb6e317e906ffe281760aaba763af. Original ZIP and raw SHA verified from downloaded bytes. New CI verifies exact deterministic reproduction from the durably preserved first seed, no regeneration. Cost calculator validates actual draft/row hashes and reproduces original slot budget formula, no real source grid or approved stage input. Model-only hash pins are not release evidence.

Proposed one-GET source cadence: 15m refresh and 900s request lead, 240m range, 2 units/GET. Other caps are explicit engineering proposals, not claimed price, actual yield, receipt or approval:

| Category | Proposed cycle units |
|---|---:|
| FIDS base | 11904 |
| FIDS split | 384 |
| FIDS retry | 1280 |
| Validation | 496 |
| Outcome REST | 27520 |
| Paid history bootstrap | 0 |
| Diagnostic | 376 |
| Total proposed | 41960 |
| Protected floor | 1000 |
| Unassigned headroom | 7040 |

42 source UTC dates, 43 outcome dates, 47 union dates. Retry reserve = 10% source units rounded up to nearest 2 per UTC date; it does NOT enable blind retry. Validation 16 units each active service UTC date, diagnostic 8 per charge date, outcome 640 units per unique UTC date touched by active segment start through segment end +48h inclusive (proposed bounded followup window, not observed provider finalization). Overlapping parent outcomes share same daily cap, not multiplied; at the current 2-unit POST path cost, 13,760 potential POST requests at most, not guaranteed flights or labels. Actual outcome followup/priority and fair prospective sampling still require approval; censor missed or unavailable outcomes, never backfill PRE. BTS historical bootstrap remains separate/offline, no additional paid calls. Peak day total 1228, below 1900. Other-only dates Nov29, Nov30, Dec1, Jan5, Jan6 explicitly reserved. No obligation to spend. 7040 headroom intentionally not silently reallocated.

Observed current free account 59968/60000 units, reset Dec4 02:21:21Z. Exact scheduled FIDS 2560 before / 9728 after; all category caps prior UTC dates 9364, ambiguous reset-date 344, following dates 32252. Conservative upper bound prior cycle 9708 and next cycle 32596 (reset day counted in both for safety, never summed as study cost). No assumed post-reset renewal or Alert replenishment. Current Alert 1830 minus 1000 floor = 830 unbuffered headroom; actual unsettled margin reduces usable headroom. Separate Alert study cap and current credit replenishment schedule remain open. No automated purchase.

No actual provider price/range/latency, rights, separate approval, label or committed PRE/POST evidence manufactured. Do not pass scenario output to B0062/V0093. Reuse actual original writers only after review. Existing 31-day plans must bind the real manifest/config/frame/range/timing and approvals. Canonical A/B/C/D1/D2/E preserved. Phase5 FREEZE HOLD, paid Phase6 NO-GO.

## Exact-calendar timing sensitivity (provisional, no new gate)

Reuse the original 6,144 one-GET / 12,288-unit SOURCE templates and existing #701 cutoff-time union audit. All three horizons have 1,843,200 exposed airport-slot-cutoff-seconds. Illustration with 120s scheduler slip + 180s response/persistence, immediate audit, unchanged 900s candidate lead: 30m staleness yields 1,228,800 eligible seconds/horizon (66.67%); 45m staleness yields 1,800,000 (97.66%), leaving the first 5 minutes of each of the 36 partitions (four slots), 43,200 seconds/horizon uncovered. Neither is actual flight coverage, actual observed latency, nor an approved feature freshness rule. Additional 300s review delay and larger latency scenarios included. Source and budget unchanged; no backfill, no extra spend or change to existing lead threshold. The 15m request lead can still support most modeled cutoff TIME via earlier fresh refreshes if actual delay and approved staleness permit. Review measured p50/p95/p99 before deployment; retain honest bounded missingness rather than disqualify all days.
