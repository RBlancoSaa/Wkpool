-- ============================================================================
-- Row Level Security (RLS): toegangsregels per tabel
-- ============================================================================

alter table public.profiles          enable row level security;
alter table public.pools             enable row level security;
alter table public.scoring_rules     enable row level security;
alter table public.invitations       enable row level security;
alter table public.pool_members      enable row level security;
alter table public.teams             enable row level security;
alter table public.matches           enable row level security;
alter table public.predictions       enable row level security;
alter table public.bonus_predictions enable row level security;
alter table public.tournament        enable row level security;

-- Helper: is de huidige gebruiker beheerder?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Helper: is de huidige gebruiker lid van deze pool?
create or replace function public.is_pool_member(p_pool_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.pool_members
    where pool_id = p_pool_id and user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy "profiles_select_authenticated"
  on public.profiles for select to authenticated using (true);

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "profiles_admin_all"
  on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- pools + scoring_rules (lezen voor iedereen die is ingelogd; beheren = admin)
-- ---------------------------------------------------------------------------
create policy "pools_select" on public.pools for select to authenticated using (true);
create policy "pools_admin"  on public.pools for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "rules_select" on public.scoring_rules for select to authenticated using (true);
create policy "rules_admin"  on public.scoring_rules for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- teams + matches (lezen voor iedereen; beheren = admin / edge function)
-- ---------------------------------------------------------------------------
create policy "teams_select" on public.teams for select to authenticated using (true);
create policy "teams_admin"  on public.teams for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "matches_select" on public.matches for select to authenticated using (true);
create policy "matches_admin"  on public.matches for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- invitations: alleen beheerder beheert; gebruiker mag de eigen (op e-mail) zien
-- ---------------------------------------------------------------------------
create policy "invitations_admin" on public.invitations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- pool_members
--   * iedereen die lid is van een pool ziet de andere leden (overzicht)
--   * je mag jezelf lid maken (toetreden); admin mag alles (bv. "betaald" zetten)
-- ---------------------------------------------------------------------------
create policy "members_select" on public.pool_members for select to authenticated
  using (public.is_pool_member(pool_id) or public.is_admin());

create policy "members_join_self" on public.pool_members for insert to authenticated
  with check (user_id = auth.uid());

create policy "members_leave_self" on public.pool_members for delete to authenticated
  using (user_id = auth.uid());

create policy "members_admin" on public.pool_members for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- predictions
--   * leden van de pool zien elkaars voorspellingen PAS nadat de wedstrijd
--     vergrendeld is (anders alleen je eigen) — eerlijk spel
--   * invoeren/wijzigen mag alleen voor je eigen pool en vóór de deadline
-- ---------------------------------------------------------------------------
create policy "predictions_select_own"
  on public.predictions for select to authenticated
  using (user_id = auth.uid());

create policy "predictions_select_after_lock"
  on public.predictions for select to authenticated
  using (public.is_pool_member(pool_id) and public.match_locked(match_id));

create policy "predictions_admin_select"
  on public.predictions for select to authenticated
  using (public.is_admin());

create policy "predictions_insert_own"
  on public.predictions for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_pool_member(pool_id)
    and not public.match_locked(match_id)
  );

create policy "predictions_update_own"
  on public.predictions for update to authenticated
  using (user_id = auth.uid() and not public.match_locked(match_id))
  with check (user_id = auth.uid() and not public.match_locked(match_id));

-- ---------------------------------------------------------------------------
-- bonus_predictions (kampioen + topscorer)
--   * lezen: je eigen, of na de bonus-deadline alle leden van je pool
--   * schrijven: je eigen, zolang de bonus nog niet vergrendeld is
-- ---------------------------------------------------------------------------
create or replace function public.bonus_locked()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select now() >= bonus_locked_at from public.tournament where id = 1
      and bonus_locked_at is not null),
    false);
$$;

create policy "bonus_select_own"
  on public.bonus_predictions for select to authenticated
  using (user_id = auth.uid());

create policy "bonus_select_after_lock"
  on public.bonus_predictions for select to authenticated
  using (public.is_pool_member(pool_id) and public.bonus_locked());

create policy "bonus_admin_select"
  on public.bonus_predictions for select to authenticated
  using (public.is_admin());

create policy "bonus_insert_own"
  on public.bonus_predictions for insert to authenticated
  with check (user_id = auth.uid() and public.is_pool_member(pool_id) and not public.bonus_locked());

create policy "bonus_update_own"
  on public.bonus_predictions for update to authenticated
  using (user_id = auth.uid() and not public.bonus_locked())
  with check (user_id = auth.uid() and not public.bonus_locked());

-- ---------------------------------------------------------------------------
-- tournament (lezen voor iedereen; beheren = admin)
-- ---------------------------------------------------------------------------
create policy "tournament_select" on public.tournament for select to authenticated using (true);
create policy "tournament_admin"  on public.tournament for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
