import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMentor } from '@/contexts/MentorContext';
import { useAuth } from '@/contexts/AuthContext';
import { Streamdown } from 'streamdown';
import {
  Bot, Sparkles, TrendingUp, Target, BookOpen,
  MessageCircle, ChevronRight, Lightbulb, Star,
  Calendar, Trophy, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DailyInsight {
  type: 'tip' | 'challenge' | 'motivation' | 'reminder';
  title: string;
  content: string;
  action?: string;
  priority: 'low' | 'medium' | 'high';
}

export function MentorDashboardWidget() {
  const { setIsOpen, setCurrentMode, mentorContext, recommendations } = useMentor();
  const { user } = useAuth();
  const [dailyInsight, setDailyInsight] = useState<DailyInsight | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    generateDailyInsight();
  }, [mentorContext, user]);

  const generateDailyInsight = async () => {
    setIsLoading(true);
    
    // Simulate AI-generated daily insight based on user context
    setTimeout(() => {
      const insights: DailyInsight[] = [
        {
          type: 'tip',
          title: '💡 Daily Study Tip',
          content: 'Focus on one DSA topic per day for better retention. Today, try practicing Binary Search problems.',
          action: 'Start Practice',
          priority: 'medium'
        },
        {
          type: 'challenge',
          title: '🎯 Coding Challenge',
          content: 'You\'ve solved 15 easy problems! Time to tackle medium-level array problems.',
          action: 'View Problems',
          priority: 'high'
        },
        {
          type: 'motivation',
          title: '🌟 Motivation Boost',
          content: 'You\'re on a 7-day study streak! Keep going - consistency is key to cracking your dream company.',
          priority: 'low'
        },
        {
          type: 'reminder',
          title: '📅 Interview Prep',
          content: 'Don\'t forget to practice behavioral questions. Mock interviews improve confidence by 40%.',
          action: 'Start Interview',
          priority: 'medium'
        }
      ];

      // Select insight based on user context
      const randomInsight = insights[Math.floor(Math.random() * insights.length)];
      setDailyInsight(randomInsight);
      setIsLoading(false);
    }, 1000);
  };

  const openMentorChat = (mode: string = 'career') => {
    setCurrentMode(mode as any);
    setIsOpen(true);
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'tip': return Lightbulb;
      case 'challenge': return Target;
      case 'motivation': return Star;
      case 'reminder': return Calendar;
      default: return Sparkles;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-500/30 bg-red-500/5';
      case 'medium': return 'border-yellow-500/30 bg-yellow-500/5';
      case 'low': return 'border-green-500/30 bg-green-500/5';
      default: return 'border-border/30';
    }
  };

  return (
    <div className="space-y-4">
      {/* Main AI Mentor Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-neon-blue/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-neon-blue flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            AI Mentor Assistant
            {recommendations.length > 0 && (
              <Badge variant="destructive" className="ml-auto">
                {recommendations.length} new
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Daily Insight */}
          {isLoading ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
              </div>
            </div>
          ) : dailyInsight && (
            <div className={cn(
              'p-4 rounded-lg border transition-all hover:shadow-md',
              getPriorityColor(dailyInsight.priority)
            )}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {(() => {
                    const Icon = getInsightIcon(dailyInsight.type);
                    return <Icon className="w-4 h-4 text-primary" />;
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm mb-1">{dailyInsight.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {dailyInsight.content}
                  </p>
                  {dailyInsight.action && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 h-7 text-xs"
                      onClick={() => openMentorChat('productivity')}
                    >
                      {dailyInsight.action}
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openMentorChat('coding')}
              className="h-8 text-xs justify-start"
            >
              <BookOpen className="w-3 h-3 mr-2" />
              Coding Help
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openMentorChat('interview')}
              className="h-8 text-xs justify-start"
            >
              <MessageCircle className="w-3 h-3 mr-2" />
              Interview Prep
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openMentorChat('career')}
              className="h-8 text-xs justify-start"
            >
              <TrendingUp className="w-3 h-3 mr-2" />
              Career Guide
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openMentorChat('motivation')}
              className="h-8 text-xs justify-start"
            >
              <Zap className="w-3 h-3 mr-2" />
              Motivation
            </Button>
          </div>

          {/* Open Full Chat */}
          <Button
            onClick={() => openMentorChat()}
            className="w-full h-8 text-xs bg-gradient-to-r from-primary to-neon-blue hover:from-primary/90 hover:to-neon-blue/90"
          >
            <Bot className="w-3 h-3 mr-2" />
            Open AI Mentor Chat
          </Button>
        </CardContent>
      </Card>

      {/* Recent Recommendations */}
      {recommendations.length > 0 && (
        <Card className="border-warning/20 bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="w-4 h-4 text-warning" />
              Personalized Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recommendations.slice(0, 2).map((rec) => (
              <div key={rec.id} className="p-2 rounded bg-background/50 border border-border/30">
                <h5 className="font-medium text-xs mb-1">{rec.title}</h5>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {rec.content}
                </p>
              </div>
            ))}
            {recommendations.length > 2 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openMentorChat()}
                className="w-full h-7 text-xs"
              >
                View all {recommendations.length} recommendations
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}