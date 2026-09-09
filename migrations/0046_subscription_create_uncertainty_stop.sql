-- 0046_subscription_create_uncertainty_stop.sql
-- V3.9-f.8 paid-mutation safety: a provider subscription CREATE that returns
-- no usable subscription id is an unknown provider outcome, not proof of zero
-- exposure. Durable create-failure evidence therefore opens reconciliation
-- incident-stop and blocks further paid work until an operator reconciles the
-- provider account.
BEGIN;

CREATE OR REPLACE FUNCTION clean.stop_on_probe_create_uncertainty()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status='probing'
     AND NEW.status='failed'
     AND NEW.stop_reason='subscription_create_failed' THEN
    UPDATE clean.adb_probe_budget_day
       SET state='MISMATCH', closed_at=COALESCE(closed_at,now())
     WHERE probe_budget_day_id=NEW.probe_budget_day_id
       AND state='OPEN';

    INSERT INTO clean.adb_incident_stop(cause,occurred_at_utc,detail,resolved)
    VALUES(
      'reconciliation',now(),
      jsonb_build_object(
        'kind','subscription_create_outcome_unknown',
        'owner','anchor_probe',
        'probe_id',NEW.probe_id,
        'probe_budget_day_id',NEW.probe_budget_day_id,
        'icao',NEW.icao,
        'stage',NEW.stage
      ),
      false
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_probe_create_uncertainty_stop ON clean.adb_anchor_probe;
CREATE TRIGGER trg_probe_create_uncertainty_stop
  AFTER UPDATE OF status,stop_reason ON clean.adb_anchor_probe
  FOR EACH ROW EXECUTE FUNCTION clean.stop_on_probe_create_uncertainty();

CREATE OR REPLACE FUNCTION clean.stop_on_phase6_create_uncertainty()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  parent_id TEXT;
BEGIN
  IF NEW.outcome='REFUSED' AND NEW.reason LIKE 'CREATE_FAILED:%' THEN
    SELECT batch_id INTO parent_id
      FROM clean.adb_collection_batches
     WHERE run_day_index=NEW.run_day_index
       AND status IN ('STARTING','ACTIVE','BLOCKED')
     ORDER BY started_at DESC
     LIMIT 1;

    IF parent_id IS NOT NULL THEN
      UPDATE clean.adb_collection_batches
         SET status='BLOCKED', stop_reason='subscription-create-outcome-unknown'
       WHERE batch_id=parent_id
         AND status IN ('STARTING','ACTIVE');
    END IF;

    INSERT INTO clean.adb_incident_stop(cause,occurred_at_utc,detail,resolved)
    VALUES(
      'reconciliation',now(),
      jsonb_build_object(
        'kind','subscription_create_outcome_unknown',
        'owner','phase6_collection',
        'run_day_index',NEW.run_day_index,
        'batch_id',parent_id,
        'authorization_id',NEW.authorization_id,
        'reason',NEW.reason
      ),
      false
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_phase6_create_uncertainty_stop ON clean.adb_phase6_admission_attempt;
CREATE TRIGGER trg_phase6_create_uncertainty_stop
  AFTER INSERT ON clean.adb_phase6_admission_attempt
  FOR EACH ROW EXECUTE FUNCTION clean.stop_on_phase6_create_uncertainty();

COMMIT;
