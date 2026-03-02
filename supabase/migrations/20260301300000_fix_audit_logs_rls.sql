-- Fix audit_logs RLS policies to allow inserts

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can create audit logs" ON audit_logs;

-- Allow authenticated users to insert audit logs
CREATE POLICY "Users can create audit logs" 
ON audit_logs FOR INSERT TO authenticated 
WITH CHECK (true);

-- Only admins can view audit logs
CREATE POLICY "Admins can view all audit logs" 
ON audit_logs FOR SELECT TO authenticated 
USING (is_admin());
