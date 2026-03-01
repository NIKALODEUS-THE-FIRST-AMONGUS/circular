-- Simple fix for admin approval updates
-- This allows admins to update profile status from pending to active

-- Drop the problematic policy if it exists
DROP POLICY IF EXISTS "Admins can update any profile status" ON profiles;

-- Recreate a simple, direct policy for admins to update profiles
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
CREATE POLICY "Admins can update profiles" 
ON profiles FOR UPDATE 
TO authenticated 
USING (
    -- Check if the current user is an admin
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
    -- Check if the current user is an admin
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- Grant necessary permissions
GRANT UPDATE ON profiles TO authenticated;
