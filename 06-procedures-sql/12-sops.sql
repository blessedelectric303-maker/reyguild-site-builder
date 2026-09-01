-- 12 - SOPs (universal). Administrator SOP + daily run cards.
-- Re-runnable. Safe to paste more than once.
-- Paste into a FRESH Supabase SQL tab.

begin;

-- 1. Detach any checklist somebody has part-filled. Deleting a
--    procedure out from under a saved run raises a foreign key
--    error and blocks the whole file. Re-linked at step 6.
update suite.checklist_runs set procedure_id = null
 where procedure_id in (select id from suite.procedures where color = $q$sops$q$);

-- 2. Clear the old copies of this colour.
delete from suite.checklist_items
 where procedure_id in (select id from suite.procedures where color = $q$sops$q$);
delete from suite.procedure_sections
 where procedure_id in (select id from suite.procedures where color = $q$sops$q$);
delete from suite.procedures where color = $q$sops$q$;

-- 3. The universal template. company_id null = ReyGuild's copy,
--    the one every new company is cloned from.
insert into suite.procedures
  (company_id, is_template, color, title, purpose, opening_script,
   may_not_say, one_pager, schedules_to_calendar, active)
values
  (null, true, $q$sops$q$, $q$SOPs$q$,
   $q$How the office runs. The administrator's day, scheduling, material, absences, invoicing and the daily run cards.

This is a starting framework, not a rulebook. Every value in [SQUARE BRACKETS] is a company setting and every time and threshold is editable. No prices and no trade specifics live here.

Where a section belongs to one kind of call it carries that colour. Most of this is the shape of the day rather than one call type, so most of it is tagged EVERY CALL - use the chip to see just those.$q$,
   null,
   $q$Never let a call go unanswered and unlogged.
Never promise a time you cannot hold.
Never let a customer find out about a delay from silence.
Never approve material without checking it against the scope.
Never dispatch somebody without telling them how they get their material.
Never let work begin without approval of the known scope and price.
Never offer money back without authority.
Never name an absent employee to a customer.
Never reschedule the same customer twice without escalating.
Never leave the desk empty without telling [MANAGER ROLE].$q$,
   null,
   false, true);

-- 4. Clone it into every company that exists.
insert into suite.procedures
  (company_id, is_template, color, title, purpose, opening_script,
   may_not_say, one_pager, schedules_to_calendar, active)
select c.id, false, t.color, t.title, t.purpose, t.opening_script,
       t.may_not_say, t.one_pager, t.schedules_to_calendar, true
  from suite.companies c
  cross join (select * from suite.procedures
               where color = $q$sops$q$ and company_id is null) t;

-- 5. Sections and checklist, applied to the template AND every clone
--    in one go, so no company can drift from the others.
insert into suite.procedure_sections
  (procedure_id, heading, body, collapsed_by_default, sort_order, color_tag)
