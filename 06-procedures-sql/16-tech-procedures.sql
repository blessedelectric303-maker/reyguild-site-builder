-- 16 - TECH PROCEDURES (universal). The eight truck cards.
--
-- These are the TECH side. They deliberately use their own colour keys
-- (tech_emergency, tech_service_call ...) rather than sharing the office
-- ones. Two reasons, both of which would have been real bugs:
--   * the office procedure page fetches ONE row per colour. Two rows on
--     'emergency' would make it return nothing at all.
--   * checklist_runs are keyed by company and colour. Shared keys would
--     mean a tech's half-ticked checklist and the office's were the same
--     saved record, overwriting each other.
--
-- Run AFTER 10 (it needs the color_tag column). Re-runnable.
-- Paste into a FRESH Supabase SQL tab.

begin;

-- 1. Detach part-filled checklists so the delete cannot hit a foreign key.
update suite.checklist_runs set procedure_id = null
 where procedure_id in (select id from suite.procedures where color in ($q$tech_emergency$q$, $q$tech_service_call$q$, $q$tech_estimate$q$, $q$tech_warranty_call$q$, $q$tech_concern$q$, $q$tech_question$q$, $q$tech_material$q$, $q$tech_absence$q$));

-- 2. Clear old copies.
delete from suite.checklist_items
 where procedure_id in (select id from suite.procedures where color in ($q$tech_emergency$q$, $q$tech_service_call$q$, $q$tech_estimate$q$, $q$tech_warranty_call$q$, $q$tech_concern$q$, $q$tech_question$q$, $q$tech_material$q$, $q$tech_absence$q$));
delete from suite.procedure_sections
 where procedure_id in (select id from suite.procedures where color in ($q$tech_emergency$q$, $q$tech_service_call$q$, $q$tech_estimate$q$, $q$tech_warranty_call$q$, $q$tech_concern$q$, $q$tech_question$q$, $q$tech_material$q$, $q$tech_absence$q$));
delete from suite.procedures where color in ($q$tech_emergency$q$, $q$tech_service_call$q$, $q$tech_estimate$q$, $q$tech_warranty_call$q$, $q$tech_concern$q$, $q$tech_question$q$, $q$tech_material$q$, $q$tech_absence$q$);

-- 3. Universal templates, one per colour.
insert into suite.procedures
  (company_id, is_template, color, title, purpose, one_pager,
   schedules_to_calendar, assign_role, active)
