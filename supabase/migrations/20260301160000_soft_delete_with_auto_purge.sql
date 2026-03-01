-- ============================================
-- Soft Delete with Auto-Purge System
-- ============================================

-- Add soft delete columns to circulars table
ALTER TABLE circulars 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS permanent_delete_at TIMESTAMPTZ;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_circulars_deleted_at ON circulars(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_circulars_permanent_delete ON circulars(permanent_delete_at) WHERE permanent_delete_at IS NOT NULL;

-- Add comments
COMMENT ON COLUMN circulars.deleted_at IS 'Timestamp when circular was soft deleted (moved to trash)';
COMMENT ON COLUMN circulars.deleted_by IS 'User who deleted the circular';
COMMENT ON COLUMN circulars.permanent_delete_at IS 'Timestamp when circular will be permanently deleted (30 days after soft delete)';

-- ============================================
-- Function: Soft Delete Circular
-- ============================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS soft_delete_circular(UUID, UUID);

CREATE OR REPLACE FUNCTION soft_delete_circular(
    p_circular_id UUID,
    p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_permanent_delete_date TIMESTAMPTZ;
BEGIN
    -- Calculate permanent delete date (30 days from now)
    v_permanent_delete_date := NOW() + INTERVAL '30 days';
    
    -- Soft delete the circular
    UPDATE circulars
    SET 
        deleted_at = NOW(),
        deleted_by = p_user_id,
        permanent_delete_at = v_permanent_delete_date,
        updated_at = NOW()
    WHERE id = p_circular_id
    AND deleted_at IS NULL; -- Only delete if not already deleted
    
    -- Log to audit_logs
    INSERT INTO audit_logs (user_id, action, details)
    VALUES (
        p_user_id,
        'circular_soft_deleted',
        jsonb_build_object(
            'circular_id', p_circular_id,
            'deleted_at', NOW(),
            'permanent_delete_at', v_permanent_delete_date
        )
    );
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in soft_delete_circular: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Function: Restore Circular from Trash
-- ============================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS restore_circular(UUID, UUID);

CREATE OR REPLACE FUNCTION restore_circular(
    p_circular_id UUID,
    p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    -- Restore the circular
    UPDATE circulars
    SET 
        deleted_at = NULL,
        deleted_by = NULL,
        permanent_delete_at = NULL,
        updated_at = NOW()
    WHERE id = p_circular_id
    AND deleted_at IS NOT NULL; -- Only restore if deleted
    
    -- Log to audit_logs
    INSERT INTO audit_logs (user_id, action, details)
    VALUES (
        p_user_id,
        'circular_restored',
        jsonb_build_object(
            'circular_id', p_circular_id,
            'restored_at', NOW()
        )
    );
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in restore_circular: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Function: Auto-Purge Expired Circulars
-- ============================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS auto_purge_expired_circulars();

CREATE OR REPLACE FUNCTION auto_purge_expired_circulars()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER := 0;
    v_circular RECORD;
BEGIN
    -- Find and permanently delete expired circulars
    FOR v_circular IN 
        SELECT id, title, deleted_by
        FROM circulars
        WHERE deleted_at IS NOT NULL
        AND permanent_delete_at IS NOT NULL
        AND permanent_delete_at <= NOW()
    LOOP
        -- Log before permanent deletion
        INSERT INTO audit_logs (user_id, action, details)
        VALUES (
            v_circular.deleted_by,
            'circular_permanently_deleted',
            jsonb_build_object(
                'circular_id', v_circular.id,
                'title', v_circular.title,
                'auto_purged', true,
                'purged_at', NOW()
            )
        );
        
        -- Permanently delete
        DELETE FROM circulars WHERE id = v_circular.id;
        
        v_deleted_count := v_deleted_count + 1;
    END LOOP;
    
    IF v_deleted_count > 0 THEN
        RAISE NOTICE 'Auto-purged % expired circulars', v_deleted_count;
    END IF;
    
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Scheduled Job: Run Auto-Purge Daily
-- ============================================

-- Note: This requires pg_cron extension
-- To enable: CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule auto-purge to run daily at 2 AM
-- SELECT cron.schedule(
--     'auto-purge-expired-circulars',
--     '0 2 * * *', -- Every day at 2 AM
--     $$ SELECT auto_purge_expired_circulars(); $$
-- );

-- ============================================
-- View: Trash (Soft Deleted Circulars)
-- ============================================

CREATE OR REPLACE VIEW circulars_trash AS
SELECT 
    c.*,
    p.full_name as deleted_by_name,
    EXTRACT(DAY FROM (c.permanent_delete_at - NOW())) as days_until_permanent_delete
FROM circulars c
LEFT JOIN profiles p ON c.deleted_by = p.id
WHERE c.deleted_at IS NOT NULL
ORDER BY c.deleted_at DESC;

-- Grant access
GRANT SELECT ON circulars_trash TO authenticated;

-- ============================================
-- View: Active Circulars (Not Deleted)
-- ============================================

CREATE OR REPLACE VIEW circulars_active AS
SELECT *
FROM circulars
WHERE deleted_at IS NULL
ORDER BY created_at DESC;

-- Grant access
GRANT SELECT ON circulars_active TO authenticated;

-- ============================================
-- Update RLS Policies
-- ============================================

-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view active circulars" ON circulars;
    DROP POLICY IF EXISTS "Users can view trash" ON circulars;
    DROP POLICY IF EXISTS "Users can view own deleted circulars" ON circulars;
EXCEPTION
    WHEN undefined_object THEN
        NULL; -- Ignore if policies don't exist
END $$;

-- Policy: Users can view active circulars (not deleted)
CREATE POLICY "Users can view active circulars"
ON circulars FOR SELECT
TO authenticated
USING (deleted_at IS NULL);

-- Policy: Users can view their own deleted circulars
CREATE POLICY "Users can view own deleted circulars"
ON circulars FOR SELECT
TO authenticated
USING (
    deleted_at IS NOT NULL 
    AND (
        author_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    )
);

-- ============================================
-- Trigger: Log Permanent Deletions
-- ============================================

CREATE OR REPLACE FUNCTION log_permanent_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if circular was soft deleted (has deleted_at)
    IF OLD.deleted_at IS NOT NULL THEN
        INSERT INTO audit_logs (user_id, action, details)
        VALUES (
            COALESCE(OLD.deleted_by, OLD.author_id),
            'circular_permanently_deleted',
            jsonb_build_object(
                'circular_id', OLD.id,
                'title', OLD.title,
                'deleted_at', OLD.deleted_at,
                'permanently_deleted_at', NOW()
            )
        );
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_log_permanent_deletion ON circulars;
CREATE TRIGGER trigger_log_permanent_deletion
BEFORE DELETE ON circulars
FOR EACH ROW
EXECUTE FUNCTION log_permanent_deletion();

-- ============================================
-- Example Usage
-- ============================================

-- Soft delete a circular (moves to trash, auto-deletes after 30 days)
-- SELECT soft_delete_circular('circular-uuid', 'user-uuid');

-- Restore a circular from trash
-- SELECT restore_circular('circular-uuid', 'user-uuid');

-- Manually run auto-purge (normally runs automatically daily)
-- SELECT auto_purge_expired_circulars();

-- View trash
-- SELECT * FROM circulars_trash;

-- View active circulars
-- SELECT * FROM circulars_active;
