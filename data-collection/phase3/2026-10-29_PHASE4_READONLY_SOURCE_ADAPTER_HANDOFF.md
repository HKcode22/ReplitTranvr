# Phase4 P4-C source adapter handoff — Oct 29, 2026

## Canonical links
- [V3.9-f.8 Plan §§5, 7.5, 16-17](../plans/V3.9_DataCollectPlan_f.8.md)
- [Implementation Log §1.9](../implementation/V3.9_IMPLEMENTATION_LOG.md)
- [Phase4 execution and open tasks](2026-10-29_PHASE4_GATE5_FASTTRACK_EXECUTION.md)
- [Merged offline math and live false-PASS repair PR #254](https://github.com/HKcode22/ReplitTranvr/pull/254)

## Narrow source-first implementation
A bounded, parameterized, non-provider read-only adapter queries the existing B0062 tables; it **does not create new tables** or request AeroDataBox data:
1. Primary FIDS members from clean.flight_population and their matching clean.fids_query_response query receipt. Raw FIDS source still present, nonexpired, matching response hash and database available_at <= audit read watermark; do not use a reconstructed postflight response.
2. Only original raw_delivery + raw_delivery_item + webhook_identity_resolution rows with matching item SHA, original retained JSON and unexpired identity. Match the origin ICAO through webhook_flight_identity, using the *received-at clock* rather than the identity resolution clock. A canonical flight identifier is a candidate mapping, NOT automatically an independently verified physical-flight.
3. Candidate clean.flight_snapshots rows from the same flight/window with immutable FIDS response SHA and per-horizon cutoff; do not auto-certify feature completeness or actual runway targets. Those remain false/unknown.
4. Never query provider API, no DB DML, no data retention expansion, and no flight IDs, raw JSON, coordinates, or sensitive source records in logs.
5. The one-shot operator wrapper requires an explicit scope and exact no-provider opt-in, then opens a dedicated V3.9 database connection inside a caller-owned REPEATABLE READ READ ONLY transaction and rolls back regardless of outcome. **This script is not launched by a scheduled workflow** and is not evidence of a live DB run; only offline mocks/CI run at this stage.
6. FIDS and webhook inputs are not guaranteed complete: an empty response from expired original content or missing enrollment means UNKNOWN, not measured 0% coverage. The adapter always returns the candidate-only scientific HOLD; further independent raw hash, actual T semantics, outside capture source exhaustiveness and legal audit are needed.

## Current status
- P4-A/B offline source arithmetic and fail-closed production Gate5 owner **MERGED** with 4/4 CI success (PR #254, main ed11e96a58d9b448feb80e5dc360488b5ec2cd87); postmerge full safety also passed.
- P4-C source adapter and negative tests **source implemented in follow-on PR**, CI pending.
- P4-D same-cohort prospective T−24h/T−6h/T−90m FIDS sampling **not established**.
- P4-E physical flight ADS-B joining, POST durable trajectory and target semantics **not verified**.
- P4-F cross-airport/country/US-source comparison **not verified**.
- P4-G actual authenticated live Gate5 science pass and Phase5 FREEZE **not earned**.
- No paid action, no Replit manual timed work, no Cloudflare, no historical archives, no source operator email.

## No silent science upgrades
The Oct28/29 WSSS 151 retained items represent correctly stored genuine Alert notifications, 0 containing location. They are NOT 151 flight identities, nor full three-horizon FIDS membership. The free adsb.lol six-GET test demonstrated only repeated aircraft observations, not airline leg linkage or a provider-authorized production service. Historical YSSY 231/229 gap is unchanged; old logged science owner needs a separate no-paid exact-session administrative closeout. Phase4 offline engineering may progress without another paid trial; final Gate5 needs independent population provenance and targets.
