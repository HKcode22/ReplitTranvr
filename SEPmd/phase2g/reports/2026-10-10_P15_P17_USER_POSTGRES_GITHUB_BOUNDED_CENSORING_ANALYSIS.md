# P06/P15/P17/P19 — User proposal review: PostgreSQL + GitHub as independent observer, and a less-strict 6+6 with censored outcomes

Prepared Oct 10, 2026 PDT. **PROSPECTIVE DESIGN EXPERIMENT ONLY; NO NEW SCIENTIFIC AMENDMENT, NO PAID LAUNCH, NO BUDGET AUTH OR PRODUCTION DB WRITES. No Cloudflare and no new paid platform.** Original F.8, Stage-1 YSSY window, local operating hours, physical-flight-v2 and old failed/censored P2G22/23/24 outcomes preserved.

## Technical topology: what PostgreSQL can actually do

**Current path:** AeroDataBox **HTTPS POST → Replit published HTTPS callback → Postgres SQL persistence + existing Replit raw App Storage**. Only the HTTP receiver can write an AeroDataBox HTTP body to Postgres.

A `postgresql://...` / `postgres://...` URL is **not** an HTTPS webhook URL: it implements PostgreSQL's frontend/backend wire protocol, not HTTP. AeroDataBox cannot POST its JSON straight to it. If Replit is unreachable BEFORE the incoming POST is accepted, the available Postgres database has **no message to store**, although it can remain online and answer independent SQL queries.

**Proposed useful secondary path:** existing GitHub Actions paid-owner process **→ PostgreSQL directly, with read-only credentials → independent snapshot/reboot detection/8-bin received counts/health and accounting observation**. The GitHub runner can run SQL even if the Replit app is unhealthy *provided the DB is externally reachable and its credentials are configured*. This is independent **observability and containment**, NOT independent upstream original-wire ingress. GitHub Actions jobs are scheduled/triggered, ephemeral and not a stable public HTTPS webhook listener. GitHub `repository_dispatch` API is an authenticated event trigger, not a generic Aerodatabox callback endpoint; configuring the provider to hit GitHub with authentication tokens is neither designed nor authorized.

A true independent ingress requires a **second continuously reachable HTTP handler before Replit**, with durability before its 2xx, original wire+UTC identity, source verification, bounded retention and a credible cost evaluation. Current authorized components alone cannot implement that during complete Replit outage. A Replit reserved deployment still shares Replit's failure domain and may have billing; do not silently activate.

