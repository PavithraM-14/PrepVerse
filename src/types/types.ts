// PrepVerse — Database types matching Supabase schema

export type UserRole = 'user' | 'admin';

export interface Profile {
  id: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  username: string | null;
  avatar_url: string | null;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlacementPersona {
  id: string;
  user_id: string;
  dream_company: string | null;
  current_skill_level: string | null;
  preferred_role: string | null;
  weak_subjects: string[] | null;
  confidence_level: number | null;
  placement_timeline: string | null;
  roadmap: RoadmapData | null;
  created_at: string;
  updated_at: string;
}

export interface RoadmapData {
  phases: RoadmapPhase[];
  daily_tasks: string[];
  weekly_goals: string[];
  recommendations: string[];
}

export interface RoadmapPhase {
  week: number;
  title: string;
  tasks: string[];
  focus: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  is_completed: boolean;
  due_date: string | null;
  reminder_time: string | null;
  notification_sent: boolean;
  xp_reward: number;
  created_at: string;
  completed_at: string | null;
}

export interface StudySession {
  id: string;
  user_id: string;
  date: string;
  mood: string | null;
  hours_studied: number;
  topics: string[] | null;
  notes: string | null;
  created_at: string;
}

export interface UserProgress {
  id: string;
  user_id: string;
  xp_points: number;
  level: number;
  streak_days: number;
  last_activity_date: string | null;
  resume_score: number | null;
  interview_readiness: number | null;
  badges: Badge[];
  total_tasks_completed: number;
  total_study_hours: number;
  created_at: string;
  updated_at: string;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  earned_at: string;
  description: string;
}

export interface ResumeAnalysis {
  id: string;
  user_id: string;
  file_name: string | null;
  file_url: string | null;
  file_size: number | null;
  ats_score: number | null;
  analysis_mode: string;
  analysis_result: ResumeAnalysisResult | null;
  raw_text: string | null;
  created_at: string;
}

export interface ResumeAnalysisResult {
  overall_score: number;
  ats_score: number;
  grammar_score: number;
  keyword_score: number;
  recruiter_impression: string;
  strengths: string[];
  weaknesses: string[];
  missing_skills: string[];
  grammar_issues: string[];
  formatting_feedback: string[];
  suggestions: string[];
  roast?: string;
  feedback: string;
}

export interface InterviewSession {
  id: string;
  user_id: string;
  interview_type: string;
  messages: InterviewMessage[];
  feedback: InterviewFeedback | null;
  confidence_score: number | null;
  status: string;
  created_at: string;
  completed_at: string | null;
}

export interface InterviewMessage {
  role: 'interviewer' | 'candidate';
  content: string;
  timestamp: string;
}

export interface InterviewFeedback {
  overall_score: number;
  confidence_score: number;
  communication_score: number;
  technical_score: number;
  strengths: string[];
  improvements: string[];
  summary: string;
}

export interface CodingProblem {
  id: string;
  user_id: string;
  problem_name: string;
  platform: string | null;
  difficulty: string;
  topic: string | null;
  status: 'todo' | 'in_progress' | 'solved';
  notes: string | null;
  solved_at: string | null;
  created_at: string;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  quiz_type: string;
  topic: string | null;
  difficulty: string | null;
  score: number | null;
  total_questions: number | null;
  answers: QuizAnswer[] | null;
  xp_earned: number;
  created_at: string;
}

export interface QuizAnswer {
  question: string;
  options: string[];
  selected: number;
  correct: number;
  explanation: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'reminder' | 'achievement';
  is_read: boolean;
  created_at: string;
}

export interface CommunityPost {
  id: string;
  user_id: string;
  content: string;
  post_type: string;
  likes: number;
  created_at: string;
  profile?: Profile;
}

export type Mood = 'motivated' | 'stressed' | 'tired' | 'productive';
export type InterviewType = 'hr' | 'technical' | 'behavioral' | 'coding';
export type AnalysisMode = 'roast' | 'hr' | 'mentor';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';
