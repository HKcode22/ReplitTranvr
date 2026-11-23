# Phase 6 — COMPLETE 31-STUDY-DAY SOURCE / PRE / POST SCHEDULE (California PST + UTC)

**ONE authoritative operator calendar for all 31 study days, with corrected full AM/PM tables and the latest 72-entry, two-layer Google/Notion calendar view.** Prepared 2026-11-23 PST from frozen **production main `c8e065d665ccacb6d2575070e94c5500b7583044`**. This file is an explanatory view of already reviewed signed plans, not a change to the frozen study, not paid GO, not proof of collection. Kept on **documentation/evidence branch `phase6/20261122-g8-502-readback-evidence`**, not production main. If the signed release identity changes, STOP and independently review rather than silently rewrite these slots.

## Start here — the three different notions of "schedule"

1. **Exposure/service day:** what dates/times the selected airports' departing-flight service windows cover. Exactly **31 nonconsecutive study days, UTC Nov 25–Dec 27**, split **20 train / 5 validation / 6 test**, with **128 planned active exposure hours** / **34 segments**. Three of the days are **two 2h segments with a 1h internal break**; two are **6h exposure** (provider requests still bounded to <=4h slices); the remaining 26 are **one 4h segment**. Days Nov 29 and Dec 6 have no new service-day cohort, not 24h system shutdowns.
2. **SOURCE FIDS request opportunities:** for each exposure segment and each of **T−24h, T−6h, T−90m**, four airport query templates every **15 minutes**. These are **nominal scheduledRequestUtc** of already frozen query templates; each has **2 units** and **maxAttempts=1**, not guaranteed billed requests or PRE commitments. **6,144 query templates = 31 × 3 horizons × 4 airport slots × 16 quarter-hour positions + 2 extra six-hour expansions**. The sum of source template list-price units is **12,288** if all executed once; the separate frozen **36,740 REST-unit month ceiling** covers the broader approved paid categories. Never equate these or spend on the assumption a pending response was free.
3. **PRE snapshot / POST actual label:** **not** guaranteed at the wall-clock query times. Individual forecast deadlines use *the flight's own frozen scheduled departure T*, source availability, and Stage14 cutoff-safe admission; actual valid gate-out labels must come from independently qualified POST evidence. **No authoritative 31-day list of individual flights or actual gate-out timestamps exists yet.** They are not known in advance, so no fabricated per-flight calendar alarms.

**Timezone:** All tables prefixed **PST** mean California **UTC−08:00** (Mountain House, Tracy, San José) throughout Nov–Dec 2026. Times can land on a different local calendar date than the UTC service-day label. Google Calendar account's primary default currently reads `Asia/Karachi`; calendar events will be authored with `America/Los_Angeles` explicitly. A user device may display them in its own configured timezone until changed.

