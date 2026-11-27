# Phase 5B — operational engineering recovery

Phase 5B is an engineering workstream alongside Phase 6, **not a scientific reboot or new collection gate**. Simplify operations, preserve single-purpose roles and bounded parallelism, reuse existing actors, reduce owner commands and ambiguous state; do not change f.8, Packet A/B, Amendment E, C+D, 16 features, signed calendar, budgets, splits, or provider rights. No replay, no fabricated PRE, no extended retention.

- [Canonical F/I/T/C register](../phase6/RECOVERY_REGISTER.md) remains authoritative for immutable IDs; do not duplicate or renumber it. [Closure matrix](closure-matrix.json) is a dated evidence view, not a second authoritative register.
- [Current checkpoint](checkpoints/2026-11-27_0048_PST_EXACT_980_AND_RETENTION_HANDOFF.md) records actual data, CI, blockers and next release order.
- [Operational runbook](RUNBOOK.md) consolidates owner steps and stop conditions.
- [Retention inventory script](../../scripts/v39_phase5b_retention_p7_inventory_owner.mjs) counts binding custody separately from actual durable storage. New follow-on code, not yet deployed or run on production.

Historical Phase 6 checkpoints stay in place to preserve links and hashes. New operational consolidation work belongs here. Existing executable paths stay unchanged; do not move live scripts or workflows solely for organization. Keep tested #980 head c4408c62 untouched until release; this follow-on branch is separate to avoid invalidating exact CI.

Latest actual owner checkpoint: [01:07 PST confirmed Packet B empty and custody isolation](checkpoints/2026-11-27_0107_PST_ACTUAL_PACKET_B_EMPTY_AND_CUSTODY_ISOLATION.md). I120/T114 real owner 4/4 and SQL passed. I121/T115 follow-on staging; not part of #980.
