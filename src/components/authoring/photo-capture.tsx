"use client";

import * as React from "react";
import { upload } from "@vercel/blob/client";
import { Camera, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Photo evidence, captured on the device camera.
 *
 * `capture="environment"` opens the rear camera straight away on a phone or
 * tablet — an assessor photographing a cracked tile should not have to go
 * through a file picker.
 *
 * Uploads go directly to Vercel Blob; /api/blob/upload only issues a
 * constrained token and checks the assessor may write to that centre. The
 * store is private, so what is kept here is the Blob URL and access is
 * governed by the store's own token, not by guessing a path.
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
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function uploadFiles(files: FileList) {
    setBusy(true);
    setError(undefined);
    const added: string[] = [];

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      // The centre is the first path segment so the token route can check it
      // without a database round trip per file.
      const pathname = `${centreId}/${assessmentId}/${crypto.randomUUID()}.${ext}`;

      try {
        const blob = await upload(pathname, file, {
          access: "public",
          handleUploadUrl: "/api/blob/upload",
          contentType: file.type,
        });
        added.push(blob.url);
      } catch (uploadError) {
        setError(
          `${file.name} did not upload. ${(uploadError as Error).message} Try again, or carry on and add it later.`,
        );
      }
    }

    if (added.length > 0) onChange([...photoIds, ...added]);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(url: string) {
    // The row is detached here; the blob itself is swept separately, because
    // deleting evidence attached to a since-signed assessment must not be
    // possible from a form.
    onChange(photoIds.filter((id) => id !== url));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {photoIds.map((url) => (
          <span
            key={url}
            className="relative block size-20 overflow-hidden rounded-[var(--radius)] border border-rule bg-surface-sunk"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="Photo evidence attached to this finding"
              className="size-full object-cover"
            />
            {!disabled ? (
              <button
                type="button"
                onClick={() => remove(url)}
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
                if (event.target.files?.length) void uploadFiles(event.target.files);
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
