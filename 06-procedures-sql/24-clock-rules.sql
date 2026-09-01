-- 24 - CLOCKING IN AND OUT, IN THE PROCEDURES
--
-- The app enforces this. The cards have to say the same thing or they
-- contradict each other, and people trust the paper over the screen.
--
--   First job of the day  -> clock in ON ARRIVAL, within a mile.
--   Every job after that  -> clock in ON THE WAY, from anywhere.
--   Every clock-out       -> at the job, within a mile.
--
-- Goes on all eight tech cards, at the top, because it applies to every kind
-- of visit. Re-runnable - the section is removed before it is re-added, so it
-- cannot stack up.
--
-- Paste into a FRESH Supabase SQL tab.

begin;

delete from suite.procedure_sections
 where heading = $q$Clocking in and out$q$
   and procedure_id in (select id from suite.procedures where color in ($q$tech_emergency$q$, $q$tech_service_call$q$, $q$tech_estimate$q$, $q$tech_warranty_call$q$, $q$tech_concern$q$, $q$tech_question$q$, $q$tech_material$q$, $q$tech_absence$q$));

insert into suite.procedure_sections
  (procedure_id, heading, body, collapsed_by_default, sort_order, color_tag)
select p.id, $q$Clocking in and out$q$, $q$WHEN YOU CLOCK IN

FIRST JOB OF THE DAY - you clock in when you GET THERE.
The app will not let you clock in until you are within a mile of the address.
The day starts at the job, not in your driveway.

EVERY JOB AFTER THAT - you clock in when you are ON THE WAY.
Travel between jobs is paid. You do not have to be anywhere near the address.
Press it when you set off from the last one.

WHEN YOU CLOCK OUT

YOU CLOCK OUT AT THE JOB. Every time.
The app will not let you clock out unless you are within a mile of it.

If you have already driven off, you cannot do it from the road. Go back, or
call the office and they will correct your time. Do not leave yourself clocked
in overnight and sort it out tomorrow - it makes your hours wrong and somebody
has to unpick it.

THE LAST JOB OF THE DAY

Clock out at the job, the same as any other. That is the end of your day.

WHY IT WORKS THIS WAY

The clock-in location is what makes your hours provable. It protects you as
much as the company - nobody can argue later about whether you were there, or
for how long. Your distance from the job is recorded on every clock-in and
clock-out either way, whether it is inside the mile or not.$q$, false, 5, null::text
  from suite.procedures p
 where p.color in ($q$tech_emergency$q$, $q$tech_service_call$q$, $q$tech_estimate$q$, $q$tech_warranty_call$q$, $q$tech_concern$q$, $q$tech_question$q$, $q$tech_material$q$, $q$tech_absence$q$);

commit;

-- Proof: one row per card per company, plus the templates.
select coalesce(c.name, '** UNIVERSAL TEMPLATE **') as owner,
       p.color, s.heading
  from suite.procedure_sections s
  join suite.procedures p on p.id = s.procedure_id
  left join suite.companies c on c.id = p.company_id
 where s.heading = $q$Clocking in and out$q$
 order by 1, 2;
