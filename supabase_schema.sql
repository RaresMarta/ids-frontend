-- Run this in Supabase Dashboard → SQL Editor. Safe to re-run (idempotent).

create table if not exists analyses (
  id                  uuid        default gen_random_uuid() primary key,
  user_id             uuid        references auth.users(id) on delete cascade not null,
  created_at          timestamptz default now(),
  model_used          text        not null,
  input_type          text        not null,
  file_name           text,
  result_label        text        not null,
  confidence          float       not null,
  classification_mode text        not null default '2',
  probabilities       jsonb
);

alter table analyses enable row level security;

drop policy if exists "Users can read own analyses" on analyses;
create policy "Users can read own analyses"
  on analyses for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own analyses" on analyses;
create policy "Users can insert own analyses"
  on analyses for insert
  with check (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────────────────
-- Live monitoring backplane (ids.apps.monitor SupabaseSink). Single-customer:
-- one droplet sensor registers itself as one monitors row (upsert on monitor_key).
-- ──────────────────────────────────────────────────────────────────────────

-- registry of detector sensors; each worker upserts its own row on startup
create table if not exists monitors (
  id            uuid        default gen_random_uuid() primary key,
  monitor_key   text        unique not null,          -- stable per worker (IDS_MONITOR_ID)
  name          text        not null,                 -- human label
  owner_id      uuid        references auth.users(id) on delete cascade,
  public_ip     text,
  protected_ips text[],                               -- the victim(s) this sensor guards
  status        text        not null default 'online',
  last_seen_at  timestamptz,
  created_at    timestamptz default now()
);

-- one row per attack episode (alert -> recovered), tagged by monitor; persisted long-term
create table if not exists incidents (
  id           uuid             default gen_random_uuid() primary key,
  monitor_id   uuid             references monitors(id) on delete cascade,
  attacker_ip  text             not null,
  family       text,
  confidence   real,
  started_ts   double precision not null,
  ended_ts     double precision,
  duration_s   double precision generated always as (ended_ts - started_ts) stored,
  top_features jsonb,
  status       text             not null default 'active',
  created_at   timestamptz      default now()
);
create index if not exists ix_incidents_monitor_active on incidents (monitor_id, status);

-- periodic counters, the macro view of the stream; the persisted aggregations
create table if not exists stats_snapshots (
  id          uuid             default gen_random_uuid() primary key,
  monitor_id  uuid             references monitors(id) on delete cascade,
  ts          double precision not null,
  flows_total integer,
  malicious   integer,
  dropped     integer,
  uptime_s    real,
  by_family   jsonb,
  created_at  timestamptz      default now()
);
create index if not exists ix_snapshots_monitor_ts on stats_snapshots (monitor_id, created_at desc);

alter table monitors        enable row level security;
alter table incidents       enable row level security;
alter table stats_snapshots enable row level security;

-- SINGLE-CUSTOMER FIRST PASS — permissive policies so the worker writes with the public
-- anon key and the dashboard reads, with no owner/RLS wiring. Harden for multi-tenant by
-- swapping these for per-owner (auth.uid() = owner_id) policies + a service_role worker key.
drop policy if exists "monitors open read"    on monitors;
drop policy if exists "monitors open insert"  on monitors;
drop policy if exists "monitors open update"  on monitors;
drop policy if exists "incidents open read"   on incidents;
drop policy if exists "incidents open insert" on incidents;
drop policy if exists "incidents open update" on incidents;
drop policy if exists "snapshots open read"   on stats_snapshots;
drop policy if exists "snapshots open insert" on stats_snapshots;
create policy "monitors open read"    on monitors        for select using (true);
create policy "monitors open insert"  on monitors        for insert with check (true);
create policy "monitors open update"  on monitors        for update using (true);
create policy "incidents open read"   on incidents       for select using (true);
create policy "incidents open insert" on incidents       for insert with check (true);
create policy "incidents open update" on incidents       for update using (true);
create policy "snapshots open read"   on stats_snapshots for select using (true);
create policy "snapshots open insert" on stats_snapshots for insert with check (true);

-- Realtime: the dashboard subscribes to postgres_changes on these tables (idempotent add).
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'incidents') then
    alter publication supabase_realtime add table incidents;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'monitors') then
    alter publication supabase_realtime add table monitors;
  end if;
end $$;

-- Retention (optional, requires pg_cron): live flows are Broadcast-only and never stored,
-- so only snapshots accrue. Uncomment after `create extension pg_cron;`:
-- select cron.schedule('prune_snapshots', '0 * * * *',
--   $$ delete from stats_snapshots where created_at < now() - interval '7 days' $$);
