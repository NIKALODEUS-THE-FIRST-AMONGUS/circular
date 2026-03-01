-- Disable automatic profile creation trigger
-- We handle profile creation manually during onboarding

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Note: Profiles will now be created manually during the onboarding flow
-- This gives users full control over their profile setup
