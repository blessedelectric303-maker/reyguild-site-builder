-- 11 - NEW CALL, the answering kit (universal). Supersedes 09-answering-kit.sql.
-- Re-runnable. Safe to paste more than once.
-- Paste into a FRESH Supabase SQL tab.

begin;

-- 1. Detach any checklist somebody has part-filled. Deleting a
--    procedure out from under a saved run raises a foreign key
--    error and blocks the whole file. Re-linked at step 6.
update suite.checklist_runs set procedure_id = null
 where procedure_id in (select id from suite.procedures where color = $q$answering$q$);

-- 2. Clear the old copies of this colour.
delete from suite.checklist_items
 where procedure_id in (select id from suite.procedures where color = $q$answering$q$);
delete from suite.procedure_sections
 where procedure_id in (select id from suite.procedures where color = $q$answering$q$);
delete from suite.procedures where color = $q$answering$q$;

-- 3. The universal template. company_id null = ReyGuild's copy,
--    the one every new company is cloned from.
insert into suite.procedures
  (company_id, is_template, color, title, purpose, opening_script,
   may_not_say, one_pager, schedules_to_calendar, active)
values
  (null, true, $q$answering$q$, $q$New Call$q$,
   $q$Press this when the phone rings. Work down it. It ends by telling you which colour the call is.

Listen and recognize. Do not interrogate. Almost everybody tells you the category in their first two sentences - your job is to hear it, not to extract it. Questions come later, inside the procedure, where they are about the caller's actual problem and they make sense.

Every colour procedure begins at the moment you know what kind of call it is. They all assume this page is already done.$q$,
   $q$Thank you for calling [COMPANY NAME], this is [name]. How can I help you today?$q$,
   $q$Never interrupt somebody to start sorting the call.
Never run screening questions before acknowledging the problem.
Never use our words - warranty, diagnostic, estimate - before the caller has.
Never talk a caller out of an unsafe symptom.
Never end a call without name, address, phone and a contact preference.
Never make somebody repeat themselves because the category changed.
Never quote a price from memory.
Never promise a date before you know what the job is. Urgent work is the exception.$q$,
   $q$THE ANSWERING KIT - ONE SHEET

1. ANSWER
   "Thank you for calling [COMPANY NAME], this is [name]."

2. LISTEN
   All the way through. No interrupting, no typing.

3. THREE SIGNALS
   Danger. Broken or new. The word "you".

4. CATEGORIZE
   URGENT     danger, damage, a critical system down, a business stopped
   SERVICE    "it stopped working", or small known work
   ESTIMATE   a project, a list, "how much would it be..."
   WARRANTY   "you guys did this"
   COMPLAINT  unhappy about something we did
   QUESTION   just asking, nothing to book yet

5. CAN'T TELL?
   "Broken, new, or something we've already done for you?"

6. ECHO IT BACK.

7. NAME - ADDRESS - PHONE - TEXT OR EMAIL - SOURCE.

8. OPEN THAT PROCEDURE.

[COMPANY CONTACT METHOD]

Listen and recognize. Don't interrogate.
And sort by what they describe, not by what they call it.$q$,
   false, true);

-- 4. Clone it into every company that exists.
insert into suite.procedures
  (company_id, is_template, color, title, purpose, opening_script,
   may_not_say, one_pager, schedules_to_calendar, active)
select c.id, false, t.color, t.title, t.purpose, t.opening_script,
       t.may_not_say, t.one_pager, t.schedules_to_calendar, true
  from suite.companies c
  cross join (select * from suite.procedures
               where color = $q$answering$q$ and company_id is null) t;

-- 5. Sections and checklist, applied to the template AND every clone
--    in one go, so no company can drift from the others.
insert into suite.procedure_sections
  (procedure_id, heading, body, collapsed_by_default, sort_order, color_tag)
