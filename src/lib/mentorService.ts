import { streamGemini, type GeminiMessage } from '@/lib/sse';
import type { MentorMode, MentorContext, MentorMessage } from '@/types/types';

interface MentorPersonality {
  name: string;
  role: string;
  personality: string;
  expertise: string[];
  tone: string;
}

const mentorPersonalities: Record<MentorMode, MentorPersonality> = {
  career: {
    name: "Alex Chen",
    role: "Senior Career Strategist",
    personality: "Professional, insightful, and forward-thinking. Provides strategic career advice with industry insights.",
    expertise: ["Career planning", "Industry trends", "Job market analysis", "Professional development", "Company research"],
    tone: "Professional yet approachable, data-driven with practical advice"
  },
  coding: {
    name: "Jordan Kim",
    role: "Senior Software Engineer",
    personality: "Patient, methodical, and encouraging. Breaks down complex concepts into digestible parts.",
    expertise: ["Data structures", "Algorithms", "System design", "Code optimization", "Debugging", "Best practices"],
    tone: "Patient and educational, uses analogies and examples"
  },
  interview: {
    name: "Priya Sharma",
    role: "Technical Interview Coach",
    personality: "Confident, supportive, and experienced. Helps build interview confidence through practice.",
    expertise: ["Technical interviews", "Behavioral questions", "Mock interviews", "Communication skills", "Confidence building"],
    tone: "Encouraging and confidence-building, practical and actionable"
  },
  productivity: {
    name: "Marcus Johnson",
    role: "Productivity & Learning Coach",
    personality: "Organized, motivational, and systematic. Focuses on efficient learning strategies.",
    expertise: ["Study planning", "Time management", "Learning techniques", "Goal setting", "Habit formation"],
    tone: "Systematic and motivational, focuses on actionable steps"
  },
  motivation: {
    name: "Sam Rivera",
    role: "Motivation & Wellness Coach",
    personality: "Empathetic, uplifting, and understanding. Provides emotional support and motivation.",
    expertise: ["Stress management", "Motivation techniques", "Mental wellness", "Confidence building", "Resilience"],
    tone: "Warm and empathetic, uplifting and supportive"
  }
};

export class MentorService {
  private static instance: MentorService;
  
  static getInstance(): MentorService {
    if (!MentorService.instance) {
      MentorService.instance = new MentorService();
    }
    return MentorService.instance;
  }

