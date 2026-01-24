import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { apiLogger, logApiRequest } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const startTime = Date.now();
  const resolvedParams = await params;
  const { date } = resolvedParams;
  const userAccountId = parseInt(request.nextUrl.searchParams.get('user_account_id') || '0');

  // Validar formato de fecha
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const duration = Date.now() - startTime;
    logApiRequest('GET', `/api/appointments/date/${date}`, 400, duration);
    return NextResponse.json(
      { error: 'Formato de fecha inválido. Debe ser YYYY-MM-DD' },
      { status: 400 }
    );
  }

  if (!userAccountId || userAccountId <= 0) {
    const duration = Date.now() - startTime;
    logApiRequest('GET', `/api/appointments/date/${date}`, 400, duration);
    return NextResponse.json(
      { error: 'user_account_id requerido' },
      { status: 400 }
    );
  }

  try {
    const appointmentsResult = await pool.query(
      `SELECT 
        a.id,
        a.appointment_date,
        a.appointment_time,
        a.status,
        c.first_name,
        c.last_name,
        c.phone_number,
        vt.name as visit_type_name,
        ct.name as consult_type_name,
        pt.name as practice_type_name
      FROM appointments a
      JOIN clients c ON a.client_id = c.id
      JOIN visit_types vt ON a.visit_type_id = vt.id
      LEFT JOIN consult_types ct ON a.consult_type_id = ct.id
      LEFT JOIN practice_types pt ON a.practice_type_id = pt.id
      WHERE a.user_account_id = $1 AND a.appointment_date = $2
      ORDER BY a.appointment_time`,
      [userAccountId, date]
    );

    const appointments = appointmentsResult.rows.map((row: any) => ({
      id: row.id,
      appointment_date: row.appointment_date.toISOString().split('T')[0],
      appointment_time: row.appointment_time.substring(0, 5),
      status: row.status,
      patient_name: `${row.first_name} ${row.last_name}`,
      phone_number: row.phone_number,
      visit_type_name: row.visit_type_name,
      consult_type_name: row.consult_type_name,
      practice_type_name: row.practice_type_name,
    }));

    const duration = Date.now() - startTime;
    logApiRequest('GET', `/api/appointments/date/${date}`, 200, duration);

    return NextResponse.json(appointments);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    apiLogger.error({ error, date, userAccountId, duration }, 'Error in get appointments by date endpoint');
    logApiRequest('GET', `/api/appointments/date/${date}`, 500, duration);

    return NextResponse.json(
      { error: 'Error al obtener citas' },
      { status: 500 }
    );
  }
}
