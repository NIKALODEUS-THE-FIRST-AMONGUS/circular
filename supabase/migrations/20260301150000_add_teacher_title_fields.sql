-- ============================================
-- Add Enhanced Title Fields for Teachers/Professors
-- ============================================

-- Add new columns for teacher/professor titles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS gender_title TEXT CHECK (gender_title IN ('Mr', 'Mrs', 'Ms', 'Dr')),
ADD COLUMN IF NOT EXISTS academic_title TEXT CHECK (academic_title IN ('Prof', 'Asst Prof', 'Assoc Prof', 'HOD', 'Principal', 'Dean')),
ADD COLUMN IF NOT EXISTS subject_taught TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_gender_title ON profiles(gender_title);
CREATE INDEX IF NOT EXISTS idx_profiles_academic_title ON profiles(academic_title);

-- Add comment for documentation
COMMENT ON COLUMN profiles.gender_title IS 'Gender-based title: Mr, Mrs, Ms, Dr';
COMMENT ON COLUMN profiles.academic_title IS 'Academic position: Prof, Asst Prof, Assoc Prof, HOD, Principal, Dean';
COMMENT ON COLUMN profiles.subject_taught IS 'Subject/Department taught by teacher/professor';

-- Update existing title column comment
COMMENT ON COLUMN profiles.title IS 'Legacy title field - use gender_title and academic_title instead';

-- ============================================
-- Helper Function: Get Full Display Title
-- ============================================

CREATE OR REPLACE FUNCTION get_full_title(
    p_gender_title TEXT,
    p_academic_title TEXT
) RETURNS TEXT AS $$
BEGIN
    -- Combine titles intelligently
    IF p_academic_title IS NOT NULL AND p_gender_title IS NOT NULL THEN
        -- For professors: "Prof. Dr. Name" or "HOD Mr. Name"
        RETURN p_academic_title || '. ' || p_gender_title;
    ELSIF p_academic_title IS NOT NULL THEN
        -- Academic title only: "Prof. Name"
        RETURN p_academic_title;
    ELSIF p_gender_title IS NOT NULL THEN
        -- Gender title only: "Mr. Name"
        RETURN p_gender_title;
    ELSE
        -- No title
        RETURN NULL;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- Migration: Convert existing title data
-- ============================================

-- Migrate existing 'title' column data to new structure
DO $$
BEGIN
    -- Convert Mr/Mrs/Ms to gender_title
    UPDATE profiles 
    SET gender_title = title 
    WHERE title IN ('Mr', 'Mrs', 'Ms', 'Dr') 
    AND gender_title IS NULL;
    
    -- Convert Prof/HOD to academic_title
    UPDATE profiles 
    SET academic_title = title 
    WHERE title IN ('Prof', 'HOD', 'Principal', 'Dean') 
    AND academic_title IS NULL;
    
    -- Log migration
    RAISE NOTICE 'Migrated existing title data to new structure';
END $$;

-- ============================================
-- View: Enhanced Profile Display
-- ============================================

CREATE OR REPLACE VIEW profile_display AS
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.gender_title,
    p.academic_title,
    p.subject_taught,
    p.department,
    p.class_branch,
    p.college_role,
    -- Computed full title
    get_full_title(p.gender_title, p.academic_title) as display_title,
    -- Full display name with title
    CASE 
        WHEN get_full_title(p.gender_title, p.academic_title) IS NOT NULL 
        THEN get_full_title(p.gender_title, p.academic_title) || '. ' || p.full_name
        ELSE p.full_name
    END as full_display_name,
    -- Subject info for teachers
    CASE 
        WHEN p.role = 'teacher' AND p.subject_taught IS NOT NULL 
        THEN p.subject_taught || ' - ' || COALESCE(p.department, 'General')
        ELSE p.department
    END as teaching_info,
    p.status,
    p.created_at,
    p.updated_at
FROM profiles p;

-- Grant access to view
GRANT SELECT ON profile_display TO authenticated;

-- ============================================
-- Example Usage
-- ============================================

-- Example 1: Professor with Dr. title
-- gender_title: 'Dr'
-- academic_title: 'Prof'
-- full_name: 'Rajesh Kumar'
-- Result: "Prof. Dr. Rajesh Kumar"

-- Example 2: HOD with Mr. title
-- gender_title: 'Mr'
-- academic_title: 'HOD'
-- full_name: 'Suresh Reddy'
-- subject_taught: 'Computer Science'
-- Result: "HOD Mr. Suresh Reddy - Computer Science"

-- Example 3: Teacher with Mrs. title
-- gender_title: 'Mrs'
-- academic_title: NULL
-- full_name: 'Priya Sharma'
-- subject_taught: 'Mathematics'
-- Result: "Mrs. Priya Sharma - Mathematics"

-- Example 4: Student (no titles)
-- gender_title: NULL
-- academic_title: NULL
-- full_name: 'Amit Patel'
-- Result: "Amit Patel"
