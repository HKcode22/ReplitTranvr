# Phase 2G Historical Failure Register and Prevention Matrix

> Canonical purpose: keep every known paid/synthetic Phase-2G failure class, pre-launch refusal, and relevant predecessor defect in one place so later fixes do not accidentally re-introduce an older failure.
> Canonical branch: `main`
> Scientific rule: historical failed/censored attempts remain failed/excluded. Engineering fixes never rewrite a past failure into PASS.

## Identifier discipline

Three identifiers were historically used and can be confused:

- **AUTH label** — e.g. `AUTH-20260916-P2G03`;
- **durable probe ID** — the integer in `clean.adb_anchor_probe`;
- **budget day** — e.g. `P2G-S1-20260916-02`.

They are not interchangeable. In particular:

| Durable probe | Airport | Actual AUTH / operational label | Budget day | Scientific state |
|---:|---|---|---|---|
| 1 | WSSS | `AUTH-20260916-P2G02` | `P2G-S1-20260915-01` | failed / censored / UNRESOLVED |
| 2 | OMAA | `AUTH-20260916-P2G03` | `P2G-S1-20260916-02` | completed / uncensored / MATCH |
| 3 | MMUN | `AUTH-20260917-P2G04` | `P2G-S1-20260917-03` | failed / censored / UNRESOLVED |
| — | LKPR | `AUTH-20260918-P2G05` | frozen `P2G-S1-20260918-04`, never created in DB | NOT_RUN / pre-launch refusal |
| 4 | WSSS | P2G06 | `P2G-S1-20260921-05` | failed / full-duration / historical MISMATCH |
| 5 | WSSS | P2G07 | `P2G-S1-20260922-06` | failed / censored / UNRESOLVED |
| 6 | WSSS | P2G08 | `P2G-S1-20260922-07` | failed / censored / MATCH, excluded |
| 7 | WSSS | P2G09 | `P2G-S1-20260922-08` | failed / censored / UNRESOLVED |
| 8 | WSSS | P2G10 | `P2G-S1-20260923-09` | failed / censored / UNRESOLVED |

The old OMAA report filename contains `P2G02`; its content is corrected to state that OMAA actually used AUTH P2G03.

## Candidate coverage truth

The compact-6 set is WSSS, OMAA, MMUN, LKPR, SKBO, YSSY.

- WSSS: multiple attempts; all historical results listed below.
- OMAA: one valid completed/MATCH result.
- MMUN: one infrastructure-invalid failed/censored attempt.
- LKPR: **never started as a paid Stage-1 probe**; P2G05 refused before paid preflight/provider action.
- SKBO: not yet run.
- YSSY: not yet run.

A pre-launch refusal is not a scientific airport failure. An untouched candidate is not a failed candidate.

## Failure/prevention matrix

