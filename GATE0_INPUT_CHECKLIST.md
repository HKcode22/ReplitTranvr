# Gate 0 — Exact Inputs Needed (Phase 1)

Status: Replit HEAD `ff3372d` confirmed. Gate 0 is NOT PASS yet.

## 0. What I can do without you

Once AUTH is genuinely approved and the evidence file is filled, I can run:

- Strict Alert-balance read (`GET /subscriptions/balance`)
- Strict subscription inventory (`GET /subscriptions/webhook`)
- Offline budget reconciliation
- Hashable Gate-0 artifact generation

I cannot invent dashboard facts, approve AUTH myself, or use exposed credentials.

## 1. AUTH record — do not mark “yes” unless it exists

An approved AUTH record means ALL of these exist:

1. A JSON file, e.g. `.v39-state/AUTH-YYYYMMDD-G0.json`, with fields:
   - `authorizationId` (format `AUTH-YYYYMMDD-ID`)
   - `phaseGate` exactly `Phase 1 / Gate 0`
   - scope, ceilings, validity window, cleanup owner
   - `predecessorEvidenceIds` already present in the evidence ledger
2. Its exact bytes hashed with SHA-256.
3. That hash recorded in the canonical evidence ledger as:
   - `AUTH_ARTIFACT_SHA256:<64 hex>`
4. The record is unexpired and covers Gate 0.

Saying “yes” without those files does not authorize Phase 1. If you do not have one, the answer is: **AUTH record approved = NO**.

Tell me if you want me to draft the AUTH JSON. A human must still approve it and append its hash to the ledger.

## 2. Evidence file you must fill

File: `.v39-state/gate0-account-evidence.json`

Keep its existing schema/field names. Fill every required value; leave unknown as `null`, never guess.

### A. I already have these provisionally from your terminal output

| Field | Provisional value | Still needs |
|---|---|---|
| `subscription_channel` | `rapidapi` | confirm from dashboard |
| `cycle_entitlement_units` | `60000` | confirm subscribed plan |
| `api_units_consumed_before_freeze` | `4` | confirm from Usage page |
| `api_units_remaining` | `59996` | confirm from Usage page |
| `opening_nonexpiring_alert_balance` | live read `2900` | re-read under AUTH |
| `active_subscription_inventory` | live read `[]` | re-read under AUTH |
| `protected_alert_floor` | `1000` | confirm |
| `fids_tier` | `Tier 1` | confirm for subscribed plan |
| `fids_units_per_request` | `1` | confirm for subscribed plan |
| `refill_conversion_api_units_per_credit` | `1` | confirm for subscribed plan |

### B. Only you can supply these

From RapidAPI Billing/Usage:

- `active_subscribed_plan`
- `account_plan_id`
- `billing_cycle_start_utc`
- `billing_cycle_end_utc`
- `rate_limit_and_account_mechanics`
- `refill_min_credits`
- `refill_max_credits`
- `alert_balance_cap_credits`
- `refill_history`
- `authorized_alert_refill_credits`
- `authorized_alert_refill_units`

Project decisions you must approve:

- `ending_alert_margin`
- `pre_smoke_unsettled_burst_margin_credits`
- `protected_api_floor_units`
- `ending_api_margin_units`
- all six `pre_run_alert_subcaps` plus exact `pre_run_alert_spend_ceiling`
- `phase6_alert_spend_ceiling`
- all seven `rest_categories`:
  - `fids_base_units`
  - `fids_split_units`
  - `fids_retry_unit_budget`
  - `validation_unit_budget`
  - `outcome_rest_unit_budget`
  - `history_bootstrap_unit_budget`
  - `diagnostic_unit_budget`
- `unallocated_alert_credits`
- `unallocated_api_units`
- `gathered_at_utc`
- `provenance`
- `user_confirmed_60000_entitlement_applicable` (`true` only after dashboard check)

## 3. Where to find dashboard values

1. Open RapidAPI Developer Dashboard.
2. Select the app using AeroDataBox.
3. Open Billing/Subscriptions.
4. Select AeroDataBox.
5. Open Usage/Limits.
6. Copy plan name, cycle dates, entitlement, consumed, remaining, caps, rate limit.
7. Use the AeroDataBox docs shown for your subscribed plan for FIDS tier/cost and refill terms.

## 4. Reply format

Reply with exactly:

```text
credentials rotated=yes/no
Replit HEAD=ff3372d yes/no
evidence file filled=yes/no
AUTH record approved=yes/no
AUTH file path=<path or none>
```

If AUTH is `no`, I will draft it next. If the evidence file is `no`, tell me which section is blocking you.
