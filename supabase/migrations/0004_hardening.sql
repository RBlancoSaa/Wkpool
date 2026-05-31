-- ============================================================================
-- Beveiligingsverharding (n.a.v. Supabase database-linter)
-- - Vast search_path op functies die dat nog misten
-- - Interne reken-/triggerfuncties niet rechtstreeks aanroepbaar via de API
-- ============================================================================

-- Vast search_path (voorkomt search_path-hijacking)
alter function public.match_locked(uuid) set search_path = public;
alter function public.compute_prediction_points(integer, integer, uuid, integer, integer, uuid, public.scoring_rules) set search_path = public;

-- Interne functies horen alleen via triggers/server te draaien, niet via /rpc.
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.on_match_result_change() from anon, authenticated;
revoke execute on function public.on_tournament_change() from anon, authenticated;
revoke execute on function public.score_match(uuid) from anon, authenticated;
revoke execute on function public.score_bonus() from anon, authenticated;
revoke execute on function public.compute_prediction_points(integer, integer, uuid, integer, integer, uuid, public.scoring_rules) from anon, authenticated;

-- is_admin / is_pool_member / match_locked / bonus_locked blijven uitvoerbaar:
-- ze worden binnen de RLS-policies aangeroepen en geven niets gevoeligs prijs.
