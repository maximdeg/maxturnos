import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyCancellationToken, canCancelAppointment } from '@/lib/cancellation-token';
import { getUsernameByUserAccountId } from '@/lib/user-routes';
import { apiLogger, logApiRequest } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const resolvedParams = await params;
  const appointmentId = parseInt(resolvedParams.id);
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (isNaN(appointmentId)) {
    const duration = Date.now() - startTime;
    logApiRequest('GET', `/api/appointments/${resolvedParams.id}`, 400, duration);
    return NextResponse.json(
      { error: 'ID de cita inválido' },
      { status: 400 }
    );
  }

  try {
    // Obtener información de la cita
    const appointmentResult = await pool.query(
      `SELECT 
        a.id,
        a.appointment_date,
        a.appointment_time,
        a.health_insurance,
        a.status,
        a.cancellation_token,
        c.first_name,
        c.last_name,
        c.phone_number,
        a.user_account_id,
        vt.name as visit_type_name,
        ct.name as consult_type_name,
        pt.name as practice_type_name
      FROM appointments a
      JOIN clients c ON a.client_id = c.id
      JOIN visit_types vt ON a.visit_type_id = vt.id
      LEFT JOIN consult_types ct ON a.consult_type_id = ct.id
      LEFT JOIN practice_types pt ON a.practice_type_id = pt.id
      WHERE a.id = $1`,
      [appointmentId]
    );

    if (appointmentResult.rows.length === 0) {
      const duration = Date.now() - startTime;
      logApiRequest('GET', `/api/appointments/${appointmentId}`, 404, duration);
      return NextResponse.json(
        { error: 'Cita no encontrada' },
        { status: 404 }
      );
    }

    const appointment = appointmentResult.rows[0];

    // Si se proporciona token, validarlo
    if (token) {
      const tokenPayload = verifyCancellationToken(token);
      if (!tokenPayload || tokenPayload.appointmentId !== appointmentId) {
        const duration = Date.now() - startTime;
        logApiRequest('GET', `/api/appointments/${appointmentId}`, 403, duration);
        return NextResponse.json(
          { error: 'Token inválido o expirado' },
          { status: 403 }
        );
      }
    }

    // Obtener username del proveedor
    const providerUsername = await getUsernameByUserAccountId(appointment.user_account_id);

    // Verificar si puede cancelarse
    const canCancel = token ? canCancelAppointment(token) : false;

    const duration = Date.now() - startTime;
    logApiRequest('GET', `/api/appointments/${appointmentId}`, 200, duration);

    return NextResponse.json({
      id: appointment.id,
      patient_name: `${appointment.first_name} ${appointment.last_name}`,
      phone_number: appointment.phone_number,
      appointment_date: appointment.appointment_date.toISOString().split('T')[0],
      appointment_time: appointment.appointment_time.substring(0, 5),
      visit_type_name: appointment.visit_type_name,
      consult_type_name: appointment.consult_type_name,
      practice_type_name: appointment.practice_type_name,
      health_insurance: appointment.health_insurance,
      status: appointment.status,
      provider_username: providerUsername,
      can_cancel: canCancel,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    apiLogger.error({ error, appointmentId, duration }, 'Error in get appointment endpoint');
    logApiRequest('GET', `/api/appointments/${appointmentId}`, 500, duration);

    return NextResponse.json(
      { error: 'Error al obtener detalles de la cita' },
      { status: 500 }
    );
  }
}
