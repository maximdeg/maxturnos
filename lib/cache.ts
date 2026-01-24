/**
 * Sistema de Caché para Consultas Frecuentes
 * 
 * Implementa caché con TTL (Time To Live) para optimizar
 * consultas frecuentes a la base de datos.
 * 
 * Estrategias:
 * - Redis (producción) - recomendado
 * - In-memory cache (desarrollo) - fallback
 * 
 * Dependencias requeridas:
 * npm install @upstash/redis
 * 
 * Alternativa para desarrollo:
 * npm install lru-cache
 */

import { Redis } from '@upstash/redis';
import { LRUCache } from 'lru-cache';

// Configuración de Redis para caché
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? Redis.fromEnv()
  : null;

// Caché en memoria como fallback (solo desarrollo)
const memoryCache = new LRUCache<string, any>({
  max: 500, // Máximo 500 entradas
  ttl: 1000 * 60 * 5, // 5 minutos por defecto
});

/**
 * Obtiene un valor del caché
 * 
 * @param key Clave del caché
 * @returns Valor almacenado o null si no existe
 * 
 * @example
 * ```typescript
 * const cached = await getCache('available_times:123:2025-01-15');
 * if (cached) return cached;
 * ```
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    if (redis) {
      const value = await redis.get(key);
      if (value === null || value === undefined) return null;
      
      // Upstash Redis puede devolver string o ya parseado
      // Si es string, parsearlo; si ya es objeto, devolverlo directamente
      if (typeof value === 'string') {
        try {
          return JSON.parse(value) as T;
        } catch (parseError) {
          // Si no es JSON válido, podría ser un string directo
          const valuePreview = value.substring(0, 100);
          console.error('Cache parse error:', parseError, 'Value:', valuePreview);
          return null;
        }
      } else {
        // Ya es un objeto (Upstash puede devolver objetos directamente)
        return value as T;
      }
    } else {
      // Fallback a memoria - LRU cache devuelve el objeto directamente
      const value = memoryCache.get(key);
      return value as T | null;
    }
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

/**
 * Establece un valor en el caché con TTL
 * 
 * @param key Clave del caché
 * @param value Valor a almacenar
 * @param ttlSeconds TTL en segundos (default: 300 = 5 minutos)
 * 
 * @example
 * ```typescript
 * await setCache('available_times:123:2025-01-15', ['09:00', '09:20'], 300);
 * ```
 */
export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds: number = 300
): Promise<void> {
  try {
    if (redis) {
      // Redis necesita string JSON - asegurarse de serializar correctamente
      const serialized = JSON.stringify(value);
      await redis.setex(key, ttlSeconds, serialized);
    } else {
      // Fallback a memoria - LRU cache puede guardar objetos directamente
      // Pero para consistencia, guardamos una copia serializada/deserializada
      try {
        // Serializar y deserializar para asegurar consistencia
        const serialized = JSON.parse(JSON.stringify(value));
        memoryCache.set(key, serialized, { ttl: ttlSeconds * 1000 });
      } catch (serializeError) {
        // Si falla la serialización, guardar directamente (para objetos complejos)
        memoryCache.set(key, value, { ttl: ttlSeconds * 1000 });
      }
    }
  } catch (error) {
    console.error('Cache set error:', error);
    // No lanzar error, solo loguear
  }
}

/**
 * Elimina una clave del caché
 * 
 * @param key Clave a eliminar
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    if (redis) {
      await redis.del(key);
    } else {
      memoryCache.delete(key);
    }
  } catch (error) {
    console.error('Cache delete error:', error);
  }
}

/**
 * Elimina múltiples claves del caché que coinciden con un patrón
 * 
 * @param pattern Patrón de claves a eliminar (ej: 'available_times:*')
 */
export async function deleteCachePattern(pattern: string): Promise<void> {
  try {
    if (redis) {
      // Redis SCAN para encontrar claves que coinciden
      const keys: string[] = [];
      let cursor: number | string = 0;
      
      do {
        const result: [number | string, string[]] = await redis.scan(cursor, { match: pattern, count: 100 }) as [number | string, string[]];
        const nextCursor = result[0];
        cursor = typeof nextCursor === 'string' ? parseInt(nextCursor, 10) : nextCursor;
        keys.push(...(result[1] || []));
      } while (cursor !== 0 && String(cursor) !== '0');
      
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } else {
      // Para memoria, eliminar todas las claves que coinciden
      for (const key of memoryCache.keys()) {
        if (key.includes(pattern.replace('*', ''))) {
          memoryCache.delete(key);
        }
      }
    }
  } catch (error) {
    console.error('Cache delete pattern error:', error);
  }
}

