# Phase 5B — operational engineering recovery

Phase 5B is an engineering workstream alongside Phase 6, **not a scientific reboot or new collection gate**. Simplify operations, preserve single-purpose roles and bounded parallelism, reuse existing actors, reduce owner commands and ambiguous state; do not change f.8, Packet A/B, Amendment E, C+D, 16 features, signed calendar, budgets, splits, or provider rights. No replay, no fabricated PRE, no extended retention.

- [Canonical F/I/T/C register](../phase6/RECOVERY_REGISTER.md) remains authoritative for immutable IDs; do not duplicate or renumber it. [Closure matrix](closure-matrix.json) is a dated evidence view, not a second authoritative register.
- [Current checkpoint](checkpoints/2026-11-27_0305_PST_LIVE_RETENTION_AND_NO_DUE_READBACK.md) records current relay/retention evidence, two narrow closures, active-worker hold and next safe release order.
- [Operational runbook](RUNBOOK.md) consolidates owner steps and stop conditions.
- [Retention inventory script](../../scripts/v39_phase5b_retention_p7_inventory_owner.mjs) counts binding custody separately from actual durable storage. It remains a follow-on branch artifact, not deployed on main; the owner ran the exact read-only copy against production and T114 passed 4/4 with the SQL readback at 09:07:06Z.

Historical Phase 6 checkpoints stay in place to preserve links and hashes. New operational consolidation work belongs here. Existing executable paths stay unchanged; do not move live scripts or workflows solely for organization. Keep tested #980 head c4408c62 untouched until release; this follow-on branch is separate to avoid invalidating exact CI.

Latest actual owner checkpoint: [01:07 PST confirmed Packet B empty and custody isolation](checkpoints/2026-11-27_0107_PST_ACTUAL_PACKET_B_EMPTY_AND_CUSTODY_ISOLATION.md). I120/T114 real owner 4/4 and SQL passed. I121/T115 follow-on staging; not part of #980.

Latest [binary closure checkpoint](checkpoints/2026-11-27_0305_PST_LIVE_RETENTION_AND_NO_DUE_READBACK.md): 13 narrowly evidenced corrections CLOSED and 44 NOT_CLOSED (10 exact-CI fixes awaiting deployment, 32 partial/open, 2 historical losses). F032 closes only register/matrix integrity; all six P0 scientific families remain open. CI and relay ACKs do not prove data collection.


Current live hold (12:04:56Z): main 2b9cb404 and relay 2d96b223 are unchanged; 20 P5 SOURCE children remain in progress and none are queued. The 11:47Z source parent acknowledged eight child dispatches, which are not paid receipts. Preserve the active runs; the held owner helper cannot pass its quiet guard yet. #980 remains open/draft at c4408c62 with 26 required CI paths green. #981's 94aa1f6 evidence-sync head passed exact run 45993869374, including T116 and disposable PG16. No positive PRE, Packet B, POST or physical-label proof exists; the PR remains a stacked draft and is not deployed.


[Current owner recovery report](reports/README.md) and [all58 registered families](reports/2026-11-27_RECOVERY_PROGRESS.md): F058/I129/T123 records actual GitHub CLI log transport rejection; I130/T124 supplies reproducible evidence-first reports. Thirteen scoped closures preserved;45 NOT_CLOSED pending exact acceptance. Actual matched60 unreadable receipts recovered as30 timely originals/30 no-content, not positive PRE. Reuse other agent I124/T118 for the [single Day4 owner readback](owner/2026-11-27_day4_shape_and_storage_readonly.sh). Routine existing recovery branch integration/commit/push is owner-authorized; no new approval prompt.


Actual owner05:58PST readback:134 timely bindings,82 live,52 expired metadata-only,0 linkedPRE,0 globalP7 fragments/bundles/links. Day4 native shape1053/1053 member observations rejected for canonical/core/operating confirmations; all other reported field checks pass. See reports/2026-11-27_owner_day4_native_shape.json and reports/2026-11-27_owner_storage_inventory.json. Existing F005/F027 remain open; no optional feature rule implicated. New F059/I131/T125 corrects the callback test's ancestry-only assumption while preserving production refusal. Current register59F/131I/125T/10C;13 prior closures preserved,46 not closed pending exact acceptance. No repeated census needed.
