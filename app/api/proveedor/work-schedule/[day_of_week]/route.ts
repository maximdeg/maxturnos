import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { invalidateScheduleCache } from '@/lib/cache';
import { apiLogger, logApiRequest } from '@/lib/logger';
import { z } from 'zod';
import { getUsernameByUserAccountId } from '@/lib/user-routes';

const updateWorkingDaySchema = z.object({
  is_working_day: z.boolean(),
});

const validDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ day_of_week: string }> }
) {
  const startTime = Date.now();
  
  const authHeader = request.headers.get('authorization');
  const user = await requireAuth(authHeader);

  if (!user) {
    const duration = Date.now() - startTime;
    logApiRequest('PUT', '/api/proveedor/work-schedule/[day_of_week]', 401, duration);
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 }
    );
  }

  const resolvedParams = await params;
  const { day_of_week } = resolvedParams;

  if (!validDays.includes(day_of_week)) {
    const duration = Date.now() - startTime;
    logApiRequest('PUT', '/api/proveedor/work-schedule/[day_of_week]', 400, duration);
    return NextResponse.json(
      { error: 'Día de la semana inválido' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const validationResult = updateWorkingDaySchema.safeParse(body);

    if (!validationResult.success) {
      const duration = Date.now() - startTime;
      logApiRequest('PUT', '/api/proveedor/work-schedule/[day_of_week]', 400, duration);
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { is_working_day } = validationResult.data;

    // Verificar si ya existe un registro para este día
    const existingResult = await pool.query(
      `SELECT id FROM work_schedule 
       WHERE user_account_id = $1 AND day_of_week = $2`,
      [user.id, day_of_week]
    );

    let result;
    if (existingResult.rows.length > 0) {
      // Actualizar registro existente
      result = await pool.query(
        `UPDATE work_schedule 
         SET is_working_day = $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_account_id = $2 AND day_of_week = $3
         RETURNING id, day_of_week, is_working_day`,
        [is_working_day, user.id, day_of_week]
      );
    } else {
      // Insertar nuevo registro
      result = await pool.query(
        `INSERT INTO work_schedule (user_account_id, day_of_week, is_working_day)
         VALUES ($1, $2, $3)
         RETURNING id, day_of_week, is_working_day`,
        [user.id, day_of_week, is_working_day]
      );
    }

    // Invalidar caché de horarios
    const username = await getUsernameByUserAccountId(user.id);
    if (username) {
      await invalidateScheduleCache(user.id, username);
    }

    const duration = Date.now() - startTime;
    logApiRequest('PUT', '/api/proveedor/work-schedule/[day_of_week]', 200, duration);

    return NextResponse.json({
      success: true,
      message: 'Día laborable actualizado exitosamente',
      work_schedule: result.rows[0],
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    apiLogger.error({ error, userId: user.id, day_of_week, duration }, 'Error in update working day endpoint');
    logApiRequest('PUT', '/api/proveedor/work-schedule/[day_of_week]', 500, duration);

    return NextResponse.json(
      { error: 'Error al actualizar día laborable' },
      { status: 500 }
    );
  }
}
