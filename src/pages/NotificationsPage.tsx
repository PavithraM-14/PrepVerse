import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
// @ts-ignore
import { supabase } from '@/db/supabase';
import type { Notification } from '@/types/types';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bell, CheckCircle, AlertTriangle, Info, Trophy, Clock,
  Trash2, MarkAsUnreadIcon, Eye, EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const notificationIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  reminder: Clock,
  achievement: Trophy,
};

const notificationColors = {
  info: 'text-info border-info/20 bg-info/5',
  success: 'text-success border-success/20 bg-success/5',
  warning: 'text-warning border-warning/20 bg-warning/5',
  reminder: 'text-warning border-warning/20 bg-warning/5',
  achievement: 'text-primary border-primary/20 bg-primary/5',
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (!user) return;
    loadNotifications();
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading notifications:', err);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      toast.success('Marked as read');
    } catch (err) {
      toast.error('Failed to mark as read');
    }
  };

  const markAsUnread = async (id: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: false })
        .eq('id', id);
      
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: false } : n)
      );
      toast.success('Marked as unread');
    } catch (err) {
      toast.error('Failed to mark as unread');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
      
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Notification deleted');
    } catch (err) {
      toast.error('Failed to delete notification');
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Failed to mark all as read');
    }
  };

  const clearAll = async () => {
    if (!user) return;
    if (!confirm('Are you sure you want to delete all notifications?')) return;
    
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);
      
      setNotifications([]);
      toast.success('All notifications cleared');
    } catch (err) {
      toast.error('Failed to clear notifications');
    }
  };

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.is_read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold gradient-text">Notifications</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Stay updated with your study progress and reminders
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
              {unreadCount} unread
            </Badge>
            {unreadCount > 0 && (
              <Button size="sm" variant="outline" onClick={markAllAsRead} className="glass border-border/40">
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark All Read
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={clearAll} className="glass border-border/40 text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={filter === 'all' ? 'default' : 'ghost'}
            onClick={() => setFilter('all')}
            className={filter === 'all' ? 'xp-bar border-0 text-white' : ''}
          >
            All ({notifications.length})
          </Button>
          <Button
            size="sm"
            variant={filter === 'unread' ? 'default' : 'ghost'}
            onClick={() => setFilter('unread')}
            className={filter === 'unread' ? 'xp-bar border-0 text-white' : ''}
          >
            Unread ({unreadCount})
          </Button>
        </div>

        {/* Notifications list */}
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Card key={i} className="glass border-border/40">
                  <CardContent className="p-4">
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <Card className="glass border-border/40">
              <CardContent className="p-8 text-center">
                <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
                <h3 className="font-semibold mb-2">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {filter === 'unread' 
                    ? 'All caught up! Check back later for new updates.'
                    : 'Notifications about your study progress and reminders will appear here.'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredNotifications.map((notification) => {
              const IconComponent = notificationIcons[notification.type] || Info;
              const colorClass = notificationColors[notification.type] || notificationColors.info;
              
              return (
                <Card 
                  key={notification.id} 
                  className={cn(
                    'glass border-border/40 transition-all hover:shadow-md',
                    !notification.is_read && 'border-l-4 border-l-primary'
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={cn('p-2 rounded-lg border shrink-0', colorClass)}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className={cn('font-semibold text-sm', !notification.is_read && 'text-primary')}>
                            {notification.title}
                          </h4>
                          <div className="flex items-center gap-1 shrink-0">
                            {!notification.is_read && (
                              <div className="w-2 h-2 rounded-full bg-primary" />
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(notification.created_at).toLocaleDateString()} at{' '}
                              {new Date(notification.created_at).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3">
                          {notification.message}
                        </p>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {notification.is_read ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => markAsUnread(notification.id)}
                              className="h-7 px-2 text-xs"
                            >
                              <EyeOff className="w-3 h-3 mr-1" />
                              Mark Unread
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => markAsRead(notification.id)}
                              className="h-7 px-2 text-xs"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Mark Read
                            </Button>
                          )}
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteNotification(notification.id)}
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}