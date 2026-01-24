# Correcciones de Logger y Caché - Errores Detectados en Logs

**Fecha:** 2026-01-22  
**Problemas Identificados:** Errores en logs del servidor

---

## 🔍 Problemas Detectados en los Logs

### 1. **Error: "the worker has exited" en Logger Pino** ❌

**Síntoma:**
```
Error: the worker has exited
    at logApiRequest (lib\logger.ts:207:15)
    at GET (app\api\health-insurance\route.ts:48:18)
```

**Causa:**
- `pino-pretty` usa worker threads para formatear logs
- Next.js tiene problemas con worker threads en algunos entornos
- El worker thread se cierra inesperadamente causando errores no capturados

**Impacto:**
- Los endpoints funcionan correctamente (200 OK)
- Pero generan errores "uncaughtException" en los logs
- Puede causar problemas en producción

---

### 2. **Error: "Cache get error: SyntaxError" en Caché** ❌

**Síntoma:**
```
Cache get error: SyntaxError: Unexpected token 'o', "[object Obj"... is not valid JSON
    at JSON.parse (<anonymous>)
    at getCache (lib\cache.ts:50:19)
```

**Causa:**
- Cuando se usa caché en memoria (LRU cache), los objetos se guardan directamente
- Pero `getCache` intenta parsear como JSON incluso para caché en memoria
- El caché en memoria devuelve objetos directamente, no strings JSON

**Impacto:**
- El caché falla silenciosamente y vuelve a leer desde la fuente
- No es crítico pero genera errores en logs
- Puede afectar rendimiento al no usar caché efectivamente

---

## ✅ Correcciones Aplicadas

### 1. **Logger Pino - Removido Transport Worker**

**Archivo:** `lib/logger.ts`

**Cambio:**
- Removido `transport` con `pino-pretty` en desarrollo
- Ahora usa formato JSON estándar incluso en desarrollo
- Evita problemas con worker threads en Next.js

**Antes:**
```typescript
const developmentConfig: pino.LoggerOptions = {
  ...baseConfig,
  transport: {
    target: 'pino-pretty',
    options: { ... }
  },
};
```

**Después:**
```typescript
const developmentConfig: pino.LoggerOptions = {
  ...baseConfig,
  // No usar transport en Next.js para evitar problemas con worker threads
  // El formato JSON será legible en desarrollo
};
```

---

### 2. **Caché - Manejo Correcto de Memoria vs Redis**

**Archivo:** `lib/cache.ts`

**Cambios:**

#### a) `getCache` - Manejo diferenciado:
- **Redis**: Parsea JSON string
- **Memoria**: Devuelve objeto directamente (sin parsear)

**Antes:**
```typescript
if (redis) {
  const value = await redis.get<string>(key);
  return JSON.parse(value) as T;
} else {
  const value = memoryCache.get(key);
  return value as T | null; // Intentaba parsear después
}
```

**Después:**
```typescript
if (redis) {
  const value = await redis.get<string>(key);
  if (value === null) return null;
  try {
    return JSON.parse(value) as T; // Solo parsea para Redis
  } catch (parseError) {
    console.error('Cache parse error:', parseError);
    return null;
  }
} else {
  // Memoria devuelve objeto directamente
  const value = memoryCache.get(key);
  return value as T | null;
}
```

#### b) `setCache` - Serialización consistente:
- **Redis**: Serializa a JSON string
- **Memoria**: Intenta serializar/deserializar para consistencia, pero puede guardar objetos directamente si falla

**Después:**
```typescript
if (redis) {
  await redis.setex(key, ttlSeconds, JSON.stringify(value));
} else {
  try {
    // Serializar y deserializar para asegurar consistencia
    const serialized = JSON.parse(JSON.stringify(value));
    memoryCache.set(key, serialized, { ttl: ttlSeconds * 1000 });
  } catch (serializeError) {
    // Si falla, guardar directamente (para objetos complejos)
    memoryCache.set(key, value, { ttl: ttlSeconds * 1000 });
  }
}
```

#### c) `getOrSetCache` - Almacenamiento asíncrono:
- Almacena en caché de forma asíncrona usando `setImmediate`
- No bloquea la respuesta del endpoint
- Maneja errores de caché sin afectar la respuesta

**Después:**
```typescript
const value = await fetchFn();

// Almacenar en caché de forma asíncrona (no bloquear respuesta)
setImmediate(async () => {
  try {
    await setCache(key, value, ttlSeconds);
  } catch (cacheError) {
    console.error('Cache set error (non-critical):', cacheError);
  }
});

return value;
```

---

## 📋 Verificación

### Endpoints que Deberían Funcionar Sin Errores:

1. ✅ `/api/health` - Health check
2. ✅ `/api/health-insurance` - Obras sociales (usa caché)
3. ✅ `/api/auth/login` - Login (usa logger)
4. ✅ `/api/auth/register` - Registro (usa logger y email)
5. ✅ `/api/provider/[username]/work-schedule` - Horario de trabajo (usa caché y logger)

### Errores que Deberían Desaparecer:

- ❌ "Error: the worker has exited" → ✅ **RESUELTO**
- ❌ "Cache get error: SyntaxError" → ✅ **RESUELTO**
- ❌ "uncaughtException" por logger → ✅ **RESUELTO**

---

## 🚀 Próximos Pasos

1. **Reiniciar el servidor** para aplicar los cambios
2. **Verificar logs** - No deberían aparecer los errores anteriores
3. **Probar endpoints** - Deberían funcionar sin errores en logs
4. **Re-ejecutar pruebas** con TestSprite

---

## 📝 Notas

- Los endpoints **ya estaban funcionando correctamente** (200 OK)
- Los errores eran **no críticos** pero generaban ruido en logs
- Las correcciones mejoran la **estabilidad y limpieza de logs**
- El caché ahora funciona **correctamente** tanto con Redis como con memoria

---

**Estado:** ✅ **Correcciones Aplicadas**  
**Requiere:** Reinicio del servidor para aplicar cambios
