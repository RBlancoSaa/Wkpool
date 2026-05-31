-- ============================================================================
-- Beheerder via uitnodiging: een uitnodiging kan iemand meteen admin maken.
-- ============================================================================
alter table public.invitations
  add column if not exists is_admin boolean not null default false;

-- handle_new_user neemt de admin-vlag uit de openstaande uitnodiging over.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inv_admin boolean := false;
begin
  select coalesce(bool_or(is_admin), false) into inv_admin
  from public.invitations
  where accepted_by is null and lower(email) = lower(new.email);

  insert into public.profiles (id, full_name, is_admin)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), inv_admin)
  on conflict (id) do nothing;

  update public.invitations
  set accepted_by = new.id, accepted_at = now()
  where accepted_by is null and lower(email) = lower(new.email);

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from anon, authenticated;
