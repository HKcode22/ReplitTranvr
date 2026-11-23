# Phase 6 — COMPLETE 31-STUDY-DAY SOURCE / PRE / POST SCHEDULE (California PST + UTC)

**ONE authoritative operator calendar for all 31 study days.** Prepared 2026-11-23 PST from frozen **production main `c8e065d665ccacb6d2575070e94c5500b7583044`**. This file is an explanatory view of already reviewed signed plans, not a change to the frozen study, not paid GO, not proof of collection. Kept on **documentation/evidence branch `phase6/20261122-g8-502-readback-evidence`**, not production main. If the signed release identity changes, STOP and independently review rather than silently rewrite these slots.

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
| [01](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-01.json) | train | 2026-11-25 UTC | 4h | 11/24 4:00p–11/24 8:00p | None | 192 |
| [02](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-02.json) | train | 2026-11-26 UTC | 4h | 11/25 8:00p–11/26 12:00a | None | 192 |
| [03](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-03.json) | train | 2026-11-27 UTC | 2 × 2h | 11/27 12:00a–11/27 2:00a | 11/27 3:00a–11/27 5:00a | 11/27 2:00a–11/27 3:00a | 192 |
| [04](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-04.json) | train | 2026-11-28 UTC | 4h | 11/28 4:00a–11/28 8:00a | None | 192 |
| [05](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-05.json) | train | 2026-11-30 UTC | 6h | 11/30 8:00a–11/30 2:00p | None | 288 |
| [06](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-06.json) | train | 2026-12-01 UTC | 4h | 12/01 12:00p–12/01 4:00p | None | 192 |
| [07](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-07.json) | train | 2026-12-02 UTC | 2 × 2h | 12/01 4:00p–12/01 6:00p | 12/01 7:00p–12/01 9:00p | 12/01 6:00p–12/01 7:00p | 192 |
| [08](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-08.json) | train | 2026-12-03 UTC | 2 × 2h | 12/02 8:00p–12/02 10:00p | 12/02 11:00p–12/03 1:00a | 12/02 10:00p–12/02 11:00p | 192 |
| [09](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-09.json) | train | 2026-12-04 UTC | 4h | 12/04 12:00a–12/04 4:00a | None | 192 |
| [10](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-10.json) | train | 2026-12-05 UTC | 6h | 12/05 4:00a–12/05 10:00a | None | 288 |
| [11](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-11.json) | train | 2026-12-07 UTC | 4h | 12/07 8:00a–12/07 12:00p | None | 192 |
| [12](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-12.json) | train | 2026-12-08 UTC | 4h | 12/08 12:00p–12/08 4:00p | None | 192 |
| [13](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-13.json) | train | 2026-12-09 UTC | 4h | 12/08 4:00p–12/08 8:00p | None | 192 |
| [14](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-14.json) | train | 2026-12-10 UTC | 4h | 12/09 8:00p–12/10 12:00a | None | 192 |
| [15](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-15.json) | train | 2026-12-11 UTC | 4h | 12/11 12:00a–12/11 4:00a | None | 192 |
| [16](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-16.json) | train | 2026-12-12 UTC | 4h | 12/12 4:00a–12/12 8:00a | None | 192 |
| [17](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-17.json) | train | 2026-12-13 UTC | 4h | 12/13 8:00a–12/13 12:00p | None | 192 |
| [18](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-18.json) | train | 2026-12-14 UTC | 4h | 12/14 12:00p–12/14 4:00p | None | 192 |
| [19](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-19.json) | train | 2026-12-15 UTC | 4h | 12/14 4:00p–12/14 8:00p | None | 192 |
| [20](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-20.json) | train | 2026-12-16 UTC | 4h | 12/15 8:00p–12/16 12:00a | None | 192 |
| [21](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-21.json) | validation | 2026-12-17 UTC | 4h | 12/17 12:00a–12/17 4:00a | None | 192 |
| [22](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-22.json) | validation | 2026-12-18 UTC | 4h | 12/18 4:00a–12/18 8:00a | None | 192 |
| [23](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-23.json) | validation | 2026-12-19 UTC | 4h | 12/19 8:00a–12/19 12:00p | None | 192 |
| [24](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-24.json) | validation | 2026-12-20 UTC | 4h | 12/20 12:00p–12/20 4:00p | None | 192 |
| [25](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-25.json) | validation | 2026-12-21 UTC | 4h | 12/20 4:00p–12/20 8:00p | None | 192 |
| [26](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-26.json) | test | 2026-12-22 UTC | 4h | 12/21 8:00p–12/22 12:00a | None | 192 |
| [27](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-27.json) | test | 2026-12-23 UTC | 4h | 12/23 12:00a–12/23 4:00a | None | 192 |
| [28](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-28.json) | test | 2026-12-24 UTC | 4h | 12/24 4:00a–12/24 8:00a | None | 192 |
| [29](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-29.json) | test | 2026-12-25 UTC | 4h | 12/25 8:00a–12/25 12:00p | None | 192 |
| [30](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-30.json) | test | 2026-12-26 UTC | 4h | 12/26 12:00p–12/26 4:00p | None | 192 |
| [31](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-31.json) | test | 2026-12-27 UTC | 4h | 12/26 4:00p–12/26 8:00p | None | 192 |

