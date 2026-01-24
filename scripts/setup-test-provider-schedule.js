/**
 * Script para configurar horario de trabajo por defecto para el usuario de prueba
 * 
 * Uso:
 *   node scripts/setup-test-provider-schedule.js
 * 
 * Requiere variables de entorno de base de datos configuradas.
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

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

async function setupTestProviderSchedule() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Buscar usuario de prueba
    const testUsername = 'testprovider';
    const userResult = await client.query(
      'SELECT id FROM user_accounts WHERE username = $1',
      [testUsername]
    );

    if (userResult.rows.length === 0) {
      console.log('⚠️  Usuario de prueba no encontrado. Ejecuta primero: node scripts/create-test-user.js');
      await client.query('ROLLBACK');
      return;
    }

    const userId = userResult.rows[0].id;
    console.log(`✅ Usuario encontrado: ${testUsername} (ID: ${userId})`);

    // Días de la semana en inglés (como se almacenan en la BD)
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Horario por defecto: Lunes a Viernes, 09:00 - 18:00
    const defaultSchedule = {
      Monday: { isWorking: true, startTime: '09:00:00', endTime: '18:00:00' },
      Tuesday: { isWorking: true, startTime: '09:00:00', endTime: '18:00:00' },
      Wednesday: { isWorking: true, startTime: '09:00:00', endTime: '18:00:00' },
      Thursday: { isWorking: true, startTime: '09:00:00', endTime: '18:00:00' },
      Friday: { isWorking: true, startTime: '09:00:00', endTime: '18:00:00' },
      Saturday: { isWorking: false, startTime: null, endTime: null },
      Sunday: { isWorking: false, startTime: null, endTime: null },
    };

    // Limpiar horarios existentes para el usuario de prueba
    console.log('🧹 Limpiando horarios existentes...');
    await client.query(
      'DELETE FROM available_slots WHERE user_account_id = $1',
      [userId]
    );
    await client.query(
      'DELETE FROM work_schedule WHERE user_account_id = $1',
      [userId]
    );

    // Crear horarios de trabajo para cada día
    console.log('📅 Configurando horarios de trabajo...');
    const workScheduleIds = {};

    for (const day of daysOfWeek) {
      const schedule = defaultSchedule[day];
      
      // Verificar si ya existe el horario antes de insertar
      let workScheduleId;
      const existingSchedule = await client.query(
        `SELECT id FROM work_schedule 
         WHERE user_account_id = $1 AND day_of_week = $2`,
        [userId, day]
      );

      if (existingSchedule.rows.length === 0) {
        // Insertar en work_schedule
        const workScheduleResult = await client.query(
          `INSERT INTO work_schedule (user_account_id, day_of_week, is_working_day, created_at, updated_at)
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING id`,
          [userId, day, schedule.isWorking]
        );
        workScheduleId = workScheduleResult.rows[0].id;
      } else {
        // Actualizar si ya existe
        workScheduleId = existingSchedule.rows[0].id;
        await client.query(
          `UPDATE work_schedule 
           SET is_working_day = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [schedule.isWorking, workScheduleId]
        );
      }

      workScheduleIds[day] = workScheduleId;

      if (schedule.isWorking) {
        console.log(`   ✅ ${day}: ${schedule.startTime} - ${schedule.endTime}`);
        
        // Verificar si ya existe el slot antes de insertar
        const existingSlot = await client.query(
          `SELECT id FROM available_slots 
           WHERE work_schedule_id = $1 AND start_time = $2 AND end_time = $3`,
          [workScheduleId, schedule.startTime, schedule.endTime]
        );

        if (existingSlot.rows.length === 0) {
          // Insertar franja horaria disponible
          await client.query(
            `INSERT INTO available_slots 
             (work_schedule_id, user_account_id, start_time, end_time, is_available, created_at, updated_at)
             VALUES ($1, $2, $3, $4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [workScheduleId, userId, schedule.startTime, schedule.endTime]
          );
        } else {
          // Actualizar si ya existe
          await client.query(
            `UPDATE available_slots 
             SET is_available = true, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [existingSlot.rows[0].id]
          );
        }
      } else {
        console.log(`   ⏸️  ${day}: No laborable`);
      }
    }

    await client.query('COMMIT');

    console.log('\n✅ Horario de trabajo configurado exitosamente!\n');
    console.log('📋 Resumen:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   Usuario: testprovider');
    console.log('   Días laborables: Lunes a Viernes');
    console.log('   Horario: 09:00 - 18:00');
    console.log('   Intervalos: Cada 20 minutos');
    console.log('   Slots disponibles: ~27 por día (09:00, 09:20, 09:40, ..., 17:40)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error al configurar horario:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar
setupTestProviderSchedule()
  .then(() => {
    console.log('✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
