import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas públicas que no requieren autenticación
  const publicRoutes = [
    '/proveedor/register',
    '/proveedor/login',
    '/api/auth/register',
    '/api/auth/login',
    '/api/auth/verify-email',
  ];

  // Si es una ruta pública, permitir acceso sin autenticación
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Rutas protegidas de API del proveedor (solo APIs, no páginas HTML)
  if (pathname.startsWith('/api/proveedor')) {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'No autorizado. Token requerido.' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const user = await verifyToken(token);

    if (!user || !user.email_verified) {
      return NextResponse.json(
        { error: 'No autorizado. Token inválido o email no verificado.' },
        { status: 401 }
      );
    }

    // Agregar información del usuario a los headers para uso en las rutas
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', user.id.toString());
    requestHeaders.set('x-user-email', user.email);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/proveedor/:path*',
  ],
};
