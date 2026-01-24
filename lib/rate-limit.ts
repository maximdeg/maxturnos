/**
 * Rate Limiting para APIs
 * 
 * Implementa rate limiting para prevenir abuso de APIs.
 * Soporta múltiples estrategias:
 * - Sliding window (recomendado)
 * - Fixed window
 * - Token bucket
 * 
 * Dependencias requeridas:
 * npm install @upstash/ratelimit @upstash/redis
 * 
 * Alternativa sin Redis (para desarrollo):
 * npm install lru-cache
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Configuración de Redis para rate limiting
// En producción, usar Upstash Redis o Redis propio
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? Redis.fromEnv()
  : null;

// Detectar modo de prueba
const isTestMode = process.env.NODE_ENV === 'test' || process.env.TEST_MODE === 'true';

/**
 * Rate limiter principal usando sliding window
 * 
 * Configuración:
 * - 10 requests por 10 segundos por defecto
 * - Ajustable por endpoint mediante configuración personalizada
 */
const defaultRateLimiter = redis
  ? new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(10, '10 s'),
      analytics: true,
      prefix: '@maxturnos/ratelimit',
    })
  : null;

/**
 * Rate limiters específicos por endpoint
 * 
 * En modo test, los límites son mucho más permisivos para permitir pruebas automatizadas.
 * En producción, los límites son más restrictivos para prevenir abuso.
 */
export const rateLimiters = {
  // Endpoint de creación de citas
  // Producción: 5 requests/minuto | Test: 100 requests/minuto
  createAppointment: redis
    ? new Ratelimit({
        redis: redis,
        limiter: Ratelimit.slidingWindow(
          isTestMode ? 100 : 5, 
          isTestMode ? '1 m' : '1 m'
        ),
        analytics: true,
        prefix: '@maxturnos/ratelimit/appointments/create',
      })
    : null,

  // Endpoint de registro
  // Producción: 3 requests/10 minutos | Test: 1000 requests/minuto (para pruebas paralelas)
  register: redis
    ? new Ratelimit({
        redis: redis,
        limiter: Ratelimit.slidingWindow(
          isTestMode ? 1000 : 3,
          isTestMode ? '1 m' : '10 m'
        ),
        analytics: true,
        prefix: '@maxturnos/ratelimit/auth/register',
      })
    : null,

  // Endpoint de login
  // Producción: 5 requests/5 minutos | Test: 100 requests/minuto
  login: redis
    ? new Ratelimit({
        redis: redis,
        limiter: Ratelimit.slidingWindow(
          isTestMode ? 100 : 5,
          isTestMode ? '1 m' : '5 m'
        ),
        analytics: true,
        prefix: '@maxturnos/ratelimit/auth/login',
      })
    : null,

  // Endpoint de verificación de email
  // Producción: 10 requests/hora | Test: 100 requests/minuto
  verifyEmail: redis
    ? new Ratelimit({
        redis: redis,
        limiter: Ratelimit.slidingWindow(
          isTestMode ? 100 : 10,
          isTestMode ? '1 m' : '1 h'
        ),
        analytics: true,
        prefix: '@maxturnos/ratelimit/auth/verify',
      })
    : null,

  // Endpoints del perfil del proveedor
  // Producción: 30 requests/minuto | Test: 200 requests/minuto
  providerProfile: redis
    ? new Ratelimit({
        redis: redis,
        limiter: Ratelimit.slidingWindow(
          isTestMode ? 200 : 30,
          '1 m'
        ),
        analytics: true,
        prefix: '@maxturnos/ratelimit/provider',
      })
    : null,

  // Endpoints públicos de lectura (ej: horarios disponibles, obras sociales)
  // Producción: 10 requests/10 segundos | Test: 1000 requests/minuto (para pruebas paralelas)
  publicRead: redis
    ? new Ratelimit({
        redis: redis,
        limiter: Ratelimit.slidingWindow(
          isTestMode ? 1000 : 10,
          isTestMode ? '1 m' : '10 s'
        ),
        analytics: true,
        prefix: '@maxturnos/ratelimit/public-read',
      })
    : null,
};

