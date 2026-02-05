import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { apiLogger, logApiRequest } from '@/lib/logger';

/** POST no soportado: usar PUT por día. Devuelve 405 con Allow. */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const authHeader = request.headers.get('authorization');
  const user = await requireAuth(authHeader);
  if (!user) {
    const duration = Date.now() - startTime;
    logApiRequest('POST', '/api/proveedor/work-schedule', 401, duration);
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const duration = Date.now() - startTime;
  logApiRequest('POST', '/api/proveedor/work-schedule', 405, duration);
  return NextResponse.json(
    { error: 'Método no permitido. Use GET para consultar o PUT /api/proveedor/work-schedule/[day_of_week] para actualizar por día.' },
    { status: 405, headers: { Allow: 'GET' } }
  );
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  const authHeader = request.headers.get('authorization');
  const user = await requireAuth(authHeader);

  if (!user) {
    const duration = Date.now() - startTime;
    logApiRequest('GET', '/api/proveedor/work-schedule', 401, duration);
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 }
    );
  }

  try {
    const result = await pool.query(
      `SELECT 
        ws.id,
        ws.day_of_week,
        ws.is_working_day,
        json_agg(
          json_build_object(
            'id', asl.id,
            'start_time', asl.start_time,
            'end_time', asl.end_time,
            'is_available', asl.is_available
          )
        ) FILTER (WHERE asl.id IS NOT NULL) as available_slots
      FROM work_schedule ws
      LEFT JOIN available_slots asl ON ws.id = asl.work_schedule_id
      WHERE ws.user_account_id = $1
      GROUP BY ws.id, ws.day_of_week, ws.is_working_day
      ORDER BY 
        CASE ws.day_of_week
          WHEN 'Sunday' THEN 0
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          WHEN 'Saturday' THEN 6
        END`,
      [user.id]
    );

    const workSchedule = result.rows.map((row: any) => ({
      id: row.id,
      day_of_week: row.day_of_week,
      is_working_day: row.is_working_day,
      available_slots: row.available_slots || [],
    }));

    const duration = Date.now() - startTime;
    logApiRequest('GET', '/api/proveedor/work-schedule', 200, duration);

    return NextResponse.json({ work_schedule: workSchedule });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    apiLogger.error({ error, userId: user.id, duration }, 'Error in get work schedule endpoint');
    logApiRequest('GET', '/api/proveedor/work-schedule', 500, duration);

    return NextResponse.json(
      { error: 'Error al obtener horario de trabajo' },
      { status: 500 }
    );
  }
}
