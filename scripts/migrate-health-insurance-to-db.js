/**
 * Migración: obras sociales de JSON a PostgreSQL
 *
 * Vercel tiene filesystem de solo lectura. Este script crea la tabla
 * health_insurance y la puebla desde data/obras-sociales.json (si la tabla
 * está vacía). Ejecutar una vez contra la base de datos de producción:
 *
 *   node scripts/migrate-health-insurance-to-db.js
 *
 * Usa las variables de .env.local (POSTGRESQL_*).
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
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

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS health_insurance (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        price VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_health_insurance_name ON health_insurance (LOWER(name));
    `);
    console.log('✅ Tabla health_insurance creada o ya existe');

    const countResult = await client.query('SELECT COUNT(*) FROM health_insurance');
    if (parseInt(countResult.rows[0].count, 10) > 0) {
      console.log('✅ Tabla ya tiene datos, omitiendo seed');
      return;
    }

    const jsonPath = path.join(process.cwd(), 'data', 'obras-sociales.json');
    if (!fs.existsSync(jsonPath)) {
      console.log('⚠️ data/obras-sociales.json no encontrado, omitiendo seed');
      return;
    }

    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const items = Array.isArray(raw) ? raw : [];
    for (const item of items) {
      const name = item.name?.trim();
      if (!name) continue;
      const price = item.price ?? null;
      const notes = item.notes ?? null;
      await client.query(
        'INSERT INTO health_insurance (name, price, notes) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING',
        [name, price, notes]
      );
    }
    console.log(`✅ Seed completado: ${items.length} obras sociales`);
  } finally {
    client.release();
    pool.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