/**
 * Obtiene o establece un valor en caché (patrón cache-aside)
 * 
 * Si el valor no está en caché, ejecuta la función y almacena el resultado.
 * 
 * @param key Clave del caché
 * @param fetchFn Función que obtiene el valor si no está en caché
 * @param ttlSeconds TTL en segundos (default: 300)
 * @returns Valor del caché o resultado de fetchFn
 * 
 * @example
 * ```typescript
 * const times = await getOrSetCache(
 *   `available_times:${userAccountId}:${date}`,
 *   async () => {
 *     // Consulta a BD si no está en caché
 *     return await getAvailableTimesFromDB(userAccountId, date);
 *   },
 *   300 // 5 minutos
 * );
 * ```
 */
export async function getOrSetCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  try {
    // Intentar obtener del caché
    const cached = await getCache<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    // Si no está en caché, ejecutar función y almacenar
    const value = await fetchFn();
    
    // Almacenar en caché de forma asíncrona (no bloquear respuesta)
    setImmediate(async () => {
      try {
        await setCache(key, value, ttlSeconds);
      } catch (cacheError) {
        // Si falla el caché, solo loguear (no crítico)
        console.error('Cache set error (non-critical):', cacheError);
      }
    });
    
    return value;
  } catch (error) {
    // Si hay error en getCache o fetchFn, intentar ejecutar fetchFn directamente
    console.error('Cache operation error, falling back to fetchFn:', error);
    return await fetchFn();
  }
}

/**
 * Claves de caché estándar
 */
export const cacheKeys = {
  // Horarios disponibles por proveedor y fecha
  availableTimes: (userAccountId: number, date: string) =>
    `available_times:${userAccountId}:${date}`,

  // Horario de trabajo del proveedor
  workSchedule: (username: string) => `work_schedule:${username}`,

  // Días no disponibles del proveedor
  unavailableDays: (userAccountId: number, startDate: string, endDate: string) =>
    `unavailable_days:${userAccountId}:${startDate}:${endDate}`,

  // Datos de referencia (visit_types, consult_types, etc.)
  visitTypes: () => 'reference:visit_types',
  consultTypes: () => 'reference:consult_types',
  practiceTypes: () => 'reference:practice_types',
  healthInsurance: () => 'reference:health_insurance',

  // Calendario del proveedor
  calendar: (userAccountId: number, year: number, month: number) =>
    `calendar:${userAccountId}:${year}:${month}`,

  // Perfil del proveedor
  providerProfile: (userAccountId: number) => `provider_profile:${userAccountId}`,

  // Lista de citas del proveedor (con filtros)
  providerAppointments: (
    userAccountId: number,
    status: string,
    startDate: string,
    endDate: string,
    page: number
  ) => `appointments:${userAccountId}:${status}:${startDate}:${endDate}:${page}`,
};

/**
 * Invalida caché relacionado con una cita
 * 
 * Se llama cuando se crea, actualiza o cancela una cita
 * para asegurar que los datos en caché estén actualizados.
 * 
 * @param userAccountId ID del proveedor
 * @param date Fecha de la cita
 */
export async function invalidateAppointmentCache(
  userAccountId: number,
  date: string
): Promise<void> {
  // Invalidar horarios disponibles para esa fecha
  await deleteCache(cacheKeys.availableTimes(userAccountId, date));

  // Invalidar calendario del mes
  const dateObj = new Date(date);
  await deleteCache(
    cacheKeys.calendar(userAccountId, dateObj.getFullYear(), dateObj.getMonth() + 1)
  );

  // Invalidar lista de citas del proveedor (todas las páginas)
  // Nota: En producción, podrías usar un patrón más específico
  await deleteCachePattern(`appointments:${userAccountId}:*`);
}

/**
 * Invalida caché relacionado con horarios de trabajo
 * 
 * Se llama cuando se actualizan horarios de trabajo del proveedor
 * 
 * @param userAccountId ID del proveedor
 * @param username Username del proveedor
 */
export async function invalidateScheduleCache(
  userAccountId: number,
  username: string
): Promise<void> {
  await deleteCache(cacheKeys.workSchedule(username));
  await deleteCachePattern(`available_times:${userAccountId}:*`);
  await deleteCachePattern(`calendar:${userAccountId}:*`);
}

/**
 * Invalida caché relacionado con días no laborables
 * 
 * @param userAccountId ID del proveedor
 * @param username Username del proveedor
 */
export async function invalidateUnavailableDaysCache(
  userAccountId: number,
  username: string
): Promise<void> {
  await invalidateScheduleCache(userAccountId, username);
}
