import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { apiLogger, logApiRequest } from '@/lib/logger';
import { z } from 'zod';
import { isValidPhoneNumber, cleanPhoneNumber } from '@/lib/utils';
import crypto from 'crypto';

const updateProfileSchema = z.object({
  email: z.string().email('Email inválido').optional(),
  first_name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres').optional(),
  last_name: z.string().min(2, 'Apellido debe tener al menos 2 caracteres').optional(),
  whatsapp_phone_number: z.string()
    .refine((phone) => !phone || isValidPhoneNumber(phone), 'Formato de teléfono inválido')
    .optional(),
  // Alias para compatibilidad con tests y clientes que envían name/phone
  name: z.string().min(2).optional(),
  phone: z.string()
    .refine((phone) => !phone || isValidPhoneNumber(phone), 'Formato de teléfono inválido')
    .optional(),
}).transform((data) => {
  // Mapear alias a campos canónicos
  const out = { ...data };
  if (data.name !== undefined) {
    out.first_name = data.first_name ?? data.name;
    delete (out as any).name;
  }
  if (data.phone !== undefined) {
    out.whatsapp_phone_number = data.whatsapp_phone_number ?? data.phone;
    delete (out as any).phone;
  }
  return out;
});

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  const authHeader = request.headers.get('authorization');
  const user = await requireAuth(authHeader);

  if (!user) {
    const duration = Date.now() - startTime;
    logApiRequest('GET', '/api/proveedor/profile', 401, duration);
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 }
    );
  }

  try {
    // Verificar qué columnas existen en la tabla
    const columnsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_accounts' AND table_schema = 'public'
    `);
    
    const existingColumns = columnsResult.rows.map((row: any) => row.column_name);
    const hasFirstName = existingColumns.includes('first_name');
    const hasLastName = existingColumns.includes('last_name');
    const hasWhatsAppPhone = existingColumns.includes('whatsapp_phone_number');
    
    // Construir SELECT dinámicamente
    const selectFields = [
      'id',
      'email',
      'username',
      ...(hasFirstName ? ['first_name'] : []),
      ...(hasLastName ? ['last_name'] : []),
      ...(hasWhatsAppPhone ? ['whatsapp_phone_number'] : []),
      'email_verified',
      'created_at'
    ];
    
    const result = await pool.query(
      `SELECT ${selectFields.join(', ')}
       FROM user_accounts
       WHERE id = $1`,
      [user.id]
    );

    if (result.rows.length === 0) {
      const duration = Date.now() - startTime;
      logApiRequest('GET', '/api/proveedor/profile', 404, duration);
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const profile = result.rows[0];

    const duration = Date.now() - startTime;
    logApiRequest('GET', '/api/proveedor/profile', 200, duration);

    const first = hasFirstName ? profile.first_name : null;
    const last = hasLastName ? profile.last_name : null;
    const phone = hasWhatsAppPhone ? profile.whatsapp_phone_number : null;
    return NextResponse.json({
      id: profile.id,
      email: profile.email,
      username: profile.username,
      first_name: first,
      last_name: last,
      whatsapp_phone_number: phone,
      ...(first != null && { name: last ? `${first} ${last}` : first }),
      ...(phone != null && { phone }),
      email_verified: profile.email_verified,
      created_at: profile.created_at,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    apiLogger.error({ error, userId: user.id, duration }, 'Error in get provider profile endpoint');
    logApiRequest('GET', '/api/proveedor/profile', 500, duration);

    return NextResponse.json(
      { error: 'Error al obtener perfil' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  
  const authHeader = request.headers.get('authorization');
  const user = await requireAuth(authHeader);

  if (!user) {
    const duration = Date.now() - startTime;
    logApiRequest('PUT', '/api/proveedor/profile', 401, duration);
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const validationResult = updateProfileSchema.safeParse(body);

    if (!validationResult.success) {
      const duration = Date.now() - startTime;
      logApiRequest('PUT', '/api/proveedor/profile', 400, duration);
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Verificar qué columnas existen en la tabla
    const columnsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_accounts' AND table_schema = 'public'
    `);
    
    const existingColumns = columnsResult.rows.map((row: any) => row.column_name);
    const hasFirstName = existingColumns.includes('first_name');
    const hasLastName = existingColumns.includes('last_name');
    const hasWhatsAppPhone = existingColumns.includes('whatsapp_phone_number');
    const hasVerificationToken = existingColumns.includes('verification_token');

    const data = validationResult.data;
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Verificar si el email cambió y si es único
    if (data.email && data.email !== user.email) {
      const emailCheck = await pool.query(
        'SELECT id FROM user_accounts WHERE email = $1 AND id != $2',
        [data.email, user.id]
      );

      if (emailCheck.rows.length > 0) {
        const duration = Date.now() - startTime;
        logApiRequest('PUT', '/api/proveedor/profile', 400, duration);
        return NextResponse.json(
          { error: 'Email ya está en uso' },
          { status: 400 }
        );
      }

      updates.push(`email = $${paramIndex}`);
      values.push(data.email);
      paramIndex++;

      // Si cambia el email, necesita re-verificación
      updates.push(`email_verified = false`);
      if (hasVerificationToken) {
        updates.push(`verification_token = $${paramIndex}`);
        const verificationToken = crypto.randomBytes(32).toString('hex');
        values.push(verificationToken);
        paramIndex++;
      }
    }

    if (data.first_name !== undefined && hasFirstName) {
      updates.push(`first_name = $${paramIndex}`);
      values.push(data.first_name);
      paramIndex++;
    }

    if (data.last_name !== undefined && hasLastName) {
      updates.push(`last_name = $${paramIndex}`);
      values.push(data.last_name);
      paramIndex++;
    }

    if (data.whatsapp_phone_number !== undefined && hasWhatsAppPhone) {
      updates.push(`whatsapp_phone_number = $${paramIndex}`);
      values.push(data.whatsapp_phone_number ? cleanPhoneNumber(data.whatsapp_phone_number) : null);
      paramIndex++;
    }

    if (updates.length === 0) {
      const duration = Date.now() - startTime;
      logApiRequest('PUT', '/api/proveedor/profile', 400, duration);
      return NextResponse.json(
        { error: 'No hay cambios para actualizar' },
        { status: 400 }
      );
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(user.id);

    await pool.query(
      `UPDATE user_accounts 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}`,
      values
    );

    // Obtener perfil actualizado (usando las mismas verificaciones de columnas)
    const selectFields = [
      'id',
      'email',
      'username',
      ...(hasFirstName ? ['first_name'] : []),
      ...(hasLastName ? ['last_name'] : []),
      ...(hasWhatsAppPhone ? ['whatsapp_phone_number'] : []),
      'email_verified'
    ];
    
    const result = await pool.query(
      `SELECT ${selectFields.join(', ')}
       FROM user_accounts
       WHERE id = $1`,
      [user.id]
    );

    const duration = Date.now() - startTime;
    logApiRequest('PUT', '/api/proveedor/profile', 200, duration);

    return NextResponse.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      user: result.rows[0],
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    apiLogger.error({ error, userId: user.id, duration }, 'Error in update provider profile endpoint');
    logApiRequest('PUT', '/api/proveedor/profile', 500, duration);

    return NextResponse.json(
      { error: 'Error al actualizar perfil' },
      { status: 500 }
    );
  }
}
