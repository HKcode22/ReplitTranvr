<a id="log-top"></a>
# IMPLEMENTATION LOG — V3.9 Flight-Delay Data Collection

> **FINAL FULL EXECUTION-SAFE EDITION — 2026-09-02 (America/Los_Angeles).**
> This file intentionally preserves the older 3,245-line manual/history/archive **without allowing it to compete with current execution instructions**.
> **PART A (§§0–11) is the only current Implementation-Log execution/evidence authority.**
> **PART B is preserved reference/history only and is NON-NORMATIVE / NON-EXECUTABLE.**
> The binding scientific/operational authority remains `V3.9_DataCollectPlan_V3.9-f.8_FINAL_FULL_EXECUTION_SAFE.md` §§0–21.

`ADB_AUTO_COLLECT=false` is the required safe state. Its actual runtime value is **not verified in this document merge**. Paid safety smoke = **NO-GO**. Stage-1 probes = **NO-GO**. Phase 6 = **NO-GO** until PART A's offline and ordered live prerequisites are evidenced.

## How to use this full file

| Layer | Purpose | May it authorize execution? |
|---|---|---|
| **PART A §§0–11** | Current authority, 104-rule matrix, repository/code/script plan, complete command surface, TEST-001–028, paid refusal state machine, gate board, evidence format, scanner, final verdict | **YES — but only within the fail-closed prerequisites stated there** |
| **PART B preserved manual §§0–36** | Teaching, glossary, table explanations, code walkthroughs, historical commands, old repo snapshots, change history, 88-component map, archive | **NO** — explanatory/provenance only; cannot create PASS or permission |
| `V3.9_RUN_REPORTS_AND_EVIDENCE.md` | New run/gate outputs, balances, hashes, command output, paid/live evidence | Evidence only; PART A/Plan decide consequence |

**Conflict rule:** Plan §§0–21 → PART A of this Log → frozen manifest/evidence. PART B never overrides those. If PART B contains a stale number, old command, old `DONE/PASS` claim, previous branch/SHA, or historical provider/account observation, treat it as dated provenance only.

---

# PART A — CURRENT EXECUTION / IMPLEMENTATION / EVIDENCE AUTHORITY

## 0. Authority, scope, and non-negotiable truth rules

1. `V3.9_DataCollectPlan_V3.9-f.8_FINAL_FULL_EXECUTION_SAFE.md` §§0–21 is the sole
   scientific/operational authority.
2. This file records implementation and evidence. It cannot override the Plan.
3. **PART A (§§0–11) of this file is the only current Log execution/evidence authority.** PART B preserves the former 3,245-line manual, teaching material, change history, and archive for provenance/reference only. Any PART-B statement that says `current`, `PASS`, `DONE`, names an old command order, reports old repository state, or claims code/test/live status is historical unless PART A independently re-establishes it. Requirement coverage is preserved by the 104-row traceability table and TEST-001–028 matrix in PART A.
4. If Plan and Log disagree, create `DOC_CONFLICT`, stop the affected path,
   and correct this Log to the Plan. Never improvise a third rule.
5. A file existing is not implementation. A component advances only through:

```text
NOT_INSPECTED
  → DOCUMENTED
  → CODED_STANDALONE
  → UNIT_TESTED
  → PRODUCTION_WIRED
  → OFFLINE_INTEGRATION_TESTED
  → LIVE_VERIFIED       (only where live evidence is required)
```

6. `PRODUCTION_WIRED` requires the real production caller, schema/migration,
   configuration owner, failure path, and tests. A helper or migration file
   alone cannot receive that status.
7. Historical evidence never becomes a current PASS by copy/paste. Re-run it
   against the current commit/config/account and record a new evidence ID.
8. No generic phrase such as “industry standard,” “looks correct,” “probably
   implemented,” or “small test” can close a requirement.

### 0.1 Evidence available for this correction

| Evidence ID | Item | What it establishes | What it does not establish |
|---|---|---|---|
| `DOC-20260902-001` | V3.9 Plan current core §§0–21 | Current binding requirements | Code or live readiness |
| `DOC-20260902-002` | This full Log PART A §§0–11 | Status/evidence schema and refusal sequence | Repository truth |
| `AUDIT-20260902-002` | Deterministic current-file audit after correction | Balanced Markdown fences/tables, unique headings, exact requirement/test ID coverage, context-aware stale-rule checks, and paired-file agreement | Repository, account, legal, or paid-live readiness |
| `SRC-ADB-OAS-20260902` | Carried forward from prior Sep-2 verification: AeroDataBox RapidAPI OpenAPI v1.15.3.0, OpenAPI 3.0.4, SHA-256 `735620f2d2132c5bf51768f50caa767b7f0b25be8b128679641402666696890a` | Current public endpoint/contract pin rechecked 2026-09-02 | Actual account/channel limits or live payload semantics |
| `SRC-ADB-ALERT-20260902` | Carried forward from prior Sep-2 verification: official Flight Alert billing guide | One credit per flight item on SEND; failed delivery/retry charging; refill relationship described publicly | Actual balance, account caps, or settlement latency |
| `SRC-ADB-TERMS-20260902` | Carried forward from prior Sep-2 verification: official Terms, updated 2026-08-21 | Current public retention/Derived-Works clauses requiring owner review | User's subscribed Plan Terms or legal approval |
| `SRC-AWC-20260902` | Carried forward from prior Sep-2 verification: AviationWeather Data API | Up-to-previous-30-days retrieval history | Storage/retention permission |
| `SRC-RESEARCH-20260902` | Carried forward from prior Sep-2 audit: SDSU/SJSU and supporting papers in Plan §19 | Scientific plausibility of chain/trajectory/network hypotheses | Project constants, a promised model win, or deployment validity |

### 0.2 Evidence explicitly unavailable

```text
REPOSITORY_ACCESS = UNAVAILABLE
GIT_BRANCH_HEAD_WORKTREE = NOT_OBSERVED
PRODUCTION_ROUTES_AND_CALLERS = NOT_OBSERVED
DATABASE_SCHEMA_AND_MIGRATION_RUNNER = NOT_OBSERVED
MIGRATIONS_0024_0025 = NOT_OBSERVED
TEST_TYPECHECK_LINT_BUILD = NOT_RUN
DEPLOYED_WEBHOOK_AND_SCHEDULER = NOT_OBSERVED
PROVIDER_ACCOUNT_AND_PLAN_TERMS = NOT_OBSERVED
CURRENT_SUBSCRIPTIONS_BALANCES_LIMITS = NOT_OBSERVED
CURRENT_FRAME_CALENDAR_MANIFEST = NOT_OBSERVED
PAID_OR_LIVE_RUNS_PERFORMED_IN_THIS_AUDIT = NONE
SUPPLIED_CLOSURE_SCANNER = HISTORICAL_NOT_RUN
```

No old statement that code “exists,” “passes 71 tests,” or is “production
wired” survives this evidence boundary.

---

## 1. Current readiness counters and verdict

`CURRENT_CURRENT_CONTRADICTIONS=0` below is limited to the binding Plan §§0–21 plus PART A of this Log under the document scanner in §10. It is not a repository count.
Repository-dependent counts cannot be honestly calculated without the repo.

```text
CURRENT_CURRENT_CONTRADICTIONS = 0  # document pair only; repository not inspected
REPOSITORY_ACCESS = UNAVAILABLE

OFFLINE_CODE_REQUIREMENTS_NOT_IMPLEMENTED = NOT_MEASURABLE_REPOSITORY_UNAVAILABLE
OFFLINE_TEST_REQUIREMENTS_NOT_PASSING = NOT_MEASURABLE_REPOSITORY_UNAVAILABLE
PRODUCTION_PATH_MODULES_NOT_WIRED = NOT_MEASURABLE_REPOSITORY_UNAVAILABLE
CANONICAL_REGISTRY_UNMAPPED_BINDING_RULES = NOT_MEASURABLE_REPOSITORY_UNAVAILABLE
REQUIREMENT_MATRIX_UNMAPPED = NOT_MEASURABLE_REPOSITORY_UNAVAILABLE
UNVERIFIED_PROVIDER_ASSUMPTIONS_AFFECTING_PHASE6 = GREATER_THAN_ZERO
UNFROZEN_REQUIRED_PRE_RUN_VALUES = GREATER_THAN_ZERO

TYPECHECK = NOT_RUN_REPOSITORY_UNAVAILABLE
LINT = NOT_RUN_REPOSITORY_UNAVAILABLE
BUILD = NOT_RUN_REPOSITORY_UNAVAILABLE
MIGRATION_0024_OFFLINE = NOT_RUN_REPOSITORY_UNAVAILABLE
MIGRATION_0025_OFFLINE = NOT_RUN_REPOSITORY_UNAVAILABLE

FRAME = BLOCKED
CALENDAR = BLOCKED
RETENTION_RIGHTS = BLOCKED
PREPAID_SECURITY_RETENTION = BLOCKED
MANIFEST = NOT_WRITTEN

Gate0 = BLOCKED_OFFLINE_AND_LIVE_EVIDENCE
Gate1 = BLOCKED
PreProbeFreeze = BLOCKED
SafetySmoke = BLOCKED_NOT_AUTHORIZED
Gate2 = BLOCKED
Gate3 = BLOCKED
Gate0.5 = BLOCKED
Gate4 = BLOCKED
Gate5 = BLOCKED
FREEZE = BLOCKED

ADB_AUTO_COLLECT = false  # required state; runtime value not verified
PAID_SAFETY_SMOKE_READINESS = NO-GO
STAGE1_PROBE_READINESS = NO-GO
PHASE6_TECHNICAL_READINESS = NO-GO
```

**Current next action:** provide the current repository to a repository-capable
agent and complete §4–§6 offline closure. Do not start collecting data.

---

## 2. Canonical status vocabulary

| Status | Exact meaning |
|---|---|
| `DOC_ALIGNED` | Plan and Log express the same current rule; no code claim |
| `REPO_REQUIRED` | The rule is documented, but repository evidence is required before implementation status can advance |
| `NOT_INSPECTED` | Repository evidence has not been examined |
| `NOT_RUN` | A required test or gate procedure has not been executed on the current implementation |
| `CODED_STANDALONE` | Code exists but production caller/wiring is not proven |
| `UNIT_TESTED` | Focused deterministic unit test passed on recorded commit |
| `PRODUCTION_WIRED` | Real production caller and schema/config path proven |
| `OFFLINE_INTEGRATION_TESTED` | Production path passed required offline/integration cases |
| `LIVE_BLOCKED` | Live/provider evidence is required but sequence/prerequisites are unmet |
| `LIVE_VERIFIED` | Current live evidence ID, timestamp, account/channel, commit/config hash, and result are recorded |
| `INSUFFICIENT_SAMPLE` | No rule failed, but pre-frozen evidence minimum was not met; never PASS |
| `FAIL` | A pass criterion failed; affected path stops |
| `MISMATCH` | Billing/accounting/manifest/protocol identity disagrees; paid work pauses |
| `DOC_CONFLICT` | Plan/Log disagree; affected path stops until corrected |
| `BLOCKED_HUMAN` | Specific owner authorization/legal/retention decision is missing |
| `BLOCKED_NOT_AUTHORIZED` | A paid or mutating action lacks an exact, unexpired human authorization record |
| `BLOCKED_OFFLINE_AND_LIVE_EVIDENCE` | Both repository closure and current external/account evidence are missing |
| `BLOCKED_REFERENCE` | A required external frame/reference artifact is missing or not licensed/verified |
| `RUNTIME_NOT_VERIFIED` | The required runtime/configuration state was not observable in this audit |
| `NOT_MEASURABLE_REPOSITORY_UNAVAILABLE` | A repository-dependent counter cannot be calculated because the repository was not supplied |

Status advancement is monotonic only for the same commit, schema, config,
provider pin, and evidence scope. A relevant change invalidates dependent PASS
states and returns them to the appropriate earlier state.

---

## 3. Traceability to the 104-requirement implementation-agent prompt

**Audit-count clarification.** The preserved older material explicitly contains the A30 77-item adjudication and an 88-component walkthrough, while this final ledger carries 104 normalized implementation requirements plus TEST-001–028. The supplied files do not contain an authoritative literal 106-item master checklist, so this Log does not pretend that a separate “106” list was independently passed. Instead, closure is by requirement identity and rule coverage: every current binding Plan rule must map into the 104-row matrix, reverse map, tests, registry/schema/lineage, and scanner with zero unmapped items. Old row numbers such as 56 or 84 are provenance labels, not extra executable requirements.


This table intentionally preserves all 104 requirement IDs. `DOC_ALIGNED`
means the binding Plan + PART-A current layer contain the rule; it never means implemented.
`REPO_REQUIRED` means no current repository evidence was supplied.

| ID | Requirement summary | Plan owner | Current state |
|---:|---|---|---|
| 001 | Plan is binding authority | §0 | `DOC_ALIGNED` |
| 002 | Log is evidence ledger, not override | §0 | `DOC_ALIGNED` |
| 003 | No redesign/V3.10 without contradiction evidence | §0/§20 | `DOC_ALIGNED` |
| 004 | PRE and AIRBORNE/POST remain separate | §2/§6.1 | `DOC_ALIGNED; REPO_REQUIRED` |
| 005 | Auto-collect remains false offline | §16–§17 | `DOC_ALIGNED; RUNTIME_NOT_VERIFIED` |
| 006 | Offline pass performs no paid/live work | §17 | `DOC_ALIGNED` |
| 007 | Repository-unavailable result is explicit | Log §0.2 | `REPOSITORY_ACCESS_UNAVAILABLE` |
| 008 | Repository scope cannot excuse offline gaps | §0/§17 | `DOC_ALIGNED` |
| 009 | Record branch, HEAD, and worktree | — | `REPO_REQUIRED` |
| 010 | Inventory production routes/controllers/schedulers | §15/§17 | `REPO_REQUIRED` |
| 011 | Inventory schema/migrations including 0024/0025 | §15/§21 | `REPO_REQUIRED` |
| 012 | Inventory tests/typecheck/lint/build | §17 | `REPO_REQUIRED` |
| 013 | Complete requirement→code→test matrix | §17 | `REPO_REQUIRED` |
| 014 | Complete reverse code→Plan map | §17 | `REPO_REQUIRED` |
| 015 | Keep status levels distinct | §0 | `DOC_ALIGNED` |
| 016 | File/helper existence is not implementation | §0/§15 | `DOC_ALIGNED` |
| 017 | 60,000 monthly entitlement is user-confirmed, channel unknown | §3.1 | `DOC_ALIGNED; LIVE_BLOCKED` |
| 018 | API units and Alert credits are separate ledgers | §3 | `DOC_ALIGNED; REPO_REQUIRED` |
| 019 | 57,900 is maximum design ceiling, not target/formula | §3.2 | `DOC_ALIGNED; REPO_REQUIRED` |
| 020 | Protected Alert floor is 1,000 | §3.2 | `DOC_ALIGNED; LIVE_BLOCKED` |
| 021 | Per-`budget_day_id` Alert ceiling 1,900; soft margin separate; prior day settles before next | §3.3/§11.3 | `DOC_ALIGNED; REPO_REQUIRED` |
| 022 | Exact Phase-6 Alert ceiling formula | §3.2 | `DOC_ALIGNED; REPO_REQUIRED` |
| 023 | Track unallocated Alert credits | §3.2 | `DOC_ALIGNED; REPO_REQUIRED` |
| 024 | SEND-aware billing and failed attempts | §3/§11 | `DOC_ALIGNED; REPO_REQUIRED` |
| 025 | Reservations and unsettled-burst margin | §3.2–§3.3 | `DOC_ALIGNED; REPO_REQUIRED` |
| 026 | Settled overshoot is MISMATCH/stop/reconcile | §3.2/§11.3 | `DOC_ALIGNED; REPO_REQUIRED` |
| 027 | REST categories stay in API-unit ledger | §3/§5.4 | `DOC_ALIGNED; REPO_REQUIRED` |
| 028 | Generate exact seven-category REST budget | §5.4 | `DOC_ALIGNED; REPO_REQUIRED` |
| 029 | Production FIDS airport endpoint | §5.1 | `DOC_ALIGNED; REPO_REQUIRED` |
| 030 | Frozen FIDS query parameters | §5.1 | `DOC_ALIGNED; REPO_REQUIRED` |
| 031 | `withLeg` requested-airport primary role | §5.1 | `DOC_ALIGNED; REPO_REQUIRED` |
| 032 | Opposite movement cannot double-count | §5.1 | `DOC_ALIGNED; REPO_REQUIRED` |
| 033 | Append-only population observations | §5/§5.1 | `DOC_ALIGNED; REPO_REQUIRED` |
| 034 | Query/version/hash/canonicalization provenance | §5.1 | `DOC_ALIGNED; REPO_REQUIRED` |
| 035 | Latest qualifying `available_at≤cutoff` membership | §5.2 | `DOC_ALIGNED; REPO_REQUIRED` |
| 036 | No later FIDS backfill of earlier cutoff | §5.2 | `DOC_ALIGNED; REPO_REQUIRED` |
| 037 | Measured/frozen acquisition guard | §5.2/§6.6 | `DOC_ALIGNED; LIVE_BLOCKED` |
| 038 | Pre-frozen non-adaptive refresh grid | §5.2 | `DOC_ALIGNED; REPO_REQUIRED` |
| 039 | Staleness ceiling and unobserved state | §5.2 | `DOC_ALIGNED; LIVE_BLOCKED` |
| 040 | Internal half-open interval; measure provider boundary/range | §5.1 | `DOC_ALIGNED; LIVE_BLOCKED` |
| 041 | Record-class timestamp applicability | §6.4 | `DOC_ALIGNED; REPO_REQUIRED` |
| 042 | `lastUpdatedUtc` only where supplied | §5.1/§6.4 | `DOC_ALIGNED; REPO_REQUIRED` |
| 043 | Location clock independent of state-update clock | §6.4 | `DOC_ALIGNED; REPO_REQUIRED` |
| 044 | Provider and system clocks remain separate | §6.1/§6.4 | `DOC_ALIGNED; REPO_REQUIRED` |
| 045 | Durable raw webhook before successful 2xx | §6 | `DOC_ALIGNED; REPO_REQUIRED` |
| 046 | Delivery/item/semantic layers remain distinct | §6 | `DOC_ALIGNED; REPO_REQUIRED` |
| 047 | Mutable dedup cannot be raw/event identity | §6/§6.2 | `DOC_ALIGNED; REPO_REQUIRED` |
| 048 | Stable physical-flight identity across retimes | §7.1 | `DOC_ALIGNED; REPO_REQUIRED` |
| 049 | Conservative codeshare/distinct-leg resolution | §7.1–§7.2 | `DOC_ALIGNED; REPO_REQUIRED` |
| 050 | Report ambiguity; do not count as confirmed | §7.1–§7.2/§9.1 | `DOC_ALIGNED; REPO_REQUIRED` |
| 051 | `revisedTime`/`runwayTime` are not automatically actual | §6.2–§6.3 | `DOC_ALIGNED; REPO_REQUIRED` |
| 052 | Require semantic and actuality verification for aliases | §6.2–§6.3 | `DOC_ALIGNED; LIVE_BLOCKED` |
| 053 | Selected T is provider-native or BLOCKED | §6.0 | `DOC_ALIGNED; LIVE_BLOCKED` |
| 054 | Frozen traffic reference; missing→UNCLASSIFIED | §4.1 | `DOC_ALIGNED; BLOCKED_REFERENCE` |
| 055 | Frozen country/override map; missing→UNMAPPED | §4.2 | `DOC_ALIGNED; BLOCKED_REFERENCE` |
| 056 | Positive REGIONAL traffic prior | §8.6 | `DOC_ALIGNED; REPO_REQUIRED` |
| 057 | Integrate `m_i`; initial value 1.0 | §8.2/§8.6 | `DOC_ALIGNED; REPO_REQUIRED` |
| 058 | Missing production `m_i` fails closed | §8.2/§8.6 | `DOC_ALIGNED; REPO_REQUIRED` |
| 059 | Deterministic EMA/cap/floor/zero-yield FSM | §8.2–§8.6 | `DOC_ALIGNED; REPO_REQUIRED` |
| 060 | Efficiency allocation, no automatic `1/p` | §8/§14 | `DOC_ALIGNED; REPO_REQUIRED` |
| 061 | Anchor score and yield-reference terminology | §8/§9.2 | `DOC_ALIGNED; REPO_REQUIRED` |
| 062 | Probe cap is censoring/exposure metadata | §9 | `DOC_ALIGNED; REPO_REQUIRED` |
| 063 | Complete solver-generated 31-batch-day calendar | §8.7 | `DOC_ALIGNED; REPO_REQUIRED` |
| 064 | Exactly five crossover pairs, 3+2 composition | §8.7 | `DOC_ALIGNED; REPO_REQUIRED` |
| 065 | Freeze pair shapes; randomize order only | §8.7 | `DOC_ALIGNED; REPO_REQUIRED` |
| 066 | ≥24h end-to-start washout and same split | §8.7 | `DOC_ALIGNED; REPO_REQUIRED` |
| 067 | `crossover_group_id` is paired block | §8.7 | `DOC_ALIGNED; REPO_REQUIRED` |
| 068 | Hard constraints precede soft objective; UNSAT closes | §8.7–§8.8 | `DOC_ALIGNED; REPO_REQUIRED` |
| 069 | PRE rows exist for population+horizon eligible flights | §5/§12.2 | `DOC_ALIGNED; REPO_REQUIRED` |
| 070 | Missing features stay missing; rows are not dropped | §5/§12.2 | `DOC_ALIGNED; REPO_REQUIRED` |
| 071 | AIRBORNE denominator independent of capture | §7.5 | `DOC_ALIGNED; LIVE_BLOCKED` |
| 072 | Historical features are bitemporal/as-of | §12.2 | `DOC_ALIGNED; REPO_REQUIRED` |
| 073 | Weather is as-known-at-cutoff | §10/§12.2 | `DOC_ALIGNED; REPO_REQUIRED` |
| 074 | ERA5 is not operational fallback | §10.1 | `DOC_ALIGNED; REPO_REQUIRED` |
| 075 | 30 days is retrieval depth, not retention right | §10.2 | `DOC_ALIGNED` |
| 076 | Target-specific terminalization/status | §7.3–§7.4 | `DOC_ALIGNED; REPO_REQUIRED` |
| 077 | +30/+120/+360 recovery; final +24h deadline | §7.4 | `DOC_ALIGNED; REPO_REQUIRED` |
| 078 | Coalesce recovery and generate category budget | §7.4/§5.4 | `DOC_ALIGNED; REPO_REQUIRED` |
| 079 | Raw retention remains blocked pending terms | §10.2 | `DOC_ALIGNED; BLOCKED_HUMAN` |
| 080 | Derived-Work classification is explicit | §10.2 | `DOC_ALIGNED; BLOCKED_HUMAN` |
| 081 | Primary result is `UNKNOWN_NOT_OBSERVED` before the protected read; post-read classification is positive/neutral/negative | §13.2 | `DOC_ALIGNED; REPO_REQUIRED` |
| 082 | Month 1 is an early pilot, not deployment proof | §13 | `DOC_ALIGNED` |
| 083 | Engine E remains deferred | §6.2/§13 | `DOC_ALIGNED; REPO_REQUIRED` |
| 084 | Freeze split rule; materialize/hash rows after collection | §13 | `DOC_ALIGNED; REPO_REQUIRED` |
| 085 | Protected test cannot tune anything | §13 | `DOC_ALIGNED; REPO_REQUIRED` |
| 086 | Sample curves and cost curves stay separate | §14 | `DOC_ALIGNED; REPO_REQUIRED` |
| 087 | Validate migrations 0024/0025 in real runner | §21/Log §6 | `REPO_REQUIRED` |
| 088 | Implement/verify TEST-001 through TEST-028 | Log §6 | `REPO_REQUIRED` |
| 089 | Test withLeg/cutoff/grid/no-backfill | §5/Log §6 | `REPO_REQUIRED` |
| 090 | Test Location independence and actuality guard | §6/Log §6 | `REPO_REQUIRED` |
| 091 | Test snapshots/history/weather/terminalization/identity/raw ack | §6–§12/Log §6 | `REPO_REQUIRED` |
| 092 | Test `m_i`/FSM/floor/missing fail-closed | §8/Log §6 | `REPO_REQUIRED` |
| 093 | Test SEND-no-receive/canary/caps/second-start/Gate 4 | §11/Log §6 | `REPO_REQUIRED` |
| 094 | Test calendar SAT/UNSAT/pairs/washout/split/replay | §8/Log §6 | `REPO_REQUIRED` |
| 095 | Run full tests/typecheck/lint/build with exit codes | Log §4/§6 | `REPO_REQUIRED` |
| 096 | Complete canonical registry | Log §5 | `REPO_REQUIRED` |
| 097 | Zero unmapped items in both traceability directions | Log §5 | `REPO_REQUIRED` |
| 098 | Complete dictionary and lineage | Log §5 | `REPO_REQUIRED` |
| 099 | Run contradiction scanner as failing preflight | Plan §18/Log §10 | `DOC_SCANNER_PASS; REPO_SCANNER_REQUIRED` |
| 100 | Update current Log in place with actual evidence | Log §9 | `HANDOFF_RULE` |
| 101 | Keep live/human items blocked until evidence | §16–§17 | `DOC_ALIGNED; LIVE_BLOCKED` |
| 102 | Do not enable auto-collect after offline closure alone | §17 | `DOC_ALIGNED` |
| 103 | End with exact counter/status block | Log §1 | `PRESENT_WITH_TRUTHFUL_UNAVAILABLE_STATES` |
| 104 | Offline target is zero, then stop design changes | §0/§17 | `DOC_ALIGNED; REPO_REQUIRED` |

The mapping count is exactly 104. No requirement is omitted; none is marked
implemented without evidence.

---

## 4. Repository intake and offline closure procedure

This phase performs no paid/provider mutation and keeps auto-collection off.
Do not assume npm, TypeScript, a particular framework, or any historical path;
discover the actual project first.

### 4.1 Intake record

Record one `REPO-INTAKE-YYYYMMDD-###` with:

| Field | Required evidence |
|---|---|
| Repository identity | absolute root, remote (redacted if private), branch, HEAD |
| Working tree | full status; distinguish user changes from agent changes |
| Runtime/toolchain | language/runtime/package-manager/lockfile versions |
| Production entry points | HTTP service, webhook route, scheduler/worker, startup path |
| Configuration | canonical owners/defaults; values redacted; auto-collect proof |
| Database | engine, migration runner, applied schema, fresh/upgrade fixtures |
| Provider clients | all AeroDataBox/Weather callers and actual production consumers |
| Test/build interfaces | complete commands discovered from project config |
| Existing evidence | artifacts with hashes; never accept prose alone |

If the source repository is still unavailable, write exactly
`REPOSITORY_ACCESS_UNAVAILABLE`, leave all dependent statuses blocked, and do
not append implementation claims.

### 4.2 Offline sequence

1. Inventory every production path and configuration owner.
2. Build the requirement matrix and reverse map before editing.
3. Compare current schema to Plan data contracts; identify migration gaps.
4. Implement P0 in dependency order: retention/security lifecycle; raw ingress;
   FIDS population; clocks/identity; milestone guards; history/weather;
   PRE/AIRBORNE snapshots; terminalizer/recovery; accounting/watchdog; solver.
5. Implement P1: final frame inputs, anchor/adaptation integration, protected
   split, registry/dictionary/lineage/scanner.
6. Run TEST-001–028, fresh/upgrade/repeat migration tests, full suite,
   typecheck, lint, and production build.
7. Record exact commands, start/end UTC, exit codes, skipped tests, warnings,
   artifact hashes, and commit/config/schema hashes.
8. Regenerate exact counters. Any nonzero/unknown offline counter keeps every
   paid action NO-GO.

No offline test may make a real provider call unless it is separately labeled
and authorized as a later live gate. Mocks/fixtures must preserve provider
semantics and record their source/version.

### 4.3 Required repository command surface (first-class deliverable)

The implementation agent MUST create or verify one canonical command surface instead of leaving operators to remember ad-hoc filenames. If the repository is Node/TypeScript, use these exact package-script names; if it uses another toolchain, provide equivalent commands with the same semantics and record the mapping in `REPO-INTAKE`. A command that does not exist is a blocker, not an invitation to improvise.

```text
v39:repo-intake            read-only repository/config/schema inventory
v39:preflight              aggregate fail-closed offline preflight
v39:migrate:check          fresh + upgrade + repeat migration verification
v39:test:offline           TEST-001–028 only; zero provider calls
v39:test:full              complete project suite
v39:typecheck              project typecheck
v39:lint                   project lint
v39:build                  production build
v39:registry:check         canonical rule/config registry completeness
v39:traceability:check     requirement→code→test and code→requirement exact-zero check
v39:scanner                document + repository contradiction scanner
v39:frame:build            rebuild measured stratified catalog after frozen references
v39:calendar:solve         produce/verify SAT calendar and hash
v39:gate0:inspect          read-only account/channel/quota/cap evidence
v39:security:verify        retention/security lifecycle tests
v39:smoke:safety           specifically authorized tiny production-path safety smoke
v39:probe:stage1           specifically authorized bounded Stage-1 anchor probe
v39:probe:stage2           specifically authorized bounded Stage-2 confirmation
v39:gate3:canary           official isolated credit canary
v39:gate05:pilot           dedicated content/clock/T/target/cadence pilot
v39:gate4:live-check       small authorized scaled reconciliation/second-start check
v39:gate5:population       population-observability validation
v39:freeze                 write/hash manifest after all prerequisites PASS
v39:phase6:start           final authorized transition only; must refuse otherwise
v39:phase6:pause           immediate safe pause + auto-collect false
v39:phase6:status          read-only balances/subscriptions/watchdog/run state
v39:reports:index          verify report/evidence file references and hashes
```

Every paid/mutating command MUST accept an authorization record ID, refuse if it is absent/expired/mismatched, print the resolved ceilings before SEND, and write its evidence to the separate reports/evidence file described in §9.1. `v39:phase6:start` MUST NOT exist as an unguarded shortcut.

### 4.4 Canonical code-location and script plan

Repository discovery decides the exact paths, but the following responsibilities are mandatory first-class production components. Reuse a proven existing module when it truly owns the responsibility; otherwise create a clearly named component. The requirement matrix records the final path/function.

| Responsibility | Required production owner | Required script/CLI owner | Minimum proof |
|---|---|---|---|
| Raw webhook ingress/auth/persist-before-2xx | webhook route + raw ingress service | fixture/replay command | TEST-006/007 + integration artifact |
| FIDS population acquisition/range/DST/retry | provider client + FIDS census service | `v39:gate5:population`, frame inputs | TEST-001–004 |
| Canonical flight identity/codeshare/retime | identity service | identity fixture runner | TEST-008 |
| OOOI/milestone/T mapping | milestone normalizer | Gate-0.5 pilot analyzer | TEST-009 |
| PRE snapshots | snapshot builder | offline materializer/replay | TEST-011/013/014 |
| AIRBORNE points/trajectory/snapshots | airborne event + trajectory pipeline | cadence/trajectory diagnostics | TEST-012 + cadence cases |
| Outcome terminalization/recovery | outcome service + recovery scheduler | recovery fixture/runner | TEST-015 |
| `m_i`, zero-yield, coverage floor | sampling/adaptation controller | deterministic replay | TEST-016 |
| Calendar/crossover solver | scheduler/solver | `v39:calendar:solve` | TEST-017 |
| Anchor probe scoring/censoring/caps | probe controller | `v39:probe:stage1/2` | TEST-018 |
| Credit/accounting/settlement/watchdog | ledger + watchdog | Gate-3/4/status commands | TEST-019–021 |
| Security/retention/expiry | retention/security service | `v39:security:verify` | TEST-022 |
| History/weather as-known joins | feature store + weather service | offline replay | TEST-013/014/023 |
| Protected split/evaluation freeze | split/manifest service | `v39:freeze` | TEST-024/025 |
| Traceability/registry/dictionary/lineage | audit metadata | preflight checks | TEST-026/027 |
| Contradiction/regression scanner | scanner module | `v39:scanner` | TEST-028 + seeded bad fixtures |

Scripts are not secondary utilities. Each script must call the same production services used by the real runtime, or explicitly state that it is a read-only verifier. A script that reimplements business rules separately is a P1 divergence risk and cannot close a gate.

### 4.5 Safe shell command sequence for repository closure

Run from the repository root. These commands are intentionally read-only until the implementation agent reaches the explicit implementation step. Do not paste secrets into shell history.

```bash
set -euo pipefail
export ADB_AUTO_COLLECT=false
printf 'repo=%s\n' "$(pwd)"
git branch --show-current
git rev-parse HEAD
git status --short
git remote -v | sed -E 's#(https?://)[^/@]+@#\1<redacted>@#g'

# Discover the actual toolchain and command surface.
find . -maxdepth 2 -type f \
  \( -name package.json -o -name package-lock.json -o -name pnpm-lock.yaml \
     -o -name yarn.lock -o -name pyproject.toml -o -name requirements.txt \
     -o -name Cargo.toml -o -name go.mod \) -print

# Node/TypeScript repositories: inspect, do not assume scripts exist.
if [ -f package.json ]; then
  node --version
  npm --version
  npm run || true
fi

# Inventory likely production/gate code without changing it.
git ls-files | grep -Ei '(aerodatabox|adb|flight|webhook|fids|snapshot|weather|migration|script|test|route|scheduler|worker|ledger|retention)' || true

# Safety proof: source/config must not enable automatic collection by default.
grep -RIn --exclude-dir=node_modules --exclude-dir=.git \
  -E 'ADB_AUTO_COLLECT|AUTO_COLLECT|phase6|57[,.]?900|1[,.]?900|maxDeliveryRetries' . || true
```

After code changes are complete and the canonical command surface exists, the operator uses this exact fail-closed sequence; stop on the first failure:

```bash
set -euo pipefail
export ADB_AUTO_COLLECT=false

npm run v39:repo-intake
npm run v39:migrate:check
npm run v39:test:offline
npm run v39:test:full
npm run v39:typecheck
npm run v39:lint
npm run v39:build
npm run v39:registry:check
npm run v39:traceability:check
npm run v39:scanner
npm run v39:preflight
```

If the repository is not npm-based, replace only the launcher (`npm run ...`) with the mapped toolchain command; the named semantics and ordering remain binding. No paid command appears in this offline block.

### 4.6 Implementation order and stop points

1. Preserve user work; branch/commit or otherwise checkpoint before edits.
2. Add/repair migrations and raw immutable/provenance foundations before higher-level features.
3. Wire production callers before claiming implementation.
4. Add scripts/CLI wrappers only after the production services exist; wrappers must reuse them.
5. Add failure/refusal tests at the same time as happy-path tests.
6. Run the offline sequence above until every repository-dependent counter is exact zero.
7. Stop. Do **not** run `gate0`, safety smoke, probes, or any provider mutation until the Log is updated with evidence and the next ordered prerequisite is authorized.

---

## 5. Canonical registries, matrices, schema, and lineage

### 5.1 Requirement matrix — one row per binding rule

Required columns:

```text
requirement_id | Plan section | exact rule | priority | owner module/function
production caller(s) | schema table/column/constraint | migration
config key/default/freeze stage | unit test | integration test | failure test
artifact/evidence ID | commit | status | live dependency | unresolved issue
```

Offline closure requires `REQUIREMENT_MATRIX_UNMAPPED=0`.

### 5.2 Reverse map — every critical production path

Every production route/controller/scheduler/worker/provider client/DB writer
must map back to one or more Plan requirements and tests. Orphan critical code
is investigated; stale production behavior is removed or made unreachable.
Offline closure requires `PRODUCTION_PATH_MODULES_NOT_WIRED=0` and no
unexplained critical path.

### 5.3 Canonical rule/config registry

For each constant/rule record:

```text
registry_id | name | value/state | units | Plan owner | code owner
source (project/provider/measured) | freeze stage | mutation rule
validation | tests | manifest field | evidence hash | status
```

At minimum include both budgets; 60,000 (only when confirmed for the actual
channel); 57,900; 1,000; 1,900; soft margin; `ending_alert_margin`;
`protected_api_floor_units`; `ending_api_margin_units`; `protected_rest_budget`;
`pre_smoke_unsettled_burst_margin_credits`; `unsettled_burst_margin_credits`;
all per-run ceilings/reservations; settlement settings; FIDS contract/attempt
policy; T/target; timestamps; identity; frame/regions; `m_i`; probe protocol;
calendar; weather/history; outcome recovery; evaluation/split; retention;
security; and auto-collect. Offline closure requires zero unmapped binding
rules.

### 5.4 Schema dictionary and lineage

The dictionary records table/column/type/nullability/key/index/constraint,
source class, semantic/effective/available/materialized clocks, content
classification, retention/expiry, producer, consumer, and tests.

Required lineage:

```text
FIDS request/query provenance → raw response (lawful retention)
  → append-only population observation → horizon membership → PRE snapshot

webhook HTTP/auth → raw delivery → raw item → processing attempt
  → semantic event/current state → airborne point/trajectory → AIRBORNE snapshot

source facts → bitemporal history/weather join → cutoff-safe feature
  → target-specific outcome → protected evaluation split

account/balance/API-unit evidence → reservation/attempt/settlement ledgers
  → gate artifact → manifest/FREEZE
```

No arrow may skip raw-before-2xx, availability, identity, role, or retention
controls.

---

## 6. Required offline test matrix (`TEST-001`–`TEST-028`)

Each ID may contain multiple parameterized cases, but every case must map to
the production owner and record an artifact. `SKIP`, `XFAIL`, or a mocked-out
assertion is not PASS unless the Plan explicitly permits it.

| Test ID | Required cases and pass condition | Current state |
|---|---|---|
| `TEST-001` | FIDS endpoint/query contract; `withLeg` requested-primary/opposite-context; no double count; cancel/codeshare/scope roles | `NOT_RUN` |
| `TEST-002` | IANA/DST conversion, provider boundary fixtures, internal `[start,end)`, overlap dedup, range splitting | `NOT_RUN` |
| `TEST-003` | Acquisition guard; slow response crosses cutoff; refresh grid; staleness; later schedule appearance; no future backfill | `NOT_RUN` |
| `TEST-004` | REST maximum three total attempts; retryable versus non-retryable classes; `Retry-After`; every attempt reserves/debits; cap exhaustion refuses | `NOT_RUN` |
| `TEST-005` | Record-class clocks; webhook/FIDS applicability; Location independent of `lastUpdatedUtc`; provider/system skew QC | `NOT_RUN` |
| `TEST-006` | Authentication then durable raw delivery/item commit before 2xx and within the provider's 10-second response deadline; DB failure returns non-2xx; parser failure after persistence remains recoverable | `NOT_RUN` |
| `TEST-007` | Delivery/attempt/item/semantic identities preserve retries and same-clock updates; mutable current-state upsert cannot erase trajectory | `NOT_RUN` |
| `TEST-008` | Stable physical `flight_instance_id` across <2h, ≥2h, and date-shift retimes; schedule versions append; distinct leg requires evidence; codeshare/identity ambiguity bounded | `NOT_RUN` |
| `TEST-009` | Candidate milestone mappings: ambiguous/estimated values never populate actual aliases; one ambiguous scheduled field cannot populate gate and runway; T/target block when unconstructible | `NOT_RUN` |
| `TEST-010` | Traffic/region missing→UNCLASSIFIED/UNMAPPED; all core slots dual eligible; POST-only cannot fill core/crossover; coverage failure needs confirmation | `NOT_RUN` |
| `TEST-011` | PRE snapshot exists for every population+horizon eligible flight with no webhook; optional missing values remain NULL/flagged; later revisions excluded | `NOT_RUN` |
| `TEST-012` | AIRBORNE denominator uses independent movement evidence; observation and decision clocks separate; capture-only flight cannot silently enter primary denominator | `NOT_RUN` |
| `TEST-013` | Historical bitemporal/as-of joins; input/online/materialized clocks; frozen transform replay; future values rejected | `NOT_RUN` |
| `TEST-014` | METAR/TAF/GFS/NAM as-known joins; amendment/release/valid/retrieval clocks; ERA5 cannot fill operational missingness | `NOT_RUN` |
| `TEST-015` | Target-specific terminalization; +30/+120/+360 logical recovery; physical-call coalescing; third **logical opportunity** stops recovery calls (transport retries remain max three total attempts); label stays pending to +24h; cap refusal | `NOT_RUN` |
| `TEST-016` | `m_i` production integration, deterministic EMA/clamp, missing `m_i` refusal, zero-yield FSM, provider failure not zero, coverage-floor persistence/reset | `NOT_RUN` |
| `TEST-017` | Calendar SAT fixture and deliberate UNSAT; exact 26/3/2 shapes; five 3+2 pairs; frozen contrast/order; same airports/split; seeded slot×region balance/replay ledger; no cross-cell substitution; ≥24h washout; no duplicate new anchor draw except flagged `PAIR_REPLAY`; deterministic tie-break | `NOT_RUN` |
| `TEST-018` | Probe exposure/censoring; cumulative 500-day ceiling/reservations; exactly 12 dual-eligible HUB-tier shortlist and replacement eligibility; confirmed/ambiguous yield bounds; final-five rank invariance; zero reference blocks scoring | `NOT_RUN` |
| `TEST-019` | Safety smoke/Gate-3 exact `tol=0`; ≥3 equal balance reads across frozen window; late change resets; timeout blocks; raw/item/cost reconciliation | `NOT_RUN` |
| `TEST-020` | Provider SEND charged but webhook/attempt record is unreachable or incomplete; received ledger cannot authorize more spend; late settlement reopens MISMATCH; delivery failure pauses | `NOT_RUN` |
| `TEST-021` | Scaled Gate-4 state machine (`100`, margin `10`), production arithmetic (`1900−50=1850`), budget-day/run reservations, midnight attribution, prior-day close/settlement without deleting its audit ledger, second-start refusal, owned cleanup, foreign-subscription protection | `NOT_RUN` |
| `TEST-022` | Gate-0 Alert/API identities; exact pre-run sub-caps; Phase-6 ceiling; protected floor; unallocated funds; seven REST categories; cycle rollover cannot expand frozen authorization | `NOT_RUN` |
| `TEST-023` | Terms/content-class matrix; expiry across primary/replica/backup/object/log stores; non-content tombstone; secret/raw redaction; webhook TLS, provider-supported auth or approved no-auth compensating control, replay protection; incident stop | `NOT_RUN` |
| `TEST-024` | Migrations 0024/0025 in real runner: fresh database, upgrade from prior target, repeat boot/idempotency, indexes/constraints, forbidden raw mutation, recovery/rollback plan | `NOT_RUN` |
| `TEST-025` | Split rule frozen before tuning; actual test rows materialized/hash-protected after collection; same flight/pair grouping; protected outcomes cannot tune/read twice | `NOT_RUN` |
| `TEST-026` | Positive/neutral/negative pilot classification; Month-1 report refuses deployment/seasonal claims; negative MV allowed; sample and cost curves separate | `NOT_RUN` |
| `TEST-027` | Registry/matrix/reverse-map/dictionary/lineage completeness; every required counter reaches exact zero; stale-rule scanner fails on seeded bad phrases | `NOT_RUN` |
| `TEST-028` | Full repository suite, typecheck, lint (or truthful NOT_CONFIGURED blocker), production build, deterministic replay, exact commands/exit codes/artifact hashes | `NOT_RUN` |

Every TEST-001–028 requirement must PASS before offline closure and therefore
before any paid smoke/probe. A test may be live only when the Plan assigns it
to a live gate; these IDs are offline fixtures/failure injection by default.

---

## 7. Gate and paid-authorization state machine

```text
DOCUMENT-AUDITED
  → REPOSITORY INTAKE
  → OFFLINE COUNTERS EXACT ZERO
  → Gate 0
  → PREPAID_SECURITY_RETENTION
  → Gate 1
  → pre-probe reference freeze
  → specifically authorized safety smoke
  → Gate 2 Stage 1/2 (each covered by explicit authorization)
  → Gate 3
  → Gate 0.5
  → Gate 4
  → Gate 5
  → history/weather/retention/calendar/manifest readiness
  → FREEZE
  → separate explicit Phase-6 authorization
  → controller may enable auto-collect for the frozen run only
```

Stop at the first missing/failed/insufficient item. A later gate cannot PASS
out of order. The safety smoke is not Gate 3. Gate 0.5 is after Gate 3 and does
not authorize Phase 6.

### 7.1 Gate evidence record

Every `GATE-<id>-YYYYMMDD-###` contains:

| Field | Required value |
|---|---|
| Identity | gate/run ID, Plan version/hash, Log version, commit, schema/config/provider pins |
| Authorization | approver, exact action, account/channel, ceiling(s), start/expiry, stop owner |
| Preconditions | evidence IDs for every prior gate/offline/security/retention item |
| Inputs | frozen airport/window/query/filter/duration/sample minima/settlement settings |
| Budget | Alert reservation/ceiling, REST category/units, pre-run/day/run remainder |
| Subscriptions | before/during/after inventory; owned versus foreign; cleanup evidence |
| Execution | actual start/end, commands/interface, exit codes, provider request IDs |
| Data | notifications/items/raw persistence/unique bounds/population/snapshots/failures |
| Settlement | timestamped balance reads, stable-read reset history, external/internal reconciliation |
| Result | exactly `PASS`, `FAIL`, `INSUFFICIENT_SAMPLE`, or `BLOCKED` |
| Artifacts | immutable locations and SHA-256 hashes |
| Consequence | next permitted action or mandatory pause/recovery |

### 7.2 Human authorization is a data record, not an implication

Before every paid/mutating run, create `AUTH-YYYYMMDD-###` naming:

```text
authorized operation and gate
account/subscription channel
exact airport(s), query/filter, and window/duration
maximum Alert credits and REST units by category
start-not-before and expires-at UTC
owned-subscription prefix/tag and cleanup owner
required stop conditions
approver identity/time
Plan/preprobe/manifest hash that is authorized
```

No authorization may say “whatever is needed,” auto-extend a window, permit
unbounded retries, borrow categories, or authorize Phase 6 before FREEZE.

### 7.3 Paid-run refusal checks

Immediately before any SEND/mutation, atomically re-check:

1. prior states/gates still PASS on the current commit/config/provider pin;
2. authorization exists, matches exact run, and has not expired;
3. auto-collect remains false unless this is the final authorized Phase-6
   transition;
4. no foreign billable subscription can affect accounting;
5. all intended subscriptions are owned/tagged to this run;
6. retention/security record is current and expiry worker healthy;
7. authoritative balance/account reads and both ledgers reconcile;
8. new reservation plus worst-unsettled-burst margin fits the operation,
   pre-run/day/run ceilings, protected floor, and REST category cap;
9. webhook TLS, provider-supported auth or its approved compensating control,
   raw persistence, and the stop worker are healthy;
10. settlement/cleanup timers and a human stop owner are active.

Any false/unknown check returns `REFUSED_BEFORE_SEND` and records why.

### 7.4 Paid command invocation contract (after repository verification only)

The exact repository implementation may add provider-specific flags, but the operator-facing interface must be bounded and explicit. Examples below are **interfaces to implement/verify**, not authorization to run them now:

```bash
# Read-only Gate 0 evidence.
npm run v39:gate0:inspect -- --evidence-id GATE-0-YYYYMMDD-001

# Paid/mutating stages require a pre-existing exact authorization record.
npm run v39:smoke:safety -- --auth AUTH-YYYYMMDD-001 --evidence-id RUN-YYYYMMDD-001
npm run v39:probe:stage1 -- --auth AUTH-YYYYMMDD-002 --evidence-id RUN-YYYYMMDD-002
npm run v39:probe:stage2 -- --auth AUTH-YYYYMMDD-003 --evidence-id RUN-YYYYMMDD-003
npm run v39:gate3:canary -- --auth AUTH-YYYYMMDD-004 --evidence-id GATE-3-YYYYMMDD-001
npm run v39:gate05:pilot -- --auth AUTH-YYYYMMDD-005 --evidence-id GATE-05-YYYYMMDD-001
npm run v39:gate4:live-check -- --auth AUTH-YYYYMMDD-006 --evidence-id GATE-4-YYYYMMDD-001
npm run v39:gate5:population -- --auth AUTH-YYYYMMDD-007 --evidence-id GATE-5-YYYYMMDD-001

# FREEZE is allowed only after all prerequisite evidence is PASS.
npm run v39:calendar:solve
npm run v39:freeze -- --evidence-id FREEZE-YYYYMMDD-001

# Phase 6 needs a separate authorization for the exact frozen manifest/hash.
npm run v39:phase6:start -- --auth AUTH-YYYYMMDD-FINAL --manifest-sha256 '<exact hash>'
```

Each mutating command MUST print a dry resolved plan first (airport/filter/window, Alert ceiling, REST-unit ceiling by category, authorization expiry, owned-subscription prefix, stop conditions), then require the authorization record to match it exactly. There is no `--force`, `--yes`, wildcard airport, unbounded duration, or automatic continuation flag. Any mismatch returns nonzero before SEND.

---

## 8. Current gate board

Historical runs are deliberately excluded from current PASS state. Only evidence recorded against PART A of this Log may alter this table.

| State | Current result | Evidence needed to advance |
|---|---|---|
| Offline closure | `BLOCKED` | Repository intake; exact-zero counters; TEST-001–028; migrations/build |
| Gate 0 | `BLOCKED` | Current channel/cycle/quota/balance/refill/caps; exact Alert/API trees |
| Prepaid security/retention | `BLOCKED` | Gate-0 channel/Terms; content classes; licensed references; deletion/security tests before Gate-1 storage |
| Gate 1 | `BLOCKED` | Security/retention PASS + current provider coverage + licensed traffic/region artifacts and hashes |
| Pre-probe freeze | `BLOCKED` | Exactly 12 dual-eligible HUB-tier candidates (including WSSS/OMAA), ordered replacements, references/formulas/protocol/sub-caps/authorization schema |
| Safety smoke | `BLOCKED_NOT_AUTHORIZED` | All above + exact AUTH record + bounded production-path run |
| Gate 2 | `BLOCKED` | Smoke PASS; all Stage-1/2 authorizations/results; rank-invariant final five |
| Gate 3 | `BLOCKED` | Official exact canary with shared settlement rule and cleanup |
| Gate 0.5 | `BLOCKED` | Adequate dedicated pilot; clocks/T/target/cadence/recovery semantics |
| Gate 4 | `BLOCKED` | Offline scaled cases + small authorized live reconciliation/second-start check |
| Gate 5 | `BLOCKED` | Role-safe population/snapshot/capture/outcome funnel evidence |
| Calendar/readiness | `BLOCKED` | SAT calendar, exact budgets, history/weather/retention readiness |
| FREEZE | `BLOCKED` | Complete hash-stable manifest/scanner/split rule and all prior PASS |
| Phase 6 | `NO-GO` | Separate authorization for the exact frozen manifest/run |

### 8.1 When the operator must stop and bring back evidence

There is no arbitrary “come back within X minutes” scientific requirement. The timing rule is **state-based**: do not start the next paid stage until the previous run is stopped, its subscription is deleted/inactive, settlement reaches the frozen stable-read condition, the external/internal ledgers reconcile, and the required report is written. A long human gap after a fully settled/closed stage does not invalidate the data by itself; starting the next matched-time probe outside its frozen `time_class`/`weekday_class`, crossing an authorization expiry, or letting reference/config/provider state change without recheck can invalidate comparability.

Use these handoff points:

1. **After offline closure:** return with the repository audit/preflight evidence before any paid smoke.
2. **After the safety smoke settles:** return with its report before Stage 1; this run freezes the measured unsettled-burst reserve used by the probes.
3. **During Stage 1:** the deterministic runner may continue to the next candidate only when the current probe is closed/settled and the same authorization/protocol still valid. Stop and return immediately on FAIL, `INSUFFICIENT_SAMPLE` that affects ranking, cap mismatch, provider change, or authorization expiry.
4. **After all valid Stage-1 candidates/replacements are complete:** return with the ranking/evidence before Stage 2 promotion if a human/reviewer is validating the final top-five decision.
5. **After Stage 2 / Gate 2 settles:** return before Gate 3.
6. **After each Gate 3, Gate 0.5, Gate 4, and Gate 5 result:** return before the next gate, especially on anything other than PASS.
7. **After FREEZE:** return with the final manifest/hash. Phase 6 still requires separate explicit authorization; do not turn auto-collect on merely because FREEZE exists.

The separate reports/evidence file is the handoff artifact. Do not paste only a verbal summary when hashes, balances, commands, and gate results exist.

---

## 9. Implementation/change record format

Use one `LOG-YYYYMMDD-###` per coherent change. The following 59 fields are
retained because they cover the prior 56/84/100+ audit expansions without
inventing evidence. Write `N/A — reason` where genuinely inapplicable; never
leave a required field blank.

| # | Field | # | Field |
|---:|---|---:|---|
| 1 | Entry ID | 31 | Inputs |
| 2 | UTC date/time | 32 | Outputs |
| 3 | Local date/time/timezone | 33 | Side effects |
| 4 | Git SHA before | 34 | Data flow |
| 5 | Git SHA after | 35 | Timestamp semantics |
| 6 | V3.9 phase | 36 | Units/budget ledger |
| 7 | Gate | 37 | Provenance implications |
| 8 | Workstream | 38 | Sampling implications |
| 9 | Requirement IDs | 39 | Population implications |
| 10 | Plan sections | 40 | Label implications |
| 11 | Human-readable title | 41 | Leakage implications |
| 12 | Problem | 42 | Evaluation implications |
| 13 | Scientific impact | 43 | Credit/API-unit implications |
| 14 | Operational impact | 44 | Failure modes considered |
| 15 | Reproducibility impact | 45 | Recovery behavior |
| 16 | Previous documented behavior | 46 | Tests added/changed |
| 17 | Previous actual behavior/evidence | 47 | Commands executed |
| 18 | Intended final behavior | 48 | Exact exit codes |
| 19 | Files inspected | 49 | Expected result |
| 20 | Files modified | 50 | Observed result |
| 21 | Modules/functions modified | 51 | Artifact locations |
| 22 | Tables/columns/constraints | 52 | Artifact SHA-256 hashes |
| 23 | Migration IDs | 53 | Seeds/versions/hashes affected |
| 24 | Config/env owners (no secrets) | 54 | Priority/status classification |
| 25 | External APIs | 55 | Reversibility/rollback |
| 26 | Implementation approach | 56 | Manifest fields affected |
| 27 | Step-by-step logic | 57 | Unresolved issues |
| 28 | Representative before excerpt | 58 | Next required action |
| 29 | Representative after excerpt | 59 | Final status + reviewer/approval |
| 30 | Authorization/security/retention impact |  |  |

Do not paste secrets, authorization headers, raw provider payloads, or personal
data into this Log. Evidence artifacts may be access-controlled and referenced
by hash.

### 9.0 Completed document-audit entry

This is a documentation-only change record. It records the correction and
cross-check performed in this workspace; it is **not** an implementation,
provider-call, legal approval, or paid-readiness record. All 59 fields from the
format above are populated below; `N/A — reason` is intentional where no
repository or live system was available.

```yaml
entry_id: LOG-20260902-002
utc_datetime: 2026-09-02T07:46:03Z
local_datetime_timezone: 2026-09-02T00:46:03-07:00 America/Los_Angeles
git_sha_before: N/A — repository unavailable
git_sha_after: N/A — repository unavailable
v39_phase: document correction / pre-freeze
gate: DOCUMENT-AUDIT (no operational gate passed)
workstream: Plan/Log consistency, provider-source, and safety audit
requirement_ids: 001–104; TEST-001–028 matrix
plan_sections: Plan §§0–21; Log §§0–11
title: Final full Implementation Log merge and execution-safety audit
problem: Prior artifacts mixed historical instructions, unverified implementation claims, and live/provider assumptions.
scientific_impact: Protects population denominators, cutoff availability, identity, labels, and preregistered evaluation.
operational_impact: Makes paid work fail closed until repository, account, retention, and ordered gates are evidenced.
reproducibility_impact: Preserves source pins, explicit freeze points, evidence IDs, hashes, and deterministic rules.
previous_documented_behavior: Historical mixed Plan/Log content and stale scanner expectations.
previous_actual_behavior_evidence: Not established; no source repository or runtime was supplied.
intended_final_behavior: Normative Plan plus full Log whose PART A is evidence/execution authority and PART B is preserved non-executable reference/history.
files_inspected: Working Plan/Log plus supplied closure prompts/reports and current provider/research sources.
files_modified: IMPLEMENTATION_LOG_V3.9-f.8_FINAL_FULL_EXECUTION_SAFE.md (merged full Log); Plan and reports/evidence file used as authoritative/supporting inputs and not modified by this merge.
modules_functions_modified: N/A — no repository supplied
tables_columns_constraints: Documented contracts only; no database schema was inspected or changed.
migration_ids: 0024 and 0025 remain required and unverified.
config_env_owners: ADB_AUTO_COLLECT required false; runtime value not observable.
external_apis: AeroDataBox OpenAPI/FIDS/Flight Alert; AeroDataBox Terms/pricing; AviationWeather; cited research.
implementation_approach: Merge the current execution-safe rules into the full legacy manual, preserve history behind a hard non-executable boundary, and fail closed.
step_by_step_logic: Inspect both Log editions → preserve full reference/history → install current PART-A authority → externalize new reports → run deterministic merged-file audit → record blockers.
representative_before_excerpt: The 3,245-line prior Log mixed useful reference/history with stale current-status and command claims.
representative_after_excerpt: PART_A=READY_FOR_REPOSITORY_IMPLEMENTATION_AUDIT; PART_B=NON_EXECUTABLE_REFERENCE; PAID/PHASE6=NO-GO.
authorization_security_retention: No paid/mutating action performed; prepaid security/retention remains blocked.
inputs: Uploaded Markdown/reports/prompts, source links in Plan §19, and rechecked official provider pages.
outputs: Final full execution-safe Plan (input authority), this final full execution-safe Log, and separate run-report/evidence file in the working directory.
side_effects: None outside document-file updates; no provider/account/database mutation.
data_flow: N/A — no experiment data collected.
timestamp_semantics: Provider, delivery, location, receipt, persistence, availability, and materialization clocks remain distinct.
units_budget_ledger: Alert credits and REST/API units are separate; the 60,000 figure is channel-conditional; pre-smoke and measured unsettled-burst reserves, SEND-aware settlement, 1,900/day, 500 probe-day, and 57,900 maximum are guarded rules.
provenance_implications: Raw-before-2xx, immutable layers, source hashes, retention classification, and expiry controls are required.
sampling_implications: Dual PRE+POST core eligibility, explicit tier/region maps, finite anchor shortlist, and solver calendar are required.
population_implications: Provider-observable FIDS population is separate from webhook capture; POST denominator is independent of capture.
label_implications: Target-specific actual milestones, recovery opportunities, grace, pending, missing, and censoring rules are explicit.
leakage_implications: Every feature requires information availability by cutoff; later materialization/backfill cannot change knowledge.
evaluation_implications: Engine-A MAE comparison and pilot classification are preregistered; protected test remains unread.
credit_api_unit_implications: Provider SEND/item/attempt costs and REST category ledgers cannot be conflated.
failure_modes_considered: SEND-without-receive, delivery failure, raw persistence failure, unsettled balance, ambiguity, stale data, and retention/security failure.
recovery_behavior: Stop/refuse/pause, preserve evidence, reconcile, and require explicit authorization before resume.
tests_added_changed: Document-only structural/consistency audit; repository TEST-001–028 remain NOT_RUN.
commands_executed: Read-only comparison of the 3,245-line prior Log with the Sep-2 execution-safe Log; deterministic merge; regex/table/fence/ID/hash checks. No repository/provider mutation.
exact_exit_codes: Merged-file structural checks exited 0; repository commands were not run because no repository was supplied.
expected_result: Merged full Log structurally consistent with a single current executable layer and preserved non-executable history; safe to hand to a repository-capable auditor; paid work blocked.
observed_result: Achieved for the Plan + PART-A current layer; repository/runtime/account/live gates remain unverified.
artifact_locations: Working files linked in final handoff; provider/research URLs in Plan §19 and Log §0.1.
artifact_sha256_hashes:
  plan_sha256: "f18225e0369506b6831c854691c5e96954a6a30b6bf329b73812ac0323da6ac7"
  log_sha256_canonical: "dcaec7da6f4a944d01ecb7dce149766db3acd1be22af9ede60bc8256f283c24e"
  reports_evidence_initial_sha256: "277d4cf34c5357a521ea15e210111664da9e809fb28aac935959f4d12424794f"
  log_sha256_canonicalization: "Replace only log_sha256_canonical with 64 ASCII zeroes, preserve UTF-8 bytes and line endings, then SHA-256 the complete Log."
seeds_versions_hashes_affected: Provider OpenAPI v1.15.3.0/hash pinned; no experiment seed or repository commit exists.
priority_status: P0/P1 document audit; DOCUMENT_AUDITED; REPOSITORY_ACCESS_UNAVAILABLE; paid NO-GO.
reversibility_rollback: Document edits are reversible from the supplied originals; no external mutation occurred.
manifest_fields_affected: None frozen; required account/frame/calendar/retention/measurement fields remain blocked.
unresolved_issues: Repository, code, migrations, tests, account/channel/Plan Terms, licensed references, measured frame, Gate evidence, and manifest.
next_required_action: Supply the current repository; complete offline closure, then current account/Terms evidence and ordered live gates.
final_status_reviewer: DOCUMENT_AUDITED; no human paid authorization; reviewer = ChatGPT GPT-5.6 Sol document merge audit.
```

### 9.1 Reports and run evidence live in a separate file

Do **not** append run reports, daily narratives, raw command output, provider payloads, or long gate-result tables to this Implementation Log. They belong in `V3.9_RUN_REPORTS_AND_EVIDENCE.md` (or an equivalently named repository-tracked evidence file) so this Log stays readable.

This Log stores only the current status, evidence IDs, hashes/paths, unresolved issue, and next permitted action. Every external `RUN-YYYYMMDD-###` report records actual command/interface, sanitized arguments, commit/schema/config/manifest hashes, safe env flags, UTC start/end, authorization ID, balances/units before and after, subscriptions before/during/after, request/item/raw-row counts, failures, settlement reads, stop reason, exit code, result, and artifact hashes. Gate rows in §8 point to those IDs rather than embedding the report.

### 9.2 Issue and decision records

- `ISS-###`: severity, rule/evidence, impact, owner, dependency, status, closure
  proof, and invalidated downstream evidence.
- `DEC-###`: question, options, evidence, decision, authority, effective hashes,
  rejected alternatives, reversibility, and re-FREEZE requirement.
- A provider change is classified as `NO_IMPACT`, `CONFIG/MEASURE_TO_FREEZE`,
  `CODE_ADAPTATION_WITHIN_V3.9`, or `CONTRACT_CONTRADICTION_MINIMAL_AMENDMENT`.

---

## 10. Document and repository regression scanner

The document scanner must parse **only PART A of this Log** plus **Plan §§0–21**. It must exclude PART B of this Log and the Plan preserved-reference appendix from executable-rule contradiction counts; both are provenance/reference only. It must fail on:

- unclosed fences, malformed tables, duplicate anchors, or invalid section
  references;
- `tol=3`, `one row = one credit`, fixed spend 57,900, automatic `1/p`,
  UNCLASSIFIED→REGIONAL, UNMAPPED→a region, capture-gated PRE rows, forced T
  fallback, estimate→actual aliases, `lastUpdatedUtc` dominating Location,
  ERA5 operational fallback, generic five-state outcomes, Month-1 deployment
  claims, Engine-E activation, two-read settlement, “3 retries” ambiguity,
  ≥2h retime→new physical flight, POST-only core-slot substitution, or
  auto-collect enabled before authorization;
- Plan/Log disagreement in constants, gate order, status, or filenames.

The repository scanner must additionally compare registry constants, schema,
production call graph, commands, tests, and manifest fields. Seed at least one
known-bad fixture per forbidden rule and prove the scanner fails. A scanner
that only searches old phrases without parsing current contexts is diagnostic,
not closure evidence. The document scanner must exempt this section's quoted
forbidden-rule lexicon and explicit negations/prohibitions; it fails only when
a stale rule appears as an executable/current rule, not when the guard itself
mentions the stale wording.

Current result:

```text
DOCUMENT_SCANNER = PASS
KNOWN_DOCUMENT_CURRENT_CURRENT_CONTRADICTIONS = 0
REPOSITORY_SCANNER = NOT_RUN_REPOSITORY_UNAVAILABLE
SUPPLIED_HISTORICAL_SCANNER = NOT_RUN_HISTORICAL_PATHS_AND_SECTIONS
```

`AUDIT-20260902-002` is the evidence ID for that result. The current-file audit checked the binding Plan core and this merged full Log after the final edits: PART A has 30/30 balanced Markdown fences; the complete full Log has 68/68 balanced fences; explicit anchors are unique; there are no tabs or trailing-whitespace lines; PART A contains exactly requirement rows 001–104 and TEST-001–028 with no missing/duplicate IDs; and the Plan/PART-A constants, gate order, filenames, and NO-GO status agree. A Markdown table containing an escaped shell pipe (`\|`) remains valid and is not a column mismatch. These checks
do not inspect a repository, runtime, provider account, or paid operation.
The uploaded historical scanner is intentionally not used as closure evidence:
it targets old paths/sections and must be replaced or adapted by the
repository-capable implementation agent before repository closure.

---

## 11. Final handoff verdict

The current Plan plus **PART A of this full Log** are ready to be used as the authoritative implementation and verification package. PART B is preserved reference/history only. This is **not** evidence that the implementation or experiment is ready.

Current truthful verdict:

```text
DOCUMENT_PACKAGE = READY_FOR_REPOSITORY_IMPLEMENTATION_AUDIT
OFFLINE_IMPLEMENTATION = NOT_ESTABLISHED
PAID_SAFETY_SMOKE = NO-GO
ANCHOR_PROBES = NO-GO
PHASE6 = NO-GO
NEXT_ACTION = PROVIDE_AND_AUDIT_CURRENT_REPOSITORY
```

No operator or agent may reinterpret “document ready” as permission to spend,
create a subscription, call a billable endpoint, refill credits, or collect
data. Paid readiness begins only after the exact-zero offline closure and the
ordered, evidence-backed authorization sequence in Plan §§16–17 and Log §7.

---

**End of PART A — current implementation/evidence ledger. New run reports remain externalized to `V3.9_RUN_REPORTS_AND_EVIDENCE.md`. PART B below preserves the older full manual/history/archive but is non-executable and cannot supply current PASS evidence.**

---

# PART B — PRESERVED FULL MANUAL / TEACHING / HISTORY / ARCHIVE

> **NON-NORMATIVE / NON-EXECUTABLE — preserved from `IMPLEMENTATION_LOG_FINAL_CORRECTED(4).md` (approximately 3,245 lines).**
> This is retained because it contains useful explanations, the 88-component walkthrough, schema/table teaching, code walkthroughs, historical changes, and archive material. It also contains dated statements that were once called “current.” **Those statements are not current evidence.**
> Do not run a command, spend credits/API units, enable auto-collection, claim a migration/test/code status, or advance a gate because PART B says so. Use PART A + the binding Plan. New run reports are externalized to `V3.9_RUN_REPORTS_AND_EVIDENCE.md`; historical report summaries remain here only as provenance.

This is the running record of the V3.9 project. The binding specification is
**`V3.9_DataCollectPlan.md` PART 1 §§0–21** — we patch PART 1 only via adjudicated pre-freeze changes (V3.9-f.7/f.8), otherwise we only
explain and execute it. This log is at **Sep-1 document-closure normalization**, derived from binding Plan **V3.9-f.8** (this is not a new Plan version). `archive/OG_V3.9_DataCollectPlan.md` remains untouched. This log tells you, in this order:

1. **Where we are right now** (§0)
2. **What to do next, as one complete ordered command list** (§1)
3. **What the plan says, section by section** (§2)
4. **The phase roadmap with steps inside phases** (§3)
5. **The science, taught slowly** (§4 statistics, §5 glossary, §6 tables)
6. **The most important code** (§7)
7. **The records — how to see them again after a Replit restart** (§8, §9)
8. **The run reports and change history** (§10, §11, §36 archive)

Click any heading in the table of contents to jump to it.

## Table of contents

- [Table of contents](#table-of-contents)
- [0. Where we are right now](#log-section-0)
- [1. What to do next (one ordered list)](#log-section-1)
- [2. The V3.9 plan PART 1, section by section](#log-section-2)
- [3. Phase-by-phase walkthrough (phases with steps)](#log-section-3)
- [4. Teaching: statistics and probability refresher](#log-section-4)
- [5. Teaching: glossary of every technical term](#log-section-5)
- [6. Teaching: the tables and their columns](#log-section-6)
- [7. The most important code, explained](#log-section-7)
- [8. Shell commands to check the records (history survives restarts)](#log-section-8)
- [9. Money, dates, and credits ledger](#log-section-9)
- [10. Run report: rl8 (2026-08-18) analyzed](#log-section-10)
- [11. Change log (newest first)](#log-section-11)
- [13. Implementation-log entry format (A30 §14 — 59 fields)](#log-section-13)
- [14. Unique record IDs (A30 §15)](#log-section-14)
- [15. Code-location requirement (A30 §16) — WHERE THIS LIVES](#log-section-15)
- [16. Code explanation requirement (A30 §17) — 20-field per function](#log-section-16)
- [17. Required 88-component walkthrough (A30 §18) — summary](#log-section-17)
- [18. Repository file map (A30 §19) — critical files summary](#log-section-18)
- [19. Requirement → Code traceability (A30 §20) — summary](#log-section-19)
- [20. Code → Requirement reverse (A30 §21)](#log-section-20)
- [21. Database data dictionary (A30 §22) — full (every first-class table, S-layers first-class vs `flight_data_pre_post` stale claim)](#log-section-21)
- [22. Data lineage (A30 §23)](#log-section-22)
- [23. Environment / configuration registry (A30 §24) — summary](#log-section-23)
- [24. Runtime / dependency reproducibility (A30 §25)](#log-section-24)
- [25. Typecheck / lint / baseline-error policy (A30 §26)](#log-section-25)
- [26. Migration policy (A30 §27)](#log-section-26)
- [27. Test matrix (A30 §28) — 16 representative tests](#log-section-27)
- [28. Command index (A30 §29) — full (16 commands, A30 §29 list)](#log-section-28)
- [29. Run report format (A30 §30)](#log-section-29)
- [30. Phase-6 daily record — when Phase 6 eventually starts (A30 §31)](#log-section-30)
- [31. Decision record (A30 §32)](#log-section-31)
- [32. Issue record (A30 §33)](#log-section-32)
- [33. Gate record (A30 §34)](#log-section-33)
- [34. Workstreams A-I status (A30 §36)](#log-section-34)
- [35. GO/NO-GO determination for Phase 6 (A30 §36 + §9)](#log-section-35)
- [36. Archive (outdated and historical) — SUPERSEDED, kept for honesty](#log-section-36)


---

<a id="log-section-0"></a>
## 0. Where we are right now

### 0.0 Sep-1 closure-correction repository truth (authoritative current snapshot)

This subsection supersedes stale current-state values elsewhere in active §§0-35. Historical run records remain historical and are not rewritten.

| Field | Current truth | Status/evidence |
|---|---|---|
| Actual branch | `main` | `git branch --show-current`, 2026-09-01 |
| Actual HEAD | `9fa04fea6c1b1de0a3182fa3b0ee439f72a0224a` | `git rev-parse HEAD`, 2026-09-01 |
| Working tree at observation | modified `AugMDnotes/V3.9_DataCollectPlan.md`; deleted `AugMDnotes/V3.9_DataCollectPlanCurrent.md`; untracked `archiveOld/V3.9_DataCollectPlanCurrent.md` | The deletion/move is pre-existing concurrent work and was not modified by this correction pass |
| Migration files present | through `0025_raw_ingress_immutable_layers.sql` | `MIGRATION_FILE_CREATED` for 0024/0025 |
| Applied live migration level | last evidenced level `0023`; current target DB not inspected in this pass | 0024/0025 are **NOT** `MIGRATION_APPLIED_LIVE`; live application remains BLOCKED_LIVE_EVIDENCE |
| Existing focused tests | prior evidence: 71/71 across four focused files | This is not the complete Phase-6-critical suite and does not imply all required families pass |
| Auto collection | `ADB_AUTO_COLLECT=false` required | Phase 6 NO-GO |
| Provider contract | RapidAPI OpenAPI API version `1.15.3.0`, OpenAPI format `3.0.4`, SHA-256 `735620f2d2132c5bf51768f50caa767b7f0b25be8b128679641402666696890a`, retrieved `2026-09-01T13:05:24Z` | `https://doc.aerodatabox.com/docs/openapi-rapidapi-v1.json` |
| Retention rights | Public Terms last updated 2026-08-21, retrieved `2026-09-01T13:05:24Z`; Article 5.5 confirms 7 days/cache max-age/explicit Plan Terms | actual subscribed Plan Terms not verified; `PERMANENT_RAW_RETENTION=BLOCKED`; Phase 6 NO-GO |

**Status vocabulary (binding for all current claims):** `DOCUMENTED` means a requirement is written; `CODED` means source exists; `IMPLEMENTED` means wired into the real production execution path; `UNIT_TESTED`; `INTEGRATION_TESTED`; `LIVE_VERIFIED`; `FROZEN`; `BLOCKED`; `DEFERRED`; `SUPERSEDED`. A standalone module is never `IMPLEMENTED` merely because its file exists.

| Component | Current status | Production-path fact |
|---|---|---|
| `fidsCensus_v3.ts` | CODED / UNIT_TESTED / NOT IMPLEMENTED | no verified production route/controller caller |
| `rawIngress_v3.ts` | CODED / UNIT_TESTED / NOT IMPLEMENTED | not verified wired into the real webhook route before 2xx |
| `adaptiveMi_v3.ts` | CODED / UNIT_TESTED / NOT IMPLEMENTED | not verified wired into actual REGIONAL selection |
| `historicalFeatureStore_v3.ts` | CODED / UNIT_TESTED / NOT IMPLEMENTED | not verified wired into snapshot construction |
| PRE snapshot builder | BLOCKED / NOT IMPLEMENTED | active map still identifies no production builder |
| AIRBORNE snapshot builder | BLOCKED / NOT IMPLEMENTED | active map still identifies no production builder |
| Outcome terminalizer | DOCUMENTED / NOT IMPLEMENTED | exact protocol now specified in Plan §7.4; production code/tests absent from verified path |
| Weather tables/joins | DOCUMENTED / NOT IMPLEMENTED | `weatherSignal.ts` does not establish table migrations and production joins |
| Experiment calendar/gates/manifest/registry helper modules | CODED where files exist / NOT IMPLEMENTED unless a production caller is proven | standalone evidence only |
| Existing webhook extractor/controller paths | IMPLEMENTED where real routes call them; LIVE_VERIFIED only where historical run evidence exists | do not transfer this status to standalone correction modules |

### 0.0.1 Binding derivation + P0/P1/P2/P3 priority contract (Sep-1 document closure)

The active Log **derives from Plan PART 1** and cannot override it. Plan PART 1 §§0–21 is normative; active Log §§0–35 records implementation/evidence; Log §36 and Plan Parts 2–3 are historical/non-normative.

| Priority | Risk | Log rule |
| --- | --- | --- |
| **P0 CRITICAL** | leakage, wrong denominator/identity/label, billing/retention/compliance, unsafe collection, raw provenance corruption | must be DOC_RESOLVED before affected coding; code/offline tests before paid affected collection; live evidence before Phase 6 when required |
| **P1 MAJOR** | material sampling/evaluation/confounding/reproducibility ambiguity | resolve before FREEZE (or before first fit when explicitly analysis-only) |
| **P2 MODERATE** | traceability/diagnostic weakness | close before readiness/publication of affected result |
| **P3 LOW** | terminology/history/cosmetic | clean without changing architecture |

Every current item has independent axes: `DOC_STATUS`, `CODE_STATUS`, `LIVE_STATUS`. A documentation fix never upgrades code status. If this Log conflicts with Plan PART 1, record `DOC_CONFLICT`, Plan governs, and no agent improvises a replacement rule.

**Current document-risk register after this normalization:**

| ID | Pri | Rule normalized in Plan | Code/live consequence |
| --- | --- | --- | --- |
| DOC-001 | P0 | AIRBORNE stores physical observation time separately from deployable `prediction_cutoff_utc`; cutoff normally uses source fact `available_at` | snapshot builder/tests must implement; live cadence still Gate0.5 |
| DOC-002 | P0 | FIDS population is independent REST branch; requested-airport primary movement vs opposite-movement context explicit | FIDS canonicalizer/Gate5 wiring required |
| DOC-003 | P0 | provider clocks independent; no `location_reported≤lastUpdated`; notification ID stable across retries | raw/semantic timestamp tests required |
| DOC-004 | P0 | actual-vs-estimated provider movement time must be proven before `actual_*` label | Gate0.5 constructibility/actuality evidence required |
| DOC-005 | P0 | canonical flight key stable across <2h retime; ambiguous codeshares remain explicit | identity/codeshare tests required |
| DOC-006 | P0 | raw retention vs Derived Works distinction; compliance deletion allowed/required | subscribed Plan Terms + human/legal classification remain blocked |
| DOC-007 | P0 | Alert credits and REST API units never mixed in crossover/calendar feasibility | solver + budget ledger tests required |
| DOC-008 | P0 | hand-written consecutive crossover pairs retired; solver must satisfy ≥24h end→start washout or UNSAT | calendar solver/SAT evidence required |
| DOC-009 | P0 | probe cap censoring does not redefine yield; stability uses actually observed complete buckets | probe code/tests required before paid Stage1 |
| DOC-010 | P0 | actual-delay history uses movement effective time + availability, not FIDS retrieval as event time | historical store/snapshot tests required |
| DOC-011 | P0 | GFS issue/release vs valid time separated; ERA5 retrospective unless exact release availability verified | weather schema/join tests required |
| DOC-012 | P1 | traffic-missing airports remain UNCLASSIFIED, not silently REGIONAL; charter/code-share ambiguity reported | frame rebuild before Gate2 |
| DOC-013 | P1 | preprobe freeze record distinct from final manifest | hash record before paid probes; final manifest embeds it |
| DOC-014 | P1 | same airport set replayed in crossover pair; normal cooldown does not redraw period2 | solver implementation required |
| DOC-015 | P1 | Engine E deferred Month1; test holdout gap fixed at 0 for current 1–20/21–25/26–31 boundaries | evaluation config/tests required |
| DOC-016 | P1 | snapshot builders/terminalizer/weather/history production code exists and is tested before Phase6; Phase7 only executes/reruns | offline implementation blocker |
| DOC-017 | P3 | non-standard MCD retired; yield-reference terminology normalized | schema/docs cleanup |
| DOC-018 | P0 | FIDS acquisition uses a frozen pre-cutoff guard and actual `available_at`; a response crossing cutoff cannot establish membership | scheduler/FIDS selector + slow-response test required |
| DOC-019 | P0 | webhook-only clocks are not mandatory on FIDS rows; timestamp applicability is record-class specific | schema/migration/parser tests required |
| DOC-020 | P0 | outcome recovery has generated/coalesced category budget, not a fixed 20-unit shortcut | terminalizer/central REST ledger tests required |
| DOC-021 | P1 | five exact crossover pairs; pair ID distinct from block ID; order randomized within frozen contrast and split-contained | solver + paired-analysis tests required |
| DOC-022 | P1 | Month-1 protected test is a pilot endpoint, not deployment/confirmatory validation | evaluation/report wording/tests required |
| DOC-023 | P0 | every T−24/T−6/T−90 population horizon uses a pre-frozen guarded FIDS refresh grid plus a frozen maximum staleness; stale-only/no-precutoff observations become `population_unobserved`, never assumed absent/backfilled | FIDS scheduler/selector + REST budget + TEST-028 required |
| DOC-024 | P0 | `MONTHLY_PLAN_ENTITLEMENT_UNITS=60000` is user-confirmed, but subscription channel/current cycle/account limits are live Gate-0 evidence rather than inferred from quota size | Gate-0 account snapshot + budget refusal tests required |
| DOC-025 | P0 | `protected_alert_floor=1000` is now explicit in the binding Plan; it is a project safety minimum, not provider law or spend | budget registry/controller/manifest must mirror exactly |
| DOC-026 | P2 | research-source attribution separated: chain propagation → Chen & Li 2019 + SJSU #2410; AIRBORNE ETA → SJSU #4774; GCN-GRU hypothesis → SJSU #4935; preprints labeled as such | publication/source traceability only; no architecture change |

`DOC_STATUS=RESOLVED` for these rules means the **Markdown contract** is now unambiguous; it does not claim the repository implementation is complete.

<a id="log-section-0-1"></a>
### 0.1 The one-sentence status (updated 2026-09-01 — V3.9-f.8 document-closure normalization)

**Architecture is locked, but offline production implementation and live evidence are NOT closed.** File/migration existence never makes Phase 0 complete. Historical Steps 10–11 produced a provisional 2026-08-17/18 coverage/frame artifact that is **not the current frozen frame** because its missing-traffic-reference airports were blanket-classified REGIONAL. The anchor-probe protocol has legacy code, but corrected cap-censoring/identity/reference/accounting behavior and production readiness remain to be proven. The 2026-08-19 official Gate-3 canary is a historical FAIL; a code fix was later claimed but has not been independently re-verified. Binding Plan version is **V3.9-f.8**; architecture is LOCKED and all MEASURE→FREEZE values remain pending until evidenced. **Phase 6 is NO-GO** until the full current sequence `Gate 0 → Gate 1 → Gate 2 → Gate 3 → Gate 0.5 → Gate 4 → Gate 5 → FREEZE` and all offline/retention prerequisites pass.

Historical paid spend evidenced in these records includes **1 Alert credit** from the failed canary SEND; this is real account spend but **not Phase-6 experimental spend**. The 31-day run has NOT started (`ADB_AUTO_COLLECT=false`). **Do not run WSSS/OMAA or any Stage-1 probe until offline prerequisites, Gate 0/Gate 1, the final pre-probe freeze record/frame, and the mandatory tiny pre-probe safety smoke pass.** The official Gate-3 canary occurs after Gate 2 under the binding sequence.

<a id="log-section-0-2"></a>
### 0.2 The status board

| Item | Value | Meaning |
| --- | --- | --- |
| Overall phase | **Stage A — offline implementation/document closure** | No paid gate/probe execution is currently authorized; historical Phase-2 labels describe where execution stopped, not the current permitted action. |
| Step 10 — coverage | **HISTORICAL MEASUREMENT ONLY; CURRENT GATE-1 RECHECK REQUIRED** | 2026-08-17 observed universe 4,332 / catalog-in-universe 267 through the legacy local route; current Gate 1 must remeasure from evidenced provider FREE-TIER coverage inputs/local aggregator and freeze hashes. |
| Step 11 — stratified catalog | **HISTORICAL/PROVISIONAL — MUST REBUILD** | The 2026-08-18 artifact had 4,320 rows but blanket-classified missing traffic references as REGIONAL; its cell counts are not current/frozen evidence. Rebuild under §4.1/§4.2 with `UNCLASSIFIED`/`UNMAPPED` preserved explicitly. |
| Step 12 — anchor probe | **NOT READY TO EXECUTE** — protocol is documented, but final frame/reference/preprobe hash + offline production wiring/tests + mandatory tiny safety smoke are prerequisites | No paid probe now. |
| Webhook reachability | **CONFIRMED (HTTP 200)** | `--check-webhook` on 08-19, rl9 |
| Gate-3 canary | **Historical FAIL on 08-19; code fix claimed, official re-verification not done** | No official paid rerun until offline closure/reference/frame/Gate sequence permits it; mandatory tiny pre-probe smoke is a separate safety check before Stage 1. |
| Alert balance | **Last evidenced settled value: 2,900 credits (2026-08-19)** | Current balance is unverified and must be reread at Gate 0; never treat 2,900 as current live truth. |
| Monthly plan entitlement | **60,000 API units/month — USER-CONFIRMED** | Gate 0 verifies the same subscribed plan is active and records current cycle dates/remaining/consumed units; do not infer marketplace channel from entitlement alone. |
| Credits spent so far | **1 Alert credit evidenced historically** | one provider SEND was charged even though the payload failed before storage; **real account spend, not Phase-6 spend** |
| Data rows total | 4,316 | from earlier testing, not the run |
| Rows today | 0 | nothing stored yet |
| V3.9 version | **V3.9-f.8 with Sep1 correction pass; no V3.10** | Prior 939 estimate is preliminary/superseded as final proof; materialized calendar budget is BLOCKED |
| Independent assessment | **MUSE_A30_ASSESSMENT.md — 90% agree, architecture GO, frame NOT frozen, Phase 6 NO-GO** | See `AugMDnotes/MUSE_A30_ASSESSMENT.md` §§1-8 |
| Remaining implementation blockers | **UNKNOWN_GT_ZERO** | Exact counts come only from the regenerated complete requirement matrix/registry/test evidence; historical “~12 families” is not a current closure count. |
| Current frozen frame size | **NOT FROZEN / MUST BE REMEASURED** | Historical provisional artifact had 4,320 rows; do not use that number as a current target. |
| Current tier×region cell counts | **NOT FROZEN / REPORT EMPTY + UNCLASSIFIED/UNMAPPED EXPLICITLY** | 18 possible verified tier×region cells exist conceptually; historical “18/18” is not a binding target. |
| Current POST eligibility count | **NOT FROZEN / MUST BE REMEASURED** | Historical provisional count was 2,264; current eligibility comes from the refreshed provider coverage artifact. |
| autoCollect | `false` | nothing starts by itself |
| 31-day run | NOT started | waits for offline closure + Gate 0 → 1 → 2 → 3 → 0.5 → 4 → 5 + retention/history/weather/calendar/budget + FREEZE + explicit authorization |

<a id="log-section-0-3"></a>
### 0.3 What the last run (rl8) actually showed — the honest version

You pasted the outputs into `AugMDnotes/rl8.md` out of order. Reordered, here is
what happened on 2026-08-18 (all times UTC):

1. `git pull origin main` worked — fast-forward to `73affad`, migrations `0023`
   arrived, and a fresh `ADB_AUTO_COLLECT=0 npm run dev` applied all migrations
   through `0023` with `autoCollect=false`. That part was clean.
2. `--status` correctly printed "No probes recorded yet."
3. `--stage 1` started a KLAX probe (2 h window, subscription
   `99cdf2be-8016-4a91-ab8c-22246fabbd8d`).
4. The probe was **interrupted** and `--stage 2` was started (KLAX, 4 h window,
   subscription `9c87e594-c245-4126-af71-97e3acbef457`) **before stage 1 finished**.
   That is out of plan order (stage 2 must confirm stage-1 picks) and it orphaned
   the first subscription.
5. `--score` correctly said **"No yield-reference probed yet"** — because no
   probe ever completed.
6. The log shows `balance=2901 rowsToday=0` for **hours** — **AeroDataBox never
   delivered a single webhook to us.**

Two things matter here:

- **Two orphaned ACTIVE subscriptions remain** (`99cdf2be…` and `9c87e594…`).
  The plan's R1 rule (exclusivity) forbids foreign active billable subscriptions —
  these would make the Gate-3 canary fail and corrupt balance-delta accounting. We
  added a `--cleanup` mode to delete them (see §1, §7).
- **Zero deliveries means the webhook path is unverified.** Either AeroDataBox
  cannot reach our public webhook URL, or the subscription never activated. The
  new `--check-webhook` mode and the Gate-3 canary exist precisely to answer this
  before we spend anything.

<a id="log-section-0-3-2"></a>
### 0.3.2 What the last run (rl9, 2026-08-19) actually showed

You pasted the outputs into `AugMDnotes/rl9.md` in order this time. Here is the
honest reading:

| Step | Command | Result | Verdict |
| --- | --- | --- | --- |
| 1 | `git pull origin main` | fast-forward `73affad → 6bcea50` | ✅ |
| 2 | `pkill -9 -f node` + `ADB_AUTO_COLLECT=0 npm run dev` | all migrations applied incl. 0023; `autoCollect=false` | ✅ |
| 3 | `--check-webhook` | **HTTP 200 — OK**; URL `https://95ac2e69-…-00-265uxlvlm69md.kirk.replit.dev:443/api/v1/webhooks/aerodatabox` | ✅ **first real proof AeroDataBox can reach us** |
| 4 | `--cleanup` | `0 of 0` orphans; no other ACTIVE credit subs | ✅ (the rl8 orphans were already gone — the `--force` you ran earlier cleaned them) |
| 5 | `npm run health` + `npm run gate0` | balance 2,901 live; floor intact; `data flow`/`active batch` FAIL lines are expected while idle | ✅ |
| 6 | `npm run canary` | **FAIL** — see below | ❌ → **root cause fixed** |
| 7 | `--stage 1 --icao WSSS` | subscription `6a73207d-…` created `isActive=true`, then *you ran it before the canary passed* | ⚠️ re-run after canary PASS |

**The canary FAIL, decoded:**

```text
balance_before 2901 → balance_after 2900   → C_external = 1   (AeroDataBox charged 1 credit)
C_internal (items) = 0                       → the ledger stored 0 items
rows stored/ins/upd/skip = 0/0/0/0           → nothing went into flight_data_pre_post
delivery_failures = 1                        → the webhook handler threw an error
result = FAIL
```

So AeroDataBox **did** deliver (that is why it charged 1 credit) — our server
received the POST but the handler threw **before** storing anything, and the
`delivery_failure` row was written. That is a *server-side* bug, not a
reachability problem. This is exactly why the canary exists: the **historical rl9 attempt happened to cost 1 credit** and exposed a bug before a larger probe. A future canary does **not** have a guaranteed one-credit cost because billing is per flight item per provider SEND; it must use a tiny pre-authorized Alert-credit reservation/ceiling and settled-balance reconciliation.

**Root cause (found in the code, fixed on 2026-08-19):** migration 0022 created
`is_randomized` as **`NOT NULL DEFAULT false`**, but the webhook extractor sent
`isRandomized: null` for any delivery that had no managed batch (a probe/canary
subscription has no batch). Inserting NULL into a NOT NULL column → Postgres
error → the whole webhook handler threw → 0 rows stored + `delivery_failure=1`.
The extractor now defaults unmanaged rows to `isRandomized: false` (they are
never randomized), which satisfies both the NOT NULL column and the V3.8
boolean rule. **Your WSSS probe (step 7) ran before this fix, so it will have
hit the same failure — its 0-delivery outcome does not tell us anything about
WSSS. Re-run it after the canary passes.**

<a id="log-section-0-4"></a>
### 0.4 What needs to happen next (summary)

Do not run a canary or WSSS probe next. Current work is Stage-A offline closure: complete registry/code/migrations/tests/matrices, freeze references and normalization, rebuild the final frame, and prove readiness. Paid gates begin only afterward with explicit authorization in the binding order stated in the superseding runbook note.

<a id="log-section-0-5"></a>
### 0.5 Dates worth remembering

| Date (UTC) | Event |
| --- | --- |
| 2026-08-16 | Run reports 1–3: migrations live, refill confirmed 1 unit = 1 credit, balance 862 → 2,901 |
| 2026-08-17 | Frame decision (Option 1: measured universe), step-11 script built |
| 2026-08-18 | **Step 11 DONE** (rl7); step-12 script + migration 0023 + CODE_WALKTHROUGH written; **first probe attempt** (rl8) — 0 deliveries, 0 spend, 2 orphaned subs |
| 2026-08-19 | Log restructured; probe hardened; **rl9: webhook reachable (200), canary FAIL → root cause (`is_randomized` NOT NULL) found + fixed; spend so far = 1 credit; WSSS probe re-run needed** |
| 2026-08-30 | **V3.9-f.7 A30 pre-freeze patch: PART 1 patched 12 families (tier/region/scope/T/FIDS/flight_id/codeshare/milestone/label/4-timestamp/provenance/m_i/floor/anchor/weather/history/chain/Engine-A), independent assessment `MUSE_A30_ASSESSMENT.md` (90% agree, NO V3.10, architecture GO / frame NOT frozen / Phase 6 NO-GO)** |
| 2026-09-01 | **LOG-20260901-001 documentation-only correction (historical scope of that pass only):** reconciled Plan/Log contract/status language; no code/schema/config/migration/live changes. Mandatory offline implementation/test/scanner work was not executed in that docs-only pass; this historical scope does **not** exempt a repository-capable implementation pass. Phase 6 remains NO-GO |

**LOG-20260901-001 detail:** timestamp `2026-09-01` (exact completion UTC pending final verification); git before/after `9fa04fea6c1b1de0a3182fa3b0ee439f72a0224a` with uncommitted documentation changes; requirements Sep1_1 §§0-80 and overlapping Sep1_2 corrections; inspected Plan, Log, both correction prompts, provider contract/Terms evidence, and prior repository audit; changed only `V3.9_DataCollectPlan.md` and `IMPLEMENTATION_LOG.md`; functions/schema/migrations/config changed: none; provider pin: AeroDataBox RapidAPI OpenAPI 1.15.3.0 SHA `735620f2d2132c5bf51768f50caa767b7f0b25be8b128679641402666696890a`; behavior before: contradictory readiness/implementation/gate claims; after: exact DOCUMENTED/CODED/IMPLEMENTED/BLOCKED distinctions and safe execution order; tests added: none; verification: documentation scans and `git diff --check`; live evidence: none; blockers: scope, production wiring, complete tests/scanner/registry, live account/gates, retention Terms; rollback: documentation-only patch reversal if reviewed/rejected; review status: pending final contradiction scan.

<a id="log-section-0-6"></a>
### 0.6 CURRENT STATE — A30 §13 full spec (this is the binding snapshot, updated every session)

| Field | Value | Evidence |
|---|---|---|
| Real V3.9 phase | **Stage A offline closure; architecture documented, production readiness unresolved** | binding execution order |
| Current gate | **No current gate execution authorized; all Gates 0–5/FREEZE blocked or prior-failed** | current gate record |
| Last completed step | Documentation correction through binding requirements; no code closure | current worktree |
| Last successful live verification | Historical rl9 reachability/balance evidence only; not current Gate PASS | `rl9.md` |
| Last failed verification | **Gate 3 canary 2026-08-19** `C_external=1 C_internal=0 delivery_failures=1 FAIL` (is_randomized bug, fixed) | §0.3.2 |
| Unresolved blocker count | **UNKNOWN_GT_ZERO** until the complete current requirement matrix is generated | ISS-002/003/004/005/006/007 |
| Unresolved measure→freeze count | **UNKNOWN_GT_ZERO** until registry completeness exists | config/registry blocker |
| Frozen values count | **0 in manifest** (all V3.9-f.8 values now in Plan §4.1-13.6 but not yet in `adb_collection_meta`) | Plan §22 V3.9-f.8 |
| Alert balance | Historical settled observation **2,900**; current balance unverified | rl9 historical evidence |
| REST/API-unit state | Prior no-split estimate 939; NOT a final maximum because child segments, range splits, and generated Gate-5/outcome/history calls are unresolved | BLOCKED pending calendar, max range, live costs, exact category report, and central rate limiter |
| `ADB_AUTO_COLLECT` | **false** (`ADB_AUTO_COLLECT=0 npm run dev`) | boot log |
| Git commit SHA | `9fa04fea6c1b1de0a3182fa3b0ee439f72a0224a` plus current documentation worktree changes | repository inspection 2026-09-01 |
| `binding_plan_version` | `V3.9-f.8` | no V3.10 |
| `implementation_log_revision` | `LOG-20260901-001` documentation correction, uncommitted | this entry |
| `canonical_registry_version` | transitional existing registry; completeness/version freeze BLOCKED | ISS-006 |
| DB migration level | **Last live evidence: 0023**. Files 0024/0025 exist but are not proven applied live | historical boot log + repository inspection |
| Manifest status | **NOT YET WRITTEN** — `adb_collection_meta` has old `V3.9-f.6` seed, missing f.8 traffic/region/FIDS/T (CANDIDATE)/milestone/label/censoring/m_i/floor/anchor/weather/history/chain/Engine-A fields | `adbCollectionController_v3.ts:291` |
| Std status vocabulary | DOCUMENTED / CODED / IMPLEMENTED (production-wired) / UNIT_TESTED / INTEGRATION_TESTED / LIVE_VERIFIED / FROZEN / BLOCKED / DEFERRED / SUPERSEDED | §0.0 correction |
| Exact next permitted action | **OFFLINE closure first:** production-wire FIDS/raw ingress/identities/m_i/history/PRE+AIRBORNE snapshots/terminalizer/weather/calendar/budgets/manifest; complete migrations/tests/registry/matrices/scanner; freeze accessible external references + rebuild final frame. **Only after those offline P0/P1 blockers are closed may a human authorize live Gates/probes.** | Plan §0 priority contract + §17 |
| Exact action now PROHIBITED | **Phase 6**, any paid Stage-1/Stage-2 probe before offline closure + frozen final frame/preprobe record + mandatory tiny safety smoke PASS, and any official live gate without its prerequisites/human authorization | Plan §0/§17/§20 |

**Status vocabulary (corrected):** `DOCUMENTED` (written requirement), `CODED` (source exists), `IMPLEMENTED` (wired into production execution), `UNIT_TESTED`, `INTEGRATION_TESTED`, `LIVE_VERIFIED`, `FROZEN`, `BLOCKED`, `DEFERRED`, `SUPERSEDED`. `CODED ≠ IMPLEMENTED`; `IMPLEMENTED ≠ LIVE_VERIFIED`; `LIVE_VERIFIED ≠ FROZEN`.

<a id="log-section-0-6-1"></a>
### 0.6.1 Canonical Plan→Log binding mirror (document contract, not implementation evidence)

This compact mirror prevents the Implementation Log from silently drifting from binding Plan PART 1. If a row below conflicts with the Plan, the Plan governs and the conflict is a document failure to correct—not permission for code to choose.

| Binding item | Plan value mirrored here | Current evidence/status |
|---|---|---|
| Plan version | `V3.9-f.8`; no V3.10 | **DOCUMENT_CLOSED** under final active-scope handoff audit; manifest not frozen |
| Monthly API entitlement | `MONTHLY_PLAN_ENTITLEMENT_UNITS=60000` USER-CONFIRMED | Gate 0 still verifies same active plan, `subscription_channel`, cycle dates, remaining/consumed units, and account limits |
| Alert limits | `HARD_CAP=1900/day`; `MAX_DESIGN_CEILING=57900` project upper bound; exact `phase6_alert_spend_ceiling≤57900` from Gate-0 tree | live balances/cycle not frozen |
| Protected Alert floor | `1000` project-chosen protected minimum; may increase before FREEZE for safety, may not drop below 1000 without explicit design amendment + complete re-FREEZE | current settled balance/feasibility not verified |
| Canary | provider SEND billing; official isolated `tol=0`; `maxDeliveryRetries=0`; cost not guaranteed 1 credit | historical rl9 FAIL; rerun blocked |
| Prediction horizons | T−24 / T−6 / T−90m from verified `selected_t_milestone`; no forced FAA fallback | milestone constructibility Gate 0.5 |
| FIDS acquisition | pre-frozen horizon-specific refresh grids spanning each service-window cutoff interval; frozen guard + refresh cadence + maximum staleness; actual `available_at≤prediction_cutoff`; no future backfill; internal half-open interval after verified boundary canonicalization | helper standalone; production grid/guard/staleness wiring + tests pending |
| Population/capture | population defines snapshot existence; webhook capture is parallel | production selector/snapshot builders pending |
| Sampling batch | `{HUB:1,MID:2,REGIONAL:1}` with enabled anchor consuming HUB; UTC slots `{00,04,08,12,16,20}` | scheduler integration pending |
| REGIONAL adaptation | `m_i∈[0.25,1.5]`, Phase6 start `m_i=1`, EMA NULL; `traffic_prior>0`; ≥20d/never-observed floor eligibility persists until valid direct observation | helper standalone; production integration pending |
| Calendar/crossover | `26×4h + 3×2×2h + 2×up-to-6h`; exactly 5 pairs: 3 control-vs-2×2h and 2 control-vs-up-to-6h; ≥24h end→start; pair split containment | solver artifact NOT IMPLEMENTED/NOT FROZEN |
| Outcome recovery | logical opportunities +30/+120/+360 min, max 3/flight, ≥90m apart; physical calls coalesced; generated `OUTCOME_REST_UNIT_BUDGET` | terminalizer/ledger pending |
| Month-1 split | train days 1–20; validation 21–25; protected test 26–31, holdout gap 0 | actual row IDs materialized after collection before fitting |
| Month-1 inference | one protected primary **pilot** endpoint; 95% calendar-day block-bootstrap interval is pilot uncertainty, not deployment validation | evaluation code not verified |
| Gate sequence | `0 → 1 → 2 → 3 → 0.5 → 4 → 5 → FREEZE`; Phase6 remains NO-GO and `ADB_AUTO_COLLECT=false` before authorized start | all current gates blocked/prior-failed |
| Retention | raw AeroDataBox Contents follow verified Plan Terms; `PERMANENT_RAW_RETENTION=BLOCKED`; Derived Works classified separately | actual subscribed Plan Terms/human classification pending |


<a id="log-section-0-7"></a>
### 0.7 Workstreams A-I (A30 §36) — not Phases 0-7

| WS | Name | Purpose | Current |
|---|---|---|---|
| A | Repository truth audit | Inventory repo/configs/migrations/commands/tests/code paths | **DONE 2026-08-30** — 3 stubs added, 2 provisional flags |
| B | Document/checklist reconciliation | Map binding Plan rules → current code/tests/evidence | **DOCUMENT NORMALIZATION DONE; CURRENT TRACEABILITY NOT CLOSED** — historical 77-row counts are provenance, while the complete current requirement matrix/registry remains blocked |
| C | Sampling frame | Traffic tier, geography, eligibility, scope, balancing reference | **DOCUMENTED f.8 §§4.1-4.6 (f.7 origin, f.8 consistency fixes), code PROVISIONAL (rebuild pending)** |
| D | Population/FIDS/time | T milestone, guarded T−24/T−6/T−90 acquisition, FIDS protocol, budget | **DOCUMENTED; `fidsCensus_v3.ts` CODED/UNIT_TESTED standalone but NOT IMPLEMENTED/production-wired; acquisition-guard integration/tests pending** |
| E | Identity/provenance/outcomes | Flight identity, codeshares, routes, tails, provider-native milestones, labels, timestamps, terminalization | DOCUMENTED; canonicalizer CODED/UNIT_TESTED but identity-v2 and production wiring NOT IMPLEMENTED |
| F | Sampling execution | Anchors, scheduler, exact five-pair crossover, HUB/MID/REGIONAL, adaptive state, persistent coverage floor | **DOCUMENTED; `adaptiveMi_v3.ts` CODED/UNIT_TESTED standalone but NOT IMPLEMENTED in production draw; solver/crossover/floor integration pending** |
| G | Context/history/AIRBORNE | Weather, historical store, cadence, trajectories, chains | **DOCUMENTED; `historicalFeatureStore_v3.ts` CODED/UNIT_TESTED standalone but NOT IMPLEMENTED in snapshot path; weather/snapshot/chain production joins remain NOT IMPLEMENTED** |
| H | Evaluation/freeze | Split rule, primary endpoint, deferred items, manifest | **DOCUMENTED §§13.2-13.6, manifest NOT WRITTEN** |
| I | Gates/final readiness | Gate verification, lexical preflight, consistency report, GO/NO-GO | **BLOCKED — gates 0/0.5/4/5 + canary PASS pending** |

**Phase-6 GO checklist (A31 §35, §97):** Before Phase 6 may begin, ALL of the following must PASS:

| # | Gate/Check | Status | Evidence |
|---|---|---|---|
| 1 | Gate 0: Budget/account identities verified | BLOCKED | live account + generated ledger |
| 2 | Gate 1: Coverage/final-frame sanity | BLOCKED | current universe/frame counts + hashes; require `universeCount ≥ final_frame_count`, not a hard-coded historical 4,332 |
| 3 | Pre-probe safety smoke | BLOCKED | tiny authorized isolated smoke after offline path tests; not official Gate 3 |
| 4 | Gate 2: Anchor probes + stability | BLOCKED | final frame/preprobe hash + paid authorization |
| 5 | Gate 3: Official canary PASS (>0 items, exact settled reconciliation) | BLOCKED / historical FAIL | new authorized run required |
| 6 | Gate 0.5: adequately sampled payload/cadence/grace/T/actuality/FIDS semantics | BLOCKED | dedicated pilot |
| 7 | Gate 4: scaled offline cap tests + small live reconciliation | BLOCKED | offline tests then authorized live check |
| 8 | Gate 5: independent population/snapshot/capture/outcome funnel | BLOCKED | production-wired FIDS + sample |
| 9 | FREEZE: Manifest written, split_rule_hash, run_start_date | BLOCKED | Manifest |
| 10 | Frame rebuilt from frozen external reference | BLOCKED | `npm run build-catalog` + frame hash |
| 11 | Canonical rule registry + requirement matrix complete | BLOCKED | registry/matrix counters |
| 12 | Active-scope consistency scan: 0 unclassified P0/P1 contradictions | **PASS — DOCUMENT SCOPE** | final handoff scanner + structural/anchor/constant reconciliation; does not imply repository/code readiness |
| 13 | Pre-run/Phase-6 Alert ceilings + REST category budgets frozen | BLOCKED | exact two-ledger budget tree |

**All 13 checks above must PASS before Phase 6. Any single NO-GO blocks the run.**

**Two different closure states (do not conflate them):**

1. **DOCUMENT_CLOSED:** active Plan/Log P0/P1 contradictions are zero under the scoped scanner, authority/priority rules are explicit, and remaining unknowns are classified as CODE/LIVE/MEASURE→FREEZE rather than hidden prose choices. This state may be reached **before repository implementation** and does not authorize spending.
2. **PHASE6_READY/FROZEN:** all offline implementation/test/wiring counters are zero, registry/matrix/schema/lineage are complete, external/reference data and exact budgets are frozen, all 13 checks above pass, retention rights are resolved, final manifest/split/calendar hashes exist, and explicit human authorization is recorded. Only then may Phase 6 start.

Once Phase 6 starts, the binding Plan and frozen manifest are immutable. Run evidence is append-only in Phase-6 records/logs; a newly discovered methodological defect pauses the run rather than silently editing the frozen contract. A final evidence entry records the freeze/start state.


---

<a id="log-section-1"></a>

<a id="log-section-0-7-1"></a>
### 0.7.1 What you (human) actually do next — plain checklist (you asked, you are confused, this is the answer)

> **You do not need to understand the 77-row table or the 88-component map to run the next gate.** This is the human version. The technical version is `Log §1` (authoritative) and `Plan §17` (binding order). If this plain list and `Log §1` ever disagree, `Log §1` + `Plan §17` win.

**Right now you are BLOCKED from Phase 6 for good reasons — the documents say NO-GO and are right.**

**Current authoritative order — do not skip or parallel paid stages:**

1. **Offline repository implementation:** wire and test every P0/P1 production path named in Plan §17 Phase 0 and Log §§17–27. File existence is not completion.
2. **Offline verification:** typecheck/lint/build, full unit + integration suite, migration 0024/0025 test where environment permits, requirement matrix, reverse map, schema dictionary/lineage, complete config registry, contradiction scanner.
3. **External/reference freeze:** choose one permitted traffic reference/metric/period/cut rule and exact region table; produce the hash-locked `preprobe_reference_freeze_record`; rebuild the final frame with no silent REGIONAL fallback for missing traffic reference.
4. **Only then authorized live sequence:** Gate 0 → Gate 1 → Gate 2 paid probes → official Gate 3 canary → adequately sampled Gate 0.5 → Gate 4 small live reconciliation check after scaled offline proof → Gate 5 → history/weather readiness → solver-generated calendar + exact REST budget → final manifest/preflight.
5. **Phase 6 stays prohibited** until every required gate/freeze/retention condition is satisfied and explicit human authorization is given. `ADB_AUTO_COLLECT=false` throughout preparation.

**Do not run next merely because it is cheap:** no paid canary, WSSS/OMAA probe, refill, or billable FIDS call is the current action while offline P0/P1 implementation blockers remain. A free reachability check may be used only when it is actually needed to diagnose infrastructure; it does not upgrade any Gate status.

<a id="log-section-0-8"></a>
### 0.8 Entire session history — from DeepSeek to today (2026-08-31) and the 13-day gap you asked about

**You said you don't remember, DeepSeek was before me (Muse Spark), 18 Aug rl8 was last real Phase 1/0 execution, and there is a massive gap. Here is the exact dated truth from `rl*.md` + git + migrations, so you can see what we did and what is left:**

| Date (UTC) | What happened | Where we were (Phase/Gate) | Cost | Artifact | What it means for you now |
|---|---|---|---|---|---|
| **2026-08-12 12:00 UTC** | **V3.9 plan rebuilt** `V3.9_DataCollectPlan.md` merged PART1 (§1-22) + PART2/3 history; `archive/OG_V3.9_DataCollectPlan.md` frozen as untouched | Plan LOCKED f.1 | 0 | `archive/OG_V3.9...` | This is the binding spec you never edit — `AugMDnotes/V3.9_DataCollectPlan.md` is the same file plus f.7+f.8 patches (10 fixes) |
| **2026-08-16 16:00 UTC** | **DeepSeek era → Phase 0 code deltas** `migrations 0017-0020` `adb_collection_batches` `flight_events` `raw_airborne_events` etc. + `adbCollectionController` R1-R7 + `ADB_AUTO_COLLECT=false` | Phase 0 DONE (foundation) | 0 | `migrations 0017-0020` `server/db.ts:BOOT_MIGRATIONS` | DeepSeek built the foundation you still run today — I (Muse) kept it, only added f.7/f.8 stubs (`flightInstanceCanonical_v3.ts:1` etc.) |
| **2026-08-16 20:06 UTC** | **Gate 0 refill 1cr=1u** `862→863` **and full refill 2038→2901** (rl3) — `health` `gate0` PASS `floor intact` | Phase1 Gate0 LIVE `balance 2901` | 1 + 2038 = 2039 credits refilled (57,900 envelope) | `replitLogs3.md` `rl3.md` `balance_before 862` | Money math proved live — still 2900 after rl9 canary |
| **2026-08-17 22:19 UTC** | **Historical Gate1 coverage measurement** through project-local `GET /collection/coverage`: `universeCount 4332`, `catalogInUniverse 267`, `universe≥catalog` at that time | Historical Gate1 evidence only | 0 | `rl7.md` `measure_coverage.ts:15` | Preserve as dated provenance; **do not assert 4,332 is current**. Current Gate 1 must remeasure and hash the provider-backed coverage artifact. |
| **2026-08-18 22:19 UTC** | **Step11 frame** `npm run build-catalog` 4320 = 267 curated + 4,053 unclassified→REGIONAL provisional `18/18 tier×region` `pre 3337 post 2264 both 1281` `clean.adb_sampling_frame` (rl7) — **PROVISIONAL per f.7 §4.1/4.2** | Phase2 Gate2 provisional | 0 | `rl7.md` `build_stratified_catalog.ts:270` | **This is the gap start — frame built but NOT FINAL (tier blanket, ICAO heuristic). f.8 now says you must pick 1 exact 12mo metric + 1 country→region table + hash before FREEZE** |
| **2026-08-18 23:00 UTC** | **rl8 anchor probe first try** KLAX 2h `99cdf2be…` then out-of-order Stage2 `9c87e5…` before Stage1 finished → 2 orphans, `balance 2901 rowsToday 0 for hours` **0 deliveries** (webhook path unproven, not spend) | Phase2 Gate2 BLOCKED | 0 | `rl8.md` out-of-order | Left 2 ACTIVE orphans (later cleaned) + proved we needed `isActive` printing + `--check-webhook` + `--cleanup` + Stage2 guard |
| **2026-08-19 06:00 UTC** | **rl9 webhook proved + canary FAILED** `git pull 73affad→6bcea50` boot 0023, `--check-webhook HTTP 200` **first proof reachability**, `--cleanup 0 of 0` (or Force), `health/gate0` PASS 2901, `canary FAIL` `B_before 2901→B_after 2900 C_ext 1 C_int 0 rows 0 delivery_failures 1` `WSSS 6a73207d isActive true` before fix | Phase3 Gate3 FAIL | 1 credit wasted (SEND→throw) | `rl9.md` `§0.3.2` decoded | **Root cause `is_randomized` NOT NULL `flightNotificationExtractor_v3.ts:372` `?? null` → `?? false` fixed 2026-08-31 06:00 UTC f.8. WSSS before fix invalid** |
| **2026-08-19 → 2026-08-31** | **GAP 12 days 18 hours** `autoCollect=false` entire time, `balance 2900`, `rowsToday 0`, no webhook deliveries stored (0 rows) — database has 4,316 rows from earlier testing but **0 from the 31-day experiment** | **NO Phase6, NO new data** | 0 | `IMPLEMENTATION_LOG.md:0.6` `ADB_AUTO_COLLECT=false` | **Correct to forget old 4,316 test rows for the experiment — they are `history_incomplete` pre-gap test data, not the contiguous 31-day run. Plan §12.2 `history_ready_at` says Day1 needs full lookback; a 12-day gap means staleness `state_age` 12d and `coverage-age 12d` — diagnostics would show `coverage-age distribution 12d` if we started now. Decision: keep any lawfully retainable/derived historical evidence according to Plan §10.2 (not an unconditional “never delete” rule), but Phase6 must be **fresh 31 contiguous days** starting only after history readiness. The old provisional frame artifact remains provenance only and must be remeasured/rebuilt under f.8 before FREEZE; its old row count is not carried forward as truth.** |
| **2026-08-30 12:00 UTC** | **A19/A30 audit** `chatGPTv3_A19_1.md` 30 sections + `A30_1` 77-item + `A30_2` 3443 lines FINAL MASTER + `cgtAnalysis13.md` + repo audit 0017-23 + `MUSE_A30_ASSESSMENT.md` 17KB — verdict `ARCHITECTURE GO / NO V3.10 / 12 families` | Audit | 0 | `MUSE_A30_ASSESSMENT.md:1` | This is why `V3.9-f.7` was created |
| **2026-08-30 18:00 UTC** | **V3.9-f.7 patch** Plan 12 families `§4.1-4.6 §5.1-5.4 §6.0 §6.3-6.6 §7.1-7.5 §8.2-8.8 §9.1-9.2 §10.1-10.2 §12.2.1-12.2.2 §13.2-13.6 §15 §17 §19 §21 §22` + 3 stubs `flightInstanceCanonical_v3.ts` `fidsCensus_v3.ts` `historicalFeatureStore_v3.ts` + `build_stratified_catalog.ts:23` provisional warning | Plan `V3.9-f.7` LOCKED | 0 | `V3.9_DataCollectPlan.md` 4868 lines | **Not yet frozen until refs chosen + hash** |
| **2026-08-31 06:00 UTC** | **V3.9-f.8 10 fixes** `A30_3` 10 cleanups `§4.1 CANDIDATE` `§4.2 60°E` `§6.0 CANDIDATE T` `retime <2h same` `FIDS_RETRY 75` `r_i removed` `one authoritative next-action` `Legacy foundation` `77-row source` `chain/history/primary fallback` | Plan `V3.9-f.7+f.8` LOCKED | 0 | `V3.9_DataCollectPlan.md:229` 8 `CANDIDATE` | **Now** |
| **2026-08-31 07:00 UTC** | **Log expanded to full manual** `IMPLEMENTATION_LOG.md:1` 2854 lines `§0.6` 16-field CURRENT STATE + `§0.7.1` human checklist + `§0.8` this history + `§3` 16-field Phase 0-7 sheets + `§3.1` 9-gate sheets + `§13-35` 59-field entry + 88-component `WHERE THIS LIVES` full 88 rows + `A30_77_ADJUDICATION.md` 77-row source + TOC fixed `13-35` before `36 Archive` | Log `§§0-36` in order, archive last 36, TOC clickable | 0 | `IMPLEMENTATION_LOG.md` 2854 lines + `A30_77_ADJUDICATION.md` | **This file you read now — complete, organized, timestamped per your request** |

**What phases we did vs left (so you remember):**

- **Historical foundation `2026-08-16`:** some R1-R7/S1-S5 production paths existed. Sep1 deltas such as FIDS, raw ingress, history, snapshots, terminalizer, and adaptive `m_i` are separately classified CODED vs production-wired; they are not IMPLEMENTED merely because files exist.
- **HISTORICAL EVIDENCE `2026-08-17/18`:** old Gate0 balance/refill and Gate1 coverage measurements existed; Step11 produced a provisional frame. None is a current Gate PASS/FROZEN artifact after the f.8 contract/account/provider refresh requirements.
- **BLOCKED `2026-08-18`:** Phase2 Gate2 anchor probe (0 deliveries, orphans, then canary FAIL)
- **FAILED→FIXED `2026-08-19`:** Phase3 Gate3 canary `FAIL` → fixed `2026-08-31` f.8, **re-run pending**
- **NOT YET:** offline production wiring/tests; final external reference/frame; Gate0/1/2/3/0.5/4/5; independent population/snapshot/capture/outcome funnel; retention rights; exact Alert/REST budgets; SAT calendar/split/manifest FREEZE; Phase6; Phase7 evaluation.

## 1. Historical command walkthrough — SUPERSEDED / NON-EXECUTABLE

> **CURRENT EXECUTION AUTHORITY IS Plan §0 + Plan §17 + Log §0.7.1.** The detailed command material below is retained for operational provenance and may include historical commands; no paid command in this section is executable merely because it is printed.
>
> This section was originally an ordered execution list from the Aug-2026 state. It is preserved only so historical runs can be reconstructed. **It is not the current list, and some printed commands are paid/unsafe to run now.** The previous list (the version that
> told you to do `--check-webhook` → `--cleanup` → canary → probes) is archived in
> §36 (Archive) — every time the situation moves, the old "what to do next" moves to the
> archive so you can always look back. **One ordered list only — no competing lists (A30 §13).**
> **SUPERSEDED EXECUTION TABLE:** The historical step table below is retained for provenance but is not executable authority. In particular, do not run its paid smoke/probe commands now. Binding order is: repository/provider/spec closure → registry/code/migrations/full offline tests/matrices → freeze references/normalization and rebuild final frame → authorized Gate 0 → Gate 1 → optional authorized tiny smoke → Gate 2 stages/lock → official Gate 3 → adequately sampled Gate 0.5 → scaled Gate 4 plus approved small live check → Gate 5 → history/weather readiness → materialized SAT calendar/split/manifest/preflight/GO decision → explicit Phase-6 authorization. This document-closure artifact does not establish repository code closure; a repository-capable implementation pass must complete and evidence the offline work before any paid stage. All paid stages therefore remain BLOCKED until those prerequisites pass.

**HISTORICAL NEXT-ACTIONS TABLE — SUPERSEDED, NON-EXECUTABLE**

| Step ID | Prerequisite | Exact command | Side effects | Cost | Expected output | PASS condition | FAIL response | Log entry to update |
|---|---|---|---|---|---|---|---:|---|
| 1 | Repo on 6bcea50, Replit shell ready | `git pull origin main` | Updates `V3.9_DataCollectPlan.md` to f.8 + 3 new stubs | 0 units / 0 credits | `flightInstanceCanonical_v3.ts` appears, `traffic_prior` warnings | Fast-forward + no conflict | `git status` + manual merge | §0, §11 |
| 2 | Step 1 done, old node killed | `pkill -9 -f node` then `ADB_AUTO_COLLECT=0 npm run dev` | Applies migrations 0017-0023, starts watchdog `autoCollect=false` | 0 / 0 | `[migrations] applied 0023` + `watchdog started (autoCollect=false)` + `express 5000` | Boot log shows 0023 + false | `npm run logs:last` | §0, §8 |
| 3 | Step 2 boot OK | `npm run anchor-probe -- --check-webhook` | GET AeroDataBox health endpoint | 0 / 0 | `HTTP 200 — OK` URL `.../api/v1/webhooks/aerodatabox` | HTTP 200 | Fix `REPLIT_DOMAINS`/`WEBHOOK_BASE_URL` | §0.3.2, §10 |
| 4 | Step 3 PASS | `npm run anchor-probe -- --cleanup` | Deletes orphan `adb_collection_subs` + `abandoned` | 0 / 0 | `probe-owned orphan subs deleted: 0 of 0` (or 1 of 1) | No ACTIVE orphans remain | Re-run `--cleanup` | §0, §10 |
| 5 | Step 4 PASS | `npm run health` then `npm run gate0` | Reads current account/balance/quota evidence | provider/account read cost as verified | sourced current balance + USER-CONFIRMED 60,000 entitlement still active + cycle dates/remaining/consumed units + exact Alert/API trees | identities reconcile; no stale 2,900 requirement | Gate 0 FAIL → repair account/config/evidence; keep paid work blocked | §9, §11 |
| 6 — **SMOKE CANARY (pre-gate, not official Gate 3 PASS)** | Step 5 PASS, exclusive set, corrected script, human approval | `npm run canary` | Creates 1 sub `maxDeliveryRetries=0`, deletes, records settled balance and ledgers | paid Alert SEND(s) | external balance delta, received attempt cost, raw ledger, failures | exact `C_external=C_internal`, tolerance 0, stable balance, no failures/foreign sub, >0 items | STOP and reconcile | BLOCKED pending code correction/live approval |
| 6b — **FREEZE TRAFFIC/REGION RULES** | Step 6 SMOKE PASS | Choose exact: 1 traffic source, 1 metric, 1 period, 1 cut rule; choose exact 6-region country→region table with Russia 60°E override | Record in manifest + hash | 0 / 0 | `traffic_source`, `traffic_metric`, `traffic_period`, `tier_cut_rule`, `region_mapping_hash` frozen | All values non-TBD, non-candidate | BLOCKED — cannot rebuild frame without frozen rules | §4.1, §4.2, manifest |
| 6c — **REBUILD FINAL FRAME** | Step 6b frozen rules | `npm run build-catalog` (re-run with frozen tier/region) | Replaces provisional 4,320 frame with final frame | 0 / 0 | New frame hash, current strata counts, explicit `UNCLASSIFIED/UNMAPPED` counts | every primary sampled row has verified tier/region; missing-reference rows remain explicit/excluded rather than silently REGIONAL | Fix reference/mapping, re-run | §4.1, §4.2, §11 |
| 6d — **GATE 1 on FINAL frame** | Step 6c PASS | `npm run coverage` | Re-verifies universe/catalog on rebuilt frame | 0 (free) | universe ≥ catalog, frame hash recorded | PASS with new frame | Fix frame, re-run | §10, §11 |
| 7a-7l | Step 6d PASS plus frozen shortlist/replacement hashes and human paid-probe approval | `npm run anchor-probe -- --stage 1 --icao <FROZEN_ICAO>` sequentially | Creates one subscription and spends Alert credits | ≤500 credits per experimental UTC day; target 2h, cap-censored | distinct flight instances/credit, chain/credit, fixed stability statistic | capacity `rows/h≥60`, no delivery/provider failure, censoring recorded | cleanup; invalid candidate removed/replaced under frozen protocol | §9-§11; BLOCKED pending lists/approval |
| 8 | Any 7 completed | `npm run anchor-probe -- --status` | Read-only DB read | 0 / 0 | Table per ICAO `status/Rows/h/uf/chain/stability` | At least WSSS or OMAA `completed` | Check `adb_anchor_probe` | §10 |
| 9 | Step 8 ≥1 baseline | `npm run anchor-probe -- --score` | Computes `anchor_score=0.4T+0.2G+0.2C+0.2Y` `yield=(uf+chain+stab)/3` vs WSSS | 0 / 0 | Ranked pool + proposed 5-airport lock | Scores 0-1, capacity gate applied | Verify `W_EXOGENOUS=0.4` etc. frozen | §10, §11 |
| 10 | Step 9 PASS | `npm run anchor-probe -- --stage 2` | target-4h cap-censored confirmation for top 5 | ≤500/day binding | actual duration, censoring, metrics | five valid confirmed candidates | next ranked candidate enters only after valid Stage 2; otherwise Gate 2 incomplete | §9-§11 |
| 10b — **GATE 3 (official, per Plan §17)** | After Gate 2 anchor pool locked + frame rebuilt (f.8 §4.1/4.2) | `npm run canary` (second run, same criteria) | Same as Step 6 but now satisfies Plan §17 Gate 3 | **tiny pre-authorized Alert-credit ceiling; actual settled SEND cost measured** | Same | Same official Gate 3 criteria | Same | §10, §11, Gate record |
| 11 | Step 10 + 10b PASS | Paste `--score` into `AugMDnotes/rl10.md` and report, then proceed to Gate 0.5 payload inspection | Writes artifact `rl10.md` | 0 / 0 | — | Log updated + Gate 0.5 ready | — | §0, §10, §11 |

Old next-step lists → `§36 (Archive)` etc. marked **SUPERSEDED** (A30 §11). Official binding sequence remains `Plan §17: Gate 0 → Gate 1 → Gate 2 → Gate 3 → Gate 0.5 → Gate 4 → Gate 5 → FREEZE` — Step 6 is an early smoke test permitted before Gate 2 to avoid wasting probe credits.

### Step 1 — Get the fix

```bash
git pull origin main
```

What to look for: `server/lib/disruption/flightNotificationExtractor_v3.ts`
updates. That file contains the fix for the rl9 canary failure (see §0.3.2).

### Step 2 — Stop the old server, then boot safely

```bash
pkill -9 -f node
ADB_AUTO_COLLECT=0 npm run dev
```

What to look for in the boot log:

- `[migrations] applied 0023_anchor_probe_results.sql` (all migrations re-run every
  boot — this is expected).
- `[adb-collector] watchdog started (... autoCollect=false)` — the safe mode is on.
- `[express] serving on port 5000`.

### Step 3 — Re-confirm the webhook is reachable (30 seconds)

```bash
npm run anchor-probe -- --check-webhook
```

Expect `→ HTTP 200 — OK` like rl9. HTTP 200 confirms the health endpoint is externally reachable; the canary (`npm run canary`) is the end-to-end webhook delivery test (see rl9: HTTP 200 but canary FAIL). A network error means fix `REPLIT_DOMAINS` / `WEBHOOK_BASE_URL` first. Note:
the boot log already showed `GET /api/v1/webhooks/aerodatabox 200` in rl9 — this
is just the safety re-check.

### Step 4 — Clean up anything the interrupted WSSS probe left

```bash
npm run anchor-probe -- --cleanup
```

Your WSSS probe (`6a73207d-…`) was started *before* the fix. If it was interrupted
before it finished its 2 h window, this deletes its subscription and marks the row
`abandoned`. Expect `probe-owned orphan subs deleted: 0 of 0` if it completed, or
`1 of 1` if it did not.

### Step 5 — Confirm money and health

```bash
npm run health
npm run gate0
```

Look for a **fresh sourced balance/quota result**, confirmation that the user-confirmed 60,000-unit plan is still active, and reconciled Alert/API-unit trees. The historical 2,900 balance is provenance only and is not a current PASS target. Historical evidenced spend so far in this log is **1 Alert credit**.

### Historical Step 6 — controlled live test (SUPERSEDED; not the current gate)

```bash
npm run canary
```

This subscribes to one busy airport (KLAX by default) for ~2 minutes and checks
three things: (a) no foreign active subscription, (b) `C_external` (balance delta)
equals `C_internal` (notification items) **exactly for the isolated Gate-3 canary (`tol=0`)**, (c) zero delivery
failures. **The result must be PASS with more than 0 items stored.**

This is the command that FAILED on 08-19 (`delivery_failure=1`, 0 items). The
`is_randomized` bug is fixed, so it should now PASS. If it still FAILs, stop and
tell me — **do not run the probes.** The historical failed run cost 1 credit; a future canary uses a tiny pre-authorized ceiling because its actual cost depends on provider SEND item count.

### Step 7 — Run stage 1, one airport at a time (2 h each)

First, the timing question answered, because it decides how you run this:

- **Historical wording only:** this archived walkthrough described each `--stage 1 --icao X` command as waiting a full 2 hours. **Current binding Plan §9 instead uses a target-duration 2h cap-censored probe that may stop early at its frozen cumulative credit cap.** Never use this historical walkthrough to force spend after the cap is reached.
- **Run probe commands one at a time — never in parallel shells.** This is the **probe protocol**, not a global R1 statement. R1 means no foreign/non-experimental billable subscription may contaminate accounting. For an isolated probe/canary, the authorized experimental set contains one subscription, so the guard refuses another active billable subscription. During Phase 6, the authorized experimental set may contain the intended multiple airport subscriptions for the same batch; those are allowed only when all are batch-linked and no foreign billable subscription exists.
- **Why not one big `--stage 1` command that does all 12 back-to-back?** The script
  *can* do that (`npm run anchor-probe -- --stage 1` loops the whole shortlist, 2 h
  each ≈ 24 h in one process), but a single 24-hour process on Replit is fragile: a
  shell timeout or tab close kills the whole loop mid-airport and leaves an orphan
  subscription. Running one airport per command means a failure only costs that
  airport, and `--cleanup` always recovers it. That is the "run them one at a time
  so a shell timeout never leaves an orphan again" instruction — the orphan problem
  is about Replit killing a long-running shell, not about you forgetting a timer.

So, in order (WSSS first — note: WSSS ~331 items/h × 2h = ~662 credits EXCEEDS 500-cap, so WSSS probe will be CENSORED — see §64.2):

```bash
npm run anchor-probe -- --stage 1 --icao WSSS   # WSSS hits 500-credit cap before 2h — duration censored
npm run anchor-probe -- --stage 1 --icao OMAA   # wait ~2h
npm run anchor-probe -- --stage 1 --icao KLAX
npm run anchor-probe -- --stage 1 --icao KORD
npm run anchor-probe -- --stage 1 --icao EGLL
npm run anchor-probe -- --stage 1 --icao EDDF
npm run anchor-probe -- --stage 1 --icao LFPG
npm run anchor-probe -- --stage 1 --icao VHHH
npm run anchor-probe -- --stage 1 --icao RJTT
npm run anchor-probe -- --stage 1 --icao OMDB
npm run anchor-probe -- --stage 1 --icao SBGR
npm run anchor-probe -- --stage 1 --icao YSSY
```

**WSSS and OMAA first — what "yield-reference" means here:** WSSS and OMAA
are airports — Singapore Changi and Abu Dhabi Zayed. The plan's known references
say WSSS yields roughly **331 rows per hour** and OMAA roughly **127 rows per
hour** when probed. Those are just reference points for *how busy the airport is
in terms of data per hour* — a busy hub gives more rows/hour than a smaller one.
We re-probe WSSS and OMAA under the same **target-2h, 500-cap-censored protocol** as every
other candidate, so the reference used to standardize the other airports is
*measured identically*, not assumed from the plan. That is the calibration
baseline (§4.8). It is not a pass/fail — it is the yardstick every other airport
is compared against.

12 airports × 2 h = ~24 h of wall clock if run back-to-back. That is the plan:
probes never cross in real time (§23 step 4). If you must stop between probes,
that's fine — always run `--cleanup` after an interrupted window. **The WSSS probe
you ran on 08-19 predates the fix, so ignore its result and re-run it.**

### Step 8 — See what you recorded

```bash
npm run anchor-probe -- --status
```

Look for a row per airport with `status=completed` and real `rows/h`, `uf/credit`,
`chain/credit`, `stability` numbers.

### Step 9 — Fill the frozen formula and get the proposed lock

```bash
npm run anchor-probe -- --score
```

This fills the frozen anchor-score formula with the measured numbers, applies the
capacity gate (rows/h ≥ 60, a PASS/FAIL feasibility gate, not a score component —
see §4.12), and prints the ranked pool plus the proposed 5-airport lock. It will
refuse to score until at least WSSS or OMAA has a completed stage-1 probe.

### Step 10 — Confirm the top picks (stage 2)

```bash
npm run anchor-probe -- --stage 2
```

A longer (4 h) confirmation probe for the top candidates. The script now **refuses**
stage 2 for any airport that has no completed stage-1 probe — the rl8 out-of-order
mistake is now impossible.

### Step 11 — Lock the pool, then stop and report

Paste the `--score` output into a new `AugMDnotes/rl10.md` and tell me. We then move
to Phase 3 (SOFT_STOP test, payload inspection, and Gate 0.5).

### What NOT to do yet

- Do **not** run the 31-day run (`autoCollect=false` stays until gates 1–5 pass).
- Do **not** remove `ADB_AUTO_COLLECT=0` from the boot command.
- Do **not** set `ADB_PLAN` — PART 1 does not name the plan; that must be verified
  from the RapidAPI account at Gate 0.
- Do **not** run stage 2 before stage 1 (the script now refuses).
- Do **not** interrupt a probe window; if it happens, run `--cleanup` immediately.
- Do **not** run two probes at once (R1 exclusivity; the script refuses anyway).

---

<a id="log-section-2"></a>
## 2. The V3.9 plan PART 1, section by section

> The plan file `V3.9_DataCollectPlan.md` PART 1 §§0–21 is the only binding executable spec; Plan §22 is adjudication provenance only.
> This section explains what each part says and why it exists — in order. We do not
> edit the plan; we execute it.

### §1 How to read the plan

`R#` = code delta, `S#` = schema/pipeline delta, `G#` = GO gate. All must finish
before the 60,000-unit run starts. PART 1 is the frozen end-state; every other
`AugMDnotes` file is history. Times are UTC.

### §2 Locked architecture (end-to-end)

The pipeline:

```text
AeroDataBox webhook ─► raw_delivery/raw_item (immutable while lawfully retained) ─► semantic flight_events ─► current flight_state

AeroDataBox FIDS REST ─► raw FIDS response/provenance ─► provider-observable flight_population

flight_population + as-known history/weather + eligible webhook/event facts
    ├─► PRE snapshots at T-24/T-6/T-90
    └─► AIRBORNE snapshots at deployable decision-time `prediction_cutoff_utc`
          (physical `state_observation_time_utc` retained separately)
         ─► target-specific outcomes ─► ML datasets/evaluation
```

Webhook capture never creates the FIDS denominator. Two **prediction states** are never merged: PRE and AIRBORNE/POST. Three promises: (1) no destructive overwrite while data are lawfully retained, with compliance expiry/deletion governed by the verified retention policy; (2) no future information in features/snapshots (`available_at ≤ prediction_cutoff_utc`); (3) no foreign/non-experimental billable subscription may contaminate the authorized experimental set (R1).

### §3 Budget and accounting (two budgets — Gate 0)

AeroDataBox has two resource ledgers: **REST/API units** and **Flight-Alert credits**. Alert credits are funded by API-unit refill but are not interchangeable with REST calls after allocation, so the accounting tree is explicit rather than a fixed `57,900 + 1,000 + ...` assumption.

```text
opening_nonexpiring_alert_balance + authorized_alert_refill_credits
  = pre_run_alert_spend_ceiling + phase6_alert_spend_ceiling
  + protected_alert_floor + ending_alert_margin + unallocated_alert_credits

cycle_entitlement_units (=60,000 while the USER-CONFIRMED plan remains active)
  = api_units_consumed_before_freeze + authorized_alert_refill_units
  + FIDS_BASE_UNITS + FIDS_SPLIT_UNITS + FIDS_RETRY_UNIT_BUDGET
  + VALIDATION_UNIT_BUDGET + OUTCOME_REST_UNIT_BUDGET
  + HISTORY_BOOTSTRAP_UNIT_BUDGET + DIAGNOSTIC_UNIT_BUDGET
  + unallocated_api_units
```

`MAX_DESIGN_CEILING=57,900 Alert credits`, but the **actual** Phase-6 ceiling is computed only after Gate 0 verifies the account/billing-cycle values: `phase6_alert_spend_ceiling = min(57,900, opening_nonexpiring_alert_balance + authorized_alert_refill_credits - pre_run_alert_spend_ceiling - protected_alert_floor - ending_alert_margin)`. Inputs must be nonnegative and the full identity must reconcile; leftover balance is `unallocated_alert_credits`, not automatic Phase-6 authorization. It is a ceiling, never a spending target. REST categories (FIDS base/splits/retries, validation, outcomes, history, diagnostics) are API units and never silently added to Alert credits.

Three Alert-cap concepts remain separate: (1) reservation before a batch against settled run/day spend and the frozen unsettled-burst margin; (2) SEND-aware live safety (`SOFT_STOP`, `HARD_CAP`, balance/attempt-cost checks); (3) settled post-batch reconciliation. The isolated Gate-3 canary requires exact `C_external == C_internal` after balance stability; a later production tolerance is separate and only exists if measured/frozen. R1 means the active billable set contains only authorized experiment subscriptions, not that a Phase-6 batch is limited to one airport subscription.

Gate 0 requires verifying, live: that the USER-CONFIRMED 60,000-unit subscribed plan remains active, `subscription_channel`, the current billing-cycle dates/used/remaining units, refill conversion (1 unit = 1 credit), per-refill and balance caps, endpoint costs/range/rate limits, and that every REST category fits its frozen ledger.

### §4 Sampling frame (measured, stratified)

- **Universe** = airports AeroDataBox covers, measured from the pinned provider FREE-TIER health/coverage endpoints (`/health/services/feeds/{service}/airports` and/or `/health/services/airports/{icao}/feeds`). A repository `GET /api/v1/collection/coverage` route is a **project-local aggregator**, not a provider endpoint, and is authoritative only after its provider inputs/version/cache/hashes are evidenced.
- **Frame** = `universe ∩ feed-eligible`, **keep every eligible airport including
  zero-yield ones**; only `coverage_failed` airports leave the frame.
- **Primary strata** = **traffic tier × macro-region** only (3 × 6 = 18 cells).
  Crossing more variables would explode cell count.
- **Balancing variables** (reported within strata, not crossed): network degree,
  intl/domestic, carrier diversity, time zone — from a **fixed reference snapshot
  at frame-build time**, never from the recursive current sample.
- **Tier mix per batch**: `{HUB:1, MID:2, REGIONAL:1}`.
- **Unit of prediction**: a flight-leg outcome ("departure delay of leg L at cutoff C").

### §5 The provider-observable prediction population (S1 — the census layer)

The webhook is an **event stream, not a census**. "Flights that emitted an update
we captured" ≠ "all flights that existed". Observability selects on size, activity,
severity, tracking quality, etc. So `flight_population` records which flights
existed for each queried service interval (current public FIDS contract: TIER 2; current public pricing: 2 API units/request, re-verified/frozen at Gate 0), snapshots
are built for **every population flight** (population ∧ horizon-eligible), and a
post-cutoff event is used for the **label only** — it never decides whether a
snapshot exists. Each feature value enters the snapshot only if
`information_available_timestamp ≤ prediction_cutoff`; unavailable optional features
are `NULL` with `feature_missing=true`. Full coverage taxonomy
(`supported → eligible → directly_subscribed → recently_observed →
edge_discovered → zero_yield_* → coverage_failed → stale`); `edge-discovered` is
not the same as `directly observed`.

### §6 Data pipeline and provenance (S2–S5)

S2 normalized ingress = immutable `raw_delivery` envelope + `raw_delivery_item` flight items while lawfully retainable, with `processing_attempt` separated from raw content; legacy `adb_ingest_events` is a mixed audit/processing ledger, not the canonical raw envelope. S3 event log precedes current state (`flight_events` append-only feeds mutable `flight_state`). S4 can rebuild from raw content **only within its lawful retention horizon**; after compliant raw deletion, reproducibility must rely on permitted derived records, hashes/tombstones, manifests, parser/transform versions, and other lawfully retainable provenance. §6.1 defines the dual
PRE/AIRBORNE data contract with the canonical timestamp taxonomy:
`notification_id`, `provider_notification_generated_utc`, `delivery_attempt_seq_no`,
`delivery_attempt_utc`, `provider_state_updated_utc`, nullable
`location_reported_utc`, `http_received_at_utc`, `raw_persisted_at_utc`,
`available_at`, and `timestamp_source`. `lastUpdatedUtc` is a state-update clock,
not automatically a notification publication clock.
§6.2 is the airborne foundation: preserve the time series
(`raw_airborne_events → clean_airborne_points → flight_trajectory → flight_airborne_snapshots`). The append identity must bind delivery/item provenance + canonical `flight_instance_id` + provider location clock/observation identity; `(flight, carrier, locReportedUtc)` is a **legacy noncanonical key** and cannot identify non-location observations or safely serve as a universal event identity.

### §7 Flight operational state and target label status

Two independent dimensions replace the invalid five-state mixture:
`flight_operational_state = scheduled/departed/arrived/canceled/canceled_uncertain/diverted/unknown`
and per-target `label_status = pending/observed/censored/missing/not_applicable`.
Before grace expiry an unavailable target is `pending`; diversion may coexist with an
observed landing; wheels-on may be observed while gate-in remains missing.

### §8 Sampling design (LOCKED)

Default window **1 × 4 h per day** (preserves aircraft-chain continuity). UTC slots
rotate through `{00,04,08,12,16,20}` — a seeded balanced permutation, every 6-day
block uses each slot exactly once (HARD), minimize weekday×UTC imbalance (SOFT).
Calendar: 26 × 4h + 3 × 2×2h + 2 × 6h = 31 days. Crossover template frozen before
treatment. Anchor pool = **5 airports, provisional `KLAX·EGLL·WSSS·SBGR·OMDB`,
finalized only after probing**. Anchor score = 40% exogenous traffic + 20% geo
diversity + 20% carrier/international diversity + 20% standardized observed yield;
capacity is a separate feasibility gate, not a score component; formula frozen in
code pre-probe. REGIONAL selection = normalized yield-aware draw (`m_i ∈ [0.25,1.5]`,
cap ×1.5, Σp = 1). Phase 6 starts uniformly with EMA NULL; probe data does not seed
adaptive state. Valid Phase-6 nonempty observations update EMA and deterministically
recompute `m_i`; provider failures and true-zero observations do not update EMA.
`sampling_weight` stays NULL — no auto `1/p`.

### §9 Two-stage anchor probe (budget-capped)

1. **Stage 1:** exactly 12 shortlisted candidates across regions, including WSSS and OMAA; remaining membership and ordered replacements are BLOCKED until the final reference frame is frozen. Target 2 h
   cap-censored probes at matched time-class/weekday-class, never crossing in real time.
   Record distinct canonical flight-instances/credit, chain-links/credit, and stability based on first valid observation per flight-instance across 15-minute buckets. WSSS and OMAA use the same yield-reference protocol, not model calibration.
2. **Stage 2:** top 5 capacity-pass candidates receive cap-censored confirmation.
   If fewer than 5 pass, use the frozen replacement list; each replacement must pass
   Stage 1 and Stage 2 before entering the final five.
3. Rank capacity-pass candidates by descending score, lexical ICAO on exact ties. A failed Stage-2 candidate is replaced by the next ranked candidate only after valid Stage-2 confirmation. Final pool is **5** only after confirmation; probe spend cap is 500 credits per experimental UTC day.

### §10 Weather (LOCKED)

METAR/TAF forecast-as-known-at-cutoff (a TAF issued at T−2 is never used for a
T−24 prediction); operational sources are aviationweather.gov and verified NOAA
forecast products. ERA5 is retrospective truth or an explicitly lagged historical
feature, never a current-weather fallback. The `weather_observation` and
`weather_forecast` tables/joins remain NOT IMPLEMENTED.

### §11 Credit accounting and the canary

Three quantities per batch: `notification_items_received` (webhook),
`credits_actually_consumed` (balance delta — the **authoritative denominator**),
`unique_flight_rows_created_or_updated`. The canary (Gate 3, R1 + R3): delete every
non-experimental ACTIVE subscription, read `balance_before`, subscribe to one busy
airport with `maxDeliveryRetries=0`, collect, delete the sub, settle until
`B_after == B_after_2`, then `C_external = B_before − B_stable` vs
`C_internal = Σ notification_items`; official isolated canary PASS iff `C_external == C_internal` (`CANARY_TOLERANCE=0`) AND
failures = 0 AND balance stable AND no foreign billable sub. R2/R5: delivery
failure → PAUSE + flag, never silently resume; SOFT_STOP at 1,850; orphan cleanup
at every batch start; second-start protection.

### §12 Model ladder, features, graph

Rungs −1 (naive persistence — the Month-1 primary comparison baseline) → 7 (conformal uncertainty). Month 1 yields a protected pilot endpoint, not a deployment claim; later deployment/confirmatory claims require separately preregistered evidence. Features must be as-known-at-cutoff. Graph edge taxonomy for the GNN
rung (4 is a hypothesis, not the default).

### §13 Evaluation suite

Month 1 uses Engines A/B/C/D + R/P plus POST; Engine E is deferred until a named multi-flight event source/taxonomy is frozen. Calibration metrics, staleness, collection-regime robustness, chain-depth, and POST partition rules remain.

### §14 Marginal value per credit

The final objective — measured per credit (using `C_actual`, never row counts).

### §15 Code to-do — final list (R1–R7, S1–S5)

R1 exclusivity, R2 SOFT_STOP margin, R3 canary, R5 delivery-failure flag,
R6 crossover template freeze, R7 versioned manifest; S1 population layer, S2 raw
envelope, S3 event log first, S4 provenance invariant, S5 airborne time series.
**Do not infer implementation from this to-do list.** Legacy pieces exist, but corrected FIDS/raw ingress/identities/snapshots/terminalizer/history/weather/calendar/registry paths remain variously CODED or NOT IMPLEMENTED; repository evidence governs.

### §16 The GO gates (ALL must pass; Gate 5 alone does not authorize Phase 6)

| Gate | Action | Pass criterion |
| --- | --- | --- |
| 0 | Budget partition | plan/units/refill-conversion/caps verified live |
| 1 | Coverage | universeCount, catalogInUniverse recorded, universe ≥ catalog |
| 2 | Anchor probe | frozen-formula scores; capacity as gate; pool not locked before measurement |
| 3 | Credit canary | C_external = C_internal, failures = 0, exclusive set |
| 0.5 | Webhook data content | adequately sampled real payloads; complete canonical §6.4 clock/source taxonomy, nullable semantic event time, movement semantics/actuality/T constructibility, trajectories and cadence verified |
| 4 | Webhook + cap | failures = 0, SOFT_STOP at ~1,850, second-start guard |
| 5 | Population/census validation | report population total, captured-in, captured-outside, expected/created snapshots, observed/missing outcomes; require captured-in ≤ population |

### §17 Step-by-step runbook (what to do)

The plan's own phases 0–7 — **this is exactly the structure we use in §3** of this
log. Phases: 0 code deltas, 1 Gate 0, 2 Gates 1–2, 3 Gates 3–4 (+0.5 canary),
4 Gate 5 census validation, 5 FREEZE (manifest + hashed split-assignment rule), 6 the 31-day
run, 7 month-1 deliverables + evaluation. §17.1 lists month-1 deliverables (validated
pipeline, snapshot pipeline, Model1-vs-persistence comparison with unknown result, info-per-credit curves, A/B/C/D/R/P results, population coverage, window-experiment pilot, POST pilot; Engine E deferred).

### §18 Contradiction map

Explains how this file resolves conflicts with older files.

### §19 Sources and research foundation

The scientific bets are grounded in peer-reviewed work plus clearly labeled preprint/provider evidence. Core SDSU/SJSU research citations and current provider-contract claims were rechecked during the Sep-1 document-closure audit:
previous-leg delay propagation (Chen & Li, AIAA SciTech 2019, SDSU), delay
propagation by utilization (Zheng et al., SJSU 2021), aircraft-chain continuity (Chen & Li 2019 + Zheng/Wei/Hu 2021; **not** SJSU #4774), AIRBORNE trajectory ETA (SJSU #4774), GNN as hypothesis not default (SJSU #4935 GCN-GRU),
persistence as first gate (Chen & Li; Sternberg et al., 2017), network/propagation
taxonomy (Transportation Research Part E 2024), two-budget accounting + credit
rules (AeroDataBox "Flight Alert API Guide" 2026-01-31), weather availability
(AviationWeather.gov), in-flight ETA as a first-class state (Springer 2024; SJSU #4774).

### §20 Explicit NOT-do list

Highlights: no V3.10+ reviews, no GNN-first, no `1/p` before measuring the
denominator, no over-claiming ("6-day slot-once ⇒ unbiased" etc.), no foreign active
subscription, no raw-event overwrites, no REST-airborne monitoring before cadence
measurement (Gate 0.5), no merging PRE and AIRBORNE sets, no post-cutoff features,
no manual Rescore/Simulate during the run, no silent weather backfill, no "one
empty observation ⇒ airport is useless".

### §21 Final status

Architecture LOCKED; sampling architecture documented but final frame/reference freeze is pending; credit logic requires exact offline/code closure plus authorized gates; AIRBORNE preservation/decision-time semantics require implementation and Gate0.5 evidence. The run waits on offline P0/P1 closure, Gates 0–5, retention approval and FREEZE. No blanket “R1–R7/S1–S5 code complete” claim is permitted.

### §22 Adjudication record

Records the V3.9-f.2/f.3/f.4 passes: airborne claims verified against our own code,
the S5 time-series requirement, the dual prediction-state contract, "no REST before
measurement", the eight restored Strat2 safeguards (coverage taxonomy, zero-yield
triage, staleness curve, collection-regime robustness, dashboard/chain-depth, crossover
context, event-vs-prediction-state, POST partition rule).

### V3.9 PART 1 — A30 full walkthrough (§§1-22 with implementation truth)

| Plan § | Rule (normative) | Purpose | Scientific rationale | Where implemented (A30 §16) | Status (A30 §7) | Tests | Manifest fields | Unresolved |
|---|---|---|---|---|---|---|---|---|
| §1 How to read | R#/S#/G# notation; Plan PART1 only normative; Log derives from Plan; P0-P3 priority/status axes | Single contract, no menu | Prevents version/status confusion | Plan §0-1 | DOC RESOLVED | contradiction scanner | `plan_version=V3.9-f.8` | Code/live status separate |
| §2 Locked architecture | Independent webhook/raw/event branch + FIDS REST population branch → PRE/AIRBORNE snapshots → outcomes; PRE/AIRBORNE separate | Defines denominator/provenance/leakage walls | Webhook capture cannot define FIDS population; decision-time availability is load-bearing | repository paths require current audit | DOC RESOLVED; CODE/PRODUCTION WIRING NOT CLOSED | raw/FIDS/snapshot integration tests + Gate0.5 | `pipeline_version` | FIDS/raw/snapshot wiring |
| §3 Budget | Alert credits and REST API units separate; `MAX_DESIGN_CEILING=57900`, exact `phase6_alert_spend_ceiling≤57900` frozen from balance tree; daily 1900 cap, SEND-aware margin/reconciliation | Money walls | Prevents double counting and unsafe SEND-side overshoot assumptions | controller/ledger require current integration proof | historical refill evidence exists; current Gate0/FREEZE not PASS | exact canary + budget/ledger tests | floor/daily cap/ceiling + category budgets | account/billing/live evidence |
| §4 Sampling frame | Universe measured free, frame=universe∩feed-eligible keep zero-yield, strata tier×region 18 cells, balancing vars fixed snapshot, tier mix {HUB:1,MID:2,REGIONAL:1} | Defines eligible airports | Measured frame prevents convenience sampling | `scripts/build_stratified_catalog.ts:181`, `migrations/0021` | DOCUMENTED f.7 §§4.1-4.6 CANDIDATE 12mo metric + country lookup (NOT frozen until refs obtained, A30_3 #1-2) | `build-catalog` | `tier_version` etc. | Rebuild before FREEZE |
| §5 Population | FIDS provider-observable population per service interval and cutoff; snapshot existence is population+horizon eligibility; independent capture/features/outcomes | Denominator | Webhook capture never defines population/snapshot existence | migration 0019 + standalone FIDS helper | schema file exists; FIDS production path and snapshot builders NOT IMPLEMENTED | corrected Gate-5 funnel including captured-outside | provider pin + live unit cost | production wiring |
| §6 Pipeline & provenance | S2-S5 contract; `selected_t_milestone` remains MEASURE→FREEZE with no forced fallback; canonical clocks and snapshot cutoff rule | Leakage walls | Provider-native facts precede conditional aliases | current production path plus standalone helpers | DOCUMENTED; standalone corrections CODED but production wiring incomplete | Gate 0.5 semantics/trajectory | `selected_t_milestone` or BLOCKED | T/alias constructibility |
| §7 Outcomes | independent `flight_operational_state` and per-target `label_status`; identity-v2/codeshare/retime/chain rules; exact terminal retrieval | Modeling populations | Avoids mixing operational status with label availability | existing migration does not yet establish corrected model; helpers standalone | DOCUMENTED; corrected schema/terminalizer/production wiring NOT IMPLEMENTED | critical fixtures pending | `flight_instance_version` | code/schema integration |
| §8 Sampling design | 1×4h, UTC seeded balanced perm {00,04,08,12,16,20} HARD 6-day each slot once, calendar 26×4h+3×2×2h+2×6h, **exact five crossover pairs**, anchor 5 provisional 40/20/20/20, yield f(), REGIONAL `m∈[0.25,1.5]` Σp=1 with persistent coverage-floor eligibility, `sampling_weight` NULL | How to spend credits without bias | Frozen formula + minority yield guards feedback loop; efficiency not representation | controller legacy draw + `adaptiveMi_v3.ts` standalone helper + anchor scores | DOCUMENTED; adaptive helper CODED/UNIT_TESTED but production draw/crossover solver/floor behavior NOT IMPLEMENTED | deterministic adaptive/floor + SAT/UNSAT/pair tests required | `time_window_schedule_seed`, `anchor_pool_seed`, `adaptive_version`, `crossover_seed` | Adaptive/solver wiring |
| §9 Anchor probe | Stage1 exact12 target2h cap-censored; Stage2 exact5 target4h cap-censored with replacements; canonical yield stays uf/credit+chain/credit+stability; preprobe freeze record required | Yield-reference selection | Cap censoring must not redefine yield/stability | probe script requires corrected implementation audit | DOC RESOLVED; CODE/LIVE NOT CLOSED | cap-censor/stability/replacement tests | preprobe hash + probe config | no paid probe before offline closure/reference freeze |
| §10 Weather | METAR/TAF/GFS-NAM as-known-at-cutoff with issue/valid/retrieval/available clocks separated; ERA5 retrospective unless exact release availability verified; raw retention separately gated | Context | Prevents forecast/reanalysis leakage | current weather helper insufficient to prove full schema/join | DOC RESOLVED; weather tables/joins NOT IMPLEMENTED | amendment/release/ERA5-isolation tests | weather source/version/availability | tables/joins/source verification |
| §11 Credit canary | settled balance authoritative; official isolated canary exact `C_external==C_internal` (`CANARY_TOLERANCE=0`), zero failures/foreign billable subs; SEND-aware watchdog separate | Money proof | Integer item/credit mismatch must not be hidden by arbitrary tolerance | canary/controller code require offline correction proof | historical live FAIL retained; current official PASS pending | unit/integration mocks before live | `CANARY_TOLERANCE=0`; production tolerance separate only if measured | live authorization/evidence |
| §12 Model ladder/history | ladder plus bitemporal as-of store; separate `history_store_ready_at` from row `history_complete_for_snapshot` | What to model | Prevents post-hoc history leakage | standalone history helper | DOCUMENTED/CODED/UNIT_TESTED; NOT IMPLEMENTED | effective-time + availability integration tests pending | history/source versions | bootstrap/snapshot wiring |
| §13 Evaluation | Month1 PRE A/B/C/D/R/P + POST; Engine E deferred; same-flight POST grouping; Model1-vs-Model−1 result unknown; train1-20/val21-25/test26-31 with `test_holdout_gap_days=0` | How to believe result | Prevents tuning leakage and unsupported event-engine claims | evaluation path not verified | DOC RESOLVED / CODE NOT IMPLEMENTED | split/final-test/Engine-E guard tests | split hash, primary metric, gap=0 | protected test + evaluation code |
| §14 Marginal value | `MV_feature=ΔM`; `MV_data=ΔM/Δcredits` only with correct randomized/observational labels; learning curves separate model-specific sample counts from `(Alert_credits, REST_API_units)` cost | Final objective | Prevents treating credits as flights/rows or summing unlike billing units | Docs | DOC RESOLVED; analysis code pending | signed-MV + learning-curve tests | curve/cost metadata | implementation |
| §15 Code to-do | R/S foundation plus corrected FIDS/raw ingress/identity/m_i/history/PRE+AIRBORNE snapshots/terminalizer/weather/calendar/budgets/manifest | What to build | All load-bearing | complete requirement matrix required | OFFLINE IMPLEMENTATION UNKNOWN_GT_ZERO; no blanket IMPLEMENTED claim | full unit/integration/type/build/migration evidence | code version after implementation | production wiring |
| §16 Gates | 0 budget partition,1 coverage,2 anchor,3 canary,0.5 payload content,4 cap+reliability,5 census | Stop bad spend | Each guards next phase | `scripts/measure_coverage.ts`, `build_stratified_catalog.ts`, `credit_canary.ts`, `anchor_probe.ts` | Gate 0/1 IMPLEMENTED+LIVE, 2/3/0.5/4/5 BLOCKED | See Gate guide | `gate_status` per gate | Re-run after f.7 |
| §17 Runbook | Phases 0-7 steps 1-29 + manifest+test materialization order | How to run | Order avoids silent invalidation (money→measure→prove→freeze→spend) | `server/db.ts` migrations, controller watchdog | Steps 1-11 done provisional, 13-29 pending | Phase 6 daily record pending | `manifest_version` | Update Phase5 chronology done |
| §18 Contradiction map | PART1 governs over history where conflict | Resolve docs | Prevents old rules overriding | This file | FROZEN | — | — | — |
| §19 Sources | Chen & Li 2019, Zheng 2021 #2410, #4774 AIRBORNE only, #4935 GNN hypothesis, TR PartE 2024, FAA ASPM, AeroDataBox 2026-01-31, AviationWeather API history depth up to 30d (not retention permission), Springer ETA | Grounding | Separates peer-reviewed support from project constants (anchors etc.) | Docs | FROZEN with 2 citation fixes (§19) | — | `source_versions` | Live verify AeroDataBox at Gate 0 |
| §20 NOT-do | No V3.10, GNN-first, 1/p, foreign sub, overwrite, REST before cadence, PRE/POST merge, post-cutoff leakage, window=mising, Rescore, weather backfill, one empty=useless, crossover equalizes, month1 switches | Guardrails | Prevents silent science errors | Enforced by code checks + `ADB_AUTO_COLLECT=false` | ENFORCED | preflight scan `proposal/TBD/~` cat4 | — | Scan pending |
| §21 Final status | Architecture LOCKED, manifest PENDING, 60k entitlement USER-CONFIRMED; paid Phase6 WAIT Gates 0-5+FREEZE | Status | Honest GO vs WAIT | This file §0.6 | FROZEN statement f.7 | — | `final_status` | — |
| §22 Adjudication | V3.9-f.2 to f.7 change tables | Provenance | Answers which V3.x to use | This file | FROZEN | — | `adjudication_hash` | — |

---

<a id="log-section-3"></a>
## 3. Phase-by-phase walkthrough (phases with steps)

> The plan's runbook (§17) is organized as **phases with steps inside them** — we
> follow the same structure here (the old "steps with numbers only" framing was
> confusing and has been retired; its content moved to §12).

| Phase | Name | What it is | Status |
| --- | --- | --- | --- |
| 0 | Offline implementation closure | Make all Phase-6-critical production paths safe, budget-protected and leakage-safe; run offline tests/migrations/typecheck. No paid collection. | **NOT CLOSED — legacy foundation exists, but corrected FIDS/raw ingress/identity/history-weather/snapshots/terminalizer/m_i/calendar/budget wiring remains UNKNOWN_GT_ZERO until repo evidence closes it** |
| 1 | Gate 0 | Verify active 60,000-unit entitlement/cycle state, current refill/account rules, and the exact Alert + seven-category API-unit budget identities. | **BLOCKED — offline Gate-0 code/test closure plus fresh account/cycle evidence still required; historical refill/balance evidence is provenance only** |
| 2 | Gates 1–2 | Remeasure coverage, rebuild the verified traffic/region frame, execute the frozen cap-censored anchor protocol, then lock five valid Stage-2-confirmed candidates. | **BLOCKED — historical coverage/frame artifacts exist but are provisional/noncompliant with the binding frame rule; corrected frame/probe path and required evidence are not closed** |
| 3 | Gates 3–4 + 0.5 | Exclusivity cleanup, credit canary, SOFT_STOP test, payload inspection. | PENDING |
| 4 | Gate 5 | Census validation (FIDS population vs webhook events). | PENDING |
| 5 | FREEZE | Versioned manifest, hash split-assignment rule, config frozen. | PENDING |
| 6 | The 31-day run | 31 solver-generated batch-days; 1,900 is a daily Alert ceiling, while total spend is bounded by the frozen `phase6_alert_spend_ceiling≤57,900` and may be lower. | PENDING — NOT started |
| 7 | Month-1 deliverables | Execute/rerun snapshot builders **already implemented and offline-tested before Phase 6**, then leakage-safe evaluation of Model −1 vs Model 1 and cost/sample curves. | PENDING |

**Key rule: the 31-day run (Phase 6) waits for every gate (1–5) to pass.**

### Phase 0 — Offline implementation closure (legacy foundation exists; corrected production paths NOT CLOSED — see 16-field sheet below)

Plan §17's offline phase requires every Phase-6-critical production path and test to be closed before paid gates: R1 exclusivity, SEND-aware budget protection, exact canary reconciliation, failure PAUSE behavior, frozen/randomized templates, manifest refusal behavior, FIDS population ingestion, immutable raw ingress, identity-v2, history/weather as-of joins, PRE/AIRBORNE snapshot builders, target-specific terminalization, adaptive `m_i`, calendar solver, and the exact budget/registry/matrix checks. Legacy R1–R7/S-layer foundations and migrations are historical evidence only. **They do not prove the corrected binding paths are production-wired. Current Phase 0 is NOT CLOSED until the offline counters in §0.6/closure TODO reach zero with repository evidence.**

### Phase 1 — Gate 0 (BLOCKED pending offline closure + current live account evidence)

Historical evidence includes a 2026-08-16 refill/conversion observation and a then-current balance, but those values are **not current Gate-0 PASS evidence**. Gate 0 now requires: (1) offline budget/report/limiter tests complete; (2) confirmation that the USER-CONFIRMED `MONTHLY_PLAN_ENTITLEMENT_UNITS=60000` plan is still active; (3) current billing-cycle dates, units consumed/remaining and settled Alert balance; (4) current refill/account limits/conversion evidence; and (5) reconciled Alert-credit and seven-category API-unit identities. The final Phase-5 manifest is written later, after all gates and pre-run freezes; Gate 0 records sourced budget evidence rather than prematurely “committing the manifest.”

### Phase 2 — Gates 1–2 (historical progress exists; current execution BLOCKED until offline/reference prerequisites)

- **Step 10 — coverage:** a dated 2026-08-17 run measured a provider-backed universe through the legacy local aggregator. **Historical evidence only.** Current Gate 1 must remeasure from the pinned provider coverage inputs/local aggregator, record source/version/timestamp/hash/cost, and must not target the old 4,332 count.
- **Step 11 — frame:** the 2026-08-18 builder produced the legacy 4,320-row artifact by coercing missing-reference airports into REGIONAL and using an ICAO-prefix region heuristic. **Historical/provisional and noncompliant with binding §§4.1–4.2.** Rebuild with the frozen traffic reference, explicit `UNCLASSIFIED`, frozen country→region mapping/overrides, explicit `UNMAPPED`, and the final eligibility/hash contract.
- **Step 12 — anchor probe:** legacy script/probe evidence exists, including a zero-delivery attempt. The corrected cap-censored Stage-1/Stage-2 protocol, replacement logic, pre-probe freeze record, safety smoke, and offline tests must be closed before a new paid probe. Gate 2 is therefore **not passed**.

### Phase 3 — Gates 3–4 (+ 0.5, the canary)

Steps 13–16 cover R1 cleanup, the **official** isolated credit canary, Gate-0.5 provider/payload/timing measurement, and Gate-4 cap/reliability proof. A historical Gate-3 canary attempt failed and is provenance only. The required exact-`tol=0` canary correction, scaled offline Gate-4 tests and all live re-verification remain **NOT PASSED**.

### Phase 4 — Gate 5 (census validation)

Steps 17–19 validate the role-aware, append-only FIDS population observations over exact service intervals, guarded cutoff availability, independent webhook capture, snapshot expectations/creation, target outcomes and external US spot checks where available. A standalone FIDS helper exists, but the corrected production caller/schema selector/boundary guard are not proven wired; Gate 5 is **NOT PASSED**.

### Phase 5 — FREEZE

Steps 20–21 write the final versioned manifest only after all required gates/reference freezes/readiness artifacts pass. It must include the complete canonical registry, frame/reference hashes, exact calendar/budget, builder/code versions, account-budget evidence, retention classification/status and `split_rule_hash` (not future row IDs). The protected row IDs are materialized and hashed only after Phase 6 under the frozen rule. **Manifest is NOT FROZEN.**

### Phase 6 — The 31-day run

Steps 22–24: the calendar (26 × 4h + 3 × 2×2h + 2 × 6h), daily watchdog enforcing
1,900 cap / SOFT_STOP / exclusivity / delivery-failure pause, weekly diagnostics,
monthly airborne cadence re-measurement. **Not started — `autoCollect=false`.**

### Phase 7 — Month-1 deliverables

Steps 25–29: execute/rerun the PRE/AIRBORNE snapshot builders that had to be production-wired and offline-tested before Phase 6, materialize actual rows, then perform leakage-safe Model −1 vs Model 1 evaluation, cost/sample curves, collection-mechanism ablation and POST pilot. Labeled "early operational pilot", never "validated production model".

#### Phase 0 — Code deltas — A30 full sheet (16 fields)

- **Objective:** Make code safe, budget-protected, scientifically valid (R1-R7, S1-S5) without spending.
- **Prerequisites:** binding V3.9-f.8 PART 1 available, `ADB_AUTO_COLLECT=false`; document architecture locked but manifest not frozen.
- **Inputs:** PART1 §15, A30 §§37-78.
- **Steps:** R1 exclusivity, send-aware watchdog, exact canary, template/manifest; S1 population; S2 normalized raw layers; S3 event-log-first; S4 provenance; S5 versioned semantic identities supporting location and non-location observations.
- **Code files:** `server/lib/disruption/adbCollectionController_v3.ts:80` config, `:516` draw, `:639` startBatch, `:843` stopBatch, `:1404` watchdog; `flightDataPrePostStore_v3.ts:139` upsert, `:201` research key; `flightNotificationExtractor_v3.ts:242`; `flightInstanceCanonical_v3.ts:1` (new f.7), `fidsCensus_v3.ts:1` stub, `historicalFeatureStore_v3.ts:1` stub.
- **DB tables:** `adb_collection_batches`, `adb_ingest_events`, `flight_events`, `raw_airborne_events`, `clean_airborne_points`, `flight_trajectory`, `flight_airborne_snapshots`, `flight_population`, `historical_feature_store` (stub).
- **Migrations:** historical 0017–0023 foundation plus current 0024/0025 changes where present; technical readiness requires fresh-install + upgrade-from-0023 + repeat/idempotency + constraint/append-only validation and actual target application evidence.
- **Config:** `ADB_BATCH_BUDGET=1900`, `ADB_RESERVE_CREDITS=1000`, `ADB_DAILY_SOFT_STOP_MARGIN=50`, **official canary `CANARY_TOLERANCE=0`**; any nonzero production reconciliation tolerance is a separate MEASURE→FREEZE setting; `ADB_AUTO_COLLECT=false` during closure.
- **Commands:** repository-equivalent typecheck/lint/build/test/migration validation plus offline catalog/registry/scanner checks. Historical “57 errors” is provenance only; readiness requires the binding typecheck to exit 0 or remain an explicit blocker.
- **API/provider:** none (offline).
- **Outputs:** Migrated DB, controller safe mode, frame table empty until Gate1.
- **Artifacts:** migration SHAs, `shared/schema.ts` types (drift noted).
- **Tests:** migration idempotency (0022 re-run), extractor real payload, `available_at` NOT NULL check pending.
- **Gate:** none, but must pass `grep maxDeliveryRetries=0` + `sampling_weight NULL`.
- **Failure:** missing `available_at` wiring, `payload_sha256` NULL → FAIL Gate 0.5.
- **Rollback:** `down` migration not used; re-run `applyBootMigrations()` idempotent.
- **DoD correction:** legacy foundation status does not close Sep1 requirements. FIDS, identity-v2 wiring, history/weather tables, snapshots, terminalizer, raw ingress, and adaptive `m_i` remain CODED or DOCUMENTED but NOT IMPLEMENTED until production callers and integration tests are proven.
- **Next-phase dependency:** migrations **0024 and 0025** must pass offline fresh-install, upgrade-from-0023, constraint/append-only, and repeat/idempotency validation; the required target migration level must then be applied/evidenced before any affected live gate. Migration-file existence alone is not PASS.

#### Phase 1 — Gate 0 — Budget partition

- **Objective:** Verify money math before measuring world.
- **Prereq:** current **offline P0/P1 implementation closure PASS**, then human authorization and RapidAPI credentials live. Historical Phase-0 foundation alone is insufficient.
- **Inputs:** USER-CONFIRMED `MONTHLY_PLAN_ENTITLEMENT_UNITS=60000`, current account/plan/cycle evidence, and credentials needed for authorized reads.
- **Steps 5-9:** record the **current subscribed plan/marketplace account**, billing-cycle entitlement and balance; verify current refill conversion/caps with the minimum explicitly authorized live action required by the provider/account; freeze the current FIDS tier/unit cost (public contract currently TIER 2 → 2 units/request) and generated seven-category REST budget; run `npm run gate0` and commit the sourced evidence/artifact to the draft manifest. Historical refill/balance measurements are provenance, not present-day PASS criteria.
- **Code:** `scripts/gate0_budget_report.ts`, `server/lib/disruption/aerodataboxLimiter_v3.ts:26`.
- **Tables:** `adb_collection_meta` manifest, ledger `adb_ingest_events`.
- **Config:** `MONTHLY_PLAN_ENTITLEMENT_UNITS=60000` (user-confirmed), account-plan identity/evidence, `ADB_RESERVE_CREDITS`, and separate per-cycle usage fields.
- **Commands:** `npm run gate0`, `GET /subscriptions/balance` live.
- **API:** RapidAPI quota + Flight-Alert balance (1 unit→1 credit).
- **Outputs:** `gate0` PASS, manifest entry `budget_partition`.
- **Artifacts:** `rl*.md` balance_before/after, `manifest.json`.
- **Tests/evidence:** historical rl3 1-credit refill proved 1 unit→1 credit at that time; current Gate 0 re-verifies conversion/caps from authoritative account/provider evidence and uses the minimum explicitly authorized test action only if needed.
- **Gate:** Gate 0 PASS iff the user-confirmed 60,000 entitlement is confirmed unchanged for the active subscribed plan, current cycle state is sourced, refill/caps are verified, and both Alert/API-unit trees reconcile before any billable FIDS call.
- **Failure:** wrong `ADB_PLAN` or 58,900 vs 57,900 confusion → MISMATCH.
- **Recovery:** re-check account, no code fix.
- **DoD:** a newly sourced Gate-0 artifact records current settled Alert balance, account/plan/billing-cycle/API entitlement, authorized refill evidence as required, protected floor, pre-run allocation, exact computed `phase6_alert_spend_ceiling`, `unallocated_alert_credits`, and the seven-category REST ledger; draft manifest uses binding Plan `V3.9-f.8`. Historical balance `2900/2901` is not a current PASS criterion.
- **Next:** Phase 2 needs Gate 0 PASS.

#### Phase 2 — Gates 1–2 — Coverage + frame + anchors

- **Objective:** Measure universe, build measured frame, probe anchors.
- **Prereq:** Gate 0 PASS.
- **Steps 10-12:** remeasure current provider coverage through the evidenced FREE-TIER health/coverage inputs (or the proven local aggregator), rebuild/hash the final frame using the frozen traffic/region reference with missing-reference airports retained `UNCLASSIFIED`, then execute the cap-censored Stage-1/Stage-2 anchor protocol only after the pre-probe safety prerequisites pass. Historical `4332` universe / `4320` frame / `18/18` outputs are provisional provenance, not frozen current targets.
- **Code:** `scripts/measure_coverage.ts:15`, `scripts/build_stratified_catalog.ts:181` `buildStratifiedFrame` + `macroRegionForIcao`, `scripts/anchor_probe.ts:242` `runSingleProbe`, `:430` `computeScores`.
- **Tables:** `clean.adb_sampling_frame` (tier_source, traffic_prior, region, pre/post_eligible, in_frame), `adb_anchor_probe`.
- **Config:** `traffic_source_version`, `region_mapping_version`, `W_EXOGENOUS=0.4` etc., `CAPACITY_GATE=60`, `STAGE1_HOURS=2`.
- **Commands:** `npm run coverage`, `npm run build-catalog`, `npm run anchor-probe -- --stage 1 --icao WSSS` etc.
- **API:** provider FREE-TIER health/coverage endpoints feed the measured universe; a repository `/api/v1/collection/coverage` is only a local aggregator. Paid probe notifications cost 1 Alert credit per **flight item on provider SEND**, even if delivery fails.
- **Outputs:** current frozen frame/stratum artifact (with any `UNCLASSIFIED` explicitly reported), plus cap-censored probe exposure, `rows/h`, canonical-flight-instance yield/credit, chain-links/credit, stability, capacity and replacement trace. Historical `18/18` is not a required current numerical target.
- **Artifacts:** hash-stable current `adb_sampling_frame`/reference artifacts with measured row count (not hard-coded `4320`) and append probe records including actual exposure/censoring/replacements.
- **Tests:** deterministic tier/region mapping and hashes; every airport maps to exactly one verified region or explicit `UNMAPPED`; missing traffic stays `UNCLASSIFIED`; report all 18 possible verified tier×region cell counts without requiring historical `18/18`; eligibility invariants; cap-censoring/capacity/replacement rules.
- **Gate:** Gate1 `universe≥catalog`, Gate2 frozen formula + capacity gate before scoring (no lock before measurement).
- **Failure:** any raw-ingress/accounting safety prerequisite or mandatory tiny pre-probe smoke fails → **no paid Stage-1 probe**. The official Gate-3 canary is not a Gate-2 prerequisite; it occurs after completed Gate 2 under the binding sequence.
- **Recovery:** `--cleanup` orphan delete, `--check-webhook`.
- **DoD:** current coverage/frame sources and hashes verified under binding f.8 rules; missing-reference airports are not silently coerced to REGIONAL; pre-probe freeze record is immutable; all required anchor candidates are cap-censored/confirmed under the frozen protocol. Historical coverage/probe evidence cannot substitute for this current freeze.
- **Next:** Phase 3 needs Gates1-2.

#### Phase 3 — Gates 3-4 + 0.5 — canary + reliability + content

- **Objective:** Prove whole accounting + webhook path honestly.
- **Prereq:** Phase2 provisional, `ADB_AUTO_COLLECT=false`.
- **Steps 13-16:** R1 list/delete orphans; official canary requires stable balance and exact `C_external==C_internal` with tolerance 0; SOFT_STOP 1850; second-start guard; Gate 0.5 canonical timestamps, sample adequacy, payload preservation, and trajectory checks.
- **Code:** `scripts/credit_canary.ts:36`, `server/routes_v3.ts:81` webhook, `flightDataPrePostStore_v3.ts:254` dual insert, `server/lib/disruption/adbCollectionController_v3.ts:1404` watchdog.
- **Tables:** `adb_collection_batches` balance_before/after, `adb_ingest_events`.
- **Config:** `ADB_DAILY_SOFT_STOP_MARGIN=50`, `maxDeliveryRetries=0`.
- **Commands:** `npm run canary`, `npm run anchor-probe -- --check-webhook --cleanup`.
- **API:** 1 credit per item SEND.
- **Outputs:** `reconciliation_status PASS/MISMATCH`, `delivery_failures`.
- **Artifacts:** `rl9.md` canary FAIL (fixed), next canary PASS pending.
- **Tests:** canary composition + settle + orphan cleanup.
- **Gates:** Gate3 (C_external=C_internal), Gate0.5 (≥1 batch reconstructable, `prediction_state` only on snapshot, cadence recorded), Gate4 (SOFT_STOP 1850, retries 0).
- **Failure:** `delivery_failure=1` (rl9 is_randomized bug) → PAUSE+flag.
- **Recovery:** fix extractor `isRandomized ?? false`, re-run canary.
- **DoD:** LIVE-VERIFIED canary PASS + Gate0.5 cadence measured (currently BLOCKED).
- **Next:** Phase4 needs Gates3/0.5/4.

#### Phase 4 — Gate 5 — Census validation

- **Objective:** Validate the provider-observable population and quantify independent capture/snapshot/outcome dimensions. Only `captured_in_population ≤ population_total` is an invariant; outside-population captures are reported separately.
- **Prereq:** Gates3/0.5 PASS (payload honest).
- **Steps 17-19:** For sample airport service intervals, fetch FIDS `direction=Both` using the live account's verified max range and recursive splitting when needed; build population, then report captured-in/outside, expected/created snapshots, and observed/missing outcomes. FAA/BTS is US-subset external validation only.
- **Code:** standalone `server/lib/disruption/fidsCensus_v3.ts` exposes `fetchFidsPopulation` + `utcIntervalToLocal`, and an identity helper exists; focused evidence does **not** prove the guarded population scheduler/role-aware selector/identity-v2 path is production-wired.
- **Tables:** `flight_population` (source_type fids/schedule, observed_via_webhook), `flight_snapshots`, `flight_outcomes`.
- **Config:** `withCancelled=true`, `withCodeshared=true` with explicit ambiguity status, `withCargo=false`, `withPrivate=false`; exact half-open service interval converted with airport IANA timezone and split to the live-verified account max range. Unit cost remains provisional until verified.
- **Commands:** the documented `npm run fids-census -- --sample` path is a **required/verify-in-repository command**, not assumed production-ready merely because a helper file exists.
- **API:** `GET /flights/airports/{codeType}/{code}/{fromLocal}/{toLocal}` 2 units/call + `direction=Both` + `withCodeshared` warning.
- **Outputs:** funnel proportions per airport/tier.
- **Artifacts:** `flight_population` rows hash.
- **Tests:** DST spring-forward/fall-back, duplicate handling, schedule revision preservation.
- **Gate:** Gate5 reports role-aware `population_total`, `captured_in_population`, `captured_outside_population`, expected/created snapshots, missing features, and observed/missing outcomes. Only `captured_in_population <= population_total`; outside captures are investigated and never forced into the denominator.
- **Failure:** webhook capture rate implausibly low → provider coverage finding.
- **Recovery:** regenerate/re-freeze the affected seven-category API-unit budget only through the binding pre-run change-control path; never rely on the superseded “<1000 REST” shorthand or borrow silently across categories.
- **DoD:** Gate-5 live funnel evidence PASS **after** the guarded FIDS production path and required offline tests are proven; current state is NOT PASSED (standalone helper exists, production wiring/evidence incomplete).
- **Next:** Phase5 FREEZE.

#### Phase 5 — FREEZE — manifest + split rule

- **Objective:** Freeze everything that must not adapt on Phase6 outcomes.
- **Prereq:** Gates0-5 PASS (or Gates0.5/5 measure→freeze values frozen).
- **Steps 20-21:** Write `adb_collection_meta` versioned manifest (frame hash, tier_version, `region_mapping_version`, `anchor_score version 40/20/20/20`, `scheduler seed`, `anchor_seed`, `adaptive_version`, `FIDS version`, `milestone mapping`, `cadence thresholds`, `grace`, `snapshot builder SHA`, `history_ready_at`, `split_rule_version/hash` — but NOT row IDs), then AFTER Phase6 apply rule to actual rows, hash test row IDs read-only (§13.2). A30 §73 correction + A31 §24 correction.
- **Code:** `server/lib/disruption/adbCollectionController_v3.ts:291` `writeManifest`/`readManifest`.
- **Tables:** `adb_collection_meta` key='manifest', split/test-set metadata.
- **Config:** all `§4.1-13.6` frozen values.
- **Commands:** `npm run write-manifest`, `npm run hash-split-rule`.
- **Outputs:** `manifest.json` SHA, `split_rule_hash`.
- **Tests:** lexical scan `proposal/TBD/~/may` cat4 must be 0.
- **Gate:** FREEZE PASS iff manifest contains all f.7 fields + split rule hash.
- **Failure:** missing traffic_source_hash → NOT FROZEN.
- **DoD:** FROZEN (currently NOT FROZEN).
- **Next:** Phase6.

#### Phase 6 — 31-day run — 26×4h +3×2×2h+2×6h (≈84/10/6)

- **Objective:** Run the preregistered 31-day experiment **within** the frozen `phase6_alert_spend_ceiling ≤ 57,900`; 57,900 is a maximum design ceiling, never a spending target.
- **Prereq:** FREEZE PASS.
- **Steps 22-24:** Calendar 26×4h+3×2×2h+2×6h (see Plan §17 step22), watchdog 60s tick enforces 1900 cap/SOFT_STOP/exclusive/delivery_failure→pause/flag, weekly diagnostics (info-per-credit, coverage-age ≤5d core, hour spread), monthly cadence re-measure.
- **Code:** `adbCollectionController_v3.ts:1404` watchdog, `:639` startBatch, `:843` stopBatch reconcile.
- **Tables:** `adb_collection_batches`, `adb_collection_subs`, `flight_events`, `raw_airborne_events`, `flight_population` etc.
- **Config:** `ADB_BATCH_BUDGET=1900`, `ADB_RESERVE_CREDITS=1000`, `ADB_MIN_BATCH_CREDITS=300`.
- **Commands:** auto via watchdog (manual `autoCollect=false` stays).
- **API:** 1 credit/item SEND, 2 units/FIDS population call (REST line).
- **Outputs:** 31 solver-defined batch-days plus the realized counts of unique flights, PRE snapshots, POST snapshots and airborne points. Alert-credit spend is **not** a proxy for any of those row/sample counts.
- **Artifacts:** Phase-6 daily records (§31 format).
- **Tests:** SOFT_STOP at 1850, second-start guard, delivery_failure pause.
- **Gate:** none (run itself), but overshoot MISMATCH flags batch.
- **Failure:** HARD_CAP 1900 overshoot → MISMATCH.
- **DoD:** 31 days without MISMATCH, ledger `C_external` vs `C_internal` PASS per batch.
- **Next:** Phase7.

#### Phase 7 — Month-1 deliverables — snapshot materialization/rerun + evaluation

- **Objective:** Early operational pilot, not validated production model.
- **Steps 25-29:** execute/rerun the PRE/AIRBORNE snapshot builders that were already production-wired and offline-tested before Phase6; materialize actual collected rows, then fit/evaluate Model −1 vs Model1. Month1 reports A/B/C/D/R/P + POST; Engine E remains deferred until its event taxonomy/source is frozen.
- **Code:** stubs `historicalFeatureStore_v3.ts`, future `evaluation/` engines.
- **Tables:** `flight_snapshots` (T-24/6/90), `flight_airborne_snapshots` (t), `flight_outcomes` target-specific labels.
- **Config:** `history_ready_at`, `split_rule_hash` → test row IDs.
- **Commands:** `npm run snapshot-etl`, `npm run eval -- --engine A`.
- **Outputs:** Engine-A T-6 result for the frozen `selected_primary_target`, reporting whether Model 1 is better/equal/worse than Model −1 under the preregistered ≥2-min practical threshold + CI rule; staleness/collection-mechanism diagnostics. No winning result is assumed.
- **Tests:** constructible-at-cutoff must error, same-flight POST partition no leak, final-test protection.
- **DoD:** Report `early operational pilot`, GNN deferred.
- **Next:** Month2 power analysis trigger.

**Why the phases are ordered this way (the science):** you prove the *money
math* (Phase 1) before you *measure the world* (Phase 2) before you *prove the
pipeline honestly* (Phase 3–4) before you *freeze the config* (Phase 5) before you
*spend* (Phase 6). Every gate protects the next one from a silent invalidation.
Sources backing this: the credit/retry rules come from AeroDataBox's own Flight
Alert guide; stratification is standard survey design; the "persistence first" gate
comes from Chen & Li 2019 and Sternberg 2017 (see §2 §19).

<a id="log-section-3-1"></a>
### 3.1 Gate-by-gate guide — A30 §34 (16 fields each, preserves rl8/rl9 history)

#### GATE-0 — Budget partition (Plan §16 Gate0, A30 §34)

- **Purpose:** Verify money math before measuring world.
- **Sci rationale:** 58,900 vs 57,900 vs 1,000 floor confusion caused legacy 1,100 error; refill 1:1 must be live-verified.
- **Ops rationale:** FIDS REST cost must stay on the API-unit ledger, not the Alert-credit envelope. Current public FIDS is TIER 2 / 2 units per request, but Gate 0 freezes the actual current provider/account evidence.
- **Prereq:** current offline P0/P1 implementation/test closure passed for every Gate-0 dependency; `DATABASE_URL` + `AERODATABOX_API_KEY` available; `ADB_AUTO_COLLECT=false`. Historical “Phase0 DONE” labels do not satisfy this prerequisite.
- **Code path:** `scripts/gate0_budget_report.ts` reads `AERODATABOX_API_KEY` + `GET /subscriptions/balance` + `RapidAPI quota` header.
- **Command:** `npm run gate0` (after `npm run health`).
- **Provider/account:** RapidAPI plan monthly units, per-refill cap, balance cap.
- **Inputs:** USER-CONFIRMED `MONTHLY_PLAN_ENTITLEMENT_UNITS=60000`, plus live verification that the same subscribed plan remains active, current cycle dates/remaining units/usage, and `AERODATABOX_API_KEY`. Do not infer the marketplace/channel name from the entitlement alone.
- **Expected output:** current settled Alert balance + billing-cycle/API entitlement + refill conversion + protected floor/pre-run/Phase6/ending allocations and generated REST category caps. PASS requires the exact identities to balance; historical `2900`/`57,900` values are evidence/context, not assumed current values.
- **PASS:** actual plan/billing cycle/refill conversion verified; exact Alert and API identities balance; generated REST category total fits its protected allocation. Prior `939<1000` estimate alone is insufficient.
- **FAIL:** `data flow` FAIL while idle is expected; `floor` FAIL → re-check.
- **Actual output:** rl3 862→863 (+1) live 1:1, rl9 balance 2900 PASS (see §9, §11 2026-08-16).
- **Artifacts:** `rl3.md`, `manifest:budget_partition`.
- **Hashes:** `gate0_report_hash`.
- **Cost:** live Gate-0 verification must use the minimum explicitly authorized provider/account action needed to verify conversion/caps; do not hard-code a mandatory 1-credit refill if the current provider/account can be verified another way. Record any actual units/credits consumed.
- **Warnings:** `ADB_PLAN=VERIFY_AT_GATE_0` placeholder until live.
- **Failures:** legacy reserve 1,100 → SUPERSEDED.
- **Remediation:** re-login RapidAPI.
- **Rerun:** `npm run gate0` idempotent.
- **Final status:** **BLOCKED_LIVE_EVIDENCE** for the current run. Historical 2026-08-16/19 evidence is preserved but does not freeze present account/billing values.
- **Freeze:** `budget_partition` + `spendable_envelope` in manifest.
- **Next permitted:** Gate1 coverage.
- **Prohibited:** any FIDS call before Gate0 PASS.

#### GATE-1 — Coverage (Plan §16 Gate1)

- **Purpose:** Measure universe, not assume 276.
- **Prereq:** Gate0 PASS.
- **Code:** `server/lib/disruption/adbCollectionController_v3.ts:1587` `computeAirportCoverage`, `scripts/measure_coverage.ts:15`.
- **Command:** `npm run coverage`.
- **Expected output:** a freshly measured provider-backed universe artifact with source endpoints, retrieval timestamp, provider/OpenAPI version, response hashes, local-aggregator version/hash if used, current `universeCount`, current catalog intersection, and eligibility counts. No old count is the target.
- **PASS:** measurement succeeds from pinned FREE-TIER provider coverage inputs, identity/mapping QC passes, and the sanity relationship is evaluated on the **current** artifact; any catalog comparison is diagnostic, not proof that old counts must repeat.
- **Historical actual:** `rl7` observed 4,332 universe / 267 catalog-in-universe on 2026-08-17 through the legacy local route; provenance only.
- **Artifacts:** new current Gate-1 artifact + hashes; retain `rl7.md` as historical provenance.
- **Cost:** provider health/coverage endpoints are currently FREE TIER; re-verify at execution.
- **Status:** **PROVISIONAL / CURRENT RECHECK REQUIRED**, not currently frozen.

#### GATE-2 — Anchor probe (Plan §16 Gate2, §9)

- **Purpose:** Freeze anchor pool via measured yield, not fame.
- **Prereq:** current Gate 0 and Gate 1 PASS; frozen traffic/region/reference rules + rebuilt frame + hash-locked pre-probe freeze record; mandatory tiny pre-probe safety smoke PASS; corrected probe code/offline tests PASS.
- **Code:** `scripts/anchor_probe.ts:242` `runSingleProbe`, `:430` `computeScores` 40/20/20/20 + `1/(1+CV)` + `CAPACITY_GATE=60`.
- **Command contract:** sequential frozen-list Stage 1 target-2h probes, then five valid target-4h confirmations; both stages cap-censored at 500 credits/day. BLOCKED pending frozen lists, code correction, and human approval.
- **PASS:** scores 0-1, capacity gate applied, pool NOT locked before measurement.
- **Actual:** rl8 0 deliveries (webhook unreachable), rl9 WSSS sub 6a73207d created but hit is_randomized bug → SUPERSEDED.
- **Status:** BLOCKED pending offline probe correctness, current frame/pre-probe freeze, Gate0/1, explicit paid-action authorization, and the mandatory tiny pre-probe safety smoke. Official Gate 3 is later.

#### GATE-3 — Credit canary (Plan §16 Gate3, §11.2)

- **Purpose:** End-to-end accounting proof.
- **Code:** `scripts/credit_canary.ts:36` R1 exclusivity + settle `B_after==B_after_2`.
- **Command:** `npm run canary` (~2min, 1 credit).
- **PASS:** `C_external == C_internal` (`CANARY_TOLERANCE=0`) AND `failures=0` AND `B_after==B_after_2` AND >0 items, with no foreign billable subscription.
- **Actual:** rl9 FAIL `C_ext=1 C_int=0 failures=1` is_randomized NOT NULL → fixed `flightNotificationExtractor_v3.ts:372` `?? false`, re-run pending.
- **Artifacts:** `rl9.md` decoded §0.3.2.
- **Status:** FAILED→FIXED, LIVE-VERIFICATION PENDING.

#### GATE-0.5 — Webhook data-content (Plan §16 Gate0.5, §6.1-6.2)

- **Purpose:** Prove payload honest before spending.
- **Prereq:** Gate3 canary sub delivered.
- **Code:** `server/routes_v3.ts:81` webhook, `flightDataPrePostStore_v3.ts:201` research key.
- **Expected:** raw event preserves provider/source facts, `event_phase`, `data_stage`, complete canonical Plan §6.4 clock taxonomy, optional semantic `event_timestamp` (nullable), and live-location observations; `prediction_state` exists only on snapshots. Movement semantics/actuality, T constructibility, trajectories, and cadence are measured.
- **PASS:** ≥1 batch reconstructable, no field loss, distinct timestamps, cadence recorded.
- **Actual:** PENDING (canary FAIL blocked).
- **Freeze:** `grace_minutes`, `airborne_usable_min`, `cadence thresholds` (§6.6).
- **Status:** BLOCKED.

#### GATE-4 — Webhook + cap (Plan §16 Gate4, §11.3)

- **Code:** `adbCollectionController_v3.ts:1404` watchdog SOFT_STOP 1850, `maxDeliveryRetries=0`.
- **PASS:** `failures=0` retries0 SOFT_STOP 1850 second-start guard.
- **Actual:** PENDING.
- **Status:** BLOCKED.

#### GATE-5 — Population/census (Plan §16 Gate5, §5)

- **Code:** standalone `fidsCensus_v3.ts:fetchFidsPopulation`; direction `Both`, but interval is the exact service window split to the live-verified max range, never a fixed 12h. CODED/UNIT_TESTED, not production-wired.
- **PASS:** `captured_in_population <= population_total`; `captured_outside_population` is reported/investigated separately, with expected/created snapshots and observed/missing outcomes quantified.
- **Actual:** NOT PASSED — standalone FIDS helper exists, but binding production wiring/guard/boundary/selector evidence and live Gate-5 execution are incomplete.
- **Status:** BLOCKED.

#### FREEZE — manifest (Plan §17 Phase5, §13.2-13.6)

- **Code:** `server/lib/disruption/adbCollectionController_v3.ts:291` `writeManifest`.
- **Inputs:** all f.7 frozen values + `split_rule_hash` (not row IDs).
- **PASS:** manifest contains `traffic_version`/`region_mapping_version`/`FIDS version`/`milestone mapping`/`m_i`/`cadence`/`split_rule_hash` etc., lexical scan cat4=0.
- **Status:** NOT FROZEN.

#### FINAL PREFLIGHT — lexical scan

- **Code:** `grep -r "proposal|TBD|~|may|threshold|longer|planned"` `V3.9_DataCollectPlan.md` → classify (a)frozen (b)Gate-measured (c)deferred (d)blocker; cat4 must be 0.
- **Status:** PENDING.

---

<a id="log-section-4"></a>
## 4. Teaching: statistics and probability refresher

> This section assumes no math since high school and builds up every idea we use,
> in order, with worked examples from OUR own numbers.

<a id="log-section-4-1"></a>
### 4.1 Populations, samples, universes

- **Measured provider universe** = airports returned by the pinned provider coverage inputs at a dated Gate-1 measurement. Its size is **not hard-coded**; a 2026-08-17 run historically observed 4,332.
- **Primary sampling frame** = the measured universe filtered through the frozen feed, traffic-tier, region and scope rules. Missing traffic reference remains `UNCLASSIFIED`; missing region remains `UNMAPPED`; neither is silently sampled as REGIONAL. Its final size is measured and hashed at Gate 1, not assumed to be 4,320.
- **Sample** = the airport/window assignments actually selected by the frozen daily design (typed 1 HUB + 2 MID + 1 REGIONAL slots, subject to the binding eligibility rules).
- **Provider-observable flight population** (S1) = append-only FIDS/schedule membership observations available by a prediction cutoff; it is the denominator relative to the validated provider-supported operational frame, not “whatever the webhook happened to emit.”

> **Historical-number warning:** 276 curated airports, 267 catalog-in-universe, the 4,332 universe observation and the 4,320 legacy frame are useful provenance/examples only. The legacy frame coerced missing-reference airports into REGIONAL and is explicitly superseded. Current sampling uses the **newly remeasured and hash-frozen frame produced under binding Plan §§4.1–4.4**, whatever its resulting cardinality is.

<a id="log-section-4-2"></a>
### 4.2 Sets and set operations

A **set** is a collection of things (here: airports). We use three operations:

- **Intersection (∩)** — things in *both* sets. Historical example: the dated 2026-08-17 artifact reported `legacy curated catalog ∩ measured provider universe = 267`.
- **Union (∪)** — things in *either* set.
- **Complement / difference** — things in one set but not another. In the same **historical** artifact, `4,332 − 267 = 4,065` described universe airports outside that curated catalog.

Those arithmetic examples remain useful for learning set operations, but their numeric inputs are **not current frame requirements**. Gate 1 remeasures the universe and rebuilds the verified frame rather than trying to reproduce them.

<a id="log-section-4-3"></a>
### 4.3 Probability

A **probability** `p` is a number between 0 and 1 saying how likely something is.
For a random draw over `n` equally likely options, each option has
`p = 1/n` and all the probabilities **sum to exactly 1**. Example: if the REGIONAL
pool has 100 eligible airports and we draw uniformly, `p_i = 1/100` each.

- **Design probability** = the probability *our design* assigned to a pick. We
  record the *realized* one (`airport_layer_design_probability`) on every row so
  later weights are computable. Its full honest name in the plan is the
  "conditional design probability given the frame + adaptive state immediately
  before the draw" (V3.8) — see "conditional" below.
- **The `1/p` weight, and why we DON'T write it (plan §30.2b).** In a survey, if an
  airport is drawn with probability `p`, the standard trick is to weight its rows
  by `1/p` so rare airports are counted more and the total stands in for the
  universe. That weight is only valid when `p` is a **flight-inclusion**
  probability — the chance that a *flight* ends up in our data. But our draw is
  over **airports**, not flights: a flight is included only if its airport
  happened to be subscribed that day (and if it had a rotation, and if the
  delivery was stored). So `1/p_airport` is **not** the flight's inclusion
  probability, and stamping it on rows would silently bias later statistics. This
  is the plan's hard rule: `airport_layer_design_probability` is **airport-layer
  metadata**, never a flight weight; `sampling_weight` stays NULL until the plan's
  §10 work measures the real flight-inclusion denominator (§30.2b, the "flight
  inclusion ≠ airport selection" correction). Our canary/reconciliation and the
  probe's credit math never assume `1/p`.
- **Conditional probability** = probability given some condition. At the REGIONAL
  draw, `p_i` is conditional on **the pool that survived filtering that day**.
  Concretely: each day the controller first filters the frame (only
  `post_eligible=true`, not currently in a batch, not in a too-recent rotation,
  credit cap not hit). Say 100 airports survive the filters on Monday and 80 on
  Tuesday. `p_i` is computed as `1/(number that survived THAT day)` — so `1/100`
  on Monday, `1/80` on Tuesday — not `1/4320` against the whole frame. That is why
  the recorded value is "conditional": the denominator is the pool that was *still
  standing* at the moment of the draw, and it can differ day to day. The plan made
  this an explicit wording fix (V3.8): it is not a fixed "realized inclusion
  probability", it is the conditional design probability at the draw.

<a id="log-section-4-4"></a>
### 4.4 Stratification

**Stratified sampling** splits the frame into non-overlapping groups (strata) and
samples within each. Our primary strata are **traffic tier × macro-region** = 3 × 6
= 18 cells. Answering the two "where do these numbers come from?" questions:

- **The 3 (traffic tiers) come from how busy an airport is**, and they were already
  how our curated catalog is classified: **HUB** (~30 very large international
  hubs), **MID** (~89 mid-size workhorses), **REGIONAL** (~157 smaller
  regional airports). The plan's daily batch mix is exactly `{1 HUB, 2 MID,
  1 REGIONAL}` per window. Tier is the single strongest predictor of how much
  data an airport produces (a HUB like WSSS dwarfs a small regional), so it is the
  first thing we stratify on.
- **The 6 (macro-regions) come from the plan's "Priority anchor regions" list** —
  North America, Europe, Asia-Pacific, Gulf/Africa, South America, Oceania. PART 1
  defines the strata as "traffic tier × macro-region" but does not enumerate the
  regions; our 6-region set is our documented choice, taken directly from that
  priority-regions list (§23). A region here is a real geographic/aviation region,
  not a country.

Why cross them into 18 cells instead of just sampling the frame randomly? Two
reasons. (1) **Guarantee of representation:** if we did one big random draw, a
rare cell (say REGIONAL × Oceania) could go completely un-sampled for a long time
by bad luck; stratifying forces every cell to be represented, so the final data
covers the whole design. (2) **Lower variance within strata:** airports in the
same tier and region behave more alike than airports picked from anywhere, so
measuring a few per cell gives a more stable picture than measuring the same
number from the whole frame. The plan says cross **only** tier × region — crossing
more variables (e.g. time-of-day × tier × region) would explode the cell count (18
is already 18; doubling the crossing makes it unwieldy).

**What "18/18 strata non-empty" means** (step-11 output, rl7): it means all 18
tier×region cells contain at least one frame airport — no cell is empty, so every
stratum is actually sampleable. "pre 3,337 / post 2,264 / both 1,281" refers to
the same frame split by feed layer: 3,337 airports have the schedule feed
(pre-eligible), 2,264 have live/ADS-B (post-eligible), and 1,281 have both.
"Strata non-empty" and "pre/post" are just two different ways of slicing the same
4,320-row frame — one by tier×region, one by which data layer the airport can
serve (§6.1).

<a id="log-section-4-5"></a>
### 4.5 Randomization and seeds

First, **UTC** — the timestamps everywhere in this project use **UTC (Coordinated
Universal Time)**, the global time standard that is essentially GMT (London
Greenwich time, without daylight-saving shifts). Flights cross time zones; a
"departure" at 14:00 in Singapore is 06:00 UTC. If we stored local wall-clock
times from different airports, "is this the same instant?" would be unanswerable.
So every column that ends in `_utc` (and `window_start`, `received_at`, etc.) is
a UTC timestamp, and the "UTC slot" for collection is one of {00, 04, 08, 12, 16,
20} — the six 4-hour blocks of the UTC day. Storing UTC makes every comparison
apples-to-apples.

A **seed** is just an integer that initializes a pseudo-random number generator.
The same seed always produces the **same** sequence of "random" numbers. We seed
the generator so the draw and the UTC-slot rotation are **replayable**: anyone can
re-run the exact same random sequence from the seed and verify the picks — a
reproducibility requirement for science. "Balanced permutation" means we don't
just draw random UTC slots; we shuffle the 6 slots so each appears once per 6-day
block (no airport ever gets unlucky with 3 midnights in a row). HUB/MID are
*deterministic slot-fill* (we want the best fresh ones, no randomness needed);
REGIONAL is a *probability draw* (we want a well-defined distribution over the
long tail). `random_seed` is recorded per batch/row so the draw is auditable.

<a id="log-section-4-6"></a>
### 4.6 Averages, variance, coefficient of variation

- **Mean** = sum ÷ count (the "average").
- **Variance** = average squared distance from the mean; **standard deviation (SD)**
  = square root of variance. SD tells you how spread out the numbers are.
- **Coefficient of variation (CV)** = SD ÷ mean. It is a *unit-free* spread measure.
  Example from our stability metric: count rows in each 15-minute bucket of a probe
  window; if buckets are [10, 11, 10, 9, 10], mean ≈ 10, SD ≈ 0.6, CV ≈ 0.06 —
  very stable. If buckets are [0, 20, 0, 20, 0], CV is huge — unstable.
- **Stability = 1 / (1 + CV)** — a "stability score" between 0 and 1 that is 1
  when CV = 0 (perfectly steady) and shrinks as CV grows. This is one of the three
  yield components.

**The three yield components, in plain words.** The plan (§23) defines the yield
metric as `f(unique_flights_per_credit, tail_chain_links_per_credit, stability)`,
each standardized to [0,1]. What each one is actually measuring:

1. **unique_flights_per_credit** — how many *distinct flight numbers* we get for
   one credit. A busy international hub returns many different flights (SQ305,
   SQ306, …) for the same spend; a quiet strip returns the same handful again and
   again. High = the credit buys *breadth* (many different flights).
2. **tail_chain_links_per_credit** — for each aircraft tail (registration, e.g.
   `9V-SKD`) that flies N legs inside the window, those N flights are N−1
   "rotation links" of that aircraft (land → next takeoff). Summed across tails and
   divided by credits, this measures how much *delay-propagation material* (the
   chains a disruption travels down) a credit buys. High = the credit buys *chain
   structure*.
3. **stability** — how *consistent* the data stream is across the window (rows
   arriving steadily in every 15-min bucket vs arriving in bursts). High = the
   airport is a steady producer, so a short window represents its long-run
   behavior (the plan's full definition adds the probe-to-probe variance once 2+
   probes exist: fewer observations → wider confidence → lower weight).

All three answer the plan's core question in different words: **how much science
do we get per unit of money?** (the "marginal value per credit" philosophy — judge
everything by credits actually spent, never by row counts alone).

<a id="log-section-4-7"></a>
### 4.7 Ratios "per credit" — the marginal-value idea

`unique_flights/credit` and `chain-links/credit` answer: *how much science do we get
per unit of money?* That is the plan's "marginal value per credit" philosophy —
evaluate everything against `C_actual` (balance delta), never against row counts.
`chain-links` = for each aircraft tail that flew N legs inside the probe window,
N−1 rotation links connect them (that aircraft's flight chain).

Worked example (all made-up numbers to show the shape): a 2 h probe of airport X
spends 20 credits and stores 60 unique flights across 15 aircraft tails that flew
39 legs total. Then `uf/credit = 60/20 = 3.0`, `chain/credit = (39−15)/20 =
24/20 = 1.2`, and stability = 1/(1+CV) of the bucket counts, say 0.85. Airport Y
spends the same 20 credits but yields 20 unique flights, 8 links, stability 0.30 —
clearly X buys more per credit. The standardization in §4.8 turns those raw ratios
into comparable 0–1 numbers.

<a id="log-section-4-8"></a>
### 4.8 Standardization (the "standardized measurement" in §9)

To compare airports fairly, raw numbers need a common scale. We **standardize to
[0,1] against the WSSS baseline**:

```text
uf_standardized = clamp( probe.uf_per_credit / WSSS.uf_per_credit , 0, 1 )
```

If KLAX delivers 0.80× the flights-per-credit of WSSS, its standardized value is
0.80. `clamp` just cuts anything below 0 or above 1. We do this for all three yield
components, then the **yield score** is the simple average:

```text
yield_score = ( uf_std + chain_std + stability_std ) / 3
```

**What "yield-reference" means, and where WSSS/OMAA fit.** The baseline is a
*reference measurement* that every other airport is divided by, so "good" is always
defined relative to a known, identically-measured airport instead of to an
arbitrary number. WSSS (Singapore Changi) and OMAA (Abu Dhabi Zayed) are the two
baselines the plan gives us reference points for: probed, WSSS yields roughly
**331 rows per hour** and OMAA roughly **127 rows per hour** — those are just how
much data each airport's traffic produces per hour of subscription (a busy hub
pushes more rows/hour than a mid-size one). We re-probe WSSS and OMAA **ourselves,
with the exact same 2 h protocol** as every candidate (the plan calls this
"measured the same way as calibration", §23 step 4), so the denominator is measured
identically — never assumed. If our own WSSS probe measures `uf/credit = 2.0`, then
KLAX at `1.6` standardizes to 0.80, OMAA at `0.5` to 0.25, and so on.

**Full worked example.** Say our measured WSSS baseline is `uf/credit = 2.0`,
`chain/credit = 0.8`, `stability = 0.90`, and candidate EGLL measures `1.6`, `0.6`,
`0.72`:

```text
uf_std     = clamp(1.6/2.0, 0, 1) = 0.80
chain_std  = clamp(0.6/0.8, 0, 1) = 0.75
stab_std   = clamp(0.72/0.90, 0, 1) = 0.80
yield_score = (0.80 + 0.75 + 0.80)/3 = 0.783
```

Every component is measured by the same probe → same time-of-day class → same
credit math (§23 step 4b), so the ratios are apples-to-apples.

<a id="log-section-4-9"></a>
### 4.9 Weighted scores

**Why we need an anchor score at all:** the plan needs to turn the 12 candidate
airports into a **5-airport anchor pool** — a ranked, defensible choice of which
airports drive the HUB share of every batch. Raw yield alone would be a terrible
rank (one good probe day could pick a "lucky" airport), and pure schedule size
would ignore what we actually measure. So the plan (§23 step 5) fixes a weighted
score in code *before* measuring, and the probe is only one input.

An **anchor score** combines several parts with weights that sum to 1:

```text
anchor_score = 0.40·exogenous_traffic + 0.20·geo_diversity + 0.20·carrier_diversity + 0.20·yield_score
```

Each part is itself 0–1, so the result is 0–1. What each part means:

- **40% exogenous traffic** — the airport's *published* scheduled traffic (flights
  per year from schedules/reference data). This is the biggest weight deliberately:
  it encodes years of known aviation activity.
- **20% geographic / network diversity** — how well the airport spreads our
  coverage across the world (a geo/network index).
- **20% carrier / international diversity** — how international/carrier-rich the
  airport is (how many airlines, how much international share).
- **20% standardized observed yield** — our own measured probe yield (§4.8). Kept
  at only 20% so a single good probe day **never** overrides years of scheduled
  traffic — this is the plan's anti-feedback-loop guardrail: sampled → high
  observed degree → chosen as anchor → sampled more would be a self-justifying
  loop (§23 step 4a).

Weights say how much each part matters. The first three parts come from
**published reference data, frozen before any probe** — our own collection never
feeds the exogenous 80%. The formula is fixed in code pre-probe; measured data only
*fills in* the 20%, never re-weights the formula (the "frozen" rule, §4.11).

<a id="log-section-4-10"></a>
### 4.10 Reconciliation (the canary's check)

`C_external = balance_before − balance_stable` is authoritative Alert spend for the isolated canary. `C_internal = Σ notification_items_received` is the internal item ledger. The **official isolated Gate-3 canary uses exact integer equality: `C_external == C_internal` (`CANARY_TOLERANCE=0`)**, plus stable balance, zero failures, and no foreign billable subscription. If a
foreign subscription existed, the balance delta would mix in *its* spend — hence
exclusivity (R1) first. The canary is the *unit test* of reconciliation: create one
tiny subscription, watch one window, delete it, and compare the two numbers. The
rl9 canary FAIL (`C_external=1`, `C_internal=0`, `delivery_failure=1`) is exactly
what the check exists to catch — the two quantities disagreed because the webhook
handler threw before storing anything.

<a id="log-section-4-11"></a>
### 4.11 Why formulas are "frozen" pre-probe

If you decide the scoring formula *after* seeing the data, you can always make the
formula fit the data (a researcher's bias). Freezing the formula, the weights, the
shortlist, and the exogenous references in code **before** measuring means the
measurement is allowed to *disagree* with our prior — that's what makes the probe
an honest test. The plan makes this a hard rule (§8 "formula frozen in code
pre-probe"; §9 step 4).

<a id="log-section-4-12"></a>
### 4.12 "Capacity is a gate, not a component" — the difference

We measure two different kinds of things about each airport, and mixing them up is
the exact mistake the plan warns against (§23 step 4):

- **A score component** ranks airports against each other. More is *better* — it
  trades off against the other components. The three yield components and the three
  exogenous parts are score components (they add up to the anchor score in §4.9).
- **A gate** is a PASS/FAIL yes/no: the airport either clears the bar or it is
  disqualified *entirely*, and no amount of score can rescue a gate failure.

**Capacity** (our code: `rows_per_hour ≥ 60`) is a **gate**. It answers one
question only: *does this airport physically deliver enough data to be worth a
subscription slot?* If an airport pushes only 30 rows/h, it can't fill a batch
usefully — FAIL, out of the pool, regardless of how good its stability is. If it
pushes 200 rows/h it PASSES, but being 200 vs 150 does **not** make it "better" —
capacity is never added into the anchor score. Why? Because making capacity part of
the score would slide us toward "easiest to collect" instead of "most useful
information" — a huge-but-easy airport would outrank a scientifically rich one.
The plan's words: "capacity never trades off against scientific yield." Our code
prints `capacity PASS` / `capacity FAIL (… rows/h < 60)` and only airports that
PASS the gate enter the ranking.

<a id="log-section-4-13"></a>
### 4.13 The evaluation suite (Month 1 A/B/C/D + R/P + POST; Engine E deferred) and the R / S codes

**What the engine letters mean (Plan §13).** Month 1 enables A/B/C/D + R/P plus POST. Engine E is reserved for disruption-event stress **after** a named multi-flight event source/taxonomy is frozen and tested. This is the ML evaluation design, not the anchor probe. It is a family of baseline engines that will each be trained and
tested on the data we are collecting now:

| Engine | What it tests (which generalization question) |
| ---- | ---- |
| **A** | Primary: behaves like the real deployment — chronological, day/event-blocked; the model may reuse tails it saw in training |
| **B** | Unseen *airport* (same region) — does the model work on airports it never saw? |
| **C** | Unseen *region* |
| **D** | Unseen *tail / aircraft type* (cold-start) — the only one with hard tail-blocking |
| **E** | **DEFERRED Month 1** — future disruption-event stress; once a named multi-flight event source/taxonomy is frozen, keep each event wholly in one partition |
| **R** | Unseen *route/OD pair* (e.g. train LAX→ORD, test SEA→JFK) — separates airport-identity memorization from real dynamics |
| **P** | *Population audit* — compares against the FIDS census |
| **POST** | The airborne ETA/delay model, time-ordered per flight |

These engines exist so the final evaluation can honestly answer *"does the model
understand aviation, or did it just memorize what it saw?"* and *"does it survive
a brand-new airport/region/tail?"* — each engine blocks one kind of leakage. This
is **not** the anchor probe. You will not interact with it now; it only matters
because the data we collect now is what those engines will later train on (which
is why "collection-mechanism ablation" — did the model learn operations or how we
bought data? — is in the plan).

**What the "R1/R2/R3/…" and "S1/S2/…" codes are.** These are the plan's internal
*requirement* codes that came out of the 9 review rounds the plan documents (each
"review" was a critique of an earlier draft; the plan is the adjudicated result).
An **R** code is a requirement added to fix a review finding:

- **R1** — **experimental-set exclusivity**: no foreign/non-experimental billable subscription may exist alongside the authorized experimental set. A canary/probe intentionally has one experimental subscription; a Phase-6 batch may have its intended multiple airport subscriptions, all linked to the same batch/set. This prevents balance-delta contamination without incorrectly banning the batch's own subscriptions.
- **R2** — **SOFT_STOP** margin: the watchdog stops at 1,850, 50 below the 1,900
  cap. This reduces overshoot risk but does **not** make it impossible because charging occurs on SEND and unsettled/in-flight attempts can exist.
- **R3** — the **credit canary** gate itself (the script we just ran).
- **R5** — the **delivery-failure flag** (`delivery_failure` on ingest events) so a
  broken webhook pauses collection instead of silently burning credits.
- **R7** — a **versioned manifest** written at batch start (auditability).

An **S** code is a *layer* of the data pipeline: **S1** population census,
**S2/S3/S4** per-flight event/observation logs, **S5** airborne trajectory points.
When the log says "R1 exclusivity" or "the S5 layer", that is the plan's shorthand
for these numbered requirements — they are all named and explained in the glossary
(§5) and the audit snapshot (§12.7).

---

<a id="log-section-4-14"></a>
### 4.14 A30 required expansions — randomization through uncertainty (aviation examples, every symbol defined)

**Randomization:** pseudo-random with seed → replayable permutation. Example: `time_window_schedule_seed=42` → 6-day block `{12,00,08,20,04,16}` each slot once, weekday de-correlated.

**Blocking:** stratify then randomize within verified strata. With 3 verified tiers × 6 macro-regions there are 18 **possible** primary cells; empty cells are reported rather than forced non-empty. UTC scheduling is balanced by the frozen scheduler; sampling is never described as randomizing across a hard-coded 4,320-airport frame.

**Crossover (R6):** exactly five matched pairs are frozen: 3 compare 4h control vs 2×2h and 2 compare 4h control vs up-to-6h. `crossover_group_id` identifies one pair; pair contrast/airport set/time+weekday class/split are frozen first, then `crossover_seed` randomizes **order within pair**. Same airport set, ≥24h end→start washout; primary analysis is within-pair with batch-day clustering.

**Bootstrapping (block):** Month-1 uncertainty is estimated by resampling experimental blocks, not rows. Use 1000 Monte-Carlo replicates and a 95% percentile interval. For Engine A the block is calendar day; with only six protected test days this remains **pilot uncertainty**, not confirmatory validation.

**Rolling-origin:** the exact development fold intervals are frozen after Phase-6 row materialization but before the first model fit/outcome-driven tuning; folds use only non-test days 1–25. Protected Engine-A test days 26–31 are excluded. Day-27 analysis, if any, is post-lock descriptive only.

**Calibration (probability):** `ECE = Σ_b |acc(b)-conf(b)|·|b|/N` 15 equal-width bins, reliability diagram. Separate from `yield-reference normalization` (anchor).

**Brier score:** `Brier = 1/N Σ (p_i - y_i)^2` for `P(selected_primary_delay>15)` and `>60`; `>120` is secondary only. The selected target must be frozen/constructible first.

**ECE bins:** `acc(b)= mean y in bin`, `conf(b)= mean p in bin`.

**Confidence / prediction intervals:** 90% quantile baseline Month1 (quantile regression on validation), conformal deferred to Model7 `conformal_method` + `target_coverage` (A30 §77).

**Causal vs associational:** `MV_data=ΔM/Δcredits` under **randomized/paired intervention** is associational under design, not universal causal `do(X)`. Never claim `+1 MID caused 0.7min`.

**Information/credit & marginal value:** `MV=ΔM/Δcredits` uses actual ledger cost and may be positive, zero, or negative. Only randomized window-shape treatment supports randomized paired language; +MID/+REGIONAL/+week comparisons remain observational/exploratory. Learning curves fit only within observed sample-size domains.

**Network degree:** directed `out-degree` distinct destinations with ≥1/week, `in-degree` distinct origins, `undirected` either, `threshold k≥1/week` per §4.5.

**Chain propagation:** same-tail `N legs → N-1 links`, buffer `turnaround - minimum`, utilization affects propagation (Zheng 2021). Chain completeness `linked / should_have_successor` per §12.2.2 (scheduled vs observable inside collection boundary, A30_3 #10).

**Uncertainty:** aleatoric (weather) vs epistemic (tail unknown), `tail_known` flag, `days_since_last_obs`, `coverage_age` as staleness feature, not imputed.

<a id="log-section-5"></a>
## 5. Teaching: glossary of every technical term

Alphabetical, one plain paragraph each. Terms already fully explained in §4 are
marked "(see §4.x)".

- **Anchor** — one of the 5 airports that drive the HUB share of every batch. The
  pool `KLAX·EGLL·WSSS·SBGR·OMDB` is **provisional until the probe proves it**.
- **Anchor score** — the frozen 0.4/0.2/0.2/0.2 weighted score used to lock the 5
  (see §4.9). Capacity is a gate, not a component.
- **Yield-reference** — WSSS (~331 rows/h) and OMAA (~127 rows/h), probed the
  same way as every candidate, providing the reference the yield components are
  standardized against (§4.8). They are marked `isYieldReference` in the shortlist.
  "Baseline" = the yardstick; "calibration" = the reference is measured by us with
  the identical protocol, not assumed.
- **Canary** — a tiny, controlled live test (a "canary in a coal mine") using a **small pre-authorized Alert-credit ceiling**. Cost is not guaranteed to be one credit because billing is per flight item per provider SEND. The historical failed run happened to cost 1 credit. It subscribes to one airport for a short frozen window, then reconciles the required ledgers and must PASS
  (§7.2). The credit canary is the same thing — this one canary *is* the credit
  canary (`scripts/credit_canary.ts`, `npm run canary`).
- **Capacity / feasibility gate** — PASS/FAIL: does the airport physically deliver
  enough data (our code: rows/h ≥ 60)? A gate is a yes/no that disqualifies an
  airport outright; it is **never** added to the score (§4.12).
- **Legacy curated catalog** — the historical 276-airport list (30 HUB + 89 MID + 157 REGIONAL) used in earlier development. It is provenance/reference material, **not the binding primary frame and not a rule for classifying all other airports**. Historical intersections such as 267/276 and the legacy 4,320-row frame must not be reused as current Gate-1 targets; see §4.1 and Plan §§4.1–4.4.
- **Chain links / tail chain** — for each aircraft tail, N−1 rotation links over N
  observed legs; a measure of delay-propagation material (see §4.7).
- **Conditional probability** — probability given a condition. At the REGIONAL
  draw, `p_i` is conditional on the pool that *survived filtering that day*: the
  denominator is the airports still standing at the moment of the draw, not the
  whole frame (§4.3).
- **Coverage** — which airports the pinned AeroDataBox coverage/feed interfaces report as supported at a dated measurement. The relevant provider health/coverage inputs are currently documented as FREE TIER, but execution re-verifies provider contract/cost and records the retrieval/source hash.
- **Credit** — Flight-Alert balance unit; 1 credit per flight item per delivery
  attempt, deducted on SEND; refill 1 unit → 1 credit.
- **Crossover** — the window-shape experiment (4h vs 2×2h vs 6h); template frozen
  before treatment so treatment never depends on post-freeze observations.
- **Cutoff** — the time boundary a prediction uses; features must be ≤ cutoff; the
  POST event supplies only the label.
- **data_stage PRE|POST** — which prediction state a payload serves; raw events
  carry `data_stage`, never `prediction_state` (that is derived on snapshots).
- **Dedup (legacy current-state behavior, NON-CANONICAL for research provenance)** — a legacy `dedup_key` may upsert a mutable convenience/current-state table, but raw deliveries/items and semantic observations are append-only identities under Plan §6. A `(flight, carrier, lastUpdatedUtc)` key must never deduplicate raw/event/trajectory provenance.
- **Design probability** — the realized probability of a REGIONAL pick
  (`airport_layer_design_probability`), stamped per row (see §4.3).
- **Design ceiling** — 57,900 credits is the maximum possible Phase-6 design ceiling; the actual frozen `phase6_alert_spend_ceiling` may be lower after pre-run/floor/margin accounting.
- **Engine (A–E + R + P)** — the evaluation-suite baseline engines for the later ML
  phase; each answers one generalization question (unseen airport / region / tail /
  route, disruption stress, population audit). NOT the probe (§4.13).
- **Evaluation suite** — the plan's ML testing design (plan §13): a family of
  engines A–E + R + P + Model POST, each with its own leakage-blocking split, run
  on the data we collect now (§4.13).
- **Exclusivity (R1)** — no foreign active subscription may exist during the
  experiment; the canary asserts it and the probe enforces it.
- **FIDS** — Flight Information Display System data (schedules) from AeroDataBox,
  ≈2 API units per airport-window; the basis of the S1 census layer.
- **Frame** — the sampled-from set: universe ∩ feed-eligible, zero-yield kept
  (§2 §4, §4.1).
- **Frozen** — decided in code before measurement and never tuned on outcomes
  (see §4.11).
- **Gate** — a GO/NO-GO checkpoint (0, 1, 2, 3, 0.5, 4, 5) — all must pass before
  the run (§2 §16). Also the PASS/FAIL *feasibility* kind (capacity gate, §4.12):
  a yes/no that never enters a score.
- **HUB / MID / REGIONAL** — the three traffic tiers: ~30 big hubs, ~89 mid,
  ~157 regional in the curated catalog; the daily mix is {1, 2, 1}. "Traffic tier"
  = how busy the airport is — the 3 in "3 tiers × 6 regions" (§4.4).
- **Inclusion probability (and the `1/p` weight)** — the chance that an item lands
  in the sample. Weighting rows by `1/p` is only valid when `p` is a
  *flight-inclusion* probability; our draw is over airports, so we do NOT stamp
  `1/p` — the plan's §30.2b rule (§4.3).
- **isYieldReference** — the flag on WSSS/OMAA marking them as yield-references.
- **Macro-region** — one of our 6 documented geographic regions (North America,
  Europe, Asia-Pacific, Gulf/Africa, South America, Oceania). The 6 in "3 tiers ×
  6 regions" (§4.4). Note: PART 1 defines
  primary strata as "traffic tier × macro-region" but does NOT enumerate the
  regions; the 6-region set is our documented choice, drawn from the plan's
  "Priority anchor regions" list.
- **Manifest** — the versioned, auditable snapshot (frame version, config, seeds,
  account plan) written at batch start (R7).
- **Population** — flights that existed at a cutoff per the provider-observable
  S1 layer (a census-like denominator, honestly labeled, §2 §5).
- **post_eligible / pre_eligible** — an airport can serve the POST (live/ADS-B)
  layer, the PRE (schedule/FIDS) layer, or both.
- **Probe** — a standardized, budget-capped live measurement of an airport
  (subscribe → collect a 2 h/4 h window → delete → count) that produces the yield
  components; the basis for locking the anchor pool (§2 §9). Run by
  `scripts/anchor_probe.ts` (§7.1). "Probing" is the act of running these
  measurements.
- **Prediction state** — PRE (before departure) or AIRBORNE/POST (in flight);
  never merged into one modeling set.
- **R1–R7 requirement codes** — the plan's numbered requirements that came from the
  9 review rounds: R1 exclusivity, R2 SOFT_STOP margin, R3 credit canary, R5
  delivery-failure flag, R7 versioned manifest (§4.13).
- **Reconciliation** — compare authoritative settled external Alert balance delta with the corresponding internal notification-item accounting. The isolated Gate-3 canary requires **exact equality (`tol=0`)**. Any later production reconciliation tolerance is a separate MEASURE→FREEZE setting and may not weaken Gate 3.
- **Reserve** — the protected 1,000-credit **budget floor** the controller refuses to spend below; “permanent” here is not a data-retention term.
- **REST/API-unit ledger** — the separately frozen seven-category API-unit budget for FIDS/validation/outcome/history/diagnostic work; it is separate from Alert credits. Do not use the old “~1,000 REST line” shorthand as a binding cap.
- **S1–S5 layer codes** — the plan's data-pipeline layer numbers: S1 population
  census, S2/S3/S4 per-flight event/observation logs, S5 airborne trajectory
  points (§4.13). The tables live in §6.6.
- **Sampling frame** — see Frame.
- **Seed** — an integer that initializes a pseudo-random generator so the
  "random" sequence is reproducible: same seed → same sequence → replayable,
  auditable draws and UTC-slot rotation (§4.5).
- **Settlement** — waiting until the balance is stable (`B_after == B_after_2`)
  before reading the true spend.
- **Shortlist** — the frozen 12 candidate airports (2 per region) probed in stage 1.
- **SOFT_STOP / HARD_CAP** — the watchdog stops at 1,850 (1,900 − 50 margin);
  1,900 is the hard ceiling; overshoot → MISMATCH.
- **Stability** — 1/(1+CV) of per-15-min bucket counts inside a probe window
  (§4.6).
- **Standardized measurement** — raw values scaled to [0,1] against the WSSS
  baseline (§4.8).
- **Strata / stratified** — non-overlapping groups (tier × region = 18 cells)
  within which we sample (§4.4). "18/18 non-empty" = all 18 cells contain at least
  one frame airport, so every stratum is sampleable.
- **Subscription** — an AeroDataBox webhook subscription (subject type +
  subject id, e.g. `FlightByAirportIcao` + KLAX) that pushes flight alerts to our webhook; billing is per **flight item on provider SEND**, not successful delivery.
- **Tier × macro-region** — the primary strata: 3 tiers crossed with 6 regions =
  18 cells (§4.4).
- **Universe** — everything AeroDataBox covers (measured) — §4.1.
- **UTC** — Coordinated Universal Time (≈ GMT): the global time standard used for
  every timestamp, so comparisons across time zones are apples-to-apples (§4.5).
- **UTC slot** — the 4 h block of a collection window chosen from
  {00,04,08,12,16,20} with a seeded balanced rotation (§2 §8).
- **Webhook** — the push mechanism: AeroDataBox POSTs notifications to
  `/api/v1/webhooks/aerodatabox[/secret]`; our ingress must answer 2xx fast because
  each retry costs a credit.
- **WSSS / OMAA** — Singapore Changi and Abu Dhabi Zayed; the yield-references
  (~331 and ~127 rows/h respectively — how much data each airport produces per
  hour, our reference points). They are *airports*, re-probed by us with the same
  2 h protocol as every candidate (§4.8).
- **Yield score** — the average of three standardized components
  (uf/credit, chain/credit, stability) vs the WSSS baseline (§4.8).
- **Zero-yield** — an airport that produced no observations; one empty is never
  evidence of uselessness (once/repeated/persistent triage); only coverage-failed
  airports leave the frame.

---

<a id="log-section-5-1"></a>
### 5.1 A30 glossary gap-fill — plain / formal / V3.9 § / code / aviation example

| Term | Plain meaning | Formal meaning | V3.9 § | Code | Aviation example |
|---|---|---|---|---|---|
| population | provider-observable flight membership supported by an append-only pre-cutoff FIDS observation | latest qualifying observation with `available_at≤prediction_cutoff`; no future backfill | §5 | `flight_population` | LAX service interval as known by T−6 |
| sampling frame | airports eligible to remain under consideration after measured provider coverage/feed rules | `universe ∩ feed-eligible`; current cardinality is measured/frozen, not hard-coded | §4 | `clean.adb_sampling_frame` | historical provisional frame had 4,320 rows; current frame must be rebuilt |
| stratum | non-overlapping verified group | `tier∈{HUB,MID,REGIONAL} × region∈6` gives 18 **possible** primary cells; `UNCLASSIFIED/UNMAPPED` stay outside primary strata and are reported | §4 | `strata` | e.g. HUB×NA; no fixed cell count is assumed |
| conditional probability | probability given state before draw | `p_i = score_i / Σ_{j∈E_t} score_j`, conditional on pre-draw state `S_t` | §8 30.2b | `adb_collection_subs.airport_layer_design_probability` | R1 `p=0.25` given equal eligible scores/state |
| inclusion probability | probability flight row appears | product `p_airport * p_pop * ...` | §8 32 | `NULL sampling_weight` | not `1/p_airport` |
| censoring | window ended but outcome not yet known, wait grace | `grace_minutes` P95+margin | §6.2 §7.4 | `flight_outcomes` | no runway yet |
| missingness | independent population/snapshot/capture/label dimensions | snapshot existence is population-defined; capture is parallel | §5/§7 | `flight_population` + snapshots/events | PRE population row can have no webhook and still get a snapshot |
| leakage | future info in feature | `available_at > cutoff` but `event ≤ cutoff` | §6.1 | `historicalFeatureStore` | 14:07 leak into 14:05 |
| randomization | seed → replayable draw | `seed → permutation` | §8 | `drawWithoutReplacement` | UTC perm seed 42 |
| blocking | stratify then randomize | tier×region blocking | §8 | `buildStratifiedFrame` | 18 cells |
| crossover | five matched pairs with frozen contrast, then randomized order within pair | unique `crossover_group_id`; 3×(4h vs 2×2h), 2×(4h vs up-to-6h) | §8.7 | scheduler | same airport set, ≥24h washout |
| bootstrapping | resample calendar-day blocks for Month-1 **pilot uncertainty** | 95% block-bootstrap interval; six test days are not treated as confirmatory validation | §13 | `block_bootstrap` | protected days 26–31 |
| rolling-origin | chronological development folds | exact intervals frozen before first model fit on days 1–25 only; protected test 26–31 excluded | §13.4 | evaluation | early pilot |
| calibration (prob) | reliability `ECE` | `Σ abs(acc-conf)·p` | §13.1 | `ECE 15bins` | 0 perfect |
| Brier | mean squared prob error | `1/N Σ(p-y)^2` | §13.1 | `Brier >15` | 0 perfect |
| prediction interval | range covering 90% truth | `coverage + width` | §13.5 | quantile 90% | 90% coverage |
| causal vs associational | intervention vs correlation | `MV under randomized intervention` | §14 | `MV_data` | not universal causal |
| marginal value | ΔM per credit | `ΔM/Δcredits`, signed | §14 | `info-per-credit` | no assumed direction; nonrandom additions observational |

<a id="log-section-6"></a>
## 6. Teaching: the tables and their columns

The table guide below is a **contract map, not proof of live schema**. Some objects are legacy/live, some have migration files only, and some are intended. Each object must be tagged independently as `INTENDED / MIGRATION_FILE_CREATED / MIGRATION_TESTED / MIGRATION_APPLIED_LIVE / PRODUCTION_WIRED`; §21 is the current evidence-oriented dictionary.

<a id="log-section-6-1"></a>
### 6.1 `clean.adb_sampling_frame` (migration 0021) — the measured frame

| Column | Meaning |
| --- | --- |
| `icao` | airport code (primary key) |
| `tier` | `HUB` / `MID` / `REGIONAL` / `UNCLASSIFIED`; `UNCLASSIFIED` is never silently coerced into a primary sampling tier |
| `tier_source` | versioned frozen traffic/reference source or explicit `missing_reference`; historical `curated/unclassified` labels are provenance only and are not the binding Phase-6 classification rule |
| `traffic_prior` | strictly `>0` for **eligible REGIONAL** airports under the frozen traffic reference; `NULL`/not sampling-usable for `UNCLASSIFIED` until deterministically classified |
| `region` | one of the 6 frozen macro-regions or explicit `UNMAPPED`; `UNMAPPED` remains outside primary tier×region sampling |
| `feed_schedule` / `feed_live` / `feed_adsb` | measured provider coverage/feed flags with retrieval timestamp/source/hash; these flags do not by themselves supply a traffic tier or region |
| `pre_eligible` | PRE provider/feed eligibility under the frozen provider rule; primary sampling additionally requires verified tier/region and all other binding eligibility checks |
| `post_eligible` | AIRBORNE provider/feed eligibility under the frozen provider-native denominator rule; primary sampling additionally requires verified tier/region and all other binding eligibility checks |
| `in_frame` | true only for airports satisfying the frozen primary-frame eligibility contract; `UNCLASSIFIED`, `UNMAPPED`, coverage-failed, or otherwise ineligible airports remain observable/reportable in the measured universe but outside primary sampling |
| `built_at` | when the frame artifact was written; the final frame must also carry/source a reproducible rule/reference hash |

**Historical provenance only:** the 2026-08-18 builder wrote **4,320 rows = 267 curated + 4,053 legacy-unclassified-coerced-to-REGIONAL**, with pre 3,337 / post 2,264 / both 1,281 and reported 18/18 cells. Those counts/classifications are **not binding current frame facts** and must be rebuilt under Plan §§4.1–4.2 before FREEZE.

<a id="log-section-6-2"></a>
### 6.2 `clean.adb_anchor_probe` (migration 0023) — the probe results

One row per probe observation: one airport, one stage, one window. `probe_id` is
just the row's serial number (the database's auto-increment counter, like a receipt
number). `stage` is which probe round it was — **1** = the shortlist measurement
(2 h), **2** = the confirmation measurement (4 h) for the top picks. `status` is
`probing` (window live), `completed`, `failed`, or `abandoned` (interrupted;
subscription deleted by `--cleanup`). You will mostly care about the
`rows_per_hour`, `unique_flights_per_credit`, `tail_chain_links_per_credit` and
`stability` columns — those are the numbers the `--score` command turns into the
anchor ranking.

| Column | Meaning |
| --- | --- |
| `probe_id` | primary key |
| `stage` | 1 (shortlist, 2 h) or 2 (confirmation, 4 h) |
| `icao`, `region` | airport and macro-region |
| `window_start` / `window_end` / `window_hours` | the live window (UTC) |
| `subscription_id` | the AeroDataBox subscription used |
| `balance_before` / `balance_after` | credit balance at window edges |
| `credits_spent` | = balance_before − balance_after (the authoritative C_external) |
| `rows_delivered` | rows attributed to this subscription in the window |
| `unique_flights` | distinct flight numbers |
| `tail_chain_links` | aircraft-rotation chain links |
| `rows_per_hour` | station capacity — the feasibility GATE, not a score component |
| `unique_flights_per_credit` | yield component 1 (standardized later vs WSSS) |
| `tail_chain_links_per_credit` | yield component 2 |
| `stability` | 1/(1+CV) of 15-min bucket counts |
| `recorded_at` | insert time |

Unique on `(icao, stage, window_start)` so re-runs never duplicate.

<a id="log-section-6-3"></a>
### 6.3 `clean.flight_data_pre_post` (migration 0010) — the raw collected data

One row per flight per delivery, flattened from the webhook. This is the **raw
data table** — everything else is either an audit log of *this* table's writes or
a later derivation. The row is a mix of **what AeroDataBox sends** and **what we
stamp ourselves**:

**Columns that come FROM AeroDataBox (the webhook payload):**

| Column group | Meaning |
| --- | --- |
| `flight_number`, `carrier_icao/iata/name`, `call_sign` | identity of the flight |
| `status`, `status_code`, `codeshare_status` | current status (numeric enum → name) |
| `last_updated_utc` | when the provider last updated this flight |
| `dep_*` / `arr_*` (airport, scheduled/revised/runway UTC, terminal, gate) | departure / arrival plan |
| `aircraft_reg`, `aircraft_mode_s`, `aircraft_model` | the physical aircraft |
| `loc_*` (lat/lon/altitude/speed/heading/live location) | live ADS-B position (POST) |
| `subscription_*`, `subject_*`, `subscriber_*`, `credits_remaining` | the subscription + balance blocks of the payload |
| `payload_json` | **the whole raw flight item**, kept verbatim only while lawfully retained under Plan §10.2; raw hash/non-content audit metadata may survive only as permitted |
| `gcd_km`, `great_circle_distance` | route distance |

**Columns WE stamp (our server, at receive time):**

| Column group | Meaning |
| --- | --- |
| `received_at` | our clock when the POST landed |
| `dedup_key` | **LEGACY current-state key only:** historical SHA-256 `(flight, carrier,lastUpdatedUtc)` behavior may exist in a mutable convenience table. It is **NOT** the canonical identity for `raw_delivery`, `raw_delivery_item`, semantic observations, or trajectory points; Plan §6 four-identity contract governs those append-only layers |
| `data_stage`, `has_live_location` | PRE vs POST decided by us from the payload's location/status |
| `sampling_batch_id`, `airport_tier` | which batch/tier this delivery belonged to |
| `is_randomized` | true only for a REGIONAL probability-draw row (never NULL — the 08-19 fix) |
| `airport_layer_design_probability` | the realized conditional design probability (REGIONAL draws only) |
| `planned_share` | the HUB/MID allocation share (deterministic fills only) |
| `collection_window_start/end`, `random_seed` | which window/seed produced this row |
| `sampling_weight` | stays NULL — the plan forbids auto `1/p` (§4.3) |

**Which other tables are derived from this one?** Precisely:

- **`clean.adb_ingest_events`** — NOT derived; it is the per-delivery *audit log*
  written alongside the insert (one row per webhook POST with counts). This is
  `C_internal` (§6.5).
- **`clean.flight_events` / `raw_airborne_events` / `clean_airborne_points` /
  `flight_trajectory` / `flight_airborne_snapshots`** — derived *from the same
  payload* at receive time (appended from the extracted rows), never re-derived
  from `flight_data_pre_post` later. They keep every airborne observation so
  trajectories are reconstructable (§6.6).
- **`clean.adb_anchor_probe`** — NOT derived from the table's rows as a transform;
  it is a *measurement log* that the probe script fills by **counting** rows in
  `flight_data_pre_post` for a subscription inside a window (§6.2).
- **`clean.adb_sampling_frame`** — NOT derived at all; it is built from the
  *coverage* endpoint (free measurement), not from collected data (§6.1).

Note: `flight_data_pre_post` is kept for compatibility but is **not** the only
true data table. The S-layers above (`flight_population`, `flight_events`,
`flight_snapshots`, `flight_outcomes`, `raw_airborne_events`,
`clean_airborne_points`, `flight_trajectory`, `flight_airborne_snapshots`,
`historical_feature_store`, `weather_observation`, `weather_forecast`) are all
first-class research tables per Plan §2/§6 — see §21 data dictionary.

<a id="log-section-6-4"></a>
### 6.4 `clean.adb_collection_batches` / `adb_collection_subs` / `adb_collection_meta` (migration 0012)

- `adb_collection_batches` — one row per collection window: batch id, seed, window
  start/end, credit budget, tier mix, `balance_before/after`,
  `credits_consumed_actual` vs `credits_consumed_internal`,
  `notification_items_received`, rows stored/inserted/updated,
  `delivery_failures`, `reconciliation_status`.
- `adb_collection_subs` — the airport subscriptions that make up a batch, each
  stamped with `batch_id`, `icao`, `tier`, sampling metadata (design probability /
  planned share), and `is_randomized`.
- `adb_collection_meta` — key/value store for rotation state (`batch_seq`,
  `last_anchor`, `run_template`, `manifest`, anchor-pool lock state).

<a id="log-section-6-5"></a>
### 6.5 `clean.adb_ingest_events` (migration 0017) — the credit ledger

One immutable row per webhook delivery: `subscription_id`, `batch_id`,
`received_at`, `notification_items` (the internal credit basis), rows
stored/inserted/updated/skipped, `credits_remaining`, `delivery_failure`, `error`.
This is `C_internal` for the canary.

<a id="log-section-6-6"></a>
### 6.6 The S-layer tables (migrations 0019–0020)

- `flight_population` — S1 **append-only population-observation layer**: provider-observable FIDS appearances/query provenance retained by retrieval; horizon membership is derived from the latest qualifying observation with `available_at≤prediction_cutoff_utc`. Slow/later responses never backfill an earlier cutoff.
- `flight_events` — append-only semantic-observation log using the binding versioned identity over canonical `flight_instance_id`, event type/phase, available provider state/location clock(s), and raw-item provenance. A location-style tuple alone is legacy/noncanonical and cannot key non-location observations (S3/S4).
- `raw_airborne_events` — airborne (POST + live location) points with all fields
  preserved incl. `loc_reported_utc`.
- `clean_airborne_points` / `flight_trajectory` / `flight_airborne_snapshots` —
  the S5 trajectory pipeline feeding the POST model.

---

<a id="log-section-7"></a>
## 7. The most important code, explained

> The full plain-English walkthrough of every file is in
> **`AugMDnotes/CODE_WALKTHROUGH.md`** — read that for the complete tour. This
> section summarizes the pieces that matter for what we're doing right now (the
> probe), so you can follow a run.

<a id="log-section-7-1"></a>
### 7.1 `scripts/anchor_probe.ts` — the probe runner (`npm run anchor-probe`)

**Where the shell commands come from (answering "did you make these?"):** yes.
`npm run anchor-probe -- --check-webhook` is a chain of two things. The `npm run
anchor-probe` part reads the `"anchor-probe"` entry in `package.json`, which says
`tsx scripts/anchor_probe.ts` — i.e. "run this TypeScript file with the tsx
loader". The `--` just tells npm to pass everything after it to the script as
command-line arguments. So `npm run anchor-probe -- --check-webhook` runs
`tsx scripts/anchor_probe.ts --check-webhook`, and the script's `main()` looks at
its arguments and picks a mode (`--check-webhook`, `--cleanup`, `--stage 1`,
`--score`, `--status`, …). Same mechanism for `npm run canary` →
`tsx scripts/credit_canary.ts` and `npm run build-catalog` →
`tsx scripts/build_stratified_catalog.ts`. You don't need tsx directly — npm
handles it.

**What the script does, start to finish.** It encodes the plan's §23 probe
protocol. At the top are the **frozen parameters** — decided in code before any
measurement, never tuned on outcomes: stage-1 window 2 h, stage-2 window 4 h,
capacity gate 60 rows/h, probe daily cap 500, anchor weights 0.4/0.2/0.2/0.2. Then
the **frozen shortlist**: 12 airports (2 per region) with published exogenous
reference values (scheduled flights/yr, geo index, carrier index) — our own
collection never feeds the exogenous 80% (no feedback loop). WSSS and OMAA carry
`isYieldReference: true`.

Its modes:

- `--stage 1 [--icao X] [--hours N]` — probe each candidate (or just X) for the
  window. **This command blocks (waits) for the whole window itself** — it does not
  return until the probe is done (§1 step 7 explains the timing).
- `--stage 2` — 4 h confirmation; **refuses any airport without a completed stage-1**
  (the rl8 out-of-order mistake is now impossible).
- `--score` — fills the frozen formula (see §7.8 for the exact code), applies the
  capacity gate, prints the ranked pool + proposed 5-airport lock.
- `--status` — list recorded probes from `clean.adb_anchor_probe`.
- `--cleanup [--force]` — deletes orphaned probe subscriptions (rows still
  `probing` from an interrupted run) and marks them `abandoned`; `--force` also
  deletes other untracked active credit subs (safe because `autoCollect=false`).
- `--check-webhook` — prints the public webhook URL, whether
  `REPLIT_DOMAINS`/`WEBHOOK_BASE_URL` are set, and does a GET reachability probe.

**Mechanics of ONE probe** (`runSingleProbe`): budget guard (`checkBudget`:
balance ≥ reserve, daily probe spend won't breach the 1,900 cap) → **R1
exclusivity guard** (`assertExclusivity`: refuse if any foreign ACTIVE billable
subscription exists — this is what stops parallel probes) → free feed check
(`checkAirportFeeds`) → `createSubscription("FlightByAirportIcao", icao,
{maxDeliveryRetries: 0})` → insert a `probing` row → **wait the window** (deliveries
land on the live webhook; the process stays alive) → `deleteSubscription` →
settle 10 s → read balance → `credits_spent = balance_before − balance_after` →
SQL-count rows / unique flights / chain links / stability for *this subscription
in this window* → flip the row to `completed`. The `probing` row is what lets
`--cleanup` find interrupted runs.

<a id="log-section-7-2"></a>
### 7.2 `scripts/credit_canary.ts` — Gate 3 (`npm run canary`)

A **canary** = a tiny controlled live test meant to die loudly before the real work. Its cost is **not guaranteed to be 1 credit**: billing is per flight item per provider SEND. Freeze a very small authorized Alert-credit reservation/ceiling, then measure actual settled spend. The historical rl9 attempt happened to cost 1 credit. The official canary:

1. Reads the live balance (`balance_before`).
2. **Asserts R1 exclusivity** — lists subscriptions, refuses to continue if any
   foreign ACTIVE billable subscription exists (the rl8 orphans would have failed
   this).
3. Creates ONE subscription for KLAX with `maxDeliveryRetries: 0`.
4. Waits ~2 minutes (120 s, `ADB_CANARY_WAIT_MS`), deletes the sub, settles 5 s.
5. Reads balance until stable (`B_after == B_after_2`) → `C_external = balance_before − balance_stable`.
6. Queries `adb_ingest_events` for that subscription → `C_internal = Σ
   notification_items`, plus rows stored/inserted/updated/skipped and
   `delivery_failures`.
7. **Official Gate-3 PASS iff `C_external == C_internal` (`CANARY_TOLERANCE=0`), balance is stable, `delivery_failures=0`, >0 items arrived, and no foreign billable subscription exists.** Otherwise FAIL/STOP.

This is the command that FAILED on 08-19: `C_external=1`, `C_internal=0`,
`delivery_failures=1` — the webhook was reachable (charged 1 credit) but the
handler threw before storing. The `is_randomized` fix (§7.5) is exactly what makes
this go green.

<a id="log-section-7-3"></a>
### 7.3 `scripts/build_stratified_catalog.ts` — step 11 (`npm run build-catalog`)

Builds the sampling frame from the measured universe (plan §6/§17 step 11):
calls the free AeroDataBox coverage endpoint, then for every universe airport
historically classified the 276 curated airports and coerced every other coverage airport into REGIONAL with `traffic_prior=1.0`. **That legacy behavior is noncompliant with binding Plan §4.1**: airports missing the frozen traffic reference must remain `tier='UNCLASSIFIED'`, `tier_verified=false`, `tier_source='missing_reference'` and stay out of primary tier-stratified sampling until deterministically classified. Region assignment must use the frozen country→macro-region mapping, not ICAO-prefix heuristics except where the Plan explicitly defines a deterministic fallback/override. Per-feed eligibility is still computed independently. The historical "267 curated + 4,053 unclassified→REGIONAL" and "18/18 strata" outputs are **provisional evidence only** and must be rebuilt before Gate 1/2.

<a id="log-section-7-4"></a>
### 7.4 `server/lib/disruption/adbCollectionController_v3.ts` — the brain

This legacy controller is **not yet evidence of binding Phase-6 behavior**. Binding configuration must distinguish the 1,900/day Alert-credit ceiling, the frozen `phase6_alert_spend_ceiling≤57,900`, the protected Alert floor, and the separate seven-category REST/API-unit ledger; it must not treat a generic 1,900 "budget" or an old fixed retry allowance as interchangeable resources. The tier mix remains `{HUB:1, MID:2, REGIONAL:1}`, with the enabled anchor consuming the HUB slot, and the six UTC slots are `{0,4,8,12,16,20}`. `ADB_AUTO_COLLECT=false` is mandatory until the authorized Phase-6 start transition. HUB/MID selection follows Plan §8.5. REGIONAL selection must be wired to the seeded adaptive rule `score_i=traffic_prior_i·m_i`, `p_i=score_i/Σscore` over the current eligible set, with Phase-6 initialization `m_i=1`, the frozen recurrence/state machine, coverage-floor behavior, and replayable seed. Any legacy uniform `1/n_eligible` production draw is compliant **only on an initialization step where all eligible scores are equal**, not as the general algorithm. Batch start/stop must use the frozen template plus SEND-aware accounting/reconciliation; current repository wiring remains to be proven by implementation tests.

<a id="log-section-7-5"></a>
### 7.5 The webhook path (`routes_v3.ts` + `flightNotificationExtractor_v3.ts` + `flightDataPrePostStore_v3.ts`)

**The data flow, answered in plain words** (the "what comes from us vs AeroDataBox"
question):

1. AeroDataBox sees a flight change for a subscribed airport and **POSTs a payload**
   to `POST /api/v1/webhooks/aerodatabox[/secret]`. The payload contains the
   `subscription` block, the `balance` block, and a `flights[]` array.
2. Our route performs authentication/minimal envelope validation and looks up sampling metadata by `subscription_id`. It **must not promise to always 2xx**: failure to durably commit the normalized raw envelope/item layer before acknowledgement returns non-2xx so silent loss cannot be disguised as success. After durable raw commit, semantic parse/normalization failures are recorded as processing attempts and may be acknowledged according to the frozen retry policy. `maxDeliveryRetries=0` is the intended subscription setting, but protocol correctness is not weakened merely to avoid a possible paid retry.
3. `flightNotificationExtractor_v3.ts` may flatten provider items into convenience/current-state columns, but the binding implementation must first preserve raw delivery/item identities and all canonical provider/source clocks from Plan §6; derived `data_stage`/sampling metadata are OUR annotations, not provider facts.
4. Any legacy mutable `flight_data_pre_post` upsert by `dedup_key` is a **current-state convenience path only**. It must not replace or deduplicate immutable `raw_delivery`/`raw_delivery_item` or the canonical semantic-observation identity; `(flight, carrier, locReportedUtc)` is invalid for non-location updates and is not a universal event key.
5. Durable raw persistence occurs **before successful 2xx** according to the Plan's receive→commit raw→2xx→semantic-processing contract. `adb_ingest_events`/processing attempts are audit/accounting records; implementation evidence must prove the actual route follows this order.

**The rl9 bug, and the fix (in this same file):** migration 0022 created
`is_randomized` as `NOT NULL DEFAULT false`. But for any delivery with no managed
batch (probe/canary subscription), the extractor set `isRandomized: null` — and
inserting NULL into a NOT NULL column makes Postgres throw, which made the whole
handler throw, store 0 rows, and record `delivery_failure=1` (your canary FAIL). The
extractor now defaults unmanaged rows to `isRandomized: false` (they are never
randomized), which satisfies the NOT NULL column and the V3.8 boolean rule. The
canary and every probe after the fix store rows normally.

<a id="log-section-7-6"></a>
### 7.6 `aerodataboxLimiter_v3.ts` — the AeroDataBox client

Throttled/rate-limited REST calls: `getBalance`, `refillBalance`,
`createSubscription`/`listSubscriptions`/`deleteSubscription`/`getSubscription`,
`checkAirportFeeds`, `listFeedAirports`, `defaultWebhookUrl`. Every subscription is
created with `maxDeliveryRetries: 0` so provider retry attempts are disabled by design; **billing remains one Alert credit per flight item on provider SEND, not one credit per HTTP delivery**. Webhook URL/port requirements must be taken from the pinned provider contract/live Gate-0.5 evidence; a historical `:443` workaround is not treated as universal provider-contract authority.

<a id="log-section-7-7"></a>
### 7.7 The 57-error typecheck baseline

A historical repository snapshot reported **57 pre-existing type errors** (mostly in `server/routes.ts`). That number is provenance, **not a passing criterion**. Phase-6 technical readiness requires the repository's binding typecheck command to exit 0 (or an explicitly adjudicated toolchain exception recorded as a blocker, not silently grandfathered). The next repository-capable pass must run the command and record its exact exit code/output; "no new errors relative to 57" is insufficient for GO.

<a id="log-section-7-8"></a>
### 7.8 Where every formula in §4 comes from, and the code of it

Every number and equation in §4 is **not invented** — it comes from the plan's §9 /
§23 (the anchor-probe spec) and §3.2 (the budget), and the code that implements it
is in `scripts/anchor_probe.ts`:

| Formula (§4) | Source | The code |
| --- | --- | --- |
| `uf_per_credit = unique_flights / credits_spent` (§4.7) | plan §9 step 4 ("record unique-flights/credit") | `runSingleProbe`: `ufPerCredit = creditsSpent && creditsSpent > 0 ? uniqueFlights / creditsSpent : null` |
| `chain_per_credit = chain_links / credits_spent` (§4.7) | plan §9 step 4 | `tailChainLinks` counted by the SQL `count(*) - 1 ... GROUP BY aircraft_reg`, divided by credits |
| `stability = 1/(1+CV)` of 15-min buckets (§4.6) | our implementation of the plan's "stability" component | `runSingleProbe`: buckets rows per 900-second block, mean/variance/CV, `clamp01(1/(1+cv))` |
| `uf_std = clamp(probe/reference, 0, 1)` (§4.8) | plan §23 step 4: standardized to [0,1] vs the WSSS baseline | `computeScores`: `clamp01(probe.unique_flights_per_credit / refUf)` where `refUf` is WSSS (fallback OMAA) measured the same way |
| `yield_score = (uf_std + chain_std + stab_std)/3` (§4.8) | plan §23 step 4 | `computeScores`: `yieldScore = (ufStd + chainStd + stabStd) / 3` |
| `capacity gate = rows/h ≥ 60` (§4.12) | plan §23 step 4: capacity is a separate feasibility GATE | `computeScores`: `capacityPass = rowsPerHour >= CAPACITY_GATE_ROWS_PER_HOUR`; printed as `capacity PASS`/`FAIL`, never added to the score |
| `anchor_score = 0.4·traffic + 0.2·geo + 0.2·carrier + 0.2·yield` (§4.9) | plan §23 step 5, V3.6 pre-specified weights | `computeScores`: `W_EXOGENOUS*exogTraffic + W_GEO*exogGeo + W_CARRIER*exogCarrier + W_YIELD*yieldScore` with `W_EXOGENOUS=0.4` etc. at the top of the file |
| `exog_traffic = flights/yr ÷ shortlist max` (§4.9) | plan §23 step 2 (published reference, frozen) | `computeScores`: `clamp01(cand.exogFlightsPerYear / MAX_EXOG_FLAIGHTS)` |
| `C_external = balance_before − balance_after` (§4.10) | plan §3.2/§44-A (authoritative spend) | canary `cExternal = balanceBefore - balanceAfter`; probe `creditsSpent = max(0, balanceBefore - balanceAfter)` |
| `C_internal = Σ notification_items` (§4.10) | plan §13/§44-A | canary SQL: `COALESCE(sum(notification_items),0) FROM clean.adb_ingest_events WHERE subscription_id=$1` |

So: the plan defines *what* to measure and the weights; the code is the frozen
implementation of it, written before any probe ran. If you want to see a formula
"live", read `computeScores` in `scripts/anchor_probe.ts` (lines ~430–484) — it is
the whole §4.8/§4.9/§4.12 in ~50 lines.

<a id="log-section-7-9"></a>
### 7.9 How to read a probe run (mapping the output to the code)

A stage-1 run prints: `balance_before` → `subscription: … isActive=true` →
`probing 2h …` (the process is now *waiting* — walk away) → `subscription deleted:
yes` → `balance_after` / `credits_spent` → `rows_delivered` / `unique_flights` /
`chain_links` → `rows_per_hour` / `uf/credit` / `chain/credit` / `stability` →
`recorded in clean.adb_anchor_probe.`. Each printed line corresponds to a step in
`runSingleProbe` (§7.1). If it prints `SKIPPED — …`, read the reason: either the
budget guard, the R1 exclusivity guard, or "already probed (stage 1)". If it prints
`subscription deleted: NO`, run `--cleanup` before the next probe.

---

<a id="log-section-8"></a>
## 8. Shell commands to check the records (history survives restarts)

> Replit's shell restarts and the *live* output disappears. The records do NOT —
> they live in the append-only log file and in the database. Here is how to see
> them again, any time.

| You want to see | Command |
| --- | --- |
| Latest 200 log lines (paste back to me) | `npm run logs:last` |
| Live log stream | `npm run logs` |
| Last 1,000 log lines, raw | `tail -n 1000 logs/collector.log` |
| Whether a boot was safe | `npm run logs:last \| grep "watchdog started"` — must end `autoCollect=false` |
| Current health (live balance, gap, can-start) | `npm run health` |
| Budget report (floor, invariant) | `npm run gate0` |
| Balance / refill | `npm run refill` (add `-- N` to refill N) |
| Recorded probes | `npm run anchor-probe -- --status` |
| Probe webhook reachability | `npm run anchor-probe -- --check-webhook` |
| Orphaned subscriptions + fix | `npm run anchor-probe -- --cleanup` |
| Credit reconciliation (Gate 3) | `npm run canary` |
| Step-11 frame summary | `npm run build-catalog` (re-prints the stratum table; safe to re-run) |
| All collected flight rows | `npm run export` |

### The log files are the history

Every pasted run lives in `AugMDnotes/`: `replitLogs1.md`, `replitLogs2.md`,
`replitLogs3.md`, `rl4.md`, `rl5.md`, `rl6.md`, `rl7.md`, `rl8.md`. Rule: **every
time we run something, paste the output into the next `rlN.md`** — that way the
record survives any shell restart. Historical report analysis is preserved below for provenance. **Do not append new reports here**; all new run/gate evidence goes to `V3.9_RUN_REPORTS_AND_EVIDENCE.md`.

### How to read the boot log line

```text
[adb-collector] watchdog started (window=4h, budget=1900 credits/batch,
  dailyCap=1900, softStop=50 margin, reserve=1000, minBatch=300,
  tierMix={"HUB":1,"MID":2,"REGIONAL":1}, anchor=KLAX|EGLL|WSSS|SBGR|OMDB,
  utcCycle=0,4,8,12,16,20, autoCollect=false)
```

Everything here is the safe Phase-0 config. The one line to verify every boot:
`autoCollect=false`. If a boot shows `autoCollect=true`, Replit started the app
with the Run button (bare `npm run dev`, no env prefix) — it did no damage while
balance < 1,300, but fix it by making sure the boot command includes
`ADB_AUTO_COLLECT=0`.

---

<a id="log-section-9"></a>
## 9. Money, dates, and credits ledger

<a id="log-section-9-1"></a>
### 9.1 The budget numbers (from the plan §3)

| Number | Meaning |
| --- | --- |
| **60,000** | **USER-CONFIRMED monthly plan entitlement** (`MONTHLY_PLAN_ENTITLEMENT_UNITS`); Gate 0 verifies the same plan is still active plus the current billing-cycle dates, remaining units, and already-consumed units |
| **57,900** | `MAX_DESIGN_CEILING` for Phase-6 Alert credits, **not** an automatically available/spendable balance |
| **`phase6_alert_spend_ceiling`** | exact frozen Alert-credit ceiling `≤57,900`, computed from opening Alert balance + new refill − pre-run ceiling − protected floor − ending margin |
| **1,900/day** | experimental per-UTC-day Alert-credit hard ceiling; not `60,000/31` scientific arithmetic and not necessarily fully spent |
| **1,000 floor** | project-chosen protected Alert-balance minimum (`protected_alert_floor`); Gate 0 must prove feasibility; may increase before FREEZE but not drop below 1,000 without design amendment + complete re-FREEZE |
| **REST category caps** | FIDS/splits/retries/validation/outcome/history/diagnostic API-unit budgets generated separately from the calendar; no fixed `1,000` is accepted as proof until the exact total fits |

There is **no valid arithmetic that simply adds Alert credits and REST API units as if they were the same post-allocation resource**. Gate 0 balances the Alert and API trees separately.

<a id="log-section-9-2"></a>
### 9.2 The balance history and when spending started

| Date (UTC) | Event | Balance |
| --- | --- | --- |
| 2026-08-16 | Gate-0 refill: read-only check | 862 |
| 2026-08-16 | 1-credit refill — **proved 1 unit = 1 credit** | 863 |
| 2026-08-16 | full refill | **2,901** |
| 2026-08-18 | **first probe attempt (rl8)** — first moment spending *could* have begun | 2,901 (still — 0 delivered, 0 spent) |
| 2026-08-19 | **canary FAIL** 1 delivery charged (SEND→throw) `C_external=1` | **2,900** (`2901−1`) |
| 2026-08-19 last evidenced | real probe spend had NOT begun; failed canary accounted for the 1 evidenced credit | **2,900 at that historical read** |

**Historical evidenced Alert spend through rl9: 1 credit** (the failed 2026-08-19 canary delivery). Current account balance/spend must be reread before any new live action. `PROBE_CAP_DAILY=500` is cumulative across all probe attempts in one experimental UTC day, not 500 per candidate.

<a id="log-section-9-3"></a>
### 9.3 Reserve and invariant rules

- Gate 0 must print the **current exact Alert balance tree** and separate REST/API-unit category tree. A legacy `spend ≤57,900` check is insufficient; the controller must enforce the frozen `phase6_alert_spend_ceiling≤57,900` plus protected floor/pre-run/ending allocations.
- SOFT_STOP = 1,850 (1,900 − 50) stops a batch; HARD_CAP = 1,900; overshoot →
  MISMATCH. The probe script refuses when balance < reserve or the daily cap would
  be exceeded.

---

<a id="log-section-10"></a>
## 10. HISTORICAL run-report analysis: rl8 (2026-08-18) — PRESERVED / DO NOT APPEND NEW REPORTS HERE

You pasted the outputs into `AugMDnotes/rl8.md` out of order. This is the
line-by-line analysis. The raw reordering: `git pull` → boot → `--status` →
`--stage 1` (KLAX, started) → `--stage 2` (KLAX, started) → `--score` →
`logs:last`.

<a id="log-section-10-1"></a>
### 10.1 What worked

| Piece | Verdict |
| --- | --- |
| `git pull origin main` → fast-forward `2ffb693..73affad` | all step-12 files arrived (0023 migration, probe script, walkthrough, log, rl7) |
| Fresh boot applied migrations through `0023` | `[migrations] applied 0023_anchor_probe_results.sql` appears in the boot log |
| Watchdog line | `budget=1900 ... autoCollect=false` — safe mode confirmed |
| `--status` | correctly reported "No probes recorded yet" (first time) |
| `--score` | correctly refused to score — "No yield-reference probed yet (WSSS/OMAA)" |

<a id="log-section-10-2"></a>
### 10.2 What went wrong

1. **The probe run was interrupted and run out of order.** `--stage 1` started a
   KLAX 2 h probe (sub `99cdf2be-8016-4a91-ab8c-22246fabbd8d`), then `--stage 2`
   was started (KLAX 4 h, sub `9c87e594-c245-4126-af71-97e3acbef457`) before stage
   1 finished. The plan says stage 2 *confirms* stage-1 picks — running it first is
   meaningless. The script now **refuses** stage 2 without a completed stage-1.
2. **Two orphaned ACTIVE subscriptions were left behind.** The interrupted stage-1
   process never deleted its sub. Both are still active and billable — a violation
   of R1 exclusivity, and the Gate-3 canary will fail while they exist. Run
   `npm run anchor-probe -- --cleanup` to delete them.
3. **Zero deliveries, zero spend, for hours.** Every heartbeat shows
   `balance=2901 rowsToday=0` from 18:23 UTC through 06:11 UTC the next day. That
   means AeroDataBox **never sent anything** to our webhook. The `data gap` ALERT
   lines are just the watchdog noting no rows arrived — expected, because nothing
   was delivered.

<a id="log-section-10-3"></a>
### 10.3 What the zero-deliveries result means (and what to do)

Because AeroDataBox deducts credits **on SEND** (not on delivery), a balance that
never moved means it never tried to send — so this is NOT "credits were spent and
lost". It means the webhook path is unproven. Two candidate causes:

- AeroDataBox cannot reach the public webhook URL (the URL comes from
  `REPLIT_DOMAINS` / `WEBHOOK_BASE_URL`).
- The subscription never became active (`isActive=false` / pending activation).

The probe now prints `isActive` / `activateBeforeUtc` for every subscription, and
`--check-webhook` probes the public URL directly. **Do the canary next** (`npm run
canary`): it must show PASS **with more than 0 items**. If the canary still shows 0
deliveries, tell me — we will fix the webhook URL/activation before any probe.

<a id="log-section-10-4"></a>
### 10.4 The takeaway

Nothing was lost and nothing was spent. The script has since been hardened so the
out-of-order and orphan-sub mistakes cannot recur. The only open question is the
one the probe was supposed to answer for us: **can AeroDataBox reach our webhook?**
That is exactly what `--check-webhook` + the canary settle next.

---

<a id="log-section-11"></a>
## 11. Change log (newest first)

## 2026-08-31 — V3.9-f.8 A30_3 10 CONSISTENCY FIXES

**Historical f.8 fixes:** this entry recorded the then-current 919→899 change. That arithmetic is SUPERSEDED by current Plan §5.4's complete 939 maximum including outcome/history categories. Other listed historical changes remain provenance, not current status evidence.

## 2026-08-31 — HISTORICAL LOG-ONLY CODEBUFF F1–F7 DEFECT REMEDIATION (old `f.9-log` label; NOT a Plan version)

**F1 (stale sentence):** Removed "So the only true data table is flight_data_pre_post" from §6.3 (line 1800). Replaced with corrected text: S-layers are first-class per Plan §2/§6 — see §21.

**F2 (A/B/C/D counts wrong):** Regenerated from 77-row table: B=57 (pure), B/C=2 (dual), C=4 (pure), D=13, A=1. Fixed in: A30_77_ADJUDICATION.md footnote, Log §0.2, §0.6, §0.7, §35, MUSE_A30_ASSESSMENT.md §2, MUSE_ASSESSMENT_20260831.md. Old "45 B, 10 C, 17 D, 5 A" was wrong.

**F3 (59-field format aspirational):** Added note at §13: format defined but no real LOG-YYYYMMDD-### entry written yet.

**F4 (delegation to other files):** Added note at §23: full 22-row registry delegated to prior version, should be inlined at FREEZE.

**F5 (88-component location map):** Added note at §17: table is file:function:status, not 20-field detail. Expansion is FREEZE task.

**F6 (lineage one-liner):** Added note at §22: arrow chain needs per-arrow detail at FREEZE.

**F7 (§12/§36 vestiges):** Renamed 4 orphaned anchors from log-section-12-* to log-section-36-*. Renamed §12.7–§12.9 headings to §36.7–§36.9. Fixed 6 stale §12 references in main text → §36.

Historical log-only label `f.9-log` was documentation metadata only and is **not** a Plan revision. Binding Plan remains V3.9-f.8.



## 2026-08-30 — V3.9-f.7 A30 PRE-FREEZE PATCH + INDEPENDENT ASSESSMENT

**Prompt:** Full A19/A30 audit (A19_1 30 sections, A30_1 77-item #70 → 12 families, A30_2 FINAL MASTER §§37-78, cgtAnalysis13) + repo truth audit (migrations 0017-0023, `build_stratified_catalog.ts:103`, `anchor_probe.ts:63`, `adbCollectionController_v3.ts:516`).

**What was done:**
- Patched `AugMDnotes/V3.9_DataCollectPlan.md` PART 1 from V3.9-f.6 → **V3.9-f.7**: 12 blocker families closed as B/C/D. Added §§4.1-4.6 (traffic tier/region/scope/eligibility/balancing vars/coverage-age), §§5.1-5.4 (FIDS protocol/T-24 acquisition/timezone/DST/REST 919 proof), §6.0 (exact T) + §§6.3-6.6 (8 milestones/4 timestamps/provenance/measure→freeze), §§7.1-7.5 (flight_instance_id/codeshare/target-specific labels/censoring/route-tail), §§8.2-8.8 (m_i FSM/coverage floor/anchor-HUB/HUB-MID/crossover/tie-break) + §§9.1-9.2 (probe exactness/yield-reference/stability), §§10.1-10.2 (weather hierarchy/30d), §§12.2.1-12.2.2 (historical store/chain completeness), §§13.2-13.6 (primary claim/endpoint hierarchy/model-selection/conformal/deferred). Fixed §15 R1-7/S1-5 wording, §19 #4774 citation + weather 30d, §21 FINAL STATUS (architecture LOCKED, manifest PENDING), §17 PHASE 5 Engine-A chronology (rule hash before, row IDs after), §22 new `V3.9-f.7` adjudication with full change table.
- Wrote independent assessment `AugMDnotes/MUSE_A30_ASSESSMENT.md` (8 sections, per-family verdicts, literature checks).
- Repo audit: confirmed provisional tier/region still present, FIDS fetcher/historical store/weather tables absent, `m_i` stub, `available_at` NULL — all correctly B/C per A30, not invented.
- Log status board updated: frame PROVISIONAL needs rebuild, canary RE-RUN pending, V3.9-f.7 version, B blockers remaining.

**Assessment (MUSE, 2026-08-30):** Architecture strongly supported (SDSU/SJSU/FAA/Transp.Res.PartE) — PRE+AIRBORNE separate, population layer, availability, provenance, trajectory preservation all correct, GNN-later correct, 4h vs 2×2h crossover correct. ChatGPT 90% right: tier blanket, ICAO heuristic, undefined flight_instance/codeshare, incomplete FIDS/T/milestone, missing m_i/floor, unsynced anchor formula, Engine-A chronology bug are **real blockers**; censoring/cadence are **measure→freeze** not invention; conformal/holdout % are **deferrable**. 77 items = 12 families, not 77 defects. NO V3.10 needed. Phase 6 remains NO-GO until frame rebuild + Gates 0/0.5/4/5 + manifest + canary PASS. See `MUSE_A30_ASSESSMENT.md` §6 for GO/NO-GO list.

**Next:** Code missing fetchers/stores/adaptive wiring → rebuild frame with §4.1/4.2 → Gates 0→1→2 → canary PASS → Gate 0.5 measure→freeze → Gates 4/5 → manifest → preflight scan (cat4=0) → Phase 6.

---

## 2026-08-19 (later) — rl9 canary FAIL root-caused + fixed; log teaching sections expanded

**rl9 (see §0.3.2) showed the webhook IS reachable (HTTP 200) but the canary
FAILED:** 1 delivery charged 1 credit, 0 items stored, `delivery_failure=1`.

**Root cause found + fixed (one line):** migration 0022 made `is_randomized`
`NOT NULL DEFAULT false`, but the webhook extractor sent `isRandomized: null` for
any delivery with no managed batch (probe/canary). NULL into a NOT NULL column →
Postgres error → the whole webhook handler threw → 0 rows + delivery failure.
`server/lib/disruption/flightNotificationExtractor_v3.ts` now defaults unmanaged
rows to `isRandomized: false`. Typecheck still 57.

**Log expansions (your questions answered in place):**

- §0.3.2 — full rl9 table-by-table analysis + the decoded canary FAIL.
- §1 — rewritten for the post-fix state; explains the probing-timing question
  (each command waits its own 2 h; never parallel; why not one 24 h command) and
  what "yield-reference" / 331 / 127 mean.
- §4.1 — the 267/276 is NOT the frame (the 4,320 = 267 curated + 4,053
  unclassified breakdown).
- §4.3 — the `1/p` weight, flight-inclusion ≠ airport-selection, conditional `p_i`.
- §4.4 — where 3 (tiers) and 6 (regions) come from; "18/18 non-empty" and
  pre/post/both explained.
- §4.5 — what UTC is; seeds.
- §4.6/4.7 — the three yield components in plain words + a worked example.
- §4.8 — yield-reference + full worked standardization example.
- §4.9/4.10 — anchor score parts and reconciliation, both expanded.
- §4.12 (new) — "capacity is a gate, not a component".
- §4.13 (new) — the evaluation suite (Engines A–E + R + P) and the R1–R7 / S1–S5
  codes.
- §5 — new glossary terms (canary, conditional probability, inclusion probability,
  evaluation suite, engines, R/S codes, UTC, expanded strata/tiers).
- §6.3 — which columns come from AeroDataBox vs stamped by us; which tables are
  derived vs audit logs.
- §7 — anchor_probe/canary/frame-builder/controller rewritten deeper; new §7.8
  (every formula → its plan source → its exact code line) and §7.9 (how to read a
  probe run); the `is_randomized` bug explained in §7.5.
- §36 (Archive) (new) — the previous "what to do next" archived.
- `CODE_WALKTHROUGH.md` — updated for the fix and the new probe modes.

**You still need to run on Replit:** pull the fix, re-boot, re-run the canary
(step 6), then re-run the WSSS probe — the 08-19 WSSS result predates the fix and
is meaningless.

## 2026-08-19 — Probe hardened after the rl8 post-mortem + log restructured

**rl8 findings (see §10):** the first probe attempt ran out of order, left two
orphaned ACTIVE subscriptions (`99cdf2be-8016-4a91-ab8c-22246fabbd8d`,
`9c87e594-c245-4126-af71-97e3acbef457`), and produced zero deliveries (balance
stayed 2,901, rowsToday=0 for hours) — the webhook path is unverified.

**Probe script changes** (`scripts/anchor_probe.ts` + migration 0023):

1. **`--cleanup`** — deletes probe-owned orphan subscriptions (rows left
   `status='probing'` by an interrupted run) and marks them `abandoned`;
   `--cleanup --force` also deletes any other untracked ACTIVE credit-based sub.
2. **Stage-2 guard** — refuses `--stage 2` for any airport without a completed
   stage-1 probe (the rl8 out-of-order mistake is now impossible).
3. **R1 exclusivity guard** — refuses to start a probe if any foreign ACTIVE
   billable subscription exists.
4. **`probing` status rows** — every probe is inserted as `probing` at
   subscription time and flipped to `completed` at the end, so interrupted runs are
   visible and cleanable. Migration 0023's status CHECK widened to
   `completed | failed | probing | abandoned` (idempotent re-run).
5. **`--check-webhook`** — prints the exact public webhook URL, whether
   `REPLIT_DOMAINS` / `WEBHOOK_BASE_URL` are set, and probes reachability (any HTTP
   status proves reachability; a network error means AeroDataBox can't reach us).
6. Subscription creation now prints `isActive` / `activateBeforeUtc` so activation
   state is visible.

**Log restructured** into the phase-with-steps + teaching layout you asked for:
table of contents with jump links; §0 dashboard; §1 one complete ordered command
list; §2 the plan explained section by section; §3 phases with steps; §4–§6 the
statistics/glossary/tables teaching sections; §7 main code; §8 records-after-
restart commands; §9 money + dates ledger; §10 the rl8 analysis; §11 this change
log; §36 archive (outdated Step A/Step B, old run reports, audit snapshot).

Typecheck: still **57** pre-existing errors, none in the changed files.

**What you do next (on Replit):** `git pull` → `pkill -9 -f node` →
`ADB_AUTO_COLLECT=0 npm run dev` → `--check-webhook` → `--cleanup` → `npm run
canary` → stage 1 probes one at a time (see §1).

## 2026-08-18 — STEP 12 SCRIPT READY: two-stage anchor probe built

**What I built (per the plan §9 / §17 step 12 — the pool
`KLAX·EGLL·WSSS·SBGR·OMDB` is *provisional until measured*, so we now have the
script that measures + scores it):**

1. `migrations/0023_anchor_probe_results.sql` (NEW, registered in `server/db.ts`)
   — `clean.adb_anchor_probe`: one row per probe observation (stage, icao, region,
   live window, `credits_spent`, rows, unique flights, chain links, rows/h,
   uf/credit, chain/credit, stability). Idempotent, unique on
   `(icao, stage, window_start)` so re-runs never duplicate.
2. `scripts/anchor_probe.ts` (NEW, `npm run anchor-probe`) — the probe runner:
   - **Frozen pre-probe math** (decided in code BEFORE measuring, §9 step 4):
     `yield_score = ⅓·std(uf/credit) + ⅓·std(chain/credit) + ⅓·std(stability)`
     standardized to [0,1] against the **WSSS baseline measured the same way**;
     `anchor_score = 40% exogenous + 20% geo + 20% carrier + 20% yield`;
     **capacity gate = rows/h ≥ 60** as a PASS/FAIL feasibility gate (NOT a score
     component).
   - **Frozen shortlist** (12 airports across the 6 regions, from the plan's
     priority anchor regions) with exogenous reference values (published
     scheduled flights/yr + geo + carrier indices). Our own collection never
     feeds the exogenous 80% (kills the §23a feedback loop).
   - Modes: `--stage 1` (2 h probe per candidate, WSSS/OMAA calibration included),
     `--stage 2` (longer confirmation for top picks), `--score` (fills the frozen
     formulas, applies the capacity gate, prints the ranked pool + proposed
     5-airport lock), `--status` (list recorded probes), `--icao`, `--hours`.
   - **Budget-capped inside the 1,900/day budget**: refuses to probe when balance
     < reserve (1,000) or the daily probe spend (cap 500) would push past the cap.
3. `package.json` — added `"anchor-probe": "tsx scripts/anchor_probe.ts"`.
4. `AugMDnotes/CODE_WALKTHROUGH.md` (NEW) — a **full plain-English code
   walkthrough** of the V3.9 codebase (what each file does, how, and why).

**Typecheck:** still **57** pre-existing errors (baseline — no new ones).

## 2026-08-18 — STEP 11 DONE: frame built from the measured universe (rl7)

**Result (from `rl7.md`):** `npm run build-catalog` ran clean after the 0022 fix.
`frameCount 4320` = 267 curated + 4,053 unclassified; 18/18 tier×region strata
non-empty; persisted to `clean.adb_sampling_frame`; `post_eligible 2264`. Step 11
is **complete** — next was step 12 (the two-stage anchor probe).

**Historical implementation description only — superseded for Phase-6 sampling by binding Plan §§4.1–4.2.** The bullets below describe what the 2026-08-18 code did; they are not instructions to preserve its blanket REGIONAL coercion or ICAO-prefix region heuristic.

**Which files changed and what they did at that time (plain English):**

1. `scripts/build_stratified_catalog.ts` (NEW logic, `npm run build-catalog`) — the
   step-11 script: calls AeroDataBox coverage, gives every universe airport a tier
   (curated 276 keep theirs; the rest → REGIONAL "unclassified",
   `traffic_prior=1.0`), a macro-region (ICAO first letter → 1 of 6), and per-layer
   feed flags (`feed_schedule`/`feed_live`/`feed_adsb` →
   `pre_eligible`/`post_eligible`), builds the tier × region strata table, then
   writes all 4,320 rows into `clean.adb_sampling_frame`.
2. `server/lib/disruption/adbCollectionController_v3.ts` — `pickAirportCandidates()`
   now reads candidates from `clean.adb_sampling_frame`, refuses to start if it's
   empty, filters to `post_eligible=true`, and for REGIONAL runs a genuine
   normalized probability draw (`drawWithoutReplacement`, seeded) instead of
   "shuffle and take first". HUB/MID stay deterministic slot-fill. The batch-insert
   stamps `is_randomized` + `airport_layer_design_probability` (REGIONAL) or
   `planned_share` (HUB/MID) — the DB CHECK enforces the rule.
3. `migrations/0021_collection_v39_sampling_frame.sql` (NEW) — `clean.adb_sampling_frame`.
4. `migrations/0022_collection_v39_design_probability.sql` (NEW) — renames
   `sampling_probability` → `airport_layer_design_probability`, adds `is_randomized`
   + `planned_share`, adds the DB CHECK rule + frame-invariant CHECKs; fixed to
   survive re-runs alongside 0012.
5. `server/db.ts` — registers 0021/0022 in `BOOT_MIGRATIONS`.
6. `shared/schema.ts` — TS/Drizzle types for the renamed columns.
7. Consumers updated to the new column/interface names (store, extractor, routes,
   limiter, export/analyze/backfill scripts, test script).
8. Controller `toInt` helper renamed `toNum` (never truncated; the name just
   implied it).

## 2026-08-18 — FIXED: step-11 run failed on migration 0022 re-run (0012 ↔ 0022 order bug)

**What happened (from `rl6.md`):** `npm run build-catalog` aborted:
`[migrations] failed to apply 0022 ... column "airport_layer_design_probability" of relation "flight_data_pre_post" already exists`.

**Why:** every boot re-runs ALL migrations. On the FIRST boot 0022 renamed
`sampling_probability` → `airport_layer_design_probability`. On the NEXT process
migration **0012** ran first and its `ADD COLUMN IF NOT EXISTS sampling_probability`
**re-created the old column**; then 0022's guarded rename saw it again and tried to
rename it onto the already-existing new column → error. (`adb_collection_subs` was
safe because 0012 creates it with `CREATE TABLE IF NOT EXISTS`.)

**Fix (migration 0022, re-runnable):** the rename handles all three states —
only-old-column → rename; both → drop the stale empty re-add; only-new → no-op.
Both tables covered. Typecheck still 57.

## 2026-08-18 — LOG REORGANIZED + `toInt` renamed to `toNum`

- Log restructured so current info is at the top and old stuff lives in the
  archive (§36). `toInt` → `toNum` in the controller (it never truncated; the name
  implied integer rounding of design probabilities).

## 2026-08-18 — SECOND REVIEW: statistical mechanics fixed

A deeper review confirmed the direction but found two must-fix statistical issues:
(1) webhook candidates are now POST-eligible only (the webhook supplies
POST/AIRBORNE observations; subscriptions depend on live/ADS-B coverage);
(2) REGIONAL selection is a genuine normalized probability draw (seeded
`drawWithoutReplacement()`, uniform `p_i = 1/|eligible|` pre-probe; realized p_i
recorded); HUB/MID remain deterministic slot-fill. Plus: `sampling_probability` →
`airport_layer_design_probability` with `is_randomized` + `planned_share` enforced
in the DB (migration 0022), and frame CHECK constraints so the invariants can't
drift. Open (documented pre-freeze): traffic-reference re-tiering, region-mapping
freeze, and the adaptive REGIONAL `m_i` (boots only after probe data).

## 2026-08-18 — REVIEW-DRIVEN FIXES: collector wired to the frame, honest tiering

A code review found three real bugs that would have silently undone the frame
decision: (1) the collector still sampled from the old 276 — now reads
`clean.adb_sampling_frame` and throws if it's empty; (2) `sampling_probability` had
the wrong denominator — now uses the frame tier pool and is labelled a **planned
share**; (3) unclassified airports were invisible to tier counting — now falls back
to REGIONAL. Also: `tierSource` `"default"` → `"unclassified"`, explicit per-layer
feed eligibility, and `build-catalog` runs `applyBootMigrations()` first.

---

<a id="log-section-13"></a>

## 13. Implementation-log entry format (A30 §14 — 59 fields)

> **Structural gap (F3):** This 59-field format is defined here as the target.
> No real `LOG-YYYYMMDD-###` entry has been written using it yet.
> First real entry will be `LOG-20260831-001` once Gates 3-5 complete.
> Until then, §11 prose change log is the execution truth.

**LOG-20260831-001 (A31 corrections — documentation-only, no normative Plan change):**

| # | Field | Value |
|---|---|---|
| 1 | Entry ID | `LOG-20260831-001` |
| 2 | UTC date/time | `2026-08-31 12:00 UTC` |
| 3 | Local date/time | `2026-08-31 05:00 PDT` |
| 4 | Git SHA before | `uncommitted` |
| 5 | Git SHA after | `uncommitted f.9-log` |
| 6 | Real V3.9 phase | Phase 0 (pre-freeze corrections) |
| 7 | Gate | Gate 0 (pre-gate corrections) |
| 8 | Workstream | WS-A Architecture + WS-F Evaluation |
| 9 | #70 item(s) | #3 versioning, #6 snapshot-existence, #16 T milestone, #17 primary-target, #24 test-row chronology, #26 canary false PASS, #27 status overclaims, #28 data-dictionary drift |
| 10 | Plan section | §0.2, §0.3.2, §0.6, §0.7, §3, §5.1, §5.2, §5.4, §6.0, §6.1, §6.2, §6.5, §7.4, §9, §12.2.2, §13.2, §17, §21, §35 |
| 11 | Requirement ID | REQ-003, REQ-006, REQ-016, REQ-017, REQ-024, REQ-026, REQ-027, REQ-028 |
| 12 | Human-readable title | A31 closure audit corrections — documentation-only |
| 13 | Problem | A31 identified 99 sections of corrections, contradictions, and new requirements |
| 14 | Why scientifically | Ensures Plan/Log consistency with provider contracts and scientific rigor |
| 15 | Why operationally | Prevents false PASS, status overclaims, and execution order violations |
| 16 | Why reproducibility | Canonical rule registry provides single source of truth |
| 17 | Previous documented behavior | Various stale wordings, overclaims, and contradictions |
| 18 | Previous actual code behavior | N/A (documentation-only) |
| 19 | Intended final behavior | All A31 high-priority items corrected; medium/low items in progress |
| 20 | Plan diff | §0.2 version corrected, §0.3.2 canary records corrected, §5.1 FIDS protocol updated, §5.2 T-24 acquisition updated, §5.4 budget proof expanded, §6.0 T milestone updated, §6.1 snapshot-existence corrected, §6.2 airborne updated, §6.5 snapshot provenance updated, §7.4 outcome acquisition added, §9 probe rules expanded, §12.2.2 chain completeness expanded, §13.2 endpoint table updated |
| 21 | Log diff | §0.2 version corrected, §0.3.2 canary records corrected, §1 execution order fixed, §3 test-row chronology corrected, §17 phase-5 chronology corrected, §21 grace 60m corrected, §35 status overclaims corrected, §36 canary false PASS corrected |
| 22 | Code diff | None (documentation-only) |
| 23 | Migration diff | None |
| 24 | Test diff | None |
| 25 | Config diff | None |
| 26 | Gate result | N/A (pre-gate) |
| 27 | Blocker? | No — documentation-only |
| 28 | Dependency | None |
| 29 | Revert risk | Low — documentation-only |
| 30 | Rollback plan | N/A |
| 31 | Verification | Consistency scan (pending) |
| 32 | Evidence | A31_1.md, A31_2.md, CODEBUFF_ASSESSMENT_20260831.md |
| 33 | Reviewer | Muse (AI) |
| 34 | Approval | Pending human review |
| 35 | Notes | f.9-log = documentation-only revision; Plan stays f.8 |

**LOG-20260901-001 (Sep1_1 code implementation — actual code, migrations, tests):**

| # | Field | Value |
|---|---|---|
| 1 | Entry ID | `LOG-20260901-001` |
| 2 | UTC date/time | `2026-09-01 04:00 UTC` |
| 3 | Local date/time | `2026-08-31 21:00 PDT` |
| 4 | Git SHA before | `uncommitted f.9-log` |
| 5 | Git SHA after | `uncommitted f.9-code` |
| 6 | Real V3.9 phase | Phase 0 (code implementation) |
| 7 | Gate | Gate 0 (pre-gate code) |
| 8 | Workstream | WS-A Architecture, WS-B Spec consistency, WS-D Population/FIDS, WS-E Identity, WS-G Weather/history |
| 9 | #70 item(s) | #7 FIDS endpoint, #8 withLeg, #9 CanceledUncertain, #14 timestamps, #15 raw ingress, #16 durable persistence, #19 codeshare/retime, #26 historical store, #27 weather ERA5, #36 adaptive m_i, #70 test suite |
| 10 | Plan section | §5.1, §5.3, §6.0, §7.1, §12.2, §14, §15, §16, §27, §36 |
| 11 | Requirement ID | REQ-007, REQ-008, REQ-009, REQ-014, REQ-015, REQ-016, REQ-019, REQ-026, REQ-027, REQ-036, REQ-070 |
| 12 | Human-readable title | Sep1_1 code implementation: FIDS fetcher, historical store, raw ingress, timestamp taxonomy, codeshare/retime, adaptive m_i, weather, tests |
| 13 | Problem | Multiple critical stubs (fidsCensus_v3.ts, historicalFeatureStore_v3.ts) not implemented; no timestamp taxonomy in code; no raw ingress immutability; no test suite |
| 14 | Why scientifically | FIDS population is the prediction basis; historical store enables as-of queries; timestamp taxonomy prevents leakage; raw ingress ensures reproducibility; tests prove correctness |
| 15 | Why operationally | Stubs block Phase 6; no FIDS = no population; no history = no features; no tests = no confidence |
| 16 | Why reproducibility | Append-only raw layers + bitemporal history store enable full audit trail |
| 17 | Previous documented behavior | fidsCensus_v3.ts: STUB (throws); historicalFeatureStore_v3.ts: STUB (throws); no timestamp taxonomy; no raw ingress layers; no test suite |
| 18 | Previous actual code behavior | fidsCensus_v3.ts: throws on fetchFidsPopulation(); historicalFeatureStore_v3.ts: throws on getHistoricalFeatureAsOf() |
| 19 | Intended final behavior | FIDS fetcher calls AeroDataBox API; historical store has bitemporal as-of lookup; raw ingress has 3 immutable layers; timestamp taxonomy defined; codeshare/retime handled; adaptive m_i implemented; weather ERA5 leak prevented; 71 tests pass |
| 20 | Plan diff | None (implementation only) |
| 21 | Log diff | Added §64 corrections, §77 LOG-20260901-001 entry |
| 22 | Code diff | fidsCensus_v3.ts (180 lines), historicalFeatureStore_v3.ts (220 lines), rawIngress_v3.ts (180 lines), timestampTaxonomy_v3.ts (180 lines), flightInstanceCanonical_v3.ts (280 lines, enhanced), adaptiveMi_v3.ts (280 lines), weatherSignal.ts (240 lines, updated), aerodataboxLimiter_v3.ts (60 lines added), flightNotificationExtractor_v3.ts (header corrected) |
| 23 | Migration diff | 0024_historical_feature_store.sql (80 lines), 0025_raw_ingress_immutable_layers.sql (120 lines) |
| 24 | Test diff | tests/provider_fids.test.ts (23 tests), tests/timestamps_raw.test.ts (15 tests), tests/adaptation.test.ts (23 tests), tests/weather_history.test.ts (10 tests) — 71 tests total, all passing |
| 25 | Config diff | vitest.config.ts (new), package.json (vitest devDependency) |
| 26 | Gate result | N/A (pre-gate code) |
| 27 | Blocker? | No — code implementation complete for these items; remaining blockers are live verification and calendar/evaluation modules |
| 28 | Dependency | Requires AERODATABOX_API_KEY for live FIDS testing; requires database for migration 0024-0025 |
| 29 | Revert risk | Low — new files + enhancements; existing extractor unchanged except header |
| 30 | Rollback plan | Delete new files, revert edits to existing files |
| 31 | Verification | 71 tests pass (vitest run); typecheck needed |
| 32 | Evidence | vitest output: 4 passed, 71/71 tests pass |
| 33 | Muse (AI) | Implementation agent |
| 34 | Approval | Pending human review |
| 35 | Notes | Sep1_1 §84: "Where is the executable code?" — answered for 11 critical items |

Every task/change after `2026-08-30` **must** use `LOG-YYYYMMDD-###` (e.g. `LOG-20260831-001`) and record all 59 fields below. Do not reduce to vague prose. This is the `Definition of Done` per `A30 §8`.

| # | Field | What to write | Example (LOG-20260831-001) |
|---|---|---|---|
| 1 | Entry ID | `LOG-YYYYMMDD-###` sequential | `LOG-20260831-001` |
| 2 | UTC date/time | `YYYY-MM-DD HH:MM UTC` | `2026-08-31 06:00 UTC` |
| 3 | Local date/time | if useful `America/Los_Angeles` etc. | `2026-08-30 23:00 PDT` |
| 4 | Git SHA before | `git rev-parse HEAD` before change | `6bcea50` |
| 5 | Git SHA after | after commit (or `uncommitted`) | `uncommitted f.8 10 fixes` |
| 6 | Real V3.9 phase | Phase 0-7 per `Plan §17` | Phase 2 Gates 1-2 |
| 7 | Gate | Gate 0/1/2/3/0.5/4/5/FREEZE | Gate 2 |
| 8 | Workstream | A-I per `A30 §36` | WS-C Sampling frame |
| 9 | #70 item(s) | 1-77 from `A30_77_ADJUDICATION.md` | #1 tier, #2 region |
| 10 | Plan section | `Plan §` 1-22 | §4.1 tier |
| 11 | Requirement ID | `REQ-###` per `§14` | REQ-001 |
| 12 | Human-readable title | one line | `Fix traffic-tier candidate wording` |
| 13 | Problem | what was wrong | `4053 REGIONAL blanket not stratification` |
| 14 | Why scientifically | impact on validity | `tier×region not real stratification` |
| 15 | Why operationally | impact on collection | `frame not final, Gate5 blocked` |
| 16 | Why reproducibility | impact on replay | `tier hash would change` |
| 17 | Previous documented behavior | what Plan said before | `Frozen value` with ORs |
| 18 | Previous actual code behavior | what code did before | `macroRegionForIcao` ICAO first-letter |
| 19 | Intended final behavior | what it does after | `CANDIDATE + country→region + 60°E override` |
| 20 | Files inspected | `read` list | `V3.9_DataCollectPlan.md:230` `build_stratified_catalog.ts:103` |
| 21 | Files modified | `edit/write` list | same 2 files |
| 22 | Functions/classes/modules modified | `buildStratifiedFrame` | `buildStratifiedFrame` |
| 23 | Tables/columns/indexes/constraints modified | `clean.adb_sampling_frame tier` | `tier, region` |
| 24 | Migration IDs | `0021` frame | `0021` |
| 25 | Config/env variables involved | `traffic_source_version` etc. | `traffic_source_version` |
| 26 | External APIs involved | AeroDataBox, OurAirports | AeroDataBox coverage |
| 27 | Implementation approach | how you fixed | `CANDIDATE table, 1 metric at freeze` |
| 28 | Step-by-step code logic | pseudocode | `if country known → country→region else ICAO fallback` |
| 29 | Representative before-code excerpt | fenced TypeScript excerpt | `KCMTP → NA` |
| 30 | Representative after-code excerpt | fenced TypeScript excerpt | `country→region + override` |
| 31 | Inputs | what goes in | `universeUnion 4332` |
| 32 | Outputs | what comes out | `frame 4320` |
| 33 | Side effects | what else changed | `18-cell recomputed` |
| 34 | Data flow | arrow | `coverage → tier/region → frame` |
| 35 | Timestamp semantics | event/provider/available/received | `available_at≤cutoff` |
| 36 | Units | credits vs API units | credits |
| 37 | Provenance implications | raw hash etc. | `tier_hash` |
| 38 | Sampling implications | `p_i` etc. | `tier×region` |
| 39 | Population/denominator implications | FIDS vs webhook | `FIDS` |
| 40 | Label implications | target-specific | `label_observed` |
| 41 | Leakage implications | `available_at` | `available_at` |
| 42 | Evaluation implications | Engine A etc. | `Engine A` |
| 43 | Credit/API-unit implications | 57,900 vs 1,000 | 0 spend |
| 44 | Failure modes considered | 3 states etc. | both→drop stale |
| 45 | Recovery behavior | re-run | `applyBootMigrations` idempotent |
| 46 | Tests added/changed | `fidsTimezone.test.ts` | `TEST-003` |
| 47 | Commands executed | `npm run ...` | `npm run build-catalog` |
| 48 | Exit codes where available | `0` `1` | `0` |
| 49 | Expected result | what you expected | `18/18 strata` |
| 50 | Observed result | what you saw | `18/18` |
| 51 | Raw artifact location | `rlN.md` `hash` | `rl7.md` |
| 52 | Artifact hash | `SHA256` | `abc123` |
| 53 | Seed/version/hash affected | `tier_version` | `tier_version` |
| 54 | A/B/C/D classification | `A/B/C/D` per `§9` | B |
| 55 | Reversibility | can you revert? | yes, re-freeze |
| 56 | Manifest fields affected | `adb_collection_meta` keys | `tier_version` |
| 57 | Unresolved issues | what remains | ISS-002 |
| 58 | Next required action | what to do next | `Gate 0.5` |
| 59 | Final status | `DOCUMENTED/IMPLEMENTED/...` per `§7` | DOCUMENTED |

Example: `LOG-20260831-001 V3.9-f.8 10 fixes` covers A30_3 #1-10 with 59 fields above, see `§11 Change log 2026-08-31`.

<a id="log-section-14"></a>
## 14. Unique record IDs (A30 §15)

`REQ-###` `LOG-YYYYMMDD-###` `DEC-###` `ISS-###` `GATE-0-###` `GATE-1-###` `GATE-05-###` `GATE-4-###` `GATE-5-###` `TEST-###` `RUN-###` `ART-###` `MANIFEST-###`. Trace across matrices (§19-20).

<a id="log-section-15"></a>
## 15. Code-location requirement (A30 §16) — WHERE THIS LIVES

For each component: repo path, module, function/class, helpers, DB table, migration, env key, package script, test file, artifact, producer, consumer. Example `flightInstanceCanonical_v3.ts:1` SHA 6bcea50.

<a id="log-section-16"></a>
## 16. Code explanation requirement (A30 §17) — 20-field per function

1 sig 2 inputs 3 types 4 output 5 type 6 external state read 7 written 8 DB queries 9 API calls 10 validation 11 branching 12 error 13 retry 14 timestamp 15 randomness/seed 16 provenance 17 cost 18 why branch 19 requirement 20 test. Then `WHAT CODE SHOULD LOOK LIKE` excerpt.

<a id="log-section-17"></a>
## 17. Required 88-component walkthrough (A30 §18) — summary

> **Structural gap (F5):** This table is a location map (file:function:status).
> A30 §18 requested 20-field per-function detail (inputs, outputs, error handling,
> dependencies, etc.). Expanding all 88 rows to 20 fields is a FREEZE-stage task.
> The `CODE_WALKTHROUGH.md` file provides plain-English prose for the full tour.

| # | Component | File | Function | Status |
|---|---|---|---|---|
| 1 | measured provider universe | `server/lib/disruption/adbCollectionController_v3.ts:1587` `getAirportCoverage` + `aerodataboxLimiter_v3.ts:306` legacy local aggregator; binding source is the pinned provider coverage inputs with local-aggregator provenance if used | project-local `GET /collection/coverage` historically returned a union; current source/version/time/hash must be remeasured | LEGACY CODE/LIVE EVIDENCE EXISTS; CURRENT GATE-1 ARTIFACT NOT VERIFIED |
| 2 | airport metadata ingestion | `server/lib/disruption/adbAirportCatalog_v3.ts:40` `AIRPORT_TIERS` + `scripts/build_stratified_catalog.ts:181` | `tierForIcao` `AIRPORT_TIERS` 276 | PROVISIONAL (f.7) |
| 3 | traffic reference ingestion | `scripts/build_stratified_catalog.ts:181` CANDIDATE 12mo OAG/Cirium vs ACI/FAA (f.7 §4.1) | `trafficPrior` 3.0/1.5/1.0 | DOCUMENTED f.7 STUB |
| 4 | traffic-tier assignment | final builder must join the frozen traffic reference/cut rules; missing reference remains `UNCLASSIFIED` | `tier`, `tier_verified`, `tier_source`, positive REGIONAL `traffic_prior` | LEGACY blanket REGIONAL assignment is NONCOMPLIANT; corrected production rebuild REQUIRED / NOT VERIFIED |
| 5 | region mapping | current production builder historically used ICAO-prefix heuristics; binding rule requires versioned ISO country→region plus Turkey/Russia/Greenland/Australia overrides and UNMAPPED exclusion | `region` 6 macro-regions | DOCUMENTED / production correction NOT IMPLEMENTED |
| 6 | PRE eligibility | `migrations/0021:40` `pre_eligible=feed_schedule` | `clean.adb_sampling_frame` | IMPLEMENTED |
| 7 | POST eligibility | same; historical expression was `post_eligible = live OR adsb` | same | IMPLEMENTED legacy predicate; final provider-native AIRBORNE denominator still requires Plan §7.5 verification |
| 8 | integrated/separate frame | Log §§4.4/§5 `pre_eligible &&` for HUB/MID | Option B separate pools | DOCUMENTED f.7 |
| 9 | frame persistence | legacy `persistFrameToDb` exists; binding rebuild must persist the newly measured/frozen frame plus rule/reference hashes and explicit UNCLASSIFIED/UNMAPPED reporting | `clean.adb_sampling_frame` | LEGACY persistence LIVE evidence exists; CURRENT binding frame NOT BUILT/FROZEN |
| 10 | future airport/window assignment | legacy `pickAirportCandidates` exists; binding assignment additionally requires corrected frame eligibility, adaptive `m_i`, coverage-floor semantics, solver calendar, and freeze/refusal checks | tier mix `{HUB:1,MID:2,REGIONAL:1}`, enabled anchor consumes HUB slot | LEGACY PATH EXISTS; binding production assignment NOT VERIFIED |
| 11 | UTC schedule | legacy seeded six-slot balancing exists; binding Phase-6 schedule must be emitted by the complete 31-day solver with crossover/washout/split constraints | `time_window_schedule_seed`, `{00,04,08,12,16,20}` balance + full solver artifact | LEGACY COMPONENT EXISTS; final solver/calendar NOT IMPLEMENTED/NOT VERIFIED |
| 12 | local-time conversion | standalone `server/lib/disruption/fidsCensus_v3.ts:utcIntervalToLocal` IANA `Intl.DateTimeFormat` | `fromLocal`/`toLocal` | CODED / focused unit evidence reported; production FIDS scheduling/wiring and required DST test coverage remain NOT VERIFIED |
| 13 | DST handling | same | spring-forward 01→03 gap, fall-back | TEST pending |
| 14 | T-24 population acquisition | `fidsCensus_v3.ts` + Plan §5.2; assignment must be frozen early enough to materialize the full guarded T−24 refresh grid across the service-window cutoff span | T−24 grid + `population_acquisition_guard_minutes` + `population_refresh_cadence_minutes` + `population_max_staleness_minutes` | DOCUMENTED; production grid scheduler NOT VERIFIED |
| 15 | T-6 population acquisition | same frozen non-adaptive grid contract | T−6 refresh grid | DOCUMENTED; production grid scheduler NOT VERIFIED |
| 16 | T-90 population acquisition | same frozen non-adaptive grid contract | T−90m refresh grid | DOCUMENTED; production grid scheduler NOT VERIFIED |
| 17 | FIDS query construction | standalone `fetchFidsPopulation`; **internal** service interval is half-open, provider edge semantics remain Gate-0.5 MEASURE→FREEZE; local/DST conversion, verified range split, guarded pre-cutoff start | verified airport-FIDS path; live unit/range/boundary evidence pending | CODED/UNIT_TESTED standalone; guard/boundary canonicalizer + production wiring NOT IMPLEMENTED |
| 18 | FIDS response preservation | same + `migrations/0019` `flight_population` raw_json+hash `response_hash` | `retrieval_utc` | SCHEMA IMPLEMENTED |
| 19 | FIDS population membership | append-only query/result observations; horizon membership selected as-of `available_at≤prediction_cutoff` | `flight_population` keyed by query/retrieval + population role + confirmed/provisional analytic identity; later responses never backfill | binding schema/selector correction NOT IMPLEMENTED |
| 20 | flight-instance canonicalization | current helper is CODED/UNIT_TESTED but uses an unverified scheduled alias; identity v2 requires verified provider-native schedule identity plus `retime_parent_id`/`retime_root_id` and same-partition grouping | `flight_instance_id` | NOT IMPLEMENTED |
| 21 | codeshare canonicalization | legacy `dedupCodeshares` marketing→operating helper exists; binding identity-v2 must preserve explicit `ambiguous_codeshare`/provisional analytic identity when operating linkage is not verified | `marketingFlightNumbers[]`, `identity_resolution_status`, `analytic_identity_id` | LEGACY HELPER IMPLEMENTED; binding ambiguity-safe production behavior NOT IMPLEMENTED/NOT VERIFIED |
| 22 | route identity | Log §7.5 directed OD original vs actual `diversion_flag` | `OD` | DOCUMENTED |
| 23 | tail identity | Log §7.5 priority reg>mode_s>icao24 `tail_known` `aircraft_swap` break | `tail` | DOCUMENTED |
| 24 | webhook route | legacy route exists; normalized `raw_delivery` durable persistence before successful 2xx is not wired | `POST /webhooks/aerodatabox` | legacy CODED; binding ingress NOT IMPLEMENTED |
| 25 | webhook auth | `server/lib/disruption/aerodataboxLimiter_v3.ts:26` `WEBHOOK_SECRET` `x-adb-signature` | header | IMPLEMENTED |
| 26 | payload validation | `server/lib/disruption/flightStatus_v3.ts:188` zod `flightNotificationContractSchema` | length check | IMPLEMENTED |
| 27 | extractor | `server/lib/disruption/flightNotificationExtractor_v3.ts:242` `extractFlightNotification` flatten null not 0 `isRandomized ?? false` | `has_live_location` | IMPLEMENTED (rl9 fix) |
| 28 | immutable raw envelope | legacy `adb_ingest_events` mixes ingress/processing; migration 0025 defines normalized layers but is unapplied/unwired | raw delivery contract | FILE CREATED / helper CODED; NOT IMPLEMENTED |
| 29 | ingest ledger | three quantities; historical implementation/config references tol3 and is noncompliant with binding official canary tolerance 0 | ledger | LEGACY PATH EXISTS; exact-tol0 correction is REQUIRED OFFLINE / NOT VERIFIED |
| 30 | flight_events | migration 0019 legacy event table; corrected canonical clocks and versioned semantic identity are not fully represented/wired | `flight_events` | MIGRATION_FILE_EXISTS / CORRECTION NOT IMPLEMENTED |
| 31 | current state | legacy dedup exists but uses a research-inadequate key; corrected semantic-event/current-state chain unverified | `flight_state` | legacy IMPLEMENTED; binding correction NOT IMPLEMENTED |
| 32 | raw airborne events | `migrations/0020:32` `raw_airborne_events` every point | `raw_airborne_events` | SCHEMA STUB |
| 33 | cleaned airborne points | same `clean_airborne_points` impossible lat/lon/alt/speed filter | `clean_airborne_points` | SCHEMA |
| 34 | trajectory reconstruction | same `flight_trajectory` `raw→clean→trajectory→snapshots` S5 | `flight_trajectory` | SCHEMA |
| 35 | PRE snapshot builder | future `flight_snapshots` T-24/6/90 `available_at≤cutoff` `history_ready_at` | `flight_snapshots` | STUB |
| 36 | AIRBORNE snapshot builder | requires independently verified provider-native airborne movement evidence; POST-only captured rows are auxiliary when denominator unavailable | `flight_airborne_snapshots` | NOT IMPLEMENTED / denominator BLOCKED_LIVE_EVIDENCE |
| 37 | target-specific outcomes | Log §7.3 `gate_out/wheels_off/wheels_on/gate_in_label_observed` target-specific | `flight_outcomes` | DOCUMENTED |
| 38 | censoring/grace | Log §7.4 `grace_minutes` P95+margin measure→freeze (NOT hard-coded60m) | `flight_outcomes` | DOCUMENTED |
| 39 | canonical timestamp contract | notification generation, delivery attempt/time/cost, provider state update, nullable location report, HTTP receipt, durable persistence, `available_at`, and source | `flight_events`/raw layers | DOCUMENTED; production correction NOT IMPLEMENTED |
| 40 | provenance graph | Log §6.5 `provenance_json` `flight_population` hash `feature_builder_version` | `flight_snapshots` | DOCUMENTED |
| 41 | historical feature store | standalone bitemporal helper exists; no production snapshot wiring | `historical_feature_store` | CODED/UNIT_TESTED; NOT IMPLEMENTED |
| 42 | weather observations | legacy live METAR helper exists; normalized observation table/join absent | `weather_observation` | legacy CODED; binding path NOT IMPLEMENTED |
| 43 | weather forecasts | Plan §10.1 TAF issue/amendment `available_at≤cutoff` `valid_from/to` | `weather_forecast` | DOCUMENTED |
| 44 | weather joins | operational METAR/archive/GFS as-known-at-cutoff; ERA5 retrospective/lagged only | `weather_observation` | DOCUMENTED; NOT IMPLEMENTED |
| 45 | anchor Stage1 | legacy target-2h script exists; binding 500-cap censoring, frozen candidates/replacements, count semantics unverified | `adb_anchor_probe` | CODED legacy; corrected path NOT IMPLEMENTED |
| 46 | anchor score | weight constants exist; exogenous values/caps, fixed stability semantics, tie/ranking integration remain unfrozen/unverified | `anchor_score` | CODED partial; NOT IMPLEMENTED binding path |
| 47 | yield-reference | Log §9.2 WSSS primary OMAA fallback rename calibration → yield-reference | `yield_reference` | DOCUMENTED |
| 48 | stability | binding first-valid-observation-per-flight-instance 15-minute count and CV formula | `stability` | DOCUMENTED; legacy implementation semantics unverified |
| 49 | capacity gate | same `CAPACITY_GATE=60` rows/h≥60 gate not component | `capacity_pass` | IMPLEMENTED |
| 50 | anchor Stage2 | target-4h cap-censored confirmation with failure/replacement protocol | `adb_anchor_probe` stage2 | DOCUMENTED; corrected path NOT IMPLEMENTED |
| 51 | anchor lock | exactly five valid Stage-2-confirmed candidates | 5-pool | BLOCKED pending paid probes/evidence |
| 52 | HUB selection | `server/lib/disruption/adbCollectionController_v3.ts:444` `advanceAnchor` no-repeat-until-all seeded | `anchor` | IMPLEMENTED |
| 53 | MID selection | same freshest-first `last_direct_observation_at ASC` 7-day exclusion | `MID` | IMPLEMENTED |
| 54 | REGIONAL draw | legacy normalized-draw helper exists; binding score is `traffic_prior_i·m_i` with `m_i∈[0.25,1.5]` and coverage-floor score-time boost handled separately | `REGIONAL p_i` | LEGACY equal-score/uniform initialization evidence only; adaptive production integration REQUIRED / NOT VERIFIED |
| 55 | adaptive m_i | exact α=0.5 recurrence, first-observation rule, eligible-REGIONAL median pool, `m_i=1.0` for every eligible REGIONAL at Phase-6 start, EMA NULL until first valid observation; probes excluded | `adb_sampling_frame.m_i` | DOCUMENTED; standalone helper CODED/UNIT_TESTED; production integration REQUIRED / NOT VERIFIED |
| 56 | zero-yield FSM | successful complete zero only; failures independent; once/repeated/persistent exact transitions and repeated ×0.75 | `zero_yield_state` | DOCUMENTED; production NOT IMPLEMENTED |
| 57 | coverage probability | every eligible REGIONAL has `traffic_prior>0`, `m≥0.25`; ≥20d/never-observed floor eligibility persists across unsuccessful draws and clears only after successful valid Phase-6 observation; score-time boost ≤1.5×; no finite-run guarantee | `coverage_floor` | DOCUMENTED; production NOT IMPLEMENTED |
| 58 | scheduler | legacy scheduling exists; binding complete 31-day constraint solver/SAT evidence absent | scheduler | legacy CODED; binding scheduler NOT IMPLEMENTED |
| 59 | crossover/calendar | **5 unique pairs**: 3×(4h vs 2×2h), 2×(4h vs up-to-6h); randomized order within frozen pair, same airport/time/weekday/split, ≥24h end→start; 2×2 parent/children; solver returns schedule or explained UNSAT | `crossover` | DOCUMENTED; production solver/paired-analysis/parent-child wiring NOT IMPLEMENTED |
| 60 | batch start | same `startBatchInner` `in_frame && post_eligible` + `pre_eligible &&` for HUB/MID per §4.4 | `adb_collection_batches` | IMPLEMENTED |
| 61 | subscription creation | legacy path sets `maxDeliveryRetries=0`; 1 credit/item/SEND contract | `adb_collection_subs` | IMPLEMENTED legacy path; complete raw/SEND ledger NOT IMPLEMENTED |
| 62 | budget guard | legacy received-ledger reservation; unsafe for charged SEND without delivery | ledger | legacy CODED; SEND-aware guard NOT IMPLEMENTED |
| 63 | SOFT_STOP | legacy `1900-50=1850` received-ledger check; binding design also requires provider balance, attempt cost, raw ledger, unsettled margin | `stop_reason` | legacy CODED; SEND-aware production enforcement NOT IMPLEMENTED |
| 64 | HARD_CAP | 1900/day contract plus authoritative balance/attempt/raw/unsettled evidence | `HARD_CAP` | threshold CODED; complete enforcement NOT IMPLEMENTED |
| 65 | delivery-failure stop | same `flagBatchRows` `sampling_reason='delivery_failure'` PAUSE | `delivery_failure` | IMPLEMENTED |
| 66 | credit reconciliation | official isolated rule is exact equality after stable balance; production tolerance, if any, must be separate and evidence-based | `reconciliation_status` | production correction NOT IMPLEMENTED |
| 67 | canary | current documented repository evidence historically references tol3; binding official isolated canary requires `CANARY_TOLERANCE=0` after settlement | `credit_canary` | LEGACY CODE / prior LIVE FAIL; exact-tol0 offline correction + tests REQUIRED / NOT VERIFIED |
| 68 | Gate-0 report | historical report used incomplete 57,900/939 assumptions; exact 60,000-cycle accounting + Alert/API identities and fresh account evidence are required | `adb_collection_meta` | prior evidence SUPERSEDED; offline report correction NOT VERIFIED and live Gate 0 NOT PASSED |
| 69 | Gate-1 coverage | `scripts/measure_coverage.ts:15` legacy `computeAirportCoverage`; current run must use pinned provider coverage inputs/local aggregator and freeze source/version/time/hash | historical `universeCount=4332` provenance only | LEGACY LIVE EVIDENCE EXISTS; CURRENT GATE-1 REMEASUREMENT NOT PASSED |
| 70 | Gate-2 anchor | exact frozen lists, cap-censored stages, five confirmations | Gate2 | NOT RUN / BLOCKED |
| 71 | Gate-3 canary | corrected exact reconciliation after stable balance | Gate3 | prior LIVE FAIL; correction NOT IMPLEMENTED/BLOCKED |
| 72 | Gate-0.5 inspection | Plan §6.6 Verify `event_phase/data_stage` only on snapshot multi-point `available_at` distinct + cadence | Gate0.5 | DOCUMENTED |
| 73 | Gate-4 cap/reliability | parameterized offline cap=100/margin=10 plus SEND-without-receive failures; production arithmetic 1900-50 | Gate4 | DOCUMENTED; scaled integration test NOT IMPLEMENTED; live BLOCKED |
| 74 | Gate-5 census | role-aware population/in-population/outside/snapshot/outcome funnel over exact service intervals | `flight_population` | DOCUMENTED; builder CODED standalone; Gate NOT IMPLEMENTED |
| 75 | manifest generation | legacy writer lacks complete binding registry/readiness/budget/calendar fields | `manifest` | CODED partial; CONFIG_REGISTRY_COMPLETE=BLOCKED |
| 76 | preflight scan | `grep proposal/TBD/~/may` `proposal/TBD/~` cat4=0 | preflight | DOCUMENTED |
| 77 | split-assignment rule | Plan §13.2-13.4 `split_rule_hash` BEFORE `test_row_hash` AFTER `split_seed` | `split_rule` | DOCUMENTED |
| 78 | final test materialization | Plan §13 corrected chronology `test_row_hash` read-once | `test_row` | DOCUMENTED |
| 79 | Model -1 | Plan §36.1 persistence last-known airport/route/tail delay gate | `Model -1` | DOCUMENTED |
| 80 | Model 1 XGBoost | same tabular airport/route/aircraft/schedule stats | `Model1` | DOCUMENTED |
| 81 | evaluation engines | Plan §13 `group_by` calendar_day/event_id vs tail `Engines A/B/C/D/E/R/P/POST` `flight_instance_id` grouping | `evaluation` | DOCUMENTED |
| 82 | block bootstrap/disruption | 95%/1000 reps; A calendar-day, B airport, C region, D tail, R route; Engine E requires frozen multi-flight event engine | `bootstrap` | DOCUMENTED; Engine E DEFERRED |
| 83 | rolling-origin | exact development intervals freeze before first model fit, after row materialization; use days 1–25 only, protected days 26–31 excluded | `rolling-origin` | DOCUMENTED |
| 84 | collection-ablation | same A all / B minus coverage-age/notification / C minus airport / D minus graph `does model learn aviation vs data buying?` | `ablation` | DOCUMENTED |
| 85 | staleness curves | same `state_age` 10m/30m/1h/3h/6h/12h/24h/48h error vs age | `staleness` | DOCUMENTED |
| 86 | info-per-credit | same `MV=ΔM/Δcredits` `a·n^-b+c` 2k-58k learning curve | `MV_data` | DOCUMENTED |
| 87 | exports | `scripts/export/*` CSV `flight_snapshots` | `exports` | stub |
| 88 | diagnostics | `server/lib/disruption/monitor.ts` weekly `tail missing` `chain completeness` | `diagnostics` | stub |

*Full 88 rows: summarized here for readability (see `AugMDnotes/A30_77_ADJUDICATION.md` for the 77-row adjudication and §19 for B/C traceability; exhaustive 88-row detail available in prior 2355-line version archive).*

<a id="log-section-18"></a>
## 18. Repository file map (A30 §19) — critical files summary (exhaustive list via `git ls-files`; full 77-row adjudication in `AugMDnotes/A30_77_ADJUDICATION.md`)

| File | Role | Major functions | Reads | Writes | External API | DB objects | Config | Tests | Plan § | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| `package.json` | scripts | `dev, health, gate0, coverage, build-catalog, canary, anchor-probe` | — | — | — | — | — | — | §15-17 | IMPLEMENTED |
| `package-lock.json` | dependency lock | reproducibility input | — | — | — | — | — | no current install/build evidence | §25 | FILE EXISTS; hash/runtime verification pending |
| `server/db.ts` | migrations | `applyBootMigrations, pool` | `BOOT_MIGRATIONS` | `migrations` | — | all | `DATABASE_URL` | — | §15 S2-5 | IMPLEMENTED |
| `migrations/0017_collection_v39_credit_accounting.sql` | legacy ledger migration | mixed accounting objects | — | ledger | — | ledger | — | no current DB check | §3 §11 | FILE EXISTS; historical application evidence only |
| `migrations/0019_collection_v39_population_and_events.sql` | population/events migration | legacy schemas, not final timestamp/identity contract | — | tables | — | S1-3 | — | no current migration test | §5-6 | FILE EXISTS; historical application evidence only |
| `migrations/0020_collection_v39_airborne_time_series.sql` | airborne schema migration | intended S5 objects | — | S5 | — | S5 | — | no current migration test | §6.2 | FILE EXISTS; historical application evidence only |
| `migrations/0021_collection_v39_sampling_frame.sql` | frame migration | provisional frame schema | coverage | frame | — | §4 | — | no current DB check | §4 | FILE EXISTS; historical provisional data evidence |
| `migrations/0022_collection_v39_design_probability.sql` | probability migration | rename/check | — | schema | — | §8 §10 | — | no current migration test | §8 | FILE EXISTS; historical application evidence only |
| `migrations/0023_anchor_probe_results.sql` | probe migration | legacy probe results schema | — | probe | — | §9 | — | no current migration test | §9 | FILE EXISTS; historical application evidence only |
| `server/lib/disruption/adbAirportCatalog_v3.ts:40` | catalog | `tierForIcao, AIRPORT_TIERS` 276 curated 30/89/157 | — | 276 | — | — | — | — | §4 | PROVISIONAL |
| `scripts/build_stratified_catalog.ts:181` | builder | `buildStratifiedFrame, macroRegionForIcao, persistFrameToDb` country→6 + 60°E override f.8 | coverage free | `clean.adb_sampling_frame` | `GET /collection/coverage` free | frame | `region_mapping_version` | manual 18/18 | §4 §8 | PROVISIONAL |
| `server/lib/disruption/adbCollectionController_v3.ts:80` | controller | legacy batch/subscription/watchdog path | frame/subs | collection tables | Alert SEND costs | ledgers | daily cap/reserve | historical live evidence | §8 §11 | IMPLEMENTED legacy path; send-aware watchdog and adaptive `m_i` integration NOT IMPLEMENTED |
| `scripts/anchor_probe.ts:242` | probe | legacy probe/scoring path; binding cap censoring/count/replacement/list rules unverified | probe tables | probe | paid Alert SEND | `adb_anchor_probe` | incomplete | focused/legacy only | §9 | CODED legacy; binding correction NOT IMPLEMENTED |
| `scripts/credit_canary.ts:36` | canary | historical code uses tol3; binding official canary requires exact equality after settlement | subs/balance | ledger | 1cr/item SEND | ledger | required `CANARY_TOLERANCE=0` | prior live FAIL | §11 | CODED / production correction NOT IMPLEMENTED |
| `server/routes_v3.ts:81` | webhook | legacy webhook route; normalized durable raw delivery before 2xx not wired | payload | legacy tables | POST webhook | legacy ingress | `WEBHOOK_SECRET` | focused extractor only | §6 | legacy IMPLEMENTED; binding ingress NOT IMPLEMENTED |
| `server/lib/disruption/flightNotificationExtractor_v3.ts:242` | extractor | `extractFlightNotification, eventKey` flatten null not 0 | payload JSON | `flight_events` | webhook | `flight_events` | — | `test-extractor` | §6 | IMPLEMENTED (rl9 fix) |
| `server/lib/disruption/flightDataPrePostStore_v3.ts:139` | store | legacy `upsertFlightNotifications`; legacy research key `SHA256(flight,carrier,locReportedUtc)` is noncanonical for non-location events; binding raw/event identities come from Plan §6–§7 | `flight_events` | legacy `flight_events` + `raw_airborne_events` dual path | — | `flight_events` | — | — | §6 | legacy IMPLEMENTED; binding immutable raw ingress / `available_at` / canonical observation identity NOT IMPLEMENTED |
| `server/lib/disruption/flightInstanceCanonical_v3.ts:1` | identity | canonicalization/codeshare/retime helper; current hardcoded milestone semantics require identity-v2 correction | FIDS rows | `flight_instance_id` | FIDS | `flight_population` | `flight_instance_version` | focused unit evidence only | §7.1 §43-44 | CODED / UNIT_TESTED / NOT IMPLEMENTED |
| `server/lib/disruption/fidsCensus_v3.ts:1` | FIDS | `fetchFidsPopulation, utcIntervalToLocal` | FIDS airport endpoint | `flight_population` raw_json+hash | REST units | `flight_population` | retry budget | focused unit evidence | §5.1 §40-41 | CODED / UNIT_TESTED / NOT IMPLEMENTED (no production caller proven) |
| `server/lib/disruption/historicalFeatureStore_v3.ts:1` | history | bitemporal as-of helper | `historical_feature_store` | — | — | snapshot builder | `history_ready_at` | focused unit evidence | §12.2 §70 | CODED / UNIT_TESTED / NOT IMPLEMENTED |
| `server/lib/disruption/weatherSignal.ts:54` | weather | legacy live METAR helper; no normalized as-known-at-cutoff weather tables/joins | AviationWeather | — | free source | intended weather tables | source version | — | §10 | CODED legacy; binding weather path NOT IMPLEMENTED |
| `shared/schema.ts:748` | schema | `clean.flight_data_pre_post` drizzle `pgSchema("clean")` (drift: S-layers via raw pool.query) | — | `flight_data_pre_post` | — | `flight_data_pre_post` | — | — | §12 | DRIFT (raw SQL) |

*Full map in previous version — every file has producer/consumer.*

<a id="log-section-19"></a>
## 19. Requirement → Code → Test → Evidence traceability — incomplete

| Req | Plan § | #70 | Code file | Status |
|---|---|---|---|---|
| REQ-001 | §4.1 | 1 | `build_stratified_catalog.ts` `buildStratifiedFrame` | B PROVISIONAL |
| REQ-005 | §7.1 | 4 | `flightInstanceCanonical_v3.ts` | B CODED/UNIT_TESTED; identity-v2 + production wiring unresolved |
| REQ-006 | §5.1 | 5 | `fidsCensus_v3.ts` | B CODED/UNIT_TESTED; NOT IMPLEMENTED |
| REQ-012 | §8.2 | 10 | `adaptiveMi_v3.ts` + controller REGIONAL draw | B CODED/UNIT_TESTED; NOT IMPLEMENTED |

This four-row summary does not satisfy the binding every-critical-requirement matrix and no external historical adjudication is accepted as current source of truth without reconciliation. Required columns for code function, schema, migration, config, unit/integration/live tests, result/evidence, blocker, deadline, and manifest field remain missing. `REQUIREMENT_MATRIX_COMPLETE=NOT_COMPLETE`; no code-required requirement is closed by SPEC alone.

<a id="log-section-20"></a>
## 20. Code → Requirement reverse — incomplete

| Function | Why exists | Requirement | Consumers |
|---|---|---|---|
| `buildStratifiedFrame` | measured universe → frame | REQ-001 | controller |
| `canonicalFlightInstanceId` | stable leg identity | REQ-005 | FIDS, POST grouping |
| `fetchFidsPopulation` | S1 denominator | REQ-006 | Gate5 |

This is not a complete reverse map of Phase-6-critical files/functions. `REVERSE_CODE_MAP_COMPLETE=NOT_COMPLETE`; orphaned/stale production code has not been excluded.

<a id="log-section-21"></a>
## 21. Database data dictionary (A30 §22) — transitional contract map, NOT full schema evidence

**Every table:** `table name / purpose / producer / consumer / PK / unique keys / FKs / indexes / row unit / cardinality / append-only vs mutable / source of truth / retention / provenance`

**Every column:** `name / SQL type / nullable / unit / semantics / source: provider/derived/our server/reference / timestamp type / availability rule / producer / consumers / missing-state meaning / QC`

The table below mixes existing legacy objects, migration-created-but-unapplied objects, and intended objects. It is not proof that every row/column exists or is production-wired. A complete schema-introspection-backed column dictionary is `NOT_VERIFIED` in this document pass and remains mandatory repository work; any intended object is DOCUMENTED unless separately evidenced as migration-created, tested, applied, and wired. **Retention is a data-class decision, not a table-name shortcut. Classify every important table/column as `raw_api_content`, `derived_work_candidate/derived_work`, `non_aerodatabox_project_metadata`, or another sourced class with legal basis. AeroDataBox Article 5.5 governs retained raw API Contents unless Plan Terms grant another period; Article 5.6 states that §5.5 does not apply to Derived Works, but other Terms restrictions still do. Therefore no table below receives an unconditional “permanent” claim merely because it is normalized or useful.**

| Table | Purpose | Producer | Consumer | PK | Unique | FKs | Indexes | Row unit | Cardinality | Append/mutable | Source of truth | Retention | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `clean.adb_sampling_frame` | measured/frozen airport frame (current count not hard-coded) | `build_stratified_catalog.ts` corrected path | `adbCollectionController:pickAirportCandidates` | `icao` | `icao` | none | `tier,region,pre_eligible,post_eligible` | airport | measured at current rebuild | mutable until FREEZE then read-only | provider coverage + frozen reference hashes | **non-AeroDataBox project metadata / reference-derived fields; retention per project/reference-source policy, provided raw provider Contents are not embedded** | `coverage_hash` `tier_version` `region_mapping_hash` |
| `adb_anchor_probe` | standardized cap-censored probe measurements/attempt metadata | legacy probe script; corrected path not verified | scoring | stable probe-attempt ID (legacy unique tuple may remain) | deterministic attempt uniqueness required | frame reference | `icao,stage` | probe attempt | variable with replacements | append contract | derived counts + accounting evidence | **derived-work/project-metadata classification required; do not embed raw provider Contents; retention basis documented before FREEZE** | `probe_hash` + source-delivery/query hashes |
| `adb_collection_batches` | batch accounting, authorization, reconciliation | `adbCollectionController` production path | accounting/gates | `batch_id` | `batch_id` | template/calendar | `window_start,reconciliation_status` | authorized collection window | materialized calendar-dependent | mutable until settlement, then append-audited | settled provider balance + internal ledgers | **non-AeroDataBox project metadata unless provider Contents are copied into fields; retention per project policy** | `batch_hash` + balance/accounting evidence hashes |
| `adb_collection_subs` | authorized experimental airport-subscription lifecycle within a batch/segment | production selector/subscription manager | raw/accounting joins | stable row ID or `(batch_id,subscription_id)` | provider `subscription_id` | `batch_id` | `batch_id,icao,segment` | subscription lifecycle | calendar/protocol-dependent; not hard-coded 124 | mutable until cleanup/settlement then audited | provider subscription ID + frozen selection metadata | **non-AeroDataBox project metadata unless provider Contents are copied; retention per project policy** | `subscription_id` + selection/template hash |
| `adb_collection_meta` | binding V3.9-f.8 draft/frozen manifest, registry and experiment metadata | manifest/registry writers | all gates | `key` | `key` | none | `key` | metadata entry | variable | mutable pre-FREEZE, immutable/forked after FREEZE | manifest/registry hashes | **non-AeroDataBox project metadata; retention per project policy** | `manifest_hash` + source artifact hashes |
| `clean.raw_delivery` | immutable HTTP envelope created by migration 0025 | `rawIngress_v3.ts` intended producer | `raw_delivery_item`, processing | `id` | `delivery_id` | none declared | subscription/batch/received/hash | HTTP delivery | per attempt | append-only contract | `raw_body_sha256` | BLOCKED pending Plan Terms | raw body + HTTP metadata |
| `clean.raw_delivery_item` | immutable provider flight item created by migration 0025 | raw ingress item persistence | parser/semantic events | `id` | `(delivery_id,item_index)` | logical delivery link, no SQL FK | flight/canonical/delivery | item | per flight item | append-only contract | `raw_item_sha256` | BLOCKED pending Plan Terms | raw item hash |
| `clean.processing_attempt` | immutable parser/storage attempt created by migration 0025 | semantic processing | recovery/diagnostics | `id` | none | logical delivery link, no SQL FK | delivery/outcome | processing attempt | per attempt | append-only contract | parser/storage result | **non-AeroDataBox project metadata only if it stores no raw/content excerpts; otherwise classify contained fields separately** | parser/schema versions + errors + delivery hash reference |
| `adb_ingest_events` | legacy mixed ingress/processing ledger; not the normalized immutable-envelope source once migration 0025 is production-wired | current webhook path | legacy consumers | `event_id` | `event_id` | `subscription_id,batch_id` | `received_at,subscription_id` | legacy event | per item | mixed legacy semantics | payload/processing result | BLOCKED pending Plan Terms | legacy provenance |
| `flight_events` | semantic append-only observations with canonical clocks | semantic processor NOT fully corrected/wired | `flight_state` | `event_id` | versioned semantic observation key required | raw item/delivery links required | flight instance + state/location clocks | semantic observation | per semantic event | append-only contract | raw-item provenance | BLOCKED pending Plan Terms | delivery/item hash + parser version |
| `flight_state` | current latest-state convenience S3 | semantic processor | operational | `flight_instance_id` | `flight_instance_id` | `flight_events` | `flight_instance_id` | flight latest | per flight | mutable | `flight_events` | **retention/classification BLOCKED** | canonical provenance |
| `raw_airborne_events` | one row per real provider location observation | semantic processor | `clean_airborne_points` | `event_id` | location clock + raw-item provenance, not timestamp alone | `flight_events`/raw item | `location_reported_utc` | airborne point | per point | append-only contract | raw item | BLOCKED pending Plan Terms | delivery/item/event links |
| `clean_airborne_points` | cleaned/versioned airborne point derived from provider observations | ETL `clean` | `flight_trajectory` | `point_id` | versioned point identity required | raw/event provenance | `flight_instance_id,location_reported_utc` | cleaned point | per retained/derived point | append contract | derived transform + raw-item provenance | **DERIVED_WORK candidate; Article-5.5 raw retention is not automatically inherited, but legal/Terms classification must be documented before longer retention** | raw-item/event hashes + transform version |
| `flight_trajectory` | versioned trajectory derived from clean airborne points | ETL `trajectory` | `flight_airborne_snapshots` | `trajectory_id` | `(flight_instance_id,trajectory_version)` | point provenance | `flight_instance_id` | trajectory version | per flight/version | append/versioned; do not overwrite research versions | derived clean points | **DERIVED_WORK candidate; retention basis/classification required before longer-than-raw use** | `trajectory_hash` + input point hashes + transform version |
| `flight_population` | append-only role-aware FIDS **population-observation membership** | intended `fidsCensus_v3.ts` corrected production path | PRE/AIRBORNE denominator + snapshots | `population_membership_id` or equivalent | `(population_query_id,flight_instance_id,population_role)`; repeated retrievals must coexist | query/frame/flight-instance provenance | query/retrieval + service interval + role | membership observation | per returned qualifying flight per query retrieval | append-only semantic observation; raw response separate | provider query/result provenance + canonicalization version | **raw FIDS response expires per verified Plan Terms; normalized membership is DERIVED_WORK candidate and requires documented classification before longer retention** | `population_query_id` `response_hash` `fids_retrieval_utc` `available_at` `population_role` |
| `flight_snapshots` | PRE ML rows per `(flight_instance_id,horizon,prediction_cutoff)` using only population/features available by cutoff | snapshot builder NOT YET production-evidenced | evaluation/outcome join | `snapshot_id` | `(flight_instance_id,horizon,prediction_cutoff)` | population observation + versioned history/weather | `prediction_cutoff,flight_instance_id` | snapshot | per eligible flight/horizon | append/versioned | latest qualifying population observation + as-of features | **DERIVED_WORK candidate; retention basis/classification required, with no embedded raw provider payload** | `provenance_json` population/query/input hashes + builder versions |
| `flight_airborne_snapshots` | AIRBORNE rows per frozen deployable decision cutoff, with physical observation time retained separately and independent provider-native airborne eligibility | snapshot builder NOT IMPLEMENTED | outcomes/Model POST | `airborne_snapshot_id` | `(flight_instance_id,prediction_cutoff_utc,snapshot_version)` or equivalent | trajectory + population + eligibility evidence | cutoff/flight instance | airborne snapshot | per eligible decision point | append/versioned | verified airborne evidence + only inputs available by cutoff | **DERIVED_WORK candidate; retention basis/classification required** | population/trajectory/input hashes + eligibility evidence + builder version |
| `flight_outcomes` | independent operational state plus target-specific terminal status/value/evidence | terminalizer NOT IMPLEMENTED | evaluation labels | target-outcome row ID | `(flight_instance_id,target_name,target_version)` | event/population/recovery provenance | flight/target/status | target outcome | per flight/target/version | mutable only while pending, then terminal append/audit | verified terminal evidence | **DERIVED_WORK candidate when normalized from provider evidence; retention basis/classification required and raw recovery responses follow raw-content policy** | grace/deadline/retrieval/evidence hashes |
| `historical_feature_store` | append-only bitemporal feature versions with effective/source time and `available_at` | standalone helper, not production-wired | snapshots | composite feature-version key | same | source provenance | entity/feature/effective/available | feature version | per version | append-only contract | source/versioned transform | **classify per source: AeroDataBox-derived features are DERIVED_WORK candidates; external/reference/weather features follow their own source/license policy** | source hash/version/ingested time/transform version |
| `weather_observation` | METAR `observation_time≤cutoff`; AviationWeather API currently offers retrieval history up to 30d (not a retention term) | `weatherSignal.ts:54` `getAirportWeather` | `flight_snapshots` | `(station,observation_time)` | `station,observation_time` | `airport` | `observation_time,station` | observation | per station per time | append | `aviationweather` | retention/storage per applicable source/license policy; API history depth recorded separately | `source` `retrieval_utc` `available_at` |
| `weather_forecast` | intended TAF `issue_time≤cutoff`, `available_at≤cutoff`, validity/amendment history | NOT IMPLEMENTED | snapshots | intended composite key | intended | station mapping | issue/station | forecast version | per forecast | append contract | named operational source | BLOCKED pending source Terms; ERA5 not operational fallback | source/amendment/retrieval |
| `split/test-set metadata` | frozen split rule hash before collection; protected actual test-row IDs/hash only after rows exist and before model fitting/tuning | evaluation builder | engines A/B/C/D/E/R/P/POST | `split_rule_version` | rule/test hash as applicable | snapshot IDs after materialization | split version | project metadata | rule=1 version; row map variable | immutable after applicable freeze | split/test hashes | **non-AeroDataBox project metadata; retention per project policy** | `split_rule_hash` `test_row_hash` |
| `manifest metadata` | binding f.8 manifest: provider/reference/config/budget/gate/calendar/split-rule hashes and frozen values | manifest writer | all gates/FREEZE | `key` | `key` | none | `key` | manifest metadata | one frozen manifest version per authorized experiment | immutable after FREEZE; changes require a new authorized version/run | manifest hash + source artifacts | **non-AeroDataBox project metadata; retention per project policy** | `manifest_hash` + referenced source hashes |

**Key column examples (every important column `name / type / nullable / unit / semantics / source / timestamp type / availability / producer / consumers / missing / QC`):**

- `flight_events.event_timestamp TIMESTAMPTZ NULL`: optional semantic event time; location events may source `location_reported_utc`, but non-location updates must not fabricate it. Snapshot eligibility is controlled by `available_at`, not this nullable field alone.
- `flight_events.provider_state_updated_utc TIMESTAMPTZ NULL`: provider-native state-update clock sourced from `lastUpdatedUtc`; it is NOT notification generation/publication time.
- `provider_notification_generated_utc TIMESTAMPTZ NULL`: notification-envelope generation clock when present; distinct from state update.
- `delivery_attempt_seq_no INTEGER`, `delivery_attempt_utc TIMESTAMPTZ`, and `delivery_attempt_cost_credits NUMERIC`: preserve provider attempt sequence, attempt time, and cost. Received-attempt cost is diagnostic; settled balance GET remains authoritative.
- `location_reported_utc TIMESTAMPTZ NULL`: live-location observation clock; nullable for non-location updates.
- `http_received_at_utc TIMESTAMPTZ NOT NULL` and `raw_persisted_at_utc TIMESTAMPTZ NOT NULL`: server receipt and durable persistence clocks. `available_at` cannot precede durable persistence.
- `flight_events.available_at TIMESTAMPTZ NOT NULL`: earliest UTC instant the normalized fact was durably usable by the feature-building system. It must satisfy `http_received_at_utc ≤ raw_persisted_at_utc ≤ available_at`; for deterministic derived features use `max(required_input.available_at, transform-completion availability)` and store later offline `materialized_at` separately. Snapshot use requires `available_at≤prediction_cutoff`; no backfilling from final-state timestamps.
- Legacy `received_timestamp_utc` is superseded by canonical `http_received_at_utc`; do not maintain two receipt clocks with identical semantics.
- Preserve provider-native `departure.scheduledTime` without renaming it to `scheduled_gate_out` or `scheduled_wheels_off`. FAA aliases are nullable and require Gate-0.5 semantic proof; otherwise `milestone_unverified=true`.

**Identity separation:** `raw_delivery.delivery_id`, `(delivery_id,item_index,raw_item_sha256)`, versioned semantic observation identity, and identity-v2 `flight_instance_id` are four different keys. The current migration/helper shapes do not fully prove this contract; production correction and collision/retry/non-location tests remain NOT IMPLEMENTED.
- `adb_collection_subs.airport_layer_design_probability DOUBLE NULL unit probability semantics conditional `p_i=score_i/Σscore | S_t` source `controller draw` availability `is_randomized=true → NOT NULL` else `NULL` per CHECK `migrations/0022` producer `drawWithoutReplacement` consumers `diagnostics` missing `NULL means planned_share` QC `CHECK`
- `adb_sampling_frame.m_i DOUBLE`: Phase-6 adaptive multiplier in `[0.25,1.5]`, initialized deterministically to **1.0 for every eligible REGIONAL airport at Phase-6 start**; probe data must not seed it. After each valid Phase-6 observation, update only via the frozen recurrence/state machine. A missing/NULL `m_i` in an eligible production draw is a **REFUSE/BLOCK** condition, not an implicit uniform fallback.

*Note retained:* `clean.flight_data_pre_post` kept for compat but **not** only true table — S-layers above first-class per Plan §2/§6, A30 item 72 / Log §6 wording fixed.


<a id="log-section-22"></a>
## 22. Data lineage (A30 §23) — transitional, incomplete

> Current rows record partial arrow contracts. Binding lineage must additionally record source/destination tables, exact function/job, filter, dedup rule, timestamp rule, version, and test. Missing columns/evidence mean `LINEAGE_COMPLETE=BLOCKED`; intended arrows are not implementation evidence.

| # | Arrow | Producer | Consumer | Join key | Source timestamp | available_at | Provenance | Failure behavior |
|---|---|---|---|---|---|---|---|---|
| 1 | Provider coverage → project coverage artifact | AeroDataBox FREE-TIER `/health/services/feeds/{service}/airports` and/or `/health/services/airports/{icao}/feeds`; optional repo `/api/v1/collection/coverage` is only a proven local aggregator | coverage measurement/build scripts | `airport_icao` | provider retrieval UTC | no later than durable local artifact time | provider/OpenAPI version + response hashes + local aggregator version/hash if used | REFUSE if provider inputs/version/hashes are unavailable |
| 2 | External reference → final frame | one permitted accessible source, not assumed OAG/Cirium | `build_stratified_catalog.ts` correction NOT IMPLEMENTED | `airport_icao` | `reference_retrieval_utc` | same | reference hash | BLOCKED if source/rule unfrozen |
| 3 | Final frame → materialized calendar/template | `build_stratified_catalog.ts` | `adb_collection_meta` | `frame_version` | `template_frozen_utc` | `template_frozen_utc` | `template_hash` | REFUSE if template unfrozen |
| 4 | Template → guarded pre-cutoff FIDS population refresh grids | `fidsCensus_v3.ts` (CODED, not production-wired) + required grid scheduler | FIDS raw-response/query provenance + append-only `flight_population` observations | `population_query_id` = airport + service interval + horizon + frozen grid instant/retrieval identity + direction/role | for each horizon, grid spans `service_window_start−H` through `service_window_end−H`; each request starts early by frozen guard; persist retrieval UTC | durable query/result `available_at`; select latest qualifying observation and record staleness | response hash + endpoint/OpenAPI/version + local bounds/timezone + guard/cadence/staleness versions | late response cannot support the affected cutoff; observation older than frozen max staleness makes that flight/horizon `population_unobserved`; never reconstruct/backfill from a future FIDS response |
| 5 | FIDS query results → canonical population membership observations → horizon as-of membership | `fidsCensus_v3.ts` + snapshot population selector | `flight_population` / snapshot provenance | `(population_query_id,analytic_identity_id,population_role)` where identity is confirmed `flight_instance_id` or explicit provisional ambiguous-code-share identity; then select latest qualifying `available_at≤prediction_cutoff_utc` | `fids_retrieval_utc` + frozen provider schedule identity | durable `available_at` | membership/query/response hashes + canonicalization version + `population_staleness_seconds` | no qualifying pre-cutoff observation → `population_unobserved` for that horizon; never future-backfill |
| 6 | Provider webhook → immutable raw delivery | HTTP route + intended `rawIngress_v3.ts` wiring | `clean.raw_delivery` | `delivery_id/notification_id` | `provider_notification_generated_utc` | `raw_persisted_at_utc` | raw body hash | raw DB failure returns non-2xx; currently NOT IMPLEMENTED in verified route |
| 7 | Raw delivery → immutable raw item + processing attempt | raw ingress/parser | `clean.raw_delivery_item` + `clean.processing_attempt` | `delivery_id + item_index` | nullable provider state/location clocks | durable raw time then semantic `available_at` | item hash + parser version | parser failure leaves durable raw recoverable |
| 8 | Raw item → semantic flight event | `flightNotificationExtractor_v3.ts` | `flight_events` | `flight_instance_id + event_phase` | `provider_state_updated_utc` | `available_at` | `event_hash` | Skip event, log error |
| 9 | Flight event → current state | `flightDataPrePostStore_v3.ts` | `flight_state` | `flight_instance_id` | `provider_state_updated_utc` | `available_at` | `state_hash` | Skip state update, log error |
| 10 | Raw item/event → airborne points | AeroDataBox webhook semantic processing | `raw_airborne_events` | `event_id` | nullable `location_reported_utc` | `raw_persisted_at_utc` then semantic `available_at` | `point_hash` | no location means no point; preserve non-location event separately |
| 11 | Airborne points → trajectory | `flightDataPrePostStore_v3.ts` | `flight_trajectory` | `flight_instance_id` | `trajectory_built_utc` | `trajectory_built_utc` | `trajectory_hash` | Mark `trajectory_incomplete` |
| 12 | Population + as-of history/weather → PRE snapshot | snapshot builder NOT IMPLEMENTED | `flight_snapshots` | `flight_instance_id + cutoff` | source effective times | `snapshot_built_utc` after all inputs | snapshot/input hashes | still create population-defined snapshot; mark feature missing |
| 13 | Trajectory + historical/weather joins → AIRBORNE snapshot | `snapshotBuilder` | `flight_airborne_snapshots` | `flight_instance_id + observation_time` | `snapshot_built_utc` | `snapshot_built_utc` | `snapshot_hash` | Mark `features_missing` |
| 14 | Snapshots → outcome acquisition | `terminalization` | `flight_outcomes` | `flight_instance_id` | `outcome_observed_utc` | `outcome_observed_utc` | `outcome_hash` | Mark `missing_outcome` |
| 15 | Outcomes → target labels | `labelBuilder` | `flight_snapshots` | `flight_instance_id + target` | `label_built_utc` | `label_built_utc` | `label_hash` | Mark `label_missing` |
| 16 | Labels → split assignment | `splitRule` | `flight_snapshots` | `flight_instance_id` | `split_assigned_utc` | `split_assigned_utc` | `split_rule_hash` | Exclude from train/test |
| 17 | Split assignment → model datasets | `datasetBuilder` | `Engines A/B/C/D/E/R/P/POST` | `split + fold` | `dataset_built_utc` | `dataset_built_utc` | `dataset_hash` | REFUSE if dataset incomplete |
| 18 | Model datasets → models | `XGBoost/GNN` | `model_artifacts` | `model_id` | `model_trained_utc` | `model_trained_utc` | `model_hash` | REFUSE if training fails |
| 19 | Models → evaluation | `evaluator` | `evaluation_results` | `model_id + test_fold` | `evaluated_utc` | `evaluated_utc` | `eval_hash` | REFUSE if evaluation fails |
| 20 | Evaluation → staleness/ablation/MV | `diagnostics` | `diagnostic_reports` | `report_id` | `diagnostic_built_utc` | `diagnostic_built_utc` | `report_hash` | Log warning, continue |

`provider FREE-TIER coverage → frozen traffic/region/eligibility references → final frame → pre-probe freeze → gates/probes → frozen batch-day calendar + account-specific FIDS population-retrieval schedule → append-only role-aware population observations → per-cutoff as-of membership (never future-backfilled) + webhook raw_delivery/raw_delivery_item/processing_attempt → semantic flight_events/current state/airborne → historical/weather as-of → PRE/AIRBORNE snapshots → target terminalization → split-rule hash BEFORE collection / protected actual row IDs AFTER materialization and before fitting → Engines A/B/C/D/E/R/P/POST → staleness/ablation → MV`

<a id="log-section-23"></a>
## 23. Environment / configuration registry (A30 §24 — inlined A31 §91)

> **Transitional registry only:** Rows currently captured use:
> `name, purpose, type, default, safe_default, required, secret, producer, consumer, phase, gate, failure_behavior`.

| # | Variable | Purpose | Type | Default | Safe default | Required? | Secret? | Producer | Consumer | Phase | Gate | Failure behavior |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `DATABASE_URL` | Postgres connection | string | — | — | YES | YES | Replit | All | ALL | ALL | REFUSE |
| 2 | `AERODATABOX_API_KEY` | Provider API key | string | — | — | YES | YES | Replit | FIDS/Webhook | ALL | ALL | REFUSE |
| 3 | `ADB_AUTO_COLLECT` | Safety/start switch | boolean | `false` | `false` | YES | NO | Explicit authorized transition | Controller | PREP/PHASE6 | FREEZE/start | **REFUSE true before `PHASE6_READY` + human authorization; may become true only for authorized Phase 6; force false on pause/stop/failure** |
| 4 | `ADB_BATCH_BUDGET` | Daily cap | integer | `1900` | `1900` | YES | NO | Config | Controller | ALL | Gate 4 | REFUSE if exceeded |
| 5 | `ADB_DAILY_SOFT_STOP_MARGIN` | SOFT_STOP margin | integer | `50` | `50` | YES | NO | Config | Controller | ALL | Gate 4 | Stop batch at 1850 |
| 6 | `ADB_RESERVE_CREDITS` | Protected Alert-credit budget floor | integer | `1000` | `1000` | YES | NO | Config | Controller | ALL | Gate 0 | REFUSE if authorized balance would cross floor |
| 7 | `ADB_MIN_BATCH_CREDITS` | Min batch size | integer | `300` | `300` | YES | NO | Config | Controller | ALL | Gate 4 | REFUSE if < 300 |
| 8 | `ADB_ANCHOR_ENABLED` | Anchor toggle | boolean | `true` | `true` | YES | NO | Config | Scheduler | Phase 2+ | Gate 2 | Disable anchor slot |
| 9 | `ADB_ANCHOR_POOL` | Final rotating anchor pool | string | `TBD_UNTIL_GATE2` | empty/TBD | YES | NO | Gate-2 artifact | Scheduler | Phase 6 | Gate 2/FREEZE | REFUSE unless final five + hash are frozen; provisional KLAX/EGLL/WSSS/SBGR/OMDB is not an executable default |
| 10 | `ADB_TIER_MIX` | Tier slots per batch | JSON | `{"HUB":1,"MID":2,"REGIONAL":1}` | — | YES | NO | Config | Scheduler | ALL | Gate 1 | REFUSE if invalid |
| 11 | `WINDOW_SHAPE` / segment schedule | Per-batch treatment shape | enum/JSON | calendar-defined (`4h`, `2x2h`, `up_to_6h`) | none | YES | NO | Frozen calendar | Scheduler | Phase 6 | FREEZE | REFUSE any shape/segments not in frozen calendar |
| 12 | `time_window_schedule_seed` | UTC permutation seed | string | random | — | YES | NO | Config | Scheduler | FREEZE | FREEZE | REFUSE if unfrozen |
| 13 | `anchor_pool_seed` | Anchor order seed | string | random | — | YES | NO | Config | Scheduler | FREEZE | FREEZE | REFUSE if unfrozen |
| 14 | `crossover_seed` | Crossover randomization seed | string | random | — | YES | NO | Config | Scheduler | FREEZE | FREEZE | REFUSE if unfrozen |
| 15 | `split_rule_seed` | Split assignment seed | string | random | — | YES | NO | Config | Splitter | FREEZE | FREEZE | REFUSE if unfrozen |
| 16 | `FIDS_RETRY_UNIT_BUDGET` | REST retry cap | integer | `TBD_FROM_EXACT_SEVEN_CATEGORY_BUDGET` | `0 until frozen` | YES | NO | Gate-0/budget artifact | FIDS fetcher | PREP/Phase6 | Gate 0/FREEZE | REFUSE retries unless exact category budget is frozen; historical `75` is non-binding |
| 17 | `FIDS_MAX_RANGE` | Max FIDS window | integer | TBD | — | YES | NO | Gate 0.5 | FIDS fetcher | FREEZE | Gate 0.5 | REFUSE if unfrozen |
| 18 | `CENSORING_GRACE_MINUTES` | Censoring grace | integer | TBD | — | YES | NO | Gate 0.5 | Terminalizer | FREEZE | Gate 0.5 | REFUSE if unfrozen |
| 19 | `WEATHER_SOURCE_VERSION` | Weather API version | string | TBD | — | YES | NO | Gate 0.5 | Weather joiner | FREEZE | Gate 0.5 | REFUSE if unfrozen |
| 20 | `SPLIT_RULE_VERSION` | Split rule version | string | TBD | — | YES | NO | FREEZE | Splitter | FREEZE | FREEZE | REFUSE if unfrozen |
| 21 | `SPLIT_RULE_HASH` | Split rule hash | string | TBD | — | YES | NO | FREEZE | Splitter | FREEZE | FREEZE | REFUSE if unfrozen |
| 22 | `PHASE6_START_DATE` | Run start date | date | TBD | — | YES | NO | FREEZE | Controller | FREEZE | FREEZE | REFUSE if unfrozen |

*Secrets only SET/UNSET. Never print secret values.*

**Registry completeness status:** the 22-row table above is transitional and incomplete. Before FREEZE it must also represent account plan and billing dates; monthly entitlement/opening balance/pre-run and Phase-6 ceilings; every FIDS/validation/outcome/history/diagnostic budget; provider contract URL/version/hash/rate/range; `query_direction`/`recovery_direction` and FIDS `population_role`; selected T and primary target plus milestone actuality-verification rule/version; traffic/tier/region references and hashes; scope/codeshare ambiguity policy; anchor yield-reference/probe cumulative cap-censoring protocol; `m_i` function/initial state and coverage floor; calendar hash/randomization unit/washout; canary vs production tolerances, balance-poll cadence, clock-skew tolerance and unsettled-burst margin; Gate-0.5 minimum evidence; raw-retention period/legal basis/compliance-deletion behavior; weather/history readiness; and split hash. Each needs type/default/safe-default/required/secret/producer/consumer/phase/gate/failure behavior. `CONFIG_REGISTRY_COMPLETE=BLOCKED` until no required setting is unmapped.

<a id="log-section-24"></a>
## 24. Runtime / dependency reproducibility (A30 §25)

Current inspected repository: darwin, branch `main`, HEAD `9fa04fea6c1b1de0a3182fa3b0ee439f72a0224a`; migration files through 0025. Node/TS/Postgres versions and dependency-lock hash must be captured by the next actual verification run rather than inherited from a stale snapshot.

<a id="log-section-25"></a>
## 25. Typecheck / lint / baseline-error policy (A30 §26)

Historical baseline reported 57 type errors; that is not a pass. The Sep1 correction requires actual typecheck, lint, build, unit, and integration commands with exit codes and failure attribution. This document-edit pass does not provide repository execution evidence. Those commands/fixes remain **NOT_VERIFIED / REQUIRED** and must be run by a repository-capable implementation pass; a legacy docs-only scope label is not a current exemption. Do not claim CODE GO.

<a id="log-section-26"></a>
## 26. Migration policy (A30 §27)

Files 0017-0025 exist. Last live application evidence is 0023. For 0024 and 0025 distinguish: `MIGRATION_FILE_CREATED=YES`; `MIGRATION_TESTED_OFFLINE=NO VERIFIED EVIDENCE`; `MIGRATION_APPLIED_LIVE=NO VERIFIED EVIDENCE`. Required fresh-DB, upgrade-from-0023, repeat-boot/idempotency, indexes/constraints, append-only behavior, and rollback/recovery tests remain **NOT_VERIFIED**. If a required test truly needs a database environment that is unavailable, record `BLOCKED_ENV` with the exact missing dependency; otherwise it is mandatory offline work.

<a id="log-section-27"></a>
## 27. Test matrix (A30 §28) — incomplete Phase-6-critical coverage

Prior focused evidence is 71/71 passing across four focused test files. It does not cover every required family. The matrix below and Sep1_2 require additional service-window/cutoff, snapshot existence, AIRBORNE denominator, provider milestone, T constructibility, terminalizer, cross-midnight, exact canary, budget, SEND-without-receive, scaled Gate 4, Gate-0.5 sample, probe cap, Stage-2 replacement, anchor timing, real `m_i` wiring, calendar/washout, Gate-5 outside-population, snapshot builders, protected test, negative MV, registry, migration, raw-ingress failure, and retention-gate tests. Current totals must therefore be reported as focused tests passed plus unresolved/blocked families, never “complete suite pass.”

| TEST ID | Requirement | Type | File | Command | Fixture/input | Expected | Observed | Status | Artifact |
|---|---|---|---|---|---|---|---|---|---|
| TEST-001 | webhook 1cr/item SEND | unit | `flightNotificationExtractor_v3.ts:242` `extractFlightNotification` | `npx tsx scripts/test-extractor-real-payload.ts` | real webhook JSON 1 item `flight_number=SQ305` | `C_external==C_internal` items==credits | **rl9: C_external=1, C_internal=0, delivery_failures=1 → FAIL** (is_randomized bug, now fixed); re-run PENDING | FAIL (historical) | `rl9.md` decoded §0.3.2 |
| TEST-002 | is_randomized wiring | unit | `flightNotificationExtractor_v3.ts:372` `isRandomized ?? false` | same | probe/canary no batch `null` → `false` | `false` not NULL, no delivery_failure | before fix `delivery_failure=1` FAIL | FIXED f.8 2026-08-30 `MUSE_A30_ASSESSMENT.md` | code diff |
| TEST-003 | FIDS DST spring-forward gap | unit | `fidsCensus_v3.ts:utcIntervalToLocal` IANA `Intl.DateTimeFormat` | `npm run test:fids-tz` | 2026-03-08 America/Los_Angeles DST gap 02:00→03:00 | `fromLocal 01:59→03:00` gap, no 02:xx | STUB TODO | BLOCKED | `tests/fidsTimezone.test.ts` pending |
| TEST-004 | FIDS DST fall-back repeat hour | unit | same | same | 2026-11-01 America/Los_Angeles repeat 01:00 hour | `01:30` occurs twice distinct `fromLocal` | STUB TODO | BLOCKED | same |
| TEST-005 | flight_instance dedup codeshare | unit | `flightInstanceCanonical_v3.ts:dedupCodeshares` | `dedupCodeshares` | UA123 operating + marketing AA456 same leg FIDS Both | 1 instance `marketing=[AA456]` not 2 flights | STUB TODO | BLOCKED | `flightInstance.test.ts` pending |
| TEST-006 | `available_at≤cutoff` leakage | unit | `flight_events` `historicalFeatureStore_v3.ts:1` `getHistoricalFeatureAsOf` | constructible-at-cutoff test | future feature `available_at=14:07` cutoff 14:05 `reportedAtUtc=14:00` | must error `available_at>cutoff` forbidden | pending Gate0.5 | BLOCKED | `snapshot_builder.test.ts` |
| TEST-007 | sampling `p=score/Σscore` with Σp=1 | unit | `adbCollectionController_v3.ts:516` `drawWithoutReplacement` | deterministic seed 42 | 4 REGIONAL eligible `traffic_prior=1 m=1` | Σp=1.0 exact, `p_i=score_i/Σscore` | uniform `1 / n_eligible` PASS only for this equal-score initialization fixture; adaptive unequal-score fixture still required | PARTIAL — initialization fixture only | `draw.test.ts` |
| TEST-008 | deterministic seeding replay | unit | same | same seed twice | same `E_t` `m_t` `score_i` | same `p_i` order replayable | same PASS | PASS | same |
| TEST-009 | coverage floor persistence | integration | controller + adaptive helper + `m_i=0.25` + 20d/never-observed eligibility | seeded replay across unsuccessful draws then one valid observation | require `traffic_prior>0`, `p>0`; floor eligibility/boost persists until valid observation, then clears/resets age; boost ≤1.5× | deterministic state/probability assertions | NOT RUN | BLOCKED | `coverageFloor.test.ts` pending |
| TEST-010 | SOFT_STOP 1850 stops batch | integration | `adbCollectionController_v3.ts:1404` watchdog 60s tick `SOFT_STOP=1900-50=1850` | `npm run canary` burst worst 50 measured | `creditsToday→1850` stops active batch `stop_reason=budget_reached` | stopped at 1850 | not yet live | BLOCKED | canary |
| TEST-011 | HARD_CAP 1900 MISMATCH | integration | same `HARD_CAP=1900` | same overshoot to 1901 | `reconciliation_status=MISMATCH` | flagged | not yet | BLOCKED | same |
| TEST-012 | delivery-failure PAUSE flag | integration | same `flagBatchRows` `sampling_reason='delivery_failure'` | injected `delivery_failure` | `PAUSE` + flag rows `reconcile before resume` | flagged never silently resume | not yet | BLOCKED | `flagBatchRows.test.ts` |
| TEST-013 | split integrity POST same flight no leak | unit | evaluation `group_by flight_instance_id` `Log §13.2` | 3 points same `flight_instance_id` t1,t2,t3 | all 3 same partition (no train/test split within flight) | primary PASS | pending | BLOCKED | `evaluation.test.ts` |
| TEST-014 | no same-flight POST train/test leak | integration | same + block bootstrap `calendar_day` | same flight 3 points t1→train t2→test attempt | must refuse `group_by` violation | must error | pending | BLOCKED | same |
| TEST-015 | final-test protection read-once | integration | evaluation split rule `split_rule_hash` BEFORE / `test_row_hash` AFTER `Log §13.2` | tune on validation then test `test_row_hash` read-once | second read of final test forbidden, no tuning on test | must refuse | pending | BLOCKED | `splitRule.test.ts` |
| TEST-016 | migration 0024/0025 fresh-install + upgrade-from-0023 + repeat-boot/idempotency | schema/integration | `migrations/0024_historical_feature_store.sql`; `migrations/0025_raw_ingress_immutable_layers.sql` | repository migration integration harness / actual boot command | fresh DB; DB at 0023; repeated boot; required indexes/constraints; append-only mutation attempts | both migrations apply exactly once, repeat boot succeeds, schema/constraints match dictionary, forbidden raw mutation fails | NOT RUN in this document pass | NOT_VERIFIED / REQUIRED OFFLINE | migration integration artifact |

| TEST-017 | FIDS acquisition-guard cutoff crossing / no backfill | integration | FIDS scheduler + population selector | repository test harness | request starts within the frozen guard but durable response `available_at` lands after the earliest supported cutoff | affected horizon is `population_unobserved`; later FIDS responses never backfill earlier membership | NOT RUN | NOT_VERIFIED / REQUIRED OFFLINE | `fidsPopulationCutoff.test.ts` pending |
| TEST-018 | FIDS provider-boundary canonicalization | integration | FIDS canonicalizer | repository test harness | adjacent query windows containing exact-boundary and duplicate records | provider behavior is normalized to internal `[start,end)`; overlap is deduplicated without omission or double membership | NOT RUN | NOT_VERIFIED / REQUIRED OFFLINE | `fidsBoundary.test.ts` pending |
| TEST-019 | timestamp applicability by record class | schema/unit | raw ingress + FIDS population ingress | repository test harness | one webhook fixture and one FIDS-only fixture | webhook envelope/delivery clocks required only for webhook records; FIDS row requires `fids_retrieval_utc`; webhook-only clocks may be NULL/N/A on FIDS; `available_at` is explicit for as-of facts | NOT RUN | NOT_VERIFIED / REQUIRED OFFLINE | `timestampApplicability.test.ts` pending |
| TEST-020 | ambiguous code-share identity does not become confirmed physical leg | unit/integration | identity-v2 canonicalizer | repository test harness | FIDS/code-share records with unresolved operating linkage | deterministic provider record/provisional analytic identity retained; `identity_resolution_status=ambiguous_codeshare`; no silent merge/drop and no increment of confirmed-operating-leg count | NOT RUN | NOT_VERIFIED / REQUIRED OFFLINE | `codeshareIdentity.test.ts` pending |
| TEST-021 | coalesced outcome recovery + category cap | integration | outcome terminalizer + REST limiter | repository test harness | multiple pending flights sharing a compatible due-time airport/query bucket; then exhausted outcome category cap | one physical FIDS call may resolve multiple logical flight attempts and is billed once; per-flight attempt schedule remains max 3; cap exhaustion defers/refuses without cross-category borrowing | NOT RUN | NOT_VERIFIED / REQUIRED OFFLINE | `outcomeRecoveryBudget.test.ts` pending |
| TEST-022 | crossover exact-pair composition, randomized order, washout and split containment | solver/integration | calendar solver | repository solver harness | satisfiable 31-day fixture plus deliberately conflicting fixture | exactly 5 pairs: 3×(4h vs 2×2h), 2×(4h vs up-to-6h); same airport set within pair; order randomized from frozen pair; ≥24h end→start; both periods same evaluation partition; conflicting fixture returns `UNSAT` | NOT RUN | NOT_VERIFIED / REQUIRED OFFLINE | `calendarCrossover.test.ts` pending |
| TEST-023 | Month-1 protected output remains pilot-only | unit/integration | evaluator/report generator | repository test harness | positive, neutral and negative protected-test fixtures | emits preregistered comparison + `pilot_signal`; report refuses confirmatory/deployment/seasonal-validity wording for Month 1 | NOT RUN | NOT_VERIFIED / REQUIRED OFFLINE | `pilotReportGuard.test.ts` pending |
| TEST-024 | 60,000-unit per-cycle accounting identity and rollover freeze | unit/integration | Gate-0 budget report + limiter config | repository test harness | `cycle_entitlement_units=60000`, prior cycle usage, Alert refill allocation, seven REST categories, unallocated remainder and a cycle rollover | exact per-cycle identity reconciles; 60,000 remains entitlement while remaining quota is sourced; rollover cannot expand the already-frozen Phase-6 Alert ceiling without re-FREEZE | NOT RUN | NOT_VERIFIED / REQUIRED OFFLINE | `gate0CycleAccounting.test.ts` pending |
| TEST-025 | `withLeg=true` movement roles do not double-count population | unit/integration | FIDS response canonicalizer | repository test harness | requested-airport primary movement plus opposite movement returned by `withLeg=true` | requested movement gets `requested_airport_primary`; opposite movement gets `opposite_movement_context`; context movement is not a second population member unless separately queried as primary | NOT RUN | NOT_VERIFIED / REQUIRED OFFLINE | `withLegPopulationRole.test.ts` pending |
| TEST-026 | Location clock independent of `lastUpdatedUtc` | unit | timestamp normalizer/QC | repository test harness | valid record with `location_reported_utc > provider_state_updated_utc` | accepted; no invalid ordering invariant between Location report time and flight-state `lastUpdatedUtc` | NOT RUN | NOT_VERIFIED / REQUIRED OFFLINE | `locationClockIndependence.test.ts` pending |
| TEST-027 | movement actual-vs-estimated semantic guard | unit/integration | milestone mapper + Gate-0.5 contract verifier | repository test harness | `revisedTime`/`runwayTime` fixtures separately marked/verified estimated vs actual | only contract-verified **actual** movement can create an `actual_*` FAA semantic alias; estimated/ambiguous values remain non-actual and cannot establish target/censoring milestones | NOT RUN | NOT_VERIFIED / REQUIRED OFFLINE | `movementActuality.test.ts` pending |

| TEST-028 | population refresh grid bounds staleness and catches later schedule appearance | integration | FIDS grid scheduler + population selector | repository test harness | 4h service interval where a flight is absent at earliest T−24 poll, appears at a later pre-cutoff poll, plus another flight whose latest poll is older than the frozen staleness ceiling | later-appearing flight is included from the latest qualifying pre-cutoff observation; stale-only flight/horizon becomes `population_unobserved`; grid is deterministic/pre-frozen and all calls are budget-materialized | NOT RUN | NOT_VERIFIED / REQUIRED OFFLINE | `populationRefreshGrid.test.ts` pending |

<a id="log-section-28"></a>
## 28. Command index (A30 §29) — full (16 commands, A30 §29 list)

| Command | Workdir | Script/file | Prereq | Env | Live provider? | Can spend credits? | Can spend REST units? | DB side effects | Files produced | Expected output | PASS | FAIL | Recovery | Log § |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `npm run health` | repo root | `scripts/check_collection_health.ts:19` | `DATABASE_URL` set | `DATABASE_URL` plus provider credentials only if live balance is intentionally queried | maybe; command behavior must be verified | no paid collection | no paid REST acquisition beyond explicitly authorized read | none | none | current balance/status values with timestamps and source; no hard-coded 2900 expectation | exit 0 and all required invariants satisfied | env/provider/status failure | fix prerequisite; never reinterpret stale balance as PASS | §8 |
| `npm run gate0` | same | `scripts/gate0_budget_report.ts` | offline budget logic/tests complete + explicit authorization for live account reads | `AERODATABOX_API_KEY` `DATABASE_URL` | yes (balance/quota/account evidence) | no Alert spend expected | only authorized read/API-unit behavior | none except evidence/metadata write if designed | Gate-0 budget artifact | exact opening Alert balance, refill/billing evidence, protected floor, pre-run ceiling, ending margin, `MAX_DESIGN_CEILING=57,900`, and computed `phase6_alert_spend_ceiling≤57,900`; separate seven-category REST ledger | identities reconcile and all required values are sourced/frozen or explicitly blocked | any identity/cap/source mismatch | fix account/config evidence; keep Phase6 NO-GO | §8 |
| `npm run coverage` | same | `scripts/measure_coverage.ts:15` `computeAirportCoverage` | authorized provider read + pinned contract | `AERODATABOX_API_KEY` | yes | no Alert spend | record actual REST/API-unit cost, if any; do not assume zero from old runs | none | coverage evidence/hash | current measured provider universe/feed flags with retrieval time and hash; historical 4,332 is not a required current count | successful complete response + reproducible hash/metadata | auth/provider/truncation/schema failure | resolve provider evidence; do not freeze stale count | §8 |
| `npm run build-catalog` | same | `scripts/build_stratified_catalog.ts:270` `persistFrameToDb` | current coverage evidence + frozen traffic reference + frozen country→region mapping | `DATABASE_URL` plus local reference inputs | no provider call expected | no | no | rebuild/version `clean.adb_sampling_frame` | frame/hash artifact | current frame counts by tier×region plus explicit `UNCLASSIFIED`/`UNMAPPED`, PRE/POST eligibility, reference versions/hashes; historical 4,320/18-of-18 is not a PASS target | every primary sampled row has verified tier/region/eligibility and frame hash; missing-reference rows remain explicit/excluded as specified | unresolved reference/mapping/integrity failure | repair reference inputs then rebuild | §8 |
| `npm run canary` | same | current script must be corrected to tolerance 0 before official use | exclusive set `maxRetries0` | `AERODATABOX_API_KEY` `DATABASE_URL` | yes POST item SEND | **yes** | no | accounting ledger | `rlN.md` | exact equality, failures 0, stable balance, >0 items | BLOCKED_LIVE_EVIDENCE after offline correction | prior delivery failure | human authorization + cleanup | §8 |
| `npm run anchor-probe -- --stage 1 --icao WSSS` | same | corrected probe implementation | Gate3 PASS + pre-probe freeze record + no foreign billable subscriptions + explicit paid authorization | `AERODATABOX_API_KEY` `DATABASE_URL` | yes | **yes; bounded by frozen probe/day cap and cap-censoring protocol** | only explicitly budgeted REST calls, recorded separately | append probe attempt/result | probe evidence | target exposure window with actual exposure, censor flag, credits, yields, stability components, failure/accounting fields | exact protocol satisfied and evidence complete; cap-censored result not misread as full-window yield | exclusivity/accounting/provider/protocol failure | cleanup, reconcile, classify attempt; no silent retry | §8 |
| `npm run anchor-probe -- --stage 2` | same | corrected probe/scoring implementation | Stage1 protocol complete + deterministic shortlist/replacement list + required pre-probe frozen references | same | yes | **yes; bounded by frozen probe/day cap and cap-censoring protocol** | only explicitly budgeted REST calls, recorded separately | append Stage2 attempts/results | probe/scoring evidence | confirmation metrics for each attempted candidate with actual exposure/censoring and deterministic replacement trace | final five all satisfy required confirmation/capacity rule; failures/replacements fully recorded | insufficient/failed candidates, cap/accounting/protocol failure | apply frozen replacement rule or remain BLOCKED | §8 |
| `npm run anchor-probe -- --status` | same | `scripts/anchor_probe.ts:497` `runStatus` | any probe completed | `DATABASE_URL` | no | no | no | none (read-only) | none | table per ICAO `status` `rows/h` `uf` `chain` `stability` `capacity_pass` | ≥1 baseline `completed` | `no probes` | `build-catalog` | §8 |
| `npm run anchor-probe -- --score` | same | same `computeScores` `W_EXO 0.4` vs WSSS | ≥WSSS or OMAA baseline | same | no | no | no | none | none | ranked `anchor_score 0.4T+0.2G+0.2C+0.2Y` + proposed 5-pool | scores 0-1 capacity gate applied | `No yield-reference` | `stage1 --icao WSSS` | §8 |
| `npm run anchor-probe -- --cleanup` | same | `scripts/anchor_probe.ts:497` `runCleanup` | any | `DATABASE_URL` | yes list subs | no | no | orphan delete `status=abandoned` | none | `probe-owned orphan subs deleted: 0 of 0` (or 1 of 1) | no ACTIVE orphans | `sub still ACTIVE` foreign | re-run `--cleanup --force` | §8 |
| `npm run anchor-probe -- --check-webhook` | same | `scripts/anchor_probe.ts:548` `runCheckWebhook` | boot | `WEBHOOK_BASE_URL`/`REPLIT_DOMAINS` | yes GET `200` | no | no | none | none | `HTTP 200 — OK` URL `.../api/v1/webhooks/aerodatabox` | `200` (any 2xx) | network error `EAI_AGAIN` | fix `WEBHOOK_BASE_URL` | §8 |
| `ADB_AUTO_COLLECT=0 npm run dev` | same | `server/index.ts` `applyBootMigrations` | `DATABASE_URL` | `DATABASE_URL` `AERODATABOX_API_KEY` | yes migrations 0017-23 | no | no | migrations `applied 0023` watchdog | none | `[migrations] applied 0023_anchor_probe_results.sql` `watchdog started (autoCollect=false)` `express 5000` | boot log `false` | migration fail `column already exists` (rl6) | fix 0022 guarded rename | §8 |
| `npx tsc --noEmit` | same | `tsc` | repository dependencies installed | repository toolchain | no | no | no | none | typecheck log | exit code 0, no type errors | exit 0 | any nonzero exit/type error; historical 57-error snapshot is not grandfathered | fix types or record explicit blocker; Phase6 remains NO-GO | §8 §25 |
| `npm run export` | same | `scripts/export/*` | production-wired snapshot builders have already materialized/rerun rows; protected split rules enforced | `DATABASE_URL` | no | no | no | read/export only; must not mutate protected test assignments | `exports/` | exported rows plus provenance/split hashes | export succeeds and row/hash checks pass | no data/hash/protection failure | fix upstream snapshot materialization or export logic; do not implement snapshot builder here | §8 |
| `npm run manifest` | same | manifest writer / canonical registry consumer | Gates 0,1,2,3,0.5,4,5 PASS; calendar VALID; pre-probe freeze values embedded unchanged; all required V3.9-f.8 fields resolved; retention rights verified | `DATABASE_URL` plus frozen artifact paths | no | no | no | write/freeze `adb_collection_meta` manifest atomically | `manifest.json` + hash | `binding_plan_version=V3.9-f.8`, complete registry/reference/calendar/split-rule/budget/gate hashes, no unresolved required value | complete + hash-stable + refusal test passes on missing binding value | any missing/unmapped/unfrozen field | remain DRAFT/NO-GO; fix source artifact then regenerate | §8 |

<a id="log-section-29"></a>
## 29. Historical run-report format (A30 §30) — SUPERSEDED BY EXTERNAL EVIDENCE FILE

Each `RUN-YYYYMMDD-###` records: RUN ID, date, UTC start/end, runtime, Git SHA, DB schema 0023, command, args, env flags (no secrets), balance_before, API units before, active subs before, expected, raw artifact `rlN.md`, exit code, provider response count, DB rows, credits spent, API units, balance_after, reconciliation, errors, PASS/FAIL, next action.

<a id="log-section-30"></a>
## 30. Historical Phase-6 daily-record template — SUPERSEDED BY EXTERNAL EVIDENCE FILE

Per day: run day, calendar date, UTC slot, window shape, requested/actual duration, stop_reason, crossover_group, treatment, template_hash, airport set (tier/ICAO), anchor, selection probability `p_i`, coverage ages, seed, FIDS population calls, population counts, PRE snapshot counts T-24/6/90, webhook notifications, notification items, unique physical flights (`flight_instance_id` deduped), AIRBORNE observations, trajectory counts, label counts, missingness funnel, credits, REST units, balance reconciliation, environmental context, cadence stats median/P95/max, failures, artifacts/hashes. Never silently edit previous day.

<a id="log-section-31"></a>
## 31. Decision record (A30 §32)

**DEC-001 — No V3.10:** selected patch f.7+f.8; rejected V3.10 (violates absolute versioning).

### 31.1 Dependency-aware implementation priority queue (derived from binding Plan; not proof of code status)

Severity and dependency are both considered. A lower-numbered item may block many later items even when another item is equally P0.

**P0 — resolve/code/test before any paid collection:**
1. retention-rights gate + configurable compliant raw lifecycle; normalized raw ingress before 2xx;
2. FIDS population query roles/timezone/range/scope/codeshare provenance, **record-class timestamp applicability, internal half-open boundary filtering, and frozen `population_acquisition_guard_minutes` + `population_refresh_cadence_minutes` + `population_max_staleness_minutes`**;
3. stable flight-instance/retime/codeshare identities;
4. canonical clocks + `available_at`/`materialized_at` semantics;
5. provider milestone/T/actual-vs-estimated constructibility guards;
6. historical/weather as-known-at-cutoff stores and leakage tests;
7. PRE and AIRBORNE snapshot builders with population-defined row existence;
8. target-specific terminalizer/outcome-recovery state machine with generated/coalesced `OUTCOME_REST_UNIT_BUDGET`;
9. SEND-aware Alert accounting, exact canary, hard-cap/soft-stop safety;
10. 31-day SAT calendar with exact five crossover pairs/split containment + separate Alert-credit/REST-unit budget proof.

**P1 — resolve before final frame/FREEZE/Phase 6:** traffic/region reference classification and final frame; anchor probe/reference exactness; production `m_i`/zero-yield integration; split/test protection and Engine-E deferral; complete registry/requirement matrix/schema dictionary/lineage/contradiction scanner; migration/typecheck/integration closure.

**P2 — complete before publication/strong inference:** diagnostic/report reproducibility, staleness/ablation/MV presentation, analysis metadata completeness, archive cleanup where it cannot affect executable authority.

**P3 — cosmetic/history:** wording or organization that cannot change denominator, billing, leakage, sampling, labels, identity, or executable code behavior.

A live/provider/human blocker is tracked separately from priority; it must not be relabeled as an offline implementation PASS.

<a id="log-section-32"></a>
## 32. Issue record (A30 §33)

| ID | Discovered | Description | B/C/D | Status |
|---|---|---|---|---|
| ISS-001 | 2026-08-19 rl9 canary | `is_randomized` NULL → FAIL | B | CLOSED FIXED 2026-08-30 f.8 |
| ISS-002 | 2026-08-30 audit | legacy production gaps identified: standalone/not-wired FIDS path, noncompliant blanket REGIONAL frame/ICAO heuristic, adaptive `m_i` not integrated, incomplete decision-time clocks, weather/history production joins absent | B/C | OPEN — document rules corrected; corresponding offline code/wiring/tests remain REQUIRED / NOT VERIFIED |
| ISS-003 | 2026-09-01 correction | Standalone FIDS/raw ingress/adaptive/history/calendar/gate modules are not proven wired into production | B | OPEN — PRODUCTION_WIRING_NOT_VERIFIED; mandatory offline repo work |
| ISS-004 | 2026-09-01 correction | AeroDataBox Plan Terms do not yet prove permanent raw retention rights | B | OPEN BLOCKED_LIVE_EVIDENCE / HUMAN-LEGAL |
| ISS-005 | 2026-09-01 correction | Migration files 0024/0025 exist but offline integration and live application are unverified | B | OPEN — OFFLINE_TEST_NOT_VERIFIED; live application separately NOT_VERIFIED |
| ISS-006 | 2026-09-01 correction | Requirement matrix, reverse map, column dictionary, lineage, canonical-registry completeness, and contradiction scanner are incomplete | B | OPEN — REQUIRED OFFLINE CLOSURE WORK |
| ISS-007 | 2026-09-01 correction | Materialized 31-day calendar and exact seven-category REST budget report do not exist | B | OPEN — solver/budget artifacts REQUIRED; account-specific inputs may be LIVE_CONFIG blockers |
| ISS-008 | 2026-09-01 deep doc closure | P0/P1 document contradictions: AIRBORNE decision cutoff, FIDS movement roles, clock semantics, actual-vs-estimated labels, retime identity, codeshare ambiguity, retention deletion/classification, crossover ledger/washout, probe censoring, history/weather availability, Engine-E deferral | B/C | **DOC CLOSED in corrected Plan/Log; CODE/LIVE consequences remain OPEN** |
| ISS-009 | 2026-09-01 adversarial closure | Structural/authority defects: §22 accidentally normative, interrupted Markdown tables, Gate order/sufficiency ambiguity, and a legacy docs-only scope label incorrectly treated as a current implementation exemption | B/C | **DOC CLOSED; code consequences tracked separately** |
| ISS-010 | 2026-09-01 adversarial closure | SEND-side hard/run-cap overclaim, `ADB_AUTO_COLLECT` inverted failure rule, 30-day weather retrieval depth conflated with retention, generic database retention classification | B/C | **DOC CLOSED; live/account/legal evidence remains OPEN where applicable** |
| ISS-011 | 2026-09-01 adversarial closure | Target-specific terminalization/label acquisition, legacy dedup-key wording, Phase-6 adaptive probe seeding ambiguity, rolling-origin freeze timing/statistical claim wording | B/C | **DOC CLOSED; repository implementation/evaluation evidence remains OPEN** |
| ISS-012 | 2026-09-01 final closure | FIDS request-start-at-cutoff timing bug; population acquisition guard + actual `available_at` rule; webhook-vs-FIDS timestamp applicability | B/C | **DOC CLOSED; scheduler/schema/tests remain OPEN** |
| ISS-013 | 2026-09-01 final closure | Fixed 20-unit outcome-recovery shortcut, ambiguous codeshare identity, boundary semantics, coverage-floor clearing, chain denominators | B/C | **DOC CLOSED; implementation/evidence remains OPEN** |
| ISS-014 | 2026-09-01 final closure | Crossover pair identity/composition/order/split containment and Month-1 deployment-claim overstatement | B/C | **DOC CLOSED; solver/evaluation implementation remains OPEN** |

<a id="log-section-33"></a>
## 33. Gate record (A30 §34)

Historical gate notes exist, but a complete current 16-field Gate-0-through-FREEZE evidence set does not. All current gates remain BLOCKED or failed as listed below. The rl9 canary remains a historical FAIL; any future PASS requires a new RUN/GATE record and cannot rewrite it.

<a id="log-section-34"></a>
## 34. Workstreams A-I status (A30 §36)

See Log §0.7 table (A/B/C/D/E/F/G/H/I DONE/DOCUMENTED/BLOCKED).

<a id="log-section-35"></a>
## 35. GO/NO-GO determination for Phase 6 (A30 §36 + §9)

- **Unresolved blocking count:** `UNKNOWN_GT_ZERO`. The historical 57+2 count is not reused because the current every-requirement matrix is incomplete. Phase 6 requires an exact regenerated count of 0.
- **Required C frozen:** ~15 items — DOCUMENTED f.7+f.8 but `FROZEN` only after Gate 0.5 measure→freeze.
- **Registry/manifest/repository scanner:** registry and manifest remain incomplete/not written and repository mapped/unmapped totals remain UNKNOWN. The **document-handoff active-scope scanner is PASS with 0 known current-current P0/P1 contradictions**; that does not substitute for the repository requirement matrix/scanner.
- **Gates:** Gate 0 BLOCKED_LIVE_EVIDENCE; Gate 1 provisional/not frozen; Gate 2 BLOCKED; Gate 3 prior FAIL and current exact-tolerance correction not implemented/live-verified; Gate 0.5 BLOCKED; Gate 4 offline and live portions BLOCKED; Gate 5 BLOCKED; FREEZE BLOCKED.
- **Code/docs/schema consistency:** DOCUMENT RULES NORMALIZED, but repository closure remains NOT ESTABLISHED. Production wiring, snapshots, terminalizer, weather/history, comprehensive tests, migration validation, registry completeness, and retention/live evidence remain unresolved.

**Current closure counters for this corrected document pair (document truth; repository/live truth remains unresolved):**

```text
DOC_P0_OPEN_KNOWN = 0
DOC_P1_OPEN_KNOWN = 0
DOC_P2_OPEN_KNOWN = 0
CURRENT_CURRENT_CONTRADICTIONS = 0

OFFLINE_CODE_REQUIREMENTS_NOT_IMPLEMENTED = UNKNOWN_GT_ZERO
OFFLINE_TEST_REQUIREMENTS_NOT_PASSING = UNKNOWN_GT_ZERO
PRODUCTION_PATH_MODULES_NOT_WIRED = UNKNOWN_GT_ZERO
CANONICAL_REGISTRY_UNMAPPED_BINDING_RULES = UNKNOWN_GT_ZERO
REQUIREMENT_MATRIX_UNMAPPED = UNKNOWN_GT_ZERO
UNVERIFIED_PROVIDER_ASSUMPTIONS_AFFECTING_PHASE6 = GT_ZERO
UNFROZEN_REQUIRED_PRE_RUN_VALUES = GT_ZERO

TYPECHECK = NOT_VERIFIED
LINT = NOT_VERIFIED
BUILD = NOT_VERIFIED
MIGRATION_0024_OFFLINE = NOT_VERIFIED
MIGRATION_0025_OFFLINE = NOT_VERIFIED

FRAME = PROVISIONAL
CALENDAR = NOT_MATERIALIZED
RETENTION_RIGHTS = BLOCKED
MANIFEST = NOT_WRITTEN

Gate0 = BLOCKED_LIVE_EVIDENCE
Gate1 = PROVISIONAL_NOT_FROZEN
Gate2 = BLOCKED
Gate3 = PRIOR_FAIL_CURRENT_RERUN_REQUIRED
Gate0.5 = BLOCKED
Gate4 = BLOCKED
Gate5 = BLOCKED
FREEZE = BLOCKED

ADB_AUTO_COLLECT = false
PHASE6_TECHNICAL_READINESS = NO-GO
```

`UNKNOWN_GT_ZERO`, `GT_ZERO`, `NOT_VERIFIED`, and the gate statuses above are deliberate truth-preserving states, not permission to guess a count. A repository-capable implementation pass must regenerate the complete requirement matrix and replace them with exact evidence-backed counts/statuses. It may not infer zero from document prose.

**Determination: ARCHITECTURE LOCKED / ACTIVE DOCUMENT P0-P1 NORMALIZATION CLOSED / OFFLINE CODE+TEST READINESS NOT ESTABLISHED / PRODUCTION WIRING NOT CLOSED / GATES NOT GO / RETENTION RIGHTS BLOCKED / Phase 6 NO-GO.**

---

<a id="log-section-36"></a>
## 36. Archive (outdated and historical) — SUPERSEDED, kept for honesty

> Everything below is **NON-NORMATIVE HISTORY** — kept for honesty, not for current use. A coding agent/scanner must never treat §36 as executable authority. The
> current state is at the TOP of this file (§0). These entries are archived
> because the design moved on (mostly the "276 as the frame" era, which the plan
> §6 superseded with the measured universe).

<a id="log-section-36-1"></a>
### 36.1 Outdated: the "three lists" (276 / 267 / 4,332) framed as the sampling design

This is the pre-step-11 framing. It is archived because it is **only partially
right**: the arithmetic (276 = 30+89+157, 267 = 30+87+150, 9 missing, 4,065 =
4,332−267) is correct as *measurements*, but presenting `catalogInUniverse 267` as
"the frame" was wrong. Per PART 1 §4, the frame = `universe ∩ feed-eligible` (the
whole measured universe, zero-yield kept), which is what step 11 actually built
(4,320 airports). The 276 remains the curated reference (`tier_source='curated'`).

The measured numbers, for the record:
`universeCount 4332`, `catalogCount (ours) 276`, `catalogInUniverse 267`
(30 HUB + 87 MID + 150 REGIONAL), `catalogMissingFromUniverse 9` (2 MID + 7
REGIONAL), `universeNotInCatalog 4065`. Gate-1 sanity: `universe ≥ catalog` →
4332 ≥ 276 passes.

<a id="log-section-36-2"></a>
### 36.2 Outdated: Step A / Step B of the old "steps" section

The old §1 framed everything as numbered Steps A–D with Step A "housekeeping"
(done) and Step B "the stratified catalog build" that still described the 276 as
the frame. That framing was retired in favor of the phases-with-steps layout in §3.
Step A is done; Step B became step 11 (see §3 Phase 2). The two honest options the
old text presented (Option 1 = rebuild from measured universe, Option 2 = keep 276
as a restricted panel) were decided: **Option 1** was chosen on 2026-08-17.

<a id="log-section-36-3"></a>
### 36.3 Run report #4 (from `rl4.md`, 2026-08-17) — it all worked

You pulled, booted, and verified: migrations 0017–0020 applied; watchdog safe
(`budget=1900 ... autoCollect=false`); `npm run health` PASS with live balance
2,901; `npm run gate0` clean (floor intact, invariant holding); heartbeats showed
`canStart=false → canStart=true` after the refill. `npm run coverage` was also run
here (step 10) — the numbers are in §36.1. One note: a 02:07 boot had
`autoCollect=true` again (Run button issue) but did no damage because balance was
below the floor.

<a id="log-section-36-4"></a>
### 36.4 Run report #3 (from `replitLogs3.md`, 2026-08-16) — refill worked

This closed Gate 0's refill + conversion checks: `npm run refill` (read-only) → 862;
`npm run refill -- 1` → 863 (**1 unit = 1 credit confirmed**); `npm run refill --
2038` → **2,901**. Also fixed a stale-read bug: `health`/`gate0` now call
`getBalance()` live and print `(live-api)` instead of reading the last webhook row.

<a id="log-section-36-5"></a>
### 36.5 Run report #2 (from `replitLogs2.md`, 2026-08-16) — 0020 fixed

Migration 0020 applied on the fresh boot (the `loc_reported_utc` fix is confirmed;
all 4 airborne tables exist). Old `0020 failed` lines in the log are from earlier
boots (append-only log). `refillToFullBudget` changed 3138 → 2038 (budget 3000 →
1900). A 20:06 boot ran `autoCollect=true` (Run button issue); nothing spent.

<a id="log-section-36-6"></a>
### 36.6 Run report #1 (from `replitLogs1.md`, 2026-08-16) — 0020 bug found + fixed

Server booted; migrations 0018/0019 applied; Phase-0 config live
(`budget=1900 ... autoCollect=false`). Bug found: migration 0020 failed with
`column "loc_reported_utc" does not exist` — the index referenced a missing column
and the single transaction rolled all 4 airborne tables back. Fix: added
`loc_reported_utc TIMESTAMPTZ` to `raw_airborne_events` + updated the store's
insert (32→33 params).

<a id="log-section-36-7"></a>
### 36.7 AUDIT SNAPSHOT (what existed before Phase 0 — for the record)

| Item | Plan delta | Code state at audit | Verified |
| --- | --- | --- | --- |
| Credit accounting (ledger + balance delta) | §11, migration 0017 | exists | `git log` |
| `maxDeliveryRetries = 0` | §15 R-delta / §45.5 | controller + canary | grep |
| Daily credit cap 1,900 | §3.3 / DD-R | `:95` | read |
| `ADB_BATCH_BUDGET` default | §22 fix 3 (must be 1900) | ❌ was 3000 → FIXED | read |
| R1 subscription exclusivity | §15 | canary assert — FIXED | read |
| R3 credit canary | §15 | `credit_canary.ts` — present | read |
| R7 versioned manifest | §15 | `writeManifest` — FIXED | read |
| R2 SOFT_STOP margin | §15 | `:102` — FIXED | grep |
| R5 delivery-failure flag | §15, migration 0018 | — FIXED | ls |
| R6 crossover template freeze | §15 | — FIXED | grep |
| S1–S5 population/airborne layers | §15, migrations 0019–0020 | — FIXED | ls |
| Gate-0 budget-partition report | §17 step 3 | `gate0_budget_report.ts` — FIXED | grep |

<a id="log-section-36-8"></a>
### 36.8 Older change log (2026-08-17 and earlier — full history)

- **2026-08-17 — FRAME DECISION MADE (Option 1) + script rebuilt.** Team chose to
  follow plan §6 literally: frame = measured universe (universe ∩ feed-eligible,
  zero-yield kept), 276 preserved as flagged curated reference. Script rebuilt;
  macro-region map extended to the whole universe; tested locally (frame=287 test
  set, 18 cells all populated). No open decision remains for step 11.
- **2026-08-17 — CONFIRMED DESIGN GAP: 276 predates the plan.** Verified with git
  history: catalog created 2026-08-09/10, plan 2026-08-13, catalog never
  regenerated. Plan §6 explicitly moved from "276 hard-coded" to "measured
  universe". Arithmetic still correct; the design gap led to the Option-1/Option-2
  decision above.
- **2026-08-17 — FINAL VERIFICATION of 276/267.** Three independent proofs: the
  plan names these metrics (PART 1 §4 line ~215), the coverage endpoint is the same
  code path, and hand-arithmetic is internally consistent.
- **2026-08-17 — VERIFIED number origins + regions CONFIRMED.** 4,332 = from
  AeroDataBox (`listFeedAirports`); 276 = from US (`adbAirportCatalog_v3.ts`);
  267 = a MIX (our catalog ∩ their universe); "frame" terminology fixed
  (267 = `catalogInUniverse`, a Gate-1 metric, NOT the frame). Macro-regions
  confirmed: the plan's "Priority anchor regions" list enumerates exactly North
  America, Europe, Asia-Pacific, Gulf/Africa, South America, Oceania.
- **2026-08-17 — CORRECTION: PART 1 is the only spec.** `ADB_PLAN = Ultra`
  RETRACTED (came from PART 2 §13, old); `ADB_MONTHLY_UNITS = 60000` confirmed
  (PART 1 §3.2). "6 macro-regions from §23" RETRACTED (that's PART 2; it's our
  documented choice). Anchor-probe §23 quotes RETRACTED (PART 1 §8/§9 is the
  authority). "No tier-empty cells" no longer a plan requirement (kept as a
  warning). All section cross-refs now point to PART 1.
- **2026-08-17 — `npm run build-catalog` implemented (Phase 2 step 11).** New
  script building the stratified catalog: our 276 ∩ universe → primary strata =
  traffic tier × macro-region (PART 1 §4/§17 step 11), using our 6 regions.
- **2026-08-17 — Step-by-step detail added for Steps A–C (from the plan).**
  Step A answered (verification commands, `ADB_MONTHLY_UNITS`); Step B clarified
  the three lists; Step C explained the anchor probe in plain English.
- **2026-08-17 — Next-steps section rewritten from the plan (§3).** Steps A–D
  with the exact "what I need from you" list. (Superseded by §1 of this log.)

<a id="log-section-36-9"></a>
### 36.9 The old plain-English command explanations (kept for the record)

The detailed line-by-line explanations of `npm run health`, `npm run gate0`, and
`npm run coverage` output (the "2.3/2.4/2.5" sections) were folded into §8 and the
glossary. The essential takeaways, still true today: the `data flow FAIL` and
`active batch FAIL` lines are *status*, not errors — they flip green only after the
real run starts; the line that matters is **balance**, which is green (2,901).

<a id="log-section-36-10"></a>
### 36.10 Previous "What to do next" — the 2026-08-19 pre-rl9 list (superseded)

> This is the previous version of §1, archived whole so you can look back. It was
> superseded on 2026-08-19 because the canary FAILED and its root cause was found
> and fixed, so the current list (top of §1) now starts with pulling the fix and
> re-running the canary. The rl8 orphans (`99cdf2be-…`, `9c87e594-…`) named in
> step 4 of this old list are long gone.

The old list, verbatim in substance:

1. `git pull origin main` — get the latest code (anchor_probe.ts, migration 0023,
   the log, rl8.md).
2. `pkill -9 -f node` then `ADB_AUTO_COLLECT=0 npm run dev` — safe boot;
   watch for `applied 0023` + `autoCollect=false`.
3. `npm run anchor-probe -- --check-webhook` — prove the webhook URL is
   publicly reachable; any HTTP status is a pass, network error is a fail.
4. `npm run anchor-probe -- --cleanup` — delete the two orphaned subscriptions
   from the rl8 interrupted run and mark their rows `abandoned`.
5. `npm run health` + `npm run gate0` — balance 2,901, floor intact, invariant
   HOLDING.
6. `npm run canary` — must PASS with more than 0 items and zero delivery
   failures; if 0 items / 0 balance change, the webhook still is not receiving.
7. `npm run anchor-probe -- --stage 1 --icao WSSS`, then `OMAA`, then `KLAX`, then
   the other 9, one at a time — each a 2 h window, WSSS/OMAA first as calibration
   baselines (~331 / ~127 rows/h); ~24 h back-to-back; never cross in real time.
8. `npm run anchor-probe -- --status` — list recorded probes.
9. `npm run anchor-probe -- --score` — fill the frozen formula, apply the
   capacity gate, print the ranked pool + proposed 5-airport lock.
10. `npm run anchor-probe -- --stage 2` — 4 h confirmation; refuses airports
    without a completed stage-1.
11. Paste the `--score` output into `AugMDnotes/rl9.md` and report back.

What actually happened when you followed it: steps 1–5 all green; step 6
(canary) FAILED with `delivery_failure=1`, 0 items, 1 credit spent; step 7 was
started for WSSS before the canary passed, so it hit the same bug. The fix and
the re-run are the current §1.
