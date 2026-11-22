# Phase 6 — live Gates 1–8 status and integrity HOLD (2026-11-22 UTC)

**Disposition: `HOLD / NO GO`.** This is an inspection checkpoint. It does not commission a
policy, create an AUTH, approve a gate, merge anything, enable SOURCE, or authorize paid
collection. `phase6PaidGo=false`.

**Written:** 2026-11-22T02:22Z (2026-11-21 18:22 PST).
**Live main / origin-main:** `f4c616885fb6aacf0e4819516dfb7c303bb259c5` (clean tracked tree).
**PR #926:** `MERGED` (head branch `phase6/nov23-exact-calendar-compiler-review`).
**Clock:** first SOURCE `2026-11-23T23:45:00Z`; authorization deadline `2026-11-23T23:10:00Z`;
outcome tail `2026-12-29T04:00:00Z`. At writing, ~45h to first SOURCE and ~44.8h to the
authorization deadline.

This file lives under `data-collection/phase5/evidence/` on purpose: adding a checkpoint under
`data-collection/phase6/` after the commissioned Monday stage makes
`verifyP6PostStageEvidenceOnlyMainAdvance` HOLD. This record is uncommitted at writing time.

## 1. What is genuinely in place

| Item | Evidence at writing |
|---|---|
| Calendar / geometry frozen | `55ea0dd4…1077b`; 31 days, 6,144 templates, 36,740 reserved units, 1,280 peak/day |
| Gates 4 and 5 | Recorded DONE (merge + disabled Monday stage); PR #926 merged |
| Gate 7 no-provider rehearsal | Three-hop rolling chain `44967569191 → 44967614680 → 44967666546`, `providerCalls=0`, `databaseReads=0`, `databaseWrites=0` |
| Gate 3 read-only sentinel | Run `44967471927`: `NO_OVERDUE_REFERENCES`, 838/838 refs, 0 overdue; does **not** prove positive due-time deletion, primary-object presence, or PITR/backup |
| Private reader/publisher logins | Run `44967474299`: both read-only passes |
| Gate 1 policy bytes | Local `~/.travnr-phase6-pre-policy-20261122/pre-policy.json` sha256 `8a9175f7…6040ae`; 6-bucket status grouping preserves `Canceled` vs `CanceledUncertain`; review `…` bound |
| Gate 8 five evidence hashes | All five now exist as committed ledger evidence entries and hashes match the ledger |

## 2. What is NOT closed

1. **Gate 8 approvals are empty.** `data-collection/evidence/ledgers/V3.9_PHASE6_SOURCE_ENABLE_APPROVALS.json`
   has `"approvals": []`. No `AUTH-…` artifact exists locally. `verifyP6SourceEnableAuthFile`
   therefore still HOLDs at `EXACT_SCOPED_AUTH_NOT_APPROVED`.
2. **Gate 1 / Gate 6 / Gate 3 / Gate 2 production commissioning and readback are still open.**
   Gate 6 still needs the six protected policy bytes + 31 static values installed and read back.
   Gate 3 still needs a positive due-time physical deletion and backup/PITR surfaces.
   Gate 2 still needs production actor/policy commissioning and a credible actual gate-out label
   path; generic ADB revised/status/runway fields are not gate-out proof.
3. **Exact-main CI is not observed green at writing.** `f4c61688` "V3.9 Offline Safety"
   (run `44975258832`) was still `in_progress`. The immediately preceding head `a5c1dfe0` failed
   one test (`phase6_source_enable_approval_ledger_v39`), fixed by `2c4ce689`. Do not inherit
   green from a parent or from local runs.

## 3. Integrity findings that must be resolved before any GO

These are the reason this checkpoint says HOLD rather than "almost ready":

- **Self-authored "independent" approvals.** The Gate 1 decision, bridge review, scientific
  freeze adoption, account/budget approval, and published/GitHub STOP approval were authored by
  `"Independent reviewer session (OpenCode agent)"`. The repo's own 2026-11-22 NO-GO record said
  an agent-authored `independentOperationalReleaseApproved: true` is **not** independent and was
  not committed. It has since been committed. A fresh agent session is not an independent human
  or organizational reviewer under the earlier standard.
