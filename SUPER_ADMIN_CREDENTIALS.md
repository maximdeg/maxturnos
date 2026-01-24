# Credenciales de Super Admin

## ✅ Usuario Creado Exitosamente

**Fecha de creación:** 2026-01-23

## 📝 Credenciales

- **Email:** `maxim.degtiarev.dev@gmail.com`
- **Password:** `SuperAdmin2024!`
- **Role:** `super_admin`
- **ID:** 1
- **Nombre:** Maxim Degtiarev

## 🔐 Información de Acceso

Estas credenciales te permiten acceder al panel de administración del sistema con permisos de super administrador.

## ⚠️ Seguridad

- **Guarda estas credenciales en un lugar seguro**
- **Cambia la contraseña después del primer acceso**
- **No compartas estas credenciales públicamente**
- La contraseña está hasheada con bcrypt en la base de datos

## 📋 Script Utilizado

El usuario fue creado usando el script: `scripts/create-super-admin.js`

Para crear otro super admin o actualizar este usuario, puedes ejecutar:
```bash
node scripts/create-super-admin.js
```

## 🔄 Cambiar Contraseña

Si necesitas cambiar la contraseña del super admin, puedes:

1. **Opción 1:** Ejecutar el script nuevamente (actualizará el role pero no la contraseña)
2. **Opción 2:** Actualizar manualmente en la base de datos usando bcrypt para hashear la nueva contraseña
3. **Opción 3:** Usar el panel de administración si tiene funcionalidad de cambio de contraseña

## 📊 Estructura de la Tabla

La tabla `users` tiene la siguiente estructura:
- `id` - ID único del usuario
- `full_name` - Nombre completo
- `email` - Email único (usado para login)
- `password` - Contraseña hasheada con bcrypt
- `role` - Rol del usuario (`super_admin`, `admin`, etc.)
- `reset_token` - Token para reset de contraseña (opcional)
- `reset_token_expires` - Expiración del token (opcional)
- `created_at` - Fecha de creación
- `updated_at` - Fecha de última actualización
