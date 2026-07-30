-- ===================================================================
-- Guarantees Prisma cannot express, and row level security.
--
-- Everything here is deliberately in the database rather than in
-- application code: an audit trail that only holds when queries go
-- through the app is not an audit trail.
-- ===================================================================

create extension if not exists "pgcrypto";

-- ---- check constraints -------------------------------------------

alter table "assessment"
  add constraint "review_frequency_in_range"
  check ("review_frequency_months" between 1 and 60);

-- A signed-off record must carry its signature and an unsigned one must
-- not. Archived is exempt on purpose: a superseded assessment keeps the
-- signature it was put in force with, which is the point of the trail.
alter table "assessment"
  add constraint "signed_off_is_consistent"
  check (
    case "status"
      when 'signed_off' then "signed_off_at" is not null
      when 'archived'   then true
      else "signed_off_at" is null
    end
  );

alter table "finding"
  add constraint "ratings_in_range"
  check (
    "likelihood" between 1 and 5
    and "severity" between 1 and 5
    and "residual_likelihood" between 1 and 5
    and "residual_severity" between 1 and 5
  );

-- Controls can only ever reduce risk. A residual above the initial score
-- is a data-entry error, not a finding.
alter table "finding"
  add constraint "residual_not_worse"
  check (
    "residual_likelihood" * "residual_severity" <= "likelihood" * "severity"
  );

comment on constraint "residual_not_worse" on "finding" is
  'Controls reduce risk. Residual above initial is an entry error.';

-- Partial index for the Actions screen, which reads open work by due date.
create index "action_open_idx" on "action" ("due_at") where "closed_at" is null;

-- ===================================================================
-- Triggers
-- ===================================================================

-- Immutability. Once signed off, the only permitted transition is to
-- 'archived' — everything else must go through a new revision.
create or replace function guard_signed_off_assessment() returns trigger
language plpgsql as $$
begin
  if old."status" = 'signed_off' then
    if new."status" = 'archived' then
      -- Archiving is a status change and nothing else.
      if new."title"           is distinct from old."title"
      or new."centre_id"       is distinct from old."centre_id"
      or new."template_id"     is distinct from old."template_id"
      or new."scope_note"      is distinct from old."scope_note"
      or new."signed_off_at"   is distinct from old."signed_off_at"
      or new."signed_off_by"   is distinct from old."signed_off_by"
      or new."assessor_id"     is distinct from old."assessor_id" then
        raise exception
          'Assessment % is signed off. Create a revision instead of editing it.', old."reference"
          using errcode = 'check_violation';
      end if;
      return new;
    end if;

    raise exception
      'Assessment % is signed off and cannot be edited. Create a revision instead.', old."reference"
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger assessment_append_only before update on "assessment"
  for each row execute function guard_signed_off_assessment();

-- Findings inherit the immutability of their parent.
create or replace function guard_signed_off_finding() returns trigger
language plpgsql as $$
declare
  parent_status assessment_status;
  parent_ref    text;
begin
  select "status", "reference" into parent_status, parent_ref
  from "assessment"
  where "id" = coalesce(new."assessment_id", old."assessment_id");

  if parent_status = 'signed_off' then
    raise exception
      'Assessment % is signed off. Its findings cannot be changed.', parent_ref
      using errcode = 'check_violation';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger finding_append_only before insert or update or delete on "finding"
  for each row execute function guard_signed_off_finding();

-- Revisions are never rewritten.
create or replace function forbid_write() returns trigger
language plpgsql as $$
begin
  raise exception 'revision is append-only' using errcode = 'check_violation';
end;
$$;

create trigger revision_append_only before update or delete on "revision"
  for each row execute function forbid_write();

-- Keep action.centre_id honest without asking the caller to pass it.
create or replace function set_action_centre() returns trigger
language plpgsql as $$
begin
  select a."centre_id" into new."centre_id"
  from "finding" f join "assessment" a on a."id" = f."assessment_id"
  where f."id" = new."finding_id";
  return new;
end;
$$;

create trigger action_set_centre before insert or update of "finding_id" on "action"
  for each row execute function set_action_centre();

-- Reference allocation: RA-<CODE>-NNNN, sequential per centre, never
-- reused. Prisma inserts an empty string default; the trigger fills it.
create or replace function allocate_assessment_reference() returns trigger
language plpgsql as $$
declare
  site_code text;
  next_no   int;
