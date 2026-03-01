-- Create notification_tokens table for FCM
CREATE TABLE IF NOT EXISTS notification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    device_type TEXT DEFAULT 'web',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_tokens_user_id ON notification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_tokens_token ON notification_tokens(token);

-- Enable RLS
ALTER TABLE notification_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own tokens
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notification_tokens' 
        AND policyname = 'Users can insert their own tokens'
    ) THEN
        CREATE POLICY "Users can insert their own tokens"
            ON notification_tokens
            FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Policy: Users can view their own tokens
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notification_tokens' 
        AND policyname = 'Users can view their own tokens'
    ) THEN
        CREATE POLICY "Users can view their own tokens"
            ON notification_tokens
            FOR SELECT
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- Policy: Users can update their own tokens
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notification_tokens' 
        AND policyname = 'Users can update their own tokens'
    ) THEN
        CREATE POLICY "Users can update their own tokens"
            ON notification_tokens
            FOR UPDATE
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- Policy: Users can delete their own tokens
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notification_tokens' 
        AND policyname = 'Users can delete their own tokens'
    ) THEN
        CREATE POLICY "Users can delete their own tokens"
            ON notification_tokens
            FOR DELETE
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_notification_tokens_timestamp ON notification_tokens;
CREATE TRIGGER update_notification_tokens_timestamp
    BEFORE UPDATE ON notification_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_tokens_updated_at();
