# YSSY Stage-1: NO-CLOUDFLARE engineering decision and dependency gate

Date of review: 2026-10-10 Pacific. Branch `phase2g-p2g24-github-observer-20261009`. **No charge, no cloud provisioning, no paid AeroDataBox owner.**

## User constraint is binding

**DO NOT use Cloudflare** for P09–P12 or the YSSY release path: no Workers, R2, Queues, activation, billing agreement or paid resource usage. Prior experiment-only prototype is retained on draft for historical traceability and must remain disabled/undeployed. Do NOT quietly switch to a paid third-party replacement.

## What existing already-available systems can/cannot prove

| Existing component | Supported role, without activation | Fundamental limit |
|---|---|---|
| Existing Replit published callback + its existing object storage | Receive source bytes when app actually runs; read-back before internal SQL commit, preserve 168h after receipt | A stopped, unreachable or cold-started Replit app cannot durably accept upstream original sends. HTTP success measured inside the service does not prove the AeroDataBox sender received a 2xx within its 10s deadline |
| Existing runtime PostgreSQL, `UNLOGGED` scientific tables | Low-latency session and flight identity staging; real disposable SIGKILL tests reproduce its state loss | State can disappear on database crash, including after Replit object bytes survive. Existing `LOGGED` blinded metadata/journals on a test DB are not an independently hosted provider source ledger; restoring real science still requires a prospectively approved privacy-preserving original-source chain |
| GitHub Actions owner / watchdog | Owner isolation, exact SHA preflight, supervised stop, CI regressions, local synthetic no-provider tests | GitHub Actions is not a continuously available public HTTP webhook receiver; its job log/heartbeat is not an independent original-provider delivery transcript or substitute for upstream 2xx |
| AeroDataBox webhook and balance API | Real provider sends flight notification attempts and bills by flight ITEM. Existing paid balance/list/status APIs may support explicitly authorized read-only preflight | Sender delivery can fail after credit is charged. Default provider retries are disabled; enabling retries may spend another full notification's flight-item credits. No evidence of a free complete sender-ledger API for the original unsent/lost payloads |
| Local Mac / ephemeral PostgreSQL | No-cloud synthetic 120-minute locally observed attempt simulation, checked source UTC, raw SHA, 15m buckets, fault injection, replay and cleanup | Local machine cannot reproduce real Autoscale lifecycle, ensure published receiver will stay up, or establish AeroDataBox-origin/source completeness |

## Frozen release decision for Sunday October 11 2026, 20:00–22:00 America/Los_Angeles

- **Paid 6+6: NO-GO** unless a genuinely independent and authenticated pre-ACK durable original-source path *already in the user-approved cost-free deployment* is identified, implemented, end-to-end proven, and prospectively approved. The actual Stage-1 supervisor currently supplies `evidence:undefined` and enforces the previous **three failed callbacks**, regardless of selecting a `six-plus-six-candidate` enum. Twelve live failures cannot be claimed.
- **Paid legacy-three: NOT automatically a fallback approval.** Without complete sender attempt truth, interrupted source admissions can still yield paid-credit/scientific loss; the historic single retry/recovery context and prospective amendment still require P14/P17–P20 final approval.
- **Zero-provider offline/localhost rehearsal: permitted as research only**, no current deployed receiver, scientific DB, AeroDataBox subscription, new paid service, or false hosted 120-minute claim. Existing synthetic fixture checks do NOT count as P20's real hosted time proof.
- User-facing GO should require real independent exact-source provenance, item-credit 1:1 reconciliation, 168h raw retention, exact published build release identity, consent for infrastructure/resource cost, a full real-time hosted-equivalent rehearsal, a signed future-only scientific amendment and fresh explicit bounded run authorization. No one test suite can replace these independent gates.

## Substantive technical improvements delivered in the isolated no-Cloudflare track

1. P13 synthetic 120-minute source recovery audit no longer invents **one webhook per minute** or 15 mandatory notifications per 15-minute bin. It compares every journal item with a frozen separately signed preplanned sender-attempt ledger, retains exact eight 15-minute true source buckets and preserves zero-traffic bins; timestamp and identity mismatch still fail.
2. P13 source wire item billing checks compare `deliveryAttempt.costCredits` to the **actual `flights.length`**, independently of signed sender and journal match, and a larger-than-one flight-item credit cost is valid.
3. P14/P20 variable-rate synthetic rehearsal now counts **independent sender/edge/internal item-credit fields** rather than copying all three totals from sender predictions; can detect **32/32/31 credits despite equal 30 webhook attempt counts**, and accepts a single 3-flight/3-credit attempt.
4. Real disposable PostgreSQL P13 two-flight exact-restore integration fixture corrected from the historically contradictory one-credit value to two synthetic flight-item credits. Earlier synthetic 120-flight dataset is solely a deterministic fixture; not an arrival prediction for YSSY.

**Official provider guidance (2026-01-31):** https://aerodatabox.com/flight-alert-api-2026/ — 1 credit per flight item sent to the webhook, paid even on failed send, paid retries disabled by default. **No live provider query or mutation made.**

No Cloudflare or alternative billable ingress is selected, so **P09–P12 do not become PASS from these changes.** All 20 master priorities remain open to their full closing evidence, 15 labeled BLOCK, 5 HIGH. Keep PR #27 draft and `main`/Replit deployment unchanged until real science and release gates are satisfied.
