ALTER TABLE public.study_sessions
  ADD COLUMN IF NOT EXISTS ai_score integer,
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS ai_strengths text[],
  ADD COLUMN IF NOT EXISTS ai_improvements text[],
  ADD COLUMN IF NOT EXISTS ai_questions text[];

ALTER TABLE public.study_sessions
  ADD CONSTRAINT study_sessions_ai_score_range CHECK (ai_score IS NULL OR (ai_score >= 0 AND ai_score <= 100));