**Launch control (Mon Nov 23 PST):** owner G13 permitted **1:50 PM–strictly before 3:10 PM**, then only genuine G13 PASS permits G9 **at/after 3:45 PM**, first frozen SOURCE slot at **3:45 PM PST**. No pre-GO paid call. [Single launch-day owner commands](https://github.com/HKcode22/ReplitTranvr/blob/phase6/20261122-g8-502-readback-evidence/data-collection/phase6/checkpoints/2026-11-23_ONLY_READ_THIS_PHASE6_PAID_LAUNCH_AND_LIVE_DATA_GUIDE.md).

**Independent relay control period:** `2026-11-23T23:45:00Z` through `2026-12-29T04:00:00Z` (Nov 23 **3:45 PM** through Dec 28 **8:00 PM PST**). This wider clock interval is not 36 days of continuous flight exposure or permission for a new unscheduled GET. Retention/reconciliation may remain necessary afterward.

## A. Every study-day service window, intentional break, data split and total SOURCE templates

For a **6h** exposure, each provider request still uses an approved max **240-minute / 4h** query range; six hours refers to active exposure, not a single 6h provider call. For **2×2h**, the listed **one-hour break is deliberately excluded** from service exposure; the separate PRE/SOURCE clock slots have corresponding gaps. Blank days between date rows are not unscheduled extra data draws.

| Day | Split | UTC service date | Shape | Flight-service/exposure windows (PST) | Excluded internal break (PST) | SOURCE query templates |
|---:|---|---|---|---|---|---:|
| [01](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-01.json) | train | 2026-11-25 UTC | 4h | 11/24 4:00 PM–11/24 8:00 PM | None | 192 |
| [02](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-02.json) | train | 2026-11-26 UTC | 4h | 11/25 8:00 PM–11/26 12:00 AM | None | 192 |
| [03](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-03.json) | train | 2026-11-27 UTC | 2 × 2h | 11/27 12:00 AM–11/27 2:00 AM; 11/27 3:00 AM–11/27 5:00 AM | 11/27 2:00 AM–11/27 3:00 AM | 192 |
| [04](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-04.json) | train | 2026-11-28 UTC | 4h | 11/28 4:00 AM–11/28 8:00 AM | None | 192 |
| [05](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-05.json) | train | 2026-11-30 UTC | 6h | 11/30 8:00 AM–11/30 2:00 PM | None | 288 |
| [06](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-06.json) | train | 2026-12-01 UTC | 4h | 12/01 12:00 PM–12/01 4:00 PM | None | 192 |
| [07](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-07.json) | train | 2026-12-02 UTC | 2 × 2h | 12/01 4:00 PM–12/01 6:00 PM; 12/01 7:00 PM–12/01 9:00 PM | 12/01 6:00 PM–12/01 7:00 PM | 192 |
| [08](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-08.json) | train | 2026-12-03 UTC | 2 × 2h | 12/02 8:00 PM–12/02 10:00 PM; 12/02 11:00 PM–12/03 1:00 AM | 12/02 10:00 PM–12/02 11:00 PM | 192 |
| [09](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-09.json) | train | 2026-12-04 UTC | 4h | 12/04 12:00 AM–12/04 4:00 AM | None | 192 |
| [10](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-10.json) | train | 2026-12-05 UTC | 6h | 12/05 4:00 AM–12/05 10:00 AM | None | 288 |
| [11](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-11.json) | train | 2026-12-07 UTC | 4h | 12/07 8:00 AM–12/07 12:00 PM | None | 192 |
| [12](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-12.json) | train | 2026-12-08 UTC | 4h | 12/08 12:00 PM–12/08 4:00 PM | None | 192 |
| [13](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-13.json) | train | 2026-12-09 UTC | 4h | 12/08 4:00 PM–12/08 8:00 PM | None | 192 |
| [14](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-14.json) | train | 2026-12-10 UTC | 4h | 12/09 8:00 PM–12/10 12:00 AM | None | 192 |
| [15](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-15.json) | train | 2026-12-11 UTC | 4h | 12/11 12:00 AM–12/11 4:00 AM | None | 192 |
| [16](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-16.json) | train | 2026-12-12 UTC | 4h | 12/12 4:00 AM–12/12 8:00 AM | None | 192 |
| [17](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-17.json) | train | 2026-12-13 UTC | 4h | 12/13 8:00 AM–12/13 12:00 PM | None | 192 |
| [18](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-18.json) | train | 2026-12-14 UTC | 4h | 12/14 12:00 PM–12/14 4:00 PM | None | 192 |
| [19](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-19.json) | train | 2026-12-15 UTC | 4h | 12/14 4:00 PM–12/14 8:00 PM | None | 192 |
| [20](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-20.json) | train | 2026-12-16 UTC | 4h | 12/15 8:00 PM–12/16 12:00 AM | None | 192 |
| [21](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-21.json) | validation | 2026-12-17 UTC | 4h | 12/17 12:00 AM–12/17 4:00 AM | None | 192 |
| [22](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-22.json) | validation | 2026-12-18 UTC | 4h | 12/18 4:00 AM–12/18 8:00 AM | None | 192 |
| [23](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-23.json) | validation | 2026-12-19 UTC | 4h | 12/19 8:00 AM–12/19 12:00 PM | None | 192 |
| [24](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-24.json) | validation | 2026-12-20 UTC | 4h | 12/20 12:00 PM–12/20 4:00 PM | None | 192 |
| [25](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-25.json) | validation | 2026-12-21 UTC | 4h | 12/20 4:00 PM–12/20 8:00 PM | None | 192 |
| [26](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-26.json) | test | 2026-12-22 UTC | 4h | 12/21 8:00 PM–12/22 12:00 AM | None | 192 |
| [27](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-27.json) | test | 2026-12-23 UTC | 4h | 12/23 12:00 AM–12/23 4:00 AM | None | 192 |
| [28](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-28.json) | test | 2026-12-24 UTC | 4h | 12/24 4:00 AM–12/24 8:00 AM | None | 192 |
| [29](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-29.json) | test | 2026-12-25 UTC | 4h | 12/25 8:00 AM–12/25 12:00 PM | None | 192 |
| [30](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-30.json) | test | 2026-12-26 UTC | 4h | 12/26 12:00 PM–12/26 4:00 PM | None | 192 |
| [31](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-31.json) | test | 2026-12-27 UTC | 4h | 12/26 4:00 PM–12/26 8:00 PM | None | 192 |

**Verified geometry:** 31 study days; 20 train + 5 validation + 6 test; 26 ordinary 4h + 3 split 2×2h + 2 six-hour = 128 active exposure hours and 34 active service segments. 6,144 scheduled SOURCE query templates; four airport slots; three horizons. **The 10 paired days show candidate ICAOs, not proof of a completed, signed actual airport draw. The other 21 require prospective DB draws.**

## B. EVERY planned T−24h / T−6h / T−90m SOURCE wave (PST, day-by-day)

Each cell describes the **first** and **last** exact planned query clock slots, in California local date/time. Within an uninterrupted interval, planned slots occur at **15-minute increments INCLUDING both endpoints**. If there are TWO separated intervals, the middle gap has **zero planned slots** for that segment. **These are FIDS request slots, not a promise that PRE snapshots commit at those minutes.** Clock wake/queue jitter may cause missing/late attempts and must be recorded.

| Day | T−24h SOURCE planned slots (PST) | T−6h SOURCE planned slots (PST) | T−90m SOURCE planned slots (PST) |
|---:|---|---|---|
| **01** | 11/23 3:45 PM–11/23 7:30 PM | 11/24 9:45 AM–11/24 1:30 PM | 11/24 2:15 PM–11/24 6:00 PM |
| **02** | 11/24 7:45 PM–11/24 11:30 PM | 11/25 1:45 PM–11/25 5:30 PM | 11/25 6:15 PM–11/25 10:00 PM |
| **03** | 11/25 11:45 PM–11/26 1:30 AM; 11/26 2:45 AM–11/26 4:30 AM | 11/26 5:45 PM–11/26 7:30 PM; 11/26 8:45 PM–11/26 10:30 PM | 11/26 10:15 PM–11/27 12:00 AM; 11/27 1:15 AM–11/27 3:00 AM |
| **04** | 11/27 3:45 AM–11/27 7:30 AM | 11/27 9:45 PM–11/28 1:30 AM | 11/28 2:15 AM–11/28 6:00 AM |
| **05** | 11/29 7:45 AM–11/29 1:30 PM | 11/30 1:45 AM–11/30 7:30 AM | 11/30 6:15 AM–11/30 12:00 PM |
| **06** | 11/30 11:45 AM–11/30 3:30 PM | 12/01 5:45 AM–12/01 9:30 AM | 12/01 10:15 AM–12/01 2:00 PM |
| **07** | 11/30 3:45 PM–11/30 5:30 PM; 11/30 6:45 PM–11/30 8:30 PM | 12/01 9:45 AM–12/01 11:30 AM; 12/01 12:45 PM–12/01 2:30 PM | 12/01 2:15 PM–12/01 4:00 PM; 12/01 5:15 PM–12/01 7:00 PM |
| **08** | 12/01 7:45 PM–12/01 9:30 PM; 12/01 10:45 PM–12/02 12:30 AM | 12/02 1:45 PM–12/02 3:30 PM; 12/02 4:45 PM–12/02 6:30 PM | 12/02 6:15 PM–12/02 8:00 PM; 12/02 9:15 PM–12/02 11:00 PM |
| **09** | 12/02 11:45 PM–12/03 3:30 AM | 12/03 5:45 PM–12/03 9:30 PM | 12/03 10:15 PM–12/04 2:00 AM |
| **10** | 12/04 3:45 AM–12/04 9:30 AM | 12/04 9:45 PM–12/05 3:30 AM | 12/05 2:15 AM–12/05 8:00 AM |
| **11** | 12/06 7:45 AM–12/06 11:30 AM | 12/07 1:45 AM–12/07 5:30 AM | 12/07 6:15 AM–12/07 10:00 AM |
| **12** | 12/07 11:45 AM–12/07 3:30 PM | 12/08 5:45 AM–12/08 9:30 AM | 12/08 10:15 AM–12/08 2:00 PM |
| **13** | 12/07 3:45 PM–12/07 7:30 PM | 12/08 9:45 AM–12/08 1:30 PM | 12/08 2:15 PM–12/08 6:00 PM |
| **14** | 12/08 7:45 PM–12/08 11:30 PM | 12/09 1:45 PM–12/09 5:30 PM | 12/09 6:15 PM–12/09 10:00 PM |
| **15** | 12/09 11:45 PM–12/10 3:30 AM | 12/10 5:45 PM–12/10 9:30 PM | 12/10 10:15 PM–12/11 2:00 AM |
| **16** | 12/11 3:45 AM–12/11 7:30 AM | 12/11 9:45 PM–12/12 1:30 AM | 12/12 2:15 AM–12/12 6:00 AM |
| **17** | 12/12 7:45 AM–12/12 11:30 AM | 12/13 1:45 AM–12/13 5:30 AM | 12/13 6:15 AM–12/13 10:00 AM |
| **18** | 12/13 11:45 AM–12/13 3:30 PM | 12/14 5:45 AM–12/14 9:30 AM | 12/14 10:15 AM–12/14 2:00 PM |
| **19** | 12/13 3:45 PM–12/13 7:30 PM | 12/14 9:45 AM–12/14 1:30 PM | 12/14 2:15 PM–12/14 6:00 PM |
| **20** | 12/14 7:45 PM–12/14 11:30 PM | 12/15 1:45 PM–12/15 5:30 PM | 12/15 6:15 PM–12/15 10:00 PM |
| **21** | 12/15 11:45 PM–12/16 3:30 AM | 12/16 5:45 PM–12/16 9:30 PM | 12/16 10:15 PM–12/17 2:00 AM |
| **22** | 12/17 3:45 AM–12/17 7:30 AM | 12/17 9:45 PM–12/18 1:30 AM | 12/18 2:15 AM–12/18 6:00 AM |
| **23** | 12/18 7:45 AM–12/18 11:30 AM | 12/19 1:45 AM–12/19 5:30 AM | 12/19 6:15 AM–12/19 10:00 AM |
| **24** | 12/19 11:45 AM–12/19 3:30 PM | 12/20 5:45 AM–12/20 9:30 AM | 12/20 10:15 AM–12/20 2:00 PM |
| **25** | 12/19 3:45 PM–12/19 7:30 PM | 12/20 9:45 AM–12/20 1:30 PM | 12/20 2:15 PM–12/20 6:00 PM |
| **26** | 12/20 7:45 PM–12/20 11:30 PM | 12/21 1:45 PM–12/21 5:30 PM | 12/21 6:15 PM–12/21 10:00 PM |
| **27** | 12/21 11:45 PM–12/22 3:30 AM | 12/22 5:45 PM–12/22 9:30 PM | 12/22 10:15 PM–12/23 2:00 AM |
| **28** | 12/23 3:45 AM–12/23 7:30 AM | 12/23 9:45 PM–12/24 1:30 AM | 12/24 2:15 AM–12/24 6:00 AM |
| **29** | 12/24 7:45 AM–12/24 11:30 AM | 12/25 1:45 AM–12/25 5:30 AM | 12/25 6:15 AM–12/25 10:00 AM |
| **30** | 12/25 11:45 AM–12/25 3:30 PM | 12/26 5:45 AM–12/26 9:30 AM | 12/26 10:15 AM–12/26 2:00 PM |
| **31** | 12/25 3:45 PM–12/25 7:30 PM | 12/26 9:45 AM–12/26 1:30 PM | 12/26 2:15 PM–12/26 6:00 PM |

**Read one row example:** Day 01 has 4 airports × 16 quarter-hour positions for T−24h, again for T−6h and T−90m (192 templates). The actual per-flight T−6h PRE must be published before *that individual flight's* native T−6h cutoff, not merely sometime inside this FIDS span.

## C. Same complete schedule in UTC, for comparing GitHub logs and database timestamps

The UTC values omit the year from each cell (**all dates 2026**); no local time conversions are needed when matching `scheduledRequestUtc`. Distinct chunks separated by `; ` represent split-service segments.

| Day | Service UTC | T−24h SOURCE UTC | T−6h SOURCE UTC | T−90m SOURCE UTC |
|---:|---|---|---|---|
| 01 | 11-25 00:00–11-25 04:00 | 11-23 23:45–11-24 03:30 | 11-24 17:45–11-24 21:30 | 11-24 22:15–11-25 02:00 |
| 02 | 11-26 04:00–11-26 08:00 | 11-25 03:45–11-25 07:30 | 11-25 21:45–11-26 01:30 | 11-26 02:15–11-26 06:00 |
| 03 | 11-27 08:00–11-27 10:00; 11-27 11:00–11-27 13:00 | 11-26 07:45–11-26 09:30; 11-26 10:45–11-26 12:30 | 11-27 01:45–11-27 03:30; 11-27 04:45–11-27 06:30 | 11-27 06:15–11-27 08:00; 11-27 09:15–11-27 11:00 |
| 04 | 11-28 12:00–11-28 16:00 | 11-27 11:45–11-27 15:30 | 11-28 05:45–11-28 09:30 | 11-28 10:15–11-28 14:00 |
| 05 | 11-30 16:00–11-30 22:00 | 11-29 15:45–11-29 21:30 | 11-30 09:45–11-30 15:30 | 11-30 14:15–11-30 20:00 |
| 06 | 12-01 20:00–12-02 00:00 | 11-30 19:45–11-30 23:30 | 12-01 13:45–12-01 17:30 | 12-01 18:15–12-01 22:00 |
| 07 | 12-02 00:00–12-02 02:00; 12-02 03:00–12-02 05:00 | 11-30 23:45–12-01 01:30; 12-01 02:45–12-01 04:30 | 12-01 17:45–12-01 19:30; 12-01 20:45–12-01 22:30 | 12-01 22:15–12-02 00:00; 12-02 01:15–12-02 03:00 |
| 08 | 12-03 04:00–12-03 06:00; 12-03 07:00–12-03 09:00 | 12-02 03:45–12-02 05:30; 12-02 06:45–12-02 08:30 | 12-02 21:45–12-02 23:30; 12-03 00:45–12-03 02:30 | 12-03 02:15–12-03 04:00; 12-03 05:15–12-03 07:00 |
| 09 | 12-04 08:00–12-04 12:00 | 12-03 07:45–12-03 11:30 | 12-04 01:45–12-04 05:30 | 12-04 06:15–12-04 10:00 |
| 10 | 12-05 12:00–12-05 18:00 | 12-04 11:45–12-04 17:30 | 12-05 05:45–12-05 11:30 | 12-05 10:15–12-05 16:00 |
| 11 | 12-07 16:00–12-07 20:00 | 12-06 15:45–12-06 19:30 | 12-07 09:45–12-07 13:30 | 12-07 14:15–12-07 18:00 |
| 12 | 12-08 20:00–12-09 00:00 | 12-07 19:45–12-07 23:30 | 12-08 13:45–12-08 17:30 | 12-08 18:15–12-08 22:00 |
| 13 | 12-09 00:00–12-09 04:00 | 12-07 23:45–12-08 03:30 | 12-08 17:45–12-08 21:30 | 12-08 22:15–12-09 02:00 |
| 14 | 12-10 04:00–12-10 08:00 | 12-09 03:45–12-09 07:30 | 12-09 21:45–12-10 01:30 | 12-10 02:15–12-10 06:00 |
| 15 | 12-11 08:00–12-11 12:00 | 12-10 07:45–12-10 11:30 | 12-11 01:45–12-11 05:30 | 12-11 06:15–12-11 10:00 |
| 16 | 12-12 12:00–12-12 16:00 | 12-11 11:45–12-11 15:30 | 12-12 05:45–12-12 09:30 | 12-12 10:15–12-12 14:00 |
| 17 | 12-13 16:00–12-13 20:00 | 12-12 15:45–12-12 19:30 | 12-13 09:45–12-13 13:30 | 12-13 14:15–12-13 18:00 |
| 18 | 12-14 20:00–12-15 00:00 | 12-13 19:45–12-13 23:30 | 12-14 13:45–12-14 17:30 | 12-14 18:15–12-14 22:00 |
| 19 | 12-15 00:00–12-15 04:00 | 12-13 23:45–12-14 03:30 | 12-14 17:45–12-14 21:30 | 12-14 22:15–12-15 02:00 |
| 20 | 12-16 04:00–12-16 08:00 | 12-15 03:45–12-15 07:30 | 12-15 21:45–12-16 01:30 | 12-16 02:15–12-16 06:00 |
| 21 | 12-17 08:00–12-17 12:00 | 12-16 07:45–12-16 11:30 | 12-17 01:45–12-17 05:30 | 12-17 06:15–12-17 10:00 |
| 22 | 12-18 12:00–12-18 16:00 | 12-17 11:45–12-17 15:30 | 12-18 05:45–12-18 09:30 | 12-18 10:15–12-18 14:00 |
| 23 | 12-19 16:00–12-19 20:00 | 12-18 15:45–12-18 19:30 | 12-19 09:45–12-19 13:30 | 12-19 14:15–12-19 18:00 |
| 24 | 12-20 20:00–12-21 00:00 | 12-19 19:45–12-19 23:30 | 12-20 13:45–12-20 17:30 | 12-20 18:15–12-20 22:00 |
| 25 | 12-21 00:00–12-21 04:00 | 12-19 23:45–12-20 03:30 | 12-20 17:45–12-20 21:30 | 12-20 22:15–12-21 02:00 |
| 26 | 12-22 04:00–12-22 08:00 | 12-21 03:45–12-21 07:30 | 12-21 21:45–12-22 01:30 | 12-22 02:15–12-22 06:00 |
| 27 | 12-23 08:00–12-23 12:00 | 12-22 07:45–12-22 11:30 | 12-23 01:45–12-23 05:30 | 12-23 06:15–12-23 10:00 |
| 28 | 12-24 12:00–12-24 16:00 | 12-23 11:45–12-23 15:30 | 12-24 05:45–12-24 09:30 | 12-24 10:15–12-24 14:00 |
| 29 | 12-25 16:00–12-25 20:00 | 12-24 15:45–12-24 19:30 | 12-25 09:45–12-25 13:30 | 12-25 14:15–12-25 18:00 |
| 30 | 12-26 20:00–12-27 00:00 | 12-25 19:45–12-25 23:30 | 12-26 13:45–12-26 17:30 | 12-26 18:15–12-26 22:00 |
| 31 | 12-27 00:00–12-27 04:00 | 12-25 23:45–12-26 03:30 | 12-26 17:45–12-26 21:30 | 12-26 22:15–12-27 02:00 |

## D. Why do 2h, 4h, 6h, 15m, 10m, 5m and 240m all appear in the code?

| Number | What it REALLY means | Is it a fresh paid FIDS GET? |
|---|---|---|
| **15 minutes** | Time between consecutive planned source refresh/query templates for each (study day, segment, horizon, airport) | **Opportunity**, not proof of execution |
| **4 hours** | Ordinary flight-service exposure; **also** verified maximum width of one AeroDataBox FIDS query range (240m) | A 4h *query range* does not mean run only once every 4h |
| **2×2 hours** | Two 2h flight-service segments and a **real excluded 1h break** on Days 03, 07, 08 | Only quarter-hour slots for those two segments |
| **Up to 6h** | Days 05 and 10 exposed six continuous hours, using bounded provider query segments | Not one 6h provider query |
| **2 hours** | Optional rolling-root scheduling-scope period in `phase6RollingCalendarHints_v39.mjs`; *not* the SOURCE probe frequency or a flight time horizon | **No**, control-plane segmentation |
| **10-minute cooldown** | Existing SOURCE_POST, PRE_ENROLLMENT and DAILY_PREPARE **route minimum spacing** in reviewed controller; DIRECT may conservatively accept 8m cooldown for ordinary 10m route with jitter | **No**, protected worker start opportunity |
| **5-minute cooldown** | T24, LATER_PRE and PRE_RECOVERY protected route minimum spacing; actual dispatch and due tasks still checked separately | **No** |
| **240-minute cooldown** | EARLY_DRAW lane may select a due future four-airport day under original guarded logic, max 1 per attempt; source templates do NOT occur at this interval | **No**, study-day selection |
| **60-minute cooldown** | Retention monitor lane; due-only deletion/expiry and protective backstops are separately scheduled | **No** |
| **10-minute GH native SOURCE preparation cron** | `phase6-nonpaid-source-day-prepare-publish.yml`: `:02, :12, :22, :32, :42, :52` UTC, conditional and nonpaid | **No** |
| **10-minute GH native PRE enrollment cron** | `phase6-private-later-enrollment.yml`: `:07, :17, :27, :37, :47, :57` UTC; GitHub scheduling may be delayed/skipped | **No** |

The external rolling relay and primary retention backstop are distinct; a green wake, 2h control scope, 5m PRE tick, 10m SOURCE_POST parent or 15m signed template does **not** prove a paid original. Every runtime actor must independently validate exact main SHA, signed day, authenticated PG clock, credits, provider rights, cutoff and hard STOP.

## E. What happens before, during and after EACH study day

1. **Early draw (up to 72h ahead; latest 24h45m before service start).** Existing fixed paired candidates or four ordinary adaptive airport slots are selected prospectively under separate authenticated controlled DB draw. A calendar range says *eligible*, not *draw completed*. Some earlier eligibility falls before launch; paid GO does not retroactively sign it.
2. **Future day preparation/publication.** Signed day and four-slot source registries, day-index revision and immutable later PRE/POST packets are prepared by nonpaid protected workers with source rights, clock and budgets independently checked.
3. **T−24h SOURCE FIDS queries.** At every planned slot in table B. Verify provider original bound and normalized flights; T24 PRE worker is separate and deadline-qualified.
4. **T−6h SOURCE FIDS queries, and T−90m SOURCE FIDS queries.** Same 15m planned slots around respective native horizons; different actual frozen per-flight cutoffs. Protected PRE workers require individual identity, original source, Stage14 on-time and no leaked actual outcome. Empty provider response or late task is missing/censored, not made-up data.
5. **Flight-service window (table A).** Collect only scoped departures/segments, NOT full-day flights at every airport. A 2×2 break excludes that gap.
6. **POST, outcome/label settlement.** After flight-dependent due windows, bounded signed V0083/Phase7 reviewer/publisher/storage actors process qualified actual gate-out evidence and any arrival-after-takeoff secondary target. No universal exact POST minute is frozen; the actual depends on each leg and authenticated evidence. Missing actual means unknown/censored, NOT zero-minute delay.
7. **Budget, retention and recovery.** Protected budget/incident STOP on each physical charge day (maximum 1,900 REST units per UTC day; 36,740 approved month; separate 1,000 Alert floor). Due-only expiry, V0108 content retention/rights, POST signed outcome custody and 7-day PITR safety review continue through/following service. Recovery does **not** authorize backdating missed PRE or blind repeated billed GET.

## F. Full 31-day detailed cards — airports, early draw, every horizon, breaks

### Day 01 — 2026-11-25 UTC — TRAIN — 4h
**Airports:** HUB OMAA, MID_A OMSJ, MID_B SPJC, REGIONAL KDEC. Paired candidate, subject to actual approved prospective DB draw.
**Planned service/exposure (PST):** 11/24 4:00 PM–11/24 8:00 PM.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 11/23 3:45 PM–11/23 7:30 PM.
- T−6h: 11/24 9:45 AM–11/24 1:30 PM.
- T−90m: 11/24 2:15 PM–11/24 6:00 PM.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 11/21 4:00 PM to 11/23 3:14 PM. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 1 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-01.json).

