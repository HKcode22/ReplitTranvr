# Phase 6 complete technical study guide — Gates 1–8, Gates 9–14, accidental main change, and Day 1 recovery

**Verified context:** November 23, 2026, approximately 00:55 PST / 08:55 UTC.  
**Status at audit:** original production target main restored to the exact approved SHA; Gates 1–8 closed; Gate 12 PASS; no Gate 13 paid GO yet.  
**Safety:** This is an educational/documentation checkpoint on an **isolated branch**. Do not merge it or any other documentation into SHA-pinned production `main` before the approved launch. Creating this guide performs no provider GET, DB mutation, migration, authorization, cron modification or paid activation.

## 0. Executive summary: understand the whole project in 90 seconds

You are building an **as-of, prospective flight-disruption research dataset** to evaluate whether machine learning can forecast real flight disruption before it happens. You cannot pretend a provider result obtained at 5 PM was available to a model making a 2 PM prediction.

- **Phase 5:** set up the scientific plan, original/source lineage, frozen prospective dates, signing, credentials, database, and acquisition machinery.
- **Gates 1–8:** commission and validate the independent PRE/POST, expiry, code review, calendar, runtime policy, clocks and SOURCE authorization, **while paid launch is OFF**.
- **Gates 9–14:** start and verify the real month: restore/direct the independent external clock; confirm it actually reached a protected target worker; check current account/quota and database; confirm the fully bound G12 policy/roles; explicitly authorize paid spending at G13; and finally prove a **real billed SOURCE observation** at G14. The gate numbers are inherited identifiers and not the chronological order of execution.
- **Phase 6:** real approved data collection with budget/rights/expiry restrictions and individual flight cutoff clocks. A successful automation run alone is NOT a successful scientific observation.
- **Phase 7:** derive, train, calibrate and evaluate models only from legitimately usable data, without violating retention rules or leaking future information into predictions.

The **strongest mental model**: the release is a series of independently checked permissions and receipts. A cron pulse permits a worker to *attempt* a task; a paid GET is a separate event; a bound original is another; a cutoff-safe PRE is another; a genuine paired actual gate-out label is yet another.

## 1. Main accident: what really happened, what was fixed, and what NOT to do

