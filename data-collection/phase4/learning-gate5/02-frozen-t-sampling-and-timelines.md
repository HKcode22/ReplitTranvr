# 02 — The exact clocks: T, cutoff, source slot, prearm and POST

## 1. One flight has several timestamps

- **Frozen T:** the first selected provider-reported *scheduled departure* for that flight, recorded so later schedule changes do not move our prediction deadlines.
- **C24 = T−24h, C6 = T−6h, C90 = T−90m:** three *per-flight* prediction cutoffs, not three flights.
- **Physical source time:** when GitHub actually contacts AeroDataBox for the *whole airport service window*.
- **Source availability / PRE commit time:** when durable data is available in PostgreSQL (can be later than the HTTP request).
- **Watermark W = T+2h:** latest admissible time for this protocol's observed POST schedule-revision label; it is not automatically an actual wheels-off clock.

## 2. Read the frozen grid file first

`data-collection/phase4/GATE5_G5A_WSSS_20261106_1400Z_FROZEN_SOURCE_GRID.json`:

```json
{
  "cohortId": "WSSS_G5A_20261106_1400Z",
  "grid": {
    "airportIcao": "WSSS",
    "airportIanaTimezone": "Asia/Singapore",
    "serviceWindowStartUtc": "2026-11-06T14:00:00.000Z",
    "serviceWindowEndUtc": "2026-11-06T15:00:00.000Z",
    "acquisitionGuardMinutes": 30,
    "refreshCadenceMinutes": 30,
    "maxStalenessMinutes": 45,
    "githubPrearmLeadMinutes": 15,
    "apiUnitsPerPhysicalAttempt": 2,
    "maxAttemptsPerQuery": 1,
    "projectRestApiUnitsBudget": 24,
    "maxSourceQueries": 9
  }
}
```

WSSS is Singapore Changi. 14–15 UTC on Nov 6 is **10–11 PM Singapore time** and **6–7 AM Pacific Standard Time**. This 1-hour interval is the **study's selected scheduled-departure window**. The 12 actual frozen flight T timestamps previously checked span about 6:05–6:55 AM PST.

## 3. Table of the actual experiment (PST)

| Horizon | Source #0 | Source #1 | Source #2 | Individual flight cutoffs |
|---|---|---|---|---|
| T−24h | Thu Nov 5 5:30 AM | 6:00 AM | 6:30 AM | Thu ~6:05–6:55 AM |
| T−6h | Thu 11:30 PM | Fri 12:00 AM | Fri 12:30 AM | Fri ~12:05–12:55 AM |
| T−90m | Fri 4:00 AM | 4:30 AM | 5:00 AM | Fri ~4:35–5:25 AM |
| POST | Fri 7:40 AM | 8:10 AM | 8:40 AM | W = each T + 2h, about 8:05–8:55 AM |

**Why three sources in one horizon?** Flight cutoffs span roughly one hour. Taking snapshots of the *whole flight board* every 30 minutes makes a newer source available for later-cutoff flights without silently changing the selected population. A 5:00 AM source may help a 5:25 AM cutoff; it must **not** be used to rebuild a 4:35 AM PRE.

## 4. Trace the grid generator by blocks

Open `server/lib/disruption/phase4Gate5FrozenGridDraft_v39.ts` and find `draftP4Gate5ThreeHorizonGridV39`:

**Block A — validate inputs:** check valid airport ICAO, exact UTC timestamps, strictly ordered window, cadence <= staleness, local timezone and DST boundaries, max number of queries, per-request units and project budget.

**Block B — generate candidate target times:**

```ts
const earliestTarget = start - lag * 60000;
const latestTarget = end - lag * 60000;
for (let t = earliestTarget; t <= latestTarget; t += cadence * 60000) {
  targets.push(t);
}
```

`lag` is in minutes; `60000` converts a minute to milliseconds. Here `targets` are **grid cutoff targets**, not the precise departures of individual flights.

**Block C — move the physical request earlier:**

```ts
const firstDispatch = targets[0] - guard * 60000;
const lastDispatch = targets[targets.length - 1] - guard * 60000;
const prearmDeadline = firstDispatch - lead * 60000;
```

`guard=30` explains why a horizon's physical observations happen **30 minutes before corresponding time-grid targets**. `lead=15` is a minimum planned owner prearm lead, not the full waiting duration. The additional actual-owner guard may require a significantly earlier proven runner start.

**Block D — bound the budget:**

```ts
const worst = queries.length * attempts * units;
if (worst > budget)
  throw Error("P4_GRID_WORST_CASE_API_UNITS_OVER_BUDGET");
```

There are 9 PRE source queries across 3 horizons × 3 slots each, max 1 physical attempt per query × 2 units = **18 PRE API units**. The frozen total project ceiling of 24 leaves **6** units for 3 POST requests. It is a **reservation/maximum accounting model**, not independently verified provider billing.

## 5. Work one imaginary flight from beginning to end

Hypothetical Flight A, originally scheduled at **Friday 6:15 AM PST**:

```text
Frozen T         = Fri 06:15
T-24h cutoff     = Thu 06:15
T-6h cutoff      = Fri 00:15
T-90m cutoff     = Fri 04:45
POST watermark   = Fri 08:15  (= T+2h)
```

The T90 writer can commit its PRE only in the *three minutes before* 4:45, so approximately 4:42–4:45 AM. A 4:30 source may be used if it's already durably available. A 5:00 response cannot be used for that cutoff. At 8:10 POST may supply an observation for Flight A; at 8:40, an observation would be **beyond** its 8:15 watermark. The latter cannot be presented as if it was available by W.

## 6. Prearm versus source versus cutoff versus closeout

```text
01:15 Fri — GitHub source owner starts/authenticates; 0 provider GETs yet
04:00     — first FIDS GET
04:30     — second FIDS GET
04:32     — first PRE becomes eligible (first T90 cutoff 04:35)
05:00     — third FIDS GET
05:25     — last frozen per-flight T90 cutoff
~05:30    — owner closeout log / job completion expected
06:40–07:22 — optional scheduled backup prearms for separate POST job
07:40     — POST source #0
08:10     — POST source #1
08:40     — POST source #2
~09:01    — POST aggregate
09:12–09:30 — independent read-only audits
```

A **prearmed owner** is a job that started early enough to credibly make future source requests, not a claim that takeoff or the source API call already occurred. A **closeout** is the program's summary when its observation window ends, not a specific aircraft's takeoff. A **POST prearm** is a *new GitHub job* that must start before 07:25 even though its first POST GET is 07:40.

## 7. Why not just do one GET, or why not one per flight?

One GET per flight would be costly, could bias sampling toward flights the system already knows, and might provide different observation conditions per identity. Using a **fixed, frozen entire-airport window** at predetermined times helps avoid adapting requests to later outcomes. Multiple fixed captures provide recency without changing which group was selected. It is still a small, conditional demonstration—not proof of unbiased worldwide coverage.

## Practice

1. Compute all four times for a hypothetical scheduled departure at 6:40 AM PST.
2. Could a response saved at 5:01 AM support a 4:50 AM PRE? Explain with `available_at <= cutoff`.
3. Why do the repeated 16-second PRE polling logs **not** imply repeated paid GETs?
4. Why must an actual GitHub runner start before its deadline, rather than simply have a `cron` configured?

Next: [03 — GitHub workflow and real prearm](03-workflows-prearm-and-live-owner-guards.md).
