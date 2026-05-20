-- PrepVerse Database Setup
-- Run this in your Supabase SQL Editor if tables are missing

-- Create coding_problems table if it doesn't exist
CREATE TABLE IF NOT EXISTS coding_problems (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    problem_name TEXT NOT NULL,
    platform TEXT,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    topic TEXT,
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'solved')),
    notes TEXT,
    solved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS (Row Level Security)
ALTER TABLE coding_problems ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own problems
CREATE POLICY "Users can manage their own coding problems" ON coding_problems
    FOR ALL USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_coding_problems_user_id ON coding_problems(user_id);
CREATE INDEX IF NOT EXISTS idx_coding_problems_status ON coding_problems(user_id, status);

-- Verify table exists
SELECT 'coding_problems table created successfully' as status;