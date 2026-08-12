ALTER TABLE public.study_sessions
  DROP COLUMN IF EXISTS ai_score,
  DROP COLUMN IF EXISTS ai_summary,
  DROP COLUMN IF EXISTS ai_strengths,
  DROP COLUMN IF EXISTS ai_improvements,
  DROP COLUMN IF EXISTS ai_questions;

CREATE POLICY "profiles_select_public_authors" ON public.profiles
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.study_sessions s
    WHERE s.user_id = profiles.id AND s.is_public = true
  ));

CREATE TABLE public.session_claps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.study_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.session_claps TO authenticated;
GRANT ALL ON public.session_claps TO service_role;

ALTER TABLE public.session_claps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "claps_select_authenticated" ON public.session_claps
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "claps_insert_own" ON public.session_claps
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "claps_delete_own" ON public.session_claps
  FOR DELETE TO authenticated USING (auth.uid() = user_id);