**Verified geometry:** 31 study days; 20 train + 5 validation + 6 test; 26 ordinary 4h + 3 split 2×2h + 2 six-hour = 128 active exposure hours and 34 active service segments. 6,144 scheduled SOURCE query templates; four airport slots; three horizons. **The 10 paired days show candidate ICAOs, not proof of a completed, signed actual airport draw. The other 21 require prospective DB draws.**

## B. EVERY planned T−24h / T−6h / T−90m SOURCE wave (PST, day-by-day)

Each cell describes the **first** and **last** exact planned query clock slots, in California local date/time. Within an uninterrupted interval, planned slots occur at **15-minute increments INCLUDING both endpoints**. If there are TWO separated intervals, the middle gap has **zero planned slots** for that segment. **These are FIDS request slots, not a promise that PRE snapshots commit at those minutes.** Clock wake/queue jitter may cause missing/late attempts and must be recorded.

| Day | T−24h SOURCE planned slots (PST) | T−6h SOURCE planned slots (PST) | T−90m SOURCE planned slots (PST) |
|---:|---|---|---|
| **01** | 11/23 3:45p–11/23 7:30p | 11/24 9:45a–11/24 1:30p | 11/24 2:15p–11/24 6:00p |
| **02** | 11/24 7:45p–11/24 11:30p | 11/25 1:45p–11/25 5:30p | 11/25 6:15p–11/25 10:00p |
| **03** | 11/25 11:45p–11/26 1:30a | 11/26 2:45a–11/26 4:30a | 11/26 5:45p–11/26 7:30p | 11/26 8:45p–11/26 10:30p | 11/26 10:15p–11/27 12:00a | 11/27 1:15a–11/27 3:00a |
| **04** | 11/27 3:45a–11/27 7:30a | 11/27 9:45p–11/28 1:30a | 11/28 2:15a–11/28 6:00a |
| **05** | 11/29 7:45a–11/29 1:30p | 11/30 1:45a–11/30 7:30a | 11/30 6:15a–11/30 12:00p |
| **06** | 11/30 11:45a–11/30 3:30p | 12/01 5:45a–12/01 9:30a | 12/01 10:15a–12/01 2:00p |
| **07** | 11/30 3:45p–11/30 5:30p | 11/30 6:45p–11/30 8:30p | 12/01 9:45a–12/01 11:30a | 12/01 12:45p–12/01 2:30p | 12/01 2:15p–12/01 4:00p | 12/01 5:15p–12/01 7:00p |
| **08** | 12/01 7:45p–12/01 9:30p | 12/01 10:45p–12/02 12:30a | 12/02 1:45p–12/02 3:30p | 12/02 4:45p–12/02 6:30p | 12/02 6:15p–12/02 8:00p | 12/02 9:15p–12/02 11:00p |
| **09** | 12/02 11:45p–12/03 3:30a | 12/03 5:45p–12/03 9:30p | 12/03 10:15p–12/04 2:00a |
| **10** | 12/04 3:45a–12/04 9:30a | 12/04 9:45p–12/05 3:30a | 12/05 2:15a–12/05 8:00a |
| **11** | 12/06 7:45a–12/06 11:30a | 12/07 1:45a–12/07 5:30a | 12/07 6:15a–12/07 10:00a |
| **12** | 12/07 11:45a–12/07 3:30p | 12/08 5:45a–12/08 9:30a | 12/08 10:15a–12/08 2:00p |
| **13** | 12/07 3:45p–12/07 7:30p | 12/08 9:45a–12/08 1:30p | 12/08 2:15p–12/08 6:00p |
| **14** | 12/08 7:45p–12/08 11:30p | 12/09 1:45p–12/09 5:30p | 12/09 6:15p–12/09 10:00p |
| **15** | 12/09 11:45p–12/10 3:30a | 12/10 5:45p–12/10 9:30p | 12/10 10:15p–12/11 2:00a |
| **16** | 12/11 3:45a–12/11 7:30a | 12/11 9:45p–12/12 1:30a | 12/12 2:15a–12/12 6:00a |
| **17** | 12/12 7:45a–12/12 11:30a | 12/13 1:45a–12/13 5:30a | 12/13 6:15a–12/13 10:00a |
| **18** | 12/13 11:45a–12/13 3:30p | 12/14 5:45a–12/14 9:30a | 12/14 10:15a–12/14 2:00p |
| **19** | 12/13 3:45p–12/13 7:30p | 12/14 9:45a–12/14 1:30p | 12/14 2:15p–12/14 6:00p |
| **20** | 12/14 7:45p–12/14 11:30p | 12/15 1:45p–12/15 5:30p | 12/15 6:15p–12/15 10:00p |
| **21** | 12/15 11:45p–12/16 3:30a | 12/16 5:45p–12/16 9:30p | 12/16 10:15p–12/17 2:00a |
| **22** | 12/17 3:45a–12/17 7:30a | 12/17 9:45p–12/18 1:30a | 12/18 2:15a–12/18 6:00a |
| **23** | 12/18 7:45a–12/18 11:30a | 12/19 1:45a–12/19 5:30a | 12/19 6:15a–12/19 10:00a |
| **24** | 12/19 11:45a–12/19 3:30p | 12/20 5:45a–12/20 9:30a | 12/20 10:15a–12/20 2:00p |
| **25** | 12/19 3:45p–12/19 7:30p | 12/20 9:45a–12/20 1:30p | 12/20 2:15p–12/20 6:00p |
| **26** | 12/20 7:45p–12/20 11:30p | 12/21 1:45p–12/21 5:30p | 12/21 6:15p–12/21 10:00p |
| **27** | 12/21 11:45p–12/22 3:30a | 12/22 5:45p–12/22 9:30p | 12/22 10:15p–12/23 2:00a |
| **28** | 12/23 3:45a–12/23 7:30a | 12/23 9:45p–12/24 1:30a | 12/24 2:15a–12/24 6:00a |
| **29** | 12/24 7:45a–12/24 11:30a | 12/25 1:45a–12/25 5:30a | 12/25 6:15a–12/25 10:00a |
| **30** | 12/25 11:45a–12/25 3:30p | 12/26 5:45a–12/26 9:30a | 12/26 10:15a–12/26 2:00p |
| **31** | 12/25 3:45p–12/25 7:30p | 12/26 9:45a–12/26 1:30p | 12/26 2:15p–12/26 6:00p |

