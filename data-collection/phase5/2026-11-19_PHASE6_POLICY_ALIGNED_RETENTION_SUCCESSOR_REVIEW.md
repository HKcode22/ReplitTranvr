# Phase 6 policy-aligned retention successor — review draft

**Status:** successor review only. This document does not replace the frozen package, authorize paid collection, change the calendar, enable a scheduler, delete data, or certify provider rights.

## 1. Immutable predecessor

The original Phase 6 construction is preserved byte-for-byte by the parent commit:

- original main: `88a065458537aa5e1a0055dec82b7bf81b0c00eb`;
- rollback branch: `archive/phase6-original-frozen-88a06545`;
- frozen manifest SHA-256: `bd14ff3e558b975a889741380da807644ca9d3573a23e2416986ee6f71e1e41f`;
- frozen config SHA-256: `9cb7f3dcb2ee0d857f585fe8433a8dc2b7ac7bb3e3ad384a469c13530856642c`;
- frozen calendar SHA-256: `7125264304fe658028d54eb95b5e18b243a1d66100c9d1620d0d93c419c7077c`;
- original geometry: 31 planned days and 6,144 query templates;
- original source budget: 37,388 reserved REST units;
- original scientific design: A/B/C/D1/D2/E, T-24h/T-6h/T-90m, PRE/POST separation, and protected Phase 7 split.

Any successor change must be compared against this predecessor. A successor failure never edits or invalidates the predecessor.

## 2. What remains unchanged

The policy-aligned successor preserves the actual scientific collection:

- AeroDataBox FIDS is still the selected paid source;
- the original airport/day/segment draw and charge-day arithmetic remain;
- route, airport, carrier, schedule/revision, weather, historical context, PRE, POST, and outcome fields remain scientifically eligible inputs;
- T-6h actual gate-out delay remains the conditional primary candidate;
- T-90m remains the paired update and T-24h the comparator;
- cancellation, gate-out, wheels-off, wheels-on, gate-in, and airborne ETA remain separate target regimes;
- missingness is recorded as missing/unknown and is never converted into an on-time or negative label;
- as-of cutoffs, source identity, operating-leg identity, duplicate prevention, unknown-commit quarantine, budget reservations, STOP behavior, and protected chronological evaluation remain.

This successor is not an anonymized-only substitute and does not ban the model features required by Amendment E.

## 3. Retention layers

The source pipeline is separated by purpose, not by whether a field is useful.

### Layer A — short-lived provider custody

This includes:

- raw FIDS response bodies and HTTP/request/response envelopes;
- provider delivery, subscription, query, response, and account/billing identifiers;
- normalized provider identity and flight-population values that can reconstruct or link an individual provider record;
- raw webhook/POST items and provider evidence JSON;
- temporary source-to-flight and source-to-PRE linkage;
- private packets and transport bytes that still contain the above.

These values are operationally important during collection. They are not discarded before the source-bound PRE/POST work, reconciliation, and required audit readback finish. After that, they follow the applicable source/plan expiry and physical recovery-surface controls. A hash or shortened ID does not automatically move a value out of Layer A.

### Layer B — model features and labels

The following remain part of the scientific model contract and must be assessed individually, not blanket-deleted:

- origin and destination;
- operating carrier;
- scheduled arrival and provider-revised departure timing;
- reported pre-departure status;
- T-24h/T-6h/T-90m feature availability and missingness;
- NOAA METAR/TAF variables;
- reviewed historical route/airport/context variables;
- prior-aircraft or ADS-B variables when independently matched and rights-reviewed;
- verified actual gate-out, wheels-off, wheels-on, gate-in, cancellation, diversion, and censoring outcomes.

A Layer B field may be retained beyond Layer A only when its exact source, transformation, joinability, reconstruction risk, applicable retention term, backup/PITR treatment, and deletion date are recorded. “Feature,” “clean,” “normalized,” or “hash” is not itself a retention permission.

The successor therefore has three possible dispositions for each Layer B field:

1. **Independent/project-owned:** retained under its own source policy when it is not AeroDataBox content.
2. **Provider-derived and approved:** retained only after the exact output and transformation are independently reviewed as permitted under the applicable terms.
3. **Provider-linked/unresolved:** kept under the short-lived source boundary and marked unavailable for long-term Phase 7 use until a real permission or compliant transformation exists.

No writer may silently choose disposition 2.

### Layer C — long-lived research/model artifacts

These may include model weights, calibration summaries, aggregate metrics, feature dictionaries, split manifests, and other outputs only after their input fields and reconstruction risk have been reviewed. A model artifact is not automatically safe merely because it contains no raw JSON; its outputs must not expose or permit reconstruction of individual provider records.

## 4. Exact field review map

The existing feature contract is retained as a review inventory:

| Feature family | Current source class | Scientific use | Successor rule |
| --- | --- | --- | --- |
| origin/destination | ADB FIDS route member | route and airport context | preserve as a required candidate; do not call independent or long-lived without review |
| operating carrier | ADB FIDS | carrier baseline/effects | same field-level review |
| scheduled arrival / revised departure | ADB FIDS | timing and revision features | exact source clocks remain source-linked until reviewed |
| reported pre-departure status | ADB FIDS | PRE status risk | preserve candidate; no automatic Derived Work claim |
| METAR/TAF | NOAA | weather as-of feature | separate NOAA rights/availability and retention review |
| historical route/airport context | reviewed historical source | lagged context | retain under the actual source policy; no leakage across cutoffs |
| ADS-B prior-aircraft fields | ADSB.lol | optional physical/turnaround context | require source matching, ODbL/use review, and as-of proof |
| gate-out/outcome fields | ADB/independent outcome source | labels and evaluation | preserve target semantics; exact per-flight evidence requires its own source disposition |
| selected T, source hash, IDs, provenance | source custody/lineage | cutoff and audit proof | retain only the minimum approved audit representation; do not treat lineage IDs as a license |

The field review does not remove these rows from the experiment. It determines which can remain after Layer A expiry and which must be used or aggregated before that boundary.

## 5. Safety rule for the new implementation

Before any successor writer, retention job, or paid activation is changed:

1. verify the predecessor manifest/config/calendar hashes;
2. bind the new field map to the successor branch and a new version;
3. run schema-only and synthetic tests proving source fields cannot be silently reclassified;
4. prove each long-lived Layer B field has an explicit disposition;
5. verify primary, replica, object, log, backup, and PITR recovery treatment;
6. obtain the required independent source-use/retention decision;
7. only then create a new signed release artifact and separate Phase 6 authorization.

If any field is unresolved, the correct result is a scoped hold for that field—not deletion of the original package, silent retention, or an invented approval.

## 6. Current disposition

The original package remains the rollback path. This successor is only a policy-aligned review layer. It currently does **not** authorize the paid run because the Phase 6 approval ledger remains empty. It also does **not** claim that the current `flight_snapshots`, `flight_outcomes`, or normalized provider tables are already approved long-lived Derived Works.

The next implementation step is a read-only comparison and field-level release test against this successor. No production data or original package is modified by this document.