/**
 * Verifica rate limit para un identificador dado
 * 
 * @param identifier Identificador único (IP, user ID, email, etc.)
 * @param limiter Rate limiter a usar (opcional, usa default si no se especifica)
 * @returns Objeto con success y información del límite
 * 
 * @example
 * ```typescript
 * const { success, limit, remaining, reset } = await checkRateLimit(req.ip);
 * if (!success) {
 *   return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
 * }
 * ```
 */
export async function checkRateLimit(
  identifier: string,
  limiter: Ratelimit | null = defaultRateLimiter
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  // En modo test, permitir todas las requests si no hay Redis configurado
  // O si está explícitamente deshabilitado el rate limiting en test
  // O si TEST_MODE está activo (más permisivo)
  if (isTestMode) {
    if (process.env.DISABLE_RATE_LIMIT_IN_TEST === 'true') {
      return {
        success: true,
        limit: Infinity,
        remaining: Infinity,
        reset: Date.now() + 10000,
      };
    }
    // En test mode, usar límites muy altos pero aún aplicar rate limiting
    // Los límites ya están aumentados en rateLimiters, así que continuar normalmente
  }

  // Si no hay Redis configurado, permitir todas las requests (desarrollo)
  if (!limiter) {
    return {
      success: true,
      limit: Infinity,
      remaining: Infinity,
      reset: Date.now() + 10000,
    };
  }

  const result = await limiter.limit(identifier);

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Middleware de rate limiting para Next.js API routes
 * 
 * @param identifier Identificador único para rate limiting
 * @param limiter Rate limiter a usar
 * @returns Response con error 429 si se excede el límite, null si está OK
 * 
 * @example
 * ```typescript
 * // En route.ts
 * const rateLimitResponse = await rateLimitMiddleware(req.ip, rateLimiters.createAppointment);
 * if (rateLimitResponse) return rateLimitResponse;
 * ```
 */
export async function rateLimitMiddleware(
  identifier: string,
  limiter: Ratelimit | null = defaultRateLimiter
): Promise<Response | null> {
  const result = await checkRateLimit(identifier, limiter);

  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: `Demasiadas solicitudes. Intenta de nuevo en ${new Date(result.reset).toLocaleString()}`,
        retryAfter: result.reset,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.reset.toString(),
          'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  return null;
}

/**
 * Obtiene identificador para rate limiting desde request
 * 
 * Prioridad:
 * 1. User ID (si está autenticado)
 * 2. IP address
 * 3. Email (si está disponible)
 * 
 * @param request Next.js request (NextRequest o Request)
 * @param userId ID de usuario opcional
 * @returns Identificador único para rate limiting
 */
export function getRateLimitIdentifier(
  request: Request | { headers: Headers; ip?: string },
  userId?: number
): string {
  // Si hay usuario autenticado, usar su ID
  if (userId) {
    return `user:${userId}`;
  }

  // Obtener IP del request
  // NextRequest tiene propiedad ip, Request usa headers
  let ip: string | null = null;
  
  if ('ip' in request && request.ip) {
    ip = request.ip;
  } else {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    ip = forwarded?.split(',')[0] || realIp || null;
  }

  return `ip:${ip || 'unknown'}`;
}

/**
 * Rate limiter en memoria para desarrollo (sin Redis)
 * 
 * Solo usar en desarrollo. En producción siempre usar Redis.
 */
class InMemoryRateLimiter {
  private cache: Map<string, { count: number; resetAt: number }> = new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async limit(identifier: string): Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  }> {
    const now = Date.now();
    const key = identifier;
    const entry = this.cache.get(key);

    // Limpiar entradas expiradas
    if (entry && entry.resetAt < now) {
      this.cache.delete(key);
    }

    const current = this.cache.get(key);

    if (!current) {
      // Primera request
      this.cache.set(key, {
        count: 1,
        resetAt: now + this.windowMs,
      });

      return {
        success: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - 1,
        reset: now + this.windowMs,
      };
    }

    if (current.count >= this.maxRequests) {
      return {
        success: false,
        limit: this.maxRequests,
        remaining: 0,
        reset: current.resetAt,
      };
    }

    // Incrementar contador
    current.count++;
    this.cache.set(key, current);

    return {
      success: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - current.count,
      reset: current.resetAt,
    };
  }
}

/**
 * Rate limiter en memoria para desarrollo
 * Usar solo cuando Redis no está disponible
 */
export const inMemoryRateLimiter = new InMemoryRateLimiter(10, 10000);