**Read one row example:** Day 01 has 4 airports × 16 quarter-hour positions for T−24h, again for T−6h and T−90m (192 templates). The actual per-flight T−6h PRE must be published before *that individual flight's* native T−6h cutoff, not merely sometime inside this FIDS span.

## C. Same complete schedule in UTC, for comparing GitHub logs and database timestamps

The UTC values omit the year from each cell (**all dates 2026**); no local time conversions are needed when matching `scheduledRequestUtc`. Distinct chunks separated by `; ` represent split-service segments.

| Day | Service UTC | T−24h SOURCE UTC | T−6h SOURCE UTC | T−90m SOURCE UTC |
|---:|---|---|---|---|
| 01 | 11-25 00:00–11-25 04:00 | 11-23 23:45–11-24 03:30 | 11-24 17:45–11-24 21:30 | 11-24 22:15–11-25 02:00 |
| 02 | 11-26 04:00–11-26 08:00 | 11-25 03:45–11-25 07:30 | 11-25 21:45–11-26 01:30 | 11-26 02:15–11-26 06:00 |
| 03 | 11-27 08:00–11-27 10:00 ; 11-27 11:00–11-27 13:00 | 11-26 07:45–11-26 09:30 | 11-26 10:45–11-26 12:30 | 11-27 01:45–11-27 03:30 | 11-27 04:45–11-27 06:30 | 11-27 06:15–11-27 08:00 | 11-27 09:15–11-27 11:00 |
| 04 | 11-28 12:00–11-28 16:00 | 11-27 11:45–11-27 15:30 | 11-28 05:45–11-28 09:30 | 11-28 10:15–11-28 14:00 |
| 05 | 11-30 16:00–11-30 22:00 | 11-29 15:45–11-29 21:30 | 11-30 09:45–11-30 15:30 | 11-30 14:15–11-30 20:00 |
| 06 | 12-01 20:00–12-02 00:00 | 11-30 19:45–11-30 23:30 | 12-01 13:45–12-01 17:30 | 12-01 18:15–12-01 22:00 |
| 07 | 12-02 00:00–12-02 02:00 ; 12-02 03:00–12-02 05:00 | 11-30 23:45–12-01 01:30 | 12-01 02:45–12-01 04:30 | 12-01 17:45–12-01 19:30 | 12-01 20:45–12-01 22:30 | 12-01 22:15–12-02 00:00 | 12-02 01:15–12-02 03:00 |
| 08 | 12-03 04:00–12-03 06:00 ; 12-03 07:00–12-03 09:00 | 12-02 03:45–12-02 05:30 | 12-02 06:45–12-02 08:30 | 12-02 21:45–12-02 23:30 | 12-03 00:45–12-03 02:30 | 12-03 02:15–12-03 04:00 | 12-03 05:15–12-03 07:00 |
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
**Planned service/exposure (PST):** 11/24 4:00p–11/24 8:00p.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 11/23 3:45p–11/23 7:30p.
- T−6h: 11/24 9:45a–11/24 1:30p.
- T−90m: 11/24 2:15p–11/24 6:00p.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 11/21 4:00p to 11/23 3:14p. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 1 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-01.json).

