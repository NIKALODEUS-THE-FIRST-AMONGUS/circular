-- Fix profile insert policy to allow new users to create their own profile
-- This is needed for onboarding after OAuth login

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can manage their own profile" ON profiles;

-- Create separate policies for better control
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" 
ON profiles FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" 
ON profiles FOR SELECT TO authenticated 
USING (auth.uid() = id);

-- Keep the public view policy for authenticated users
-- (already exists: "Public profiles are viewable by authenticated users")
