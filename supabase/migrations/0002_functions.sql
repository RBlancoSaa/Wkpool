-- ============================================================================
-- Functies: deadline-controle, automatische profielaanmaak en puntentelling
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Is het inleggen voor een wedstrijd gesloten?
-- Gesloten zodra now() >= kickoff + lock_minutes.
-- ---------------------------------------------------------------------------
create or replace function public.match_locked(p_match_id uuid)
returns boolean
language sql
stable
as $$
  select now() >= (m.kickoff + make_interval(mins => m.lock_minutes))
  from public.matches m
  where m.id = p_match_id;
$$;

-- ---------------------------------------------------------------------------
-- Maak automatisch een profielrij aan bij een nieuwe auth-gebruiker.
-- Koppelt meteen een eventuele uitnodiging aan het account.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;

  update public.invitations
  set accepted_by = new.id,
      accepted_at = now()
  where accepted_by is null
    and lower(email) = lower(new.email);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Bereken de punten van één voorspelling t.o.v. de werkelijke uitslag.
-- ---------------------------------------------------------------------------
create or replace function public.compute_prediction_points(
  p_pred_home   integer,
  p_pred_away   integer,
  p_pred_scorer uuid,
  p_real_home   integer,
  p_real_away   integer,
  p_real_scorer uuid,
  p_rules       public.scoring_rules
)
returns integer
language plpgsql
immutable
as $$
declare
  pts integer := 0;
begin
  if p_real_home is null or p_real_away is null then
    return 0;
  end if;

  -- Juiste uitslag (toto: zelfde teken van het verschil)
  if sign(p_pred_home - p_pred_away) = sign(p_real_home - p_real_away) then
    pts := pts + p_rules.points_toto;
  end if;

  -- Exacte score (extra bovenop toto)
  if p_pred_home = p_real_home and p_pred_away = p_real_away then
    pts := pts + p_rules.points_exact;
  end if;

  -- Juist doelsaldo (extra)
  if (p_pred_home - p_pred_away) = (p_real_home - p_real_away) then
    pts := pts + p_rules.points_goal_diff;
  end if;

  -- Juiste eerste doelpuntenmaker (team)
  if p_pred_scorer is not null
     and p_real_scorer is not null
     and p_pred_scorer = p_real_scorer then
    pts := pts + p_rules.points_scorer;
  end if;

  return pts;
end;
$$;

-- ---------------------------------------------------------------------------
-- Herbereken alle punten voor één wedstrijd.
-- ---------------------------------------------------------------------------
create or replace function public.score_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.matches;
begin
  select * into m from public.matches where id = p_match_id;
  if not found then return; end if;

  update public.predictions p
  set points = public.compute_prediction_points(
        p.home_score, p.away_score, p.scorer_team_id,
        m.home_score, m.away_score, null::uuid, r)
  from public.scoring_rules r
  where p.match_id = p_match_id
    and r.pool_id = p.pool_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Trigger: zodra een uitslag wordt ingevuld/gewijzigd, herbereken de punten.
-- ---------------------------------------------------------------------------
create or replace function public.on_match_result_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.home_score is distinct from old.home_score
     or new.away_score is distinct from old.away_score then
    perform public.score_match(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_match_result on public.matches;
create trigger trg_match_result
  after update on public.matches
  for each row execute function public.on_match_result_change();

-- ---------------------------------------------------------------------------
-- Herbereken de bonuspunten (kampioen + topscorer) voor alle deelnemers.
-- ---------------------------------------------------------------------------
create or replace function public.score_bonus()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.tournament;
begin
  select * into t from public.tournament where id = 1;

  update public.bonus_predictions b
  set points = (
        case when t.champion_team_id is not null
                  and b.champion_team_id = t.champion_team_id
             then (select points_champion from public.scoring_rules r where r.pool_id = b.pool_id)
             else 0 end
      ) + (
        case when t.top_scorer is not null
                  and lower(trim(b.top_scorer)) = lower(trim(t.top_scorer))
             then (select points_top_scorer from public.scoring_rules r where r.pool_id = b.pool_id)
             else 0 end
      );
end;
$$;

create or replace function public.on_tournament_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.score_bonus();
  return new;
end;
$$;

drop trigger if exists trg_tournament on public.tournament;
create trigger trg_tournament
  after update on public.tournament
  for each row execute function public.on_tournament_change();

-- ---------------------------------------------------------------------------
-- Standen-view: totaal per gebruiker per pool (wedstrijd- + bonuspunten).
-- ---------------------------------------------------------------------------
create or replace view public.standings as
select
  pm.pool_id,
  pm.user_id,
  pr.full_name,
  coalesce(mp.match_points, 0) + coalesce(bp.points, 0) as total_points,
  coalesce(mp.match_points, 0) as match_points,
  coalesce(bp.points, 0)       as bonus_points,
  coalesce(mp.predictions_made, 0) as predictions_made
from public.pool_members pm
join public.profiles pr on pr.id = pm.user_id
left join lateral (
  select sum(p.points) as match_points, count(*) as predictions_made
  from public.predictions p
  where p.user_id = pm.user_id and p.pool_id = pm.pool_id
) mp on true
left join public.bonus_predictions bp
  on bp.user_id = pm.user_id and bp.pool_id = pm.pool_id;
