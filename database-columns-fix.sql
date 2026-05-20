-- Fix missing columns in tasks table
-- Run this in your Supabase SQL Editor to add missing columns

-- Add reminder_time column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_time TIMESTAMPTZ;

-- Add notification_sent column to tasks table  
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT FALSE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_reminder_time ON tasks(user_id, reminder_time) WHERE reminder_time IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_notification_sent ON tasks(user_id, notification_sent, reminder_time);

-- Update existing tasks to have notification_sent = false
UPDATE tasks SET notification_sent = FALSE WHERE notification_sent IS NULL;

-- Verify columns were added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
AND column_name IN ('reminder_time', 'notification_sent')
ORDER BY column_name;