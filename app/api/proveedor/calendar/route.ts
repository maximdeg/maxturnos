import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { apiLogger, logApiRequest } from '@/lib/logger';
import { getDayNameEnglish } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  const authHeader = request.headers.get('authorization');
  const user = await requireAuth(authHeader);

  if (!user) {
    const duration = Date.now() - startTime;
    logApiRequest('GET', '/api/proveedor/calendar', 401, duration);
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

  if (month < 1 || month > 12) {
    const duration = Date.now() - startTime;
    logApiRequest('GET', '/api/proveedor/calendar', 400, duration);
    return NextResponse.json(
      { error: 'Mes inválido' },
      { status: 400 }
    );
  }

  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const startDateString = startDate.toISOString().split('T')[0];
    const endDateString = endDate.toISOString().split('T')[0];

    // Verificar qué columnas existen en appointments
    const columnsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'appointments' AND table_schema = 'public'
    `);
    
    const existingColumns = columnsResult.rows.map((row: any) => row.column_name);
    const hasWhatsAppSent = existingColumns.includes('whatsapp_sent');
    
    // Construir SELECT dinámicamente
    const selectFields = [
      'a.id',
      'a.appointment_date',
      'a.appointment_time',
      'a.status',
      ...(hasWhatsAppSent ? ['a.whatsapp_sent'] : []),
      'c.first_name',
      'c.last_name',
      'vt.name as visit_type_name',
      'ct.name as consult_type_name',
      'pt.name as practice_type_name'
    ];
    
    // Obtener todas las citas del mes
    const appointmentsResult = await pool.query(
      `SELECT ${selectFields.join(', ')}
      FROM appointments a
      JOIN clients c ON a.client_id = c.id
      JOIN visit_types vt ON a.visit_type_id = vt.id
      LEFT JOIN consult_types ct ON a.consult_type_id = ct.id
      LEFT JOIN practice_types pt ON a.practice_type_id = pt.id
      WHERE a.user_account_id = $1 
        AND a.appointment_date >= $2 
        AND a.appointment_date <= $3
      ORDER BY a.appointment_date, a.appointment_time`,
      [user.id, startDateString, endDateString]
    );

    // Obtener días no laborables del mes
    const unavailableDaysResult = await pool.query(
      `SELECT unavailable_date
       FROM unavailable_days
       WHERE user_account_id = $1 
         AND unavailable_date >= $2 
         AND unavailable_date <= $3`,
      [user.id, startDateString, endDateString]
    );

    const unavailableDates = new Set(
      unavailableDaysResult.rows.map((row: any) => row.unavailable_date.toISOString().split('T')[0])
    );

    // Obtener horarios de trabajo
    const workScheduleResult = await pool.query(
      `SELECT day_of_week, is_working_day
       FROM work_schedule
       WHERE user_account_id = $1`,
      [user.id]
    );

    // Mapeo de días de la semana (asegurar consistencia)
    const dayMap: { [key: string]: number } = {
      'Sunday': 0,
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6,
    };

    const workingDaysArray = workScheduleResult.rows
      .filter((row: any) => row.is_working_day)
      .map((row: any) => {
        const dayNumber = dayMap[row.day_of_week];
        if (dayNumber === undefined) {
          apiLogger.warn({ day_of_week: row.day_of_week }, 'Invalid day_of_week in work_schedule');
          return null;
        }
        return dayNumber;
      })
      .filter((day: number | null) => day !== null) as number[];

    const workingDays = new Set(workingDaysArray);

    // Log para debugging (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      apiLogger.debug({ 
        userId: user.id, 
        workingDays: Array.from(workingDays),
        workScheduleRows: workScheduleResult.rows.map((r: any) => ({ 
          day: r.day_of_week, 
          is_working: r.is_working_day 
        }))
      }, 'Working days configuration');
    }

    // Agrupar citas por fecha
    const appointmentsByDate: { [key: string]: any[] } = {};
    appointmentsResult.rows.forEach((row: any) => {
      const date = row.appointment_date.toISOString().split('T')[0];
      if (!appointmentsByDate[date]) {
        appointmentsByDate[date] = [];
      }
      appointmentsByDate[date].push({
        id: row.id,
        time: row.appointment_time.substring(0, 5),
        patient_name: `${row.first_name} ${row.last_name}`,
        visit_type: row.visit_type_name,
        consult_type: row.consult_type_name,
        practice_type: row.practice_type_name,
        whatsapp_sent: hasWhatsAppSent ? row.whatsapp_sent : false,
        status: row.status,
      });
    });

    // Generar días del mes
    const days: any[] = [];
    const daysInMonth = endDate.getDate();

    // Función helper para calcular el día de la semana sin problemas de zona horaria
    // Usa el algoritmo de Zeller o cálculo directo
    function getDayOfWeek(y: number, m: number, d: number): number {
      // m es 1-12, necesitamos 0-11 para Date
      const date = new Date(y, m - 1, d, 12, 0, 0); // Usar mediodía para evitar problemas de zona horaria
      return date.getDay();
    }

    // Función helper para formatear fecha como YYYY-MM-DD sin problemas de zona horaria
    function formatDateAsISO(y: number, m: number, d: number): string {
      const monthStr = m.toString().padStart(2, '0');
      const dayStr = d.toString().padStart(2, '0');
      return `${y}-${monthStr}-${dayStr}`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = formatDateAsISO(year, month, day);
      const dayOfWeek = getDayOfWeek(year, month, day);
      const isWorkingDay = workingDays.has(dayOfWeek);
      const isUnavailable = unavailableDates.has(dateString);
      const dayAppointments = appointmentsByDate[dateString] || [];

      const scheduled = dayAppointments.filter((a: any) => a.status === 'scheduled').length;
      const cancelled = dayAppointments.filter((a: any) => a.status === 'cancelled').length;
      const completed = dayAppointments.filter((a: any) => a.status === 'completed').length;

      // Calcular slots disponibles (simplificado - asumiendo 20 minutos por slot)
      // En producción, esto debería calcularse basándose en el horario de trabajo real
      const totalSlots = isWorkingDay && !isUnavailable ? 27 : 0; // 9 horas * 3 slots por hora
      const availableSlots = Math.max(0, totalSlots - scheduled);

      days.push({
        date: dateString,
        total_appointments: dayAppointments.length,
        scheduled,
        cancelled,
        completed,
        is_full: availableSlots === 0 && scheduled > 0,
        is_working_day: isWorkingDay && !isUnavailable,
        appointments: dayAppointments,
        available_slots: availableSlots,
        total_slots: totalSlots,
      });
    }

    const summary = {
      total_days: daysInMonth,
      working_days: days.filter((d: any) => d.is_working_day).length,
      full_days: days.filter((d: any) => d.is_full).length,
      total_appointments: appointmentsResult.rows.length,
    };

    const duration = Date.now() - startTime;
    logApiRequest('GET', '/api/proveedor/calendar', 200, duration);

    return NextResponse.json({
      year,
      month,
      days,
      summary,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    apiLogger.error({ error, userId: user.id, year, month, duration }, 'Error in calendar endpoint');
    logApiRequest('GET', '/api/proveedor/calendar', 500, duration);

    return NextResponse.json(
      { error: 'Error al obtener calendario' },
      { status: 500 }
    );
  }
}
