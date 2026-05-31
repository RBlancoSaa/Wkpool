-- ============================================================================
-- Seed: de twee pools, hun puntenschema en een set landenteams.
-- Veilig om opnieuw te draaien (idempotent).
-- ============================================================================

-- De twee takken / pools ---------------------------------------------------
insert into public.pools (tier, name, description, entry_fee_cents) values
  ('fun', 'WK Pool — Fun',      'Meedoen voor de gezelligheid. Inleg € 10,- p.p.',   1000),
  ('win', 'WK Pool — Winnen',   'Voor de echte fanatiekelingen. Inleg € 100,- p.p.', 10000)
on conflict (tier) do update
  set name = excluded.name,
      description = excluded.description,
      entry_fee_cents = excluded.entry_fee_cents;

-- Standaard puntenschema per pool ------------------------------------------
insert into public.scoring_rules (pool_id)
select id from public.pools
on conflict (pool_id) do nothing;

-- Landenteams (32) ----------------------------------------------------------
insert into public.teams (name, code, flag_emoji) values
  ('Nederland', 'NED', '🇳🇱'),
  ('Argentinië', 'ARG', '🇦🇷'),
  ('Frankrijk', 'FRA', '🇫🇷'),
  ('Brazilië', 'BRA', '🇧🇷'),
  ('Engeland', 'ENG', '🏴'),
  ('Spanje', 'ESP', '🇪🇸'),
  ('Duitsland', 'GER', '🇩🇪'),
  ('Portugal', 'POR', '🇵🇹'),
  ('België', 'BEL', '🇧🇪'),
  ('Kroatië', 'CRO', '🇭🇷'),
  ('Italië', 'ITA', '🇮🇹'),
  ('Uruguay', 'URU', '🇺🇾'),
  ('Marokko', 'MAR', '🇲🇦'),
  ('Verenigde Staten', 'USA', '🇺🇸'),
  ('Mexico', 'MEX', '🇲🇽'),
  ('Japan', 'JPN', '🇯🇵'),
  ('Zuid-Korea', 'KOR', '🇰🇷'),
  ('Senegal', 'SEN', '🇸🇳'),
  ('Zwitserland', 'SUI', '🇨🇭'),
  ('Denemarken', 'DEN', '🇩🇰'),
  ('Polen', 'POL', '🇵🇱'),
  ('Servië', 'SRB', '🇷🇸'),
  ('Australië', 'AUS', '🇦🇺'),
  ('Canada', 'CAN', '🇨🇦'),
  ('Ecuador', 'ECU', '🇪🇨'),
  ('Ghana', 'GHA', '🇬🇭'),
  ('Kameroen', 'CMR', '🇨🇲'),
  ('Saoedi-Arabië', 'KSA', '🇸🇦'),
  ('Iran', 'IRN', '🇮🇷'),
  ('Tunesië', 'TUN', '🇹🇳'),
  ('Costa Rica', 'CRC', '🇨🇷'),
  ('Qatar', 'QAT', '🇶🇦')
on conflict do nothing;
