-- ===================================================================
-- module-risk — schema.
--
-- Single organisation, multiple centres. `centre_id` is a first-class
-- dimension on every record that belongs to a centre, from the first
-- commit — cheap now, expensive later.
--
-- Assessments are append-only once signed off. That rule is enforced by
-- a trigger in this file, not by application code, so the audit trail
-- holds even against a direct SQL write.
-- ===================================================================

create extension if not exists "pgcrypto";

-- ---- enums --------------------------------------------------------
-- Controlled vocabulary lives in the type system where it cannot drift.

create type hazard_category as enum (
  'Physical', 'Chemical', 'Biological', 'Ergonomic', 'Psychosocial', 'Environmental'
);

create type person_at_risk as enum (
  'Staff', 'Customers', 'Children', 'Contractors', 'Visitors'
);

create type assessment_status as enum ('draft', 'in_review', 'signed_off', 'archived');

create type user_role as enum ('assessor', 'manager', 'hs_lead');

-- Library entries added mid-walk are flagged for the H&S lead rather than
-- silently joining the controlled vocabulary.
create type library_review_state as enum ('approved', 'pending_review', 'rejected');

-- ---- people -------------------------------------------------------

create table profile (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null,
  email       text not null,
  role        user_role not null default 'assessor',
  created_at  timestamptz not null default now()
);

comment on table profile is 'One row per auth user. Single tenant — no org column by design.';

create table centre (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  code        text not null unique,
  address     text,
  created_at  timestamptz not null default now()
);

comment on column centre.code is 'Short site code (BT, HT). Used in assessment references.';

-- Which centres a person works across. The H&S lead sees every centre
-- without needing a row here.
create table centre_member (
  centre_id   uuid not null references centre (id) on delete cascade,
  profile_id  uuid not null references profile (id) on delete cascade,
  primary key (centre_id, profile_id)
);

-- ---- libraries — controlled vocabulary ----------------------------

