# Diagnóstico de Pruebas Backend - TestSprite

## 🔴 Problema Crítico Identificado

Todos los tests de backend fallaron con errores **500 (Internal Server Error)**. Esto indica un problema crítico con el servidor o su configuración.

---

## 📊 Resumen de Resultados

- **Total Tests:** 10
- **Tests Pasados:** 0 (0%)
- **Tests Fallidos:** 10 (100%)
- **Problema Principal:** Errores 500 en todos los endpoints

---

## 🔍 Endpoints Afectados

1. ❌ `/api/auth/login` - Error 500
2. ❌ `/api/auth/register` - Error 500
3. ❌ `/api/health-insurance` - Error 500 (endpoint público)
4. ❌ Todos los demás endpoints que requieren autenticación

---

## 🔧 Posibles Causas

### 1. **Servidor No Está Corriendo Correctamente**
- El servidor podría no estar iniciado
- El servidor podría haber crasheado
- El servidor podría estar en un puerto diferente

**Solución:**
```bash
# Verificar procesos de Node.js
Get-Process -Name node

# Iniciar servidor
npm run dev

# Verificar que esté corriendo en puerto 3000
netstat -ano | findstr :3000
```

### 2. **Problemas con la Base de Datos**
- Conexión a PostgreSQL fallando
- Credenciales incorrectas
- Base de datos no existe
- Tablas no creadas

**Solución:**
```bash
# Verificar variables de entorno en .env.local
POSTGRESQL_HOST=localhost
POSTGRESQL_PORT=5432
POSTGRESQL_DATABASE=MaxTurnos_db
POSTGRESQL_USER=postgres
POSTGRESQL_PASSWORD=...

# Verificar conexión
node -e "const {pool} = require('./lib/db.ts'); pool.query('SELECT 1').then(() => console.log('OK')).catch(e => console.error(e));"
```

### 3. **Variables de Entorno Faltantes**
- `JWT_SECRET` no configurado o muy corto (debe ser mínimo 32 caracteres)
- Variables de Redis faltantes
- Variables de SMTP faltantes

**Solución:**
```bash
# Verificar .env.local tiene:
JWT_SECRET=tu_secret_minimo_32_caracteres_aqui
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

### 4. **Error en el Código**
- Error de sintaxis
- Imports incorrectos
- Dependencias faltantes

**Solución:**
```bash
# Verificar que compile
npm run build

# Verificar dependencias
npm install

# Revisar logs del servidor para errores específicos
```

### 5. **Problema con Rate Limiting**
- `getRateLimitIdentifier` podría estar fallando
- Redis no disponible y fallback no funciona
- Error en la lógica de rate limiting

**Solución:**
- Verificar que `getRateLimitIdentifier` funcione correctamente
- Verificar que el fallback en memoria funcione si Redis no está disponible

---

## 🧪 Pruebas Manuales Recomendadas

### 1. Probar Endpoint Público (Health Insurance)

```powershell
# PowerShell
Invoke-WebRequest -Uri "http://localhost:3000/api/health-insurance" -Method GET

# O con curl (si está disponible)
curl http://localhost:3000/api/health-insurance
```

**Resultado Esperado:** Lista de obras sociales en JSON
**Si falla:** Verificar que el archivo `data/obras-sociales.json` existe y es válido

### 2. Probar Endpoint de Login

```powershell
# PowerShell
$body = @{
    email = "test@maxturnos.com"
    password = "TestPassword123!"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $body -ContentType "application/json"
```

**Resultado Esperado:** Token JWT y datos del usuario
**Si falla:** Verificar:
- Usuario existe en la base de datos
- Contraseña está hasheada correctamente
- JWT_SECRET está configurado
- Base de datos está accesible

### 3. Verificar Logs del Servidor

Los logs del servidor (donde se ejecuta `npm run dev`) deberían mostrar el error específico que está causando los 500.

**Buscar:**
- Errores de conexión a base de datos
- Errores de imports
- Errores de variables de entorno
- Stack traces completos

---

## 📋 Checklist de Verificación

- [ ] Servidor está corriendo (`npm run dev`)
- [ ] Servidor está en puerto 3000
- [ ] Base de datos PostgreSQL está corriendo
- [ ] Variables de entorno configuradas (`.env.local`)
- [ ] `JWT_SECRET` tiene mínimo 32 caracteres
- [ ] Usuario de prueba existe en la base de datos
- [ ] Archivo `data/obras-sociales.json` existe
- [ ] Dependencias instaladas (`npm install`)
- [ ] Código compila sin errores (`npm run build`)
- [ ] Logs del servidor revisados para errores específicos

---

## 🚀 Próximos Pasos

1. **Verificar que el servidor esté corriendo**
2. **Revisar logs del servidor** para identificar el error específico
3. **Probar endpoints manualmente** para confirmar el problema
4. **Corregir el problema identificado**
5. **Re-ejecutar las pruebas** una vez corregido

---

## 📝 Notas Adicionales

- Los errores 500 son errores del servidor, no de los tests
- Los tests están funcionando correctamente, pero el servidor tiene problemas
- Una vez que el servidor funcione correctamente, los tests deberían pasar

---

**Fecha:** 2026-01-22  
**Estado:** 🔴 Crítico - Requiere atención inmediata
