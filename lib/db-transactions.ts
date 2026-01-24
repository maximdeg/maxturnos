/**
 * Utilidades para Transacciones de Base de Datos
 * 
 * Este módulo proporciona funciones helper para ejecutar operaciones
 * críticas dentro de transacciones de PostgreSQL, asegurando atomicidad
 * y consistencia de datos.
 * 
 * Mejores Prácticas:
 * - Usar transacciones para operaciones que involucran múltiples queries
 * - Siempre hacer rollback en caso de error
 * - Liberar conexiones del pool correctamente
 * - No hacer operaciones asíncronas externas dentro de transacciones (ej: WhatsApp)
 */

import { Pool, PoolClient } from 'pg';
import { pool } from './db';

/**
 * Ejecuta una función dentro de una transacción de base de datos
 * 
 * @param callback Función que recibe un cliente de transacción y retorna el resultado
 * @returns Resultado de la función callback
 * @throws Error si la transacción falla (hace rollback automático)
 * 
 * @example
 * ```typescript
 * const result = await withTransaction(async (client) => {
 *   const clientResult = await client.query('INSERT INTO clients ...');
 *   const appointmentResult = await client.query('INSERT INTO appointments ...');
 *   return { clientId: clientResult.rows[0].id, appointmentId: appointmentResult.rows[0].id };
 * });
 * ```
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const result = await callback(client);
    
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Ejecuta una función dentro de una transacción con manejo de errores externos
 * 
 * Útil cuando hay operaciones externas (ej: WhatsApp) que no deben hacer rollback
 * de la transacción principal si fallan.
 * 
 * @param callback Función principal de transacción
 * @param onError Callback opcional para manejar errores después del commit
 * @returns Resultado de la función callback
 * 
 * @example
 * ```typescript
 * const appointment = await withTransactionAndExternalOps(
 *   async (client) => {
 *     // Operaciones críticas de BD
 *     const result = await client.query('INSERT INTO appointments ...');
 *     return result.rows[0];
 *   },
 *   async (appointment, error) => {
 *     // Si falla WhatsApp, loguear pero no hacer rollback
 *     logger.error({ error, appointmentId: appointment.id }, 'Failed to send WhatsApp');
 *   }
 * );
 * ```
 */
export async function withTransactionAndExternalOps<T>(
  callback: (client: PoolClient) => Promise<T>,
  onError?: (result: T, error: Error) => Promise<void>
): Promise<T> {
  const client = await pool.connect();
  let result: T | undefined;
  
  try {
    await client.query('BEGIN');
    
    result = await callback(client);
    
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    
    // Si hay callback de error y tenemos resultado, ejecutarlo
    if (onError && error instanceof Error && result !== undefined) {
      try {
        await onError(result, error);
      } catch (onErrorErr) {
        // Log error pero no lanzar
        console.error('Error in onError callback:', onErrorErr);
      }
    }
    
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Helper para crear o actualizar un cliente dentro de una transacción
 * 
 * @param client Cliente de transacción
 * @param phoneNumber Número de teléfono del cliente
 * @param firstName Nombre del cliente
 * @param lastName Apellido del cliente
 * @returns ID del cliente (existente o nuevo)
 */
export async function upsertClientInTransaction(
  client: PoolClient,
  phoneNumber: string,
  firstName: string,
  lastName: string,
  userAccountId?: number
): Promise<number> {
  const result = await client.query(
    `INSERT INTO clients (first_name, last_name, phone_number, user_account_id, updated_at)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
     ON CONFLICT (phone_number) 
     DO UPDATE SET 
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name,
       user_account_id = COALESCE(EXCLUDED.user_account_id, clients.user_account_id),
       updated_at = CURRENT_TIMESTAMP
     RETURNING id`,
    [firstName, lastName, phoneNumber, userAccountId || null]
  );
  
  return result.rows[0].id;
}

/**
 * Helper para crear una cita dentro de una transacción
 * 
 * @param client Cliente de transacción
 * @param appointmentData Datos de la cita
 * @returns ID de la cita creada
 */
export async function createAppointmentInTransaction(
  client: PoolClient,
  appointmentData: {
    clientId: number;
    userAccountId: number;
    appointmentDate: string;
    appointmentTime: string;
    visitTypeId: number;
    consultTypeId: number | null;
    practiceTypeId: number | null;
    healthInsurance: string;
    cancellationToken: string;
    notes?: string;
  }
): Promise<number> {
  const result = await client.query(
    `INSERT INTO appointments (
      client_id, user_account_id, appointment_date, appointment_time,
      visit_type_id, consult_type_id, practice_type_id, health_insurance,
      cancellation_token, notes, status, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'scheduled', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING id`,
    [
      appointmentData.clientId,
      appointmentData.userAccountId,
      appointmentData.appointmentDate,
      appointmentData.appointmentTime,
      appointmentData.visitTypeId,
      appointmentData.consultTypeId,
      appointmentData.practiceTypeId,
      appointmentData.healthInsurance,
      appointmentData.cancellationToken,
      appointmentData.notes || null,
    ]
  );
  
  return result.rows[0].id;
}

/**
 * Helper para actualizar estado de WhatsApp en una transacción
 * 
 * @param client Cliente de transacción
 * @param appointmentId ID de la cita
 * @param whatsappMessageId ID del mensaje de WhatsApp
 */
export async function updateWhatsAppStatusInTransaction(
  client: PoolClient,
  appointmentId: number,
  whatsappMessageId: string
): Promise<void> {
  await client.query(
    `UPDATE appointments 
     SET whatsapp_sent = true, 
         whatsapp_sent_at = CURRENT_TIMESTAMP,
         whatsapp_message_id = $1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [whatsappMessageId, appointmentId]
  );
}
