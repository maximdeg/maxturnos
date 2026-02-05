# Producción — MaxTurnos

Checklist y consideraciones para desplegar y operar MaxTurnos en producción.

## Variables de entorno requeridas

En producción deben estar definidas:

| Variable | Descripción |
|----------|-------------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | Mínimo 32 caracteres. La app **no arranca** en producción si falta o es corto. |
| `POSTGRESQL_HOST` | Host de PostgreSQL |
| `POSTGRESQL_DATABASE` | Nombre de la base de datos |
| `POSTGRESQL_USER` | Usuario de la base |
| `POSTGRESQL_PASSWORD` | Contraseña de la base |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app (ej. `https://maxturnos.example.com`) |
| `EMAIL_USER` / `EMAIL_PASS` | Para envío de correos (verificación, notificaciones) |
| `UPSTASH_REDIS_REST_URL` | URL de Upstash Redis (rate limiting) |
| `UPSTASH_REDIS_REST_TOKEN` | Token de Upstash Redis |

Opcionales pero recomendados:

- `POSTGRESQL_SSL_MODE=require` (y `POSTGRESQL_CA_CERT` si el proveedor lo exige)
- `LOG_LEVEL=info` o `warn`

**En producción:**

- No definir `TEST_MODE` o ponerlo en `false`. Si está en `true`, los rate limits son más permisivos.
- No usar valores de desarrollo para `JWT_SECRET` ni credenciales de base de datos.

Referencia completa: [.env.example](../.env.example) en la raíz del proyecto.

## Seguridad

- **JWT:** En `NODE_ENV=production`, la aplicación no inicia si `JWT_SECRET` no está definido o tiene menos de 32 caracteres.
- **HTTPS:** Servir la app siempre por HTTPS. El header `Strict-Transport-Security` se añade cuando `NEXT_PUBLIC_APP_URL` es `https://`.
- **Headers:** Next.js está configurado para enviar `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` y, en producción con HTTPS, HSTS.
- **Rate limiting:** Depende de Redis (Upstash). Sin `UPSTASH_REDIS_*`, no hay límite de solicitudes; en producción es obligatorio configurar Redis.
- **Admin:** El panel admin y el endpoint de master reset están documentados en [ADMIN.md](ADMIN.md). El reset de contraseña requiere token de super_admin.

## Base de datos

Antes del primer despliegue en un entorno nuevo:

1. Crear la base de datos y el usuario en PostgreSQL.
2. Ejecutar el setup de tablas y datos de referencia:

   ```bash
   npm run setup-db
   ```

3. (Opcional) Crear el primer super_admin:

   ```bash
   node scripts/create-super-admin.js
   ```

Las variables `POSTGRESQL_*` deben apuntar al servidor de producción. Para cambiar la contraseña del super_admin sin acceso al panel, ver [ADMIN.md](ADMIN.md).

## Logging

- Usar `LOG_LEVEL=info` o `warn` en producción.
- Los logs son estructurados (Pino/JSON) para integrar con sistemas de monitoreo.

## Health check

El endpoint **GET /api/health** devuelve:

- Estado del servidor
- Conexión a PostgreSQL
- Comprobación de variables críticas (JWT_SECRET, POSTGRESQL_HOST, POSTGRESQL_DATABASE)

Útil para comprobaciones de carga (load balancer, Kubernetes, etc.). Respuesta 200 si todo está bien; 503 si algo falla.

## Resumen rápido

1. Definir todas las variables requeridas (ver tabla y `.env.example`).
2. `NODE_ENV=production`, `TEST_MODE` sin definir o `false`.
3. Configurar Upstash Redis para rate limiting.
4. Ejecutar `npm run setup-db` antes del primer deploy.
5. Comprobar `/api/health` tras el despliegue.
6. Admin y contraseña super_admin: [ADMIN.md](ADMIN.md).
