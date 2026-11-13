# 2026-11-13 06:36 UTC — ACTUAL fresh-login B0062 + V0093 Neon independent read-only verification PASS

**Actual owner-initiated production GitHub workflow and independent output: PASS.** This checkpoint supersedes the prior dated `2026-11-12_REAL_TWO_RESTRICTED_STAGING_LOGINS_OWNER_COMMISSION_SUCCESS_FRESH_RO_PENDING.md` reference to a still-pending independent login check. The roles were already commissioned in Replit; do **not** rerun their owner-only installer.

## Authentic live evidence, not fixture CI

Source: [manual GitHub Actions run #43379809484](https://github.com/HKcode22/ReplitTranvr/actions/runs/43379809484), exact main/head `5390ad02943252e81049c1ff9ca3d5a5837c9f4a`, event `workflow_dispatch`, first attempt, GitHub-created **2026-11-13 06:35:54 UTC**, completed **2026-11-13 06:36:21 UTC**. Exact job `exact-main-real-two-logins-readonly` ID `131734692290` ended **SUCCESS**, all its steps including the actual restricted credential/SQL catalog proof succeeded. The PR-only zero-secrets job was correctly skipped. It is not just the CLI's initial empty `gh run list`, which queried too early; the exact run ID and raw successful job log were independently inspected.

The live main Actions runner used the two *existing* encrypted GitHub Actions database URL secrets, opened **two independent** PostgreSQL16 read-only connections as the commissioned effective/login role, then verified direct table grants, all denied table access, absent role memberships/admin flags, schema/database CREATE denial and accessible `clean` SECURITY DEFINER routines. The log's exact sanitizer-safe result:

```json
{
  "status": "P5_B0062_V0093_BOTH_REAL_LOGINS_INDEPENDENT_PG16_READONLY_PASS_NO_GO",
  "rolesVerified": 2,
  "results": [
    {
      "role": "phase5_b0062_prelaunch_stage_prod20261113",
      "verifiedIndependentSession": true,
      "readTables": 10,
      "insertTables": 4,
      "prohibitedOtherTablePrivilegesChecked": true,
      "executableCleanSecurityDefinerFunctions": 0,
      "roleMemberships": 0,
      "providerCalls": 0,
      "dbWrites": 0
    },
    {
      "role": "phase5_fids_budget_freeze_prod20261113",
      "verifiedIndependentSession": true,
      "readTables": 8,
      "insertTables": 3,
      "prohibitedOtherTablePrivilegesChecked": true,
      "executableCleanSecurityDefinerFunctions": 0,
      "roleMemberships": 0,
      "providerCalls": 0,
      "dbWrites": 0
    }
  ],
  "scriptsInstalled": 0,
  "rolesCreatedOrUpdated": 0,
  "dbWrites": 0,
  "providerCalls": 0,
  "flightRowsRead": 0,
  "phase5ScientificFreeze": false,
  "phase6PaidGo": false
}
```

The result is an **independent read-only authentication and ACL proof**, not a test of future B0062 calendar-writing inputs or final system production release. `pg-connection-string` emitted a future SSL mode alias behavior warning, not an observed TLS/DB login failure. Never print connection URLs/passwords to PR comments or docs.

## Work that is now done, not to be repeated

- **Real two narrow LOGIN installations:** owner-reported exact one-use receipt `P5_B0062_AND_V0093_TWO_NARROW_LOGINS_COMMISSIONED_NO_GO` (two roles, two encrypted GitHub connection secrets; calendar/source/provider rows 0).
- **Real independent new-connection readback:** this run #43379809484 **PASS** (both role-specific production credentials and effective ACL without a DB write).
- **V0079–V0093 preexisting schema and earlier Stage14/V0081/V0091/V0092 C+D queue:** preserve, **DO NOT REINSTALL**. There is no reason to reinitialize the two logins or run their read-only verification again without evidence of later ACL drift.

## Phase5→6 actual next prerequisites

1. Assemble externally reviewed, **genuinely future** B0062 31-day calendar/treatment/31 independent seeds and 21 ordinary-day region plans; use the real corrected five 4-airport crossover pairs with 10 scheduled paired days. Unknown ordinary MID/REGIONAL physical site ICAOs remain NULL until their future prospective early draw.
2. Authenticate current AeroDataBox/RapidAPI provider unit prices, maximum range, current balance, allowable source Contents/retention/ML use, seven categories over each **physical UTC charge date**, and independent Alert SEND/STOP caps. Existing code can compute an unsigned conservative **cost** envelope but cannot invent contract/price approval or exact real source requests for unknown future airports.
3. Only after **separate exact input review/approval**, use the already merged #603 B0062 disabled-authorization staging transaction and #608 V0093 seven-category `COST_UPPER_BOUND` writer with **these two live restricted logins**. Then run #619 exact fresh-session row-by-row poststage readback. This read-only audit does **not** authorize those writes.
4. Finish authentic day/shard source packet publication and source-original → native operating-leg review/signing → V0091 durable PRE registration → Stage14/V0081 T24/T6/T90 → V0083 POST/receiver/STOP across all 31 days without manual overnight dependency. Preserve hard budget/rights stop and honest per-flight missingness. [Automation tracking issue #553](https://github.com/HKcode22/ReplitTranvr/issues/553) is still open.
5. Independently adjudicate Phase5 scientific FREEZE, then separate Phase6 paid GO. **Current Phase5 FREEZE HOLD / Phase6 paid NO-GO** despite this correct credential proof.

**No provider call, no schema installation, no paid GO, no new calendar or source row is claimed in the independent role readback.**
