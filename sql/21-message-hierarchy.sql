-- 21 - WHO CAN MESSAGE WHOM
--
-- The rule:
--   Owner, Administrator, Supervisor  -> can message everybody.
--   Tech / Estimator, Apprentice      -> can message ONLY the owner,
--                                        administrators and supervisors.
--
-- A tech cannot message another tech. That is deliberate: work gets assigned
-- and changed through the office, and two techs agreeing something between
-- themselves is how a customer ends up told two different things.
--
-- This replaces suite.messageable_members(), which is the single function the
-- Messages screen asks for its contact list. Because the list IS the rule,
-- nobody can message somebody who is not on it - there is no separate check
-- to forget.
--
-- Re-runnable. Paste into a FRESH Supabase SQL tab.

drop function if exists suite.messageable_members();

create function suite.messageable_members()
returns table (user_id uuid, role text, email text)
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
  select m.user_id,
         m.role,
         u.email::text
    from suite.memberships m
    join auth.users u on u.id = m.user_id
    cross join me
   where m.company_id = me.company_id
     and m.user_id <> auth.uid()
     and (
       -- The office tier reaches everybody.
       me.role in ('owner', 'admin', 'supervisor')
       -- Everybody else reaches only the office tier.
       or m.role in ('owner', 'admin', 'supervisor')
     )
   order by
     case m.role
       when 'owner' then 1
       when 'admin' then 2
       when 'supervisor' then 3
       when 'tech' then 4
       when 'apprentice' then 5
       else 6
     end,
     u.email;
$fn$;

grant execute on function suite.messageable_members() to authenticated;
notify pgrst, 'reload schema';

-- Proof: run as yourself. An owner should see everybody else in the company.
select * from suite.messageable_members();
