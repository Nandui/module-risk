import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "@/lib/auth.config";

// Edge-safe: authConfig has no providers and no database access, so this
// runs without pulling bcrypt or Prisma into the edge bundle.
const { auth } = NextAuth(authConfig);

// `/preview` is the design-system reference. It needs no session because it
// holds no data; the pages themselves 404 outside development.
const PUBLIC_PREFIXES = ["/sign-in", "/api/auth", "/preview"];

/**
 * Keeps unauthenticated traffic out of the app. Auth is checked here *and*
 * enforced by row level security — this is for redirects, not for security.
 *
 * Named `proxy` rather than `middleware`: Next 16 renamed the convention.
 */
export default auth((request) => {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  if (!request.auth && !isPublic) {
    const signIn = request.nextUrl.clone();
    signIn.pathname = "/sign-in";
    signIn.searchParams.set("next", pathname);
    return NextResponse.redirect(signIn);
  }

  if (request.auth && pathname === "/sign-in") {
    const register = request.nextUrl.clone();
    register.pathname = "/register";
    register.search = "";
    return NextResponse.redirect(register);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|webp)$).*)"],
};
