from pathlib import Path
import re

PLAN = Path('SEPmd/V3.9_DataCollectPlan_f.8.md')
LOG = Path('SEPmd/V3.9_IMPLEMENTATION_LOG.md')
LEDGER = Path('SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md')

plan = PLAN.read_text()
log = LOG.read_text()
ledger = LEDGER.read_text()

# ---------- PLAN ----------
provider_anchor = '> **LIVE PROVIDER-CONTRACT CORRECTION (2026-09-09; V3.9-f.8, no scientific redesign).**'
if provider_anchor not in plan:
    raise SystemExit('missing provider correction anchor')

current_block = """> **CURRENT GATE-0 RESULT — PASS (2026-09-10).** The project owner explicitly attests that the `AERODATABOX_API_KEY` configured in the Replit Travnr project is the AeroDataBox credential for this Travnr/Replit experiment. Read-only RapidAPI/AeroDataBox account evidence using that configured credential established: provider entitlement **60,000 API units**, remaining **59,994**, observed current-cycle usage **6**, Flight-Alert balance **2,900 credits**, quota-reset/cycle-end evidence `2026-10-04T02:21:21Z`, and HTTP `204 No Content` for the webhook-subscription inventory (zero returned subscriptions). The user reports the existing Team Ultra subscription renewed/charged on 2026-09-04 for $32 and has been active for about three months; this is treated as provenance consistent with a grandfathered subscription, while the live quota headers are the quantitative authority. The project independently freezes `project_cycle_api_unit_ceiling=50,000`, leaving `49,994` project-authorized API units after the 6 observed units and reserving **10,000 provider-entitled units outside project authority**. Gate 0 performed no refill, FIDS request, subscription mutation, probe, canary, Phase-6 action, or database write. **Phase 1 / Gate 0 account verification is PASS. Next authorized phase is Phase 2 prerequisite P (security/retention), not Gate 1 directly.** Later REST-category budgets, pre-run Alert subcaps, measured burst/settlement controls, ending margins, and final Phase-6 Alert ceiling remain `BLOCKED_LATER_LIVE_VALUE` until their owning Plan stages produce them; this does not reopen Gate 0.\n\n"""
if 'CURRENT GATE-0 RESULT — PASS (2026-09-10)' not in plan:
    p = plan.find(provider_anchor)
    e = plan.find('\n\n', p)
    plan = plan[:e+2] + current_block + plan[e+2:]

# Replace §3.2 heading and first accounting fence with staged identities.
plan = plan.replace('### 3.2 Exact Alert/API balance trees (Gate 0)',
                    '### 3.2 Staged Alert/API accounting identities (Gate 0 → later budget FREEZE)')
sec_start = plan.index('### 3.2 Staged Alert/API accounting identities')
fence_start = plan.index('```text', sec_start)
fence_end = plan.index('```', fence_start + 7) + 3
new_fence = """```text
PROVIDER API IDENTITY (Gate 0, verified now):
cycle_entitlement_units
  = api_units_consumed_before_freeze
  + api_units_remaining

CURRENT VERIFIED PROVIDER IDENTITY:
60,000 = 6 + 59,994

PROJECT-AUTHORIZED API ENVELOPE:
project_cycle_api_unit_ceiling <= cycle_entitlement_units
50,000 <= 60,000
project_api_units_remaining_now = 50,000 - 6 = 49,994
provider_entitlement_outside_project_authority = 60,000 - 50,000 = 10,000

LATER COMPLETE PROJECT API TREE (must reconcile before final FREEZE):
project_cycle_api_unit_ceiling
  = api_units_consumed_before_freeze
  + authorized_alert_refill_units
  + FIDS_BASE_UNITS + FIDS_SPLIT_UNITS + FIDS_RETRY_UNIT_BUDGET
  + VALIDATION_UNIT_BUDGET + OUTCOME_REST_UNIT_BUDGET
  + HISTORY_BOOTSTRAP_UNIT_BUDGET + DIAGNOSTIC_UNIT_BUDGET
  + protected_api_floor_units + ending_api_margin_units
  + unallocated_api_units

LATER COMPLETE ALERT TREE (must reconcile before affected paid work / final FREEZE):
opening_nonexpiring_alert_balance + authorized_alert_refill_credits
  = pre_run_alert_spend_ceiling
  + phase6_alert_spend_ceiling
  + protected_alert_floor
  + ending_alert_margin
  + unallocated_alert_credits
```"""
plan = plan[:fence_start] + new_fence + plan[fence_end:]

