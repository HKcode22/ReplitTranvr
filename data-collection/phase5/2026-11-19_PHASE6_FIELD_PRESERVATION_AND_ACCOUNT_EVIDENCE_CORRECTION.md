# Phase 6 field-preservation and account-evidence correction

**Date:** 2026-11-19  
**Status:** corrective engineering decision; no paid activation  
**Scope:** reconcile the Phase 6 study requirements with the second retention/derived packet

## 1. Correction to the previous wording

The project does **not** intend to remove flight identifiers, operating-leg identity, airports, carriers, routes, or exact timestamps from the Phase 6 operational study.

Those fields are required to:

- select and identify the same operating service across SOURCE, PRE, POST, webhook, and AIRBORNE records;
- distinguish operating legs from marketing/codeshare numbers;
- join the correct origin, destination, carrier, route, and schedule;
- anchor T−24h, T−6h, and T−90m cutoffs to the frozen scheduled departure;
- bind the original provider response to the physical request and normalized population;
- prevent duplicate GETs and duplicate flight rows;
- construct as-of features without leakage;
- pair gate-out/arrival outcomes with the correct flight;
- audit missingness, censoring, retries, budget, expiry, and model splits.

The earlier phrase “excluded from the packet” was incomplete. The correct meaning is:

> These fields are not excluded from Phase 6 collection or the private operational tables. They are excluded only from the unrestricted long-lived Phase 7 derived-release representation unless a separate field-level rights decision permits them to remain there.

No existing Phase 1–5 table, column, lineage link, or Amendment A/B/C/D1/D2/E requirement is being deleted by the second packet.

## 2. Account evidence is already present

The repository already records the account facts and they must not be requested again as if they were missing:

- channel: AeroDataBox through RapidAPI;
- historical account: legacy/grandfathered Team Ultra;
- owner-attested renewal: $32 on September 4;
- observed quota: 60,000 API units;
- observed remaining balance: 59,968 units in the November 18 readback;
- separate research/project ceiling: 50,000 physical REST units per cycle;
- observed requests allowance: 240,000;
- observed Alert balance: 1,830 credits;
- active subscriptions: zero at the timestamped observation;
- provider calls and database writes during the account observation: zero.

The evidence is sufficient to identify the account and the observed quota. It is not a reason to repeat account discovery or to confuse quota with a retention/license clause.

The remaining rights question is specifically:

> Does the exact account/plan and applicable purpose permit retaining the required linked per-flight Contents, backups/PITR/replicas/log copies, and derived outputs for the full study lifecycle?

That is a retention/purpose/backup classification question, not an account-identity question.

### Important published-terms distinction

The current AeroDataBox Terms have a separate **Reference identifiers** category. It expressly lists identifiers such as airport IATA/ICAO codes, airline codes, aircraft-type codes, flight numbers/designators, registrations, ICAO 24-bit addresses, and API retrieval identifiers. The published retention purpose for that category is identifying, linking, and subsequently retrieving the designated subject, and it is not a license to compile those identifiers into a substitute for the Services. The exact account/plan terms and the actual purpose still control.

