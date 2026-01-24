import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { rateLimitMiddleware, getRateLimitIdentifier, rateLimiters } from '@/lib/rate-limit';
import { apiLogger, logApiRequest, authLogger } from '@/lib/logger';

/**
 * Endpoint para obtener el token de verificación en modo test
 * Solo disponible cuando TEST_MODE=true
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  // Solo permitir en modo test
  if (process.env.TEST_MODE !== 'true' && process.env.NODE_ENV !== 'test') {
    const duration = Date.now() - startTime;
    logApiRequest('GET', '/api/auth/verification-token', 403, duration);
    return NextResponse.json(
      { error: 'Este endpoint solo está disponible en modo test' },
      { status: 403 }
    );
  }

  // Rate limiting
  const rateLimitResponse = await rateLimitMiddleware(
    getRateLimitIdentifier(request),
    rateLimiters.verifyEmail
  );
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const email = request.nextUrl.searchParams.get('email');
    
    if (!email) {
      const duration = Date.now() - startTime;
      logApiRequest('GET', '/api/auth/verification-token', 400, duration);
      return NextResponse.json(
        { error: 'Email requerido' },
        { status: 400 }
      );
    }

    // Buscar usuario y token de verificación
    const userResult = await pool.query(
      `SELECT id, username, verification_token, verification_token_expires, email_verified
       FROM user_accounts
       WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      const duration = Date.now() - startTime;
      logApiRequest('GET', '/api/auth/verification-token', 404, duration);
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    if (user.email_verified) {
      const duration = Date.now() - startTime;
      logApiRequest('GET', '/api/auth/verification-token', 400, duration);
      return NextResponse.json(
        { error: 'Email ya verificado' },
        { status: 400 }
      );
    }

    if (!user.verification_token) {
      const duration = Date.now() - startTime;
      logApiRequest('GET', '/api/auth/verification-token', 404, duration);
      return NextResponse.json(
        { error: 'Token de verificación no encontrado' },
        { status: 404 }
      );
    }

    const duration = Date.now() - startTime;
    authLogger.info({ userId: user.id, email, duration }, 'Verification token retrieved for testing');
    logApiRequest('GET', '/api/auth/verification-token', 200, duration);

    return NextResponse.json({
      token: user.verification_token,
      expires: user.verification_token_expires,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    apiLogger.error({ error, email: request.nextUrl.searchParams.get('email'), duration }, 'Error retrieving verification token');
    logApiRequest('GET', '/api/auth/verification-token', 500, duration);

    return NextResponse.json(
      { error: 'Error al obtener token de verificación' },
      { status: 500 }
    );
  }
}