# Fix lifecycle language within §3.2 only.
sec_end = plan.index('### 3.3', sec_start)
sec = plan[sec_start:sec_end]
sec = sec.replace('`ending_alert_margin` is a nonnegative, project-chosen balance reserve in\naddition to `protected_alert_floor`; it is frozen at Gate 0 and may not be\nsilently set to zero merely because it has not yet been measured.',
                  '`ending_alert_margin` is a nonnegative, project-chosen balance reserve in addition to `protected_alert_floor`; it is frozen before the first paid path that depends on it and no later than final FREEZE. It may not be silently set to zero merely because it has not yet been measured.')
sec = sec.replace('`protected_api_floor_units` and `ending_api_margin_units`. Those two API-unit\nreserves are nonnegative, project-chosen, and frozen at Gate 0.',
                  '`protected_api_floor_units` and `ending_api_margin_units`. Those two API-unit reserves are nonnegative, project-chosen, and frozen before the first affected paid API path and no later than final FREEZE.')
sec = sec.replace('`pre_smoke_unsettled_burst_margin_credits` is a conservative nonnegative\nadmission reserve frozen at Gate 0 from current account/provider evidence and\nis required to admit the safety smoke;',
                  '`pre_smoke_unsettled_burst_margin_credits` is a conservative nonnegative admission reserve frozen immediately before the safety smoke from then-current account/provider evidence;')
sec = sec.replace('A prior note mentioned an approximately 2,900-credit balance; that value is\n  historical/unverified and **must not be used for admission or budgeting**.\n  Gate 0 must record the settled opening non-expiring balance.',
                  'Gate 0 verified a settled opening non-expiring Flight-Alert balance of **2,900 credits** on 2026-09-10. It is dated evidence and must be reread before any later admission decision that depends on the current balance.')
sec = sec.replace('`phase6_alert_spend_ceiling = min(MAX_DESIGN_CEILING, opening_nonexpiring_alert_balance + authorized_alert_refill_credits - pre_run_alert_spend_ceiling - protected_alert_floor - ending_alert_margin)`.',
                  '`0 <= phase6_alert_spend_ceiling <= min(MAX_DESIGN_CEILING, opening_nonexpiring_alert_balance + authorized_alert_refill_credits - pre_run_alert_spend_ceiling - protected_alert_floor - ending_alert_margin)`; a deliberately lower authorized ceiling is allowed.')
sec = re.sub(r'- \*\*Gate 0:\*\* verify .*?The entitlement constant may be user-confirmed while cycle state remains live evidence\.',
             '- **Gate 0:** verify the intended Travnr/Replit credential binding, `subscription_channel`, `plan_version_basis`, exact live provider entitlement/remaining/used units, quota-reset/cycle evidence, account/request limits, current Alert balance, subscription inventory, FIDS/refill contract facts, and `project_cycle_api_unit_ceiling`. The 2026-09-10 Gate-0 evidence PASSes with provider entitlement 60,000 and project ceiling 50,000. Later Plan-owned budget fields remain `BLOCKED_LATER_LIVE_VALUE` until their owning stage; they must be frozen before the first affected paid action and fully reconciled before final FREEZE.', sec, count=1, flags=re.S)
plan = plan[:sec_start] + sec + plan[sec_end:]

