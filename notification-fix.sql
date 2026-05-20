-- Optional: Add notification_sent column to tasks table for better notification tracking
-- Run this in Supabase SQL Editor if you want to improve notification handling

-- Add notification_sent column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT FALSE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_notification_sent ON tasks(user_id, notification_sent, reminder_time);

-- Update existing tasks to have notification_sent = false
UPDATE tasks SET notification_sent = FALSE WHERE notification_sent IS NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'tasks' AND column_name = 'notification_sent';