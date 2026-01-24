# Guía: Cómo Configurar la Autenticación del Backend en TestSprite

## 🔍 Dónde Encontrar la Configuración de Autenticación

### 1. **Tipo de Autenticación**

Tu backend usa **JWT (JSON Web Tokens)** con el esquema **Bearer Token**.

**Ubicación en el código:**
- `lib/auth.ts` - Funciones de generación y verificación de tokens
- `middleware.ts` - Middleware que verifica tokens en rutas protegidas
- `app/api/auth/login/route.ts` - Endpoint que genera tokens

### 2. **Cómo Funciona la Autenticación**

#### Endpoint de Login
```
POST /api/auth/login
Content-Type: application/json

Body:
{
  "email": "usuario@example.com",
  "password": "contraseña"
}

Respuesta Exitosa (200):
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "usuario@example.com",
    "username": "usuario",
    "email_verified": true
  }
}
```

#### Uso del Token en Rutas Protegidas

Las rutas protegidas requieren el header `Authorization`:

```
Authorization: Bearer <token>
```

**Rutas Protegidas:**
- `/api/proveedor/*` - Todas las rutas del panel del proveedor

**Rutas Públicas (no requieren autenticación):**
- `/api/auth/register`
- `/api/auth/login`
- `/api/auth/verify-email`
- `/api/health-insurance`
- `/api/available-times/[date]`
- `/api/provider/[username]/work-schedule`
- `/api/appointments/create`
- `/api/appointments/[id]`

### 3. **Configuración Actual en TestSprite**

**Archivo:** `testsprite_tests/tmp/config.json`

```json
{
  "loginUser": "maxdegdev.test@gmail.com",
  "loginPassword": "admin1234",
  "localEndpoint": "http://localhost:3000/"
}
```

### 4. **Cómo Configurar en TestSprite**

Cuando TestSprite te pregunte **"Select how your backend server authenticates incoming requests"**, debes seleccionar:

#### Opción: **"Bearer Token (JWT)"** o **"Authorization Header"**

**Configuración necesaria:**

1. **Endpoint de Login:**
   ```
   POST http://localhost:3000/api/auth/login
   ```

2. **Credenciales:**
   - Email: `maxdegdev.test@gmail.com`
   - Password: `admin1234`

3. **Campo del Token en la Respuesta:**
   - El token viene en el campo `token` de la respuesta JSON
   - Ejemplo: `response.token`

4. **Formato del Header:**
   ```
   Authorization: Bearer {token}
   ```

5. **Rutas que Requieren Autenticación:**
   - `/api/proveedor/*` - Todas las rutas que empiezan con `/api/proveedor/`

### 5. **Verificación Manual**

Puedes probar manualmente la autenticación con PowerShell:

```powershell
# 1. Hacer login y obtener token
$loginBody = @{
    email = "maxdegdev.test@gmail.com"
    password = "admin1234"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" `
    -Method POST `
    -Body $loginBody `
    -ContentType "application/json"

$token = $loginResponse.token
Write-Host "Token obtenido: $token"

# 2. Usar el token en una ruta protegida
$headers = @{
    Authorization = "Bearer $token"
}

$profileResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/proveedor/profile" `
    -Method GET `
    -Headers $headers

Write-Host "Perfil obtenido:"
$profileResponse | ConvertTo-Json
```

### 6. **Detalles Técnicos del JWT**

- **Algoritmo:** HS256
- **Expiración:** 24 horas
- **Secret:** Configurado en `JWT_SECRET` (mínimo 32 caracteres)
- **Payload incluye:**
  - `id`: ID del usuario
  - `email`: Email del usuario
  - `username`: Nombre de usuario
  - `email_verified`: Estado de verificación del email

### 7. **Requisitos Importantes**

⚠️ **El usuario debe tener el email verificado** antes de poder hacer login.

Si intentas hacer login con un usuario no verificado, recibirás:
```json
{
  "success": false,
  "error": "Email no verificado. Por favor verifica tu email antes de iniciar sesión.",
  "status": 403
}
```

### 8. **Solución de Problemas**

#### Error 401 (No autorizado)
- Verifica que el token esté en el header `Authorization`
- Verifica que el formato sea `Bearer <token>` (con espacio después de "Bearer")
- Verifica que el token no haya expirado (24 horas)

#### Error 403 (Email no verificado)
- El usuario debe verificar su email primero usando `/api/auth/verify-email?token=<verification_token>`

#### Error 500 (Error del servidor)
- Verifica que `JWT_SECRET` esté configurado en `.env.local`
- Verifica que el servidor esté corriendo en `http://localhost:3000`
- Revisa los logs del servidor para más detalles

---

## 📝 Resumen para TestSprite

**Tipo de Autenticación:** Bearer Token (JWT)

**Configuración:**
- Login Endpoint: `POST /api/auth/login`
- Credenciales: Email + Password
- Token Field: `response.token`
- Header Format: `Authorization: Bearer {token}`
- Protected Routes: `/api/proveedor/*`

**Credenciales de Prueba:**
- Email: `maxdegdev.test@gmail.com`
- Password: `admin1234`