begin
  if new."reference" is not null and new."reference" <> '' then
    return new;
  end if;
  select c."code" into site_code from "centre" c where c."id" = new."centre_id";
  select coalesce(max(substring("reference" from '(\d+)$')::int), 0) + 1
    into next_no
  from "assessment"
  where "reference" like 'RA-' || site_code || '-%';
  new."reference" := 'RA-' || site_code || '-' || lpad(next_no::text, 4, '0');
  return new;
end;
$$;

create trigger assessment_reference before insert on "assessment"
  for each row execute function allocate_assessment_reference();

-- Review due date follows the cadence from the day of sign-off.
create or replace function set_review_due() returns trigger
language plpgsql as $$
begin
  if new."status" = 'signed_off' and (old is null or old."status" <> 'signed_off') then
    new."signed_off_at" := coalesce(new."signed_off_at", now());
    new."review_due_at" := coalesce(new."review_due_at",
      new."signed_off_at" + make_interval(months => new."review_frequency_months"));
  end if;
  return new;
end;
$$;

create trigger assessment_review_due before insert or update on "assessment"
  for each row execute function set_review_due();

-- ===================================================================
-- Row level security
--
-- Supabase's `auth.uid()` is gone. The caller is identified by a session
-- variable that the app sets inside the same transaction as its queries
-- (see src/lib/db.ts → withUser).
--
-- Single organisation: every authenticated person may READ the whole
-- group, because cross-centre comparison is the point of the product.
-- Writes are scoped by role and, for assessors, by centre membership.
-- ===================================================================

-- The caller, or null when no session variable has been set. `true` as
-- the second argument means "missing is null, not an error", so a
-- connection that forgot to identify itself reads as nobody rather than
-- blowing up mid-query.
create or replace function app_uid() returns uuid
language sql stable as $$
  select nullif(current_setting('app.user_id', true), '')::uuid;
$$;

create or replace function app_role() returns user_role
language sql stable security definer set search_path = public as $$
  select "role" from "profile" where "id" = app_uid() and "is_active";
$$;

create or replace function is_hs_lead() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(app_role() = 'hs_lead', false);
$$;

-- Manager or above — may sign off and edit anyone's assessment.
create or replace function is_manager() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(app_role() in ('manager', 'hs_lead'), false);
$$;

-- Signed in at all. Everything readable is readable by any active user.
create or replace function is_signed_in() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from "profile" where "id" = app_uid() and "is_active");
$$;

