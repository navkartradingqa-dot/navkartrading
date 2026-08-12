import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "nt_session";

/**
 * Cheap gate: bounce anyone without a session cookie away from the back office
 * before the page even runs. The cookie's signature is verified properly inside
 * each layout — this only saves a round trip.
 */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  const isLogin = pathname === "/admin/login" || pathname === "/pos/login";
  const isProtected = pathname.startsWith("/admin") || pathname.startsWith("/pos");

  if (isProtected && !isLogin && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.startsWith("/pos") ? "/pos/login" : "/admin/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/pos/:path*"],
};
