const bcrypt = require('bcryptjs');
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

async function testAdminLogin() {
  const client = await pool.connect();
  try {
    const email = 'maxim.degtiarev.dev@gmail.com';
    const password = 'SuperAdmin2024!';

    console.log('🔐 Probando login de administrador...\n');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}\n`);

    // Simular la lógica del endpoint de login
    // Buscar primero en user_accounts
    let result = await client.query(
      `SELECT id, email, username, password, email_verified, 'provider' as user_type
       FROM user_accounts
       WHERE email = $1`,
      [email]
    );

    // Si no se encuentra, buscar en users
    if (result.rows.length === 0) {
      console.log('📋 Usuario no encontrado en user_accounts, buscando en users...');
      result = await client.query(
        `SELECT id, email, NULL as username, password, true as email_verified, 'admin' as user_type, role
         FROM users
         WHERE email = $1`,
        [email]
      );
    }

    if (result.rows.length === 0) {
      console.log('❌ Usuario no encontrado en ninguna tabla');
      return;
    }

    const user = result.rows[0];
    console.log('✅ Usuario encontrado:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Tipo: ${user.user_type}`);
    if (user.role) {
      console.log(`   Role: ${user.role}`);
    }
    console.log(`   Email verificado: ${user.email_verified}\n`);

    // Verificar contraseña
    console.log('🔐 Verificando contraseña...');
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (passwordMatch) {
      console.log('✅ Contraseña correcta!');
      console.log('\n✅ Login exitoso! El usuario puede autenticarse correctamente.');
    } else {
      console.log('❌ Contraseña incorrecta');
      console.log('\n⚠️  El hash de la contraseña no coincide.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

testAdminLogin()
  .then(() => {
    pool.end();
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    pool.end();
    process.exit(1);
  });
