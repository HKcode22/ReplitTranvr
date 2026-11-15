# November 15 — measured GitHub schedule gaps and C+D timing implications

## Actual observation (not synthetic)

Independent read of the most recent 100 repository-wide GitHub Actions schedule-event records, with main-branch lane filtering, through 2026-11-15T23:37:27Z. Preserve the actual run IDs and creation timestamps in [evidence JSON](evidence/2026-11-15_actual_github_scheduled_interarrival.json). Maximum adjacent creation gaps in that bounded sample:

| Lane | Configured nominal cadence | Observed runs in selected sample | Largest adjacent gap |
|---|---:|---:|---:|
| SOURCE upcoming queue | 10 min | 8 | 473.1 min |
| PRE tick | 5 min | 8 | 434.9 min |
| Blob retention sentinel | 60 min | 6 | 504.2 min |
| Existing GitHub controller heartbeat | 30 min | 7 | 456.6 min |

The first three were gated off during the sample; the heartbeat runs succeeded. These numbers measure **observed workflow run creation interarrival**, not exact scheduled event delay, worker service time, missing flight counts or any claim that enabling jobs would produce identical gaps. The repository-wide bounded response is not an exhaustive history. Nevertheless it is unsafe to assume nominal cron cadence is a clock guarantee. Earlier controller heartbeat output already showed stale current lanes (e.g. [run 43757287498](https://github.com/HKcode22/ReplitTranvr/actions/runs/43757287498)).

## Implementation and disposition

Reuse existing no-provider controller heartbeat. Add historical interval counts, median/max/latest gap, oldest/newest observation and exact age/gap boundaries; a fresh latest run cannot make prior long gaps disappear. Report contemporaneous state separately from historical warnings. No new cron, database, paid route, policy signer, or launch gate. Existing threshold is a coarse health diagnostic, **not** the PRE cutoff or a promised availability SLA.

The C+D design must rely on existing prearmed bounded workers, signed private day plans, DB-clock deadlines, restart/reconciliation, and measured active-run handoff rather than expecting a fresh GitHub schedule every five/ten minutes. Before unattended launch, demonstrate one bounded real lifecycle with enough lead time, including a handoff across workers; report misses rather than silently extending cutoffs. If scheduled bootstrap is late, preserve scientifically valid observations and censor misses. No backfilling PRE. Distinguish cron creation from actual job starts and task latency. This finding affects retention too: enabled sentinel is not a guaranteed hourly execution or deletion worker.

Owner transcript confirms `P5_RETENTION_READONLY_MONITOR_ENABLED=true` on main 6e892833bc5a7c0f3da7ec1c6edf0bed725aa2e9; previous restricted readback is already closed, no new login needed. Latest observed schedule before change skipped. First actual post-enable scheduled execution remains to be observed. No provider spend, production writes or deletions here.

No new major architecture or provider proposed. Phase5 remains engineering in progress, scientific freeze HOLD, paid Phase6 NO-GO until exact release/evidence review.
