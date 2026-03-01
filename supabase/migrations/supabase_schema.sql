-- 1. ENUMS (Idempotent check)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE user_status AS ENUM ('active', 'suspended', 'pending', 'skipped');
    ELSE
        -- Add pending and skipped if they don't exist
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending' AND enumtypid = 'user_status'::regtype) THEN
            ALTER TYPE user_status ADD VALUE 'pending';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'skipped' AND enumtypid = 'user_status'::regtype) THEN
            ALTER TYPE user_status ADD VALUE 'skipped';
        END IF;
    END IF;
END $$;

-- 2. PROFILES TABLE (Safe Creation)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role user_role DEFAULT 'student',
  department TEXT,
  status user_status DEFAULT 'pending',
  full_name TEXT,
  class_branch TEXT,
  college_role TEXT,
  mobile_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure all columns exist (in case of old schema)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='updated_at') THEN
        ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='class_branch') THEN
        ALTER TABLE profiles ADD COLUMN class_branch TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='college_role') THEN
        ALTER TABLE profiles ADD COLUMN college_role TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='mobile_number') THEN
        ALTER TABLE profiles ADD COLUMN mobile_number TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='year_of_study') THEN
        ALTER TABLE profiles ADD COLUMN year_of_study TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='section') THEN
        ALTER TABLE profiles ADD COLUMN section TEXT;
    END IF;
END $$;

-- 3. CIRCULARS TABLE
CREATE TABLE IF NOT EXISTS circulars (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES profiles(id) NOT NULL,
  author_name TEXT NOT NULL,
  department_target TEXT DEFAULT 'ALL',
  target_year TEXT DEFAULT 'ALL',
  target_section TEXT DEFAULT 'ALL',
  priority TEXT DEFAULT 'normal',
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. HELPER FUNCTIONS (To avoid RLS Recursion)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_status(user_id uuid)
RETURNS user_status AS $$
    SELECT status FROM public.profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
    SELECT 
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
        OR 
        auth.email() = 'admin@institution.edu'; -- Master Admin Email (Change as needed)
$$ LANGUAGE sql SECURITY DEFINER;

-- 6. RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE circulars ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON profiles;
CREATE POLICY "Public profiles are viewable by authenticated users" 
ON profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can manage their own profile" ON profiles;
CREATE POLICY "Users can manage their own profile" 
ON profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Splitting Admins to avoid SELECT recursion
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
CREATE POLICY "Admins can insert profiles" 
ON profiles FOR INSERT TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
CREATE POLICY "Admins can update profiles" 
ON profiles FOR UPDATE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
CREATE POLICY "Admins can delete profiles" 
ON profiles FOR DELETE TO authenticated USING (is_admin());

-- 7. PRE-APPROVALS (For Institutional Provisioning)
CREATE TABLE IF NOT EXISTS profile_pre_approvals (
  email TEXT PRIMARY KEY,
  role user_role DEFAULT 'student',
  department TEXT,
  year_of_study TEXT DEFAULT 'ALL',
  section TEXT DEFAULT 'ALL',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure all columns exist for pre-approvals
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profile_pre_approvals' AND column_name='year_of_study') THEN
        ALTER TABLE profile_pre_approvals ADD COLUMN year_of_study TEXT DEFAULT 'ALL';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profile_pre_approvals' AND column_name='section') THEN
        ALTER TABLE profile_pre_approvals ADD COLUMN section TEXT DEFAULT 'ALL';
    END IF;
END $$;

ALTER TABLE profile_pre_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage pre-approvals" ON profile_pre_approvals;
CREATE POLICY "Admins can manage pre-approvals" 
ON profile_pre_approvals FOR ALL TO authenticated 
USING (is_admin());

DROP POLICY IF EXISTS "Anyone can check their own pre-approval" ON profile_pre_approvals;
CREATE POLICY "Anyone can check their own pre-approval" 
ON profile_pre_approvals FOR SELECT TO authenticated 
USING (email = auth.email());

-- Circulars Policies
DROP POLICY IF EXISTS "Circulars are viewable by active users" ON circulars;
CREATE POLICY "Circulars are viewable by active users" 
ON circulars FOR SELECT TO authenticated USING (
  get_user_status(auth.uid()) = 'active'
);

DROP POLICY IF EXISTS "Teachers and Admins can create circulars" ON circulars;
CREATE POLICY "Teachers and Admins can create circulars" 
ON circulars FOR INSERT TO authenticated WITH CHECK (
  get_user_role(auth.uid()) IN ('teacher', 'admin')
);

DROP POLICY IF EXISTS "Authors and Admins can update/delete their circulars" ON circulars;
CREATE POLICY "Authors and Admins can update/delete their circulars" 
ON circulars FOR ALL TO authenticated USING (
  auth.uid() = author_id OR is_admin()
);

-- Audit Logs Policies
DROP POLICY IF EXISTS "Only admins can view audit logs" ON audit_logs;
CREATE POLICY "Only admins can view audit logs" 
ON audit_logs FOR SELECT TO authenticated USING (
  is_admin()
);

DROP POLICY IF EXISTS "Anyone can insert audit logs" ON audit_logs;
CREATE POLICY "Anyone can insert audit logs" 
ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. STORAGE BUCKET POLICIES (for 'attachments' bucket)
-- Run this AFTER creating the 'attachments' bucket in Supabase dashboard:
--   Storage → New bucket → name: attachments → Public: OFF
-- ─────────────────────────────────────────────────────────────────────────────

-- Allow authenticated teachers/admins to upload files
DROP POLICY IF EXISTS "Teachers and Admins can upload attachments" ON storage.objects;
CREATE POLICY "Teachers and Admins can upload attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'attachments'
  AND get_user_role(auth.uid()) IN ('teacher', 'admin')
);

-- Allow anyone authenticated to view/download attachments
DROP POLICY IF EXISTS "Authenticated users can read attachments" ON storage.objects;
CREATE POLICY "Authenticated users can read attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'attachments');

-- Allow uploader (or admin) to delete their own file
DROP POLICY IF EXISTS "Uploader or admin can delete attachments" ON storage.objects;
CREATE POLICY "Uploader or admin can delete attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'attachments'
  AND (owner = auth.uid() OR is_admin())
);
