# ⚽ WK Pool

Een WK-voorspelpool met **twee takken (pools)**:

- 🎉 **Fun** — meedoen voor de gezelligheid (inleg € 10,- p.p.)
- 🏆 **Winnen** — voor de fanatiekelingen (inleg € 100,- p.p.)

Elke deelnemer kiest zelf aan welke pool(s) hij/zij meedoet. **Deelname is
alleen op uitnodiging.**

## Functies

- ✅ Registreren/inloggen met **e-mailadres + wachtwoord** (Supabase Auth)
- ✅ **Alleen op uitnodiging** — registreren kan alleen met een uitnodiging van de beheerder
- ✅ **Twee pools** met eigen inleg en eigen puntenschema
- ✅ **Voorspellen** per wedstrijd: uitslag (toto), exacte score, doelsaldo en "wie scoort als eerste"
- ✅ **Bonusvragen**: wereldkampioen + topscorer
- ✅ **Deadline / vergrendeling**: inleggen kan tot aftrap + speelminuten (standaard 5 min). Daarna sluit het automatisch — afgedwongen in de database (RLS), niet alleen in de browser
- ✅ **Stand / leaderboard**: wie de meeste punten heeft, wint
- ✅ **Deelnemersoverzicht** met betaalstatus en totale pot
- ✅ **Automatische uitslagen** via football-data.org (Edge Function `sync-results`), met handmatige invoer als achtervang
- ✅ **Beheerscherm**: uitnodigingen, uitslagen, puntenschema, kampioen/topscorer, betaalstatus

## Techniek

- **Next.js 14** (App Router, TypeScript) + **Tailwind CSS**
- **Supabase**: Postgres, Auth, Row Level Security, Edge Functions
- De volledige puntentelling draait als databasefuncties/triggers (`supabase/migrations/0002_functions.sql`)

## Installatie

### 1. Supabase-project

Maak een Supabase-project aan en voer de migraties + seed uit, in deze volgorde:

```
supabase/migrations/0001_schema.sql
supabase/migrations/0002_functions.sql
supabase/migrations/0003_rls.sql
supabase/seed.sql
```

(Via de Supabase CLI `supabase db push`, of plak de SQL in de SQL-editor.)

### 2. Eerste beheerder aanmaken

Registreer jezelf in de app (zorg eerst voor een uitnodiging-rij met jouw
e-mail, of voeg die handmatig toe), en zet daarna `is_admin = true`:

```sql
update public.profiles set is_admin = true where id = (
  select id from auth.users where email = 'jouw@email.nl'
);
```

> Tip: om jezelf als eerste te kunnen registreren zonder uitnodiging, voeg je
> eenmalig een rij toe: `insert into public.invitations (email) values ('jouw@email.nl');`

### 3. Edge Function voor automatische uitslagen

```bash
supabase functions deploy sync-results
supabase secrets set FOOTBALL_DATA_API_KEY=... FOOTBALL_DATA_COMPETITION=WC
```

Plan eventueel een cron (bv. elke 10 minuten) of gebruik de knop
"Nu synchroniseren" in het beheerscherm.

### 4. Frontend

```bash
cp .env.example .env.local   # vul de Supabase-waarden in
npm install
npm run dev
```

Open http://localhost:3000

## Puntentelling (standaard, instelbaar per pool)

| Onderdeel              | Punten |
| --------------------- | ------ |
| Juiste uitslag (toto) | 1      |
| Exacte score (extra)  | 3      |
| Juist doelsaldo (extra) | 1    |
| Eerste doelpuntenmaker | 1     |
| Wereldkampioen (bonus) | 10    |
| Topscorer (bonus)     | 5      |

De beheerder kan deze waarden per pool aanpassen in het beheerscherm.

## Beveiliging / eerlijk spel

- Voorspellingen van andere spelers zijn pas zichtbaar **nadat een wedstrijd
  vergrendeld is** (Row Level Security).
- Na de deadline kan niemand — ook niet via de API — nog een voorspelling
  invoeren of wijzigen.