### Day 02 — 2026-11-26 UTC — TRAIN — 4h
**Airports:** HUB WSSS, MID_A SBFL, MID_B TJSJ, REGIONAL LSZB. Paired candidate, subject to actual approved prospective DB draw.
**Planned service/exposure (PST):** 11/25 8:00 PM–11/26 12:00 AM.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 11/24 7:45 PM–11/24 11:30 PM.
- T−6h: 11/25 1:45 PM–11/25 5:30 PM.
- T−90m: 11/25 6:15 PM–11/25 10:00 PM.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 11/22 8:00 PM to 11/24 7:14 PM. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 2 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-02.json).

### Day 03 — 2026-11-27 UTC — TRAIN — 2x2h
**Airports:** HUB YSSY, MID_A KBUF, MID_B LFQQ, REGIONAL NZNP. Paired candidate, subject to actual approved prospective DB draw.
**Planned service/exposure (PST):** 11/27 12:00 AM–11/27 2:00 AM | 11/27 3:00 AM–11/27 5:00 AM.
**Intentional exposure break:** 11/27 2:00 AM–11/27 3:00 AM PST. No service exposure in this gap.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 11/25 11:45 PM–11/26 1:30 AM | 11/26 2:45 AM–11/26 4:30 AM.
- T−6h: 11/26 5:45 PM–11/26 7:30 PM | 11/26 8:45 PM–11/26 10:30 PM.
- T−90m: 11/26 10:15 PM–11/27 12:00 AM | 11/27 1:15 AM–11/27 3:00 AM.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 11/24 12:00 AM to 11/25 11:14 PM. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 3 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-03.json).

