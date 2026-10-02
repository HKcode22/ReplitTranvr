# Phase 2G Operating-Hours Correction — SKBO First, YSSY Deferred

**Frozen prospectively:** 2026-10-02, before any YSSY or SKBO paid outcome.  
**Status:** superseding prelaunch design correction.  
**Preserves:** all WSSS, OMAA, MMUN, refill, runtime, and AUTH evidence unchanged.

## 1. Finding

The existing Stage-1 matched time class is centered at 12:00 UTC with an eligible ±1 hour start window.

For YSSY on 2026-10-02:
- 11:00 UTC = 21:00 Australia/Sydney;
- 13:00 UTC = 23:00 Australia/Sydney.

Sydney Airport is subject to a legally enforced aircraft curfew from 23:00 to 06:00 local time. Sydney Airport also states that its domestic terminals close to the public at 23:00.

Official sources:
- Australian Government, Sydney Airport curfew: https://www.infrastructure.gov.au/infrastructure-transport-vehicles/aviation/aviation-safety/aircraft-noise/airport-curfews/sydney/dispensations
- Sydney Airport opening hours: https://www.sydneyairport.com.au/info-sheet/opening-hours

The planned YSSY two-hour probe would therefore terminate exactly at the curfew boundary and would measure a late-evening operating regime.

## 2. Scientific implication

The early-pilot reason for selecting YSSY was its strong domestic-heavy contrast. Under the frozen 60 rows/hour feasibility gate, however, a late-evening/curfew-boundary probe risks conflating:
- provider/airport yield;
- domestic-network richness; and
- local operating-time restrictions.

The V3.9 provenance record already classifies matched weekday/time-class execution as a project-specific confounding control, not as a constant mandated by the cited papers.

Therefore YSSY must not be interpreted as globally or generally capacity-weak from this particular UTC window.

## 3. Prospective correction

The superseding ordered target sequence is:

1. SKBO
2. YSSY — retained but paid execution blocked until a separately frozen local-operating-hours-aware protocol exists

LKPR remains deferred.

SKBO is still selected from the pre-outcome frozen frame attributes:
- region: South America;
- domestic share: 0.5725109170305677;
- international share: 0.42748908296943233;
- traffic metric: 91,600;
- route degree: 95.

OPAIN's 2025 management report independently records 29.3 million domestic passengers and 16.2 million international passengers at El Dorado.

Official source:
- OPAIN 2025 management report: https://www.opain.co/skins/page/infografia/Informe_gestion_2025_version_Web.pdf

The existing UTC class maps to approximately 06:00–08:00 Bogotá local time on 2026-10-02. This is not claimed to be a universal local-time match; SKBO remains an exploratory early-pilot feasibility measurement under the frozen UTC class.

## 4. Existing YSSY authorization

The following YSSY artifacts were created and approved before this operating-hours issue was found:
- runtime budget: `P2G-S1-20261002-18`;
- runtime SHA-256: `22e511d881d9e04fed3f2a7e8bbde97c34886f46a04f192f93cae1e275adcec8`;
- authorization: `AUTH-20261002-P2G19`;
- AUTH SHA-256: `2e45ecf6fd675c644d38532d430612fc499d1e7ac75657f9242fd4a3554e27db`.

No YSSY paid launch occurred.

These artifacts are preserved as **SUPERSEDED_UNUSED** evidence and must not be reused.

The deprecated YSSY preparation helper now exits fail-closed.

## 5. YSSY return condition

Before any future YSSY paid run, a separate prospective amendment must define:
- an airport-local operating-time class;
- how that class relates to the UTC-balanced Phase-6 calendar;
- how capacity comparability will be interpreted;
- whether curfewed airports may be assigned every Phase-6 UTC slot;
- any anchor-rotation constraint required to avoid structurally closed or curfew-boundary periods.

## 6. Controls unchanged

No change is made to:
- physical-flight-v2 identity;
- exact provider/internal reconciliation;
- zero delivery-gap rule;
- delivery completeness = 1;
- callback-failure rules;
- GitHub owner/watchdog;
- exact-session cleanup/finalizer;
- protected account floor;
- runtime/AUTH SHA binding;
- immutable historical evidence;
- no automatic retry.
