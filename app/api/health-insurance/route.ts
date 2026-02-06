import { NextRequest, NextResponse } from 'next/server';
import { getOrSetCache, cacheKeys } from '@/lib/cache';
import { rateLimitMiddleware, getRateLimitIdentifier } from '@/lib/rate-limit';
import { apiLogger, logApiRequest } from '@/lib/logger';
import { pool } from '@/lib/db';
import { HealthInsurance } from '@/lib/types';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  const rateLimitResponse = await rateLimitMiddleware(
    getRateLimitIdentifier(request)
  );
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const normalizedData = await getOrSetCache<HealthInsurance[]>(
      cacheKeys.healthInsurance(),
      async () => {
        const result = await pool.query(
          'SELECT id, name, price, notes FROM health_insurance ORDER BY id'
        );
        return result.rows.map((row, index) => ({
          id: row.id ?? index + 1,
          name: row.name,
          price: row.price ?? null,
          price_numeric: null,
          notes: row.notes ?? null,
        }));
      },
      3600
    );

    const duration = Date.now() - startTime;
    logApiRequest('GET', '/api/health-insurance', 200, duration);

    return NextResponse.json(normalizedData);
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    apiLogger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        duration,
      },
      'Error in health-insurance endpoint'
    );
    logApiRequest('GET', '/api/health-insurance', 500, duration);

    return NextResponse.json(
      {
        error: 'Error al obtener obras sociales',
        message:
          process.env.NODE_ENV === 'development'
            ? (error instanceof Error ? error.message : String(error))
            : undefined,
      },
      { status: 500 }
    );
  }
}
