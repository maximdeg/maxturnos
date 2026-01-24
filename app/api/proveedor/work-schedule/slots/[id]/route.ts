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
    logApiRequest('DELETE', '/api/proveedor/work-schedule/slots/[id]', 401, duration);
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 }
    );
  }

  const resolvedParams = await params;
  const slotId = parseInt(resolvedParams.id);

  if (isNaN(slotId)) {
    const duration = Date.now() - startTime;
    logApiRequest('DELETE', '/api/proveedor/work-schedule/slots/[id]', 400, duration);
    return NextResponse.json(
      { error: 'ID de slot inválido' },
      { status: 400 }
    );
  }

  try {
    // Verificar que el slot pertenece al usuario
    const slotCheck = await pool.query(
      `SELECT id, user_account_id FROM available_slots WHERE id = $1`,
      [slotId]
    );

    if (slotCheck.rows.length === 0) {
      const duration = Date.now() - startTime;
      logApiRequest('DELETE', '/api/proveedor/work-schedule/slots/[id]', 404, duration);
      return NextResponse.json(
        { error: 'Franja horaria no encontrada' },
        { status: 404 }
      );
    }

    if (slotCheck.rows[0].user_account_id !== user.id) {
      const duration = Date.now() - startTime;
      logApiRequest('DELETE', '/api/proveedor/work-schedule/slots/[id]', 403, duration);
      return NextResponse.json(
        { error: 'No tienes permiso para eliminar esta franja horaria' },
        { status: 403 }
      );
    }

    // Verificar si hay citas programadas en este horario
    const appointmentsCheck = await pool.query(
      `SELECT COUNT(*) as count
       FROM appointments a
       JOIN available_slots asl ON 
         a.user_account_id = asl.user_account_id
         AND a.appointment_time >= asl.start_time
         AND a.appointment_time < asl.end_time
       WHERE asl.id = $1
         AND a.status = 'scheduled'
         AND a.appointment_date >= CURRENT_DATE`,
      [slotId]
    );

    const appointmentsCount = parseInt(appointmentsCheck.rows[0].count);

    if (appointmentsCount > 0) {
      const duration = Date.now() - startTime;
      logApiRequest('DELETE', '/api/proveedor/work-schedule/slots/[id]', 400, duration);
      return NextResponse.json(
        { 
          error: 'No se puede eliminar la franja horaria',
          message: `Existen ${appointmentsCount} cita(s) programada(s) en este horario`
        },
        { status: 400 }
      );
    }

    // Eliminar el slot
    await pool.query(
      `DELETE FROM available_slots WHERE id = $1 AND user_account_id = $2`,
      [slotId, user.id]
    );

    // Invalidar caché de horarios
    const username = await getUsernameByUserAccountId(user.id);
    if (username) {
      await invalidateScheduleCache(user.id, username);
    }

    const duration = Date.now() - startTime;
    logApiRequest('DELETE', '/api/proveedor/work-schedule/slots/[id]', 200, duration);

    return NextResponse.json({
      success: true,
      message: 'Franja horaria eliminada exitosamente',
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    apiLogger.error({ error, userId: user.id, slotId, duration }, 'Error in delete slot endpoint');
    logApiRequest('DELETE', '/api/proveedor/work-schedule/slots/[id]', 500, duration);

    return NextResponse.json(
      { error: 'Error al eliminar franja horaria' },
      { status: 500 }
    );
  }
}