### Day 02 — 2026-11-26 UTC — TRAIN — 4h
**Airports:** HUB WSSS, MID_A SBFL, MID_B TJSJ, REGIONAL LSZB. Paired candidate, subject to actual approved prospective DB draw.
**Planned service/exposure (PST):** 11/25 8:00p–11/26 12:00a.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 11/24 7:45p–11/24 11:30p.
- T−6h: 11/25 1:45p–11/25 5:30p.
- T−90m: 11/25 6:15p–11/25 10:00p.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 11/22 8:00p to 11/24 7:14p. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 2 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-02.json).

### Day 03 — 2026-11-27 UTC — TRAIN — 2x2h
**Airports:** HUB YSSY, MID_A KBUF, MID_B LFQQ, REGIONAL NZNP. Paired candidate, subject to actual approved prospective DB draw.
**Planned service/exposure (PST):** 11/27 12:00a–11/27 2:00a | 11/27 3:00a–11/27 5:00a.
**Intentional exposure break:** 11/27 2:00a–11/27 3:00a PST. No service exposure in this gap.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 11/25 11:45p–11/26 1:30a | 11/26 2:45a–11/26 4:30a.
- T−6h: 11/26 5:45p–11/26 7:30p | 11/26 8:45p–11/26 10:30p.
- T−90m: 11/26 10:15p–11/27 12:00a | 11/27 1:15a–11/27 3:00a.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 11/24 12:00a to 11/25 11:14p. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 3 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-03.json).

### Day 04 — 2026-11-28 UTC — TRAIN — 4h
**Airports:** HUB SKBO, MID_A EBAW, MID_B NZNS, REGIONAL RJNK. Paired candidate, subject to actual approved prospective DB draw.
**Planned service/exposure (PST):** 11/28 4:00a–11/28 8:00a.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 11/27 3:45a–11/27 7:30a.
- T−6h: 11/27 9:45p–11/28 1:30a.
- T−90m: 11/28 2:15a–11/28 6:00a.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 11/25 4:00a to 11/27 3:14a. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 4 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-04.json).

