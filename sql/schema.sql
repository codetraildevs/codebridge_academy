-- ============================================
-- CodeBridge Academy — Supabase Schema
-- Generated for Netlify Forms → Supabase migration
-- ============================================

-- Enable UUID generation (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TABLE: registrations
-- Maps to the Training Registration multi-step form
-- ============================================
CREATE TABLE IF NOT EXISTS registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Step 2: Personal Profile
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_code TEXT NOT NULL DEFAULT '+250',
  phone TEXT NOT NULL,
  gender TEXT NOT NULL,
  location TEXT NOT NULL,

  -- Step 2: Age Group
  age_group TEXT,

  -- Step 3: Education & Background
  status TEXT NOT NULL,
  organization TEXT NOT NULL,
  level TEXT NOT NULL,
  education_level TEXT,
  experience_level TEXT,
  parent_name TEXT,
  parent_phone_code TEXT DEFAULT '+250',
  parent_phone TEXT,

  -- Step 4: Program Selection
  program TEXT NOT NULL,
  duration TEXT,
  schedule TEXT,
  skill_level TEXT NOT NULL,
  tech JSONB DEFAULT '[]'::jsonb,

  -- Step 5: Goals & Background
  has_laptop TEXT NOT NULL,
  has_internet TEXT NOT NULL,
  projects TEXT,
  motivation TEXT NOT NULL,
  career_goals TEXT,
  goals JSONB DEFAULT '[]'::jsonb
);

-- Enable Row Level Security
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (public form submissions)
CREATE POLICY "Allow anonymous insert for registrations"
  ON registrations
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow authenticated users to select (for admin dashboard)
CREATE POLICY "Allow authenticated select for registrations"
  ON registrations
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- TABLE: survey_responses
-- Maps to the Qualexas Research Survey multi-step form
-- ============================================
CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Step 1: Participant Information
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_code TEXT DEFAULT '+250',
  phone TEXT,
  institution TEXT NOT NULL,
  district TEXT NOT NULL,
  institution_type TEXT NOT NULL,
  occupation TEXT NOT NULL,

  -- Step 2: Current Assessment Challenges
  s2q1 TEXT NOT NULL,
  s2q2 JSONB DEFAULT '[]'::jsonb,
  s2q3 TEXT NOT NULL,
  s2q4 TEXT NOT NULL,

  -- Step 3: Competency Verification
  s3q1 TEXT NOT NULL,
  s3q2 TEXT NOT NULL,
  s3q3 JSONB DEFAULT '[]'::jsonb,

  -- Step 4: Digital Assessment
  s4q1 TEXT NOT NULL,
  s4q2 JSONB DEFAULT '[]'::jsonb,
  s4q3 TEXT NOT NULL,

  -- Step 5: Employer & Workforce Readiness
  s5q1 TEXT NOT NULL,
  s5q2 TEXT NOT NULL,

  -- Step 6: Qualexas Validation
  s6q1 TEXT NOT NULL,
  s6q2 JSONB DEFAULT '[]'::jsonb,

  -- Step 7: Open Feedback
  s7q1 TEXT
);

-- Enable Row Level Security
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (public form submissions)
CREATE POLICY "Allow anonymous insert for survey_responses"
  ON survey_responses
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow authenticated users to select (for admin dashboard)
CREATE POLICY "Allow authenticated select for survey_responses"
  ON survey_responses
  FOR SELECT
  TO authenticated
  USING (true);
