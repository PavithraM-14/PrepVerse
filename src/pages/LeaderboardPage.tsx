import { useEffect, useState } from 'react';
// @ts-ignore
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Flame, Zap, Crown, Medal, Star, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
  user_id: string;
  xp_points: number;
  streak_days: number;
  level: number;
  username: string | null;
}

function getLevelFromXP(xp: number) {
  return Math.floor(xp / 500) + 1;
}

const rankIcons = [Crown, Trophy, Medal];
const rankColors = ['text-warning', 'text-muted-foreground', 'text-amber-600'];
const rankBgs = ['bg-warning/10 border-warning/30', 'bg-muted border-border', 'bg-amber-600/10 border-amber-600/30'];

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState<number | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    setLoading(true);
    // Join user_progress with profiles directly
    const { data } = await supabase
      .from('user_progress')
      .select('user_id, xp_points, streak_days, profiles!inner(username)')
      .order('xp_points', { ascending: false })
      .limit(50);

    if (Array.isArray(data)) {
      const entries: LeaderboardEntry[] = data.map((d: any) => ({
        user_id: d.user_id,
        xp_points: d.xp_points ?? 0,
        streak_days: d.streak_days ?? 0,
        level: getLevelFromXP(d.xp_points ?? 0),
        username: d.profiles?.username || 'Anonymous',
      }));
      setEntries(entries);
      if (user) {
        const rank = entries.findIndex(e => e.user_id === user.id);
        setMyRank(rank >= 0 ? rank + 1 : null);
      }
    }
    setLoading(false);
  };

  const getInitials = (name: string | null) => (name || 'AN').slice(0, 2).toUpperCase();

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold gradient-text">Leaderboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Compete with students from around the world</p>
        </div>

        {/* My Rank card */}
        {myRank && (
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-neon-purple/5">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full xp-bar flex items-center justify-center text-white font-bold text-lg shrink-0">
                #{myRank}
              </div>
              <div>
                <p className="font-semibold">Your Ranking</p>
                <p className="text-sm text-muted-foreground">
                  {myRank <= 10 ? '🔥 Top 10! Amazing!' : myRank <= 25 ? '⚡ Top 25 — Great work!' : 'Keep grinding to climb higher!'}
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="font-bold text-lg">{entries.find(e => e.user_id === user?.id)?.xp_points?.toLocaleString() ?? 0}</p>
                <p className="text-xs text-muted-foreground">XP Points</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top 3 */}
        {!loading && entries.length >= 3 && (
          <div className="grid grid-cols-3 gap-3">
            {[entries[1], entries[0], entries[2]].map((entry, displayIdx) => {
              const realRank = displayIdx === 0 ? 2 : displayIdx === 1 ? 1 : 3;
              const RankIcon = rankIcons[realRank - 1];
              return (
                <div
                  key={entry?.user_id}
                  className={cn(
                    'rounded-2xl border p-4 text-center',
                    rankBgs[realRank - 1],
                    displayIdx === 1 && 'md:scale-105 shadow-hover -mt-2'
                  )}
                >
                  <RankIcon className={cn('w-6 h-6 mx-auto mb-2', rankColors[realRank - 1])} />
                  <Avatar className="w-12 h-12 mx-auto mb-2">
                    <AvatarFallback className="xp-bar text-white text-sm">
                      {getInitials(entry?.username ?? null)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-semibold text-sm truncate">{entry?.username || 'Anonymous'}</p>
                  <p className="text-xs text-muted-foreground">Lv.{entry?.level}</p>
                  <p className={cn('font-bold text-sm mt-1', rankColors[realRank - 1])}>
                    {entry?.xp_points?.toLocaleString()} XP
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Full list */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> All Rankings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-xs font-semibold text-muted-foreground w-12">Rank</th>
                    <th className="text-left p-4 text-xs font-semibold text-muted-foreground">Student</th>
                    <th className="text-left p-4 text-xs font-semibold text-muted-foreground">Level</th>
                    <th className="text-left p-4 text-xs font-semibold text-muted-foreground">Streak</th>
                    <th className="text-right p-4 text-xs font-semibold text-muted-foreground">XP</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={5} className="p-3">
                          <Skeleton className="h-10 w-full" />
                        </td>
                      </tr>
                    ))
                  ) : entries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-muted-foreground text-sm">
                        <Trophy className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p>Be the first on the leaderboard!</p>
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry, idx) => {
                      const isMe = entry.user_id === user?.id;
                      return (
                        <tr
                          key={entry.user_id}
                          className={cn(
                            'border-b border-border/50 transition-colors',
                            isMe ? 'bg-primary/5' : 'hover:bg-accent/20'
                          )}
                        >
                          <td className="p-4">
                            {idx < 3 ? (
                              <div className={cn('font-bold', rankColors[idx])}>#{idx + 1}</div>
                            ) : (
                              <span className="text-sm text-muted-foreground">#{idx + 1}</span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarFallback className="xp-bar text-white text-xs">
                                  {getInitials(entry.username)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className={cn('text-sm font-medium truncate', isMe && 'text-primary')}>
                                  {entry.username}{isMe && <span className="ml-1 text-xs">(You)</span>}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant="secondary" className="text-xs">
                              <Star className="w-2.5 h-2.5 mr-1" />
                              Lv. {entry.level}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1 text-warning text-sm">
                              <Flame className="w-3 h-3 shrink-0" />
                              <span>{entry.streak_days}d</span>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Zap className="w-3 h-3 text-neon-purple shrink-0" />
                              <span className="font-bold text-sm">{entry.xp_points.toLocaleString()}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
