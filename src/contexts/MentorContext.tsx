import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
// @ts-ignore
import { supabase } from '@/db/supabase';
import { mentorService } from '@/lib/mentorService';
import type { MentorMessage, MentorSession, MentorMode, MentorContext as MentorContextType, MentorRecommendation } from '@/types/types';

interface MentorContextProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  currentMode: MentorMode;
  setCurrentMode: (mode: MentorMode) => void;
  messages: MentorMessage[];
  setMessages: (messages: MentorMessage[]) => void;
  isTyping: boolean;
  setIsTyping: (typing: boolean) => void;
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  mentorContext: MentorContextType;
  updateMentorContext: (context: Partial<MentorContextType>) => void;
  recommendations: MentorRecommendation[];
  loadRecommendations: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  loadChatHistory: () => Promise<void>;
  clearChat: () => void;
}

const MentorContext = createContext<MentorContextProps | undefined>(undefined);

export function MentorProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentMode, setCurrentMode] = useState<MentorMode>('career');
  const [messages, setMessages] = useState<MentorMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mentorContext, setMentorContextState] = useState<MentorContextType>({});
  const [recommendations, setRecommendations] = useState<MentorRecommendation[]>([]);

  // Load user context when user changes
  useEffect(() => {
    if (user) {
      loadUserContext();
      loadRecommendations();
    }
  }, [user]);

  const loadUserContext = async () => {
    if (!user) return;

    try {
      // Load user profile data
      const { data: persona } = await supabase
        .from('placement_personas')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const { data: progress } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const { data: recentSessions } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: recentInterviews } = await supabase
        .from('interview_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      const context: MentorContextType = {
        user_profile: {
          dream_company: persona?.dream_company || undefined,
          skill_level: persona?.current_skill_level || undefined,
          weak_subjects: persona?.weak_subjects || [],
          current_goals: []
        },
        recent_activity: {
          coding_sessions: recentSessions?.length || 0,
          interview_attempts: recentInterviews?.length || 0,
          study_streak: progress?.streak_days || 0,
          last_resume_score: progress?.resume_score || undefined
        },
        conversation_history: {
          recent_topics: [],
          preferred_mode: 'career',
          interaction_count: 0
        }
      };

      setMentorContextState(context);
    } catch (error) {
      console.error('Error loading mentor context:', error);
    }
  };

  const updateMentorContext = (newContext: Partial<MentorContextType>) => {
    setMentorContextState(prev => ({
      ...prev,
      ...newContext
    }));
  };

  const loadRecommendations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('mentor_recommendations')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecommendations(data || []);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    }
  };

  const sendMessage = async (content: string) => {
    if (!user) return;

    const userMessage: MentorMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      mode: currentMode
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    let streamingResponse = '';

    try {
      await mentorService.generateResponse(
        currentMode,
        content,
        mentorContext,
        messages,
        (chunk) => {
          streamingResponse += chunk;
          // Update the last message with streaming content
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            
            if (lastMessage && lastMessage.role === 'mentor') {
              lastMessage.content = streamingResponse;
            } else {
              newMessages.push({
                id: (Date.now() + 1).toString(),
                role: 'mentor',
                content: streamingResponse,
                timestamp: new Date().toISOString(),
                mode: currentMode
              });
            }
            
            return newMessages;
          });
        },
        (finalResponse, suggestions) => {
          const mentorResponse: MentorMessage = {
            id: (Date.now() + 1).toString(),
            role: 'mentor',
            content: finalResponse.replace(/\[SUGGESTIONS:.*?\]/g, '').trim(),
            timestamp: new Date().toISOString(),
            mode: currentMode,
            suggestions
          };

          setMessages(prev => {
            const newMessages = [...prev];
            // Replace the streaming message with the final one
            if (newMessages[newMessages.length - 1]?.role === 'mentor') {
              newMessages[newMessages.length - 1] = mentorResponse;
            } else {
              newMessages.push(mentorResponse);
            }
            return newMessages;
          });

          setIsTyping(false);
          
          // Save conversation to database
          saveConversation([...messages, userMessage, mentorResponse]);
        },
        (error) => {
          console.error('Mentor response error:', error);
          setIsTyping(false);
          
          // Fallback response
          const fallbackResponse: MentorMessage = {
            id: (Date.now() + 1).toString(),
            role: 'mentor',
            content: "I'm having trouble connecting right now. Please try again in a moment. In the meantime, feel free to explore the practice problems or check out the study materials!",
            timestamp: new Date().toISOString(),
            mode: currentMode,
            suggestions: [
              'Try asking again',
              'Check practice problems',
              'Review study materials'
            ]
          };

          setMessages(prev => [...prev, fallbackResponse]);
        }
      );
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
    }
  };

  const saveConversation = async (conversationMessages: MentorMessage[]) => {
    if (!user) return;

    try {
      const sessionData = {
        user_id: user.id,
        messages: conversationMessages,
        mode: currentMode,
        context: mentorContext,
        updated_at: new Date().toISOString()
      };

      if (sessionId) {
        await supabase
          .from('mentor_sessions')
          .update(sessionData)
          .eq('id', sessionId);
      } else {
        const { data, error } = await supabase
          .from('mentor_sessions')
          .insert({
            ...sessionData,
            created_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (error) throw error;
        if (data) setSessionId(data.id);
      }
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  };

  const loadChatHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('mentor_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      
      if (data) {
        setMessages(data.messages || []);
        setSessionId(data.id);
        setCurrentMode(data.mode);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setSessionId(null);
  };

  return (
    <MentorContext.Provider
      value={{
        isOpen,
        setIsOpen,
        currentMode,
        setCurrentMode,
        messages,
        setMessages,
        isTyping,
        setIsTyping,
        sessionId,
        setSessionId,
        mentorContext,
        updateMentorContext,
        recommendations,
        loadRecommendations,
        sendMessage,
        loadChatHistory,
        clearChat
      }}
    >
      {children}
    </MentorContext.Provider>
  );
}

export function useMentor() {
  const context = useContext(MentorContext);
  if (context === undefined) {
    throw new Error('useMentor must be used within a MentorProvider');
  }
  return context;
}