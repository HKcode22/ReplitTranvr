# Nov17 — first-day commissioning clock and prospective date contingency (REVIEW ONLY)

Keep original Nov22 00:00Z service start, current production main de15816bccb867dc17dcd396f8bedec66960e115 and existing active retention pin. This is not permission to postpone or a new architecture, calendar, seed, source scope, rights, authorization or payment. Phase5 FREEZE HOLD / Phase6 paid NO-GO. Existing source/target and A/B/C/D1/D2/E unchanged.

## 1. Actual first-day clock constraint

Reread exact production source: v39_phase6_enable_source_owner_v39.ts insists on strictly more than 24h50m lead; phase5ProspectiveEarlyDrawClockContract_v39.ts requires >24h45m and <=72h; phase5-six-slot-approved-early-four-airport-draw.yml runs nominal :17 at hours 00/04/08/12/16/20 and requires separate Phase6 GO even for its existing manual nonpaid draw. The producer reads the actual committed four-airport draw, not an invented planned one. The current daily preparation candidate uses 20min minimum lead; actual protected policy can differ within existing allowed range. Existing stored SOURCE parent minimum lead is 15min.

Original first day (Pacific PST):

| Event | UTC | Pacific |
|---|---|---|
| Early draw window opens | Nov19 00:00 | Nov18 16:00 |
| First nominal draw cron | Nov19 00:17 | Nov18 16:17 |
| Last nominal draw cron | Nov20 20:17 | Nov20 12:17 |
| Strict AUTH enable boundary (exclusive) | Nov20 23:10 | Nov20 15:10 |
| Early draw window closes (exclusive) | Nov20 23:15 | Nov20 15:15 |
| Candidate 20m minimum preparation lead | Nov20 23:25 | Nov20 15:25 |
| SOURCE parent 15m minimum lead | Nov20 23:30 | Nov20 15:30 |
| First nominal paid SOURCE | Nov20 23:45 | Nov20 15:45 |
| First parent service starts | Nov22 00:00 | Nov21 16:00 |

Actual calculation: 12 nominal draw opportunities, none scheduled between the strict enable boundary and the draw deadline. The nominal 5-minute gap between AUTH boundary and draw close is **not** an unattended commissioning margin. The draw workflow timeout is 12 minutes; even manual dispatch after separate GO at the last possible boundary is not a guarantee. The next nominal draw is Nov21 00:17Z, too late. Prior actual multi-hour creation gaps make relying on even the previous nominal slot unsafe. Prefer completion while the ordinary early-draw window is still open with multiple opportunities; do not promise nominal schedule execution. A verified existing one-time manual draw is available only after genuinely authorized GO and while eligible, not as a workaround for rights, signed manifest, clock or STOP. If missed, retain missing denominator/no backfill; consider prospective re-review before collection. This does not convert runtime setup and complete real label/rights evidence into a requirement to collect first-day data before authorization.

## 2. New exact calendar/budget contingency analysis

Read exact original date-only packet, original committed seed (workflow 43700154416), and previous 31-file compressed SOURCE observation. All three Git blob identities recorded. Independent reconstruction of original greedy UTC geometry with the fixed first-period pair sets gives exact uniform whole-week translation for offsets 0,7,14,21,28; weekday/weekend classes, UTC slot, relative washout, fixed pair/replay order and relative exposure lengths remain invariant. The original treatment rank formula binds seed + pair/template airport hash, not service timestamp; ordinary HUB/region rotation ranking binds seed and relative block/position. This is why preserving the original treatment roles/relative shape is feasible in the arithmetic model; not a new independently witnessed seed commitment or an executed replacement release compiler. No future adaptive airport identities selected.

| Shift | First service UTC | Strict enable boundary Pacific | Allocated outcome tail UTC | Full REST reserve |
|---|---|---|---|---:|
| 0 | Nov22 | Nov20 15:10 | Jan6 04:00 | 41,960 |
| +7d | Nov29 | Nov27 15:10 | Jan13 04:00 | 41,960 |
| +14d | Dec6 | Dec4 15:10 | Jan20 04:00 | 41,960 |
| +21d | Dec13 | Dec11 15:10 | Jan27 04:00 | 41,960 |
| +28d | Dec20 | Dec18 15:10 | Feb3 04:00 | 41,960 |