  async generateResponse(
    mode: MentorMode,
    userMessage: string,
    context: MentorContext,
    conversationHistory: MentorMessage[] = [],
    onChunk?: (chunk: string) => void,
    onComplete?: (response: string, suggestions: string[]) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    const personality = mentorPersonalities[mode];
    
    // Build context-aware system prompt
    const systemPrompt = this.buildSystemPrompt(personality, context);
    
    // Build conversation history for Gemini
    const geminiHistory: GeminiMessage[] = conversationHistory
      .slice(-10) // Keep last 10 messages for context
      .map(msg => ({
        role: msg.role === 'mentor' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

    // Add current user message
    geminiHistory.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    let fullResponse = '';
    
    try {
      await streamGemini(
        geminiHistory,
        (chunk) => {
          fullResponse += chunk;
          onChunk?.(chunk);
        },
        () => {
          // Extract suggestions from response
          const suggestions = this.extractSuggestions(fullResponse, mode);
          onComplete?.(fullResponse, suggestions);
        },
        (error) => {
          onError?.(error);
        },
        systemPrompt
      );
    } catch (error) {
      onError?.(error as Error);
    }
  }

  private buildSystemPrompt(personality: MentorPersonality, context: MentorContext): string {
    const userProfile = context.user_profile || {};
    const recentActivity = context.recent_activity || {};
    
    return `You are ${personality.name}, a ${personality.role} and AI mentor for PrepVerse, a placement preparation platform.

PERSONALITY: ${personality.personality}
TONE: ${personality.tone}
EXPERTISE: ${personality.expertise.join(', ')}

USER CONTEXT:
- Dream Company: ${userProfile.dream_company || 'Not specified'}
- Skill Level: ${userProfile.skill_level || 'Not specified'}
- Weak Subjects: ${userProfile.weak_subjects?.join(', ') || 'Not specified'}
- Study Streak: ${recentActivity.study_streak || 0} days
- Recent Coding Sessions: ${recentActivity.coding_sessions || 0}
- Interview Attempts: ${recentActivity.interview_attempts || 0}
- Last Resume Score: ${recentActivity.last_resume_score || 'Not available'}

GUIDELINES:
1. Be supportive, encouraging, and student-friendly
2. Provide actionable, personalized advice based on user context
3. Use the user's dream company and skill level to tailor responses
4. Address weak subjects when relevant
5. Acknowledge their progress (study streak, coding sessions, etc.)
6. Keep responses concise but comprehensive (2-3 paragraphs max)
7. End with 2-3 follow-up suggestions in this format: [SUGGESTIONS: suggestion1 | suggestion2 | suggestion3]
8. Use emojis sparingly but effectively
9. Be motivational without being overly cheerful
10. Provide specific, actionable steps

Remember: You're not just answering questions - you're mentoring a student through their placement preparation journey. Be the mentor you wish you had during your preparation.`;
  }

  private extractSuggestions(response: string, mode: MentorMode): string[] {
    // Extract suggestions from the response
    const suggestionMatch = response.match(/\[SUGGESTIONS:\s*([^\]]+)\]/);
    
    if (suggestionMatch) {
      return suggestionMatch[1]
        .split('|')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .slice(0, 3);
    }

    // Fallback suggestions based on mode
    const fallbackSuggestions: Record<MentorMode, string[]> = {
      career: [
        "Tell me about your dream company",
        "Help me create a career roadmap",
        "What skills should I focus on?"
      ],
      coding: [
        "Explain a DSA concept",
        "Help me debug this code",
        "Suggest practice problems"
      ],
      interview: [
        "Practice behavioral questions",
        "Mock technical interview",
        "Interview preparation tips"
      ],
      productivity: [
        "Create a study schedule",
        "Time management tips",
        "Set learning goals"
      ],
      motivation: [
        "I need motivation",
        "Dealing with stress",
        "Building confidence"
      ]
    };

    return fallbackSuggestions[mode];
  }

  async generateDailyRecommendation(context: MentorContext): Promise<{
    title: string;
    content: string;
    actionItems: string[];
    type: string;
  }> {
    const userProfile = context.user_profile || {};
    const recentActivity = context.recent_activity || {};

    const prompt = `Based on this user's profile and activity, generate a personalized daily recommendation:

USER PROFILE:
- Dream Company: ${userProfile.dream_company || 'Not specified'}
- Skill Level: ${userProfile.skill_level || 'beginner'}
- Weak Subjects: ${userProfile.weak_subjects?.join(', ') || 'Not specified'}
- Study Streak: ${recentActivity.study_streak || 0} days
- Coding Sessions: ${recentActivity.coding_sessions || 0}
- Interview Attempts: ${recentActivity.interview_attempts || 0}

Generate a JSON response with:
{
  "title": "Engaging title with emoji",
  "content": "Personalized recommendation (2-3 sentences)",
  "actionItems": ["action1", "action2", "action3"],
  "type": "tip|challenge|motivation|reminder"
}

Make it specific to their profile and encouraging.`;

    return new Promise((resolve) => {
      // For now, return a sample recommendation
      // This would be replaced with actual Gemini API call
      const recommendations = [
        {
          title: "🎯 Focus on Your Weak Areas",
          content: `Based on your profile, spend extra time on ${userProfile.weak_subjects?.[0] || 'data structures'} today. Consistent practice in weak areas leads to breakthrough moments.`,
          actionItems: [
            "Solve 3 problems in your weak topic",
            "Watch a tutorial video",
            "Take notes on key concepts"
          ],
          type: "tip"
        },
        {
          title: "🚀 Level Up Challenge",
          content: `You're on a ${recentActivity.study_streak || 0}-day streak! Time to tackle a medium-level problem to push your boundaries.`,
          actionItems: [
            "Attempt a medium difficulty problem",
            "Time yourself (45 minutes max)",
            "Review the optimal solution"
          ],
          type: "challenge"
        }
      ];

      const randomRec = recommendations[Math.floor(Math.random() * recommendations.length)];
      resolve(randomRec);
    });
  }
}

export const mentorService = MentorService.getInstance();