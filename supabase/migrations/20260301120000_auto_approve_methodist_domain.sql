-- Auto-approve users with @methodist.edu.in email domain
-- This trigger automatically approves users during signup if they have a trusted email domain

-- Function to auto-approve by email domain
CREATE OR REPLACE FUNCTION auto_approve_by_domain()
RETURNS TRIGGER AS $$
DECLARE
    email_domain TEXT;
    trusted_domains TEXT[] := ARRAY[
        '@methodist.edu.in'
    ];
BEGIN
    -- Extract domain from email
    email_domain := '@' || split_part(NEW.email, '@', 2);
    
    -- Check if domain is trusted
    IF email_domain = ANY(trusted_domains) THEN
        NEW.status := 'active';
        
        -- Log auto-approval in audit logs
        INSERT INTO audit_logs (action, actor_id, details)
        VALUES (
            'auto_approve_domain', 
            NEW.id, 
            jsonb_build_object(
                'email', NEW.email,
                'domain', email_domain,
                'reason', 'trusted_domain',
                'timestamp', NOW()
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists (for re-running migration)
DROP TRIGGER IF EXISTS auto_approve_on_signup ON profiles;

-- Attach trigger to profiles table
CREATE TRIGGER auto_approve_on_signup
    BEFORE INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION auto_approve_by_domain();

-- Also create a function to manually approve existing pending users with trusted domains
CREATE OR REPLACE FUNCTION approve_existing_trusted_domains()
RETURNS TABLE (
    approved_count INTEGER,
    approved_emails TEXT[]
) AS $$
DECLARE
    trusted_domains TEXT[] := ARRAY[
        '@methodist.edu.in'
    ];
    email_domain TEXT;
    approved_users TEXT[] := ARRAY[]::TEXT[];
    count INTEGER := 0;
BEGIN
    -- Update all pending users with trusted domains
    FOR email_domain IN SELECT UNNEST(trusted_domains) LOOP
        UPDATE profiles
        SET status = 'active'
        WHERE status = 'pending'
        AND email LIKE '%' || email_domain
        RETURNING email INTO approved_users[array_length(approved_users, 1) + 1];
        
        GET DIAGNOSTICS count = ROW_COUNT;
    END LOOP;
    
    RETURN QUERY SELECT count, approved_users;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION auto_approve_by_domain() IS 
'Automatically approves users with trusted email domains (@methodist.edu.in) during signup';

COMMENT ON FUNCTION approve_existing_trusted_domains() IS 
'Manually approve all existing pending users with trusted email domains';
