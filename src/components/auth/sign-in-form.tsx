"use client";

import * as React from "react";
import { signIn } from "@/lib/actions/misc";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function SignInForm({ next }: { next?: string }) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(undefined);
    setFieldErrors({});
    const result = await signIn(formData);
    // A successful sign-in redirects, so reaching here means it failed.
    setPending(false);
    setError(result?.error);
    setFieldErrors(result?.fieldErrors ?? {});
  }

  return (
    <form action={onSubmit} className="mt-8 space-y-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <Field label="Email" htmlFor="email" error={fieldErrors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          required
          inputSize="lg"
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? "email-error" : undefined}
        />
      </Field>

      <Field label="Password" htmlFor="password" error={fieldErrors.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          inputSize="lg"
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={fieldErrors.password ? "password-error" : undefined}
        />
      </Field>

      {error ? (
        <p
          role="alert"
          className="border-l-2 border-risk-5 bg-risk-5-wash px-3 py-2 text-ui-sm text-risk-5-ink"
        >
          {error}
        </p>
      ) : null}

      <Button type="submit" variant="ink" size="lg" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
