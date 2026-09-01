-- 10 - COLOUR TAGS ON PROCEDURE SECTIONS
-- Run this FIRST. The other three files depend on the column it adds.
-- Re-runnable. Paste into a FRESH Supabase SQL tab.

-- A section can now say which of the eight call colours it belongs to.
-- null means it applies to every call - that is a real answer, not a gap.
alter table suite.procedure_sections
  add column if not exists color_tag text;

-- Only ever one of the eight. A typo here would render as a missing chip
-- rather than an error, so the database refuses it instead.
alter table suite.procedure_sections
  drop constraint if exists procedure_sections_color_tag_check;
alter table suite.procedure_sections
  add constraint procedure_sections_color_tag_check
  check (color_tag is null or color_tag in (
    'emergency','estimate','service_call','warranty_call',
    'concern','question','material','absence'));

create index if not exists procedure_sections_color_tag_idx
  on suite.procedure_sections (color_tag);

-- Creating or altering in `suite` is not enough on its own. Supabase's API
-- needs the grant re-stated and the schema cache reloaded, or every query
-- comes back empty with no error at all.
grant usage on schema suite to anon, authenticated;
grant select, insert, update, delete on suite.procedure_sections to authenticated;
notify pgrst, 'reload schema';

-- Proof: the column exists and the check is attached.
select column_name, data_type
  from information_schema.columns
 where table_schema = 'suite'
   and table_name = 'procedure_sections'
   and column_name = 'color_tag';
