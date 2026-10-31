# Phase 4 — October 31 WSSS T−6h GitHub scheduler miss and T−90m controlled recovery

**Incident observed:** Saturday, October 31, 2026, 05:31 PDT = 12:31 UTC.
**Repository:** HKcode22/ReplitTranvr; Plan f.8 v3.9 Phase 4 Gate 5.

## Incident
- The dated GitHub 10:07 UTC / 03:07 PDT T−6h WSSS FIDS schedule did **not produce a run** by 12:31 UTC / 05:31 PDT. No matching provider/API job exists in inspected GitHub runs. Absence of a GitHub run is **not** proof of provider outage, provider spend, or zero flights.
- T−6h first candidate prediction cutoff was 11:00 UTC. The existing 15-minute safety margin ended 10:45 UTC = 03:45 PDT. Classify this source refresh **UNOBSERVED**, not a synthetic FIDS response. No late catch-up.
- Prior T−24 scheduled cron was delayed by over four hours and safely HOLD before a paid GET. GitHub schedule triggers are best-effort. Earlier separate Oct30 13:49 UTC original paid WSSS FIDS GET cost 2 REST units, inserted 24 provisional members and passed source-hash readback.

## Remaining T−90m recovery
- Frozen SAME WSSS airport departure cohort Oct31 17:00–18:00 UTC. Candidate T−90m cutoff is 15:30 UTC; last allowed physical paid start 15:15 UTC / 08:15 PDT.
- Replace **only the remaining** Oct31 14:37 UTC / 07:37 PDT GitHub schedule event with a **one-time GitHub main-branch push-triggered prearmed runner** in .github/workflows/phase4-gate5-wsss-t90-push-prearm-20261031.yml. The original 14:37 cron entry is removed to avoid duplicate paid operations. Preserve historical missed cron entries. The new job has a bounded wait from GitHub-hosted Actions and prints heartbeats while it awaits exactly 14:37Z.
- The wait step has **no API key**. At 14:37Z a separate protected paid step invokes the existing one-shot FIDS source operator with an explicit push-prearm consent token rather than disguising a push as a schedule.
- The operator demands exact GitHub repo/main/first-attempt/workflow path/name/job and push event, same frozen cohort, and timestamp within the **14:27–15:15 UTC** valid interval immediately before physical dispatch. It checks database source receipt duplication at that exact horizon, both before provider preflight and immediately before the one GET.
- Maximum one actual AeroDataBox paid GET (expected 2 REST API units), zero retries or Alert creates. The normal live database schema, provider OpenAPI, account quota/balance, raw-first transaction, checksum readback and independent read-only audit are retained. This fallback shares the paid workflow concurrency group.
- If a GitHub push workflow run fails to materialize, leaves its waiting stage, fails live safety checks, or starts too late, the missed source is UNOBSERVED; do not invent a successful source, timestamps or flight denominator. GitHub hosted waiting uses Action runner minutes. No Replit shell timer or Cloudflare.

## Acceptance evidence to capture
1. Required PR checks PASS before merge.
2. Main commit preserves source and workflow without second paid T90 cron.
3. Verify a real GitHub Actions run named Phase4 WSSS T90 PREARMED GitHub One Paid FIDS GET appears, and the wait step emits heartbeat.
4. Inspect actual 14:37 UTC paid result and providerAttempted, measured units, source integrity; never assume success.
5. Independently evaluate postflight read-only audits at 19:15 and 22:15 UTC and record observed/missing coverage.

**Science remains HOLD:** T−6h refresh is missed. T−90m still dependent on provider/live API. Earliest selected-T is not proven per physical operating flight, and actual-only wheels-off outcomes, certified PRE persistence, operational weather ingestion and Gate5 PASS are not established. No Phase5 FREEZE or Phase6 authorization. Plan f.8 accepted small missingness does not authorize invented values or relaxed source cutoffs.
