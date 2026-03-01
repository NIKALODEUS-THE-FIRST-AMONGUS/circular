-- Fix audit log trigger to include required table_name and record_id columns

-- Drop and recreate the function with all required fields
DROP FUNCTION IF EXISTS log_circular_creation() CASCADE;

CREATE OR REPLACE FUNCTION log_circular_creation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (table_name, record_id, user_id, action, details)
    VALUES (
        'circulars',
        NEW.id,
        auth.uid(),
        'INSERT',
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

-- Recreate the trigger
CREATE TRIGGER trigger_log_circular_creation
AFTER INSERT ON circulars
FOR EACH ROW
EXECUTE FUNCTION log_circular_creation();
