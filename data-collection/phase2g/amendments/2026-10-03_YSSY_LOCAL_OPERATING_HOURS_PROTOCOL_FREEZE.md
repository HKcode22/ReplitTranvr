# YSSY Local-Operating-Hours-Aware Stage-1 Protocol Freeze

**Date frozen:** 2026-10-03 UTC  
**Target:** YSSY — Sydney Kingsford Smith  
**Status:** **FROZEN PROSPECTIVE DESIGN / NO PAID AUTHORIZATION**  
**Protocol artifact SHA-256:** `ad6224fb7fc83de42021c9f75a705892c7130614f4a72276b47fa2c246dd4991`

## 1. Why this protocol exists

The earlier YSSY preparation was superseded before any paid YSSY launch because the inherited Stage-1 class centered at 12:00 UTC placed the reviewed 2-hour window at 21:00–23:00 Sydney local time, terminating at the Sydney Airport curfew boundary.

No paid YSSY outcome existed when this protocol was selected. The protocol therefore remains prospective with respect to YSSY yield, capacity, stability, identity ambiguity, and any other paid outcome.

The parent operating-hours correction remains immutable provenance:

`artifacts/phase2g-early-pilot-scope-operating-hours-correction-freeze-20261002.json`

Parent SHA-256:

`3f9d4a55d5cc933726bb045c735935fa90cda85b9e972c745ca9c93feb39932b`

## 2. Exogenous operating-hours evidence

The Australian Department of Infrastructure states that Sydney Airport's curfew applies between 23:00 and 06:00 Sydney local time, subject to limited statutory exceptions.

The Sydney Airport Curfew Act defines the relevant time using New South Wales legal time.

Official references:

- https://www.infrastructure.gov.au/infrastructure-transport-vehicles/aviation/aviation-safety/aircraft-noise/airport-curfews/sydney/overview
- https://www.legislation.gov.au/Latest/C2015C00154

NSW daylight saving begins on Sunday 4 October 2026, so YSSY must be treated with the IANA timezone `Australia/Sydney`, not a hard-coded UTC offset.

Official DST reference:

- https://www.nsw.gov.au/about-nsw/daylight-saving

## 3. Pre-existing Phase-6 slot basis

The V3.9 sampling design already freezes the Phase-6 UTC slot set:

```text
{00, 04, 08, 12, 16, 20}
```

This YSSY protocol does not introduce a new arbitrary hour outside that set.

## 4. Prospective slot-selection rule

For YSSY only, choose the existing Phase-6 slot that maximizes the minimum distance from the 23:00–06:00 curfew boundaries across:

1. AEST (UTC+10);
2. AEDT (UTC+11);
3. the entire Stage-1 eligible start class of slot midpoint ±1 hour;
4. the full 120-minute target duration.

No YSSY paid outcome enters this calculation.

The relevant classes are:

```text
slot 00:
  AEST full class ≈ 09:00–13:00 local
  AEDT full class ≈ 10:00–14:00 local
  minimum boundary buffer ≈ 3 h

slot 04:
  AEST full class ≈ 13:00–17:00 local
  AEDT full class ≈ 14:00–18:00 local
  minimum boundary buffer = 5 h

slot 08:
  AEST full class ≈ 17:00–21:00 local
  AEDT full class ≈ 18:00–22:00 local
  minimum boundary buffer ≈ 1 h

slot 12:
  reaches/enters the 23:00 curfew boundary
  INVALID for this purpose

slot 16:
  lies inside the curfew
  INVALID

slot 20:
  reaches/includes the 06:00 curfew-end boundary
  INVALID for this purpose
```

Therefore slot **04** is selected prospectively.

## 5. Frozen YSSY Stage-1 time class

```text
target_icao = YSSY
timezone = Australia/Sydney

selected_stage1_utc_slot_hour = 4
eligible_start_tolerance_hours = 1
target_minutes = 120

preferred_start_utc = 03:00
preferred_window_utc = 03:00–05:00

preferred_window_local_AEST = 13:00–15:00
preferred_window_local_AEDT = 14:00–16:00

full eligible class local AEST = 13:00–17:00
full eligible class local AEDT = 14:00–18:00

minimum curfew-boundary buffer over both seasons
and the full eligible start class = 300 minutes
```

The selected class does not require a UTC-midnight-crossing exception.

## 6. Weekday rule

Both of the following are required:

```text
UTC weekday = weekday
YSSY local weekday = weekday
```

For the selected 04 UTC class, the YSSY local calendar date remains the same calendar date as UTC in both AEST and AEDT, so the two checks do not conflict.

## 7. Controls that do not change

The operating-hours correction changes only the YSSY Stage-1 time-class rule.

The following remain unchanged:

```text
metric contract = v39-physical-flight-instance-v2
target duration = 120 minutes
capacity gate = 60 rows/hour
min stability buckets = 6

external settled spend = authoritative denominator
delivery completeness = exactly 1.0
nonzero delivery gap = terminal / not scoreable

Stage-1 reservation = 450 Alert credits
unsettled burst margin = 50
protected residual floor = 1000
maximum authorization ceiling = 500

GitHub Actions paid owner required
independent GitHub safety watchdog required
exact callback/runtime binding required
deferred exact-session cleanup required
outcome-driven stop forbidden
automatic YSSY retry forbidden
```

## 8. What this freeze does NOT authorize

This document and its machine-readable artifact do **not** authorize provider mutation or a paid YSSY launch.

In particular:

- `AUTH-20261002-P2G19` remains superseded and unusable;
- `P2G-S1-20261002-18` remains superseded and unusable;
- no prior YSSY runtime/AUTH may be reused;
- a new runtime, budget and authorization must be generated only after machine implementation passes full offline safety;
- callback/runtime binding must be refreshed against the then-current source HEAD;
- the final paid preflight must explicitly return `PASS_READY_FOR_PAID_STAGE1`.

## 9. Next implementation step

Before any YSSY authorization:

1. teach the compact-scope loader to recognize the new frozen YSSY protocol;
2. permit the selector to return YSSY only when the new protocol is hash-bound;
3. make the paid preflight use YSSY slot 04 instead of the inherited slot 12;
4. validate both UTC weekday and `Australia/Sydney` local weekday;
5. retain the existing UTC-midnight fail-closed rule;
6. add tests proving the YSSY old slot remains blocked and the new slot behaves correctly across AEST/AEDT;
7. replace the current hard-refusal YSSY helper with a no-paid-launch preparation helper;
8. run full V3.9 Offline Safety;
9. only after that, create a fresh YSSY runtime/budget/AUTH.

