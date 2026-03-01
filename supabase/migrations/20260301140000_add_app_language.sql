-- Add app_language column to profiles table for multilingual branding
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS app_language TEXT DEFAULT 'en' CHECK (app_language IN ('en', 'hi', 'te', 'ta', 'kn'));

-- Add comment
COMMENT ON COLUMN profiles.app_language IS 'User preferred language for app branding (en=English, hi=Hindi, te=Telugu, ta=Tamil, kn=Kannada)';

-- Create index for faster language-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_app_language ON profiles(app_language);
