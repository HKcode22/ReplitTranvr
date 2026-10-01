# Active V3.9 migration layout

This directory is the post-squash migration surface.

- `baseline/B0062__v39_schema_baseline_20261001.sql` will represent the verified project-owned schema after legacy migration 0062.
- `current/V0063__*.sql` and later files are forward-only changes.
- The legacy 0002–0062 chain remains preserved on `archive/pre-baseline-migrations-20261001` until and after retirement from `main`.
- `_system`, `drizzle`, and `stripe` are managed externally and are excluded from the project baseline.
- The existing live database is adopted only after read-only schema verification; baseline SQL is for new/empty database creation and must not be replayed onto the already-current live DB.