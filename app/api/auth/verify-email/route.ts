import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { withTransaction } from '@/lib/db-transactions';
import { rateLimitMiddleware, getRateLimitIdentifier, rateLimiters } from '@/lib/rate-limit';
import { apiLogger, logApiRequest, authLogger } from '@/lib/logger';
import { sendVerificationEmail } from '@/lib/email';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  let token = searchParams.get('token');
  
  // También aceptar token en el body si viene como JSON (para compatibilidad con tests)
  if (!token) {
    try {
      const body = await request.json();
      token = body.token;
    } catch {
      // No es JSON, continuar con query param
    }
  }

  // Rate limiting
  const rateLimitResponse = await rateLimitMiddleware(
    getRateLimitIdentifier(request),
    rateLimiters.verifyEmail
  );
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  if (!token) {
    const duration = Date.now() - startTime;
    logApiRequest('GET', '/api/auth/verify-email', 400, duration);
    return NextResponse.json(
      { success: false, error: 'Token de verificación requerido' },
      { status: 400 }
    );
  }

  try {
    // Verificar qué columnas existen en la tabla user_accounts
    const columnsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_accounts'
      ORDER BY ordinal_position
    `);
    
    const existingColumns = columnsResult.rows.map((row: any) => row.column_name);
    const hasVerificationToken = existingColumns.includes('verification_token');
    const hasVerificationTokenExpires = existingColumns.includes('verification_token_expires');

    // Construir SELECT dinámicamente basado en columnas disponibles
    let selectColumns = 'id, email, username, email_verified';
    if (hasVerificationTokenExpires) {
      selectColumns += ', verification_token_expires';
    }

    // Buscar cuenta con el token de verificación (solo si la columna existe)
    if (!hasVerificationToken) {
      const duration = Date.now() - startTime;
      logApiRequest('GET', '/api/auth/verify-email', 500, duration);
      return NextResponse.json(
        { success: false, error: 'Sistema de verificación no configurado correctamente' },
        { status: 500 }
      );
    }

    const result = await pool.query(
      `SELECT ${selectColumns}
       FROM user_accounts
       WHERE verification_token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      const duration = Date.now() - startTime;
      logApiRequest('GET', '/api/auth/verify-email', 404, duration);
      return NextResponse.json(
        { success: false, error: 'Token de verificación inválido' },
        { status: 404 }
      );
    }

    const user = result.rows[0];

    // Verificar si el email ya está verificado
    if (user.email_verified) {
      const duration = Date.now() - startTime;
      logApiRequest('GET', '/api/auth/verify-email', 400, duration);
      return NextResponse.json(
        { success: false, error: 'Email ya verificado' },
        { status: 400 }
      );
    }

    // Verificar si el token expiró (solo si la columna existe)
    if (hasVerificationTokenExpires && user.verification_token_expires) {
      const expirationDate = new Date(user.verification_token_expires);
      const now = new Date();

      if (expirationDate < now) {
        const duration = Date.now() - startTime;
        logApiRequest('GET', '/api/auth/verify-email', 400, duration);
        return NextResponse.json(
          { success: false, error: 'Token de verificación expirado' },
          { status: 400 }
        );
      }
    }

    // Actualizar email_verified y limpiar token usando transacción
    await withTransaction(async (client) => {
      // Construir UPDATE dinámicamente
      let updateColumns: string[] = ['email_verified = true'];
      let updateValues: any[] = [];

      if (hasVerificationToken) {
        updateColumns.push('verification_token = NULL');
      }

      if (hasVerificationTokenExpires) {
        updateColumns.push('verification_token_expires = NULL');
      }

      updateColumns.push('updated_at = CURRENT_TIMESTAMP');
      updateValues.push(user.id);

      await client.query(
        `UPDATE user_accounts
         SET ${updateColumns.join(', ')}
         WHERE id = $1`,
        updateValues
      );
    });

    const duration = Date.now() - startTime;
    authLogger.info({ userId: user.id, email: user.email, duration }, 'Email verified successfully');
    logApiRequest('GET', '/api/auth/verify-email', 200, duration);

    return NextResponse.json({
      success: true,
      message: 'Email verificado exitosamente. Ya puedes iniciar sesión.',
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    apiLogger.error({ error, duration }, 'Error in verify-email endpoint');
    logApiRequest('GET', '/api/auth/verify-email', 500, duration);

    return NextResponse.json(
      { success: false, error: 'Error al verificar email' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/verify-email
 * Reenvía el email de verificación a un proveedor
 * 
 * Body: { email: string }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Rate limiting
  const rateLimitResponse = await rateLimitMiddleware(
    getRateLimitIdentifier(request),
    rateLimiters.verifyEmail
  );
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      const duration = Date.now() - startTime;
      logApiRequest('POST', '/api/auth/verify-email', 400, duration);
      return NextResponse.json(
        { success: false, error: 'Body JSON inválido' },
        { status: 400 }
      );
    }
    
    const { email } = body;

    if (!email || typeof email !== 'string') {
      const duration = Date.now() - startTime;
      logApiRequest('POST', '/api/auth/verify-email', 400, duration);
      return NextResponse.json(
        { success: false, error: 'Email requerido' },
        { status: 400 }
      );
    }

    // Verificar qué columnas existen en la tabla user_accounts
    const columnsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_accounts'
      ORDER BY ordinal_position
    `);
    
    const existingColumns = columnsResult.rows.map((row: any) => row.column_name);
    const hasVerificationToken = existingColumns.includes('verification_token');
    const hasVerificationTokenExpires = existingColumns.includes('verification_token_expires');

    // Construir SELECT dinámicamente
    let selectColumns = 'id, email, username, email_verified';
    if (hasVerificationToken) {
      selectColumns += ', verification_token';
    }
    if (hasVerificationTokenExpires) {
      selectColumns += ', verification_token_expires';
    }

    // Buscar cuenta por email
    const result = await pool.query(
      `SELECT ${selectColumns}
       FROM user_accounts
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      const duration = Date.now() - startTime;
      logApiRequest('POST', '/api/auth/verify-email', 404, duration);
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const user = result.rows[0];

    // Si ya está verificado, no hacer nada
    if (user.email_verified) {
      const duration = Date.now() - startTime;
      logApiRequest('POST', '/api/auth/verify-email', 400, duration);
      return NextResponse.json(
        { success: false, error: 'Email ya verificado' },
        { status: 400 }
      );
    }

    // Generar nuevo token de verificación
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 horas de validez

    // Actualizar token en la base de datos (solo si las columnas existen)
    if (hasVerificationToken || hasVerificationTokenExpires) {
      await withTransaction(async (client) => {
        let updateColumns: string[] = [];
        let updateValues: any[] = [];
        let paramIndex = 1;

        if (hasVerificationToken) {
          updateColumns.push(`verification_token = $${paramIndex++}`);
          updateValues.push(verificationToken);
        }

        if (hasVerificationTokenExpires) {
          updateColumns.push(`verification_token_expires = $${paramIndex++}`);
          updateValues.push(expiresAt);
        }

        updateColumns.push('updated_at = CURRENT_TIMESTAMP');
        // user.id va al final para el WHERE
        updateValues.push(user.id);

        await client.query(
          `UPDATE user_accounts
           SET ${updateColumns.join(', ')}
           WHERE id = $${paramIndex}`,
          updateValues
        );
      });
    } else {
      // Si las columnas no existen, solo actualizar updated_at
      await withTransaction(async (client) => {
        await client.query(
          `UPDATE user_accounts
           SET updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [user.id]
        );
      });
    }

    // Enviar email de verificación
    try {
      await sendVerificationEmail(user.email, user.username, verificationToken);
      
      const duration = Date.now() - startTime;
      authLogger.info({ userId: user.id, email: user.email, duration }, 'Verification email resent');
      logApiRequest('POST', '/api/auth/verify-email', 200, duration);

      return NextResponse.json({
        success: true,
        message: 'Email de verificación reenviado exitosamente.',
      });
    } catch (emailError: any) {
      // El email falló pero el token se actualizó, loguear el error pero no fallar
      const duration = Date.now() - startTime;
      authLogger.error({ error: emailError, userId: user.id, email: user.email }, 'Error sending verification email on resend');
      logApiRequest('POST', '/api/auth/verify-email', 200, duration);

      return NextResponse.json({
        success: true,
        message: 'Token de verificación actualizado. El email puede no haberse enviado debido a problemas de configuración SMTP.',
        warning: process.env.NODE_ENV === 'development' ? emailError.message : undefined,
      });
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    apiLogger.error({ error, duration }, 'Error in verify-email POST endpoint');
    logApiRequest('POST', '/api/auth/verify-email', 500, duration);

    return NextResponse.json(
      { success: false, error: 'Error al procesar solicitud' },
      { status: 500 }
    );
  }
}