select p.id, v.heading, v.body, v.collapsed, v.sort_order, v.color_tag
  from suite.procedures p
  cross join (values
    ($q$The role - what this seat actually is$q$, $q$EVERY JOB, EVERY DOLLAR AND EVERY CUSTOMER PASSES THROUGH THIS DESK.

The field does the work. This seat decides what work happens, when, by whom, and whether the company gets paid for it.

THE DIVISION OF AUTHORITY
[ADMIN ROLE] directs the schedule - who goes where, when, and in what order.
[SUPERVISOR ROLE] directs the work - how it gets done, whether it is right, and whether somebody is ready for it.

When those collide - you need somebody somewhere and the supervisor says they are not ready for it - the supervisor wins on the work and you rebuild the schedule around it. Escalate to [MANAGER ROLE] only if it cannot be resolved.

THE STANDARD THIS SEAT IS HELD TO
Answer the phone. A missed call is a lost job.
Say what you will do, then do it by when you said.
Never let a customer discover a problem before you tell them.
Write it down where the next person can find it.
Escalate early rather than quietly.$q$, true, 10, null::text),
    ($q$Daily opening - the order$q$, $q$[ADMIN START TIME] is before [FIELD START TIME] for a reason. That gap is what makes the day work.

1. CALL-INS AND MESSAGES. Voicemail, texts, email, missed calls. Anybody not coming in today.
2. REBUILD THE SCHEDULE around whoever is missing.
3. CONFIRM TODAY'S JOBS. Every job has a worker, a window and its material sorted.
4. CONFIRM MATERIAL. Anything needed today is bought, staged and the worker has been told how he gets it.
5. CUSTOMER NOTIFICATIONS. Anyone affected by a change is called before their window opens.
6. CLEAR THE INBOX. Leads first.
7. CONFIRM TOMORROW IS BUILT.

THE PRIORITY ORDER WHEN SOMETHING HAS TO MOVE
1. Emergency and priority work - never moved.
2. Safety-critical work - never moved.
3. Work already rescheduled once - escalate rather than move again.
4. Contracted or in-progress work.
5. Routine service.
6. Estimates - move these first.$q$, true, 20, null::text),
    ($q$Midday - watch the day run$q$, $q$Track arrivals and completions. A missing status is information.

Nobody started when they should have -> call them.
Nobody arrived near the window -> call the worker, then call the customer.
A job is running long -> look ahead immediately and warn whoever is affected.

NEVER LET THE CUSTOMER BE THE ONE WHO NOTICES WE ARE LATE.

THE MIDDAY QUESTION
"Is anything on today's schedule not going to happen, and does anybody need to know yet?"$q$, true, 30, null::text),
    ($q$End of day$q$, $q$Every completed job invoiced.
Every unfinished job has a return booked or a reason recorded.
Tomorrow's schedule published - workers, windows, material.
Material for tomorrow confirmed and the handover notes written.
Inbox at zero.
Anything escalating passed to [MANAGER ROLE].
Anything promised today, delivered.$q$, true, 40, null::text),
    ($q$Inbound work and leads$q$, $q$SPEED IS THE WHOLE GAME.
The company that answers first usually wins the job. Not the cheapest - the fastest to respond.

Leads answered within [LEAD RESPONSE TARGET].
Overnight leads answered before the field starts.
Every lead recorded with its source.

WHAT EVERY INBOUND CONTACT NEEDS
Name, service address, phone, contact preference, what they said in their own words, new or returning, how they heard about us.

Then run the answering kit, assign a colour, and open that procedure.$q$, true, 50, null::text),
    ($q$Scheduling$q$, $q$THE BLOCKS
Every job is scheduled in the company's defined blocks. [MINIMUM SCHEDULING BLOCK] is the floor.

Between two sizes, book the larger. Somebody finishing early is a good day. Somebody running over blows every appointment behind them.

WHO GOES
Match the work to the skill, not just to the gap in the calendar.
[SUPERVISOR ROLE] for anything complicated, unhappy or likely to grow.
Never send an unqualified or unsupervised worker alone.

WHAT EVERY CALENDAR ENTRY MUST CONTAIN
Customer, address, category, the problem in their words, background, approved scope and price, access, who will be there, material status, assignment, duration, history, instructions.

A BLANK LINE IS NOT THE SAME AS "NONE." A blank means nobody asked, and the worker cannot tell the difference.

CONFIRM IN WRITING
Date, window, address, what was agreed, the price, and the attendance and cancellation terms.$q$, true, 60, null::text),
    ($q$Absences and coverage$q$, $q$RECEIVING A CALL-OFF
Capture: name, date, time of the call, method used, reason as stated, expected return.
Record what was said. Do not editorialize and do not diagnose.
Company expectation: call by [CALL-IN DEADLINE], to [CALL-IN CONTACT], by [CALL-IN METHOD].

CLASSIFYING IT
On time, valid reason -> excused. Log it.
On time, repeated pattern -> log it and flag to [MANAGER ROLE].
Late notice -> log it and flag.
No call at all -> attempt contact, log it, notify [MANAGER ROLE] immediately.
Pre-approved time off -> not an absence, already on the calendar.
Emergency or medical -> excused per company policy.

Thresholds and consequences are [ATTENDANCE POLICY] - set by the company under its own employment policy, not decided at this desk.

THE SCHEDULE COMES FIRST
THE ABSENCE IS AN INTERNAL MATTER. THE CUSTOMERS ON THAT SCHEDULE ARE NOT.
1. List every job assigned to that person today.
2. Identify what cannot move.
3. Reassign what can be covered.
4. Call every affected customer before their window opens.
5. Never reschedule anybody twice without escalating.

NEVER NAME THE ABSENT EMPLOYEE OR GIVE A REASON TO A CUSTOMER.$q$, true, 70, $q$absence$q$),
    ($q$When this seat is empty$q$, $q$In most companies this is a single point of failure. If nobody knows the desk is empty, the schedule does not get built, customers do not get called, material does not get approved and invoices do not go out.

Any day this seat will be empty - planned or not - [MANAGER ROLE] is told directly.

THE DESK HANDOFF
Today's schedule and who is on which job.
Anyone expecting a call today, with numbers.
Any material approval waiting, and where.
Anyone expecting a callback.
Invoices due to go out.
Anything past due or escalating.
Tomorrow's schedule status - published or not.

Desk handoff sent, even if you are unwell. Ten minutes of typing saves the whole day.

This is about coverage, not about denying time off. Sick leave taken properly is never held against anybody.$q$, true, 80, $q$absence$q$),
    ($q$Material - approval and purchasing$q$, $q$THE GOAL
Material is staged and waiting before it is needed. Somebody standing at a counter is somebody not earning.

THE CORE RULE
WORKERS REQUEST. THE OFFICE APPROVES AND PURCHASES. NOTHING IS BOUGHT WITHOUT APPROVAL.
Where a company delegates purchasing authority, that is [PURCHASE AUTHORITY] - and the approval record still exists.

THE APPROVAL CHECK
1. Read every line - name, type, size, quantity. Vague gets clarified, never guessed.
2. Does it match the approved scope? A list that does not fit the job is usually miscommunication - ask.
3. Are the quantities reasonable? Padding gets a question, not an accusation.
4. Is it available where and when it is needed?
5. Check it against what the job was priced at. Materially over -> escalate before approving.
6. Approve and purchase.
7. Log the cost against the job.

A SUBSTITUTION IS A NEW APPROVAL. It does not inherit the original one.

Escalate before approving: anything above [PURCHASE APPROVAL LIMIT], cost materially over estimate, special order, rental or long-lead item, anything for an unsigned job.$q$, true, 90, $q$material$q$),
    ($q$Material - the handover note$q$, $q$BUYING IT IS HALF THE JOB. THE OTHER HALF IS THE WORKER KNOWING EXACTLY WHERE IT IS AND HOW HE GETS HOLD OF IT.

A purchase nobody was told about is the same as no purchase at all.

The note goes on the job record - not a message that lives in somebody's phone:
WHAT - HOW - WHERE - REFERENCE - WHEN - WHO TO ASK FOR - CAN HE START WITHOUT IT?

THE HANDOVER METHODS
Counter or will-call pickup -> which branch, address, order number or code, ready-from time, hours.
Supplier delivery to site -> the window, who receives it, where it will be left.
Delivered to the shop -> that he collects before heading out, and where it is held.
Brought by another employee -> who, where they meet, roughly when.
Already on his vehicle -> say so. Nobody drives to a counter for something already with him.
Held for a rescheduled date -> where it is stored, receipt confirmed before the job runs.

THE RULES
Confirmation reaches him before he leaves for the job or the supplier.
The branch is on his route - never one that backtracks.
Staged and paid before he arrives. He collects; he does not shop.
Site delivery names a receiver.
A substitution or branch change is a new note, not a verbal correction.
Rescheduled material confirmed received before the job returns to the calendar.

A WORKER SHOULD NEVER HAVE TO PHONE THE OFFICE TO FIND HIS OWN MATERIAL.$q$, true, 100, $q$material$q$),
    ($q$Material - when a job is waiting, or it is unavailable$q$, $q$WHEN A JOB IS WAITING
In order, stopping at the first that works:
1. Somebody already heading that way brings it.
2. A supervisory or support role runs it.
3. Supplier delivery.
4. The worker collects, staged and paid, on his route.
5. Reschedule.

WHEN IT IS UNAVAILABLE
Local sourcing -> expedited where reasonable -> an honest lead time -> schedule around actual availability.

Never promise a return date based on an uncertain delivery.$q$, true, 110, $q$material$q$),
    ($q$Time and payroll$q$, $q$Review time daily, not at the end of the period.
Missing or obviously wrong entries chased the same day.
Every correction records who authorized it.
Time is allocated against the job so costing means something.
Payroll cutoffs and approvals per [PAYROLL POLICY].$q$, true, 120, null::text),
    ($q$Invoicing and receivables$q$, $q$INVOICE PROMPTLY
Every completed job is invoiced per [INVOICING TIMELINE]. An invoice that goes out late gets paid late.

Before invoicing, confirm: the work matches what was quoted, additional work was authorized in writing, the name and address are right, the total matches the price book, terms per [PAYMENT TERMS].

FOLLOWING UP
Follow-up pacing is [COLLECTIONS CADENCE]. Existing collections, lien and third-party procedures stand as the company has written them.

Chase the invoice, never the relationship. A polite early reminder collects more than a late aggressive one.$q$, true, 130, null::text),
    ($q$Customer relations - the standard$q$, $q$Answer the phone.
Call back when you said you would.
Tell people bad news early.
Apologize for the experience, not for fault.
Never argue about money on the phone - that goes to [MANAGER ROLE].

REVIEWS
Ask only when the work is genuinely finished and they sound happy.
Never respond to a public review without [MANAGER ROLE].
Never trade anything for a review.$q$, true, 140, null::text),
    ($q$Complaints$q$, $q$Run the concern and complaint procedure. Listen, echo it back, apologize for the experience, give a specific action and a specific time, do it, follow up.

NO REFUNDS, CREDITS OR DISCOUNTS WITHOUT [MANAGER ROLE].$q$, true, 150, $q$concern$q$),
    ($q$Records$q$, $q$WHAT IS KEPT
Customer and job history, photos, approvals and their timestamps, proposals and versions, invoices and payments, material approvals, time records, complaints and resolutions, warranty claims and causes, attendance.

THE PRINCIPLE
IF IT COULD MATTER LATER, RECORD IT WHEN IT HAPPENS. NOBODY RECONSTRUCTS ACCURATELY THREE WEEKS ON.

Retention per [RECORD RETENTION].$q$, true, 160, null::text),
    ($q$Escalation$q$, $q$To [MANAGER ROLE], promptly:
Injury.
Property damage.
Emergency services attended.
A workmanship dispute.
Any request for money back.
A complaint about conduct.
Any threat of a review, chargeback or legal action.
A customer being rescheduled a second time.
A purchase over the approval limit.
A priority job that could not be covered.
Anything you are unsure about.

Everything else: handle it, log it, and include it in the regular update.

AN ESCALATION PATH THAT FIRES CONSTANTLY STOPS BEING READ.$q$, true, 170, null::text),
    ($q$Weekly and monthly cadence$q$, $q$WEEKLY
Outstanding estimates reviewed - sent versus signed.
Receivables reviewed and follow-ups paced per [COLLECTIONS CADENCE].
Next week's schedule built.
Attendance reviewed - anybody approaching a threshold flagged.
Complaints reviewed - anything unresolved chased.
Material spend checked against jobs.
Update to [MANAGER ROLE] - including what could not be done.

MONTHLY
Warranty causes reviewed - by cause, by worker, by product, by job type.
Complaint categories reviewed.
Estimate win rate reviewed.
Lead sources reviewed - what is actually working.
Price book reviewed - anything consistently wrong.
Supplier accounts reconciled, returns and credits recovered.
Unanswered-question report reviewed - the knowledge-base gaps.

ONE INCIDENT IS NOISE. THREE OF THE SAME IS A SYSTEM PROBLEM.
The monthly review is where patterns become decisions.$q$, true, 180, null::text),
    ($q$How to use the daily checklists$q$, $q$RUN THROUGH THEM IN YOUR HEAD. DO NOT PRINT THEM AND TICK THEM.

The boxes are prompts, not paperwork. They exist so that on a bad day, when you are tired and running behind, you can walk the list in thirty seconds and catch the one thing you forgot.

Nobody hands in a completed checklist. Nobody audits your boxes. If it becomes a stack of paper to fill out, people start ticking boxes instead of doing the work - and that is worse than having no checklist at all.

WHAT DOES GET RECORDED - and it lives in the system, not on a page:
Every inbound contact and the category it was given.
Approvals - scope, price, material - with timestamps.
Jobs moved or cancelled, and who was told.
Absences and call-offs.
Complaints - what was said, what was done, how it resolved.
Material approvals and the handover note.
Time corrections and who authorized them.
Warranty claims and their causes.
Estimates sent and followed up.
Invoices and collection contacts.$q$, true, 190, null::text),
    ($q$Run card 1 - start of day$q$, $q$CALL-INS AND MESSAGES
Voicemail, texts, email, missed calls checked.
Every absence logged - name, time of call, method, reason as stated.
Absence classified per [ATTENDANCE POLICY].
No call at all -> contact attempted, logged, [MANAGER ROLE] notified.

REBUILD THE SCHEDULE
Every job of an absent worker listed.
Priority and safety-critical work confirmed covered - these never move.
Nobody moved twice -> escalated instead.
Reassignments made and the covering worker briefed.

CUSTOMER NOTIFICATIONS
Every affected customer called before their window opens.
Two alternatives offered to each.
Nobody told the name or reason of an absent employee.
Every notification logged - who, when, what they agreed.

TODAY'S JOBS
Every job has a worker, a window and a complete calendar entry.
Every entry line filled or marked not applicable.
Access notes present - gates, codes, pets, who will be there.

MATERIAL FOR TODAY
Everything needed today is bought and staged.
Handover note on every job - what, how, where, reference, when, who to ask for.
"Can he start without it?" answered on each.
Pickup locations on route, not backtracking.
Head start built into the schedule where there is a collection.

INBOX
Worked to zero. Leads first - answered within [LEAD RESPONSE TARGET].
Overnight leads answered before the field starts.
Every contact categorized.

TOMORROW
Tomorrow's schedule built and published. Material for tomorrow ordered.$q$, true, 200, null::text),
    ($q$Run card 2 - midday$q$, $q$WATCH THE DAY
Start and arrival statuses checked.
Nobody started -> called them.
Nobody arrived near the window -> called the worker, then the customer.
A job running long -> looked ahead and warned whoever is affected.

Never let the customer be the one who notices we are late.

MATERIAL REQUESTS
Job reference present.
Every line read - name, type, size, quantity.
Vague -> clarified, not guessed.
Matches the approved scope? Queried if not.
Checked against what the job was priced at.
Over [PURCHASE APPROVAL LIMIT] or over estimate -> escalated before approving.
Approved, purchased, cost logged against the job.
HANDOVER NOTE WRITTEN and the worker told before he set off.
Substitution -> new approval, new note.

INBOUND
Every new contact categorized and its procedure opened.
Basics captured once - no colour procedure re-asked them.

THE MIDDAY QUESTION
"Is anything on today's schedule not going to happen - and does anybody need to know yet?"$q$, true, 210, null::text),
    ($q$Run card 3 - end of day$q$, $q$CLOSE THE JOBS
Every completed job invoiced per [INVOICING TIMELINE].
Work performed matches what was quoted.
Additional work authorized in writing.
Unfinished -> return booked, or a reason recorded.
Anything left unsafe -> confirmed made safe before the worker left.

TOMORROW IS READY
Schedule published - workers, windows, material.
Calendar entries complete.
Material confirmed and handover notes written.
Confirmations sent.

CLEAR THE DESK
Inbox at zero.
Everything promised today, delivered.
Anything escalating -> passed to [MANAGER ROLE].
Outstanding callbacks carried forward, not forgotten.$q$, true, 220, null::text)
  ) as v(heading, body, collapsed, sort_order, color_tag)
 where p.color = $q$sops$q$;

-- 6. Re-link the checklists detached at step 1, back to their own
--    company's copy. In-progress work survives this file.
update suite.checklist_runs r
   set procedure_id = p.id
  from suite.procedures p
 where r.color = $q$sops$q$
   and p.color = $q$sops$q$
   and p.company_id = r.company_id
   and r.procedure_id is null;

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
 where p.color = $q$sops$q$
 order by 1;
