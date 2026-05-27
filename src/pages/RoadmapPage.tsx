import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
// @ts-ignore
import { supabase } from '@/db/supabase';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PlacementPersona, RoadmapData } from '@/types/types';
import {
  Target, Calendar, CheckCircle, Clock, Sparkles,
  Building2, TrendingUp, Brain, RefreshCw, History, Eye, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function RoadmapPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [persona, setPersona] = useState<PlacementPersona | null>(null);
  const [roadmapHistory, setRoadmapHistory] = useState<PlacementPersona[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedHistoryRoadmap, setSelectedHistoryRoadmap] = useState<RoadmapData | null>(null);

  useEffect(() => {
    if (user) {
      loadPersona();
      loadRoadmapHistory();
    }
  }, [user]);

  const loadPersona = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('placement_personas')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      setPersona(data);
    } catch (error) {
      console.error('Error loading persona:', error);
      toast.error('Failed to load roadmap');
    } finally {
      setLoading(false);
    }
  };

  const loadRoadmapHistory = async () => {
    if (!user) return;
    
    setLoadingHistory(true);
    try {
      // Get all placement personas for this user, ordered by creation date
      const { data, error } = await supabase
        .from('placement_personas')
        .select('*')
        .eq('user_id', user.id)
        .not('roadmap', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter out the current persona and keep only historical ones
      const history = (data || []).slice(1); // Skip the first (current) one
      setRoadmapHistory(history);
    } catch (error) {
      console.error('Error loading roadmap history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const deleteHistoricalRoadmap = async (personaId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('placement_personas')
        .delete()
        .eq('id', personaId)
        .eq('user_id', user.id); // Extra security check

      if (error) throw error;
      
      // Remove from local state
      setRoadmapHistory(prev => prev.filter(p => p.id !== personaId));
      toast.success('Roadmap deleted successfully');
    } catch (error) {
      console.error('Error deleting roadmap:', error);
      toast.error('Failed to delete roadmap');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-4 md:p-6 max-w-5xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading your roadmap...</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!persona || !persona.roadmap) {
    return (
      <AppLayout>
        <div className="p-4 md:p-6 max-w-5xl mx-auto">
          <div className="text-center py-20">
            <Brain className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold mb-2">No Roadmap Found</h2>
            <p className="text-muted-foreground mb-6">
              You haven't created a placement roadmap yet. Complete the onboarding to generate your personalized roadmap.
            </p>
            <Button 
              onClick={() => navigate('/onboarding')}
              className="xp-bar border-0 text-white"
            >
              Create Roadmap
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const roadmap = persona.roadmap;

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold gradient-text">My Placement Roadmap</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Your personalized path to {persona.dream_company}
            </p>
          </div>

          {/* Action Buttons for Current Roadmap */}
          <div className="flex gap-2 shrink-0">
            <Button 
              onClick={() => navigate('/onboarding')}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Update
            </Button>
            <Button 
              onClick={async () => {
                if (!persona || !user) return;
                
                if (confirm('Are you sure you want to delete this roadmap? This action cannot be undone.')) {
                  try {
                    const { error } = await supabase
                      .from('placement_personas')
                      .delete()
                      .eq('id', persona.id)
                      .eq('user_id', user.id);

                    if (error) throw error;
                    
                    toast.success('Roadmap deleted successfully');
                    navigate('/onboarding'); // Redirect to create new roadmap
                  } catch (error) {
                    console.error('Error deleting roadmap:', error);
                    toast.error('Failed to delete roadmap');
                  }
                }
              }}
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Target Company', value: persona.dream_company, icon: Building2 },
            { label: 'Role', value: persona.preferred_role, icon: Target },
            { label: 'Skill Level', value: persona.current_skill_level, icon: TrendingUp },
            { label: 'Timeline', value: persona.placement_timeline, icon: Clock },
          ].map((item) => (
            <Card key={item.label} className="border-border/60">
              <CardContent className="p-4 text-center">
                <item.icon className="w-5 h-5 mx-auto mb-2 text-primary" />
                <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                <p className="text-sm font-semibold">{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Roadmap Phases Table */}
        {roadmap.phases && roadmap.phases.length > 0 && (
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Detailed Roadmap Phases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border border-border/60 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-accent/50">
                      <tr>
                        <th className="text-left p-4 text-sm font-semibold text-muted-foreground border-b border-border/30">Week</th>
                        <th className="text-left p-4 text-sm font-semibold text-muted-foreground border-b border-border/30">Phase Title</th>
                        <th className="text-left p-4 text-sm font-semibold text-muted-foreground border-b border-border/30">Focus Area</th>
                        <th className="text-left p-4 text-sm font-semibold text-muted-foreground border-b border-border/30">Key Tasks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roadmap.phases.map((phase, index) => (
                        <tr key={index} className="border-b border-border/20 hover:bg-accent/20 transition-colors">
                          <td className="p-4">
                            <Badge className="xp-bar border-0 text-white">
                              Week {phase.week}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <p className="font-medium">{phase.title}</p>
                          </td>
                          <td className="p-4">
                            <p className="text-muted-foreground">{phase.focus}</p>
                          </td>
                          <td className="p-4">
                            <div className="space-y-2">
                              {phase.tasks.map((task, taskIndex) => (
                                <div key={taskIndex} className="flex items-start gap-2">
                                  <CheckCircle className="w-4 h-4 text-success mt-0.5 shrink-0" />
                                  <p className="text-sm text-muted-foreground">{task}</p>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Weekly Goals */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Weekly Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(roadmap.weekly_goals || []).map((goal, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-accent/20 border border-border/30">
                  <Badge className="xp-bar border-0 text-white w-20 justify-center shrink-0">
                    Week {i + 1}
                  </Badge>
                  <span className="text-sm">{goal}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Daily Tasks */}
        {roadmap.daily_tasks && roadmap.daily_tasks.length > 0 && (
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Daily Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {roadmap.daily_tasks.map((task, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-accent/20 border border-border/30">
                    <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">{task}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Recommendations */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(roadmap.recommendations || []).map((recommendation, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-gradient-to-r from-primary/5 to-neon-purple/5 border border-primary/20">
                  <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">{recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Roadmap History Section */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Roadmap History
              {roadmapHistory.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {roadmapHistory.length} roadmap{roadmapHistory.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {roadmapHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No previous roadmaps yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {roadmapHistory.map((historicalPersona, index) => {
                  const totalWeeks = historicalPersona.roadmap?.phases?.length || 0;
                  const currentWeek = Math.min(
                    Math.floor((Date.now() - new Date(historicalPersona.created_at).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1,
                    totalWeeks
                  );
                  const completionPercentage = totalWeeks > 0 ? Math.round((currentWeek / totalWeeks) * 100) : 0;
                  
                  return (
                    <div key={historicalPersona.id} className="border border-border/30 rounded-xl p-4 bg-accent/20">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs font-medium">
                            #{roadmapHistory.length - index}
                          </Badge>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{historicalPersona.dream_company}</span>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-sm text-muted-foreground">{historicalPersona.preferred_role}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                Created {new Date(historicalPersona.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (selectedHistoryRoadmap?.phases === historicalPersona.roadmap?.phases) {
                                setSelectedHistoryRoadmap(null);
                              } else {
                                setSelectedHistoryRoadmap(historicalPersona.roadmap);
                              }
                            }}
                            className="h-8 px-3 text-xs"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            {selectedHistoryRoadmap?.phases === historicalPersona.roadmap?.phases ? 'Hide' : 'View'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Delete this roadmap permanently?')) {
                                deleteHistoricalRoadmap(historicalPersona.id);
                              }
                            }}
                            className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Progress and Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <div className="text-center p-3 bg-accent/30 rounded-lg">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <TrendingUp className="w-3 h-3 text-primary" />
                            <span className="text-xs text-muted-foreground">Progress</span>
                          </div>
                          <div className="text-lg font-bold text-primary">{completionPercentage}%</div>
                          <div className="text-xs text-muted-foreground">Week {currentWeek}/{totalWeeks}</div>
                        </div>
                        <div className="text-center p-3 bg-accent/30 rounded-lg">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Brain className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Skill Level</span>
                          </div>
                          <div className="text-sm font-medium">{historicalPersona.current_skill_level}</div>
                        </div>
                        <div className="text-center p-3 bg-accent/30 rounded-lg">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Timeline</span>
                          </div>
                          <div className="text-sm font-medium">{historicalPersona.placement_timeline}</div>
                        </div>
                        <div className="text-center p-3 bg-accent/30 rounded-lg">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Target className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Confidence</span>
                          </div>
                          <div className="text-sm font-medium">{historicalPersona.confidence_level}/10</div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground">Roadmap Progress</span>
                          <span className="text-xs font-medium">{completionPercentage}% Complete</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full xp-bar rounded-full transition-all duration-500"
                            style={{ width: `${completionPercentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Expanded View */}
                      {selectedHistoryRoadmap?.phases === historicalPersona.roadmap?.phases && historicalPersona.roadmap && (
                        <div className="border-t border-border/30 pt-4">
                          <h4 className="font-semibold mb-3 text-sm flex items-center gap-2">
                            <Target className="w-4 h-4 text-primary" />
                            Roadmap Details
                          </h4>
                          
                          {historicalPersona.roadmap.phases && historicalPersona.roadmap.phases.length > 0 && (
                            <div className="border border-border/60 rounded-lg overflow-hidden">
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-accent/50">
                                    <tr>
                                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Week</th>
                                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Phase</th>
                                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Focus</th>
                                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {historicalPersona.roadmap.phases.map((phase, phaseIndex) => {
                                      const isCompleted = phaseIndex < currentWeek;
                                      const isCurrent = phaseIndex === currentWeek - 1;
                                      
                                      return (
                                        <tr key={phaseIndex} className="border-b border-border/20 hover:bg-accent/20 transition-colors">
                                          <td className="p-3">
                                            <Badge 
                                              className={cn(
                                                "text-xs",
                                                isCompleted ? "xp-bar border-0 text-white" : 
                                                isCurrent ? "bg-warning/10 text-warning border-warning/30" :
                                                "bg-muted text-muted-foreground"
                                              )}
                                            >
                                              Week {phase.week}
                                            </Badge>
                                          </td>
                                          <td className="p-3">
                                            <p className="text-sm font-medium">{phase.title}</p>
                                          </td>
                                          <td className="p-3">
                                            <p className="text-sm text-muted-foreground">{phase.focus}</p>
                                          </td>
                                          <td className="p-3">
                                            <div className="flex items-center gap-2">
                                              {isCompleted ? (
                                                <>
                                                  <CheckCircle className="w-4 h-4 text-success" />
                                                  <span className="text-xs text-success font-medium">Completed</span>
                                                </>
                                              ) : isCurrent ? (
                                                <>
                                                  <Clock className="w-4 h-4 text-warning" />
                                                  <span className="text-xs text-warning font-medium">In Progress</span>
                                                </>
                                              ) : (
                                                <>
                                                  <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                                                  <span className="text-xs text-muted-foreground">Pending</span>
                                                </>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Back to Dashboard */}
        <div className="text-center">
          <Button 
            onClick={() => navigate('/dashboard')}
            className="xp-bar border-0 text-white"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}