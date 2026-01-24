/**
 * Integración con WhatsApp usando Whapi
 * 
 * Funciones para enviar mensajes de confirmación y cancelación
 * de citas vía WhatsApp.
 */

import axios from 'axios';
import { WhatsAppMessage, WhatsAppResponse } from './types';
import { logger, whatsappLogger } from './logger';
import { cleanPhoneNumber } from './utils';

const WHAPI_API_URL = process.env.WHAPI_API_URL || 'https://api.whapi.cloud';
const WHAPI_API_TOKEN = process.env.WHAPI_API_TOKEN;
const WHAPI_PHONE_NUMBER_ID = process.env.WHAPI_PHONE_NUMBER_ID;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Envía un mensaje de WhatsApp genérico
 * 
 * @param phoneNumber Número de teléfono del destinatario
 * @param message Mensaje a enviar
 * @returns Resultado del envío
 */
export async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string
): Promise<WhatsAppResponse> {
  if (!WHAPI_API_TOKEN || !WHAPI_PHONE_NUMBER_ID) {
    const error = 'Whapi credentials not configured';
    whatsappLogger.error({ error }, 'Whapi configuration missing');
    return {
      success: false,
      error,
    };
  }

  try {
    // Limpiar y formatear número de teléfono
    const cleanedPhone = cleanPhoneNumber(phoneNumber);
    
    // Asegurar que tenga código de país (agregar + si no lo tiene)
    const formattedPhone = cleanedPhone.startsWith('+') ? cleanedPhone : `+${cleanedPhone}`;

    const response = await axios.post(
      `${WHAPI_API_URL}/messages`,
      {
        to: formattedPhone,
        body: message,
        phone: WHAPI_PHONE_NUMBER_ID,
      },
      {
        headers: {
          Authorization: `Bearer ${WHAPI_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    whatsappLogger.info({ phoneNumber: formattedPhone }, 'WhatsApp message sent successfully');

    return {
      success: true,
      messageId: response.data.id || response.data.message_id,
    };
  } catch (error: any) {
    whatsappLogger.error({ error, phoneNumber }, 'Error sending WhatsApp message');
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to send message',
    };
  }
}

/**
 * Envía mensaje de confirmación de cita
 * 
 * @param phoneNumber Número de teléfono del paciente
 * @param appointmentDetails Detalles de la cita
 * @returns Resultado del envío
 */
export async function sendAppointmentConfirmation(
  phoneNumber: string,
  appointmentDetails: {
    patientName: string;
    date: string; // YYYY-MM-DD
    time: string; // HH:MM
    visitType: string;
    consultType?: string | null;
    practiceType?: string | null;
    healthInsurance: string;
    detailsUrl: string;
  }
): Promise<WhatsAppResponse> {
  const visitTypeText = appointmentDetails.visitType;
  const subTypeText = appointmentDetails.consultType || appointmentDetails.practiceType || '';
  
  const message = `¡Hola ${appointmentDetails.patientName}!

Tu cita ha sido confirmada exitosamente.

📅 Fecha: ${appointmentDetails.date}
🕐 Hora: ${appointmentDetails.time}
👨‍⚕️ Tipo: ${visitTypeText}${subTypeText ? ` - ${subTypeText}` : ''}
🏥 Obra Social: ${appointmentDetails.healthInsurance}

Para ver los detalles de tu cita o cancelarla, visita:
${appointmentDetails.detailsUrl}

¡Te esperamos!`;

  return await sendWhatsAppMessage(phoneNumber, message);
}

/**
 * Envía mensaje de cancelación por proveedor
 * 
 * @param phoneNumber Número de teléfono del paciente
 * @param appointmentDetails Detalles de la cita cancelada
 * @returns Resultado del envío
 */
export async function sendProviderCancellationNotification(
  phoneNumber: string,
  appointmentDetails: {
    patientName: string;
    date: string; // YYYY-MM-DD
    time: string; // HH:MM
    rescheduleUrl: string;
  }
): Promise<WhatsAppResponse> {
  const message = `¡Hola ${appointmentDetails.patientName}!

Lamentamos informarte que tu cita del ${appointmentDetails.date} a las ${appointmentDetails.time} ha sido cancelada.

Por favor, reagenda tu cita visitando:
${appointmentDetails.rescheduleUrl}

Disculpa las molestias.`;

  return await sendWhatsAppMessage(phoneNumber, message);
}

/**
 * Verifica si WhatsApp está configurado
 * 
 * @returns true si está configurado correctamente, false si no
 */
export function isWhatsAppConfigured(): boolean {
  return !!(WHAPI_API_TOKEN && WHAPI_PHONE_NUMBER_ID);
}
