# Gate 5 Phase 4 — independent GitHub T-24h/T-6h/T-90m prearm owners

**October 31, 2026.** This is **engineering code plus a live no-provider GitHub validation job**, not a paid cohort or a scientific Gate 5 PASS. Authority: binding Plan f.8 sections 5.1–5.4, 6, 16–17; [redo incident and science blockers](2026-10-31_GATE5_REDO_ROOTCAUSE_AND_RESTART_HANDOFF.md). October 31 missed T-6h remains UNOBSERVED. This changes neither historical raw source nor the hash-locked Implementation Log.

## Completed engineering in this change

- New server/lib/disruption/phase4Gate5OfflineThreeOwnerPrearm_v39.ts compiles the existing complete, frozen, nonadaptive FIDS retrieval grid into **three truly independent future runner ownership windows**. Each has an owner digest, an early prearm-open UTC, a deadline for an independently confirmed *running* GitHub job, first/last physical-dispatch bounds, and all planned source refresh attempts.
- Every grid request gets its own expected physical dispatch UTC and latest permitted dispatch time **no later than 15 minutes before its cutoff**. A missing or delayed run is UNOBSERVED; neither an HTTP GET after the cutoff nor a later source read can recreate historical observability.
- The runner lifetime calculation keeps all horizon work plus setup/audit below six hours, instead of requiring one GitHub runner to survive the 18-hour separation between T-24h and T-6h. It refuses horizon/cost contradictions and reserves **all** allowed FIDS retries, not just the initial request.
- A new main-push GitHub Actions workflow phase4-gate5-offline-three-horizon-owner-prearm.yml executes the actual offline operator. It loads an explicitly **synthetic 2027 WSSS** example from GATE5_NEXT_COHORT_PREARM_SYNTHETIC_HOLD.json; has **zero** provider/database secrets, no scheduled/waiting job, and no paid source activity. A green job establishes only that the compiler works on GitHub.
- Tests: tests/phase4_gate5_three_owner_prearm_v39.test.ts. Example math is 9 source queries * 3 reserved physical attempts * 2 API units = 54 worst-case units. Those numbers are **not** an approved real sample, quota debit, or licensing exception.

## Next actual implementation work needed before a prospective paid run

1. Resolve or bound source-native selected T and actual-only wheels-off semantics under issue #200, and verified operating-flight/codeshare scope. An already-sent October 30 provider inquiry does not constitute a reply or source proof.
2. Review data classes, customer-specific retention and legal purpose, November 7 terms, Cache-Control, seven-day PITR and source deletion under issue #300. Existing historical grandfathered Team Ultra and current **60,000/59,974** quota with **1,830 Alert credits** were already verified; do not re-ask user for historical account label. Independent project 50,000-cycle cap still binds.
3. Build a **new** frozen source-cohort manifest with exact future real dates, reviewed digest, per-attempt API budget and distinct GitHub owners; implement true push/cron redundant prearm job execution with a single idempotent provider dispatcher, verify actual GitHub-running attestation before each horizon, and never backfill missed requests. This code **only computes the ownership plan**; it does not yet implement these production runners.
4. Complete the fully cohort-scoped **certified persisted** PRE writer (not just in-memory previews), independent read-only source/PRE/capture/outcome audits, raw retention and target labels. Optionally missing weather/webhooks must not erase an otherwise qualified PRE row.
5. All four required CI checks, independent post-merge main-push dry-run logs, and real next-cohort integration tests must pass before scientific Gate 5 review. Phase 5/6 remain NO-GO until Plan prerequisites and separate authorization.

No Replit shell command is necessary for this software unit. Do not claim that a synthetic green pipeline or an unverified owner flag is production readiness.
