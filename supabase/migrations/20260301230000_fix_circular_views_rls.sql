-- Fix circular_views RLS to allow upsert operations
-- The current policy only allows INSERT, but we're using upsert which requires UPDATE

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own views" ON circular_views;

-- Create new policies that allow both INSERT and UPDATE
CREATE POLICY "Users can insert their own views" 
ON circular_views FOR INSERT 
WITH CHECK (auth.uid() = viewer_id);

CREATE POLICY "Users can update their own views" 
ON circular_views FOR UPDATE 
USING (auth.uid() = viewer_id)
WITH CHECK (auth.uid() = viewer_id);

-- Add comment
COMMENT ON TABLE circular_views IS 'Tracks which users have viewed which circulars - supports upsert for view timestamp updates';
