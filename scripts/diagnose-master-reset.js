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

async function diagnoseMasterReset() {
  const client = await pool.connect();
  try {
    // Obtener email del argumento de línea de comandos o usar uno por defecto
    const email = process.argv[2] || 'maxdegdev.test@gmail.com';
    const username = process.argv[3] || null;

    console.log('🔍 Diagnóstico de Master Reset Password\n');
    console.log(`Email buscado: "${email}"`);
    console.log(`Username buscado: ${username || 'no proporcionado'}\n`);

    // Buscar en user_accounts
    console.log('1️⃣ Buscando en user_accounts...');
    
    let query;
    let params;
    
    if (username) {
      query = 'SELECT id, email, username FROM user_accounts WHERE email = $1 AND username = $2';
      params = [email, username];
    } else {
      query = 'SELECT id, email, username FROM user_accounts WHERE email = $1';
      params = [email];
    }
    
    const userAccountsResult = await client.query(query, params);
    
    console.log(`   Resultados encontrados: ${userAccountsResult.rows.length}`);
    if (userAccountsResult.rows.length > 0) {
      console.log('   ✅ Usuario encontrado en user_accounts:');
      userAccountsResult.rows.forEach((row, idx) => {
        console.log(`      [${idx + 1}] ID: ${row.id}, Email: "${row.email}", Username: "${row.username}"`);
      });
    } else {
      console.log('   ❌ No encontrado en user_accounts');
      
      // Buscar con LIKE para ver si hay emails similares
      const similarResult = await client.query(
        'SELECT id, email, username FROM user_accounts WHERE email ILIKE $1',
        [`%${email}%`]
      );
      
      if (similarResult.rows.length > 0) {
        console.log(`   ⚠️  Emails similares encontrados (${similarResult.rows.length}):`);
        similarResult.rows.forEach((row, idx) => {
          console.log(`      [${idx + 1}] ID: ${row.id}, Email: "${row.email}", Username: "${row.username}"`);
        });
      }
    }

    // Buscar en users
    console.log('\n2️⃣ Buscando en users...');
    const usersResult = await client.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [email]
    );
    
    console.log(`   Resultados encontrados: ${usersResult.rows.length}`);
    if (usersResult.rows.length > 0) {
      console.log('   ✅ Usuario encontrado en users:');
      usersResult.rows.forEach((row, idx) => {
        console.log(`      [${idx + 1}] ID: ${row.id}, Email: "${row.email}", Role: "${row.role}"`);
      });
    } else {
      console.log('   ❌ No encontrado en users');
      
      // Buscar con LIKE para ver si hay emails similares
      const similarResult = await client.query(
        'SELECT id, email, role FROM users WHERE email ILIKE $1',
        [`%${email}%`]
      );
      
      if (similarResult.rows.length > 0) {
        console.log(`   ⚠️  Emails similares encontrados (${similarResult.rows.length}):`);
        similarResult.rows.forEach((row, idx) => {
          console.log(`      [${idx + 1}] ID: ${row.id}, Email: "${row.email}", Role: "${row.role}"`);
        });
      }
    }

    // Verificar todos los usuarios en ambas tablas
    console.log('\n3️⃣ Listando todos los usuarios en user_accounts...');
    const allProviders = await client.query(
      'SELECT id, email, username FROM user_accounts ORDER BY id LIMIT 10'
    );
    console.log(`   Total encontrados: ${allProviders.rows.length}`);
    allProviders.rows.forEach((row) => {
      console.log(`      ID: ${row.id}, Email: "${row.email}", Username: "${row.username}"`);
    });

    console.log('\n4️⃣ Listando todos los usuarios en users...');
    const allAdmins = await client.query(
      'SELECT id, email, role FROM users ORDER BY id LIMIT 10'
    );
    console.log(`   Total encontrados: ${allAdmins.rows.length}`);
    allAdmins.rows.forEach((row) => {
      console.log(`      ID: ${row.id}, Email: "${row.email}", Role: "${row.role}"`);
    });

    console.log('\n📝 Resumen:');
    console.log(`   Email buscado: "${email}"`);
    console.log(`   En user_accounts: ${userAccountsResult.rows.length > 0 ? '✅ Encontrado' : '❌ No encontrado'}`);
    console.log(`   En users: ${usersResult.rows.length > 0 ? '✅ Encontrado' : '❌ No encontrado'}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

diagnoseMasterReset()
  .then(() => {
    pool.end();
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    pool.end();
    process.exit(1);
  });
