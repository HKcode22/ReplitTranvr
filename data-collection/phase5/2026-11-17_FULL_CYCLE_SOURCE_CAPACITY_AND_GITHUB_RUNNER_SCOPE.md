# Nov17 — full-cycle SOURCE capacity and GitHub runner scope (review only)

All 31 exact committed day plans on main `f53a36a787351b9859ff7910d7f5cab41c1d77a2` were read in four batches, not an extrapolation from day 1. 6,144 query templates (1,516 distinct planned request times, max 8 at one time). No flight-level Content. Geometry matches prior day-1 192-template results for four leads. New tool [p5_full_cycle_capacity_review_no_go.mjs](review-tools/p5_full_cycle_capacity_review_no_go.mjs) pins every original day-plan Git blob and rejects changed bytes. The pure solver was executed against all days' extracted exact clock counts in JS; native Node CLI file-reader was not executed here. Every reported worst outage was independently checked using full replay of that outage in the same model. Output can be reproduced from unchanged metadata plans. No schedule edits, dispatch, prearm rule change, provider call, role, database write or paid GO.

### Full-cycle nominal capacity, 90-minute maximum source prearm, 15-minute minimum lead, 8 submissions/tick, exact 10-minute :05 offset, completion tail 15m

| Available SOURCE slots (not actual total account quota) | Missed of 6144 without outage | Mean advance (min) | Modeled occupied slot-minutes |
|---:|---:|---:|---:|
| 16 | 40 | 52.35 | 411,080 |
| 20 | 8 | 66.01 | 497,080 |
| 24 | 0 | 76.95 | 564,960 |

With a hypothetical 3m tail, 16/20/24 slots have zero modeled nominal misses and mean advance 60.10/72.77/83.20m. At 24 slots and 15m tail, 35m/60m/90m prearm profiles all have zero modeled nominal misses but 291,520/442,080/564,960 modeled occupied slot-minutes respectively. Longer waiting trades resources for resilience, not more physical requests. Slot-minutes count the admission-to-assumed-completion occupancy, including queued time; they are not billed runner execution minutes or a measured platform resource claim.

### Worst ONE tick-aligned interruption over all 31 days (90m lead, 15m tail)

| Slots | No outage | 60m gap | 120m gap | 350m gap | 590m gap |
|---:|---:|---:|---:|---:|---:|
| 16 | 40 | 64 | 80 | 144 | 208 |
| 20 | 8 | 36 | 52 | 120 | 184 |
| 24 | 0 | 28 | 44 | 112 | 176 |

The worst gap starts cluster on November 27 UTC, where extended and overlapping source windows increase load. Count totals include existing modeled nominal misses, not extra misses alone. Single outage, optimistic all signed plans immediately available, immediate dispatch ACK and no paid API or enrollment/PRE/POST work modeled; no cumulative repeated outage, capacity competing lanes, actual provider delay, billing, per-flight yield, or SLA inferred. A 60m gap at 24 slots can lose 28 templates even though previous Day1-only 90m scenario yielded fewer. Actual observed 4–9h schedule gaps are not schedulable away by changing 35→90 alone. Keep earliest-due queue, 8/24 caps and 90m prearm proposal unchanged pending operational review; do not infer spend/spare capacity or shorten cutoffs.

### Actual GitHub scope and platform constraint

Repository API verified `private:false`, `visibility:public`, current main unchanged. Relevant standard Ubuntu jobs are not subject to private-repository compute-minute charges ([billing](https://docs.github.com/en/actions/concepts/billing-and-usage), [runner reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)). This is NOT an exemption for larger runners, storage, network/DB charges, concurrency or usage restrictions. [Current limits](https://docs.github.com/en/actions/reference/limits): 6h standard hosted job; Free 20 concurrent, Pro 40, Team 60, Enterprise 500 across account as applicable. Actual account plan/concurrent use unknown: the configured 24-child cap includes pending jobs, and cannot be assumed to mean 24 running. Example only: 20 total minus 4 other lane slots leaves 16 for SOURCE. No account switch proposed or purchased. [GitHub Additional Product Terms](https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features), effective Aug27 2026, require project-related Actions use and proportionate burden. Do not convert free compute into indefinite idle jobs or an unrelated hosting service. Project-specific permitted research orchestration should be reviewed before sustained operation. [Scheduled-workflow troubleshooting](https://docs.github.com/en/actions/how-tos/troubleshoot-workflows) expressly documents delays and dropped queued jobs; the existing 09:00Z stale-controller heartbeat is consistent with possible platform delays but not causal proof.

No additional scheduler/root activation, no repeated nonpaid rehearsal or current plan modification. Existing V0102 optional remains OFF; 120-minute bounded rolling chain does not by itself certify continuity across policy windows or independently reviewed settlement. Prior primary FIDS expiry and V0104 hard-due guard protect later spends, not guaranteed deadline deletion during cron outages.

Phase5 scientific FREEZE HOLD / Phase6 paid NO-GO. First cohort requires the existing qualified independent operational/rights review and final real scoped authorization; the current capacity results must be incorporated into it.
