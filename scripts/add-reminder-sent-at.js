/**
 * Migración: agrega columna reminder_sent_at a appointments
 * para registrar cuándo se envió el recordatorio por WhatsApp (30h antes).
 *
 * Uso: node scripts/add-reminder-sent-at.js
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.POSTGRESQL_HOST || 'localhost',
  port: parseInt(process.env.POSTGRESQL_PORT || '5432'),
  database: process.env.POSTGRESQL_DATABASE || 'MaxTurnos_db',
  user: process.env.POSTGRESQL_USER || 'postgres',
  password: process.env.POSTGRESQL_PASSWORD,
  ssl:
    process.env.POSTGRESQL_SSL_MODE === 'require' ||
    process.env.POSTGRESQL_SSL_MODE === 'verify-full'
      ? {
          rejectUnauthorized: process.env.POSTGRESQL_SSL_MODE === 'verify-full',
          ca: process.env.POSTGRESQL_CA_CERT,
        }
      : false,
});

async function run() {
  const client = await pool.connect();
  try {
    const check = await client.query(
      `SELECT 1 FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'reminder_sent_at'`
    );
    if (check.rows.length > 0) {
      console.log('✅ Columna reminder_sent_at ya existe en appointments.');
      return;
    }
    await client.query(`
      ALTER TABLE appointments 
      ADD COLUMN reminder_sent_at TIMESTAMP WITH TIME ZONE
    `);
    console.log('✅ Columna reminder_sent_at agregada a appointments.');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
