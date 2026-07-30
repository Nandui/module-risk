-- ===================================================================
-- Row level security. Enabled on every table from day one.
--
-- Single organisation: every authenticated person can READ the whole
-- group — cross-centre comparison is the point of the product. Writes
-- are scoped by role and, for assessors, by centre membership.
-- ===================================================================

-- Role lookups are SECURITY DEFINER so a policy on `profile` cannot
-- recurse into itself.
create or replace function auth_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profile where id = auth.uid();
$$;

create or replace function is_hs_lead() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(auth_role() = 'hs_lead', false);
$$;

/** Manager or above — may sign off and edit anyone's assessment. */
create or replace function is_manager() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(auth_role() in ('manager', 'hs_lead'), false);
$$;

/** Membership check. The H&S lead is a member of every centre implicitly. */
create or replace function can_write_centre(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_hs_lead()
      or exists (
        select 1 from centre_member
        where centre_id = target and profile_id = auth.uid()
      );
$$;

alter table profile          enable row level security;
alter table centre           enable row level security;
alter table centre_member    enable row level security;
alter table hazard           enable row level security;
alter table control_measure  enable row level security;
alter table template         enable row level security;
alter table assessment       enable row level security;
alter table finding          enable row level security;
alter table action           enable row level security;
alter table revision         enable row level security;

-- ---- profile ------------------------------------------------------
-- Everyone can see who everyone is: findings, actions and sign-offs all
-- name a person, and a register full of uuids is useless.

create policy profile_read on profile
  for select to authenticated using (true);

create policy profile_update_self on profile
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and role = auth_role());

create policy profile_manage on profile
  for all to authenticated using (is_hs_lead()) with check (is_hs_lead());

-- ---- centres ------------------------------------------------------
-- Readable by all so the centre switcher works; only the H&S lead may
-- add or rename a site.

create policy centre_read on centre
  for select to authenticated using (true);

create policy centre_manage on centre
  for all to authenticated using (is_hs_lead()) with check (is_hs_lead());

create policy centre_member_read on centre_member
  for select to authenticated using (true);

create policy centre_member_manage on centre_member
  for all to authenticated using (is_hs_lead()) with check (is_hs_lead());

-- ---- libraries ----------------------------------------------------
-- Anyone may read and may propose an addition; the addition arrives as
-- 'pending_review' and only the H&S lead can approve, edit or remove.

create policy hazard_read on hazard
  for select to authenticated using (true);

create policy hazard_propose on hazard
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (review_state = 'pending_review' or is_hs_lead())
  );

create policy hazard_manage on hazard
  for all to authenticated using (is_hs_lead()) with check (is_hs_lead());

create policy control_measure_read on control_measure
  for select to authenticated using (true);

create policy control_measure_propose on control_measure
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (review_state = 'pending_review' or is_hs_lead())
  );

create policy control_measure_manage on control_measure
  for all to authenticated using (is_hs_lead()) with check (is_hs_lead());

create policy template_read on template
  for select to authenticated using (true);

create policy template_manage on template
  for all to authenticated using (is_hs_lead()) with check (is_hs_lead());

-- ---- assessments --------------------------------------------------
-- Read: the whole group. Write: a member of that centre, and never once
-- signed off (the trigger enforces that too — belt and braces, because
-- a policy can be relaxed by mistake and an audit trail cannot).

create policy assessment_read on assessment
  for select to authenticated using (true);

create policy assessment_insert on assessment
  for insert to authenticated
  with check (can_write_centre(centre_id) and status <> 'signed_off');

create policy assessment_update on assessment
  for update to authenticated
  using (
    can_write_centre(centre_id)
    and (status <> 'signed_off' or is_manager())
    and (assessor_id = auth.uid() or is_manager())
  )
  with check (can_write_centre(centre_id));

-- Only an unsigned draft can be deleted, and only by the H&S lead.
-- Anything that has been signed off is evidence; it archives, never deletes.
create policy assessment_delete on assessment
  for delete to authenticated using (is_hs_lead() and status = 'draft');

-- ---- findings -----------------------------------------------------

create policy finding_read on finding
  for select to authenticated using (true);

create policy finding_write on finding
  for all to authenticated
  using (
    exists (
      select 1 from assessment a
      where a.id = finding.assessment_id
        and can_write_centre(a.centre_id)
        and a.status <> 'signed_off'
    )
  )
  with check (
    exists (
      select 1 from assessment a
      where a.id = finding.assessment_id
        and can_write_centre(a.centre_id)
        and a.status <> 'signed_off'
    )
  );

-- ---- actions ------------------------------------------------------
-- Actions stay editable after sign-off: closing an action is how the
-- risk actually gets fixed, and it does not alter the assessed record.

create policy action_read on action
  for select to authenticated using (true);

create policy action_write on action
  for all to authenticated
  using (can_write_centre(centre_id) or owner_id = auth.uid())
  with check (can_write_centre(centre_id) or owner_id = auth.uid());

-- ---- revisions ----------------------------------------------------
-- Insert only. Update and delete have no policy at all, and the trigger
-- refuses them regardless of who is asking.

create policy revision_read on revision
  for select to authenticated using (true);

create policy revision_insert on revision
  for insert to authenticated
  with check (created_by = auth.uid() and can_write_centre(centre_id));
