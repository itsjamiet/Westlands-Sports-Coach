-- ============================================================
-- Westlands Sports Coach — Core Schema
-- Run this in Supabase: Project → SQL Editor → New query → Run
-- ============================================================

create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- People: one row per logged-in user, linked to Supabase Auth
-- ------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('club', 'coach', 'parent')),
  display_name text not null,
  club_id uuid, -- set after clubs table exists (added below)
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- Clubs
-- ------------------------------------------------------------
create table clubs (
  id uuid primary key default uuid_generate_v4(),
  name text not null default 'My Club',
  logo_url text,
  theme jsonb default '{"accent":"#2E7CF6","dark":"#123a8a","bg":"#060b16","panel":"#0f1e3d","panel2":"#16295a"}',
  owner_id uuid references profiles(id),
  created_at timestamptz default now()
);

alter table profiles add constraint profiles_club_fk foreign key (club_id) references clubs(id);

-- ------------------------------------------------------------
-- Teams
-- ------------------------------------------------------------
create table teams (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid not null references clubs(id) on delete cascade,
  name text not null default 'New Team',
  logo_url text,
  theme jsonb default '{"accent":"#2E7CF6","dark":"#123a8a"}',
  matchday jsonb default '{"format":"7v7","breakdown":"quarters","segments":[]}',
  session jsonb default '{"quadrants":[]}',
  created_at timestamptz default now()
);

-- Which coaches are attached to which teams (a coach can have several)
create table coach_team_links (
  coach_id uuid not null references profiles(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  primary key (coach_id, team_id)
);

-- ------------------------------------------------------------
-- Players
-- ------------------------------------------------------------
create table players (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references teams(id) on delete cascade,
  name text not null default 'New Player',
  number text,
  age text,
  position text default 'GK',
  photo_url text,
  stats jsonb default '[]', -- weekly match stats array
  created_at timestamptz default now()
);

-- Which parents are attached to which specific children (not whole team)
create table parent_child_links (
  parent_id uuid not null references profiles(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  primary key (parent_id, player_id)
);

-- ------------------------------------------------------------
-- Training plans — separate table so it can carry its own,
-- tighter permission rules than the rest of the player profile
-- ------------------------------------------------------------
create table training_plans (
  player_id uuid primary key references players(id) on delete cascade,
  rows jsonb default '[]', -- the 5(+) focus-area rows incl. drills
  updated_at timestamptz default now()
);

-- ------------------------------------------------------------
-- Calendar events (matches & training) — belongs to a team
-- ------------------------------------------------------------
create table calendar_events (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references teams(id) on delete cascade,
  type text not null check (type in ('match', 'training')),
  title text,
  date date not null,
  time text,
  location text,
  opponent text,
  notes text,
  created_at timestamptz default now()
);

-- RSVP + attendance, one row per event per player
create table rsvps (
  event_id uuid not null references calendar_events(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'attending', 'not_attending')),
  attended boolean not null default false,
  primary key (event_id, player_id)
);

-- ------------------------------------------------------------
-- Documents — either club-wide or team-specific
-- ------------------------------------------------------------
create table documents (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid references clubs(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  title text not null,
  file_url text not null,
  file_name text,
  created_at timestamptz default now(),
  constraint documents_scope check (
    (club_id is not null and team_id is null) or (club_id is null and team_id is not null)
  )
);
