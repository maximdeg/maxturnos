import { NextRequest, NextResponse } from 'next/server';
import { getProviderByUsername } from '@/lib/user-routes';
import { apiLogger, logApiRequest } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ username: string }>;
}

/**
 * GET /api/provider/[username]/info
 * 
 * Obtiene la información pública del proveedor por username
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const startTime = Date.now();
  
  try {
    const resolvedParams = await params;
    const { username } = resolvedParams;

    if (!username) {
      const duration = Date.now() - startTime;
      logApiRequest('GET', `/api/provider/${username}/info`, 400, duration);
      return NextResponse.json(
        { error: 'Username es requerido' },
        { status: 400 }
      );
    }

    const provider = await getProviderByUsername(username);

    if (!provider) {
      const duration = Date.now() - startTime;
      logApiRequest('GET', `/api/provider/${username}/info`, 404, duration);
      return NextResponse.json(
        { error: 'Proveedor no encontrado' },
        { status: 404 }
      );
    }

    // Retornar solo información pública (sin password, tokens, etc.)
    const publicProvider = {
      id: provider.id,
      username: provider.username,
      email: provider.email,
      first_name: provider.first_name,
      last_name: provider.last_name,
      whatsapp_phone_number: provider.whatsapp_phone_number,
      email_verified: provider.email_verified,
      created_at: provider.created_at,
    };

    const duration = Date.now() - startTime;
    logApiRequest('GET', `/api/provider/${username}/info`, 200, duration);

    return NextResponse.json(publicProvider);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    apiLogger.error({ 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration 
    }, 'Error getting provider info');
    logApiRequest('GET', `/api/provider/[username]/info`, 500, duration);

    return NextResponse.json(
      { 
        error: 'Error al obtener información del proveedor',
        message: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    );
  }
}