-- Membership check. The H&S lead is a member of every centre implicitly.
create or replace function can_write_centre(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_hs_lead()
      or exists (
        select 1 from "centre_member"
        where "centre_id" = target and "profile_id" = app_uid()
      );
$$;

alter table "profile"         enable row level security;
alter table "centre"          enable row level security;
alter table "centre_member"   enable row level security;
alter table "hazard"          enable row level security;
alter table "control_measure" enable row level security;
alter table "template"        enable row level security;
alter table "assessment"      enable row level security;
alter table "finding"         enable row level security;
alter table "action"          enable row level security;
alter table "revision"        enable row level security;

-- ---- profile -----------------------------------------------------
-- Everyone can see who everyone is: findings, actions and sign-offs all
-- name a person, and a register full of uuids is useless.
--
-- password_hash is NOT protected by these policies — column privileges
-- are granted separately below, so the app role cannot read anyone's
-- hash except through the sign-in path.

create policy profile_read on "profile"
  for select using (is_signed_in());

create policy profile_update_self on "profile"
  for update
  using ("id" = app_uid())
  with check ("id" = app_uid() and "role" = app_role());

create policy profile_manage on "profile"
  for all using (is_hs_lead()) with check (is_hs_lead());

-- ---- centres -----------------------------------------------------
-- Readable by all so the centre switcher works; only the H&S lead may
-- add or rename a site.

create policy centre_read on "centre"
  for select using (is_signed_in());

create policy centre_manage on "centre"
  for all using (is_hs_lead()) with check (is_hs_lead());

create policy centre_member_read on "centre_member"
  for select using (is_signed_in());

create policy centre_member_manage on "centre_member"
  for all using (is_hs_lead()) with check (is_hs_lead());

-- ---- libraries ---------------------------------------------------
-- Anyone may read and may propose an addition; the addition arrives as
-- 'pending_review' and only the H&S lead can approve, edit or remove.

create policy hazard_read on "hazard"
  for select using (is_signed_in());

create policy hazard_propose on "hazard"
  for insert
  with check (
    "created_by" = app_uid()
    and ("review_state" = 'pending_review' or is_hs_lead())
  );

create policy hazard_manage on "hazard"
  for all using (is_hs_lead()) with check (is_hs_lead());

create policy control_measure_read on "control_measure"
  for select using (is_signed_in());

create policy control_measure_propose on "control_measure"
  for insert
  with check (
    "created_by" = app_uid()
    and ("review_state" = 'pending_review' or is_hs_lead())
  );

create policy control_measure_manage on "control_measure"
  for all using (is_hs_lead()) with check (is_hs_lead());

create policy template_read on "template"
  for select using (is_signed_in());

create policy template_manage on "template"
  for all using (is_hs_lead()) with check (is_hs_lead());

-- ---- assessments -------------------------------------------------
-- Read: the whole group. Write: a member of that centre, and never once
-- signed off. The trigger above enforces that too — belt and braces,
-- because a policy can be relaxed by mistake and an audit trail cannot.

create policy assessment_read on "assessment"
  for select using (is_signed_in());

create policy assessment_insert on "assessment"
  for insert
  with check (can_write_centre("centre_id") and "status" <> 'signed_off');

create policy assessment_update on "assessment"
  for update
  using (
    can_write_centre("centre_id")
    and ("status" <> 'signed_off' or is_manager())
    and ("assessor_id" = app_uid() or is_manager())
  )
  with check (can_write_centre("centre_id"));

-- Only an unsigned draft can be deleted, and only by the H&S lead.
-- Anything signed off is evidence; it archives, never deletes.
create policy assessment_delete on "assessment"
  for delete using (is_hs_lead() and "status" = 'draft');

-- ---- findings ----------------------------------------------------

create policy finding_read on "finding"
  for select using (is_signed_in());

create policy finding_write on "finding"
  for all
  using (
    exists (
      select 1 from "assessment" a
      where a."id" = "finding"."assessment_id"
        and can_write_centre(a."centre_id")
        and a."status" <> 'signed_off'
    )
  )
  with check (
    exists (
      select 1 from "assessment" a
      where a."id" = "finding"."assessment_id"
        and can_write_centre(a."centre_id")
        and a."status" <> 'signed_off'
    )
  );

-- ---- actions -----------------------------------------------------
-- Actions stay editable after sign-off: closing an action is how the
-- risk actually gets fixed, and it does not alter the assessed record.

create policy action_read on "action"
  for select using (is_signed_in());

create policy action_write on "action"
  for all
  using (can_write_centre("centre_id") or "owner_id" = app_uid())
  with check (can_write_centre("centre_id") or "owner_id" = app_uid());

-- ---- revisions ---------------------------------------------------
-- Insert only. Update and delete have no policy at all, and the trigger
-- refuses them regardless of who is asking.

create policy revision_read on "revision"
  for select using (is_signed_in());

create policy revision_insert on "revision"
  for insert
  with check ("created_by" = app_uid() and can_write_centre("centre_id"));

-- ===================================================================
-- The application role
--
-- RLS does not apply to a table's owner, so the app must NOT connect as
-- the role that ran these migrations. This creates the least-privilege
-- role the app connects as (APP_DATABASE_URL).
--
-- Set its password before deploying:
--   ALTER ROLE module_risk_app WITH PASSWORD '…';
-- ===================================================================

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'module_risk_app') then
    create role module_risk_app login;
  end if;
end $$;

grant usage on schema public to module_risk_app;

-- DML only. No DDL, no TRUNCATE: the app can never reshape or wipe a table.
grant select, insert, update, delete on all tables in schema public to module_risk_app;
grant usage, select on all sequences in schema public to module_risk_app;

-- The password hash is write-only from the app's point of view. Sign-in
-- reads it through a SECURITY DEFINER function instead, so a bug in an
-- ordinary query cannot select it.
revoke select on "profile" from module_risk_app;
grant select (
  "id", "full_name", "email", "role", "is_active", "created_at"
) on "profile" to module_risk_app;

-- Sign-in. Returns the stored hash for one email, and nothing else.
-- SECURITY DEFINER so it can read a column the caller cannot.
create or replace function auth_credentials(candidate_email text)
returns table (id uuid, full_name text, role user_role, password_hash text)
language sql stable security definer set search_path = public as $$
  select p."id", p."full_name", p."role", p."password_hash"
  from "profile" p
  where lower(p."email") = lower(candidate_email)
    and p."is_active"
    and p."password_hash" is not null;
$$;

revoke all on function auth_credentials(text) from public;
grant execute on function auth_credentials(text) to module_risk_app;

-- New tables added by later migrations should reach the app role too.
alter default privileges in schema public
  grant select, insert, update, delete on tables to module_risk_app;
alter default privileges in schema public
  grant usage, select on sequences to module_risk_app;
