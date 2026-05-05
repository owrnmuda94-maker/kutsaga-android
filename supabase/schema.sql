-- ============================================================
-- Kutsaga Field Ops — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Profiles ────────────────────────────────────────────────
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  role          TEXT NOT NULL CHECK (role IN (
                  'Technical Officer',
                  'Research Officer',
                  'Team Leader',
                  'HOD',
                  'Executive Director',
                  'CEO'
                )),
  division      TEXT CHECK (division IN (
                  'Agricultural Data Science and Engineering',
                  'Plant Health and Agricultural Resilience',
                  'Analytical Chemistry Services',
                  'Genetics Biotechnology and Bioinnovation',
                  'Sustainable Agricultural Practices'
                )),
  manager_id    UUID REFERENCES profiles(id),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one active HOD per division
CREATE UNIQUE INDEX idx_one_hod_per_division
  ON profiles(division)
  WHERE role = 'HOD' AND is_active = TRUE;

-- ─── KPIs ─────────────────────────────────────────────────────
CREATE TABLE kpis (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  description     TEXT,
  owner_id        UUID NOT NULL REFERENCES profiles(id),
  division        TEXT,
  weight          NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (weight >= 0 AND weight <= 100),
  target          NUMERIC(10,2),
  target_locked   BOOLEAN NOT NULL DEFAULT FALSE,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
                    'draft', 'pending_approval', 'approved', 'rejected', 'achieved', 'not_achieved'
                  )),
  period_start    DATE,
  period_end      DATE,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  approved_by     UUID REFERENCES profiles(id),
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── KPI Progress ─────────────────────────────────────────────
CREATE TABLE kpi_progress (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kpi_id      UUID NOT NULL REFERENCES kpis(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES profiles(id),
  raw_score   NUMERIC(3,1) NOT NULL CHECK (raw_score >= 1 AND raw_score <= 6),
  notes       TEXT,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── KPI Approvals ────────────────────────────────────────────
CREATE TABLE kpi_approvals (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kpi_id      UUID NOT NULL REFERENCES kpis(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id),
  action      TEXT NOT NULL CHECK (action IN ('approved', 'rejected')),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── KPI Comments ─────────────────────────────────────────────
CREATE TABLE kpi_comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kpi_id      UUID NOT NULL REFERENCES kpis(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES profiles(id),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Activities ───────────────────────────────────────────────
CREATE TABLE activities (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES profiles(id),
  title        TEXT NOT NULL,
  description  TEXT,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  latitude     NUMERIC(10,7),
  longitude    NUMERIC(10,7),
  location_name TEXT,
  photo_url    TEXT,
  kpi_id       UUID REFERENCES kpis(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Expenses ─────────────────────────────────────────────────
CREATE TABLE expenses (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES profiles(id),
  description  TEXT NOT NULL,
  amount       NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  currency     TEXT NOT NULL DEFAULT 'USD',
  category     TEXT NOT NULL DEFAULT 'General',
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url  TEXT,
  activity_id  UUID REFERENCES activities(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Notifications ────────────────────────────────────────────
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id),
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  link_url    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Audit Logs ───────────────────────────────────────────────
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES profiles(id),
  action      TEXT NOT NULL,
  table_name  TEXT NOT NULL,
  record_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Helper Functions ─────────────────────────────────────────

-- Returns numeric level for a given role
CREATE OR REPLACE FUNCTION get_role_level(p_role TEXT)
RETURNS INT LANGUAGE sql STABLE AS $$
  SELECT CASE p_role
    WHEN 'Technical Officer'  THEN 1
    WHEN 'Research Officer'   THEN 2
    WHEN 'Team Leader'        THEN 3
    WHEN 'HOD'                THEN 4
    WHEN 'Executive Director' THEN 5
    WHEN 'CEO'                THEN 6
    ELSE 0
  END;
$$;

-- Returns all subordinate UUIDs (recursive) for a given manager
CREATE OR REPLACE FUNCTION get_subordinate_ids(p_manager_id UUID)
RETURNS TABLE(user_id UUID) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH RECURSIVE subordinates AS (
    SELECT id FROM profiles WHERE manager_id = p_manager_id AND is_active = TRUE
    UNION ALL
    SELECT p.id FROM profiles p
    INNER JOIN subordinates s ON p.manager_id = s.id
    WHERE p.is_active = TRUE
  )
  SELECT id FROM subordinates;
$$;

-- Returns TRUE if viewer can access target's data
CREATE OR REPLACE FUNCTION can_access_user(p_viewer_id UUID, p_target_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM get_subordinate_ids(p_viewer_id) WHERE user_id = p_target_id
  ) OR p_viewer_id = p_target_id
  OR EXISTS (
    SELECT 1 FROM profiles WHERE id = p_viewer_id AND role IN ('CEO', 'Executive Director')
  );
$$;

-- ─── Updated-at Trigger ───────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_kpis_updated_at
  BEFORE UPDATE ON kpis
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_activities_updated_at
  BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── KPI Status Notification Trigger ─────────────────────────
CREATE OR REPLACE FUNCTION notify_kpi_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO notifications(user_id, title, message, type)
    VALUES (
      NEW.owner_id,
      'KPI Status Updated',
      'Your KPI "' || NEW.title || '" status changed to ' || NEW.status,
      CASE NEW.status
        WHEN 'approved'     THEN 'success'
        WHEN 'rejected'     THEN 'error'
        WHEN 'achieved'     THEN 'success'
        WHEN 'not_achieved' THEN 'warning'
        ELSE 'info'
      END
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_kpi_status_notify
  AFTER UPDATE ON kpis
  FOR EACH ROW EXECUTE FUNCTION notify_kpi_status_change();

-- ─── Enable Realtime ──────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE kpis;
ALTER PUBLICATION supabase_realtime ADD TABLE kpi_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ─── Row Level Security ───────────────────────────────────────
ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpis           ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_progress   ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_approvals  ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_comments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities     ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs     ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT USING (id = auth.uid());

CREATE POLICY "Senior roles can read subordinate profiles"
  ON profiles FOR SELECT
  USING (can_access_user(auth.uid(), id));

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Allow profile insert on signup"
  ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- kpis
CREATE POLICY "Read own or subordinate KPIs"
  ON kpis FOR SELECT
  USING (can_access_user(auth.uid(), owner_id));

CREATE POLICY "Create own KPI"
  ON kpis FOR INSERT WITH CHECK (created_by = auth.uid() AND owner_id = auth.uid());

CREATE POLICY "Owner or manager can update KPI"
  ON kpis FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR can_access_user(auth.uid(), owner_id)
  );

-- kpi_progress
CREATE POLICY "Read progress for accessible KPIs"
  ON kpi_progress FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM kpis k WHERE k.id = kpi_id AND can_access_user(auth.uid(), k.owner_id)
  ));

CREATE POLICY "Report own progress"
  ON kpi_progress FOR INSERT WITH CHECK (reporter_id = auth.uid());

-- kpi_approvals
CREATE POLICY "Read approvals for accessible KPIs"
  ON kpi_approvals FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM kpis k WHERE k.id = kpi_id AND can_access_user(auth.uid(), k.owner_id)
  ));

CREATE POLICY "Managers can approve/reject"
  ON kpi_approvals FOR INSERT
  WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM kpis k
      WHERE k.id = kpi_id AND can_access_user(auth.uid(), k.owner_id)
      AND k.owner_id != auth.uid()
    )
  );

-- kpi_comments
CREATE POLICY "Read comments for accessible KPIs"
  ON kpi_comments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM kpis k WHERE k.id = kpi_id AND can_access_user(auth.uid(), k.owner_id)
  ));

