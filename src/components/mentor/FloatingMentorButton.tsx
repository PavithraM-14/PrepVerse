import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMentor } from '@/contexts/MentorContext';
import { Bot, MessageCircle, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FloatingMentorButton() {
  const { isOpen, setIsOpen, recommendations } = useMentor();
  const [isAnimating, setIsAnimating] = useState(false);
  const [showPulse, setShowPulse] = useState(true);

  // Animate button on new recommendations
  useEffect(() => {
    if (recommendations.length > 0) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 2000);
    }
  }, [recommendations.length]);

  // Hide pulse after first interaction
  useEffect(() => {
    if (isOpen) {
      setShowPulse(false);
    }
  }, [isOpen]);

  const unreadCount = recommendations.length;

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative">
          {/* Pulse Animation */}
          {showPulse && (
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          )}
          
          {/* Notification Badge */}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 z-10 min-w-[20px] h-5 flex items-center justify-center text-xs font-bold animate-bounce"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}

          {/* Main Button */}
          <Button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              'w-14 h-14 rounded-full shadow-lg transition-all duration-300 ease-out',
              'bg-gradient-to-r from-primary via-neon-blue to-neon-purple',
              'hover:shadow-xl hover:shadow-primary/25 hover:scale-110',
              'border-2 border-white/20 backdrop-blur-sm',
              isAnimating && 'animate-pulse scale-110',
              isOpen && 'rotate-180 scale-95'
            )}
            size="icon"
          >
            {isOpen ? (
              <X className="w-6 h-6 text-white transition-transform duration-300" />
            ) : (
              <div className="relative">
                <Bot className="w-6 h-6 text-white" />
                {unreadCount > 0 && (
                  <Sparkles className="w-3 h-3 text-yellow-300 absolute -top-1 -right-1 animate-spin" />
                )}
              </div>
            )}
          </Button>

          {/* Tooltip */}
          {!isOpen && (
            <div className="absolute bottom-full right-0 mb-2 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              <div className="bg-black/80 text-white text-sm px-3 py-2 rounded-lg backdrop-blur-sm whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  <span>AI Mentor Assistant</span>
                </div>
                {unreadCount > 0 && (
                  <div className="text-xs text-neon-blue mt-1">
                    {unreadCount} new recommendation{unreadCount > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Glassmorphism Background Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}