# Gate 4 — final genuine Alert trial decision and second receiver plan

**Date:** 2026-10-23 Pacific / 2026-10-24 UTC. **Project:** HKcode22/ReplitTranvr V3.9 Phase3 Gate4.

## Verified current status

1. Prior first 5-minute WSSS live Alert trial got genuine positive subscription CREATE ID, exact independent protected GitHub STOP, and three strict post-STOP 2037-credit/0-active historical snapshots. **No genuine attributed ordinary Alert original was received**; the single preserved V0071 original is synthetic from the previous zero-provider commissioning. This is safety lifecycle PASS and paid Alert delivery INCONCLUSIVE; NOT a lost notification rate.
2. Owner executed old writer retirement, printed `GATE4_WRITER_DISABLED_AND_GRANTS_REVOKED`; independent Replit READ ONLY inventory verified V0072 old binding=1, other=0; V0071 old original=1, other=0; old writer LOGIN off; exactly one `gate4_safety_select_v39` RLS policy; additional detailed PG-side diagnostic `GATE4_POLICY_DIAGNOSTIC_PASS` all eight checks. Previous ad-hoc JS `roles` Array expectation was a false HOLD; `pg_policies.roles` appeared as JS_STRING.
3. PR #116 pure writer RLS planner correction merged at `0ec6bfe6afadf0a1d982ff14259599fa12aac528`; PR #117 second owner writer **source-sealed** and disposable PostgreSQL16 tested, merged at `648900323bca9f85597150d6f6bfde1688b908ad` after all five PR checks passed. `GATE4_SECOND_WRITER_PRODUCTION_APPLY_RELEASED_V39=false` and no production role was created. GitHub main differs from the previously verified published Replit receiver `d2265a1ee8ed4428f7aef97aa084c9aeb7e8aaf5`; do not assume parity or republish just because source has advanced.

## This review-only change: narrow original V0071 receiver, no provider

The actual existing deployed receiver already supports a single ENV-pinned ordinary Alert scope (compiled source SHA, independent UUID/AUTH, WSSS ICAO, constant-time bearer-secret comparison, raw original write + post-commit readback). It must load a *fresh* reviewed scope before a second experiment, while preserving the previously known-good prepaid callback. **The old Replit runtime will NOT accept a new scope solely because GitHub safety environment variables changed.**

The old receiver login `gate4_receiver_20261022` had SELECT+INSERT privileges on V0071, no per-scope RLS before this preparation. Proposed new review-only `gate4SecondReceiverRlsPlan_v39.ts` builds an additive **two-role** V0071 policy:
- Existing old receiver gets SELECT+INSERT only for the historical UUID, preserving its old original and old published route; no UPDATE, DELETE, or owner-binding access.
- Distinct new receiver gets SELECT+INSERT only for NEW UUID, exact authorization SHA, exact COMPILED published receiver source SHA, WSSS airport; no access to the historical old row, historical role, or V0072 owner-binding table.
- One atomic reviewed owner transaction would create new temporary restricted receiver credential, apply new-role GRANTs + all four RLS policies, and ENABLE RLS on original V0071 table, followed by exact old/new isolation/retention readbacks, under explicit future production approval. The planner itself has no network/DDL.
- Old source `d226... ` is an **older known observation**, not independently verified currently serving host source; do not reuse as live pin without a fresh public GET. No replayed historical scope, webhook, signing key, positive ID, or paid permit.
- An exact disposable-PG16 suite `phase3_gate4_second_receiver_rls_real_pg_v39.test.ts` tests old/new scoped INSERT/SELECT denial, unauthorized AUTH/source, historical bytes and digest retention, and no UPDATE/DELETE; workflow `.github/workflows/phase3-gate4-owned-handoff-ci.yml` runs it in a separate disposable database and with empty provider/production DB credentials. **Check exact commit CI before claiming PASS.**

## Proposed finite paid trial — NOT authorized yet

Source [AeroDataBox 2026 official credit-based billing](https://aerodatabox.com/flight-alert-api-2026/): credit-based CREATE free; notification SEND attempts debit credit balance **per flight item** (not necessarily one credit per entire webhook POST), even when delivery fails. Retries add costs; `maxDeliveryRetries=0` proposed. For WSSS airport Alert, one batch can consume more than ~5 credits between periodic watches. The five-credit watchdog is a **soft stop** not hard budget or provider-enforced spend cap.

- **Subject:** one WSSS `FlightByAirportIcao` credit-based subscription, zero provider retries.
- **Time:** prospective up-to-20-minute candidate only, NOT yet an approved actual UTC start or STOP. Prefer a feed-covered time. Review free GET /health/services/airports/WSSS/feeds and balance/LIST with a separately approved operator; old credits=2037 is historical and **not a current balance**.
- **Financial controls:** freshly observed provider credit balance and zero foreign billables, owner-selected protected reserve, short independently STOPPED interval, independent exact-owned-ID DELETE, optional early STOP on receipt, automated soft approx-5-credit threshold. Explicitly accept burst overshoot risk before exposure; do not promise cap.
- **Safety:** current published Replit SHA, receiver source/secret/scope exact, preserved prepaid route, no unreviewed Replit publish, original-byte post-COMMIT readback, one positive immutable provider ID binding in V0072 using new temporary writer, separate protected GitHub STOP ARMED before CREATE. Revoke new writer and receiver when appropriate *after* evidence custody/reconciliation, not beforehand.
- **Evidence for scientific Gate4 qualified PASS:** real prospective paid-window V0071 original binary with correct SHA and sender claimed ID that independently matches positive provider CREATE V0072 owned binding, correct source/UUID/AUTH/WSSS, acknowledged post-COMMIT, account SEND cost/credit snapshots reconciled and independent STOP/zero active+3 stable samples. A single observed valid callback demonstrates **feasibility only**; cannot claim production reliability percentages from this limited sample.
- **If no provider SEND/credited attempt and no callback:** INCONCLUSIVE rather than software fault or PASS. If credit SEND but no matching original, delivery-gap investigation HOLD. No automatic retry subscription.

## Exact next steps and explicit approval boundaries

1. Finish no-provider receiver planner CI including PG16 denial fixtures; review and merge only if green. If actual deployed code already supports the fresh scope, prefer minimal reviewed configuration/rollback over gratuitous code republish.
2. Separately review **source-sealed** production owner transaction for new V0071 receiver role/RLS and new V0072 writer, startup credentials kept outside GitHub/logs. Validate future transaction atomicity, trust boundary, source pins and rollback. Explicit owner approval required **before** any production GRANT/ALTER ROLE/RLS or config/republish.
3. Prepare new immutable AUTH ledger, new UUID, exact published receiver binary SHA and callback secret, prospective UTC window and fresh provider balance/coverage; publish/activate only when authorized. Require independent protected GitHub STOP actually ARMED and exact positive-ID signer/custody verified before new CREATE. Distinct final **paid subscription GO** required.
4. Carry out exactly one bounded prospective paid Alert trial only after the owner approves risk and all safety gates are green. Record evidence in central [issue #38](https://github.com/HKcode22/ReplitTranvr/issues/38) and a dated code SHA checkpoint. Close Gate4 qualified if actual evidence meets criteria; Phase4 held otherwise.

**Never rerun** historical `v39_gate4_single_live_create_operator_v39.ts --execute-one`, historical writer `--apply`, spent GH STOP, or expired signed old AUTH. **No provider GET, CREATE, DELETE, credit refill, deployment, live DDL or billable exposure occurred in this review branch.**
