-- ============================================================================
--  EL PRODE 2026 — Esquema de base de datos (Supabase / Postgres)
--  Pegá TODO este archivo en:  Supabase > SQL Editor > New query > Run
--  Es idempotente: lo podés correr más de una vez sin romper nada.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
--  TABLAS
-- ----------------------------------------------------------------------------

-- Perfil público de cada usuario (se crea solo al registrarse, ver trigger).
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null default 'Jugador',
  is_site_admin boolean not null default false,   -- puede cargar resultados
  created_at    timestamptz not null default now()
);

-- El fixture. Lo llena el seed (seed_fixture.mjs) con el service_role key.
create table if not exists public.matches (
  id            integer primary key,              -- índice estable del fixture
  stage         text not null,                    -- group | r32 | r16 | qf | sf | third | final
  group_label   text,                             -- 'A'..'L' (solo fase de grupos)
  round_label   text,                             -- 'Matchday 1', 'Round of 32', etc.
  team1         text not null,                     -- nombre real o placeholder ('2A','W74')
  team2         text not null,
  is_placeholder boolean not null default false,   -- true en eliminatorias sin equipo definido
  venue         text,
  kickoff       timestamptz not null,             -- arranque en UTC = momento de cierre
  home_score    integer,
  away_score    integer,
  status        text not null default 'scheduled' -- scheduled | finished
);
create index if not exists matches_kickoff_idx on public.matches(kickoff);

-- Ligas privadas (los grupos de amigos).
create table if not exists public.leagues (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  owner        uuid not null references public.profiles(id) on delete cascade,
  join_code    text not null unique,
  pts_exact    integer not null default 3,        -- puntaje configurable por liga
  pts_outcome  integer not null default 1,
  created_at   timestamptz not null default now()
);

create table if not exists public.league_members (
  league_id  uuid not null references public.leagues(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (league_id, user_id)
);

-- Un pronóstico por usuario por partido (vale para todas sus ligas).
create table if not exists public.predictions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  match_id   integer not null references public.matches(id) on delete cascade,
  pred_home  integer not null check (pred_home between 0 and 30),
  pred_away  integer not null check (pred_away between 0 and 30),
  updated_at timestamptz not null default now(),
  unique (user_id, match_id)
);

-- ----------------------------------------------------------------------------
--  PUNTAJE  (+3 marcador exacto · +1 resultado · 0 si no)
-- ----------------------------------------------------------------------------
create or replace function public.points_for(
  ph int, pa int, hs int, ha int, p_exact int, p_outcome int
) returns int language sql immutable as $$
  select case
    when hs is null or ha is null then 0
    when ph = hs and pa = ha then p_exact
    when sign(ph - pa) = sign(hs - ha) then p_outcome
    else 0
  end;
$$;

-- ----------------------------------------------------------------------------
--  TRIGGER: crear perfil automáticamente al registrarse
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', 'Jugador'))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
--  RPCs (todas SECURITY DEFINER: corren con permisos elevados pero
--  verifican quién llama, así exponemos solo lo justo)
-- ----------------------------------------------------------------------------

-- Crear liga: genera código, suma al creador como miembro.
create or replace function public.create_league(p_name text)
returns public.leagues language plpgsql security definer set search_path = public as $$
declare v_code text; v_row public.leagues;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  loop
    v_code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
    exit when not exists (select 1 from leagues where join_code = v_code);
  end loop;
  insert into leagues (name, owner, join_code)
  values (nullif(trim(p_name),''), auth.uid(), v_code)
  returning * into v_row;
  insert into league_members (league_id, user_id) values (v_row.id, auth.uid());
  return v_row;
end;
$$;

-- Unirse a una liga por código.
create or replace function public.join_league(p_code text)
returns public.leagues language plpgsql security definer set search_path = public as $$
declare v_row public.leagues;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  select * into v_row from leagues where join_code = upper(trim(p_code));
  if not found then raise exception 'Código inválido'; end if;
  insert into league_members (league_id, user_id) values (v_row.id, auth.uid())
  on conflict do nothing;
  return v_row;
end;
$$;

