import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "crm31_session";

// Rute publice — nu necesită login. Restul întregului CRM e blocat.
const PUBLIC_PATHS = new Set([
  "/login",
  "/setup",
  "/register",
  "/invite",
]);

const PUBLIC_PREFIXES = [
  "/api/auth/",       // toate endpoint-urile de auth
  "/_next/",          // build assets
  "/favicon",
  "/robots.txt",
  "/sitemap.xml",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Whitelist rute publice
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  // Cere cookie de sesiune — dacă lipsește, redirect la /login (+ ?next=)
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Toate rutele EXCEPT: fișiere Next.js interne + assets static (imagini etc.)
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|map)$).*)",
  ],
};
