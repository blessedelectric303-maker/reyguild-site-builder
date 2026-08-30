-- 20 - THE FIVE ROLES
--
-- Owner / Manager, Administrator, Supervisor, Tech / Estimator, Apprentice.
--
-- "estimator" and "sales_rep" no longer exist as separate roles - they fold
-- into tech, because a tech who prices work is the same person on the phone.
-- This renames anybody still sitting on the old names.
--
-- Re-runnable. Paste into a FRESH Supabase SQL tab.

begin;

-- 1. Old ReyGuild roles onto the new five.
update suite.memberships set role = 'tech'
 where role in ('estimator', 'sales_rep', 'technician');
update suite.memberships set role = 'owner'  where role = 'manager';
update suite.memberships set role = 'admin'  where role = 'administrator';

-- 2. Same for invites that have not been redeemed yet, so a pending invite
--    cannot bring a dead role back to life.
update suite.invites set role = 'tech'
 where role in ('estimator', 'sales_rep', 'technician')
   and status = 'pending';
update suite.invites set role = 'owner'  where role = 'manager'  and status = 'pending';
update suite.invites set role = 'admin'  where role = 'administrator' and status = 'pending';

-- 3. Anything left that is not one of the five becomes tech rather than
--    silently losing access.
update suite.memberships set role = 'tech'
 where role not in ('owner', 'admin', 'supervisor', 'tech', 'apprentice');

commit;

-- Proof: every member on one of the five roles.
select u.email, m.role
  from suite.memberships m
  join auth.users u on u.id = m.user_id
 order by m.role, u.email;

-- Anything here means a role slipped through. Should be zero rows.
select role, count(*) as stragglers
  from suite.memberships
 where role not in ('owner', 'admin', 'supervisor', 'tech', 'apprentice')
 group by role;
