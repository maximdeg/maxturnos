/**
 * Integración con WhatsApp usando UltraMsg
 * 
 * Funciones para enviar mensajes de confirmación y cancelación
 * de citas vía WhatsApp.
 */

import axios from 'axios';
import { WhatsAppMessage, WhatsAppResponse } from './types';
import { logger, whatsappLogger } from './logger';
import { cleanPhoneNumber } from './utils';

// UltraMsg API configuration
// ULTRAMSG_API_URL puede venir con o sin el instance_id
// Formato esperado: https://api.ultramsg.com o https://api.ultramsg.com/instance160031
const ULTRAMSG_API_URL_RAW = process.env.ULTRAMSG_API_URL || 'https://api.ultramsg.com';
const ULTRAMSG_INSTANCE_ID = process.env.ULTRAMSG_INSTANCE_ID;
const ULTRAMSG_API_TOKEN = process.env.ULTRAMSG_API_TOKEN;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Normalizar la URL base (remover instance_id si está incluido)
let ULTRAMSG_API_URL = ULTRAMSG_API_URL_RAW;
if (ULTRAMSG_API_URL.includes('/instance')) {
  // Si la URL incluye /instance, extraer solo la parte base
  ULTRAMSG_API_URL = ULTRAMSG_API_URL.split('/instance')[0];
}

/**
 * Envía un mensaje de WhatsApp genérico usando UltraMsg API
 * 
 * @param phoneNumber Número de teléfono del destinatario
 * @param message Mensaje a enviar
 * @returns Resultado del envío
 */
export async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string
): Promise<WhatsAppResponse> {
  if (!ULTRAMSG_API_TOKEN || !ULTRAMSG_INSTANCE_ID) {
    const error = 'UltraMsg credentials not configured';
    whatsappLogger.error({ error }, 'UltraMsg configuration missing');
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

    // Construir URL de la API de UltraMsg
    const apiUrl = `${ULTRAMSG_API_URL}/${ULTRAMSG_INSTANCE_ID}/messages/chat`;

    // UltraMsg requiere parámetros como form-urlencoded o query params
    const params = new URLSearchParams({
      token: ULTRAMSG_API_TOKEN,
      to: formattedPhone,
      body: message,
    });

    const response = await axios.post(
      apiUrl,
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    whatsappLogger.info({ phoneNumber: formattedPhone, messageId: response.data.id }, 'WhatsApp message sent successfully via UltraMsg');

    // UltraMsg responde con: {"sent":"true","message":"ok","id":44897}
    if (response.data.sent === 'true' || response.data.sent === true) {
      return {
        success: true,
        messageId: String(response.data.id),
      };
    } else {
      throw new Error(response.data.message || 'Message not sent');
    }
  } catch (error: any) {
    whatsappLogger.error({ error, phoneNumber, errorResponse: error.response?.data }, 'Error sending WhatsApp message via UltraMsg');
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
  return !!(ULTRAMSG_API_TOKEN && ULTRAMSG_INSTANCE_ID);
}