Therefore the project must not collapse “identifier” into “forbidden.” Packet A retains these identifiers for the study. Packet B may use a separately reviewed reference-identifier lane only if the exact account/plan/purpose review confirms the Article 5.8 conditions. Exact event/schedule/observation timestamps are not automatically covered by that identifier category and remain a separate source-content retention question. The current Packet B writer stays fail-closed until that distinction is represented in an approved profile. See the [Terms of Use](https://aerodatabox.com/terms), Article 5.8.

## 3. Correct two-packet architecture

### Packet A — Phase 6 private operational/source-custody packet

This is the packet used during the actual study. It contains the full operational fields needed for the experiment, subject to the applicable source and backup lifecycle:

- flight/service identifiers and operating-leg identity;
- origin and destination airports;
- operating and marketing carrier identity;
- flight number/callsign/tail where needed for identity reconciliation;
- route and segment/leg relationships;
- frozen scheduled departure and exact schedule-revision timestamps;
- exact source observation, request, response, gate-out, airborne, arrival, and webhook timestamps;
- source query, physical-attempt, original-response, normalized-population, PRE, POST, and outcome bindings;
- T−24h, T−6h, and T−90m PRE observations;
- Amendment E evidence tiers, target values, missingness, censoring, and not-due state;
- weather, ADSB, history, route, and congestion inputs with their as-of timestamps;
- budget, retry, settlement, expiry, and deletion receipts.

This packet is not an unrestricted permanent archive. It is private, source-bound, and governed by the currently evidenced retention/expiry policy. If the account-specific terms permit the full study lifecycle, its retention may be extended only through a documented rights decision. If they do not, the pipeline must produce the approved downstream representation before expiry.

### Packet B — Phase 7 model/research release packet

This is downstream from Packet A. It is not a replacement for Packet A and it is not the only database used during collection.

Its purpose is to retain model-ready information after source custody expires. It may contain:

- reviewed features and labels;
- horizon code;
- train/validation/test split;
- coarse or otherwise approved transformations;
- missingness, censoring, not-due, and quality state;
- aggregate and model/calibration metrics;
- versioned schema and transformation hashes.

The existing strict writer currently rejects direct source-shaped fields and identifier-shaped names in this long-lived representation. That is a conservative fail-closed hold while the exact account/plan/purpose classification is completed; it is not a conclusion that every identifier is prohibited. A separately reviewed Packet B reference-identifier lane may be added only for the Article 5.8 identification/linking/retrieval purpose and must not become a substitute dataset. The safeguard must not be interpreted as a prohibition on Packet A's operational tables.

## 4. Field classification for the study

| Field family | Needed by Phase 6? | Packet A operational lane | Packet B long-term lane |
|---|---:|---|---|
| Flight/service and operating-leg identifiers | Yes | Required for identity and joins | Reference-identifier review for identification/linking/retrieval; do not silently drop or treat as a substitute dataset |
| Origin/destination airport | Yes | Required for sampling, route, weather, and strata | Reference-identifier review for airport codes; a coarse region is not automatically equivalent |
| Operating/marketing carrier | Yes | Required for carrier/route analysis and model features | Reference-identifier review for carrier codes; preserve if permitted and do not silently substitute |
| Route and segment/leg links | Yes | Required for as-of joins and duplicate prevention | Rights review; do not substitute a different route |
| Exact scheduled/revised timestamps | Yes | Required for T−24/T−6/T−90 cutoff logic and leakage prevention | Rights review; coarse calendar transform is not automatically equivalent |
| Exact source observation/request/response timestamps | Yes | Required for freshness, billing, retry, and provenance | Control/derived summary unless retention is permitted |
| Raw provider response | Sometimes | Temporary source custody only | Exclude |
| Source/query/response hashes | Yes for control | Private lineage/control lane | Hash alone is not a license or reconstruction fix |
| PRE/POST/outcome values | Yes | Required for the study and target construction | Preserve only under approved field classification |
| Weather/ADSB/history features | Yes | Required as-of inputs | Derived form may be retained after review |
| Missingness/censoring/not-due | Yes | Required | Preserve |
| Budget/expiry/deletion receipts | Yes | Required control evidence | Preserve as non-source control summaries |
| API keys, request URLs, account metadata | No | Secret/control storage only | Exclude |

The terms “flight identifier,” “airport identity,” “carrier identity,” and “exact timestamp” therefore do not mean “useless data.” They are essential study fields. Reference identifiers have a distinct published category; exact timestamps and full source rows do not automatically share it. The question is where each field lives, for how long, and under which evidenced permission.

## 5. ML preservation rule

Before any Packet A field expires, the pipeline must perform a parity check:

1. Build the full as-of feature/label view while the operational fields are still available.
2. Build the candidate Packet B representation.
3. Compare coverage, label counts, censoring, missingness, calibration, discrimination, and subgroup/airport/carrier/route performance.
4. If removing a field materially changes the study result, mark that field `LONG_TERM_RIGHTS_REQUIRED`; do not silently remove it and do not claim the same ML study was preserved.
5. Retain the field only if the account/purpose/retention evidence permits it, or explicitly document that the long-term study is a bounded/changed estimand.

This preserves the scientific question instead of pretending that a coarse bucket is always equivalent to the original field.

## 6. Current decision

- Account identity and observed quota evidence: **COMPLETE**.
- Frozen Phase 1–5 study geometry and required operational fields: **PRESERVED**.
- Packet A full operational schema: **REQUIRED and retained in the design**.
- Packet B derived-release schema: **IMPLEMENTED as a fail-closed boundary**.
- Exact account-specific 31-day linked-record/backup retention classification: **REVIEW_REQUIRED**.
- Provider reply: **not required for engineering; not treated as permission**.
- Paid GO/source enable: **still disabled until the exact retention classification, operational readback, and separate GO are recorded**.

The project must not repeat account/quota discovery. The remaining implementation work is to bind this corrected field classification to the existing Phase 6 source/PRE/POST chain and test the full-to-derived parity path without changing the original study design.
