import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import authConfig from "@/lib/auth.config";
import { credentialsFor } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { signInSchema } from "@/lib/schemas";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = signInSchema.safeParse(raw);
        if (!parsed.success) return null;

        const account = await credentialsFor(parsed.data.email);
        // Unknown account, deactivated account and wrong password all return
        // the same null — anything else is an account-enumeration leak.
        if (!account) return null;

        const ok = await verifyPassword(parsed.data.password, account.password_hash);
        if (!ok) return null;

        return { id: account.id, name: account.full_name, email: parsed.data.email };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    session({ session, token }) {
      // Carry the id onto the session so getSession can re-read the current
      // role from the database on every request rather than trusting the JWT.
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
