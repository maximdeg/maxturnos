import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { invalidateScheduleCache } from '@/lib/cache';
import { apiLogger, logApiRequest } from '@/lib/logger';
import { z } from 'zod';
import { getUsernameByUserAccountId } from '@/lib/user-routes';

const createSlotSchema = z.object({
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido (HH:MM)'),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido (HH:MM)'),
  is_available: z.boolean().optional().default(true),
});

const validDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parseTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function isValidTimeRange(startTime: string, endTime: string): boolean {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  return end > start;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ day_of_week: string }> }
) {
  const startTime = Date.now();
  
  const authHeader = request.headers.get('authorization');
  const user = await requireAuth(authHeader);

  if (!user) {
    const duration = Date.now() - startTime;
    logApiRequest('POST', '/api/proveedor/work-schedule/[day_of_week]/slots', 401, duration);
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 }
    );
  }

  const resolvedParams = await params;
  const { day_of_week } = resolvedParams;

  if (!validDays.includes(day_of_week)) {
    const duration = Date.now() - startTime;
    logApiRequest('POST', '/api/proveedor/work-schedule/[day_of_week]/slots', 400, duration);
    return NextResponse.json(
      { error: 'Día de la semana inválido' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const validationResult = createSlotSchema.safeParse(body);

    if (!validationResult.success) {
      const duration = Date.now() - startTime;
      logApiRequest('POST', '/api/proveedor/work-schedule/[day_of_week]/slots', 400, duration);
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { start_time, end_time, is_available } = validationResult.data;

    // Validar que end_time sea mayor que start_time
    if (!isValidTimeRange(start_time, end_time)) {
      const duration = Date.now() - startTime;
      logApiRequest('POST', '/api/proveedor/work-schedule/[day_of_week]/slots', 400, duration);
      return NextResponse.json(
        { error: 'La hora de fin debe ser mayor que la hora de inicio' },
        { status: 400 }
      );
    }

    // Asegurar que existe el work_schedule para este día
    // Primero verificar si ya existe
    const existingScheduleResult = await pool.query(
      `SELECT id FROM work_schedule 
       WHERE user_account_id = $1 AND day_of_week = $2`,
      [user.id, day_of_week]
    );

    let workScheduleId;
    if (existingScheduleResult.rows.length > 0) {
      // Actualizar el registro existente para asegurar que is_working_day = true
      const updateResult = await pool.query(
        `UPDATE work_schedule 
         SET is_working_day = true, updated_at = CURRENT_TIMESTAMP
         WHERE user_account_id = $1 AND day_of_week = $2
         RETURNING id`,
        [user.id, day_of_week]
      );
      workScheduleId = updateResult.rows[0].id;
    } else {
      // Insertar nuevo registro
      const insertResult = await pool.query(
        `INSERT INTO work_schedule (user_account_id, day_of_week, is_working_day)
         VALUES ($1, $2, true)
         RETURNING id`,
        [user.id, day_of_week]
      );
      workScheduleId = insertResult.rows[0].id;
    }

    // Verificar si hay solapamiento con otros slots
    const overlappingSlots = await pool.query(
      `SELECT id FROM available_slots
       WHERE work_schedule_id = $1
         AND user_account_id = $2
         AND (
           (start_time <= $3 AND end_time > $3) OR
           (start_time < $4 AND end_time >= $4) OR
           (start_time >= $3 AND end_time <= $4)
         )`,
      [workScheduleId, user.id, start_time, end_time]
    );

    if (overlappingSlots.rows.length > 0) {
      const duration = Date.now() - startTime;
      logApiRequest('POST', '/api/proveedor/work-schedule/[day_of_week]/slots', 400, duration);
      return NextResponse.json(
        { error: 'Ya existe una franja horaria que se solapa con este horario' },
        { status: 400 }
      );
    }

    // Crear el slot
    const result = await pool.query(
      `INSERT INTO available_slots (work_schedule_id, user_account_id, start_time, end_time, is_available)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, start_time, end_time, is_available`,
      [workScheduleId, user.id, start_time, end_time, is_available ?? true]
    );

    // Invalidar caché de horarios
    const username = await getUsernameByUserAccountId(user.id);
    if (username) {
      await invalidateScheduleCache(user.id, username);
    }

    const duration = Date.now() - startTime;
    logApiRequest('POST', '/api/proveedor/work-schedule/[day_of_week]/slots', 200, duration);

    return NextResponse.json({
      success: true,
      message: 'Franja horaria creada exitosamente',
      slot: {
        id: result.rows[0].id,
        day_of_week,
        start_time: result.rows[0].start_time,
        end_time: result.rows[0].end_time,
        is_available: result.rows[0].is_available,
      },
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    apiLogger.error({ error, userId: user.id, day_of_week, duration }, 'Error in create slot endpoint');
    logApiRequest('POST', '/api/proveedor/work-schedule/[day_of_week]/slots', 500, duration);

    return NextResponse.json(
      { error: 'Error al crear franja horaria' },
      { status: 500 }
    );
  }
}
