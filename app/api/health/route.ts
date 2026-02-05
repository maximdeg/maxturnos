import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

type HealthChecks = {
  server: boolean;
  database: boolean;
  env: {
    jwt_secret: boolean;
    postgresql_host: boolean;
    postgresql_database: boolean;
  };
  redis?: boolean;
};

/**
 * Endpoint de Health Check
 *
 * Verifica el estado del servidor y sus dependencias:
 * - Estado del servidor
 * - Conexión a base de datos
 * - Variables de entorno críticas
 * - Redis (solo si UPSTASH_REDIS_REST_URL está definido)
 */
export async function GET(request: NextRequest) {
  const health: {
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    checks: HealthChecks;
    errors?: string[];
  } = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      server: true,
      database: false,
      env: {
        jwt_secret: !!process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32,
        postgresql_host: !!process.env.POSTGRESQL_HOST,
        postgresql_database: !!process.env.POSTGRESQL_DATABASE,
      },
    },
    errors: [],
  };

  // Verificar conexión a base de datos
  try {
    await pool.query('SELECT 1');
    health.checks.database = true;
  } catch (error: unknown) {
    health.status = 'unhealthy';
    health.errors?.push(`Database connection failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Verificar Redis (opcional; solo si está configurado)
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const { Redis } = await import('@upstash/redis');
      const redis = Redis.fromEnv();
      const pong = await redis.ping();
      health.checks.redis = pong === 'PONG';
      if (!health.checks.redis) {
        health.status = 'unhealthy';
        health.errors?.push('Redis ping did not return PONG');
      }
    } catch (error: unknown) {
      health.checks.redis = false;
      health.status = 'unhealthy';
      health.errors?.push(`Redis connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Verificar variables de entorno críticas
  if (!health.checks.env.jwt_secret) {
    health.status = 'unhealthy';
    health.errors?.push('JWT_SECRET is missing or too short (minimum 32 characters)');
  }

  if (!health.checks.env.postgresql_host) {
    health.status = 'unhealthy';
    health.errors?.push('POSTGRESQL_HOST is missing');
  }

  if (!health.checks.env.postgresql_database) {
    health.status = 'unhealthy';
    health.errors?.push('POSTGRESQL_DATABASE is missing');
  }

  return NextResponse.json(health, {
    status: health.status === 'healthy' ? 200 : 503,
  });
}
