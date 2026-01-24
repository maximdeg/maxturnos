/**
 * Utilidades para mapeo de username a user_account_id
 * 
 * Este módulo proporciona funciones para obtener el user_account_id
 * a partir del username del proveedor, necesario para las rutas dinámicas.
 */

import { pool } from './db';
import { logger } from './logger';

/**
 * Obtiene el user_account_id a partir del username
 * 
 * @param username Username del proveedor
 * @returns ID del user_account o null si no existe
 */
export async function getUserAccountIdByUsername(username: string): Promise<number | null> {
  try {
    const result = await pool.query(
      'SELECT id FROM user_accounts WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].id;
  } catch (error) {
    logger.error({ error, username }, 'Error getting user_account_id by username');
    throw error;
  }
}

/**
 * Obtiene el username a partir del user_account_id
 * 
 * @param userAccountId ID del user_account
 * @returns Username o null si no existe
 */
export async function getUsernameByUserAccountId(userAccountId: number): Promise<string | null> {
  try {
    const result = await pool.query(
      'SELECT username FROM user_accounts WHERE id = $1',
      [userAccountId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].username;
  } catch (error) {
    logger.error({ error, userAccountId }, 'Error getting username by user_account_id');
    throw error;
  }
}

/**
 * Verifica si un username existe
 * 
 * @param username Username a verificar
 * @returns true si existe, false si no
 */
export async function usernameExists(username: string): Promise<boolean> {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM user_accounts WHERE username = $1',
      [username]
    );

    return parseInt(result.rows[0].count) > 0;
  } catch (error) {
    logger.error({ error, username }, 'Error checking if username exists');
    throw error;
  }
}

/**
 * Obtiene información completa del proveedor por username
 * 
 * @param username Username del proveedor
 * @returns Información del proveedor o null si no existe
 */
export async function getProviderByUsername(username: string) {
  try {
    // Verificar qué columnas existen en la tabla
    const columnsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_accounts' AND table_schema = 'public'
    `);
    
    const existingColumns = columnsResult.rows.map((row: any) => row.column_name);
    const hasFirstName = existingColumns.includes('first_name');
    const hasLastName = existingColumns.includes('last_name');
    const hasWhatsAppPhone = existingColumns.includes('whatsapp_phone_number');
    
    // Construir SELECT dinámicamente
    const selectFields = [
      'id',
      'email',
      'username',
      ...(hasFirstName ? ['first_name'] : []),
      ...(hasLastName ? ['last_name'] : []),
      ...(hasWhatsAppPhone ? ['whatsapp_phone_number'] : []),
      'email_verified',
      'created_at'
    ];
    
    const result = await pool.query(
      `SELECT ${selectFields.join(', ')}
       FROM user_accounts 
       WHERE username = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const provider = result.rows[0];
    
    // Asegurar que los campos opcionales estén presentes
    return {
      ...provider,
      first_name: hasFirstName ? provider.first_name : null,
      last_name: hasLastName ? provider.last_name : null,
      whatsapp_phone_number: hasWhatsAppPhone ? provider.whatsapp_phone_number : null,
    };
  } catch (error) {
    logger.error({ error, username }, 'Error getting provider by username');
    throw error;
  }
}
