# Phase 3 — real paid-feed integration, scientific feasibility and cost-control gates

**Status checked Saturday 2026-10-17 ~18:00 PDT.** The old October 15 landing called Phase3 an unmerged Gate3 draft; **that status is now superseded**. Reviewed code was merged in [PR60](https://github.com/HKcode22/ReplitTranvr/pull/60) and [PR61](https://github.com/HKcode22/ReplitTranvr/pull/61), with **4/4 exact-head no-provider CI PASS on each**, source tree `6a80cad85524341333c9b8d8b196fa1011667717`, and public Replit receiver reporting exact reviewed GitHub `main=1a9a0ca9dc2750fdc7ad170c543dff7d49e20e00`, route/custody healthy and retention 168h. **The separate 10-minute WSSS paid Gate3 experiment is scheduled for 2026-10-17 20:00 PDT and had NOT executed by this document's freeze time.** Thus no Gate3 paid PASS, no separate Gate0.5 or Gate4 PASS, and no Phase6 main permission can be inferred from GitHub source or publish status.

> **Start with two pages:**
> - [**Tonight's exact ONE-RUN WSSS operator playbook**](2026-10-17_WSSS_GATE3_ONE_TIME_OPERATOR_PLAYBOOK.md) — complete times, source/auth hash, private shell launch, GitHub manual sidecar inputs, bot lease RUN_ID/COMMENT_ID handoff, safety stop and post-run disposition. On a **documentation-only PR, not merged before live run** to protect exact source SHA.
> - [**Management-ready whole-project explanation**](../PROJECT_STORY_FOR_PEERS_AND_MANAGEMENT.md) — why we did this, chronology, science/math, actual failures, costs and improvements.

## Executive summary for a boss or peer

**What:** Phase3 turns separately useful airport pilots into a **credible, independently monitored paid production ingestion process**. It tests three different questions: **Gate3** “can we create, receive, safely stop and reconcile exactly one bounded paid subscription?”; **Gate0.5** “are the provider's real primary target/clock fields and data availability sufficient to make a prediction scientifically meaningful?”; **Gate4** “can production controls protect ongoing budgets and safely handle the next staged paid operation?” These are distinct from Phase2G airport yield comparisons.

**Why:** Provider SEND-billing continues even if callbacks fail; an owner process can die; a GitHub CI PASS does not prove the public Replit deployment matches; and cost safety does not prove flight identity, timestamp or FIDS denominator quality. A valid machine-learning study needs the pipeline and measurement definitions to be independently credible.

**How/where:** Replit published HTTPS prepaid receiver + durable-original callback source; LOGGED PostgreSQL ownership plus UNLOGGED transient receiving state; source-reviewed SHA-pinned one-run JSON AUTH and independent addendum; exact owner, a separately dispatched GitHub Actions safety watchdog and a verified GitHub Actions bot comment heartbeat; strict AeroDataBox account GET/LIST, one CREATE, exact-owned DELETE, stable settlement and retained original-body SHA. Current code is under `server/lib/disruption/`, `scripts/`, `.github/workflows/`; status/evidence under `data-collection/phase3/` and [Issue #38](https://github.com/HKcode22/ReplitTranvr/issues/38).

**What it is not:** No Cloudflare, no Replit AI Agent, no user-free automated schedule of paid starts, no completed Phase6 main collection, no model accuracy proof, no permission to run old Stage2 or repeat a failed subscription automatically.

## The three Phase3 gates and their evidence

| Gate | Measurable question | Evidence required | State as of 17 Oct ~18:00 PDT |
| --- | --- | --- | --- |
| **Gate3** | Can one small WSSS `FlightByAirportIcao` subscription be independently controlled and authenticated through actual raw callback/SQL/Blob/settlement? | User-specific time-bound AUTH, exact source/public SHA, fresh credits/0 other billables, PREPARED source UUID, genuine **live** GitHub bot watchdog lease, one CREATE, verified exact DELETE, >=3 stable provider account reads and signed original readback | **Code/review/release PASS; paid live NOT YET EXECUTED** |
| **Gate0.5** | At a prediction cutoff T, do real native FIDS/schedule, actual/estimated updates and flight identities provide measurable delay labels and a feasible observation horizon? | Predeclared primary target, provider-native clocks, role of FIDS and independent T, censoring/latency, actual observed coverage and sufficient samples | **Not yet verified live / not PASSED** |
| **Gate4** | Are SEND-aware budget caps, stop/recovery, burst margins and any staged second-start controls enforceable in a real small approved exposure? | Actual tested safe credit floor/controller, one separate approved limited live test, exact-owned cleanup, genuine source evidence | **Offline preparations exist; not PASSED live** |

Later **Phase4/Gate5** (independent eligible flight/FIDS denominator), **Phase5 freeze** (new prospectively scoped four-anchor sampling), **Phase6** (31 actual parent paid batch days) and **Phase7 ML** are future separate decisions. See [active scoped roadmap](2026-10-14_EXECUTION_SPRINT_ROADMAP_DEADLINES_AND_EVIDENCE_GATES.md); its dates were conditional *targets*, not guaranteed release times.

## Oct 17 one-shot WSSS: why again, if WSSS already existed?

In September Phase2G, WSSS exposed *scientific data-delivery and airport-yield behavior*. An earlier P2G06 two-hour window had **220 externally billed vs 219 durably received item credits**, one missing billed credit, while later WSSS probe11 passed its own Stage1 MATCH and yield screen. **Gate3's Oct17 WSSS 600s canary is a NEW test of a DIFFERENT property:** independently validated **production subscription lifecycle and emergency-safe ownership**, **not** an instruction to erase the old gap or rerun P2G06 until perfect.

| One-run AUTH field | Frozen reviewed value |
| --- | --- |
| Local start | Saturday **Oct17 20:00:00 PDT**; source reservation between **19:52–19:57 PDT** |
| UTC / scope | Sunday **2026-10-18T03:00:00Z**; `WSSS/departures/2026-10-18T03:00:00Z+600s` |
| Intended window | **600 seconds**, may be honestly censored by soft-credit/safety stop |
| Credit policy | **50 Alert-credit soft stop**; provider cannot guarantee a hard 50 maximum, burst overshoot possible; no unbounded spend |
| Authorization | `AUTH-20261018-G3WSSS01`, [JSON](../authorizations/V3.9_PHASE3_GATE3_AUTH_20261018_WSSS01.json), SHA `7ef03886961fa8a84677062862c675a00a1a6b646eb1407269be4e3831cb2746` |
| SHA approval | [New Phase3 addendum](2026-10-16_GATE3_WSSS_AUTH_SHA_APPROVAL_ADDENDUM.md) read with original historical ledger; original Wave B ledger blob **unchanged** |
| Published reviewed source | `1a9a0ca9dc2750fdc7ad170c543dff7d49e20e00` and matching tree `6a80cad85524341333c9b8d8b196fa1011667717` |
| Independent safety | Manually dispatched [GitHub workflow](../../.github/workflows/phase3-gate3-independent-safety.yml), correct main SHA, UUID and **live bot lease** |
| Max provider mutation | At most **ONE** CREATE, only UTC 03:00:00–03:00:15 if all checks pass; exact-owned DELETE and no automatic retry |

**Published is NOT paid:** Source, SHA and route were verified before the time window, but future provider balance, unbound durable owner, actual GH ARMED heartbeat and exact cleanup remain genuinely future evidence. As observed, GitHub `phase2g-paid` environment exists with three needed secret **names** but **`protection_rules=[]`**; it is not a human-reviewer-protected deployment environment. Do not repeat “protected environment” without that caveat.

## How the watchdog actually works: two-stage, independently authenticated

```text
Approved AUTH SHA + source tree matches published SHA + strict current account
              |
     19:52–19:57 PDT / Stage A
  create ONE LOGGED+UNLOGGED PREPARED UUID, NO provider CREATE
              |
    Browser / GitHub Actions manual independent safety sidecar
  validates AUTH/SHA/owner/provider; creates metadata-only
  github-actions[bot] ARMED issue #38 comment and fresh heartbeat
              |
 Replit owner input "RUN_ID COMMENT_ID"; independently checks BOTH
 real GitHub run in_progress and exact fresh signed-by-bot lease
              |
     UTC 03:00:00 → +15s *only*
 freshly recheck strict balance, no active foreign subs, lease and clock
              |
              ONE paid CREATE
              |
  600s intended observation; local and independent credit/owner STOP
              |
 exact-owned verified provider DELETE; >=3 stable credit reads;
 original signed callback object/body readback and SQL SHA receipt
              |
 Separate safety / strict instrumentation / scientific dispositions
```

Source: [`scripts/v39_gate3_one_wsss_operator_v39.ts`](../../scripts/v39_gate3_one_wsss_operator_v39.ts) (real paid owner), [`scripts/v39_gate3_independent_watchdog_v39.ts`](../../scripts/v39_gate3_independent_watchdog_v39.ts), [lease checker](../../server/lib/disruption/gate3WatchdogLiveLease_v39.ts), [Gate3 admission](../../server/lib/disruption/gate3TwoStageWatchdogAdmission_v39.ts), and [one-run playbook](2026-10-17_WSSS_GATE3_ONE_TIME_OPERATOR_PLAYBOOK.md).

Two bounded times need distinguishing: an owner may CREATE only within UTC **0–15s** after start; the separate safety watchdog can allow bounded activation/binding jitter through UTC+630s to avoid wrongly short-circuiting an actual 600s observation, while rescue observation can persist through UTC+930s. **Rescue is not extra approved scientific exposure.** Lost GitHub bot heartbeat, false UID/SHA, unconfirmed provider identity or resource failure is a **HOLD/STOP**, not permission to keep sending. `6+6` was an earlier **callback-delivery recovery** preference at 15s spacing (180s nominal), **not** 12 free tries to CREATE a new paid provider subscription.

## Explain scientific quality without confusing it with an operations safety certificate

**Keep three truthful outcomes separate:**

- **Safety/finance:** Did the subscription belong to this one authorized owner, stop/delete exactly, and settle? **Hard safety cannot be relaxed** by statistical arguments.
- **Original strict Gate3 instrumentation:** Did full 600s exposure, original callback custody, credit equality and >=3 stable account reads pass? A small accounting gap or shortened interval can leave this strict *protocol* HOLD and should be recorded honestly. Scientific value does not magically upgrade this certificate.
- **Observed scientific data:** Did genuinely received flight observations have correct identities, source SHA, time windows and a plausible denominator/missingness analysis? A project-proposed research-review screen of **<=2 positive billed-credit gap AND <=1% billed fraction** plus identity/duration/custody/closed-account prerequisites can classify a sample as a `QUALIFIED_RESEARCH_CANDIDATE`; **NOT** automatic “population unbiased” or a new permission to launch next paid gate. If only 50 billed items arrive, missing one is 2% of billed items, so even a small absolute gap can fail a numeric 1% review rule. **Never** equate charged item missingness with missing unique physical flights.

The reasoning is grounded in [NIST RDaF data quality/fitness for purpose](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/1500-18/NIST.SP.1500-18r2.html), [STROBE reporting missingness and sensitivity analyses](https://www.strobe-statement.org/checklists/), [Rubin 1976](https://dash.harvard.edu/entities/publication/73120378-8764-6bd4-e053-0100007fdf3b), [Little 2021](https://www.annualreviews.org/content/journals/10.1146/annurev-statistics-040720-031104) and [AeroDataBox SEND billing](https://aerodatabox.com/flight-alert-api-2026/). These standards **do not** impose a universal zero-loss gate; but missingness mechanisms and bias still have to be investigated before inference.

## Chronology: why there were so many Phase3 drafts and what changed

| Period | Dated reality | Why it mattered |
| --- | --- | --- |
| **Oct 13–14** | YSSY P25 231/229 original failure, qualified five-site fieldwork closeout | Required separation of scientific observations vs paid strict protocol; not a reason to redo P25 repeatedly |
| **Oct 14** | Early Gate3 drafts/admission/source scope; V0065 owner/source SQL, runtime and source readback negative tests | Needed a distinct Gate3 owner without rewriting Phase2 historical SQL or accidentally starting a paid subscription |
| **Oct 15** | Authentic authorized artifact/ledger + prepared LOGGED+UNLOGGED ownership, published host and strict provider-readiness composition | Discovered mock “success” or caller-provided booleans were not proof of current real readiness |
| **Oct 16** | Two-stage independent GitHub Actions sidecar with authentic bot lease and near-POST recheck; WSSS future AUTH and SHA hash in **new approval addendum** | Provider CREATE cannot be safely retried if timeout ambiguous; old history must remain byte-identical; live safety requires genuinely active independent watcher |
| **Oct 16–17** | [PR60](https://github.com/HKcode22/ReplitTranvr/pull/60) merged then [PR61](https://github.com/HKcode22/ReplitTranvr/pull/61) fixed the one Stage A reader still loading only historical ledger; four checks each passed, Replit published matching exact GitHub source | Last source reader mismatch was real preflight blocker; fix was narrow and reviewer-readable; current source/host parity now PASS |
| **Oct 17 (upcoming)** | One operator-supervised 600-second WSSS canary, not automatically dispatched | Needs real observed bot heartbeat/one CREATE/delete/settlement before Gate3 certification |

**Time/complexity reflection:** It genuinely took work to handle provider billed-send vs delivery, sidecar ownership, source-preserving SQL and webhook callbacks, retries, ambiguous network commits and public SHA skew. We also **spent too much time** on repetitive full P25 reviews, excessive draft reports, over-strict interpretations of minor *scientific* gaps and excessive hypothetical defenses before a bounded canary. The correction is to preserve all valid measurements with transparent limitations and only block on actual P0 ownership/secret/billing, irreproducible source or fundamentally invalid identity/denominator. Do not weaken the critical one-POST or exact-owned delete rules.

## Current Phase3 documentation catalog

- **Live at handoff:** [17 Oct WSSS exact manual operator playbook](2026-10-17_WSSS_GATE3_ONE_TIME_OPERATOR_PLAYBOOK.md); [predeclared scientific and operational quality policy](2026-10-16_GATE3_WSSS_SCIENTIFIC_TOLERANCE_AND_OCT17_LIVE_RUNBOOK.md).
- **AUTH and provenance:** [Phase3 SHA approval addendum](2026-10-16_GATE3_WSSS_AUTH_SHA_APPROVAL_ADDENDUM.md); [AUTH JSON](../authorizations/V3.9_PHASE3_GATE3_AUTH_20261018_WSSS01.json); original [ledger](../evidence/ledgers/V3.9_RUN_REPORTS_AND_EVIDENCE.md) untouched; [Issue #38 checkpoint](https://github.com/HKcode22/ReplitTranvr/issues/38).
- **Technical explanation:** [Oct14 phases 2–7 in depth](2026-10-14_TECHNICAL_GUIDE_PHASES2_TO7_AND_CURRENT_GATE3.md), [Oct14 plain-language progress](2026-10-14_START_HERE_PLAIN_LANGUAGE_PHASE3_PROGRESS_AND_NEXT_STEPS.md), [Oct14 roadmap](2026-10-14_EXECUTION_SPRINT_ROADMAP_DEADLINES_AND_EVIDENCE_GATES.md).
- **Historical engineering checkpoints:** [Oct15 source owner wiring](2026-10-15_GATE3_ACTUAL_EXECUTION_OWNER_WIRING_AND_PAID_RELEASE_SEAL_CHECKPOINT.md), [Oct15 prepared source/ledger](2026-10-15_GATE3_LEDGER_BOUND_PREPARED_SOURCE_RESERVATION_AND_DETAILED_REPORT.md), [Oct16 two-stage watchdog](2026-10-16_GATE3_TWO_STAGE_WSSS_WATCHDOG_CONTINUITY.md), [Oct16 source release](2026-10-16_GATE3_WSSS_SOURCE_RELEASE_CANDIDATE_HANDOFF.md). They are **dated reports**, not current launch truth when their release-seal flags or HEAD are obsolete.
- **Prior source history:** [START_HERE](START_HERE.md) and PR36 originally staged Phase3 experimentation; that file may describe a former unmerged state and must be interpreted as a **historic branch checkpoint**.
- **Future scoped design:** [four-anchor Phase3–6 roadmap](2026-10-14_EXECUTION_SPRINT_ROADMAP_DEADLINES_AND_EVIDENCE_GATES.md), [prospective revised four-anchor idea](2026-10-14_PROPOSED_PROSPECTIVE_SMALL_ANCHOR_MAIN_STUDY_AMENDMENT.md). A proposal is not a retroactive rewrite or an automatic Phase6 paid authorization.

### For a boss: the honest one-sentence status

“**We have a source-tested, published and independently verifiable prototype for a single, bounded, supervised real-data ingestion canary. Its end-to-end paid safety and research quality are about to be measured; the long-run multi-airport study and machine-learning model are future stages, not yet a delivered production forecasting product.**”

**Strict operational boundaries:** No Replit AI Agent, no Cloudflare, no unreviewed production migration re-apply, no second paid CREATE or refill by inference from this README. This documentation change remains **off main** until the time-bound canary is complete or a separately reviewed new source pin and published republish is authorized.
