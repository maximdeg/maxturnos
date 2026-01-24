import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { pool } from '@/lib/db';
import { withTransaction } from '@/lib/db-transactions';
import { sendVerificationEmail } from '@/lib/email';
import { rateLimitMiddleware, getRateLimitIdentifier } from '@/lib/rate-limit';
import { rateLimiters } from '@/lib/rate-limit';
import { apiLogger, logApiRequest, authLogger } from '@/lib/logger';
import { z } from 'zod';
import crypto from 'crypto';

const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  username: z.string().min(3, 'Username debe tener al menos 3 caracteres').max(50, 'Username muy largo'),
  password: z.string().min(8, 'Contraseña debe tener al menos 8 caracteres'),
  full_name: z.string().min(2, 'Nombre completo requerido').optional(),
  first_name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres').optional(),
  last_name: z.string().min(2, 'Apellido debe tener al menos 2 caracteres').optional(),
  whatsapp_phone_number: z.string().optional(),
}).refine(
  (data) => data.full_name || (data.first_name && data.last_name),
  {
    message: 'Debe proporcionar full_name o first_name y last_name',
    path: ['full_name'],
  }
);

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  // Rate limiting
  const rateLimitResponse = await rateLimitMiddleware(
    getRateLimitIdentifier(request),
    rateLimiters.register
  );
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await request.json();

    // Adapter: Aceptar múltiples formatos para compatibilidad con tests
    // Formato 1: email, username, password, full_name (API estándar)
    // Formato 2: email, password, name (formato de test)
    // Formato 3: email, username, password, first_name, last_name (formato del formulario)
    const normalizedBody: any = { ...body };
    
    // Si viene "name" pero no "full_name", usar "name" como "full_name"
    if (body.name && !body.full_name) {
      normalizedBody.full_name = body.name;
    }
    
    // Si viene first_name y last_name pero no full_name, combinarlos
    if (body.first_name && body.last_name && !body.full_name) {
      normalizedBody.full_name = `${body.first_name} ${body.last_name}`.trim();
    }
    
    // Si no viene "username", generar uno desde el email
    if (!normalizedBody.username && normalizedBody.email) {
      const emailParts = normalizedBody.email.split('@');
      normalizedBody.username = emailParts[0].replace(/[^a-zA-Z0-9]/g, '') + Math.floor(Math.random() * 1000);
    }

    // Validar datos de entrada
    const validationResult = registerSchema.safeParse(normalizedBody);
    if (!validationResult.success) {
      const duration = Date.now() - startTime;
      logApiRequest('POST', '/api/auth/register', 400, duration);
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { email, username, password, full_name, first_name, last_name, whatsapp_phone_number } = validationResult.data;

    // Verificar que email y username sean únicos
    const emailCheck = await pool.query(
      'SELECT id FROM user_accounts WHERE email = $1',
      [email]
    );

    if (emailCheck.rows.length > 0) {
      const duration = Date.now() - startTime;
      logApiRequest('POST', '/api/auth/register', 400, duration);
      return NextResponse.json(
        { success: false, error: 'Email ya está registrado' },
        { status: 400 }
      );
    }

    const usernameCheck = await pool.query(
      'SELECT id FROM user_accounts WHERE username = $1',
      [username]
    );

    if (usernameCheck.rows.length > 0) {
      const duration = Date.now() - startTime;
      logApiRequest('POST', '/api/auth/register', 400, duration);
      return NextResponse.json(
        { success: false, error: 'Username ya está en uso' },
        { status: 400 }
      );
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generar token de verificación
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date();
    verificationTokenExpires.setHours(verificationTokenExpires.getHours() + 24); // Expira en 24 horas

    // Verificar qué columnas existen en la tabla user_accounts
    const columnsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_accounts'
      ORDER BY ordinal_position
    `);
    
    const existingColumns = columnsResult.rows.map((row: any) => row.column_name);
    const hasFirstName = existingColumns.includes('first_name');
    const hasLastName = existingColumns.includes('last_name');
    const hasWhatsAppPhone = existingColumns.includes('whatsapp_phone_number');
    const hasVerificationToken = existingColumns.includes('verification_token');
    const hasVerificationTokenExpires = existingColumns.includes('verification_token_expires');

    // Usar first_name y last_name del body si vienen, sino dividir full_name
    let finalFirstName: string | undefined;
    let finalLastName: string | undefined;
    if (hasFirstName || hasLastName) {
      if (first_name && last_name) {
        // Usar los valores del formulario directamente
        finalFirstName = hasFirstName ? first_name : undefined;
        finalLastName = hasLastName ? last_name : undefined;
      } else if (full_name) {
        // Dividir full_name en first_name y last_name
        const nameParts = full_name.trim().split(' ');
        finalFirstName = hasFirstName ? (nameParts[0] || '') : undefined;
        finalLastName = hasLastName ? (nameParts.slice(1).join(' ') || '') : undefined;
      }
    }

    // Crear registro en base de datos usando transacción
    const result = await withTransaction(async (client) => {
      // Construir query dinámicamente basado en columnas disponibles
      let insertColumns = ['email', 'username', 'password', 'email_verified'];
      let insertValues: any[] = [email, username, hashedPassword, false];
      let placeholders = ['$1', '$2', '$3', '$4'];
      let paramIndex = 5;

      if (hasVerificationToken) {
        insertColumns.push('verification_token');
        insertValues.push(verificationToken);
        placeholders.push(`$${paramIndex++}`);
      }

      if (hasVerificationTokenExpires) {
        insertColumns.push('verification_token_expires');
        insertValues.push(verificationTokenExpires);
        placeholders.push(`$${paramIndex++}`);
      }

      if (hasFirstName && finalFirstName !== undefined) {
        insertColumns.push('first_name');
        insertValues.push(finalFirstName);
        placeholders.push(`$${paramIndex++}`);
      }

      if (hasLastName && finalLastName !== undefined) {
        insertColumns.push('last_name');
        insertValues.push(finalLastName);
        placeholders.push(`$${paramIndex++}`);
      }

      if (hasWhatsAppPhone && whatsapp_phone_number) {
        insertColumns.push('whatsapp_phone_number');
        insertValues.push(whatsapp_phone_number);
        placeholders.push(`$${paramIndex++}`);
      }

      const dbResult = await client.query(
        `INSERT INTO user_accounts (${insertColumns.join(', ')}, created_at, updated_at)
         VALUES (${placeholders.join(', ')}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id`,
        insertValues
      );

      return { userId: dbResult.rows[0].id };
    });

    const userId = result.userId;

    // Enviar email de verificación (fuera de transacción)
    let emailSent = false;
    let emailError: any = null;
    try {
      await sendVerificationEmail(email, username, verificationToken);
      emailSent = true;
      authLogger.info({ userId, email }, 'Verification email sent');
    } catch (err) {
      emailError = err;
      authLogger.error({ 
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        userId, 
        email 
      }, 'Error sending verification email');
      // No fallar el registro si el email falla, solo loguear
    }

    const duration = Date.now() - startTime;
    authLogger.info({ userId, email, username, duration, emailSent }, 'User registered successfully');
    logApiRequest('POST', '/api/auth/register', 201, duration);

    return NextResponse.json({
      success: true,
      id: userId,
      user_id: userId, // Alias para compatibilidad con tests
      email,
      username,
      message: emailSent 
        ? 'Cuenta creada. Por favor verifica tu email.' 
        : 'Cuenta creada, pero hubo un problema al enviar el email de verificación. Por favor contacta al administrador.',
      emailSent,
      ...(emailError && process.env.NODE_ENV === 'development' && {
        emailError: emailError instanceof Error ? emailError.message : String(emailError)
      }),
    }, { status: 201 });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    apiLogger.error({ 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration 
    }, 'Error in register endpoint');
    logApiRequest('POST', '/api/auth/register', 500, duration);

    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al crear cuenta',
        message: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    );
  }
}
