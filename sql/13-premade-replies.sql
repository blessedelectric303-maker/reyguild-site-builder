-- 13 - SCRIPTS (universal). What to say, colour coded.
-- Re-runnable. Safe to paste more than once.
-- Paste into a FRESH Supabase SQL tab.

begin;

-- 1. Detach any checklist somebody has part-filled. Deleting a
--    procedure out from under a saved run raises a foreign key
--    error and blocks the whole file. Re-linked at step 6.
update suite.checklist_runs set procedure_id = null
 where procedure_id in (select id from suite.procedures where color = $q$replies$q$);

-- 2. Clear the old copies of this colour.
delete from suite.checklist_items
 where procedure_id in (select id from suite.procedures where color = $q$replies$q$);
delete from suite.procedure_sections
 where procedure_id in (select id from suite.procedures where color = $q$replies$q$);
delete from suite.procedures where color = $q$replies$q$;

-- 3. The universal template. company_id null = ReyGuild's copy,
--    the one every new company is cloned from.
insert into suite.procedures
  (company_id, is_template, color, title, purpose, opening_script,
   may_not_say, one_pager, schedules_to_calendar, active)
values
  (null, true, $q$replies$q$, $q$Scripts$q$,
   $q$What to say, word for word, for the calls this desk takes every day.

A script is a floor, not a ceiling. It stops somebody freezing, forgetting the important line, or promising something the company cannot do. Nobody should sound like they are reading. They should sound like somebody who has done this before.

Every script is editable and every value in [SQUARE BRACKETS] is a company setting. The coloured tag on each one tells you which call it belongs to. Use the colour chips or the search box to find one fast, and COPY to paste it into an email or a text.$q$,
   null,
   $q$Never interrupt somebody to start sorting the call.
Never run screening questions before acknowledging the problem.
Never use our words - warranty, diagnostic, estimate - before they have.
Never talk somebody out of an unsafe symptom.
Never end a call without name, address, phone and a contact preference.
Never quote a price from memory.
Never promise a time you cannot hold.
Never name an absent employee to a customer.
Never argue about money on the phone.
Never let a customer discover a delay from silence.$q$,
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
               where color = $q$replies$q$ and company_id is null) t;

-- 5. Sections and checklist, applied to the template AND every clone
--    in one go, so no company can drift from the others.
insert into suite.procedure_sections
  (procedure_id, heading, body, collapsed_by_default, sort_order, color_tag)
