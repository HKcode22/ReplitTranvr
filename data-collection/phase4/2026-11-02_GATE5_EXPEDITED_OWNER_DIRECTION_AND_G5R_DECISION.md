# November 2 2026 — owner-directed Gate5 expedited disposition, no further runway rabbit hole

**Read this before reopening any Phase4/Gate5 work in a new chat.** Binding *prospective* amendment: [V3.9-f.8 Gate5 owner-directed amendment A](../plans/V3.9_f.8_Gate5_Expedited_Collection_Amendment_A_20261102.md). Historical f.8 and Implementation Log remain preserved. Use actual repo PR/Actions evidence, not assistant memory guesses.

## Owner direction and urgency
- A **one-month aviation ML dataset with reduced bias** is the project deliverable. Two-month Phase2 and five-day Phase4/Gate5 investigations were judged unacceptable; **finish Gate5 by November 3, 2026 evening Pacific** if supported by existing evidence and minimal offline code. Do not demand perfection, 100% coverage, exact runway wheels-off, an AeroDataBox email response or an impossible universal independent flight oracle.
- Small *measured* transient gaps (the accepted benchmark discussed earlier was ≤3 minutes when scientifically justified) and missing observations can be accepted **with explicit missingness/censoring, honest denominators, sensitivity and no retrospective leakage**. A structurally unavailable value must be recorded as unavailable, not invented.
- Owner **authorizes bounded paid work**, but do not spend more to repeat already-concluded nine Nov2 FIDS source-only GETs. Account identity, grandfathered RapidAPI Team Ultra, historical quota and project 50k-cycle ceiling are in Gate0/issue #300; never ask again by default. Maintain GitHub Actions scheduling only, 6+6 notification recovery and exact budgets. No Cloudflare/Replit Agent, timed Replit session or unnecessary manual commands.
- Plan / implementation log are **not immutable scientific dogma**. Owner explicitly authorizes versioned scientific corrections; keep a clear diff and preserve hash-locked historical records. This amendment implements that direction, not silent mutation.

## Decision to implement now

**Choose primary route A (provider-observable disruption) for the one-month global collection.** Treat the original actual-only wheels-off objective as **secondary/out-of-scope** until independently measured: issue #200 cannot hold Gate5R open forever. Freeze two separately named proposed primary labels: affirmatively observed provider-reported terminal canceled/diverted status, and comparably-versioned provider schedule revision ≥15 minutes. Record unobserved, pending, contradictory or ambiguous labels as missing/censored. Neither is actual takeoff delay. Independent free sources:
- [ADSB.lol](https://www.adsb.lol/docs/open-data/historical): free daily worldwide trace archives, ODbL, aircraft state and inferred takeoff interval **proxy**, not a source of airline schedule or guaranteed same-flight match; optional secondary analysis, not a core-blocking dependency.
- [NOAA Aviation Weather Center](https://aviationweather.gov/data/api/): worldwide METAR and TAF, free weather as-of features; missing weather optional.
- [US BTS](https://www.transtats.bts.gov/Fields.asp?gnoyr_VQ=FGJ): published `WheelsOff`, gate `DepTime`, `CRSDepTime` for eligible US reporting carriers; **months-delayed domestic reference** only, not WSSS live labels.
- [FAA national airport status](https://www.fly.faa.gov/fly/flyfaa/plaintext.html): **US airport-level** traffic management/delays, no flight-specific label; optional context, not a ground truth.
- OpenSky API is **not a free operational shortcut**: [official terms](https://opensky-network.org/about/terms-of-use) require prior written agreement for operational automated REST integration and cannot supply commercial schedules. No OpenSky production adapter.

**Already actual:** Nov2 WSSS 9/9 GETs/18 REST units, three original GH runs 41309044744 / 41402736335 / 41437078179, independent GH log audit 41477141869, frozen immutable source-only status JSON; no actual original flight ID/body, PRE or POST persisted. Gate5 revised G5-R **readiness** may be marked PASS by exact-source verifier + CI; original f.8 scientific gate remains historical HOLD. Do not interpret 542 repeated response rows as 542 flights.

### Minimal acceptance and task order

1. **Now in GitHub**: merge amendment + no-provider `phase4Gate5ExpeditedReadinessV39.ts` and its tests, date-stamped checkpoint. Actual CI must pass. Run independent GitHub-only no-secrets verification on main and check `GATE5_REVISED_COLLECTION_READINESS_PASS`. This is a scoped **Phase4 operational readiness** result and permits immediate **Phase5 planning**. It cannot activate Phase6 or certify a dataset.
2. **Next without redoing source-only pilots**: short Phase5 freeze checklist focused on approved source class/24h use-expiry, existing tested V0076 plus staged V0077 role install if required, actual future source producer and one-snapshot-per-eligible-flight PRE builder. Verify that neither source expiry nor billing/stop can go unbounded. No fresh huge scientific proof matrix, no provider-runway email dependency.
3. **First 24h of an explicitly authorized and lawful month run**: use the real collection itself to validate independent unique operating-leg denominator, as-of population/S/PRE vs webhook inside/outside/unresolved, actual provider-reported status and schedule-version target counts. Missing measurements become per-stratum missing/censored, not gate FAIL by default. If identities, snapshots, budget, raw-before-2xx or permission fail, stop the affected collector; otherwise GO WITH REPORTED MISSINGNESS and repeat daily audit during the month.
4. Use the existing UTC-rotation, airport stratification, hub/mid/regional sampling and cost caps; don't replace the planned mixed sample with only BTS-US or only ADSB-lol and unintentionally bias geography. 4h windows and cross-region rotation remain baseline. No automatic 1/p inference unless empirical inclusion probabilities are independently measured.
5. **No predetermined Phase6 date or scientific label guarantee** until actual engineering + permitted content use; the Tuesday night target applies to **closing G5R and bounded Phase4 coding**, not inventing source/coverage metrics.

### Honest statuses

- `NOV2_SOURCE_ONLY_OPERATIONAL_PASS`: already true, independently reviewed (9/9, 18).
- `GATE5_REVISED_COLLECTION_READINESS_PASS`: new scope, only when exact artifact + CI/workflow verified. It does **not** describe flight-level representativeness or label coverage.
- `ORIGINAL_F8_GATE5_RUNWAY_ACTUAL_ONLY`: historical HOLD; remove from new collection gate, document as secondary unavailable.
- `PHASE5_FROZEN` / `PHASE6_AUTHORIZED` / `FIRST_DAY_LIVE_DENOMINATOR_AUDIT`: **not automatic**, must be evidenced by distinct outputs.
- `EXTERNAL_PROVIDER_RESPONSE`: NOT REQUIRED for revised primary target; if it arrives, record it and decide whether new secondary analysis is warranted, do not wait.
- `AERODATABOX_CONTENT_PERMITTED`: subject to actual source terms, limited cache and use. The provider general max 7-day/Nov7 policy is *not* a grant of one-month permanent flight-level storage. This is the **real scope-specific data-use issue to solve through compliant design**, not a pretext to delay offline engineering; free/ODbL sources can be collected separately under their actual conditions.

**No new paid request, production migration, secret write, or automated Phase6 start is authorized by this checkpoint alone.**
