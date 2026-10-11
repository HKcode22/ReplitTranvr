# YSSY Sunday October 11, 2026 — minimum viable decision / 20-priority triage

**Status:** DRAFT engineering triage, reviewed against binding `SEPmd/V3.9_DataCollectPlan_f.8.md` §§20–21 and `SEPmd/V3.9_IMPLEMENTATION_LOG.md` §1.7. Not paid authorization, schema authorization, publish authorization, or a modification to F.8. Goal: STOP expanding the pre-run checklist to demand unrelated perfection. Keep verified received-only research scientifically useful without falsely claiming a complete Stage-1 result.

**Target requested by user:** Sunday 2026-10-11 20:00–22:00 PDT = Monday 2026-10-12 03:00–05:00 UTC = Monday 2026-10-12 14:00–16:00 AEDT. This is NOT equivalent to an eligible F.8 Stage-1 weekday window. Section 21.6 explicitly states “No weekend paid Stage-1 run is authorized”; §21.7 requires the frozen v2 contract-correction recovery order WSSS→OMAA→MMUN before LKPR→SKBO→YSSY. Sunday YSSY cannot be relabeled completed/matched/promotable F.8. A new, separately budget-authorized **exploratory** YSSY run would be a prospectively defined deviation with its own execution state and **no Stage-1 promotion/scoring**, not a silent change to §21.

## Exact verified development checkpoint

