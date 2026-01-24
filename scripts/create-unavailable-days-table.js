const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.POSTGRESQL_HOST || 'localhost',
  port: parseInt(process.env.POSTGRESQL_PORT || '5432'),
  database: process.env.POSTGRESQL_DATABASE || 'MaxTurnos_db',
  user: process.env.POSTGRESQL_USER || 'postgres',
  password: process.env.POSTGRESQL_PASSWORD,
});

async function createUnavailableDaysTable() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS unavailable_days (
        id SERIAL PRIMARY KEY,
        user_account_id INTEGER NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
        unavailable_date DATE NOT NULL,
        is_confirmed BOOLEAN DEFAULT FALSE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        
        CONSTRAINT chk_unavailable_date CHECK (unavailable_date >= CURRENT_DATE),
        UNIQUE(user_account_id, unavailable_date)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_unavailable_days_date ON unavailable_days (unavailable_date);
      CREATE INDEX IF NOT EXISTS idx_unavailable_days_user ON unavailable_days (user_account_id);
      CREATE INDEX IF NOT EXISTS idx_unavailable_days_user_date ON unavailable_days (user_account_id, unavailable_date);
    `);

    await client.query('COMMIT');
    console.log('✅ Tabla unavailable_days creada exitosamente');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error al crear tabla unavailable_days:', error);
    throw error;
  } finally {
    client.release();
  }
}

createUnavailableDaysTable()
  .then(() => {
    pool.end();
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    pool.end();
    process.exit(1);
  });
