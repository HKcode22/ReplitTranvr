# Gate 1 / 2 / 6 — exact 16-field PRE policy review matrix (NOT APPROVED)

**2026-11-21 UTC. Status: technical route inventory COMPLETE; independent production field/reconstruction/purpose approval NOT YET COMPLETE.** This is a named subtask of the existing fixed Gate 1, not a ninth Phase 6 launch gate. It does not authorize source retention, a real actor, Packet B output, SOURCE, or paid GO.

## Authoritative code and science surfaces directly inspected

- `server/lib/disruption/phase5AmendmentEAsOfFeatureSelectionOffline_v39.ts`: canonical `P5_E_ALLOWED_PRE_FEATURES` contains **exactly the 16 names below** and the T−24h, T−6h, T−90m cutoff semantics.
- `server/lib/disruption/phase7PrePolicyCommission_v39.ts` (`checkPhase7NativePrePolicySupport`): exact **six native FIDS routes** that the current producer implements. Structural compatibility is explicitly **not** evidence of Derived Work permission or reconstruction safety.
- `review-tools/p7_commission_pre_policy_owner_v39.ts`: exact independently reviewed byte hashes and source/reference policies are required, pinned to Monday stage, manifest, costs, bounded Terms, valid source/outcome windows, and current main.
- `server/lib/disruption/phase7CanonicalFieldParity_v39.ts`: no silent loss of source-present fields; separately verified original only, bounded source expiry, chronological/group holdout and honest T−6 conditional label. Structural parity is not model accuracy/parity.
- `data-collection/phase5/2026-11-19_PHASE6_FIELD_PRESERVATION_AND_ACCOUNT_EVIDENCE_CORRECTION.md`: Packet A retains complete identity/times/source lineage during lawful custody; Packet B is separately reviewed derived release, not an identical or permanent provider archive.
- `data-collection/phase5/evidence/2026-11-19_aerodatabox_bounded_published_terms_source_use_review.md`: bounded source use, short-lived contents, Article 5.8 purpose-scoped references, genuine nonreconstructive Derived Works, no presumed plan caching extension.

## All 16 exact PRE fields — mechanically supported route versus review still needed

| # | Frozen source feature | Native/external source class | Mechanically supported Gate-1 route / candidate review | What still needs independent evidence |
|---|---|---|---|---|
| 1 | `origin_icao` | ADB FIDS | **Required:** `PURPOSE_BOUND_REFERENCE_LANE` with `outputField=null`, `airport_icao` | Same original leg/airport and Article 5.8 item-specific identify/link/retrieve purpose; not an unrestricted model training feature |
| 2 | `destination_icao` | ADB FIDS | **Required:** `PURPOSE_BOUND_REFERENCE_LANE`, `airport_icao` | Same purpose/source/identity/retrieval constraints; no provider substitute corpus |
| 3 | `operating_carrier` | ADB FIDS | **Required:** `PURPOSE_BOUND_REFERENCE_LANE` | Explicit producer-supported **either** 2-character `airline_iata` **or** 3-character `airline_icao`; do not misclassify operating vs marketing codeshare |
| 4 | `scheduled_arrival_utc` | ADB FIDS | **Required:** `REVIEWED_DERIVED_BUCKET` using `frozen_native_t_delta_bucket` | Exact T-reference/boundaries, source as-of time and reconstruction-risk review; copied exact timestamp cannot survive by relabeling |
| 5 | `provider_revised_departure_utc` | ADB FIDS | **Required:** `REVIEWED_DERIVED_BUCKET` using `frozen_native_t_delta_bucket` | Review exact cutoff, revised-vs-scheduled comparison and no gate-out-as-actual proxy |
| 6 | `reported_pre_departure_status` | ADB FIDS | **Required:** `REVIEWED_DERIVED_BUCKET` using `categorical_dictionary` | Native dictionary/counts, actual transformation vs reconstructability; mere integer encoding of source status is **not automatically** a genuine Derived Work |
| 7 | `origin_metar_visibility_m` | NOAA METAR | Candidate reviewed bucket if an authenticated as-of observation exists | Independent archive/receipt/date, numeric bins and no present-source omission |
| 8 | `origin_metar_wind_kt` | NOAA METAR | Candidate reviewed bucket | Independent as-of observation, units, numeric bins and missingness |
| 9 | `origin_taf_flight_category` | NOAA TAF | Candidate reviewed categorical bucket | Verified original TAF category/date, no source leakage or present-field loss |
| 10 | `destination_taf_flight_category` | NOAA TAF | Candidate reviewed categorical bucket | Exact forecast validity relative to forecast issuance |
| 11 | `prior_aircraft_turnaround_minutes` | ADSB.lol / derived context | Candidate numeric bucket | Same aircraft chain and only historical eligible observations; respect independently reviewed source license |
| 12 | `prior_aircraft_adsb_not_ground_reported` | ADSB.lol | Candidate reviewed boolean bucket | Separately attested signal and fresh state; not actual gate-out proof |
| 13 | `prior_aircraft_adsb_position_age_seconds` | ADSB.lol | Candidate numeric bucket | As-of recency, aircraft identity, ODbL/source purpose |
| 14 | `prior_route_departure_delay_median_minutes` | Reviewed historical context | Candidate numeric bucket | Historical provenance, no current/future leakage, sample denominator |
| 15 | `prior_airport_departure_delay_median_minutes` | Reviewed historical context | Candidate numeric bucket | Same, with airport/date split integrity |
| 16 | `airport_congestion_1h` | Reviewed historical context | Candidate numeric bucket | Exactly defined one-hour window, as-of cutoffs, source provenance |

