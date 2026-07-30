-- ===================================================================
-- Photo evidence. Private bucket — a photo of a plant room is not
-- something to serve from a public URL. The app reads images through
-- short-lived signed URLs.
--
-- Object paths are `<centre_id>/<assessment_id>/<uuid>.<ext>`, so the
-- first path segment carries the centre and RLS can be written against
-- it without a join.
-- ===================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidence',
  'evidence',
  false,
  10485760, -- 10 MB: a phone photo taken on a site walk, not a raw file
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

create policy evidence_read on storage.objects
  for select to authenticated
  using (bucket_id = 'evidence');

create policy evidence_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'evidence'
    and can_write_centre(nullif(split_part(name, '/', 1), '')::uuid)
  );

-- Evidence attached to a signed-off assessment is not removable; the
-- app only ever deletes while a draft is still being authored.
create policy evidence_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'evidence'
    and can_write_centre(nullif(split_part(name, '/', 1), '')::uuid)
    and not exists (
      select 1 from assessment a
      where a.id = nullif(split_part(name, '/', 2), '')::uuid
        and a.status = 'signed_off'
    )
  );
