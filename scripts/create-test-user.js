/**
 * Script para crear un usuario de prueba en la base de datos
 * 
 * Uso:
 *   node scripts/create-test-user.js
 * 
 * Requiere variables de entorno de base de datos configuradas.
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: process.env.POSTGRESQL_HOST || 'localhost',
  port: parseInt(process.env.POSTGRESQL_PORT || '5432'),
  database: process.env.POSTGRESQL_DATABASE || 'MaxTurnos_db',
  user: process.env.POSTGRESQL_USER || 'postgres',
  password: process.env.POSTGRESQL_PASSWORD,
  ssl: process.env.POSTGRESQL_SSL_MODE === 'require' ? {
    rejectUnauthorized: false,
  } : false,
});

async function createTestUser() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Credenciales de prueba
    const testEmail = 'test@maxturnos.com';
    const testUsername = 'testprovider';
    const testPassword = 'TestPassword123!'; // Contraseña de prueba
    const testFirstName = 'Test';
    const testLastName = 'Provider';

    // Verificar si el usuario ya existe
    const existingUser = await client.query(
      'SELECT id FROM user_accounts WHERE email = $1 OR username = $2',
      [testEmail, testUsername]
    );

    if (existingUser.rows.length > 0) {
      console.log('⚠️  Usuario de prueba ya existe. Eliminando usuario existente...');
      await client.query('DELETE FROM user_accounts WHERE email = $1 OR username = $2', [
        testEmail,
        testUsername,
      ]);
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(testPassword, 10);

    // Verificar qué columnas existen en la tabla
    const columnsResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_accounts'
      ORDER BY ordinal_position
    `);
    
    const existingColumns = columnsResult.rows.map(row => row.column_name);
    console.log('📋 Columnas disponibles en user_accounts:', existingColumns.join(', '));

    // Construir query dinámicamente basado en columnas disponibles
    const hasFirstName = existingColumns.includes('first_name');
    const hasLastName = existingColumns.includes('last_name');
    const hasWhatsApp = existingColumns.includes('whatsapp_phone_number');

    let insertColumns = ['email', 'username', 'password', 'email_verified'];
    let insertValues = [testEmail, testUsername, hashedPassword, true];
    let placeholders = ['$1', '$2', '$3', '$4'];
    let paramIndex = 5;

    if (hasFirstName) {
      insertColumns.push('first_name');
      insertValues.push(testFirstName);
      placeholders.push(`$${paramIndex++}`);
    }

    if (hasLastName) {
      insertColumns.push('last_name');
      insertValues.push(testLastName);
      placeholders.push(`$${paramIndex++}`);
    }

    if (hasWhatsApp) {
      insertColumns.push('whatsapp_phone_number');
      insertValues.push('+5491112345678');
      placeholders.push(`$${paramIndex++}`);
    }

    // Crear usuario de prueba
    const result = await client.query(
      `INSERT INTO user_accounts (${insertColumns.join(', ')}, created_at, updated_at)
       VALUES (${placeholders.join(', ')}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, email, username, email_verified`,
      insertValues
    );

    await client.query('COMMIT');

    const user = result.rows[0];
    
    console.log('\n✅ Usuario de prueba creado exitosamente!\n');
    console.log('📋 Credenciales de Prueba:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Email:        ${testEmail}`);
    console.log(`   Username:     ${testUsername}`);
    console.log(`   Password:     ${testPassword}`);
    console.log(`   User ID:      ${user.id}`);
    console.log(`   Email Verified: ${user.email_verified}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 Estas credenciales están documentadas en:');
    console.log('   - .env.test.example');
    console.log('   - TESTS_CREDENTIALS.md\n');

    return user;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error al crear usuario de prueba:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar
createTestUser()
  .then(() => {
    console.log('✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
