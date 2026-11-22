# Phase 6 Gate 8: post-retention baseline evidence and bounded no-provider continuation

**Review time:** 2026-11-22 UTC, following completed owner/Actions baseline at 12:44Z and fresh relay at 12:49Z.

**Scope:** Gate 8 ONLY. Gates 1–7 remain bounded CLOSED. This is an evidence checkpoint on a side branch, not a production-main change, not paid GO. No SOURCE re-enable, V0108 reinstall, clock job creation, additional gates, flight data, static-policy regeneration or duplicate retention dispatch.

## Immutable release and historical identities

- Target `HKcode22/ReplitTranvr` `main=b432eb9a5bac7bc3c4537249e75ec7df41e8727c`, relay `HKcode22/TravnrClockRelay` `main=c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed`. Main is docs-only successor of `dfa72219...`; no new target runtime code was introduced by this checkpoint.
- Owner already read back **all three** target/relay approved SHA variables at `b432...` with `P6_G8_ALL_THREE_NONPAID_SHA_PINS_READBACK_PASS`. The prior HTTP 502 ambiguity is resolved; no re-pin.
- Historical [full-retention APPLY 45009402199](https://github.com/HKcode22/ReplitTranvr/actions/runs/45009402199) on earlier `fe3fef...` already succeeded. It is intentionally not replayed as development.
- Owner performed once exact-current-main [full-retention APPLY 45023781129](https://github.com/HKcode22/ReplitTranvr/actions/runs/45023781129), first attempt `workflow_dispatch`, head `b432...`, 12:43:46–12:44:18Z, exact two jobs success: `primary-fids-expiry` / 137212233429 and `phase7-expiry` / 137212233154. **Close this Gate 8 subitem permanently unless a substantive later failure is observed.** Primary FIDS logged `PRIMARY_FIDS_ELIGIBLE_AT_READBACK_CLEARED`, zero originals, due, STOP and writes; private `PRIVATE_EXPIRY_DUE_AT_READBACK_CLEARED` zero packets/indexes and no writes; P7 `P7_EXPIRY_DUE_ONLY_INDEPENDENT_READBACK` zero objects/deletions; both providerCalls=0. Not a future source-bearing or PITR deletion SLA.
- Existing SOURCE enabled at historically reviewed `795ace...` via owner DB readback and V0108 existing functions installed, prior no-provider validation run 45012576758 PASS. Existing 31-day scientific plan/6,144 requests/36,740 reserved units/1,280 daily peak/1,900 daily budget ceiling/1,000 protective floor, Monday 2026-11-23T23:45:00Z first SOURCE, 23:10Z paid authorization cutoff and 22:15Z T−90 prearm. **Do not alter.**
- Existing external cron jobs 8890475 (primary) and 8890476 (rolling) and lease renewal have already been commissioned; no create/renew now. The relay must not be called provider or POST execution evidence merely because its Actions workflow is green.

## New independent post-baseline relay readback

[Relay PRIMARY_BACKSTOP 45024250372](https://github.com/HKcode22/TravnrClockRelay/actions/runs/45024250372), created 12:49:15Z, job 137213663913, code `c5a876...`, saw `TRAVNR_APPROVED_TARGET_MAIN_SHA=b432...` and `TRAVNR_RELAY_FULL_RETENTION_APPROVED=1`. Its final machine receipt was **`DEFER_RECENT_PRIMARY_STEP_NOT_DELETION_PROOF`** with `paidAuthorityGranted=false`, provider/db calls=0. The relay code checks current-head primary/P7 APPLY job identities and suppresses a repeat if both finished within ten minutes. This newer defer replaces the pre-baseline `DEFER_NO_CURRENT_MAIN_FULL_RETENTION_APPLY_BASELINE_REVIEW` finding, and is **expected cooldown**, not a fresh deployment blocker. It dispatched no target job, so do **not** describe it as a target ACK. Future PRIMARY_BACKSTOP pulse after the ten-minute window remains to be observed before claiming active expiry forwarding; even then, only an acknowledged run with an independently successful target receipt counts.

## Read-only rolling-lane probe: prepared, not executed

Latest rolling run [45024170708](https://github.com/HKcode22/TravnrClockRelay/actions/runs/45024170708) was created 12:48Z before owner action. Existing relay settings (observed in runs) are `TRAVNR_RELAY_ROLLING_ROUTE=DIRECT_VERIFY`, `TRAVNR_RELAY_DIRECT_TICK_APPROVED=0`, `TRAVNR_RELAY_ROLLING_SINCE_UTC=2026-11-22T04:22:29.221Z`; the read-only trial has a **strict 120-minute window**, so its recent green runs do **not** forward to the target.

Prepared owner hash-pinned helper [`p6_gate8_one_use_readonly_relay_target_ack_current_main_no_paid_go.sh`](p6_gate8_one_use_readonly_relay_target_ack_current_main_no_paid_go.sh). Its only configuration write is advancing the already-existing relay `TRAVNR_RELAY_ROLLING_SINCE_UTC` to exact current UTC for **one** new two-hour DIRECT_VERIFY trial, *provided* it first checks both main SHAs, current relay mode/route/forward-readiness, `TRAVNR_RELAY_DIRECT_TICK_APPROVED=0`, target `P6_ROLLING_DIRECT_RECOVERY_ENABLED!=1`, existing clock failures absent and unchanged original since. Then it dispatches one external `ROLLING_ROOT` (not collection); verifies actual `TARGET_ACK_AND_RUN_IDENTITY_VERIFIED_NOT_COLLECTION_PROOF` with target run ID; independently checks the target `P6 DIRECT RECOVERY VERIFY` first-attempt job and exact no-post, no-provider, no-DB step succeeded. Any ambiguous mutation, dispatch, unknown ack or failed job causes HOLD and **no blind replay**. This scope is explicitly separate from and **does not commission** prospective paid `DURABLE_ROOT` Monday route, policyFrom/policyUntil or any paid status. **Not executed by ChatGPT.**

The existing source [relay.mjs](https://github.com/HKcode22/TravnrClockRelay/blob/main/relay.mjs) proves `DIRECT_VERIFY` has no paid authority; target [phase6-direct-recovery-tick.yml](https://github.com/HKcode22/ReplitTranvr/blob/main/.github/workflows/phase6-direct-recovery-tick.yml) has all provider and DB credentials empty in `direct-readonly-verify`. The separately protected paid recovery job is skipped under the explicitly required target variable admission.

## Protected POST: exact unresolved reason, no unnecessary replays

Latest relevant POST actor test [45018088701](https://github.com/HKcode22/ReplitTranvr/actions/runs/45018088701), exact older `dfa722...`, had admission PASS, then independently protected reviewer failed with `HOLD_P7_POST_ACTOR_PREFLIGHT_REDACTED_NO_REPLAY`; publisher/storage skipped. Earlier [44991445919](https://github.com/HKcode22/ReplitTranvr/actions/runs/44991445919) on `fe3f...` passed all three actors. Source code enforces embedded `reviewedCodeSha==GITHUB_SHA` in both stable trust and native POST policy, and preservation-policy `nativePostPolicySha256` equality; merely pinning outer `V39_P5_POST_APPROVED_CODE_SHA` is insufficient. The previous owner rebind blob `88f9fc6c...` **stopped before writing** because the historical `auth.json` was missing; owner subsequent file inventory found no local originals. GitHub secret names exist but values are write-only; do not invent, exfiltrate, reveal or regenerate signed 31-value records. The 31-value prior static digest was historically `7e07047d7173cbcf84e966ab869d66477efef36df38c83c58325396f31b83728`. Earlier checkpoint already proposes a new reviewed protected Actions in-memory digest-only validation, but that is **a proposal**, not a completed preflight; merging a new workflow into main would advance exact SHA and require deliberate release pin reconciliation, so no speculative main churn today.

No proof of a current-main protected reviewer/publisher/storage PASS exists at this checkpoint; **do not falsely close Gate 8 or dispatch duplicate doomed actor preflights**. Need a provenance-preserving, owner-authorized protected-policy successor verification/repair in a strictly no-provider runner, then one successful exact-main actor-only preflight, and a prospective Monday rolling route/STOP/account/rights/current quota check before distinct paid GO.

## Snapshot register

| Scope | State | Evidence / no-repeat rule |
| --- | --- | --- |
| Gate 1–7 | bounded CLOSED | Existing scientific/DB/CI/cron proof, no reopening |
| Gate 8, SOURCE enabled | COMPLETE | Original immutable source auth; no replay |
| Gate 8, three nonpaid SHA repins | COMPLETE | Owner exact remote readback all three PASS, do not run `b29e4ddf...` again |
| Gate 8, current-main full-retention APPLY | COMPLETE | Run 45023781129 both jobs first-attempt PASS; do not dispatch again |
| Gate 8, recent primary relay cooldown | EXPECTED/OBSERVED | Run 45024250372 deferred after finding new baseline; no forced duplicate |
| Gate 8, rolling read-only target ACK | NOT YET VERIFIED | One-shot direct verify helper prepared, not executed |
| Gate 8, prospective Monday rolling active window | NOT COMMISSIONED | Existing DIRECT_VERIFY expired; future approved policy scope needed |
| Gate 8, protected exact-main POST actors | HOLD | Existing older success + latest current-line failure; protected policy provenance unresolved |
| Gate 8, fresh paid STOP, quota, signed rights & owner GO | HOLD | Paid GO=false; no fresh live provider/authorization receipt claimed |

**No main merge, provider call, cron creation, DB migration, secret editing, paid flag change or paid target dispatch was executed in this checkpoint.**