select p.id, v.heading, v.body, v.collapsed, v.sort_order, v.color_tag
  from suite.procedures p
  cross join (values
    ($q$The eight steps$q$, $q$1. ANSWER
"Thank you for calling [COMPANY NAME], this is [name]. How can I help you today?"

2. LISTEN - ALL THE WAY THROUGH
Do not type. Do not interrupt. Do not sort out loud.
Most people tell you what it is in the first fifteen seconds.

3. LISTEN FOR THREE THINGS
Is anybody in danger - anything urgent, unsafe, or damaging something right now.
Broken, or new work - "stopped working" versus "I want".
Have we been there before - "you guys", "you installed", "you were out".

4. CATEGORIZE WHAT YOU HEARD
Danger, active damage, a critical system down, a business stopped -> EMERGENCY / PRIORITY
Something stopped working, or a small known job -> SERVICE
A project, a list of works, "how much would it be to..." -> ESTIMATE
"You did this and it's not working" -> WARRANTY
"Nobody called me back", "I'm not happy" -> COMPLAINT
"Do you...", "How much is...", "I'm just asking" -> QUESTION

5. IF YOU GENUINELY CANNOT TELL - ONE QUESTION
"Let me put it this way - is it something that's broken and needs fixing, something new you'd like done, or something we've already done for you before?"

6. ECHO IT BACK
"So what I'm hearing is [their words]. Did I get that right?"

7. TAKE THE BASICS - EVERY CALL
Name, service address, phone, text or email, new or returning, how they heard about us.

8. OPEN THAT PROCEDURE
The booklet takes it from there. Nothing gets asked twice.$q$, false, 10, null::text),
    ($q$Part 1 - How to listen$q$, $q$1.1 LET THEM FINISH
Do not interrupt to clarify. Do not start typing. Do not begin sorting out loud.
Most people have a version of the story ready before they dial. If you cut into it, they start over - and it takes longer than letting them run.

1.2 THE THREE SIGNALS
Usually all present in the first two sentences.
Danger - anything urgent, unsafe, or causing damage right now.
Broken or new - "it stopped", "it's not working" versus "I'd like", "I need".
Prior work - any reference to the company having been there.

1.3 THE WORD THAT CHANGES EVERYTHING
LISTEN FOR "YOU."
"The one you guys put in." "You were out here in March."
That single word is the difference between a service call and a warranty claim - between a customer who pays and one who should not.

1.4 THEY WILL NOT USE OUR WORDS
Nobody says "I'd like to schedule a diagnostic" or "I'm making a warranty claim." They say what happened. The job is to hear "the thing you installed stopped working" and know where that goes.$q$, true, 20, null::text),
    ($q$Emergency / Priority - what they sound like$q$, $q$WHAT THEY SAY
"It's making a noise it never made before."
"Something's leaking / smoking / sparking."
"We can't operate - the business is down."
"It's stopped completely and we need it back today."
"There's damage happening right now."

Customers minimize. "It's probably nothing, but..." is worth taking seriously. Trust the indicator, not their tone.

THIS CATEGORY OVERRIDES EVERY OTHER ONE. If an urgent indicator appears inside any other kind of call, it becomes this immediately.$q$, true, 30, $q$emergency$q$),
    ($q$Service - what they sound like$q$, $q$SOMETHING IS BROKEN
"It stopped working."
"It keeps doing it and then stopping."
"Part of it works and part of it doesn't."

SMALL NEW WORK
"Can you come and put in / replace / move..."
"I know exactly what I want, I just need it done."

Knowing the scope does not make it a project. Most known-scope work is ordinary service.$q$, true, 40, $q$service_call$q$),
    ($q$Estimate - what they sound like$q$, $q$WHAT THEY SAY
"How much would it cost to..."
"We're renovating / adding / expanding."
"I've got a list of things."
"Can you come out and give me a price?"
"I need a bid."

The tell: it is a project, not a repair. Real money, and usually more than one thing.$q$, true, 50, $q$estimate$q$),
    ($q$Warranty - what they sound like$q$, $q$WHAT THEY SAY
"You guys did this and it's stopped working."
"You were out in [month] and it's doing the same thing."
"Is this still under warranty?"

Search the service address regardless of what they tell you. Their memory is not the record.$q$, true, 60, $q$warranty_call$q$),
    ($q$Complaint - what they sound like$q$, $q$WHAT THEY SAY
"Nobody ever called me back."
"Your guy left a mess."
"He was late and nobody told me."
"I'm not happy with this bill."

Handle the complaint first. Then book any work in its own category.$q$, true, 70, $q$concern$q$),
    ($q$Question - what they sound like$q$, $q$WHAT THEY SAY
"Do you charge for estimates?"
"Are you licensed and insured?"
"Do you do [type of work]?"
"I'm just getting some quotes."

Answer generously. Every one of these ends with an offered next step.$q$, true, 80, $q$question$q$),
    ($q$Part 3 - The basics$q$, $q$Every call, every category. If the call ends without these, you have nothing.

Full name.
Service address - the job address, not the billing address.
Best phone number.
Text or email? Ask, do not assume.
What they said, in their words.
New or returning - search the address.
How they heard about us.

On an urgent call, get the service address first, before anything else, in case the line drops.

CAPTURED ONCE, HERE. NO PROCEDURE ASKS FOR THEM AGAIN.$q$, true, 90, null::text),
    ($q$Part 4 - Judgment calls$q$, $q$4.1 A CALL CAN CHANGE CATEGORY
Constantly. It is the system working, not a mistake.
An estimate call where they mention something unsafe -> emergency, immediately.
A service call that turns out to be our own recent work -> warranty.
A service call that turns out to be a project -> estimate.
A question that turns into a booking -> service or estimate.
A complaint that also needs work done -> handle the complaint first, then book it.

CARRY EVERYTHING FORWARD. NEVER MAKE ANYBODY START OVER.

4.2 WHEN TWO APPLY AT ONCE
Anything urgent plus anything else -> urgent wins on priority. Always.
Complaint plus work needed -> complaint first, then book the work.
A question that is really a job -> answer it, then book it.
Warranty plus new work -> warranty is warranty. The new work is a separate estimate. Never blended.

4.3 WHEN YOU CANNOT TELL
Urgent and anything -> treat it as urgent. Let the field tell you it was not.
Service and estimate -> send the estimator. A wasted estimate costs an hour. A wrong phone price costs the job.
Service and warranty -> pull the file. Never decide coverage from their memory.

4.4 THE RULE ABOVE ALL THE OTHERS
SORT BY WHAT THEY DESCRIBE, NOT BY WHAT THEY CALL IT.
People say "emergency" for a minor inconvenience and "just a quick question" for something genuinely dangerous.$q$, true, 100, null::text),
    ($q$Part 5 - The safety rule$q$, $q$NEVER TALK A CALLER THROUGH SOMETHING THEY ARE NOT QUALIFIED TO DO.

Where a hazard is suspected - or the caller simply says they feel unsafe:
Ask only what they can already see, hear, smell or have noticed.
Nothing that sends them toward the equipment.
Photos only from a safe distance, with nothing opened or touched.

The caller saying they are uncomfortable is enough on its own. If they do not want to go near it, they do not go near it.

What a company permits in a normal, non-hazard situation is defined in its trade extension. Where nothing is set, the restrictive version applies.$q$, true, 110, null::text)
  ) as v(heading, body, collapsed, sort_order, color_tag)
 where p.color = $q$answering$q$;