-- Tabla de posiciones de una liga (solo agregados, nunca pronósticos sueltos).
create or replace function public.get_leaderboard(p_league uuid)
returns table (user_id uuid, display_name text, points bigint, graded bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from league_members
                 where league_id = p_league and user_id = auth.uid()) then
    raise exception 'No sos miembro de esta liga';
  end if;
  return query
    select lm.user_id, pr.display_name,
           coalesce(sum(public.points_for(p.pred_home, p.pred_away,
                        m.home_score, m.away_score, l.pts_exact, l.pts_outcome)), 0)::bigint,
           count(*) filter (where m.status = 'finished')::bigint
    from league_members lm
    join leagues  l  on l.id = lm.league_id
    join profiles pr on pr.id = lm.user_id
    left join predictions p on p.user_id = lm.user_id
    left join matches m on m.id = p.match_id and m.status = 'finished'
    where lm.league_id = p_league
    group by lm.user_id, pr.display_name
    order by 3 desc, pr.display_name;
end;
$$;

-- Ver qué puso cada uno EN UN PARTIDO YA CERRADO (función social, sin filtrar nada antes de hora).
create or replace function public.get_match_predictions(p_match int, p_league uuid)
returns table (display_name text, pred_home int, pred_away int)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from league_members where league_id = p_league and user_id = auth.uid()) then
    raise exception 'No sos miembro de esta liga'; end if;
  if (select kickoff from matches where id = p_match) > now() then
    raise exception 'El partido todavía no cerró'; end if;
  return query
    select pr.display_name, p.pred_home, p.pred_away
    from league_members lm
    join profiles pr on pr.id = lm.user_id
    join predictions p on p.user_id = lm.user_id and p.match_id = p_match
    where lm.league_id = p_league
    order by pr.display_name;
end;
$$;

-- ----------------------------------------------------------------------------
--  ROW LEVEL SECURITY  (el blindaje real)
-- ----------------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.matches        enable row level security;
alter table public.leagues        enable row level security;
alter table public.league_members enable row level security;
alter table public.predictions    enable row level security;

-- profiles: el display_name no es secreto; lectura para autenticados, edición solo propia.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (true);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- matches: todos ven el fixture. Solo un admin del sitio carga/edita resultados.
drop policy if exists matches_read on public.matches;
create policy matches_read on public.matches for select to authenticated using (true);
drop policy if exists matches_admin_write on public.matches;
create policy matches_admin_write on public.matches for update to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and is_site_admin))
  with check (exists (select 1 from profiles where id = auth.uid() and is_site_admin));

-- leagues / members: solo ves las ligas de las que sos miembro.
drop policy if exists leagues_member_read on public.leagues;
create policy leagues_member_read on public.leagues for select to authenticated
  using (exists (select 1 from league_members where league_id = id and user_id = auth.uid()));
drop policy if exists members_read on public.league_members;
create policy members_read on public.league_members for select to authenticated
  using (exists (select 1 from league_members m2 where m2.league_id = league_id and m2.user_id = auth.uid()));

-- predictions: cada uno maneja SOLO las suyas, y SOLO si el partido no arrancó.
drop policy if exists predictions_select_own on public.predictions;
create policy predictions_select_own on public.predictions for select to authenticated
  using (user_id = auth.uid());
drop policy if exists predictions_insert_own on public.predictions;
create policy predictions_insert_own on public.predictions for insert to authenticated
  with check (
    user_id = auth.uid()
    and (select kickoff from matches where id = match_id) > now()   -- ⛔ cierre al arrancar
  );
drop policy if exists predictions_update_own on public.predictions;
create policy predictions_update_own on public.predictions for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (select kickoff from matches where id = match_id) > now()
  );

-- ----------------------------------------------------------------------------
--  Permisos de ejecución de las RPCs
-- ----------------------------------------------------------------------------
grant execute on function public.create_league(text)            to authenticated;
grant execute on function public.join_league(text)              to authenticated;
grant execute on function public.get_leaderboard(uuid)          to authenticated;
grant execute on function public.get_match_predictions(int,uuid) to authenticated;

-- ============================================================================
--  Para convertirte en admin (cargar resultados), después de registrarte corré:
--    update public.profiles set is_site_admin = true where id = auth.uid();
--  (logueado, desde la app) — o por email buscando el id en auth.users.
-- ============================================================================
