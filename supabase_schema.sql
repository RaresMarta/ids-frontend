-- Run this in Supabase Dashboard → SQL Editor

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

create policy "Users can read own analyses"
  on analyses for select
  using (auth.uid() = user_id);

create policy "Users can insert own analyses"
  on analyses for insert
  with check (auth.uid() = user_id);
