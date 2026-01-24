import { NextRequest, NextResponse } from 'next/server';
import { getUserAccountIdByUsername } from '@/lib/user-routes';
import { pool } from '@/lib/db';
import { getOrSetCache, cacheKeys } from '@/lib/cache';
import { rateLimitMiddleware, getRateLimitIdentifier } from '@/lib/rate-limit';
import { apiLogger, logApiRequest } from '@/lib/logger';
import { dayNameToNumber } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const startTime = Date.now();
  const resolvedParams = await params;
  const { username } = resolvedParams;

  // Rate limiting
  const rateLimitResponse = await rateLimitMiddleware(
    getRateLimitIdentifier(request)
  );
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // Obtener user_account_id del username
    const userAccountId = await getUserAccountIdByUsername(username);

    if (!userAccountId) {
      const duration = Date.now() - startTime;
      logApiRequest('GET', `/api/provider/${username}/work-schedule`, 404, duration);
      return NextResponse.json(
        { error: 'Proveedor no encontrado' },
        { status: 404 }
      );
    }

    // Obtener del caché o calcular
    const scheduleData = await getOrSetCache<{
      user_account_id: number;
      workingDays: number[];
      unavailableDates: string[];
    }>(
      cacheKeys.workSchedule(username),
      async () => {
        // Obtener días laborables
        const workScheduleResult = await pool.query(
          `SELECT day_of_week, is_working_day
           FROM work_schedule
           WHERE user_account_id = $1`,
          [userAccountId]
        );

        // Convertir nombres de días a números y filtrar días laborables
        const workingDays: number[] = [];
        for (const row of workScheduleResult.rows) {
          if (row.is_working_day) {
            const dayNumber = dayNameToNumber(row.day_of_week);
            if (dayNumber >= 0) {
              workingDays.push(dayNumber);
            }
          }
        }

        // Obtener fechas no disponibles
        const unavailableDaysResult = await pool.query(
          `SELECT unavailable_date
           FROM unavailable_days
           WHERE user_account_id = $1 AND unavailable_date >= CURRENT_DATE
           ORDER BY unavailable_date`,
          [userAccountId]
        );

        const unavailableDates = unavailableDaysResult.rows.map(
          (row: any) => row.unavailable_date.toISOString().split('T')[0]
        );

        // Agregar días festivos hardcodeados
        const currentYear = new Date().getFullYear();
        const holidays = [
          `${currentYear}-01-01`, // Año Nuevo
          `${currentYear}-12-25`, // Navidad
        ];

        // Solo agregar si no están ya en la lista
        holidays.forEach(holiday => {
          if (!unavailableDates.includes(holiday)) {
            unavailableDates.push(holiday);
          }
        });

        return {
          user_account_id: userAccountId,
          workingDays: workingDays.sort((a, b) => a - b),
          unavailableDates,
        };
      },
      300 // 5 minutos TTL
    );

    const duration = Date.now() - startTime;
    logApiRequest('GET', `/api/provider/${username}/work-schedule`, 200, duration);

    return NextResponse.json(scheduleData);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    apiLogger.error({ error, username, duration }, 'Error in work-schedule endpoint');
    logApiRequest('GET', `/api/provider/${username}/work-schedule`, 500, duration);

    return NextResponse.json(
      { error: 'Error al obtener horario de trabajo' },
      { status: 500 }
    );
  }
}
