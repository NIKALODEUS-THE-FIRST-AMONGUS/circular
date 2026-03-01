-- Drop everything related to notification_tokens
DROP TRIGGER IF EXISTS update_notification_tokens_timestamp ON notification_tokens;
DROP FUNCTION IF EXISTS update_notification_tokens_updated_at();
DROP TABLE IF EXISTS notification_tokens CASCADE;

-- Recreate the table with all columns
CREATE TABLE notification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    device_type TEXT DEFAULT 'web',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_notification_tokens_user_id ON notification_tokens(user_id);
CREATE INDEX idx_notification_tokens_token ON notification_tokens(token);

-- Enable RLS
ALTER TABLE notification_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can insert their own tokens"
    ON notification_tokens
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own tokens"
    ON notification_tokens
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own tokens"
    ON notification_tokens
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tokens"
    ON notification_tokens
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create trigger function
CREATE OR REPLACE FUNCTION update_notification_tokens_updated_at()
RETURNS TRIGGER AS $func$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_notification_tokens_timestamp
    BEFORE UPDATE ON notification_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_tokens_updated_at();
