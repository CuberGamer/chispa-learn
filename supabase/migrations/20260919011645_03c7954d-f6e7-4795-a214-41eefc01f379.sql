ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;

CREATE TABLE public.topic_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.study_sessions(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (topic_id, sender_id, receiver_id)
);

GRANT SELECT, INSERT, DELETE ON public.topic_invites TO authenticated;
GRANT ALL ON public.topic_invites TO service_role;

ALTER TABLE public.topic_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY invites_insert_own ON public.topic_invites
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.user_follows f
      WHERE f.follower_id = auth.uid() AND f.following_id = receiver_id
    )
  );

CREATE POLICY invites_select_involved ON public.topic_invites
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY invites_delete_involved ON public.topic_invites
  FOR DELETE TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE INDEX topic_invites_receiver_idx ON public.topic_invites (receiver_id, created_at DESC);
CREATE INDEX topic_invites_sender_idx ON public.topic_invites (sender_id, created_at DESC);