### Day 04 — 2026-11-28 UTC — TRAIN — 4h
**Airports:** HUB SKBO, MID_A EBAW, MID_B NZNS, REGIONAL RJNK. Paired candidate, subject to actual approved prospective DB draw.
**Planned service/exposure (PST):** 11/28 4:00 AM–11/28 8:00 AM.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 11/27 3:45 AM–11/27 7:30 AM.
- T−6h: 11/27 9:45 PM–11/28 1:30 AM.
- T−90m: 11/28 2:15 AM–11/28 6:00 AM.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 11/25 4:00 AM to 11/27 3:14 AM. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 4 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-04.json).

### Day 05 — 2026-11-30 UTC — TRAIN — up-to-6h
**Airports:** HUB SKBO, MID_A YBUD, MID_B RKTU, REGIONAL FAKM. Paired candidate, subject to actual approved prospective DB draw.
**Planned service/exposure (PST):** 11/30 8:00 AM–11/30 2:00 PM.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 11/29 7:45 AM–11/29 1:30 PM.
- T−6h: 11/30 1:45 AM–11/30 7:30 AM.
- T−90m: 11/30 6:15 AM–11/30 12:00 PM.
- **Total** 288 templates (24 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 11/27 8:00 AM to 11/29 7:14 AM. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 5 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-05.json).

### Day 06 — 2026-12-01 UTC — TRAIN — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/01 12:00 PM–12/01 4:00 PM.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 11/30 11:45 AM–11/30 3:30 PM.
- T−6h: 12/01 5:45 AM–12/01 9:30 AM.
- T−90m: 12/01 10:15 AM–12/01 2:00 PM.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 11/28 12:00 PM to 11/30 11:14 AM. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 6 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-06.json).

### Day 07 — 2026-12-02 UTC — TRAIN — 2x2h
**Airports:** HUB OMAA, MID_A OMSJ, MID_B SPJC, REGIONAL KDEC. Paired candidate, subject to actual approved prospective DB draw.
**Planned service/exposure (PST):** 12/01 4:00 PM–12/01 6:00 PM | 12/01 7:00 PM–12/01 9:00 PM.
**Intentional exposure break:** 12/01 6:00 PM–12/01 7:00 PM PST. No service exposure in this gap.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 11/30 3:45 PM–11/30 5:30 PM | 11/30 6:45 PM–11/30 8:30 PM.
- T−6h: 12/01 9:45 AM–12/01 11:30 AM | 12/01 12:45 PM–12/01 2:30 PM.
- T−90m: 12/01 2:15 PM–12/01 4:00 PM | 12/01 5:15 PM–12/01 7:00 PM.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 11/28 4:00 PM to 11/30 3:14 PM. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 7 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-07.json).

### Day 08 — 2026-12-03 UTC — TRAIN — 2x2h
**Airports:** HUB WSSS, MID_A SBFL, MID_B TJSJ, REGIONAL LSZB. Paired candidate, subject to actual approved prospective DB draw.
**Planned service/exposure (PST):** 12/02 8:00 PM–12/02 10:00 PM | 12/02 11:00 PM–12/03 1:00 AM.
**Intentional exposure break:** 12/02 10:00 PM–12/02 11:00 PM PST. No service exposure in this gap.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/01 7:45 PM–12/01 9:30 PM | 12/01 10:45 PM–12/02 12:30 AM.
- T−6h: 12/02 1:45 PM–12/02 3:30 PM | 12/02 4:45 PM–12/02 6:30 PM.
- T−90m: 12/02 6:15 PM–12/02 8:00 PM | 12/02 9:15 PM–12/02 11:00 PM.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 11/29 8:00 PM to 12/01 7:14 PM. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 8 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-08.json).

### Day 09 — 2026-12-04 UTC — TRAIN — 4h
**Airports:** HUB YSSY, MID_A KBUF, MID_B LFQQ, REGIONAL NZNP. Paired candidate, subject to actual approved prospective DB draw.
**Planned service/exposure (PST):** 12/04 12:00 AM–12/04 4:00 AM.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/02 11:45 PM–12/03 3:30 AM.
- T−6h: 12/03 5:45 PM–12/03 9:30 PM.
- T−90m: 12/03 10:15 PM–12/04 2:00 AM.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/01 12:00 AM to 12/02 11:14 PM. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 9 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-09.json).

### Day 10 — 2026-12-05 UTC — TRAIN — up-to-6h
**Airports:** HUB SKBO, MID_A EBAW, MID_B NZNS, REGIONAL RJNK. Paired candidate, subject to actual approved prospective DB draw.
**Planned service/exposure (PST):** 12/05 4:00 AM–12/05 10:00 AM.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/04 3:45 AM–12/04 9:30 AM.
- T−6h: 12/04 9:45 PM–12/05 3:30 AM.
- T−90m: 12/05 2:15 AM–12/05 8:00 AM.
- **Total** 288 templates (24 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/02 4:00 AM to 12/04 3:14 AM. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 10 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-10.json).

### Day 11 — 2026-12-07 UTC — TRAIN — 4h
**Airports:** HUB SKBO, MID_A YBUD, MID_B RKTU, REGIONAL FAKM. Paired candidate, subject to actual approved prospective DB draw.
**Planned service/exposure (PST):** 12/07 8:00 AM–12/07 12:00 PM.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/06 7:45 AM–12/06 11:30 AM.
- T−6h: 12/07 1:45 AM–12/07 5:30 AM.
- T−90m: 12/07 6:15 AM–12/07 10:00 AM.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/04 8:00 AM to 12/06 7:14 AM. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 11 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-11.json).

### Day 12 — 2026-12-08 UTC — TRAIN — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/08 12:00 PM–12/08 4:00 PM.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/07 11:45 AM–12/07 3:30 PM.
- T−6h: 12/08 5:45 AM–12/08 9:30 AM.
- T−90m: 12/08 10:15 AM–12/08 2:00 PM.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/05 12:00 PM to 12/07 11:14 AM. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 12 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-12.json).

### Day 13 — 2026-12-09 UTC — TRAIN — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/08 4:00 PM–12/08 8:00 PM.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/07 3:45 PM–12/07 7:30 PM.
- T−6h: 12/08 9:45 AM–12/08 1:30 PM.
- T−90m: 12/08 2:15 PM–12/08 6:00 PM.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/05 4:00 PM to 12/07 3:14 PM. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 13 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-13.json).

### Day 14 — 2026-12-10 UTC — TRAIN — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/09 8:00 PM–12/10 12:00 AM.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/08 7:45 PM–12/08 11:30 PM.
- T−6h: 12/09 1:45 PM–12/09 5:30 PM.
- T−90m: 12/09 6:15 PM–12/09 10:00 PM.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/06 8:00 PM to 12/08 7:14 PM. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 14 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-14.json).

### Day 15 — 2026-12-11 UTC — TRAIN — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/11 12:00 AM–12/11 4:00 AM.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/09 11:45 PM–12/10 3:30 AM.
- T−6h: 12/10 5:45 PM–12/10 9:30 PM.
- T−90m: 12/10 10:15 PM–12/11 2:00 AM.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/08 12:00 AM to 12/09 11:14 PM. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 15 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-15.json).

### Day 16 — 2026-12-12 UTC — TRAIN — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/12 4:00 AM–12/12 8:00 AM.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/11 3:45 AM–12/11 7:30 AM.
- T−6h: 12/11 9:45 PM–12/12 1:30 AM.
- T−90m: 12/12 2:15 AM–12/12 6:00 AM.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/09 4:00 AM to 12/11 3:14 AM. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 16 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-16.json).

### Day 17 — 2026-12-13 UTC — TRAIN — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/13 8:00 AM–12/13 12:00 PM.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/12 7:45 AM–12/12 11:30 AM.
- T−6h: 12/13 1:45 AM–12/13 5:30 AM.
- T−90m: 12/13 6:15 AM–12/13 10:00 AM.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/10 8:00 AM to 12/12 7:14 AM. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 17 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-17.json).

### Day 18 — 2026-12-14 UTC — TRAIN — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/14 12:00 PM–12/14 4:00 PM.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/13 11:45 AM–12/13 3:30 PM.
- T−6h: 12/14 5:45 AM–12/14 9:30 AM.
- T−90m: 12/14 10:15 AM–12/14 2:00 PM.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/11 12:00 PM to 12/13 11:14 AM. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 18 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-18.json).

### Day 19 — 2026-12-15 UTC — TRAIN — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/14 4:00 PM–12/14 8:00 PM.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/13 3:45 PM–12/13 7:30 PM.
- T−6h: 12/14 9:45 AM–12/14 1:30 PM.
- T−90m: 12/14 2:15 PM–12/14 6:00 PM.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/11 4:00 PM to 12/13 3:14 PM. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 19 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-19.json).

