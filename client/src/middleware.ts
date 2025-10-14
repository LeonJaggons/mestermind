import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Gate access based on pro status stored in cookies (set after login)
// - /pro/** requires is_pro=true
// - /messages (customer messages) requires NOT is_pro (redirect pros to /pro/messages)
// - /admin/** requires authentication (redirect to login)
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read lightweight pro flag from cookies (set at login/session init)
  const isPro = request.cookies.get('is_pro')?.value === 'true';
  const isAuthenticated = request.cookies.get('is_authenticated')?.value === 'true';

  // Block access to /admin for unauthenticated users
  if (pathname.startsWith('/admin')) {
    if (!isAuthenticated) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Block access to /pro for non-pros (except onboarding)
  if (pathname.startsWith('/pro')) {
    // Allow access to onboarding for non-pros
    if (pathname === '/pro/onboarding' || pathname.startsWith('/pro/onboarding/')) {
      return NextResponse.next();
    }
    
    if (!isPro) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Block access to customer jobs; redirect to tasks
  if (pathname === '/jobs' || pathname.startsWith('/jobs/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/tasks';
    return NextResponse.redirect(url);
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


