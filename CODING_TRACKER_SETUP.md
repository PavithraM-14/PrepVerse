# Coding Tracker Database Setup

## Issue
The Coding Tracker can't add problems because the `coding_problems` table doesn't exist in your Supabase database.

## Quick Fix (2 minutes)

### Option 1: Create the Table in Supabase
1. **Go to Supabase Dashboard**: https://supabase.com/dashboard/project/frztnflswxgqadmcrmum
2. **Open SQL Editor** (left sidebar)
3. **Copy and paste this SQL**:

```sql
-- Create coding_problems table
CREATE TABLE coding_problems (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    problem_name TEXT NOT NULL,
    platform TEXT,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    topic TEXT,
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'solved')),
    notes TEXT,
    solved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE coding_problems ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own problems
CREATE POLICY "Users can manage their own coding problems" ON coding_problems
    FOR ALL USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_coding_problems_user_id ON coding_problems(user_id);
CREATE INDEX idx_coding_problems_status ON coding_problems(user_id, status);
```

4. **Click "Run"**
5. **Refresh your app** - Coding Tracker should now work!

### Option 2: Temporary Workaround (Already Implemented)
If you don't want to create the table right now, the app will automatically:
- Store coding problems as tasks with category "coding"
- Still track your problems and progress
- Show a message indicating the proper table should be created

## Verification
After creating the table:
1. Go to Coding Tracker
2. Try adding a problem (e.g., "Two Sum", LeetCode, Easy, Arrays)
3. Click "Add" - should work without errors
4. Problem should appear in the table below

## Troubleshooting
- **Still not working?** Check browser console (F12) for error messages
- **Permission errors?** Make sure RLS policies are created correctly
- **Need help?** Share the specific error message