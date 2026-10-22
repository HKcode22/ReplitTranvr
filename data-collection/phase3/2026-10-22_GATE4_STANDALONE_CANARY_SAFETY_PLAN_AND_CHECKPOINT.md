# Phase 3 Gate4 — isolated live-canary readiness foundation (2026-10-22)

**Status: draft / no paid authorization / no live canary.** Active goal: a dedicated small, bounded Gate4 Alert subscription trial, NOT a restart of Phase2/YSSY or the frozen Phase6 1900-credit collector. Owner's approved qualified Phase2 early-pilot closeout remains in force. Previous broad language treating the accepted qualified YSSY research as an overall scientific failure was corrected in issue #38.

Source baseline [Gate4 PR #95](https://github.com/HKcode22/ReplitTranvr/pull/95) at `acbeaa6282b71452457c6496a6c7c1533deb6a04`: four no-provider workflows SUCCESS including 1813 tests PASS/19 skipped, real disposable PG admission contention PASS and actual V3.9 CREATE/DELETE/strict-inventory hardening. Main `ffb5c142e51ab8bb3d9ce7ca944ccc1216a73814` unchanged.

## New scope-locked standalone safeguards

`server/lib/disruption/gate4StandaloneSafety_v39.ts` implements:
- Pure **dedicated small-canary account foundation**: exactly three equal strict provider balance readings, validated provider quota, zero active CreditBased subscriptions, zero active Phase6 batches, configured canary cap 1–100 credits, separately declared >0 unsettled SEND burst reserve and protected floor >=1000 credits. Requires balance - (planned cap + reserved potential overrun) >= floor. This conservatively checks planning headroom, and explicitly declares `actualProviderHardCapCertified:false`, `paidAuthorization:false`, `liveGate4Certified:false`. It does not claim billing can be physically capped by a client poller.
- Injectable independent **exact-known-subscription-ID STOP policy**: strict LIST before and after, subject type+ICAO matching, no other foreign active CreditBased subscriptions, invoke only `deleteExactVerified(id)` and check zero active afterward; source-level result is `DELETE_VERIFIED_PENDING_SETTLEMENT`, never a settled Gate4 certificate. Unknown provider CREATE response / no owned ID is `HOLD_UNCONFIRMED`, **never auto-delete based solely on airport or creation timestamp**; this demands a separate human-reviewed orphan/owner rescue.
- Negative synthetic no-provider tests include balance drift/low floor, missing burst, active foreign subscription, unknown ID, wrong subject, failed DELETE, strict LIST outage and post-delete still active. These prove policy logic only; independent physical watchdog process and separately approved paid scope still must be wired.

## Required next steps before live Gate4
1. Verify exact-source TypeScript and no-provider CI at new PR95 revision.
2. Add and execute a **read-only Gate4-specific** owner checking *real published host* source parity, strict account balance x3, strict LIST, source/billing floors, and exact receipt/published callback route. This is not a paid CREATE.
3. Engineer independent **outside-controller** STOP supervisor with persisted owned subscription ID, manual exact-owner rescue for ambiguous CREATE response, fail-closed timeouts and billing gap; do not rely on only `setInterval` watchdog.
4. Freeze one short Gate4 trial window, conservative credit plan and separate exact human AUTH, with explicit possible SEND after STOP warning; no provider-enforced cap has been demonstrated.
5. Following distinct signed paid approval: one real small subscription, independent DELETE readback, ≥3 stable post-STOP balances, internal received/SEND discrepancy, confirmed second-start refusal if prior unsettled, durable incident receipt. Only these together can certify live Gate4. Gate3 and Gate05 remain separately assessed for Phase3 overall.

No Replit AI Agent, Cloudflare, Phase2 administrative work, SQL writes, billable provider mutations, or Phase6 collection authorized by this draft.

## P0 STOP safety correction before certification

An independently discovered foreign billable subscription must not PREVENT attempted DELETE of the *already positively owned exact ID*. The source was revised so the STOP helper still calls the exact `deleteExactVerified(ownedId)` if the owned ID and subject match, even when another active billable subscription appears. It NEVER deletes an unrelated ID; the terminal all-account-clear remains a `HOLD_UNCONFIRMED` if that foreign resource persists. A new no-provider negative test checks exact owned DELETE under foreign coexistence. This prevents an over-conservative ownership guard from prolonging a known billable exposure. No live subscription has been created or deleted; tests are pending at the new commit.

## 2026-10-22 02:34 PDT — Owner read-only real preflight HOLD, cause suppressed by v1

Owner ran exact pinned Gate4-only `GATE4_ISOLATED_READONLY` Shell procedure using HEAD `664d9f64a0c293362659cf9b61d53db5d9d3d288`, expected published `f5b1347b7b9aebd6830302394ea2cc5775aedbf4`, proposed cap20 and extra reserve10. The CLI emitted only `{"schema":"v39.gate4.isolated-preflight.v1","status":"HOLD_READONLY_FOUNDATION_FAILED","gate4LivePassed":false,"paidAuthorization":false,"alertCreateRequests":0,"databaseWrites":0}`. No later success banner or billed CREATE appeared. The source catch suppressed the root stage and error, so **do not attribute the HOLD to the host, provider or database without evidence**; no reason for override, no repeat of identical diagnostic.

Follow-up Gate4-only source patch (proposed) adds whitelisted per-stage report `failedStage` (host verification vs free provider LIST vs strict balance #1/#2/#3 vs DB connect/identity/query vs account policy) and a **redacted, fixed reasonCode** known for host, strict balance and strict inventory errors; unknown exceptions print only `REDACTED_STAGE_FAILURE`. This change must pass CI and owner rerun before asserting readiness. No Phase2/YSSY administrative action authorized. Source still cannot create/delete subscriptions or start Phase6; published prepaid host contract remains only compatibility, not Gate4 callback proof.
