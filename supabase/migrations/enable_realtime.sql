-- Enable Realtime for circulars table
-- This ensures real-time updates work for INSERT, UPDATE, DELETE events

-- Enable publication for circulars table
ALTER PUBLICATION supabase_realtime ADD TABLE circulars;

-- Ensure the table has REPLICA IDENTITY set
-- This is required for UPDATE and DELETE events to work
ALTER TABLE circulars REPLICA IDENTITY FULL;

-- Enable realtime for profiles table as well (for user status updates)
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER TABLE profiles REPLICA IDENTITY FULL;

-- Verify realtime is enabled
DO $$
BEGIN
    RAISE NOTICE 'Realtime enabled for circulars and profiles tables';
END $$;
