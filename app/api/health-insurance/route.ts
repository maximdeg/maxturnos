import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getOrSetCache, cacheKeys } from '@/lib/cache';
import { rateLimitMiddleware, getRateLimitIdentifier } from '@/lib/rate-limit';
import { apiLogger, logApiRequest } from '@/lib/logger';
import { HealthInsurance } from '@/lib/types';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Rate limiting
  const rateLimitResponse = await rateLimitMiddleware(
    getRateLimitIdentifier(request)
  );
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // Obtener del caché o leer archivo
    const normalizedData = await getOrSetCache<HealthInsurance[]>(
      cacheKeys.healthInsurance(),
      async () => {
        try {
          // Leer archivo de obras sociales
          const filePath = join(process.cwd(), 'data', 'obras-sociales.json');
          const fileContent = readFileSync(filePath, 'utf-8');
          const obrasSociales: HealthInsurance[] = JSON.parse(fileContent);

          // Normalizar estructura de datos
          return obrasSociales.map((item, index) => ({
            id: index + 1,
            name: item.name,
            price: item.price || null,
            price_numeric: item.price_numeric || null,
            notes: item.notes || null,
          }));
        } catch (fileError: any) {
          apiLogger.error({ error: fileError, filePath: join(process.cwd(), 'data', 'obras-sociales.json') }, 'Error reading obras-sociales.json');
          throw new Error(`Error al leer archivo de obras sociales: ${fileError.message}`);
        }
      },
      3600 // 1 hora TTL (datos de referencia cambian poco)
    );

    const duration = Date.now() - startTime;
    logApiRequest('GET', '/api/health-insurance', 200, duration);

    return NextResponse.json(normalizedData);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    apiLogger.error({ 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration 
    }, 'Error in health-insurance endpoint');
    logApiRequest('GET', '/api/health-insurance', 500, duration);

    return NextResponse.json(
      { 
        error: 'Error al obtener obras sociales',
        message: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    );
  }
}
