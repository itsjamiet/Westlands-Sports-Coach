-- ============================================================
-- Westlands Sports Coach — Signup handling
-- Run this AFTER 01_schema.sql and 02_security.sql
-- ============================================================

-- When someone signs up via Supabase Auth, automatically create
-- their matching row in `profiles`, using the role/name/club they
-- signed up with (passed in as auth metadata by the app).
create or replace function handle_new_user()
returns trigger
language plpgsql security definer as $$
begin
  insert into profiles (id, role, display_name, club_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'parent'),
    coalesce(new.raw_user_meta_data->>'display_name', 'New User'),
    nullif(new.raw_user_meta_data->>'club_id', '')::uuid
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
