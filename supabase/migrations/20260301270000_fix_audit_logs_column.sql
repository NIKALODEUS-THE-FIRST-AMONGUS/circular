-- Fix audit_logs table to have actor_id column
ALTER TABLE audit_logs 
ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES auth.users(id);

-- Make sure the table has all necessary columns
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='actor_id') THEN
        ALTER TABLE audit_logs ADD COLUMN actor_id UUID REFERENCES auth.users(id);
    END IF;
END $$;
