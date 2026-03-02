-- Fix notification_tokens RLS policies
-- Allow users to manage their own notification tokens

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS notification_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL UNIQUE,
  device_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE notification_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own tokens" ON notification_tokens;
DROP POLICY IF EXISTS "Users can insert their own tokens" ON notification_tokens;
DROP POLICY IF EXISTS "Users can update their own tokens" ON notification_tokens;
DROP POLICY IF EXISTS "Users can delete their own tokens" ON notification_tokens;

-- Create new policies
CREATE POLICY "Users can insert their own tokens" 
ON notification_tokens FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own tokens" 
ON notification_tokens FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own tokens" 
ON notification_tokens FOR UPDATE TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tokens" 
ON notification_tokens FOR DELETE TO authenticated 
USING (auth.uid() = user_id);
