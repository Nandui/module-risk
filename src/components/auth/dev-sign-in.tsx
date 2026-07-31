import { devSignIn } from "@/lib/actions/misc";
import { Button } from "@/components/ui/button";

/**
 * One-click sign-in for local development. Renders nothing anywhere else.
 *
 * Deliberately quiet: a hairline, a label that says what it is, and three
 * ghost buttons. It is scaffolding, and scaffolding that looks like product
 * eventually ships.
 *
 * The guard here is convenience, not security — `devSignIn` refuses on the
 * server regardless of what renders. Both exist because a build-time check and
 * a runtime check fail differently, and the runtime one is the real control.
 */
const ACCOUNTS = [
  { email: "lead@example.com", label: "H&S lead", detail: "Sees every centre" },
  { email: "manager@example.com", label: "Centre manager", detail: "Can edit any draft" },
  { email: "assessor@example.com", label: "Assessor", detail: "Own drafts only" },
] as const;

export function DevSignIn() {
  if (process.env.NODE_ENV !== "development") return null;

  return (
    <section aria-labelledby="dev-sign-in" className="mt-8 border-t border-rule pt-5">
      <p id="dev-sign-in" className="eyebrow">
        Development only
      </p>
      <p className="mt-1.5 text-ui-sm text-muted">
        Seeded accounts, one click. Requires <code className="font-mono">npm run db:local</code>.
      </p>

      <div className="mt-3 flex flex-col gap-1">
        {ACCOUNTS.map((account) => (
          <form key={account.email} action={devSignIn}>
            <input type="hidden" name="email" value={account.email} />
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-between"
            >
              <span className="text-ink">{account.label}</span>
              <span className="text-ui-sm text-muted">{account.detail}</span>
            </Button>
          </form>
        ))}
      </div>
    </section>
  );
}
