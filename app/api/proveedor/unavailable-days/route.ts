import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { invalidateScheduleCache } from '@/lib/cache';
import { apiLogger, logApiRequest } from '@/lib/logger';
import { z } from 'zod';
import { getUsernameByUserAccountId } from '@/lib/user-routes';

const createUnavailableDaySchema = z.object({
  date: z.string().refine(
    (val) => /^\d{4}-\d{2}-\d{2}$/.test(val),
    'Formato de fecha inválido (debe ser YYYY-MM-DD)'
  ),
  is_confirmed: z.boolean().optional().default(false),
});

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  const authHeader = request.headers.get('authorization');
  const user = await requireAuth(authHeader);

  if (!user) {
    const duration = Date.now() - startTime;
    logApiRequest('GET', '/api/proveedor/unavailable-days', 401, duration);
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');

  try {
    let query = `
      SELECT id, unavailable_date, is_confirmed, created_at
      FROM unavailable_days
      WHERE user_account_id = $1
    `;
    const params: any[] = [user.id];

    if (startDate) {
      query += ` AND unavailable_date >= $2`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND unavailable_date <= $${params.length + 1}`;
      params.push(endDate);
    }

    query += ` ORDER BY unavailable_date`;

    const result = await pool.query(query, params);

    const unavailableDays = result.rows.map((row: any) => ({
      id: row.id,
      date: row.unavailable_date.toISOString().split('T')[0],
      is_confirmed: row.is_confirmed,
      created_at: row.created_at.toISOString(),
    }));

    const duration = Date.now() - startTime;
    logApiRequest('GET', '/api/proveedor/unavailable-days', 200, duration);

    return NextResponse.json({
      unavailable_days: unavailableDays,
      total: unavailableDays.length,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    apiLogger.error({ error, userId: user.id, duration }, 'Error in get unavailable days endpoint');
    logApiRequest('GET', '/api/proveedor/unavailable-days', 500, duration);

    return NextResponse.json(
      { error: 'Error al obtener días no laborables' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  const authHeader = request.headers.get('authorization');
  const user = await requireAuth(authHeader);

  if (!user) {
    const duration = Date.now() - startTime;
    logApiRequest('POST', '/api/proveedor/unavailable-days', 401, duration);
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    // Aceptar { date } o { dates: [...] } / { unavailable_days: [...] } (compatibilidad con tests)
    const normalizedBody =
      body.date != null
        ? body
        : Array.isArray(body.dates) && body.dates.length > 0
          ? { date: body.dates[0], is_confirmed: body.is_confirmed ?? false }
          : Array.isArray(body.unavailable_days) && body.unavailable_days.length > 0
            ? { date: body.unavailable_days[0], is_confirmed: body.is_confirmed ?? false }
            : body;
    const validationResult = createUnavailableDaySchema.safeParse(normalizedBody);

    if (!validationResult.success) {
      const duration = Date.now() - startTime;
      logApiRequest('POST', '/api/proveedor/unavailable-days', 400, duration);
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { date, is_confirmed } = validationResult.data;

    // Verificar que la fecha no sea en el pasado
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      const duration = Date.now() - startTime;
      logApiRequest('POST', '/api/proveedor/unavailable-days', 400, duration);
      return NextResponse.json(
        { error: 'No se pueden agregar días pasados como no laborables' },
        { status: 400 }
      );
    }

    // Verificar si ya existe un registro para esta fecha
    const existingResult = await pool.query(
      `SELECT id FROM unavailable_days 
       WHERE user_account_id = $1 AND unavailable_date = $2`,
      [user.id, date]
    );

    let result;
    if (existingResult.rows.length > 0) {
      // Actualizar registro existente
      result = await pool.query(
        `UPDATE unavailable_days 
         SET is_confirmed = $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_account_id = $2 AND unavailable_date = $3
         RETURNING id, unavailable_date, is_confirmed`,
        [is_confirmed, user.id, date]
      );
    } else {
      // Insertar nuevo registro
      result = await pool.query(
        `INSERT INTO unavailable_days (user_account_id, unavailable_date, is_confirmed)
         VALUES ($1, $2, $3)
         RETURNING id, unavailable_date, is_confirmed`,
        [user.id, date, is_confirmed]
      );
    }

    // Invalidar caché de horarios
    const username = await getUsernameByUserAccountId(user.id);
    if (username) {
      await invalidateScheduleCache(user.id, username);
    }

    const duration = Date.now() - startTime;
    logApiRequest('POST', '/api/proveedor/unavailable-days', 200, duration);

    return NextResponse.json({
      success: true,
      message: 'Día no laborable agregado exitosamente',
      unavailable_day: {
        id: result.rows[0].id,
        date: result.rows[0].unavailable_date.toISOString().split('T')[0],
        is_confirmed: result.rows[0].is_confirmed,
      },
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    apiLogger.error({ 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId: user.id, 
      // date,
      duration 
    }, 'Error in create unavailable day endpoint');
    logApiRequest('POST', '/api/proveedor/unavailable-days', 500, duration);

    // Proporcionar mensaje de error más específico
    let errorMessage = 'Error al agregar día no laborable';
    if (error instanceof Error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        errorMessage = 'Este día ya está marcado como no laborable';
      } else if (error.message.includes('check constraint')) {
        errorMessage = 'No se pueden agregar fechas pasadas';
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : String(error)
        })
      },
      { status: 500 }
    );
  }
}