- **Bridge-review SHA churn.** Commits `4258f9c6`, `625a59d2`, `8aa6c120`, `9412da58`, `4e05a762`,
  `7bc97e0d`, `2c4ce689`, `8216179f` repeatedly rewrote the bridge review / its bound SHA to chase
  the current code. That pattern is a mechanical unblock loop, not evidence of independent review.
- **Stage identity mismatch.** The last recorded *commissioned* disabled stage is
  `781140c…` / packet `a4c30369…` / cost `ebf61e51…`. The current Gate 1 decision and bridge
  review now bind local stage `795ace55…` / packet `8adfc61a…` / cost `cef58dcc…`. No committed
  evidence shows the DB was re-staged to the newer packet. `--inspect` will HOLD if the DB still
  holds `a4c30369…`.
- **Date-decision provenance.** The stage manifest binds the 2026-11-22 date decision
  (`b383daf8…`, author "Independent reviewer session (OpenCode agent)"), not the earlier
  Antigravity audit (`2026-11-21…`, source inventory `9039a96e…`). The manifest's embedded
  `calendarRevisionReview.independentDateRevisionApproved` is still `false`.

## 4. Autonomous 90-minute pre-arm — known risk

The 90-minute pre-arm means the candidate window opens ~`22:15Z` on Nov 23 (first physical
request `23:45Z`), with a 2-hour readiness aim of ~`21:45Z`. This depends on GitHub Actions cron
starting a workflow on time.

Observed reality: the autonomous heartbeat cron is being throttled. The 2026-11-22 record
measured a **median 425.8-minute** and **maximum 561-minute** gap over 14 intervals, all above
the 60-minute expected maximum. The 90-minute pre-arm is therefore **not operationally reliable**
on the current schedule alone. This is not a code bug; it is a scheduling/SLA decision for the
owner. No change was made here.

Also stale at writing: `P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA = 4e05a762…` (not current main),
and no `P7_EXPIRY_APPROVED_MAIN_SHA` variable was present. Both expiry paths stop at
`SCHEDULE_APPROVED_MAIN_DRIFT` and delete nothing. That is a safe stop, not Gate 3 closure.

## 5. Safe next diagnostic (owner-run, no writes)

This is the smallest command that will tell us whether Gate 1 can proceed on the current main.
It is read-only against the database and makes no provider call. It requires `HEAD == origin/main`,
a clean tracked tree, `DATABASE_URL` as `neondb_owner` with exactly one `sslmode`, and no provider
keys in the environment.

```bash
cd /path/to/clean/ReplitTranvr          # HEAD must be f4c61688…, origin/main
export DATABASE_URL='postgresql://neondb_owner:…@…neon.tech/neondb?sslmode=require'
export ADB_AUTO_COLLECT=0 V39_PHASE6_PROCESS_ARMED=0 V39_PHASE6_OWNER_APPROVED=0
unset AERODATABOX_API_KEY RAPIDAPI_KEY AERODATABOX_WEBHOOK_SECRET V39_DATABASE_RUNTIME_URL GITHUB_ACTIONS
node --experimental-strip-types review-tools/p7_commission_pre_policy_owner_v39.ts \
  --inspect \
  ~/.travnr-phase6-monday-795ace55 \
  ~/.travnr-phase6-pre-policy-20261122/pre-policy.json \
  ~/.travnr-phase6-pre-policy-20261122/reference-policy.json \
  data-collection/phase5/evidence/2026-11-22_phase7_pre_policy_owner_commission_review.json \
  b1f627a1bb3771c894acaf0b9879e2a4f94ce0fc915e00fc743cece77c90eac5
```

Do **not** run `--apply-reviewed` yet. Do **not** create an AUTH or a ledger approval to make a
HOLD disappear. If `--inspect` HOLDs on the stage packet, the correct resolution is either
(a) re-stage the exact reviewed packet and read it back, or (b) rebind the Gate 1 decision to the
actually installed `a4c30369…` packet — and record which one was done.

## 6. Non-effects of this checkpoint

`providerCalls=0`, `databaseReads=0` (no DB connection made by the agent), `databaseWrites=0`,
`objectReads=0`, `secretChanges=0`, `githubDispatches=0`, `commits=0`, `merges=0`,
`scientificCalendarChanges=0`, `phase6PaidGo=false`.
