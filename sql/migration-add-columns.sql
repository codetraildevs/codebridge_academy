-- ============================================
-- Migration: Add ALL missing columns
-- CodeBridge Academy — Supabase Migration
-- ============================================
-- Run this in your Supabase SQL Editor:
--   1. Go to https://supabase.com/dashboard
--   2. Select your project
--   3. Click "SQL Editor" → "New Query"
--   4. Paste this script → Click "Run"
-- ============================================
--
-- SAFE TO RUN MULTIPLE TIMES — every ALTER TABLE uses IF NOT EXISTS
-- so existing columns are never modified or overwritten.
--
-- This covers ALL columns from schema.sql for BOTH tables
-- (registrations and survey_responses) so that form submissions
-- never fail due to a missing column.
-- ============================================

-- ============================================
-- TABLE: registrations
-- Maps to the Training Registration multi-step form
-- ============================================

ALTER TABLE registrations ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS phone_code TEXT DEFAULT '+250';
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS age_group TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS organization TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS education_level TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS experience_level TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS parent_name TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS parent_phone_code TEXT DEFAULT '+250';
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS parent_phone TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS program TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS duration TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS schedule TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS skill_level TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS tech JSONB DEFAULT '[]'::jsonb;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS has_laptop TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS has_internet TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS projects TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS motivation TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS career_goals TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS goals JSONB DEFAULT '[]'::jsonb;

-- ============================================
-- TABLE: survey_responses
-- Maps to the Qualexas Research Survey multi-step form
-- ============================================

ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS phone_code TEXT DEFAULT '+250';
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS institution TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS institution_type TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS occupation TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS s2q1 TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS s2q2 JSONB DEFAULT '[]'::jsonb;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS s2q3 TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS s2q4 TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS s3q1 TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS s3q2 TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS s3q3 JSONB DEFAULT '[]'::jsonb;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS s4q1 TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS s4q2 JSONB DEFAULT '[]'::jsonb;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS s4q3 TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS s5q1 TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS s5q2 TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS s6q1 TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS s6q2 JSONB DEFAULT '[]'::jsonb;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS s7q1 TEXT;

-- ============================================
-- VERIFICATION: List all columns in both tables
-- ============================================
SELECT 'registrations' AS table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'registrations'
ORDER BY ordinal_position;

SELECT 'survey_responses' AS table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'survey_responses'
ORDER BY ordinal_position;
