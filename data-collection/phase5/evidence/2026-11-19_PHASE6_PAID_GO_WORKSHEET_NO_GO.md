# Phase 6 paid GO worksheet — NO-GO until evidence is complete

**Date prepared:** 2026-11-19  
**Intended collection window:** 2026-11-20 through Day 31, exact UTC bounds from the frozen calendar  
**Repository:** `HKcode22/ReplitTranvr`  
**Current disposition:** `NO_GO`  
**Purpose:** bounded execution worksheet; not an authorization and not a provider-rights decision

## How to use this worksheet

This worksheet is the final gate record for one bounded paid Day 1–Day 31 run. It must be completed from current evidence immediately before source enable and paid dispatch. A green software workflow, an available quota, a normalized table, a hashed response, or an unanswered email cannot fill a missing rights field.

The run may start only when every required item below is `PASS`, the approval ledger contains the corresponding evidence-backed approval, and the owner records a separate paid GO. If any item is `MISSING`, `STALE`, `CONTRADICTORY`, or `FAIL`, the status stays `NO_GO`.

## Current readback

| Gate | Current value | Status |
|---|---|---|
| Current main | `b557c0ee5420a881ad0ef688d934ea608fe113a7` | PASS for documentation state |
| Phase 5 freeze | Recorded as complete/inert | PASS for freeze; not paid authorization |
| Source-use/retention rights | No account-specific approval recorded | **MISSING** |
| Provider reply | No reply to the Nov 18 follow-up | INFORMATIONAL; not approval and not an engineering hold |
| Approval ledger | 28 evidence records; 0 approvals | **NO_GO** |
| Reviewed derived transformation profile | Candidate dictionary is `PROPOSED_REVIEW_REQUIRED` | **MISSING** |
| Source-enable/readback | Not executed for Phase 6 | **MISSING** |
| Relay repin | Blocked by missing Phase 6 AUTH | **MISSING** |
| Zero-provider rehearsal | Existing workflows/tests are available; current-main execution readback not refreshed here | **MISSING** |
| Paid GO | Not issued | **NO_GO** |
| Provider calls | 0 in the latest recorded stop evidence | PASS for no accidental launch |
| Database writes | 0 in the latest GitHub stop evidence | PASS for no accidental launch |

## Required evidence before GO

### A. Account-specific source-use and retention

- [ ] Current AeroDataBox/RapidAPI account and plan identified without exposing a credential.
- [ ] Paid/commercial use is evidenced for the exact account.
- [ ] Retention allowance is evidenced for the exact plan/account.
- [ ] Cache-Control behavior and maximum applicable retention are recorded.
- [ ] Backup, PITR, replica, log, artifact, and incidental-copy treatment is recorded.
- [ ] PRE, POST, target labels, and derived packet use are covered.
- [ ] The exact account-specific evidence is committed to the private evidence path and referenced by SHA.

**Result:** `MISSING` until the above are complete.

### B. Field-level derived transformation

- [ ] The exact output dictionary is frozen.
- [ ] Every output field has source family, transformation, buckets/categories, null state, and reconstruction-risk rationale.
- [ ] Identifiers, exact timestamps, raw responses, request metadata, and direct source linkage are excluded from the long-lived packet.
- [ ] T−6 gate-out delay remains separate from T−24/T−90 comparators and after-takeoff arrival delay.
- [ ] `not_due`, `censored`, `missing`, and `invalid` are not converted into negative labels.
- [ ] The source adapter emits only the writer's approved shape.
- [ ] Independent review confirms that the exact output is not a per-record restatement or reconstructable substitute.
- [ ] A reviewed profile is committed with `approvedForUse: true` only after the rights evidence exists.

**Result:** `MISSING` while the repository only has `PROPOSED_REVIEW_REQUIRED`.

### C. Activation and readback

- [ ] One scoped Phase 6 AUTH artifact is added to `V3.9_PHASE6_SOURCE_ENABLE_APPROVALS.json`.
- [ ] Manifest, calendar, config, frame, provider contract, rights evidence, and derived-profile hashes match.
- [ ] Source-enable owner transition completes.
- [ ] Independent readback confirms the exact main SHA, account/role, cap, and STOP defaults.
- [ ] Legacy Alert start remains disabled.
- [ ] Relay is pinned to the same authorized main SHA and exact runtime manifest.
- [ ] Watchdog and expiry controls are readable and current.

**Result:** `MISSING`.

### D. Zero-provider rehearsal

The rehearsal must run with provider credentials absent, database production credentials absent, collection flags off, and paid GO false.

- [ ] Offline selector/admission tests pass.
- [ ] Disposable PostgreSQL16 schema/claim/expiry tests pass.
- [ ] Owner-visible read-only dataflow test passes.
- [ ] Relay/controller readback makes no provider HTTP call and no production write.
- [ ] Derived writer rejects source identities, exact source timestamps, raw payloads, and unapproved fields.
- [ ] Rehearsal receipt is linked here by run ID and SHA.

**Result:** `MISSING` for a fresh current-main receipt.

### E. Separate paid GO

The GO record must contain:

- exact current main SHA and workflow pins;
- exact UTC start/end bounds for the 31-day calendar;
- daily and total credit caps plus protective floor;
- airport/route/cohort scope and horizon set;
- source-use/retention evidence IDs;
- derived profile hash and packet schema hash;
- source-enable/readback receipt;
- relay/watchdog receipt;
- zero-provider rehearsal receipt;
- owner, reviewer, stop authority, and rollback procedure;
- explicit statement that the run stops on any rights, budget, expiry, schema, integrity, or model-parity failure.

**Result:** `NOT_ISSUED`.

## Day 1–Day 31 execution contract after GO

The paid GO covers one bounded run, not an indefinite permission. Each day must still pass:

1. budget and quota check;
2. exact-main and runtime pin check;
3. source-use/retention and expiry check;
4. PRE cutoff and horizon check;
5. POST/outcome and censoring check;
6. derived packet schema and coverage check;
7. model/parity and missingness check;
8. deletion/expiry receipt check;
9. STOP/continue decision.

Day 31 closes the run. The source-custody lane is then expired/deleted according to the evidenced policy, while only approved derived/model/control artifacts remain.

## Current decision

```text
PAID_PHASE6_GO = false
SOURCE_ENABLE = false
PROCESS_ARMED = false
PROVIDER_CALLS = 0
APPROVAL_LEDGER_APPROVALS = 0
```

This worksheet makes the project ready to execute the remaining gates without waiting for an email, but it intentionally does not turn missing account-specific rights evidence into permission.
