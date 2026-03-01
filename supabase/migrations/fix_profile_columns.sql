-- Add missing profile columns and fix constraints

-- Add intro preferences columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS daily_intro_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS greeting_language TEXT DEFAULT 'Mixed',
ADD COLUMN IF NOT EXISTS intro_frequency TEXT DEFAULT 'daily',
ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'system',
ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT '+91',
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Drop old constraint if exists
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_intro_frequency_check;

-- Add correct constraint for intro_frequency
ALTER TABLE profiles 
ADD CONSTRAINT profiles_intro_frequency_check 
CHECK (intro_frequency IN ('daily', 'always'));

-- Add constraint for theme_preference
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_theme_preference_check;
ALTER TABLE profiles 
ADD CONSTRAINT profiles_theme_preference_check 
CHECK (theme_preference IN ('light', 'dark', 'system'));

-- Add comment
COMMENT ON COLUMN profiles.intro_frequency IS 'How often to show welcome animation: daily or always';
COMMENT ON COLUMN profiles.greeting_language IS 'Language for welcome animation greeting';
COMMENT ON COLUMN profiles.daily_intro_enabled IS 'Whether to show Apple-style welcome animation';