insert into suite.checklist_items
  (procedure_id, label, group_heading, field_key, input_type,
   required_to_dispatch, required_to_close, sort_order)
select p.id, v.label, v.grp, v.field_key, v.input_type,
       v.req_dispatch, false, v.sort_order
  from suite.procedures p
  cross join (values
    ($q$Answered within [RING TARGET]$q$, $q$1. Answer$q$, null::text, $q$check$q$, false, 10),
    ($q$Greeting used - company name and your name$q$, $q$1. Answer$q$, null::text, $q$check$q$, false, 20),
    ($q$Let them finish - no interrupting$q$, $q$2. Listen$q$, null::text, $q$check$q$, false, 30),
    ($q$Did not type while they were talking$q$, $q$2. Listen$q$, null::text, $q$check$q$, false, 40),
    ($q$Did not start sorting out loud$q$, $q$2. Listen$q$, null::text, $q$check$q$, false, 50),
    ($q$Is anybody in danger?$q$, $q$3. The three signals$q$, null::text, $q$check$q$, false, 60),
    ($q$Broken, or new work?$q$, $q$3. The three signals$q$, null::text, $q$check$q$, false, 70),
    ($q$Have we been there before - listened for the word "you"$q$, $q$3. The three signals$q$, null::text, $q$check$q$, false, 80),
    ($q$Which category was this call?$q$, $q$4. Categorize$q$, $q$call_category$q$, $q$choice$q$, true, 90),
    ($q$Any urgent indicator overrode everything else$q$, $q$4. Categorize$q$, null::text, $q$check$q$, false, 100),
    ($q$Could not tell -> asked the one fallback question, no jargon$q$, $q$4. Categorize$q$, null::text, $q$check$q$, false, 110),
    ($q$Repeated it in their words and waited for the confirmation$q$, $q$5. Echo it back$q$, null::text, $q$check$q$, false, 120),
    ($q$Full name$q$, $q$6. The basics$q$, $q$caller_name$q$, $q$text$q$, true, 130),
    ($q$Service address - the job address, not the billing address$q$, $q$6. The basics$q$, $q$service_address$q$, $q$text$q$, true, 140),
    ($q$Best phone number$q$, $q$6. The basics$q$, $q$caller_phone$q$, $q$text$q$, true, 150),
    ($q$Email$q$, $q$6. The basics$q$, $q$caller_email$q$, $q$text$q$, false, 160),
    ($q$Text or email? - asked, not assumed$q$, $q$6. The basics$q$, $q$contact_preference$q$, $q$choice$q$, false, 170),
    ($q$What they said, in their words$q$, $q$6. The basics$q$, $q$situation$q$, $q$text$q$, true, 180),
    ($q$New or returning - address searched$q$, $q$6. The basics$q$, $q$new_or_returning$q$, $q$choice$q$, false, 190),
    ($q$How they heard about us$q$, $q$6. The basics$q$, $q$lead_source$q$, $q$text$q$, false, 200),
    ($q$Urgent call -> service address taken first$q$, $q$6. The basics$q$, null::text, $q$check$q$, false, 210),
    ($q$Hazard suspected, or they said they feel unsafe -> observation only$q$, $q$7. Safety$q$, null::text, $q$check$q$, false, 220),
    ($q$Asked only what they can already see, hear, smell or have noticed$q$, $q$7. Safety$q$, null::text, $q$check$q$, false, 230),
    ($q$Nothing that sent them toward the equipment$q$, $q$7. Safety$q$, null::text, $q$check$q$, false, 240),
    ($q$Photos only from a safe distance, nothing opened or touched$q$, $q$7. Safety$q$, null::text, $q$check$q$, false, 250),
    ($q$Correct procedure opened$q$, $q$8. Hand off$q$, null::text, $q$check$q$, false, 260),
    ($q$Nothing will be asked twice - everything carries forward$q$, $q$8. Hand off$q$, null::text, $q$check$q$, false, 270)
  ) as v(label, grp, field_key, input_type, req_dispatch, sort_order)
 where p.color = $q$answering$q$;

