const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.POSTGRESQL_HOST || 'localhost',
  port: parseInt(process.env.POSTGRESQL_PORT || '5432'),
  database: process.env.POSTGRESQL_DATABASE || 'MaxTurnos_db',
  user: process.env.POSTGRESQL_USER || 'postgres',
  password: process.env.POSTGRESQL_PASSWORD,
});

async function createAppointmentsTable() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

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

    // Crear índices
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
    `);

    // Crear índice único parcial para prevenir citas duplicadas activas
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS unique_appointment_scheduled 
        ON appointments (client_id, user_account_id, appointment_date, appointment_time) 
        WHERE status = 'scheduled';
    `);

    await client.query('COMMIT');
    console.log('✅ Tabla appointments creada exitosamente');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error al crear tabla appointments:', error);
    throw error;
  } finally {
    client.release();
  }
}

createAppointmentsTable()
  .then(() => {
    pool.end();
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    pool.end();
    process.exit(1);
  });
