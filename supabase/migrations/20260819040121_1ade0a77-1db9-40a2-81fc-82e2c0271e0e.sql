-- Comentarios en explicaciones públicas
CREATE TABLE public.session_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.study_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_comments TO authenticated;
GRANT ALL ON public.session_comments TO service_role;
ALTER TABLE public.session_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY comments_select_public ON public.session_comments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.study_sessions s WHERE s.id = session_id AND (s.is_public = true OR s.user_id = auth.uid())));
CREATE POLICY comments_insert_own ON public.session_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.study_sessions s WHERE s.id = session_id AND s.is_public = true));
CREATE POLICY comments_delete_own ON public.session_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.study_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));
CREATE INDEX session_comments_session_idx ON public.session_comments(session_id, created_at DESC);

-- Favoritos
CREATE TABLE public.session_favorites (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.study_sessions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, session_id)
);
GRANT SELECT, INSERT, DELETE ON public.session_favorites TO authenticated;
GRANT ALL ON public.session_favorites TO service_role;
ALTER TABLE public.session_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY favorites_select_own ON public.session_favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY favorites_insert_own ON public.session_favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY favorites_delete_own ON public.session_favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Seguir usuarios
CREATE TABLE public.user_follows (
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id <> following_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_follows TO authenticated;
GRANT ALL ON public.user_follows TO service_role;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY follows_select_authenticated ON public.user_follows FOR SELECT TO authenticated USING (true);
CREATE POLICY follows_insert_own ON public.user_follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY follows_delete_own ON public.user_follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- Reportes de contenido
CREATE TABLE public.content_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.study_sessions(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pendiente',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, reporter_id)
);
GRANT SELECT, INSERT ON public.content_reports TO authenticated;
GRANT ALL ON public.content_reports TO service_role;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY reports_select_own ON public.content_reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id);
CREATE POLICY reports_insert_own ON public.content_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);

-- Perfiles visibles para cuentas registradas (nombre, foto y skin)
CREATE POLICY profiles_select_authenticated ON public.profiles FOR SELECT TO authenticated USING (true);
-- Rachas y logros visibles en el perfil público
CREATE POLICY streaks_select_authenticated ON public.streaks FOR SELECT TO authenticated USING (true);
CREATE POLICY user_achievements_select_authenticated ON public.user_achievements FOR SELECT TO authenticated USING (true);