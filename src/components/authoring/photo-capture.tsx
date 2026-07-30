"use client";

import * as React from "react";
import { Camera, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const BUCKET = "evidence";

/**
 * Photo evidence, captured on the device camera.
 *
 * `capture="environment"` opens the rear camera straight away on a phone or
 * tablet — an assessor photographing a cracked tile should not have to go
 * through a file picker.
 *
 * Uploads go directly to Storage rather than through a Server Action: a
 * 10 MB photo has no business travelling through a serverless function, and
 * the bucket's RLS policy checks the centre from the object path.
 */
export function PhotoCapture({
  centreId,
  assessmentId,
  photoIds,
  onChange,
  disabled,
}: {
  centreId: string;
  assessmentId: string;
  photoIds: string[];
  onChange: (photoIds: string[]) => void;
  disabled?: boolean;
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [urls, setUrls] = React.useState<Record<string, string>>({});
  const inputRef = React.useRef<HTMLInputElement>(null);

  // The bucket is private, so thumbnails need signed URLs.
  React.useEffect(() => {
    const missing = photoIds.filter((id) => !urls[id]);
    if (missing.length === 0) return;

    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(missing, 60 * 60);
      if (cancelled || !data) return;
      setUrls((prev) => {
        const next = { ...prev };
        for (const entry of data) {
          if (entry.path && entry.signedUrl) next[entry.path] = entry.signedUrl;
        }
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [photoIds, urls]);

  async function upload(files: FileList) {
    setBusy(true);
    setError(undefined);
    const supabase = createClient();
    const added: string[] = [];

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      // The centre is the first path segment so the bucket policy can check
      // it without a join.
      const path = `${centreId}/${assessmentId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        setError(
          `${file.name} did not upload. ${uploadError.message} Try again, or carry on and add it later.`,
        );
        continue;
      }
      added.push(path);
    }

    if (added.length > 0) onChange([...photoIds, ...added]);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function remove(path: string) {
    const supabase = createClient();
    await supabase.storage.from(BUCKET).remove([path]);
    onChange(photoIds.filter((id) => id !== path));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {photoIds.map((path) => (
          <span
            key={path}
            className="relative block size-20 overflow-hidden rounded-[var(--radius)] border border-rule bg-surface-sunk"
          >
            {urls[path] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={urls[path]}
                alt="Photo evidence attached to this finding"
                className="size-full object-cover"
              />
            ) : (
              <span className="grid size-full place-items-center text-ui-sm text-faint">
                …
              </span>
            )}
            {!disabled ? (
              <button
                type="button"
                onClick={() => void remove(path)}
                aria-label="Remove this photo"
                className="absolute right-1 top-1 grid size-6 place-items-center rounded-[3px] bg-surface-raised/90 text-ink-soft hover:text-risk-5-ink"
              >
                <Trash2 aria-hidden className="size-3.5" />
              </button>
            ) : null}
          </span>
        ))}

        {!disabled ? (
          <label
            className={cn(
              "grid size-20 cursor-pointer place-items-center gap-1 rounded-[var(--radius)] border border-dashed border-rule-strong text-muted transition-colors duration-[var(--duration-quick)] hover:border-accent hover:text-accent",
              busy && "pointer-events-none opacity-60",
            )}
          >
            <Camera aria-hidden className="size-5" />
            <span className="text-ui-sm">{busy ? "Adding…" : "Photo"}</span>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="sr-only"
              onChange={(event) => {
                if (event.target.files?.length) void upload(event.target.files);
              }}
            />
          </label>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-ui-sm text-risk-5-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}
