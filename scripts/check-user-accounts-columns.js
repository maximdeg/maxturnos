const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const sslConfig = process.env.POSTGRESQL_SSL_MODE === 'require' || 
                  process.env.POSTGRESQL_SSL_MODE === 'verify-full'
  ? {
      rejectUnauthorized: process.env.POSTGRESQL_SSL_MODE === 'verify-full',
      ca: process.env.POSTGRESQL_CA_CERT,
    }
  : false;

const pool = new Pool({
  host: process.env.POSTGRESQL_HOST || 'localhost',
  port: parseInt(process.env.POSTGRESQL_PORT || '5432'),
  database: process.env.POSTGRESQL_DATABASE || 'MaxTurnos_db',
  user: process.env.POSTGRESQL_USER || 'postgres',
  password: process.env.POSTGRESQL_PASSWORD,
  ssl: sslConfig,
});

async function checkColumns() {
  try {
    const result = await pool.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'user_accounts' 
       ORDER BY ordinal_position`
    );

    console.log('Columnas en user_accounts:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });

    // También verificar un registro de ejemplo
    const example = await pool.query('SELECT * FROM user_accounts LIMIT 1');
    if (example.rows.length > 0) {
      console.log('\nEjemplo de registro:');
      console.log(JSON.stringify(example.rows[0], null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    pool.end();
  }
}

checkColumns();
