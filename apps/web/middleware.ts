import { type NextRequest, NextResponse } from 'next/server';

const authPaths = ['/login', '/registro'];
const protectedPrefixes = [
  '/pedidos',
  '/mesas',
  '/cardapio',
  '/caixa',
  '/cozinha',
  '/delivery',
  '/configuracoes',
  '/relatorios',
];

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('better-auth.session_token');
  const pathname = request.nextUrl.pathname;

  if (sessionCookie && authPaths.includes(pathname)) {
    return NextResponse.redirect(new URL('/pedidos', request.url));
  }

  if (!sessionCookie && protectedPrefixes.some((prefix) => pathname.startsWith(prefix))) {
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
  ],
};
