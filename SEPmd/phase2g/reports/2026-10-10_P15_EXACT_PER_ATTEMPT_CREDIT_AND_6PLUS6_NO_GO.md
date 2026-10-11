# P14/P15 — 6+6 watchdog per-attempt billed flight-item identity gate

Date: 2026-10-10 PDT. **GitHub isolated investigation branch only, no paid traffic, no Cloudflare and no main/published Replit modifications.**

## Verified exact source and CI

- Git source under test: `90320f5d7a4f614240d8161881f22fc61388702c`.
- [Actions #38104740211](https://github.com/HKcode22/ReplitTranvr/actions/runs/38104740211): **BOTH jobs SUCCESS**; 468/468 offline in 46 suites, 45/45 actual V3.9 disposable PostgreSQL16 integrations; actual PostgreSQL SIGKILL again confirmed UNLOGGED loss and one LOGGED owner binding survives.
- Draft PR #27 remains unmerged; no deployed/production witness in this code.

## New defensively necessary witness predicates

Updated `scripts/v39_phase2g_stage1_watchdog_6plus6_policy_v39.ts`'s **pure conditional hypothetical witness schema**:

1. `eachSenderAttemptMatchedByImmutableIdentity`: all original sender attempt IDs agree 1:1 with the durable source receipt identities.
2. `eachSenderAttemptFlightItemCreditsMatched`: billable credits for each attempt match the original flight-item count and durable source ledger.
3. `noUnattributedOrDuplicateBillableAttempts`: no missing/orphan/duplicate billable attempt.

Any predicate missing/false fails closed with `SOURCE_WITNESS_PER_ATTEMPT_ITEM_CREDITS_OR_IDENTITY_GAP`. Aggregate matching source/sender counts and credit totals **cannot compensate for** a 5/4 vs 4/5 mismatch. Added two focused adversarial tests (one tests offsetting credits with aggregate equality, the other missing/forged/duplicated attempt IDs and an absent verdict field).

**Critical limitation:** the current real Stage-1 GitHub supervisor `scripts/v39_phase2g_stage1_logged_supervisor_v39.ts` explicitly sends `evidence:undefined` to `advanceStage1WatchdogV39`. There is no independently authenticated sender-attempt/credit verifier. The `six-plus-six-candidate` option does not and **MUST NOT** authorize twelve failures. Without source evidence, it rejects extension by the third consecutive failure; a recovered callback may also terminate earlier in candidate mode if its absent source cannot be certified. The default remains `legacy-three`.

There is **no route to genuine 6+6** simply by setting `V39_PHASE2G_CALLBACK_WATCHDOG_POLICY=six-plus-six-candidate`. Do not introduce manually fabricated JSON, environment toggles or test fixture HMAC as source evidence.

## Sunday Oct 11 YSSY decision

The proposed **Sunday October 11 20:00–22:00 PDT / Monday October 12 03:00–05:00 UTC** paid YSSY experiment is **NO-GO** for 6+6 and not automatically approved for a legacy-three paid fallback. Reasons include:

- No deployed independent original-provider pre-2xx webhook archive while Replit Autoscale receiver is unreachable. Cloudflare explicitly excluded, no replacement paid infrastructure approved.
- No independently authenticated provider delivery-attempt/flight-item credit 1:1 original ledger (historical P2G22 260 vs 259 is still not fully explained).
- No source-verified original UTC and safe replay after production PostgreSQL UNLOGGED state loss, no exact deployed Replit receiver source SHA, no real hosted two-hour zero-credit R0–R11 rehearsal.
- No prospective experiment recovery amendment nor new human-bounded paid provider authorization.
- Replit support ticket #564568 latest checked Gmail messages still do not provide an original host-failure engineering determination (last support response timestamp Oct 10 02:39 UTC; user followup Oct 9 20:04 PDT).

A greater regression test count validates more source invariants, **not** live scientific acceptance or platform uptime. All P01–P20 remain open to their final sign-off criteria (15 BLOCK, 5 HIGH). No Cloudflare resources/billing, provider credits, live DB mutation, or published Replit changes.
