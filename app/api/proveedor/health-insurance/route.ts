import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { apiLogger, logApiRequest } from '@/lib/logger';
import { getOrSetCache, cacheKeys, deleteCache } from '@/lib/cache';
import { pool } from '@/lib/db';
import { HealthInsurance } from '@/lib/types';

async function readObrasSociales(): Promise<HealthInsurance[]> {
  const result = await pool.query(
    'SELECT id, name, price, notes FROM health_insurance ORDER BY id'
  );
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    price: row.price ?? null,
    price_numeric: null,
    notes: row.notes ?? null,
  }));
}

async function writeObrasSociales(
  items: { name: string; price?: string | null; notes?: string | null }[]
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM health_insurance');
    for (const item of items) {
      await client.query(
        'INSERT INTO health_insurance (name, price, notes) VALUES ($1, $2, $3)',
        [item.name, item.price ?? null, item.notes ?? null]
      );
    }
    await client.query('COMMIT');
    await deleteCache(cacheKeys.healthInsurance());
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const authHeader = request.headers.get('authorization');
  const user = await requireAuth(authHeader);

  if (!user) {
    const duration = Date.now() - startTime;
    logApiRequest('GET', '/api/proveedor/health-insurance', 401, duration);
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const data = await getOrSetCache<HealthInsurance[]>(
      cacheKeys.healthInsurance(),
      async () => {
        const raw = await readObrasSociales();
        return raw.map((item, index) => ({
          id: item.id ?? index + 1,
          name: item.name,
          price: item.price ?? null,
          price_numeric: item.price_numeric ?? null,
          notes: item.notes ?? null,
        }));
      },
      3600
    );
    const duration = Date.now() - startTime;
    logApiRequest('GET', '/api/proveedor/health-insurance', 200, duration);
    return NextResponse.json(data);
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    apiLogger.error(
      { error: error instanceof Error ? error.message : String(error) },
      'Error in GET /api/proveedor/health-insurance'
    );
    logApiRequest('GET', '/api/proveedor/health-insurance', 500, duration);
    return NextResponse.json(
      { error: 'Error al obtener obras sociales' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const authHeader = request.headers.get('authorization');
  const user = await requireAuth(authHeader);

  if (!user) {
    const duration = Date.now() - startTime;
    logApiRequest('POST', '/api/proveedor/health-insurance', 401, duration);
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json(
        { error: 'El nombre es obligatorio' },
        { status: 400 }
      );
    }

    const items = await readObrasSociales();
    if (items.some((i) => i.name.toLowerCase() === name.toLowerCase())) {
      return NextResponse.json(
        { error: 'Ya existe una obra social con ese nombre' },
        { status: 409 }
      );
    }

    const price = typeof body.price === 'string' ? body.price.trim() || null : null;
    const notes = typeof body.notes === 'string' ? body.notes.trim() || null : null;
    items.push({ name, price, notes });
    await writeObrasSociales(items);

    const duration = Date.now() - startTime;
    logApiRequest('POST', '/api/proveedor/health-insurance', 200, duration);
    return NextResponse.json({ success: true, name });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    apiLogger.error(
      { error: error instanceof Error ? error.message : String(error) },
      'Error in POST /api/proveedor/health-insurance'
    );
    logApiRequest('POST', '/api/proveedor/health-insurance', 500, duration);
    return NextResponse.json(
      { error: 'Error al agregar obra social' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  const authHeader = request.headers.get('authorization');
  const user = await requireAuth(authHeader);

  if (!user) {
    const duration = Date.now() - startTime;
    logApiRequest('PUT', '/api/proveedor/health-insurance', 401, duration);
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const currentName = typeof body.currentName === 'string' ? body.currentName.trim() : '';
    if (!currentName) {
      return NextResponse.json(
        { error: 'currentName es obligatorio para identificar la obra social' },
        { status: 400 }
      );
    }

    const items = await readObrasSociales();
    const index = items.findIndex((i) => i.name === currentName);
    if (index === -1) {
      return NextResponse.json(
        { error: 'No se encontró la obra social' },
        { status: 404 }
      );
    }

    const updated = { ...items[index] };
    if (typeof body.name === 'string' && body.name.trim()) updated.name = body.name.trim();
    if (body.price !== undefined) updated.price = typeof body.price === 'string' ? body.price.trim() || null : null;
    if (body.notes !== undefined) updated.notes = typeof body.notes === 'string' ? body.notes.trim() || null : null;

    if (
      updated.name !== currentName &&
      items.some((i) => i.name.toLowerCase() === updated.name!.toLowerCase() && i.name !== currentName)
    ) {
      return NextResponse.json(
        { error: 'Ya existe otra obra social con ese nombre' },
        { status: 409 }
      );
    }

    items[index] = updated;
    await writeObrasSociales(items);

    const duration = Date.now() - startTime;
    logApiRequest('PUT', '/api/proveedor/health-insurance', 200, duration);
    return NextResponse.json({ success: true, name: updated.name });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    apiLogger.error(
      { error: error instanceof Error ? error.message : String(error) },
      'Error in PUT /api/proveedor/health-insurance'
    );
    logApiRequest('PUT', '/api/proveedor/health-insurance', 500, duration);
    return NextResponse.json(
      { error: 'Error al actualizar obra social' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const startTime = Date.now();
  const authHeader = request.headers.get('authorization');
  const user = await requireAuth(authHeader);

  if (!user) {
    const duration = Date.now() - startTime;
    logApiRequest('DELETE', '/api/proveedor/health-insurance', 401, duration);
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json(
        { error: 'El nombre de la obra social es obligatorio' },
        { status: 400 }
      );
    }

    const items = await readObrasSociales();
    const filtered = items.filter((i) => i.name !== name);
    if (filtered.length === items.length) {
      return NextResponse.json(
        { error: 'No se encontró la obra social' },
        { status: 404 }
      );
    }

    await writeObrasSociales(filtered);

    const duration = Date.now() - startTime;
    logApiRequest('DELETE', '/api/proveedor/health-insurance', 200, duration);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    apiLogger.error(
      { error: error instanceof Error ? error.message : String(error) },
      'Error in DELETE /api/proveedor/health-insurance'
    );
    logApiRequest('DELETE', '/api/proveedor/health-insurance', 500, duration);
    return NextResponse.json(
      { error: 'Error al eliminar obra social' },
      { status: 500 }
    );
  }
}
