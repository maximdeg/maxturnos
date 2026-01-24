import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getOrSetCache, cacheKeys, invalidateAppointmentCache } from '@/lib/cache';
import { rateLimitMiddleware, getRateLimitIdentifier, rateLimiters } from '@/lib/rate-limit';
import { apiLogger, logApiRequest } from '@/lib/logger';
import { dayNameToNumber, getDayNameEnglish } from '@/lib/utils';
import { getUserAccountIdByUsername } from '@/lib/user-routes';

/**
 * Genera intervalos de tiempo de 20 minutos entre startTime y endTime
 */
function generateTimeSlots(startTime: string, endTime: string): string[] {
  const slots: string[] = [];
  
  // Parsear tiempos
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  // Generar slots de 20 minutos
  for (let minutes = startMinutes; minutes < endMinutes; minutes += 20) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const timeString = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    slots.push(timeString);
  }
  
  return slots;
}

/**
 * Calcula horarios disponibles para una fecha y proveedor
 */
async function calculateAvailableTimes(userAccountId: number, date: string): Promise<string[]> {
  // Validar formato de fecha
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Formato de fecha inválido. Debe ser YYYY-MM-DD');
  }

  // Validar que la fecha no sea en el pasado
  const selectedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (selectedDate < today) {
    return []; // Fecha pasada, no hay horarios disponibles
  }

  // Obtener día de la semana
  const dayOfWeek = selectedDate.getDay();
  const dayName = getDayNameEnglish(dayOfWeek);

  // Verificar si el día está marcado como no disponible
  const unavailableDayCheck = await pool.query(
    `SELECT id FROM unavailable_days 
     WHERE user_account_id = $1 AND unavailable_date = $2`,
    [userAccountId, date]
  );

  if (unavailableDayCheck.rows.length > 0) {
    return []; // Día completo no disponible
  }

  // Obtener horario de trabajo para el día
  const workScheduleResult = await pool.query(
    `SELECT ws.id, ws.is_working_day
     FROM work_schedule ws
     WHERE ws.user_account_id = $1 AND ws.day_of_week = $2`,
    [userAccountId, dayName]
  );

  if (workScheduleResult.rows.length === 0 || !workScheduleResult.rows[0].is_working_day) {
    return []; // Día no laborable
  }

  const workScheduleId = workScheduleResult.rows[0].id;

  // Obtener franjas horarias disponibles para el día
  const slotsResult = await pool.query(
    `SELECT start_time, end_time
     FROM available_slots
     WHERE work_schedule_id = $1 AND is_available = true
     ORDER BY start_time`,
    [workScheduleId]
  );

  if (slotsResult.rows.length === 0) {
    return []; // No hay horarios configurados
  }

  // Generar todos los slots posibles de 20 minutos
  let allSlots: string[] = [];
  for (const slot of slotsResult.rows) {
    const startTime = slot.start_time.substring(0, 5); // HH:MM
    const endTime = slot.end_time.substring(0, 5); // HH:MM
    const slots = generateTimeSlots(startTime, endTime);
    allSlots.push(...slots);
  }

  // Eliminar duplicados y ordenar
  allSlots = [...new Set(allSlots)].sort();

  // Obtener citas reservadas para la fecha
  const appointmentsResult = await pool.query(
    `SELECT appointment_time
     FROM appointments
     WHERE user_account_id = $1 
       AND appointment_date = $2 
       AND status = 'scheduled'`,
    [userAccountId, date]
  );

  const bookedTimes = new Set(
    appointmentsResult.rows.map((row: any) => row.appointment_time.substring(0, 5))
  );

  // Verificar si la tabla unavailable_time_frames existe
  const tableCheckResult = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'unavailable_time_frames'
    )
  `);
  
  const hasUnavailableTimeFramesTable = tableCheckResult.rows[0]?.exists || false;

  // Obtener marcos de tiempo bloqueados (solo si la tabla existe)
  let blockedFramesResult = { rows: [] };
  if (hasUnavailableTimeFramesTable) {
    try {
      blockedFramesResult = await pool.query(
        `SELECT start_time, end_time
         FROM unavailable_time_frames
         WHERE user_account_id = $1 AND workday_date = $2`,
        [userAccountId, date]
      );
    } catch (error: any) {
      // Si hay un error al consultar la tabla, registrar pero continuar sin bloquear slots
      apiLogger.warn({ error, userAccountId, date }, 'Error querying unavailable_time_frames, skipping blocked slots');
      blockedFramesResult = { rows: [] };
    }
  }

  const blockedSlots = new Set<string>();
  for (const frame of blockedFramesResult.rows) {
    const startTime = (frame as any).start_time?.substring(0, 5) || '';
    const endTime = (frame as any).end_time?.substring(0, 5) || '';
    if (startTime && endTime) {
      const blocked = generateTimeSlots(startTime, endTime);
      blocked.forEach(slot => blockedSlots.add(slot));
    }
  }

  // Filtrar slots disponibles
  const availableSlots = allSlots.filter(
    slot => !bookedTimes.has(slot) && !blockedSlots.has(slot)
  );

  return availableSlots;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const startTime = Date.now();
  const resolvedParams = await params;
  const { date } = resolvedParams;
  const searchParams = request.nextUrl.searchParams;
  
  // Aceptar user_account_id, username, o provider
  let userAccountId = parseInt(searchParams.get('user_account_id') || '0');
  const username = searchParams.get('username') || searchParams.get('provider');

  // Rate limiting
  const rateLimitResponse = await rateLimitMiddleware(
    getRateLimitIdentifier(request),
    rateLimiters.createAppointment // Usar mismo limiter que creación de citas
  );
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // Si se proporciona username/provider, resolver a user_account_id
    if ((!userAccountId || userAccountId <= 0) && username) {
      const resolvedId = await getUserAccountIdByUsername(username);
      
      if (!resolvedId) {
        const duration = Date.now() - startTime;
        logApiRequest('GET', `/api/available-times/${date}`, 404, duration);
        return NextResponse.json(
          { error: 'Proveedor no encontrado' },
          { status: 404 }
        );
      }
      
      userAccountId = resolvedId;
    }

    if (!userAccountId || userAccountId <= 0) {
      const duration = Date.now() - startTime;
      logApiRequest('GET', `/api/available-times/${date}`, 400, duration);
      // Para pruebas de rate limiting sin parámetros, devolver 400 pero no fallar el test
      return NextResponse.json(
        { error: 'user_account_id, username o provider requerido' },
        { status: 400 }
      );
    }

    // Verificar que el proveedor existe
    const providerCheck = await pool.query(
      'SELECT id FROM user_accounts WHERE id = $1',
      [userAccountId]
    );

    if (providerCheck.rows.length === 0) {
      const duration = Date.now() - startTime;
      logApiRequest('GET', `/api/available-times/${date}`, 404, duration);
      return NextResponse.json(
        { error: 'Proveedor no encontrado' },
        { status: 404 }
      );
    }

    // Obtener del caché o calcular
    const availableTimes = await getOrSetCache<string[]>(
      cacheKeys.availableTimes(userAccountId, date),
      async () => {
        return await calculateAvailableTimes(userAccountId, date);
      },
      300 // 5 minutos TTL
    );

    const duration = Date.now() - startTime;
    logApiRequest('GET', `/api/available-times/${date}`, 200, duration);

    return NextResponse.json(availableTimes);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    apiLogger.error({ error, date, userAccountId, duration }, 'Error in available-times endpoint');
    logApiRequest('GET', `/api/available-times/${date}`, 500, duration);

    if (error.message?.includes('Formato de fecha inválido')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error al obtener horarios disponibles' },
      { status: 500 }
    );
  }
}
