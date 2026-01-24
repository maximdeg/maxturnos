import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { invalidateScheduleCache } from '@/lib/cache';
import { apiLogger, logApiRequest } from '@/lib/logger';
import { getUsernameByUserAccountId } from '@/lib/user-routes';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  
  const authHeader = request.headers.get('authorization');
  const user = await requireAuth(authHeader);

  if (!user) {
    const duration = Date.now() - startTime;
    logApiRequest('DELETE', '/api/proveedor/unavailable-days/[id]', 401, duration);
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 }
    );
  }

  const resolvedParams = await params;
  const unavailableDayId = parseInt(resolvedParams.id);

  if (isNaN(unavailableDayId)) {
    const duration = Date.now() - startTime;
    logApiRequest('DELETE', '/api/proveedor/unavailable-days/[id]', 400, duration);
    return NextResponse.json(
      { error: 'ID inválido' },
      { status: 400 }
    );
  }

  try {
    // Verificar que el día no laborable pertenece al usuario
    const checkResult = await pool.query(
      'SELECT id FROM unavailable_days WHERE id = $1 AND user_account_id = $2',
      [unavailableDayId, user.id]
    );

    if (checkResult.rows.length === 0) {
      const duration = Date.now() - startTime;
      logApiRequest('DELETE', '/api/proveedor/unavailable-days/[id]', 404, duration);
      return NextResponse.json(
        { error: 'Día no laborable no encontrado' },
        { status: 404 }
      );
    }

    await pool.query(
      'DELETE FROM unavailable_days WHERE id = $1 AND user_account_id = $2',
      [unavailableDayId, user.id]
    );

    // Invalidar caché de horarios
    const username = await getUsernameByUserAccountId(user.id);
    if (username) {
      await invalidateScheduleCache(user.id, username);
    }

    const duration = Date.now() - startTime;
    logApiRequest('DELETE', '/api/proveedor/unavailable-days/[id]', 200, duration);

    return NextResponse.json({
      success: true,
      message: 'Día no laborable eliminado exitosamente',
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    apiLogger.error({ error, unavailableDayId, userId: user.id, duration }, 'Error in delete unavailable day endpoint');
    logApiRequest('DELETE', '/api/proveedor/unavailable-days/[id]', 500, duration);

    return NextResponse.json(
      { error: 'Error al eliminar día no laborable' },
      { status: 500 }
    );
  }
}