### Day 05 — 2026-11-30 UTC — TRAIN — up-to-6h
**Airports:** HUB SKBO, MID_A YBUD, MID_B RKTU, REGIONAL FAKM. Paired candidate, subject to actual approved prospective DB draw.
**Planned service/exposure (PST):** 11/30 8:00a–11/30 2:00p.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 11/29 7:45a–11/29 1:30p.
- T−6h: 11/30 1:45a–11/30 7:30a.
- T−90m: 11/30 6:15a–11/30 12:00p.
- **Total** 288 templates (24 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 11/27 8:00a to 11/29 7:14a. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 5 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-05.json).

### Day 06 — 2026-12-01 UTC — TRAIN — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/01 12:00p–12/01 4:00p.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 11/30 11:45a–11/30 3:30p.
- T−6h: 12/01 5:45a–12/01 9:30a.
- T−90m: 12/01 10:15a–12/01 2:00p.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 11/28 12:00p to 11/30 11:14a. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 6 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-06.json).

### Day 07 — 2026-12-02 UTC — TRAIN — 2x2h
**Airports:** HUB OMAA, MID_A OMSJ, MID_B SPJC, REGIONAL KDEC. Paired candidate, subject to actual approved prospective DB draw.
**Planned service/exposure (PST):** 12/01 4:00p–12/01 6:00p | 12/01 7:00p–12/01 9:00p.
**Intentional exposure break:** 12/01 6:00p–12/01 7:00p PST. No service exposure in this gap.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 11/30 3:45p–11/30 5:30p | 11/30 6:45p–11/30 8:30p.
- T−6h: 12/01 9:45a–12/01 11:30a | 12/01 12:45p–12/01 2:30p.
- T−90m: 12/01 2:15p–12/01 4:00p | 12/01 5:15p–12/01 7:00p.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 11/28 4:00p to 11/30 3:14p. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 7 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-07.json).

### Day 08 — 2026-12-03 UTC — TRAIN — 2x2h
**Airports:** HUB WSSS, MID_A SBFL, MID_B TJSJ, REGIONAL LSZB. Paired candidate, subject to actual approved prospective DB draw.
**Planned service/exposure (PST):** 12/02 8:00p–12/02 10:00p | 12/02 11:00p–12/03 1:00a.
**Intentional exposure break:** 12/02 10:00p–12/02 11:00p PST. No service exposure in this gap.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/01 7:45p–12/01 9:30p | 12/01 10:45p–12/02 12:30a.
- T−6h: 12/02 1:45p–12/02 3:30p | 12/02 4:45p–12/02 6:30p.
- T−90m: 12/02 6:15p–12/02 8:00p | 12/02 9:15p–12/02 11:00p.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 11/29 8:00p to 12/01 7:14p. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 8 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-08.json).

### Day 09 — 2026-12-04 UTC — TRAIN — 4h
**Airports:** HUB YSSY, MID_A KBUF, MID_B LFQQ, REGIONAL NZNP. Paired candidate, subject to actual approved prospective DB draw.
**Planned service/exposure (PST):** 12/04 12:00a–12/04 4:00a.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/02 11:45p–12/03 3:30a.
- T−6h: 12/03 5:45p–12/03 9:30p.
- T−90m: 12/03 10:15p–12/04 2:00a.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/01 12:00a to 12/02 11:14p. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 9 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-09.json).

### Day 10 — 2026-12-05 UTC — TRAIN — up-to-6h
**Airports:** HUB SKBO, MID_A EBAW, MID_B NZNS, REGIONAL RJNK. Paired candidate, subject to actual approved prospective DB draw.
**Planned service/exposure (PST):** 12/05 4:00a–12/05 10:00a.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/04 3:45a–12/04 9:30a.
- T−6h: 12/04 9:45p–12/05 3:30a.
- T−90m: 12/05 2:15a–12/05 8:00a.
- **Total** 288 templates (24 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/02 4:00a to 12/04 3:14a. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 10 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-10.json).

