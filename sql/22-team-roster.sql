-- 22 - NAMES ON THE TEAM LIST, AND CHANGING SOMEBODY'S ROLE
--
-- Army / Employees showed "Owner" and "Tech" with no names, because the email
-- addresses live in auth.users and the browser cannot read that table. Two
-- functions fix it, both owner/admin only.
--
-- Re-runnable. Paste into a FRESH Supabase SQL tab.

-- 1. The roster: who is on the team, with their email.
drop function if exists suite.company_members();

create function suite.company_members()
returns table (
  membership_id uuid,
  user_id uuid,
  role text,
  email text,
  joined_at timestamptz,
  is_me boolean
)
language sql
stable
security definer
set search_path = suite, auth, public
as $fn$
  with me as (
    select m.company_id, m.role
      from suite.memberships m
     where m.user_id = auth.uid()
     limit 1
  )
  select m.id, m.user_id, m.role, u.email::text, m.created_at,
         (m.user_id = auth.uid())
    from suite.memberships m
    join auth.users u on u.id = m.user_id
    cross join me
   where m.company_id = me.company_id
     and me.role in ('owner', 'admin')
   order by
     case m.role
       when 'owner' then 1 when 'admin' then 2 when 'supervisor' then 3
       when 'tech' then 4 when 'apprentice' then 5 else 6 end,
     u.email;
$fn$;

-- 2. Moving somebody up or down. All the guards live in here rather than in
--    the screen, so they hold no matter what calls it.
drop function if exists suite.set_member_role(uuid, text);

create function suite.set_member_role(target_user uuid, new_role text)
returns text
language plpgsql
security definer
set search_path = suite, auth, public
as $fn$
declare
  my_role text;
  my_company uuid;
  target_role text;
  owner_count int;
begin
  select m.role, m.company_id into my_role, my_company
    from suite.memberships m where m.user_id = auth.uid() limit 1;

  if my_role is null or my_role not in ('owner', 'admin') then
    raise exception 'Only an owner or an administrator can change roles.';
  end if;

  if new_role not in ('owner', 'admin', 'supervisor', 'tech', 'apprentice') then
    raise exception 'Not a role: %', new_role;
  end if;

  select m.role into target_role
    from suite.memberships m
   where m.user_id = target_user and m.company_id = my_company;

  if target_role is null then
    raise exception 'That person is not on your team.';
  end if;

  -- You cannot change your own role. Otherwise the only owner can demote
  -- himself and lock the whole company out of its own settings.
  if target_user = auth.uid() then
    raise exception 'You cannot change your own role. Ask another owner.';
  end if;

  -- Only an owner can make or unmake an owner.
  if (new_role = 'owner' or target_role = 'owner') and my_role <> 'owner' then
    raise exception 'Only an owner can promote or demote an owner.';
  end if;

  -- Never leave a company with nobody in charge.
  if target_role = 'owner' and new_role <> 'owner' then
    select count(*) into owner_count
      from suite.memberships
     where company_id = my_company and role = 'owner';
    if owner_count <= 1 then
      raise exception 'That is your only owner. Promote somebody else first.';
    end if;
  end if;

  update suite.memberships
     set role = new_role
   where user_id = target_user and company_id = my_company;

  return new_role;
end;
$fn$;

grant execute on function suite.company_members() to authenticated;
grant execute on function suite.set_member_role(uuid, text) to authenticated;
notify pgrst, 'reload schema';

select * from suite.company_members();