values
  (null, true, $q$tech_emergency$q$, $q$Emergency$q$,
   $q$An emergency is a service call with three differences. This card covers the differences - the Service Call card covers the rest.$q$,
   $q$EMERGENCY - ONE PAGE

1. YOU'RE THERE BECAUSE YOU'RE CLOSEST.
   Complicated or upset customer -> should be [SUPERVISOR ROLE].
2. KIT ON ANYWAY. Don't skip the standards because you're in a hurry.
3. "SHOW ME WHERE IT'S AT - WHAT HAPPENED?" Don't walk past them.
4. LOOK BEFORE YOU TOUCH.
5. SAFE FIRST. DIAGNOSED SECOND. REPAIRED THIRD - IF THERE'S TIME.
6. NOT SAFE TO WORK? THAT CALL IS YOURS. You'll be supported, every time.
7. DROP CLOTHS DOWN. PROTECT THE AREA.
8. THEN RUN IT LIKE A SERVICE CALL. Same routine, same standards, same cleanup.
9. NO REPAIR PRICE UNTIL THEY'RE SAFE.
10. NOT FINISHED? LEAVE IT SAFE - NOTHING LIVE, NOTHING OPEN, NOTHING
    EXPOSED. THEN PHONE THE OFFICE.

A job left half-open with a live hazard in it is not a rescheduled job.
It is a hazard we walked away from.$q$,
   false, $q$tech$q$, true),
  (null, true, $q$tech_service_call$q$, $q$Service Call$q$,
   $q$Truck to driveway. The full run card for an ordinary service visit - everything the other cards refer back to.$q$,
   $q$SERVICE CALL - ONE PAGE

1. READ THE WHOLE JOB BEFORE YOU PULL AWAY.
2. KIT ON BEFORE YOU KNOCK. Gloves, booties, mask, tools in hand.
3. ECHO IT BACK. REASSURE ONCE.
3a. COVERINGS DOWN BEFORE TOOLS COME OUT.
    Cover what's below. Move or protect what's near.
4. CONFIRM THE SCOPE AND PRICE BEFORE YOU START.
   "Just do it" isn't authorization.
5. [STANDARD SERVICE FEE] = THE VISIT, UP TO [STANDARD SERVICE DURATION].
   Leftover time isn't a shopping window.
6. SCOPE CHANGES? STOP -> EXPLAIN -> PRICE -> APPROVE -> CARRY ON.
7. YOU NEVER BUY MATERIAL. Call the office. A substitution is a new approval.
8. DAMAGE? SAY SO IMMEDIATELY.
   Hiding it is a termination offense. Reporting it isn't.
9. EMERGENCY? MAKE IT SAFE FIRST. Not finished = left safe before you leave.
10. CLEANUP IS THE JOB.
    They should have to look for evidence you were there.$q$,
   false, $q$tech$q$, true),
  (null, true, $q$tech_estimate$q$, $q$Site Visit / Job Walk$q$,
   $q$The walk is the sale. They are deciding on you, not on the paper.$q$,
   $q$JOB WALK - ONE PAGE

1. THE WALK IS THE SALE. They're deciding on you, not the paper.
2. KIT ON BEFORE YOU KNOCK. Estimators too.
3. LET THEM SHOW YOU EVERYTHING. ECHO THE WHOLE LIST BACK.
4. THEN BREAK AWAY.
   "Mind if I take a look on my own for a few minutes?"
5. PANEL - ROUTE - MEASUREMENTS - PHOTOS - POWER REQUIREMENTS.
   Measure it, don't pace it.
6. OVERSIZED? STOP AND CALL THE OFFICE. Never invent a number.
7. CLEAN UP THE WALK. YES, ESTIMATORS TOO.
   Covers closed, gates closed, everything back.
   They should have to look for evidence you were there.
8. PRICE IN PRIVATE. Tools away, at the vehicle.
9. NO WORK ON A FREE ESTIMATE. Not a quick fix, not a favour.
10. SIGNED? BOOK IT BEFORE YOU LEAVE.
    THEN THE [FOLLOW-UP WINDOW] FOLLOW-UP IS YOURS.$q$,
   false, $q$tech$q$, true),
  (null, true, $q$tech_warranty_call$q$, $q$Warranty$q$,
   $q$Warranty is the supervisor's. If it landed on you, [SUPERVISOR ROLE] could not go - work it exactly as written and call him before you leave. They paid us and it did not hold. How this visit goes is who we are.$q$,
   $q$WARRANTY - ONE PAGE

1. THIS IS THE SUPERVISOR'S CALL.
   If it's yours, he couldn't go - call him before you leave.
2. READ THE ORIGINAL JOB BEFORE YOU KNOCK.
3. APOLOGIZE FIRST - FOR THE EXPERIENCE, NOT FOR FAULT.
4. SAY "NO CHARGE" EARLY. It's the only thing they're worried about.
5. NEVER BLAME THE TECH, THE CUSTOMER OR THE MATERIAL.
6. DON'T GUESS AT THE CAUSE OUT LOUD.
7. FIND THE ACTUAL CAUSE - THAT'S THE POINT OF THE VISIT.
8. CHECK THE WORK AROUND IT.
9. NOT COVERED? EXPLAIN -> CONVERT -> [STANDARD SERVICE FEE]
   APPROVED -> THEN PROCEED.
10. CAUSE CODE BEFORE YOU CLOSE. TELL THE SUPERVISOR.

They paid us and it didn't hold. How this visit goes is who we are.$q$,
   false, $q$tech$q$, true),
  (null, true, $q$tech_concern$q$, $q$Complaint$q$,
   $q$Run it while it is happening. Let them finish, echo it back, apologize for the experience, and tell the office the same day.$q$,
   $q$COMPLAINT - ONE PAGE

1. LET THEM FINISH. No defending, no explaining, no interrupting.
2. ECHO IT BACK. "Is that right? Anything I'm missing?"
3. APOLOGIZE FOR THE EXPERIENCE - NOT FOR FAULT.
4. NEVER BLAME another worker, the customer, the material, or the office.
5. NO OPINION ON WORKMANSHIP. That's a supervisor visit.
6. NO MONEY. EVER. Not a refund, credit, discount or freebie.
7. A SPECIFIC ACTION AND A SPECIFIC TIME - or an honest handoff to the office.
8. ABOUT YOUR OWN WORK? DON'T ARGUE. TAKE IT AND REPORT IT.
9. ABUSIVE? ONE CALM WARNING, THEN LEAVE. UNSAFE? LEAVE NOW.
10. TELL THE OFFICE THE SAME DAY - EVEN IF YOU THINK YOU SORTED IT.$q$,
   false, $q$tech$q$, true),
  (null, true, $q$tech_question$q$, $q$Questions$q$,
   $q$Answer what you know. Do not guess at what you do not. Then write it down and tell the office.$q$,
   $q$QUESTIONS - ONE PAGE

1. ANSWER WHAT YOU KNOW. DON'T GUESS AT WHAT YOU DON'T.
2. YOU CAN ANSWER: what you're doing, what you found, how it works,
   how long you'll be.
3. NEVER GIVE A PRICE. Not a guess, not a range.
   It becomes the number they remember.
4. NEVER PROMISE A DATE. You can't see the schedule.
5. NEVER JUDGE ANOTHER COMPANY'S WORK.
6. NEVER ANSWER A REGULATORY QUESTION FROM MEMORY.
7. THE SENTENCE: "I want to give you the right answer rather than a fast one -
   let me have the office get back to you."
8. THEN WRITE IT DOWN AND TELL THE OFFICE.
   A promised callback nobody knows about is a broken promise with your face on it.
9. WANT MORE WORK? WRITE IT, PHOTOGRAPH IT, DON'T PRICE IT, DON'T START IT.
10. THAT'S THE CHEAPEST LEAD THE COMPANY WILL EVER GET.
    DON'T LET IT DIE IN THE VAN.$q$,
   false, $q$tech$q$, true),
  (null, true, $q$tech_material$q$, $q$Material$q$,
   $q$You do not buy anything. Ever. Run this when you need something on a job.$q$,
   $q$MATERIAL - ONE PAGE

1. YOU DON'T BUY ANYTHING. EVER.
2. STEP AWAY FROM THE CUSTOMER BEFORE YOU CALL.
3. SEND: job reference, every line exactly, supplier and branch,
   how long you can work without it.
4. VAGUE GETS CLARIFIED, NOT GUESSED.
   A nearly-right part costs a whole trip.
5. WAIT FOR THE HANDOVER NOTE BEFORE YOU DRIVE ANYWHERE.
6. IT'S STAGED AND PAID. COLLECT AND LEAVE. DON'T SHOP.
7. A SUBSTITUTION IS A NEW APPROVAL. CALL - DON'T SWAP.
8. BRANCH WRONG OR CLOSED? SAY SO BEFORE YOU DRIVE.
9. RESCHEDULE? THE OFFICE TELLS YOU FIRST,
   AND THE OFFICE CALLS THE CUSTOMER.
10. LEFTOVERS GO BACK. MATERIAL IN A VAN IS MONEY ON THE FLOOR.$q$,
   false, $q$tech$q$, true),
  (null, true, $q$tech_absence$q$, $q$Calling Off$q$,
   $q$The call is not about you. It is about the customers expecting somebody. No call at all is the only version with real consequences.$q$,
   $q$CALLING OFF - ONE PAGE

1. CALL BY [CALL-IN DEADLINE]. Person or message - but never silence.
2. SAY: your name, you can't make it, roughly when you're back. That's all.
3. YOU DON'T OWE A MEDICAL HISTORY. NOBODY SHOULD ASK.
4. THE CALL ISN'T ABOUT YOU -
   IT'S ABOUT THE CUSTOMERS EXPECTING SOMEBODY.
5. NO CALL AT ALL IS THE ONLY VERSION WITH REAL CONSEQUENCES.
6. RUNNING LATE? CALL AS SOON AS YOU KNOW.
   Realistic time, not optimistic.
7. THE OFFICE CALLS THE CUSTOMER. NOT YOU.
8. LEAVING MID-DAY? CALL BEFORE YOU LEAVE THE JOB.
   Say what's done, make it safe.
9. PLANNED TIME OFF: REQUEST EARLY, THROUGH THE PROPER ROUTE.
10. IF IT'S NOT ON THE CALENDAR, IT'S NOT APPROVED.$q$,
   false, $q$tech$q$, true);

