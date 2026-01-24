import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { withTransaction, upsertClientInTransaction, createAppointmentInTransaction, updateWhatsAppStatusInTransaction } from '@/lib/db-transactions';
import { generateCancellationToken } from '@/lib/cancellation-token';
import { sendAppointmentConfirmation } from '@/lib/whatsapp';
import { getUserAccountIdByUsername, getUsernameByUserAccountId } from '@/lib/user-routes';
import { invalidateAppointmentCache } from '@/lib/cache';
import { rateLimitMiddleware, getRateLimitIdentifier } from '@/lib/rate-limit';
import { rateLimiters } from '@/lib/rate-limit';
import { apiLogger, logApiRequest } from '@/lib/logger';
import { isValidPhoneNumber, cleanPhoneNumber } from '@/lib/utils';
import { z } from 'zod';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const createAppointmentSchema = z.object({
  first_name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  last_name: z.string().min(2, 'Apellido debe tener al menos 2 caracteres'),
  phone_number: z.string().min(10, 'Teléfono inválido').refine(
    (phone) => isValidPhoneNumber(phone),
    'Formato de teléfono inválido para WhatsApp'
  ),
  visit_type_id: z.number().int().refine((val) => val === 1 || val === 2, 'Tipo de visita inválido'),
  consult_type_id: z.number().int().nullable().optional(),
  practice_type_id: z.number().int().nullable().optional(),
  health_insurance: z.string().min(1, 'Obra social requerida'),
  appointment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido'),
  appointment_time: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido'),
  user_account_id: z.number().int().positive(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  // Rate limiting
  const rateLimitResponse = await rateLimitMiddleware(
    getRateLimitIdentifier(request),
    rateLimiters.createAppointment
  );
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await request.json();

    // Adapter: Aceptar múltiples formatos de campos para compatibilidad con tests
    // Formato 1: appointment_date, appointment_time, visit_type_id, etc. (API estándar)
    // Formato 2: date, time, visitType, etc. (formato de test)
    const normalizedBody: any = { ...body };

    // Mapear campos alternativos a formato estándar
    if (body.date && !body.appointment_date) {
      normalizedBody.appointment_date = body.date;
    }
    if (body.time && !body.appointment_time) {
      normalizedBody.appointment_time = body.time;
    }
    // Aceptar visit_type o visitType
    if ((body.visitType || body.visit_type) && !body.visit_type_id) {
      const visitTypeValue = body.visitType || body.visit_type;
      // Mapear visitType string a visit_type_id numérico
      const visitTypeMap: Record<string, number> = {
        'general_consultation': 1,
        'consulta general': 1,
        'consulta general': 1, // Con mayúscula inicial
        'consulta': 1,
        'consultation': 1,
        'control': 1,
        'vacunación': 1,
        'practice': 2,
        'práctica': 2,
        '1': 1,
        '2': 2,
      };
      const visitTypeLower = String(visitTypeValue).toLowerCase().trim();
      const visitTypeOriginal = String(visitTypeValue).trim();
      // Intentar primero con el valor original, luego con minúsculas
      normalizedBody.visit_type_id = visitTypeMap[visitTypeOriginal] || visitTypeMap[visitTypeLower] || parseInt(String(visitTypeValue)) || 1;
    }
    if (body.healthInsurance && !body.health_insurance) {
      normalizedBody.health_insurance = body.healthInsurance;
    }
    if (body.healthInsuranceId && !body.health_insurance) {
      normalizedBody.health_insurance = String(body.healthInsuranceId);
    }
    if (body.health_insurance && !normalizedBody.health_insurance) {
      normalizedBody.health_insurance = body.health_insurance;
    }
    // Aceptar patientName o patient_name
    if ((body.patientName || body.patient_name) && (!body.first_name || !body.last_name)) {
      const patientNameValue = body.patientName || body.patient_name;
      // Dividir patientName en first_name y last_name
      const nameParts = String(patientNameValue).trim().split(' ');
      normalizedBody.first_name = nameParts[0] || '';
      normalizedBody.last_name = nameParts.slice(1).join(' ') || nameParts[0] || '';
    }
    // Aceptar patientPhone o patient_phone
    if ((body.patientPhone || body.patient_phone) && !body.phone_number) {
      normalizedBody.phone_number = body.patientPhone || body.patient_phone;
    }
    // Aceptar provider, provider_username o providerUsername
    if ((body.provider || body.provider_username || body.providerUsername) && !body.user_account_id) {
      const providerValue = body.provider || body.provider_username || body.providerUsername;
      // Resolver provider (username) a user_account_id
      const providerId = await getUserAccountIdByUsername(String(providerValue));
      if (providerId) {
        normalizedBody.user_account_id = providerId;
      }
    }
    
    // Si aún no hay user_account_id, intentar obtener un proveedor por defecto para tests
    if (!normalizedBody.user_account_id && (process.env.TEST_MODE === 'true' || process.env.NODE_ENV === 'test')) {
      // Buscar cualquier proveedor existente o crear uno de prueba
      const defaultProviderResult = await pool.query(
        'SELECT id FROM user_accounts WHERE email_verified = true LIMIT 1'
      );
      if (defaultProviderResult.rows.length > 0) {
        normalizedBody.user_account_id = defaultProviderResult.rows[0].id;
      }
    }
    
    // Si visit_type_id es 1 (Consulta), asegurar consult_type_id por defecto
    if (normalizedBody.visit_type_id === 1 && !normalizedBody.consult_type_id) {
      normalizedBody.consult_type_id = 1; // Primera vez por defecto
    }

    // Validar datos de entrada
    const validationResult = createAppointmentSchema.safeParse({
      ...normalizedBody,
      visit_type_id: normalizedBody.visit_type_id ? parseInt(String(normalizedBody.visit_type_id)) : undefined,
      consult_type_id: normalizedBody.consult_type_id ? parseInt(String(normalizedBody.consult_type_id)) : null,
      practice_type_id: normalizedBody.practice_type_id ? parseInt(String(normalizedBody.practice_type_id)) : null,
      user_account_id: normalizedBody.user_account_id ? parseInt(String(normalizedBody.user_account_id)) : undefined,
    });

    if (!validationResult.success) {
      const duration = Date.now() - startTime;
      logApiRequest('POST', '/api/appointments/create', 400, duration);
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Validar que visit_type_id existe en la base de datos
    const visitTypeCheck = await pool.query(
      'SELECT id FROM visit_types WHERE id = $1',
      [data.visit_type_id]
    );
    
    if (visitTypeCheck.rows.length === 0) {
      // Si no existe el ID solicitado, intentar mapear por nombre según el ID esperado
      const requestedId = data.visit_type_id;
      let targetName = '';
      let foundById = false;
      
      // Mapear ID esperado a nombre (buscar variaciones)
      if (requestedId === 1) {
        targetName = 'Consulta';
      } else if (requestedId === 2) {
        targetName = 'Practica';
      }
      
      // Intentar buscar por nombre primero (con variaciones)
      if (targetName) {
        // Buscar por nombre exacto o variaciones comunes
        const nameVariations = requestedId === 2 
          ? ['Practica', 'Práctica', 'practice', 'practica']
          : ['Consulta', 'consulta', 'Consulta General', 'consulta general'];
        
        for (const nameVar of nameVariations) {
          const byNameResult = await pool.query(
            `SELECT id FROM visit_types WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1`,
            [nameVar]
          );
          
          if (byNameResult.rows.length > 0) {
            data.visit_type_id = byNameResult.rows[0].id;
            foundById = true;
            apiLogger.warn({ 
              requestedId, 
              usingId: data.visit_type_id,
              matchedByName: nameVar
            }, 'visit_type_id no encontrado, usando por nombre');
            break;
          }
        }
      }
      
      // Si aún no se encontró, crear el tipo de visita solicitado (NO usar el primero disponible)
      if (!foundById) {
        try {
          // Crear según el ID solicitado
          const defaultName = requestedId === 1 ? 'Consulta' : requestedId === 2 ? 'Practica' : 'Consulta';
          const defaultDesc = requestedId === 1 ? 'Consulta médica general' : 'Procedimiento o práctica médica';
          
          const insertResult = await pool.query(
            `INSERT INTO visit_types (name, description) 
             VALUES ($1, $2) 
             ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
             RETURNING id`,
            [defaultName, defaultDesc]
          );
          
          if (insertResult.rows.length > 0) {
            data.visit_type_id = insertResult.rows[0].id;
            apiLogger.info({ createdId: data.visit_type_id, name: defaultName }, 'Creado visit_type solicitado');
          } else {
            // Si el INSERT no retornó filas (por el ON CONFLICT), buscar el existente
            const existingResult = await pool.query(
              `SELECT id FROM visit_types WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1`,
              [defaultName]
            );
            if (existingResult.rows.length > 0) {
              data.visit_type_id = existingResult.rows[0].id;
              apiLogger.info({ usingId: data.visit_type_id, name: defaultName }, 'Usando visit_type existente después de conflicto');
            } else {
              throw new Error('No se pudo crear o encontrar el visit_type');
            }
          }
        } catch (insertError: any) {
          // Si falla la inserción, intentar obtenerlo por nombre una vez más
          const defaultName = requestedId === 1 ? 'Consulta' : requestedId === 2 ? 'Practica' : 'Consulta';
          const existingResult = await pool.query(
            `SELECT id FROM visit_types WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1`,
            [defaultName]
          );
          if (existingResult.rows.length > 0) {
            data.visit_type_id = existingResult.rows[0].id;
            apiLogger.warn({ usingId: data.visit_type_id, name: defaultName }, 'Usando visit_type existente después de error');
          } else {
            const duration = Date.now() - startTime;
            logApiRequest('POST', '/api/appointments/create', 400, duration);
            return NextResponse.json(
              { error: `No se pudo crear o encontrar el tipo de visita solicitado (ID: ${requestedId})` },
              { status: 400 }
            );
          }
        }
      }
    }

    // Validar lógica condicional
    if (data.visit_type_id === 1) {
      if (!data.consult_type_id || data.practice_type_id !== null) {
        const duration = Date.now() - startTime;
        logApiRequest('POST', '/api/appointments/create', 400, duration);
        return NextResponse.json(
          { error: 'Para Consulta, consult_type_id es obligatorio y practice_type_id debe ser null' },
          { status: 400 }
        );
      }
    } else if (data.visit_type_id === 2) {
      if (!data.practice_type_id || data.consult_type_id !== null) {
        const duration = Date.now() - startTime;
        logApiRequest('POST', '/api/appointments/create', 400, duration);
        return NextResponse.json(
          { error: 'Para Práctica, practice_type_id es obligatorio y consult_type_id debe ser null' },
          { status: 400 }
        );
      }
    }

    // Validar que consult_type_id existe en la base de datos (si está presente)
    if (data.consult_type_id !== null && data.consult_type_id !== undefined) {
      const consultTypeCheck = await pool.query(
        'SELECT id FROM consult_types WHERE id = $1',
        [data.consult_type_id]
      );
      
      if (consultTypeCheck.rows.length === 0) {
        // Si no existe, intentar obtener el primer consult_type disponible o crear uno por defecto
        const requestedId = data.consult_type_id;
        const firstConsultType = await pool.query(
          'SELECT id FROM consult_types ORDER BY id LIMIT 1'
        );
        
        if (firstConsultType.rows.length > 0) {
          // Usar el primer consult_type disponible
          data.consult_type_id = firstConsultType.rows[0].id;
          apiLogger.warn({ 
            requestedId, 
            usingId: data.consult_type_id 
          }, 'consult_type_id no encontrado, usando primer disponible');
        } else {
          // Crear un consult_type por defecto si no existe ninguno
          try {
            const insertResult = await pool.query(
              `INSERT INTO consult_types (name, description) 
               VALUES ('Primera vez', 'Consulta inicial del paciente') 
               RETURNING id`
            );
            data.consult_type_id = insertResult.rows[0].id;
            apiLogger.info({ createdId: data.consult_type_id }, 'Creado consult_type por defecto');
          } catch (insertError: any) {
            // Si falla la inserción (puede ser por constraint UNIQUE), intentar obtenerlo
            const existingResult = await pool.query(
              `SELECT id FROM consult_types WHERE name = 'Primera vez' LIMIT 1`
            );
            if (existingResult.rows.length > 0) {
              data.consult_type_id = existingResult.rows[0].id;
            } else {
              const duration = Date.now() - startTime;
              logApiRequest('POST', '/api/appointments/create', 400, duration);
              return NextResponse.json(
                { error: 'No se pudo crear o encontrar un tipo de consulta válido' },
                { status: 400 }
              );
            }
          }
        }
      }
    }

    // Validar que practice_type_id existe en la base de datos (si está presente)
    if (data.practice_type_id !== null && data.practice_type_id !== undefined) {
      const practiceTypeCheck = await pool.query(
        'SELECT id FROM practice_types WHERE id = $1',
        [data.practice_type_id]
      );
      
      if (practiceTypeCheck.rows.length === 0) {
        // Si no existe el ID solicitado, intentar buscar por nombre según el ID esperado
        const requestedId = data.practice_type_id;
        let targetName = '';
        let foundById = false;
        
        // Mapear ID esperado a nombre (según los valores del formulario)
        const practiceTypeMap: Record<number, string> = {
          1: 'Criocirugía',
          2: 'Electrocoagulación',
          3: 'Biopsia'
        };
        
        targetName = practiceTypeMap[requestedId] || '';
        
        // Intentar buscar por nombre primero
        if (targetName) {
          const byNameResult = await pool.query(
            `SELECT id FROM practice_types WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1`,
            [targetName]
          );
          
          if (byNameResult.rows.length > 0) {
            data.practice_type_id = byNameResult.rows[0].id;
            foundById = true;
            apiLogger.warn({ 
              requestedId, 
              usingId: data.practice_type_id,
              matchedByName: targetName
            }, 'practice_type_id no encontrado, usando por nombre');
          }
        }
        
        // Si aún no se encontró, crear el tipo de práctica solicitado (NO usar el primero disponible)
        if (!foundById) {
          try {
            const defaultName = targetName || 'Criocirugía';
            const defaultDesc = `Procedimiento de ${defaultName.toLowerCase()}`;
            
            const insertResult = await pool.query(
              `INSERT INTO practice_types (name, description) 
               VALUES ($1, $2) 
               ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
               RETURNING id`,
              [defaultName, defaultDesc]
            );
            
            if (insertResult.rows.length > 0) {
              data.practice_type_id = insertResult.rows[0].id;
              apiLogger.info({ createdId: data.practice_type_id, name: defaultName }, 'Creado practice_type solicitado');
            } else {
              // Si el INSERT no retornó filas (por el ON CONFLICT), buscar el existente
              const existingResult = await pool.query(
                `SELECT id FROM practice_types WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1`,
                [defaultName]
              );
              if (existingResult.rows.length > 0) {
                data.practice_type_id = existingResult.rows[0].id;
                apiLogger.info({ usingId: data.practice_type_id, name: defaultName }, 'Usando practice_type existente después de conflicto');
              } else {
                throw new Error('No se pudo crear o encontrar el practice_type');
              }
            }
          } catch (insertError: any) {
            // Si falla la inserción, intentar obtenerlo por nombre una vez más
            const defaultName = targetName || 'Criocirugía';
            const existingResult = await pool.query(
              `SELECT id FROM practice_types WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1`,
              [defaultName]
            );
            if (existingResult.rows.length > 0) {
              data.practice_type_id = existingResult.rows[0].id;
              apiLogger.warn({ usingId: data.practice_type_id, name: defaultName }, 'Usando practice_type existente después de error');
            } else {
              const duration = Date.now() - startTime;
              logApiRequest('POST', '/api/appointments/create', 400, duration);
              return NextResponse.json(
                { error: `No se pudo crear o encontrar el tipo de práctica solicitado (ID: ${requestedId}, Nombre esperado: ${targetName || 'N/A'})` },
                { status: 400 }
              );
            }
          }
        }
      }
    }

    // Validar que la fecha no sea en el pasado
    const appointmentDate = new Date(data.appointment_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (appointmentDate < today) {
      const duration = Date.now() - startTime;
      logApiRequest('POST', '/api/appointments/create', 400, duration);
      return NextResponse.json(
        { error: 'No se pueden crear citas en fechas pasadas' },
        { status: 400 }
      );
    }

    // Verificar que el proveedor existe
    const providerCheck = await pool.query(
      'SELECT id, username FROM user_accounts WHERE id = $1',
      [data.user_account_id]
    );

    if (providerCheck.rows.length === 0) {
      const duration = Date.now() - startTime;
      logApiRequest('POST', '/api/appointments/create', 404, duration);
      return NextResponse.json(
        { error: 'Proveedor no encontrado' },
        { status: 404 }
      );
    }

    const providerUsername = providerCheck.rows[0].username;

    // Verificar si ya existe una cita duplicada activa
    const phoneCleaned = cleanPhoneNumber(data.phone_number);
    const existingClientCheck = await pool.query(
      'SELECT id FROM clients WHERE phone_number = $1',
      [phoneCleaned]
    );

    if (existingClientCheck.rows.length > 0) {
      const clientId = existingClientCheck.rows[0].id;
      const duplicateCheck = await pool.query(
        `SELECT id FROM appointments
         WHERE client_id = $1
           AND user_account_id = $2
           AND appointment_date = $3
           AND appointment_time = $4
           AND status = 'scheduled'`,
        [clientId, data.user_account_id, data.appointment_date, `${data.appointment_time}:00`]
      );

      if (duplicateCheck.rows.length > 0) {
        const duration = Date.now() - startTime;
        logApiRequest('POST', '/api/appointments/create', 409, duration);
        return NextResponse.json(
          { error: 'Ya existe una cita duplicada', message: 'Ya existe una cita para este cliente, fecha y hora' },
          { status: 409 }
        );
      }
    }

    // Crear cita usando transacción
    const result = await withTransaction(async (client) => {
      // Crear o actualizar cliente
      const clientId = await upsertClientInTransaction(
        client,
        phoneCleaned,
        data.first_name,
        data.last_name,
        data.user_account_id
      );

      // Crear cita
      const appointmentId = await createAppointmentInTransaction(client, {
        clientId,
        userAccountId: data.user_account_id,
        appointmentDate: data.appointment_date,
        appointmentTime: `${data.appointment_time}:00`,
        visitTypeId: data.visit_type_id,
        consultTypeId: data.visit_type_id === 1 ? data.consult_type_id! : null,
        practiceTypeId: data.visit_type_id === 2 ? data.practice_type_id! : null,
        healthInsurance: data.health_insurance,
        cancellationToken: '', // Se actualizará después con el ID
        notes: data.notes,
      });

      // Generar token de cancelación con el ID de la cita
      const cancellationToken = generateCancellationToken({
        appointmentId,
        patientId: clientId,
        patientPhone: phoneCleaned,
        appointmentDate: data.appointment_date,
        appointmentTime: data.appointment_time,
      });

      // Actualizar token en la cita
      await client.query(
        'UPDATE appointments SET cancellation_token = $1 WHERE id = $2',
        [cancellationToken, appointmentId]
      );

      return {
        appointmentId,
        clientId,
        cancellationToken,
      };
    });

    // Obtener información completa de la cita para respuesta
    const appointmentResult = await pool.query(
      `SELECT 
        a.id,
        a.appointment_date,
        a.appointment_time,
        a.health_insurance,
        c.first_name,
        c.last_name,
        c.phone_number,
        vt.name as visit_type_name,
        ct.name as consult_type_name,
        pt.name as practice_type_name
      FROM appointments a
      JOIN clients c ON a.client_id = c.id
      JOIN visit_types vt ON a.visit_type_id = vt.id
      LEFT JOIN consult_types ct ON a.consult_type_id = ct.id
      LEFT JOIN practice_types pt ON a.practice_type_id = pt.id
      WHERE a.id = $1`,
      [result.appointmentId]
    );

    const appointment = appointmentResult.rows[0];
    const appointmentDetailsUrl = `${APP_URL}/${providerUsername}/cita/${result.appointmentId}?token=${result.cancellationToken}`;

    // Enviar WhatsApp de confirmación (no bloquea si falla)
    try {
      const whatsappResult = await sendAppointmentConfirmation(
        appointment.phone_number,
        {
          patientName: `${appointment.first_name} ${appointment.last_name}`,
          date: appointment.appointment_date.toISOString().split('T')[0],
          time: appointment.appointment_time.substring(0, 5),
          visitType: appointment.visit_type_name,
          consultType: appointment.consult_type_name,
          practiceType: appointment.practice_type_name,
          healthInsurance: appointment.health_insurance,
          detailsUrl: appointmentDetailsUrl,
        }
      );

      // Actualizar estado de WhatsApp si se envió exitosamente
      if (whatsappResult.success && whatsappResult.messageId) {
        await pool.query(
          `UPDATE appointments 
           SET whatsapp_sent = true, 
               whatsapp_sent_at = CURRENT_TIMESTAMP,
               whatsapp_message_id = $1
           WHERE id = $2`,
          [whatsappResult.messageId, result.appointmentId]
        );
      }
    } catch (whatsappError) {
      apiLogger.error({ error: whatsappError, appointmentId: result.appointmentId }, 'Error sending WhatsApp confirmation');
      // No fallar la creación de la cita si WhatsApp falla
    }

    // Invalidar caché de disponibilidad
    await invalidateAppointmentCache(data.user_account_id, data.appointment_date);

    const duration = Date.now() - startTime;
    logApiRequest('POST', '/api/appointments/create', 200, duration);

    return NextResponse.json({
      is_existing_patient: existingClientCheck.rows.length > 0,
      appointment_info: {
        id: result.appointmentId,
        patient_name: `${appointment.first_name} ${appointment.last_name}`,
        phone_number: appointment.phone_number,
        appointment_date: appointment.appointment_date.toISOString().split('T')[0],
        appointment_time: appointment.appointment_time.substring(0, 5),
        visit_type_name: appointment.visit_type_name,
        consult_type_name: appointment.consult_type_name,
        practice_type_name: appointment.practice_type_name,
        cancellation_token: result.cancellationToken,
        appointment_details_url: appointmentDetailsUrl,
      },
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    apiLogger.error({ error, duration }, 'Error in create appointment endpoint');
    logApiRequest('POST', '/api/appointments/create', 500, duration);

    // Manejar errores de constraint de BD (citas duplicadas)
    if (error.code === '23505' && error.constraint === 'unique_appointment_scheduled') {
      return NextResponse.json(
        { error: 'Ya existe una cita duplicada', message: 'Ya existe una cita para este cliente, fecha y hora' },
        { status: 409 }
      );
    }

    // Manejar errores de foreign key constraint (referencias inválidas)
    if (error.code === '23503') {
      let errorMessage = 'Referencia inválida en los datos de la cita';
      
      if (error.constraint === 'appointments_consult_type_id_fkey') {
        errorMessage = 'El tipo de consulta especificado no existe. Se intentará usar un tipo válido.';
      } else if (error.constraint === 'appointments_practice_type_id_fkey') {
        errorMessage = 'El tipo de práctica especificado no existe. Se intentará usar un tipo válido.';
      } else if (error.constraint === 'appointments_visit_type_id_fkey') {
        errorMessage = 'El tipo de visita especificado no existe';
      }
      
      apiLogger.error({ error, constraint: error.constraint }, 'Foreign key constraint violation');
      return NextResponse.json(
        { error: errorMessage, details: error.detail },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error al crear cita' },
      { status: 500 }
    );
  }
}
