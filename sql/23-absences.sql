-- 23 - UNEXCUSED ABSENCE TRACKING
--
-- The rule being tracked: THREE UNEXCUSED ABSENCES IN 90 DAYS.
--
-- AbsenceNotice already existed but only recorded that somebody was off. It
-- could not tell an excused day from an unexcused one, so it could not count
-- anything. These columns add that.
--
-- Safe to run more than once. Paste into a FRESH Supabase SQL tab.
-- Run this BEFORE uploading the zip - the code expects these columns.

alter table "AbsenceNotice"
  add column if not exists "excused" boolean not null default true;

alter table "AbsenceNotice"
  add column if not exists "markedByAdminId" text;

alter table "AbsenceNotice"
  add column if not exists "notes" text;

-- Excused defaults to TRUE on purpose. An absence only counts against
-- somebody when an administrator deliberately says it was unexcused - never
-- by accident, and never by a gap in the data.

create index if not exists "AbsenceNotice_excused_idx"
  on "AbsenceNotice" ("userId", "excused", "absenceDate");

-- Proof.
select column_name, data_type, column_default
  from information_schema.columns
 where table_name = 'AbsenceNotice'
   and column_name in ('excused', 'markedByAdminId', 'notes')
 order by column_name;
