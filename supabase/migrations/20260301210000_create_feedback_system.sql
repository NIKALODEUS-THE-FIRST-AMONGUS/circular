-- ============================================
-- Feedback System with Anonymous Reporting
-- ============================================

-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT,
    user_email TEXT,
    type TEXT NOT NULL CHECK (type IN ('bug', 'improvement', 'feature', 'other')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT CHECK (category IN ('ui', 'performance', 'functionality', 'security', 'other')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'in_progress', 'resolved', 'rejected')),
    is_anonymous BOOLEAN DEFAULT false,
    has_profanity BOOLEAN DEFAULT false,
    profanity_severity TEXT CHECK (profanity_severity IN ('none', 'low', 'medium', 'high')),
    admin_notes TEXT,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    upvotes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create feedback_votes table for upvoting
CREATE TABLE IF NOT EXISTS feedback_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id UUID REFERENCES feedback(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(feedback_id, user_id)
);

-- Create feedback_comments table for admin responses
CREATE TABLE IF NOT EXISTS feedback_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id UUID REFERENCES feedback(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT,
    comment TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(type);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_priority ON feedback(priority);
CREATE INDEX IF NOT EXISTS idx_feedback_votes_feedback ON feedback_votes(feedback_id);
CREATE INDEX IF NOT EXISTS idx_feedback_comments_feedback ON feedback_comments(feedback_id);

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_comments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for feedback
-- ============================================

-- Users can view all feedback (but user_id is hidden for anonymous)
DROP POLICY IF EXISTS "Users can view all feedback" ON feedback;
CREATE POLICY "Users can view all feedback"
ON feedback FOR SELECT
TO authenticated
USING (true);

-- Users can insert their own feedback
DROP POLICY IF EXISTS "Users can insert feedback" ON feedback;
CREATE POLICY "Users can insert feedback"
ON feedback FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own feedback (only if pending)
DROP POLICY IF EXISTS "Users can update own pending feedback" ON feedback;
CREATE POLICY "Users can update own pending feedback"
ON feedback FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Admins can update any feedback
DROP POLICY IF EXISTS "Admins can update any feedback" ON feedback;
CREATE POLICY "Admins can update any feedback"
ON feedback FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Admins can delete feedback
DROP POLICY IF EXISTS "Admins can delete feedback" ON feedback;
CREATE POLICY "Admins can delete feedback"
ON feedback FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- ============================================
-- RLS Policies for feedback_votes
-- ============================================

-- Users can view all votes
DROP POLICY IF EXISTS "Users can view votes" ON feedback_votes;
CREATE POLICY "Users can view votes"
ON feedback_votes FOR SELECT
TO authenticated
USING (true);

-- Users can insert their own votes
DROP POLICY IF EXISTS "Users can vote" ON feedback_votes;
CREATE POLICY "Users can vote"
ON feedback_votes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own votes
DROP POLICY IF EXISTS "Users can remove vote" ON feedback_votes;
CREATE POLICY "Users can remove vote"
ON feedback_votes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- RLS Policies for feedback_comments
-- ============================================

-- Users can view all comments
DROP POLICY IF EXISTS "Users can view comments" ON feedback_comments;
CREATE POLICY "Users can view comments"
ON feedback_comments FOR SELECT
TO authenticated
USING (true);

-- Users can insert comments on their own feedback
DROP POLICY IF EXISTS "Users can comment on own feedback" ON feedback_comments;
CREATE POLICY "Users can comment on own feedback"
ON feedback_comments FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
        SELECT 1 FROM feedback
        WHERE id = feedback_id AND user_id = auth.uid()
    )
);

-- Admins can insert comments on any feedback
DROP POLICY IF EXISTS "Admins can comment on any feedback" ON feedback_comments;
CREATE POLICY "Admins can comment on any feedback"
ON feedback_comments FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- ============================================
-- Functions
-- ============================================

-- Function to update upvote count
CREATE OR REPLACE FUNCTION update_feedback_upvotes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE feedback
        SET upvotes = upvotes + 1
        WHERE id = NEW.feedback_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE feedback
        SET upvotes = upvotes - 1
        WHERE id = OLD.feedback_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for upvote count
DROP TRIGGER IF EXISTS trigger_update_feedback_upvotes ON feedback_votes;
CREATE TRIGGER trigger_update_feedback_upvotes
AFTER INSERT OR DELETE ON feedback_votes
FOR EACH ROW
EXECUTE FUNCTION update_feedback_upvotes();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feedback_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_feedback_timestamp ON feedback;
CREATE TRIGGER trigger_update_feedback_timestamp
BEFORE UPDATE ON feedback
FOR EACH ROW
EXECUTE FUNCTION update_feedback_timestamp();

-- ============================================
-- Views for Analytics
-- ============================================

-- View for feedback statistics
CREATE OR REPLACE VIEW feedback_stats AS
SELECT
    COUNT(*) as total_feedback,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
    COUNT(*) FILTER (WHERE type = 'bug') as bug_count,
    COUNT(*) FILTER (WHERE type = 'improvement') as improvement_count,
    COUNT(*) FILTER (WHERE type = 'feature') as feature_count,
    COUNT(*) FILTER (WHERE has_profanity = true) as profanity_count,
    COUNT(*) FILTER (WHERE is_anonymous = true) as anonymous_count,
    AVG(upvotes) as avg_upvotes
FROM feedback;

-- Grant access
GRANT SELECT ON feedback_stats TO authenticated;

-- ============================================
-- Sample Data (Optional)
-- ============================================

-- Insert sample feedback categories
COMMENT ON COLUMN feedback.type IS 'Type of feedback: bug, improvement, feature, other';
COMMENT ON COLUMN feedback.category IS 'Category: ui, performance, functionality, security, other';
COMMENT ON COLUMN feedback.priority IS 'Priority level: low, medium, high, critical';
COMMENT ON COLUMN feedback.status IS 'Status: pending, reviewing, in_progress, resolved, rejected';
COMMENT ON COLUMN feedback.is_anonymous IS 'Whether the feedback is submitted anonymously';
COMMENT ON COLUMN feedback.has_profanity IS 'Whether the feedback contains profanity';
COMMENT ON COLUMN feedback.profanity_severity IS 'Severity of profanity: none, low, medium, high';
