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
  description?: string | null;
  category: string;
  is_completed: boolean;
  due_date?: string | null;
  reminder_time?: string | null;
  notification_sent?: boolean;
  xp_reward: number;
  created_at: string;
  completed_at?: string | null;
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
  confidence_score?: number;
  communication_score?: number;
  technical_score?: number;
  voice_analysis?: {
    pace_score: number;
    clarity_score: number;
    volume_score: number;
    confidence_score: number;
  };
  behavioral_analysis?: {
    eye_contact_score: number;
    professionalism_score: number;
    response_timing_score: number;
    composure_score: number;
  };
  coding_analysis?: {
    problem_solving_score: number;
    code_quality_score: number;
    algorithm_efficiency_score: number;
    completion_rate: number;
  };
  strengths: string[];
  improvements: string[];
  voice_feedback?: string[];
  behavioral_feedback?: string[];
  coding_feedback?: string[];
  interview_readiness?: number;
  interview_duration?: number;
  session_recording?: Blob;
  conversation_transcript?: InterviewMessage[];
  behavioral_metrics?: any;
  interviewer_info?: any;
  personalized_roadmap?: string[];
  next_steps?: string[];
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

// AI Mentor Types
export type MentorMode = 'career' | 'coding' | 'interview' | 'productivity' | 'motivation';

export interface MentorMessage {
  id: string;
  role: 'user' | 'mentor';
  content: string;
  timestamp: string;
  mode?: MentorMode;
  suggestions?: string[];
}

export interface MentorSession {
  id: string;
  user_id: string;
  messages: MentorMessage[];
  mode: MentorMode;
  context: MentorContext;
  created_at: string;
  updated_at: string;
}

export interface MentorContext {
  user_profile?: {
    dream_company?: string;
    skill_level?: string;
    weak_subjects?: string[];
    current_goals?: string[];
  };
  recent_activity?: {
    coding_sessions?: number;
    interview_attempts?: number;
    study_streak?: number;
    last_resume_score?: number;
  };
  conversation_history?: {
    recent_topics?: string[];
    preferred_mode?: MentorMode;
    interaction_count?: number;
  };
}

export interface MentorRecommendation {
  id: string;
  user_id: string;
  type: 'daily_tip' | 'study_plan' | 'coding_challenge' | 'interview_prep' | 'motivation';
  title: string;
  content: string;
  action_items: string[];
  priority: 'low' | 'medium' | 'high';
  expires_at?: string;
  is_read: boolean;
  created_at: string;
}

export interface MentorAnalytics {
  user_id: string;
  total_conversations: number;
  favorite_mode: MentorMode;
  topics_discussed: string[];
  recommendations_followed: number;
  last_interaction: string;
  engagement_score: number;
}

// AI Code Review Types
export type ProgrammingLanguage = 'java' | 'python' | 'cpp' | 'javascript' | 'typescript' | 'c' | 'csharp';

export type CodeReviewMode = 'debug' | 'explain' | 'optimize' | 'interview' | 'complexity';

export interface CodeReviewRequest {
  code: string;
  language: ProgrammingLanguage;
  mode: CodeReviewMode;
  filename?: string;
}

export interface CodeReviewResult {
  id: string;
  user_id: string;
  original_code: string;
  language: ProgrammingLanguage;
  mode: CodeReviewMode;
  filename?: string;
  
  // AI Analysis Results
  corrected_code?: string;
  errors_found: CodeError[];
  optimizations: CodeOptimization[];
  explanations: CodeExplanation[];
  interview_feedback?: InterviewFeedback;
  complexity_analysis?: ComplexityAnalysis;
  
  // Scoring
  code_quality_score: number;
  readability_score: number;
  efficiency_score: number;
  overall_score: number;
  
  // Metadata
  created_at: string;
  analysis_time_ms: number;
  xp_awarded: number;
}

export interface CodeError {
  line: number;
  column?: number;
  type: 'syntax' | 'logic' | 'runtime' | 'style';
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
  code_snippet?: string;
}

export interface CodeOptimization {
  type: 'performance' | 'memory' | 'readability' | 'best_practice';
  title: string;
  description: string;
  before_code?: string;
  after_code?: string;
  impact: 'high' | 'medium' | 'low';
}

export interface CodeExplanation {
  section: string;
  line_start: number;
  line_end: number;
  explanation: string;
  concepts: string[];
}

export interface ComplexityAnalysis {
  time_complexity: string;
  space_complexity: string;
  time_explanation: string;
  space_explanation: string;
  can_optimize: boolean;
  optimization_suggestions?: string[];
}

export interface CodingAnalytics {
  user_id: string;
  total_reviews: number;
  avg_code_quality: number;
  languages_used: ProgrammingLanguage[];
  favorite_language: ProgrammingLanguage;
  coding_streak: number;
  last_review_date: string;
  total_xp_earned: number;
  errors_fixed: number;
  optimizations_applied: number;
}
