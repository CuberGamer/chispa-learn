ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

DROP POLICY IF EXISTS "Avatares visibles para usuarios registrados" ON storage.objects;
CREATE POLICY "Avatares visibles para usuarios registrados"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Subir mi avatar" ON storage.objects;
CREATE POLICY "Subir mi avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Actualizar mi avatar" ON storage.objects;
CREATE POLICY "Actualizar mi avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Borrar mi avatar" ON storage.objects;
CREATE POLICY "Borrar mi avatar"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Lectura pública (sin cuenta) de explicaciones compartidas, para links compartibles
GRANT SELECT ON public.study_sessions TO anon;
DROP POLICY IF EXISTS "Explicaciones públicas visibles sin cuenta" ON public.study_sessions;
CREATE POLICY "Explicaciones públicas visibles sin cuenta"
ON public.study_sessions FOR SELECT TO anon
USING (is_public = true);

GRANT SELECT ON public.profiles TO anon;
DROP POLICY IF EXISTS "Autores de explicaciones públicas visibles sin cuenta" ON public.profiles;
CREATE POLICY "Autores de explicaciones públicas visibles sin cuenta"
ON public.profiles FOR SELECT TO anon
USING (EXISTS (
  SELECT 1 FROM public.study_sessions s
  WHERE s.user_id = profiles.id AND s.is_public = true
));

GRANT SELECT ON public.topics TO anon;
DROP POLICY IF EXISTS "Temas visibles sin cuenta" ON public.topics;
CREATE POLICY "Temas visibles sin cuenta"
ON public.topics FOR SELECT TO anon
USING (true);