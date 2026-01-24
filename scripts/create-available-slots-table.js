const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.POSTGRESQL_HOST || 'localhost',
  port: parseInt(process.env.POSTGRESQL_PORT || '5432'),
  database: process.env.POSTGRESQL_DATABASE || 'MaxTurnos_db',
  user: process.env.POSTGRESQL_USER || 'postgres',
  password: process.env.POSTGRESQL_PASSWORD,
});

async function createAvailableSlotsTable() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS available_slots (
        id SERIAL PRIMARY KEY,
        work_schedule_id INTEGER NOT NULL REFERENCES work_schedule(id) ON DELETE CASCADE,
        user_account_id INTEGER NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
        start_time TIME WITHOUT TIME ZONE NOT NULL,
        end_time TIME WITHOUT TIME ZONE NOT NULL,
        is_available BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        
        CONSTRAINT chk_time_range CHECK (end_time > start_time),
        CONSTRAINT unique_slot_per_day UNIQUE (work_schedule_id, start_time, end_time)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_available_slots_work_schedule ON available_slots (work_schedule_id);
      CREATE INDEX IF NOT EXISTS idx_available_slots_user_account ON available_slots (user_account_id);
      CREATE INDEX IF NOT EXISTS idx_available_slots_available ON available_slots (is_available) WHERE is_available = true;
    `);

    await client.query('COMMIT');
    console.log('✅ Tabla available_slots creada exitosamente');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error al crear tabla available_slots:', error);
    throw error;
  } finally {
    client.release();
  }
}

createAvailableSlotsTable()
  .then(() => {
    pool.end();
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    pool.end();
    process.exit(1);
  });
