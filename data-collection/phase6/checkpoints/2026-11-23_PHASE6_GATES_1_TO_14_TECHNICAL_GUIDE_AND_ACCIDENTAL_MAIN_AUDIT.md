# Phase 6 complete technical study guide — Gates 1–8, Gates 9–14, accidental main change, and Day 1 recovery

**Verified context:** November 23, 2026, approximately 00:55 PST / 08:55 UTC.  
**Status at audit:** original production target main restored to the exact approved SHA; Gates 1–8 closed; Gate 12 PASS; no Gate 13 paid GO yet.  
**Safety:** This is an educational/documentation checkpoint on an **isolated branch**. Do not merge it or any other documentation into SHA-pinned production `main` before the approved launch. Creating this guide performs no provider GET, DB mutation, migration, authorization, cron modification or paid activation.

## VERIFIED LATER UPDATE — 2026-11-23 10:01–10:08 UTC: OWNER EXPIRY SHA REPAIR EXECUTED, REAL DUE-ONLY BACKSTOP + HEARTBEAT PASS

**This supersedes the earlier “prepared, not executed” warning in ``11–15 below.** The warning and the pre-repair failure are intentionally kept as audit history; **do not run the same owner repair helper again**.

**Authenticated owner terminal output:** `P6_EXPIRY_PIN_PRECHECK_APPROVED_MAIN_AND_NONPAID_GUARDS_PASS`; `P6_EXPIRY_TWO_ACTION_VARIABLES_MATCH_C8 paidGoChanged=false changed=1`; `P6_EXPIRY_PRIMARY_PLUS_P7_REAL_DUE_ONLY_STEPS_PASS`; `P6_EXPIRY_MAIN_NONPAID_HEARTBEAT_PASS`; `P6_EXPIRY_TWO_PIN_SCOPE_REPAIR_VERIFIED_NO_PAID_GO`. The helper changed **one** previously accidental Actions repository variable, verified that both required expiry pins now match c8 and used original approved full due-only backstop/health workflows. It did **not** modify production main, relay, paid GO, provider settings, protected secrets or installed schema.

**Independent live GitHub confirmation:**

