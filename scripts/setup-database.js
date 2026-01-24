const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.POSTGRESQL_HOST || 'localhost',
  port: parseInt(process.env.POSTGRESQL_PORT || '5432'),
  database: process.env.POSTGRESQL_DATABASE || 'MaxTurnos_db',
  user: process.env.POSTGRESQL_USER || 'postgres',
  password: process.env.POSTGRESQL_PASSWORD,
  ssl:
    process.env.POSTGRESQL_SSL_MODE === 'require' ||
    process.env.POSTGRESQL_SSL_MODE === 'verify-full'
      ? {
          rejectUnauthorized: process.env.POSTGRESQL_SSL_MODE === 'verify-full',
          ca: process.env.POSTGRESQL_CA_CERT,
        }
      : false,
});

async function setupDatabase() {
  const client = await pool.connect();
  try {
    console.log('🚀 Iniciando configuración de base de datos...\n');

    await client.query('BEGIN');

    // 1. Crear tablas de referencia primero (sin dependencias)
    console.log('📋 Creando tablas de referencia...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS visit_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    console.log('  ✅ visit_types');

    await client.query(`
      CREATE TABLE IF NOT EXISTS consult_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    console.log('  ✅ consult_types');

    await client.query(`
      CREATE TABLE IF NOT EXISTS practice_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT chk_practice_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
      );
    `);
    console.log('  ✅ practice_types');

    // 2. Crear tabla user_accounts (requerida por otras tablas)
    console.log('\n👤 Creando tabla user_accounts...');
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
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_accounts_username ON user_accounts (username);
      CREATE INDEX IF NOT EXISTS idx_user_accounts_email ON user_accounts (email);
    `);
    console.log('  ✅ user_accounts');

    // 3. Crear tabla clients
    console.log('\n👥 Creando tabla clients...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        phone_number VARCHAR(20) UNIQUE NOT NULL,
        email VARCHAR(255),
        user_account_id INTEGER REFERENCES user_accounts(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT chk_phone_format CHECK (
          phone_number ~ '^[0-9+\\-\\s()]+$' AND 
          LENGTH(REPLACE(REPLACE(REPLACE(REPLACE(phone_number, ' ', ''), '-', ''), '(', ''), ')', '')) >= 10
        )
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_clients_phone_number ON clients (phone_number);
      CREATE INDEX IF NOT EXISTS idx_clients_user_account_id ON clients (user_account_id);
    `);
    console.log('  ✅ clients');

    // 4. Crear tabla work_schedule
    console.log('\n📅 Creando tabla work_schedule...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS work_schedule (
        id SERIAL PRIMARY KEY,
        user_account_id INTEGER NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
        day_of_week VARCHAR(10) NOT NULL,
        is_working_day BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        UNIQUE(user_account_id, day_of_week)
      );
    `);
    console.log('  ✅ work_schedule');

    // 5. Crear tabla available_slots
    console.log('\n⏰ Creando tabla available_slots...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS available_slots (
        id SERIAL PRIMARY KEY,
        work_schedule_id INTEGER NOT NULL REFERENCES work_schedule(id) ON DELETE CASCADE,
        user_account_id INTEGER NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
        start_time TIME WITHOUT TIME ZONE NOT NULL,
        end_time TIME WITHOUT TIME ZONE NOT NULL,
        is_available BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT chk_time_range CHECK (end_time > start_time),
        CONSTRAINT unique_slot_per_day UNIQUE (work_schedule_id, start_time, end_time)
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_available_slots_work_schedule ON available_slots (work_schedule_id);
      CREATE INDEX IF NOT EXISTS idx_available_slots_user_account ON available_slots (user_account_id);
      CREATE INDEX IF NOT EXISTS idx_available_slots_available ON available_slots (is_available) WHERE is_available = true;
    `);
    console.log('  ✅ available_slots');

    // 6. Crear tabla unavailable_days
    console.log('\n🚫 Creando tabla unavailable_days...');
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
    console.log('  ✅ unavailable_days');

    // 7. Crear tabla unavailable_time_frames
    console.log('\n⏱️ Creando tabla unavailable_time_frames...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS unavailable_time_frames (
        id SERIAL PRIMARY KEY,
        workday_date DATE NOT NULL,
        start_time TIME WITHOUT TIME ZONE NOT NULL,
        end_time TIME WITHOUT TIME ZONE NOT NULL,
        work_schedule_id INTEGER REFERENCES work_schedule(id) ON DELETE SET NULL,
        user_account_id INTEGER NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT chk_time_frame_range CHECK (end_time > start_time),
        CONSTRAINT chk_time_frame_date CHECK (workday_date >= CURRENT_DATE),
        CONSTRAINT unique_time_frame UNIQUE (user_account_id, workday_date, start_time, end_time)
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_unavailable_time_frames_user_date ON unavailable_time_frames (user_account_id, workday_date);
      CREATE INDEX IF NOT EXISTS idx_unavailable_time_frames_date ON unavailable_time_frames (workday_date);
      CREATE INDEX IF NOT EXISTS idx_unavailable_time_frames_user ON unavailable_time_frames (user_account_id);
    `);
    console.log('  ✅ unavailable_time_frames');

    // 8. Crear tabla appointments (requiere todas las anteriores)
    console.log('\n📝 Creando tabla appointments...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        user_account_id INTEGER NOT NULL REFERENCES user_accounts(id) ON DELETE SET NULL,
        appointment_date DATE NOT NULL,
        appointment_time TIME WITHOUT TIME ZONE NOT NULL,
        consult_type_id INTEGER REFERENCES consult_types(id) ON DELETE SET NULL,
        visit_type_id INTEGER NOT NULL REFERENCES visit_types(id) ON DELETE RESTRICT,
        practice_type_id INTEGER REFERENCES practice_types(id) ON DELETE SET NULL,
        health_insurance VARCHAR(255) NOT NULL,
        notes TEXT,
        status VARCHAR(50) DEFAULT 'scheduled' NOT NULL,
        cancellation_token VARCHAR(500),
        whatsapp_sent BOOLEAN DEFAULT FALSE NOT NULL,
        whatsapp_sent_at TIMESTAMP WITH TIME ZONE,
        whatsapp_message_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT chk_status CHECK (status IN ('scheduled', 'cancelled', 'completed')),
        CONSTRAINT chk_consult_type CHECK (
          (visit_type_id = 1 AND consult_type_id IS NOT NULL AND practice_type_id IS NULL) OR
          (visit_type_id = 2 AND practice_type_id IS NOT NULL AND consult_type_id IS NULL)
        ),
        CONSTRAINT chk_appointment_date CHECK (appointment_date >= CURRENT_DATE)
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments (client_id);
      CREATE INDEX IF NOT EXISTS idx_appointments_user_account_id ON appointments (user_account_id);
      CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments (appointment_date);
      CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments (status);
      CREATE INDEX IF NOT EXISTS idx_appointments_user_date ON appointments (user_account_id, appointment_date);
      CREATE INDEX IF NOT EXISTS idx_appointments_user_date_time ON appointments (user_account_id, appointment_date, appointment_time);
      CREATE INDEX IF NOT EXISTS idx_appointments_visit_type ON appointments (visit_type_id);
      CREATE INDEX IF NOT EXISTS idx_appointments_date_status ON appointments (appointment_date, status) WHERE status = 'scheduled';
      CREATE INDEX IF NOT EXISTS idx_appointments_user_date_status_range 
        ON appointments (user_account_id, appointment_date, status) 
        WHERE status IN ('scheduled', 'completed');
      CREATE INDEX IF NOT EXISTS idx_appointments_whatsapp_pending 
        ON appointments (user_account_id, appointment_date) 
        WHERE whatsapp_sent = false AND status = 'scheduled';
      CREATE UNIQUE INDEX IF NOT EXISTS unique_appointment_scheduled 
        ON appointments (client_id, user_account_id, appointment_date, appointment_time) 
        WHERE status = 'scheduled';
    `);
    console.log('  ✅ appointments');

    // 9. Crear tablas opcionales
    console.log('\n📦 Creando tablas opcionales...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
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
      CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
    `);
    console.log('  ✅ users');

    await client.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        endpoint TEXT UNIQUE NOT NULL,
        p256dh_key TEXT,
        auth_key TEXT,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    console.log('  ✅ push_subscriptions');

    await client.query(`
      CREATE TABLE IF NOT EXISTS client_forms (
        id SERIAL PRIMARY KEY,
        user_account_id INTEGER NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
        form_data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        UNIQUE(user_account_id)
      );
      CREATE INDEX IF NOT EXISTS idx_client_forms_user_account_id ON client_forms (user_account_id);
    `);
    console.log('  ✅ client_forms');

    // 10. Poblar datos de referencia
    console.log('\n🌱 Poblando datos de referencia...');
    await client.query(`
      INSERT INTO visit_types (name, description) VALUES
      ('Consulta', 'Consulta médica general'),
      ('Practica', 'Procedimiento o práctica médica')
      ON CONFLICT (name) DO NOTHING;
    `);
    console.log('  ✅ visit_types');

    await client.query(`
      INSERT INTO consult_types (name, description) VALUES
      ('Primera vez', 'Consulta inicial del paciente'),
      ('Seguimiento', 'Consulta de seguimiento')
      ON CONFLICT (name) DO NOTHING;
    `);
    console.log('  ✅ consult_types');

    await client.query(`
      INSERT INTO practice_types (name, description) VALUES
      ('Criocirugía', 'Procedimiento de criocirugía'),
      ('Electrocoagulación', 'Procedimiento de electrocoagulación'),
      ('Biopsia', 'Procedimiento de biopsia')
      ON CONFLICT (name) DO NOTHING;
    `);
    console.log('  ✅ practice_types');

    await client.query('COMMIT');
    console.log('\n✅ Base de datos configurada exitosamente!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error al configurar base de datos:', error);
    throw error;
  } finally {
    client.release();
    pool.end();
  }
}

setupDatabase()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