| Verified fact | Exact evidence |
| --- | --- |
| **Approved target main is already restored** | `c8e065d665ccacb6d2575070e94c5500b7583044`, verified by live GitHub ref and compare from this SHA to `main`: **identical / zero changed files / zero commits** |
| External relay approved main remains | `c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed` |
| Brief accidental target main | [commit 0369f88ba361ff8f97a352b9d438ee5bcf59af57](https://github.com/HKcode22/ReplitTranvr/commit/0369f88ba361ff8f97a352b9d438ee5bcf59af57), parent c8, **only one added Markdown file** |
| That Markdown file | `data-collection/phase6/checkpoints/2026-11-23_PHASE6_GATES_1_THROUGH_8_EXPLAINER_AND_OPERATIONS_MANUAL.md`: **historical, non-authoritative** |
| Workflows while that SHA was briefly used | [No-provider heartbeat 45141643784](https://github.com/HKcode22/ReplitTranvr/actions/runs/45141643784) SUCCESS; [primary/Phase7 expiry 45141542474](https://github.com/HKcode22/ReplitTranvr/actions/runs/45141542474) SUCCESS. Offline safety [45141520441](https://github.com/HKcode22/ReplitTranvr/actions/runs/45141520441) was still running at inspection. None of those passes proves a paid SOURCE receipt. |

**The accidental document is unreliable.** It falsely characterized the sample as five U.S. hubs (JFK/LAX/ORD/DFW/ATL), presumed consecutive batch dates, claimed exactly 192 Day1 rows and exactly 128 billed units, promised an independently unverified seven-day Neon PITR guarantee, assumed exactly eight reliable prearm retries, and suggested that a SQL upsert eliminates duplicate *external paid-provider* charges. Those statements are NOT authenticated release commitments.

**The repair decision:** Since remote production `main` has already returned to the exact pinned c8, do **not** force-push, revert, reset, cherry-pick or add another commit on main. Any *new* docs-only main commit would change the SHA again and fail protected code/secret admission. Preserve the accidental commit in history, and publish this accurate explanation only on the existing independent evidence branch. A local Replit checkout may differ from remote main; inspect local status before any local repair and do not destroy uncommitted files.

## 2. What is running where: real system topology

| Part | Role | Key caveat |
| --- | --- | --- |
| [HKcode22/ReplitTranvr](https://github.com/HKcode22/ReplitTranvr) | Version-controlled TypeScript/JS, GitHub Actions, study policy, signed registry, SOURCE/PRE/POST and expiry workers | A green GitHub action does not imply actual provider data or real model label |
| [HKcode22/TravnrClockRelay](https://github.com/HKcode22/TravnrClockRelay) | Independent external clock and authenticated target forward for rolling work and **PRIMARY_BACKSTOP** retention | Relay ACK means dispatch accepted; target execution and paid GET must be verified separately |
| Replit | Owner Shell, existing runtime/provider credential and exact PG16 connection for guarded commissioning | Not a replacement for the original GitHub source of truth or a reason to run unsigned local scripts |
| **Neon PostgreSQL 16 `neondb`** | Durable signed calendar/authorization, spend and physical GET ledger, original response bindings, normalized flight population, per-flight horizon PRE, POST, queue leases/locks, incidents and expiry | Deleting a row does not by itself prove backup/PITR/WAL disposal or permanent rights |
| AeroDataBox via RapidAPI | Billable real flight/source observations; original response and times | Generic scheduled/revised/runway fields do **not** certify actual gate departure |
| PRE independent signers / POST reviewer, publisher and storage | Scoped access and separately signed proof/handoff; private same-runner transport instead of posting data to public logs | Separation of credentials inside one trusted runner is not full hostile-user OS isolation |
| Phase7 derived lane | Only separately reviewed nonreconstructive representation for future ML and controlled metrics | Do not transform away identities/timestamps required in temporary Phase6 operational source custody, or assume derivatives are automatically licensed |

### Read this simplified flow from top to bottom

~~~text
Frozen scientific design + 31 signed day calendars + budget/rights policy
   ↓  Gates 1–8 installed, signed, tested, SOURCE enabled but paid STOP=0
Fresh quota + V0108 expiry + current code/role check [G11 + G12]
   ↓
Explicit owner G13 paid GO during signed Monday clock window
   ↓
Independent external relay -> G9 approved DIRECT_TICK -> G10 target ACK
   ↓
Authorized SOURCE parent / bounded child / queue claim / spend reservation
   ↓
Real AeroDataBox physical GET + usage/charge + original response provenance
   ↓
Normalized, exact confirmed operating leg + frozen source/availability clock
   ↓
Independent PRE proof & Stage14 per-flight T-24h / T-6h / T-90m cutoff
   ↓
Genuine due POST, independent reviewer, publisher, result/censoring
   ↓
Retention/expiry + separate physical UTC budget/incident reconciliation
   ↓
Allowed derived model data, train/validation/test and scientific reports

Any shared rights/budget/signature/retention contradiction -> HOLD, not replay
~~~

A **flight**, **airport slot**, **window**, **query template**, **physical GET**, **original response**, **normalized flight**, **PRE snapshot** and **actual-only outcome label** are different entities. One query can return many flight legs, none, or an ambiguous response. NEVER substitute a template count for a flight count.

## 3. Actual frozen scientific design (not the accidental US-hub story)

- Four global HUB anchors: **OMAA Abu Dhabi; WSSS Singapore; YSSY Sydney; SKBO Bogotá**.
- Five matched airport comparison sets. Each contains the role slots **HUB / MID_A / MID_B / REGIONAL**:
  1. **OMAA / OMSJ / SPJC / KDEC**.
  2. **WSSS / SBFL / TJSJ / LSZB**.
  3. **YSSY / KBUF / LFQQ / NZNP** (KBUF prospectively replaced unsuitable KTEB).
  4. **SKBO / EBAW / NZNS / RJNK**.
  5. **SKBO / YBUD / RKTU / FAKM** (SKBO is repeated across two *pairs* subject to washout rules).
- A **pair** is a matched temporal sampling experiment, NOT a route an airplane flies. Actual origin→destination routes appear only after genuine operating-leg observations.
- **31 parent batch days**: **10 paired comparison days** (five pairs twice) plus **21 prospectively adaptive ordinary days**. They are not presumed consecutive; original matched weekday/time class and 24-hour end-to-start airport washout apply. The ordinary days' identities must not be chosen after seeing outcomes.
- Frozen geometry: **26 ordinary 4-hour parent windows**, **3 split alternatives** (two separate active 2h windows with an **excluded 1h gap**), **2 up-to-6h alternatives**; 34 active child segments in the final shape. Excluded gaps are not legitimate sampled population.
- **Three per-flight prediction horizons**: T−24h comparator, **T−6h conditional continuous primary**, T−90m update. The T is a specific leg’s original frozen scheduled departure, *not the clock time the batch began*.
- **Amendment E conditional primary label:** continuous minutes between a qualified **actual gate-out** and its matching independent original **scheduled gate-out**. Generic provider `scheduledTime`, `revisedTime`, `runwayTime`, “Live”, ADS-B wheels-off/airborne or inferred status are insufficient alone to assert an actual gate-out pair. When not evidenced, report `missing`/`censored`/`not_due`/`invalid`, never zero-minute delay. Arrival ETA and cancellation are distinct targets.
- Current signed Monday source budget: **6,144 planned query templates** (2,048 per horizon), **36,740 planned REST API units**, **1,900 REST-unit/day cap** and **1,000 separate protected Alert-credit floor**. These are signed budget/planning numbers, not successful paid calls or guaranteed provider units. Seven separate REST categories and actual **physical UTC charge days** must reconcile. An older **41,960-unit** proposal is not the current release.
- Original model-split governance: **20 train / 5 validation / 6 test parent batch-days**; preserve this even when Day1 is sparse. Do not move poor Days into other partitions, retime the batch or replace a failed pair opportunistically.

**Grounding:** [four-HUB five-pair design and code atlas](../../phase5/2026-11-09_OWNER_STUDY_GUIDE_FOUR_HUB_FIVE_PAIRS_FORTY_WINDOWS_ROLLING_EARLIEST_PHASE6.md), [fixed eight-gate register](2026-11-20_FIXED_PHASE6_LAUNCH_COMPLETION_REGISTER_NO_GO.md), [final G1–8 production receipt](2026-11-22_PHASE6_GATES_1_THROUGH_8_VERIFIED_PRODUCTION_FREEZE.md), [current launch START HERE](2026-11-23_START_HERE_PHASE6_LAUNCH_EXACT_3_OWNER_COMMANDS.md).

## 4. Gates 1–8, one by one: why it existed and which real code implements it

The [Nov20 fixed eight-gate register](2026-11-20_FIXED_PHASE6_LAUNCH_COMPLETION_REGISTER_NO_GO.md) is the **historical work breakdown** with candidate/open states at that time. The later [Nov22 production freeze](2026-11-22_PHASE6_GATES_1_THROUGH_8_VERIFIED_PRODUCTION_FREEZE.md) reports **G1–8 closed**. This does **not** mean paid GO was armed. Read both dates; do not mistake the older NO-GO candidate text for reopened gates.

### Gate 1 — Independent PRE producer, source readback and approved transformation

**Why:** A valid predictor cannot use a field the world had not revealed at prediction time. Identity, exact observation time and permitted transformation matter as much as network success.

**What we built:** On the existing restricted `neondb` production roles and `clean.adb_phase6_authorization` policy, code independently rereads the signed SOURCE original and selected normalized operating leg, verifies approved field/reference dispositions (including the 16-field PRE profile and 13 enforced raw-to-reported status treatments recorded by G1), authenticates manifest+rights+same-flight cutoff, issues a separately controlled native lane receipt/proof and commits PRE through the existing Stage14 writer. Private same-runner socket handoff and bounded page publishing prevent broadcasting the signed permit/provider bytes in Actions output.

**Technical invariants:** original source+member binding; confirmed operating leg; immutable original scheduled T; source availability and DB commit clock **before flight-specific cutoff**; independent role keys/readback; no rewritten flight identity; no retrospective T−6 evidence. Missing optional NOAA/ADS-B does not by itself invalidate a qualified PRE; a present field cannot be silently omitted to claim equivalence.

**What remains unknown until paid run:** genuine on-time PRE counts/latency. Passing actor-only no-provider tests proves capability, not real PRE.

### Gate 2 — Independent POST reviewer, honest outcome and restricted storage

**Why:** A flight’s later outcome must be authentic, properly linked to the original operating leg and must not be mistaken for an estimated provider revision.

**What we built:** independent same-original POST review, restricted publisher and storage, signed settlement/censoring, deadline clock, and private bounded handoff. The protected current-main workflow [phase5-one-signed-future-post-v0083-main-manual.yml](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml) runs real actor-role preflights while paid collection is disabled.

**Real code:** [phase7IndependentPostSettlementIssuer_v39.ts](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/server/lib/disruption/phase7IndependentPostSettlementIssuer_v39.ts), [phase7LocalPrivatePostHandoff_v39.ts](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/server/lib/disruption/phase7LocalPrivatePostHandoff_v39.ts). A legitimate all-null/censored outcome is preferable to a fabricated actual gate-out label.

**Evidence:** current-main protected real actor-only [45125753815](https://github.com/HKcode22/ReplitTranvr/actions/runs/45125753815) PASS for disarmed admission + independent reviewer + restricted publisher/deadline clock + independent storage. Its paid V0083 child was intentionally **SKIPPED**. The historical previous failure [45123332394](https://github.com/HKcode22/ReplitTranvr/actions/runs/45123332394) is an audit entry, not an unresolved current actor failure.

### Gate 3 — Controlled source expiry, V0108 and independent retention backstop

**Why:** Provider-shaped data is not indefinitely owned; expiry cannot be postponed merely because experiments need more features. Nor should expiry code block SQL writers or delete a still-required packet early.

**What we built:** restricted SQL V0108 `clean.phase6_private_epoch_expiry_status_v39()` and `sweep_v39()` checks, scoped service roles, 3-second DB lock timeout, deadline metadata/STOP classification, bounded due-only sweep and independently triggered PRIMARY_BACKSTOP. Actual prior production readback: `V0108_EXACT_INSTALLED`, zero unresolved deletion STOP and zero due private packets/indexes at the observation clock.

**Read:** [V0108 migration](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/migrations/staged/V0108__phase6_private_operational_metadata_expiry_class_v39.sql), [owner verifier](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/scripts/v39_phase6_v0108_owner_once_v39.mjs), [live no-provider expiry workflow](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/.github/workflows/phase5-primary-fids-expiry-no-provider.yml).

**Strict nuance:** 24h FIDS source custody and up-to-168h other provider Contents constraints are **not universal extension rights**; a source packet or signed index can have stricter deadlines. Existing V0108 source-bearing sweep is **due-only**; a 23h future-POST/early source safety design does NOT license universal early deletion. A successful zero-due sweep is not proof of a populated deletion or of WAL/PITR/backup disposal. Do not assert automatic 7-day Neon PITR.

**Live evidence:** external PRIMARY relay [45137657355](https://github.com/HKcode22/TravnrClockRelay/actions/runs/45137657355) -> target [45137685153](https://github.com/HKcode22/ReplitTranvr/actions/runs/45137685153), both target retention jobs PASS. This proves forwarding and those bounded due-only jobs, not future SOURCE or universal cleanup reliability.

### Gate 4 — Exact production executable review, merge and tests

**Why:** Tests of commit A do not certify commit B, even if B only changes docs. The run code/policy/secret hashes must be the reviewed version.

**What we did:** focused SOURCE/PRE/POST/PG16 and full offline safety checks, reviewed merges and production-main freeze, independent code/readback checks on the installed production paths. Nov22 checkpoint documented final reviewed executable and tests; subsequent **approved heartbeat-only** commits reached exact target c8 with no intended scientific/paid feature expansion.

**The accident lesson:** A documentation commit produced temporary `0369f88...` and ran at least some no-provider workflows under that SHA. That exact commit was **not** an accepted paid-release SHA. Remote main now equals c8. **No new main commit before paid launch**; keeping this guide on evidence branch is an engineering safeguard.

### Gate 5 — Signed 31-day calendar staged DISABLED

**Why:** We must predeclare selected airports, treatment/control geometry, source horizon templates, UTC charge-day budget and study split *before seeing outcomes*. Otherwise we could cherry-pick easy flights or spend outside caps.

**What:** production stage and signed manifest for 31 batch-days / 6,144 planned templates / 36,740 reserved units, plus exact disabled controls. Review the verified [calendar freeze guard](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/server/lib/disruption/phase5F8CrossoverCalendarFreezeGuard_v39.mjs), [segmented SOURCE coverage](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/server/lib/disruption/phase5F8SegmentedSourceCoverage_v39.mjs), [calendar solver](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/server/lib/disruption/experimentCalendarSolver_v39.ts) and [seven-category budget freeze](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/server/lib/disruption/phase5V0082SevenCategoryFreezePacket_v39.mjs).

**Not the same as spending:** `sourceAuthorizationEnabled:true` in `clean.adb_phase6_authorization` means the reviewed source path is enabled; actual paid ARM/owner approval remain zero until G13. Template count is NOT successful request count.

### Gate 6 — Six runtime policies, 31 canonical values, secrets/roles/rights scoped to the exact code

**Why:** The worker code, signing roles, budget, roster, approved source contents and rights must agree at the moment of action. A secret at repository scope may be **shadowed by the protected environment**.

**What we did:** installed signed six policy bundles / 31 static canonical settings and code-bound hashes; commissioned existing role credentials/pins; created actual repository 31-value readback [45123278530](https://github.com/HKcode22/ReplitTranvr/actions/runs/45123278530) SUCCESS. Two separate global paid STOP names are `V39_PHASE6_PROCESS_ARMED` and `V39_PHASE6_OWNER_APPROVED` at repo and environment scopes. Original once-only G12 installed linked code/digest successor; protected POST admission initially failed because its effective environment remained inconsistent with the new c8. Owner then performed one narrowly bounded SHA reconciliation with all STOP flags zero. Fresh protected four-actor PASS [45125753815](https://github.com/HKcode22/ReplitTranvr/actions/runs/45125753815) confirmed effective admission.

**Do not claim:** that GitHub secrets API metadata reveals plaintext values. It does not. Do not rerun G12 one-use installer or manually repin secrets to an accidental doc commit.

### Gate 7 — Dry autonomous controller/relay/clock test without provider spend

**Why:** Native GitHub schedules can slip. The external clock supplies independent wake and retention, but each forward has to be authenticated and bounded. Dry runs prove plumbing, not accuracy.

**What:** existing controller parent/child and external PRIMARY_BACKSTOP/ROLLING_ROOT, clock/route admit/reject logic, nonpaid heartbeat. [Heartbeat implementation](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/server/lib/disruption/phase6AutonomousGithubControllerHeartbeat_v39.mjs) deliberately uses GitHub metadata only, zero provider/DB, and therefore cannot verify a real source observation. GitHub successful rehearsals and protected role checks matter, but they are **not measured hard guarantees of every future wake, eight exact retries or 90-minute prearm success**.

**Expected before GO:** rolling relay [45138866138](https://github.com/HKcode22/TravnrClockRelay/actions/runs/45138866138) legitimately returned `DEFER_OUTSIDE_OR_LATE_POLICY_WINDOW` with `TRAVNR_RELAY_DIRECT_TICK_APPROVED=0`. PRIMARY retention forwarded and actual target expiry ran. A deferred SOURCE lane before authorization is a **safety success**, not a failure.

### Gate 8 — Separate scoped SOURCE enable/readback and approvals

**Why:** A signed SOURCE plan may be valid without the owner consenting to spend today.

**What:** `clean.adb_phase6_authorization` and original enabled SOURCE code/manifest approval, source physical GET ledger/roles and signed approvals. The owner production readback showed `sourceAuthorizationEnabled:true` and existing policy/manifest; separately the paid flags remained OFF. Gates 1–8 are therefore complete **without paid collection**.

**Safety distinction:** SOURCE enable is **functional eligibility**; G13 authenticated owner GO plus effective scoped ARM/OWNER flags is **monetary authorization**. Neither an external clock nor a green no-provider workflow independently grants paid GO.

## 5. Gates 9–14 — why the numbering is NOT chronological

| Gate | What it protects, code / proof | Status now and next |
| --- | --- | --- |
| **G9 — DIRECT_TICK external recovery switch** | SHA-pinned owner Git blob `6871236a9743b3b84f978c9e3cd9042b2aff2161`: verify G12 and authenticated G13 ledger, stage correct target/relay, pause only rolling external lane, set route/target DIRECT, read back, resume. The script itself makes **zero paid GETs**. | **OFF** before G13; run existing Command 3 only **at/after 23:45Z Nov23**, *after* G13 PASS, not before |
| **G10 — actual protected target direct-wave ACK** | [phase6-direct-recovery-tick.yml](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/.github/workflows/phase6-direct-recovery-tick.yml). Need authenticated external DIRECT_TICK attempt, exact target run ID, same SHA, target admission+execution result, no wrong-code/STOP rejection. | Not demonstrated for paid route pre-GO; observe the genuine post-G9 forward |
| **G11 — fresh provider account and live retention** | G13 invokes preGO Git blob `e4bae61cf2473674c99066952b0e928091101b4f`: fresh free account/quota, **≥36,740** remaining REST units, separate **≥1,000 Alert credits**, zero active unintended billable subscriptions, existing `neondb` V0108 pending due/STOP0, source/relay SHA and variables. | Historical check evidence exists, **must pass FRESH in G13 window** |
| **G12 — exact current 31-policy and protected four-role POST** | Repo 31-value canonical PASS [45123278530](https://github.com/HKcode22/ReplitTranvr/actions/runs/45123278530); protected main admission/reviewer/publisher+deadline/storage PASS [45125753815](https://github.com/HKcode22/ReplitTranvr/actions/runs/45125753815). Paid V0083 child correctly SKIPPED. | **CLOSED PASS**. Do not repeat the one-use installation/repair; G13 independently checks the receipts |
| **G13 — explicit one-use owner paid GO** | Owner Git blob `c15ce7bd23b60443d8c0ef3e58f90d41b5f8a517`: exact explicit approval string, current code/relay pins, unique G12 PASS, G11 fresh check, one-use owner marker, staged DISARMED route; then paired repo/env ARM+OWNER secret writes and authenticated issue #413 GO ledger. On uncertain partial writes, attempts STOP0 rollback, HOLD/no replay. **Four secret writes are not an atomic database transaction.** | **NOT YET DONE**. Approved clock **Nov23 21:50Z–strictly before 23:10Z** = **1:50–3:10 PM PST**; preferably by **22:15Z = 2:15 PM PST** for the proposed T−90 prep boundary. Real success `P6_G13_EXPLICIT_OWNER_GO_4_SCOPE_WRITES_ACKNOWLEDGED` |
| **G14 — first authentic SOURCE & operational science receipts** | Signed first epoch **Nov23 23:45Z / 3:45 PM PST** onward. Real guarded parent/child + physical provider GET, charge/usage, bound original, normalized operating leg; each independently on-time PRE; due POST/actual-only label or explicit missingness; cost/expiry/incident outcome. | **Not yet proven**. A green Actions icon or a relay ACK is not a bill, bound flight or primary label |

**Actual order:** **G12 PASS already** -> G11 embedded fresh check inside **G13** -> explicit G13 GO in its future window -> **G9** at/after signed first source epoch -> verify **G10** real external-to-target success -> collect and audit **G14** genuine SOURCE/PRE/POST. No new gate categories are required.

### Monday precise launch timeline, PST vs UTC

| PST Monday Nov 23 | UTC | Engineering meaning |
| --- | --- | --- |
| Before 1:50 PM | Before 21:50Z | Disarmed, no paid collection permitted; do not rerun G12 or change main |
| **1:50 PM–strictly before 3:10 PM** | **21:50Z–<23:10Z** | Owner **G13 Command 2** only if all fresh checks PASS. The launcher itself is no-paid but authorizes future paid workers. Prefer before **2:15 PM** if protecting intended first T−90 preparation lead |
| About 2:15 PM | 22:15Z | Intended first-cycle prearm/T−90 preparation boundary in operator plan, NOT guarantee of any on-time *per-flight* PRE |
| **3:45 PM or later** | **≥23:45Z** | Signed first SOURCE epoch; G9 guarded DIRECT_TICK **Command 3** after G13 PASS; actual external relay to target G10 remains to be observed |
| Flight-relative times | T−24h, T−6h, T−90m | Each authentic PRE separately requires original/available/DB clock before its own cutoff |
| As due and each UTC charge day | Outcome time + ledger close | Actual POST or valid censoring; pay/cap, deletion/incident/next-day checks |

**Do not manually set the four paid secrets or run commands early.** [START HERE original exact two remaining owner commands](2026-11-23_START_HERE_PHASE6_LAUNCH_EXACT_3_OWNER_COMMANDS.md) is the only operator shell reference. The old G12 Command 1 is explicitly already consumed.

## 6. Follow ONE example flight through the code (illustration, not observed)

A genuine future selected source query returns a confirmed operating leg with **original scheduled departure T**:

1. The signed day/airport/time/horizon determines a planned query template. The bounded SOURCE parent/child obtains a signed queue lease and budget reservation; GET may be sent only within the actual authorization window.
2. AeroDataBox returns an observation. We record exact physical request, provider response, `available_at`, source/original hash, and normalized confirmed operating-leg identity. An estimate is NOT an actual gate-out milestone.
3. For the **T−6h** prediction, the independent PRE issuer reads the original and checks `available_at ≤ T−6h`, immutable scheduled T, source/DB commit before cutoff, approved field profile, exact same leg and no conflicting existing proof. Only then Stage14 persists/witnesses a PRE.
4. If this same source arrived at **T−4h**, it can **never** be valid T−6h evidence; it may be eligible for a *different later per-flight horizon* such as T−90m if all its independent clocks and role proofs pass.
5. POST reviewer separately reads the same-source/same-leg outcome when due. Numeric continuous target minutes require a genuinely **actual gate-out minus scheduled gate-out** pair; absent it, the label is unknown/censored rather than inferred zero or scheduled-vs-revised.
6. TTL expiry removes provider-shaped custody according to approved rights and accurate signed deadline; separately approved nonreconstructive derived data/metrics may remain, but never because “PITR will keep everything.”

## 7. If something fails: scientifically honest Day 1 salvage and Day 2 independence

| Failure class | What to do with Day 1 | Effect on future 30 signed days |
| --- | --- | --- |
| Some physical SOURCE requests missed or a response has no bound original | Count planned/reserved/attempted/bound separately; original QA can return `SOURCE_LOSS_OR_LATE_OBSERVATIONS_REVIEW_CENSORING`. Preserve independent valid per-flight PRE; no retroactive GET claim | Potentially independent future days can continue if no shared STOP/rights/cost issue |
| Source late for a planned query | Check that source’s **actual flight-specific** horizon cutoff, not just query template cutoff. It may still qualify for a different flight/horizon, but never by backdating | Unaffected future days eligible |
| T−24 or T−90 missing while another horizon is genuinely valid | Report missingness per horizon and the correct denominator; no false label, selective flight replacement, or evaluation leakage | Other horizon and next day may be usable |
| POST outcome not due / only estimates | `not_due`, later `missing`/`censored`, no “0 minute actual delay” | Later days do not inherit fake labels, though effective eligible sample can shrink |
| Unknown GitHub/relay ACK, uncertain provider GET charge, duplicate attempt | **HOLD affected request**, inspect attempt/lease/provider usage/original to independently reconcile. SQL upserts do not refund an external billed HTTP GET. No blind replay of GET or POST | A shared cost/incident STOP may block all future acquisition |
| Four-airport draw not verified / signed index or operating-leg identity invalid | `FOUR_AIRPORT_DRAW_NOT_VERIFIED_HOLD` or integrity refusal; no hindsight redraw or substitution | Resolve signed integrity before continuing affected/shared work |
| Physical UTC/day budget or project cap contradiction, provider terms/TTL/backup noncompliance, deletion backlog STOP | `HARD_LEDGER_OR_BUDGET_HOLD_NO_FURTHER_DISPATCH` and separately authorized STOP owner; settle/expire/review first | Shared hard STOP blocks later days until independently resolved |
| Owner G13 HOLD / misses strict 23:10Z deadline | No valid paid launch; do not flip flags, manually replay once-only G13 or backdate | Later dates cannot start under expired G13 authority; new prospective signed release needed |
| Full first-day SOURCE/PRE/label gap with no hard legal/ledger STOP | Record truthful zero/unknown/`not_due` denominators. Day1 may be **operational evidence only**, not a valid supervised labeled primary day | Other day designs remain intact, but lower effective sample and missingness bias must be disclosed |

**Existing read-only classifier:** [phase5DaySourceQualityReadonly_v39.ts](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/server/lib/disruption/phase5DaySourceQualityReadonly_v39.ts), function `assessP5Day1SourceSafetyFromReadonlyAudit()`. It returns one of: `HARD_LEDGER_OR_BUDGET_HOLD_NO_FURTHER_DISPATCH`, `FOUR_AIRPORT_DRAW_NOT_VERIFIED_HOLD`, `SOURCE_LOSS_OR_LATE_OBSERVATIONS_REVIEW_CENSORING`, `SOURCE_ATTEMPTS_NOT_MATURE_NO_OUTCOME_INFERENCE`, `DESCRIPTIVE_SOURCE_PROGRESS_NOT_SCIENCE_PASS`. **This reporting function cannot by itself grant release approval or execute STOP**. Existing [Phase6 safety watchdog](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/server/lib/disruption/phase6SafetyWatchdog_v39.ts) is the separate safety/incident/budget actor.

**Hypothetical example only:** If 100 horizon-flight opportunities exist but only 70 have legitimate cutoff-safe PRE, and only 45 later receive qualifying actual paired gate-out labels, **70/100** reflects measured PRE coverage at that audit clock and **45/70** qualified labels among those observed. The other 30 cannot be replaced with after-event recordings, and the remaining 25 PRE rows are not zero-delay. You must separately report how many are still `not_due` versus irrecoverably missing.

## 8. How to recognize success: require layers of real evidence

| Layer | Evidence we actually need | What green workflows alone cannot tell us |
| --- | --- | --- |
| **1. Preflight safety** | main/relay pins, 31-policy + protected POST proof, fresh account ≥36,740 REST & Alert ≥1,000, V0108 custody STOP0, real signed owner G13 ledger | Whether provider supplied flights or any future bill occurred |
| **2. Clock/worker** | G9 guarded route, external DIRECT_TICK, real G10 target ACK, exact main SOURCE parent/child admitted, no unresolved prior unknown | That a provider charge/flight was accepted |
| **3. Acquisition/science** | Actual physical GET + independent spend/charge, bound original response and normalized operating leg; per-flight valid T−24/T−6/T−90 PRE; due same-leg POST with actual-only label or honest missingness | Specific counts, true coverage, accurate continuous target |
| **4. Long-run integrity** | Each physical UTC charge day under 1,900 and signed 31-day budget, Alert floor, source TTL/expiry and verified retention, day-level split/attrition, incident and final stop/closeout | Guarantees that every flight, hour or day has 100% data |

A **successful initial launch** is *not* a scientifically successful 31-day study. We first prove release and first SOURCE; then only repeated authentic data can establish eventual predictive sample coverage, timing, bias, accuracy, calibration, and lawful retention.

## 9. Verified code atlas — where to read (all checked at exact c8)

| Read in this order | Why this file exists |
| --- | --- |
| [`phase5F8CrossoverCalendarFreezeGuard_v39.mjs`](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/server/lib/disruption/phase5F8CrossoverCalendarFreezeGuard_v39.mjs) | Pure validator of 31-day geometry, treatment and excluded gap |
| [`phase5F8SegmentedSourceCoverage_v39.mjs`](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/server/lib/disruption/phase5F8SegmentedSourceCoverage_v39.mjs) | How signed source query templates, partitions and prediction cutoffs are covered |
| [`phase5V0082SevenCategoryFreezePacket_v39.mjs`](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/server/lib/disruption/phase5V0082SevenCategoryFreezePacket_v39.mjs) | Seven REST categories, reservations and physical UTC budget math |
| [`phase5DaySourceQualityReadonly_v39.ts`](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/server/lib/disruption/phase5DaySourceQualityReadonly_v39.ts) | Source attempt/original/PRE denominators, missingness and hard integrity classification |
| [`phase6SafetyWatchdog_v39.ts`](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/server/lib/disruption/phase6SafetyWatchdog_v39.ts) | Soft/hard budget and incident STOP, settlement, independent parent/child safety |
| [`phase7IndependentPostSettlementIssuer_v39.ts`](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/server/lib/disruption/phase7IndependentPostSettlementIssuer_v39.ts) | Actual-only POST review, signed censoring, original leg linkage |
| [`phase7LocalPrivatePostHandoff_v39.ts`](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/server/lib/disruption/phase7LocalPrivatePostHandoff_v39.ts) | Role-separated same-runner POST IPC rather than public packet leakage |
| [`phase5-one-signed-future-post-v0083-main-manual.yml`](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml) | Explicit protected actor role steps and separately guarded real paid POST |
| [`phase6-direct-recovery-tick.yml`](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/.github/workflows/phase6-direct-recovery-tick.yml) | Exact route verify-only vs post-GO direct recovery |
| [`V0108__phase6_private_operational_metadata_expiry_class_v39.sql`](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/migrations/staged/V0108__phase6_private_operational_metadata_expiry_class_v39.sql) | Source deadline/shape/metadata expiry types; don't reinstall |
| [`phase5-primary-fids-expiry-no-provider.yml`](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/.github/workflows/phase5-primary-fids-expiry-no-provider.yml) | Real bounded primary and Phase7 expiry, no paid provider |
| [`phase6AutonomousGithubControllerHeartbeat_v39.mjs`](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/server/lib/disruption/phase6AutonomousGithubControllerHeartbeat_v39.mjs) | Metadata-only GitHub liveness; never a science PASS |

**Owner G13/G9 exact reviewed Bash files** are Git **blob hashes**, not scripts to rewrite casually. G13: `c15ce7bd23b60443d8c0ef3e58f90d41b5f8a517`. G9: `6871236a9743b3b84f978c9e3cd9042b2aff2161`. [START HERE](2026-11-23_START_HERE_PHASE6_LAUNCH_EXACT_3_OWNER_COMMANDS.md) fetches, checks each SHA and Bash syntax, and supplies the explicit owner tokens. Running a plain helper outside its authorized window intentionally HOLDs.

## 10. Glossary: technical words explained

- **Commit SHA / pin:** immutable Git commit ID. A documentation edit creates a new SHA; approved exact-code secrets do not magically update.
- **GitHub Actions workflow dispatch:** an API-triggered workflow job request, not automatically a provider GET or successful database commit.
- **PRE / POST:** PRE means **provably observed before prediction cutoff**; POST means independent outcome/evidence when due.
- **HUB, MID_A, MID_B, REGIONAL:** four tiered **airport slots**, not passengers or four sequential flight legs.
- **Signed manifest/day/roster:** precommitted versioned schedule and authorized selected data scope; not an arbitrary list generated after outcomes.
- **T and cutoff:** original frozen scheduled time for a specific flight and a time deadline relative to it.
- **Original vs normalized:** authenticated provider response/provenance vs parsed operating flight record linked to that response.
- **Physical GET vs bill vs ACK:** request sent, provider charging/usage settled, GitHub dispatch accepted are **different** facts.
- **Lease, fence, idempotence:** DB techniques to prevent concurrent or duplicate DB claims; **do not prevent an already-sent external paid HTTP request**.
- **Disarmed vs SOURCE enabled:** planned source path can be approved while global `V39_PHASE6_PROCESS_ARMED` and `V39_PHASE6_OWNER_APPROVED` remain zero.
- **HOLD:** an intentional safety refusal; never force a one-use script through it or manufacture data to make it pass.
- **Censor/missing/not_due:** distinct truth states; missing primary label is **not** a negative delay or zero-minute outcome.
- **V0108/expiry/retention:** database deadline enforcement, not a guarantee that every backup/PITR/log copy is legally disposable or already purged.
- **All 31 policy values:** canonical runtime/scientific commitments, **not 31 days already collected**.

## 11. Authoritative current status and references

**At the source audit clock:** target main **c8e065d665ccacb6d2575070e94c5500b7583044**, relay main **c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed**; accidental doc commit **0369f88ba361ff8f97a352b9d438ee5bcf59af57** is off main; Gates **1–8 remain closed**. Gate12 actual repository signed policy [45123278530](https://github.com/HKcode22/ReplitTranvr/actions/runs/45123278530) PASS and effective protected four-role actor [45125753815](https://github.com/HKcode22/ReplitTranvr/actions/runs/45125753815) PASS; paid worker intentionally skipped. PRIMARY retention external relay->target [45137657355](https://github.com/HKcode22/TravnrClockRelay/actions/runs/45137657355) → [45137685153](https://github.com/HKcode22/ReplitTranvr/actions/runs/45137685153) PASS. **G13 not yet run, G9 route remains disarmed, G14 billed SOURCE not yet proven.**

**Continue from:** [START HERE original owner commands](2026-11-23_START_HERE_PHASE6_LAUNCH_EXACT_3_OWNER_COMMANDS.md); [Day1 detailed success/incident runbook](2026-11-23_DAY1_PHASE6_PAID_MONTH_OPERATOR_RUNBOOK_GATES_9_14.md); [G12 independent protected acceptance](2026-11-23_G12_PROTECTED_POST_FOUR_ACTOR_INDEPENDENT_ACCEPTANCE_PASS.md); [fixed eight-gate register](2026-11-20_FIXED_PHASE6_LAUNCH_COMPLETION_REGISTER_NO_GO.md); [master GitHub issue #413](https://github.com/HKcode22/ReplitTranvr/issues/413).

**Never add a new gate, modify the signed study/sample/design, silently redate the calendar, regenerate keys, rerun original G12, or change protected production main to “save” this documentation.** This guide explains verified engineering and operational expectations, not new launch permissions.
