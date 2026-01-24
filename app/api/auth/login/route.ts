import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { pool } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import { rateLimitMiddleware, getRateLimitIdentifier } from '@/lib/rate-limit';
import { rateLimiters } from '@/lib/rate-limit';
import { apiLogger, logApiRequest } from '@/lib/logger';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  // Rate limiting
  const rateLimitResponse = await rateLimitMiddleware(
    getRateLimitIdentifier(request),
    rateLimiters.login
  );
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await request.json();

    // Validar datos de entrada
    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      const duration = Date.now() - startTime;
      logApiRequest('POST', '/api/auth/login', 400, duration);
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;

    // Buscar cuenta por email primero en user_accounts (proveedores)
    let result = await pool.query(
      `SELECT id, email, username, password, email_verified, 'provider' as user_type
       FROM user_accounts
       WHERE email = $1`,
      [email]
    );

    // Si no se encuentra en user_accounts, buscar en users (administradores)
    if (result.rows.length === 0) {
      result = await pool.query(
        `SELECT id, email, NULL as username, password, true as email_verified, 'admin' as user_type, role
         FROM users
         WHERE email = $1`,
        [email]
      );
    }

    if (result.rows.length === 0) {
      const duration = Date.now() - startTime;
      logApiRequest('POST', '/api/auth/login', 401, duration);
      return NextResponse.json(
        { success: false, error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // Verificar contraseña
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      const duration = Date.now() - startTime;
      logApiRequest('POST', '/api/auth/login', 401, duration);
      return NextResponse.json(
        { success: false, error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Verificar que el email esté verificado (solo para proveedores, admins siempre están verificados)
    if (user.user_type === 'provider' && !user.email_verified) {
      const duration = Date.now() - startTime;
      logApiRequest('POST', '/api/auth/login', 403, duration);
      const errorMessage = 'Email no verificado. Por favor verifica tu email antes de iniciar sesión.';
      return NextResponse.json(
        { 
          success: false, 
          error: errorMessage,
          message: errorMessage, // Alias para compatibilidad con tests
        },
        { status: 403 }
      );
    }

    // Generar token JWT
    const token = await generateToken({
      id: user.id,
      email: user.email,
      username: user.username || null,
      email_verified: user.email_verified,
    });

    const duration = Date.now() - startTime;
    logApiRequest('POST', '/api/auth/login', 200, duration);

    // Preparar respuesta según el tipo de usuario
    const userResponse: any = {
      id: user.id,
      email: user.email,
      email_verified: user.email_verified,
    };

    // Agregar campos específicos según el tipo de usuario
    if (user.user_type === 'provider') {
      userResponse.username = user.username;
    } else if (user.user_type === 'admin') {
      userResponse.role = user.role || 'admin';
      userResponse.user_type = 'admin';
    }

    return NextResponse.json({
      success: true,
      token,
      user: userResponse,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    apiLogger.error({ 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration 
    }, 'Error in login endpoint');
    logApiRequest('POST', '/api/auth/login', 500, duration);

    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al iniciar sesión',
        message: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    );
  }
}
