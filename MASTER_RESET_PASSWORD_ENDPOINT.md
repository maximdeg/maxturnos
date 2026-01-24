# Endpoint Master: Reset Password

## 📋 Descripción

Endpoint master para cambiar la contraseña de cualquier usuario (proveedor o administrador) solo conociendo su email y username (opcional para admins). Solo accesible para super administradores.

## 🔐 Seguridad

- **Requiere autenticación:** Sí (Bearer Token)
- **Requiere permisos:** Solo `super_admin`
- **No requiere contraseña actual:** Este endpoint permite cambiar contraseñas sin conocer la contraseña actual

## 📍 Endpoint

```
POST /api/admin/master-reset-password
```

## 🔑 Autenticación

**Headers requeridos:**
```
Authorization: Bearer <super_admin_token>
Content-Type: application/json
```

## 📥 Request Body

```json
{
  "email": "usuario@example.com",
  "username": "usuario123",  // Opcional para proveedores, no aplica para admins
  "new_password": "NuevaContraseña123!"
}
```

### Campos

- **`email`** (requerido): Email del usuario cuya contraseña se desea cambiar
- **`username`** (opcional): Username del usuario (solo para proveedores en `user_accounts`)
- **`new_password`** (requerido): Nueva contraseña (mínimo 8 caracteres)

## 📤 Response

### Success (200)

```json
{
  "success": true,
  "message": "Contraseña actualizada exitosamente",
  "user": {
    "id": 1,
    "email": "usuario@example.com",
    "username": "usuario123",
    "user_type": "provider",
    "role": null
  }
}
```

O para administradores:

```json
{
  "success": true,
  "message": "Contraseña actualizada exitosamente",
  "user": {
    "id": 1,
    "email": "admin@example.com",
    "username": null,
    "user_type": "admin",
    "role": "admin"
  }
}
```

### Error Responses

#### 400 - Datos Inválidos
```json
{
  "error": "Datos inválidos",
  "details": [
    {
      "path": ["new_password"],
      "message": "La nueva contraseña debe tener al menos 8 caracteres"
    }
  ]
}
```

#### 403 - No Autorizado
```json
{
  "error": "No autorizado. Solo super administradores pueden usar este endpoint.",
  "message": "Este endpoint requiere permisos de super administrador."
}
```

#### 404 - Usuario No Encontrado
```json
{
  "error": "Usuario no encontrado con el email proporcionado"
}
```

O si username no coincide:

```json
{
  "error": "Usuario no encontrado. El email y username no coinciden."
}
```

#### 500 - Error del Servidor
```json
{
  "error": "Error al actualizar contraseña",
  "message": "Detalles del error (solo en desarrollo)"
}
```

## 🔍 Lógica del Endpoint

1. **Verifica autenticación:** Valida que el token sea válido
2. **Verifica permisos:** Confirma que el usuario autenticado sea `super_admin`
3. **Valida datos:** Valida email y nueva contraseña con Zod
4. **Busca usuario:** 
   - Primero busca en `user_accounts` (proveedores)
   - Si no encuentra, busca en `users` (administradores)
   - Si se proporciona `username`, valida que coincida con el email
5. **Hashea contraseña:** Usa bcrypt con 10 salt rounds
6. **Actualiza contraseña:** Actualiza en la tabla correspondiente
7. **Registra acción:** Log de la operación para auditoría

## 📝 Ejemplos de Uso

### Ejemplo 1: Cambiar contraseña de un proveedor

```bash
curl -X POST http://localhost:3000/api/admin/master-reset-password \
  -H "Authorization: Bearer <super_admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "proveedor@example.com",
    "username": "proveedor123",
    "new_password": "NuevaContraseña123!"
  }'
```

### Ejemplo 2: Cambiar contraseña de un administrador

```bash
curl -X POST http://localhost:3000/api/admin/master-reset-password \
  -H "Authorization: Bearer <super_admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "new_password": "NuevaContraseña123!"
  }'
```

### Ejemplo 3: Usando PowerShell

```powershell
$token = "tu_super_admin_token_aqui"
$body = @{
    email = "usuario@example.com"
    username = "usuario123"
    new_password = "NuevaContraseña123!"
} | ConvertTo-Json

$headers = @{
    Authorization = "Bearer $token"
    "Content-Type" = "application/json"
}

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/admin/master-reset-password" `
    -Method POST `
    -Headers $headers `
    -Body $body

$response | ConvertTo-Json
```

### Ejemplo 4: Usando JavaScript/TypeScript

```typescript
const response = await fetch('/api/admin/master-reset-password', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${superAdminToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'usuario@example.com',
    username: 'usuario123', // Opcional
    new_password: 'NuevaContraseña123!',
  }),
});

const data = await response.json();
```

## ⚠️ Consideraciones Importantes

1. **Seguridad:**
   - Este endpoint solo debe ser accesible para super administradores
   - Todas las operaciones se registran en logs para auditoría
   - La contraseña se hashea antes de guardarse

2. **Validaciones:**
   - El email debe existir en alguna de las tablas (`user_accounts` o `users`)
   - Si se proporciona `username`, debe coincidir con el email
   - La nueva contraseña debe tener mínimo 8 caracteres

3. **Tipos de Usuarios:**
   - **Proveedores** (`user_accounts`): Requieren `username` para identificación única
   - **Administradores** (`users`): Solo requieren `email` (no tienen `username`)

4. **Logs:**
   - Todas las operaciones se registran con información del usuario que realiza el cambio
   - Incluye: `userId`, `email`, `userType`, `changedBy`, `duration`

## 🧪 Testing

Puedes probar el endpoint usando el script incluido:

```bash
node scripts/test-master-reset-password.js
```

Este script:
1. Hace login como super_admin
2. Obtiene el token
3. Usa el endpoint para cambiar una contraseña de prueba
4. Verifica que el cambio fue exitoso

## 📊 Tablas Afectadas

- `user_accounts` - Para proveedores
- `users` - Para administradores

Ambas tablas actualizan el campo `password` y `updated_at`.

## 🔗 Endpoints Relacionados

- `PUT /api/proveedor/profile/password` - Cambiar contraseña propia (requiere contraseña actual)
- `POST /api/auth/login` - Login para obtener token de super_admin
