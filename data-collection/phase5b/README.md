# Phase 5B — operational engineering recovery

Phase 5B is an engineering workstream alongside Phase 6, **not a scientific reboot or new collection gate**. Simplify operations, preserve single-purpose roles and bounded parallelism, reuse existing actors, reduce owner commands and ambiguous state; do not change f.8, Packet A/B, Amendment E, C+D, 16 features, signed calendar, budgets, splits, or provider rights. No replay, no fabricated PRE, no extended retention.

- [Canonical F/I/T/C register](../phase6/RECOVERY_REGISTER.md) remains authoritative for immutable IDs; do not duplicate or renumber it. [Closure matrix](closure-matrix.json) is a dated evidence view, not a second authoritative register.
- [Current checkpoint](2026-11-27_0248_PST_POST_CI_AND_ACTIVE_SOURCE_HOLD.md) records current relay/retention evidence, two narrow closures, active-worker hold and next safe release order.
- [Operational runbook](RUNBOOK.md) consolidates owner steps and stop conditions.
- [Retention inventory script](../../scripts/v39_phase5b_retention_p7_inventory_owner.mjs) counts binding custody separately from actual durable storage. It remains a follow-on branch artifact, not deployed on main; the owner ran the exact read-only copy against production and T114 passed 4/4 with the SQL readback at 09:07:06Z.

Historical Phase 6 checkpoints stay in place to preserve links and hashes. New operational consolidation work belongs here. Existing executable paths stay unchanged; do not move live scripts or workflows solely for organization. Keep tested #980 head c4408c62 untouched until release; this follow-on branch is separate to avoid invalidating exact CI.

Latest actual owner checkpoint: [01:07 PST confirmed Packet B empty and custody isolation](checkpoints/2026-11-27_0107_PST_ACTUAL_PACKET_B_EMPTY_AND_CUSTODY_ISOLATION.md). I120/T114 real owner 4/4 and SQL passed. I121/T115 follow-on staging; not part of #980.

Latest [binary closure checkpoint](checkpoints/2026-11-27_0238_PST_BOUNDED_RELAY_RETENTION_CLOSURE_AND_ACTIVE_HOLD.md): 12 narrowly evidenced corrections CLOSED and 45 NOT_CLOSED (10 exact-CI fixes awaiting deployment, 33 partial/open, 2 historical losses). F009/F035 close only their stated operational criteria; all six P0 scientific families remain open. CI and relay ACKs do not prove data collection.


Current live hold: main 2b9cb404 and relay 2d96b223 are unchanged. At 10:48:50Z, 12 P5 SOURCE children were active on main 2b9cb404; the earlier 09:16Z child had completed. Keep the exact #980 head unchanged and do not rerun or cancel the held owner helper until its fresh quiet, STOP, task and 130-minute checks pass. Exact #981 CI run 45984268175 passed both jobs on head 9e8cfb67856da586a9a1975cb776909ffb4ebdcd; it remains a stacked draft and is not deployed. The latest rolling relay wake and successful retention jobs are not positive PRE, Packet B, POST or physical-label proof.
