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

-- Create RLS policies for all tables (with IF NOT EXISTS equivalent)
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

-- Placement personas policies
DROP POLICY IF EXISTS "Users can manage their own personas" ON placement_personas;
CREATE POLICY "Users can manage their own personas" ON placement_personas
    FOR ALL USING (auth.uid() = user_id);

-- Resume analyses policies
DROP POLICY IF EXISTS "Users can manage their own resume analyses" ON resume_analyses;
CREATE POLICY "Users can manage their own resume analyses" ON resume_analyses
    FOR ALL USING (auth.uid() = user_id);

-- Study sessions policies
DROP POLICY IF EXISTS "Users can manage their own study sessions" ON study_sessions;
CREATE POLICY "Users can manage their own study sessions" ON study_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Quiz attempts policies
DROP POLICY IF EXISTS "Users can manage their own quiz attempts" ON quiz_attempts;
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
    'quiz_attempts',
    'code_reviews',
    'coding_analytics'
)
ORDER BY tablename;

-- 9. Create code_reviews table for AI Code Reviewer feature
CREATE TABLE IF NOT EXISTS code_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    original_code TEXT NOT NULL,
    language TEXT NOT NULL CHECK (language IN ('java', 'python', 'cpp', 'javascript', 'typescript', 'c', 'csharp')),
    mode TEXT NOT NULL CHECK (mode IN ('debug', 'explain', 'optimize', 'interview', 'complexity')),
    filename TEXT,
    
    -- AI Analysis Results (stored as JSONB for flexibility)
    corrected_code TEXT,
    analysis_result TEXT, -- Full AI response
    errors_found JSONB DEFAULT '[]'::jsonb,
    optimizations JSONB DEFAULT '[]'::jsonb,
    explanations JSONB DEFAULT '[]'::jsonb,
    interview_feedback JSONB,
    complexity_analysis JSONB,
    
    -- Scoring
    code_quality_score INTEGER DEFAULT 0 CHECK (code_quality_score >= 0 AND code_quality_score <= 100),
    readability_score INTEGER DEFAULT 0 CHECK (readability_score >= 0 AND readability_score <= 100),
    efficiency_score INTEGER DEFAULT 0 CHECK (efficiency_score >= 0 AND efficiency_score <= 100),
    overall_score INTEGER DEFAULT 0 CHECK (overall_score >= 0 AND overall_score <= 100),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    analysis_time_ms BIGINT DEFAULT 0,
    xp_awarded INTEGER DEFAULT 0
);

-- 10. Create coding_analytics table for tracking coding statistics
CREATE TABLE IF NOT EXISTS coding_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    
    -- Statistics
    total_reviews INTEGER DEFAULT 0,
    avg_code_quality DECIMAL(5,2) DEFAULT 0.0,
    languages_used JSONB DEFAULT '[]'::jsonb,
    favorite_language TEXT,
    coding_streak INTEGER DEFAULT 0,
    last_review_date DATE,
    total_xp_earned INTEGER DEFAULT 0,
    errors_fixed INTEGER DEFAULT 0,
    optimizations_applied INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS for new tables
ALTER TABLE code_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE coding_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for new tables
DROP POLICY IF EXISTS "Users can manage their own code reviews" ON code_reviews;
CREATE POLICY "Users can manage their own code reviews" ON code_reviews
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own coding analytics" ON coding_analytics;
CREATE POLICY "Users can manage their own coding analytics" ON coding_analytics
    FOR ALL USING (auth.uid() = user_id);

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_code_reviews_user_id ON code_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_code_reviews_language ON code_reviews(user_id, language);
CREATE INDEX IF NOT EXISTS idx_code_reviews_mode ON code_reviews(user_id, mode);
CREATE INDEX IF NOT EXISTS idx_code_reviews_created ON code_reviews(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_coding_analytics_user_id ON coding_analytics(user_id);

-- Success message
SELECT 'All PrepVerse database tables created successfully! Including AI Code Reviewer feature.' as status;

-- AI Mentor Tables
CREATE TABLE mentor_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    messages JSONB DEFAULT '[]'::jsonb,
    mode TEXT NOT NULL DEFAULT 'career',
    context JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE mentor_recommendations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'daily_tip',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    action_items JSONB DEFAULT '[]'::jsonb,
    priority TEXT NOT NULL DEFAULT 'medium',
    expires_at TIMESTAMP WITH TIME ZONE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE mentor_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total_conversations INTEGER DEFAULT 0,
    favorite_mode TEXT DEFAULT 'career',
    topics_discussed JSONB DEFAULT '[]'::jsonb,
    recommendations_followed INTEGER DEFAULT 0,
    last_interaction TIMESTAMP WITH TIME ZONE,
    engagement_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_mentor_sessions_user_id ON mentor_sessions(user_id);
CREATE INDEX idx_mentor_sessions_updated_at ON mentor_sessions(updated_at);
CREATE INDEX idx_mentor_recommendations_user_id ON mentor_recommendations(user_id);
CREATE INDEX idx_mentor_recommendations_is_read ON mentor_recommendations(is_read);
CREATE INDEX idx_mentor_analytics_user_id ON mentor_analytics(user_id);

-- RLS Policies
ALTER TABLE mentor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_analytics ENABLE ROW LEVEL SECURITY;

-- Mentor Sessions Policies
CREATE POLICY "Users can view own mentor sessions" ON mentor_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mentor sessions" ON mentor_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mentor sessions" ON mentor_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own mentor sessions" ON mentor_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Mentor Recommendations Policies
CREATE POLICY "Users can view own mentor recommendations" ON mentor_recommendations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mentor recommendations" ON mentor_recommendations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mentor recommendations" ON mentor_recommendations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own mentor recommendations" ON mentor_recommendations
    FOR DELETE USING (auth.uid() = user_id);

-- Mentor Analytics Policies
CREATE POLICY "Users can view own mentor analytics" ON mentor_analytics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mentor analytics" ON mentor_analytics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mentor analytics" ON mentor_analytics
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own mentor analytics" ON mentor_analytics
    FOR DELETE USING (auth.uid() = user_id);

-- Function to update mentor analytics
CREATE OR REPLACE FUNCTION update_mentor_analytics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO mentor_analytics (user_id, total_conversations, last_interaction)
    VALUES (NEW.user_id, 1, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        total_conversations = mentor_analytics.total_conversations + 1,
        last_interaction = NOW(),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update analytics
CREATE TRIGGER trigger_update_mentor_analytics
    AFTER INSERT ON mentor_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_mentor_analytics();