All times first service 00:00 UTC; dates Nov/Dec 2026 and Jan/Feb 2027. Each scenario retains 31 parent days, 20/5/6 parent-day split, 26/3/2 shapes, 34 segments, 128h exposure, 6,144 SOURCE templates, 47 charge dates, 329 category dates and 1,228 peak daily reserve. Category totals exactly reproduce original 11,904 base / 384 split / 1,280 retry / 496 validation / 27,520 outcome / 0 history / 376 diagnostic. All retain 46d4h15m first-source-to-tail span, not a retention solution. No provider access or writes.

Conservative charge-date bounds counted on both sides of reset days (so these columns must NOT be added as actual total spending):

| Shift | Through Dec4 reset date | Dec4–Jan4 | Jan4–Feb4 |
|---|---:|---:|---:|
| 0 | 9,708 | 31,300 | 2,040 |
| +7d | 6,456 | 28,480 | 9,216 |
| +14d | 18 | 26,532 | 16,392 |
| +21d | 0 | 19,356 | 23,568 |
| +28d | 0 | 12,328 | 30,648 |

Only Dec4 reset is dated previously observed evidence; Jan4/Feb4 same UTC time are calendar hypotheses, not verified renewals or future quota. The rows are design reservations excluding any new credit refill/current account use; need a real account check at actual release. Do not choose a shift because of predicted/observed outcomes, holiday traffic, or favorable budget arithmetic.

## 3. Exact guard incompatibility and required lawful path

Original bundle commit includes original dateCandidateBytesSha256 and firstRunDateUtc. The exact verifier refuses replacement date bytes. v39_phase6_actual_release_candidate_export_v39.ts replays the Nov22 seed/date pair and checks its prior preview; phase5ActualNov22BudgetProposal_v39.ts pins original draft, rows, Dec4 account/reset/date-specific totals and cutoff. A date change cannot be made by text replacement, tampering old commitments, reusing current manifest/AUTH or silently relaxing these checks.

If necessary after actual independent decision and while still prospective, preserve original bundle/seed and the original date-bound receipt, explicitly review a uniform shift chosen by a prospective rule, verify actual current source scope, weekday/local timezone/holiday and traffic eligibility (not assumed identical), recompile date-dependent identities within existing compiler with explicit reviewed new binding, update real charge-date caps and account evidence, sign exact new manifest/policy/stage, and use existing independently verified disabled B0062/V0093 stage/readback. No new random draw for selecting a more attractive assignment, no backfill and no new user action at this checkpoint. Do not implement production changes solely on this contingency while original Nov22 dates remain.

## 4. Reproducible review artifacts

- [Offline arithmetic helper](review-tools/p5_whole_week_date_shift_review.mjs), Git blob e3c7c65b556b7f09b845b6a7f74aad99b5261a2c; exact original inputs and Git blob checks, prints aggregate review only. No arguments override the fixed review alternatives. Not a production entrypoint.
- [Full five-scenario receipt](evidence/2026-11-17_date_shift_budget_sensitivity_REVIEW_ONLY.json): actual pure JS function executed with retrieved pinned inputs; five positive cases plus seven refusal cases passed (non-week/negative/out-of-range shifts, shape/date/seed/timestamp mutations). The native Node CLI wrapper was read back, **not run**; no repository CI claimed.
- [Independent parity and first-day receipt](evidence/2026-11-17_date_shift_independent_parity_and_first_day_clock_REVIEW_ONLY.json): separately enumerated unpartitioned exposure quarters, constructed 47 original UTC daily reservation rows, translated their dates; 20/20 cycle window comparisons against prior results passed. This independent arithmetic uses a different method (not independently authenticated actual future paid behavior).

The current scope remains blocked on source rights, physical endpoint qualification or explicit independently accepted narrowed scientific scope, practical scheduling/retention acceptance and actual final protected commissioning. Preserve stable main. No new code merged into production, provider calls, DB writes, workflows dispatched, subscription changes, or new approval.