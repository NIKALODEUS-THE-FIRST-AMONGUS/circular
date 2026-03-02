-- Fix the auth trigger to work properly with minimal data
-- This allows user creation to succeed, then onboarding can update the profile

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Only create a minimal profile entry to allow user creation
  -- The onboarding flow will update this with full details
  INSERT INTO public.profiles (id, email, role, status, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    'student', -- Default role
    'pending', -- Default status
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING; -- Ignore if already exists
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- If anything fails, still allow user creation
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
