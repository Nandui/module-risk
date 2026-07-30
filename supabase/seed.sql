-- ===================================================================
-- Seed — a plausible leisure centre group.
--
-- The hazard and control-measure content is carried over from the
-- Centrely `riskly` module, which was written against a real operation.
-- Free-text hazard and control fields have been lifted into controlled
-- library rows here, which is the whole point of the redesign: you
-- cannot compare centres on prose.
--
-- Run with `supabase db reset` (local) or paste into the SQL editor.
-- ===================================================================

-- ---- demo sign-ins ------------------------------------------------
-- Local convenience only. On a hosted project, remove this block and
-- invite people through Supabase Auth instead.

do $$
declare
  demo record;
begin
  for demo in
    select * from (values
      ('lead@example.com',     'H&S lead',        'hs_lead'),
      ('manager@example.com',  'Centre manager',  'manager'),
      ('assessor@example.com', 'Duty manager',    'assessor')
    ) as t(email, full_name, role)
  loop
    if not exists (select 1 from auth.users u where u.email = demo.email) then
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data
      ) values (
        '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
        'authenticated', 'authenticated', demo.email,
        crypt('risk-demo-1234', gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', demo.full_name, 'role', demo.role)
      );
    end if;
  end loop;
end $$;

-- ---- centres ------------------------------------------------------

insert into centre (name, code, address) values
  ('Bishopstown',          'BT', 'Bishopstown Sports Complex, Cork'),
  ('Hilltop Sports & Pool','HT', 'Beacon Road, Hilltop'),
  ('Riverside Leisure',    'RS', 'Mill Quay, Riverside')
on conflict (code) do nothing;

-- Everyone works across every centre in the demo data.
insert into centre_member (centre_id, profile_id)
select c.id, p.id from centre c cross join profile p
on conflict do nothing;

-- ===================================================================
-- Hazard library — controlled vocabulary
-- ===================================================================

insert into hazard (label, category, guidance) values
-- Pool and poolside ------------------------------------------------
  ('Swimmer in difficulty or drowning', 'Physical',
   'The defining risk of a pool site. Assess supervision zones, sightlines and bather load separately for each pool and each programmed activity.'),
  ('Slips, trips and falls on wet poolside', 'Physical',
   'The most frequent poolside injury. Consider surface finish, standing water, and whether the no-running rule is actually enforced at peak times.'),
  ('Diving into shallow water', 'Physical',
   'Low likelihood, catastrophic severity. Depth markings, signage and lifeguard intervention are the controls that matter.'),
  ('Entrapment in pool grilles or outlets', 'Physical',
   'Check grille fixings on every plant inspection. A missing or loose grille is an immediate closure.'),
  ('Eye or skin irritation from pool water chemistry', 'Chemical',
   'Usually a dosing imbalance. Continuous monitoring plus manual testing gives you the evidence trail.'),
  ('Legionella in showers and spray features', 'Biological',
   'Governed by the written control scheme. Temperature records and outlet flushing are the evidence an inspector will ask for.'),
  ('Cryptosporidium contamination of pool water', 'Biological',
   'Faecal accident response procedure, filtration performance and turnover rate.'),
-- Plant room --------------------------------------------------------
  ('Chlorine gas release', 'Chemical',
   'Segregated storage of acid and chlorine is non-negotiable. Assess ventilation, bunding and the evacuation route from the plant room.'),
  ('Acid splash to eyes or skin during dosing', 'Chemical',
   'Manual dosing is the high-exposure task. Face protection and a working eyewash station within reach.'),
  ('Confined space working in plant room', 'Physical',
   'Balance tanks and ducts. Permit to work, atmospheric testing, and never a lone worker.'),
  ('Contact with hot pipework or boiler surfaces', 'Physical',
   'Lagging condition and guarding. Note any surface above 60°C reachable from a walkway.'),
  ('Electrical contact with plant and control panels', 'Physical',
   'Fixed wiring inspection, panel locks, and isolation procedure before any maintenance.'),
  ('Noise exposure from pumps and plant', 'Physical',
   'Measure at the operator position. Above 80 dB(A) daily exposure triggers hearing protection and information.'),
  ('Manual handling of chemical drums', 'Ergonomic',
   'Drum trolleys and decanting equipment remove most of this. Two-person handling is a weaker control than mechanical aid.'),
-- Changing rooms ----------------------------------------------------
  ('Slips on wet floors during cleaning', 'Physical',
   'Cleaning during opening hours is the aggravating factor. Assess whether the schedule can move.'),
  ('Exposure to cleaning chemicals', 'Chemical',
   'COSHH assessment per product. Dilution control and ventilation, not just gloves.'),
  ('Damaged locker doors and fittings', 'Physical',
   'Picked up by routine inspection. Note the reporting-to-repair interval, which is where this usually fails.'),
  ('Bloodborne pathogens from sharps or bodily fluids', 'Biological',
   'Spill kit, sharps box, and a trained response. Applies to changing rooms and toilets.'),
  ('Fungal infection from wet floor surfaces', 'Biological',
   'Cleaning frequency and floor finish. Low severity but high exposure across every bather.'),
  ('Unsupervised children in the changing village', 'Physical',
   'Admission policy, cubicle sightlines and the supervision ratio for group bookings.'),
-- Gym and studio ----------------------------------------------------
  ('Dropped free weights', 'Physical',
   'Platform condition, collar availability and whether unsupervised lifting is permitted.'),
  ('Incorrect lifting technique without instruction', 'Ergonomic',
   'Induction quality is the control. Record who has been inducted and when.'),
  ('Trailing cables and equipment leads', 'Physical',
   'Cable routing on cardio kit. Simple to fix, easy to let slide.'),
  ('Cardiac event during exertion', 'Physical',
   'Health screening at induction, staff presence on the gym floor, AED location and response time.'),
  ('Equipment failure on resistance machines', 'Physical',
   'Planned maintenance record and the daily visual check. Cable and pin condition specifically.'),
  ('Collisions during group exercise class', 'Physical',
   'Class size against studio floor area, and the instructor''s sightline to every participant.'),
  ('Overexertion in a class beyond ability', 'Physical',
   'Pre-class screening and a stated intensity level. Instructors must be able to offer a regression.'),
  ('Noise exposure from studio sound systems', 'Physical',
   'Set a volume limit. Instructors take the exposure repeatedly across a week, not participants.'),
-- Sports hall and soft play -----------------------------------------
  ('Collisions during court sports', 'Physical',
   'Shared-space play and run-off distance to walls. Assess per sport, not per hall.'),
  ('Manual handling of heavy equipment such as goals and nets', 'Ergonomic',
   'Trolleys and two-person lifts. Setup happens under time pressure between bookings, which is when it goes wrong.'),
  ('Falling or unsecured goal posts', 'Physical',
   'Anchoring and the inspection record. A toppling goal is a fatality risk with children present.'),
  ('Slippery hall floor from moisture ingress', 'Physical',
   'Entrance matting, roof condition and a wet-floor response that does not rely on someone noticing.'),
  ('Falls from height in the soft play frame', 'Physical',
   'Netting condition, impact matting and the height of the highest accessible platform.'),
  ('Overcrowding in soft play', 'Physical',
   'Session capacity and a counted admission. Overcrowding drives every other soft-play risk.'),
  ('Trapped limbs in soft play netting or rollers', 'Physical',
   'Gap sizes against the equipment standard, checked on inspection.'),
  ('Poor hygiene of soft play surfaces', 'Biological',
   'Deep-clean frequency and the response to a soiling incident.'),
-- Outdoor areas and pitches -----------------------------------------
  ('Uneven pitch surface or holes', 'Physical',
   'Pre-session walk-through is the control that actually catches this. Record it.'),
  ('Waterlogged pitch surface or poor drainage', 'Physical',
   'A closure decision, made against stated criteria rather than on the day by whoever is on duty.'),
  ('Damaged perimeter fencing or unsecured gates', 'Physical',
   'Consider both unauthorised access in and a ball escaping into a roadway.'),
  ('Inappropriate footwear or unsafe studs', 'Physical',
   'Pre-play check. The control fails when staff are unwilling to refuse play.'),
  ('Inadequate pitch or outdoor lighting', 'Physical',
   'Lux level against the activity, plus the lamp replacement interval.'),
  ('Broken glass or sharp objects on the playing surface', 'Physical',
   'Pre-use inspection and litter management. Higher on sites with public access.'),
  ('Severe weather including lightning and high winds', 'Environmental',
   'A written lightning policy with a stated trigger, and a shelter that can be reached in time.'),
  ('Sun exposure and heat stress', 'Environmental',
   'Applies to staff on long outdoor duties as much as to participants. Water, shade and rotation.'),
  ('Animal fouling or biological contamination of grounds', 'Biological',
   'Inspection, removal and hand hygiene provision.'),
  ('Pests and vermin', 'Biological',
   'Contracted pest control plus a sighting log that staff actually complete.'),
  ('Radon gas accumulation', 'Chemical',
   'Measurement first. Applies to below-ground plant and store rooms in affected areas.'),
  ('Structural failure or falling debris', 'Physical',
   'Condition survey interval. Low likelihood, fatal severity — it stays on the register.'),
-- Reception and general ---------------------------------------------
  ('Aggressive or abusive customer behaviour', 'Psychosocial',
   'Assess by location and time of day. Lone working after dark is the aggravating factor.'),
  ('Robbery during cash handling', 'Physical',
   'Counting out of public view and varied banking times. Predictability is the hazard.'),
  ('Lone working at the front desk', 'Psychosocial',
   'Check-in procedure, panic alarm and a named person who notices if contact stops.'),
  ('Display screen work at reception', 'Ergonomic',
   'Workstation assessment. Low severity, but it is the most common staff complaint on any site.'),
  ('Slips on wet foyer floor in bad weather', 'Physical',
   'Matting length is the single biggest factor. Three metres, not one.'),
  ('Fire in a public building', 'Physical',
   'Fire risk assessment, evacuation of a wet-side population, and the roll call. Assess the pool evacuation specifically.'),
  ('Blocked escape routes', 'Physical',
   'Found by inspection, caused by storage. Recurring finding on most sites.'),
  ('Working at height for maintenance', 'Physical',
   'Access equipment, training and whether the task can be done from the ground instead.'),
  ('Contractor working without supervision or induction', 'Physical',
   'Permit to work and a signed induction. Contractors do not know your site.'),
  ('Inadequate first aid or AED provision', 'Physical',
   'Response time to the furthest point of the site, not just whether a kit exists.'),
  ('Stress from workload and shift patterns', 'Psychosocial',
   'Rota stability, break-taking and cover arrangements. Assess honestly or not at all.')
on conflict (label, category) do nothing;

-- ===================================================================
-- Control measure library
-- ===================================================================

insert into control_measure (label, category) values
-- Supervision and procedure ----------------------------------------
  ('NPLQ-qualified lifeguards on poolside', 'Physical'),
  ('Zoned poolside supervision with defined sightlines', 'Physical'),
  ('Normal operating procedure (NOP) in place and current', 'Physical'),
  ('Emergency action plan (EAP) in place and rehearsed', 'Physical'),
  ('Rescue equipment available at poolside', 'Physical'),
  ('Bather load limits set and counted', 'Physical'),
  ('No-running policy enforced by staff', 'Physical'),
  ('Depth markings and diving prohibition signage', 'Physical'),
  ('Staff supervision during opening hours', 'Physical'),
  ('Booking presence and supervision for hires', 'Physical'),
  ('Rules briefing before activity', 'Physical'),
  ('Booking controls limiting participant numbers', 'Physical'),
  ('Session capacity enforced by counted admission', 'Physical'),
  ('Admission and supervision-ratio policy for children', 'Physical'),
  ('Activity briefing appropriate to the sport', 'Physical'),
  ('Instructor-led induction before unsupervised use', 'Physical'),
  ('Pre-activity health screening', 'Physical'),
  ('Instructor able to offer a regression or alternative', 'Physical'),
-- Inspection and maintenance ---------------------------------------
  ('Routine documented inspection', 'Physical'),
  ('Pre-session walk-through of the playing surface', 'Physical'),
  ('Defect reporting process with a named owner', 'Physical'),
  ('Prompt repair or cordon off on discovery', 'Physical'),
  ('Planned preventive maintenance schedule', 'Physical'),
  ('Daily visual equipment check', 'Physical'),
  ('Maintenance policy and condition survey', 'Physical'),
  ('Boundary and fence inspection', 'Physical'),
  ('Gates kept closed and locked when not in use', 'Physical'),
  ('Ball-stop netting where required', 'Physical'),
  ('Anchoring of goal posts checked before use', 'Physical'),
  ('Lighting inspection and prompt lamp replacement', 'Physical'),
  ('Drainage maintenance', 'Physical'),
  ('Grille and outlet fixings checked at each plant inspection', 'Physical'),
  ('Netting, matting and gap sizes checked on inspection', 'Physical'),
  ('Fixed electrical installation inspection', 'Physical'),
  ('Pipework lagging and guarding maintained', 'Physical'),
-- Surfaces, signage and housekeeping -------------------------------
  ('Non-slip surfacing', 'Physical'),
  ('Wet-floor signage deployed at the point of hazard', 'Physical'),
  ('Prompt clean-up of spillages', 'Physical'),
  ('Entrance matting of adequate length', 'Physical'),
  ('Cleaning scheduled outside peak occupancy', 'Physical'),
  ('Suitable footwear required and checked', 'Physical'),
  ('Footwear rules communicated and enforced at entry', 'Physical'),
  ('Signage at entrances stating the rules', 'Physical'),
  ('Litter bins provided and emptied', 'Physical'),
  ('Cable routing and management on equipment', 'Physical'),
  ('Escape routes kept clear and checked on inspection', 'Physical'),
  ('Lifting platform and collars provided in the free-weights area', 'Physical'),
-- Chemical ----------------------------------------------------------
  ('COSHH assessment for each product in use', 'Chemical'),
  ('Acid and chlorine stored separately in bunded areas', 'Chemical'),
  ('Mechanical ventilation to the plant room', 'Chemical'),
  ('Spill kit available and staff trained in its use', 'Chemical'),
  ('Automatic dosing with continuous monitoring', 'Chemical'),
  ('Manual water testing at set intervals', 'Chemical'),
  ('Correct dilution controlled at the point of use', 'Chemical'),
  ('Eyewash station within reach of the dosing point', 'Chemical'),
  ('Trained operatives only for chemical handling', 'Chemical'),
  ('Gas detection and alarm in the plant room', 'Chemical'),
  ('Radon measurement carried out', 'Chemical'),
  ('Personal protective equipment provided and worn', 'Chemical'),
  ('Face shield, gloves and apron for dosing tasks', 'Chemical'),
-- Biological --------------------------------------------------------
  ('Written control scheme for legionella', 'Biological'),
  ('Outlet temperature monitoring and flushing records', 'Biological'),
  ('Faecal accident response procedure', 'Biological'),
  ('Filtration performance and turnover rate verified', 'Biological'),
  ('Deep-clean schedule with recorded completion', 'Biological'),
  ('Sharps box and bodily-fluid spill kit provided', 'Biological'),
  ('Hand hygiene facilities available and stocked', 'Biological'),
  ('Contracted pest control with a sighting log', 'Biological'),
  ('Prompt removal and safe disposal of contamination', 'Biological'),
-- Ergonomic ---------------------------------------------------------
  ('Manual handling training', 'Ergonomic'),
  ('Mechanical handling aid such as a trolley or drum lifter', 'Ergonomic'),
  ('Two-person lift for awkward loads', 'Ergonomic'),
  ('Workstation assessment completed', 'Ergonomic'),
  ('Task rotation to limit repeated exposure', 'Ergonomic'),
-- Psychosocial ------------------------------------------------------
  ('Conflict management training', 'Psychosocial'),
  ('Panic alarm at the work position', 'Psychosocial'),
  ('CCTV coverage of the area', 'Psychosocial'),
  ('No lone working after dark', 'Psychosocial'),
  ('Lone-worker check-in procedure', 'Psychosocial'),
  ('Cash counted away from public view', 'Psychosocial'),
  ('Varied banking times and routes', 'Psychosocial'),
  ('Safe with a drop slot', 'Psychosocial'),
  ('Rota published in advance with protected breaks', 'Psychosocial'),
  ('Incident reporting and post-incident support', 'Psychosocial'),
-- Emergency and environmental --------------------------------------
  ('Staff first aid training kept current', 'Physical'),
  ('AED available on site with a known location', 'Physical'),
  ('First aid kit checks recorded', 'Physical'),
  ('Clear access maintained for emergency services', 'Physical'),
  ('Emergency response procedure rehearsed', 'Physical'),
  ('Fire risk assessment reviewed and actioned', 'Physical'),
  ('Wet-side evacuation procedure rehearsed', 'Physical'),
  ('Weather monitoring before and during outdoor activity', 'Environmental'),
  ('Lightning policy with a stated closure trigger', 'Environmental'),
  ('Evacuation route to indoor shelter identified', 'Environmental'),
  ('Access to drinking water, shade and rest breaks', 'Environmental'),
  ('Activity modified or cancelled on weather warning', 'Environmental'),
  ('Sunscreen and hat guidance issued to staff', 'Environmental'),
  ('Permit to work for high-risk maintenance tasks', 'Physical'),
  ('Contractor induction signed before work starts', 'Physical'),
  ('Atmospheric testing before confined-space entry', 'Physical'),
  ('Isolation and lock-off before maintenance', 'Physical'),
  ('Hearing protection provided in high-noise areas', 'Physical'),
  ('Volume limit set on the sound system', 'Physical'),
  ('Work at height avoided or done from the ground where possible', 'Physical'),
  ('Staff radio communication', 'Physical')
on conflict (label) do nothing;

-- ===================================================================
-- Templates — the hazard walk-through for a given kind of space
-- ===================================================================

do $$
declare
  t record;
  hid uuid;
  ids uuid[];
  lbl text;
begin
  for t in
    select * from (values
      ('Pool plant room', 'Chemical', array[
        'Chlorine gas release',
        'Acid splash to eyes or skin during dosing',
        'Confined space working in plant room',
        'Contact with hot pipework or boiler surfaces',
        'Electrical contact with plant and control panels',
        'Noise exposure from pumps and plant',
        'Manual handling of chemical drums',
        'Legionella in showers and spray features',
        'Radon gas accumulation'
      ]),
      ('Poolside supervision', 'Physical', array[
        'Swimmer in difficulty or drowning',
        'Slips, trips and falls on wet poolside',
        'Diving into shallow water',
        'Entrapment in pool grilles or outlets',
        'Eye or skin irritation from pool water chemistry',
        'Cryptosporidium contamination of pool water',
        'Inadequate first aid or AED provision'
      ]),
      ('Changing village', 'Biological', array[
        'Slips on wet floors during cleaning',
        'Exposure to cleaning chemicals',
        'Damaged locker doors and fittings',
        'Bloodborne pathogens from sharps or bodily fluids',
        'Fungal infection from wet floor surfaces',
        'Unsupervised children in the changing village'
      ]),
      ('Fitness suite', 'Physical', array[
        'Dropped free weights',
        'Incorrect lifting technique without instruction',
        'Trailing cables and equipment leads',
        'Cardiac event during exertion',
        'Equipment failure on resistance machines'
      ]),
      ('Group exercise studio', 'Physical', array[
        'Collisions during group exercise class',
        'Overexertion in a class beyond ability',
        'Noise exposure from studio sound systems',
        'Slippery hall floor from moisture ingress'
      ]),
      ('Sports hall', 'Physical', array[
        'Collisions during court sports',
        'Manual handling of heavy equipment such as goals and nets',
        'Falling or unsecured goal posts',
        'Slippery hall floor from moisture ingress'
      ]),
      ('Soft play', 'Physical', array[
        'Falls from height in the soft play frame',
        'Overcrowding in soft play',
        'Trapped limbs in soft play netting or rollers',
        'Poor hygiene of soft play surfaces'
      ]),
      ('Outdoor pitches', 'Environmental', array[
        'Uneven pitch surface or holes',
        'Waterlogged pitch surface or poor drainage',
        'Damaged perimeter fencing or unsecured gates',
        'Inappropriate footwear or unsafe studs',
        'Inadequate pitch or outdoor lighting',
        'Broken glass or sharp objects on the playing surface',
        'Severe weather including lightning and high winds',
        'Sun exposure and heat stress',
        'Animal fouling or biological contamination of grounds',
        'Pests and vermin',
        'Structural failure or falling debris',
        'Inadequate first aid or AED provision'
      ]),
      ('Reception and front of house', 'Psychosocial', array[
        'Aggressive or abusive customer behaviour',
        'Robbery during cash handling',
        'Lone working at the front desk',
        'Display screen work at reception',
        'Slips on wet foyer floor in bad weather'
      ]),
      ('Cleaning and housekeeping', 'Chemical', array[
        'Slips on wet floors during cleaning',
        'Exposure to cleaning chemicals',
        'Bloodborne pathogens from sharps or bodily fluids',
        'Manual handling of chemical drums',
        'Working at height for maintenance'
      ]),
      ('Building and premises', 'Physical', array[
        'Fire in a public building',
        'Blocked escape routes',
        'Working at height for maintenance',
        'Contractor working without supervision or induction',
        'Structural failure or falling debris',
        'Stress from workload and shift patterns'
      ])
    ) as x(name, category, hazards)
  loop
    ids := '{}';
    foreach lbl in array t.hazards loop
      select id into hid from hazard where label = lbl limit 1;
      if hid is not null then ids := ids || hid; end if;
    end loop;

    insert into template (name, category, hazard_ids)
    values (t.name, t.category::hazard_category, ids)
    on conflict (name) do update set hazard_ids = excluded.hazard_ids;
  end loop;
end $$;

-- ===================================================================
-- Sample assessments — mirrors the six in the source module, rebuilt on
-- the controlled library. Dates are relative to now so the register
-- always has something overdue, something due soon and something clean.
-- ===================================================================

do $$
declare
  bt uuid; ht uuid; rs uuid;
  lead_id uuid; mgr_id uuid; asr_id uuid;
  a_id uuid; f_id uuid;
  spec record;
  fin record;
  ctl uuid[];
  lbl text;
  cid uuid;
  n int;
begin
  select id into bt from centre where code = 'BT';
  select id into ht from centre where code = 'HT';
  select id into rs from centre where code = 'RS';
  select id into lead_id from profile where email = 'lead@example.com';
  select id into mgr_id from profile where email = 'manager@example.com';
  select id into asr_id from profile where email = 'assessor@example.com';

  if exists (select 1 from assessment limit 1) then
    raise notice 'Assessments already present — skipping sample documents.';
    return;
  end if;

  for spec in
    select * from (values
      -- centre, template, title, status, months since sign-off, cadence, scope
      (1, 'Outdoor pitches', 'Outdoor playing pitches', 'signed_off', 11.3, 12,
       'All-weather and grass pitches, including spectator areas and access routes.'),
      (1, 'Poolside supervision', 'Main pool bather supervision', 'signed_off', 13.0, 12,
       'Supervision of bathers in the main pool, including rescue response.'),
      (1, 'Changing village', 'Wet-side changing village', 'signed_off', 11.5, 12,
       'Routine use and cleaning of the wet-side changing facilities.'),
      (2, 'Sports hall', 'Sports hall and court hire', 'in_review', 14.0, 12,
       'Court sports, equipment setup and hall hire activities.'),
      (2, 'Reception and front of house', 'Reception desk duties', 'signed_off', 5.6, 6,
       'Front desk duties including lone working and handling cash.'),
      (2, 'Pool plant room', 'Pool plant and chemical handling', 'in_review', 4.0, 12,
       'Handling, dosing and storage of pool treatment chemicals.'),
      (3, 'Soft play', 'Soft play frame and sessions', 'signed_off', 2.0, 12,
       'Supervised soft play sessions for under-eights.'),
      (3, 'Changing village', 'Changing rooms and lockers', 'signed_off', 18.0, 12,
       'Dry-side changing rooms, lockers and toilets.'),
      (3, 'Fitness suite', 'Fitness suite', 'draft', 0.0, 12,
       'Gym floor, free weights and resistance machines.')
    ) as s(centre_no, template_name, title, status, months_ago, cadence, scope)
  loop
    cid := case spec.centre_no when 1 then bt when 2 then ht else rs end;

    -- Always created as a draft. Findings cannot be attached to a
    -- signed-off assessment — the append-only trigger refuses it — so the
    -- seed walks the same path a real assessor does: draft, author, sign off.
    insert into assessment (
      centre_id, template_id, title, status, assessor_id,
      review_frequency_months, scope_note, review_due_at, created_at
    ) values (
      cid,
      (select id from template where name = spec.template_name),
      spec.title,
      'draft',
      asr_id,
      spec.cadence,
      spec.scope,
      now() + make_interval(months => spec.cadence),
      now() - make_interval(days => (spec.months_ago * 30.44)::int + 3)
    )
    returning id into a_id;

    -- Findings: every hazard on the template, scored. The scoring pattern
    -- below is deliberate rather than random — pool and chemical hazards
    -- carry fatal severity at low likelihood, slips carry high likelihood
    -- at moderate severity. That is what a real register looks like.
    n := 0;
    for fin in
      select h.id, h.label, h.category, ord
      from template t
      cross join unnest(t.hazard_ids) with ordinality as u(hid, ord)
      join hazard h on h.id = u.hid
      where t.name = spec.template_name
      order by ord
    loop
      n := n + 1;

      -- Pick two to four controls from the matching category.
      select array_agg(id) into ctl from (
        select id from control_measure
        where category = fin.category
        order by md5(id::text || fin.id::text)
        limit 2 + (n % 3)
      ) picked;

      insert into finding (
        assessment_id, hazard_id, sort_order,
        likelihood, severity,
        control_measure_ids,
        residual_likelihood, residual_severity,
        persons_at_risk, notes
      ) values (
        a_id, fin.id, n,
        -- Initial: before controls.
        case
          when fin.label ilike '%slip%' or fin.label ilike '%trip%' then 4
          when fin.label ilike '%drowning%' or fin.label ilike '%structural%' then 3
          when fin.label ilike '%chlorine%' or fin.label ilike '%radon%' then 2
          else 3
        end,
        case
          when fin.label ilike '%drowning%' or fin.label ilike '%chlorine%'
            or fin.label ilike '%structural%' or fin.label ilike '%cardiac%'
            or fin.label ilike '%fire%' or fin.label ilike '%radon%'
            or fin.label ilike '%diving%' or fin.label ilike '%goal posts%' then 5
          when fin.label ilike '%confined%' or fin.label ilike '%height%'
            or fin.label ilike '%electrical%' or fin.label ilike '%legionella%'
            or fin.label ilike '%acid%' or fin.label ilike '%first aid%' then 4
          when fin.label ilike '%display screen%' or fin.label ilike '%fungal%'
            or fin.label ilike '%litter%' or fin.label ilike '%glass%' then 2
          else 3
        end,
        coalesce(ctl, '{}'),
        -- Residual: with the controls above in place. Never worse than
        -- initial — the check constraint would refuse it.
        case
          when fin.label ilike '%slip%' or fin.label ilike '%trip%' then 2
          when fin.label ilike '%chlorine%' or fin.label ilike '%radon%' then 1
          else 2
        end,
        case
          when fin.label ilike '%drowning%' or fin.label ilike '%chlorine%'
            or fin.label ilike '%structural%' or fin.label ilike '%cardiac%'
            or fin.label ilike '%fire%' or fin.label ilike '%radon%'
            or fin.label ilike '%diving%' or fin.label ilike '%goal posts%' then 5
          when fin.label ilike '%confined%' or fin.label ilike '%height%'
            or fin.label ilike '%electrical%' or fin.label ilike '%legionella%'
            or fin.label ilike '%acid%' or fin.label ilike '%first aid%' then 3
          when fin.label ilike '%display screen%' or fin.label ilike '%fungal%'
            or fin.label ilike '%litter%' or fin.label ilike '%glass%' then 1
          else 2
        end,
        case
          when fin.category in ('Chemical', 'Ergonomic') then array['Staff']::person_at_risk[]
          when fin.label ilike '%children%' or fin.label ilike '%soft play%'
            then array['Children', 'Customers', 'Staff']::person_at_risk[]
          when fin.label ilike '%contractor%' then array['Contractors', 'Staff']::person_at_risk[]
          else array['Staff', 'Customers', 'Visitors']::person_at_risk[]
        end,
        null
      )
      returning id into f_id;

      -- An action for anything still at or above the escalation threshold.
      if (case
            when fin.label ilike '%drowning%' or fin.label ilike '%chlorine%'
              or fin.label ilike '%structural%' or fin.label ilike '%cardiac%'
              or fin.label ilike '%fire%' or fin.label ilike '%diving%'
              or fin.label ilike '%goal posts%' then 10
            else 4
          end) >= 10 then
        insert into action (finding_id, description, owner_id, due_at, closed_at, closure_note, closed_by)
        values (
          f_id,
          case
            when fin.label ilike '%drowning%'
              then 'Re-run the zoned supervision assessment against current programme times.'
            when fin.label ilike '%chlorine%'
              then 'Commission gas detection in the plant room and record the alarm test.'
            when fin.label ilike '%structural%'
              then 'Book the five-year condition survey and circulate the report.'
            when fin.label ilike '%cardiac%'
              then 'Confirm AED response time from the furthest point of the gym floor.'
            when fin.label ilike '%fire%'
              then 'Rehearse the wet-side evacuation and record attendance.'
            when fin.label ilike '%diving%'
              then 'Reinstate depth numerals at the shallow end and check sightlines.'
            else 'Check and record goal post anchoring before every booking.'
          end,
          case n % 3 when 0 then mgr_id when 1 then asr_id else lead_id end,
          now() + make_interval(days => (n * 11) - 21),
          -- The Riverside soft play actions are closed; the rest are live,
          -- so the Actions screen has both states to show.
          case when spec.centre_no = 3 and spec.status = 'signed_off'
            then now() - interval '6 days' end,
          case when spec.centre_no = 3 and spec.status = 'signed_off'
            then 'Completed and verified on site.' end,
          case when spec.centre_no = 3 and spec.status = 'signed_off'
            then mgr_id end
        );
      end if;
    end loop;

    -- Now move the document to its real state. draft → in_review → signed_off
    -- is the order the triggers expect, and it is the order a real document
    -- travels in.
    if spec.status = 'in_review' then
      update assessment
      set status = 'in_review', reviewed_by = mgr_id
      where id = a_id;

    elsif spec.status = 'signed_off' then
      update assessment
      set status        = 'signed_off',
          reviewed_by   = mgr_id,
          signed_off_by = mgr_id,
          signed_off_at = now() - make_interval(days => (spec.months_ago * 30.44)::int),
          review_due_at = now() - make_interval(days => (spec.months_ago * 30.44)::int)
                          + make_interval(months => spec.cadence)
      where id = a_id;
    end if;

    -- Signed-off documents get their first revision snapshot, which is the
    -- record an inspector is shown.
    if spec.status = 'signed_off' then
      insert into revision (assessment_id, centre_id, revision_no, snapshot, reason, created_by)
      select
        a_id, cid, 1,
        jsonb_build_object(
          'assessment', to_jsonb(a),
          'findings', coalesce((
            select jsonb_agg(to_jsonb(f) order by f.sort_order)
            from finding f where f.assessment_id = a_id
          ), '[]'::jsonb)
        ),
        'Initial sign-off',
        mgr_id
      from assessment a where a.id = a_id;
    end if;
  end loop;

  raise notice 'Seeded % assessments, % findings, % actions.',
    (select count(*) from assessment),
    (select count(*) from finding),
    (select count(*) from action);
end $$;
