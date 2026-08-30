-- 26 - THE THREE STANDARD LINE ITEMS, FOR EVERY COMPANY
--
-- Three zero-dollar lines that belong on every proposal:
--   1. Warranty          - 2 years on labour and materials we supplied
--   2. Labour & material - included on all line items
--   3. Contract agreement - text to be filled in
--
-- They are priced at zero because they are terms, not work. They appear on a
-- proposal so the customer reads them, and they add nothing to the total.
--
-- Appends to whatever price list a company already has. Matches on name, so
-- running it twice does not create duplicates and does not touch any edit a
-- company has made to the wording.
--
-- Paste into a FRESH Supabase SQL tab.

begin;

with wanted as (
  select jsonb_build_array(
    jsonb_build_object(
      'id', 'std_warranty', 'category', 'Terms',
      'name', 'Warranty - 2 years',
      'unit', 'ea', 'price', 0, 'cost', 0,
      'duration_minutes', null,
      'includes', 'Two year warranty on all labor performed and all materials installed that we purchased.',
      'instructions', 'Goes on every proposal. Does not cover customer-supplied material, or work altered by somebody else afterwards. Say the warranty out loud when you present the price - it is one of the strongest reasons people choose us.'
    ),
    jsonb_build_object(
      'id', 'std_labmat', 'category', 'Terms',
      'name', 'Labor and material included',
      'unit', 'ea', 'price', 0, 'cost', 0,
      'duration_minutes', null,
      'includes', 'Labor and material are included on all line items.',
      'instructions', 'Stops the most common argument on an invoice - that the price was labour only. Leave it on every proposal.'
    ),
    jsonb_build_object(
      'id', 'std_contract', 'category', 'Terms',
      'name', 'Contract agreement',
      'unit', 'ea', 'price', 0, 'cost', 0,
      'duration_minutes', null,
      'includes', 'The agreed terms of the work.',
      'instructions', 'PLACEHOLDER - the contract wording has not been added yet. Replace this text with the real agreement before sending it to a customer.'
    )
  ) as items
),
current as (
  select c.id as company_id,
         coalesce(
           (select s.value::jsonb from suite.app_storage s
             where s.company_id = c.id and s.key = 'so_pricelist'),
           '[]'::jsonb
         ) as list
    from suite.companies c
)
insert into suite.app_storage (company_id, key, value, updated_at)
select cur.company_id,
       'so_pricelist',
       (
         cur.list || (
           select coalesce(jsonb_agg(w), '[]'::jsonb)
             from jsonb_array_elements((select items from wanted)) w
            where not exists (
              select 1 from jsonb_array_elements(cur.list) e
               where e->>'name' = w->>'name'
            )
         )
       )::text,
       now()
  from current cur
on conflict (company_id, key) do update
  set value = excluded.value, updated_at = now();

commit;

-- Proof: every company should show 3 in the Terms category.
select coalesce(c.name, '(no company)') as owner,
       (select count(*) from jsonb_array_elements(s.value::jsonb) e
         where e->>'category' = 'Terms') as terms_lines,
       (select count(*) from jsonb_array_elements(s.value::jsonb)) as total_lines
  from suite.app_storage s
  left join suite.companies c on c.id = s.company_id
 where s.key = 'so_pricelist'
 order by 1;
