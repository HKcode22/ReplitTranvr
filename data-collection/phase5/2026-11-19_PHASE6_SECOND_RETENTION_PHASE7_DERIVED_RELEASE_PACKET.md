# Phase 6 second retention packet and Phase 7 derived-release boundary

**Status: engineering candidate; no provider-rights approval, no retention
extension, no database write, no migration, no paid GO.** This document is
the durable project decision for continuing engineering without waiting for a
provider reply.

## Decision

Travnr keeps two deliberately different products:

| Product | What it does | Retention rule |
| --- | --- | --- |
| Existing source-custody packet | Collects the operational evidence needed to construct PRE/POST observations, reconcile failures, and enforce source expiry | Existing FIDS/raw/source-linked expiry controls remain authoritative. It may contain provider Contents and must not be copied into a long-lived research archive by renaming or hashing fields. |
| New Phase 7 derived-release packet | Carries only approved bucketed features/labels, horizon, grouped split, missingness, censoring, and quality state for model training/evaluation | A separate research lifecycle applies only after field-level terms/Derived-Work review. It contains no source-to-row mapping and does not change source TTLs. |

“Second packet” means a second, narrower release representation—not a second
collector, second database, duplicated provider archive, or bypass around the
existing expiry worker. The original source packet stays intact and is not
reclassified by this change.

## Why the provider reply is not a project hold

The current project record already says to continue nonpaid engineering while
keeping source-use permission as a distinct Phase 6 activation condition. The
current production `main` review head is `88a065458537aa5e1a0055dec82b7bf81b0c00eb`;
the source authorization and paid collection remain disabled. No reply is
treated as no approval.

The provider's current public materials say that seven days is the default
caching limit, that some named plans have extended caching, and that a genuine
Derived Work may be treated differently only when it is not still “Contents.”
They also distinguish lightly changed/reformatted provider data from a true
derived work. The account-specific RapidAPI plan, any grandfathered exception,
the permitted research purpose, backup treatment, and exact field-level
classification remain unverified in this project. Therefore this packet is a
safe engineering boundary, not a legal conclusion:

- [AeroDataBox terms update and transition](https://aerodatabox.com/2026-09-terms-update)
- [AeroDataBox pricing and caching/Derived Work guidance](https://aerodatabox.com/pricing)
- [AeroDataBox contact guidance](https://aerodatabox.com/contact)

The contact page also asks customers not to submit the same request repeatedly
through multiple channels. The existing support follow-up remains recorded;
this change sends no duplicate email and does not wait for one before fixing
the engineering boundary.

## What the new packet preserves for Phase 7

Each release row can preserve the information the model actually needs:

- `T-24h`, `T-6h`, or `T-90m` horizon;
- an opaque numeric cohort bucket and preassigned `train`/`validation`/`test`
  split, with a packet-wide check that one cohort cannot cross splits;
- integer-bucketed feature values and target/label values;
- an exact boolean missingness map, including unknown/censored values;
- a non-source quality bitmask; and
- `observed`, `censored`, `missing`, or `not_due` state so absent labels cannot
  become invented on-time or zero-delay negatives.

The packet also binds a versioned feature dictionary and separate terms and
Derived-Work review evidence hashes. Those hashes provide audit references;
they do not grant a license, prove a transformation, or enable collection.

## What it rejects and never retains

The validator rejects extra keys and source-shaped names. A packet row cannot
contain a flight number, callsign, tail/registration, airport, route, exact
timestamp/date/schedule, provider/query/response hash, raw payload, or source
identity. A UUID v4 row ID is only a fresh packet-local identifier; it is not a
claim that a value is anonymous or non-reconstructable.

Temporary source-to-row linkage, if a future reviewed writer ever needs it,
must remain in the existing short-lived source-custody layer and expire no
later than the strict source boundary. It is never placed in this packet and
cannot be used to join a retained row back to an expired provider record.

## Relationship to the existing retention matrix

The current matrix remains the conservative table-level guard. Mixed tables
and candidate `pre_snapshots`, `outcomes`, and `history_weather` surfaces do
not become permanently lawful because this packet exists. The known historical
36 PRE rows include copied AeroDataBox schedule/identity/provenance fields;
they are not automatically Derived Works or approved training inputs. The new
packet is the only surface that may be considered for long-lived model use,
and only after the exact field contract and independent terms review pass.

The packet therefore protects scientific continuity without creating a false
choice between “keep raw provider rows forever” and “lose every model-useful
signal.” If a future rights review permits the source-linked corpus, the
existing source packet may support a reviewed transform. If it does not, the
source packet still expires under its current rules while independently
approved transformed outputs, external supplemental sources, aggregates, and
model/calibration artifacts can follow their own lawful lifecycle.

## Failure disposition carried forward

Recent failures are not silently converted into successful collection:

1. The sustained rolling rehearsal failure was a read-only diagnostic hold
   before the first clock tick. It did not establish provider loss, database
   loss, or a retention breach. Its remediation remains separate from this
   packet and does not widen collection authority.
2. Stale relay/target pins and skipped disarmed jobs remain fail-closed. A
   green clock or relay observation is not a provider call, SQL commit, PRE,
   POST, or rights decision.
3. The current source/retention package is preserved; the second packet does
   not duplicate its data or ask the expiry worker to preserve it.
4. This checkout lacks `node_modules`, so local TypeScript/Vitest commands
   cannot run here without network installation. The new validator tests are
   included for the repository's existing CI; no local test pass is claimed.

## Required gates before any writer or source activation

1. Review every feature and label field, its transformation, bucket dictionary,
   source class, and reconstruction-risk rationale.
2. Obtain current account-specific terms/use evidence; do not infer it from a
   quota, a support silence, a hash, or a plan name remembered from September.
3. Verify the actual source-custody expiry, backup/PITR/replica/log recovery
   surfaces, and restore behavior. Scheduler success is not backup proof.
4. Run the packet validator and independent split/leakage tests against the
   exact reviewed code head.
5. Keep `sourceRightsApproved=false`, `authorizationEnabled=false`, and
   `phase6PaidGo=false` until a separate exact Phase 6 authorization is
   authenticated. No packet pass may change those values.

This is the project’s second retention/release packet path: it preserves the
necessary derived research representation while respecting the existing
source-custody boundary and keeping the unresolved provider question from
delaying the engineering work that does not depend on it.
