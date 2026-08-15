-- ============================================================
-- Westlands Sports Coach — Security Rules (Row Level Security)
-- Run this AFTER 01_schema.sql, in the same SQL Editor.
--
-- This is the part that makes access control REAL: these rules
-- are enforced by the database itself, not by the app's UI, so
-- they hold even if someone bypasses the app entirely.
-- ============================================================

-- ------------------------------------------------------------
-- Helper functions (SECURITY DEFINER = safe to call from any
-- policy without causing recursive-permission-check loops)
-- ------------------------------------------------------------

create or replace function my_role() returns text
language sql security definer stable as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function my_club_id() returns uuid
language sql security definer stable as $$
  select club_id from profiles where id = auth.uid();
$$;

create or replace function is_coach_of_team(t_id uuid) returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from coach_team_links
    where team_id = t_id and coach_id = auth.uid()
  );
$$;

create or replace function is_parent_on_team(t_id uuid) returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from parent_child_links pcl
    join players p on p.id = pcl.player_id
    where p.team_id = t_id and pcl.parent_id = auth.uid()
  );
$$;

create or replace function is_parent_of_player(p_id uuid) returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from parent_child_links
    where player_id = p_id and parent_id = auth.uid()
  );
$$;

create or replace function team_club_id(t_id uuid) returns uuid
language sql security definer stable as $$
  select club_id from teams where id = t_id;
$$;

create or replace function player_team_id(p_id uuid) returns uuid
language sql security definer stable as $$
  select team_id from players where id = p_id;
$$;

-- ------------------------------------------------------------
-- Turn on RLS everywhere (nothing is accessible until a policy
-- explicitly allows it — this is the safe default)
-- ------------------------------------------------------------
alter table profiles enable row level security;
alter table clubs enable row level security;
alter table teams enable row level security;
alter table coach_team_links enable row level security;
alter table players enable row level security;
alter table parent_child_links enable row level security;
alter table training_plans enable row level security;
alter table calendar_events enable row level security;
alter table rsvps enable row level security;
alter table documents enable row level security;

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------
create policy "see own profile" on profiles for select
  using (id = auth.uid());

create policy "club sees its people" on profiles for select
  using (my_role() = 'club' and club_id = my_club_id());

create policy "insert own profile on signup" on profiles for insert
  with check (id = auth.uid());

create policy "update own profile" on profiles for update
  using (id = auth.uid());

-- ------------------------------------------------------------
-- clubs
-- ------------------------------------------------------------
create policy "members see their club" on clubs for select
  using (id = my_club_id());

create policy "club owner creates their club" on clubs for insert
  with check (owner_id = auth.uid());

create policy "club owner updates their club" on clubs for update
  using (owner_id = auth.uid());

-- ------------------------------------------------------------
-- teams
-- ------------------------------------------------------------
create policy "club/coach/parent see their teams" on teams for select
  using (
    club_id = my_club_id()
    or is_coach_of_team(id)
    or is_parent_on_team(id)
  );

create policy "club creates teams" on teams for insert
  with check (club_id = my_club_id() and my_role() = 'club');

create policy "club or coach updates team" on teams for update
  using (
    (club_id = my_club_id() and my_role() = 'club')
    or is_coach_of_team(id)
  );

create policy "club deletes team" on teams for delete
  using (club_id = my_club_id() and my_role() = 'club');

-- ------------------------------------------------------------
-- coach_team_links
-- ------------------------------------------------------------
create policy "see relevant coach links" on coach_team_links for select
  using (
    coach_id = auth.uid()
    or team_club_id(team_id) = my_club_id()
  );

create policy "club manages coach links" on coach_team_links for insert
  with check (team_club_id(team_id) = my_club_id() and my_role() = 'club');

create policy "club removes coach links" on coach_team_links for delete
  using (team_club_id(team_id) = my_club_id() and my_role() = 'club');

-- ------------------------------------------------------------
-- players — club / coach / any parent with a child on the team
-- can all view the full squad (per your requirement)
-- ------------------------------------------------------------
create policy "team members see all players" on players for select
  using (
    team_club_id(team_id) = my_club_id()
    or is_coach_of_team(team_id)
    or is_parent_on_team(team_id)
  );

create policy "coach manages players" on players for insert
  with check (is_coach_of_team(team_id));

