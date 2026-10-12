# Recovery checkpoint — Monday 2026-10-12 PDT — YSSY P25 and Phase 2G scope correction

**Snapshot:** GitHub-connected readback in ChatGPT on 2026-10-12, no Replit Shell/runtime observation in this session. Historical and current facts are carefully separated. **Paid launch NOT authorized.**

## Exact repository, release, science

- Repo: https://github.com/HKcode22/ReplitTranvr.
- YSSY integrated *candidate*: draft open/unmerged [PR #35](https://github.com/HKcode22/ReplitTranvr/pull/35), branch `phase2g-p25-20261012-integrated-release-review`, HEAD `66e9bce772918ceca470bae0e3c9e13f6e8d0af6`. Current deployment is NOT this release (old reported published 9c8ab...); need independent fresh actual Replit publication witness.
- Final-head GitHub Actions completed SUCCESS for **all four**: V3.9 Offline Safety run 38201573601; P25 Public Receiver Identity (read-only) 38201573594; P25 Real PG Receiver Faults 38201573630; P25 Focused Release No Provider 38201573610.
- Intended one new Stage1 YSSY: Mon Oct12 20:00–22:00 PDT / Tue Oct13 03:00–05:00 UTC; budget `P2G-S1-20261013-03`, candidate `AUTH-20261013-P2G25`, 450 reserved + 50 unsettled = max500 Alert credits, protected floor1000, provider retries 0, no automatic rerun.
- PR35 committed candidate `artifacts/phase2g-gate2-runtime-P2G-S1-20261013-03.json` SHA256 `101c9ab8ade5978194fc22c4e2f64660ee74dbe5d0b8efcfab87b798e4df333f` and `SEPmd/V3.9_PHASE2G_AUTH_20261013_P2G25.json` SHA256 `4a27a43d26fa2e257ea5ddf92afb2d05efe7213c07c0ec3def41ac4da8ab10e0`. Both **draft/unapproved**. Frozen P25 science decision SHA `4ac004e0150a3816e272cbec37907e598bb0605870c65a63477e526e2ba81c61`, protocol amendment SHA `b54256346a35354d71e46e18a44d175056cba3228d93313d0036cc08af2f4f94`.
- Old YSSY P2G24: probe18 `failed,censored,UNRESOLVED`; old budget `P2G-S1-20261009-23` **last reported OPEN**, external/internal credit totals NULL, original 30/30 source objects previously verified, incident30 administratively contained (not original runtime cleanup proven). Last pasted Bash erroneously included `~/workspace$` prompt and `remote:` output lines; **no successful --apply result was provided**. Do not assume mutation took place.
- Original WSSS P2G06 220 vs 219; separately P2G22 260 vs 259. Do not confuse with P2G24 unknown spend or silently relabel old science.
- The Oct11 test handoff `SEPmd/phase2g/reports/2026-10-11_P25_120MIN_REAL_WALLCLOCK_REHEARSAL_HANDOFF.md` gives actual PR27 120min local synthetic, 120 attempted notifications and 2×3min interruptions. It was **not run** here. Local-only PASS is not proof of published Replit ingress.
- Original investigation draft [PR27](https://github.com/HKcode22/ReplitTranvr/pull/27), incident [#28](https://github.com/HKcode22/ReplitTranvr/issues/28); root cause of Oct9 published Replit receiver loss still unknown. P01–P20 matrix in PR35 is the current action triage. Replit ticket #564568 remains historical pending without a newly verified answer.

## Current verified safeguards and blockers — today's minimal path

1. **DONE:** all four final-head PR35 workflows green. Review critical release diff, source-bound runtime+AUTH hashes; don't merge unrelated PR27 research.
2. **NOT VERIFIED TODAY:** read-only historical budget and current account safety. The quarantine auditing branch `phase2g-p25-postpublish-readonly-audit-20261011` moved **5 commits** from older pinned `469d94be9e5dc51cd45496b39f6d29469c3157eb` to `e553fc03246a77d4643ca7ae67c51d1501ad220d`; compare shows changes to runtime-draft generator, tests, workflow and report but **not** quarantine script. The pinned old script is independently reviewable. Never run a stale `origin/branch == 469d...` check; it now fails legitimately. Use a detached exact reviewed commit with guarded preview instead.
3. **OPEN:** independently informed approval for exact old OPEN→MISMATCH *administrative quarantine*; preserve NULL/unknown totals, failed probe and source bytes. User's message is not proof of typed `QUARANTINE` or completed `--apply`.
4. **OPEN:** approve exact new P25 AUTH SHA in GitHub evidence ledger after verifying full prospective financial scope; no automatic authorization from science conditional freeze.
5. **OPEN:** publish one matched release to Replit callback-only; bind exact true published head and GitHub paid-workflow head, account for any Replit-generated unchanged-tree child; reverify public receiver with a fresh signed nonempty POST, negative secret test, object/SQL custody and cleanup.
6. **OPEN:** fresh balance, zero active billable subscriptions, clean new budget/DB, no pending ambiguous CREATE, protected floor +500 exposure, full genuine `PASS_READY_FOR_PAID_STAGE1` owner preflight, explicit user's final paid approval. Only then start one provider subscription; else NO-GO, don't backdate or repurpose AUTH.

## Deadline discipline (targets, not proof of completion)

| PDT Oct12 | Concrete deliverable | Decision if unfinished |
|---|---|---|
| by 12:00 | P25 release review finished, no new feature scope | Defer non-P0 research/design work |
| by 15:00 | Old budget read-only proof and separately consented quarantine if eligible; AUTH bytes reviewed | HOLD paid if any unresolved billing exposure |
| by 17:00 | Exact matched GitHub/Replit release published and fresh signed callback proof | HOLD rather than publish unverified branch |
| by 19:00 | Fresh zero-billable subscriptions, balance/floor/cap, owner preflight preparation | Escalate only hard blockers, stop optional experiments |
| 19:30 | GO/HOLD decision with explicit evidence and approval request | Do not improvise a shortcut |
| 20:00–22:00 | One real P25 YSSY Stage1 only if all gates PASS and user approves | Otherwise record NO-GO; no auto retry |

All deadlines are **planning targets**, not hardcoded runtime validity rules. Missed milestones do not grant permission to bypass source/payment/identity safeguards. Optional 120min **local** rehearsal may run in parallel in an isolated worktree only if it does not divert critical preparation, and may be marked INCOMPLETE at deadline without fake PASS.

## Different priority queues

- **P0 launch**: safety, authorized spend, paid preflight, code/deploy parity, durable accepted webhook, strict current P25 science version, no active foreign paid owner, historical accounting containment.
- **P1 prospective ML method**: measured missingness/gap tolerance, bias/sensitivity study, future data-quality tiers, evaluation leakage, reference comparability.
- **P2/P3 follow-up**: exact old Replit root-cause attribution, hosted staging 120min, independent edge replay and optional backup, telemetry enhancements, duplicate docs cleanup. Important for future reliability; not retroactive evidence, and not automatically needed to submit one bounded conditional Stage1 under current P25-approved gates.
- Current P25 frozen rule remains strict exact accounting; new tolerance draft is a **different branch** and doesn't rewrite historical trials.

## Next session — instructions for the next assistant

1. Read **this checkpoint**, Plan `SEPmd/V3.9_DataCollectPlan_f.8.md`, Log `SEPmd/V3.9_IMPLEMENTATION_LOG.md`, PR35 matrix, P25 release packaging doc, PR35 current head/checks, PR27/issue28, and the separate prospective science draft before making changes.
2. First compare recorded PR35 head and live state; if changed, read commit diff/CI and regenerate only genuinely stale artifacts. Avoid repeated theoretical full-project audits.
3. Obtain user Shell output from **read-only pinned quarantine preview** or inspect connected live state with authorized read-only access. Don't report administrative mutation without verified result.
4. If eligible, get explicit consent for quarantine and new AUTH as independent decisions; preserve old science.
5. Complete matched deploy/callback/preflight using narrow reviewed workflows with no unnecessary code changes. Track deadline and short blocker list.
6. For prospective policy, don't merge draft while P25 is about to execute; select future-cohort thresholds with empirical simulation and preregister outcome-independent criteria.
7. **MANDATORY END-OF-SESSION CHECKPOINT**: add a dated Markdown file or update the current dated checkpoint with date/time, GitHub refs, CI run IDs/status, verified live observations, exact hashes, work completed, provenance, pending action/owner, no-provider vs provider-mutated flags, and first safe next step. Never store secrets. Link it from relevant issue/PR. Never claim background work was performed.

## Scope and caveat

Checkpoint documents what connector GitHub and previous evidence showed, not proof of user Shell execution, Replit deploy, provider balance or applied quarantine. No provider calls, production DB writes, merge, publication or paid authorization were made in this documentation-only session.

## Later Oct12 connector evidence added before handoff

- Independently compared protected P25 code freeze commit `c0634bfd80fd16d7a48bfa848b7f9df0a65d5d67` to PR35 HEAD `66e9bce772918ceca470bae0e3c9e13f6e8d0af6`: **exactly four commits, and changed paths only two JSON artifacts plus two Markdown reports; no server/scripts/test/workflow/migration change**. This supports continued artifact ancestry/source code integrity, not proof of deployed HEAD.
- Read exact candidate runtime and AUTH JSON from PR35; `sourceGitHead`/`source_git_head` is the protected reviewed code freeze `c0634bfd...`, protected-tree SHA `5eed390ac062a58482ddb5883c0fd8f72e0f0127a3bd46f89f1c9e9ec21ffe9c`, window Oct13 03:00–05:00Z, AUTH expiry 05:25Z. They remain unapproved.
- Reviewed PR35 `probeExecution_v39.ts`: the single historical quarantine exception requires exact old-budget `MISMATCH`, old probe18 failed/censored/UNRESOLVED, old amounts NULL, 30 retained refs, incident30 containment and no unresolved incidents; unrelated MISMATCH blocks. Not a general production gap tolerance.
- Old detached quarantine script `469d94be9e5dc51cd45496b39f6d29469c3157eb` verified with exact GitHub Actions **SUCCESS** [run 38199014273](https://github.com/HKcode22/ReplitTranvr/actions/runs/38199014273). Later quarantine-branch head `e553fc03246a77d4643ca7ae67c51d1501ad220d` advanced five commits, none changed that quarantine script. Pin the exact tested commit when conducting default read-only preview; get separate consent before `--apply`. No Shell result or approval was observed in this session.
- New [draft PR #36](https://github.com/HKcode22/ReplitTranvr/pull/36) stores these checkpoints/prospective study-method proposals without changing current PR35 source.

## 2026-10-12 follow-up: operator preview + research/deadline decision (new current checkpoint)
**Verified from user-supplied Replit Shell output, not merely an old handoff:** detached pinned historic-quarantine script from `469d94be9e5dc51cd45496b39f6d29469c3157eb` ran in READ_ONLY_PREVIEW and returned:
```json
{
 "status":"ELIGIBLE_ONLY_FOR_HISTORICAL_MISMATCH_QUARANTINE",
 "old_budget_day":"P2G-S1-20261009-23",
 "old_budget_state":"OPEN",
 "old_failed_probe_id":18,
 "old_science_status":"failed",
 "old_reconciliation_status":"UNRESOLVED",
 "prepaid_safe_mode":true,
 "conservative_reserved_exposure":500,
 "actual_provider_credit_spend_verified":false,
 "historical_credit_totals_left_null":true,
 "incident30_administratively_contained":true,
 "historical_runtime_cleanup_proven":false,
 "source_references_retained":30,
 "active_billable_subscriptions":0,
 "new_paid_stage1_authorized":false,
 "paid_provider_calls":0,
 "alert_credits_spent":0
}
```
**This proves eligibility only at preview time, not a mutation.** The operator has **not** supplied `--apply` result; old budget is presumed OPEN pending fresh verification. No provider balance amount was observed. Administrative historical quarantine and new paid AUTH require separate informed consent and fresh guards.

**P20:** Operator started `P2G_LOCAL_SYNTHETIC_ONLY=YES` `--full-120m` from detached PR27 worktree HEAD `f4c9b24`; Shell printed `LOG=/tmp/yssy-p20-local.5GpMah/rehearsal.log`. This is a start only. Until complete stdout/result receipt: `LOCAL_REHEARSAL_STATUS=RUNNING_OR_UNKNOWN`, not PASS. It is never hosted Replit/AeroDataBox proof.

**Expanded methodological review committed on documentation-only PR36:** [research assessment of data loss, 3 vs 6+6 retries, Plan f.8 / implementation-log overhead, and realistic phase deadlines](../reports/2026-10-12_PHASE2G_METHODS_RELIABILITY_TOLERANCE_AND_DEADLINE_RESEARCH_REVIEW.md), commit `62acdd5ac133931832cdbb367a5d0e7c0f04e4a2`. Source Plan main blob `3ef1b8730e3148b936fcf02b46d0a091e69f7480`; current implementation log main blob `0a5e4bedfa7c743feaf05ec2dc66f22084f39236`. Confirmed Plan §11.2 permits prospective separately measured production tolerance but existing §20.4 exact acceptance remains authoritative for **current P25**; no change to current source/frozen science. Current Log §23's 59 fields per task and §25's 20/function are candidates for proportional future documentation amendments rather than unilateral bypass today.

**Research assessment:** User's concern about disproportionate insistence on perfection is supported by Google SRE/NIST principles and actual Plan built-in stop/scoping clauses; small measured item-credit delivery gaps do **not** guarantee unbiased missing flight observations or official anchor scores. Treat P2G06 1/220 and P2G22 1/260 as recorded item-credit gaps, NOT measured missing distinct flights; P2G24 historic cost remains UNKNOWN. Keep 6+6 15s **local health** retries separate from zero **provider delivery** retries, bounded by whole-run two episodes/180s; health recovery alone not proof of notifications. For *future* cohorts, pursue A/B/C/D data classes, a one-pass sensitivity audit, concise change receipts for minor work, and evidence-based deadlines—no arbitrary 0.5%/1% cutoff adopted now.

**Latest actual work performed here:** GitHub documentation commit only, read-only GitHub / public research. No GitHub release merge, live DB mutation, provider action, Replit deploy, financial approval or paid GO. The substantive completion this turn is saving the review and handing off a decision-ready next path.

**Next paid path unchanged:** (1) explicit historical quarantine consent and separate `--apply` + fresh verification; (2) exact P25 new AUTH bytes and approved financial ledger; (3) PR35 reviewed/matched Replit publish and freshly signed public POST custody; (4) fresh account cap/floor/zero billable sub verification; (5) actual `PASS_READY_FOR_PAID_STAGE1` and separate paid GO; otherwise HOLD. The proposed methods relaxation is not a route around this launch's authorized guards.
