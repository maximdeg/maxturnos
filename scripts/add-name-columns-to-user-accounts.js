const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

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

async function addNameColumns() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar si las columnas ya existen
    const columnsCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_accounts' 
      AND column_name IN ('first_name', 'last_name')
    `);

    const existingColumns = columnsCheck.rows.map(row => row.column_name);
    
    // Agregar first_name si no existe
    if (!existingColumns.includes('first_name')) {
      console.log('Agregando columna first_name...');
      await client.query(`
        ALTER TABLE user_accounts 
        ADD COLUMN first_name VARCHAR(255)
      `);
      console.log('✅ Columna first_name agregada');
    } else {
      console.log('ℹ️  Columna first_name ya existe');
    }

    // Agregar last_name si no existe
    if (!existingColumns.includes('last_name')) {
      console.log('Agregando columna last_name...');
      await client.query(`
        ALTER TABLE user_accounts 
        ADD COLUMN last_name VARCHAR(255)
      `);
      console.log('✅ Columna last_name agregada');
    } else {
      console.log('ℹ️  Columna last_name ya existe');
    }

    // Actualizar el usuario maraflamini con su nombre real
    const updateResult = await client.query(
      `UPDATE user_accounts 
       SET first_name = $1, last_name = $2 
       WHERE username = $3`,
      ['Mara', 'Flamini', 'maraflamini']
    );

    if (updateResult.rowCount > 0) {
      console.log('✅ Nombre actualizado para usuario maraflamini');
    } else {
      console.log('ℹ️  Usuario maraflamini no encontrado o ya tiene nombre');
    }

    await client.query('COMMIT');
    console.log('\n✅ Migración completada exitosamente');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error en la migración:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

addNameColumns()
  .then(() => {
    pool.end();
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    pool.end();
    process.exit(1);
  });
