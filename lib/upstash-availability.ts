import * as dns from 'node:dns';

function lookupSyncHostname(hostname: string): void {
  // Node expone lookupSync; algunas versiones de @types/node aún no lo tipan.
  const lookupSync = (dns as typeof dns & { lookupSync: (h: string, o?: { verbatim?: boolean }) => void })
    .lookupSync;
  lookupSync(hostname, { verbatim: true });
}

/**
 * Si false, no se instancia el cliente Upstash (caché en memoria / sin rate limit Redis).
 * - DISABLE_UPSTASH_REDIS=true fuerza off.
 * - Si el host de UPSTASH_REDIS_REST_URL no resuelve (p. ej. BD borrada), evita timeouts largos en cada request.
 */
export function shouldUseUpstashRedis(): boolean {
  if (process.env.DISABLE_UPSTASH_REDIS === 'true') {
    return false;
  }

  const urlRaw = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const tokenRaw = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!urlRaw || !tokenRaw) {
    return false;
  }

  try {
    const hostname = new URL(urlRaw).hostname;
    lookupSyncHostname(hostname);
    return true;
  } catch {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[upstash] UPSTASH_REDIS_REST_URL inválido o el host no resuelve; Redis desactivado. Actualiza .env.local o usa DISABLE_UPSTASH_REDIS=true.'
      );
    }
    return false;
  }
}
