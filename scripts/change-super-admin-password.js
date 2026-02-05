/**
 * Cambia la contraseña del super_admin directamente en la base de datos.
 * Útil cuando olvidaste la contraseña y no podés iniciar sesión en /admin/login.
 *
 * Uso:
 *   node scripts/change-super-admin-password.js
 *   # El script usa el email y la nueva contraseña de las variables de entorno:
 *
 *   SUPER_ADMIN_EMAIL=tu@email.com NEW_PASSWORD="NuevaContraseña123!" node scripts/change-super-admin-password.js
 *
 * Requisitos: .env.local con POSTGRESQL_* configurado.
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const sslConfig =
  process.env.POSTGRESQL_SSL_MODE === 'require' ||
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

async function changeSuperAdminPassword() {
  const email = (process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
  const newPassword = process.env.NEW_PASSWORD;

  if (!email || !newPassword) {
    console.error('❌ Faltan variables de entorno.');
    console.error('');
    console.error('Uso:');
    console.error('  SUPER_ADMIN_EMAIL=tu@email.com NEW_PASSWORD="TuNuevaContraseña123!" node scripts/change-super-admin-password.js');
    console.error('');
    process.exit(1);
  }

  if (newPassword.length < 8) {
    console.error('❌ La contraseña debe tener al menos 8 caracteres.');
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    const userResult = await client.query(
      'SELECT id, email, role FROM users WHERE LOWER(TRIM(email)) = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      console.error(`❌ No existe un usuario en la tabla "users" con email: ${email}`);
      console.error('   Los super_admin están en la tabla "users". Verificá el email o creá uno con: node scripts/create-super-admin.js');
      process.exit(1);
    }

    const user = userResult.rows[0];
    if (user.role !== 'super_admin') {
      console.error(`⚠️  El usuario ${email} tiene role "${user.role}", no "super_admin".`);
      console.error('   Se actualizará la contraseña de todos modos.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await client.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, user.id]
    );

    console.log('✅ Contraseña del super_admin actualizada.');
    console.log(`   Email: ${user.email}`);
    console.log('');
    console.log('   Podés iniciar sesión en /admin/login con esta nueva contraseña.');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

changeSuperAdminPassword();
