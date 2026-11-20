# Phase 6 paid-month launch readiness checkpoint — November 19, 2026

**Disposition: Phase 5 engineering foundations and freeze artifacts are COMPLETE;
the final source-rights/scientific activation gate remains HOLD; Phase 6
engineering is READY EXCEPT FOR THE EXPLICIT ACTIVATION CHAIN; paid collection
is NOT STARTED and remains fail-closed.** This checkpoint supersedes any interpretation that an unanswered
provider email should stop unrelated engineering. Silence is not approval, but
it is also not a reason to stop code, testing, documentation, or derived-release
work.

## Plain-language status

The one-month paid Phase 6 study has a complete frozen calendar and budget, but
it is not armed. The repository intentionally requires a separate, current
source-use decision and exact authorization before any source query or paid
dispatch. Therefore November 20 is an intended launch date, not evidence that
the run automatically started.

Packet A—the existing Phase 6 operational/source-custody packet—is preserved as
the full-fidelity lane. Packet B—the new Phase 7 derived-release packet—is a
separate representation and retention boundary. They are not two permanent
copies of a provider archive, and no existing or future production row has been
moved into Packet B yet. Packet B is a narrower, tested derived-release
representation; it does not replace Packet A or remove any operational field.
The fail-closed writer emits only Packet B from already-approved bucketed inputs;
it is not a raw-source transformer. It keeps model-useful horizon, split,
missingness, censoring, quality, and bucketed feature/label information while
rejecting source identities, exact flight records, raw payloads, exact
timestamps, and source-to-row linkage. Existing Packet A source expiry remains
authoritative.

## Completed and verified

| Area | Current verified state |
| --- | --- |
| Phase 5 freeze | Production inert/scientific freeze complete. Do not restage B0062/V0093 or rerun completed migrations. |
| Study geometry | 31 parent days, 6,144 planned source templates, 37,388 reserved REST units, seven cost categories, and the original f.8 / A / B / C / D1 / D2 / E design are frozen. |
| Production safety | One B0062 authorization singleton exists disabled; source authorization, process arming, and paid GO remain false. Freeze inventory reported zero prelaunch structural holds and zero provider calls. |
| Source retention | Packet A's short-lived source-custody and expiry controls remain in force. Packet B is not a duplicated permanent provider archive. |
| Phase 7 contract/writer | Strict derived-release contract, packet builder, fail-closed writer, rejection tests, grouped split fence, missingness/censoring checks, and documentation are implemented. A pure review-gated source-to-derived adapter and rejection test matrix are now implemented, but no concrete approved profile, account-specific rights decision, or live provider adapter is committed. The writer still accepts only already-approved bucketed values. |
| CI | PR #893 exact-head checks passed for the derived writer, and PR #895 exact-head verification passed for the reviewed transformation adapter: TypeScript, focused no-provider release, full offline tests, migrations/no-op, schema/triggers, lint, registry, traceability, contradiction scan, preflight, production build, and disposable PostgreSQL behavior. |
| Current-main activation continuity | PR #892 pinned the #890/#891 retention successor, PR #893 added the fail-closed writer/test blobs, and PR #895 added the review-gated adapter/test blobs plus a refreshed normalized self-hash to the reviewed post-freeze bridge. Main remains rights-disabled, source-disabled, database-unchanged, scheduler-inactive, and credit-neutral. |

## Current failures and what they mean

1. **Source-enable approval ledger:** 28 evidence records and zero approvals.
   This is a deliberate HOLD, not a software crash.
2. **Account/rights distinction:** the account identity and observed
   quota are already evidenced: legacy RapidAPI Team Ultra, owner-attested
   $32 renewal, observed 60,000 units, separate 50,000-unit project ceiling,
   1,830 Alert credits, and the November 18 readback. Do not repeat account
   discovery. The remaining review is narrower: whether the exact account,
   purpose, and backup/PITR/replica/log surfaces permit retaining the full
   linked per-flight operational corpus for the study lifecycle. No provider
   reply is required for engineering, but silence is not converted into a
   retention grant.
3. **Native GitHub schedule:** the latest coverage review found only one of five
   eligible slots successful, with severe delay/missing slots. Native cron alone
   is not sufficient for the month run.
4. **External relay:** its clock is firing, but forwarding is fail-closed on an
   old approved target SHA. The repin helper in draft #887 is review-only and
   cannot run until an exact Phase 6 AUTH already exists.
5. **Early four-airport draw:** its green workflow conclusion was inert; the
   actual selection/DB step skipped because source-rights/process/owner GO gates
   were off. It is not a completed Day-1 draw.
6. **Historical first CI failure on #890:** strict TypeScript null/numeric checks
   failed, were corrected, and all PR and post-merge checks subsequently passed.
   It is closed and is not a current launch failure.
7. **Phase 7 transformation:** the fail-closed Packet B writer is
   implemented, but the full Phase 6 operational fields remain required in
   Packet A. The concrete Packet B dictionary is proposed and the full-to-
   derived parity check still must be run before any ML-critical operational
   field expires.

## Exact remaining activation chain

These are sequential gates, not unfinished Phase 5 work:

1. Bind the already-recorded account/quota evidence to the exact
   Phase 6 operational field inventory and complete the separate field-level
   decision for the full linked corpus, purpose, source TTL, and backup/PITR/
   replica/log surfaces. This is not another account-identification check.
2. Freeze the exact feature/label dictionary, source class, transformation,
   bucket boundaries, reconstruction-risk rationale, and retention lifecycle.
   Implement and test the source adapter against the writer's already-approved
   input shape; the adapter must remain separate from the provider collector
   until rights and field review pass.
3. Create and approve one scoped Phase 6 AUTH artifact in
   `V3.9_PHASE6_SOURCE_ENABLE_APPROVALS.json`; the current ledger has zero
   approvals and engineering must not invent one.
4. Run the existing source-enable owner transition and independent readback.
   It must bind the frozen manifest/calendar/config/budget and keep legacy Alert
   start disallowed.
5. Apply the nine current-main runtime pins and the already-reviewed
   primary/relay target repin. Verify the external backstop forwards to the
   exact authorized main while all collection STOP flags remain set.
6. Perform a zero-provider controlled preflight/clock rehearsal and confirm
   native plus relay coverage, current account/quota, database role, watchdog,
   expiry, derived-writer receipt, and failure-custody receipts.
7. Issue the separate paid GO, then transition the exact STOP/arming controls
   and execute the real Day-1 four-airport draw, SOURCE, PRE, derived release,
   and POST chain.
8. Monitor daily cap/floor, scheduler lateness, expiry, derived-packet coverage,
   missingness, settlement, and terminal receipts for all 31 days. Any mismatch
   returns to STOP.

## What must not be done merely to meet November 20

- Do not claim the paid month started because a scheduled workflow is green.
- Do not infer source rights from silence, quota, a plan name, hashing, or a
  normalized table.
- Do not bypass the empty approval ledger, stale relay pin, watchdog, budget,
  expiry, or exact-main checks.
- Do not retain copied provider rows in the Phase 7 packet.
- Do not repeat completed Phase 5 commissioning.

## Policy-mapped Day 1–Day 31 preparation added

PR #897 is merged at commit `22b154030a2aa4a2ea09184a3021b01d28645ee9` and adds:

- a three-lane model separating temporary provider-shaped source custody, the narrower Phase 7 derived-release packet, and non-reconstructive model/control artifacts;
- a concrete proposed field dictionary for coarse features, T−24/T−6/T−90 labels, missingness, censoring, and quality state;
- an explicit exclusion list for identifiers, exact timestamps, raw responses, request metadata, and direct source linkage;
- a Day 0 preflight, bounded Day 1–Day 31 run, daily fail-closed gates, and Day 31 closeout;
- model/parity safeguards intended to preserve Phase 7 signal before source-custody expiry.

The dictionary is `PROPOSED_REVIEW_REQUIRED`, not an account-specific rights approval. The document therefore improves launch readiness without changing the empty approval ledger, paid GO flag, source-enable state, scheduler state, relay authorization, or provider-call count. It records the correct project position: provider silence does not block nonpaid engineering, and provider silence does not authorize paid collection.

See `data-collection/phase5/2026-11-19_PHASE6_POLICY_MAPPED_DAY1_DAY31_PREPARATION.md`.

## Paid-GO worksheet added

PR #898 is merged at commit `6c513ec75a827e494f91a2be9032cd1e7cdeba21` and adds `data-collection/phase5/evidence/2026-11-19_PHASE6_PAID_GO_WORKSHEET_NO_GO.md`.

The worksheet records the exact current state and the required evidence for:

- account-specific paid-use and retention;
- the field-level derived profile;
- source-enable/readback;
- relay repin;
- a fresh zero-provider rehearsal;
- the separate bounded paid GO;
- daily Day 1–Day 31 fail-closed continuation checks.

It is an unarmed worksheet. It does not add an approval, enable a source, arm a process, dispatch a worker, or create a provider call. The current decision remains `PAID_PHASE6_GO=false`, `SOURCE_ENABLE=false`, `PROCESS_ARMED=false`, and `APPROVAL_LEDGER_APPROVALS=0`.

## Field-preservation correction added

The prior wording about “excluded” fields was too broad. PR work on the correction branch records that flight/service identifiers, operating-leg identity, origin/destination airports, operating/marketing carrier, route/segment links, exact schedule/observation/event timestamps, source bindings, PRE/POST links, and Amendment E evidence are required in the private Phase 6 operational/source-custody lane.

Those fields are not removed from Phase 6 and are not rejected by the operational study tables. The strict rejection applies only to the long-lived Phase 7 derived-release packet. The repository already contains the account/quota evidence; the remaining review concerns field-level long-term retention, purpose, and backup/PITR/replica/log treatment. Full-to-derived parity must run before any operational field expires.

## Handoff

Engineering can continue without waiting for email. The fail-closed writer is
ready for a separately approved transformation output, but it is not a live
source adapter. The paid run itself remains
a controlled NO-GO until the eight-step activation chain above is satisfied.
The next blocking inputs are a genuine current source-use decision and the
exact field-level derived transformation. After those are frozen and tested,
the scoped AUTH, source-enable, repin, preflight, arming, and Day-1 machinery
can be executed in order.