### Day 11 — 2026-12-07 UTC — TRAIN — 4h
**Airports:** HUB SKBO, MID_A YBUD, MID_B RKTU, REGIONAL FAKM. Paired candidate, subject to actual approved prospective DB draw.
**Planned service/exposure (PST):** 12/07 8:00a–12/07 12:00p.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/06 7:45a–12/06 11:30a.
- T−6h: 12/07 1:45a–12/07 5:30a.
- T−90m: 12/07 6:15a–12/07 10:00a.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/04 8:00a to 12/06 7:14a. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 11 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-11.json).

### Day 12 — 2026-12-08 UTC — TRAIN — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/08 12:00p–12/08 4:00p.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/07 11:45a–12/07 3:30p.
- T−6h: 12/08 5:45a–12/08 9:30a.
- T−90m: 12/08 10:15a–12/08 2:00p.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/05 12:00p to 12/07 11:14a. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 12 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-12.json).

### Day 13 — 2026-12-09 UTC — TRAIN — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/08 4:00p–12/08 8:00p.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/07 3:45p–12/07 7:30p.
- T−6h: 12/08 9:45a–12/08 1:30p.
- T−90m: 12/08 2:15p–12/08 6:00p.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/05 4:00p to 12/07 3:14p. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 13 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-13.json).

### Day 14 — 2026-12-10 UTC — TRAIN — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/09 8:00p–12/10 12:00a.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/08 7:45p–12/08 11:30p.
- T−6h: 12/09 1:45p–12/09 5:30p.
- T−90m: 12/09 6:15p–12/09 10:00p.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/06 8:00p to 12/08 7:14p. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 14 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-14.json).

### Day 15 — 2026-12-11 UTC — TRAIN — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/11 12:00a–12/11 4:00a.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/09 11:45p–12/10 3:30a.
- T−6h: 12/10 5:45p–12/10 9:30p.
- T−90m: 12/10 10:15p–12/11 2:00a.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/08 12:00a to 12/09 11:14p. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 15 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-15.json).

### Day 16 — 2026-12-12 UTC — TRAIN — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/12 4:00a–12/12 8:00a.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/11 3:45a–12/11 7:30a.
- T−6h: 12/11 9:45p–12/12 1:30a.
- T−90m: 12/12 2:15a–12/12 6:00a.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/09 4:00a to 12/11 3:14a. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 16 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-16.json).

### Day 17 — 2026-12-13 UTC — TRAIN — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/13 8:00a–12/13 12:00p.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/12 7:45a–12/12 11:30a.
- T−6h: 12/13 1:45a–12/13 5:30a.
- T−90m: 12/13 6:15a–12/13 10:00a.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/10 8:00a to 12/12 7:14a. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 17 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-17.json).

### Day 18 — 2026-12-14 UTC — TRAIN — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/14 12:00p–12/14 4:00p.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/13 11:45a–12/13 3:30p.
- T−6h: 12/14 5:45a–12/14 9:30a.
- T−90m: 12/14 10:15a–12/14 2:00p.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/11 12:00p to 12/13 11:14a. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 18 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-18.json).

### Day 19 — 2026-12-15 UTC — TRAIN — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/14 4:00p–12/14 8:00p.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/13 3:45p–12/13 7:30p.
- T−6h: 12/14 9:45a–12/14 1:30p.
- T−90m: 12/14 2:15p–12/14 6:00p.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/11 4:00p to 12/13 3:14p. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 19 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-19.json).

### Day 20 — 2026-12-16 UTC — TRAIN — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/15 8:00p–12/16 12:00a.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/14 7:45p–12/14 11:30p.
- T−6h: 12/15 1:45p–12/15 5:30p.
- T−90m: 12/15 6:15p–12/15 10:00p.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/12 8:00p to 12/14 7:14p. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 20 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-20.json).

### Day 21 — 2026-12-17 UTC — VALIDATION — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/17 12:00a–12/17 4:00a.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/15 11:45p–12/16 3:30a.
- T−6h: 12/16 5:45p–12/16 9:30p.
- T−90m: 12/16 10:15p–12/17 2:00a.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/14 12:00a to 12/15 11:14p. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 21 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-21.json).

