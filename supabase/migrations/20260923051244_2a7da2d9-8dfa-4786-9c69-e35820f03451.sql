ALTER TABLE public.topics
ADD COLUMN icon text NOT NULL DEFAULT 'libro';

ALTER TABLE public.topics
ADD CONSTRAINT topics_icon_length_check CHECK (char_length(icon) BETWEEN 1 AND 40);