| Receipt | Exact result / what it means |
| --- | --- |
| Target production `main` | `c8e065d665ccacb6d2575070e94c5500b7583044`; relay `c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed`. Both unchanged after owner fix. |
| [Target full-retention run #45152223464](https://github.com/HKcode22/ReplitTranvr/actions/runs/45152223464) | Real `workflow_dispatch` on main c8, first attempt, 10:01:06–10:01:35Z, **conclusion SUCCESS**. `primary-fids-expiry` job `137616193834` executed exact named `Verify exact main and execute only bounded primary FIDS expiry` step PASS. `phase7-expiry` job `137616194386` executed exact named `Bounded derived research and temporary link due-only expiry` step PASS. This was not a skip. |
| Real expiry status logs | FIDS `PRIMARY_FIDS_ELIGIBLE_AT_READBACK_CLEARED`: 0 live originals, 0 eligible/hard-due originals, 0 unresolved deletion stop, `objectDeletions=0`, `providerCalls=0`. V0108 private `PRIVATE_EXPIRY_DUE_AT_READBACK_CLEARED`: 0 due packets, indexes or operational-metadata packets and deletion STOP false. P7 `P7_EXPIRY_DUE_ONLY_INDEPENDENT_READBACK`: 0 live/due links, bundles or fragments, 0 deletions, `providerCalls=0`. **This verifies a successful *empty/due-only* sweep, not populated future deletion or full PITR/backup compliance.** |
| [Read-only heartbeat #45152310334](https://github.com/HKcode22/ReplitTranvr/actions/runs/45152310334) | Real `workflow_dispatch` on main c8, first attempt, 10:01:39–10:01:59Z, **conclusion SUCCESS**; `actual-main-nonpaid-controller-heartbeat` job `137616476852` succeeded at `STOP: no secrets / no paid / no database / exact main-only action` and `Read only GH workflow history and primary expiry execution metadata`. No provider, DB or other GitHub dispatch from the heartbeat. |
| **Heartbeat JSON nuance** | The report no longer contains `SCHEDULE_APPROVED_MAIN_DRIFT`. It still reports overall `AUTONOMOUS_GITHUB_CONTROLLERS_NEED_ATTENTION_NO_GO`, `primaryFidsExpiry.state=NO_SCHEDULE_RUN_ON_CURRENT_MAIN`, `primaryFidsExpiryNeedsAttention=true`, `activeNotifications.incidentCount=1`, with backup `BACKSTOP_CHILD_STEP_RECENT_NOT_DELETION_PROOF` linking back to actual successful run `45152223464`. The script specifically treats this **observed recent executed backstop** as an acceptable nonfatal substitute for a delayed native scheduled expiry *for heartbeat process exit*. Hence successful heartbeat **does not mean zero monitoring warnings** or guaranteed punctual native cron. Historical nine-controller schedule gaps remain visible. |
| [Next external PRIMARY_BACKSTOP #45152702795](https://github.com/HKcode22/TravnrClockRelay/actions/runs/45152702795) | 10:04Z relay **SUCCESS** with truthful `DEFER_RECENT_PRIMARY_STEP_NOT_DELETION_PROOF` because the repaired exact-main full expiry had just executed at ~10:01Z; no duplicate sweep needed immediately. |
| [Next external ROLLING_ROOT #45153321933](https://github.com/HKcode22/TravnrClockRelay/actions/runs/45153321933) | 10:08Z relay **SUCCESS** with truthful pre-GO `DEFER_OUTSIDE_OR_LATE_POLICY_WINDOW`; approved main c8 and `TRAVNR_RELAY_DIRECT_TICK_APPROVED=0`. No paid activation or SOURCE flight proof. |

**Current decision:** Accidental **expiry SHA drift CLOSED / fixed**. Current-main primary+P7 due-only backstop and manual no-provider heartbeat **independently PASS**. Native `schedule` liveness at exact current main still **not verified**; do not conceal its ongoing reported metadata warning, and do not promise the normal GitHub schedule will run every 15 minutes. Real external full-backstop remains the tested mitigator; it never proves a future deadline without due-item evidence. No changes to G1–8, G12 policy, G13 paid approval, G9 route, G14 prospective source conditions or original signed 31-day research design.

**Next:** No second repin or G12 replay. Monitor next authentic scheduled/externally forwarded current-main expiry receipts; at the original Monday Gate13 owner time obtain the standard fresh provider quota, rights, V0108 no-due/STOP readback **inside** the original signed G13 command. After **actual** owner G13 and first epoch, verify G9/G10 external target and G14 real provider/flight data separately. If a newly failed retention job or real due/DELETE STOP occurs, hold paid collection and reconcile rather than relying on this 10:01Z clean snapshot.

---

## 0. Executive summary: understand the whole project in 90 seconds

You are building an **as-of, prospective flight-disruption research dataset** to evaluate whether machine learning can forecast real flight disruption before it happens. You cannot pretend a provider result obtained at 5 PM was available to a model making a 2 PM prediction.

- **Phase 5:** set up the scientific plan, original/source lineage, frozen prospective dates, signing, credentials, database, and acquisition machinery.
- **Gates 1–8:** commission and validate the independent PRE/POST, expiry, code review, calendar, runtime policy, clocks and SOURCE authorization, **while paid launch is OFF**.
- **Gates 9–14:** start and verify the real month: restore/direct the independent external clock; confirm it actually reached a protected target worker; check current account/quota and database; confirm the fully bound G12 policy/roles; explicitly authorize paid spending at G13; and finally prove a **real billed SOURCE observation** at G14. The gate numbers are inherited identifiers and not the chronological order of execution.
- **Phase 6:** real approved data collection with budget/rights/expiry restrictions and individual flight cutoff clocks. A successful automation run alone is NOT a successful scientific observation.
- **Phase 7:** derive, train, calibrate and evaluate models only from legitimately usable data, without violating retention rules or leaking future information into predictions.

The **strongest mental model**: the release is a series of independently checked permissions and receipts. A cron pulse permits a worker to *attempt* a task; a paid GET is a separate event; a bound original is another; a cutoff-safe PRE is another; a genuine paired actual gate-out label is yet another.

## CURRENT 2026-11-23 09:41Z ALERT — A REAL RETENTION APPROVAL PIN DRIFT, DO NOT MASK HEARTBEAT

**Later than the initial 08:55Z teaching checkpoint below:** New scheduled nonpaid [heartbeat #45149342374](https://github.com/HKcode22/ReplitTranvr/actions/runs/45149342374) failed with `P6_CONTROLLER_CURRENT_INCIDENT_REVIEW_REQUIRED` because `P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA` still points to accidental `0369f88…` while approved production main is `c8e065…`. The latest full retention [#45143813850](https://github.com/HKcode22/ReplitTranvr/actions/runs/45143813850) has BOTH expiry jobs **SKIPPED**. This is an actual configuration incident; no paid provider work is proved. The source code intentionally fails the heartbeat for such a current actionable incident. Do not edit main or weaken the diagnostic.

**Narrow guarded owner repair is PREPARED, NOT EXECUTED:** [`p6_20261123_reconcile_expiry_pins_c8_and_verify_heartbeat_no_provider.sh`](p6_20261123_reconcile_expiry_pins_c8_and_verify_heartbeat_no_provider.sh), immutable Git blob `6b3b2ffa497e593a285f811a72b20fe3613eae31`; it will edit only existing repo **variables** whose value matches accidental `0369`, recheck original FIDS+Phase7 approvals, execute one real authorized DUE-ONLY no-provider backstop and then an independent read-only current-main heartbeat. This action does **not** touch G13 paid secrets, but due-only retention may perform authorized physical DB deletions. Owner must run its verified command separately before calling heartbeat repaired. **No paid GO while this remains unresolved.** Read ``11–15` below for full engineering retrospective, failure examples and actual code-level root cause.

---

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


## 11. Engineering retrospective: why completing the gates took so long

**Evidence basis:** The dated [Nov20 fixed eight-gate register](2026-11-20_FIXED_PHASE6_LAUNCH_COMPLETION_REGISTER_NO_GO.md), [Nov22 production commissioning evidence](2026-11-22_PHASE6_GATES_1_THROUGH_8_VERIFIED_PRODUCTION_FREEZE.md), [final G9–14 release register](2026-11-22_FINAL_GATES_9_TO_14_EXACT_RELEASE_REGISTER.md), and [issue #413's actual owner/run receipts](https://github.com/HKcode22/ReplitTranvr/issues/413). This is a retrospective interpretation of recorded obstacles, **not** a claim that we measured engineering hours per gate. Some of the delay was unavoidable safety work; some was repeated revalidation or unnecessary change after an acceptable release.

### Distinguish three different meanings of “done”

1. **Implemented:** the source code or migration exists and may pass tests. Example: V0108 in a PR, a POST signer function, or a Bash installer blob. This does not prove the production system uses it.
2. **Commissioned/verified:** the exact code, restricted credentials, database and policy have been installed and verified with a fresh independent readback. Example: `V0108_EXACT_INSTALLED` with PG16 function ACLs and real read-only census; `P6_G12_PROTECTED_C8_POST_FOUR_STEPS_PASS_PAID_OFF` with a production job.
3. **Operationally observed:** the system has actually performed the future operation. Example: a real paid SOURCE GET and settled charge, cutoff-safe PRE per flight, genuine due POST and expiration/retention of populated records. This cannot be claimed in advance.

Earlier conversations repeatedly confused **candidate CI success** with **production commissioning**, then confused commissioning with **first future data evidence**. A pass at one layer does not certify the next. A further source of confusion: G1–8 were fixed *engineering closeout* categories; G9–14 became the user's fixed **launch acceptance** categories, not six new feature-development tickets. A gate might have its code complete but naturally require a future clock event to demonstrate its intended behavior.

### Six categories of repeated delay

- **Dependency ordering, not just code size:** SOURCE cannot safely issue a provider GET until registered original identity, signed calendar, budget cap, PRE producer, reviewer, expiry controls and runtime approvals are mutually consistent. Changing one digest or main SHA can invalidate other bindings. Thus “just run the script” was often unsafe.
- **Exact SHA/policy drift:** Even a 120-line checkpoint or a docs-only explainer committed to `main` changed `GITHUB_SHA`. Multiple protected secret/variable values were bound to previous SHAs. Re-pinning only one field could break the signed 31-value object or POST policy cross-hashes. Repeated unnecessary main changes created avoidable repair cycles.
- **Two authorization scopes:** Repository Actions secrets and protected environment secrets are separate. Environment values can shadow the repository; GitHub will not return secret plaintext, so names/`updated_at` alone do not establish effective values. The final POST actor was the necessary effective-scope proof.
- **External systems are nontransactional:** A GitHub Actions dispatch ACK, a provider HTTP request, a provider bill, a PostgreSQL commit, and an external clock pulse are separate boundaries. A partial response or timeout cannot be replayed casually. Retention rights, delete receipts and clock cadence are equally distinct.
- **Scientific as-of truth is stricter than ordinary ETL:** A late flight status may be valid for one horizon and invalid for another; estimated/revised departure is not automatically actual gate-out; multiple operating-leg or codeshare identities must not be silently merged. This required independent proof and measured missingness rather than “fill nulls.”
- **Some process churn was avoidable:** The Nov20 register explicitly froze the eight gates to stop adding late NOAA/weather expansion, extra workflows, duplicate provider experiments and repeated migrations. A later code/CI failure from a disconnected weather reader and fixed-airport assumption was isolated rather than changing the frozen design. More post-freeze commits, repeat owner calls and guessing missing approval files would have worsened risk.

The project was not “stuck for weeks because GitHub needed one button.” It involved an unusually evidence-heavy paid prospective study across GitHub, external scheduler, Replit ownership, restricted Neon PG16, provider rights and scientific labels. But the history also shows **the engineering process generated extra work**: moving main unnecessarily, interpreting historical gate wording as current, repeated policy repins, and claiming a green dry-run meant the experiment was ready. The corrective software-engineering practice is to preserve exact SHAs, separate historical vs current claims, use one acceptance receipt per existing gate and make each new failure an *identified subcase* rather than opening more gates.

## 12. Detailed gate-by-gate casebook: real fixes, files, tests, lessons and failure modes

### Gate 1 — PRE producer and feature-policy custody, why it was difficult

**The original gap:** The project already had a SOURCE reader and PRE writer, but **a standalone normal SOURCE child could not simply assert the credibility of its own model features**. A valid PRE record needed an original provider observation, an independently verified transformation/reference policy, a stable operating-leg identity, an immutable flight-specific scheduled T, and a sufficiently early observation + commit clock. Several important source fields were present yet their legal/technical transformation route had not been independently reviewed.

**Engineering progression:** The Nov20 PRE checkpoint describes a genuine SOURCE original/member **independent reread**, 16-field selector completeness, exact field/rights digests, independent lane-authority signature, separate PRE proof, atomic signed publication, and a private local Unix socket handoff on the same ephemeral runner. Code introduced or revised in that sequence includes protected source reread, scoped signer and publication facilities; related checkpoint examples: `562f05d1…` exact member reread, `866fc630…` provider/field proof, `4967c657…` separate PRE receipt domain, `f3117818…` Stage14 cutoff/staleness, `8f489761…` atomic 96-permit page publisher, `88a8e0f9…` same-runner bounded IPC, `9becc712…` connect real SOURCE child to independent producers, `62431885…` prevent full-width operating-leg identity conflicts. These are **historical component commits**, not currently pinned release heads; see [PRE producer history](2026-11-20_PRE_EVIDENCE_PRODUCER_AND_LAUNCH_GATES_NO_GO.md) and [private handoff/identity history](2026-11-20_PRE_AUTONOMOUS_PRIVATE_HANDOFF_AND_FULL_WIDTH_IDENTITY_NO_GO.md).

**Why it took time:** The project had to separate **data presence** from **data admissibility**. “Present flight status” is not equivalent to “field legal/available at horizon cutoff, same operating flight, independently authenticated.” The private transport had to prevent signed permits/keys from landing in public Actions logs or artifacts, yet be efficient: each independent SOURCE-reading role batch-reads one original per 96-permit page instead of a request per item. The same-runner model is a scoped credential boundary, **not** isolation against a compromised runner. One code iteration failed TypeScript nullability checks (TS18047) and required a strict narrowing correction without relaxing correctness. Rights review also disallowed deleting essential identity/timestamp fields merely to pass a derived packet policy.

**What exactly counts as verified:** The Nov22 owner checkpoint reports production source auth bound to `795ace55…` and 13 noninjective status transformations, plus reviewed restricted roles. **After launch**, a PRE is valid only with source/member/clock/flight/cutoff proof. A passing candidate test or empty table does NOT guarantee on-time PRE in production.

**Expected failure signatures:** `HOLD_P6_AUTO…` is a *control* exception, not a PRE; a writer `permission denied`/`EXECUTE` ACL refusal, invalid `manifestSha256`, absent original, conflict in same operating leg/codeshare, source `available_at` after T−6/T−90, expired original or incorrect preview digest are legitimate stop/censor outcomes. For an unavailable optional weather feature, the correct output is explicit `missing` and a separate coverage count, not a copied late value. A **real** PRE failure record needs exact source/original ID in *private* custody and sanitized public counts only.

### Gate 2 — POST reviewer and actual gate-out truth, why there was no simple label

**The original gap:** The dataset needs a **continuous actual gate-out delay** target for Amendment E, but the provider’s general scheduled, revised, runway and “Live” fields are not automatically an independently proven actual gate-out pair. The earlier POST path also needed a real role-separated connection from SOURCE+PRE custody to independent reviewer, signed settlement, restricted publisher and storage—without publicly exposing full flight packets.

**Engineering progression:** The existing independent POST signer [`phase7IndependentPostSettlementIssuer_v39.ts`](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/server/lib/disruption/phase7IndependentPostSettlementIssuer_v39.ts) rereads an authentic committed original and scoped PRE group. The [private POST handoff](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/server/lib/disruption/phase7LocalPrivatePostHandoff_v39.ts) uses bounded local IPC; the [V0083 protected workflow](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml) separates actual signed paid child from no-provider actor tests. Historical commits `df08d448…` (censoring signer), `73f3f50…` (normal POST connection), `aca2d0d…` (strict TypeScript narrowing) are explained in [fixed eight-gate register](2026-11-20_FIXED_PHASE6_LAUNCH_COMPLETION_REGISTER_NO_GO.md).

**Why it took time:** It was genuinely safer to store **null + verified censoring** than invent an actual outcome. Real “all-censored” tests cannot establish that the future ML continuous label will have adequate coverage. CI also exposed an initially invalid synthetic fixture using identical placeholder digests, correctly rejected by the custody envelope; the fixture was corrected rather than weakening trust checks. Actual protected POST at an earlier SHA failed because the approved code secret/policy chain did not match current main; **repository** readback alone could not prove a protected **environment** actor.

**Verified receipt:** [45125753815](https://github.com/HKcode22/ReplitTranvr/actions/runs/45125753815) required all four effective-scope steps SUCCESS—disarmed POST admission, independent reviewer, restricted publisher+deadline, independent storage. The actual paid POST child was skipped, which is correct before GO.

**Day1 symptom map:** A protected `Verify exact disarmed POST actor admission` failure indicates **wrong SHA/STOP/role binding**; later reviewer/publisher/storage steps will be SKIPPED, not three independent failures. A POST workflow itself may SKIP because its due time has not arrived. `ACTUAL_GATE_OUT_NOT_ATTESTED` should map to label null/censored, not “on time.” A real race with prior POST ACK uncertainty is a no-replay HOLD until independent settlement.

### Gate 3 — V0108 retained Contents and expiry: SQL, clocks, rights, race conditions

**The original gap:** The Phase 6 SOURCE/PRE/POST pipeline temporarily needs full IDs and timestamps, but provider Contents cannot be treated as a permanent archive. It also needs reliable deletion/expiry without accidentally deleting an in-flight packet required by PRE or POST. The existing V0105 metadata profile was insufficient to classify all signed private metadata and review/fence shapes.

**Engineering progression:** V0106/V0107 candidate shape and deadline rules progressed to V0108 for private epoch status/sweep. Relevant SQL and helper: [`V0108__phase6_private_operational_metadata_expiry_class_v39.sql`](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/migrations/staged/V0108__phase6_private_operational_metadata_expiry_class_v39.sql) and [`v39_phase6_v0108_owner_once_v39.mjs`](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/scripts/v39_phase6_v0108_owner_once_v39.mjs). Production owner readbacks require exact function `search_path` and `lock_timeout=3s` in `pg_proc.proconfig`, restricted ACL and no unresolved deletion STOP. The external primary relay drives [bounded FIDS/Phase7 expiry](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/.github/workflows/phase5-primary-fids-expiry-no-provider.yml).

**Why it took time:** A focused test discovered an actual mismatch in owner SQL function config verification (search_path vs lock_timeout array); PR/test corrections followed without altering existing data. Two owner install attempts failed before DB action because a required GitHub variable `P6_PRIVATE_EPOCH_DEADLINE_PROFILE` was not set and a shell fallback accidentally captured the **raw HTTP 404 error object** as nonempty value. This is why a command saying “profile exists” would be an unsupported guess. Later owner migration executed once, fresh PG16 session verified `V0108_EXACT_INSTALLED` and true function grants. See issue #413 history around [Gate3 owner receipt](https://github.com/HKcode22/ReplitTranvr/issues/413#issuecomment-7077803937) and [Gate3 closeout](https://github.com/HKcode22/ReplitTranvr/issues/413#issuecomment-7077829527).

**Nuance:** V0108 **due-only** physical sweep is not universal 60-minute-early deletion. A 23h early FIDS future-POST safety option has different semantics from a 24h hard content deadline; a signed index may have even stricter custody. A zero-due production census (Nov22) cannot test deletion performance on a populated study. SQL timeout reduces lock risk but a timeout itself signals a job that did **not** finish. Neon recovery/PITR should be reviewed within applicable rights; restored expired source must be quarantined and re-expired, not replayed as future prediction data.

**Expected errors:** `V0108_EXACT_PREDECESSOR` vs `V0108_EXACT_INSTALLED`, `UNREVIEWED_EXPIRY_PROFILE`, `INVALID_PROFILE_VALUE_SHAPE`, missing `pg_proc.proconfig`, `lock_timeout`, `permission denied for function`, `SCHEDULE_APPROVED_MAIN_DRIFT` and skipped jobs, `BACKSTOP_CHILD_NOT_SUCCESSFUL`, `BACKSTOP_CHILD_STEP_STALE`, due packet/index count greater than zero and `deletion` STOP incidents. **A green but skipped job does not run the sweep.** If an actual due object is unreconciled, future paid acquisition must HOLD even if the heartbeat itself is later green.

### Gate 4 — exact code review, why CI green kept “moving”

**Original work:** Merge only reviewed SOURCE/PRE/POST/retention changes, pass focused tests and complete offline safety, ensure production exact `main` is not accidentally different from compiled policies. The Nov20 register includes candidate SHA, exact PR head and demonstrated passing/failing run counts. We had GitHub PR #926 and related narrow gate-dependent corrections.

**Why it took time:** The code changed after a previously green run, invalidating that run as evidence for the **new exact head**. CI raised a true TS18047 nullable TypeScript error, a false fixture with placeholder digests, source routing bugs and a deferred NOAA archive candidate with an incorrect assumption that the four daily airports were fixed (ordinary draw days are adaptive). The correct repair was to fix the exact executable bug or defer optional expansion, **not** change the frozen scientific cohort or open new gates. A later PR/branch's successful disposable PG16 test still did not prove installed production SQL or GitHub secrets.

**What “SHA freeze” actually enforces:** A Git commit hash covers the **whole tree** and metadata. Even adding an explanatory Markdown file to `main` changes the SHA and fails some actions' `GITHUB_SHA == APPROVED_SHA`. Accidental commit `0369f88…` briefly did exactly that; production was already reset to c8 before this correction. Repeated code/secret repins after arbitrary docs edits create configuration churn. Today's current approved main is c8. The correct place for this guide and helper is the evidence branch.

**Symptoms:** `wrong SHA`, `GITHUB_SHA` mismatch, required CI incomplete on new HEAD, test/ESLint failure, drift between compiled policy and signed digest, or GH run on temporary `0369` despite current pinned c8. **Do not “fix” by enabling arbitrary `main` SHA or hard resetting owner's local workspace.** Independently establish Git ref and exact diff, then use reviewed release procedure if genuinely needed.

### Gate 5 — calendar geometry, provider range, seven budget categories

**Original work:** Place the already-frozen 31 parent batch-days and six UTC rotations in the existing PG16 stage with no paid API. The matched study compares five pairs under control and alternative temporal sampling geometries. The plan requires a 24h washout between repeated airport windows' **END and next START**, not between their starts.

**Why it took time:** The initial date solver produced an **SKBO 22-hour violation** for reused HUB across pairs; a pre-outcome airport review also replaced **KTEB with KBUF** while preserving nineteen of twenty matched airport-slot assignments. A naïve “31 consecutive calendar days with same four airports” or “five US hubs” invalidates the actual sampling/crossover and future adaptive draw. Source-range partitioning across 4h vs split 2+2h with excluded 60-minute gap vs up-to-6h requires separate provider GET templates and physical UTC billing bins. Earlier budget candidates were not all equivalent; the approved Monday design is 6,144 templates / 36,740 reserved REST units with strict 1,900/day cap and separate Alert floor.

**Real code:** [`experimentCalendarSolver_v39.ts`](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/server/lib/disruption/experimentCalendarSolver_v39.ts), [`phase5F8CrossoverCalendarFreezeGuard_v39.mjs`](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/server/lib/disruption/phase5F8CrossoverCalendarFreezeGuard_v39.mjs), [`phase5F8SegmentedSourceCoverage_v39.mjs`](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/server/lib/disruption/phase5F8SegmentedSourceCoverage_v39.mjs), [`phase5V0082SevenCategoryFreezePacket_v39.mjs`](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/server/lib/disruption/phase5V0082SevenCategoryFreezePacket_v39.mjs). The production owner stage now reports the exact signed manifest and disabled-state approval.

**Errors to expect:** `FOUR_AIRPORT_DRAW_NOT_VERIFIED_HOLD`, invalid manifest/hash/rotation, unknown UTC timezone classification, split-gap incorrectly considered sampled population, plan cost exceeding a physical UTC-day cap, recorded flight under an airport not signed for that day, washout violation, missing approved daily shard, or mismatch between source hash and source-enable row. These reject or quarantine a *day/partition*, not permission to invent substitute airports.

### Gate 6 — why six policies and 31 values were harder than setting environment variables

**Original work:** Install/verify exact reviewed policy data while keeping both global paid STOP secrets OFF. Six runtime policy families and 31 canonical values bind main code, SOURCE, signing/reference rights, POST, budgets, days, retention, and source-to-derived preservation. GitHub Actions **repository** vs protected **environment** secret scopes are distinct.

**What actually happened:** Owner had an existing encrypted/sealed policy successor; we proved 31/31 canonical repository values and linked digest **without leaking the secret bytes**. A first owner installer assumed that both paid STOP names were repo-only; the real owner name-only inventory proved **11 relevant secret successors repo-only, 2 global STOP names present at both repo and protected environment**. That incorrect assumption caused a fail-closed prewrite HOLD, not lost credentials. A prior SHA repin operation encountered HTTP 502 after part of the variable updates; rather than blindly rerun, owner performed read-only exact-scope checks and confirmed both current values. Later owner G12 was **one-use**; retrying produced `HOLD_P6_G12_OWNER_CODE_SUCCESSOR_ALREADY_ATTEMPTED_DO_NOT_REPEAT`. Its repository readback [45123278530](https://github.com/HKcode22/ReplitTranvr/actions/runs/45123278530) passed, but the protected POST job [45123332394](https://github.com/HKcode22/ReplitTranvr/actions/runs/45123332394) initially failed because effective environment `V39_P5_POST_APPROVED_CODE_SHA` was older than repo scope. A narrow protected-only SHA repair (no paid GO) followed; real four-actor [45125753815](https://github.com/HKcode22/ReplitTranvr/actions/runs/45125753815) finally passed.

**Important engineering lesson:** A secret’s *name* proves existence, not plaintext validity; an updated repo value does not override an existing protected environment value. A 31-value policy installed for one SHA is not magically valid at the next docs-only commit. Use authenticated exact code-bound independent readback. **Do not change the six policies, G12 credentials or code SHAs merely because this educational guide is updated.**

**Symptoms:** `HOLD_P6_G8_OWNER_SEALED_EXACT_REPO_SECRET_SCOPE_NO_SHADOW`, `HOLD_P6_G12_OWNER_CODE_SUCCESSOR_ALREADY_ATTEMPTED_DO_NOT_REPEAT`, protected `Verify exact disarmed POST actor admission` fail, missing mandatory secret *name* or bad readback digest, incorrect repo+environment paid STOP shadow. Differentiate these from an actual incorrect source API value.

### Gate 7 — clocks, heartbeats, external relay and why “green cron” was misleading

**Original work:** Prove signed autonomous workflow admission and external transport, with no provider calls and no paid GO. The code has a metadata-only [controller heartbeat](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/server/lib/disruption/phase6AutonomousGithubControllerHeartbeat_v39.mjs) and runner [`v39_phase6_github_controller_heartbeat_v39.mjs`](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/scripts/v39_phase6_github_controller_heartbeat_v39.mjs). Its native cron is `7,37 * * * *`, a **30-minute diagnostic**, not a source or retention scheduler.

**Why it took time:** GitHub native scheduled work showed **hundreds of minutes between recorded run creations** on some lanes; historic gaps are data, not simulated reliability. The detached `HKcode22/TravnrClockRelay` with external managed crons provides independent wake/forward/backstop. Early heartbeat implementation falsely looked only for `P5 PRIMARY BACKSTOP CHILD` and assumed the expiry workflow had one job; real relay used `P5 FULL RETENTION BACKSTOP CHILD` and two jobs (primary FIDS + Phase7). We changed lookup to accept both correct run titles and select jobs by **exact name**, not list index, and tolerate a genuinely recent independently verified current-main executed backstop *without claiming physical deletion*. Later code drift briefly caused relay to send to an old target SHA, fixed by one authorized target-pin update; green relay status alone was never sufficient.

**Current new incident:** At 2026-11-23 09:41Z, scheduled heartbeat [45149342374](https://github.com/HKcode22/ReplitTranvr/actions/runs/45149342374) failed. Its log proves `PRIMARY_FIDS_EXPIRY` state `SCHEDULE_APPROVED_MAIN_DRIFT`: repo Actions variable `P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA=0369f88…` while exact main `c8e065…`. The latest backstop [45143813850](https://github.com/HKcode22/ReplitTranvr/actions/runs/45143813850) was **both jobs SKIPPED**. `P7_EXPIRY_APPROVED_MAIN_SHA` is also required to equal current main for full backstop (not readable through the GitHub connector; the owner script checks it). The heartbeat's `P6_HEARTBEAT_COLLECTION_EXPECTED=false` means PRE/SOURCE native gaps are reported diagnostically without a paid incident, but **primary expiry is enabled even before GO**, so its wrong pin is genuinely actionable.

**Safety repair, NOT code weakening:** Verify production main and relay exact, original Actions approvals, the variable values, and no G9/direct or G13 activation; rewrite **only** a pin that equals the accidental `0369` to approved `c8`, not some unknown new value; verify readback; run a real existing **no-provider due-only** full-retention backstop and verify that both primary/Phase7 jobs actually executed; then run a fresh **read-only** heartbeat. This remedy needs owner-authenticated Replit `gh` because connector does not provide variable write API. The prepared [SHA-pinned repair helper](p6_20261123_reconcile_expiry_pins_c8_and_verify_heartbeat_no_provider.sh) does exactly this, with code hash `6b3b2ffa497e593a285f811a72b20fe3613eae31`. **Prepared, not owner-executed**, so do not call the heartbeat fixed yet. It does not mutate any paid GO secret or main; full backstop can perform lawful **due-only deletion writes**. It holds after 21:50Z, on any unrecognized pin, disabled rights/expiry mode, wrong relay SHA or failed job readback.

**Failure signatures:** `SCHEDULE_OBSERVATION_STALE` for delayed native GitHub cron, `BACKSTOP_CHILD_NOT_SUCCESSFUL` for a skipped/failed external target child, `SCHEDULE_APPROVED_MAIN_DRIFT` for SHA var mismatch, `NO_SCHEDULE_RUN_ON_CURRENT_MAIN` for stale SHA or absent current-run, `P6_CONTROLLER_CURRENT_INCIDENT_REVIEW_REQUIRED` and process exit 2 for real unmitigated incidents. A successful manual heartbeat may still print `AUTONOMOUS_GITHUB_CONTROLLERS_NEED_ATTENTION_NO_GO` in **report JSON** because historical schedule gaps remain; the **actual process exit and active incident count** distinguish the successful nonpaid diagnostic from an unmitigated active retention incident. Do not assume exit 0 proves real provider collection.

### Gate 8 — SOURCE admission versus monetary GO, and why this took many sessions

**Original gap:** Valid source code, calendar and database rights did not prove an authenticated **current-main** approval chain. The original source authorization and public 31-value policy were individually valid but SHA-bound linked code, nested later policy, native POST and transport preservation digests could become inconsistent after code/doc releases.

**Engineering sequence:** Owner installed the existing SOURCE enable/manifest in `clean.adb_phase6_authorization` and owner protected runtime values. We reduced Gate8 to read-only exact source identity, final policy/source SHA rebind and repository+protected effective STOP checks; no new migration. Some attempts failed before writing because an earlier owner-local `auth.json` path had moved, or because source SHA and linked transport digest did not match the new main. Rather than reinstall Stage5 or regenerate keys, actual signed source policy bytes were recovered through authenticated sealed custody and linked digest readbacks. `31/31` in [45123278530](https://github.com/HKcode22/ReplitTranvr/actions/runs/45123278530) means all **policy settings**, not 31 days acquired. [Issue #413 Gate8 evolution](https://github.com/HKcode22/ReplitTranvr/issues/413#issuecomment-7079470438) explains why “policy file missing” was not “source rights gone.”

**Result:** Nov22 owner readback records `sourceAuthorizationEnabled:true` with disabled paid STOP controls; Nov23 independent G12 effective POST completed. SOURCE enable is a **scoped signed authorization**, not owner consent to spend. If a later code commit invalidates policy SHA, do not just flip `V39_PHASE6_PROCESS_ARMED=1` to bypass it.

**Expected errors:** `SOURCE_POLICY_SHA_DRIFT`-type refusals, `repositoryCodeAndPolicyBindingReady=false`, missing historical local owner artifact, false `NO_GO` when relying on an old snapshot, or a 31-value readback success but protected POST failure. Each requires an exact readback at the correct scope; repeating a paid SOURCE GET is never a repair for a policy mismatch.

### Gate 9 — after-GO external DIRECT_TICK switch

**What took time:** The existing relay could be safely **future-staged** under `DIRECT_VERIFY` and an approved first epoch without actually waking SOURCE. A future `since` timestamp is invalid if exposed as a currently active direct clock. Turning DIRECT_TICK on early caused historical `HOLD_EXTERNAL_CLOCK_MODE_CLOCK`/`DIRECT_RECOVERY_ACTIVATION_INVALID`; the correct engineering solution was future stage **without** direct approval, then one separately guarded after-GO route switch at/after 23:45Z. The original helper pauses only the rolling lane during the change and restores it last, leaving the independent PRIMARY_BACKSTOP untouched.

**Required proof:** Owner G13 ledger PASS, current c8 and c5, exact signed first-allowed timestamp and no stale relay environment shadow, then after-GO helper exact blob `6871236a9743b3b84f978c9e3cd9042b2aff2161` returns `P6_G9_DIRECT_TICK_EXISTING_EXTERNAL_LANE_ACTIVATED_AFTER_EXPLICIT_G13_GO`. **It does not make a provider GET itself.**

**Failure:** `HOLD_EXTERNAL_CLOCK_MODE_CLOCK`, `DEFER_OUTSIDE_OR_LATE_POLICY_WINDOW` before legitimate window, `DIRECT_RECOVERY_PIN_DRIFT`, target SHA mismatch, loop/duplicate attempt or relay ACK without signed target execution. Never “fix” by advancing current time, changing the original SOURCE window or directly editing approved G13 flags.

### Gate 10 — protected target ACK after actual relay pulse

**What took time:** A relay may report `success` because it emitted an API dispatch and received the **target run ID**—but this does **not** mean the protected workflow admitted it, a worker executed, a provider GET happened or the parent closed. We needed the exact target code/head, environment admission, child/parent status and separate outcome. This was also why an external target pin pointing to b432 rather than c8 had to be reconciled.

**Actual code:** [`phase6-direct-recovery-tick.yml`](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/.github/workflows/phase6-direct-recovery-tick.yml) and the existing detached relay `relay.mjs`. Gate10 remains a **future operational acceptance**, not a missing implementation before G13.

**Symptoms:** relay success plus target skipped; target on wrong SHA; protected admission refused; parent reported `SAFE_PREFLIGHT_HOLD` or `MISSING_EVIDENCE`; target run ID absent; job pending past actual cutoff. Record external run ID and target run ID, then inspect **both jobs and exact steps**; do not claim acquisition from the ACK.

### Gate 11 — why “we already checked quota” must be repeated just once near GO

**What was proven:** Owner free account snapshot on Nov22 14:07Z showed **59,968 REST units**, **1,830 Alert credits**, no active billable subscriptions and 3 free metadata GETs. Signed budget is 36,740 reserved REST units, with 1,000 separate Alert floor. Those numbers were factual *at that time*, not a permanent promise.

**What takes time:** Provider balances may change through unrelated usage, renewals or drift. Daily seven-category physical UTC reservations have to fit 1,900/day cap and project horizon, and REST units cannot be substituted with Alert credits. The original G13 helper invokes the pinned G11 free metadata plus PG16 read-only census in its own auth window; historical 59,968 is not a substitute. “Run it again” should mean **fresh bounded metadata** during the approved G13 transaction, not paid trial flights or repeated subscription discovery.

**Symptoms:** REST remaining below 36,740, Alert below protected 1,000, unauthorized active subscription, billing mismatch, wrong owner account or quota/plan state, inconsistency between provider units and signed budget. **Result = G13 HOLD and no paid authorization**. Do not automatically refill or change the 31-day study to make these pass.

### Gate 12 — rights/expiry and exact 31-value + protected actor admission

**What took time:** Historical G12 originally grouped lawful provider rights, 7-day recovery-only PITR review and V0108/dual-retention safety. After the c8 documentation/heartbeat SHA changes, the remaining **exact-code policy and environment-protected POST binding** was repaired under the same launch acceptance scope. Both were real, not additional gates. Owner's first protected POST attempt failed at step 1 despite green repository settings; private environment-approved code SHA was older. Corrected with one explicit protected-only SHA repair *after asserting both paid controls OFF in both scopes*.

**Current proof:** Repository canonical G12 [45123278530](https://github.com/HKcode22/ReplitTranvr/actions/runs/45123278530) PASS, protected disarmed reviewer/publisher/storage [45125753815](https://github.com/HKcode22/ReplitTranvr/actions/runs/45125753815) PASS. Real raw provider data and actual outcome truth were intentionally not required from an actor-only test. Production fresh V0108 expiry/deletion census remains part of G13's G11/12 live safety check.

**Symptoms:** `policyApprovedCodeMatchesMain=false`, `repoSourceCodePinMatchesMain=false`, old environment SHA shadows, code/source manifest mismatches or real deletion STOP. Do not try to “fix” by disabling authorization checks or replaying the G12 one-use envelope.

### Gate 13 — explicit owner GO, four effective control writes and one-use semantics

**Why it is intentionally still pending:** A signed paid month requires a **fresh user-origin decision** after preflight, not an inference from past authorization for engineering tests. Exact original owner command is prepared and validates Monday 21:50Z–strictly <23:10Z, current main/relay, verified G12, G11 fresh free-account+database, previously staged disarmed route, original signed budget and authentic confirmation.

**How it works:** G13 first checks it has not already been attempted, then updates *two effective paid STOP values* (`V39_PHASE6_PROCESS_ARMED` and `V39_PHASE6_OWNER_APPROVED`) at *two scopes each* (repository + `phase6-protected-runtime` environment), totaling **four GitHub secret writes**. The helper checks API acknowledgements and records authenticated owner GO in issue #413. These four writes are **not an atomic DB transaction**: network fail after the second does not prove all flags zero or one. Helper attempts rollback STOP0 on partial fail and refuses a blind rerun; independent owner inspection is necessary.

**Why it took time:** Multiple earlier docs/heartbeat main commits changed SHA secrets; some recovery helper attempts encountered HTTP 502 and unknown partial state. The final release helper was pinned to c8 and tested against original G12 proof and new protected SHA. We intentionally did not run it early merely to obtain a green Action—**the signed time window matters**.

**Symptoms:** `HOLD_P6_G13…` or equivalent time/SHA/owner/quota/expiry refusal, repo/env secret write 4xx/5xx, issue ledger write failure or half-armed state; no printed success token = **NO CONFIRMED GO**. Do not manually set secrets to 1, delete one-use marker or rerun on uncertainty. Report exact sanitized STOP reason and independently confirm effective scope.

### Gate 14 — genuine first flight evidence and a scientifically usable study

**Why no amount of development could close it yesterday:** The signed first SOURCE epoch is **Nov23 23:45Z**, after the future owner GO. Before that, a green controlled test has **0 genuine prospective flight observations** for this episode, regardless of synthetic tests or prior Phase5 examples. This gate is not a missing software feature.

**What to measure:** One approved source parent/child with current signed day/airport/time selection, exact physical provider GET attempt and response/bill/usage receipt, stored original + query/response digests, normalized same operating-leg population; per-flight `available_at` and committed PRE before T−24/T−6/T−90 cutoff; independently due POST and its actual-only label tier; provider costs and expiry. Every count must have denominator and clock.

**Why hard:** The provider can legitimately return zero flights. A source request may be charged but timeout without a bound original. One flight can have valid SOURCE but no PRE; valid PRE but no eligible actual gate-out; T−6 available and T−24 absent. A failed request must not be automatically replaced with a successful flight picked later. These subtleties determine whether Phase7 supervised evaluation has enough primary outcome data.

**Failure example:** `providerCalls=0` with a green relay is **control-plane only**; physical GET acknowledged but no original means **billing/provenance incident**; original received but after T−6 means **late/censored PRE**, not total run failure; all POST numeric gate-out missing means **continuous supervised primary currently unevaluable**, not a completed positive prediction.

## 13. Day 1 operations: what real failures LOOK LIKE in GitHub, database and science records

**First principle:** A GitHub `conclusion` value describes a **job or workflow**, not scientific validity. A `skipped` target job can be an intentional safety stop. A `success` nonpaid heartbeat can report historical GitHub cron gaps; a `success` relay can merely dispatch a target; a source query can complete with empty population. Classify by *which layer* failed.

### Practical triage matrix, safe next action and salvage rule

| Visible symptom / exact string (if code provides it) | Where to look | Interpretation | Safe action | Salvage |
| --- | --- | --- | --- | --- |
| `SCHEDULE_APPROVED_MAIN_DRIFT` | Nonpaid heartbeat JSON `primaryFidsExpiry.state` | Approved expiry variable != exact executing main. Latest expiry jobs may SKIP entirely | Check live main SHA, two *repository variable* values, actual expiry run/jobs. Use only scoped current-main repair if exact accidental previous value | Restores future retention execution; does **not** repair a missed deadline retroactively |
| `BACKSTOP_CHILD_NOT_SUCCESSFUL` | `primaryFidsExpiry.backup.state` and target full backstop job | Last external forwarded full-retention child was skipped/failed, so no actual sweep step | Inspect both `primary-fids-expiry` and `phase7-expiry` job `conclusion`, underlying pin and actual `Verify exact main…` step; do not treat relay success as target success | If zero due source and safe restored, future days unaffected; unresolved due objects are hard STOP |
| `SCHEDULE_OBSERVATION_STALE` | Controller lane history with ``lastRunAgeMinutes` | GitHub native scheduler has delayed/missing scheduled run | Compare external current-main relay ACK/target independently; never infer a flight was collected | A missed pre-cutoff cannot be recovered afterward |
| `DEFER_OUTSIDE_OR_LATE_POLICY_WINDOW` | External ROLLING_ROOT pre-GO | Correct disabled pre-first-epoch state, not source failure | No action before G13/G9; don't turn DIRECT_TICK on early | No missing sampled data necessarily |
| `DIRECT_RECOVERY_ACTIVATION_INVALID` / `HOLD_EXTERNAL_CLOCK_MODE_CLOCK` | Relay/controller after a **future** since time was made active too early | Guard blocked a time-inconsistent routing configuration | Restore original disarmed route under exact owner procedure; never trick clock | No historical PRE backfill |
| `GITHUB_SHA` / approved code mismatch | Protected target admission step or retention job condition | Wrong commit/variable or environment secret shadow | Inspect exact main, GH job SHA, variable name vs effective scope and 31-policy readback; isolate docs commits off main | Only unaffected signed future source windows eligible |
| Workflow `success` but `primary-fids-expiry` and `phase7-expiry` SKIPPED | Full-retention target workflow | Whole workflow may be classified success/skipped while **no retention job actually executed** | Need actual named job + bounded due-only step success; check scope pin and signed mode | Never claim deletion or TTL compliance |
| `permission denied` / `function ACL` / `search_path` / `lock_timeout` | PG16 restricted PRE/POST/expiry job | Role grants or installed function config not as signed | Fail closed, restricted owner readback; do NOT run migrations as a routine fix | Later valid days may resume only after verified production profile |
| `SOURCE_LOSS_OR_LATE_OBSERVATIONS_REVIEW_CENSORING` | Restricted source-day QA `day1SourceSafetyReview.status` | Some GET windows missed or original late/expired; proof and denominator must be examined | Track planned/reserved/bound/late by slot+horizon; no retrospective PRE | Partial valid flights/horizons may remain eligible |
| `FOUR_AIRPORT_DRAW_NOT_VERIFIED_HOLD` | Source-day QA and signed airport early draw | Daily slot/airport allocation not authenticated as four distinct signed slots | Isolate day/shard, read signed manifest/selection receipt; no redrawing after seeing results | Unaffected signed later days may remain eligible after shared integrity resolution |
| `HARD_LEDGER_OR_BUDGET_HOLD_NO_FURTHER_DISPATCH` | Source QA / safety watchdog | Budget/accounting counters inconsistent or hard ceiling/physical GET proof contradicted | STOP further paid traffic; reconcile provider usage, pending/blocked batches and physical UTC units | Shared STOP blocks later days until signed resolution |
| `SOURCE_ATTEMPTS_NOT_MATURE_NO_OUTCOME_INFERENCE` | Day1 QA | No eligible physically attempted SOURCE yet, too early to claim failure or success | Distinguish never due, pending, queued, attempted, no original | Not evidence of successful or failed flight prediction |
| `DESCRIPTIVE_SOURCE_PROGRESS_NOT_SCIENCE_PASS` | Day1 QA | Observed source progress without certifying full PRE/POST scientific target | Require original same-flight per-cutoff and qualified outcome reviewer | Keep only legitimate records; don't label the month done |
| Original response received, but `available_at` > T−6 | Private PRE producer / Stage14 admission | Observation late for T−6, **even if** paid GET succeeded | Mark T−6 missing/censored; evaluate T−90 independently if before its cutoff | T−90 may be valid but T−6 is irreparable |
| Provider `504` / timeout / partial HTTP receipt | Physical GET/usage and queue ledger | Unknown whether bill charged and whether provider response committed | Quarantine request; reconcile `physical_attempt`, charge, response/original and lease before retry | Other flights/windows independently eligible if hard STOP absent |
| Source row exists but no POST numeric gate-out | Independent POST reviewer | An estimate/revised time is not physical actual gate-out | Record actual-only label `unknown/censored`; wait only when legitimately `not_due` | SOURCE/PRE counts usable; continuous labeled sample may be 0 |
| Gate13 `HOLD` or G13 command deadline missed | Owner Shell / issue #413 | No valid bounded month-wide paid GO | Do not flip flags or rerun one-use owner command; needs reviewed prospective new authorization if window missed | Original Day1 first epoch not magically salvageable |
| Gate13 passed but no G9 external target ACK at first epoch | Owner G13 ledger + relay + target run jobs | Authorization exists, automation route not yet verified | Check external/target run identity and existing guarded recovery; no blind worker/provider dispatch | Valid future windows only; missed cutoffs stay missing |
| Valid SRC/PRE/POST with wrong code/flight/manifest | Private lineage/custody/signer | Cross-scope or data-integrity violation | Isolate, hold, preserve minimal audit; independent reviewer decides | Cannot relabel to a different operating leg |
| Expiry `due>0` or `deletion STOP>0` | PG16 source/retention status, PRIMARY/Phase7 expiry | Real retention incident, not a cosmetic monitor fail | STOP paid acquisition until due-only disposal and backup obligations settled | Other days *cannot* bypass shared lawful retention STOP |
| GitHub job cancelled or marked `timed_out` | Specific job rather than aggregate workflow | Partial external effects possible, even if job result not success | Reconcile actual DB and provider receipt; no blind retry | Data validity depends on real source clocks and cutoff, not job retry count |

### What a healthy Day1 success should look like, by stage

**Phase A (before 21:50Z):** Canonical main c8 and detached relay c5, G12 repo 31-value and protected four-actor PASS, global paid STOP OFF, no manual G13/G9; actual external PRIMARY retention target execution and no unresolved due/deletion issues. A scheduled heartbeat can legitimately show historical cron gaps; it should not have a *current* mismatched approved-main variable or skipped most recent full-retention child.

**Phase B (21:50Z–strictly <23:10Z):** Only owner runs exact G13 Command2, internally fresh REST/Alert provider metadata and production PG16 read-only expiry census PASS, then four scoped secret write ACKs and issue #413 owner GO ledger. G13 success string is `P6_G13_EXPLICIT_OWNER_GO_4_SCOPE_WRITES_ACKNOWLEDGED`; no such string means no confirmed launch authority. A workflow icon for yesterday's G12 is not a substitute.

**Phase C (at/after 23:45Z):** Existing G9 Command3 succeeds only after G13; real external ROLLING_ROOT DIRECT_TICK forward returns new target run ID, actual G10 protected target job records correct code/entry and signed queue disposition. Verify next parent/child SOURCE and actual provider response separately; green relay alone is not acquisition.

**Phase D (genuinely paid SOURCE):** A privacy-safe report includes physical REST attempt and billed-unit reconciliation, bound provider original and response digests, normalized operating-flight population and signed selected-day/slot/horizon. Flight identities and provider response contents remain PRIVATE. Do not expect exactly 192 rows or 128 billed units: the provider may return many, few or no flights.

**Phase E (PRE per flight):** Eligible/on-time/missing/not-yet-due counts for T−24, T−6, T−90, each with original scheduled T and two-clock evidence. A late T−6 does not invalidate an on-time T−90 and does not become T−6 retroactively. No unplanned airport or time-window redraw.

**Phase F (POST and end-of-day control):** Once genuinely due, independent POST reviewer publishes qualified actual gate-out minus scheduled-gate-out **if proven**, else explicit missing/censor. Budget by physical UTC day ≤1900, no unresolved billed/lease/fence, no unlawful retention or due deletion. Record whether Day2 can proceed independently, and *why*. Raw source data, tokens and full flight identities must not appear in public issue/Actions logs.

### Example incident chronology (hypothetical — not a claim a run actually did this)

~~~text
15:45 PST  Signed SOURCE query due
15:46 PST  Target GH Actions parent green; child sent physical GET
15:47 PST  Provider connection timed out; no saved original
15:47 PST  Bill/charge state UNKNOWN, not zero
15:50 PST  Queue child must HOLD/SETTLE exact existing physical attempt
Later       Independent provider usage proves billed or not billed
Later       If approved query cutoff already passed, mark missing; never pretend
            a subsequent response was available at 15:45
Day2        Original signed schedule may proceed ONLY if shared budget/rights/
            deletion/unknown ACK STOP has been resolved
~~~

The **wrong** “recovery” would be to issue a new paid GET for the old 15:45 snapshot and mark it as on-time. The **right** recovery is to preserve the first physical attempt, reconcile its provider charge and source original, record horizon-specific missingness, and let only still-eligible prospective windows proceed.

### Safe metadata-only GitHub inspection (no new workflow/paid requests)

~~~bash
cd ~/workspace
gh api repos/HKcode22/ReplitTranvr/git/ref/heads/main --jq '.object.sha'
gh api repos/HKcode22/TravnrClockRelay/git/ref/heads/main --jq '.object.sha'
gh run list --repo HKcode22/ReplitTranvr \
  --workflow phase6-autonomous-gh-controller-heartbeat-no-provider.yml \
  --limit 6 --json databaseId,createdAt,status,conclusion,headSha
gh run list --repo HKcode22/ReplitTranvr \
  --workflow phase5-primary-fids-expiry-no-provider.yml \
  --limit 6 --json databaseId,displayTitle,status,conclusion,headSha
# For a selected run, inspect actual job steps:
gh run view RUN_ID --repo HKcode22/ReplitTranvr --json jobs,conclusion
~~~

The read-only commands above are informational. Replace `RUN_ID` with a real ID from the preceding list; do not run `gh run rerun` on uncertain paid SOURCE or POST. GH variables are not secret values, but do not post API keys, DB URLs, private signed manifests or flight rows.

## 14. The present 2026-11-23 01:41 PST heartbeat failure: code-level root cause and guarded repair

### What is proven, not hypothesized

1. Exact approved main is `c8e065d665ccacb6d2575070e94c5500b7583044`; detached relay main is `c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed`.
2. [Scheduled heartbeat 45149342374](https://github.com/HKcode22/ReplitTranvr/actions/runs/45149342374), job `137606462355`, ran **its real metadata reader** but then printed `P6_CONTROLLER_CURRENT_INCIDENT_REVIEW_REQUIRED` and exited **2**. It classified `PRIMARY_FIDS_EXPIRY: SCHEDULE_APPROVED_MAIN_DRIFT` and the latest full-retention backstop `BACKSTOP_CHILD_NOT_SUCCESSFUL`. This is a real current incident, not a false failed test.
3. The job's environment displays **repository variable** `P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA` pointing to accidental `0369f88…`. The exact primary expiry job expression is `vars.P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA == github.sha`; on c8 this is false. The full retention expression also requires `vars.P7_EXPIRY_APPROVED_MAIN_SHA == github.sha` and separately approved FIDS+Phase7 modes. [Target full-backstop 45143813850](https://github.com/HKcode22/ReplitTranvr/actions/runs/45143813850) consequently shows **both `primary-fids-expiry` and `phase7-expiry` SKIPPED**. The relay may still say success because dispatch was accepted.
4. The failure **is not because scheduled workflows have empty `inputs.confirm`**; [`admitP6HeartbeatGithubEnv()`](https://github.com/HKcode22/ReplitTranvr/blob/c8e065d665ccacb6d2575070e94c5500b7583044/server/lib/disruption/phase6AutonomousGithubControllerHeartbeat_v39.mjs) checks that confirmation only when `GITHUB_EVENT_NAME=="workflow_dispatch"`; schedule has no input. The original heartbeat code is responding correctly to current expiry drift. **Do not change code or suppress the incident.**

### The repair deliberately has a narrow change set

- **Before any write:** requires authenticated owner HKcode22, UTC earlier than 21:50Z, target c8 + relay c5, the original full approved FIDS/Phase7/private due-only modes, G9 direct still disabled, a 64-character signed private manifest hash. Checks BOTH repo Actions variable values; each must be either the exact accidental `0369…` or already exact approved `c8…`. Any different value -> STOP.
- **Exact intended mutation:** PATCH `P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA` and/or `P7_EXPIRY_APPROVED_MAIN_SHA` only when the existing value is `0369…`; read back both exact c8. It does **not** write any GitHub secret, environment, new code commit, branch, migration or paid GO flag. It does **not** change `P6_ROLLING_DIRECT_RECOVERY_ENABLED`.
- **Only after successful correction:** dispatches the *existing* `APPLY_REVIEWED_FULL_RETENTION_BACKSTOP_NO_PROVIDER` path once on c8; checks the new run’s actual `primary-fids-expiry` and `phase7-expiry` jobs and required named steps succeeded. This is **existing authorized due-only retention** and may delete genuinely due source records (not an inert DB read). Then dispatches one existing `READONLY_GITHUB_CONTROLLER_HEALTH_NO_PROVIDER_NO_GO` observer and checks its actual job succeeded.
- **One-time owner approval remains necessary:** This helper is **only prepared** on the isolated evidence branch, immutable Git blob `6b3b2ffa497e593a285f811a72b20fe3613eae31`. Until the owner runs and the genuine GH runs pass, current safety status is **HEARTBEAT FAILED / RETENTION PIN DRIFT / PAID GO OFF**. If the helper prints `HOLD_P6_EXPIRY_PIN_*`, stop and audit instead of guessing. A successful manual heartbeat may still display nonfatal historical native scheduling gaps.
- **Why not modify heartbeat code?** Code at c8 already passes offline safety [45142434670](https://github.com/HKcode22/ReplitTranvr/actions/runs/45142434670); changing main would invalidate current G12 exact SHA/role admission again. The actual current cause is runtime **variable** drift. Correcting the two specific variables under the existing approved semantics is narrower and avoids reopening Gates1–8.

**After authentic owner success**, update issue #413 with exact no-provider backstop and heartbeat run IDs; then re-evaluate G11's live retention census during G13. Do **not** equate fixed heartbeat with 31-day scientifically complete collection.

## 15. Engineering lessons you should remember for future projects

1. **Before asking AI to fix a failed run:** specify exact repo, commit SHA, run ID, job ID, failed step and log reason. A broad “work until green” can create unrelated commits and more new failures.
2. **Do not use `main` as a scratchpad:** code, docs, policies, test updates and explanations should be separate PR/branch changes until the approved freeze window is over. Version hashes are functional inputs when code is signed.
3. **Write a one-paragraph invariant before writing a migration:** e.g. “keep the still-needed signed original until the actual due clock, never create a longer Contents TTL.” This prevents a deletion speed fix from destroying scientific evidence.
4. **Test actual trust boundaries:** repo secret vs environment secret, GitHub event ACK vs target job, DB commit vs billed provider request, raw original vs admissible PRE, provider estimate vs actual gate-out label. Each boundary needs independent readback.
5. **Idempotence is local unless external effects are reconciled:** `INSERT ... ON CONFLICT` or `SKIP LOCKED` can prevent certain database duplicates but does not refund a duplicated AeroDataBox HTTP call or retroactively deliver a missing observation.
6. **Tests prove the scope they tested:** a disposable PG16 test is not production ACL/config; a no-provider preflight is not an actual SOURCE request; a zero-due expiry run is not populated retention; a 31-value policy readback is not 31 collected batch-days.
7. **Prefer bounded missingness to fabricated completeness:** scientific evaluation may become underpowered, which should be reported transparently. Never replace missing T−6 with hindsight weather/status, nor “actual” with estimated gate-out.
8. **Choose the minimum complete repair:** a wrong GitHub Actions variable should not lead to source-code edits, repeated migration, provider experiments, new GitHub crons or a Gate15.
9. **At launch, count three receipts separately:** (A) authenticated owner GO, (B) real target/source execution and provider charge, (C) per-flight cutoff-safe PRE and qualified actual-only POST. Each is necessary for different claims.
10. **Checkpoints should say both positive and negative evidence:** list what PASS proved and what remains unknown; include exact SHA, source of result, as-of timestamp, and whether the action paid, wrote DB, or changed authorization. Avoid categorical “fully safe for 31 days” from one early green result.

---

## 16. Authoritative current status and references

**At the source audit clock:** target main **c8e065d665ccacb6d2575070e94c5500b7583044**, relay main **c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed**; accidental doc commit **0369f88ba361ff8f97a352b9d438ee5bcf59af57** is off main; Gates **1–8 remain closed**. Gate12 actual repository signed policy [45123278530](https://github.com/HKcode22/ReplitTranvr/actions/runs/45123278530) PASS and effective protected four-role actor [45125753815](https://github.com/HKcode22/ReplitTranvr/actions/runs/45125753815) PASS; paid worker intentionally skipped. PRIMARY retention external relay->target [45137657355](https://github.com/HKcode22/TravnrClockRelay/actions/runs/45137657355) → [45137685153](https://github.com/HKcode22/ReplitTranvr/actions/runs/45137685153) PASS. **G13 not yet run, G9 route remains disarmed, G14 billed SOURCE not yet proven.**

**Continue from:** [START HERE original owner commands](2026-11-23_START_HERE_PHASE6_LAUNCH_EXACT_3_OWNER_COMMANDS.md); [Day1 detailed success/incident runbook](2026-11-23_DAY1_PHASE6_PAID_MONTH_OPERATOR_RUNBOOK_GATES_9_14.md); [G12 independent protected acceptance](2026-11-23_G12_PROTECTED_POST_FOUR_ACTOR_INDEPENDENT_ACCEPTANCE_PASS.md); [fixed eight-gate register](2026-11-20_FIXED_PHASE6_LAUNCH_COMPLETION_REGISTER_NO_GO.md); [master GitHub issue #413](https://github.com/HKcode22/ReplitTranvr/issues/413).

**Never add a new gate, modify the signed study/sample/design, silently redate the calendar, regenerate keys, rerun original G12, or change protected production main to “save” this documentation.** This guide explains verified engineering and operational expectations, not new launch permissions.
