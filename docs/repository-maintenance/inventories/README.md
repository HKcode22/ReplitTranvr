# Inventory schema and limitations

Two generated CSV files provide **complete tracked-path coverage**, from GitHub recursive tree snapshots, without treating age or name as deletion approval.

* Main: `f5b1347b7b9aebd6830302394ea2cc5775aedbf4`, 1,162 Git blobs.
* Draft PR36: `318e2c3b8223bfc417757dbe571883aecdbca589`, 1,271 Git blobs.
* Paths in inventories are case-sensitive; **Git blobs only** (not untracked files, symlinks, local Replit working tree, live PG, or Object Storage).
* Main CSV has one row per blob. The PR36 delta CSV has each SHA/path divergence relative to main; a given rename can appear as ADD and REMOVE, not proof of content loss.
* `classification` is **PROPOSED OR UNREVIEWED**, never certified merely from filename or location.
* `proposed_target` is hypothetical and `HOLD` prevents move. Empty target = unknown, not root directory or delete.
* `decision` must be confirmed in complete reference scan before any removal/move. Immutable scientific evidence requires additional approval.
* Diff review of PR36 records **11 removed paths**; every security guardrail or P25 original evidence file must be verified/reconciled before any future shared production merge.
* These CSVs are inventory, **not a dependency graph**. A separate literal reference scan and tests are mandatory before Wave B.
