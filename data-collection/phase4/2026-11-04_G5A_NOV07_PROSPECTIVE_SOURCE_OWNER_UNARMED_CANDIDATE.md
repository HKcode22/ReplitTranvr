# Phase4 G5A WSSS Nov7 UTC / Fri Nov6 PST — unarmed new prospective source

**Status: REVIEW CANDIDATE, NO LIVE PROVIDER ACTIVATION.** Prepared November 4 after the older Nov5 14Z cohort failed to retain T−24h source. This intentionally reuses the already-frozen distinct November 7 manifest `GATE5_G5A_WSSS_20261107_FROZEN_SOURCE_GRID.json`. The actual earlier Nov5 manifest and its V0076 three spent-attempt reservations remain immutable. The new manifest has a different SHA, owner digests and cohort ID, never overwrites a prior original or backfills the prior cutoff.

## New cohort and correct real dates

WSSS airport departure service window **Nov7 02:00–03:00 UTC = Friday Nov6 18:00–19:00 PST**. Frozen file recorded `assignmentFrozenAtUtc:2026-11-04T06:00Z` before any candidate paid collection. **Only after separate reviewed activation**:
- Prospective T−24h GH prearms Thu Nov5 **13:47,14:17,14:47,15:17 PST**, first real source Thu **17:30 PST**.
- T−6h GH prearms Fri Nov6 **07:47,08:17,08:47,09:17 PST**, first real source **11:30 PST**.
- T−90m GH prearms Fri Nov6 **12:17,12:47,13:17,13:47 PST**, first real source **16:00 PST**.
- POST first planned provider slot Fri Nov6 **19:40 PST**, independent audit around **21:12 PST**.

The source owner candidate `scripts/v39_phase4_gate5_g5a_nov07_real_wsss_horizon_owner.ts` accepts only new cron values, a distinct GitHub workflow identity, a distinct GitHub paid intent, new manifest and real source cutoffs. The old special-case GitHub failed-owner handoff was deliberately **removed**: a newly existing Nov7 owner is duplicate-suppressed, never handed off or replaced automatically. The source still enforces V0076 budget/physical one attempt per slot, V0077 atomic provider-original binding, cutoff-safe PRE, no late backfill, and zero-T24 successor paid skip.

## Still missing before paid activation

1. **Actual source-writer permission readback:** after the operator reports the approved membership trigger grant script failed, a fresh protected GitHub `READ ONLY` recheck must distinguish commit from refusal. No repeat grant until transaction state verified. The known missing permission was `clean.population_research_membership` INSERT and `population_member_id` column SELECT, reproduced and confirmed by PRs #389/#390.
2. Final source+PRE validation using the **restricted** owner role and safe error classification; synthetic privileged PG16 alone is insufficient to claim real flight content saved.
3. A separately reviewed GitHub workflow with matching identity and all 12 distinct cron backups, protected `phase2g-paid` secrets, and explicit approval. **No such live workflow is created by this candidate**. New prospective POST and independent audit must also be reviewed and checked; old Nov5 POST must not be reused.
4. A positive no-paid role readiness and release audit, proper original provider source semantics/retention limitations as documented in Plan f.8/Amendment G5A. No scientific PASS or Phase5/6 authorization before genuine original/normalized/PRE/POST evidence and independent postcutoff audit.

No Cloudflare, Replit AI Agent, Replit scheduler, manual timed Replit operations, raw provider payload logs, password rotation, ledger reset, already-expired T24 retries, or blind new paid source GET. This branch is explicitly **unarmed** and may be merged only in that inert state. A future activation must be a separate reviewed PR after receipt verification.