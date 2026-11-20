# Phase 6 bounded AeroDataBox source-use determination — published Terms path

Date reviewed: 2026-11-19 (Pacific)
Status: **BOUNDED SOURCE USE APPROVED WITH ENFORCED RETENTION CLASSES; NO PERSONALIZED RETENTION EXCEPTION CLAIMED; PAID GO STILL SEPARATE**

## Question reviewed

May Travnr continue the already-designed one-month prospective Phase 6 experiment without treating the unanswered support request for a long-term record-level retention exception as a project-wide blocker?

**Determination: yes, for the bounded source-use profile below.** This determination does **not** claim AeroDataBox granted a personalized exception and does **not** authorize long-term retention of ordinary source Contents. It relies on the published Terms path that is available without such an exception.

## Applicable published basis reviewed

Official AeroDataBox Terms of Use, last updated October 11, 2026:
- https://aerodatabox.com/terms
- Article 3.1 grants a limited license to access and use the Services subject to the Agreements.
- Article 5.5 permits caching/storage of Contents for the active Permitted Purpose, requires minimization and deletion when that purpose is fulfilled, and sets the ordinary maximum at the greatest applicable period among seven days, response Cache-Control, Plan Terms, law, or a qualifying Article 5.8 category.
- Article 5.6 excludes genuine Derived Works from the Article 5.5 and 5.8 retention rules.
- Article 5.8 expressly allows reference identifiers such as airport/airline/aircraft codes, flight number/designator, registration/ICAO24, and API retrieval identifiers to be retained indefinitely **only for identification, linking, and subsequent retrieval**, provided the retained identifiers are not a substitute compilation.
- Article 5.8 also permits incidental copies in ordinary backups and operational logs until ordinary rotation, restricted to recovery/debugging/security/metering/dispute/compliance purposes and subject to the Article 5.8 anti-pooling/anti-substitution limits.

Official September 7, 2026 Terms/Marketplace update:
- https://aerodatabox.com/2026-09-terms-update
- Existing subscribers became subject to the announced Terms changes on November 7, 2026 unless an identified exception applies.
- Default caching is described as seven days in most cases.
- The announcement identifies Ultra-2 on API.Market and Mega on RapidAPI/API.Market as extended-caching marketplace plans. This review therefore **does not assume** the historical grandfathered RapidAPI Team Ultra subscription has an extended-caching entitlement.

## Exact Travnr scope approved by this review

1. **One-month collection is not one-month source-record retention.**
   Phase 6 may make the already-budgeted prospective retrievals across the study period. Each retrieved source item remains subject to its own applicable retention clock.

2. **Ordinary source Contents remain short-lived.**
   Full responses, copied/reformatted provider fields, exact source state, exact provider timestamps, and other source-shaped records remain under the existing conservative source-custody controls. No new extended-retention right is inferred here. The project's existing stricter live-FIDS primary limit remains unchanged where it is already enforced.

3. **Reference identifiers use Article 5.8, not a fake Derived-Work label.**
   Eligible airport/airline/aircraft codes, flight number/designator, registration/ICAO24 and provider retrieval identifiers may be retained for identification/linking/retrieval under Article 5.8, subject to the existing private research purpose and anti-substitution controls. This does not convert source timestamps, statuses, delays, coordinates, or whole records into reference identifiers.

4. **Long-lived Phase 7 research artifacts must be genuine Derived Works.**
   The separate Packet-B / Phase-7 release path may retain only outputs that satisfy the existing strict transformation and non-reconstructability checks. Normalization, hashing, selecting fields, or joining PRE/POST rows does not by itself make a Derived Work.

5. **Incidental PITR/backups are not a research archive.**
   Article 5.8 provides a published-terms basis for ordinary recovery copies, but those copies must remain recovery/operational only and rotate normally. Travnr's stricter internal backup/restore verification remains an operational-release question and is not waived by this source-use determination.

6. **No resale, bulk substitute, or API replacement.**
   This review authorizes the existing private Travnr collection/research purpose only. It does not authorize redistribution of source Contents, a substitute dataset/feed, or use of retained Article 5.8 material as a general source database.

7. **Stricter actual Plan Terms still control if discovered.**
   Because Marketplace Plan Terms can override the general Terms for plan-specific permissions/restrictions, any authenticated stricter term applicable to the subscribed RapidAPI plan must be obeyed. This review deliberately requires no extended Plan-Term privilege.

## Scientific-field preservation

This determination does **not** remove or redesign Packet A. Route, airport, carrier, flight/service identity, exact operational timestamps, PRE/POST records, tail/leg-chain links, weather/ADS-B context, gate-out/wheels-off/wheels-on/gate-in, cancellation/diversion and other frozen scientific inputs remain available inside the bounded operational/source-custody lifecycle needed to construct the study. The separate long-lived release path decides which representations may survive source expiry.

## Release consequence

For the bounded profile above, the prior condition “wait for a personalized AeroDataBox long-term record-level exception before making any Phase 6 source call” is **not required**. The unanswered support request remains relevant only to any broader retention privilege outside this published-terms path.

This is an engineering/compliance interpretation of the published contract text, not legal advice and not a representation that AeroDataBox separately endorsed Travnr.

- independentSourceUseApprovedForBoundedProfile: **true**
- personalizedProviderExceptionGranted: **false**
- extendedCachingPlanRightAssumed: **false**
- originalPacketAPreserved: **true**
- article58ReferenceIdentifierPathUsed: **true**
- article56DerivedWorkPathUsed: **true, only after existing transform/non-reconstructability checks**
- incidentalBackupResearchUseAllowed: **false**
- phase6PaidGo: **false**