Official documentation: PostgreSQL [frontend/backend protocol](https://www.postgresql.org/docs/current/protocol.html), [connection URI](https://www.postgresql.org/docs/16/libpq-connect.html); GitHub [workflow external events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows), [limits](https://docs.github.com/en/actions/reference/limits); AeroDataBox [2026 delivery and billing](https://aerodatabox.com/flight-alert-api-2026/).

## What the three-strike watchdog got right, and where it is arguably too strict

Four health-check endpoints include wrong-secret route, published build, secret binding and runtime DB binding. **A failed GET/health cycle is NOT evidence that an actual AeroDataBox delivery was missed.** Three consecutive 15-second failures can stop the paid owner before source impact is evaluated. Conversely, recovery of GET health cannot establish no missed notifications during the outage.

A 6+6 candidate has nominal 12 checks at 15-second cadence with an independent 180-second wall ceiling: at worst about three minutes of **time** in a two-hour window, approximately 2.5% of elapsed window, but absolutely **NOT a bound of 2.5% of flight item volume**. Traffic is irregular and source absence can correlate with peak activity, aircraft movements, severe delays and cold starts. Source missingness may be missing-not-at-random, making delay estimates biased. The 8 original 15m buckets are not each guaranteed 15 webhooks or equal workload. A numerical one-credit mismatch (historical P2G22 260/259) cannot be assumed negligible without proving *which original billed flight item* is absent; no forced recovered physical flight or fictional UTC arrival.

User's reduced-strictness idea **is defensible for one specifically pre-authorized prospective partial/censored exploratory analysis**, with the old complete F.8 benchmark retained as a separate category. The original experiment cannot be silently rewritten or historic reruns restored.

## Proposed THREE-TIER result classification, NOT executable approval

1. **COMPLETE_RECEIPT_CANDIDATE:** genuine independently authenticated external per-attempt sender ledger and frozen original UTC/raw receipts match the receiver after settlement item-by-item in all 8 bins. Failed GET checks may be harmless; still requires original F.8 yield, identity, budget, lifecycle and scientific approval before final PASS.
2. **BOUNDED_CENSORED_CANDIDATE:** independent sender ledger proves exactly which billed items are missing; missing total/share AND per-bin deficit lie inside **prospectively frozen** limits, the physical-v2 observed subset is valid, the actual window remains 120m and owner/billing stop is verified. Report source loss, incomplete observability, per-bin missingness and impact/sensitivity bounds, and **do not label as complete scientific PASS**. Partial usability requires independent scientific review and amended research questions; observational delay outcomes for missing flights are unknown.
3. **UNVERIFIABLE / INVALID:** no authoritative external ledger, missing original identity/clock, UNLOGGED source loss without reconstruction, unexpected billing duplication, 260/259 class account gap with unknown identity, budget or owner failure, per-bin loss beyond frozen cap, or health outage beyond frozen 6+6 wall. Retain observed rows for forensic/exploratory analysis only with an explicit exclusion/censor label, not complete benchmarking.

**No arbitrary numeric tolerance is approved.** An illustrative offline fixture freezes max 2 missing items, max 2% aggregate and max 1 per 15-minute bin. Those are test arguments, **not** a real P2G25 threshold or power-analysis result. Quantitative allowable loss must be justified by scientific estimand, bound on delay/outcome, missingness mechanism, power and geographic comparative design *before* paid observation. Even 1 missing item could change the extreme tail of runway delay.

## Implementation on isolated unmerged GitHub branch

- `experiments/phase2g_rehearsal/yssy_bounded_loss_scientific_adjudication_v39.ts`: synthetic-only reviewer; preserves 8 elapsed bins, checks source-vs-stored **flight item** evidence rather than two-hour counts or GET statuses, enforces frozen total/share/per-bin caps and 6+6 elapsed limits. Never authorizes original F.8 PASS, partial PASS, paid 6+6 activation or automatic retry.
- `tests/phase2g_yssy_bounded_loss_scientific_adjudication_v39.test.ts`: 13 cases for health-only interruption with no lost items, genuinely known one-item gap, source missing, forged unsigned aggregate 260/259, concentrated loss despite low overall rate, unfrozen bounds, invalid physical identity/clock/cleanup, quiet bin and no flight yield.
- `scripts/v39_phase2g_independent_pg_delivery_readonly_observer.ts`: MANUALLY callable SQL-read-only diagnostic, requiring exact UUID and frozen 120m UTC window and `V39_DATABASE_RUNTIME_URL` in environment. Reports `pg_postmaster_start_time`, session rows/counters, total database delivery/item/provider-*claimed* credit rows, all 8 elapsed bins, **independent sender ledger=false, missing count=null, no completeness evidence**, SHA-fingerprinted session only. Does not make any webhook GET, AeroDataBox call or DB change. No always-on GH workflow configured. It may be used from an existing authorized GitHub owner runner in the future; actual remote-DB connectivity/permissions have **NOT** been tested.
- `tests/phase2g_independent_pg_delivery_readonly_observer_v39.test.ts`: six offline correctness/source-limitation cases; workflow includes both modules and test sets.

## Preferred next engineering steps without Cloudflare

A. Zero-paid-traffic review of historical P2G24 read-only PostgreSQL lifecycle, callback count, signed LOGGED source hashes and Replit revision timing, avoiding original raw mutation.

B. Prove GitHub owner → actual production-compatible Postgres endpoint **READ ONLY** from existing runner with redacted diagnostics, if owner secrets/permissions exist. Do not send AeroDataBox POST or start a subscription. The observer cannot prove missing provider sends.

C. Independently capture *actual* provider billing-attempt ledger or provider source-sent records **if AeroDataBox supports it** (not yet demonstrated), and freeze exact 15m/source identities. If provider cannot provide sender-attempt provenance, the proposed bounded-loss dataset still has unquantifiable missed POSTs: remain censored, no release.

D. Scientific lead prospectively decides whether a censored YSSY window could satisfy a different stated question and whether the missingness might bias geographic/temporal runway-delay comparisons. Old F.8 target and historic retry freeze untouched. Reserve possible extended 6+6 only after bounded dollar-cost/owner-safety and original scientific authorization.

**YSSY paid 6+6 still NO-GO.** Replit Support #564568 original exact cause pending; latest verified GitHub CI results are in the master tracker; no provider credits, GitHub paid new schedule, PostgreSQL live writes, Replit publish/merge, or Cloudflare services used.
