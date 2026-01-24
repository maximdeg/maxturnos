# Configuración de Modo de Prueba (Test Mode)

Este documento explica cómo configurar y usar el modo de prueba para ejecutar tests automatizados con límites de rate limiting más permisivos.

## 🎯 Objetivo

El modo de prueba permite ejecutar tests automatizados sin ser bloqueados por rate limiting, mientras mantiene la protección en producción.

## ⚙️ Configuración

### 1. Variables de Entorno

Para activar el modo de prueba, configurar las siguientes variables de entorno:

```bash
# Activar modo de prueba
NODE_ENV=test
TEST_MODE=true

# Opcional: Deshabilitar completamente rate limiting en tests
DISABLE_RATE_LIMIT_IN_TEST=true
```

### 2. Crear Usuario de Prueba

Ejecutar el script para crear un usuario de prueba:

```bash
npm run create-test-user
```

O directamente:

```bash
node scripts/create-test-user.js
```

Esto creará un usuario con las siguientes credenciales:
- **Email:** `test@maxturnos.com`
- **Username:** `testprovider`
- **Password:** `TestPassword123!`
- **Email Verified:** `true`

## 📊 Límites de Rate Limiting

### Producción vs. Modo Test

| Endpoint | Producción | Modo Test | Mejora |
|----------|------------|-----------|--------|
| **Crear Cita** | 5 req/min | 100 req/min | 20x |
| **Registro** | 3 req/10min | 50 req/min | ~167x |
| **Login** | 5 req/5min | 100 req/min | 20x |
| **Verificar Email** | 10 req/hora | 100 req/min | 600x |
| **Perfil Proveedor** | 30 req/min | 200 req/min | ~6.7x |
| **Lectura Pública** | 10 req/10s | 100 req/min | 10x |

## 🧪 Uso en Tests

### Ejemplo: Ejecutar Tests con Modo Test

```bash
# Configurar variables de entorno antes de ejecutar tests
export NODE_ENV=test
export TEST_MODE=true

# Ejecutar tests (ejemplo con TestSprite u otro framework)
npm run test
```

### Ejemplo: Ejecutar Servidor en Modo Test

```bash
# En una terminal
NODE_ENV=test TEST_MODE=true npm run dev

# En otra terminal, ejecutar tests
npm run test
```

## 🔍 Detección de Modo Test

El sistema detecta el modo de prueba de dos formas:

1. **Variable `NODE_ENV=test`**: Estándar de Node.js para entornos de prueba
2. **Variable `TEST_MODE=true`**: Variable explícita para activar modo test

```typescript
// En lib/rate-limit.ts
const isTestMode = process.env.NODE_ENV === 'test' || process.env.TEST_MODE === 'true';
```

## 🚫 Deshabilitar Rate Limiting Completamente

Si necesitas deshabilitar completamente el rate limiting en tests:

```bash
DISABLE_RATE_LIMIT_IN_TEST=true npm run test
```

Esto hará que todas las verificaciones de rate limiting retornen `success: true` sin límites.

## 📝 Archivos Relacionados

- **`lib/rate-limit.ts`**: Implementación del rate limiting con soporte de modo test
- **`scripts/create-test-user.js`**: Script para crear usuario de prueba
- **`TESTS_CREDENTIALS.md`**: Documentación de credenciales de prueba
- **`.env.test.example`**: Plantilla de configuración (si está disponible)

## ⚠️ Advertencias

1. **NUNCA** usar modo test en producción
2. **SIEMPRE** verificar que `NODE_ENV !== 'test'` en producción
3. **SIEMPRE** usar credenciales de prueba diferentes a las de producción
4. **SIEMPRE** limpiar datos de prueba después de ejecutar tests

## 🔄 Flujo de Trabajo Recomendado

1. **Configurar variables de entorno:**
   ```bash
   export NODE_ENV=test
   export TEST_MODE=true
   ```

2. **Crear usuario de prueba:**
   ```bash
   npm run create-test-user
   ```

3. **Ejecutar tests:**
   ```bash
   npm run test
   ```

4. **Limpiar después de tests:**
   - Los datos de prueba pueden permanecer en la base de datos
   - El usuario de prueba puede ser reutilizado en ejecuciones futuras
   - Si es necesario limpiar, ejecutar `npm run create-test-user` nuevamente

## 📚 Referencias

- Ver `TESTS_CREDENTIALS.md` para credenciales de prueba
- Ver `lib/rate-limit.ts` para implementación técnica
- Ver reportes de TestSprite en `testsprite_tests/` para resultados de pruebas
