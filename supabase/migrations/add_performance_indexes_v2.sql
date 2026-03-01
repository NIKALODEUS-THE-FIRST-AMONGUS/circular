-- Performance Indexes for Enterprise-Grade Query Optimization
-- Used by Oracle, Google Cloud SQL, AWS RDS

-- Circulars table indexes
CREATE INDEX IF NOT EXISTS idx_circulars_created_at_desc 
ON circulars(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_circulars_department_target 
ON circulars(department_target);

CREATE INDEX IF NOT EXISTS idx_circulars_priority 
ON circulars(priority);

CREATE INDEX IF NOT EXISTS idx_circulars_author_id 
ON circulars(author_id);

CREATE INDEX IF NOT EXISTS idx_circulars_status 
ON circulars(status);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_circulars_dept_created 
ON circulars(department_target, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_circulars_priority_created 
ON circulars(priority, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_circulars_author_created 
ON circulars(author_id, created_at DESC);

-- Full-text search index for title and content
CREATE INDEX IF NOT EXISTS idx_circulars_search 
ON circulars USING gin(to_tsvector('english', title || ' ' || content));

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email 
ON profiles(email);

CREATE INDEX IF NOT EXISTS idx_profiles_role 
ON profiles(role);

CREATE INDEX IF NOT EXISTS idx_profiles_status 
ON profiles(status);

CREATE INDEX IF NOT EXISTS idx_profiles_department 
ON profiles(department);

-- Composite index for common profile queries
CREATE INDEX IF NOT EXISTS idx_profiles_role_status 
ON profiles(role, status);

-- Audit logs index (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'audit_logs') THEN
        CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
        ON audit_logs(created_at DESC);
        
        CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id 
        ON audit_logs(actor_id);
        
        CREATE INDEX IF NOT EXISTS idx_audit_logs_action 
        ON audit_logs(action);
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON INDEX idx_circulars_created_at_desc IS 'Optimizes ORDER BY created_at DESC queries';
COMMENT ON INDEX idx_circulars_dept_created IS 'Optimizes department filtering with date sorting';
COMMENT ON INDEX idx_circulars_search IS 'Enables full-text search on title and content';
