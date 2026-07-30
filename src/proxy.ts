import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// `/preview` is the design-system reference. It needs no session because it
// holds no data; the page itself 404s outside development.
const PUBLIC_PATHS = ["/sign-in", "/auth", "/preview"];

/**
 * Refreshes the Supabase session on every request and keeps unauthenticated
 * traffic out of the app. Auth is checked here *and* enforced by RLS — this
 * is for redirects, not for security.
 *
 * Named `proxy` rather than `middleware`: Next 16 renamed the convention.
 */
export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet) {
        for (const { name, value } of toSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    const signIn = request.nextUrl.clone();
    signIn.pathname = "/sign-in";
    signIn.searchParams.set("next", pathname);
    return NextResponse.redirect(signIn);
  }

  if (user && pathname === "/sign-in") {
    const register = request.nextUrl.clone();
    register.pathname = "/register";
    register.search = "";
    return NextResponse.redirect(register);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|webp)$).*)"],
};
