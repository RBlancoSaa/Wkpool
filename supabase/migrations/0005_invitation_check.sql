-- ============================================================================
-- Registratiecontrole zonder service-role sleutel.
-- Een nog-niet-ingelogde bezoeker kan checken of er een openstaande
-- uitnodiging is voor zijn e-mailadres (deelname is alleen op uitnodiging).
-- Geeft alleen true/false terug, geen verdere gegevens.
-- ============================================================================
create or replace function public.has_open_invitation(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.invitations
    where accepted_by is null
      and lower(email) = lower(trim(p_email))
  );
$$;

revoke execute on function public.has_open_invitation(text) from public;
grant execute on function public.has_open_invitation(text) to anon, authenticated;
