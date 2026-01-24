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

async function createUsersTableIfNotExists(client) {
  // Verificar si la tabla existe
  const tableCheck = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
    );
  `);

  if (!tableCheck.rows[0].exists) {
    console.log('📋 Creando tabla users...');
    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        reset_token VARCHAR(255),
        reset_token_expires TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
    `);

    console.log('✅ Tabla users creada exitosamente');
  } else {
    console.log('✅ Tabla users ya existe');
  }
}

async function createSuperAdmin() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Crear tabla si no existe
    await createUsersTableIfNotExists(client);

    // Datos del super admin
    const email = 'maxim.degtiarev.dev@gmail.com';
    const password = 'SuperAdmin2024!'; // Contraseña segura por defecto
    const fullName = 'Maxim Degtiarev';
    const role = 'super_admin';

    // Verificar si el usuario ya existe
    const existingUser = await client.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      console.log(`⚠️  Usuario con email ${email} ya existe.`);
      console.log(`   ID: ${existingUser.rows[0].id}`);
      console.log(`   Role: ${existingUser.rows[0].role}`);
      
      // Preguntar si quiere actualizar el role
      const updateRole = await client.query(
        'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2 RETURNING id, email, role',
        [role, email]
      );
      
      console.log(`✅ Role actualizado a '${role}'`);
      console.log(`\n📝 Credenciales:`);
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
      console.log(`   Role: ${role}`);
      console.log(`\n⚠️  NOTA: La contraseña NO fue actualizada. Si necesitas cambiar la contraseña, ejecuta este script nuevamente o actualízala manualmente.`);
      
      await client.query('COMMIT');
      return;
    }

    // Hashear contraseña
    console.log('🔐 Hasheando contraseña...');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insertar super admin
    console.log('👤 Creando super admin...');
    const result = await client.query(
      `INSERT INTO users (full_name, email, password, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, email, role, full_name`,
      [fullName, email, hashedPassword, role]
    );

    await client.query('COMMIT');

    const user = result.rows[0];
    console.log('\n✅ Super Admin creado exitosamente!');
    console.log('\n📝 Credenciales:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Nombre: ${user.full_name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: ${user.role}`);
    console.log('\n⚠️  IMPORTANTE: Guarda estas credenciales en un lugar seguro!');
    console.log('   La contraseña no se mostrará nuevamente.');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error al crear super admin:', error.message);
    if (error.code === '23505') {
      console.error('   El email ya existe en la base de datos.');
    }
    throw error;
  } finally {
    client.release();
  }
}

createSuperAdmin()
  .then(() => {
    pool.end();
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    pool.end();
    process.exit(1);
  });
