
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User roles enum
CREATE TYPE public.user_role AS ENUM ('user', 'admin');

-- Profiles table (synced from auth.users)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  phone text,
  role public.user_role NOT NULL DEFAULT 'user',
  username text,
  avatar_url text,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger to auto-sync new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone, role)
  VALUES (NEW.id, NEW.email, NEW.phone, 'user'::public.user_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role(uid uuid)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = uid;
$$;

-- AI Placement Personas
CREATE TABLE public.placement_personas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dream_company text,
  current_skill_level text,
  preferred_role text,
  weak_subjects text[],
  confidence_level integer DEFAULT 5,
  placement_timeline text,
  roadmap jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Daily tasks
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text DEFAULT 'general',
  is_completed boolean NOT NULL DEFAULT false,
  due_date date,
  xp_reward integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Study sessions
CREATE TABLE public.study_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  mood text,
  hours_studied numeric(4,2) DEFAULT 0,
  topics text[],
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- User progress / gamification
CREATE TABLE public.user_progress (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  xp_points integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  streak_days integer NOT NULL DEFAULT 0,
  last_activity_date date,
  resume_score integer DEFAULT 0,
  interview_readiness integer DEFAULT 0,
  badges jsonb NOT NULL DEFAULT '[]',
  total_tasks_completed integer NOT NULL DEFAULT 0,
  total_study_hours numeric(8,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Resume analyses
CREATE TABLE public.resume_analyses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name text,
  ats_score integer,
  analysis_mode text DEFAULT 'mentor',
  analysis_result jsonb,
  raw_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Interview sessions
CREATE TABLE public.interview_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  interview_type text NOT NULL,
  messages jsonb NOT NULL DEFAULT '[]',
  feedback jsonb,
  confidence_score integer,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Coding problems tracker
CREATE TABLE public.coding_tracker (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  problem_name text NOT NULL,
  platform text,
  difficulty text,
  topic text,
  status text NOT NULL DEFAULT 'todo',
  notes text,
  solved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Quiz attempts
CREATE TABLE public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quiz_type text NOT NULL,
  topic text,
  difficulty text,
  score integer,
  total_questions integer,
  answers jsonb,
  xp_earned integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Community posts
CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  post_type text NOT NULL DEFAULT 'progress',
  likes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Admins have full access to profiles" ON profiles
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::user_role);

CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id)
  WITH CHECK (role IS NOT DISTINCT FROM get_user_role(auth.uid()));

-- Placement personas policies
CREATE POLICY "Users manage own personas" ON placement_personas
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Tasks policies
CREATE POLICY "Users manage own tasks" ON tasks
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Study sessions policies
CREATE POLICY "Users manage own sessions" ON study_sessions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- User progress policies
CREATE POLICY "Users manage own progress" ON user_progress
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all progress for leaderboard" ON user_progress
  FOR SELECT TO authenticated USING (true);

-- Resume analyses policies
CREATE POLICY "Users manage own analyses" ON resume_analyses
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Interview sessions policies
CREATE POLICY "Users manage own interviews" ON interview_sessions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Coding tracker policies
CREATE POLICY "Users manage own coding" ON coding_tracker
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Quiz attempts policies
CREATE POLICY "Users manage own quizzes" ON quiz_attempts
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users manage own notifications" ON notifications
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Community posts policies
CREATE POLICY "Anyone authenticated can view posts" ON community_posts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users manage own posts" ON community_posts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own posts" ON community_posts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users delete own posts" ON community_posts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Public profiles view
CREATE VIEW public_profiles AS
  SELECT id, username, full_name, avatar_url, role FROM profiles;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER personas_updated_at BEFORE UPDATE ON placement_personas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER progress_updated_at BEFORE UPDATE ON user_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable realtime for leaderboard
ALTER PUBLICATION supabase_realtime ADD TABLE user_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