### Day 22 — 2026-12-18 UTC — VALIDATION — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/18 4:00a–12/18 8:00a.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/17 3:45a–12/17 7:30a.
- T−6h: 12/17 9:45p–12/18 1:30a.
- T−90m: 12/18 2:15a–12/18 6:00a.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/15 4:00a to 12/17 3:14a. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 22 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-22.json).

### Day 23 — 2026-12-19 UTC — VALIDATION — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/19 8:00a–12/19 12:00p.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/18 7:45a–12/18 11:30a.
- T−6h: 12/19 1:45a–12/19 5:30a.
- T−90m: 12/19 6:15a–12/19 10:00a.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/16 8:00a to 12/18 7:14a. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 23 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-23.json).

### Day 24 — 2026-12-20 UTC — VALIDATION — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/20 12:00p–12/20 4:00p.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/19 11:45a–12/19 3:30p.
- T−6h: 12/20 5:45a–12/20 9:30a.
- T−90m: 12/20 10:15a–12/20 2:00p.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/17 12:00p to 12/19 11:14a. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 24 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-24.json).

### Day 25 — 2026-12-21 UTC — VALIDATION — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/20 4:00p–12/20 8:00p.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/19 3:45p–12/19 7:30p.
- T−6h: 12/20 9:45a–12/20 1:30p.
- T−90m: 12/20 2:15p–12/20 6:00p.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/17 4:00p to 12/19 3:14p. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 25 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-25.json).

### Day 26 — 2026-12-22 UTC — TEST — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/21 8:00p–12/22 12:00a.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/20 7:45p–12/20 11:30p.
- T−6h: 12/21 1:45p–12/21 5:30p.
- T−90m: 12/21 6:15p–12/21 10:00p.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/18 8:00p to 12/20 7:14p. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 26 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-26.json).

### Day 27 — 2026-12-23 UTC — TEST — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/23 12:00a–12/23 4:00a.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/21 11:45p–12/22 3:30a.
- T−6h: 12/22 5:45p–12/22 9:30p.
- T−90m: 12/22 10:15p–12/23 2:00a.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/20 12:00a to 12/21 11:14p. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 27 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-27.json).

### Day 28 — 2026-12-24 UTC — TEST — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/24 4:00a–12/24 8:00a.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/23 3:45a–12/23 7:30a.
- T−6h: 12/23 9:45p–12/24 1:30a.
- T−90m: 12/24 2:15a–12/24 6:00a.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/21 4:00a to 12/23 3:14a. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 28 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-28.json).

### Day 29 — 2026-12-25 UTC — TEST — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/25 8:00a–12/25 12:00p.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/24 7:45a–12/24 11:30a.
- T−6h: 12/25 1:45a–12/25 5:30a.
- T−90m: 12/25 6:15a–12/25 10:00a.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/22 8:00a to 12/24 7:14a. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 29 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-29.json).

### Day 30 — 2026-12-26 UTC — TEST — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/26 12:00p–12/26 4:00p.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/25 11:45a–12/25 3:30p.
- T−6h: 12/26 5:45a–12/26 9:30a.
- T−90m: 12/26 10:15a–12/26 2:00p.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/23 12:00p to 12/25 11:14a. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
**Actual PRE and POST:** derive true individual cutoffs from each admitted flight's frozen scheduled T and independent source evidence. Do not claim snapshot or actual gate-out label solely from these clock slots.
**Pinned exact source:** [signed Day 30 planning JSON](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/data-collection/phase5/planning/phase6-source-day-30.json).

### Day 31 — 2026-12-27 UTC — TEST — 4h
**Airports:** Adaptive prospective draw — ICAOs not frozen. Four airports will be chosen only by the approved future prospective draw; do not invent ICAOs.
**Planned service/exposure (PST):** 12/26 4:00p–12/26 8:00p.
**Intentional exposure break:** None within this service span; gaps between separate study days are not failures.
**Scheduled SOURCE FIDS request slots (PST; one four-airport wave every 15 minutes within each listed segment, not guaranteed actual execution):**
- T−24h: 12/25 3:45p–12/25 7:30p.
- T−6h: 12/26 9:45a–12/26 1:30p.
- T−90m: 12/26 2:15p–12/26 6:00p.
- **Total** 192 templates (16 distinct timestamps × 4 airport slots × 3 horizons), at most one physical GET per template; original metadata budgets 2 REST units per planned source attempt.
**Approved early four-airport draw eligible interval (PST, separate control-plane workflow, not a paid FIDS call):** 12/23 4:00p to 12/25 3:14p. Eligibility is NOT proof selection executed; paid GO/actual DB clock/rights also apply.
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


