-- V0068 DRAFT / NOT APPLIED IN PRODUCTION / NO BOOT AUTO-MIGRATION.
-- Gate0.5 requires at most ONE globally open scoped FIDS feasibility
-- authorization. Each old STOPPED scope remains durable audit evidence.
--
-- Unlike a SELECT-count inventory or cooperative advisory lock, this partial
-- UNIQUE INDEX is enforced even when two independent commissioning sessions
-- race under PostgreSQL READ COMMITTED. A competing second PREPARED INSERT
-- or resurrection to ACTIVE must fail in the database.
--
-- A separately approved schema change with independent production preflight
-- is REQUIRED before a live commissioner can rely on this invariant.
-- Never silently treat a staged DDL file as installed.
CREATE UNIQUE INDEX gate05_fids_one_open_scope_v39
  ON clean.gate05_fids_pilot_scope_v39 ((1))
  WHERE state IN ('PREPARED','ACTIVE');

-- A STOPPED pilot releases the single-open-slot but must NEVER make its
-- already-consumed authorization reusable. These are independent global
-- one-use constraints, retained through terminal historical records.
CREATE UNIQUE INDEX gate05_fids_one_authorization_id_v39
  ON clean.gate05_fids_pilot_scope_v39 (authorization_id);
CREATE UNIQUE INDEX gate05_fids_one_authorization_sha_v39
  ON clean.gate05_fids_pilot_scope_v39 (authorization_sha256);
