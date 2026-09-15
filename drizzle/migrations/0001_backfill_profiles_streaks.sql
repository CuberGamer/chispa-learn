INSERT INTO public.profiles (id, username)
SELECT u.id, COALESCE(NULLIF(u.raw_user_meta_data->>'username',''), NULLIF(u.raw_user_meta_data->>'full_name',''), split_part(u.email,'@',1), 'chispa')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

INSERT INTO public.streaks (user_id)
SELECT u.id FROM auth.users u
LEFT JOIN public.streaks s ON s.user_id = u.id
WHERE s.user_id IS NULL;