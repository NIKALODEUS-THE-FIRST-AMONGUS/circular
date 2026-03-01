-- ============================================
-- AUDIT LOG SYSTEM - Permanent Record Keeping
-- ============================================

-- Drop existing audit_logs if it exists with wrong structure
DROP TABLE IF EXISTS audit_logs CASCADE;

-- Audit Logs Table - Tracks ALL actions
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE', 'RESTORE'
    old_data JSONB,
    new_data JSONB,
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT,
    user_name TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- ============================================
-- SOFT DELETE SYSTEM
-- ============================================

-- Add soft delete columns to circulars
ALTER TABLE circulars ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE circulars ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);
ALTER TABLE circulars ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- Add soft delete to comments
ALTER TABLE circular_comments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE circular_comments ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- ============================================
-- CIRCULAR HISTORY TABLE - Version Control
-- ============================================

CREATE TABLE IF NOT EXISTS circular_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circular_id UUID NOT NULL REFERENCES circulars(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    title TEXT,
    content TEXT,
    attachments TEXT[],
    priority TEXT,
    department_target TEXT,
    target_year TEXT,
    target_section TEXT,
    changed_by UUID REFERENCES auth.users(id),
    changed_by_name TEXT,
    change_type TEXT, -- 'created', 'edited', 'deleted', 'restored'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(circular_id, version)
);

CREATE INDEX IF NOT EXISTS idx_circular_history_circular ON circular_history(circular_id);
CREATE INDEX IF NOT EXISTS idx_circular_history_created ON circular_history(created_at DESC);

-- ============================================
-- FUNCTIONS FOR AUDIT LOGGING
-- ============================================

