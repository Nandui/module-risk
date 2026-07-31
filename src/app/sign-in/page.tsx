import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/sign-in-form";
import { DevSignIn } from "@/components/auth/dev-sign-in";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_28rem]">
      {/* The tile field, used once, at full size. It is the product's face and
          this is the only screen with room to show it. */}
      <div
        aria-hidden
        className="relative hidden overflow-hidden bg-ink lg:block"
      >
        <div className="absolute inset-0 grid grid-cols-8 gap-[2px] p-[2px] opacity-90">
          {Array.from({ length: 96 }, (_, i) => {
            const band = ((i * 7) % 5) + 1;
            return (
              <div
                key={i}
                className="bg-(--tile)"
                style={{
                  ["--tile" as string]: `var(--color-risk-${band})`,
                  opacity: 0.1 + ((i * 13) % 9) / 22,
                }}
              />
            );
          })}
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/85 to-transparent p-10 pt-32">
          <p className="eyebrow !text-surface/60">Health &amp; safety</p>
          <p className="mt-2 max-w-md font-display text-figure font-bold leading-[0.95] tracking-tight text-surface">
            Risk register
          </p>
          <p className="mt-3 max-w-sm text-ui text-surface/70">
            Assessments, actions and evidence across every centre in the group.
          </p>
        </div>
      </div>

      <div className="flex flex-col justify-center bg-surface-raised px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm">
          <p className="eyebrow">Sign in</p>
          <h1 className="mt-2 font-display text-title font-bold text-ink">
            Welcome back
          </h1>
          <p className="mt-1.5 text-ui text-muted">
            Use the account your centre manager set up for you.
          </p>

          <SignInForm next={next} />
          <DevSignIn />
        </div>
      </div>
    </div>
  );
}