# Replace Gate 0 row in §16.
gate_row_pat = re.compile(r'^\| \*\*0 — .*?\|$', re.M)
new_gate_row = '| **0 — Account/quota identity + project envelope** | Read-only verification of the intended Travnr/Replit credential, RapidAPI channel/plan basis, exact provider entitlement/remaining/used units, quota-reset/cycle evidence, account/request limits, current Alert balance, subscription inventory, FIDS/refill contract facts, and independent `project_cycle_api_unit_ceiling`. Later-generated budget values remain explicitly pending until their owning stages. | **PASS 2026-09-10:** project owner attests the Replit Travnr key is the experiment key; live evidence verifies 60,000 entitlement, 59,994 remaining, 6 used, 2,900 Alert credits, empty webhook inventory, and 50,000 project ceiling. No mutation. Next = prerequisite P. |'
# Only replace the first Gate 0 table row in the gate section.
gate_sec = plan.index('## 16. The GO gates')
m = gate_row_pat.search(plan, gate_sec)
if not m: raise SystemExit('missing Gate 0 row')
plan = plan[:m.start()] + new_gate_row + plan[m.end():]

# Replace Phase 1 runbook block.
phase1 = """PHASE 1 — Gate 0
 5. Verify the intended experiment credential and provider account state. **Completed 2026-09-10:** the project owner attested that the AeroDataBox key configured in Replit Travnr is the experiment key; live RapidAPI headers showed `cycle_entitlement_units=60,000`, `api_units_remaining=59,994`, and therefore 6 units used.
 6. Freeze the project API authorization separately from provider entitlement. **Completed:** `project_cycle_api_unit_ceiling=50,000`; current project envelope remaining is 49,994 units; 10,000 provider-entitled units are outside project authority and may not be spent by V3.9 without an explicit later reauthorization.
 7. Read current Flight-Alert balance and subscription inventory under read-only authorization. **Completed:** balance 2,900 credits; subscription inventory returned HTTP 204 / zero subscriptions. No refill or mutation occurred.
 8. Record provider-contract facts: RapidAPI channel, grandfathered current account behavior, FIDS Tier 2 / 2 units per request, refill conversion 1 API unit → 1 Alert credit, and quota/reset/account evidence. Values requiring a later authorized measurement remain owned by that later gate; do not mutate merely to fill a field.
 9. Write/hash Gate-0 evidence and mark `GATE0_ACCOUNT=PASS`. Later pre-run Alert subcaps, settlement/burst controls, complete seven-category REST totals, ending margins, and the final Phase-6 Alert ceiling remain `BLOCKED_LATER_LIVE_VALUE` and must be frozen before their affected paid path / final FREEZE. **Advance to PHASE 2 prerequisite P only.** Gate-0 PASS does not authorize Gate 1, smoke, probes, canary, FIDS, refill, or Phase 6 by itself.

"""
plan, n = re.subn(r'PHASE 1 — Gate 0\n.*?\nPHASE 2 — Gates 1–2\n', phase1 + 'PHASE 2 — Gates 1–2\n', plan, count=1, flags=re.S)
if n != 1: raise SystemExit('failed Phase 1 block replacement')
PLAN.write_text(plan)

# ---------- IMPLEMENTATION LOG ----------
status = """> **CURRENT PHASE-1 / GATE-0 STATUS — PASS (2026-09-10):** `PHASE0=PASS`, `GATE0_ACCOUNT=PASS`, `PHASE1=COMPLETE`, `NEXT=PHASE2_PREREQUISITE_P`, `PAID_WORK=NO-GO_UNTIL_OWNING_GATE_AUTH`. Project-owner attestation binds the Replit Travnr `AERODATABOX_API_KEY` to this experiment account. Live read-only evidence verifies provider entitlement `60,000`, remaining `59,994`, current-cycle use `6`, Flight-Alert balance `2,900`, quota reset `2026-10-04T02:21:21Z`, and zero returned webhook subscriptions. The project independently freezes `project_cycle_api_unit_ceiling=50,000`, leaving `49,994` project units after observed usage and `10,000` provider units outside project authority. Later REST/pre-run/Phase-6 budget values remain `BLOCKED_LATER_LIVE_VALUE` until their Plan-owned stage and do not reopen Gate 0. Evidence: `SEPmd/V3.9_GATE0_ACCOUNT_EVIDENCE_20260910.json`. No refill, FIDS call, subscription mutation, probe, canary, Phase-6 action, or DB write occurred.\n\n"""
if 'CURRENT PHASE-1 / GATE-0 STATUS — PASS (2026-09-10)' not in log:
    a = log.find('> **LIVE PROVIDER-CONTRACT CORRECTION — 2026-09-09')
    if a < 0: raise SystemExit('missing Log provider anchor')
    e = log.find('\n\n', a)
    log = log[:e+2] + status + log[e+2:]

