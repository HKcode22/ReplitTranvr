# Phase 6 second retention packet and Phase 7 derived-release boundary

**Status: engineering candidate; no provider-rights approval, no retention
extension, no database write, no migration, no paid GO.** This document is
the durable project decision for continuing engineering without waiting for a
provider reply.

## Decision

Travnr keeps two deliberately different representations of the same
study pipeline:

| Representation | What it does | Retention rule |
| --- | --- | --- |
| Existing Phase 6 operational/source-custody packet | Holds the full study fields needed to identify operating legs, join airports/carriers/routes, anchor exact PRE cutoffs, connect PRE→POST/webhook/AIRBORNE, prevent duplicate GETs, and audit budgets, retries, expiry, censoring, and missingness | It may contain provider Contents and source-linked fields while the applicable account/source/backup policy permits them. Existing expiry controls remain authoritative until a documented rights decision changes them. |
| New Phase 7 derived-release packet | Downstream model/research representation produced from the operational packet after the full feature/label view and parity checks exist | It carries only fields whose exact long-term classification is approved. The strict writer rejects source-shaped fields by design; this does not delete them from the operational packet. |

“Second packet” means a second representation and retention boundary. It is
not a second collector, an alternate database, a duplicated permanent provider
archive, or a bypass around the expiry worker. The full operational fields
remain necessary for Phase 6 and are preserved in the source-bound lane. The
correction and field-classification table are recorded in
`2026-11-19_PHASE6_FIELD_PRESERVATION_AND_ACCOUNT_EVIDENCE_CORRECTION.md`.

## Why the provider reply is not a project hold

The current project record already says to continue nonpaid engineering while
keeping source-use permission as a distinct Phase 6 activation condition. The
packet was reviewed against the pre-merge baseline
`88a065458537aa5e1a0055dec82b7bf81b0c00eb` and is now merged on production
`main` at `3ecefd427433d48e73de86caeff8e3a6d313cd90`; the source authorization
and paid collection remain disabled. No reply is treated as no approval.

The repository already contains the account/quota evidence: legacy
RapidAPI Team Ultra/owner-attested $32 renewal, an observed 60,000-unit
entitlement, a separate 50,000-unit project ceiling, 1,830 Alert credits, and
the November 18 timestamped account readback. That account-identification work
is complete and must not be repeated.

The remaining question is narrower: whether the exact account/purpose permits
the full linked per-flight Contents and its backup/PITR/replica/log surfaces to
remain for the entire study lifecycle. The public materials say that seven
days is the default caching limit, that some named plans have extended
caching, and that a genuine Derived Work may be treated differently only when
it is not still “Contents.” Therefore this packet is an engineering boundary
and field-classification record, not a claim that quota alone authorizes a
31-day linked archive:

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

## What the derived-release validator rejects

The validator rejects extra keys and source-shaped names **in the long-lived
Phase 7 derived-release packet**. The current conservative profile therefore
rejects raw payloads, exact source timestamps/dates/schedules, provider/query/
response hashes, raw source records, route/segment records, and source-to-row
identity linkage.

This is not a Phase 6 collection prohibition. The private operational packet
must retain flight/leg, airport, carrier, route, and exact-time fields while
they are needed for identity resolution, cutoff-safe joins, PRE/POST linkage,
duplicate prevention, and target construction, subject to the applicable
source and backup policy. AeroDataBox's published Article 5.8 also creates a
distinct Reference identifier category for airport/airline/aircraft codes,
flight numbers/designators, registrations, and similar subject keys used only
for identification, linking, or subsequent retrieval. Those identifiers are
not automatically forbidden, but the exact account/plan/purpose review must
confirm the conditions and the current writer has no approved reference-
identifier lane yet. A UUID v4 row ID is only a fresh packet-local identifier;
it is not a claim that a value is anonymous or non-reconstructable.

Temporary source-to-row linkage remains in the operational/source-custody
layer. Before it expires, the pipeline must either produce a rights-approved
long-term representation or record that the corresponding field is
`LONG_TERM_RIGHTS_REQUIRED`; it must not silently delete an ML-critical field
and claim the original study was preserved.

## Relationship to the existing retention matrix

The current matrix remains the conservative table-level guard. Mixed tables
and candidate `pre_snapshots`, `outcomes`, and `history_weather` surfaces do
not become permanently lawful because this packet exists. The known historical
36 PRE rows include copied AeroDataBox schedule/identity/provenance fields;
they are not automatically Derived Works or approved training inputs. The new
packet is the only surface that may be considered for long-lived model use,
and only after the exact field contract and independent terms review pass.

The packet therefore protects scientific continuity without changing
the original study fields. Flight identifiers, airports, carriers, routes,
legs, and exact timestamps remain in the operational lane because the study
cannot construct its PRE/POST chain without them. Reference identifiers get a
separate terms classification; exact timestamps and full source records do not
inherit that classification automatically. Nothing is silently removed from
Phase 6.

Before any of those fields expire, the pipeline must run the full-to-derived
parity check: coverage, label counts, censoring, missingness, calibration,
discrimination, and airport/carrier/route performance. If the derived packet
materially changes the study result, the field is held as
`LONG_TERM_RIGHTS_REQUIRED`; the project must obtain the needed retention scope
or explicitly change the estimand. It must not silently substitute a coarse
bucket and call it equivalent.

If the rights review permits the source-linked corpus, the operational packet
can support the complete reviewed training dataset. If it does not, only the
lawfully approved transformed outputs, external supplemental sources,
aggregates, and model/calibration artifacts may continue after source expiry,
and the resulting scientific limitation must be recorded.

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
4. The local checkout lacked `node_modules`, so local TypeScript/Vitest
   commands were not claimed as passing. GitHub Actions installed the locked
   dependencies and passed the full typecheck, offline tests, full suite, lint,
   registry, traceability, contradiction scan, preflight, build, and
   disposable-PostgreSQL checks both on PR #890 and after the merge
   (`44563526583`).

## Verified implementation state

The packet builder, strict contract validator, tests, and this decision record
are present on `main` at `3ecefd427433d48e73de86caeff8e3a6d313cd90`. The
post-merge safety run passed, and the implementation had no provider HTTP,
production database write, migration, paid call, or activation side effect.
This verifies the engineering boundary only; it does not convert the
unresolved terms review into permission.

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
