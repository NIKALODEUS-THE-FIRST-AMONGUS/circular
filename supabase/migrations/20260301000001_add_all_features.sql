-- ============================================
-- FEATURE 1-4: Read Status, Bookmarks, Comments
-- ============================================

-- Table: circular_reads (track read/unread status)
CREATE TABLE IF NOT EXISTS circular_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circular_id UUID NOT NULL REFERENCES circulars(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(circular_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_circular_reads_user ON circular_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_circular_reads_circular ON circular_reads(circular_id);

-- Table: circular_bookmarks (favorites)
CREATE TABLE IF NOT EXISTS circular_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circular_id UUID NOT NULL REFERENCES circulars(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(circular_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_circular_bookmarks_user ON circular_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_circular_bookmarks_circular ON circular_bookmarks(circular_id);

-- Table: circular_comments (feedback system)
CREATE TABLE IF NOT EXISTS circular_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circular_id UUID NOT NULL REFERENCES circulars(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_circular_comments_circular ON circular_comments(circular_id);
CREATE INDEX IF NOT EXISTS idx_circular_comments_user ON circular_comments(user_id);

-- Table: circular_acknowledgments (receipt tracking)
CREATE TABLE IF NOT EXISTS circular_acknowledgments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circular_id UUID NOT NULL REFERENCES circulars(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    acknowledged_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(circular_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_circular_acknowledgments_circular ON circular_acknowledgments(circular_id);
CREATE INDEX IF NOT EXISTS idx_circular_acknowledgments_user ON circular_acknowledgments(user_id);

-- ============================================
-- FEATURE 9: Draft System
-- ============================================

-- Add draft status to circulars table
ALTER TABLE circulars ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT false;
ALTER TABLE circulars ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- ============================================
-- FEATURE 10: Scheduled Publishing
-- ============================================

-- Add scheduled publishing fields
ALTER TABLE circulars ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;
ALTER TABLE circulars ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE circulars ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT; -- 'daily', 'weekly', 'monthly'

-- ============================================
-- FEATURE 8: Acknowledgment Requirements
-- ============================================

-- Add acknowledgment requirement fields
ALTER TABLE circulars ADD COLUMN IF NOT EXISTS requires_acknowledgment BOOLEAN DEFAULT false;
ALTER TABLE circulars ADD COLUMN IF NOT EXISTS acknowledgment_deadline TIMESTAMPTZ;

-- ============================================
-- FEATURE 12: Archive System
-- ============================================

-- Add archive status
ALTER TABLE circulars ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE circulars ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE circular_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE circular_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE circular_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE circular_acknowledgments ENABLE ROW LEVEL SECURITY;

-- Policies for circular_reads
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'circular_reads' AND policyname = 'Users can manage their own reads') THEN
        CREATE POLICY "Users can manage their own reads" ON circular_reads FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Policies for circular_bookmarks
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'circular_bookmarks' AND policyname = 'Users can manage their own bookmarks') THEN
        CREATE POLICY "Users can manage their own bookmarks" ON circular_bookmarks FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Policies for circular_comments
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'circular_comments' AND policyname = 'Anyone can read comments') THEN
        CREATE POLICY "Anyone can read comments" ON circular_comments FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'circular_comments' AND policyname = 'Authenticated users can create comments') THEN
        CREATE POLICY "Authenticated users can create comments" ON circular_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'circular_comments' AND policyname = 'Users can update their own comments') THEN
        CREATE POLICY "Users can update their own comments" ON circular_comments FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'circular_comments' AND policyname = 'Users can delete their own comments') THEN
        CREATE POLICY "Users can delete their own comments" ON circular_comments FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Policies for circular_acknowledgments
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'circular_acknowledgments' AND policyname = 'Users can manage their own acknowledgments') THEN
        CREATE POLICY "Users can manage their own acknowledgments" ON circular_acknowledgments FOR ALL USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'circular_acknowledgments' AND policyname = 'Teachers can view all acknowledgments') THEN
        CREATE POLICY "Teachers can view all acknowledgments" ON circular_acknowledgments FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role IN ('teacher', 'admin')
            )
        );
    END IF;
END $$;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to auto-publish scheduled circulars
CREATE OR REPLACE FUNCTION publish_scheduled_circulars()
RETURNS void AS $$
BEGIN
    UPDATE circulars
    SET is_draft = false,
        published_at = NOW(),
        status = 'published'
    WHERE is_draft = true
    AND scheduled_for IS NOT NULL
    AND scheduled_for <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread count for a user
CREATE OR REPLACE FUNCTION get_unread_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO unread_count
    FROM circulars c
    WHERE c.is_draft = false
    AND c.is_archived = false
    AND NOT EXISTS (
        SELECT 1 FROM circular_reads cr
        WHERE cr.circular_id = c.id
        AND cr.user_id = p_user_id
    );
    
    RETURN unread_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark circular as read
CREATE OR REPLACE FUNCTION mark_circular_read(p_circular_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO circular_reads (circular_id, user_id)
    VALUES (p_circular_id, p_user_id)
    ON CONFLICT (circular_id, user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