new16 = """### 1.6 Phase 1 — Gate 0: PASS — account identity and project envelope

**Plan ownership:** §3 + §16 Gate 0 + §17 steps 5–9. **Prerequisite:** Phase-0 closure PASS (RUN-20260909-010).

**Decision:** `GATE0_ACCOUNT=PASS` and therefore `PHASE1=COMPLETE` as of 2026-09-10. Gate 0 verifies the real account/channel/quota/balance identity and project API-unit ceiling. It does not invent values whose owning Plan stage occurs later.

#### 1.6.1 Gate-0 evidence

| Field | Verified current value / evidence |
|---|---|
| credential identity | project owner attests Replit Travnr `AERODATABOX_API_KEY` is this experiment's AeroDataBox credential |
| channel | RapidAPI |
| plan basis | existing/grandfathered Ultra behavior; user reports Team Ultra, $32 renewal on 2026-09-04, active about three months |
| provider API entitlement | 60,000 units |
| provider remaining | 59,994 units |
| provider-cycle usage | 6 units |
| project API-unit ceiling | 50,000 units |
| project envelope remaining now | 49,994 units |
| provider entitlement outside project authority | 10,000 units |
| quota reset/cycle-end evidence | 2026-10-04T02:21:21Z |
| exact cycle-start time | not exposed; user reports renewal date 2026-09-04; no fabricated timestamp |
| Flight-Alert balance | 2,900 credits |
| webhook subscription inventory | zero returned (HTTP 204 No Content) |
| FIDS contract | Tier 2 / 2 API units per request |
| refill conversion | 1 API unit → 1 Flight-Alert credit |
| protected Alert floor | at least 1,000 credits |
| provider mutations | none |
| Gate-0 database writes | none |

#### 1.6.2 Accounting identities

```text
provider: 60,000 = 6 used + 59,994 remaining
project:  50,000 <= 60,000 provider entitlement
project remaining now = 50,000 - 6 = 49,994
outside project authority = 60,000 - 50,000 = 10,000
```

The 50,000-unit ceiling is a cycle-wide project authorization, **not** a `50,000/31` daily allocation and not an Alert-credit balance. API units and Flight-Alert credits remain separate resources.

The complete project API tree and complete Alert tree are finalized in stages. Values generated by Gate 1, pre-probe freeze, safety smoke, Gate 0.5, Gate 5, calendar materialization, or other MEASURE→FREEZE steps remain `BLOCKED_LATER_LIVE_VALUE` until then. Before each affected paid action, its required partial budget must reconcile; before final FREEZE/Phase 6, both complete trees must reconcile.

`phase6_alert_spend_ceiling` may be any explicitly authorized value satisfying `0 <= phase6_alert_spend_ceiling <= min(57,900, feasible Alert remainder)`; unused remainder stays unallocated rather than being forced into Phase 6.

#### 1.6.3 Gate-0 result and next action

**PASS. Phase 1 is complete.** The next authorized phase is **Phase 2 prerequisite P — prepaid security/retention**. Gate 1 begins only after prerequisite P PASS. Gate-0 PASS does not authorize refill, FIDS, smoke, probe, canary, or Phase 6.

---

"""
log, n = re.subn(r'### 1\.6 Phase 1 — Gate 0:.*?\n---\n\n### 1\.7 ', new16 + '### 1.7 ', log, count=1, flags=re.S)
if n != 1: raise SystemExit('failed Log §1.6 replacement')

