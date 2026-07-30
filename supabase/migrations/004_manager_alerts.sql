-- ============================================================
-- Kutsaga Field Ops — Migration 004: Manager Alerts
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
--
-- Moves "needs attention" signals off the HOD dashboard and into the
-- existing Alerts/Notifications system: a manager gets pinged when a
-- direct report submits a KPI for approval, or reports new progress on
-- one. Same SECURITY DEFINER trigger pattern as notify_kpi_status_change
-- in schema.sql.
-- ============================================================

CREATE OR REPLACE FUNCTION notify_manager_of_kpi_submission()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_manager_id UUID;
  v_owner_name TEXT;
BEGIN
  IF NEW.status = 'pending_approval' AND OLD.status IS DISTINCT FROM 'pending_approval' THEN
    SELECT manager_id, full_name INTO v_manager_id, v_owner_name
    FROM profiles WHERE id = NEW.owner_id;

    IF v_manager_id IS NOT NULL THEN
      INSERT INTO notifications(user_id, title, message, type, link_url)
      VALUES (
        v_manager_id,
        'KPI Awaiting Approval',
        v_owner_name || ' submitted "' || NEW.title || '" for approval',
        'info',
        '/team/' || NEW.owner_id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_kpi_submission_notify
  AFTER UPDATE ON kpis
  FOR EACH ROW EXECUTE FUNCTION notify_manager_of_kpi_submission();

CREATE OR REPLACE FUNCTION notify_manager_of_kpi_progress()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_owner_id UUID;
  v_kpi_title TEXT;
  v_manager_id UUID;
  v_owner_name TEXT;
BEGIN
  SELECT owner_id, title INTO v_owner_id, v_kpi_title FROM kpis WHERE id = NEW.kpi_id;
  SELECT manager_id, full_name INTO v_manager_id, v_owner_name FROM profiles WHERE id = v_owner_id;

  IF v_manager_id IS NOT NULL THEN
    INSERT INTO notifications(user_id, title, message, type, link_url)
    VALUES (
      v_manager_id,
      'KPI Progress Updated',
      v_owner_name || ' reported a new score (' || NEW.raw_score || '/6) on "' || v_kpi_title || '"',
      'info',
      '/team/' || v_owner_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_kpi_progress_notify
  AFTER INSERT ON kpi_progress
  FOR EACH ROW EXECUTE FUNCTION notify_manager_of_kpi_progress();
