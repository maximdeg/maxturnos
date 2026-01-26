import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { apiLogger, whatsappLogger } from '@/lib/logger';

/**
 * Webhook endpoint para recibir notificaciones de estado de mensajes de UltraMsg
 * 
 * UltraMsg envía webhooks cuando:
 * - Se crea un mensaje (webhook_message_create)
 * - Se recibe un mensaje (webhook_message_received)
 * - Cambia el estado de entrega/lectura (webhook_message_ack)
 * 
 * Este endpoint actualiza el estado de entrega en la base de datos cuando
 * el mensaje llega al paciente (status: "device" o "read")
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    whatsappLogger.info({ webhookBody: body }, 'Received UltraMsg webhook');

    // UltraMsg envía webhooks en diferentes formatos:
    // Formato 1: { event_type: "message_ack", data: { id, ack, ... } }
    // Formato 2: { id, ack, status, ... } (formato directo)
    const eventType = body.event_type || body.event || body.type;
    
    // Extraer datos según el formato
    let messageId: string | undefined;
    let ackStatus: string | undefined;
    
    if (body.data && typeof body.data === 'object') {
      // Formato con objeto data
      messageId = body.data.id || body.data.messageId;
      ackStatus = body.data.ack || body.data.status;
    } else {
      // Formato directo
      messageId = body.id || body.messageId;
      ackStatus = body.ack || body.status;
    }

    // Solo procesar webhooks de tipo message_ack o si tiene ack status
    if (eventType && !eventType.includes('ack') && !ackStatus) {
      whatsappLogger.debug({ eventType }, 'Ignoring non-ACK webhook event');
      return NextResponse.json({ success: true, message: 'Non-ACK event ignored' });
    }

    if (!messageId) {
      whatsappLogger.warn({ body }, 'Webhook received without message ID');
      return NextResponse.json({ success: false, error: 'Missing message ID' }, { status: 400 });
    }

    // Buscar la cita por whatsapp_message_id
    const appointmentResult = await pool.query(
      `SELECT id, whatsapp_message_id, whatsapp_sent 
       FROM appointments 
       WHERE whatsapp_message_id = $1`,
      [String(messageId)]
    );

    if (appointmentResult.rows.length === 0) {
      // No es un error crítico, puede ser un mensaje que no es de citas
      whatsappLogger.debug({ messageId }, 'Message ID not found in appointments, ignoring');
      return NextResponse.json({ success: true, message: 'Message ID not found in appointments' });
    }

    const appointment = appointmentResult.rows[0];

    // Actualizar estado según el ACK recibido
    // UltraMsg ACK values: pending, server, device, read, played
    // "device" significa que el mensaje llegó al teléfono del paciente
    // "read" significa que el paciente leyó el mensaje
    if (ackStatus === 'device' || ackStatus === 'read' || ackStatus === 'played') {
      // El mensaje llegó al paciente
      await pool.query(
        `UPDATE appointments 
         SET whatsapp_sent = true,
             whatsapp_sent_at = COALESCE(whatsapp_sent_at, CURRENT_TIMESTAMP),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [appointment.id]
      );

      whatsappLogger.info(
        { 
          appointmentId: appointment.id, 
          messageId, 
          ackStatus,
          eventType 
        }, 
        'WhatsApp message delivered to patient'
      );
    } else if (ackStatus === 'server') {
      // El mensaje está en los servidores de WhatsApp pero aún no llegó al dispositivo
      whatsappLogger.debug(
        { 
          appointmentId: appointment.id, 
          messageId, 
          ackStatus 
        }, 
        'WhatsApp message on server, waiting for delivery'
      );
    } else if (ackStatus === 'pending') {
      // El mensaje está en la cola de la instancia
      whatsappLogger.debug(
        { 
          appointmentId: appointment.id, 
          messageId, 
          ackStatus 
        }, 
        'WhatsApp message pending in instance queue'
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processed',
      appointmentId: appointment.id,
      ackStatus 
    });
  } catch (error: any) {
    apiLogger.error({ error, body: await request.json().catch(() => ({})) }, 'Error processing UltraMsg webhook');
    return NextResponse.json(
      { success: false, error: 'Error processing webhook' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint para verificar que el webhook está activo
 */
export async function GET() {
  return NextResponse.json({ 
    success: true, 
    message: 'UltraMsg webhook endpoint is active',
    endpoint: '/api/whatsapp/webhook'
  });
}