sec6 = """<a id="sec-6"></a>
## 6. Gate board — current repository-aware PASS/BLOCKED state

| State | Current result | Next requirement |
|---|---|---|
| **Phase 0** | **PASS / COMPLETE** | closed by RUN-20260909-010; later Gate-0 fixes passed zero-provider CI |
| **Phase 1 / Gate 0** | **PASS / COMPLETE** | current account/quota/balance identity and 50,000 project ceiling verified; no mutation |
| **Phase 2 prerequisite P — security/retention** | **NEXT / GO TO START** | verify active channel/Terms/content-class retention, credentials/webhook/raw expiry/redaction/incident controls before Gate 1 stores affected provider content |
| **Gate 1** | BLOCKED_BY_P | requires prerequisite P PASS and its own authorized coverage evidence |
| **reference/frame/preprobe** | BLOCKED | Gate 1 then reference/frame freeze |
| **safety smoke / Gate 2** | NO-GO | predecessors + frozen partial budget + exact authorization |
| **Gate 3 / Gate 0.5 / Gate 4 / Gate 5** | NO-GO | sequential predecessors |
| **FREEZE / Phase 6** | NO-GO | complete gates, budgets, calendar, manifest, security/retention and exact authorization |
| **Phase 7** | BLOCKED_BY_PHASE6 | collection not performed |

### 6.1 Current stop rule

> **Gate 0 is complete. Start only Phase 2 prerequisite P. Do not skip directly to Gate 1 and do not perform any paid/provider mutation unless its owning gate and exact authorization allow it.**

---
"""
log, n = re.subn(r'<a id="sec-6"></a>.*?(?=<a id="sec-7"></a>)', sec6, log, count=1, flags=re.S)
if n != 1: raise SystemExit('failed Log §6 replacement')

sec7 = """<a id="sec-7"></a>
## 7. GO/NO-GO verdict and mandatory handoff checkpoints

```text
PHASE0 = PASS / COMPLETE
GATE0_ACCOUNT = PASS
PHASE1 = COMPLETE
NEXT = PHASE2_PREPAID_SECURITY_RETENTION_P
GATE1 = BLOCKED_BY_P
SAFETY_SMOKE = NO-GO
GATE2_PROBES = NO-GO
GATE3 = NO-GO
GATE0.5 = NO-GO
GATE4 = NO-GO
GATE5 = NO-GO
FREEZE = NO-GO
PHASE6 = NO-GO

PROVIDER_CYCLE_ENTITLEMENT = 60000 API units
PROVIDER_REMAINING_AT_GATE0 = 59994 API units
PROVIDER_CYCLE_USED_AT_GATE0 = 6 API units
PROJECT_CYCLE_API_UNIT_CEILING = 50000 API units
PROJECT_REMAINING_AT_GATE0 = 49994 API units
PROVIDER_UNITS_OUTSIDE_PROJECT_AUTHORITY = 10000 API units
ALERT_BALANCE_AT_GATE0 = 2900 credits
```

### 7.1 What you should do next

Proceed to **Phase 2 prerequisite P** only. Re-verify the current AeroDataBox/RapidAPI plan/Terms and classify every content class the next stages can store; verify credential, webhook, raw-data expiry/deletion, backup/replica, redaction and incident-stop controls. Only after `PREPAID_SECURITY_RETENTION=PASS` may Gate 1 start.

### 7.2 Later mandatory return points

Return after prerequisite P, after Gate 1/reference freeze, after safety smoke, after material Stage-1 ranking decisions, after Gate 2, after each Gate 3/0.5/4/5, after FREEZE, and immediately on any mismatch/pause/failure.

---
"""
log, n = re.subn(r'<a id="sec-7"></a>.*?(?=<a id="sec-8"></a>)', sec7, log, count=1, flags=re.S)
if n != 1: raise SystemExit('failed Log §7 replacement')

