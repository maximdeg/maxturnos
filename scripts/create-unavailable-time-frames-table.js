const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.POSTGRESQL_HOST || 'localhost',
  port: parseInt(process.env.POSTGRESQL_PORT || '5432'),
  database: process.env.POSTGRESQL_DATABASE || 'MaxTurnos_db',
  user: process.env.POSTGRESQL_USER || 'postgres',
  password: process.env.POSTGRESQL_PASSWORD,
});

async function createUnavailableTimeFramesTable() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS unavailable_time_frames (
        id SERIAL PRIMARY KEY,
        workday_date DATE NOT NULL,
        start_time TIME WITHOUT TIME ZONE NOT NULL,
        end_time TIME WITHOUT TIME ZONE NOT NULL,
        work_schedule_id INTEGER REFERENCES work_schedule(id) ON DELETE SET NULL,
        user_account_id INTEGER NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        
        CONSTRAINT chk_time_frame_range CHECK (end_time > start_time),
        CONSTRAINT chk_time_frame_date CHECK (workday_date >= CURRENT_DATE),
        CONSTRAINT unique_time_frame UNIQUE (user_account_id, workday_date, start_time, end_time)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_unavailable_time_frames_user_date ON unavailable_time_frames (user_account_id, workday_date);
      CREATE INDEX IF NOT EXISTS idx_unavailable_time_frames_date ON unavailable_time_frames (workday_date);
      CREATE INDEX IF NOT EXISTS idx_unavailable_time_frames_user ON unavailable_time_frames (user_account_id);
    `);

    await client.query('COMMIT');
    console.log('✅ Tabla unavailable_time_frames creada exitosamente');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error al crear tabla unavailable_time_frames:', error);
    throw error;
  } finally {
    client.release();
  }
}

createUnavailableTimeFramesTable()
  .then(() => {
    pool.end();
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    pool.end();
    process.exit(1);
  });
