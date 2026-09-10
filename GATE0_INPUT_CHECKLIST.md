# Gate 0 — Exact Inputs Needed (Phase 1)

Status: **Phase 0 is closed. Phase 1 / Gate 0 is active, but Gate 0 is NOT PASS yet.**

## 0. Current provider-plan correction (2026-09-09)

AeroDataBox changed marketplace plans in September 2026. For a **new/re-subscribed RapidAPI Ultra** subscription, use **50,000 API units/month as the planning baseline**. Do not treat the old 60,000-unit Ultra quota as a permanent project constant.

Provider rule: marketplace pricing/quota/rate-limit changes are grandfathered for existing subscriptions but the new plan version applies when the account re-subscribes. Therefore:

- a legacy/personal key that still reports 60,000 may be valid evidence only for that exact legacy subscription;
- it is **not evidence for the team application** if the team application has no active AeroDataBox subscription;
- if the team must subscribe/re-subscribe now, budget against the current Ultra offer and then freeze the exact entitlement returned by that team subscription;
- Gate 0 accepts any positive entitlement only when it is explicitly verified for the active account/plan/cycle. It never silently substitutes 50,000 or 60,000.

The project constant `MAX_DESIGN_CEILING=57,900` remains only an absolute Alert-credit upper bound. The actual Phase-6 Alert ceiling may be much lower and is derived from the verified two-ledger Gate-0 arithmetic.

## 1. What the current evidence already establishes

The previously supplied terminal evidence provisionally establishes for the **key that was used**:

- RapidAPI gateway/authentication works;
- `GET /subscriptions/balance` works and returned a non-expiring Alert-credit balance;
- `GET /subscriptions/webhook` returned no active Flight Alert subscriptions;
- the legacy key exposed a 60,000-unit quota header at that time.

These facts do **not** prove that the team application currently has an AeroDataBox paid plan. A RapidAPI page that says “Choose This Plan” for the team app is evidence that the team app should be treated as unsubscribed until RapidAPI confirms otherwise.

`GET /subscriptions` is not a valid AeroDataBox endpoint. Use `GET /subscriptions/webhook` for Flight Alert inventory.

A measured `FIDS Units per Request: 0` is not accepted. Current AeroDataBox/RapidAPI documentation classifies FIDS as Tier 2, so the planning value is **2 API units/request** unless an authoritative call-specific billing header/account contract proves a different current cost.

## 2. Do not infer the billing cycle from a stale/reset header

The earlier cycle dates are not frozen evidence because different captured `x-ratelimit-api-units-reset` values were inconsistent. Gate 0 must capture, in one request/response evidence record, the entitlement, remaining units, reset value, request timestamp, and dashboard subscription/cycle information for the **same active team subscription**.

If dashboard cycle dates and header-derived reset disagree, Gate 0 is BLOCKED until reconciled. Never manufacture a 30-day start date by subtracting 2,592,000 seconds unless RapidAPI explicitly defines that as the active billing-cycle duration for that subscription.

## 3. AUTH record

An approved Gate-0 AUTH record requires:

1. a JSON AUTH artifact with `phaseGate` exactly `Phase 1 / Gate 0`;
2. an unexpired authorization ID;
3. predecessor evidence satisfying the Phase-0 closure requirement;
4. the exact AUTH artifact SHA-256 recorded in the canonical evidence ledger.

The AUTH permits only the read-only Gate-0 account inspection. It does **not** authorize a refill, FIDS call, subscription create/delete, canary, probe, or Phase 6.

## 4. Account-evidence schema

Use `.v39-state/gate0-account-evidence.json` with schema version:

`v3.9-gate0-account-evidence-2`

Required plan identity fields now include:

- `active_subscribed_plan`
- `plan_version_basis`: one of `current_new_subscription`, `grandfathered`, `custom_contract`, `provider_revised`
- `entitlement_verified_for_active_subscription: true`
- `subscription_channel`
- `account_plan_id`
- `cycle_entitlement_units` — exact active team-subscription entitlement; expected baseline is 50,000 only if the team subscribes to the current RapidAPI Ultra plan
- exact cycle start/end
- exact used/remaining API units

Do not use the old `user_confirmed_60000_entitlement_applicable` field.

## 5. Values still required before Gate 0 can PASS

### Account/provider facts

- team app has an **active** AeroDataBox subscription
- exact plan name and marketplace/channel
- account/plan/application identifier, sanitized for evidence
- cycle start and end from the active team subscription
- API-unit entitlement, used and remaining from the same subscription/cycle
- RapidAPI rate limit for the active plan (current new Ultra is expected to be 4 req/s, but freeze the account value)
- Alert-credit balance from the same account identity used for the experiment
- refill conversion (currently 1 API unit = 1 Alert credit)
- minimum/maximum credits per refill and maximum Alert-credit balance for the active plan
- FIDS endpoint tier and exact billed units/request (current documentation: Tier 2 / 2 units)
- Flight Alert subscription inventory
- refill history or explicit authoritative evidence that no prior refills belong to the experiment account

### Project budget decisions

Freeze nonnegative values for:

- `ending_alert_margin`
- `pre_smoke_unsettled_burst_margin_credits`
- `protected_alert_floor` (must remain at least 1,000)
- `protected_api_floor_units`
- `ending_api_margin_units`
- six pre-run Alert sub-caps and their exact sum
- seven REST category caps
- `phase6_alert_spend_ceiling`
- `unallocated_alert_credits`
- `unallocated_api_units`

The accounting code must satisfy both exact identities; no approximate “50k minus roughly 1k REST” shortcut is allowed.

## 6. Should we buy current RapidAPI Ultra?

If the team application truly has no active AeroDataBox subscription and you intend to run this experiment through RapidAPI, **the current Ultra plan is the appropriate baseline to evaluate first** because it matches the project’s intended marketplace/channel and gives substantially more quota than Pro. Do not buy it merely because an old personal key works. Confirm that the subscription will be attached to the actual team application/API key that Replit will use.

After subscribing, do not immediately refill Flight Alert credits. First re-run the read-only Gate-0 capture under the team app and freeze the exact new quota/rate-limit/cycle/refill terms. Any refill remains a separately authorized mutation.

## 7. Gate-0 stop condition

Gate 0 is PASS only when:

1. the active team subscription identity is established;
2. the entitlement/cycle/usage values are internally consistent;
3. Alert balance and subscription inventory are read from the same experimental account identity;
4. FIDS cost and refill limits are verified rather than inferred;
5. both Alert and API budget trees reconcile exactly;
6. the sanitized artifact is hash-locked;
7. no provider mutation occurred during Gate-0 inspection.

Until then: **Gate 0 = BLOCKED/PARTIAL, later paid gates remain NO-GO.**
