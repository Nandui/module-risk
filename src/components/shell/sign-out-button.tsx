"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/lib/actions/misc";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        aria-label="Sign out"
        title="Sign out"
        className="grid size-7 place-items-center rounded-[var(--radius-sm)] text-muted transition-colors duration-[var(--duration-quick)] hover:bg-surface-sunk hover:text-ink"
      >
        <LogOut aria-hidden className="size-3.5" />
      </button>
    </form>
  );
}