-- 6. Re-link the checklists detached at step 1, back to their own
--    company's copy. In-progress work survives this file.
update suite.checklist_runs r
   set procedure_id = p.id
  from suite.procedures p
 where r.color = $q$answering$q$
   and p.color = $q$answering$q$
   and p.company_id = r.company_id
   and r.procedure_id is null;

-- Options for the two pick-one items.
update suite.checklist_items set choices = array[
  'Emergency','Service','Estimate','Warranty','Complaint','Question']
 where field_key = 'call_category';
update suite.checklist_items set choices = array['Text','Email','Phone']
 where field_key = 'contact_preference';
update suite.checklist_items set choices = array['New','Returning']
 where field_key = 'new_or_returning';

commit;

-- 7. Proof. One row per company plus the template.
select coalesce(c.name, '** UNIVERSAL TEMPLATE **') as owner,
       p.color,
       p.schedules_to_calendar as schedulable,
       (select count(*) from suite.procedure_sections s where s.procedure_id = p.id) as sections,
       (select count(*) from suite.procedure_sections s where s.procedure_id = p.id and s.color_tag is not null) as colour_tagged,
       (select count(*) from suite.checklist_items i where i.procedure_id = p.id) as checklist_items
  from suite.procedures p
  left join suite.companies c on c.id = p.company_id
 where p.color = $q$answering$q$
 order by 1;