- [PR #27](https://github.com/HKcode22/ReplitTranvr/pull/27): draft, isolated investigation branch `phase2g-p2g24-github-observer-20261009`, unmerged; code/test checkpoint `b010a7f08b6eb5abfa814fb11f557364c45f2a85`. [Actions #38133830842](https://github.com/HKcode22/ReplitTranvr/actions/runs/38133830842) **both SUCCESS; 659/659 offline / 63 suites, 126/126 ACTUAL disposable PostgreSQL16**, true SIGKILL LOGGED/PENDING survives and UNLOGGED resets. NO live production/staging POST, paid provider calls, account charges, Replit publish or DB migration. Later documentation commits do not change this code conclusion.
- Actual V3.9 prepaid receiver draft has FOUR mutually dependent explicit source-custody/outside-lock feature approvals, ALL OFF by default. Tests use 18 concurrent DISTINCT 300ms simulated App Storage uploads and full V3.9 SQL; also protect a legacy committed original from another upload, missing legacy object from replacement-ACK, and constructor failure after durable PENDING from DOUBLE failure accounting. **Simulated 18 deliveries overlap; no published-sender P95/P99 proof.**
- Original failed P2G24 30/30 stored-canonical object hashes/sizes passed operator-run read-only audit; original external provider sender census, 260 vs 259 cause, literal HTTP wire bytes and 168h legal archive still NOT confirmed.
- Existing published primary and Travnr endpoints each returned HTTP 200 on one previous GET. Primary claimed source SHA `5de44ba...`, **not latest draft**; Travnr source claim not independently locatable in this repository and v2 failover unverified. GET != webhook POST, published image parity or independent failover.
- User-approved 6 primary + 6 contingent health *checks* (nominal 15s; MAX 180s actual monotonic per incident) is a **research direction**, not live paid policy. Default live supervisor still 3 failures; no synthetic signed emulator can be substituted for AeroDataBox original attempt receipts. Provider billable delivery retries remain zero.

## All twenty priorities — disposition to stop gate creep

Legend: **OFFLINE CLOSED** means the precise test/code subgate passed but does not assert deployed. **LIVE REQUIRED** is a real-world admission step. **DEFER** means not an admission prerequisite for an explicitly exploratory received-only scientific subset, but remains open for a complete F.8 claim or long-term HA. **CONDITIONAL** means needed only for the declared mode.

| ID | Evidence now | Minimum YSSY disposition |
|---|---|---|
| P01 | Replit Quinn general cold-start/no-buffer reply, specific P2G24 04:58 root cause unknown | **DEFER** exact platform forensic cause; independently measure current behavior and fail closed |
| P02 | 30/30 stored canonical objects verified; failed probes preserved | **OFFLINE CLOSED** historical byte check; do not rewrite/copy originals or assume sender census |
| P03 | Real fixture v2 IsOperator/IsCodeshared/Unknown regressions pass | **LIVE REQUIRED** correct metric/owner revision on selected published receiver; no backup-parity claim |
| P04 | Real source parser/2xx-after-verified-bytes+SQL tests pass offline | **LIVE REQUIRED** test actual matched published-equivalent handler, not user-paid webhook route |
| P05 | Source preparation moved prelock; 18 concurrent 300ms upload fixture completes quickly | **LIVE REQUIRED** 10s sender-side synthetic POST and cold behavior under cost-approved isolated public ingress |
| P06 | FOUR-flag V0064 outside-lock actual source path, legacy duplicate and constructor recovery, **659/126 GREEN** | **OFFLINE CLOSED / LIVE REQUIRED** review, staged migration and deployed build; flags OFF until qualified |
| P07 | Published primary and backup one-shot GET 200 | **PARTIAL** good availability signal; not POST durability |
| P08 | Sanitized callback telemetry exists on draft | **CONDITIONAL** enable before bounded test, no secrets/raw-body in logs |
| P09 | Local fsync first-hop synthetic source spool | **DEFER for bounded received-only exploratory science**, but explicitly accept unknown provider sends lost before Replit; **REQUIRED for full-source/F.8 completeness and reliable unattended collection** |
| P10 | Cloudflare declined, second Replit live GET | **DEFER** HA/new hosting; no automatic backup or cost assumption |
| P11 | Actual Node-observed timestamp before JSON parser verified | **PARTIAL** receiver UTC valid, upstream signed original edge/source timestamp unknown; no source-census inference |
| P12 | Disposable replay/current SQL reconciliation tested | **DEFER autonomous replay/queue** in exploratory mode; no unsupported postcrash F.8 continuation |
| P13 | Disposable quarantined v2 recovery and LOGGED/UNLOGGED crash tests pass | **DEFER automatic live restore**; on crash fail/censor and keep source evidence |
| P14 | Synthetic three-leg exact credit reconciliation and 30-object real audit script prepared | **LIVE REQUIRED** fresh authoritative provider balance, active-subscription inventory and exact settled spend; any mismatch remains flagged, never invent absent physical flights. Historical 30-object item-cost audit remains unexecuted |
| P15 | 6+6 policy/decision tests, default 3-strike supervisor | **LIVE REQUIRED** choose safe default 3-strike; 6+6 may not be enabled based solely on GET health |
| P16 | Fixture retention/orphan lifecycle regressions | **LIVE REQUIRED** exact-ID billable subscription stop, drain, bounded settle, no uncontrolled orphan billing |
| P17 | Conditional, observed-only physical-v2 descriptive analytics validated offline | **OFFLINE CLOSED conditional science**; report only verified received cohort, zero imputation of unseen provider items |
| P18 | Two published GETs, draft head known; byte-equivalence to published version not proven | **LIVE REQUIRED** deploy/owner/route SHA and rollback review on ONLY chosen receiver, prohibit unverified standby science failover |
| P19 | No fresh scoped paid run AUTH, balance and complete provider inventory unknown | **LIVE REQUIRED** explicit fresh human exact window/airfield/budget/floor/API ceiling/owner/start-stop approval; not inferred from urgency |
| P20 | 1.218s local Replit Shell 8/8 smoke; full hosted public-POST R0–R11 120m not run | **LIVE REQUIRED for full F.8 durability claim**; for a separately authorized exploratory investigation use short zero-provider published-equivalent POST/fault preflight and acknowledge 120m absence, do not mislabel smoke as full rehearsal |

## Five actual go/no-go checks before *any* additional paid sender spend

A. **Define outcome truthfully.** Official F.8 Phase2G Stage1 YSSY on Sunday = **NOT ELIGIBLE** under frozen §§21.5–21.7. If still using requested Sunday 8 PM, new run must be clearly **NON-PROMOTABLE exploratory received-only** under a separate prospective permission, and previous failed/censored rows stay failed. The current frozen owner/state machine must not be tricked into accepting it as canonical Stage-1. If no supported exploratory owner exists, do not launch paid provider commands.

B. **One matched, healthy receiver.** Identify exact released source/owner SHA; apply V0064 only by reviewed versioned production migration/rollback if necessary; do not deploy the 205-file/657-commit draft PR wholesale. Prove current published public HTTPS synthetic-equivalent POST path, raw object round-trip+SQL COMMIT, v2 identity semantics and sender ACK under <10s including worst observed concurrency/cold-start; keep synthetic isolated from paid database and callback secret. Existing GET 200 and fixture tests do not suffice.

C. **Bound financial/owner exposure.** Fresh independent read-only AeroDataBox balance and active-subscription listing, account floor, alert-credit run cap (overall probe day max 500 only as existing outer ceiling, NEVER auto-authorize 500), API unit budget, existing exact subscription cleanup, owner heartbeat and cancel/finalizer tested. No blind retry, no implicit second subscription, and `maxDeliveryRetries=0`.

D. **Stop on source/owner/budget corruption.** Maintain original byte SHA/size and received-only IDs; ambiguous SQL COMMIT/source readback or transient platform disconnect ⇒ no false ACK, no false recovered full sample. Three-strike default can safely fail/censor early. A 6+6 180s tolerance needs genuine authenticated evidence and separately reviewed prospective modification before use; no assumption time coverage equals item coverage. Ensure deterministic eventual termination of any paid subscription.

E. **Prospective explicit AUTH.** Lock exact 2h window, selected source SHA, metric, receiver/deployment, branch, airport, budget, protected account floor, unique subscription owner, start/stop criteria and run classification. Human authorization **after** checks A–D cannot be synthesized from past AUTH, high urgency, or an automatically generated checklist.

## Decisions/outstanding and precise next actions

1. **Immediate free:** review/ship this isolated PR's reviewed fixes as an independent minimal deployable patch candidate; inspect exact migrations, dedup/uncertain-commit and source custody under a realistic staged receiver. Its current code CI PASS is recorded.
2. **Requires external operator/app capability:** true Replit published-image attestation and POST/cold-start test (no production handler pollution), production-safe migration plan, hosting allowance, and independent provider subscription/balance inventory. These cannot be certified by GitHub tests or passive GET alone. Avoid new Cloudflare/new compute: user declined it.
3. **Requires separate human decision:** whether to amend the study prospectively to a NON-PROMOTABLE Sunday exploratory spend, and specific authorized credit amount/account floor/existing owner. Do not assume that approving an exploratory exception authorizes F.8 ranking, 6+6, cleanup, repeat, or provider retries.
4. **Only then:** decide GO/NO-GO based on observable evidence, not total number of offline tests. Without A–E, paid run stays HOLD. Doing a zero-provider rehearsal at the requested clock time is always a distinct possible goal; it is not substitute proof of an actual paid source census.
