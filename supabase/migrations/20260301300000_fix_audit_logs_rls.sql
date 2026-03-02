-- Fix audit_logs RLS policies to allow inserts

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can create audit logs" ON audit_logs;

-- Allow authenticated users to insert audit logs
CREATE POLICY "Users can create audit logs" 
ON audit_logs FOR INSERT TO authenticated 
WITH CHECK (true);

-- Only admins can view audit logs (check role directly)
CREATE POLICY "Admins can view all audit logs" 
ON audit_logs FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);
