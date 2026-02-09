import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { sendAppointmentReminder, isWhatsAppConfigured } from '@/lib/whatsapp';
import { apiLogger, logApiRequest } from '@/lib/logger';

const ARGENTINA_TZ = 'America/Argentina/Buenos_Aires';
const REMINDER_HOURS_MIN = 29;
const REMINDER_HOURS_MAX = 31;

function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) return 'http://localhost:3000';
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    apiLogger.warn('CRON_SECRET not set, cron send-reminders is disabled');
    return false;
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7) === secret;
  }
  const cronSecret = request.headers.get('x-cron-secret');
  return cronSecret === secret;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  if (!isAuthorized(request)) {
    logApiRequest('GET', '/api/cron/send-reminders', 401, Date.now() - startTime);
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  if (!isWhatsAppConfigured()) {
    logApiRequest('GET', '/api/cron/send-reminders', 200, Date.now() - startTime);
    return NextResponse.json({
      ok: true,
      sent: 0,
      message: 'WhatsApp no configurado, no se envían recordatorios',
    });
  }

  try {
    const result = await pool.query(
      `SELECT 
        a.id,
        a.appointment_date,
        a.appointment_time,
        a.cancellation_token,
        a.user_account_id,
        c.first_name,
        c.last_name,
        c.phone_number,
        ua.username AS provider_username,
        ua.first_name AS provider_first_name,
        ua.last_name AS provider_last_name
       FROM appointments a
       JOIN clients c ON a.client_id = c.id
       JOIN user_accounts ua ON a.user_account_id = ua.id
       WHERE a.status = 'scheduled'
         AND (a.reminder_sent_at IS NULL)
         AND ((a.appointment_date + a.appointment_time) AT TIME ZONE $1)
           BETWEEN (CURRENT_TIMESTAMP + INTERVAL '${REMINDER_HOURS_MIN} hours')
           AND (CURRENT_TIMESTAMP + INTERVAL '${REMINDER_HOURS_MAX} hours')`,
      [ARGENTINA_TZ]
    );

    const rows = result.rows as Array<{
      id: number;
      appointment_date: Date;
      appointment_time: string;
      cancellation_token: string | null;
      user_account_id: number;
      first_name: string;
      last_name: string;
      phone_number: string;
      provider_username: string;
      provider_first_name: string | null;
      provider_last_name: string | null;
    }>;

    const baseUrl = getAppUrl();
    let sent = 0;
    const errors: Array<{ appointmentId: number; error: string }> = [];

    for (const row of rows) {
      const detailsUrl = `${baseUrl}/${row.provider_username}/cita/${row.id}${row.cancellation_token ? `?token=${row.cancellation_token}` : ''}`;
      const providerName = [row.provider_first_name, row.provider_last_name].filter(Boolean).join(' ').trim() || row.provider_username;
      const dateStr = row.appointment_date instanceof Date
        ? row.appointment_date.toISOString().split('T')[0]
        : String(row.appointment_date).split('T')[0];
      const timeStr = typeof row.appointment_time === 'string'
        ? row.appointment_time.substring(0, 5)
        : String(row.appointment_time).substring(0, 5);

      const reminderResult = await sendAppointmentReminder(row.phone_number, {
        patientName: `${row.first_name} ${row.last_name}`,
        providerName,
        date: dateStr,
        time: timeStr,
        detailsUrl,
      });

      if (reminderResult.success) {
        await pool.query(
          'UPDATE appointments SET reminder_sent_at = CURRENT_TIMESTAMP WHERE id = $1',
          [row.id]
        );
        sent++;
      } else {
        errors.push({ appointmentId: row.id, error: reminderResult.error || 'Unknown error' });
        apiLogger.warn({ appointmentId: row.id, error: reminderResult.error }, 'Failed to send reminder WhatsApp');
      }
    }

    const duration = Date.now() - startTime;
    logApiRequest('GET', '/api/cron/send-reminders', 200, duration);
    return NextResponse.json({
      ok: true,
      sent,
      total: rows.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    apiLogger.error({ error }, 'Cron send-reminders failed');
    logApiRequest('GET', '/api/cron/send-reminders', 500, duration);
    const message = error instanceof Error ? error.message : 'Error al enviar recordatorios';
    const isMissingColumn = typeof message === 'string' && message.includes('reminder_sent_at');
    return NextResponse.json(
      {
        error: message,
        ...(isMissingColumn && {
          hint: 'Ejecutá la migración: node scripts/add-reminder-sent-at.js',
        }),
      },
      { status: isMissingColumn ? 503 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
