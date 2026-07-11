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

-- ============================================
-- STEP 2: Personal Profile
-- ============================================

-- Applicant's full name (required, text-only validated in JS)
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Applicant's email address (required, format-validated in JS)
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS email TEXT;

-- International dialing code for the applicant's phone number
-- Default: +250 (Rwanda — primary target country)
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS phone_code TEXT DEFAULT '+250';

-- Applicant's phone number (digits only after country code)
-- Stored as TEXT to preserve leading zeros (e.g. 0788123456)
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS phone TEXT;

-- Applicant's gender (e.g. Male, Female, Other)
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS gender TEXT;

-- Applicant's district/city of residence (e.g. Kigali, Rubavu, etc.)
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS location TEXT;

-- ============================================
-- STEP 2: Age Group
-- ============================================

-- Age bracket of the applicant
-- Values: 12-15, 16-18, 19-25, 26-35, 36-45, 46+
-- When 12-15 is selected, parent/guardian fields become required
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS age_group TEXT;

-- ============================================
-- STEP 3: Education & Background
-- ============================================

-- Current employment/education status
-- Values: Student, Employed, Self-Employed, Unemployed, Other
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS status TEXT;

-- Name of school, university, or employer
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS organization TEXT;

-- Current class/level/year of study (e.g. O Level, L3, L4, L5, Year 1, etc.)
-- Updated to include "O Level" as an option
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS level TEXT;

-- Highest education level attained
-- (e.g. High School, Certificate, Diploma, Bachelor's, Master's, PhD)
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS education_level TEXT;

-- Self-reported experience level in the chosen field
-- (e.g. Beginner, Intermediate, Advanced)
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS experience_level TEXT;

-- ============================================
-- PARENT/GUARDIAN INFO (conditional — only for under-16 applicants)
-- ============================================

-- Full name of parent or guardian (required when age_group = '12-15')
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS parent_name TEXT;

-- International dialing code for parent's phone number
-- Default: +250 (Rwanda)
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS parent_phone_code TEXT DEFAULT '+250';

-- Parent/guardian's phone number (required when age_group = '12-15')
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS parent_phone TEXT;

-- ============================================
-- STEP 4: Program Selection
-- ============================================

-- Training program the applicant is registering for
-- Values: Software Development, Networking, CSA, Electronics
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS program TEXT;

-- Bootcamp duration selected
-- Values: 4 Weeks (Starter - 60,000 RWF),
--         8 Weeks (Professional - 110,000 RWF),
--         12 Weeks (Advanced - 150,000 RWF)
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS duration TEXT;

-- Preferred class schedule
-- Values: Morning (8AM-11AM), Afternoon (1PM-4PM), Evening (5PM-8PM)
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS schedule TEXT;

-- Self-assessed skill level for the selected program
-- Values: Beginner, Intermediate, Advanced
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS skill_level TEXT;

-- Technologies the applicant has experience with
-- Dynamic checkboxes populated based on selected program:
--   Software Dev → HTML, CSS, JS, React, Python, etc.
--   Networking   → Cisco IOS, Routing, VLAN, OSPF, etc.
--   CSA          → Kali Linux, Nmap, Metasploit, etc.
--   Electronics  → Arduino, ESP32, Circuit Design, etc.
-- Stored as JSONB array (e.g. ["HTML","CSS","JavaScript"])
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS tech JSONB DEFAULT '[]'::jsonb;

-- ============================================
-- STEP 5: Goals & Background
-- ============================================

-- Whether the applicant has access to a laptop for the program
-- Values: Yes, No
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS has_laptop TEXT;

-- Whether the applicant has reliable internet access
-- Values: Yes, No
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS has_internet TEXT;

-- Description of any previous tech projects the applicant has worked on
-- Optional free-text field
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS projects TEXT;

-- Applicant's motivation for joining the bootcamp (required free-text)
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS motivation TEXT;

-- Applicant's long-term career aspirations (optional free-text)
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS career_goals TEXT;

-- Career goals / interests selected from a checkbox group
-- Values example: ["Start a tech career", "Freelancing", "University prep"]
-- Stored as JSONB array
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS goals JSONB DEFAULT '[]'::jsonb;