select p.id, v.heading, v.body, v.collapsed, v.sort_order, v.color_tag
  from suite.procedures p
  cross join (values
    ($q$Answer the phone$q$, $q$"Thank you for calling [COMPANY NAME], this is [name]. How can I help you today?"

Answer within [RING TARGET].$q$, true, 10, null::text),
    ($q$Listen all the way through$q$, $q$DO NOT TYPE. DO NOT INTERRUPT. DO NOT START SORTING OUT LOUD.

Most people tell you the category in the first fifteen seconds without being asked.$q$, true, 20, null::text),
    ($q$Recognize what it is$q$, $q$Listen for three things - usually all present in the first two sentences.

Is anybody in danger - anything urgent, unsafe or actively causing damage.
Is it broken, or is it new work - "stopped working" versus "I want".
Have we been there before - "you guys", "you installed", "you were out".

LISTEN FOR THE WORD "YOU." That single word is the difference between a service call and a warranty claim - between a customer who pays and one who should not.$q$, true, 30, null::text),
    ($q$If you genuinely cannot tell - the one question$q$, $q$"Let me put it this way - is it something that's broken and needs fixing, something new you'd like done, or something we've already done for you before?"

No jargon. No category names. Those are our words, not theirs.$q$, true, 40, null::text),
    ($q$Echo it back$q$, $q$"So what I'm hearing is [their words]. Did I get that right?"

Wait for the confirmation before moving on.$q$, true, 50, null::text),
    ($q$Take the basics$q$, $q$Name, service address, phone, text or email, new or returning, how they heard about us.

Captured once. No colour procedure asks for them again.$q$, true, 60, null::text),
    ($q$The universal safety rule$q$, $q$NEVER TALK A CUSTOMER THROUGH ANYTHING THEY ARE NOT QUALIFIED TO DO.

Where a hazard is suspected - or the customer simply says they feel unsafe - ask only what they can already see, hear, smell or have noticed. Nothing that sends them toward the equipment.

That last one is enough on its own. If they do not want to go near it, they do not go near it.

Trade-specific limits are defined in the company's trade extension. Where none is set, the restrictive version applies.$q$, true, 70, null::text),
    ($q$Emergency - the first question$q$, $q$"Is anyone hurt? Is anything happening right now that seems dangerous?"$q$, true, 80, $q$emergency$q$),
    ($q$Emergency - if emergency services are needed$q$, $q$"I need you to get everyone away from it and call [EMERGENCY NUMBER] right now. Call me back when you're safe and I'll get someone moving."

Make them confirm they are calling before the call ends.$q$, true, 90, $q$emergency$q$),
    ($q$Emergency - the distance instruction$q$, $q$"Stay away from it, don't touch it, and don't use it until we get there."$q$, true, 100, $q$emergency$q$),
    ($q$Emergency - the fee, disclosed before dispatch$q$, $q$"Before I get someone moving I want to be upfront about the cost. Priority response is [EMERGENCY FEE], and that covers [STANDARD SERVICE DURATION] on site. If it needs material or more time, we'd give you a price before doing anything. Are you okay with that so I can get someone headed your way?"$q$, true, 110, $q$emergency$q$),
    ($q$Emergency - where there is no immediate danger, offer both$q$, $q$"There's no safety issue here, so it's your call. I can get someone out as a priority - that's [EMERGENCY FEE]. Or our next available appointment at [STANDARD SERVICE FEE]. You know what the delay costs you better than I do."$q$, true, 120, $q$emergency$q$),
    ($q$Emergency - the callback promise$q$, $q$"Let me make a couple of calls and I'll ring you right back - within [FOLLOW-UP WINDOW] - and tell you who's headed your way."

PROMISE THE CALLBACK, NOT A NAMED WORKER. You have not confirmed one yet.$q$, true, 130, $q$emergency$q$),
    ($q$Emergency - if we cannot cover it$q$, $q$"I'm going to be straight with you rather than have you waiting. The soonest I can get somebody to you is [time]. If you need somebody sooner than that, I completely understand calling another company - I'd rather tell you now than leave you hanging."$q$, true, 140, $q$emergency$q$),
    ($q$Service - the price$q$, $q$"Our standard service visit is [STANDARD SERVICE FEE]. That covers [STANDARD SERVICE DURATION] - finding what's wrong and, most of the time, fixing it right there. If it needs material or more time, we tell you the number before we do anything."$q$, true, 150, $q$service_call$q$),
    ($q$Service - the phrase that prevents disputes$q$, $q$"NOTHING GETS ADDED WITHOUT YOU APPROVING IT FIRST."

Say it out loud on every call.$q$, true, 160, $q$service_call$q$),
    ($q$Service - asking for photos$q$, $q$"Can you send me a few photos? With those I can usually give you a real number instead of a guess."

Only ever from a safe distance. Nothing opened, removed or approached.$q$, true, 170, $q$service_call$q$),
    ($q$Service - the extra-work question$q$, $q$"Is there anything else on your list while we've got somebody there?"

Cheapest extra revenue in the business. Ask it every time.$q$, true, 180, $q$service_call$q$),
    ($q$Service - attendance and cancellation, at booking$q$, $q$"Just so you know - if we arrive and nobody's home or we can't get access, that's [NO-SHOW FEE]. And if you need to move it, no problem at all, just give us more than [CANCELLATION WINDOW]."

It goes in the written confirmation too. Nobody should learn this from an invoice.$q$, true, 190, $q$service_call$q$),
    ($q$Service - running late$q$, $q$"Good morning, this is [name] from [COMPANY NAME]. Your [worker] is running behind on an earlier job, and I'd rather give you an updated time than leave you waiting. We're now looking at [new window]. Does that still work?"$q$, true, 200, $q$service_call$q$),
    ($q$Proposal - the offer$q$, $q$"That's the kind of work we do a lot of. What we do is send somebody out to look at it properly - [ESTIMATE VISIT CHARGE]. They'll measure everything and give you a firm written price before they leave. I've got [option 1] or [option 2] - which works better?"$q$, true, 210, $q$estimate$q$),
    ($q$Proposal - if they push for a number now$q$, $q$"I could throw a number at you, but I'd be guessing - and if I'm wrong you'd hold it against the real price, and rightly so. Let me get you a proper figure."$q$, true, 220, $q$estimate$q$),
    ($q$Proposal - will they do the work while they're there?$q$, $q$"Not on that visit - that one's purely so we can get you an accurate price. They'll measure everything and get you a written number before they leave.

If it's something smaller and you'd rather have it handled in one go, we can send somebody on the service visit instead - that's [STANDARD SERVICE FEE] and they'd do the work while they're there. Which sounds more like what you've got?"$q$, true, 230, $q$estimate$q$),
    ($q$Proposal - the specs reminder$q$, $q$"If you've got model numbers or spec sheets for any equipment, having those handy will help us get you an accurate price."$q$, true, 240, $q$estimate$q$),
    ($q$Proposal - the decision-maker question$q$, $q$"And will both of you be there?"

A proposal presented to one half of a household gets re-presented badly to the other half.$q$, true, 250, $q$estimate$q$),
    ($q$Warranty - the opening$q$, $q$"I'm sorry you're having to call us back out about this. Let me pull up your job and we'll get it sorted."

APOLOGIZE FOR THE EXPERIENCE. NOT FOR FAULT.$q$, true, 260, $q$warranty_call$q$),
    ($q$Warranty - finding out if it is ours$q$, $q$"Have we done work for you before? ... Roughly when was that? ... And is this the same thing we worked on?"

SEARCH THE ADDRESS REGARDLESS OF WHAT THEY SAY. Their memory is not the record.$q$, true, 270, $q$warranty_call$q$),
    ($q$Warranty - the magic words$q$, $q$"That's covered under your [WARRANTY PERIOD] warranty, so there's no charge for us to come back out."$q$, true, 280, $q$warranty_call$q$),
    ($q$Warranty - if coverage is unclear$q$, $q$"Let me review the file and call you back today - I want to give you the right answer rather than a fast one."

NEVER DECIDE "NOT COVERED" ON THE PHONE.$q$, true, 290, $q$warranty_call$q$),
    ($q$Warranty - booking it$q$, $q$"I'll be honest with you - we're booked pretty tight right now, but I'm not going to leave you waiting on something we installed. Let me get you in this week."$q$, true, 300, $q$warranty_call$q$),
    ($q$Complaint - the opening$q$, $q$"I'm sorry to hear that. Tell me what happened - take your time."

Then listen all the way through. Do not defend, explain or interrupt.$q$, true, 310, $q$concern$q$),
    ($q$Complaint - echo it back$q$, $q$"So what I'm hearing is... is that right? Anything I'm missing?"$q$, true, 320, $q$concern$q$),
    ($q$Complaint - the apology$q$, $q$"I'm sorry that's how this went. That's not the experience we want you to have."$q$, true, 330, $q$concern$q$),
    ($q$Complaint - what happens next$q$, $q$"Here's what I'm going to do: [specific action]. I'll call you back by [specific time] with an answer. Does that work?"

A SPECIFIC ACTION AND A SPECIFIC TIME. NEVER "SOON."$q$, true, 340, $q$concern$q$),
    ($q$Complaint - money$q$, $q$"That's [MANAGER ROLE]'s call rather than mine - I don't want to promise you something I can't deliver. Let me get it in front of them today."

No refunds, credits or discounts without [MANAGER ROLE].$q$, true, 350, $q$concern$q$),
    ($q$Complaint - abusive callers$q$, $q$"I want to help you and I'm going to. But I'm not able to keep going while I'm being spoken to like that. Can we start again?"

If it continues:
"I'm going to end the call here. I'll have [MANAGER ROLE] contact you directly."$q$, true, 360, $q$concern$q$),
    ($q$Question - when you do not know$q$, $q$"That's a good question and I want to give you the right answer rather than a fast one. Let me check with [role] and come straight back to you - I'll have that for you [time]."

GIVE A TIME YOU CAN BEAT, THEN BEAT IT.$q$, true, 370, $q$question$q$),
    ($q$Question - the next step, every time$q$, $q$"Would you like me to get you booked in? There's no obligation at all."$q$, true, 380, $q$question$q$),
    ($q$Question - what not to do$q$, $q$Never quote an hourly rate where the company prices by scope.
Never negotiate against another company's quote.
Never guess at anything technical or regulatory.$q$, true, 390, $q$question$q$),
    ($q$Material - clarifying a vague request$q$, $q$"Before I order that - can you give me the exact size and type? I'd rather ask now than send you the wrong part."$q$, true, 400, $q$material$q$),
    ($q$Material - the handover, after you buy it$q$, $q$"That's ordered and paid. It's at [location] under [reference] - ready from [time]. Ask for [name] at the counter. You've got everything else with you, so you can start without it if you need to."

A WORKER SHOULD NEVER HAVE TO PHONE THE OFFICE TO FIND HIS OWN MATERIAL.$q$, true, 410, $q$material$q$),
    ($q$Material - when it becomes a reschedule$q$, $q$"I'm not going to send you chasing that across town. Let me get it ordered properly and we'll rebook - I'd rather do it right than half-do it today."

Then call the customer yourself the same day.$q$, true, 420, $q$material$q$),
    ($q$Absence - to the affected customer$q$, $q$"Good morning, this is [name] from [COMPANY NAME]. I'm calling about your appointment today. We've had someone go off unexpectedly and I've had to move some work around. I'm sorry - I'd like to get you rebooked at a time that actually suits you. I've got [option 1] or [option 2]."

NEVER NAME THE ABSENT EMPLOYEE. NEVER GIVE A REASON.
It is not the customer's business, and it is not ours to share.$q$, true, 430, $q$absence$q$),
    ($q$The calendar entry$q$, $q$Every job carries the same shape so a worker can read it in seconds.

CUSTOMER - ADDRESS - CATEGORY - PROBLEM (their words) - BACKGROUND - APPROVED SCOPE AND PRICE - ACCESS - WHO WILL BE THERE - MATERIAL - ASSIGNED - DURATION - HISTORY - INSTRUCTIONS

EVERY LINE FILLED, OR EXPLICITLY MARKED NOT APPLICABLE.
A blank is not the same as "none." A blank means nobody asked.$q$, true, 440, null::text),
    ($q$The standard written confirmation$q$, $q$Subject: Your [COMPANY NAME] appointment - [date]

Hi [name],

You're booked for [date] between [window] at [address].

What we discussed: [their words]. Your price is [figure or range].

Nothing gets added without your approval.

If we arrive and nobody's home or we can't get access, that's [NO-SHOW FEE]. To move it, just give us more than [CANCELLATION WINDOW].

Questions? Reply here or call [COMPANY CONTACT METHOD].

[name], [COMPANY NAME]$q$, true, 450, null::text),
    ($q$Written confirmation - the rules$q$, $q$Send it the same day it is booked.
To the contact method they chose - asked, not assumed.
Their words, not our jargon.
Never a price the company has not approved.$q$, true, 460, null::text)
  ) as v(heading, body, collapsed, sort_order, color_tag)
 where p.color = $q$replies$q$;

-- 6. Re-link the checklists detached at step 1, back to their own
--    company's copy. In-progress work survives this file.
update suite.checklist_runs r
   set procedure_id = p.id
  from suite.procedures p
 where r.color = $q$replies$q$
   and p.color = $q$replies$q$
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
 where p.color = $q$replies$q$
 order by 1;
