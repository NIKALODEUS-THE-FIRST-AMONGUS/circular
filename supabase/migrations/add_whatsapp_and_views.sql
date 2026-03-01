-- Add WhatsApp number and bio fields to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Create circular_views table for tracking who viewed circulars
CREATE TABLE IF NOT EXISTS circular_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circular_id UUID NOT NULL REFERENCES circulars(id) ON DELETE CASCADE,
    viewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(circular_id, viewer_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_circular_views_circular_id 
ON circular_views(circular_id);

CREATE INDEX IF NOT EXISTS idx_circular_views_viewer_id 
ON circular_views(viewer_id);

CREATE INDEX IF NOT EXISTS idx_circular_views_viewed_at 
ON circular_views(viewed_at DESC);

-- Enable RLS
ALTER TABLE circular_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for circular_views
CREATE POLICY "Users can view circular views" 
ON circular_views FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own views" 
ON circular_views FOR INSERT 
WITH CHECK (auth.uid() = viewer_id);

-- Add comment
COMMENT ON TABLE circular_views IS 'Tracks which users have viewed which circulars - WhatsApp-like read receipts';
