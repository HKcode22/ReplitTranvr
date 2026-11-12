# Phase 5 — LIVE V0090 complete; focus now on authentic task enrollment and autonomous PRE

**Evidence:** Owner ran pinned shell for merged main `378cec291a300160654dd432cbaa7a57384b2a4f`. Owner-submitted tool result `V0090_EXISTING_PRE_ONLY_QUEUE_FUNCTIONS_COMMISSIONED_NO_PAID` on team private PostgreSQL16 `neondb`, with migration Git blob `7e835903ad7cfd4cbaf595688d6d94cfc738b300`.

## Live readback facts — do NOT repeat earlier installations

| Field | Reported verified value |
| --- | --- |
| SQL role | `neondb_owner` |
| Existing flight×horizon queue | **0 rows** |
| Queue functions commissioned | **4**: `claim_due`, `mark_write_started`, `ack_verified`, `reap_once` |
| Restricted function owner | `phase5_cd_queue_function_owner_v39`, no login |
| Reused PRE-only group | `phase5_fids_pre_writer_prod_20261107` |
| Direct queue UPDATE to PRE | **false** |
| Historical snapshot triggers | Preserved |
| Production Stage14 PRE used | **false** |
| GitHub worker scheduled | **false** |
| Flight snapshots created by installer | **0** |
| Provider / paid calls | **0 / 0** |
| Phase5 scientific freeze / Phase6 paid GO | **false / false** |

**Previously LIVE, never reinstall:** V0087 real durable queue, V0088 registered-PRE transaction admission/immutable scoped trigger, V0089 separate NOLOGIN guarded owner. V0090 is now live too. No more database-install steps merely to recreate them. A shell paste-echo artifact and the pg connection-string `sslmode=require` forward-compatibility warning did not alter the completed JSON status.

## Actual implementation work remaining

1. **Authentic future source-bound enrollment:** An independently authenticated signed packet + retained V0079 original + normalized flight population + first selected native T must be checked *before* a canonical flight×horizon task is registered in V0087. Current queue is empty. Never invent source-rights approval or retrospectively insert PRE tasks. The PRE role must not receive direct table INSERT.
2. **Existing Stage14 production C+D admission:** The real queued same-transaction function already exists; the Stage14 TypeScript switch is still *isolated-CI-only*. Promote it only behind a separate explicit reviewed GitHub main/release/rights/STOP gate, never as a side effect of installing SQL. Reuse the Stage28 SET-only dedicated PRE session and original Stage14 snapshot persistence. One canonical Amendment E FIDS origin/dest source features still experimental under the same release boundaries.
3. **Autonomous GitHub-only controller:** Bounded short ticks, lease/fencing, task-to-frozen-packet registry, signed source match, first true cutoff DB clock, STOP on missing approvals, watchdog/reaper of only unreached write states. Once `WRITE_STARTED_UNKNOWN`, never retry without independent after-COMMIT reconciliation. A GitHub cron tick at five-minute intervals can miss three-minute cutoffs; report measured jitter/missingness and design bounded lookahead without pretending on-time PRE. The source registry and existing GH source/t24/later PRE workflows are to be reused.
4. **End-to-end actual evidence:** Real prospective FIDS original and three horizon outcomes where possible, POST/airborne separation, cancellation/missingness, budget, use/retention/expiry, and defensible physical label. One Amendment E: T−6h continuous actual departure delay minutes is a conditional candidate, T−90m updates, T−24h comparator, free ADSB.lol existing proxy for wheels-off only (not gate-out). No other paid airborne provider.
5. **Scientific Phase5 freeze then separate paid Phase6 GO:** Nov13 near-term checkpoint and Nov20 outer planning goal, never unconditional or permission to backfill.

## Release status
**V0090 live owner step done**; private worker still NOT scheduled; Stage14 production still NOT activated; no authentic future flight tasks; source/legal/label scientific freeze remains HOLD, Phase6 paid GO NO. This owner report is recorded as user-supplied evidence and must not be represented as an independent database login from GitHub.
