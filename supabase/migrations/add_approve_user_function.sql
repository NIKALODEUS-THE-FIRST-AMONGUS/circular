-- Create a SECURITY DEFINER function to approve users
-- This bypasses RLS and allows admins to approve users directly

CREATE OR REPLACE FUNCTION approve_user(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_role TEXT;
BEGIN
    -- Check if the caller is an admin
    SELECT role INTO current_user_role
    FROM profiles
    WHERE id = auth.uid();
    
    IF current_user_role != 'admin' THEN
        RAISE EXCEPTION 'Only admins can approve users';
    END IF;
    
    -- Update the user's status to active
    UPDATE profiles
    SET status = 'active',
        updated_at = NOW()
    WHERE id = user_id;
    
    -- Check if update was successful
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION approve_user(UUID) TO authenticated;

-- Create a similar function for declining users
CREATE OR REPLACE FUNCTION decline_user(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_role TEXT;
BEGIN
    -- Check if the caller is an admin
    SELECT role INTO current_user_role
    FROM profiles
    WHERE id = auth.uid();
    
    IF current_user_role != 'admin' THEN
        RAISE EXCEPTION 'Only admins can decline users';
    END IF;
    
    -- Update the user's status to suspended
    UPDATE profiles
    SET status = 'suspended',
        updated_at = NOW()
    WHERE id = user_id;
    
    -- Check if update was successful
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION decline_user(UUID) TO authenticated;