-- Function to log audit entry
CREATE OR REPLACE FUNCTION log_audit(
    p_table_name TEXT,
    p_record_id UUID,
    p_action TEXT,
    p_old_data JSONB,
    p_new_data JSONB,
    p_user_id UUID,
    p_user_email TEXT,
    p_user_name TEXT
)
RETURNS void AS $$
BEGIN
    INSERT INTO audit_logs (
        table_name,
        record_id,
        action,
        old_data,
        new_data,
        user_id,
        user_email,
        user_name
    ) VALUES (
        p_table_name,
        p_record_id,
        p_action,
        p_old_data,
        p_new_data,
        p_user_id,
        p_user_email,
        p_user_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to soft delete circular
CREATE OR REPLACE FUNCTION soft_delete_circular(
    p_circular_id UUID,
    p_user_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_circular RECORD;
    v_result JSONB;
BEGIN
    -- Get circular data before deletion
    SELECT * INTO v_circular FROM circulars WHERE id = p_circular_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Circular not found');
    END IF;
    
    -- Soft delete
    UPDATE circulars
    SET deleted_at = NOW(),
        deleted_by = p_user_id,
        deletion_reason = p_reason
    WHERE id = p_circular_id;
    
    -- Log to audit
    PERFORM log_audit(
        'circulars',
        p_circular_id,
        'DELETE',
        row_to_json(v_circular)::JSONB,
        NULL,
        p_user_id,
        NULL,
        NULL
    );
    
    -- Save to history
    INSERT INTO circular_history (
        circular_id,
        version,
        title,
        content,
        attachments,
        priority,
        department_target,
        target_year,
        target_section,
        changed_by,
        change_type
    )
    SELECT 
        id,
        COALESCE((SELECT MAX(version) FROM circular_history WHERE circular_id = p_circular_id), 0) + 1,
        title,
        content,
        attachments,
        priority,
        department_target,
        target_year,
        target_section,
        p_user_id,
        'deleted'
    FROM circulars WHERE id = p_circular_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Circular soft deleted');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore circular
CREATE OR REPLACE FUNCTION restore_circular(
    p_circular_id UUID,
    p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_circular RECORD;
BEGIN
    -- Get circular data
    SELECT * INTO v_circular FROM circulars WHERE id = p_circular_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Circular not found');
    END IF;
    
    IF v_circular.deleted_at IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Circular is not deleted');
    END IF;
    
    -- Restore
    UPDATE circulars
    SET deleted_at = NULL,
        deleted_by = NULL,
        deletion_reason = NULL
    WHERE id = p_circular_id;
    
    -- Log to audit
    PERFORM log_audit(
        'circulars',
        p_circular_id,
        'RESTORE',
        row_to_json(v_circular)::JSONB,
        NULL,
        p_user_id,
        NULL,
        NULL
    );
    
    -- Save to history
    INSERT INTO circular_history (
        circular_id,
        version,
        title,
        content,
        attachments,
        priority,
        department_target,
        target_year,
        target_section,
        changed_by,
        change_type
    )
    SELECT 
        id,
        COALESCE((SELECT MAX(version) FROM circular_history WHERE circular_id = p_circular_id), 0) + 1,
        title,
        content,
        attachments,
        priority,
        department_target,
        target_year,
        target_section,
        p_user_id,
        'restored'
    FROM circulars WHERE id = p_circular_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Circular restored');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get circular history
CREATE OR REPLACE FUNCTION get_circular_history(p_circular_id UUID)
RETURNS TABLE (
    version INTEGER,
    title TEXT,
    content TEXT,
    change_type TEXT,
    changed_by_name TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ch.version,
        ch.title,
        ch.content,
        ch.change_type,
        ch.changed_by_name,
        ch.created_at
    FROM circular_history ch
    WHERE ch.circular_id = p_circular_id
    ORDER BY ch.version DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get audit logs for a record
CREATE OR REPLACE FUNCTION get_audit_logs(
    p_table_name TEXT,
    p_record_id UUID
)
RETURNS TABLE (
    action TEXT,
    user_name TEXT,
    user_email TEXT,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.action,
        al.user_name,
        al.user_email,
        al.old_data,
        al.new_data,
        al.created_at
    FROM audit_logs al
    WHERE al.table_name = p_table_name
    AND al.record_id = p_record_id
    ORDER BY al.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS FOR AUTOMATIC AUDIT LOGGING
-- ============================================

-- Trigger function for circulars
CREATE OR REPLACE FUNCTION audit_circulars_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM log_audit(
            'circulars',
            NEW.id,
            'INSERT',
            NULL,
            row_to_json(NEW)::JSONB,
            NEW.author_id,
            NULL,
            NEW.author_name
        );
        
        -- Save to history
        INSERT INTO circular_history (
            circular_id, version, title, content, attachments,
            priority, department_target, target_year, target_section,
            changed_by, changed_by_name, change_type
        ) VALUES (
            NEW.id, 1, NEW.title, NEW.content, NEW.attachments,
            NEW.priority, NEW.department_target, NEW.target_year, NEW.target_section,
            NEW.author_id, NEW.author_name, 'created'
        );
        
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Only log if actual data changed (not just timestamps)
        IF OLD.title IS DISTINCT FROM NEW.title OR
           OLD.content IS DISTINCT FROM NEW.content OR
           OLD.attachments IS DISTINCT FROM NEW.attachments THEN
            
            PERFORM log_audit(
                'circulars',
                NEW.id,
                'UPDATE',
                row_to_json(OLD)::JSONB,
                row_to_json(NEW)::JSONB,
                NEW.author_id,
                NULL,
                NEW.author_name
            );
            
            -- Save to history
            INSERT INTO circular_history (
                circular_id,
                version,
                title,
                content,
                attachments,
                priority,
                department_target,
                target_year,
                target_section,
                changed_by,
                changed_by_name,
                change_type
            ) VALUES (
                NEW.id,
                COALESCE((SELECT MAX(version) FROM circular_history WHERE circular_id = NEW.id), 0) + 1,
                NEW.title,
                NEW.content,
                NEW.attachments,
                NEW.priority,
                NEW.department_target,
                NEW.target_year,
                NEW.target_section,
                NEW.author_id,
                NEW.author_name,
                'edited'
            );
        END IF;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS audit_circulars_trigger ON circulars;
CREATE TRIGGER audit_circulars_trigger
    AFTER INSERT OR UPDATE ON circulars
    FOR EACH ROW
    EXECUTE FUNCTION audit_circulars_changes();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE circular_history ENABLE ROW LEVEL SECURITY;

-- Admins and teachers can view audit logs
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'Admins and teachers can view audit logs') THEN
        CREATE POLICY "Admins and teachers can view audit logs"
        ON audit_logs FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role IN ('admin', 'teacher')
            )
        );
    END IF;
END $$;

-- Anyone can view circular history
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'circular_history' AND policyname = 'Anyone can view circular history') THEN
        CREATE POLICY "Anyone can view circular history"
        ON circular_history FOR SELECT
        USING (true);
    END IF;
END $$;

-- ============================================
-- VIEWS FOR EASY QUERYING
-- ============================================

-- View for deleted circulars (recycle bin)
CREATE OR REPLACE VIEW deleted_circulars AS
SELECT 
    c.*,
    p.full_name as deleted_by_name,
    EXTRACT(EPOCH FROM (NOW() - c.deleted_at))/86400 as days_since_deletion
FROM circulars c
LEFT JOIN profiles p ON c.deleted_by = p.id
WHERE c.deleted_at IS NOT NULL
ORDER BY c.deleted_at DESC;

-- View for recent audit activity
CREATE OR REPLACE VIEW recent_audit_activity AS
SELECT 
    al.id,
    al.table_name,
    al.action,
    al.user_name,
    al.created_at,
    CASE 
        WHEN al.table_name = 'circulars' THEN (al.new_data->>'title')
        ELSE NULL
    END as item_title
FROM audit_logs al
ORDER BY al.created_at DESC
LIMIT 100;