| Historical event | What actually failed | Scientific disposition | Current preventive/containment control | Regression/evidence |
|---|---|---|---|---|
| 2026-08-19 pre-Gate canary + premature WSSS | Unmanaged callback row could insert `is_randomized=NULL` into a NOT NULL column; canary SEND spent 1 credit and persisted no item. WSSS started before canary PASS was invalid. | Not valid Stage-1 evidence. | `flightNotificationExtractor_v3.ts` defaults unmanaged `isRandomized` to `false`; migration 0022 keeps NOT NULL DEFAULT false; paid gates require predecessor evidence. | Historical Log §34/archive; historical regression test below protects the default. |
| [Probe 1 / WSSS / AUTH P2G02](incidents/2026-09-16_PROBE1_WSSS_RUNTIME_STATE_LOSS.md) | UNLOGGED prepaid runtime session disappeared/reset while provider subscription existed; owner/supervisor processes were gone; callbacks then failed closed because the session no longer existed. | failed / censored / UNRESOLVED; excluded. | Random runtime UUID is durably bound to the logged probe **before** provider creation; exact recovery can reconstruct the deterministic callback after an UNLOGGED reset; no bulk delete; current lifecycle owner is GitHub Actions with independent watchdog. | `probeExecutionPrepaid_v39.ts`; `v39_phase2g_stage1_recover_after_exit_v39.ts`; `phase2g_stage1_persistent_launch_v39.test.ts`. |
| Probe 2 / OMAA / AUTH P2G03 | No terminal failure. First preflight was blocked while callback unreachable; later exact preflight passed and full window completed. | completed / MATCH; valid historical Stage-1 evidence. | Preserve exact preflight/runtime binding. Do not infer platform durability from this one success. | Corrected OMAA report; P2G03 PASS preflight and supervisor status artifacts. |
| [Probe 3 / MMUN / AUTH P2G04](incidents/2026-09-17_PROBE3_MMUN_RUNTIME_INTERRUPTION.md) | Replit/runtime-reset interruption. Durable evidence records failed/censored/UNRESOLVED; exact owned subscription cleanup verified. The repository does not preserve enough lower-level exception detail to claim a more specific platform cause. | infrastructure-invalid; excluded. | Same durable-session/exact-recovery controls as probe 1; GitHub-owned lifecycle removes Replit shell/process survival from paid ownership; callback/runtime health is independently checked. | P2G04 status, failed-attempt adjudication receipt, MMUN exact-session cleanup artifact, runtime-survival tests. |
| [P2G05 / intended LKPR](reports/2026-09-18_P2G05_LKPR_PRELAUNCH_REFUSAL.md) | **No paid probe occurred.** Stale callback verifier expected `route_owner=server/routes_v3.ts` while managed runtime correctly reported `server/index.ts+server/routes_v3.ts`; preparation refused before paid preflight. | LKPR remains unmeasured; 0 provider subscription; 0 Alert credits for attempt. | One exact managed runtime-health schema/owner contract is used by callback verifier, paid preflight, paid owner, and zero-credit binding workflow; stale AUTH reuse forbidden. | Run Reports P2G05 adjudication; `phase2g_runtime_survival_v39.test.ts`; exact runtime rechecks. |
| Weekend hardening after P2G05 | Migration 0022 replay could resurrect an obsolete tier-source constraint; stale route-owner verifier drift was also present. | Engineering-only, zero-provider. | Migration 0022 detects modern `adb_sampling_frame_tier_source_check_v2`; managed runtime contract regression tests; repeat migration CI. | V3.9 Offline Safety applies migrations and idempotence replay on every current HEAD. |
| P2G06 / probe 4 WSSS | Full 120-minute collection produced 36 payloads / 219 internal credits, while settled external spend was 220. Exact-equality gate failed; initial failure path did not preserve enough safe aggregate diagnostics before transient cleanup. | historical failed full-duration MISMATCH; excluded; never retroactively PASS. | Durable reconciliation evidence is written before cleanup; callback counters retained; settled external spend authoritative; positive external-minus-received gap becomes terminal non-scoreable `DELIVERY_GAP`; only exact MATCH is promotion-valid; real censoring value propagates. | P2G06 reconstruction report; `prepaidProbeWindow_v39.ts`; migration 0058; compact6 reconciliation tests. |
| P2G07 / probe 5 WSSS | AeroDataBox control plane returned HTTP 502 during balance/delete path; exact provider subscription remained active after child exit until exact-ID recovery. | infrastructure/provider-safety failure; failed/censored/UNRESOLVED; excluded. | Bounded transient provider-read retries; exact subscription deletion verification; recovery can clean an exact owned subscription even after probe row already became failed; ambiguous ownership refuses. | P2G07 recovery amendment + adjudication artifact; persistent-launch tests. |
| P2G08 / probe 6 WSSS | Repeated balance-control-plane 502 censored the run. Exact reconciliation was MATCH, but pre-fix code allowed the censored result to flow through a false-completion/PASS path. | adjudicated failed/censored/MATCH; excluded. | Provider balance polling decoupled from local watchdog; bounded retries and repeated-failure threshold; every censored window is refused as completed; prelaunch 3-read balance stability canary. | P2G08 amendment/adjudication; `balance_read_failed_after_retries` and censoring regression assertions. |
| P2G09 / probe 7 WSSS | Replit development workspace/process replacement killed supervisor + child while callback application recovered and provider subscription remained active. | infrastructure-invalid failed/censored/UNRESOLVED; excluded. | 120-minute lifecycle owner moved to GitHub Actions; independent GitHub recovery watchdog; durable session ownership; exact-ID recovery; deferred `settling` cleanup so GitHub never needs Replit blob credentials. | P2G09 incident report; GitHub owner/watchdog tests; migration 0059. |
| Incident 24 | Published `travnr.com` backend was a stale snapshot; correct-secret synthetic prepaid callback returned 500 due missing retention configuration/current route. | Zero-credit infrastructure incident; not scientific evidence. | Explicit same-app-development contingency allows exact current `.replit.dev` callback without republish; exact runtime HEAD/owner/route/retention contract must PASS. | Incident 24 report; same-app contingency artifact/tests. |
| Incident 25 | Prepaid-item INSERT placeholder/type ordering caused UUID/integer PostgreSQL failure during zero-credit synthetic callback. | Zero-credit infrastructure incident; caught before paid run. | Corrected SQL placeholder contract and dedicated regression test. | `tests/phase2g_prepaid_item_sql_placeholders_v39.test.ts`. |
| P2G10 / probe 8 WSSS | GitHub environment webhook secret differed by one character from Replit secret. Provider callback host/session were correct; provider spent credits, but Replit rejected requests with 404 before callback accounting/persistence. | infrastructure-invalid failed/censored/UNRESOLVED; excluded. | Zero-provider GitHub→Replit secret-binding endpoint/workflow before paid admission; paid gate repeats it; owner repeats it immediately before provider ownership; GitHub/Replit runtime-DB binding; URL-encoded secret; watchdog exact-recovers after persistent provider spend with zero callback requests. | P2G10 incident report; zero-credit binding workflow/tests; owner/watchdog regression tests. |
| Secret-reveal diagnostic workflow | Temporary diagnostic workflow attempted to display transformed secrets. | Security/operations issue; no scientific effect. | Unsafe workflow removed; credentials rotated by operator; never print/transform secret values for display. | Security incident report. |

