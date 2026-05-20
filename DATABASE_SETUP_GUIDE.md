# 🚀 PrepVerse Database Setup Guide

## The Issue
Your Supabase database is missing the required tables. This is why you're getting the "relation 'tasks' does not exist" error.

## ⚡ Quick Fix (2 minutes)

### Step 1: Go to Supabase Dashboard
1. Open https://supabase.com/dashboard
2. Select your PrepVerse project
3. Click **"SQL Editor"** in the left sidebar

### Step 2: Run the Setup Script
1. Copy the entire contents of `complete-database-setup.sql`
2. Paste it into the SQL Editor
3. Click **"Run"** button
4. Wait for "All PrepVerse database tables created successfully!" message

### Step 3: Test Your App
1. Refresh your PrepVerse app: http://127.0.0.1:5174/
2. Go to **Smart Study Planner**
3. Try adding a task with a reminder time
4. Should work perfectly! ✅

## 📋 What Gets Created

The script creates these tables:
- ✅ **tasks** - For study planner and task management
- ✅ **coding_problems** - For coding tracker
- ✅ **user_progress** - For XP, levels, streaks
- ✅ **notifications** - For task reminders
- ✅ **placement_personas** - For AI roadmaps
- ✅ **resume_analyses** - For resume analyzer history
- ✅ **study_sessions** - For study tracking
- ✅ **quiz_attempts** - For quiz history

Plus:
- 🔒 **Row Level Security (RLS)** policies
- 📊 **Performance indexes**
- ⚡ **XP increment function**

## 🎯 After Setup

Once you run the script, all features will work:
- ✅ Adding tasks with reminders
- ✅ Notification system for overdue tasks
- ✅ Coding problem tracking
- ✅ XP and level progression
- ✅ Resume analysis history
- ✅ AI roadmap generation

## 🆘 Troubleshooting

**If you get permission errors:**
- Make sure you're logged into the correct Supabase project
- Check that you have admin access to the project

**If some tables already exist:**
- The script uses `IF NOT EXISTS` so it's safe to run multiple times
- Existing data won't be affected

**Still having issues?**
- Check the SQL Editor for specific error messages
- Make sure you copied the entire script

## ✨ That's It!

After running the SQL script, your PrepVerse app will have full functionality with proper database support.