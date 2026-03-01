-- Fix audit log trigger to properly insert all required NOT NULL columns
-- The audit_logs table requires: table_name, record_id, action (all NOT NULL)

-- Drop and recreate the function with correct syntax and all required fields
DROP FUNCTION IF EXISTS log_circular_creation() CASCADE;

CREATE OR REPLACE FUNCTION log_circular_creation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        table_name,
        record_id,
        action,
        new_data,
        user_id,
        user_email,
        user_name
    )
    VALUES (
        'circulars',
        NEW.id,
        'INSERT',
        to_jsonb(NEW),
        auth.uid(),
        (SELECT email FROM auth.users WHERE id = auth.uid()),
        NEW.author_name
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_log_circular_creation ON circulars;
CREATE TRIGGER trigger_log_circular_creation
AFTER INSERT ON circulars
FOR EACH ROW
EXECUTE FUNCTION log_circular_creation();

-- Also fix the update trigger
DROP FUNCTION IF EXISTS log_circular_update() CASCADE;

CREATE OR REPLACE FUNCTION log_circular_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log significant updates
    IF OLD.title != NEW.title OR 
       OLD.content != NEW.content OR 
       OLD.priority != NEW.priority OR
       OLD.status != NEW.status THEN
        
        INSERT INTO audit_logs (
            table_name,
            record_id,
            action,
            old_data,
            new_data,
            user_id,
            user_email,
            user_name
        )
        VALUES (
            'circulars',
            NEW.id,
            'UPDATE',
            to_jsonb(OLD),
            to_jsonb(NEW),
            auth.uid(),
            (SELECT email FROM auth.users WHERE id = auth.uid()),
            NEW.author_name
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the update trigger
DROP TRIGGER IF EXISTS trigger_log_circular_update ON circulars;
CREATE TRIGGER trigger_log_circular_update
AFTER UPDATE ON circulars
FOR EACH ROW
EXECUTE FUNCTION log_circular_update();

-- Also fix the deletion trigger
DROP FUNCTION IF EXISTS log_circular_deletion() CASCADE;

CREATE OR REPLACE FUNCTION log_circular_deletion()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        table_name,
        record_id,
        action,
        old_data,
        user_id,
        user_email,
        user_name
    )
    VALUES (
        'circulars',
        OLD.id,
        'DELETE',
        to_jsonb(OLD),
        COALESCE(auth.uid(), OLD.author_id),
        (SELECT email FROM auth.users WHERE id = COALESCE(auth.uid(), OLD.author_id)),
        OLD.author_name
    );
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the deletion trigger
DROP TRIGGER IF EXISTS trigger_log_circular_deletion ON circulars;
CREATE TRIGGER trigger_log_circular_deletion
BEFORE DELETE ON circulars
FOR EACH ROW
EXECUTE FUNCTION log_circular_deletion();
