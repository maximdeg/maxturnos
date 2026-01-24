import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { apiLogger, logApiRequest } from '@/lib/logger';
import { z } from 'zod';

const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Contraseña actual requerida'),
  new_password: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
});

export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  
  const authHeader = request.headers.get('authorization');
  const user = await requireAuth(authHeader);

  if (!user) {
    const duration = Date.now() - startTime;
    logApiRequest('PUT', '/api/proveedor/profile/password', 401, duration);
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const validationResult = changePasswordSchema.safeParse(body);

    if (!validationResult.success) {
      const duration = Date.now() - startTime;
      logApiRequest('PUT', '/api/proveedor/profile/password', 400, duration);
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { current_password, new_password } = validationResult.data;

    // Obtener contraseña actual
    const result = await pool.query(
      'SELECT password FROM user_accounts WHERE id = $1',
      [user.id]
    );

    if (result.rows.length === 0) {
      const duration = Date.now() - startTime;
      logApiRequest('PUT', '/api/proveedor/profile/password', 404, duration);
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Verificar contraseña actual
    const passwordMatch = await bcrypt.compare(current_password, result.rows[0].password);
    if (!passwordMatch) {
      const duration = Date.now() - startTime;
      logApiRequest('PUT', '/api/proveedor/profile/password', 401, duration);
      return NextResponse.json(
        { error: 'Contraseña actual incorrecta' },
        { status: 401 }
      );
    }

    // Verificar que la nueva contraseña sea diferente
    const samePassword = await bcrypt.compare(new_password, result.rows[0].password);
    if (samePassword) {
      const duration = Date.now() - startTime;
      logApiRequest('PUT', '/api/proveedor/profile/password', 400, duration);
      return NextResponse.json(
        { error: 'La nueva contraseña debe ser diferente a la actual' },
        { status: 400 }
      );
    }

    // Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Actualizar contraseña
    await pool.query(
      `UPDATE user_accounts 
       SET password = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [hashedPassword, user.id]
    );

    const duration = Date.now() - startTime;
    logApiRequest('PUT', '/api/proveedor/profile/password', 200, duration);

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada exitosamente',
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    apiLogger.error({ error, userId: user.id, duration }, 'Error in change password endpoint');
    logApiRequest('PUT', '/api/proveedor/profile/password', 500, duration);

    return NextResponse.json(
      { error: 'Error al actualizar contraseña' },
      { status: 500 }
    );
  }
}
