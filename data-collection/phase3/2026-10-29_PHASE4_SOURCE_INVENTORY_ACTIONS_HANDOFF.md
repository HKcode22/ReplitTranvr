# Phase4 Gate5 read-only GitHub source inventory checkpoint (2026-10-29)

Plan f.8 sections 5, 7.5, 16-17; Implementation Log 1.9/2.22; previous PRs #254-#257.

The narrowly scoped postmerge GitHub Actions workflow checks seven existing LOGGED readable clean tables and a bounded most-recent WSSS FIDS query sample, associated population rows and recent webhook original blob-reference metadata.
Only SOURCE METADATA is read. All SQL is static SELECT in repeatable-read read-only transaction, finalized with ROLLBACK. No provider key, paid REST, subscriptions, source blob download, actual flight output, or database mutation.
GitHub uses existing protected phase2g-paid environment and GATE05_AUTOMATION_DATABASE_URL. Automatic on main push for this exact source/workflow only; GitHub environment protection still applies. If credential cannot access source or schema, output is a documented HOLD, not an invented empty population.
Each candidate horizon comparison tests durable available-at before a candidate scheduled departure minus the lag; this cannot independently certify initial selected T, operated-flight identity, source completeness, or valid original runway event.
Webhooks are only blob-reference metadata. Even unexpired ledger refs are not proof App Storage still retains original bytes or that provider HTTP 2xx ACK succeeded.
Workflow success means read-only metadata inventory executed, never scientific Gate5 PASS. Production run and results need to be checked after merge. Final Gate5 strict HOLD, Phase5 final FREEZE HOLD and paid Phase6 NO-GO.
