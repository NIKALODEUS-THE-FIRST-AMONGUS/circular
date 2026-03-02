-- Allow users to update their own pending profiles during onboarding
-- This is needed for the upsert operation

DROP POLICY IF EXISTS "Users can update their own pending profile" ON profiles;
CREATE POLICY "Users can update their own pending profile" 
ON profiles FOR UPDATE TO authenticated 
USING (auth.uid() = id AND status = 'pending') 
WITH CHECK (auth.uid() = id);

-- Also ensure the existing update policy allows all self-updates
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);
