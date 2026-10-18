# Aviation V3.9 — from aviation-data pilots to trustworthy delay-model training data

**Start here for a colleague, manager, scientific reviewer or future project maintainer.** This is the **research and evidence home** inside [HKcode22/ReplitTranvr](https://github.com/HKcode22/ReplitTranvr). Status is **as of Saturday 2026-10-17 ~18:00 PDT**, not an assertion that tonight's paid Gate3 experiment finished.

> **Quick presentation:** [The project story for peers and management](PROJECT_STORY_FOR_PEERS_AND_MANAGEMENT.md) (executive elevator pitch, annotated timeline, data/architecture flow, quantified success/failure examples, retrospective and references). **Tonight's operator:** [one-time WSSS Gate3 playbook](phase3/2026-10-17_WSSS_GATE3_ONE_TIME_OPERATOR_PLAYBOOK.md), drafted separately and **NOT merged into deployed `main` before the live source-pinned canary**. **Authoritative experimental evidence:** [Study Hub](STUDY_HUB.md) / [Plan](plans/V3.9_DataCollectPlan_f.8.md) / [Implementation Log](implementation/V3.9_IMPLEMENTATION_LOG.md) / [original ledger](evidence/ledgers/V3.9_RUN_REPORTS_AND_EVIDENCE.md).

## 1. The answer in 20 seconds: what, why, how, where, when

| | Summary you can repeat |
| --- | --- |
| **What** | Build a provenance-aware aviation-data collector that can eventually train/evaluate ML models for **departure/runway delay** using information knowable before a prediction cutoff. |
| **Why** | Raw API messages alone do not prove complete flight coverage, correct physical flight identity, timestamp validity, unbiased airport sample or safe credit spending. |
| **How** | AeroDataBox real-time alerts + bounded FIDS/REST; Replit HTTPS webhook; PostgreSQL, SHA-preserved original payloads and object storage; source-reviewed GitHub Actions watchdog; frozen sampling/budget/clock/identity scientific protocol. |
| **Where** | `data-collection/` = plans, evidence, science and documented decisions. `server/lib/disruption/` + `scripts/` = real owner/ingestion logic. `.github/workflows/` = CI and manual independent safety. Replit = published receiver. |
| **When** | Early exploratory collection Aug–Sep 2026; Gate0 Phase1 checks September; WSSS/OMAA/MMUN/SKBO/YSSY staged pilots September–Oct13; qualified Phase2 closeout Oct14; code/repo audit Oct15–17; one limited Gate3 WSSS canary **scheduled for Oct17 20:00 PDT, not yet executed at writing**. |

## 2. What worked, what failed, and why both can be true

The **observations are real**, and so are the protocol limitations:

- **WSSS P2G06 (Sep21–22):** 36 SHA-checked original callbacks carried **219 flight items**; provider SEND billing **220**; gap **1**; (219/220=99.545%) **billed-credit capture**, *not* a measured global physical-flight recall. History records a failed exact reconciliation. [Exact WSSS reconstruction](phase2g/reports/2026-09-21_P2G06_WSSS_RECONSTRUCTION.md).
- **OMAA P2G03 (Sep16):** a complete two-hour successful Stage1 run; its original `P2G02` report filename is historical and **not the actual AUTH label**. Preflight first refused unhealthy callback, then allowed verified readiness. [OMAA evidence](phase2g/reports/2026-09-16_P2G02_OMAA_SUCCESS.md).
- **YSSY P25 (Oct13):** **7203.639 seconds** of uncensored observed window, **58/58** source-original bodies SHA/size verified, **229 items received versus 231 provider billed**, 107 reconstructed physical flight identities; original exact-protocol **DELIVERY_GAP / failed**, separately recognized as a *qualified observational research candidate* after verified custody. [P25 history](phase2g/reports/2026-10-13_P25_YSSY_120MIN_COMPLETED_PROTOCOL_FAIL_RESEARCH_CANDIDATE.md) · [Oct14 independent closeout](phase2g/reports/2026-10-14_PHASE2G_GATE2_CLOSEOUT_EVIDENCE_AND_DECISION.md).
- **MMUN:** some observations were measurable but historical physical-flight identity and threshold/comparability defects were genuine; MMUN is not a chosen four-anchor main-study hub. [Failure taxonomy](phase2g/reports/2026-09-26_PHASE2G_COMPLETE_FAILURE_ROOT_CAUSE_AND_PREVENTION_REPORT.md).
- **Current progress:** qualified five-site fieldwork closed Oct14, original strict five-anchor Gate2 **NOT PASSED**. Source-reviewed Phase3 Gate3 owner and watchdog ([PR60](https://github.com/HKcode22/ReplitTranvr/pull/60), [PR61](https://github.com/HKcode22/ReplitTranvr/pull/61)) with 4/4 exact-head offline CI each. Published Replit public identity checks passed at `main=1a9a0ca9dc2750fdc7ad170c543dff7d49e20e00` and reviewed tree `6a80cad85524341333c9b8d8b196fa1011667717`, including original custody and 168-hour retention. **No Gate3 paid canary result yet.** [Verified continuity Issue #38](https://github.com/HKcode22/ReplitTranvr/issues/38).

**How to interpret a missing item:** If `external=231` and `received=229`, the **2-unit accounting difference must remain recorded**, but it does not magically invalidate 229 authenticated received observations or prove exactly two unique physical flights went missing. See [quantitative assumptions in the case study](PROJECT_STORY_FOR_PEERS_AND_MANAGEMENT.md#4-scientific-imperfection-is-not-the-same-as-permission-for-unreliable-accounting). Research-only illustrative screening of **<=2 credit items AND <=1% missing billed fraction**, plus real source/identity/closed-account criteria, is a *prospective review parameter*, not the project's original strict instrumentation score and not a universal scientific rule. For high-stakes billing/unsafe ownership, **strict stops still apply**.

## 3. Navigate the repository by question, not by filename

| When someone asks… | Go here | What this does |
| --- | --- | --- |
| “Explain it in two minutes / show my boss” | [Management & peer case study](PROJECT_STORY_FOR_PEERS_AND_MANAGEMENT.md) | Plain English plus deep evidence, real dates, diagrams and lessons |
| “Why was Phase0 needed?” | [Phase0 README](phase0/README.md) | Hypotheses, scientific validity assumptions, review history |
| “How did we know what we were allowed to spend?” | [Phase1/Gate0 README](phase1/README.md) | API units vs Alert credits; provider account identity, floors, AUTH |
| “What reference frame was considered?” | [Phase2 README](phase2/README.md) | ADS-B observed route network vs licensed schedules, sampling constructs |
| “Show actual airport pilots and failures” | [Phase2G README](phase2g/README.md) + [all historical reports](phase2g/ALL_REPORTS.md) | Real raw webhook evidence, original statuses, exact reconciliation, identity flaws |
| “What are we preparing to run?” | [Phase3 README](phase3/README.md) + [Oct17 single-use operator playbook](phase3/2026-10-17_WSSS_GATE3_ONE_TIME_OPERATOR_PLAYBOOK.md) | Current reviewed source, future 600-second one-run AUTH, independent watchdog |
| “Where is the frozen scientific authority?” | [Plan](plans/V3.9_DataCollectPlan_f.8.md), [implementation](implementation/README.md) | Versioned project rules and actual changes |
| “Show the original evidence” | [Evidence index](evidence/README.md) + [352 machine artifacts](evidence/ARTIFACTS_START_HERE.md) | Audit trail and original SHA-protected records |
| “Explain the folder migration” | [Folder guide](FOLDER_GUIDE.md), [all 108 original sources](ALL_SEPMD_FILES.md) | Historical custody and navigation after repository cleanup |
| “Which scripts are permitted?” | [Operations](operations/README.md), [Replit shell-only guardrail](phase2g/operations/OPERATOR_SHELL_ONLY_GUARDRAIL.md) | Zero-agent, paid-operation boundaries |
| “Where is scientific analysis code?” | [Analysis](analysis/README.md) | Offline math/research; no paid mutations |
| “What's the current unresolved status?” | [Issue #38](https://github.com/HKcode22/ReplitTranvr/issues/38) | Dated exact SHA, deployment, CI, AUTH and next starting point |

## 4. The phases in a diagram

```text
Phase 0   Scientific validity + research/measurement reviews
   ↓
Phase 1   Gate 0: provider identity, entitlement, cost and two budget ledgers
   ↓
Phase 2   Traffic/route reference, variable definitions and sample-frame decisions
   ↓
Phase 2G  Paid small real airports → evidence, identity, missingness, incident lessons
   ↓
Phase 3   Gate 3: one tiny independent-watchdog paid integration
          Gate 0.5: real provider-native T/FIDS timing and label feasibility
          Gate 4: bounded financial controller and second-start safety
   ↓
Phase 4   Gate 5: eligible flight-population denominator and coverage audit
   ↓
Phase 5   Prospective four-anchor design, balanced UTC, 31-day calendar, FREEZE
   ↓
Phase 6   Separately authorized measured paid main collection
   ↓
Phase 7   Leakage-safe ML fitting / baseline comparisons / protected evaluation
```

**Do not collapse all green checks into one PASS.** “CI passed” means source tests passed, “provider sent an alert” means billing event, “we received a webhook” means candidate evidence, “raw object SHA read-back” means custody, “model generalized” requires representative and externally evaluated labels, and “subscription safely ended” means independently verified account cleanup. Each is different.

## 5. Infrastructure for technical audiences

The real path is AeroDataBox credit-based `FlightByAirportIcao` → HTTPS **Replit published** `/api/v1/webhooks/aerodatabox/:secret/prepaid/:sessionId` → source-original object storage/receipt SHA → PostgreSQL durable owner + ephemeral receive runtime → validated physical-flight identity/clock → exploratory dataset with explicit missingness → future FIDS eligibility denominator and model-ready `as_of T` features. GitHub Actions is a **separate** authenticated CI/watchdog, not a substitute for Replit's publisher; no Cloudflare; no Replit AI Agent. A webhook HTTP response that is slow/non-2xx can be billed anyway, according to [AeroDataBox SEND-billing documentation](https://aerodatabox.com/flight-alert-api-2026/). The original JSON/SQL state/Blob SHA must be verified rather than trusting a caller's success boolean.

For the **Oct17 only** release, `AUTH-20261018-G3WSSS01` approves one airport-wide WSSS departures attempt at Oct18 03:00Z, intended 600s, 50-credit **soft** stop, **one** provider CREATE and zero automatic repeats. The original historical ledger is preserved byte-for-byte; the new AUTH SHA approval is in its own [Phase3 addendum](phase3/2026-10-16_GATE3_WSSS_AUTH_SHA_APPROVAL_ADDENDUM.md). Replit can have a local "Published your App" metadata commit whose **tree** matches the reviewed source; source tree+public reported `git_head` were independently verified. The manual workflow environment has named secrets but, at last check, **no reviewer-protection rules**; don't advertise such protection falsely.

## 6. Why months of work, and what we would do differently

**Necessary:** normalize flight identities rather than count strings, freeze time-slice/airport sampling before judging yield, record data already available at cutoff (prevent leakage), prove original callback bytes, isolate provider SEND from receiver ACK, handle restart-sensitive UNLOGGED sessions vs durable LOGGED owners, isolate paid subscriptions and protect credits, publish exact reviewed code rather than trust a development server.

**Avoidable:** repeated Phase2/P25 broad CI/review churn after evidence stabilized; too many draft PRs and “current” documents with competing dates; over-strict binary research interpretation (“one missing item means no valid rows”) vs transparent qualified observational analysis; excessive speculative controls without a concrete P0 reproduced failure; ambiguous operator handoffs; unrealistic deadlines. These are documented project-management lessons, not proof earlier data or failure-recovery tests were pointless. Going forward: **one current checkpoint, one reproducible runbook, stop once the minimal real gate evidence is sufficient**, retain literal historical outcomes while prospectively revising scientific inclusion criteria.

## 7. Research standards and source provenance

- **Provider SEND vs delivery:** [AeroDataBox 2026 credit-based alerts](https://aerodatabox.com/flight-alert-api-2026/) explains one credit per item, multi-item callbacks and billing for failed sends/retries. Credit item counts are not necessarily physical-flight counts.
- **Missingness mechanism:** [Rubin 1976](https://dash.harvard.edu/entities/publication/73120378-8764-6bd4-e053-0100007fdf3b) and [Little 2021](https://www.annualreviews.org/content/journals/10.1146/annurev-statistics-040720-031104) distinguish MCAR/MAR and related inference assumptions. A small numeric missing fraction is *not* proof of unbiased collection.
- **Evidence quality:** [NIST Research Data Framework SP1500-18r2](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/1500-18/NIST.SP.1500-18r2.html) covers fitness for purpose, accuracy, completeness, relevance and reliability; [STROBE](https://www.strobe-statement.org/checklists/) explains reporting missing-data handling and sensitivity. Neither dictates an absolute zero-gap rule.
- **Crash behavior:** [PostgreSQL UNLOGGED documentation](https://www.postgresql.org/docs/16/sql-createtable.html): transient unlogged data are not guaranteed crash-safe, requiring an independent durable owner.
- **Specific historical scientific claims:** each dated original report or machine artifact retains its own recorded conclusion. A new README **never** changes an old AUTH, original ledger row, source payload, failed CI or paid result.

### Preservation / relocation history

The Wave B migration preserved **108 original `SEPmd/` scientific source files** and **352 original `artifacts/` machine-evidence files**, a total of 460 original scientific/evidence Git blobs, at new `data-collection/` locations. These literal historical labels are retained deliberately for provenance checks, old links and peer navigation: `SEPmd/` and `artifacts/` are **not now writable roots**. See [Wave B PR #46](https://github.com/HKcode22/ReplitTranvr/pull/46) and the [actual 460-blob SHA/mode/size relocation manifest](../docs/repository-maintenance/manifests/2026-10-15_WAVEB_ACTUAL_460_BLOB_RELOCATION.csv).

A **separate 47 unmerged PR36-only files** were inventoried in a cross-branch proposal; they are **not** silently included among the 460 main-source relocation blobs or treated as a live approved scientific plan. See the [155-file cross-branch exact-path review](../docs/repository-maintenance/2026-10-15_SEPMD_EXACT_PATH_MAPPING_AND_CASE_CONFLICT.md). [Phase0/1 history](phase0/README.md) and [Wave C2 custody checkpoint](../docs/repository-maintenance/2026-10-15_WAVEC2_PHASE0_PHASE1_RELOCATION_CHECKPOINT.md) preserve separate original reviews/checklist. Old `SEPmd/` strings inside signed historical records remain intentionally unchanged even if their **physical** file paths moved; use the provenance manifest rather than executing an old legacy path.

[**Next: read the 60-second boss briefing and deep case study →**](PROJECT_STORY_FOR_PEERS_AND_MANAGEMENT.md)
