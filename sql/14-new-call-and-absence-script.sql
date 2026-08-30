-- 14 - NEW CALL RENAME + THE ABSENCE CUSTOMER SCRIPT
-- Run this AFTER 10 through 13. Re-runnable. Fresh Supabase SQL tab.
--
-- Two small changes:
--   1. The answering kit is now called "New Call" everywhere.
--   2. PINK gets the script for telling a customer their job is being missed.
--
-- Supply house links (Home Depot, Lowe's, your own) are NOT in here. They
-- live in companies.settings and the GRAY screen writes them itself, so
-- there is nothing to seed.

begin;

-- 1. Rename. The button on the command center is in the code; this is the
--    title in the coloured bar at the top of the procedure itself.
update suite.procedures
   set title = $q$New Call$q$,
       updated_at = now()
 where color = $q$answering$q$;

-- 2. The customer script on PINK. Removed first so re-running cannot stack
--    up duplicate copies of it.
delete from suite.procedure_sections
 where heading = $q$Customer reply script - their job is being missed$q$
   and procedure_id in (select id from suite.procedures where color = $q$absence$q$);

insert into suite.procedure_sections
  (procedure_id, heading, body, collapsed_by_default, sort_order, color_tag)
select p.id, $q$Customer reply script - their job is being missed$q$, $q$WHEN YOU KNOW THEY ARE GOING TO BE MISSED

Call before their window opens. Not during it, and never after.
Two alternatives every time - a question with one answer is not a choice.

THE CALL
"Good morning, this is [name] from [COMPANY NAME]. I'm calling about your appointment today. We've had someone go off unexpectedly and I've had to move some work around. I'm sorry - I'd like to get you rebooked at a time that actually suits you. I've got [option 1] or [option 2]."

IF THEY PUSH FOR TODAY
"I understand, and I'd rather be straight with you than promise a time I can't hold. Today isn't something I can do properly. What I can do is put you first thing [next option] - and if anything opens up before then, you're the first call I make."

IF IT IS THE SECOND TIME THIS CUSTOMER HAS BEEN MOVED
Stop. That goes to [MANAGER ROLE] before you call them.

THE TEXT VERSION - only if text is the contact method they chose
"Hi [name], it's [name] at [COMPANY NAME]. I'm sorry - I've had to move your appointment today because of an unexpected absence. Can I offer you [option 1] or [option 2]? Call or text me back and I'll get it locked in."

AFTER THE CALL
Log it - who you spoke to, when, and what they agreed.
Update the calendar entry the same minute, not at the end of the day.
If they agreed to a new date, send the written confirmation.

NEVER NAME THE ABSENT EMPLOYEE. NEVER GIVE A REASON.
"Someone has gone off unexpectedly" is the whole explanation a customer gets.
Not who, not why, not for how long. It is not their business, and it is not
ours to share.$q$, false, 5, $q$absence$q$
  from suite.procedures p
 where p.color = $q$absence$q$;

commit;

-- 3. Proof. The rename should show one row per company plus the template.
select coalesce(c.name, '** UNIVERSAL TEMPLATE **') as owner,
       p.color, p.title
  from suite.procedures p
  left join suite.companies c on c.id = p.company_id
 where p.color = $q$answering$q$
 order by 1;

-- And the script should be attached to every PINK procedure. If this comes
-- back with NO ROWS, the absence procedure does not exist yet - that means
-- 08-office-procedures.sql was never run, and PINK is still showing the
-- "not set up yet" placeholder.
select coalesce(c.name, '** UNIVERSAL TEMPLATE **') as owner,
       s.heading, s.color_tag
  from suite.procedure_sections s
  join suite.procedures p on p.id = s.procedure_id
  left join suite.companies c on c.id = p.company_id
 where p.color = $q$absence$q$
   and s.heading = $q$Customer reply script - their job is being missed$q$
 order by 1;
