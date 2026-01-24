const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.POSTGRESQL_HOST || 'localhost',
  port: parseInt(process.env.POSTGRESQL_PORT || '5432'),
  database: process.env.POSTGRESQL_DATABASE || 'MaxTurnos_db',
  user: process.env.POSTGRESQL_USER || 'postgres',
  password: process.env.POSTGRESQL_PASSWORD,
});

async function createUserAccountsTable() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Crear tabla user_accounts
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_accounts (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(255) UNIQUE,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        whatsapp_phone_number VARCHAR(20),
        email_verified BOOLEAN DEFAULT FALSE NOT NULL,
        verification_token VARCHAR(255),
        verification_token_expires TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // Crear índices
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_accounts_username ON user_accounts (username);
      CREATE INDEX IF NOT EXISTS idx_user_accounts_email ON user_accounts (email);
    `);

    await client.query('COMMIT');
    console.log('✅ Tabla user_accounts creada exitosamente');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error al crear tabla user_accounts:', error);
    throw error;
  } finally {
    client.release();
  }
}

createUserAccountsTable()
  .then(() => {
    pool.end();
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    pool.end();
    process.exit(1);
  });
