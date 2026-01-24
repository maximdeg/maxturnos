const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.POSTGRESQL_HOST || 'localhost',
  port: parseInt(process.env.POSTGRESQL_PORT || '5432'),
  database: process.env.POSTGRESQL_DATABASE || 'MaxTurnos_db',
  user: process.env.POSTGRESQL_USER || 'postgres',
  password: process.env.POSTGRESQL_PASSWORD,
});

async function populateReferenceData() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Poblar visit_types
    await client.query(`
      INSERT INTO visit_types (name, description) VALUES
      ('Consulta', 'Consulta médica general'),
      ('Practica', 'Procedimiento o práctica médica')
      ON CONFLICT (name) DO NOTHING;
    `);

    // Poblar consult_types
    await client.query(`
      INSERT INTO consult_types (name, description) VALUES
      ('Primera vez', 'Consulta inicial del paciente'),
      ('Seguimiento', 'Consulta de seguimiento')
      ON CONFLICT (name) DO NOTHING;
    `);

    // Poblar practice_types
    await client.query(`
      INSERT INTO practice_types (name, description) VALUES
      ('Criocirugía', 'Procedimiento de criocirugía'),
      ('Electrocoagulación', 'Procedimiento de electrocoagulación'),
      ('Biopsia', 'Procedimiento de biopsia')
      ON CONFLICT (name) DO NOTHING;
    `);

    await client.query('COMMIT');
    console.log('✅ Datos de referencia poblados exitosamente');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error al poblar datos de referencia:', error);
    throw error;
  } finally {
    client.release();
  }
}

populateReferenceData()
  .then(() => {
    pool.end();
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    pool.end();
    process.exit(1);
  });
