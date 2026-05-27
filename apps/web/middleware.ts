import { type NextRequest, NextResponse } from 'next/server';

const protectedPrefixes = [
  '/pedidos',
  '/mesas',
  '/cardapio',
  '/caixa',
  '/cozinha',
  '/delivery',
  '/configuracoes',
  '/relatorios',
  '/setup',
  '/upgrade',
  '/admin',
];

function hasSessionCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name.includes('better-auth.session_token'));
}

export function middleware(request: NextRequest) {
  const hasSession = hasSessionCookie(request);
  const pathname = request.nextUrl.pathname;

  if (!hasSession && protectedPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login',
    '/registro',
    '/pedidos/:path*',
    '/mesas/:path*',
    '/cardapio/:path*',
    '/caixa/:path*',
    '/cozinha/:path*',
    '/delivery/:path*',
    '/configuracoes/:path*',
    '/relatorios/:path*',
    '/setup/:path*',
    '/upgrade/:path*',
    '/admin/:path*',
  ],
};
