
-- Allow authenticated users to view any profile (needed for leaderboard)
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Ensure placement_personas has unique constraint for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'placement_personas'
    AND constraint_type = 'UNIQUE'
    AND constraint_name = 'placement_personas_user_id_key'
  ) THEN
    ALTER TABLE public.placement_personas ADD CONSTRAINT placement_personas_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Ensure user_progress has unique constraint for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'user_progress'
    AND constraint_type = 'UNIQUE'
    AND constraint_name = 'user_progress_user_id_key'
  ) THEN
    ALTER TABLE public.user_progress ADD CONSTRAINT user_progress_user_id_key UNIQUE (user_id);
  END IF;
END $$;
