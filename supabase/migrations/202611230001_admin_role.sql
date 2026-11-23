-- Run in Supabase SQL editor. saku168 GitHub numeric ID: 229678207.
create or replace function public.assign_codedna_admin_role()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.provider = 'github' and new.identity_data ->> 'user_id' = '229678207' then
    update auth.users set raw_app_meta_data = jsonb_set(coalesce(raw_app_meta_data, '{}'::jsonb), '{role}', '"admin"'::jsonb, true) where id = new.user_id;
  end if;
  return new;
end;
$$;
drop trigger if exists codedna_assign_admin on auth.identities;
create trigger codedna_assign_admin after insert or update of identity_data on auth.identities
for each row execute function public.assign_codedna_admin_role();