### Day 20 — 2026-12-16 UTC — TRAIN — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/15 8:00 PM–12/16 12:00 AM.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/14 7:45 PM–12/14 11:30 PM.
- T−6h: 12/15 1:45 PM–12/15 5:30 PM.
- T−90m: 12/15 6:15 PM–12/15 10:00 PM.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/12 8:00 PM to 12/14 7:14 PM. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 20 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-20.json).

### Day 21 — 2026-12-17 UTC — VALIDATION — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/17 12:00 AM–12/17 4:00 AM.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/15 11:45 PM–12/16 3:30 AM.
- T−6h: 12/16 5:45 PM–12/16 9:30 PM.
- T−90m: 12/16 10:15 PM–12/17 2:00 AM.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/14 12:00 AM to 12/15 11:14 PM. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 21 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-21.json).

### Day 22 — 2026-12-18 UTC — VALIDATION — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/18 4:00 AM–12/18 8:00 AM.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/17 3:45 AM–12/17 7:30 AM.
- T−6h: 12/17 9:45 PM–12/18 1:30 AM.
- T−90m: 12/18 2:15 AM–12/18 6:00 AM.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/15 4:00 AM to 12/17 3:14 AM. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 22 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-22.json).

### Day 23 — 2026-12-19 UTC — VALIDATION — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/19 8:00 AM–12/19 12:00 PM.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/18 7:45 AM–12/18 11:30 AM.
- T−6h: 12/19 1:45 AM–12/19 5:30 AM.
- T−90m: 12/19 6:15 AM–12/19 10:00 AM.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/16 8:00 AM to 12/18 7:14 AM. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 23 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-23.json).

### Day 24 — 2026-12-20 UTC — VALIDATION — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/20 12:00 PM–12/20 4:00 PM.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/19 11:45 AM–12/19 3:30 PM.
- T−6h: 12/20 5:45 AM–12/20 9:30 AM.
- T−90m: 12/20 10:15 AM–12/20 2:00 PM.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/17 12:00 PM to 12/19 11:14 AM. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 24 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-24.json).

### Day 25 — 2026-12-21 UTC — VALIDATION — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/20 4:00 PM–12/20 8:00 PM.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/19 3:45 PM–12/19 7:30 PM.
- T−6h: 12/20 9:45 AM–12/20 1:30 PM.
- T−90m: 12/20 2:15 PM–12/20 6:00 PM.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/17 4:00 PM to 12/19 3:14 PM. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 25 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-25.json).

### Day 26 — 2026-12-22 UTC — TEST — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/21 8:00 PM–12/22 12:00 AM.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/20 7:45 PM–12/20 11:30 PM.
- T−6h: 12/21 1:45 PM–12/21 5:30 PM.
- T−90m: 12/21 6:15 PM–12/21 10:00 PM.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/18 8:00 PM to 12/20 7:14 PM. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 26 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-26.json).

### Day 27 — 2026-12-23 UTC — TEST — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/23 12:00 AM–12/23 4:00 AM.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/21 11:45 PM–12/22 3:30 AM.
- T−6h: 12/22 5:45 PM–12/22 9:30 PM.
- T−90m: 12/22 10:15 PM–12/23 2:00 AM.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/20 12:00 AM to 12/21 11:14 PM. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 27 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-27.json).

### Day 28 — 2026-12-24 UTC — TEST — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/24 4:00 AM–12/24 8:00 AM.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/23 3:45 AM–12/23 7:30 AM.
- T−6h: 12/23 9:45 PM–12/24 1:30 AM.
- T−90m: 12/24 2:15 AM–12/24 6:00 AM.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/21 4:00 AM to 12/23 3:14 AM. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 28 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-28.json).

### Day 29 — 2026-12-25 UTC — TEST — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/25 8:00 AM–12/25 12:00 PM.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/24 7:45 AM–12/24 11:30 AM.
- T−6h: 12/25 1:45 AM–12/25 5:30 AM.
- T−90m: 12/25 6:15 AM–12/25 10:00 AM.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/22 8:00 AM to 12/24 7:14 AM. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 29 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-29.json).

### Day 30 — 2026-12-26 UTC — TEST — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/26 12:00 PM–12/26 4:00 PM.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/25 11:45 AM–12/25 3:30 PM.
- T−6h: 12/26 5:45 AM–12/26 9:30 AM.
- T−90m: 12/26 10:15 AM–12/26 2:00 PM.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/23 12:00 PM to 12/25 11:14 AM. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 30 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-30.json).

### Day 31 — 2026-12-27 UTC — TEST — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/26 4:00 PM–12/26 8:00 PM.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/25 3:45 PM–12/25 7:30 PM.
- T−6h: 12/26 9:45 AM–12/26 1:30 PM.
- T−90m: 12/26 2:15 PM–12/26 6:00 PM.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/23 4:00 PM to 12/25 3:14 PM. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 31 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-31.json).


## G. What counts as success versus missingness, and how to check