-- 4. Clone into every company.
insert into suite.procedures
  (company_id, is_template, color, title, purpose, one_pager,
   schedules_to_calendar, assign_role, active)
select c.id, false, t.color, t.title, t.purpose, t.one_pager,
       false, $q$tech$q$, true
  from suite.companies c
  cross join (select * from suite.procedures
               where color in ($q$tech_emergency$q$, $q$tech_service_call$q$, $q$tech_estimate$q$, $q$tech_warranty_call$q$, $q$tech_concern$q$, $q$tech_question$q$, $q$tech_material$q$, $q$tech_absence$q$) and company_id is null) t;

-- 5. The checklists, onto the template and every clone at once.
insert into suite.checklist_items
  (procedure_id, label, group_heading, input_type,
   required_to_dispatch, required_to_close, sort_order)
select p.id, v.label, v.grp, $q$check$q$, false, false, v.sort_order
  from suite.procedures p
  cross join (values
    ($q$You were sent because you were closest - not least busy$q$, $q$1. Getting there$q$, 10),
    ($q$Complicated, upset customer, or our own previous work -> should be [SUPERVISOR ROLE]. Say so if it isn't$q$, $q$1. Getting there$q$, 20),
    ($q$Unqualified worker not brought as the responder$q$, $q$1. Getting there$q$, 30),
    ($q$Clock in - on my way - arrived$q$, $q$1. Getting there$q$, 40),
    ($q$Kit on - did not skip it because you were in a hurry$q$, $q$2. At the door$q$, 50),
    ($q$Posted instructions checked$q$, $q$2. At the door$q$, 60),
    ($q$"Show me where it's at - what happened?"$q$, $q$2. At the door$q$, 70),
    ($q$Did not walk past them to the equipment$q$, $q$2. At the door$q$, 80),
    ($q$Captured: where, what happened and when, what they saw/heard/smelled, what they already did, anybody hurt, what's still running that they need$q$, $q$2. At the door$q$, 90),
    ($q$Echoed it back - short. Reassured once$q$, $q$2. At the door$q$, 100),
    ($q$Looked before touching$q$, $q$3. Make it safe$q$, 110),
    ($q$Anybody in danger right now?$q$, $q$3. Make it safe$q$, 120),
    ($q$Anything still actively failing?$q$, $q$3. Make it safe$q$, 130),
    ($q$Isolated or shut down$q$, $q$3. Make it safe$q$, 140),
    ($q$Then diagnosed$q$, $q$3. Make it safe$q$, 150),
    ($q$Not safe to work -> stopped, made the call, told the office$q$, $q$3. Make it safe$q$, 160),
    ($q$Drop cloths down, area protected, people kept clear$q$, $q$3. Make it safe$q$, 170),
    ($q$Scope and price approved before any additional work$q$, $q$4. Then run it like a service call$q$, 180),
    ($q$Customer kept informed$q$, $q$4. Then run it like a service call$q$, 190),
    ($q$Material needed -> called the office. Bought nothing$q$, $q$4. Then run it like a service call$q$, 200),
    ($q$Scope changed -> stop, explain, price, approval, carry on$q$, $q$4. Then run it like a service call$q$, 210),
    ($q$Damage or mark -> said so immediately$q$, $q$4. Then run it like a service call$q$, 220),
    ($q$No repair price quoted while they were still worried$q$, $q$4. Then run it like a service call$q$, 230),
    ($q$Turned out to be our own work -> stopped, called the office, no fee, no charge$q$, $q$4. Then run it like a service call$q$, 240),
    ($q$Fault isolated or shut down$q$, $q$5. If not finished$q$, 250),
    ($q$Nothing exposed anyone can reach - no open boxes, no exposed connections, no removed covers$q$, $q$5. If not finished$q$, 260),
    ($q$Customer told exactly what's off, what it means tonight, what's still not working$q$, $q$5. If not finished$q$, 270),
    ($q$Return scope written while fresh$q$, $q$5. If not finished$q$, 280),
    ($q$Photos taken$q$, $q$5. If not finished$q$, 290),
    ($q$Area cleaned and protected$q$, $q$5. If not finished$q$, 300),
    ($q$Cleanup to the full standard - an emergency makes more mess, not less$q$, $q$6. Before you leave$q$, 310),
    ($q$Walked them through what you found and did$q$, $q$6. Before you leave$q$, 320),
    ($q$Phoned the office: found, made safe, still not working, what remains, damage, utility or emergency services, our own work?$q$, $q$6. Before you leave$q$, 330),
    ($q$Job record and photos complete$q$, $q$6. Before you leave$q$, 340),
    ($q$Job done$q$, $q$6. Before you leave$q$, 350)
  ) as v(label, grp, sort_order)
 where p.color = $q$tech_emergency$q$;

insert into suite.checklist_items
  (procedure_id, label, group_heading, input_type,
   required_to_dispatch, required_to_close, sort_order)
select p.id, v.label, v.grp, $q$check$q$, false, false, v.sort_order
  from suite.procedures p
  cross join (values
    ($q$Whole calendar entry read - problem, approved scope and price, access, material, history$q$, $q$Before you arrive$q$, 10),
    ($q$Blank line? -> asked the office before leaving$q$, $q$Before you arrive$q$, 20),
    ($q$Clock in - on my way$q$, $q$Before you arrive$q$, 30),
    ($q$Running late -> called the office$q$, $q$Before you arrive$q$, 40),
    ($q$Kit on - gloves, booties, mask, tools in hand$q$, $q$At the door$q$, 50),
    ($q$Posted instructions checked before knocking$q$, $q$At the door$q$, 60),
    ($q$Arrived pressed$q$, $q$At the door$q$, 70),
    ($q$Echoed it back in their words - "did I get that right?"$q$, $q$At the door$q$, 80),
    ($q$Reassured once - read the room on contact$q$, $q$At the door$q$, 90),
    ($q$Asked: existing conditions, anything else on the circuit, what they tried, anything else on their list$q$, $q$At the door$q$, 100),
    ($q$Coverings down BEFORE tools come out$q$, $q$Protect it$q$, 110),
    ($q$Sheeting or tape over anything below the work$q$, $q$Protect it$q$, 120),
    ($q$Furniture, rugs and belongings moved back or covered$q$, $q$Protect it$q$, 130),
    ($q$Counters and finished surfaces protected$q$, $q$Protect it$q$, 140),
    ($q$Nothing leaned against a wall or cabinet$q$, $q$Protect it$q$, 150),
    ($q$Scope and price confirmed out loud$q$, $q$Before you start$q$, 160),
    ($q$"Just do it" not treated as authorization$q$, $q$Before you start$q$, 170),
    ($q$Understood: [STANDARD SERVICE FEE] covers the visit, up to [STANDARD SERVICE DURATION] - leftover time is not a shopping window$q$, $q$Before you start$q$, 180),
    ($q$Customer kept informed$q$, $q$During$q$, 190),
    ($q$Material needed -> stepped to the vehicle, called the office, name/type/size/quantity plus how long you can keep working$q$, $q$During$q$, 200),
    ($q$Did not buy anything$q$, $q$During$q$, 210),
    ($q$Substitution -> called, did not swap at the counter$q$, $q$During$q$, 220),
    ($q$Damage or stain -> told the customer immediately, then the supervisor$q$, $q$During$q$, 230),
    ($q$Turned out to be our own work -> stopped, called the office, no charge$q$, $q$During$q$, 240),
    ($q$STOP -> EXPLAIN -> RE-PRICE -> APPROVAL -> CARRY ON$q$, $q$If it changed$q$, 250),
    ($q$More work wanted -> scoped and photographed, not priced, not started$q$, $q$If it changed$q$, 260),
    ($q$Bigger than the block -> made safe, stopped, office priced the rest$q$, $q$If it changed$q$, 270),
    ($q$Swept and vacuumed, trash out with you, handprints wiped$q$, $q$Closing out$q$, 280),
    ($q$Everything moved back, everything opened closed, insulation replaced$q$, $q$Closing out$q$, 290),
    ($q$Drop cloths shaken out outside$q$, $q$Closing out$q$, 300),
    ($q$They'd have to look for evidence you were there$q$, $q$Closing out$q$, 310),
    ($q$Walked them through what you found and did$q$, $q$Closing out$q$, 320),
    ($q$Leave-behind if first visit$q$, $q$Closing out$q$, 330),
    ($q$Job record: cause, what you did, what's outstanding, return scope, photos, any damage$q$, $q$Closing out$q$, 340),
    ($q$Job done - clock out at end of day$q$, $q$Closing out$q$, 350)
  ) as v(label, grp, sort_order)
 where p.color = $q$tech_service_call$q$;

insert into suite.checklist_items
  (procedure_id, label, group_heading, input_type,
   required_to_dispatch, required_to_close, sort_order)
select p.id, v.label, v.grp, $q$check$q$, false, false, v.sort_order
  from suite.procedures p
  cross join (values
    ($q$Job read - what they want, why now, existing equipment info, equipment, access, who decides$q$, $q$Before you arrive$q$, 10),
    ($q$Specs confirmed ready, if the office flagged them$q$, $q$Before you arrive$q$, 20),
    ($q$Tape, camera, existing equipment tools, price book, leave-behind$q$, $q$Before you arrive$q$, 30),
    ($q$Clock in - on my way$q$, $q$Before you arrive$q$, 40),
    ($q$Kit on, posted instructions checked, arrived pressed$q$, $q$Arrival and walkthrough$q$, 50),
    ($q$Let them show you everything - no scoping out loud yet$q$, $q$Arrival and walkthrough$q$, 60),
    ($q$Captured: every item, what's driving it, their timeline, anyone else quoting$q$, $q$Arrival and walkthrough$q$, 70),
    ($q$Echoed the whole list back$q$, $q$Arrival and walkthrough$q$, 80),
    ($q$Reassured once$q$, $q$Arrival and walkthrough$q$, 90),
    ($q$Broke away: "do you mind if I take a look on my own for a few minutes?"$q$, $q$Arrival and walkthrough$q$, 100),
    ($q$Requirements - everything the price book needs, written down$q$, $q$On your own$q$, 110),
    ($q$Spec sheet or model number photographed$q$, $q$On your own$q$, 120),
    ($q$Existing equipment - space, main size, capacity for what is being added, condition, photographed$q$, $q$On your own$q$, 130),
    ($q$Route walked - actual path, not straight line$q$, $q$On your own$q$, 140),
    ($q$Distance measured, not paced$q$, $q$On your own$q$, 150),
    ($q$Indoor/garage/outside, finished walls, attic or crawl access$q$, $q$On your own$q$, 160),
    ($q$Excavation, penetration or special methods needed?$q$, $q$On your own$q$, 170),
    ($q$Photos - existing equipment, work areas, route, access, anything unusual$q$, $q$On your own$q$, 180),
    ($q$Material list built$q$, $q$On your own$q$, 190),
    ($q$Oversized? Stopped and called the office$q$, $q$On your own$q$, 200),
    ($q$Every cover, hatch, cabinet and access door closed$q$, $q$Clean up, then build it$q$, 210),
    ($q$Every gate closed$q$, $q$Clean up, then build it$q$, 220),
    ($q$Everything moved put back exactly$q$, $q$Clean up, then build it$q$, 230),
    ($q$Debris swept, footprints and handprints gone, nothing of yours left behind$q$, $q$Clean up, then build it$q$, 240),
    ($q$Priced in private - tools away, at the vehicle$q$, $q$Clean up, then build it$q$, 250),
    ($q$Every line from the price book. Nothing invented$q$, $q$Clean up, then build it$q$, 260),
    ($q$Related items confirmed - circuits, footage, trenching, circuit protections$q$, $q$Clean up, then build it$q$, 270),
    ($q$Footage rounded up$q$, $q$Clean up, then build it$q$, 280),
    ($q$Address correct on the header$q$, $q$Clean up, then build it$q$, 290),
    ($q$Photos attached, thank-you line, standard scope clause$q$, $q$Clean up, then build it$q$, 300),
    ($q$Name and address correct$q$, $q$Review before presenting$q$, 310),
    ($q$Every item they asked for is on it - checked against your echo$q$, $q$Review before presenting$q$, 320),
    ($q$Nothing on it they didn't ask for$q$, $q$Review before presenting$q$, 330),
    ($q$Read it as if you were the customer$q$, $q$Review before presenting$q$, 340),
    ($q$Walked through top to bottom in their words$q$, $q$Present it$q$, 350),
    ($q$[WARRANTY PERIOD] warranty mentioned$q$, $q$Present it$q$, 360),
    ($q$Payment structure, deposit, invoice due on completion$q$, $q$Present it$q$, 370),
    ($q$"Nothing gets added without your approval"$q$, $q$Present it$q$, 380),
    ($q$Hesitated? -> [ESTIMATE VALIDITY] mentioned. Only if they hesitated$q$, $q$Present it$q$, 390),
    ($q$Signed -> called the office and booked it before leaving the driveway$q$, $q$Present it$q$, 400),
    ($q$Didn't sign -> didn't chase. Office follows up$q$, $q$Present it$q$, 410),
    ($q$No work on a free estimate. Nothing repaired, adjusted or quickly fixed$q$, $q$Before you leave$q$, 420),
    ($q$Service-sized finding -> priced or identified, office schedules it$q$, $q$Before you leave$q$, 430),
    ($q$Walk cleaned up, everything closed and put back$q$, $q$Before you leave$q$, 440),
    ($q$Estimate sent, or they know when it's coming$q$, $q$Before you leave$q$, 450),
    ($q$Leave-behind if first visit$q$, $q$Before you leave$q$, 460),
    ($q$Photos and measurements on the record$q$, $q$Before you leave$q$, 470),
    ($q$Office told - signed, undecided, or oversized$q$, $q$Before you leave$q$, 480),
    ($q$Job done. [FOLLOW-UP WINDOW] follow-up is yours and it's in your calendar$q$, $q$Before you leave$q$, 490)
  ) as v(label, grp, sort_order)
 where p.color = $q$tech_estimate$q$;

insert into suite.checklist_items
  (procedure_id, label, group_heading, input_type,
   required_to_dispatch, required_to_close, sort_order)
select p.id, v.label, v.grp, $q$check$q$, false, false, v.sort_order
  from suite.procedures p
  cross join (values
    ($q$Original job read - what we did, when, who did it, photos, material list$q$, $q$Before you arrive$q$, 10),
    ($q$Inside [WARRANTY PERIOD]?$q$, $q$Before you arrive$q$, 20),
    ($q$Previous warranty visits to this address checked$q$, $q$Before you arrive$q$, 30),
    ($q$Likely parts on board$q$, $q$Before you arrive$q$, 40),
    ($q$Clock in - on my way$q$, $q$Before you arrive$q$, 50),
    ($q$Kit on - it matters more on this visit$q$, $q$At the door$q$, 60),
    ($q$Arrived pressed$q$, $q$At the door$q$, 70),
    ($q$Apologized first - for the experience, not for fault$q$, $q$At the door$q$, 80),
    ($q$Let them tell the whole story, echoed it back$q$, $q$At the door$q$, 90),
    ($q$Said "no charge" early$q$, $q$At the door$q$, 100),
    ($q$Did not blame the tech, the customer or the material$q$, $q$At the door$q$, 110),
    ($q$Did not guess at the cause out loud$q$, $q$At the door$q$, 120),
    ($q$Did not sound surprised$q$, $q$At the door$q$, 130),
    ($q$What actually failed$q$, $q$Find the cause$q$, 140),
    ($q$Why it failed$q$, $q$Find the cause$q$, 150),
    ($q$One-off, or something we may be repeating?$q$, $q$Find the cause$q$, 160),
    ($q$Checked the work around it - one loose termination, were the others?$q$, $q$Find the cause$q$, 170),
    ($q$Photos - before and after$q$, $q$Find the cause$q$, 180),
    ($q$Our workmanship, inside [WARRANTY PERIOD] -> covered, no charge$q$, $q$Coverage$q$, 190),
    ($q$We supplied the failed material -> covered$q$, $q$Coverage$q$, 200),
    ($q$Customer-supplied product, our install correct -> customer pays$q$, $q$Coverage$q$, 210),
    ($q$Altered by somebody else, or unrelated -> convert$q$, $q$Coverage$q$, 220),
    ($q$Outside [WARRANTY PERIOD] -> chargeable unless [MANAGER ROLE] says otherwise$q$, $q$Coverage$q$, 230),
    ($q$Unsure -> called [SUPERVISOR ROLE]. Did not decide it on the driveway$q$, $q$Coverage$q$, 240),
    ($q$Explained the specific finding$q$, $q$If it converts$q$, 250),
    ($q$[STANDARD SERVICE FEE] quoted - diagnostic and first [STANDARD SERVICE DURATION]$q$, $q$If it converts$q$, 260),
    ($q$Approval obtained BEFORE any paid work$q$, $q$If it converts$q$, 270),
    ($q$Office called so the record and invoice match$q$, $q$If it converts$q$, 280),
    ($q$Pushback -> escalated, didn't defend it twice$q$, $q$If it converts$q$, 290),
    ($q$Other work found -> scoped and photographed, quoted separately, never blended$q$, $q$Closing out$q$, 300),
    ($q$Cleanup to the full standard$q$, $q$Closing out$q$, 310),
    ($q$Walked them through what failed, why, what you did, what you tested$q$, $q$Closing out$q$, 320),
    ($q$Cause code recorded: material, installation, design/scope, customer-caused, not our work$q$, $q$Closing out$q$, 330),
    ($q$Job record complete with photos$q$, $q$Closing out$q$, 340),
    ($q$[SUPERVISOR ROLE] told - every time, including the cause$q$, $q$Closing out$q$, 350),
    ($q$[WARRANTY PAY POLICY] minimum logged$q$, $q$Closing out$q$, 360),
    ($q$Job done$q$, $q$Closing out$q$, 370)
  ) as v(label, grp, sort_order)
 where p.color = $q$tech_warranty_call$q$;

insert into suite.checklist_items
  (procedure_id, label, group_heading, input_type,
   required_to_dispatch, required_to_close, sort_order)
select p.id, v.label, v.grp, $q$check$q$, false, false, v.sort_order
  from suite.procedures p
  cross join (values
    ($q$Let them finish - no interrupting, no defending, no explaining$q$, $q$1. Listen$q$, 10),
    ($q$Said nothing but "okay", "I understand", "go ahead"$q$, $q$1. Listen$q$, 20),
    ($q$Repeated it in their words$q$, $q$2. Echo it back$q$, 30),
    ($q$"Is that right? Anything I'm missing?"$q$, $q$2. Echo it back$q$, 40),
    ($q$"I'm sorry that's how this went"$q$, $q$3. Apologize for the experience$q$, 50),
    ($q$Did not admit fault$q$, $q$3. Apologize for the experience$q$, 60),
    ($q$Did not blame another worker, the customer, the material, or the office$q$, $q$3. Apologize for the experience$q$, 70),
    ($q$A specific action, or an honest handoff to the office$q$, $q$4. What happens next$q$, 80),
    ($q$A specific time given - never "soon"$q$, $q$4. What happens next$q$, 90),
    ($q$Office told, so the call actually happens$q$, $q$4. What happens next$q$, 100),
    ($q$No money offered - no refund, credit, discount or free work$q$, $q$5. What you didn't do$q$, 110),
    ($q$No opinion given on workmanship$q$, $q$5. What you didn't do$q$, 120),
    ($q$Did not argue - especially if it was about your own work$q$, $q$5. What you didn't do$q$, 130),
    ($q$Angry -> absorbed it and kept working$q$, $q$6. If it escalated$q$, 140),
    ($q$Abusive -> one calm warning$q$, $q$6. If it escalated$q$, 150),
    ($q$Continued -> left, then called the office$q$, $q$6. If it escalated$q$, 160),
    ($q$Felt unsafe -> left immediately, no warning needed$q$, $q$6. If it escalated$q$, 170),
    ($q$Office told - same day, every time$q$, $q$7. Before the day ends$q$, 180),
    ($q$Reported: their words, what you said, what you promised and by when, whether they seemed satisfied, anything you saw$q$, $q$7. Before the day ends$q$, 190),
    ($q$About your own work? Reported exactly the same way$q$, $q$7. Before the day ends$q$, 200)
  ) as v(label, grp, sort_order)
 where p.color = $q$tech_concern$q$;

insert into suite.checklist_items
  (procedure_id, label, group_heading, input_type,
   required_to_dispatch, required_to_close, sort_order)
select p.id, v.label, v.grp, $q$check$q$, false, false, v.sort_order
  from suite.procedures p
  cross join (values
    ($q$What you're doing, what you found, how it works, how long you'll be, what the company does -> answer freely$q$, $q$1. Can you answer it?$q$, 10),
    ($q$Answered the question they asked - didn't lecture$q$, $q$1. Can you answer it?$q$, 20),
    ($q$A price -> office. Not a guess, not a range$q$, $q$2. Or does it go to the office?$q$, 30),
    ($q$A date or timeline -> office$q$, $q$2. Or does it go to the office?$q$, 40),
    ($q$"Is it up to standard?" -> office$q$, $q$2. Or does it go to the office?$q$, 50),
    ($q$Permits or regulatory -> office$q$, $q$2. Or does it go to the office?$q$, 60),
    ($q$Another company's work -> never$q$, $q$2. Or does it go to the office?$q$, 70),
    ($q$An hourly rate -> office$q$, $q$2. Or does it go to the office?$q$, 80),
    ($q$"Can you just do it now?" -> scope change, needs pricing and approval$q$, $q$2. Or does it go to the office?$q$, 90),
    ($q$"I want to give you the right answer rather than a fast one"$q$, $q$3. If you didn't know$q$, 100),
    ($q$Question written down while fresh$q$, $q$3. If you didn't know$q$, 110),
    ($q$Their preferred contact captured$q$, $q$3. If you didn't know$q$, 120),
    ($q$Office told the same day$q$, $q$3. If you didn't know$q$, 130),
    ($q$Written down in their words$q$, $q$4. If they wanted more work$q$, 140),
    ($q$Photographed$q$, $q$4. If they wanted more work$q$, 150),
    ($q$Not priced. Not started - even if small$q$, $q$4. If they wanted more work$q$, 160),
    ($q$"Let me get the details to the office"$q$, $q$4. If they wanted more work$q$, 170),
    ($q$Office told the same day$q$, $q$4. If they wanted more work$q$, 180),
    ($q$Every unanswered question passed on$q$, $q$5. Before the day ends$q$, 190),
    ($q$Every request for more work passed on$q$, $q$5. Before the day ends$q$, 200),
    ($q$Anything you promised, recorded$q$, $q$5. Before the day ends$q$, 210),
    ($q$Same question coming up repeatedly -> told the office$q$, $q$5. Before the day ends$q$, 220)
  ) as v(label, grp, sort_order)
 where p.color = $q$tech_question$q$;

insert into suite.checklist_items
  (procedure_id, label, group_heading, input_type,
   required_to_dispatch, required_to_close, sort_order)
select p.id, v.label, v.grp, $q$check$q$, false, false, v.sort_order
  from suite.procedures p
  cross join (values
    ($q$Stepped away from the customer$q$, $q$1. Before you call$q$, 10),
    ($q$Did not mention a delay yet - the office needs a plan first$q$, $q$1. Before you call$q$, 20),
    ($q$Job reference$q$, $q$2. The request$q$, 30),
    ($q$Every line - name, type, size, quantity$q$, $q$2. The request$q$, 40),
    ($q$Supplier and branch - closest on your route$q$, $q$2. The request$q$, 50),
    ($q$How long you can keep working without it - answered honestly$q$, $q$2. The request$q$, 60),
    ($q$Exact, not vague. A nearly-right part costs a whole trip$q$, $q$2. The request$q$, 70),
    ($q$Built in the supplier app or portal where the company uses one$q$, $q$2. The request$q$, 80),
    ($q$What, how, where, reference, when, who to ask for$q$, $q$3. The handover came back$q$, 90),
    ($q$Can you start without it? - answered$q$, $q$3. The handover came back$q$, 100),
    ($q$You did not leave until you had it$q$, $q$3. The handover came back$q$, 110),
    ($q$Collected and left. Did not shop$q$, $q$4. At the supplier$q$, 120),
    ($q$Wrong or missing -> called the office$q$, $q$4. At the supplier$q$, 130),
    ($q$Did not swap at the shelf - a substitution is a new approval$q$, $q$4. At the supplier$q$, 140),
    ($q$Branch wrong or closed -> said so before driving$q$, $q$4. At the supplier$q$, 150),
    ($q$Office told you before you told the customer$q$, $q$5. If it became a reschedule$q$, 160),
    ($q$Made it safe and tidy before leaving$q$, $q$5. If it became a reschedule$q$, 170),
    ($q$Office contacted the customer - not you$q$, $q$5. If it became a reschedule$q$, 180),
    ($q$Leftover material returned$q$, $q$6. After$q$, 190),
    ($q$Nothing job-bought living in the van$q$, $q$6. After$q$, 200),
    ($q$Damaged or wrong stock reported, not binned$q$, $q$6. After$q$, 210)
  ) as v(label, grp, sort_order)
 where p.color = $q$tech_material$q$;

insert into suite.checklist_items
  (procedure_id, label, group_heading, input_type,
   required_to_dispatch, required_to_close, sort_order)
select p.id, v.label, v.grp, $q$check$q$, false, false, v.sort_order
  from suite.procedures p
  cross join (values
    ($q$Called by [CALL-IN DEADLINE]$q$, $q$1. Calling off$q$, 10),
    ($q$To [CALL-IN CONTACT], by [CALL-IN METHOD]$q$, $q$1. Calling off$q$, 20),
    ($q$Spoke to a person, or left a message - did not stay silent$q$, $q$1. Calling off$q$, 30),
    ($q$Gave: your name, that you can't make it, roughly when you expect to be back$q$, $q$1. Calling off$q$, 40),
    ($q$Did not wait, if you knew earlier$q$, $q$1. Calling off$q$, 50),
    ($q$Called as soon as you knew - not once you were already late$q$, $q$2. Running late$q$, 60),
    ($q$Realistic new time given, not optimistic$q$, $q$2. Running late$q$, 70),
    ($q$Let the office contact the customer - did not do it yourself$q$, $q$2. Running late$q$, 80),
    ($q$Called before leaving the job$q$, $q$3. Leaving mid-day$q$, 90),
    ($q$Said what's finished and what isn't$q$, $q$3. Leaving mid-day$q$, 100),
    ($q$Site made safe and tidy$q$, $q$3. Leaving mid-day$q$, 110),
    ($q$Told them what's still on your schedule$q$, $q$3. Leaving mid-day$q$, 120),
    ($q$Requested as far ahead as possible$q$, $q$4. Planned time off$q$, 130),
    ($q$Through [TIME OFF REQUEST METHOD]$q$, $q$4. Planned time off$q$, 140),
    ($q$Confirmed it's on the calendar - if it isn't, it isn't approved$q$, $q$4. Planned time off$q$, 150)
  ) as v(label, grp, sort_order)
 where p.color = $q$tech_absence$q$;

-- 6. Re-link the detached checklists to their own company's copy.
update suite.checklist_runs r
   set procedure_id = p.id
  from suite.procedures p
 where r.color in ($q$tech_emergency$q$, $q$tech_service_call$q$, $q$tech_estimate$q$, $q$tech_warranty_call$q$, $q$tech_concern$q$, $q$tech_question$q$, $q$tech_material$q$, $q$tech_absence$q$)
   and p.color = r.color
   and p.company_id = r.company_id
   and r.procedure_id is null;

commit;

-- 7. Proof. Eight rows per company plus eight for the template.
select coalesce(c.name, '** UNIVERSAL TEMPLATE **') as owner,
       p.color, p.title,
       (select count(*) from suite.checklist_items i where i.procedure_id = p.id) as checklist_items,
       length(p.one_pager) as one_page_chars
  from suite.procedures p
  left join suite.companies c on c.id = p.company_id
 where p.assign_role = $q$tech$q$
 order by 1, 2;
