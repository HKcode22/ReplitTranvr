-- Stage25: DISPOSABLE PG16 only. Explicit role matrix against installed
-- B0062/V0079/V0080/V0081. NO production role changes or credentials.
-- Roles are NOLOGIN; CI tests privileges rather than generating secrets.
\set ON_ERROR_STOP on
BEGIN;
CREATE ROLE phase5_fids_plan_qa20261107 NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE ROLE phase5_fids_source_qa20261107 NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE ROLE phase5_fids_pre_writer_qa20261107 NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE ROLE phase5_fids_t24_witness_qa20261107 NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
GRANT USAGE ON SCHEMA clean TO
  phase5_fids_plan_qa20261107,
  phase5_fids_source_qa20261107,
  phase5_fids_pre_writer_qa20261107,
  phase5_fids_t24_witness_qa20261107;

-- Independent PREPARED/REVIEWED template publisher: no source HTTP, no
-- ability to insert an original FIDS record or physical paid reservation.
GRANT SELECT ON clean.adb_phase6_calendar_day,clean.adb_sampling_draw
 TO phase5_fids_plan_qa20261107;
GRANT SELECT,INSERT ON
 clean.phase5_fids_cycle_budget_v39,
 clean.phase5_fids_day_budget_v39,
 clean.phase5_fids_utc_charge_budget_v39,
 clean.phase5_fids_allowed_query_v39
 TO phase5_fids_plan_qa20261107;

-- Paid source owner: read frozen approved queries and bound-source inputs;
-- source writer can create FIDS original and normalized population, but
-- CANNOT INSERT direct paid reservations or prearm rows.
-- Those mutations are restricted to V0079/V0080 SECURITY DEFINER functions.
GRANT SELECT ON
 clean.phase5_fids_cycle_budget_v39,
 clean.phase5_fids_day_budget_v39,
 clean.phase5_fids_utc_charge_budget_v39,
 clean.phase5_fids_allowed_query_v39,
 clean.phase5_fids_physical_attempt_v39,
 clean.phase5_fids_original_binding_v39,
 clean.phase5_fids_github_prearm_v39,
 clean.adb_phase6_calendar_day,clean.adb_sampling_draw,
 clean.fids_query_response,clean.flight_population
 TO phase5_fids_source_qa20261107;
GRANT INSERT ON
 clean.fids_query_response,clean.flight_population,
 clean.phase5_fids_original_binding_v39
 TO phase5_fids_source_qa20261107;
GRANT EXECUTE ON FUNCTION
 clean.reserve_phase5_fids_physical_get_v39(text,text,text,text,text,text),
 clean.prearm_phase5_fids_github_query_v39(text,text,text,text,text,text)
 TO phase5_fids_source_qa20261107;

-- One-flight PRE writer: can SELECT original FIDS/flight member/witness,
-- INSERT only a new PRE snapshot; never revise or delete PRE, source or
-- witness. Sequence USAGE is required by the snapshot PK default.
GRANT SELECT ON
 clean.phase5_fids_allowed_query_v39,
 clean.phase5_fids_physical_attempt_v39,
 clean.phase5_fids_original_binding_v39,
 clean.fids_query_response,clean.flight_population,
 clean.flight_snapshots,clean.phase5_t24_postcommit_witness_v39
 TO phase5_fids_pre_writer_qa20261107;
GRANT INSERT ON clean.flight_snapshots
 TO phase5_fids_pre_writer_qa20261107;
GRANT USAGE ON SEQUENCE clean.flight_snapshots_id_seq
 TO phase5_fids_pre_writer_qa20261107;

-- Independent Stage17 T24 witness-only writer: cannot insert PRE or mutate
-- source; it can only SELECT committed PRE/source and INSERT one witness.
GRANT SELECT ON
 clean.phase5_fids_allowed_query_v39,
 clean.phase5_fids_physical_attempt_v39,
 clean.phase5_fids_original_binding_v39,
 clean.fids_query_response,clean.flight_population,
 clean.flight_snapshots,clean.phase5_t24_postcommit_witness_v39
 TO phase5_fids_t24_witness_qa20261107;
