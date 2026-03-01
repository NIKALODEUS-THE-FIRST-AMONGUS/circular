-- Add title column to profiles table for Mr/Mrs/Ms/Dr etc.
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='profiles' AND column_name='title'
    ) THEN
        ALTER TABLE profiles ADD COLUMN title TEXT;
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN profiles.title IS 'Honorific title (Mr, Mrs, Ms, Dr, Prof, etc.)';
