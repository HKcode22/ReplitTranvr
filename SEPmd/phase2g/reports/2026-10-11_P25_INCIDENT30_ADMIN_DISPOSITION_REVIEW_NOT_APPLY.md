# P25 incident #30: evidence-backed administrative disposition REVIEW — NO SQL APPLY

**Status: PROPOSED / NOT APPROVED / NO INCIDENT MUTATION**

## Evidence
- Historical exact anchor probe `18`, ICAO YSSY, source session `6267293e-75a0-42a7-b977-89543f200ebc`, failed/censored, reconciliation UNRESOLVED, stop `supervisor_child_exit_recovered`.
- Historical incident id `30` remains `resolved=false`; `providerDeleteVerified=true` is a *recorded historical control-plane outcome*, `runtimeCleanupVerified=false` is unproven, **no cleanup journal** row.
- Current 0 runtime rows for that old session does **not** prove deletion because UNLOGGED data can reset after a PostgreSQL postmaster failure. There must be no fabricated `runtime_cleanup_verified_at_utc`.
- Latest independent provider inventory at 2026-10-12T00:33:13Z: 0 active billable subscriptions, 2,287 Alert credits. **Recheck before any change**, do not rely on stale counts.
- All 30 P2G24 original SHA-256 and byte lengths re-verified in dedicated published receiver bucket `replit-objstore-5aa4d2c4-399b-4933-9acf-0292f79d6d59`; 0/30 accessible in unrelated Travnr general bucket. Source metadata expiry begins 2026-10-16T04:02:22Z. The originals must not be deleted/tombstoned early.
- Current production V0064 structure/trigger verified and real signed public POST test PASS with synthetic 1.303s ACK (separate session `c2380814-6210-43a0-847f-bf8066013063`), no provider credits.
- A fresh exact-session postflight read-only audit is available but its live results are not yet supplied by operator.

## Administrative distinction

There are two separate claims:

1. **Present operational hazard is contained** — provider has zero active billable subscriptions and no active/settling science probes/runtime sessions at current inspection time; verified originals remain retained; the new hosted receiver is independently able to ACK and persist a one-off signed callback. If rechecked and accepted, an authorized operator may decide an old incident is administratively contained even when historical details cannot be reconstructed.
2. **Historical runtime cleanup was verified at the time** — **FALSE/UNKNOWN.** UNLOGGED row absence today and the missing cleanup journal cannot prove this. A purely administrative closeout must not rewrite `runtimeCleanupVerified`, `runtime_cleanup_verified_at_utc`, scientific probe status, original object metadata, or reconciliation.

An operational incident record's `resolved=true` might mean *current hazard mitigated* if the organization's formal policy defines it that way; it must NEVER be interpreted as evidence that historical cleanup succeeded. Because the paid owner currently uses `resolved=false` as a hard STOP, using administrative closure to permit new paid work is an explicit release-policy decision, not a cosmetic SQL update. No agent may infer that permission from the user's earlier **approval to PREPARE** the next run.

## Requirements before any incident-state mutation

1. Fresh provider account evidence (zero **all** active billable), exact published source and custody flags still true, current 0 active/settling probes and runtime sessions.
2. Retained 30 original object SHA/byte audit current, exact probe18 immutable failure evidence and unaltered budget; verify no original deletion/tombstones before Oct16.
3. Operator + scientific project lead approve a clearly worded administrative **containment-only** resolution where `historical_runtime_cleanup_proven=false`, `historical_source_completeness_unknown=true`, `scientific_acceptance=false`, `prior_attempt_remains_censored=true`, and `additional_paid_attempt_authorized_by_incident_closeout=false`.
4. Write an append-only, SHA256-bound external closeout report *before* any SQL write; no change to original incident `detail` if schema can't preserve original fields without loss; keep source ref protections.
5. Verify DB constraints and incident schema before writing. Any update must select exact `id=30, cause='reconciliation', resolved=false, detail.reason='supervisor_child_exit_recovered'` and require **exactly one row**, in a guarded transaction. No other incidents should be marked resolved. Capture before/after with immutable receipt and independent review. No reclassification of probe 18.
6. **Separate** P25 approved frozen prospective science amendment, hashed runtime/credit budget and new source-bound AuthRecord, exact final paid preflight, 120-min hosted rehearsal as required by frozen full F.8 claim. Incident containment approval alone is never paid authorization.

**Release decision now:** `HOLD_ADMIN_MUTATION`, `HOLD_PAID_YSSY`. This note is an operator review proposal only, not an executable script. Do NOT run `UPDATE clean.adb_incident_stop SET resolved=true` just to defeat a software blocker.
