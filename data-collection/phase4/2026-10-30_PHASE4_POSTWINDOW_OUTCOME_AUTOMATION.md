# Phase 4 — WSSS after-service read-only audit automation (October 30, 2026)

The 2026-10-31 WSSS service interval is **17:00–18:00 UTC (10–11 AM PDT)**. Before-departure FIDS cutoff attempts are already bound to **03:07 AM and 07:37 AM PDT**; those are separate one-GET (expected 2 API units each) **paid** workflows.

This checkpoint implements two **zero-provider-read, zero-credit, zero-write** GitHub scheduled audits **after** that same service interval:

| Slot | UTC October 31, 2026 | PDT October 31, 2026 | Work |
|---|---|---|---|
| Early outcome inventory | 19:15 UTC | 12:15 PM PDT | Read-only retained WSSS FIDS population / PRE builder / resolution / outcomes |
| Later outcome inventory | 22:15 UTC | 3:15 PM PDT | Same bounded read-only query; test late callback/target status |

The new `.github/workflows/phase4-gate5-wsss-postwindow-outcomes-readonly.yml` uses the **existing** protected `GATE05_AUTOMATION_DATABASE_URL` and existing audit operator. It does **not** receive the AeroDataBox API key, and PostgreSQL is explicitly `REPEATABLE READ READ ONLY`. The handler allows only the two exact cron strings on `main`, the first run attempt, the correct repository and date/window, and refuses late catch-up more than four hours after the specified UTC slot. GitHub is best-effort: a delayed job holds or produces a later as-of read; it does not rewrite history.

**Measuring vs certifying:** This reads the same WSSS operating-leg candidate cohort, and aggregates captured webhook-to-core joins plus observed/pending/censored/missing wheels-off outcome statuses. It cannot currently certify an observed actual wheels-off, a verified physical flight denominator, or unknown provider selected-T semantics. Missing/zero counts are not converted into zero-capture rates; source expiration remains honored. An audit after the service is *not* independent proof that any callback was actually subscribed or received.

**Replit owner instruction:** No Replit shell command, no secret copying, and no manual timed task. Existing October 31 FIDS paid workflow and limits remain untouched. Phase 5 freeze and Phase 6 are not authorized by an audit passing.