# Refresh §22 current-number table wording.
log = log.replace('| **`cycle_entitlement_units`** | exact positive monthly API entitlement frozen from the active TEAM subscription. For a new/re-subscribed RapidAPI Ultra subscription, 50,000 units is the current planning baseline; a grandfathered 60,000 value is valid only for the exact legacy subscription identity that proves it |',
                  '| **`cycle_entitlement_units`** | current Gate-0 provider entitlement = **60,000 API units**, verified by live RapidAPI quota headers on the project-owner-attested Travnr/Replit credential |\n| **`project_cycle_api_unit_ceiling`** | current project authorization = **50,000 API units**; after 6 observed provider-cycle units, **49,994** project-authorized units remain |\n| **10,000 units outside project authority** | provider entitlement deliberately not authorized to V3.9 (`60,000−50,000`) unless explicitly reauthorized later |')
log = log.replace('There is **no valid arithmetic that simply adds Alert credits and REST API units as if they were the same post-allocation resource**. Gate 0 balances the Alert and API trees separately.',
                  'There is **no valid arithmetic that simply adds Alert credits and REST API units as if they were the same post-allocation resource**. Gate 0 verified the provider API identity and independent project ceiling; later Alert/API budget trees are completed separately before their affected paid paths and final FREEZE.')
LOG.write_text(log)

# ---------- EVIDENCE LEDGER ----------
entry = """<!-- GATE-0-20260910-PASS -->
## GATE-0-20260910-PASS — Phase 1 / Gate 0 complete

**Decision:** `GATE0_ACCOUNT=PASS`, `PHASE1=COMPLETE`, `NEXT=PHASE2_PREPAID_SECURITY_RETENTION_P`.

Evidence combines project-owner credential attestation with live read-only RapidAPI/AeroDataBox account reads. The project owner confirms the `AERODATABOX_API_KEY` configured in the Replit Travnr project is this experiment's AeroDataBox credential. Live evidence established provider entitlement `60,000` API units, remaining `59,994`, current-cycle use `6`, Flight-Alert balance `2,900` credits, quota reset/cycle-end evidence `2026-10-04T02:21:21Z`, and zero returned webhook subscriptions (HTTP 204 No Content). User reports Team Ultra renewal/charge on 2026-09-04 for $32 and subscription active about three months; the live 60,000-unit quota is the quantitative authority and is consistent with grandfathered marketplace behavior.

Project authorization is independently capped at `50,000` API units for this provider cycle. Therefore `49,994` project-authorized units remained after the 6 observed units at Gate 0, and `10,000` provider-entitled units are deliberately outside project authority. This is not a daily allocation and is not an Alert-credit balance.

Sanitized evidence artifact: `SEPmd/V3.9_GATE0_ACCOUNT_EVIDENCE_20260910.json`.

Safety: Gate 0 used read-only/free account evidence only. No refill, FIDS request, provider mutation, probe, canary, Phase-6 action, or Gate-0 database write was performed. Later budget values owned by later gates remain `BLOCKED_LATER_LIVE_VALUE` and must be frozen before their affected spend / final FREEZE.

**Next:** Phase 2 prerequisite P. Gate 1 remains blocked until P PASS.

---

"""
if '<!-- GATE-0-20260910-PASS -->' not in ledger:
    marker = '---\n\n<!-- RUN-20260909-010 -->'
    if marker not in ledger: raise SystemExit('missing ledger insertion marker')
    ledger = ledger.replace(marker, '---\n\n' + entry + '<!-- RUN-20260909-010 -->', 1)
LEDGER.write_text(ledger)

# Core fail-closed assertions.
assert 'CURRENT GATE-0 RESULT — PASS (2026-09-10)' in PLAN.read_text()
assert 'GATE0_ACCOUNT = PASS' in LOG.read_text()
assert 'PHASE1 = COMPLETE' in LOG.read_text()
assert '<!-- GATE-0-20260910-PASS -->' in LEDGER.read_text()