## I. Verified Google Calendar creation and independent readback — November 23, 2026 PST

**Status: CALENDAR POPULATED and independently read back; not a data-collection launch receipt.** The connected Google Calendar primary account `hk84164@gmail.com` was written with **138 actual events**, and a fresh bounded Google Calendar search retrieved **exactly 138**, with **no pagination**. A programmatic one-to-one check of **every** scientific event against the unchanged frozen service/horizon geometry found **0 missing entries and 0 date/time mismatches**:

| Class | Actual calendar events | What it signifies |
|---|---:|---|
| Flight-service/exposure segments | **34** | 31 study days with three split days represented as two separate service events; excluded 1h breaks are NOT blocked/exposed |
| Planned T−24h/T−6h/T−90m SOURCE 15m clock-slot windows | **102** | 3 horizon windows for each of the 34 active exposure segments; exactly one event per horizon per segment, with 15m planned request ticks within |
| Actual owner launch action reminders | **2** | Mon Nov23 G13 1:50–strictly before 3:10 PM PST, then conditional G9 at/after 3:45 PM PST; not automatic paid calls |
| **TOTAL** | **138** | 138 existing Google Calendar items in the connected primary calendar; 0 schedule-entry mismatches |

**Find every event:** Open [Google Calendar](https://calendar.google.com/calendar/u/0/r), use **Search → `P6`**, and view Week/Month. Every scientific event title begins `P6 D01` through `P6 D31` and contains either `SERVICE`, `T-24h SOURCE`, `T-6h SOURCE`, or `T-90m SOURCE`. Scientific events have **no automatic reminders**, are **private** and **transparent (free, not blocking other engagements)** and have no attendees or video meeting. The SOURCE window event visual end adds **one final 15-minute display interval** after the last exact signed slot: the event's final minute is **not** another paid FIDS request or a guaranteed PRE.

**Owner action event links:** [G13 owner signed approval, Nov23 1:50–3:10 PM PST](https://www.google.com/calendar/event?eid=dGR0bGJvZzVzNGhibGNoaDdvM2g4bjh2aHMgaGs4NDE2NEBt) (30m and 10m popup reminders); [G9 conditional DIRECT_TICK after actual GO, Nov23 3:45 PM PST](https://www.google.com/calendar/event?eid=ZnRicDFmcThjc202YTVwbXYxb25zY3JuYjQgaGs4NDE2NEBt) (10m popup). The G9 time block **does not authorize running it before confirmed G13 success**.

**Important user calendar timezone warning:** The connected Google primary calendar currently has its **default timezone set to `Asia/Karachi` (UTC+05)**, although all 138 entries were created using **`America/Los_Angeles`, PST UTC−08**, for the correct absolute instants. A Google Calendar interface set to Karachi will therefore render e.g. **Nov23 3:45 PM California as Nov24 4:45 AM Karachi**, not as the California clock shown in this file. Set the *calendar viewing time zone* to Los Angeles in Google Calendar settings if you want the UI labels to match this checkpoint. **The tool did not change your existing global calendar settings.**

**Notion Calendar:** These are directly written **Google Calendar** events. If your Notion Calendar app is connected to this same Google calendar, it can display them; that integration was **not independently verified**, and **no duplicate Notion database events** were created. This single GitHub file is the detailed scientific source; the calendar is a human-readable overlay.

**Limit of calendar verification:** This verifies successful *calendar writes*, not that the provider was queried, charged, returned original bytes, or that every prospective aircraft produced a cutoff-safe PRE and qualified actual POST. Actual outcome time cannot be known ahead of each flight and was deliberately **not fabricated** as a pre-dated event. Any future live operational changes need their own independently verified runtime evidence.
