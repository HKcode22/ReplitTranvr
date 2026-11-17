# 2026-11-17 — compact inert admission and local-calendar review

**Actual production main remains** `345f642e0df3266853a1f9d5e3f12fa262ddf1ee` (PR #862 merged). This is a review-only continuation; no reinstallation, paid request, provider credit, production database write, secret/variable update, calendar change or Phase6 activation. Preserve the already-enabled primary expiry pin, original seed, A/B/C/D1/D2/E, 31 parents, existing subscription and December completion plan.

## 1. Additional engineering evidence — not another release branch to merge automatically

The original merged compact integration tested the calendar/metadata/budget compiler and 48,000-byte packet limit; the explicit `admitP6InertReleaseStage` two-role test used the historical 47-date packet. [Test-only PR #863](https://github.com/HKcode22/ReplitTranvr/pull/863), exact head `b418f8f0e0bc0c04e2a26ea6b22d459d5b16aeab`, adds 47 lines to the existing test, no executable runtime change, no migration. It takes the actual compact export (synthetic external approval fixture, NOT actual approved bytes) through the existing calendar and cost-only admission, verifies 31 calendar rows and 21 unknown ordinary days, 38 physical UTC charge dates, 266 category rows, seven caps, 12,288 SOURCE and 37,388 total reserved units, no physical reservations or actual query grid. It exercises rejection of the historical 47-date cost digest, absent rights, mixed credentials and wrong stage digest. No DB connectivity is invoked by these pure admission tests.

[Actual focused CI 44096828041](https://github.com/HKcode22/ReplitTranvr/actions/runs/44096828041), job 134086040900, SUCCESS at 13:51:23Z; inspected actual log, 15/15 tests pass (existing compact test extended, not 15 new tests), metadata-only export 6,144 templates / 37,388 units, committed plan SHA parity 31/31. Full broad CI was not yet verified at checkpoint preparation. The test-only branch can remain review evidence; do not merge just to generate another main SHA/re-pin, and do not use its candidate manifest as production release identity. Existing B0062/V0093 writers and independent readback use dynamic charge-date/category lengths; the compact fixture shows admission is compatible, not a live transaction or rights approval.

## 2. Actual scheduled retention readback

- [Primary scheduled APPLY 44042985387](https://github.com/HKcode22/ReplitTranvr/actions/runs/44042985387), actual job 133901817543, older then-reviewed main `f53a36a787351b9859ff7910d7f5cab41c1d77a2`. Actual DB clock 2026-11-17T08:00:12.687Z. Receipt PRIMARY_FIDS_ELIGIBLE_AT_READBACK_CLEARED; distinct actors verified, all nine counters zero before and after, zero receipts, no DB writes possible, no provider/object operations. This independently establishes one real scheduled execution, not a deletion-throughput or hard-deadline proof.
- [Private provider blob sentinel 44018644026](https://github.com/HKcode22/ReplitTranvr/actions/runs/44018644026), job 133822561549, observed 04:39:30.267Z, 838/838 verified references, zero expired/unverified, zero next-24-hour due, metadata-only, no physical object or backup/PITR evidence.
- Separate current-main post-merge VERIFY 44094283026 already independently passed at 13:36:15.779Z; do not replay. At 263 scheduled run listing, only one actual primary scheduled run appears; no post-merge scheduled APPLY observed at this read. 15-minute cron is nominal, not SLA. No known overdue eligible rows in latest observed VERIFY. The old run is not verification of the new exact main.
- GitHub connection does not allow repository Actions variable endpoint (actual read attempt denied). Do not assert current live variable/secret values from that connection, ask for keys, or use Neon connector as production identity.

## 3. Newly quantified local weekday confounding, old vs compact (NOT a calendar-change request)

Used the actual merged `data-collection/phase5/evidence/2026-11-17_compact_actual_shape_calendar_REVIEW_ONLY.json` (compiler-pinned Git blob ee17a694594356e2b0c772545c490c198db11b42), 10 fixed parent dates / 40 fixed airport-window occurrences / 20 within-pair airport comparisons. Reconstructed original segment times by shifting each compact active segment by originalStartUtc minus startUtc. For each active minute (end exclusive), converted to local IANA civil weekday using Intl.DateTimeFormat. Timezone mapping below is a geographically assigned review mapping, not an independent verification of the private operational timezone catalog. Exposed minutes are planned maximum, not actual provider flights. “Weekday” is Monday–Friday; “weekend” Saturday–Sunday, not a country-specific working calendar or holiday traffic proxy.

| Measurement | Original 44-date calendar | Compact 34-date calendar |
|---|---:|---:|
| Fixed airport comparisons | 20 | 20 |
| Exact local weekday mismatch | 4/20 | 4/20 |
| Local weekday/weekend-class mismatch | 2/20 | 2/20 |
| Local class changes within active segments (mixed weekday/weekend) | 0 | 0 |

The mismatch moves rather than increases. Original pair1 Peru SPJC and Illinois KDEC were Saturday vs Friday locally; compact both are Friday vs Friday (KDEC Nov20 and Nov27 18:00 CST; SPJC Nov20 and Nov27 19:00 local). OMAA/OMSJ change Sunday vs Saturday into Saturday vs Saturday. New pair5 YBUD and RKTU move from originally Saturday vs Saturday to Friday Nov27 vs Saturday Dec5 locally; YBUD 02:00 local and RKTU 01:00 local. Each has 360 planned active weekday minutes in day5 and 240 weekend minutes in day11, versus both weekend before compaction. Pair5 SKBO and FAKM shift Thursday vs Friday but retain weekday class. All 20 pairs retain the original UTC class matching; none of these facts qualifies actual outcome, airport service availability, or local-holiday balance. Exact local weekday matches are 16/20, broad class 18/20 in both calendars. No randomized assignment, dates or UTC matching rule were changed by this audit. Do not redraw for better realized outcomes; disclose these pre-existing/new asymmetries when interpreting the exploratory pair comparisons and retain local weekday/holiday as context or prespecified sensitivity, not post hoc exclusion. Preserve both original and compact records. This is a scientific limitation, not evidence the compact design violates its existing UTC washout or sampling rule.

Reproduction algorithm (no external I/O other than existing review JSON; consume its cases[0].rows):
```js
const zones = {
 OMAA:"Asia/Dubai", OMSJ:"Asia/Dubai", SPJC:"America/Lima", KDEC:"America/Chicago",
 WSSS:"Asia/Singapore", SBFL:"America/Sao_Paulo", TJSJ:"America/Puerto_Rico", LSZB:"Europe/Zurich",
 YSSY:"Australia/Sydney", KBUF:"America/New_York", LFQQ:"Europe/Paris", NZNP:"Pacific/Auckland",
 SKBO:"America/Bogota", EBAW:"Europe/Brussels", NZNS:"Pacific/Auckland", RJNK:"Asia/Tokyo",
 YBUD:"Australia/Brisbane", RKTU:"Asia/Seoul", FAKM:"Africa/Johannesburg"
};
const weekend = w => ["Sat","Sun"].includes(w);
const groups = new Map();
for (const row of rows.filter(r => r.fixedKnownAirportSet)) {
 for (const airport of Object.values(row.fixedKnownAirportSet)) {
  const format = new Intl.DateTimeFormat("en-US",{timeZone:zones[airport],weekday:"short"});
  const w = t => format.format(new Date(t));
  const d = Date.parse(row.originalStartUtc) - Date.parse(row.startUtc);
  const measures = [d,0].map(shift => {
   const counts = {weekday:0,weekend:0};
   for (const s of row.segments)
    for(let t=Date.parse(s.startUtc)+shift;t<Date.parse(s.endUtc)+shift;t+=60000)
     counts[weekend(w(t))?"weekend":"weekday"]++;
   return {startWeekday:w(Date.parse(row.startUtc)+shift),counts};
  });
  const key = row.pairId+"/"+airport;
  groups.set(key,[...(groups.get(key)??[]),measures]);
 }
}
for (const [k,[a,b]] of groups) console.log(k,[0,1].map(i => ({
 exactMismatch:a[i].startWeekday!==b[i].startWeekday,
 classMismatch:weekend(a[i].startWeekday)!==weekend(b[i].startWeekday),
 activeMinuteCounts:[a[i].counts,b[i].counts]
})));
```

## 4. Release decisions and blockers

Retain the approved-direction compact review calendar and Nov19 first SOURCE / Dec23 final service / Dec25 allocated recovery Pacific targets. Do not mistake selected candidate for actual approved AUTH. #300 already records sent Nov1 account-rights inquiry, no actual affirmative response at last reviewed mail state, and a narrow previously prepared unsent follow-up draft. #200 records sent milestone inquiry with no source-specific response at last review, runway as secondary/limited, not an excuse to erase E. No new email search or duplicate inquiry in this review; no claim that the mailbox state remains current. The draft is not dispatched by this session. Current actual source-specific rights for the linked PRE/POST training corpus and proof of qualifying physical gate-out remain unresolved. Existing historical BTS evidence is not a prospective independent match; even genuine future BTS requires lawful linkage retention and publication lag. A lawful narrower protocol requires explicit independent scientific scope, not a default target substitution.

Do not alter source access 23h/physical maximum 24h, extend raw retention, or treat one scheduled zero-work sweep as full compliance. The existing V0079/V0083 early-expiry incompatibility of retained-raw T24 comparator remains (T−1h latest expiration); preserve unknown/not-estimable when no independently approved derived linkage exists. No paid reassurance call resolves this structural condition or source rights. Actual scoped AUTH still needed with five genuine evidence digests, exact current manifest and independently reviewed cost bounds; existing disabled calendar then cost stage and readbacks; separate activation. Test fixtures do not satisfy actual admission approvals. No unnecessary owner shell action from this checkpoint.

**Status:** Engineering compact release main unchanged; additional test-only native admission PASS; Phase5 full scientific FREEZE HOLD / Phase6 paid NO-GO. No new production permissions, code, session keys, paid spend, DB writes or provider calls.
