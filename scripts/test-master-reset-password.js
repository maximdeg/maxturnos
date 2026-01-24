const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
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

async function testMasterResetPassword() {
  const client = await pool.connect();
  try {
    console.log('🔐 Probando endpoint master reset password...\n');

    // Primero necesitamos hacer login como super_admin para obtener el token
    const loginEmail = 'maxim.degtiarev.dev@gmail.com';
    const loginPassword = 'SuperAdmin2024!';

    console.log('1️⃣ Haciendo login como super_admin...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: loginEmail,
        password: loginPassword,
      }),
    });

    if (!loginResponse.ok) {
      console.error('❌ Error al hacer login:', await loginResponse.text());
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;

    if (!token) {
      console.error('❌ No se recibió token del login');
      return;
    }

    console.log('✅ Login exitoso, token obtenido\n');

    // Ahora probar el endpoint master reset password
    console.log('2️⃣ Probando master reset password...');
    
    // Ejemplo: Cambiar contraseña de un usuario de prueba
    const targetEmail = 'maxdegdev.test@gmail.com';
    const newPassword = 'NewPassword123!';

    const resetResponse = await fetch('http://localhost:3000/api/admin/master-reset-password', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: targetEmail,
        new_password: newPassword,
      }),
    });

    const resetData = await resetResponse.json();

    if (resetResponse.ok) {
      console.log('✅ Contraseña cambiada exitosamente!');
      console.log('\n📝 Detalles:');
      console.log(JSON.stringify(resetData, null, 2));
      
      // Verificar que la contraseña fue cambiada
      console.log('\n3️⃣ Verificando que la contraseña fue cambiada...');
      const verifyResult = await client.query(
        'SELECT id, email, role FROM users WHERE email = $1',
        [targetEmail]
      );

      if (verifyResult.rows.length > 0) {
        console.log('✅ Usuario encontrado en base de datos');
        console.log(`   ID: ${verifyResult.rows[0].id}`);
        console.log(`   Email: ${verifyResult.rows[0].email}`);
        console.log(`   Role: ${verifyResult.rows[0].role}`);
      }
    } else {
      console.error('❌ Error al cambiar contraseña:');
      console.error(JSON.stringify(resetData, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

testMasterResetPassword()
  .then(() => {
    pool.end();
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    pool.end();
    process.exit(1);
  });
