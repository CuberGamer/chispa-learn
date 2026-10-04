CREATE TABLE public.topic_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  topic_a uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  topic_b uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'manual' CHECK (kind IN ('manual','ignorada')),
  label text CHECK (label IS NULL OR char_length(label) <= 120),
  strength integer NOT NULL DEFAULT 5 CHECK (strength BETWEEN 1 AND 10),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, topic_a, topic_b, kind)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.topic_links TO authenticated;
GRANT ALL ON public.topic_links TO service_role;
ALTER TABLE public.topic_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY topic_links_own ON public.topic_links FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);