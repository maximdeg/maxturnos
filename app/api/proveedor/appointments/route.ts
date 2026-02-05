import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { apiLogger, logApiRequest } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  // Verificar autenticación
  const authHeader = request.headers.get('authorization');
  const user = await requireAuth(authHeader);

  if (!user) {
    const duration = Date.now() - startTime;
    logApiRequest('GET', '/api/proveedor/appointments', 401, duration);
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const dateParam = searchParams.get('date'); // Filtro por un solo día (alias de start_date/end_date)
  let startDate = searchParams.get('start_date');
  let endDate = searchParams.get('end_date');
  if (dateParam && !startDate && !endDate) {
    startDate = dateParam;
    endDate = dateParam;
  }
  const formatArray = searchParams.get('format') === 'array';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  try {
    // Verificar qué columnas existen en appointments
    const columnsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'appointments' AND table_schema = 'public'
    `);
    
    const existingColumns = columnsResult.rows.map((row: any) => row.column_name);
    const hasWhatsAppSent = existingColumns.includes('whatsapp_sent');
    const hasWhatsAppSentAt = existingColumns.includes('whatsapp_sent_at');
    
    // Construir SELECT dinámicamente
    const selectFields = [
      'a.id',
      'a.appointment_date',
      'a.appointment_time',
      'a.health_insurance',
      'a.status',
      ...(hasWhatsAppSent ? ['a.whatsapp_sent'] : []),
      ...(hasWhatsAppSentAt ? ['a.whatsapp_sent_at'] : []),
      'a.created_at',
      'c.first_name',
      'c.last_name',
      'c.phone_number',
      'vt.name as visit_type_name',
      'ct.name as consult_type_name',
      'pt.name as practice_type_name'
    ];
    
    let query = `
      SELECT ${selectFields.join(', ')}
      FROM appointments a
      JOIN clients c ON a.client_id = c.id
      JOIN visit_types vt ON a.visit_type_id = vt.id
      LEFT JOIN consult_types ct ON a.consult_type_id = ct.id
      LEFT JOIN practice_types pt ON a.practice_type_id = pt.id
      WHERE a.user_account_id = $1
    `;

    const queryParams: any[] = [user.id];
    let paramIndex = 2;

    if (status) {
      query += ` AND a.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND a.appointment_date >= $${paramIndex}`;
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND a.appointment_date <= $${paramIndex}`;
      queryParams.push(endDate);
      paramIndex++;
    }

    // Contar total
    const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Obtener resultados paginados
    query += ` ORDER BY a.appointment_date DESC, a.appointment_time DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);

    const appointments = result.rows.map((row: any) => ({
      id: row.id,
      patient_name: `${row.first_name} ${row.last_name}`,
      patient_phone: row.phone_number,
      appointment_date: row.appointment_date.toISOString().split('T')[0],
      appointment_time: row.appointment_time.substring(0, 5),
      visit_type: row.visit_type_name,
      consult_type: row.consult_type_name,
      practice_type: row.practice_type_name,
      health_insurance: row.health_insurance,
      status: row.status,
      whatsapp_sent: hasWhatsAppSent ? row.whatsapp_sent : false,
      whatsapp_sent_at: hasWhatsAppSentAt ? (row.whatsapp_sent_at?.toISOString() || null) : null,
      created_at: row.created_at.toISOString(),
    }));

    const duration = Date.now() - startTime;
    logApiRequest('GET', '/api/proveedor/appointments', 200, duration);

    // Compatibilidad: si solo se pide date (o date + format=array), devolver lista directa
    if (formatArray || (dateParam && !searchParams.get('page') && !searchParams.get('limit'))) {
      return NextResponse.json(appointments);
    }
    return NextResponse.json({
      appointments,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    apiLogger.error({ error, userId: user.id, duration }, 'Error in provider appointments endpoint');
    logApiRequest('GET', '/api/proveedor/appointments', 500, duration);

    return NextResponse.json(
      { error: 'Error al obtener citas' },
      { status: 500 }
    );
  }
}
