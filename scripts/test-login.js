const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Configurar SSL según el modo especificado
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

async function testLogin() {
  const client = await pool.connect();
  try {
    const email = 'maxim.degtiarev.dev@gmail.com';

    console.log('🔍 Verificando usuario en ambas tablas...\n');

    // Buscar en user_accounts
    const userAccountsResult = await client.query(
      'SELECT id, email, username, email_verified FROM user_accounts WHERE email = $1',
      [email]
    );

    if (userAccountsResult.rows.length > 0) {
      console.log('✅ Usuario encontrado en user_accounts:');
      console.log(JSON.stringify(userAccountsResult.rows[0], null, 2));
    } else {
      console.log('❌ Usuario NO encontrado en user_accounts');
    }

    // Buscar en users
    const usersResult = await client.query(
      'SELECT id, email, full_name, role FROM users WHERE email = $1',
      [email]
    );

    if (usersResult.rows.length > 0) {
      console.log('\n✅ Usuario encontrado en users:');
      console.log(JSON.stringify(usersResult.rows[0], null, 2));
    } else {
      console.log('\n❌ Usuario NO encontrado en users');
    }

    console.log('\n📝 Resumen:');
    console.log(`   Email: ${email}`);
    console.log(`   En user_accounts: ${userAccountsResult.rows.length > 0 ? 'Sí' : 'No'}`);
    console.log(`   En users: ${usersResult.rows.length > 0 ? 'Sí' : 'No'}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

testLogin()
  .then(() => {
    pool.end();
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    pool.end();
    process.exit(1);
  });
