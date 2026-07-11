-- ============================================
-- Migration: Add new columns to registrations table
-- CodeBridge Academy — Supabase Migration
-- ============================================
-- Run this in your Supabase SQL Editor:
--   1. Go to https://supabase.com/dashboard
--   2. Select your project
--   3. Click "SQL Editor" → "New Query"
--   4. Paste this script → Click "Run"
-- ============================================

-- Safe to run multiple times (uses IF NOT EXISTS)

-- Parent/Guardian fields (for applicants under 16)
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS parent_name TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS parent_phone_code TEXT DEFAULT '+250';
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS parent_phone TEXT;

-- Duration field (4 Weeks / 8 Weeks / 12 Weeks)
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS duration TEXT;

-- Technologies used (JSON array, e.g. ["HTML","CSS","JavaScript"])
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS tech JSONB DEFAULT '[]'::jsonb;

-- Goals (JSON array of checkbox selections)
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS goals JSONB DEFAULT '[]'::jsonb;

-- ============================================
-- Verify all columns exist
-- ============================================
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'registrations' 
ORDER BY ordinal_position;
