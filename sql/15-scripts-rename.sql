-- 15 - PREMADE REPLIES IS NOW CALLED SCRIPTS
-- Run after 14. Re-runnable. Fresh Supabase SQL tab.
--
-- The button on the command center is in the code and comes with the zip.
-- This is the title in the bar at the top of the screen itself, plus the
-- opening paragraph, both of which live in the database.

begin;

update suite.procedures
   set title = $q$Scripts$q$,
       purpose = replace(purpose, $q$Premade Replies$q$, $q$Scripts$q$),
       updated_at = now()
 where color = $q$replies$q$;

commit;

-- Proof: one row per company plus the template, all saying Scripts.
select coalesce(c.name, '** UNIVERSAL TEMPLATE **') as owner,
       p.color, p.title
  from suite.procedures p
  left join suite.companies c on c.id = p.company_id
 where p.color = $q$replies$q$
 order by 1;