create policy "coach updates players" on players for update
  using (is_coach_of_team(team_id));

create policy "coach deletes players" on players for delete
  using (is_coach_of_team(team_id));

-- ------------------------------------------------------------
-- parent_child_links
-- ------------------------------------------------------------
create policy "see relevant child links" on parent_child_links for select
  using (
    parent_id = auth.uid()
    or is_coach_of_team(player_team_id(player_id))
    or team_club_id(player_team_id(player_id)) = my_club_id()
  );

create policy "coach links a parent to a child" on parent_child_links for insert
  with check (is_coach_of_team(player_team_id(player_id)));

create policy "coach removes a parent link" on parent_child_links for delete
  using (is_coach_of_team(player_team_id(player_id)));

-- ------------------------------------------------------------
-- training_plans — THE key restriction: a parent only sees
-- their own child's plan, everyone else sees any plan on the team
-- ------------------------------------------------------------
create policy "club/coach see all plans, parent sees own child only" on training_plans for select
  using (
    is_coach_of_team(player_team_id(player_id))
    or team_club_id(player_team_id(player_id)) = my_club_id()
    or is_parent_of_player(player_id)
  );

create policy "coach writes plans" on training_plans for insert
  with check (is_coach_of_team(player_team_id(player_id)));

create policy "coach updates plans" on training_plans for update
  using (is_coach_of_team(player_team_id(player_id)));

-- ------------------------------------------------------------
-- calendar_events — full visibility for club/coach/any team parent
-- ------------------------------------------------------------
create policy "team members see calendar" on calendar_events for select
  using (
    team_club_id(team_id) = my_club_id()
    or is_coach_of_team(team_id)
    or is_parent_on_team(team_id)
  );

create policy "coach manages events" on calendar_events for insert
  with check (is_coach_of_team(team_id));

create policy "coach updates events" on calendar_events for update
  using (is_coach_of_team(team_id));

create policy "coach deletes events" on calendar_events for delete
  using (is_coach_of_team(team_id));

-- ------------------------------------------------------------
-- rsvps — everyone on the team can VIEW all RSVPs (matches your
-- "parents see match day selections" requirement). Direct writes
-- are coach/club only; parents write through the submit_rsvp()
-- function below, which only ever touches their own child's row.
-- ------------------------------------------------------------
create policy "team members see rsvps" on rsvps for select
  using (
    team_club_id(player_team_id(player_id)) = my_club_id()
    or is_coach_of_team(player_team_id(player_id))
    or is_parent_on_team(player_team_id(player_id))
  );

create policy "coach manages rsvps" on rsvps for insert
  with check (is_coach_of_team(player_team_id(player_id)));

create policy "coach updates rsvps" on rsvps for update
  using (is_coach_of_team(player_team_id(player_id)));

-- A parent calls this to RSVP their own child — it deliberately
-- only ever writes the `status` column, never `attended`, and
-- checks the parent/child link before doing anything.
create or replace function submit_rsvp(p_event_id uuid, p_player_id uuid, p_status text)
returns void
language plpgsql security definer as $$
begin
  if not is_parent_of_player(p_player_id) then
    raise exception 'Not your child';
  end if;
  if p_status not in ('pending', 'attending', 'not_attending') then
    raise exception 'Invalid status';
  end if;

  insert into rsvps (event_id, player_id, status)
  values (p_event_id, p_player_id, p_status)
  on conflict (event_id, player_id)
  do update set status = excluded.status;
end;
$$;

-- ------------------------------------------------------------
-- documents
-- ------------------------------------------------------------
create policy "club docs visible to whole club" on documents for select
  using (
    (club_id is not null and club_id = my_club_id())
    or (team_id is not null and (
      team_club_id(team_id) = my_club_id()
      or is_coach_of_team(team_id)
      or is_parent_on_team(team_id)
    ))
  );

create policy "club uploads club docs" on documents for insert
  with check (club_id is not null and club_id = my_club_id() and my_role() = 'club');

create policy "coach uploads team docs" on documents for insert
  with check (team_id is not null and is_coach_of_team(team_id));

create policy "owner deletes documents" on documents for delete
  using (
    (club_id is not null and club_id = my_club_id() and my_role() = 'club')
    or (team_id is not null and is_coach_of_team(team_id))
  );
