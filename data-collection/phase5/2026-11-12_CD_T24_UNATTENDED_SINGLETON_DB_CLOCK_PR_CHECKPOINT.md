# Phase 5 — T−24h autonomous singleton Stage14 + independent V0081 witness (review branch)

**Date:** 2026-11-12. **Scope:** GitHub code only, NOT production activation. Prepared after owner's private-shell readback that V0087–V0091 are already installed in Neon, empty/inert, no provider calls. PR #586 merged V0092 scoped signed-roster/horizon claim in `c8ee87b2c4da86b9e51393f4ed957a5cf0a6b707`; V0092 still requires separate, exact-pinned owner installation and verification. **Never rerun V0087–V0091.**

## Specific gap closed by this PR

The existing PR #585 T−24h Stage14→Stage17/V0081 worker was manual `workflow_dispatch` only; unlike T−6h/T−90m, an unattended month would require a human every night. This increment extends the **same** worker, not a new PRE writer, queue, legal gate or provider:

1. Adds default-disabled GitHub `*/5` T−24h scheduling, separately gated by `P5_CD_GH_T24_SCHEDULE_ENABLED=1` and existing global STOP/canary-or-Phase6 approval, independent witness approval, exact reviewed executable SHA, frozen singleton roster and approved source/retention hashes. Scheduled roster location must come from the approved `P5_CD_GH_T24_SCHEDULE_ROSTER_PATH` GitHub variable. Manual dispatch remains supported.
2. Before connecting either database role, validates actual frozen singleton JSON/packet bytes, Stage17 witness cross-review and original Stage14 signed permit. The V0092 claim function continues to scope claims to **one exact signed T24 packet** and its original horizon.
3. Reuses the existing T−6h/T−90m **read-only PostgreSQL-clock lookahead** with a separate, explicitly witness-approved T24 scope. The only permissible T24 worker starts at the original `native scheduled T - 24h` cutoff's three-minute admission window. Maximum wait eight minutes, no early queue claim, no backfill or moved T, no cloud worker and no paid provider.
4. No-due polls return `NO_DUE_SIGNED_T24_TASK` without asserting that a PRE succeeded. If a write began and acknowledgment is uncertain, existing queue quarantine rules remain mandatory; the scheduler never replays unknown writes.
5. Tests cover default STOP, scheduled opt-in, wrong events/confirmation, distinct witness credential, native T24 time-window, and unchanged T−6h/T−90m behavior.

## Important qualifications

- **Code merged != live.** Even after green CI/merge this workflow must remain disabled until V0092 actual owner readback, individually reviewed genuine future FIDS original and source-use/ML rights, signed frozen **T−24h** packet and independent Stage17/V0081 witness approval. No human overnight operation is claimed yet.
- GitHub five-minute scheduling is best effort. The eight-minute DB-clock wait can reduce but cannot eliminate misses. Never label missed cutoff as prospective, fabricate a PRE, or invalidate the entire 31-day experiment because of bounded missingness.
- This is deliberately a **singleton first pilot**. A day-level T24 roster rotation/schedule, source→queue child dispatch, POST/reconciliation, watchdog/STOP, budget limits and 31-batch-day orchestration still require integration and realistic measurement. Do not turn on the scheduler with a stale singleton packet; it needs a reviewed future one.
- Canonical Amendment E remains one amendment: T−6h departure-delay-minute primary **candidate**, T−90m update, T−24h comparator and separate airborne arrival-ETA. Physical departure timing versus wheels-off proxy, ML Contents rights/retention and model evaluations are not certified here.
- Use GitHub Actions only, no Cloudflare, Replit AI Agent, second paid airborne provider or duplicates of existing Phase 1–5 code.

## Session evidence and release status

- Existing LIVE baseline: owner-attested V0087–V0091, no task rows, no provider/paid calls at last readback.
- V0092: merged code; **live installation pending**. Do not dispatch either worker until verified.
- This PR: reviewed source only. Until exact-head GitHub CI has completed successfully, treat test outcomes as **not verified**.
- Phase5 scientific FREEZE: **HOLD**. Phase6 paid GO: **NO**.
- Target checkpoint: Nov 13; outside readiness target Nov 20 **conditional**, not a promise.
- Next owner action: run the separately hash-pinned V0092 one-shot installer on Replit Shell and return its status (no rerun after HOLD/unknown COMMIT).
- Next engineering action: validated 31-day T24 roster rotation and STOP/watchdog with one real future source→T24/T6/T90→POST reconciliation canary. 
