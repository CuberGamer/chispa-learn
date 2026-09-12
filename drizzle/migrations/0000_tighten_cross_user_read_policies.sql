create or replace function public.is_public_author(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.study_sessions s
    where s.user_id = _user_id and s.is_public = true
  )
$$;

drop policy if exists "profiles_select_authenticated" on public.profiles;

drop policy if exists "streaks_select_authenticated" on public.streaks;
create policy "streaks_select_public_authors"
on public.streaks for select to authenticated
using (public.is_public_author(user_id));

drop policy if exists "user_achievements_select_authenticated" on public.user_achievements;
create policy "user_achievements_select_public_authors"
on public.user_achievements for select to authenticated
using (public.is_public_author(user_id));

drop policy if exists "follows_select_authenticated" on public.user_follows;
create policy "follows_select_involved_or_public_authors"
on public.user_follows for select to authenticated
using (
  auth.uid() in (follower_id, following_id)
  or public.is_public_author(follower_id)
  or public.is_public_author(following_id)
);

drop policy if exists "claps_select_authenticated" on public.session_claps;
create policy "claps_select_public_or_own"
on public.session_claps for select to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.study_sessions s
    where s.id = session_claps.session_id
      and (s.is_public = true or s.user_id = auth.uid())
  )
);