| Layer | Source of live evidence | Do not confuse with |
|---|---|---|
| Clock/wake and relay | [Detached relay Actions](https://github.com/HKcode22/TravnrClockRelay/actions), target run ACK; target main `c8e065d665ccacb6d2575070e94c5500b7583044` | Merely green pre-GO/deferred workflow |
| Signed planned SOURCE | `clean.adb_phase6_calendar_day`, `clean.adb_sampling_draw`, `clean.phase5_fids_allowed_query_v39` | Paid observation or confirmed airport selection |
| Charged SOURCE | `clean.phase5_fids_physical_attempt_v39`, `clean.phase5_fids_utc_charge_budget_v39`, provider account usage | Attempt reservation alone |
| Original / normalized | `clean.phase5_fids_original_binding_v39`, `clean.fids_query_response`, `clean.flight_population` | Non-billed synthetic/offline CI |
| Actual per-flight PRE | `clean.phase5_cd_pre_task_v39`, `clean.flight_snapshots`, Stage14 cutoff validation, signed source-clock proof | A query time or snapshot row without qualified cutoff |
| Actual due POST | [V0083 future POST workflow](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml), independent reviewer/publisher/storage | Estimated gate-out as ground truth |
| Safety | `clean.adb_incident_stop`, cycle/day/UTC charge budget, original TTL and expiry [jobs](https://github.com/HKcode22/ReplitTranvr/actions) | A green no-provider probe or absence of an incident log |

**Incident handling:** A missed/cutoff-late query or PRE is missingness, not retrospective on-time data; a pending POST is `not_due`. Unknown external billing requires independent reconciliation before retry. Strong hard stop for wrong signature/role/provider rights, duplicate ambiguous charge, daily/month budget breach, deletion STOP and incorrect flight identity. Do not edit `main` or provider secrets based only on this calendar.

**No guaranteed execution time:** `scheduledRequestUtc` represents the **frozen planning clock**. The external timer can be late, GitHub jobs can queue and Neon/provider can be unavailable. Every listed segment/slot must eventually be compared with **observed** start, provider return, bound original, verified PRE/POST and missingness; scheduled `maxSchedulerSlipSeconds=120`, `minimumPreCommitMarginSeconds=120`, `maxPopulationStalenessSeconds=2700` are policy bounds, not measured assurances.

## H. One authoritative evidence/provenance index

**Frozen machine-readable source of truth:**
- Exact [31-day flight/exposure geometry and candidate/selection status](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-31.json) — `reviewedOrdinaryDayEnvelope.envelope.days[1..31]` (31 objects), frozen source geometry hashes, sample/partition numbers. This file is **NOT** evidence of later realized signed draws; follow up with authenticated DB rows.
- Exact [Day 01](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-01.json), [Day 03 split](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-03.json), [Day 05 6h](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-05.json), [Day 10 6h](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-10.json), [Day 31](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-31.json). All **31 actual individual files were inspected**; validation samples prove segment/slot/horizon reconstruction at 1,3,5,10,31. Links in section A point to EVERY individual file.
- Exact [rolling route/cooldown roster](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/server/lib/disruption/phase6RollingGithubController_v39.mjs) and [calendar-window source hints](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/server/lib/disruption/phase6RollingCalendarHints_v39.mjs): SOURCE_POST 10m, PRE_ENROLLMENT 10m, T24/LATER_PRE/PRE_RECOVERY 5m, DAILY_PREPARE 10m, EARLY_DRAW 240m, RETENTION_MONITOR 60m; 2h optional root scope.
- [Exact native SOURCE day preparation](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/.github/workflows/phase6-nonpaid-source-day-prepare-publish.yml); [exact native PRE enrollment](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/.github/workflows/phase6-private-later-enrollment.yml); [protected paid SOURCE child](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/.github/workflows/phase5-one-signed-day-source-child-dispatch.yml); [V0083 POST child](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml). Workflow cron is a **trigger request**, not an SLA.
- [31-day signed launch and safety guide](https://github.com/HKcode22/ReplitTranvr/blob/phase6/20261122-g8-502-readback-evidence/data-collection/phase6/checkpoints/2026-11-23_ONLY_READ_THIS_PHASE6_PAID_LAUNCH_AND_LIVE_DATA_GUIDE.md); [master owner ledger](https://github.com/HKcode22/ReplitTranvr/issues/413). Proven live [GitHub→Neon SOURCE credential test #45167987718](https://github.com/HKcode22/ReplitTranvr/actions/runs/45167987718) and [protected POST preflight #45125753815](https://github.com/HKcode22/ReplitTranvr/actions/runs/45125753815) were nonpaid successful connection/role checks; no paid SOURCE is inferred.

**Calendar authoring policy:** Calendar events are **read-only descriptions** of frozen planned SOURCE and service windows, not API dispatches. Each event links back to this ONE checkpoint; exact PST offset is included in title/description. All events are **transparent/free**, with no reminders or Google Meet, and no guests. Calendar events should not create rights, billing, airplane-observation or data-retention privileges.

**Owner operational next step:** Complete original signed G13 and later G9 only in their approved windows. This checkpoint adds no launch step, no cron, no provider call and no authorized paid retry.


## I. CURRENT CLEAN GOOGLE + NOTION CALENDAR — verified November 23, 2026 California PST

**Historical cleanup snapshot (before daily gray all-day agendas were added; the LATEST status is in J.8/J.10 below).** The user's Google primary calendar originally received exactly 138 correct-timestamp events (34 service segments, 102 individual SOURCE horizon blocks, two launch owner actions), but that was too crowded in Notion Calendar. On the owner's explicit request, all 34 original service events were **updated in place** with concise `P6 Day 01` through `P6 Day 31` titles and comprehensive descriptions listing every T−24h, T−6h, T−90m FIRST/LAST clock slot, separate segments, mandatory 1h break, candidate/adaptive ICAOs, selection eligibility and source evidence. The 102 redundant calendar-only SOURCE display blocks were deleted. The independent Google Calendar readback returned exactly **36 live P6 events: 34 descriptive service-window events and both original Gate13/Gate9 owner actions**, 31 unique study-day labels, 0 residual separate SOURCE event blocks, no pagination. Days 03, 07 and 08 intentionally have **two service events each**, not duplicates. Nothing else in the user's calendar was changed.

The old 102 SOURCE calendar events were **not** API jobs or database data and their removal cannot cancel an autonomous flight collection task. All 6,144 planned source slots still exist in the original pinned GitHub machine-readable planning files and sections A/B/C/F of this checkpoint, and the respective three horizon windows now appear within each retained service event description. A real paid GET, cutoff-safe flight PRE or actual POST remains independently verified in the database, not implied by calendar presence.

**Where to view:** [Google Calendar](https://calendar.google.com/calendar/u/0/r) or the already-connected **Notion Calendar** Mac app, both showing `hk84164@gmail.com`. Use a weekly view and search `P6 Day`; click any study service event to see the exact preceding/during horizon schedule. The two `P6 OWNER:` launch action reminders remain active, including their original popup reminders; all scientific service events are private, transparent (do not block other invitations), and reminder-free. No Notion database duplicates were created.

**Time zones verified:** Notion Calendar's screenshot visibly shows **PST**, and the original event instants were authored with **`America/Los_Angeles`**. The connected Google account itself continues to report default calendar timezone **`Asia/Karachi`**. The connected Google Calendar and Notion Calendar interfaces available to this assistant permit event read/update/delete, **not changing the account's default or application viewing timezone**. This settings mismatch is therefore **not fixed at account level**; the user must open [Google Calendar Settings](https://calendar.google.com/calendar/u/0/r/settings) → General → Time zone → Primary time zone and select **(GMT-08:00) Pacific Time — Los Angeles** (`America/Los_Angeles`). In Notion Calendar, use the existing **PST** time-zone selector and retain Los Angeles as primary. This changes visual conversion, **not** frozen UTC timestamps or paid clock schedules.

**Formatting repaired in this GitHub file:** all compact `a`/`p` suffixes have been expanded to **AM**/**PM**, and 31-row split-segment tables A/B/C now use `;` **inside cells** instead of unescaped Markdown pipe delimiters; each row has exactly its expected 7, 4 or 5 columns. The former split-day column drift was a Markdown-display defect, **not a change in signed source planning or exclusion intervals**.

**No production changes:** This checkpoint remains on documentation/evidence branch `phase6/20261122-g8-502-readback-evidence`; production `main` remains pinned to `c8e065d665ccacb6d2575070e94c5500b7583044`. Gate13/Gate9 must not be attempted outside original signed times; calendar simplification does not create a new gate or authorize paid calls.


---

## J. Engineering deep dive: why the calendars overlap and what each time REALLY does

This section is written to help an owner explain the Phase 6 schedule to another software engineer, data scientist, research reviewer or supervisor without confusing **planned request times, actual workflow executions, flight prediction cutoffs and outcome labels**. It is derived from the **pinned production `main` (`c8e065d665ccacb6d2575070e94c5500b7583044`)**, especially the reviewed 31-day geometry and the 31 individual signed day-plan files. **Do not treat a calendar event as proof of execution.**

### J.1 The simplest mental model: three independently timed layers

| Layer | The question it answers | When it happens | What an event means | What it does NOT prove |
|---|---|---|---|---|
| **Flight-service exposure / research cohort** | *Which departing flights are scientifically in scope?* | Specific UTC service windows, e.g. four hours, two separated two-hour segments, or approved six-hour exposure | A **selection/exposure window**, not a provider polling interval | No flight observed or outcome labeled merely because the window exists |
| **SOURCE FIDS provider request templates** | *When may we query the provider for a pre-departure view of those scoped flights?* | For each candidate airport, 15-minute slots around T−24h, T−6h, T−90m *relative to the prospective service segments* | A **signed prospective request opportunity**, bounded by cutoff, rights, budget, clock and STOP | Not an actual billed GET, accepted original, flight PRE snapshot or successfully running GitHub job |
| **Per-flight PRE and independent POST** | *Did we preserve valid inputs before the prediction cutoff? And did we later obtain a valid actual target?* | **Individual flight-dependent** forecast cutoff and later actual-outcome settlement | Only live database custody, original/evidence and temporal validation establish it | A generic wall-clock event cannot predict the actual gate-out time or guarantee a successful scientific row |

**Modeling context:** the amended first-cycle conditional **primary prediction** is continuous **actual gate-out delay in minutes**, with **T−6h** as the primary PRE horizon, T−90m update and T−24h comparator. Actual gate-out must come from a qualified independent POST source after the event. Airport-level FIDS requests are neither the target label nor a substitute for physical gate-out truth. Arrival after takeoff is a separate secondary outcome. These are the existing Phase 5–6 research rules; the calendar does not change the scientific design.

### J.2 Deriving the request schedule mathematically — not an arbitrary cron

Let a reviewed active service segment be `[S,E)` in UTC (start inclusive, end exclusive). The segment lasts `L = E − S` minutes. For a horizon `H` (1440 minutes for T−24h, 360 minutes for T−6h, 90 minutes for T−90m), the **reviewed planning templates** are:

```text
N = (E − S) / 15 minutes
planned SOURCE clock k = S − H − 15 minutes + (k × 15 minutes)
                         for k = 0, 1, ... N−1
first planned SOURCE slot = S − H − 15 minutes
last  planned SOURCE slot = E − H − 30 minutes
one slot represents FOUR airport-scoped query templates (HUB / MID_A / MID_B / REGIONAL)
```

The source interval starts slightly *before* a nominal horizon boundary to give a pre-cutoff opportunity; **this is NOT permission to substitute stale information, cross an individual cutoff or rewrite a flight's T**. Actual success still requires a live authorized response and accepted evidence before that flight's deadline. The frozen planning JSON separately records `scheduledRequestUtc`, `earliestPlannedCutoffUtc`, `maxResponseAndPersistSeconds`, 2-unit planned REST cost and `maxAttempts=1`. A **one-attempt** paid plan is not an automatic retry guarantee.

The arithmetic of the signed 31-day experiment is:

| Service/exposure design | Number of study days | 15-minute positions *per horizon* | Planned SOURCE query templates (3 horizons × 4 airport slots) | Active exposure |
|---|---:|---:|---:|---:|
| One 4-hour segment | 26 | 16 | 26 × 16 × 3 × 4 = **4,992** | 104h |
| Two 2-hour segments, with 1h excluded between | 3 | 8 + 8 = 16 | 3 × 16 × 3 × 4 = **576** | 12h |
| One approved up-to-6h active exposure | 2 | 24 | 2 × 24 × 3 × 4 = **576** | 12h |
| **Total** | **31** | — | **6,144 planned templates** | **128h**, across **34 active segments** |

The provider's **verified maximum FIDS query-range width is 240 minutes** (four hours). Therefore, six hours of scientific exposure **does not mean issuing one unsupported six-hour HTTP FIDS request**. The signed six-hour plan uses the reviewed bounded/segmented source geometry. Likewise, a 4-hour *exposure* does not imply that the provider is called only once every four hours: the frozen SOURCE template clock is **15 minutes**, conditionally.

**Evidence:** [Days 01–31 source planning files](https://github.com/HKcode22/ReplitTranvr/tree/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning) (individual links in sections A and F); [Day 01 4h, 192 templates](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-01.json); [Day 03 split 2×2h, 192 templates](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-03.json); [Day 05 6h, 288 templates](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-05.json); [Day 31 signed geometry envelope](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-31.json).

### J.3 Worked example — WEDNESDAY NOVEMBER 25 PST (why distinct days and horizons overlap)

**First, distinguish the labels:** "Study Day 02" is indexed by its UTC flight-service start, **Nov 26 at 04:00Z**, which is **Nov 25 at 8:00 PM in California**. "Study Day 03" is a different cohort, with UTC flight-service start **Nov 27 at 08:00Z**, or **Nov 27 at midnight California time**. A local calendar date can therefore contain SOURCE activity for **more than one future study day**.

| California date/time | Cohort | Planned scientific task | Why it is here |
|---|---|---|---|
| Tue **Nov 24, 4:00–8:00 PM** | **Day 01** | Previous cohort's 4h flight-service exposure | It is **Nov 24**, not Nov 25, despite Day 01's UTC label being Nov 25 |
| Tue **Nov 24, 7:45–11:30 PM** | **Day 02** | Its **T−24h SOURCE** quarter-hour slots | This overlaps the last 15 minutes of Day 01's service exposure; the cohorts have different flight identities/windows |
| Wed **Nov 25, 1:45–5:30 PM** | **Day 02** | Its **T−6h SOURCE** slots | Advance pre-departure observations for its later service window |
| Wed **Nov 25, 6:15–10:00 PM** | **Day 02** | Its **T−90m SOURCE** slots | Later updates near each service-bin's departure times |
| Wed **Nov 25, 8:00 PM–midnight** | **Day 02** | Its **4h flight-service exposure** | **T−90m overlaps 8:00–10:00 PM** because early and late flights in the broad 4h cohort have different native T values |
| Wed **Nov 25, 11:45 PM** | **Day 03** | **First T−24h SOURCE slot** for the next (split) cohort | Early view for a *different future service window*, not a repeated Day 02 query |
| Thu **Nov 26, midnight–1:30 AM**, then **2:45–4:30 AM** | **Day 03** | Remainder of its two distinct **T−24h SOURCE segments** | The Day 03 service is **2×2h**, with a one-hour excluded service gap; query slots preserve those separate segments |

In an everyday calendar, it looks contradictory to see **Day 02 T−90m** and **Day 02 service** at 8:00 PM together. In reality, the exposure covers a **range of departing flights** and does not assert that all those flights share a single departure T. For a late flight scheduled near the end of the broad exposure, a 9:45 PM prospective observation may still be before its native T−90m cutoff if the live identity/cutoff checks admit it. For an early flight with a much earlier T, that same late observation **cannot** be backdated into an earlier PRE horizon. The database must decide flight by flight.

This is a standard temporal data-engineering distinction between **observation time**, **event-time/target time**, and **processing/commit time**. The same wall-clock instant can be part of one cohort's late preflight observation and another cohort's early lookahead. The scientifically critical issue is **strict source identity and cutoff integrity**, not forbidding all wall-clock overlap.

**Evidence:** [Day 01 immutable template](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-01.json), [Day 02 immutable template](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-02.json), [Day 03 immutable split-day template](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-03.json), all checked directly against UTC request timestamps, four airport slots and the envelope.

### J.4 Why 2h, 4h, 6h, 15m, 5m, 10m, 60m, 240m and 6+6 are NOT interchangeable

**The project has separate data-plane and control-plane clocks.** A *controller* wake-up may discover nothing due and correctly do zero work; a *SOURCE* planning slot might not execute if STOP, budget, late clock or missing source conditions prevent it; an accepted PRE or qualified POST requires later independent evidence.

| Interval/clock | Exact engineering interpretation | Evidence in pinned code |
|---|---|---|
| **15-minute** | Frozen per-horizon per-airport **planned FIDS SOURCE request templates** within signed service segments; 4 airport-specific templates per time | [31 individual Day NN planning JSONs](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-31.json) and other day links |
| **4-hour** | Common **scientific service-exposure** duration AND separately **maximum allowed provider FIDS query-range width**; not necessarily the time between GETs | [Reviewed day geometry](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-31.json) |
| **2 × 2h + 1h break** | Days **03, 07, 08** are split service segments with an intentionally excluded one-hour gap; 2 segments per such study day | [Reviewed 31-day geometry](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-31.json) |
| **Up to 6h** | Days **05 and 10** have six hours of planned active service exposure; use bounded provider query geometry, **not** an unsupported single 6h FIDS range | [Day 05](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-05.json) / [Day 10](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-10.json) |
| **2-hour** | A reviewed **rolling root clock-scope partition**, which plans bounded control-plane windows when an authenticated DB clock and prior closure allow; **not a 2h provider probe** | [phase6RollingCalendarHints_v39.mjs](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/server/lib/disruption/phase6RollingCalendarHints_v39.mjs) |
| **10-minute cooldown** | Minimum route spacing for **SOURCE_POST**, **PRE_ENROLLMENT**, **DAILY_PREPARE** (the direct-recovery review may conservatively handle up to 2m wake jitter). It does NOT guarantee a child or GET every 10m | [phase6RollingGithubController_v39.mjs](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/server/lib/disruption/phase6RollingGithubController_v39.mjs) |
| **5-minute cooldown** | Minimum route spacing for **T24**, **LATER_PRE**, **PRE_RECOVERY**; T24/LATER_PRE have to find actually due and admissible per-flight work | [Reviewed controller routes](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/server/lib/disruption/phase6RollingGithubController_v39.mjs) |
| **240-minute** | Minimum spacing for a prospective **EARLY_DRAW** opportunity; chooses future four-airport day under separate draw eligibility, NOT a paid FIDS retrieval cadence | [Reviewed controller routes](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/server/lib/disruption/phase6RollingGithubController_v39.mjs) |
| **60-minute** | **RETENTION_MONITOR** minimum route spacing, a read-only due/rights integrity check, not a SOURCE/POST action | [Reviewed controller routes](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/server/lib/disruption/phase6RollingGithubController_v39.mjs) |
| **6 primary + 6 contingency at 15s** | The **older Phase 2G/3 callback health observer**, bounded to a 180s wall/cumulative outage envelope. It does NOT automatically retry current Phase 6 GitHub→Neon or billable provider REST GETs | [v39_phase2g_stage1_watchdog_6plus6_policy_v39.ts](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/scripts/v39_phase2g_stage1_watchdog_6plus6_policy_v39.ts) |

**Some actual native GitHub Actions cron schedule expressions — in UTC:**

| Existing reviewed GitHub workflow | UTC cron minutes | Why its presence in GitHub Actions is not a paid receipt |
|---|---|---|
| [Upcoming SOURCE/POST parent](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/.github/workflows/phase5-source-upcoming-queue-main-scheduled-readonly.yml) | `:05, :15, :25, :35, :45, :55` (10-minute cadence) | Parent can read, hold or request reviewed child; the parent alone has no provider billed original |
| [SOURCE day prepare/publish (nonpaid)](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/.github/workflows/phase6-nonpaid-source-day-prepare-publish.yml) | `:02, :12, :22, :32, :42, :52` | Day preparation is not a GET |
| [Private later/T24 enrollment (nonpaid)](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/.github/workflows/phase6-private-later-enrollment.yml) | `:07, :17, :27, :37, :47, :57` | An enrollment or empty due queue is not a PRE commit |
| [Bounded PRE tick](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/.github/workflows/phase5-cd-github-bounded-pre-tick.yml) | `:01, :06, :11, ... :56` (5-minute grid) | Requires eligible real SOURCE-bound flight and cutoff-safe PRE; cron may skip or run inert |
| [Private blob retention readonly sentinel](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/.github/workflows/phase5-private-blob-retention-readonly-sentinel-no-provider.yml) | `:19` each hour | Read-only integrity/expiry observation, not an actual deletion or provider call |

**Important:** A cron expression is an *attempted wake-up schedule*, not a real-time execution guarantee. The actual approved rolling controller may use overlapping guard paths but prevents unreviewed duplicate parent work. Each actor still checks current DB time, signed policy/roles, budget, missingness, STOP and its own allowlist. Do **not** add the above crons as thousands of personal appointments, and do **not** infer scientific success from a green no-provider CI job.

### J.5 What happens to one prospective flight — source data to training label

| Phase | Scientifically meaningful artifact | Integrity control and failure interpretation |
|---|---|---|
| **Prospective day selection** | Planned signed day plus four scoped airports (HUB, MID_A, MID_B, REGIONAL) | First ten paired days show candidates; **21 adaptive ordinary days require prospective authenticated DB draw**. Candidate airport labels in static JSON are not a signed realized draw |
| **FIDS SOURCE GET** | Bound original response bytes, authenticated query ID/scope, return/observed time, billed charge attempt, normalization | Physical GET is allowed only under exact signed approval and cap. `maxAttempts=1` is not a license to replay a lost billed response |
| **Stable flight registration** | Carrier/airport/flight identity and externally frozen scheduled departure time T | Never remove needed identities for research. Do not cross-match a different flight or change T after an outcome becomes known |
| **PRE at T−24h, T−6h, T−90m** | Per-flight snapshot as of strictly admissible forecast information | Check actual source availability, arrival/commit clocks and per-flight cutoff independently. Late/unavailable = **missing/censored**, not retrospective synthetic on-time data |
| **Flight service/actual operation** | The actual future departure that the PRE snapshot was meant to predict | Exposure does not force every scheduled service to exist, operate on time, or furnish outcome evidence |
| **Independent POST and signed label** | Qualified **actual gate-out** paired to a valid scheduled departure for continuous delay minutes, with appropriate provenance; separate arrival-after-takeoff if available | Actual gate-out is not estimated departure or runway takeoff. A POST label cannot be known or booked to an exact calendar clock before qualifying real observations |
| **Research dataset/partition** | Train (days 01–20), validation (21–25), test (26–31) with causal PRE/POST separation | Do not leak late-day outcome fields into PRE or silently replace missing labels with zero; split by signed plan and evidence integrity |
| **Retention, reconciliation and STOP** | Due-only expiry, recorded unresolved incidents, physical UTC-day and month budget ledger | A provider receipt failure, ambiguous billing, revoked rights, hard identity mismatch or unsafe replay is a **STOP/reconciliation**, not a reason to improvise a GET |

**Data path, high-level:** GitHub Actions' scoped producer/worker identities connect to the **existing Neon PostgreSQL 16 `neondb` using protected GitHub database URLs**, rather than routing routine database access through the Replit web app. Provider REST queries go independently to AeroDataBox/RapidAPI where authorized. Replit is an owner/runtime context and optional callback host, **not** a required HTTP hop for each GH→Neon query. An actual restricted SOURCE identity connection was verified without provider calls in [GitHub Actions #45167987718](https://github.com/HKcode22/ReplitTranvr/actions/runs/45167987718); that proves the restricted connection, **not** the first live billed source original or a future GET.

### J.6 Why the project has 31 study days but more than 31 California calendar dates

- The study's 31 **UTC service-day cohorts** run from **Nov 25 to Dec 27 UTC**, and omit new service cohorts on **Nov 29 and Dec 06 UTC**. There are **20 train, 5 validation, 6 test** study-day cohorts. The 34 physical segments total 128h.
- SOURCE collection **begins before the first service day**: Day 01 T−24h first planned slot is **Mon Nov 23 at 3:45 PM California PST**. The final Day 31 T−90m planned slot is **Sat Dec 26 at 6:00 PM PST**, and Day 31 service exposure ends **Sat Dec 26 at 8:00 PM PST** even though its service date is **Dec 27 UTC**.
- Gaps between service cohorts do **not** mean all workflows are off: early draw, next-day SOURCE preparation, POST due processing, custody recovery and monitoring can overlap or occur on dates without a new service cohort.
- The signed external control/relay period in the original release guide extends to **2026-12-29 04:00Z = Dec 28 8:00 PM PST**. That is a reviewed **control boundary**, **not** a new guaranteed source window or a guarantee that all flight outcomes have settled. The Dec 27–28 calendar entries are therefore labeled **conditional follow-up**, with NO invented fixed GET/POST time.

**The **dates on a personal calendar** are based on `America/Los_Angeles` local midnight; a cohort's **budget day** is an authenticated UTC charge day and is *not* always the same as its California day or UTC future service date. This is why time zones and physical charge-day accounting matter independently.**

### J.7 Budget and retry math: why overlapping is not automatically overbilling

The *planned query-template* count is **6,144**. The signed source templates show **2 provider REST units per allowed source attempt**, so their theoretical **one-attempt source-template envelope** is **6,144 × 2 = 12,288 REST units**. That is **NOT** the whole 31-day budget: the protected month ceiling is **36,740 REST units**, with a maximum **1,900 REST units per physical UTC day** and a separate **1,000 Alert-credit floor**. POST/other separately reviewed paid classes and incident/reconciliation policies are distinct. A planned template can be **skipped, held, late, censored or unavailable**, and no one should assert that all 12,288 units were or will be charged.

**Overlapping calendar rectangles do not by themselves duplicate provider work.** Charge identity is tied to the exact signed provider request, horizon, airport, selected cohort/segment, actual authenticated request/attempt ledger and physical UTC billing day. If a paid HTTP request might have reached the provider but the response/commit is uncertain, **do not assume it was free or blindly repeat it**. The old 6+6 health monitor cannot make an uncertain billed GET safe. Distinguish a quick nonpaid database/transport retry from a repeated billable provider request.

### J.8 How to interpret the NEW layered personal calendar without missing anything

**Three event classes remain in your connected Google account, also visible through the linked Notion Calendar app:**

| Calendar appearance | Count | What to look at | Reminders and meaning |
|---|---:|---|---|
| **Gray ALL-DAY `P6 AGENDA mm/dd`** | **36**, every California date Nov 23–Dec 28 | Open it for that day's *precise first and last signed SOURCE clock slots*, separated T−24/T−6/T−90 segments, active service, intentional gaps, early-draw eligibility and conditional controller cadence. No hourly blocks added. Last two days are conditional POST/reconciliation only | **No reminders**, private/free; not a dispatch |
| **Existing timed `P6 Day NN · TRAIN / VALIDATION / TEST`** | **34** | Research flight-service exposure; split days 03/07/08 have **two separate segments** with the 1h gap not filled | No reminders; service selection only |
| **`P6 OWNER: Gate 13` and `P6 OWNER: Gate 9`** | **2** | Only actual pre-launch owner action reminders; Gate9 is conditional on proven Gate13 GO | Original popup reminders preserved |

**Total: 72 Phase 6 events; NOT the previous 138 overlapping timed blocks.** The 102 old SOURCE timed display blocks were removed *only from personal calendar display*, **not** from GitHub, provider authorization, the Neon database, scientific exposure, the 6,144 planned slots, or autonomous worker schedules. Their exact research clocks still live in sections A/B/C/F and in each gray all-day agenda's description. The gray agenda uses a verified neutral Google event color and does not reserve the user's whole day.

**Important for reading a midnight-spanning wave:** The daily agenda splits the human view at **California midnight** for legibility. For instance Day 03 T−24h begins **Nov 25 11:45 PM** (one quarter-hour slot on the Nov 25 agenda), then continues with **Nov 26 midnight–1:30 AM**, and its second prospective segment **Nov 26 2:45–4:30 AM**. That split is a **display partition only**; the underlying signed scientific Day 03, exact provider request scope, cutoff and exclusion remain unchanged.

### J.9 What the owner should actually do (without inventing extra launch gates)

1. **On Nov 23 only:** use the **existing, reviewed, one-shot Gate13 paid GO** command within its original **1:50 PM to strictly before 3:10 PM PST** window; accept only its exact acknowledged PASS. **Do not run, repeat or override it on calendar authority.** Only with a verified authentic GO, run the original exact **Gate9** controller activation **at or after 3:45 PM PST**, once. See the [same release-day owner guide](https://github.com/HKcode22/ReplitTranvr/blob/phase6/20261122-g8-502-readback-evidence/data-collection/phase6/checkpoints/2026-11-23_ONLY_READ_THIS_PHASE6_PAID_LAUNCH_AND_LIVE_DATA_GUIDE.md).
2. **After an actual GO:** workers, clock relay, early draws, future-day preparation, SOURCE, PRE and POST remain automatic *only if their already-reviewed exact live gates admit them*. **Do not manually launch a FIDS request at every calendar rectangle.** Green cron/scheduled workflow may legitimately be `skipped`, `NO_DUE_WORK` or `SAFE_PREFLIGHT_HOLD`.
3. **To check scientific completion**, follow actual live [GitHub Actions](https://github.com/HKcode22/ReplitTranvr/actions) and the existing restricted database evidence/incident ledger: physical charged GET, valid original, stable scoped flight, cutoff-safe PRE by the frozen flight T, later independently verified actual POST label, daily/month budgets and hard STOP. A nominal calendar window is not a completed row.
4. **If something fails**, distinguish safe *preflight/no-paid* clock/connection failures from **uncertain paid provider HTTP**. Do not manually replay a paid action without billing/original reconciliation and explicit existing reviewed policy. Do not backfill/correct PRE past a missed cutoff; record the expected missingness.
5. **For daily review** use the single gray date banner to learn "what is planned today," the 34 timed service windows to see "when the exposed flights are in scope," and this single Markdown document for all 31 UTC day details. No new hand-written shell command or extra production gate is required by this documentation/calendar improvement.
6. **After Dec 26 service and during the conditional Dec 27–28 tail**, inspect actual POST settlement, missing/censored outcomes, data retention, budget/accounting and original provenance. The signed control period's end is **not** itself proof of data completeness or a command to run a last paid call.

### J.10 Audited source-of-truth and proof status (separate planned vs observed)

- **Checked all 31 exact frozen day-plan files, not just a synthetic future calendar:** Days 01–10 contribute **2,112** templates, Days 11–20 **1,920**, Days 21–31 **2,112**, total **6,144**. For each plan, the computed 15-minute slot/horizon/segment timestamp histogram matched the plan's literal `scheduledRequestUtc` histogram **exactly**, with four airport templates per slot, and no mismatch. The geometry reference is the embedded immutable `reviewedOrdinaryDayEnvelope.envelope.days` list in the [Day 31 pinned plan](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-31.json). Validation of planning syntax does **not** verify future payment, booking or labels.
- **Calendar write/readback:** Google Calendar has **36 existing gray daily agendas** (34 dates of scheduled SOURCE opportunity from **Nov 23–Dec 26 California**, and two conditional POST/reconciliation overview dates **Dec 27–28**), **34 retained timed service segments**, and **2 unchanged Gate13/Gate9 owner reminders**. An independent fresh Google Calendar search found **72/72** entries; a four-batch authenticated read of **all 36** agenda descriptions confirmed **36 distinct consecutive local agenda dates**, no missing date or duplicate, the correct neutral color/no reminders/nonblocking status, an original checkpoint link for every entry, and the aggregate planned daily SOURCE totals **6,144 = 6,144 signed templates**, with no mismatched daily count. There are **0** old, misleading timed SOURCE overlay rectangles. The already-connected Notion Calendar uses the same Google account, and its all-day **Nov 25** banner was independently observed correctly as a **DATE** event with the November 25 local date.
- **Security and scope:** No POST, provider GET, budget transfer, secret edit, live paid attempt, schema migration, PR merge, production code change, launch GO or release approval was caused by these documentation/calendar writes. The frozen production `main` SHA was reverified as `c8e065d665ccacb6d2575070e94c5500b7583044` before this edit. The only GitHub write is this updated explanation on the existing **documentation/evidence branch**.
- **Reminder about what remains unknowable before runtime:** Which prospective airports actually get signed on future adaptive days, which flights truly operate, exact per-flight admissible PRE commit times, actual AeroDataBox HTTP returns and charges, true actual gate-out timestamps, and exact POST settlement times. These require later independently observed signed runtime evidence; no calendar can promise them today.

**Practical explanation to give someone:** "We pre-register 31 nonconsecutive UTC flight-service cohorts, with four airport slots and three distinct PRE horizons. For every 15-minute service bin we have separate prospective AeroDataBox FIDS query opportunities at T−24h, T−6h and T−90m, so activity for adjacent cohorts can overlap. A worker waking up every 5 or 10 minutes is just the control plane; it does not necessarily perform a paid GET. Our per-flight PRE and actual POST are accepted only after signed source, identity, cutoff, payment and independent evidence checks. I use one all-day agenda per California date to see all planned query clocks without cluttering the hour-by-hour calendar, while the GitHub JSON remains the source of truth."**
