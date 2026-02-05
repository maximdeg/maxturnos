import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { isSuperAdmin } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { apiLogger, logApiRequest } from '@/lib/logger';
import { rateLimitMiddleware, getRateLimitIdentifier, rateLimiters } from '@/lib/rate-limit';
import { z } from 'zod';

const masterResetPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
  username: z.string().min(1, 'Username requerido').optional(),
  new_password: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
});

/**
 * Endpoint Master para cambiar contraseña de cualquier usuario
 * Solo accesible para super_admin
 *
 * Permite cambiar la contraseña de cualquier usuario (proveedor o admin)
 * solo conociendo su email y username (opcional para admins)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  const rateLimitResponse = await rateLimitMiddleware(
    getRateLimitIdentifier(request),
    rateLimiters.adminMasterReset
  );
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const authHeader = request.headers.get('authorization');

  // Verificar que el usuario autenticado sea super_admin
  const isAdmin = await isSuperAdmin(authHeader);
  
  if (!isAdmin) {
    const duration = Date.now() - startTime;
    logApiRequest('POST', '/api/admin/master-reset-password', 403, duration);
    return NextResponse.json(
      { 
        error: 'No autorizado. Solo super administradores pueden usar este endpoint.',
        message: 'Este endpoint requiere permisos de super administrador.'
      },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const validationResult = masterResetPasswordSchema.safeParse(body);

    if (!validationResult.success) {
      const duration = Date.now() - startTime;
      logApiRequest('POST', '/api/admin/master-reset-password', 400, duration);
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { email: rawEmail, username: rawUsername, new_password } = validationResult.data;

    // Normalizar email (trim y lowercase)
    const email = rawEmail.trim().toLowerCase();
    const username = rawUsername ? rawUsername.trim() : null;

    // Log de depuración
    apiLogger.debug({ 
      originalEmail: rawEmail, 
      normalizedEmail: email,
      originalUsername: rawUsername,
      normalizedUsername: username 
    }, 'Master reset password - searching user');

    let userResult;
    let userType = 'provider';
    let userId: number | null = null;

    // Buscar usuario primero en user_accounts (proveedores)
    if (username) {
      // Si se proporciona username, buscar con ambos criterios
      apiLogger.debug({ email, username }, 'Searching in user_accounts with email and username');
      userResult = await pool.query(
        `SELECT id, email, username, 'provider' as user_type
         FROM user_accounts
         WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) AND username = $2`,
        [email, username]
      );
      apiLogger.debug({ found: userResult.rows.length, email, username }, 'user_accounts search result');
    } else {
      // Si no se proporciona username, buscar solo por email
      apiLogger.debug({ email }, 'Searching in user_accounts with email only');
      userResult = await pool.query(
        `SELECT id, email, username, 'provider' as user_type
         FROM user_accounts
         WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))`,
        [email]
      );
      apiLogger.debug({ found: userResult.rows.length, email }, 'user_accounts search result');
    }

    // Si no se encuentra en user_accounts, buscar en users (administradores)
    if (userResult.rows.length === 0) {
      // Para administradores, solo buscar por email (no tienen username)
      apiLogger.debug({ email }, 'Not found in user_accounts, searching in users');
      userResult = await pool.query(
        `SELECT id, email, NULL as username, role, 'admin' as user_type
         FROM users
         WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))`,
        [email]
      );
      apiLogger.debug({ found: userResult.rows.length, email }, 'users search result');
      
      if (userResult.rows.length > 0) {
        userType = 'admin';
        userId = userResult.rows[0].id;
      }
    } else {
      // Usuario encontrado en user_accounts
      userId = userResult.rows[0].id;
      userType = 'provider';
    }

    if (userResult.rows.length === 0) {
      const duration = Date.now() - startTime;
      logApiRequest('POST', '/api/admin/master-reset-password', 404, duration);
      
      // Verificar si existe el email pero con username diferente
      let emailExistsButWrongUsername = false;
      let actualUsername: string | null = null;
      
      if (username) {
        const emailCheck = await pool.query(
          `SELECT id, email, username FROM user_accounts WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))`,
          [email]
        );
        if (emailCheck.rows.length > 0) {
          emailExistsButWrongUsername = true;
          actualUsername = emailCheck.rows[0].username;
          apiLogger.warn({ 
            email, 
            providedUsername: username,
            actualUsername: actualUsername
          }, 'Email exists but username does not match');
        }
      }
      
      // Log detallado del error
      apiLogger.warn({ 
        email, 
        username: username || null,
        emailExistsButWrongUsername,
        actualUsername,
        searchedIn: ['user_accounts', 'users']
      }, 'User not found for master password reset');
      
      let errorMessage = 'Usuario no encontrado con el email proporcionado';
      if (emailExistsButWrongUsername && actualUsername) {
        errorMessage = `El email existe pero el username proporcionado no coincide. El username correcto es: "${actualUsername}"`;
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: {
            email,
            username: username || 'no proporcionado',
            actualUsername: actualUsername || null,
            searchedIn: ['user_accounts', 'users'],
            suggestion: emailExistsButWrongUsername && actualUsername
              ? `El email existe pero el username es incorrecto. Usa username: "${actualUsername}"`
              : username 
                ? 'Verifica que el email y username coincidan con un usuario existente.'
                : 'Si es un proveedor, proporciona también el username. Si es un admin, solo se requiere el email.'
          }
        },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];
    userId = user.id;

    // Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Actualizar contraseña según el tipo de usuario
    if (userType === 'provider') {
      await pool.query(
        `UPDATE user_accounts 
         SET password = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [hashedPassword, userId]
      );
    } else {
      await pool.query(
        `UPDATE users 
         SET password = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [hashedPassword, userId]
      );
    }

    const duration = Date.now() - startTime;
    logApiRequest('POST', '/api/admin/master-reset-password', 200, duration);

    apiLogger.info({ 
      userId, 
      email, 
      userType,
      changedBy: 'super_admin',
      duration 
    }, 'Master password reset successful');

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada exitosamente',
      user: {
        id: userId,
        email: user.email,
        username: user.username || null,
        user_type: userType,
        role: user.role || null,
      },
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    apiLogger.error({ 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration 
    }, 'Error in master reset password endpoint');
    logApiRequest('POST', '/api/admin/master-reset-password', 500, duration);

    return NextResponse.json(
      { 
        error: 'Error al actualizar contraseña',
        message: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    );
  }
}
