-- Fix the approve_existing_trusted_domains function
-- Previous version had incorrect array syntax

DROP FUNCTION IF EXISTS approve_existing_trusted_domains();

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
    approved_list TEXT[];
    total_count INTEGER := 0;
    domain_count INTEGER;
BEGIN
    approved_list := ARRAY[]::TEXT[];
    
    -- Loop through each trusted domain
    FOREACH email_domain IN ARRAY trusted_domains LOOP
        -- Update users with this domain and collect their emails
        WITH updated AS (
            UPDATE profiles
            SET status = 'active'
            WHERE status = 'pending'
            AND email LIKE '%' || email_domain
            RETURNING email
        )
        SELECT array_agg(email), COUNT(*)
        INTO approved_list, domain_count
        FROM updated;
        
        -- Add to total count
        total_count := total_count + COALESCE(domain_count, 0);
    END LOOP;
    
    -- Return results
    RETURN QUERY SELECT total_count, COALESCE(approved_list, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION approve_existing_trusted_domains() IS 
'Manually approve all existing pending users with trusted email domains (@methodist.edu.in)';
