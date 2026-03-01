-- Fix audit log trigger to use correct column name
-- The column is 'department_target' not 'department'

-- Drop and recreate the function with correct column name
DROP FUNCTION IF EXISTS log_circular_creation() CASCADE;

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

-- Recreate the trigger
CREATE TRIGGER trigger_log_circular_creation
AFTER INSERT ON circulars
FOR EACH ROW
EXECUTE FUNCTION log_circular_creation();
