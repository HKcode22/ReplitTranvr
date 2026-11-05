# Phase 4 Gate 5 — entire WSSS G5A cohort moved 17 hours earlier (Wed Nov4 freeze)

**Prospective new candidate; NO PROVIDER CALL ON THIS PR.** The user specifically authorized moving the **whole** T−24h/T−6h/T−90m/departure/POST/audit sequence earlier instead of waiting until Thursday 1:47 PM Pacific to prearm the previously frozen Friday evening cohort. The earlier scientific and permissions work is retained; this is a new, distinct frozen cohort, **not** rewriting the original Nov5 failed source or the earlier Nov7 frozen artifact.

## New frozen operating cohort and observed time geometry

Frozen manifest: `GATE5_G5A_WSSS_20261106_0900Z_FROZEN_SOURCE_GRID.json`, immutable canonical JSON at 2026-11-05T03:39:00Z = Wednesday Nov4 19:39 PST, prior to its first prearm. WSSS departure service window **Fri Nov6 01:00–02:00 PST** = Nov6 09:00–10:00Z = Singapore Friday 17:00–18:00 SGT.

| Stage | Actual prearms or physical acquisition, Pacific PST | UTC |
| --- | --- | --- |
| **T24 GH prearms** | **Wed Nov4 20:47, 21:17, 21:47, 22:17** | Thu Nov5 04:47, 05:17, 05:47, 06:17Z |
| T24 hard authentic GH job-start deadline | Wed Nov4 **23:30** | Thu Nov5 07:30Z |
| **T24 paid source GET slots** | Thu Nov5 **00:30, 01:00, 01:30** | Nov5 08:30, 09:00, 09:30Z |
| T6 GH prearms | Thu Nov5 14:47, 15:17, 15:47, 16:17 | Nov5 22:47/23:17/23:47, Nov6 00:17Z |
| T6 paid source | Thu Nov5 18:30, 19:00, 19:30 | Nov6 02:30/03:00/03:30Z |
| T90 GH prearms | Thu Nov5 19:17, 19:47, 20:17, 20:47 | Nov6 03:17/03:47/04:17/04:47Z |
| T90 paid source | Thu Nov5 23:00/23:30, Fri Nov6 00:00 | Nov6 07:00/07:30/08:00Z |
| Flight service window | Fri Nov6 01:00–02:00 | Nov6 09:00–10:00Z |
| POST GH prearms | Fri Nov6 01:10,01:22,01:37,01:52 | Nov6 09:10/09:22/09:37/09:52Z |
| POST paid source | Fri Nov6 02:40, 03:10, 03:40 | Nov6 10:40/11:10/11:40Z |
| No-provider independent audit | Fri Nov6 04:12/04:18/04:24/04:30 | Nov6 12:12/12:18/12:24/12:30Z |

All stage times shifted exactly **−17 hours** from prior Nov7 UTC 02:00Z WSSS cohort. Dynamic `draftP4Gate5ThreeHorizonGridV39` still generates 9 immutable source opportunities, 3 per horizon, T24/T6/T90 scientifically separate cutoffs, one attempt per physical slot. Budget: source 9×2 internal units + POST 3×2 = **max 24 internally reserved**. More credit authorization does not justify enlarging the first diagnostic cohort; actual provider billing must be measured separately.

## No duplicate paid run

**Old later Nov7 paid workflows must not coexist active with this replacement.** Same PR changes **all five old executable jobs to explicit `if: false`** in their three old workflow files, retaining historical cron text for reproducibility and original tests, and installs three new Nov6 09Z workflow files with new names, paid intent, source/POST namespace and completely distinct manifest SHA. The old frozen JSON and all existing V0076/V0077 ledgers remain immutable. Later duplicate GitHub scheduled invocations of retired Nov7 workflow are harmless skipped no-provider jobs. Future Nov6 workflows retain event admission and guarded prospective GH job-start proof, owner uniqueness, V0076 budget, V0077 original, real source-bound PRE, POST, and independent no-DDL reader secret `P4_G5_G5A_NOV07_AUDIT_DATABASE_URL` already installed and verified for nine metadata tables (credential name is merely a label, not cohort binding).

## Strict release HOLD until verified

1. New frozen manifest was written before first T24 earliest prearm 20:30 PST. Actual runner must start before Wed Nov4 23:30 PST; GH cron is best-effort. Early backups begin 20:47 PST; if GitHub misses all or checkout is late, **DO NOT backfill** and mark unobserved.
2. Exact-head no-provider GH CI must pass new computed 17h-shift tests covering all 12 source, 4 POST, 4 auditor cron timestamps, real prearm cutoffs, 340-minute owner timeout, one-attempt/24-unit budget, and proof that all five old jobs are disabled. All existing V3.9 checks must pass. Never merge if red or unknown.
3. Separately independently verified production source writer permissions, existing narrow auditor role and existing restricted PG16 source/PRE, POST and five-audit-SQL rehearsals remain binding (PRs #395–399). The new source/POST/auditor must not depend on unapproved new privileges. No source billing or actual provider entitlement/retention is implied by a green offline check.
4. GitHub-only activation only after review; no Cloudflare, Replit schedule or paid requests from a PR/push event. The first paid GET is Thu Nov5 00:30 PST, **not** the 20:47 prearm. If no safe live release can finish before early scheduled prearm, prefer fail-closed and a new future cohort rather than unsafe hurried deployment.

**Owner preference:** minimize idle time and time loss without fabricating successes. Science PASS requires actual immutable original+flight population, time-safe PRE at all three horizons, POST, then independent audit; bounded missingness is acceptable and report real data vs provider uncertainties honestly. No synthetic proof substitutes for live flight evidence.
