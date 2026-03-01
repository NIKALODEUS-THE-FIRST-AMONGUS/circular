-- ============================================
-- Simple Deletion Audit Logging
-- ============================================

-- Ensure audit_logs table exists with proper structure
DO $$ 
BEGIN
    -- Check if table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        CREATE TABLE audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id),
            action TEXT NOT NULL,
            details JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
        CREATE INDEX idx_audit_logs_action ON audit_logs(action);
        CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
    ELSE
        -- Table exists, ensure details column exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'audit_logs' AND column_name = 'details'
        ) THEN
            ALTER TABLE audit_logs ADD COLUMN details JSONB;
        END IF;
    END IF;
END $$;

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all audit logs
DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_logs;
CREATE POLICY "Admins can view all audit logs"
ON audit_logs FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
);

-- Policy: Users can view their own audit logs
DROP POLICY IF EXISTS "Users can view own audit logs" ON audit_logs;
CREATE POLICY "Users can view own audit logs"
ON audit_logs FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- Trigger: Log Circular Deletions
-- ============================================

CREATE OR REPLACE FUNCTION log_circular_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the deletion to audit_logs
    INSERT INTO audit_logs (user_id, action, details)
    VALUES (
        COALESCE(auth.uid(), OLD.author_id),
        'circular_deleted',
        jsonb_build_object(
            'circular_id', OLD.id,
            'title', OLD.title,
            'author_id', OLD.author_id,
            'author_name', OLD.author_name,
            'department', OLD.department,
            'priority', OLD.priority,
            'deleted_at', NOW()
        )
    );
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_log_circular_deletion ON circulars;

-- Create trigger for circular deletions
CREATE TRIGGER trigger_log_circular_deletion
BEFORE DELETE ON circulars
FOR EACH ROW
EXECUTE FUNCTION log_circular_deletion();

-- ============================================
-- Trigger: Log Circular Updates
-- ============================================

CREATE OR REPLACE FUNCTION log_circular_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log significant updates (title, content, priority changes)
    IF OLD.title != NEW.title OR 
       OLD.content != NEW.content OR 
       OLD.priority != NEW.priority THEN
        
        INSERT INTO audit_logs (user_id, action, details)
        VALUES (
            auth.uid(),
            'circular_updated',
            jsonb_build_object(
                'circular_id', NEW.id,
                'title', NEW.title,
                'changes', jsonb_build_object(
                    'title_changed', OLD.title != NEW.title,
                    'content_changed', OLD.content != NEW.content,
                    'priority_changed', OLD.priority != NEW.priority
                ),
                'updated_at', NOW()
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_log_circular_update ON circulars;

-- Create trigger for circular updates
CREATE TRIGGER trigger_log_circular_update
AFTER UPDATE ON circulars
FOR EACH ROW
EXECUTE FUNCTION log_circular_update();

-- ============================================
-- Trigger: Log Circular Creation
-- ============================================

CREATE OR REPLACE FUNCTION log_circular_creation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (user_id, action, details)
    VALUES (
        auth.uid(),
        'circular_created',
        jsonb_build_object(
            'circular_id', NEW.id,
            'title', NEW.title,
            'department_target', NEW.department_target,
            'priority', NEW.priority,
            'created_at', NOW()
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_log_circular_creation ON circulars;

-- Create trigger for circular creation
CREATE TRIGGER trigger_log_circular_creation
AFTER INSERT ON circulars
FOR EACH ROW
EXECUTE FUNCTION log_circular_creation();

-- ============================================
-- View: Recent Audit Logs
-- ============================================

CREATE OR REPLACE VIEW recent_audit_logs AS
SELECT 
    a.id,
    a.user_id,
    p.full_name as user_name,
    p.role as user_role,
    a.action,
    a.details,
    a.created_at,
    -- Extract circular title from details if available
    a.details->>'title' as circular_title,
    a.details->>'circular_id' as circular_id
FROM audit_logs a
LEFT JOIN profiles p ON a.user_id = p.id
ORDER BY a.created_at DESC
LIMIT 1000;

-- Grant access
GRANT SELECT ON recent_audit_logs TO authenticated;

-- ============================================
-- Function: Get Deletion History
-- ============================================

CREATE OR REPLACE FUNCTION get_deletion_history(
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    id UUID,
    user_name TEXT,
    circular_title TEXT,
    circular_id TEXT,
    department TEXT,
    priority TEXT,
    deleted_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        p.full_name as user_name,
        (a.details->>'title')::TEXT as circular_title,
        (a.details->>'circular_id')::TEXT as circular_id,
        (a.details->>'department')::TEXT as department,
        (a.details->>'priority')::TEXT as priority,
        a.created_at as deleted_at
    FROM audit_logs a
    LEFT JOIN profiles p ON a.user_id = p.id
    WHERE a.action = 'circular_deleted'
    ORDER BY a.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Function: Get User Activity
-- ============================================

CREATE OR REPLACE FUNCTION get_user_activity(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    action TEXT,
    details JSONB,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.action,
        a.details,
        a.created_at
    FROM audit_logs a
    WHERE a.user_id = p_user_id
    ORDER BY a.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Example Queries
-- ============================================

-- View all recent audit logs
-- SELECT * FROM recent_audit_logs;

-- View deletion history
-- SELECT * FROM get_deletion_history(50);

-- View specific user's activity
-- SELECT * FROM get_user_activity('user-uuid', 100);

-- View all deletions in last 7 days
-- SELECT * FROM audit_logs 
-- WHERE action = 'circular_deleted' 
-- AND created_at > NOW() - INTERVAL '7 days'
-- ORDER BY created_at DESC;

-- Count deletions by user
-- SELECT 
--     p.full_name,
--     COUNT(*) as deletion_count
-- FROM audit_logs a
-- JOIN profiles p ON a.user_id = p.id
-- WHERE a.action = 'circular_deleted'
-- GROUP BY p.full_name
-- ORDER BY deletion_count DESC;
