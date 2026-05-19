
-- RPC to safely increment XP points and ensure row exists
CREATE OR REPLACE FUNCTION public.increment_xp(p_user_id uuid, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_progress (user_id, xp_points)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id)
  DO UPDATE SET
    xp_points = user_progress.xp_points + p_amount,
    updated_at = now();
END;
$$;

-- Update streak tracking
CREATE OR REPLACE FUNCTION public.update_streak(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  last_date date;
  today date := CURRENT_DATE;
BEGIN
  SELECT last_activity_date::date INTO last_date
  FROM public.user_progress
  WHERE user_id = p_user_id;

  INSERT INTO public.user_progress (user_id, streak_days, last_activity_date)
  VALUES (p_user_id, 1, today)
  ON CONFLICT (user_id)
  DO UPDATE SET
    streak_days = CASE
      WHEN user_progress.last_activity_date::date = today - interval '1 day' THEN user_progress.streak_days + 1
      WHEN user_progress.last_activity_date::date = today THEN user_progress.streak_days
      ELSE 1
    END,
    last_activity_date = today,
    updated_at = now();
END;
$$;
