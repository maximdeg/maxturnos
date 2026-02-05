import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { logApiRequest } from '@/lib/logger';

/**
 * GET /api/visit-types
 * Devuelve los tipos de visita disponibles (para formularios y tests).
 */
export async function GET() {
  const startTime = Date.now();

  try {
    const result = await pool.query(
      `SELECT id, name, description FROM visit_types ORDER BY id`
    );

    const duration = Date.now() - startTime;
    logApiRequest('GET', '/api/visit-types', 200, duration);

    return NextResponse.json(result.rows);
  } catch (err) {
    const duration = Date.now() - startTime;
    logApiRequest('GET', '/api/visit-types', 200, duration);
    // Fallback estático si la tabla no existe o falla (devolvemos 200 para no romper clientes)
    return NextResponse.json([
      { id: 1, name: 'Consulta', description: 'Consulta médica general' },
      { id: 2, name: 'Practica', description: 'Procedimiento o práctica médica' },
    ]);
  }
}
