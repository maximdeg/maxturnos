import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { pool } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import { apiLogger, logApiRequest } from '@/lib/logger';
import { rateLimitMiddleware, getRateLimitIdentifier, rateLimiters } from '@/lib/rate-limit';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

/**
 * Login solo para super_admin. Busca únicamente en la tabla `users`.
 * Así podés usar el mismo email que en user_accounts (proveedor) y entrar al panel admin.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  const rateLimitResponse = await rateLimitMiddleware(
    getRateLimitIdentifier(request),
    rateLimiters.login
  );
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await request.json();
    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      const duration = Date.now() - startTime;
      logApiRequest('POST', '/api/admin/login', 400, duration);
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;
    const emailNormalized = email.trim().toLowerCase();

    // Buscar SOLO en users (admins), no en user_accounts
    const result = await pool.query(
      `SELECT id, email, password, role
       FROM users
       WHERE LOWER(TRIM(email)) = $1`,
      [emailNormalized]
    );

    if (result.rows.length === 0) {
      const duration = Date.now() - startTime;
      logApiRequest('POST', '/api/admin/login', 401, duration);
      return NextResponse.json(
        { success: false, error: 'Credenciales inválidas o esta cuenta no es de administrador.' },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      const duration = Date.now() - startTime;
      logApiRequest('POST', '/api/admin/login', 401, duration);
      return NextResponse.json(
        { success: false, error: 'Credenciales inválidas.' },
        { status: 401 }
      );
    }

    if (user.role !== 'super_admin') {
      const duration = Date.now() - startTime;
      logApiRequest('POST', '/api/admin/login', 403, duration);
      return NextResponse.json(
        {
          success: false,
          error: 'Solo super administradores pueden acceder. Tu cuenta no tiene ese rol.',
        },
        { status: 403 }
      );
    }

    const token = await generateToken({
      id: user.id,
      email: user.email,
      username: null,
      email_verified: true,
    });

    const duration = Date.now() - startTime;
    logApiRequest('POST', '/api/admin/login', 200, duration);

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        email_verified: true,
        user_type: 'admin',
        role: 'super_admin',
      },
    });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    apiLogger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        duration,
      },
      'Error in admin login endpoint'
    );
    logApiRequest('POST', '/api/admin/login', 500, duration);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al iniciar sesión',
      },
      { status: 500 }
    );
  }
}
