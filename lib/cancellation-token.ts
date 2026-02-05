/**
 * Sistema de Tokens de Cancelación JWT
 * 
 * Genera y valida tokens JWT para cancelación segura de citas.
 * Los tokens expiran 24 horas antes del horario de la cita.
 */

import jwt from 'jsonwebtoken';

/** Política de cancelación: mínimo de horas de anticipación antes del horario de la cita */
const CANCELLATION_HOURS_BEFORE = 24;
import { CancellationTokenPayload } from './types';
import { logger } from './logger';

const JWT_SECRET = process.env.JWT_SECRET;

// Validar JWT_SECRET pero no lanzar error fatal al cargar el módulo
// Las funciones verificarán esto y devolverán error apropiado
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  logger.warn('JWT_SECRET no está configurado o es muy corto (mínimo 32 caracteres). Los tokens de cancelación no funcionarán.');
}

// Type assertion para TypeScript - puede ser undefined pero lo manejaremos en las funciones
const JWT_SECRET_ASSERTED: string = JWT_SECRET || 'temp-secret-min-32-chars-for-dev-only-not-for-production-use';

/**
 * Genera un token de cancelación JWT para una cita
 * 
 * El token expira 24 horas antes del horario de la cita.
 * 
 * @param payload Datos de la cita para incluir en el token
 * @returns Token JWT firmado
 */
export function generateCancellationToken(payload: {
  appointmentId: number;
  patientId: number;
  patientPhone: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // HH:MM
}): string {
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET no está configurado correctamente. Debe tener al menos 32 caracteres.');
  }

  try {
    // Calcular expiración: 24 horas antes del horario de la cita
    const appointmentDateTime = new Date(`${payload.appointmentDate}T${payload.appointmentTime}`);
    const expirationTime = new Date(appointmentDateTime.getTime() - CANCELLATION_HOURS_BEFORE * 60 * 60 * 1000);
    
    // Si la expiración ya pasó, usar 1 hora desde ahora como mínimo
    const now = new Date();
    const exp = expirationTime > now ? expirationTime : new Date(now.getTime() + 60 * 60 * 1000);

    const tokenPayload: CancellationTokenPayload = {
      appointmentId: payload.appointmentId,
      patientId: payload.patientId,
      patientPhone: payload.patientPhone,
      appointmentDate: payload.appointmentDate,
      appointmentTime: payload.appointmentTime,
      exp: Math.floor(exp.getTime() / 1000),
      iat: Math.floor(now.getTime() / 1000),
    };

    return jwt.sign(tokenPayload, JWT_SECRET);
  } catch (error) {
    logger.error({ error, payload }, 'Error generating cancellation token');
    throw error;
  }
}

/**
 * Verifica y decodifica un token de cancelación
 * 
 * @param token Token JWT a verificar
 * @returns Payload decodificado o null si el token es inválido
 */
export function verifyCancellationToken(token: string): CancellationTokenPayload | null {
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    logger.warn('JWT_SECRET no está configurado correctamente. No se puede verificar token de cancelación.');
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as CancellationTokenPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn({ error }, 'Cancellation token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn({ error }, 'Invalid cancellation token');
    } else {
      logger.error({ error }, 'Error verifying cancellation token');
    }
    return null;
  }
}

/**
 * Verifica si una cita puede cancelarse según el token
 * 
 * Verifica que:
 * 1. El token sea válido
 * 2. No haya expirado (24 horas antes de la cita)
 * 3. La cita esté al menos 24 horas en el futuro
 * 
 * @param token Token de cancelación
 * @returns true si puede cancelarse, false si no
 */
export function canCancelAppointment(token: string): boolean {
  const payload = verifyCancellationToken(token);
  
  if (!payload) {
    return false;
  }

  // Verificar que la cita esté al menos 24 horas en el futuro
  const appointmentDateTime = new Date(`${payload.appointmentDate}T${payload.appointmentTime}`);
  const now = new Date();
  const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  return hoursUntilAppointment >= CANCELLATION_HOURS_BEFORE;
}

/**
 * Obtiene información de la cita desde el token
 * 
 * @param token Token de cancelación
 * @returns Información de la cita o null si el token es inválido
 */
export function getAppointmentInfoFromToken(token: string): {
  appointmentId: number;
  patientId: number;
  patientPhone: string;
  appointmentDate: string;
  appointmentTime: string;
} | null {
  const payload = verifyCancellationToken(token);
  
  if (!payload) {
    return null;
  }

  return {
    appointmentId: payload.appointmentId,
    patientId: payload.patientId,
    patientPhone: payload.patientPhone,
    appointmentDate: payload.appointmentDate,
    appointmentTime: payload.appointmentTime,
  };
}
