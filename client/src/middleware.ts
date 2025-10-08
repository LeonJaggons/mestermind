import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Gate access based on pro status stored in cookies (set after login)
// - /pro/** requires is_pro=true
// - /messages (customer messages) requires NOT is_pro (redirect pros to /pro/messages)
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read lightweight pro flag from cookies (set at login/session init)
  const isPro = request.cookies.get('is_pro')?.value === 'true';

  // Block access to /pro for non-pros
  if (pathname.startsWith('/pro')) {
    if (!isPro) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Block access to /messages for pros; redirect to pro messages
  if (pathname === '/messages' || pathname.startsWith('/messages/')) {
    if (isPro) {
      const url = request.nextUrl.clone();
      url.pathname = '/pro/messages';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};


