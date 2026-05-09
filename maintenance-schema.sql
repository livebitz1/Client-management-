-- ============================================================
-- MAINTENANCE TRACKING — Run this in Supabase SQL Editor
-- ============================================================

-- Add maintenance fields to existing projects table
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS maintenance_amount DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS maintenance_active BOOLEAN DEFAULT false;

-- Monthly maintenance records table
CREATE TABLE IF NOT EXISTS project_maintenance (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL,          -- YYYY-MM  e.g. "2026-05"
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  paid_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, month)
);

CREATE INDEX IF NOT EXISTS idx_project_maintenance_project_id ON project_maintenance(project_id);
CREATE INDEX IF NOT EXISTS idx_project_maintenance_month ON project_maintenance(month DESC);
CREATE INDEX IF NOT EXISTS idx_project_maintenance_status ON project_maintenance(status);

DROP TRIGGER IF EXISTS update_project_maintenance_updated_at ON project_maintenance;
CREATE TRIGGER update_project_maintenance_updated_at
  BEFORE UPDATE ON project_maintenance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
