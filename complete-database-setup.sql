-- Complete PrepVerse Database Setup
-- Run this in your Supabase SQL Editor to create all missing tables

-- 1. Create tasks table
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

-- 2. Create coding_problems table
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

-- 3. Create user_progress table
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

-- 4. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. Create placement_personas table
CREATE TABLE IF NOT EXISTS placement_personas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    dream_company TEXT,
    current_skill_level TEXT,
    preferred_role TEXT,
    weak_subjects TEXT[],
    confidence_level INTEGER,
    placement_timeline TEXT,
    roadmap JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. Create resume_analyses table
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

-- 7. Create study_sessions table
CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    mood TEXT,
    hours_studied DECIMAL(4,2) DEFAULT 0,
    topics TEXT[],
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 8. Create quiz_attempts table
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    quiz_type TEXT NOT NULL,
    topic TEXT,
    difficulty TEXT,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    xp_earned INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE coding_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for all tables
-- Tasks policies
CREATE POLICY "Users can manage their own tasks" ON tasks
    FOR ALL USING (auth.uid() = user_id);

-- Coding problems policies
CREATE POLICY "Users can manage their own coding problems" ON coding_problems
    FOR ALL USING (auth.uid() = user_id);

-- User progress policies
CREATE POLICY "Users can manage their own progress" ON user_progress
    FOR ALL USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can manage their own notifications" ON notifications
    FOR ALL USING (auth.uid() = user_id);

-- Placement personas policies
CREATE POLICY "Users can manage their own personas" ON placement_personas
    FOR ALL USING (auth.uid() = user_id);

-- Resume analyses policies
CREATE POLICY "Users can manage their own resume analyses" ON resume_analyses
    FOR ALL USING (auth.uid() = user_id);

-- Study sessions policies
CREATE POLICY "Users can manage their own study sessions" ON study_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Quiz attempts policies
CREATE POLICY "Users can manage their own quiz attempts" ON quiz_attempts
    FOR ALL USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(user_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_tasks_reminder ON tasks(user_id, reminder_time) WHERE reminder_time IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_coding_problems_user_id ON coding_problems(user_id);
CREATE INDEX IF NOT EXISTS idx_coding_problems_status ON coding_problems(user_id, status);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_placement_personas_user_id ON placement_personas(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_analyses_user_id ON resume_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id);

-- Create XP increment function
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

-- Verify tables were created
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'tasks', 
    'coding_problems', 
    'user_progress', 
    'notifications', 
    'placement_personas', 
    'resume_analyses', 
    'study_sessions', 
    'quiz_attempts'
)
ORDER BY tablename;

-- Success message
SELECT 'All PrepVerse database tables created successfully!' as status;