CREATE POLICY "Add comment to accessible KPI"
  ON kpi_comments FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM kpis k WHERE k.id = kpi_id AND can_access_user(auth.uid(), k.owner_id)
    )
  );

-- activities
CREATE POLICY "Read own or subordinate activities"
  ON activities FOR SELECT USING (can_access_user(auth.uid(), user_id));

CREATE POLICY "Create own activity"
  ON activities FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Update own activity"
  ON activities FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Delete own activity"
  ON activities FOR DELETE USING (user_id = auth.uid());

-- expenses
CREATE POLICY "Read own or subordinate expenses"
  ON expenses FOR SELECT USING (can_access_user(auth.uid(), user_id));

CREATE POLICY "Create own expense"
  ON expenses FOR INSERT WITH CHECK (user_id = auth.uid());

-- notifications
CREATE POLICY "Read own notifications"
  ON notifications FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Update own notifications"
  ON notifications FOR UPDATE USING (user_id = auth.uid());

-- audit_logs
CREATE POLICY "Admins can read audit logs"
  ON audit_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('CEO', 'Executive Director', 'HOD')
  ));

-- ─── Views ────────────────────────────────────────────────────
CREATE VIEW user_kpi_summary AS
SELECT
  p.id AS user_id,
  p.full_name,
  p.role,
  p.division,
  COUNT(k.id) FILTER (WHERE k.status = 'approved')  AS approved_count,
  COUNT(k.id) FILTER (WHERE k.status = 'achieved')  AS achieved_count,
  COUNT(k.id) FILTER (WHERE k.status = 'rejected')  AS rejected_count,
  COUNT(k.id)                                         AS total_count,
  COALESCE(
    AVG(CASE WHEN kp.raw_score IS NOT NULL THEN (k.weight / 100.0) * kp.raw_score END),
    0
  ) AS avg_weighted_score
FROM profiles p
LEFT JOIN kpis k ON k.owner_id = p.id
LEFT JOIN LATERAL (
  SELECT raw_score FROM kpi_progress
  WHERE kpi_id = k.id ORDER BY reported_at DESC LIMIT 1
) kp ON TRUE
GROUP BY p.id, p.full_name, p.role, p.division;

CREATE VIEW division_kpi_summary AS
SELECT
  division,
  COUNT(id) FILTER (WHERE status = 'approved')  AS approved_count,
  COUNT(id) FILTER (WHERE status = 'achieved')  AS achieved_count,
  COUNT(id) FILTER (WHERE status = 'rejected')  AS rejected_count,
  COUNT(id)                                      AS total_count
FROM kpis
WHERE division IS NOT NULL
GROUP BY division;
