-- =====================================================
-- COMPLETE AVATAR SETUP - Run this in Supabase SQL Editor
-- =====================================================
-- This single file does EVERYTHING - no manual steps needed!

-- Step 1: Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    2097152, -- 2MB in bytes
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Step 2: Create function to set up storage policies (with elevated privileges)
CREATE OR REPLACE FUNCTION setup_avatar_storage_policies()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
    -- Note: RLS is already enabled on storage.objects by default in Supabase
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Public avatar access" ON storage.objects;
    DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;

    -- Policy 1: Anyone can view avatars (public read)
    CREATE POLICY "Public avatar access"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'avatars');

    -- Policy 2: Authenticated users can upload to their own folder
    CREATE POLICY "Users can upload avatars"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'avatars' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

    -- Policy 3: Users can update their own avatars
    CREATE POLICY "Users can update own avatars"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'avatars' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'avatars' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

    -- Policy 4: Users can delete their own avatars
    CREATE POLICY "Users can delete own avatars"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'avatars' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );
END;
$$;

-- Step 3: Execute the function to set up policies
SELECT setup_avatar_storage_policies();

-- Step 4: Ensure avatar_url column exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Step 5: Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_url 
ON profiles(avatar_url) WHERE avatar_url IS NOT NULL;

-- Step 6: Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 7: Auto-cleanup old avatars when new one uploaded
CREATE OR REPLACE FUNCTION cleanup_old_avatar()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.avatar_url IS DISTINCT FROM NEW.avatar_url AND OLD.avatar_url IS NOT NULL THEN
        RAISE NOTICE 'Old avatar will be replaced: %', OLD.avatar_url;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cleanup_old_avatar_trigger ON profiles;
CREATE TRIGGER cleanup_old_avatar_trigger
    AFTER UPDATE OF avatar_url ON profiles
    FOR EACH ROW
    WHEN (OLD.avatar_url IS DISTINCT FROM NEW.avatar_url)
    EXECUTE FUNCTION cleanup_old_avatar();

-- Add helpful comments
COMMENT ON COLUMN profiles.avatar_url IS 'URL to user avatar stored in Supabase Storage';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '✅ Avatar storage bucket created: avatars';
    RAISE NOTICE '✅ 4 storage policies created';
    RAISE NOTICE '✅ Avatar database setup complete!';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '🎉 Avatar system is FULLY configured!';
    RAISE NOTICE '📝 Test: Upload a profile picture in your app';
END $$;
