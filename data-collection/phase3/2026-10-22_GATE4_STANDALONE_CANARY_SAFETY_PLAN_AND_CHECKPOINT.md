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
