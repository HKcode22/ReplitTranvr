-- Disposable/review-only. Applies ONLY to the already-reviewed derived
-- Phase7 output tables, not operational provider originals or source rows.
-- Install after the bundle and PRE candidate schemas. No production grants.
BEGIN;
CREATE INDEX p7_bundle_research_expiry_v39 ON phase7_private.derived_release_bundle_v39(research_expiry_utc,packet_id);
CREATE INDEX p7_fragment_research_expiry_v39 ON phase7_private.pre_fragment_v39(research_expiry_utc,row_id);
CREATE FUNCTION phase7_private.research_expiry_status_v39() RETURNS jsonb
 LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp
 AS $status$
 WITH t AS MATERIALIZED (SELECT clock_timestamp() at)
 SELECT jsonb_build_object('schema','v39.phase7.research-expiry-status.v1','observedAtUtc',t.at,
  'dueBundles',(SELECT count(*) FROM phase7_private.derived_release_bundle_v39 b WHERE b.research_expiry_utc<=t.at),
  'dueFragments',(SELECT count(*) FROM phase7_private.pre_fragment_v39 f WHERE f.research_expiry_utc<=t.at),
  'dueLinks',(SELECT count(*) FROM phase7_private.pre_source_link_v39 l WHERE l.expires_at_utc<=t.at),
  'liveLinksOnDueFragments',(SELECT count(*) FROM phase7_private.pre_fragment_v39 f JOIN phase7_private.pre_source_link_v39 l ON l.row_id=f.row_id WHERE f.research_expiry_utc<=t.at AND l.expires_at_utc>t.at),
  'providerCalls',0,'databaseWrites',0,'phase6PaidGo',false)
 FROM t
 $status$;
REVOKE ALL ON FUNCTION phase7_private.research_expiry_status_v39() FROM PUBLIC;
CREATE FUNCTION phase7_private.sweep_due_research_outputs_v39(p_limit int)
 RETURNS TABLE(bundle_rows integer,fragment_rows integer)
 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $sweep$
 DECLARE at_time timestamptz; n_b int; n_f int;
 BEGIN
 IF p_limit IS NULL OR p_limit<1 OR p_limit>1000 THEN RAISE EXCEPTION 'P7_RESEARCH_SWEEP_LIMIT'; END IF;
 at_time:=clock_timestamp();
 -- Expired links must be cleared using their own existing due-only sweep.
 -- An unexpected live link on an expired fragment is an incident, not
 -- authority to remove that link or extend the research deadline.
 IF EXISTS(SELECT 1 FROM phase7_private.pre_fragment_v39 f JOIN phase7_private.pre_source_link_v39 l ON l.row_id=f.row_id
  WHERE f.research_expiry_utc<=at_time AND l.expires_at_utc>at_time)
 THEN RAISE EXCEPTION 'P7_RESEARCH_LIVE_LINK_ON_EXPIRED_FRAGMENT'; END IF;
 WITH due AS (SELECT packet_id FROM phase7_private.derived_release_bundle_v39
  WHERE research_expiry_utc<=at_time ORDER BY research_expiry_utc,packet_id LIMIT p_limit FOR UPDATE SKIP LOCKED)
 DELETE FROM phase7_private.derived_release_bundle_v39 b USING due d WHERE b.packet_id=d.packet_id AND b.research_expiry_utc<=at_time;
 GET DIAGNOSTICS n_b=ROW_COUNT;
 WITH due AS (SELECT f.row_id FROM phase7_private.pre_fragment_v39 f
  WHERE f.research_expiry_utc<=at_time AND NOT EXISTS(SELECT 1 FROM phase7_private.pre_source_link_v39 l WHERE l.row_id=f.row_id)
  ORDER BY f.research_expiry_utc,f.row_id LIMIT (p_limit-n_b) FOR UPDATE OF f SKIP LOCKED)
 DELETE FROM phase7_private.pre_fragment_v39 f USING due d WHERE f.row_id=d.row_id AND f.research_expiry_utc<=at_time;
 GET DIAGNOSTICS n_f=ROW_COUNT;
 RETURN QUERY SELECT n_b,n_f;
 END $sweep$;
REVOKE ALL ON FUNCTION phase7_private.sweep_due_research_outputs_v39(integer) FROM PUBLIC;
COMMIT;