create table hazard (
  id            uuid primary key default gen_random_uuid(),
  label         text not null,
  category      hazard_category not null,
  guidance      text,
  review_state  library_review_state not null default 'approved',
  created_by    uuid references profile (id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (label, category)
);

comment on table hazard is
  'Controlled hazard library. Selected by typeahead; "add new" is deliberate and flags for review.';

create table control_measure (
  id            uuid primary key default gen_random_uuid(),
  label         text not null unique,
  category      hazard_category not null,
  review_state  library_review_state not null default 'approved',
  created_by    uuid references profile (id) on delete set null,
  created_at    timestamptz not null default now()
);

create table template (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  category    hazard_category not null,
  hazard_ids  uuid[] not null default '{}',
  created_at  timestamptz not null default now()
);

comment on column template.hazard_ids is
  'Ordered hazard library ids this template walks the assessor through.';

-- ---- the assessment document --------------------------------------

create table assessment (
  id                uuid primary key default gen_random_uuid(),
  reference         text not null unique,
  centre_id         uuid not null references centre (id) on delete cascade,
  template_id       uuid references template (id) on delete set null,
  title             text not null,
  status            assessment_status not null default 'draft',
  assessor_id       uuid references profile (id) on delete set null,
  reviewed_by       uuid references profile (id) on delete set null,
  review_frequency_months int not null default 12
    check (review_frequency_months between 1 and 60),
  review_due_at     timestamptz,
  signed_off_at     timestamptz,
  signed_off_by     uuid references profile (id) on delete set null,
  -- Free text is fine here: a title and a scope note are read by humans,
  -- never aggregated across centres.
  scope_note        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- A signed-off record must carry its signature and an unsigned one must
  -- not. Archived is deliberately exempt: a superseded assessment keeps the
  -- signature it was put in force with, which is the point of the trail.
  constraint signed_off_is_consistent check (
    case status
      when 'signed_off' then signed_off_at is not null
      when 'archived'   then true
      else signed_off_at is null
    end
  )
);

create index assessment_centre_idx on assessment (centre_id);
create index assessment_status_idx on assessment (status);
create index assessment_review_due_idx on assessment (review_due_at);
create index assessment_assessor_idx on assessment (assessor_id);

create table finding (
  id                  uuid primary key default gen_random_uuid(),
  assessment_id       uuid not null references assessment (id) on delete cascade,
  hazard_id           uuid not null references hazard (id),
  sort_order          int not null default 0,
  -- Initial (pre-control) risk.
  likelihood          int not null check (likelihood between 1 and 5),
  severity            int not null check (severity between 1 and 5),
  control_measure_ids uuid[] not null default '{}',
  -- Residual (post-control) risk. Both are stored — the delta is the most
  -- persuasive number in any report, and recomputing it from controls is
  -- not possible.
  residual_likelihood int not null check (residual_likelihood between 1 and 5),
  residual_severity   int not null check (residual_severity between 1 and 5),
  persons_at_risk     person_at_risk[] not null default '{}',
  notes               text,
  photo_ids           text[] not null default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- Controls can only ever reduce risk. A residual above the initial score
  -- is a data-entry error, not a finding.
  constraint residual_not_worse check (
    residual_likelihood * residual_severity <= likelihood * severity
  ),
  unique (assessment_id, hazard_id)
);

create index finding_assessment_idx on finding (assessment_id);
create index finding_hazard_idx on finding (hazard_id);

comment on column finding.photo_ids is 'Storage object paths in the evidence bucket.';
comment on constraint residual_not_worse on finding is
  'Controls reduce risk. Residual above initial is an entry error.';

create table action (
  id            uuid primary key default gen_random_uuid(),
  finding_id    uuid not null references finding (id) on delete cascade,
  -- Denormalised so the group-wide Actions screen and its RLS check do not
  -- have to walk two joins on every row.
  centre_id     uuid not null references centre (id) on delete cascade,
  description   text not null,
  owner_id      uuid references profile (id) on delete set null,
  due_at        timestamptz,
  closed_at     timestamptz,
  closed_by     uuid references profile (id) on delete set null,
  closure_note  text,
  created_at    timestamptz not null default now()
);

create index action_centre_idx on action (centre_id);
create index action_finding_idx on action (finding_id);
create index action_open_idx on action (due_at) where closed_at is null;

-- Append-only. A correction to a signed record creates a new revision; it
-- never mutates the record. The snapshot is the whole document, so a
-- revision remains readable if the live rows later change shape.
create table revision (
  id            uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessment (id) on delete cascade,
  centre_id     uuid not null references centre (id) on delete cascade,
  revision_no   int not null,
  snapshot      jsonb not null,
  reason        text,
  created_by    uuid references profile (id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (assessment_id, revision_no)
);

create index revision_assessment_idx on revision (assessment_id, revision_no desc);

-- ===================================================================
-- Triggers
-- ===================================================================

create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger assessment_touch before update on assessment
  for each row execute function touch_updated_at();

create trigger finding_touch before update on finding
  for each row execute function touch_updated_at();

-- Immutability. Once signed off, the only permitted transition is to
-- 'archived' — everything else must go through a new revision.
create or replace function guard_signed_off_assessment() returns trigger
language plpgsql as $$
begin
  if old.status = 'signed_off' then
    if new.status = 'archived' and row(new.*) is distinct from row(old.*) then
      -- Archiving is a status change and nothing else.
      if new.title           is distinct from old.title
      or new.centre_id       is distinct from old.centre_id
      or new.template_id     is distinct from old.template_id
      or new.scope_note      is distinct from old.scope_note
      or new.signed_off_at   is distinct from old.signed_off_at
      or new.signed_off_by   is distinct from old.signed_off_by
      or new.assessor_id     is distinct from old.assessor_id then
        raise exception
          'Assessment % is signed off. Create a revision instead of editing it.', old.reference
          using errcode = 'check_violation';
      end if;
      return new;
    end if;

    raise exception
      'Assessment % is signed off and cannot be edited. Create a revision instead.', old.reference
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger assessment_append_only before update on assessment
  for each row execute function guard_signed_off_assessment();

-- Findings inherit the immutability of their parent.
create or replace function guard_signed_off_finding() returns trigger
language plpgsql as $$
declare
  parent_status assessment_status;
  parent_ref    text;
begin
  select status, reference into parent_status, parent_ref
  from assessment
  where id = coalesce(new.assessment_id, old.assessment_id);

  if parent_status = 'signed_off' then
    raise exception
      'Assessment % is signed off. Its findings cannot be changed.', parent_ref
      using errcode = 'check_violation';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger finding_append_only before insert or update or delete on finding
  for each row execute function guard_signed_off_finding();

-- Revisions are never rewritten.
create or replace function forbid_write() returns trigger
language plpgsql as $$
begin
  raise exception 'revision is append-only' using errcode = 'check_violation';
end;
$$;

create trigger revision_append_only before update or delete on revision
  for each row execute function forbid_write();

-- Keep action.centre_id honest without asking the caller to pass it.
create or replace function set_action_centre() returns trigger
language plpgsql as $$
begin
  select a.centre_id into new.centre_id
  from finding f join assessment a on a.id = f.assessment_id
  where f.id = new.finding_id;
  return new;
end;
$$;

create trigger action_set_centre before insert or update of finding_id on action
  for each row execute function set_action_centre();

-- Reference allocation: RA-<CODE>-NNNN, sequential per centre, never reused.
create or replace function allocate_assessment_reference() returns trigger
language plpgsql as $$
declare
  code text;
  next_no int;
begin
  if new.reference is not null and new.reference <> '' then
    return new;
  end if;
  select c.code into code from centre c where c.id = new.centre_id;
  select coalesce(max(substring(reference from '(\d+)$')::int), 0) + 1
    into next_no
  from assessment
  where reference like 'RA-' || code || '-%';
  new.reference := 'RA-' || code || '-' || lpad(next_no::text, 4, '0');
  return new;
end;
$$;

create trigger assessment_reference before insert on assessment
  for each row execute function allocate_assessment_reference();

-- Review due date follows the cadence from the day of sign-off.
create or replace function set_review_due() returns trigger
language plpgsql as $$
begin
  if new.status = 'signed_off' and (old is null or old.status <> 'signed_off') then
    new.signed_off_at := coalesce(new.signed_off_at, now());
    new.review_due_at := coalesce(new.review_due_at,
      new.signed_off_at + make_interval(months => new.review_frequency_months));
  end if;
  return new;
end;
$$;

create trigger assessment_review_due before insert or update on assessment
  for each row execute function set_review_due();

-- New profiles mirror the auth user so the app never has an authenticated
-- session with no profile row.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profile (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'assessor')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();
