# Packet A/B field preservation audit — November 19 Pacific / November 20 UTC
Status: scoped engineering audit, no new provider license, no source enable, no paid GO.

## Immutable baseline and release separation
Executable main reviewed: 0a7b1a28f243de76d4c83026d15f585265ef6f7b. Original freeze remains ae0915d1eb0c37651d280ff3f178efdb640ed509, manifest bd14ff3e558b975a889741380da807644ca9d3573a23e2416986ee6f71e1e41f. #915 owner restage + readback succeeded on 2026-11-20 UTC; #920 contains the owner receipts. Do not replay recovery/restage. No schema, operational deletion or collection redesign in this branch. Do not merge executable changes while exact-main SOURCE commissioning is in flight.

## Canonical feature parity (all 16 actual names)
Source of truth: server/lib/disruption/phase5AmendmentEAsOfFeatureSelectionOffline_v39.ts and phase5AmendmentESignedSupplementalFeatures_v39.ts; #593/#595/#596/#599/#613/#750. All are preserved in operational Packet A subject to source custody. Candidate dispositions below are not release approval, and are not a complete catalog census.

| Exact feature | Origin | Long-lived route / required proof |
|---|---|---|
| origin_icao | ADB / native identity | Article 5.8 reference identification/linking only; separate approved lane, no substitute compilation; evaluate full subgroup performance |
| destination_icao | ADB / native identity | same; preserve directional route pairing during custody |
| operating_carrier | ADB FIDS | reference carrier codes only where eligible; do not claim carrier identity is banned |
| scheduled_arrival_utc | ADB FIDS | exact timestamp source custody; evaluate computed duration/independent-source schedule, no merely renamed copy |
| provider_revised_departure_utc | ADB FIDS | exact timestamp source custody; evaluate frozen-schedule delta and multi-observation revision history; reconstruction attack with known schedule |
| reported_pre_departure_status | ADB FIDS | copied status remains Contents; evaluate genuinely computed history rather than relabeling one status |
| origin_metar_visibility_m | NOAA METAR | independent source lane; preserve exact value where that source's terms permit, no need to assume ADB restrictions |
| origin_metar_wind_kt | NOAA METAR | same; independently prove station, observation and as-of availability |
| origin_taf_flight_category | NOAA TAF | independent source lane; forecast issuance/validity enforced |
| destination_taf_flight_category | NOAA TAF | same; destination linkage and forecast validity |
| prior_aircraft_turnaround_minutes | reviewed history | multi-observation derivation and valid-time/aircraft linkage; evaluate precision and non-reconstruction |
| prior_aircraft_adsb_not_ground_reported | ADSB.lol opt-in | independent ODbL policy and reviewed physical-leg link; not actual gate-out |
| prior_aircraft_adsb_position_age_seconds | ADSB.lol opt-in | computed as-of age; separate source rights and recombination assessment |
| prior_route_departure_delay_median_minutes | reviewed history | multi-record aggregate, support counts and validity; no leakage or reconstructable small cells |
| prior_airport_departure_delay_median_minutes | reviewed history | same; preserve evaluation strata where lawful |
| airport_congestion_1h | reviewed history | as-of multi-record count, assess small-cell disclosure and source rights |

The supplemental default is 12 fields, ADSB is explicit opt-in (2); origin/destination native identity supply the remaining 2. This is the actual feature dictionary, NOT the earlier proposed dictionary that counted horizon/split/quality as features and omitted carrier/origin/destination. Do not treat a proposed coarse bin as equivalent to the original predictor. Keep source families distinct.

## Outcomes and identity invariants
Preserve A/B/C/D1/D2/E, T−24 comparator, T−6 signed continuous gate-out delay primary, T−90 paired update, separate cancellation and after-takeoff ETA, separate wheels-off/on/gate-in, diversion, conditional-operation denominator, negative early minutes, missing/censored/not_due, chronological split and same-flight isolation. #917 exact head 09ada86ba20ac74c0ccfeaa304c343fb0ccc5e51 full CI passed; packet-local denominator safeguard does not certify source parity or legal classification. Verify actual frozen schedule/observed same-leg milestone and attack test known schedule plus delay. No silent target discretization. Reference identifier lane must be purpose-bound and distinct, not a blanket override of the strict Packet B validator.

## Concrete transformer correction
Current baseline phase7ReviewedSourceTransformation_v39 structurally checks a timestamp but never compares feature availability to actual PRE issue time; it also does not compare profile dictionary/terms/Derived Work/field hashes and mapping TTL with the release contract. This branch corrects both and tests boundary equality, future availability, reversed clocks, and mismatched evidence. Upstream canonical issuedAt/releasedAt clocks still need trusted binding; pure adapter does not prove observation authenticity, expiry execution or legal rights. Code change is a candidate, pending CI and integration.

## Policy and retention disposition
#904 merged determination permits bounded published-terms source use (Articles 5.5, 5.6, 5.8). No personalized exception, no inference from silence or quota, no extended archive. Original operational data are useful, not disposable merely because raw custody expires. FIDS primary 24h / ordinary raw 168h existing limits remain. Complete timely feature/label release, source-specific independent terms, reconstruction and parity evaluation before actual expiry; if a required field cannot be lawfully preserved, mark LONG_TERM_RIGHTS_REQUIRED and do not pretend equivalence. Do not extend expiry, bypass deletion, or destroy required source fields prematurely. Existing 25-group/21-table provider inventory (215 column entries) is not a full physical catalog; 10 groups need further evidence. No claim complete catalog or end-to-end transformation.

## Operational continuation
Use #920 post-stage evidence-only branch for SOURCE approval chain, separate from this executable candidate. Account observed 2026-11-20T03:00:20.729Z (59,968 of 60,000 units, 1,830 alerts, zero active subscriptions, three free reads, no paid gets). First SOURCE target Nov20 23:45Z. Fresh operational evidence/approval and runtime pins remain required. No repeat provider email. No production DB or provider action by this branch.
