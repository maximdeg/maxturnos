# Credenciales de Prueba para Tests Automatizados

Este documento contiene las credenciales de prueba para usar en tests automatizados.

## 🔐 Credenciales del Usuario de Prueba

**⚠️ IMPORTANTE:** Estas credenciales son solo para uso en entornos de prueba. **NUNCA** usar en producción.

### Credenciales Predefinidas

```
Email:        test@maxturnos.com
Username:     testprovider
Password:     TestPassword123!
User ID:      (se asigna automáticamente al crear)
```

### Crear Usuario de Prueba

Para crear el usuario de prueba en la base de datos, ejecutar:

```bash
node scripts/create-test-user.js
```

Este script:
- Crea un usuario con las credenciales predefinidas
- Marca el email como verificado (`email_verified = true`)
- Si el usuario ya existe, lo elimina y lo recrea

## 🧪 Configuración para Tests

### Variables de Entorno

Para ejecutar tests con límites de rate limiting más permisivos, configurar:

```bash
# En .env.test o antes de ejecutar tests
NODE_ENV=test
TEST_MODE=true

# Opcional: Deshabilitar completamente rate limiting en tests
DISABLE_RATE_LIMIT_IN_TEST=true
```

### Límites de Rate Limiting en Modo Test

En modo test, los límites son mucho más permisivos:

| Endpoint | Producción | Modo Test |
|----------|------------|-----------|
| Crear Cita | 5 req/min | 100 req/min |
| Registro | 3 req/10min | 50 req/min |
| Login | 5 req/5min | 100 req/min |
| Verificar Email | 10 req/hora | 100 req/min |
| Perfil Proveedor | 30 req/min | 200 req/min |
| Lectura Pública | 10 req/10s | 100 req/min |

## 📝 Uso en Tests

### Ejemplo con TestSprite

```javascript
// En tus tests automatizados
const testCredentials = {
  email: process.env.TEST_USER_EMAIL || 'test@maxturnos.com',
  password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
  username: process.env.TEST_USER_USERNAME || 'testprovider',
};
```

### Ejemplo con Jest/Vitest

```typescript
// tests/helpers/auth.ts
export const TEST_CREDENTIALS = {
  email: 'test@maxturnos.com',
  password: 'TestPassword123!',
  username: 'testprovider',
};

export async function loginAsTestUser() {
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_CREDENTIALS.email,
      password: TEST_CREDENTIALS.password,
    }),
  });
  
  const data = await response.json();
  return data.token;
}
```

## 🔄 Mantenimiento

### Recrear Usuario de Prueba

Si necesitas recrear el usuario de prueba (por ejemplo, después de cambios en el esquema):

```bash
node scripts/create-test-user.js
```

### Verificar Usuario de Prueba

Para verificar que el usuario de prueba existe:

```sql
SELECT id, email, username, email_verified, created_at
FROM user_accounts
WHERE email = 'test@maxturnos.com';
```

## ⚠️ Seguridad

- **NUNCA** commitear `.env.test` con credenciales reales en producción
- **NUNCA** usar estas credenciales en producción
- **SIEMPRE** usar variables de entorno para credenciales en tests
- **SIEMPRE** limpiar datos de prueba después de ejecutar tests

## 📚 Referencias

- Ver `lib/rate-limit.ts` para configuración de rate limiting en modo test
- Ver `scripts/create-test-user.js` para el script de creación
- Ver `.env.test.example` para plantilla de configuración
