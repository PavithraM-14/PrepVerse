-- Safe PrepVerse Database Setup
-- This script safely creates only missing tables and handles existing ones

-- 1. Create tasks table (safe)
CREATE TABLE IF NOT EXISTS tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    is_completed BOOLEAN DEFAULT FALSE,
    due_date TIMESTAMPTZ,
    reminder_time TIMESTAMPTZ,
    notification_sent BOOLEAN DEFAULT FALSE,
    xp_reward INTEGER DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ
);

-- 2. Create coding_problems table (safe)
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

-- 3. Create user_progress table (safe)
CREATE TABLE IF NOT EXISTS user_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    xp_points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    streak_days INTEGER DEFAULT 0,
    last_activity_date TIMESTAMPTZ,
    resume_score INTEGER,
    interview_readiness INTEGER,
    badges JSONB DEFAULT '[]'::jsonb,
    total_tasks_completed INTEGER DEFAULT 0,
    total_study_hours INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Create notifications table (safe)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. Create resume_analyses table (safe)
CREATE TABLE IF NOT EXISTS resume_analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT,
    file_url TEXT,
    file_size INTEGER,
    analysis_mode TEXT DEFAULT 'hr',
    overall_score INTEGER,
    ats_score INTEGER,
    suggestions TEXT[],
    strengths TEXT[],
    improvements TEXT[],
    roast_content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS (safe - won't error if already enabled)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE coding_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_analyses ENABLE ROW LEVEL SECURITY;

-- Safely recreate policies (drop first, then create)
DO $$ 
BEGIN
    -- Tasks policies
    DROP POLICY IF EXISTS "Users can manage their own tasks" ON tasks;
    CREATE POLICY "Users can manage their own tasks" ON tasks
        FOR ALL USING (auth.uid() = user_id);
    
    -- Coding problems policies
    DROP POLICY IF EXISTS "Users can manage their own coding problems" ON coding_problems;
    CREATE POLICY "Users can manage their own coding problems" ON coding_problems
        FOR ALL USING (auth.uid() = user_id);
    
    -- User progress policies
    DROP POLICY IF EXISTS "Users can manage their own progress" ON user_progress;
    CREATE POLICY "Users can manage their own progress" ON user_progress
        FOR ALL USING (auth.uid() = user_id);
    
    -- Notifications policies
    DROP POLICY IF EXISTS "Users can manage their own notifications" ON notifications;
    CREATE POLICY "Users can manage their own notifications" ON notifications
        FOR ALL USING (auth.uid() = user_id);
        
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Some policies may already exist - continuing...';
END $$;

-- Create essential indexes (safe)
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(user_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_tasks_reminder ON tasks(user_id, reminder_time) WHERE reminder_time IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_coding_problems_user_id ON coding_problems(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- Create or replace XP function (safe)
CREATE OR REPLACE FUNCTION increment_xp(p_user_id UUID, p_amount INTEGER)
RETURNS void AS $$
BEGIN
    INSERT INTO user_progress (user_id, xp_points, level)
    VALUES (p_user_id, p_amount, 1)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        xp_points = user_progress.xp_points + p_amount,
        level = GREATEST(1, (user_progress.xp_points + p_amount) / 500 + 1),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify essential tables exist
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') 
        THEN '✅ tasks table ready'
        ELSE '❌ tasks table missing'
    END as tasks_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coding_problems') 
        THEN '✅ coding_problems table ready'
        ELSE '❌ coding_problems table missing'
    END as coding_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_progress') 
        THEN '✅ user_progress table ready'
        ELSE '❌ user_progress table missing'
    END as progress_status;

-- Success message
SELECT '🎉 PrepVerse database setup completed successfully!' as final_status;