-- ============================================
-- TABLE: survey_responses
-- Maps to the Qualexas Research Survey multi-step form
-- ============================================

-- ============================================
-- STEP 1: Participant Information
-- ============================================

-- Survey respondent's full name
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Survey respondent's email address
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS email TEXT;

-- International dialing code for respondent's phone (default: Rwanda +250)
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS phone_code TEXT DEFAULT '+250';

-- Survey respondent's phone number (optional)
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS phone TEXT;

-- Institution the respondent is affiliated with (school, university, org)
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS institution TEXT;

-- District where the respondent lives
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS district TEXT;

-- Type of institution (e.g. Public University, Private School, NGO, etc.)
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS institution_type TEXT;

-- Respondent's current occupation or role
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS occupation TEXT;

-- ============================================
-- STEP 2: Current Assessment Challenges
-- ============================================

-- s2 = Step 2, q = question
-- "What is the biggest challenge in assessment?"
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS s2q1 TEXT;

-- "Which assessment methods do you use?" (multi-select checkboxes → JSONB array)
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS s2q2 JSONB DEFAULT '[]'::jsonb;

-- "How often do you conduct assessments?"
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS s2q3 TEXT;

-- "What is your preferred assessment format?"
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS s2q4 TEXT;

-- ============================================
-- STEP 3: Competency Verification
-- ============================================

-- "How do you currently verify competency?"
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS s3q1 TEXT;

-- "Which tools do you use for verification?"
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS s3q2 TEXT;

-- "What skills do you assess?" (multi-select checkboxes → JSONB array)
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS s3q3 JSONB DEFAULT '[]'::jsonb;

-- ============================================
-- STEP 4: Digital Assessment
-- ============================================

-- "Do you use digital assessment platforms?"
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS s4q1 TEXT;

-- "Which platforms do you use?" (multi-select checkboxes → JSONB array)
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS s4q2 JSONB DEFAULT '[]'::jsonb;

-- "Rate your satisfaction with digital assessments"
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS s4q3 TEXT;

-- ============================================
-- STEP 5: Employer & Workforce Readiness
-- ============================================

-- "Which workforce readiness skills matter most?" (multi-select → JSONB array)
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS s5q1 JSONB DEFAULT '[]'::jsonb;

-- "How do you prepare students for the workforce?"
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS s5q2 TEXT;

-- ============================================
-- STEP 6: Qualexas Validation
-- ============================================

-- "Do you see value in a platform like Qualexas?"
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS s6q1 TEXT;

-- "Which Qualexas features interest you?" (multi-select → JSONB array)
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS s6q2 JSONB DEFAULT '[]'::jsonb;

-- ============================================
-- STEP 7: Open Feedback
-- ============================================

-- "Any additional comments or suggestions?" (optional free-text)
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS s7q1 TEXT;

-- ============================================
-- ROW LEVEL SECURITY (ensure anonymous submissions work)
-- ============================================
-- If the table was created without these policies,
-- form submissions will be blocked by Supabase default deny.
-- ENABLE ROW LEVEL SECURITY is idempotent — safe to re-run.
-- CREATE POLICY IF NOT EXISTS prevents duplicate policy errors.

ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- Allows anyone (even unauthenticated visitors) to submit the registration form
-- This is essential since the form is public-facing
CREATE POLICY IF NOT EXISTS "Allow anonymous insert for registrations"
  ON registrations
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allows authenticated users (admin dashboard) to view registration data
CREATE POLICY IF NOT EXISTS "Allow authenticated select for registrations"
  ON registrations
  FOR SELECT
  TO authenticated
  USING (true);

ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- Allows anyone to submit a survey response (public survey form)
CREATE POLICY IF NOT EXISTS "Allow anonymous insert for survey_responses"
  ON survey_responses
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allows authenticated users to view survey responses
CREATE POLICY IF NOT EXISTS "Allow authenticated select for survey_responses"
  ON survey_responses
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- VERIFICATION: List all columns in both tables
-- ============================================
-- Run these SELECT queries at the end to confirm
-- all columns were created successfully.

SELECT 'registrations' AS table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'registrations'
ORDER BY ordinal_position;

SELECT 'survey_responses' AS table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'survey_responses'
ORDER BY ordinal_position;
