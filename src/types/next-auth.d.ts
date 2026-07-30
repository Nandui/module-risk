import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      /** The profile id, carried from the JWT's subject. */
      id: string;
    } & DefaultSession["user"];
  }
}
