# P25 — October 12, 2026 8 PM PDT YSSY release handoff (planning only)

Status: **DRAFT REVIEW / NO PROVIDER GO / NO LIVE DATABASE MUTATION**.
This is the rescheduled **single** prospective YSSY 120-minute recovery, not a fifth experiment and not a scientific promotion of earlier failures. The operator stopped the original October 11 plan before any new P25 subscription and requested preparation for Monday October 12 at **20:00 PDT** = Tuesday October 13 **03:00 UTC**. End target 22:00 PDT / 05:00 UTC. The old P2G24 session and failed/censored probe18 remain immutable evidence.

## Frozen scientific identity (PR #35)

- Protocol amendment `artifacts/phase2g-early-pilot-yssy-p25-recovery-freeze-20261011.json`.
- Approved **conditional science planning** decision `artifacts/phase2g-p25-yssy-prospective-project-lead-approval-20261011.json`. New project-lead **science** decision hash `4ac004e0150a3816e272cbec37907e598bb0605870c65a63477e526e2ba81c61`.
- New frozen amendment hash `b54256346a35354d71e46e18a44d175056cba3228d93313d0036cc08af2f4f94`.
- Planned new budget day `P2G-S1-20261013-03`, new authorization ID `AUTH-20261013-P2G25`.
- Exactly one 120-minute run, max 500 Alert credits (450 reserved +50 unsettled), protected account floor **1000**, provider delivery retries **0**, no automatic scientific retry.
- Original physical-flight-v2 measurement contract and exact external/internal credit reconciliation remain mandatory. Any unobserved provider send is not an imputed flight. The operator opted to **SKIP**, not pass, the optional extra two-hour synthetic prelaunch rehearsal. A run with failed coverage or reconciliation remains failed/censored for science.
- A conditional decision for tomorrow does **not** automatically authorize a new paid provider call. Require exact fresh financial authorization at launch.

## Historical incident and budget (never falsify)

- Historical incident30 is **administratively contained** only; original runtime cleanup is **unverified**, and old probe18 is failed/censored/UNRESOLVED.
- The previous budget `P2G-S1-20261009-23` was still `OPEN` after the operator's last command **STOPPED before mutation**. The prepaid-safe-mode probe has `reserved_credits=500` but `credits_spent=NULL`, `internal_send_credits=NULL`; no historical balance measurements or durable reconciliation row. Never write guessed credits or reclassify science.
- The strict, separately authorized administrative `OPEN -> MISMATCH` quarantine is in draft PR31 `scripts/v39_p25_safe_mode_budget_uncertainty_quarantine_v39.ts`; it is **NOT** automatically approved or applied. Reverify 0 current billable subscriptions, one exact failed probe18 and 30 still-retained original refs, then require the operator's distinct explicit action before applying. If verification fails, HOLD.
- The prospectively restricted `ensureProbeBudgetDay` rule in THIS source candidate permits only the exact historical terminal MISMATCH, only when date/source-frozen P25 criteria and preserved evidence agree. Every other mismatch/OPEN budget still blocks. Therefore **never apply the quarantine against the old live code and expect GO**. First finish the integrated code release.

## One controlled source release — avoid SHA self-reference

1. Finalize and review **one** source tree on `phase2g-p25-20261012-integrated-release-review` (PR35), with full offline, focused, real disposable PostgreSQL and published-readonly checks GREEN. No merge or publish of unrelated massive forensic PR27/PR31.
2. Once protected source code is frozen, run the READ-ONLY next-day runtime+Auth DRAFT generator from the separate audit branch PR31, `scripts/v39_p25_prepare_exact_runtime_auth_drafts_v39.ts`. It must read exact fetched PR35 head and the exact hashes above. It creates artifacts in a new `/tmp` dir, does not call the provider, and is **not an approved AUTH by itself**.
3. Review generated JSON, exact runtime SHA, source-protected-tree SHA, new scientific scope, full window and cap. Commit only approved artifact(s) under `artifacts/` and `SEPmd/` and append their **exact** approved `AUTH_ARTIFACT_SHA256:<64hex>` and predecessor IDs to `SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md`. Do not change protected `server`, `scripts`, `migrations`, `tests` or `.github/workflows` after freezing runtime. Source-head-in-runtime must be an ancestor of the release HEAD and have the identical protected tree SHA, as checked by actual preflight.
4. Coordinate one reviewed Replit callback-only publication of the exact authorized source tree. Replit may create an **empty-tree-diff** `Published your App` child commit. **Verify exact parent and equal tree**, then push that real published commit to a dedicated GitHub branch without force-push. The paid workflow `expected_head` must equal GitHub checkout HEAD and the public deployed `git_head` exactly; do not spoof build variables.
5. Run a fresh single **signed, nonempty, public** POST verifier for the newly published revision; retain its SHA-bound receipt. PR35 paid workflow accepts a `callback_verification_b64` input with an independently checked exact `callback_verification_sha`, avoiding the impossible act of committing a postpublication receipt into its own attested SHA. It still checks public exact head, persistent original, webhook 8-second admission, signed secret, published runtime/DB binding and scientific guards.
6. Fresh independent AeroDataBox provider account balance and **zero active billable** subscriptions; protected floor and <=500 authorization confirmed, no unexplained pending subscription or accounting. Source original 30 retained while their expiry approaches 2026-10-16 UTC.
7. At launch time run **actual GitHub paid owner preflight** `scripts/v39_phase2g_stage1_paid_preflight_v39.ts` under the real GitHub workflow and its approved environment. Must report precisely `PASS_READY_FOR_PAID_STAGE1`. If any source, budget, timestamp, host, storage, webhook, DB, incident, science, scope, ledger, authorization or provider check fails: **NO PAID SUBSCRIPTION**.
8. Only a user-confirmed one-time paid AUTH specific to tomorrow permits the reviewed owner to start (not a direct provider POST or manual script). Supervise 120min, no automatic rerun; settle and reconcile all external billed credits to internal retained sources, and fail/censor scientifically when evidence is insufficient.

## No misleading GO claims

As written, PR35 is **DRAFT and unmerged**, existing Replit publish still tracks the **October 11** source, the old budget is **not quarantined**, the new source-bound paid runtime/Auth and ledger have **not been committed or approved**, and tomorrow's external-provider status is unknown. Green offline tests alone do not demonstrate future hosted continuity. No hidden environment/auth bypass, guessed spend, or unapproved direct paid AeroDataBox operation is part of this plan.

Approval and provider mutation must be a separate, explicit prospective action after all of the above; this handoff grants neither.
