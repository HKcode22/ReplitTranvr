# November 1, 2026 — one ACTUAL paid AeroDataBox source-semantics probe, with zero stored provider Contents

**Intent:** On explicit repeated project-owner paid authorization, make concrete Gate 5 progress now instead of treating provider email response as a scheduling prerequisite. **This is narrowly limited feasibility, not Gate 5 scientific PASS or a substitute for a prospective three-horizon complete cohort.**

## Why run this real probe

- October 31 prospective T−90m AeroDataBox FIDS one-shot was paid and source-body stored successfully, but original T−6h was missed, as-of source after-availability verification showed only provisional core rows, and **actual-only runway/selected T** cannot be inferred just from generic FIDS fields.
- Before a new multi-horizon campaign, one fresh recent-completed WSSS source request checks native FIDS field presence and vendor uptime and produces a real billing receipt. This is not a repeat of disposable PostgreSQL tests and does not require inventing legal caching/retention rights or a positive support email.
- Public AeroDataBox terms announce November 7 transition for pre-existing subscribers and default seven-calendar-day maximum content caching absent plan-specific exception. **This probe stores none of the raw provider JSON/body, identifiers, per-flight timestamps or normalized per-flight data.** It reports only anonymous aggregate field-presence counts. No claim of extended caching or a permanent dataset is made.

## Exact paid operation

- New `phase4-gate5-one-real-paid-nonretained-fids-semantics.yml` is GitHub-only, protected `phase2g-paid`; runs **once** on successful protected merge of PR #324 into `main`. No `workflow_dispatch`, `schedule`, reusable timed shell, action credentials in checkout, or ongoing paid-on-push trigger. Changes to unrelated PRs cannot retrigger the one-shot.
- Live source is **only AeroDataBox RapidAPI** FIDS WSSS Airport ICAO departures for a bounded recent complete one-hour service interval. Exact source parameter frame: `direction=Departure`, `withLeg=true`, `withCancelled=true`, `withCodeshared=true`, `withCargo=false`, `withPrivate=false`, `withLocation=false`. Singapore timezone local range calculated at the actual GitHub execution time. Not a previously missed/late T−24h/T−6h/T−90m cutoff or a fake replay.
- Strict preflight: authenticated main push/actual checkout SHA/first workflow attempt/exact workflow and intent/unique run ID; no production DB URLs; protected API key present; **fresh free** AeroDataBox quota and requests remaining safely above one expected 2-unit call; 15s HTTP timeout, no redirect, response size ≤4 MiB, 0 retry and 0 Alert subscription/refill.
- Outputs only sanitized aggregate field counts: source departures, provider IsOperator vs marketing vs unresolved, presence of `scheduledTime`, `revisedTime`, `runwayTime`, `quality`, `origin ICAO` and `leg`. The presence of `runwayTime`, quality Live, operator tag or a generic schedule **never** certifies actual-only wheels-off, physical one-flight identity or a provider-native frozen selected-T milestone.
- If any network fault after the first physical attempt occurs, `providerRequestsAttempted=1`, possibly billed 2 units, no retry. There are **no** DB connection secrets or production writes and absolutely no original body/source timestamp output. Expected charge is 2 REST units; measured header delta may be unknown, never fabricated zero.
- This one-shot probe by itself cannot populate `flight_population`, create PRE snapshots or contribute to the full scientific Gate5 denominator. It is an active source-semantics/billing feasibility checkpoint only. **Phase4 full paid cohort still needs truly separate early GitHub owners + permanent V0076 attempt ledger + raw-first lawful source provenance + PRE + callback/outcome audit.**

## Binding scientific limitations, not a perfectionism waiver

Plan f.8 §5 and Gate 5 allow optional feature missingness and imperfect delivery coverage as long as complete denominators and missing statuses are measured. Do **not** confuse this with substituting unverified provider clocks or estimated runway times as actual-only targets, backfilling missed cutoff data, or retaining Content without a license. External tickets [#200](https://github.com/HKcode22/ReplitTranvr/issues/200) and [#300](https://github.com/HKcode22/ReplitTranvr/issues/300) stay open, and [#293](https://github.com/HKcode22/ReplitTranvr/issues/293) owns future full prospective cohort.

**Completion criterion:** Four PR CI checks PASS → exact PR #324 merge SHA → inspect postmerge *real paid* main-push job log for `P4_G5_ONE_REAL_FIDS_PAID_GET_STARTED_ONE_ATTEMPT_NO_RETRIES` and redacted summary → record measured account debit, if observable, and no-retention/no-retry evidence here. If any preflight holds, explicitly record no paid dispatch and diagnose, never guess success.

No Replit shell command needed for this one-shot. Full Gate5 scientific PASS remains HOLD; Phase5 FREEZE HOLD and Phase6 NO-GO.
