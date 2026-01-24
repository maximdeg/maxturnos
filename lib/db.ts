/**
 * Pool de Conexiones de Base de Datos PostgreSQL
 * 
 * Configuración optimizada del pool de conexiones para
 * máximo rendimiento y manejo de errores.
 * 
 * Mejores Prácticas Implementadas:
 * - Connection pooling para reutilizar conexiones
 * - Timeouts apropiados
 * - Manejo de errores de conexión
 * - Configuración SSL para producción
 * - Logging de operaciones de base de datos
 */

import { Pool } from 'pg';
import { dbLogger } from './logger';

// Configuración del pool de conexiones
export const pool = new Pool({
  host: process.env.POSTGRESQL_HOST || 'localhost',
  port: parseInt(process.env.POSTGRESQL_PORT || '5432'),
  database: process.env.POSTGRESQL_DATABASE || 'MaxTurnos_db',
  user: process.env.POSTGRESQL_USER || 'postgres',
  password: process.env.POSTGRESQL_PASSWORD,
  max: 20, // Máximo de conexiones en el pool
  idleTimeoutMillis: 30000, // Cerrar conexiones inactivas después de 30s
  connectionTimeoutMillis: 10000, // Timeout al obtener conexión (10 segundos)
  ssl:
    process.env.POSTGRESQL_SSL_MODE === 'require' ||
    process.env.POSTGRESQL_SSL_MODE === 'verify-full'
      ? {
          rejectUnauthorized: process.env.POSTGRESQL_SSL_MODE === 'verify-full',
          ca: process.env.POSTGRESQL_CA_CERT,
        }
      : false,
});

// Manejo de errores del pool
pool.on('error', (err) => {
  dbLogger.error({ error: err }, 'Unexpected error on idle client');
});

pool.on('connect', (client) => {
  dbLogger.debug('New client connected to database');
});

pool.on('remove', (client) => {
  dbLogger.debug('Client removed from pool');
});

/**
 * Ejecuta una query con logging automático
 * 
 * @param text Query SQL
 * @param params Parámetros de la query
 * @returns Resultado de la query
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number | null }> {
  const startTime = Date.now();
  
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - startTime;
    
    dbLogger.debug({
      query: text.substring(0, 100), // Primeros 100 caracteres para logging
      duration,
      rowCount: result.rowCount,
    }, 'Query executed');
    
    return {
      rows: result.rows as T[],
      rowCount: result.rowCount ?? 0,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    dbLogger.error({
      query: text.substring(0, 100),
      duration,
      error: error instanceof Error ? error.message : String(error),
    }, 'Query failed');
    
    throw error;
  }
}

/**
 * Obtiene un cliente del pool (para transacciones)
 * 
 * IMPORTANTE: Siempre liberar el cliente con client.release()
 * 
 * @returns Cliente del pool
 */
export async function getClient() {
  return await pool.connect();
}
