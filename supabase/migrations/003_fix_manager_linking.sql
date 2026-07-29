-- ============================================================
-- Kutsaga Field Ops — Migration 003: Fix Manager Linking
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
--
-- Root cause: profiles.manager_id is never set anywhere in the app
-- (not at signup, not editable), so get_subordinate_ids()/can_access_user()
-- have nothing to walk — an HOD/Team Leader can never see or approve a
-- subordinate's KPIs. This migration adds the RLS visibility needed for
-- a self-service "set your manager" picker (added in Profile.jsx).
-- ============================================================

-- Lets a user look up their own division without re-triggering RLS on
-- profiles (same SECURITY DEFINER pattern as get_subordinate_ids/can_access_user).
CREATE OR REPLACE FUNCTION get_own_division(p_user_id UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT division FROM profiles WHERE id = p_user_id;
$$;

-- Anyone can see active colleagues in their own division, plus org-wide
-- leadership (CEO / Executive Director) — needed so a TO/RO/Team Leader
-- can pick a manager from a real list instead of a blind text field.
CREATE POLICY "View division colleagues and org leadership"
  ON profiles FOR SELECT
  USING (
    is_active = TRUE
    AND (
      role IN ('CEO', 'Executive Director')
      OR division = get_own_division(auth.uid())
    )
  );
