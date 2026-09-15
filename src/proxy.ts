import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/server/auth/token';

// Route-level gate. Pages, Server Actions and Route Handlers re-check the session and scope against the database.
const CENTRAL_ONLY_PREFIXES = ['/hospitals', '/audit', '/api/reports'];
const HOSPITAL_ONLY_PREFIXES = ['/hospital-profile'];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith('/api/');

  // Cron endpoints authenticate with CRON_SECRET instead of a user session.
  if (pathname.startsWith('/api/cron/')) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (pathname === '/login') {
    return session ? NextResponse.redirect(new URL('/dashboard', request.url)) : NextResponse.next();
  }

  if (!session) {
    if (isApi) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const response = NextResponse.redirect(new URL('/login', request.url));
    if (token) response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  const forbidden =
    (matchesPrefix(pathname, CENTRAL_ONLY_PREFIXES) && session.role !== 'central') ||
    (matchesPrefix(pathname, HOSPITAL_ONLY_PREFIXES) && session.role !== 'hospital');

  if (forbidden) {
    if (isApi) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt).*)'],
};
