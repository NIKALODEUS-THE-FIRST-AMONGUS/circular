-- Migration: Add Bio Management Functions
-- Description: Adds functions to manage user bio (edit, add, remove/reset)

-- Ensure bio column exists (should already exist from add_whatsapp_and_views.sql)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='profiles' AND column_name='bio'
    ) THEN
        ALTER TABLE profiles ADD COLUMN bio TEXT;
    END IF;
END $$;

-- Function to update bio
CREATE OR REPLACE FUNCTION update_user_bio(
    user_id UUID,
    new_bio TEXT
)
RETURNS VOID AS $$
BEGIN
    UPDATE profiles
    SET 
        bio = new_bio,
        updated_at = timezone('utc'::text, now())
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset/delete bio (set to NULL)
CREATE OR REPLACE FUNCTION reset_user_bio(
    user_id UUID
)
RETURNS VOID AS $$
BEGIN
    UPDATE profiles
    SET 
        bio = NULL,
        updated_at = timezone('utc'::text, now())
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON COLUMN profiles.bio IS 'User biography/about section (max 200 characters recommended)';
COMMENT ON FUNCTION update_user_bio IS 'Updates user bio with new text';
COMMENT ON FUNCTION reset_user_bio IS 'Resets user bio to default (NULL)';

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION update_user_bio TO authenticated;
GRANT EXECUTE ON FUNCTION reset_user_bio TO authenticated;
