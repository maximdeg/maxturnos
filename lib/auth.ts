/**
 * Utilidades de Autenticación JWT
 * 
 * Funciones para generar, verificar y manejar tokens JWT
 * para autenticación de proveedores.
 * 
 * Usa 'jose' en lugar de 'jsonwebtoken' para compatibilidad con Edge Runtime.
 */

import { SignJWT, jwtVerify } from 'jose';
import { JWTPayload } from './types';
import { logger, authLogger } from './logger';

const JWT_SECRET = process.env.JWT_SECRET;

// Validar JWT_SECRET pero no lanzar error fatal al cargar el módulo
// Los endpoints de autenticación verificarán esto y devolverán error apropiado
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  logger.warn('JWT_SECRET no está configurado o es muy corto (mínimo 32 caracteres). Los endpoints de autenticación no funcionarán.');
}

// Type assertion para TypeScript - puede ser undefined pero lo manejaremos en las funciones
const JWT_SECRET_ASSERTED: string = JWT_SECRET || 'temp-secret-min-32-chars-for-dev-only-not-for-production-use';

const JWT_EXPIRATION = '24h'; // 24 horas

/**
 * Genera un token JWT para un usuario autenticado
 * 
 * @param payload Datos del usuario para incluir en el token
 * @returns Token JWT firmado
 */
export async function generateToken(payload: {
  id: number;
  email: string;
  username: string | null;
  email_verified: boolean;
}): Promise<string> {
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET no está configurado correctamente. Debe tener al menos 32 caracteres.');
  }

  try {
    const tokenPayload = {
      id: payload.id,
      email: payload.email,
      username: payload.username,
      email_verified: payload.email_verified,
    };

    const secret = new TextEncoder().encode(JWT_SECRET);
    const token = await new SignJWT(tokenPayload as any)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(JWT_EXPIRATION)
      .sign(secret);

    return token;
  } catch (error) {
    authLogger.error({ error, payload }, 'Error generating JWT token');
    throw error;
  }
}

/**
 * Verifica y decodifica un token JWT
 * 
 * @param token Token JWT a verificar
 * @returns Payload decodificado o null si el token es inválido
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    authLogger.warn('JWT_SECRET no está configurado correctamente. No se puede verificar token.');
    return null;
  }

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    
    // Convertir el payload a JWTPayload
    const decoded: JWTPayload = {
      id: payload.id as number,
      email: payload.email as string,
      username: payload.username as string | null,
      email_verified: payload.email_verified as boolean,
      iat: payload.iat as number | undefined,
      exp: payload.exp as number | undefined,
    };
    
    return decoded;
  } catch (error: any) {
    // jose lanza errores con códigos específicos
    if (error?.code === 'ERR_JWT_EXPIRED') {
      authLogger.warn({ error }, 'JWT token expired');
    } else if (error?.code === 'ERR_JWT_INVALID' || error?.code === 'ERR_JWT_MALFORMED') {
      authLogger.warn({ error }, 'Invalid JWT token');
    } else {
      authLogger.error({ error }, 'Error verifying JWT token');
    }
    return null;
  }
}

/**
 * Extrae el usuario del token JWT
 * 
 * @param token Token JWT
 * @returns Información del usuario o null si el token es inválido
 */
export async function getUserFromToken(token: string): Promise<{
  id: number;
  email: string;
  username: string | null;
  email_verified: boolean;
} | null> {
  const payload = await verifyToken(token);
  
  if (!payload) {
    return null;
  }

  return {
    id: payload.id,
    email: payload.email,
    username: payload.username,
    email_verified: payload.email_verified,
  };
}

/**
 * Extrae el token del header Authorization
 * 
 * @param authHeader Header Authorization (ej: "Bearer token123")
 * @returns Token o null si no es válido
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Middleware helper para verificar autenticación en rutas protegidas
 * 
 * @param authHeader Header Authorization
 * @returns Usuario autenticado o null si no está autenticado
 */
export async function requireAuth(authHeader: string | null): Promise<{
  id: number;
  email: string;
  username: string | null;
  email_verified: boolean;
} | null> {
  const token = extractTokenFromHeader(authHeader);
  
  if (!token) {
    return null;
  }

  const user = await getUserFromToken(token);
  
  if (!user || !user.email_verified) {
    return null;
  }

  return user;
}

/**
 * Verifica que el usuario autenticado es el propietario del recurso
 * 
 * @param authHeader Header Authorization
 * @param resourceUserId ID del usuario propietario del recurso
 * @returns true si es el propietario, false si no
 */
export async function isResourceOwner(
  authHeader: string | null,
  resourceUserId: number
): Promise<boolean> {
  const user = await requireAuth(authHeader);
  
  if (!user) {
    return false;
  }

  return user.id === resourceUserId;
}

/**
 * Verifica si el usuario autenticado es super_admin
 * Consulta la base de datos para obtener el role del usuario
 * 
 * @param authHeader Header Authorization
 * @returns true si es super_admin, false si no
 */
export async function isSuperAdmin(authHeader: string | null): Promise<boolean> {
  const token = extractTokenFromHeader(authHeader);
  
  if (!token) {
    return false;
  }

  const payload = await verifyToken(token);
  
  if (!payload) {
    return false;
  }

  try {
    // Consultar la base de datos para obtener el role
    // Primero buscar en users (administradores)
    const { pool } = await import('./db');
    const result = await pool.query(
      'SELECT role FROM users WHERE id = $1 AND email = $2',
      [payload.id, payload.email]
    );

    if (result.rows.length > 0) {
      return result.rows[0].role === 'super_admin';
    }
  } catch (error) {
    authLogger.error({ error }, 'Error checking super admin status');
    return false;
  }

  return false;
}
