-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username TEXT NOT NULL,
  avatar_chispa_skin TEXT NOT NULL DEFAULT 'clasico',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.streaks (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- TOPICS
CREATE TABLE public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL UNIQUE,
  description TEXT,
  source TEXT NOT NULL DEFAULT 'curado' CHECK (source IN ('curado','ia_generado','usuario')),
  duration_suggested INTEGER NOT NULL DEFAULT 15,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.topics TO anon;
GRANT SELECT ON public.topics TO authenticated;
GRANT ALL ON public.topics TO service_role;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "topics_public_read" ON public.topics FOR SELECT USING (true);

-- TAGS
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);
GRANT SELECT ON public.tags TO anon;
GRANT SELECT ON public.tags TO authenticated;
GRANT ALL ON public.tags TO service_role;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tags_public_read" ON public.tags FOR SELECT USING (true);

CREATE TABLE public.topic_tags (
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (topic_id, tag_id)
);
GRANT SELECT ON public.topic_tags TO anon;
GRANT SELECT ON public.topic_tags TO authenticated;
GRANT ALL ON public.topic_tags TO service_role;
ALTER TABLE public.topic_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "topic_tags_public_read" ON public.topic_tags FOR SELECT USING (true);

-- STUDY SESSIONS
CREATE TABLE public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL,
  explanation_text TEXT,
  explanation_audio_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX study_sessions_user_created_idx ON public.study_sessions (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_sessions TO authenticated;
GRANT ALL ON public.study_sessions TO service_role;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_select_own" ON public.study_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "sessions_select_public" ON public.study_sessions FOR SELECT TO authenticated USING (is_public = true);
CREATE POLICY "sessions_insert_own" ON public.study_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions_update_own" ON public.study_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions_delete_own" ON public.study_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- STREAKS
CREATE TABLE public.streaks (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_study_date DATE
);
GRANT SELECT, INSERT, UPDATE ON public.streaks TO authenticated;
GRANT ALL ON public.streaks TO service_role;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "streaks_select_own" ON public.streaks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "streaks_insert_own" ON public.streaks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "streaks_update_own" ON public.streaks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ACHIEVEMENTS
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'sparkles'
);
GRANT SELECT ON public.achievements TO anon;
GRANT SELECT ON public.achievements TO authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements_public_read" ON public.achievements FOR SELECT USING (true);

CREATE TABLE public.user_achievements (
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);
GRANT SELECT, INSERT ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_achievements_select_own" ON public.user_achievements FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_achievements_insert_own" ON public.user_achievements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- SEED TAGS
INSERT INTO public.tags (name) VALUES
  ('historia'),('matemática'),('ciencia'),('programación'),('ia'),
  ('cultura'),('filosofía'),('economía'),('arte'),('biología');

-- SEED TOPICS
INSERT INTO public.topics (title, description, duration_suggested) VALUES
  ('La Revolución de Mayo', 'Qué pasó en mayo de 1810 y por qué importa.', 15),
  ('¿Qué es un número primo?', 'Definición, ejemplos y por qué son la base de la criptografía.', 5),
  ('Cómo funciona una vacuna', 'El mecanismo del sistema inmune detrás de las vacunas.', 15),
  ('Qué es una API', 'Cómo dos programas se hablan entre sí.', 15),
  ('Cómo aprende una red neuronal', 'Pesos, errores y ajuste: la intuición del entrenamiento.', 30),
  ('El origen del alfabeto', 'De los fenicios a las letras que usás hoy.', 15),
  ('La paradoja de la nave de Teseo', 'Identidad, cambio y qué significa ser "el mismo".', 15),
  ('Qué es la inflación', 'Por qué los precios suben y qué la provoca.', 15),
  ('El impresionismo', 'Qué rompieron Monet y compañía.', 15),
  ('Cómo se copia el ADN', 'Replicación celular explicada simple.', 30),
  ('El teorema de Pitágoras', 'Por qué funciona, no solo cómo se usa.', 5),
  ('La Guerra Fría en 15 minutos', 'Bloques, carrera espacial y tensión nuclear.', 15),
  ('Qué es el efecto invernadero', 'Física simple del clima de la Tierra.', 15),
  ('Recursividad en programación', 'Funciones que se llaman a sí mismas.', 15),
  ('Qué es un token en un modelo de lenguaje', 'La unidad mínima con la que "lee" una IA.', 15),
  ('El mito de Sísifo', 'La lectura de Camus sobre el absurdo.', 15),
  ('Oferta y demanda', 'Cómo se forma un precio en un mercado.', 15),
  ('La perspectiva en el Renacimiento', 'Cómo se conquistó la tercera dimensión.', 15),
  ('Fotosíntesis', 'Cómo una planta convierte luz en comida.', 15),
  ('Qué es el infinito', 'Cardinalidad, Cantor y los distintos infinitos.', 30),
  ('La Ruta de la Seda', 'Comercio, ideas y enfermedades entre Oriente y Occidente.', 15),
  ('Control de versiones con Git', 'Commits, ramas y por qué existen.', 15),
  ('Sesgo en los datos', 'Cómo un dataset injusto produce decisiones injustas.', 15),
  ('El sistema circulatorio', 'El recorrido de la sangre por tu cuerpo.', 15);

INSERT INTO public.topic_tags (topic_id, tag_id)
SELECT t.id, g.id FROM public.topics t
JOIN public.tags g ON g.name = CASE t.title
  WHEN 'La Revolución de Mayo' THEN 'historia'
  WHEN '¿Qué es un número primo?' THEN 'matemática'
  WHEN 'Cómo funciona una vacuna' THEN 'biología'
  WHEN 'Qué es una API' THEN 'programación'
  WHEN 'Cómo aprende una red neuronal' THEN 'ia'
  WHEN 'El origen del alfabeto' THEN 'cultura'
  WHEN 'La paradoja de la nave de Teseo' THEN 'filosofía'
  WHEN 'Qué es la inflación' THEN 'economía'
  WHEN 'El impresionismo' THEN 'arte'
  WHEN 'Cómo se copia el ADN' THEN 'biología'
  WHEN 'El teorema de Pitágoras' THEN 'matemática'
  WHEN 'La Guerra Fría en 15 minutos' THEN 'historia'
  WHEN 'Qué es el efecto invernadero' THEN 'ciencia'
  WHEN 'Recursividad en programación' THEN 'programación'
  WHEN 'Qué es un token en un modelo de lenguaje' THEN 'ia'
  WHEN 'El mito de Sísifo' THEN 'filosofía'
  WHEN 'Oferta y demanda' THEN 'economía'
  WHEN 'La perspectiva en el Renacimiento' THEN 'arte'
  WHEN 'Fotosíntesis' THEN 'biología'
  WHEN 'Qué es el infinito' THEN 'matemática'
  WHEN 'La Ruta de la Seda' THEN 'historia'
  WHEN 'Control de versiones con Git' THEN 'programación'
  WHEN 'Sesgo en los datos' THEN 'ia'
  WHEN 'El sistema circulatorio' THEN 'biología'
END;

INSERT INTO public.achievements (name, description, icon) VALUES
  ('Primera chispa', 'Completaste tu primera sesión de estudio.', 'zap'),
  ('Diez temas', 'Estudiaste 10 temas distintos.', 'library'),
  ('Racha de 7', 'Estudiaste 7 días consecutivos.', 'flame'),
  ('Maratón', 'Acumulaste 5 horas de estudio.', 'clock'),
  ('Explicador', 'Escribiste una explicación de más de 1000 caracteres.', 'pen');