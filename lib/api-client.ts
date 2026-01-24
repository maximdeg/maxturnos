/**
 * Cliente API para hacer peticiones autenticadas
 * Automáticamente incluye el token JWT en el header Authorization
 */

/**
 * Obtiene el token de autenticación desde localStorage
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('auth_token');
}

/**
 * Realiza una petición fetch con autenticación automática
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAuthToken();
  
  const headers = new Headers(options.headers);
  
  // Agregar token si existe
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  // Asegurar Content-Type para peticiones con body
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * GET request con autenticación
 */
export async function apiGet<T = any>(url: string): Promise<T> {
  const response = await apiFetch(url, { method: 'GET' });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  
  return response.json();
}

/**
 * POST request con autenticación
 */
export async function apiPost<T = any>(url: string, data?: any): Promise<T> {
  const response = await apiFetch(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  
  return response.json();
}

/**
 * PUT request con autenticación
 */
export async function apiPut<T = any>(url: string, data?: any): Promise<T> {
  const response = await apiFetch(url, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  
  return response.json();
}

/**
 * DELETE request con autenticación
 */
export async function apiDelete<T = any>(url: string): Promise<T> {
  const response = await apiFetch(url, { method: 'DELETE' });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  
  return response.json();
}
