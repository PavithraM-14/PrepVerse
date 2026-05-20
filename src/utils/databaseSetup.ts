// @ts-ignore
import { supabase } from '@/db/supabase';

export async function checkAndSetupDatabase() {
  try {
    // Try to create the tasks table if it doesn't exist
    const { error: tasksError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS tasks (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          category TEXT DEFAULT 'general',
          is_completed BOOLEAN DEFAULT FALSE,
          due_date TIMESTAMPTZ,
          reminder_time TIMESTAMPTZ,
          notification_sent BOOLEAN DEFAULT FALSE,
          xp_reward INTEGER DEFAULT 10,
          created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
          completed_at TIMESTAMPTZ
        );
        
        ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY IF NOT EXISTS "Users can manage their own tasks" ON tasks
          FOR ALL USING (auth.uid() = user_id);
      `
    });

    if (tasksError) {
      console.log('Could not auto-create tasks table:', tasksError);
      return false;
    }

    console.log('Database setup completed successfully');
    return true;
  } catch (error) {
    console.log('Database auto-setup not available:', error);
    return false;
  }
}

export function getLocalStorageKey(userId: string, type: string) {
  return `prepverse_${type}_${userId}`;
}

export function saveToLocalStorage(userId: string, type: string, data: any[]) {
  try {
    localStorage.setItem(getLocalStorageKey(userId, type), JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

export function loadFromLocalStorage(userId: string, type: string): any[] {
  try {
    const data = localStorage.getItem(getLocalStorageKey(userId, type));
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return [];
  }
}