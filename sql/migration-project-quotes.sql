-- ============================================
-- CodeBridge Academy — Migration
-- Adds the project_quotes table for the
-- "Request a Project Quote" form (Software
-- Development Services section).
-- ============================================

CREATE TABLE IF NOT EXISTS project_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  organization TEXT,
  service TEXT NOT NULL,
  budget TEXT,
  message TEXT NOT NULL
);

-- Enable Row Level Security
ALTER TABLE project_quotes ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (public form submissions)
CREATE POLICY "Allow anonymous insert for project_quotes"
  ON project_quotes
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow authenticated users to select (for admin dashboard)
CREATE POLICY "Allow authenticated select for project_quotes"
  ON project_quotes
  FOR SELECT
  TO authenticated
  USING (true);
