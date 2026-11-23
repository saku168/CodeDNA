-- Run in Supabase SQL editor. GitHub numeric user ID for saku168: 229678207.
create or replace function public.assign_codedna_admin_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.provider = 'github' and new.provider_id = '229678207' then
    update auth.users
       set raw_app_meta_data = jsonb_set(
         coalesce(raw_app_meta_data, '{}'::jsonb),
         '{role}',
         '"admin"'::jsonb,
         true
       )
     where id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists codedna_assign_admin on auth.identities;
create trigger codedna_assign_admin
after insert or update of provider_id on auth.identities
for each row execute function public.assign_codedna_admin_role();

update auth.users u
   set raw_app_meta_data = jsonb_set(
     coalesce(u.raw_app_meta_data, '{}'::jsonb),
     '{role}',
     '"admin"'::jsonb,
     true
   )
 where exists (
   select 1
     from auth.identities i
    where i.user_id = u.id
      and i.provider = 'github'
      and i.provider_id = '229678207'
 );