## Residual risks that are contained but cannot be made impossible

1. **Provider control-plane outages** can still occur. The code can retry boundedly and fail closed, but cannot guarantee AeroDataBox availability.
2. **Replit callback runtime loss** can still occur under the same-app contingency. GitHub ownership prevents lifecycle-owner loss from being the same failure domain, and callback-health/no-callback-spend guards stop exposure, but the public callback itself still depends on Replit.
3. **Internet delivery gaps** can occur even with healthy code. The protocol preserves them as terminal `DELIVERY_GAP` rather than pretending missing payloads were observed.
4. **Human secret/configuration mistakes** remain possible, but the GitHub→Replit zero-credit binding gate is specifically designed to block them before subscription creation.
5. **No automatic retry after P2G11.** A future infrastructure failure must be adjudicated and separately authorized; the code must never silently consume another WSSS attempt.

## Thursday P2G11 non-negotiable prerequisites

Before a paid subscription can be created:

1. canonical `main` HEAD is green in V3.9 Offline Safety;
2. Replit is synced to that exact HEAD and its managed runtime reports PASS;
3. P2G10 is adjudicated, budget closed, and active billable subscriptions are zero;
4. fresh Thursday runtime/budget and fresh AUTH are created; no P2G10 artifact is reused;
5. fresh zero-credit Replit callback proof passes;
6. GitHub zero-credit callback binding proves exact runtime HEAD, runtime database, and webhook-secret agreement;
7. paid gate repeats the binding and provider-read-only checks;
8. owner repeats runtime health, DB binding, and webhook-secret binding immediately before provider ownership;
9. watchdog is active and incapable of creating a subscription;
10. if provider spend becomes positive while callback requests remain zero for the frozen threshold, exact recovery is invoked;
11. published Replit deployment access is not required while the explicitly frozen same-app contingency passes all gates.

## Machine-readable register

The same historical attempt inventory is frozen in:
`artifacts/phase2g-historical-attempt-register-20260923.json`.

This is a navigation/consistency artifact only; it does not authorize any retry or provider action.

## Documentation rule going forward

Every future Stage-1 attempt must be added here, including:
- candidate/ICAO;
- durable probe ID;
- AUTH ID;
- budget day;
- terminal/censored/reconciliation state;
- provider spend and received accounting where available;
- root cause and certainty;
- cleanup result;
- scientific disposition;
- corrective code/test reference.

Do not record an airport as scientifically failed when execution stopped before paid launch or when a failure is demonstrably infrastructure-only.
