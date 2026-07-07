-- ============================================================
-- Kutsaga Field Ops — Migration 002: Recover Core Functions
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- Adds: activity categories, photo storage, expense quantity/unit
-- ============================================================

-- ─── Activities: category ───────────────────────────────────
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Other'
  CHECK (category IN (
    'Grower Interactions',
    'Site Visits',
    'Trainings',
    'Trials / Experiments',
    'Demonstrations',
    'Meetings',
    'Administration',
    'Other'
  ));

-- ─── Activities: multi-photo support ────────────────────────
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS photo_urls TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE activities
  DROP COLUMN IF EXISTS photo_url;

-- ─── Expenses: fuel quantity/unit (litres etc.) ─────────────
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS quantity NUMERIC(10,2);

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS unit TEXT;

-- ─── Storage: activity-photos bucket ────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('activity-photos', 'activity-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload into their own folder (user_id/…)
CREATE POLICY "Authenticated users can upload activity photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'activity-photos'
    AND auth.role() = 'authenticated'
  );

-- Public bucket: anyone can read (needed to render photos and embed in PDFs)
CREATE POLICY "Anyone can view activity photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'activity-photos');

-- Owners can delete their own uploaded photos
CREATE POLICY "Users can delete their own activity photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'activity-photos'
    AND owner = auth.uid()
  );
