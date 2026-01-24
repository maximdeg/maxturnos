/**
 * Sistema de Logging Estructurado
 * 
 * Implementa logging estructurado usando Pino para mejor
 * observabilidad y debugging.
 * 
 * Características:
 * - Logging estructurado con contexto
 * - Diferentes niveles (debug, info, warn, error)
 * - Formato JSON para producción
 * - Formato legible para desarrollo
 * - Integración con servicios de monitoreo
 * 
 * Dependencias requeridas:
 * npm install pino pino-pretty
 * 
 * Configuración en package.json:
 * "scripts": {
 *   "dev": "NODE_ENV=development next dev",
 *   "start": "NODE_ENV=production next start"
 * }
 */

import pino from 'pino';

// Configuración del logger basada en entorno
const isDevelopment = process.env.NODE_ENV === 'development';
// Limpiar LOG_LEVEL de cualquier contaminación (por ejemplo, si viene "infoTEST_MODE=true")
const rawLogLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');
const logLevel = rawLogLevel.split(/[^a-z]/i)[0] || 'info'; // Tomar solo la parte del nivel antes de cualquier carácter no alfabético

/**
 * Logger principal de la aplicación
 */
// Configuración base de Pino
const baseConfig: pino.LoggerOptions = {
  level: logLevel,
  base: {
    env: process.env.NODE_ENV,
    app: 'maxturnos',
  },
};

// Configuración para desarrollo
// Nota: Deshabilitamos pino-pretty en Next.js porque causa problemas con worker threads
// En su lugar, usamos formato JSON legible con prettyPrint solo si está disponible
const developmentConfig: pino.LoggerOptions = {
  ...baseConfig,
  // No usar transport en Next.js para evitar problemas con worker threads
  // El formato JSON será legible en desarrollo
};

// Logger principal
export const logger = pino(isDevelopment ? developmentConfig : baseConfig);

/**
 * Logger con contexto de request
 * 
 * Útil para rastrear requests a través de múltiples funciones
 * 
 * @param context Contexto adicional (endpoint, user_id, etc.)
 * @returns Logger con contexto
 * 
 * @example
 * ```typescript
 * const requestLogger = createRequestLogger({ endpoint: '/api/appointments/create', ip: req.ip });
 * requestLogger.info({ userAccountId: 123 }, 'Creating appointment');
 * ```
 */
export function createRequestLogger(context: Record<string, any>) {
  return logger.child(context);
}

/**
 * Logger para operaciones de base de datos
 */
export const dbLogger = logger.child({ component: 'database' });

/**
 * Logger para operaciones de API
 */
export const apiLogger = logger.child({ component: 'api' });

/**
 * Logger para operaciones de autenticación
 */
export const authLogger = logger.child({ component: 'auth' });

/**
 * Logger para operaciones de WhatsApp
 */
export const whatsappLogger = logger.child({ component: 'whatsapp' });

/**
 * Logger para operaciones de caché
 */
export const cacheLogger = logger.child({ component: 'cache' });

/**
 * Helper para loguear errores con contexto completo
 * 
 * @param error Error a loguear
 * @param context Contexto adicional
 * @param loggerInstance Logger a usar (opcional)
 * 
 * @example
 * ```typescript
 * try {
 *   await createAppointment(data);
 * } catch (error) {
 *   logError(error, { userAccountId: 123, appointmentData: data }, apiLogger);
 *   throw error;
 * }
 * ```
 */
export function logError(
  error: unknown,
  context: Record<string, any> = {},
  loggerInstance: pino.Logger = logger
): void {
  if (error instanceof Error) {
    loggerInstance.error(
      {
        ...context,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      },
      'Error occurred'
    );
  } else {
    loggerInstance.error(
      {
        ...context,
        error: String(error),
      },
      'Unknown error occurred'
    );
  }
}

/**
 * Helper para loguear operaciones de base de datos
 * 
 * @param operation Nombre de la operación
 * @param query Query SQL (opcional, para debugging)
 * @param duration Duración en ms
 * @param context Contexto adicional
 */
export function logDatabaseOperation(
  operation: string,
  duration: number,
  context: Record<string, any> = {},
  query?: string
): void {
  const logData: Record<string, any> = {
    operation,
    duration,
    ...context,
  };

  if (query && isDevelopment) {
    logData.query = query;
  }

  if (duration > 1000) {
    // Queries lentas (> 1 segundo)
    dbLogger.warn(logData, 'Slow database query');
  } else {
    dbLogger.debug(logData, 'Database operation completed');
  }
}

/**
 * Helper para loguear operaciones de API
 * 
 * @param method Método HTTP
 * @param path Ruta de la API
 * @param statusCode Código de estado HTTP
 * @param duration Duración en ms
 * @param context Contexto adicional
 */
export function logApiRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  context: Record<string, any> = {}
): void {
  const logData = {
    method,
    path,
    statusCode,
    duration,
    ...context,
  };

  if (statusCode >= 500) {
    apiLogger.error(logData, 'API error');
  } else if (statusCode >= 400) {
    apiLogger.warn(logData, 'API client error');
  } else if (duration > 1000) {
    apiLogger.warn(logData, 'Slow API request');
  } else {
    apiLogger.info(logData, 'API request completed');
  }
}

/**
 * Helper para loguear operaciones de caché
 * 
 * @param operation Operación (hit, miss, set, delete)
 * @param key Clave del caché
 * @param context Contexto adicional
 */
export function logCacheOperation(
  operation: 'hit' | 'miss' | 'set' | 'delete',
  key: string,
  context: Record<string, any> = {}
): void {
  cacheLogger.debug(
    {
      operation,
      key,
      ...context,
    },
    `Cache ${operation}`
  );
}

/**
 * Middleware de logging para Next.js API routes
 * 
 * @param handler Handler de la API route
 * @returns Handler envuelto con logging
 * 
 * @example
 * ```typescript
 * export const GET = withLogging(async (req: NextRequest) => {
 *   // Tu código aquí
 * });
 * ```
 */
export function withLogging<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
  endpoint?: string
): T {
  return (async (...args: any[]) => {
    const startTime = Date.now();
    const request = args[0] as Request;
    const method = request.method;
    const url = new URL(request.url);
    const path = url.pathname;

    const requestLogger = createRequestLogger({
      endpoint: endpoint || path,
      method,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    });

    try {
      requestLogger.info('Request started');

      const response = await handler(...args);

      const duration = Date.now() - startTime;
      const statusCode = response.status;

      logApiRequest(method, path, statusCode, duration, {
        endpoint: endpoint || path,
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logError(error, {
        endpoint: endpoint || path,
        method,
        duration,
      }, requestLogger);

      throw error;
    }
  }) as T;
}

/**
 * Performance timer para medir duración de operaciones
 * 
 * @param operation Nombre de la operación
 * @param context Contexto adicional
 * @returns Función para finalizar el timer
 * 
 * @example
 * ```typescript
 * const timer = startTimer('createAppointment', { userAccountId: 123 });
 * // ... operación ...
 * timer.end(); // Loguea automáticamente la duración
 * ```
 */
export function startTimer(
  operation: string,
  context: Record<string, any> = {}
): { end: () => number } {
  const startTime = Date.now();
  const timerLogger = logger.child({ operation, ...context });

  return {
    end: () => {
      const duration = Date.now() - startTime;
      timerLogger.debug({ duration }, 'Operation completed');
      return duration;
    },
  };
}
