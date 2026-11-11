# DRAFT RFC — Simpler, higher-throughput Phase 6 automation: parallel PRE, real budget control, per-flight recovery

**Prepared:** 2026-11-10 (Pacific). **Status:** OWNER DISCUSSION / NOT ADOPTED / NO PHASE 6 GO.  
**Repository:** [HKcode22/ReplitTranvr](https://github.com/HKcode22/ReplitTranvr). **Research/code snapshot:** `main` at `7e8f2f137d376b3c930c8f7fad81840340f7aff5`.  
**Separate documentation branch:** `docs/phase5-6-parallel-pre-throughput-and-simple-automation-proposal-20261110`.  
**Scope:** An independent proposal for the owner and engineers to critique. It makes no alteration to production code, source rights, database schema, paid reservations, deployment, `main`, existing experimental plan, permissions, or current RELEASE status. **Only this Markdown proposal is added on the branch.**

> **Owner's requested direction (recorded faithfully):** “I do not want eight sequential tasks to become a permanent limit; a busy airport could give us many eligible flights and we should collect as much authentic, scientifically useful data as our budget allows. Parallel PRE workers seem more sensible. The four-child-per-ten-minute parent/child system looks underpowered and perhaps overengineered. Why not one workflow supervising many workers? Why doesn't an uncertain COMMIT first trigger a database check, and why should one failed flight block all unrelated flights? Preserve the useful safety rules, but reconsider restrictions and repeated work that may cause avoidable losses. Review the full Phase 6 design and actual research before choosing an architecture.”  
> The owner also asks for a **simple technical teaching explanation**, real costs and cloud-resource limits, published evidence through 2026, and a design that does **not** casually throw away flights or secretly select only convenient outcomes.

## 1. Executive conclusion and precise recommendation

**Recommendation for consideration:** Keep **AeroDataBox REST + Flight Alert webhook as separate evidence channels**, GitHub Actions as the approved orchestration platform, PostgreSQL 16/Neon as the durable store, the existing Phase 5 SOURCE original-custody/cost ledgers, and the existing **one-flight Stage14 immutable PRE writer**. Replace one-child-per-flight and the fixed eight-**sequential**-packet bottleneck with a **time-windowed, parallel, bounded, deadline-aware PRE owner**. Use a small number of GitHub jobs per approved airport/window/horizon, with **concurrent independent PRE transactions inside each job** (start with 4 in **disposable** tests; test 2/4/8/16; choose based on p95/p99 and measured database resources). Failures should be **per flight** unless a system-level safety condition requires an entire owner to stop. A separate read-only reconciler should determine what happened to ambiguous commits.

This is an **engineering proposal, not a proof** that the suggested counts are sufficient; **the correct concurrency, shard count and prelaunch lead time must be measured before Phase 6**. Do not assume the current 8, 4-per-poll or 96 are vendor hard limits.

**Prefer a single *logical* Phase 6 controller with several restartable job stages**, not one single multi-day process: GitHub-hosted jobs have a **six-hour maximum execution time**, GitHub `schedule` may delay/drop events, and the scientific T−24h/T−6h/T−90m horizons span far longer than one job ([GitHub limits](https://docs.github.com/en/actions/reference/limits); [scheduled event warning](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)). One YAML workflow can define multiple jobs/matrix workers, or can use the existing controlled child scripts. **One workflow file is possible; one continuously running 31-day job is not.**

**Preserve true safeguards, simplify artificial complexity:**
- A PRE row must be truly source-bound, identity-valid, available before the *own* cutoff, and genuinely DB-committed before it. Do **not** retroactively backfill.
- Provider REST GET and Alert SEND cost limits must remain hard stops under independently approved actual account rules; parallel **DB writes have no direct AeroDataBox API-unit charge**.
- Every eligible member, including unknown and missed cases, remains in the denominator.
- No blanket rule that one flight's SQL issue makes other flight observations invalid. Reserve global STOP for genuine systemic credential/rights/budget/provider/DB safety.
- Independent evidence review may approve the **deterministic flight-packet generation policy** instead of a human manually signing every single flight; but this is a *proposed prospective governance change*, **not permitted by the present signed-packet protocol without independent review**.

## 2. These numbers refer to DIFFERENT units (read before the design)

| Number | Actual source | Interpretation |
|---|---|---|
| **8** | [`phase5BoundedSignedLaterPreBatchPlan_v39.ts`](../../server/lib/disruption/phase5BoundedSignedLaterPreBatchPlan_v39.ts) and [manual runner](../../scripts/v39_phase5_bounded_signed_later_pre_batch_owner_v39.ts) | Current **maximum flight×horizon PRE tasks** per new manually triggered batch; executed **sequentially**. Arbitrary conservative *software cap*, NOT 8 flights per day/month. |
| **4 per 10 minutes** | [existing later-PRE dispatcher](../../scripts/v39_phase5_later_pre_signed_day_batch_dispatcher_v39.ts), [capacity simulator](../../server/lib/disruption/phase5LaterPreGithubDispatchCapacityEnvelope_v39.ts) | Four one-flight **child GitHub workflow-dispatch requests** each time the existing scheduled parent polls. Project setting, NOT GitHub universal maximum. |
| **24/hour** | 6 hypothetical on-time 10-minute polls × 4 requests | Optimistic requested child jobs, **not** completed saved flight PREs or provider GETs. |
| **32 / 100** | [PR #556](https://github.com/HKcode22/ReplitTranvr/pull/556) synthetic simulator | Eight polls × four dispatch slots = **32 potential dispatches** out of **100 simulated waiting flight×horizon tasks**; 68 lack a dispatch slot in that artificial window. Not real missed flights. |
| **96** | [signed day registry](../../server/lib/disruption/phase5SignedLaterPreDayRegistry_v39.ts) | Entries in **one signed JSON page (shard)**; use more authorized shards if needed. NOT 96 physical flights per day or a source quota. |
| **1–8** | Batch manual worker | A single invocation may carry 1–8 packet tasks, with deadlines within two minutes. It may hold multiple distinct flight identities or repeat identities at different horizons in different batches. |
| **2,500** | [source candidate auditor](../../server/lib/disruption/phase5ActualSourceNativeFlightCandidateAudit_v39.ts), see [PR #555](https://github.com/HKcode22/ReplitTranvr/pull/555) | Bounded candidate members scanned in one READ-ONLY review, not 2,500 promised physical legs or overall study limit. |
| **31 / four slots** | [f.8 plan](../plans/V3.9_DataCollectPlan_f.8.md) | **31 parent batch-days** with 1 HUB + MID_A + MID_B + REGIONAL **airport slots each day**, not four physical flights/day. |
| **Three PRE horizons** | Stage14 and experiment plan | A qualifying flight can have separate T−24h, T−6h and T−90m prediction-time records. **One packet = one flight × one horizon**. |

**Plain-English packet:** A signed packet is a reviewed JSON set of instructions/evidence saying “This exact flight X, at T−6h, from this stored source original, using this known-before-cutoff scheduled T, under these permissions and versions.” It is **not** a network packet, aircraft, provider bill or ML feature array. A cryptographic SHA checks exact bytes; it is **not** in itself scientific approval or a third-party signature.

**Correction to earlier conversational shorthand:** The strict surviving pool in the reviewed documents is **427 MID plus 586 REGIONAL = 1,013**, not 427+587. Airport pools are not the same as the selected two MID slots and one REGIONAL slot on a batch-day.

## 3. What is actually built, what Phase 2 proved, what Phase 5 has not proved

**Historical Phase2/4:** A **single AeroDataBox airport FIDS REST GET** can return numerous departures. One observed response → one protected original → many normalized `flight_population` members; source/member row count is not one GET per flight, nor proof all records are distinct physical operating legs. Phase2's impressive two-hour row ingestion demonstrates the **source acquisition and bulk normalization** can be efficient. It does not prove that all returned flights had individually valid prospective T−24/T−6/T−90 snapshots in a later 31-day experiment.

**Phase 3 webhook:** Separate Flight Alert **subscriptions**, **SEND-based** provider notifications and Replit **receiver** with original-first durability were tested in narrow real pilots. No need to rewrite that receiver.

**Phase 4:** Narrow WSSS actual FIDS originals, 12 conditional service keys, valid early PRE and later POST schedule revisions, but **not necessarily certified native actual wheels-off outcomes**.

**Phase 5 current modules:** Real SOURCE candidate review ([`phase5ActualSourceNativeFlightCandidateAudit_v39.ts`](../../server/lib/disruption/phase5ActualSourceNativeFlightCandidateAudit_v39.ts)), [unsigned source-bound dossier](../../server/lib/disruption/phase5SourceBoundUnsignedPreDossier_v39.ts), [signed day registry](../../server/lib/disruption/phase5SignedLaterPreDayRegistry_v39.ts), [Stage14 writer](../../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39.ts), [T24 independent witness](../../server/lib/disruption/phase5T24IndependentPostCommitWitness_v39.ts), [per-flight GitHub owner](../../scripts/v39_phase5_one_signed_witnessed_later_pre_github_owner_v39.ts), [manual 8-packet batch](../../scripts/v39_phase5_bounded_signed_later_pre_batch_owner_v39.ts), [future V0083 POST](../../server/lib/disruption/phase5V0083FuturePostOriginalDb_v39.ts), source/day QA and budget guards exist, with various offline/PG16 CI checks. This is *more than an idea*, but **not proof of live Phase6 full-population PRE throughput, independent source-use rights, a signed real 31-day calendar or Phase6 GO**. See [README](README.md), [P0 #553](https://github.com/HKcode22/ReplitTranvr/issues/553), [release #416](https://github.com/HKcode22/ReplitTranvr/issues/416).

### The specific performance defect to measure

The [manual batch](../../scripts/v39_phase5_bounded_signed_later_pre_batch_owner_v39.ts) uses `for (const candidate of plan.ordered) { await runner(...) }`. Its delegated [`runP5SignedWitnessedLaterPre`](../../scripts/v39_phase5_one_signed_witnessed_later_pre_github_owner_v39.ts) **waits using the database clock until within the flight's three-minute PRE write window**. Therefore one flight can block the subsequent seven *while waiting* as well as while committing. A manual 115-minute GitHub job timeout does not protect each flight's much narrower cutoffs. This is a valid performance concern independent of the reason sequential code was initially chosen.

**The current eight-packet worker is only a manual fallback and CI baseline, not a permanently correct production-capacity conclusion.**

## 4. Hard constraints from current official vendor documentation (verified in 2026)

### GitHub Actions

- [GitHub Actions platform limits](https://docs.github.com/en/actions/reference/limits): a GitHub-hosted job runs **at most 6 hours**; job matrices support **up to 256 jobs per workflow run**; account/repository usage and concurrent runner quotas are separate constraints, not a “4 children every ten minutes” GitHub maximum.
- [Schedules may be delayed or dropped](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows). A ten-minute cron is useful for discovering work, **not** a hard real-time clock guarantee. Dispatch critical workers **early** enough for startup variance, then wait on **PostgreSQL clock** for each real due window.
- [Workflow/job concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency): be careful with shared `concurrency.group`; pending runs may replace/cancel others by default. **Don't put all flight tasks in one globally canceling group**.
- [Matrix max-parallel and fail-fast](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/run-job-variations): GitHub supports multiple job processes concurrently. For independent flight work use explicitly bounded `max-parallel` and `fail-fast: false` (plus independent error ledgers).
- [GitHub Actions billing](https://docs.github.com/en/actions/concepts/billing-and-usage): public/private ownership and account usage change the runner cost; **do not assume free unlimited minutes**. Confirm repository visibility and actual account entitlements before provisioning many parallel hosted jobs.
- [Reusable workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/reusing-workflow-configurations) can share tested Stage14 logic rather than proliferate copy/paste workers. A reusable-workflow hierarchy is optional; don't add it if one orchestrator script does the job.

### PostgreSQL 16 / Neon

- [PG16 transaction isolation](https://www.postgresql.org/docs/16/transaction-iso.html): `SERIALIZABLE` is compatible with concurrency but may throw serialization failure `SQLSTATE 40001`. That means transaction retries and conflict policies require care; an **unknown COMMIT** is different from a proven pre-commit rollback.
- [PG16 `FOR UPDATE SKIP LOCKED`](https://www.postgresql.org/docs/16/sql-select.html): useful for **multiple independent workers claiming queue items**; it is explicitly unsuitable as a general consistent reading of research results. Use it only for an operational queue, and separately maintain immutable candidate/evidence logs.
- [Neon connection pooling, updated Oct 2026](https://github.com/neondatabase/website/blob/main/content/docs/connect/connection-pooling.md): total accepted clients are not simultaneous DB transactions. Resource limits depend on actual compute. Transaction-mode PgBouncer does **not support arbitrary session-level `SET` or session locks**. Existing dedicated `SET LOCAL` and transaction-scoped advisory locks require **separate disposable-PG16 + actual restricted-login tests** before using a pooled endpoint. Never assume a Neon 10,000-client statement means 10,000 safe concurrent Stage14 writes.

### AeroDataBox (one provider, two cost models)

- [AeroDataBox current API pricing](https://aerodatabox.com/pricing/): REST requests use **API units**, endpoint tier costs differ; FIDS tier-2 planning is **two units per request** under the reviewed pricing **subject to actual account/channel**. Current public Ultra lists **50,000 units/month and 3 requests/sec**; historical **60,000-unit** entitlements must only be used if that exact grandfathered account is verified. Actual remaining units, renewal boundary, permitted FIDS range, usage terms and provider availability are account-specific.
- [Flight Alert API January 2026 technical guide](https://aerodatabox.com/flight-alert-api-2026/): credit-based Flight Alerts charge **one credit per flight item per SEND**, even if not delivered; retries cost more and are off by default unless enabled; active airport subscriptions can emit thousands at busy airports. Refill converts API units to credits at **1 unit per credit**. Both balance and future SEND exposure matter.
- [Current provider API contract/channel guide, Sept 2026](https://aerodatabox.com/api-spec): subscription channels share service concepts but differ in authentication/gateway. **Do not substitute a public pricing table for the verified active experiment contract**.
- The existing [f.8 budget plan](../plans/V3.9_DataCollectPlan_f.8.md) has **seven REST physical-UTC charge categories** and a separate planned **1,900 Alert SEND credits per experimental budget day**, plus source-use/rights gates. These are project policy caps, not assumptions about universal provider allowances. Credits spent on a SEND are not the same unit as a FIDS PRE database INSERT.

## 5. Source acquisition vs PRE processing: why MORE PARALLEL SQL does not require MORE PAID GET

~~~text
                           1 reviewed FIDS REST GET for an airport/time range
                          /                      \
                original response             normalized flight members
                          \                      /
                          [one durable authenticated SOURCE observation]
                                             |
                                      all eligible candidate legs
                                             |
                  +--------------------------+-----------------------+
                  |                          |                       |
            flight A, T6               flight B, T6           flight C, T6 ...
                  |                          |                       |
           [parallel Stage14]          [parallel Stage14]       [parallel Stage14]
                  |                          |                       |
           PRE snapshot A              PRE snapshot B            PRE snapshot C
                  \__________________________|______________________/
                                             |
                                       read-only QA
~~~

A FIDS GET does not ask for “the eight packet flights.” It asks **which scheduled departures the provider reports for the authorized ICAO airport and time range**. Some returned records may be codeshares, ambiguous, cancelled or provider-schedule-only. Normalization/identity resolution determines which member can legitimately support an individual PRE. We **reuse one purchased source result for multiple eligible flight/horizon PRE records** as long as it was available at the right time and within its lawful retained lifetime.

More database workers can raise PRE throughput without buying extra FIDS calls. REST spending increases only if the approved **source query schedule**, partitioning, refresh, validation, outcome or diagnostic GETs increase. Alert SEND is a separate ledger.

### Why not use only webhooks?

The binding [f.8 `2 and `4.3](../plans/V3.9_DataCollectPlan_f.8.md) explicitly defines an airport FIDS **provider-observable flight population denominator**, while **webhook capture is separately measured**. Subscribing to an airport gives us updates for events the provider sends; **absence of a notification does not show the flight was on-time or unchanged**, and provider coverage varies. A webhook-only study would need a different predeclared population/delivery completeness design, not merely deleting REST. Webhooks add useful changing status/position outcomes but can be costly at busy HUBs. Preserve REST to know the denominator and alerts as an event channel; measure attrition rather than infer negative outcomes.

**Actual code path, don't just say “webhooks”:**
1. [`aerodataboxLimiter_v3.ts`, subscription creation](../../server/lib/disruption/aerodataboxLimiter_v3.ts#L355-L446) calls `POST /subscriptions/webhook/FlightByAirportIcao/{icao}` with reviewed HTTPS receiver and delivery retry scope.
2. [`server/routes_v3.ts`](../../server/routes_v3.ts#L407-L475) has `webhookIngress`: authenticates, reads incoming `POST` JSON, saves original **before acknowledging**.
3. [`rawIngress_v3.ts`](../../server/lib/disruption/rawIngress_v3.ts#L206-L252) atomically commits `clean.raw_delivery` and `clean.raw_delivery_item`.
4. [`flightNotificationExtractor_v3.ts`](../../server/lib/disruption/flightNotificationExtractor_v3.ts), [`flightInstanceCanonical_v3.ts`](../../server/lib/disruption/flightInstanceCanonical_v3.ts), [`flightDataPrePostStore_v3.ts`](../../server/lib/disruption/flightDataPrePostStore_v3.ts): parse/resolve/append immutable events/update latest convenient state.
5. [`adbCollectionController_v39.ts`](../../server/lib/disruption/adbCollectionController_v39.ts) and [Phase3 STOP](../../server/lib/disruption/gate4ActionsStopIntegration_v39.ts) manage owned Alerts and cleanup.

**Useful pattern to reuse:** `server/routes_v3.ts` protects **raw durability before semantic post-processing**. If semantic processing later fails after original delivery is saved, the handler records an incident; it doesn't erase the source original. PRE can similarly separate each flight's durable source, own snapshot, and later independently reconciled outcome.

## 6. Four concrete design options and trade-offs

| Option | Architecture | Advantages | Drawbacks / risks | Verdict |
|---|---|---|---|---|
| **A — Current default-OFF single-flight GitHub children** | One GH child per packet, parent polls 10min, ≤4 children/poll | Existing reviewed writer, simple containment | GitHub launch overhead, 24/hour optimistic dispatch requests, can miss many dense cutoff clusters | Baseline/fallback, **not target** |
| **B — Current fixed 8 sequential in one child** | One GH job holds 1–8 tightly clustered packets and loops `await Stage14` | Already CI-tested, preserves reviewed semantics | One early waiter blocks others, arbitrary limit, any ambiguous flight stops all remaining tasks | Debug/manual fallback, not final high-volume owner |
| **C — Recommended first implementation: few GH jobs + bounded *parallel async workers* within each** | One reviewed SOURCE-day/horizon/window owner produces immutable verified candidate set, ~2–8 GH jobs as measured, each runs concurrency-limited individual Stage14 calls; separate per-flight receipts | Amortizes GH startup; parallelizes independent flights; no need one GH workflow per flight; can reuse SQL writer and existing source/cost rights | DB saturation, SSI conflicts, duplicate scheduling, clock skew and worker crash; must benchmark/lease | **Preferred next engineering branch**, starting nonpaid |
| **D — Fully durable PostgreSQL task queue with leasing + parallel workers** | Small purpose-built PRE task queue with reserved ownership/deadline, `SKIP LOCKED` short claims, fencing tokens, per-task terminal statuses, separate recovery worker | Scales and resumes well, clear backlog and per-flight recovery; less reliance on GH dispatch capacity | New table, minimal privileges, coordinator complexity; may trigger unnecessary schema growth | **Best eventual robust shape**, adopt only if C cannot reliably satisfy source cadence and deadline requirements |
| **E — One enormous GH matrix job per flight** | Hundreds of GH job entries, each one packet | Parallel with native matrix | More runner/startup costs, GitHub job queue jitter, rate/concurrency limits, heavy blast radius if `fail-fast` defaults true | Not ideal for cost/latency; limited matrix *shards* can help C |
| **F — 31-day always-on Replit or Cloudflare worker** | Long-running external scheduler | Lower periodic wake-up latency in theory | Conflicts with approved GH-only owner; additional platform spend/risks, an entirely new ops surface | **Not proposed**; only revisit if owner formally changes architecture |

**Do not equate “parallel” with “unbounded.”** Controlled parallelism is a knob set by measured tail latency, DB connections, GitHub runner budget, and observed eligible flights; it isn't permission to start thousands of concurrent PostgreSQL transactions.

## 7. The proposed minimal parallel architecture (Option C)

~~~text
[Reviewed science/rights + future 31 parent-day schedule + budget + early 4-airport draw]
                                  |
                        [Signed SOURCE-day policy]
                                  |
                  [Existing FIDS GET physical attempt ledger]
                                  |
             [One original saved + all normalized population members]
                                  |
                [Readonly source/native-T/dossier reviewer]
                                  |
           [Deterministically generate per-flight/horizon packet candidates]
                                  |
          [INDEPENDENT bounded admission: signed rule + exact source/run hash]
                                  |
              [Immutable day/shard registry, more than 96 via paging]
                                  |
          [Pre-dispatch one or few GH worker jobs AHEAD of due cutoffs]
                                  |
                 [Workers run with PRE-only dedicated login]
                /                  |                    \
      worker lane 1           worker lane 2         worker lane 3 ...
       flight X                 flight Y              flight Z
      Stage14 TX              Stage14 TX             Stage14 TX
         |                       |                      |
   own DB clock + own unique identity + own immutable snapshot
         |                       |                      |
    verified success        verified success       ambiguous write
         |                       |                      |
       DONE                    DONE              isolate and reconcile
                \                  |                    /
                  [read-only daily audit and task-quality ledger]
                                  |
             [future POST/receiver/Alert/independent STOP]
~~~

### Key design principles

1. **One logical owner, multiple execution stages:** source ingestion and governed per-day packet publication once, multiple horizon-window PRE workers (not a fresh GH child for every flight), postprocessing/STOP independently. Can fit in **one versioned workflow YAML or a few reusable workflows**; avoid one single job spanning days.
2. **Per-flight concurrency safety:** keep Stage14's `SERIALIZABLE` source/member check, own DB clock, advisory transaction lock keyed to unique flight×horizon and duplicate/after-COMMIT readback. Require a unique immutable snapshot key/index verified with actual schema, and enforce that operational workers cannot UPDATE or DELETE historical PRE.
3. **Queue by deadline, not arbitrary eight:** sort by earliest safe cutoff. Every approved candidate eventually considered; batch is just a dispatch container, not a scientific sampling criterion. “More than 96” becomes **multiple approved pages/shards**, not silently drop the 97th candidate.
4. **Pre-dispatch early:** use a GH job prearmed before the actual due cluster, then each worker independently waits for its **own** PG16-clock due threshold. GitHub `schedule` jitter is outside the protected commit interval, not used as the true prediction timestamp. Record actual startup lead and misses.
5. **Bounded async execution:** inside a running GH job, use a small `concurrency` pool of independent Stage14 calls (4 suggested **starting test value**; 2, 4, 8, 16 to measure). Each call uses its own short-lived restricted transaction/connection; **never share one single PostgreSQL client transaction across flight tasks**. Node.js `Promise.allSettled` alone is not a concurrency limit—wrap it in a semaphore/queue.
6. **Separate scope for failures:** “Flight C ambiguous COMMIT” should quarantine/reconcile C, **not erase previously verified A/B or drop unrelated D/E/F**. But a shared database outage, credential compromise, rights failure or budget stop is legitimately systemic: pause launching new attempts and quarantine all affected ambiguous tasks.
7. **Keep source economics separate:** multiple flight PRE writes from one FIDS source cost **zero additional AeroDataBox REST units**. Provider GET retry/refill and Alert subscription lifecycle remain separately metered and approval-gated.
8. **What requires prospective approval:** workflow owner permissions, machine-versus-human packet approval, concurrency and fallback logic, modified GitHub execution policy, and eventual real release verdict. This RFC itself makes none of those changes.

### Teaching pseudocode — **not executable production code**

~~~ts
// This shows structure, not a drop-in production implementation.
const duePackets = await readAndVerifyApprovedPacketPages(day, horizon);
const remaining = duePackets.filter(p => !alreadyDurablyVerified(p));

// Train/validation/TEST population denominators already fixed: never hide
// signed but failed/late tasks from the daily source/quality report.
const lanes = independentlyReviewedConcurrentLimit;  // e.g. 4 in offline tests
await runWithConcurrencyLimit(remaining, lanes, async packet => {
  try {
    // This worker may wait for this packet's OWN DB-clock due window.
    const receipt = await existingStage14OneFlightWriter(packet);
    await recordOneVerifiedReceipt(packet, receipt);
  } catch (error) {
    await flagThisPacketForReadOnlyReconciliation(packet, error);
    // Continue OTHER independent flights if DB and safety gates are healthy.
  }
});
await publishIndependentDayQualityCounters();
~~~

**Never implement this by changing `Stage14` to commit earlier or later.** If its three-minute/2-second margins prove impossible for a dense cluster, improve prearmed parallel throughput, not backdated source timestamps. If parallelism still insufficient, record missingness and evaluate whether a **future scientifically approved** change to sampling horizon or prediction target is needed; do not silently make it up.

## 8. Important timing math: planning ≠ writing

Actual [Stage14](../../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39.ts) defines `MAX_EARLY_MS = 180000` (3 minutes) and `COMMIT_MARGIN_MS = 2000` (2 seconds). It refuses writing before the due window or if already too close to/after the flight's own cutoff. The **15–75-minute** batch eligibility and **within two minutes** deadline clustering belong to the *old batch planner*, not to actual PRE write authority.

**Example, hypothetical flight:** selected T = 18:00 UTC, T−6h cutoff C = 12:00 UTC.
- Around **10:45–11:45** it may qualify for early **batch planning** (75–15 minutes ahead).
- When grouped with other packet tasks, their cutoffs must be within **two minutes** *under that older planner*.
- Around **11:57 to 11:59:58** the original Stage14 **one-flight writer** may attempt its actual DB write, with its own commit/readback checks.
- A PRE recorded at **12:01** cannot be truthfully advertised as a 12:00 prospective observation, whether there were eight or 80 flights waiting.

**The proposed owner should not require a whole batch to have the same cutoff.** It should prearm workers and let every packet wait for its *own* DB clock, with a bounded global concurrency scheduler. This avoids one waiting task blocking unrelated ones and makes wider dynamic shards possible.

### Throughput calculation (illustrative, NOT verified)

Let `N` = number of eligible packets whose valid commit window overlaps, `W` = usable commit window in seconds (≤178 before additional safety margins), `L` = measured conservative per-flight Stage14 transaction + postcommit readback duration at a given concurrency, `c` = simultaneous worker lanes.

A *rough necessary capacity check* is:

`c ≥ ceil( N × L / W )`.

Example, **100 hypothetical packets** sharing a dense cutoff period and **L=5 s** in a synthetic test:

- One sequential lane needs about **500 s** → larger than the at-most-178-second window.
- Four ideal lanes need approximately **125 s** → potentially feasible **only if** latency under concurrency really stays close to five seconds, launch/startup are already done, and there is ample margin.
- Eight lanes might improve that or **worsen** it if Neon saturates and transaction/readback times rise.

The formula is a **planning lower bound**, **not** a latency guarantee or a claimed measured result. Actual feasibility requires p95/p99 and failure-rate simulations with the real cutoff distribution, multi-horizon overlap, source availability, DB compute/connection limits, and short lock timeouts. Keep the same submitted population in every scenario to avoid cherry-picking.

### Adaptive concurrency controller — proposed *simple* policy

Use an explicitly reviewed range (e.g. `min=1, starting=4, max=8` for first disposable tests; **not a production authorization**). Recompute permitted lanes from completed recent p95/p99 durations, transaction conflict/error rate, active connection headroom and how many packet deadlines approach. Increase only if throughput improved **without** material p99 latency or failure growth. Decrease on `40001` conflicts, lock timeouts, PG memory/connection pressure or degraded quality. No dynamic unbounded concurrency and no Provider API credentials in PRE-only workers.

## 9. Uncertain COMMIT: automatic read-only reconciliation without stopping unrelated flights

The owner is right to ask: **“Why not query the database to see whether the flight's PRE row exists?”** This is exactly the right first response. But the check must not authorize an unsafe duplicate or a retrospective backfill.

**Proposed per-packet state machine:**

~~~text
PENDING
  -> PREARMED
  -> CLAIMED (exact flight|horizon, unique owner/lease)
  -> WRITE_STARTED
       |-> COMMIT_ACK + READBACK MATCH = VERIFIED_ON_TIME
       |-> Proven no-commit BEFORE cutoff = SAFE_NOT_WRITTEN
       |-> Lost connection / ambiguous COMMIT = COMMIT_UNKNOWN
                                                   |
                                      independent READ ONLY DB check
                                                   |
                             +---------------------+----------------+
                             |                     |                |
                     exact valid snapshot   definitive no row    ambiguous/DB unavailable
                             |                     |                |
                      VERIFIED_ON_TIME     MISSED / optional       remain UNKNOWN,
                                          reviewed retry ONLY      alert and audit
                                          if safe & still before C
~~~

**Independent verification of `COMMIT_UNKNOWN`:**
1. Open a **fresh restricted READ-ONLY** DB session and use the real DB clock. No bad permissions/credentials silently borrowed from a generic app user.
2. Look for the exact unique flight×horizon snapshot, packet's expected source original/query ID, native T, prediction cutoff, immutable receipt and hash; reject matches by flight number alone.
3. If an exact row is durably committed and all cutoff/identity fields match, mark VERIFIED, preserve original commit evidence; **no rewrite**.
4. If no exact row is found, check whether the former writer might **still be in flight**. Protect against racing an unresolved transaction via ownership/lease fencing or verified terminated session and unique DB insert constraint. A single momentary empty SELECT is **not sufficient** proof that a concurrent COMMIT can never appear.
5. **If** existing verified recovery policy explicitly permits a new attempt, the old owner is definitively fenced, duplicate uniqueness is proven, source still valid and current time is genuinely before the own cutoff by required margin, a newly authorized time-safe attempt may be considered. **This is a proposed protocol change, NOT allowed under the current no-retry-after-unknown-COMMIT rule.** Otherwise mark unresolved or missed and alert the auditor. Never backfill.
6. In all scenarios, report the source-covered flight in the denominator. A failed individual PRE is not silently erased.

**Policy separation**:
- `FLIGHT_LOCAL_ERROR`: only that packet quarantined; other independent packets continue.
- `SHARED_DB_DOWN` or `DB_CLOCK_UNTRUSTED`: stop new write attempts until healthy; preserve and reconcile affected tasks. Unrelated previously verified successes remain.
- `SOURCE_USE_RIGHTS_INVALID`, `PHASE6_STOP` or `PROVIDER_BUDGET_EXCEEDED`: stop corresponding paid/source work globally; no bypass by parallel job.
- `GITHUB_OLD_RUN_ACK_UNKNOWN`: no blind duplicate dispatch; compare exact signed identity, execution history and **database** receipt.
- `READBACK_MISMATCH`: per-flight quarantine and independent science review; if systematic, trigger breaker.

**PostgreSQL design note:** Existing Stage14 uses an advisory **transaction** lock based on flight identity and horizon; maintain or strengthen a database **unique index** enforcing the actual immutable grain before allowing multiple writers. Any added queue/lease table should be the **minimum** needed after confirming existing V0079–V0083 ledgers cannot represent safe owned claims; avoid duplicative “parallel PRE SQL writer” implementations.

### Optional tiny queue (Option D, only if measured necessary)

If durable rescheduling and multiple independent GH jobs require operational leasing, use **one** minimal queue state table keyed to an immutable source/packet identity plus horizon. A worker atomically claims a small number of due entries with `FOR UPDATE SKIP LOCKED`, a short lease + fencing token and checks before writing. Operational queue status is **not research provenance**. The database transaction for queue claim is distinct and fast; **never hold row locks while waiting 30–60 minutes for due cutoffs**. A stale lease is not license to replay an ambiguous `COMMIT`. Ensure roles support only claims/receipts, not unbounded editing of source originals.

## 10. REST/Alert budget model: get MAXIMUM scientific coverage per valid paid unit

### A. Separate provider spend from computation

| Operation | AeroDataBox cost mechanism | Ways to maximize useful coverage |
|---|---|---|
| FIDS airport GET | REST endpoint-tier units **per physical request**, possibly with separately metered retries | Reuse each authenticated original for all eligible returned flight members; choose source windows/refreshes based on active segments, true cutoff coverage and provider range |
| PRE Stage14 SQL insert/readback | **No direct AeroDataBox API units**; uses GH runner + Neon compute | Parallelize bounded SQL; no duplicate FIDS GET needed for another member from same source |
| POST/outcome FIDS or other REST | Additional REST units, seven-category ledger | Bundle eligible interval/airport coverage when permitted; no overbroad extra GET; retain UNKNOWN if no qualified outcome |
| Flight Alert webhook SEND | **1 credit per flight item per SEND** under 2026 credit contract; failed-delivery attempt/retry can cost again | Bound active airport subscriptions, optimize on/off windows, monitor SEND balance, no assumption that silence=on time |
| Alert balance refill | API-unit→Alert-credit conversion (actual current account/channel terms) | Reserve a separate budget; do not double-count unused beginning balance or assume free refills |
| GitHub Actions jobs | Runner minutes/plan-specific bills or included usage | Avoid one GH runner per flight; reuse one worker for many flights/horizons with scoped pools and limited concurrency |
| Neon/PostgreSQL | Compute, connections, transactions, storage | Use few warm connections, short transactions, read-only reconciliation; measure real account limits |

**2026 public FIDS tier-2 example only:** 100 paid FIDS GET attempts × 2 units = **200 REST units**. If each approved GET returns many qualifying flight records, the number of PRE records can be much larger than 100 without additional source GET units. **The actual qualified response yield remains unknown until real data.**

**Do not budget 31 days by blindly dividing a 50,000- or 60,000-unit monthly entitlement by 31:** the study can cross renewal dates, other features/outcomes use units, Alert refill costs may draw from the same subscription unit pool, and actual available/used balances must be read from the active account. For intuition only, 50,000÷31 ≈ 1,613 units per day *if* spread evenly across precisely one cycle, which is **not** an approved daily cap.

### B. Verified hard-spend mathematics (conceptual)

For each actual provider billing cycle `b`:

`U_used_so_far(b) + Σ physical_REST_attempt_units(b) + Σ confirmed_Alert_refill_units(b) + required_reserve(b) ≤ actual_cycle_entitlement_units(b)`.

For each experiment-owned Alert budget day `d`:

`A_sent_and_unsettled_credits(d) + A_reserved_burst(d) ≤ approved_Alert_budget_cap(d)` (the f.8 planned cap is 1,900 credits/day, subject to final approval).

For each **physical UTC REST charge day** `t`, charge the precise GET date rather than its later batch-day label and respect all **seven** category allocations plus system STOP. REST retries are **new paid attempts** and cannot be “free” because an earlier call timed out. No worker can transfer credit from an Alert budget to the REST ledger or vice versa.

### C. Coverage and scientific sampling not just “buy more data”

**Optimize** the fraction of **eligible, cutoff-valid PRE×outcome pairs** as well as route, tier and airport-stratum diversity, not only raw FIDS row count. A busy HUB may return hundreds of marketing/duplicate/unknown rows; a regional airport may return few but is important to representative coverage.

Predeclare the sampling frame and four slots; preserve the real inclusion probabilities and non-response/missingness. Optional additional **within-window** refreshes can be planned prospectively under the same legal/per-account caps and will have real API costs. Do not replace a weak airport retrospectively because results look bad or favor only easy-to-predict flights.

**31-day shape under reviewed plan:** 26 × 4h, 3 × 2×2h, 2 × up-to-6h; **34 active segments** (26+6+2). Across four airport slots and three PRE horizons, this is **34×4×3 = 408 planned airport-segment-horizon target groups**, *not 408 guaranteed physical GETs*, 408 flights, or actual outcome labels. The five crossover pairs (ten selected days) have **13 active segments × four airport positions × three horizons = 156** such groups. Extra refresh/partition and separate POST/Alert calls require real budget admission.

## 11. Actual resource benchmarks to require before choosing concurrency

### Inputs to measure first (no paid provider needed)

1. Count synthetic **eligible flight×horizon tasks** sharing each 1-, 2-, 3-, 5-, 10-minute cutoff cluster using historical source distributions only as **planning heuristics**, not as the actual future population guarantee. Avoid publication of protected TEST outcomes.
2. Measure Stage14 `SERIALIZABLE` per-flight p50/p95/p99 execution and postcommit readback on **disposable PostgreSQL 16** with production-like indexes and representative member counts. Test 1/2/4/8/16 worker lanes; 50/100/250/500 **synthetic** tasks, varying flight cutoffs and deliberate source missingness.
3. Compare **one GH child per flight** vs **one GH job with bounded async pool** vs **few GH matrix shard jobs**, factoring **actual GH cold start**, schedule delay, GH job minutes, Neon connection and CPU constraints.
4. Inject source/DB failures: duplicate packet, same flight+horizon claimed twice, stale lease, network loss immediately before/after COMMIT, serialization 40001, lock timeout, expired source, crossing request UTC midnight, invalid source SHA, late provider response, skipped GitHub schedule, cancellation, competing old dispatcher.
5. Validate that a failure on one packet leaves unrelated successful packet receipts genuine, and that unrelated due jobs continue **unless a shared fatal STOP** has been triggered.
6. Verify event density at HUB and REGIONAL, source volume and per-horizon deadline distribution; measure percent of **all eligible source members** that got actual cutoff-valid PRE (per airport/stratum), not cherry-picked sample of easy jobs.

### Quantitative acceptance metrics (targets need predeclared review, not invented results)

| Metric | Why it matters |
|---|---|
| `P(verified PRE before own cutoff | eligible source member, horizon)` by airport/tier/route | The core actual prospective capture rate; denominator fixed independently |
| `p95 / p99 Stage14 DB transaction and readback milliseconds` | Tail latency can defeat dense cutoffs |
| `dispatch-to-start p95 / p99` and percent of cron events not observed | GH cannot promise precise start |
| `unique packet attempts vs duplicate suppressed` | Dedup/owner correctness |
| `COMMIT_UNKNOWN → resolved / unresolved / timed-out`, mean audit delay | Automatic reconciliation quality |
| `serialization failures, lock timeouts, active DB connections` | Neon/PostgreSQL resource pressure |
| `REST units by exact UTC/category, Alert SEND by budget day, runner minutes` | Actual full-stack cost |
| `unique true operating identities, conditional services, unknown/censored/late` | Keep real denominator and target semantics |
| `joint PRE + independently verified outcome pairs` | Future ML sufficiency, not raw row volume |

**Benchmark success cannot replace a source rights/ML retention approval, actual target decision, real signed calendar or independent Phase5 FREEZE.** It can eliminate arbitrary eight/24 assumptions before GO.

## 12. Concrete published references and what they imply (through Nov 2026)

These are **actual external sources**, not inventions based on our code. The links are to official vendor documentation or published scientific papers; their direct relevance and limitations are stated.

1. **[GitHub Actions limits](https://docs.github.com/en/actions/reference/limits), current 2026** — six-hour hosted job cap, max matrix size and plan-specific resource limits. **Implication:** a sharded GH-based parallel runner is feasible; a single endless 31-day job is not.
2. **[GitHub Events: scheduled workflow delays/drops](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows), current 2026** — `schedule` is best effort. **Implication:** prearm workers and independently check database clock; don't confuse a cron timestamp with data availability.
3. **[GitHub matrix max-parallel](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/run-job-variations), current 2026** — concurrent jobs with bounded `max-parallel`, explicit `fail-fast` choice. **Implication:** multiple independently bounded GH shard jobs are practical alternatives to four sequential per-flight dispatches.
4. **[PostgreSQL 16: transaction isolation](https://www.postgresql.org/docs/16/transaction-iso.html)** and **[queue-like `SKIP LOCKED` behavior](https://www.postgresql.org/docs/16/sql-select.html)** — parallel serializable transactions can fail; queue claims must be explicitly coordinated. **Implication:** reuse Stage14 semantics with per-flight uniqueness, separate claim and reconciliation, benchmark conflicts.
5. **[Neon 2026 connection pooling documentation](https://github.com/neondatabase/website/blob/main/content/docs/connect/connection-pooling.md)** — actual connection pool and transaction-mode state limits. **Implication:** choose concurrency using live compute limits and verify `SET LOCAL`/advisory transactions with proper restricted sessions.
6. **[AeroDataBox API Pricing](https://aerodatabox.com/pricing/)** and **[Flight Alert credit-based guide (2026)](https://aerodatabox.com/flight-alert-api-2026/)** — tiered GET costs versus SEND item credits; airport subscriptions at busy airports can cost many credits. **Implication:** amortize source responses across all eligible flights; scope alert exposure and measure both independent ledgers.
7. **Sun, Tian, Li & Wu (2025/2026), [A review of network delay prediction and advances in large language models for air traffic](https://doi.org/10.1007/s10462-025-11400-w)** — systematic overview of delayed data, network dependencies, source quality, generalization and model complexity. **Implication:** robust data quality and representative sampling matter more than raw rows or complex modeling architecture.
8. **Li et al. (2024), [Flight delay propagation modeling: Data, Methods, and Future opportunities](https://doi.org/10.1016/j.tre.2024.103525)** — review of sources, operational dependency and propagation methods. **Implication:** preserve time-varying route/network/operation evidence and do not mistake one schedule response for physical causal outcome.
9. **[2026 systematic review of ML airline delay prediction (72 studies)](https://www.sciencedirect.com/science/article/abs/pii/S1568494626012093)** — emphasizes uncertainty, inconsistent outcome definitions, outside weather and real-world deployment. **Implication:** predeclare outcome and valid data tiers; keep richer downstream models possible without pretending an estimated time is an actual event.
10. **[2025 weather/trajectory arrival-time regression study](https://www.sciencedirect.com/science/article/pii/S2941198X25000065)** — uses 58,378 HKIA arrivals plus weather/trajectory for an in-air arrival objective. **Implication:** airborne ETA is a separate, evidence-rich future target with potentially greater data needs than PRE schedule-change; preserve its architecture and don't assert 31 days guarantees adequacy.
11. **Kaufman et al. (2012), [Leakage in data mining: Formulation, detection, and avoidance](https://doi.org/10.1145/2382577.2382579)** — defines target leakage from future information. **Implication:** improving throughput must never make hindsight timestamps valid PRE data.
12. **Gneiting & Raftery (2007), [Strictly Proper Scoring Rules, Prediction and Estimation](https://doi.org/10.1198/016214506000001437)** — calibrated probabilistic outcome evaluation. **Implication:** when Phase7 scores any delay-risk distribution, report proper scores and uncertainty, not only accuracy/yes-no.
13. **[2026 methodological discussion of selection bias and target populations](https://www.nature.com/articles/s43856-026-01721-4)** (health-research setting; cross-domain method, not aviation evidence) — record selection mechanism and missingness, avoid post-outcome inclusion. **Implication:** maximize qualified capture within predeclared sampling rather than rewriting inclusion based on who had convenient data.

**Evidence limitation:** External literature informs architecture and science but **does not prove the specific GH/Neon/AeroDataBox account has enough budget or capacity**. No production p99 PRE throughput, actual paid GET count, current quota or model accuracy was measured in writing this RFC.

## 13. Implementation sequence: don't build 30 new stages and forget Phase5 release

**Step 1 (review only):** independently agree the outcome/evidence tier, lawful provider use/retention, target and measured admission policy, actual 31-day prospective sampling/calendar, REST seven-category + Alert caps. **Can progress in parallel** with offline throughput work; do not use missing provider emails to stall nonpaid engineering.

**Step 2 (small nonpaid code PR):** refactor **only the owner** (not Stage14 SQL writer) to accept many verified future packets and use a concurrency-limited set of per-flight Stage14 calls. Add per-packet status/receipt and local-failure isolation, DB clock prearm, graceful STOP. Preserve old sequential path behind a feature flag for A/B load tests.

**Step 3 (reviewed real sourced packet generation):** reuse PR #555 source-native candidate query and #558 unsigned dossier. For production, define independently approved immutable source-day policy and automatic, independently verifiable per-flight packet signer/publisher; do **not** simply self-sign or fabricate a provider-native physical leg. Allow multiple 96-entry registry pages without changing the population denominator. Proposed independent sign mechanism may require a separate role or GH protected approval; it must be reviewed.

**Step 4 (simulated throughput):** disposable PG16 1/2/4/8/16 concurrency; many same-cutoff packets, network/COMMIT ambiguity; simulated delayed GH worker start, synthetic busy-HUB rates; test that unexpected SOURCE loss and rights failure STOP appropriately. Publish exact p95/p99, error and completion denominators, not only unit CI PASS.

**Step 5 (minimal integration):** connect existing signed SOURCE-day/early-draw, per-horizon PRE windows, independent T24 witness, POST V0083 + Replit raw receiver and Phase3 STOP, without copying the underlying machinery. Use one monitored logical controller; *only* add a queue table if needed to make crash recovery safe.

**Step 6 (independent prospective approval):** actual date/airport/treatment/source budget packets, reviewed cutoff rules, source-purpose-specific legal contract, GH runner/Neon costs and recovery behavior, secret/role scopes; independent Phase5 FREEZE PASS or exact HOLD, then **separate paid Phase6 GO**. Real first-day outcome rows are after-GO evidence, not prelaunch requirements.

**Do not:** reinstall V0079–V0083, buy duplicate WSSS historical pilot evidence, copy a second PRE SQL writer, silently widen Stage14's true cutoff, send paid provider traffic from a synthetic test, adopt Amendment E by implication, or dispatch new automatic paid collector from this proposal branch.

## 14. Independent design review questions (bring back to owner)

1. What are the measured simultaneous cutoff-task counts for the busiest sampled HUB and the MID/REGIONAL tail? How many source members remain conditional/unknown?
2. What is the actual Stage14 p95/p99 and `40001` rate at 2, 4, 8, 16 concurrent writes on a disposable PG16 with production-like indexes?
3. How early must a GH worker prearm (GH startup variance) to ensure the genuine ≤3-minute PRE window, given GitHub scheduled-run unreliability?
4. Is a minimal **bounded parallel worker inside a few GH jobs** enough, or does real crash/recovery evidence justify one small DB operational queue?
5. Which existing V0079–V0083 ledgers can store per-packet owned attempts and readback so we **avoid redundant schema**?
6. Can approved generation and independently checked signing be applied to a complete SOURCE-day packet registry without manual signatures for hundreds of flight/horizon tasks?
7. What is the live **account-specific** AeroDataBox entitlement/cycle and daily remaining REST/Alert unit/cost headroom? What is GitHub repo visibility/minutes and actual Neon compute size? **Do not guess from public docs.**
8. What actual percentage of eligible flights can we deliver per horizon under proposed algorithm in a **nonpaid** dense-load simulation, including all misses in denominators?
9. Which failures are flight-local, and which require a system-wide STOP? What fresh READ-ONLY evidence determines whether an ambiguous PRE COMMIT already happened?
10. Can we produce one owner-facing, timestamped day report: eligible source members, scheduled PRE, verified T24/T6/T90, unknown/missed, POST labels, REST units, Alert SEND, GH minutes, source rights and data expiration?

## 15. Scientific honesty and release status at the end of this proposal

**Reasonable simplifications:** larger/dynamic batches, parallel processing, fewer GH dispatches, prearmed horizon workers, per-packet independent failures, read-only COMMIT reconciliation, machine-assisted deterministic packet preparation, avoiding manual per-flight signatures where an independently reviewed protocol permits it, reuse rather than replicate tested SQL/receiver/source modules.

**Cannot simplify away:** approved provider Contents rights/TTL/ML purpose; real original/time/identity; no retrospective PRE; correct per-flight cutoff; actual charge accounting; honest loss and missingness; tested STOP; a predeclared target and protected evaluation. A row existing in PostgreSQL does not prove it is a verified actual wheelsoff label.

**Status:** Proposed research and engineering change for human/independent review only. The source snapshot still reports **Phase5 scientific FREEZE HOLD / Phase6 paid GO NO**. This document neither starts the 31-day experiment nor approves a source-use amendment or new production worker.

**Summary in one sentence:** Preserve existing genuine FIDS/Alert sources and individually correct Stage14 SQL writes, but **build a small number of prearmed, bounded parallel PRE worker jobs with exact per-flight time/identity checks, per-packet independent reconciliation and measured cost/throughput**, so a busy airport isn't artificially limited by eight sequential packets or four child GitHub dispatch requests every ten minutes.