**Notes on availability:** The published NOAA canary and historical BTS/ADSB work already exist and must not be repeated merely for a check count. Optional truly absent evidence remains NULL/missing with documented provenance. Present but unsupported evidence must HOLD, not be erased, fabricated, or assumed lawful. None of the proposed external transforms above is automatically approved just because its type can pass the code.

## Separate label, not a seventeenth PRE field

Amendment E `gate_out_delay_minutes` is a conditional T−6 continuous outcome (T−90 update and T−24 comparator preserved). Only independent same-leg actual gate-out plus attested schedule can support a numerical outcome. If genuine actual-only support is absent, POST outputs a scoped **CENSORED** result. `provider_revised_departure_utc`, runway/ADS-B wheels-off, and status cannot be promoted into a gate-out ground truth. Real numerical label yield is an evaluation question, not a pre-launch commissioning condition.

## Why actual production PRE policy commissioning is still blocked

The code intentionally requires **real reviewed bytes**, not a boolean inferred from owner authorization. `review-tools/p7_commission_pre_policy_owner_v39.ts` requires one committed exact independent decision with: `stageCode`, `stageSha256`, `costSha256`, `manifestSha256`, `boundedTermsSha256`, `rightsSha256`, `policyBytesSha256`, `policyReviewSha256`, `referencePolicyBytesSha256`, valid-from/until, first SOURCE and outcome tail, actual reviewer identity/time and two independent profile/reconstruction approvals. Reference bytes must separately pass `parseP7ReferenceLinkPolicy` with approved purpose and the exact three native reference categories. The production owner utility accepts `--inspect` or `--apply-reviewed`, but **both must validate exact private policy files** and the committed decision. There is no such exact approved production decision and complete private policy-byte receipt in the current release documents inspected here; neither this matrix nor previous synthetic tests may be substituted.

Actual final Gate 1 acceptance sequence is unchanged: independently review source provenance and every transformation/purpose, build authentic private policy + reference bytes and digests, commit a real accepted decision to the scoped evidence path, validate against **already-installed Monday stage**, run the existing one-time PRE owner installer **only after the decision is valid**, and independently inspect restricted no-login roles/fragment writer/reader and disarmed process preflight. No credentials, B0062/V0093 historical stage, or keys should be regenerated.

Gate 2 POST actor/reviewer/publisher commission and Gate 6 six policy/31 static values follow the same protected exact review / source-authorization chain. Avoid adding another workflow family or changing the frozen study design to make a synthetic test green.

**Outcome of this artifact:** native field-route mapping reviewed; actual rights, non-reconstruction and production policy authorization **NOT APPROVED**. No main merge, provider request, production DB mutation, SOURCE enable, or paid GO.
