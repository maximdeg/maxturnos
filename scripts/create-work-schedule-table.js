const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.POSTGRESQL_HOST || 'localhost',
  port: parseInt(process.env.POSTGRESQL_PORT || '5432'),
  database: process.env.POSTGRESQL_DATABASE || 'MaxTurnos_db',
  user: process.env.POSTGRESQL_USER || 'postgres',
  password: process.env.POSTGRESQL_PASSWORD,
});

async function createWorkScheduleTable() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS work_schedule (
        id SERIAL PRIMARY KEY,
        user_account_id INTEGER NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
        day_of_week VARCHAR(10) NOT NULL,
        is_working_day BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        UNIQUE(user_account_id, day_of_week)
      );
    `);

    await client.query('COMMIT');
    console.log('✅ Tabla work_schedule creada exitosamente');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error al crear tabla work_schedule:', error);
    throw error;
  } finally {
    client.release();
  }
}

createWorkScheduleTable()
  .then(() => {
    pool.end();
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    pool.end();
    process.exit(1);
  });
