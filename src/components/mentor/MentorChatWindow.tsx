import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useMentor } from '@/contexts/MentorContext';
import { Streamdown } from 'streamdown';
import type { MentorMode } from '@/types/types';
import {
  Bot, Send, Minimize2, RotateCcw, Copy, ThumbsUp,
  Briefcase, Code2, Users, Target, Heart, Sparkles,
  MessageSquare, Lightbulb, BookOpen, TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const mentorModes = [
  {
    key: 'career' as MentorMode,
    label: 'Career Mentor',
    icon: Briefcase,
    color: 'text-neon-blue',
    bg: 'bg-neon-blue/10',
    description: 'Career guidance & roadmap planning'
  },
  {
    key: 'coding' as MentorMode,
    label: 'Coding Mentor',
    icon: Code2,
    color: 'text-success',
    bg: 'bg-success/10',
    description: 'DSA help & coding assistance'
  },
  {
    key: 'interview' as MentorMode,
    label: 'Interview Coach',
    icon: Users,
    color: 'text-warning',
    bg: 'bg-warning/10',
    description: 'Interview preparation & tips'
  },
  {
    key: 'productivity' as MentorMode,
    label: 'Productivity Coach',
    icon: Target,
    color: 'text-neon-purple',
    bg: 'bg-neon-purple/10',
    description: 'Study planning & time management'
  },
  {
    key: 'motivation' as MentorMode,
    label: 'Motivation Buddy',
    icon: Heart,
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
    description: 'Encouragement & stress management'
  }
];

const quickPrompts = [
  "Explain this DSA concept to me",
  "How do I improve my resume?",
  "Give me a 30-day study plan",
  "Help me debug this code",
  "How to crack FAANG interviews?",
  "Suggest projects for my skill level",
  "I'm feeling demotivated, help me",
  "What should I focus on next?"
];

export function MentorChatWindow() {
  const {
    isOpen,
    setIsOpen,
    currentMode,
    setCurrentMode,
    messages,
    isTyping,
    sendMessage,
    clearChat,
    mentorContext
  } = useMentor();

  const [input, setInput] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    const message = input.trim();
    setInput('');
    await sendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Message copied to clipboard');
  };

  const currentModeConfig = mentorModes.find(m => m.key === currentMode)!;

  if (!isOpen) return null;

  return (
    <Card className={cn(
      'fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] z-50 transition-all duration-300',
      'bg-background/95 backdrop-blur-xl border border-border/50 shadow-2xl',
      isMinimized ? 'h-16' : 'h-[600px] max-h-[80vh]'
    )}>
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', currentModeConfig.bg)}>
            <currentModeConfig.icon className={cn('w-5 h-5', currentModeConfig.color)} />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold">PrepVerse AI Mentor</CardTitle>
            <p className="text-xs text-muted-foreground">{currentModeConfig.label}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMinimized(!isMinimized)}
            className="w-8 h-8"
          >
            <Minimize2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={clearChat}
            className="w-8 h-8"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="p-0 flex flex-col h-[calc(100%-5rem)]">
          {/* Mode Selector */}
          <div className="p-3 border-b border-border/50">
            <div className="flex gap-1 overflow-x-auto">
              {mentorModes.map((mode) => (
                <Button
                  key={mode.key}
                  variant={currentMode === mode.key ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setCurrentMode(mode.key)}
                  className={cn(
                    'flex-shrink-0 text-xs h-8',
                    currentMode === mode.key && 'bg-primary text-primary-foreground'
                  )}
                >
                  <mode.icon className="w-3 h-3 mr-1" />
                  {mode.label.split(' ')[0]}
                </Button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-primary to-neon-blue flex items-center justify-center">
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Hi! I'm your AI Mentor 👋</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {currentModeConfig.description}
                  </p>
                </div>
                
                {/* Quick Prompts */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Quick prompts:</p>
                  <div className="grid grid-cols-1 gap-2">
                    {quickPrompts.slice(0, 4).map((prompt, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => setInput(prompt)}
                        className="text-xs h-8 justify-start"
                      >
                        <Lightbulb className="w-3 h-3 mr-2" />
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'mentor' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-neon-blue flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                
                <div className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-3 text-sm',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-muted rounded-tl-sm'
                )}>
                  <Streamdown className="text-sm [&>*]:m-0">
                    {message.content}
                  </Streamdown>
                  
                  {message.role === 'mentor' && (
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyMessage(message.content)}
                        className="w-6 h-6 opacity-60 hover:opacity-100"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-6 h-6 opacity-60 hover:opacity-100"
                      >
                        <ThumbsUp className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                  
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {message.suggestions.map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => setInput(suggestion)}
                          className="text-xs h-7 mr-1 mb-1"
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-neon-blue flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border/50">
            <div className="flex gap-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={`Ask your ${currentModeConfig.label.toLowerCase()}...`}
                className="flex-1 min-h-[40px] max-h-[100px] resize-none text-sm"
                disabled={isTyping}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || isTyping}
                className="self-end"
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}