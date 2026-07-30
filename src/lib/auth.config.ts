import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe config, shared with the proxy gate in src/proxy.ts.
 *
 * Deliberately has NO providers and NO database access: the Credentials
 * provider needs Node (bcrypt and Prisma), so it lives in auth.ts. The
 * proxy only reads the session cookie to decide whether a request is
 * authenticated.
 */
export default {
  providers: [],
  pages: { signIn: "/sign-in" },
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth }) {
      return Boolean(auth?.user);
    },
  },
} satisfies NextAuthConfig;
