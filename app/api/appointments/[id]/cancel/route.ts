import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { withTransaction } from '@/lib/db-transactions';
import { verifyCancellationToken, canCancelAppointment, getAppointmentInfoFromToken } from '@/lib/cancellation-token';
import { sendProviderCancellationNotification } from '@/lib/whatsapp';
import { getUsernameByUserAccountId } from '@/lib/user-routes';
import { invalidateAppointmentCache } from '@/lib/cache';
import { requireAuth } from '@/lib/auth';
import { apiLogger, logApiRequest } from '@/lib/logger';
import { z } from 'zod';

// Obtener URL base de la aplicación - usar directamente NEXT_PUBLIC_APP_URL
const getAppUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) {
    apiLogger.warn('NEXT_PUBLIC_APP_URL not set, using localhost fallback');
    return 'http://localhost:3000';
  }
  // Remover barra final si existe para evitar dobles barras
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

const cancelSchema = z.object({
  token: z.string().optional(),
  cancelled_by: z.enum(['patient', 'provider']).optional().default('patient'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const resolvedParams = await params;
  const appointmentId = parseInt(resolvedParams.id);

  if (isNaN(appointmentId)) {
    const duration = Date.now() - startTime;
    logApiRequest('POST', `/api/appointments/${resolvedParams.id}/cancel`, 400, duration);
    return NextResponse.json(
      { error: 'ID de cita inválido' },
      { status: 400 }
    );
  }

  try {
    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      // Body vacío o no JSON: usar defaults (cancelled_by = 'patient' requiere token después)
    }
    const validationResult = cancelSchema.safeParse(body);
    
    if (!validationResult.success) {
      const duration = Date.now() - startTime;
      logApiRequest('POST', `/api/appointments/${appointmentId}/cancel`, 400, duration);
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { token, cancelled_by } = validationResult.data;

    // Obtener información de la cita
    const appointmentResult = await pool.query(
      `SELECT 
        a.id,
        a.appointment_date,
        a.appointment_time,
        a.status,
        a.cancellation_token,
        a.user_account_id,
        c.first_name,
        c.last_name,
        c.phone_number
      FROM appointments a
      JOIN clients c ON a.client_id = c.id
      WHERE a.id = $1`,
      [appointmentId]
    );

    if (appointmentResult.rows.length === 0) {
      const duration = Date.now() - startTime;
      logApiRequest('POST', `/api/appointments/${appointmentId}/cancel`, 404, duration);
      return NextResponse.json(
        { error: 'Cita no encontrada' },
        { status: 404 }
      );
    }

    const appointment = appointmentResult.rows[0];

    // Verificar que la cita esté programada
    if (appointment.status !== 'scheduled') {
      const duration = Date.now() - startTime;
      logApiRequest('POST', `/api/appointments/${appointmentId}/cancel`, 409, duration);
      return NextResponse.json(
        { error: 'La cita ya está cancelada o completada' },
        { status: 409 }
      );
    }

    // Validar según quién cancela
    if (cancelled_by === 'patient') {
      // Validar token para cancelación por paciente
      if (!token) {
        const duration = Date.now() - startTime;
        logApiRequest('POST', `/api/appointments/${appointmentId}/cancel`, 400, duration);
        return NextResponse.json(
          { error: 'Token de cancelación requerido' },
          { status: 400 }
        );
      }

      const tokenPayload = verifyCancellationToken(token);
      if (!tokenPayload || tokenPayload.appointmentId !== appointmentId) {
        const duration = Date.now() - startTime;
        logApiRequest('POST', `/api/appointments/${appointmentId}/cancel`, 403, duration);
        return NextResponse.json(
          { error: 'Token inválido o expirado' },
          { status: 403 }
        );
      }

      // Verificar que puede cancelarse (24 horas antes)
      if (!canCancelAppointment(token)) {
        const duration = Date.now() - startTime;
        logApiRequest('POST', `/api/appointments/${appointmentId}/cancel`, 400, duration);
        return NextResponse.json(
          { error: 'No se puede cancelar la cita. Debe cancelarse al menos 24 horas antes.' },
          { status: 400 }
        );
      }
    } else if (cancelled_by === 'provider') {
      // Validar autenticación para cancelación por proveedor
      const authHeader = request.headers.get('authorization');
      const user = await requireAuth(authHeader);

      if (!user) {
        const duration = Date.now() - startTime;
        logApiRequest('POST', `/api/appointments/${appointmentId}/cancel`, 401, duration);
        return NextResponse.json(
          { error: 'No autorizado' },
          { status: 401 }
        );
      }

      // Verificar que el proveedor es el dueño de la cita
      if (user.id !== appointment.user_account_id) {
        const duration = Date.now() - startTime;
        logApiRequest('POST', `/api/appointments/${appointmentId}/cancel`, 403, duration);
        return NextResponse.json(
          { error: 'No tienes permiso para cancelar esta cita' },
          { status: 403 }
        );
      }
    }

    // Actualizar estado de la cita usando transacción
    await withTransaction(async (client) => {
      await client.query(
        `UPDATE appointments 
         SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [appointmentId]
      );
    });

    // Si es cancelación por proveedor, enviar WhatsApp al paciente
    if (cancelled_by === 'provider') {
      try {
        const providerUsername = await getUsernameByUserAccountId(appointment.user_account_id);
        const baseUrl = getAppUrl();
        const rescheduleUrl = `${baseUrl}/${providerUsername}/agendar-visita`;

        const whatsappResult = await sendProviderCancellationNotification(
          appointment.phone_number,
          {
            patientName: `${appointment.first_name} ${appointment.last_name}`,
            date: appointment.appointment_date.toISOString().split('T')[0],
            time: appointment.appointment_time.substring(0, 5),
            rescheduleUrl,
          }
        );

        // Actualizar estado de WhatsApp si se envió exitosamente
        if (whatsappResult.success && whatsappResult.messageId) {
          await pool.query(
            `UPDATE appointments 
             SET whatsapp_sent = true, 
                 whatsapp_sent_at = CURRENT_TIMESTAMP,
                 whatsapp_message_id = $1
             WHERE id = $2`,
            [whatsappResult.messageId, appointmentId]
          );
        }
      } catch (whatsappError) {
        apiLogger.error({ error: whatsappError, appointmentId }, 'Error sending cancellation WhatsApp');
        // No fallar la cancelación si WhatsApp falla
      }
    }

    // Invalidar caché de disponibilidad
    await invalidateAppointmentCache(appointment.user_account_id, appointment.appointment_date.toISOString().split('T')[0]);

    const duration = Date.now() - startTime;
    logApiRequest('POST', `/api/appointments/${appointmentId}/cancel`, 200, duration);

    return NextResponse.json({
      success: true,
      message: 'Cita cancelada exitosamente',
      appointment_id: appointmentId,
      status: 'cancelled',
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    apiLogger.error({ error, appointmentId, duration }, 'Error in cancel appointment endpoint');
    logApiRequest('POST', `/api/appointments/${appointmentId}/cancel`, 500, duration);

    return NextResponse.json(
      { error: 'Error al cancelar cita' },
      { status: 500 }
    );
  }
}