GRANT INSERT ON clean.phase5_t24_postcommit_witness_v39
 TO phase5_fids_t24_witness_qa20261107;

-- Verify factual ACL matrices using database permission checks, not
-- assumptions about grants, inheritance or PUBLIC default privileges.
DO $$
DECLARE
 p text:='phase5_fids_plan_qa20261107';
 s text:='phase5_fids_source_qa20261107';
 r text:='phase5_fids_pre_writer_qa20261107';
 w text:='phase5_fids_t24_witness_qa20261107';
BEGIN
 IF NOT
   has_table_privilege(p,'clean.phase5_fids_allowed_query_v39','INSERT')
   OR has_table_privilege(p,'clean.fids_query_response','INSERT')
   OR has_table_privilege(p,'clean.phase5_fids_physical_attempt_v39','INSERT')
   OR has_table_privilege(p,'clean.flight_snapshots','INSERT')
 THEN RAISE EXCEPTION 'P5_STAGE25_PLAN_ROLE_SCOPE_BAD';END IF;

 IF NOT
   has_table_privilege(s,'clean.phase5_fids_original_binding_v39','INSERT')
   OR NOT has_table_privilege(s,'clean.fids_query_response','INSERT')
   OR NOT has_table_privilege(s,'clean.flight_population','INSERT')
   OR has_table_privilege(s,'clean.phase5_fids_physical_attempt_v39','INSERT')
   OR has_table_privilege(s,'clean.phase5_fids_allowed_query_v39','UPDATE')
   OR has_table_privilege(s,'clean.flight_snapshots','INSERT')
   OR has_table_privilege(s,'clean.phase5_t24_postcommit_witness_v39','INSERT')
   OR NOT has_function_privilege(s,
     'clean.reserve_phase5_fids_physical_get_v39(text,text,text,text,text,text)','EXECUTE')
   OR NOT has_function_privilege(s,
     'clean.prearm_phase5_fids_github_query_v39(text,text,text,text,text,text)','EXECUTE')
 THEN RAISE EXCEPTION 'P5_STAGE25_SOURCE_ROLE_SCOPE_BAD';END IF;

 IF NOT
   has_table_privilege(r,'clean.flight_snapshots','SELECT,INSERT')
   OR NOT has_table_privilege(r,'clean.phase5_t24_postcommit_witness_v39','SELECT')
   OR NOT has_sequence_privilege(r,'clean.flight_snapshots_id_seq','USAGE')
   OR has_table_privilege(r,'clean.flight_snapshots','UPDATE')
   OR has_table_privilege(r,'clean.flight_snapshots','DELETE')
   OR has_table_privilege(r,'clean.phase5_t24_postcommit_witness_v39','INSERT')
   OR has_table_privilege(r,'clean.phase5_fids_allowed_query_v39','INSERT')
 THEN RAISE EXCEPTION 'P5_STAGE25_PRE_ROLE_SCOPE_BAD';END IF;

 IF NOT
   has_table_privilege(w,'clean.flight_snapshots','SELECT')
   OR NOT has_table_privilege(w,'clean.phase5_t24_postcommit_witness_v39','SELECT,INSERT')
   OR has_table_privilege(w,'clean.flight_snapshots','INSERT')
   OR has_table_privilege(w,'clean.phase5_t24_postcommit_witness_v39','UPDATE')
   OR has_table_privilege(w,'clean.phase5_t24_postcommit_witness_v39','DELETE')
   OR has_table_privilege(w,'clean.phase5_fids_allowed_query_v39','INSERT')
 THEN RAISE EXCEPTION 'P5_STAGE25_WITNESS_ROLE_SCOPE_BAD';END IF;

 IF has_table_privilege('PUBLIC','clean.phase5_fids_original_binding_v39','SELECT') THEN
   RAISE EXCEPTION 'P5_STAGE25_PUBLIC_SOURCE_PRIVILEGES';END IF;

 RAISE NOTICE 'STAGE25_FOUR_N OLOGIN_SCOPED_ROLES_ACL_TEST_PASSED';
END $$;
COMMIT;
