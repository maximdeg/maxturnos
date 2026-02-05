# MaxTurnos

Sistema de reserva de turnos médicos multi-proveedor. Permite a proveedores ofrecer enlaces de reserva personalizados y a pacientes agendar, ver y cancelar citas de forma autónoma.

## Requisitos

- **Node.js** 18+ (recomendado 20+)
- **PostgreSQL** (para datos de la app)
- **Redis** (opcional en desarrollo; **recomendado en producción** para rate limiting con Upstash)

## Setup local

1. Clonar el repositorio e instalar dependencias:

   ```bash
   npm install
   ```

2. Copiar el archivo de ejemplo de variables de entorno y completar los valores:

   ```bash
   cp .env.example .env.local
   ```

   Editar `.env.local` y configurar al menos: `JWT_SECRET` (mínimo 32 caracteres), `POSTGRESQL_*`, `EMAIL_*`, y opcionalmente `UPSTASH_REDIS_*` para rate limiting.

3. Crear las tablas y datos de referencia en la base de datos:

   ```bash
   npm run setup-db
   ```

4. (Opcional) Crear el primer super admin para el panel admin:

   ```bash
   node scripts/create-super-admin.js
   ```

## Comandos

| Comando        | Descripción                    |
|----------------|--------------------------------|
| `npm run dev`  | Servidor de desarrollo         |
| `npm run build`| Build de producción            |
| `npm run start`| Servidor de producción         |
| `npm run lint` | Ejecutar ESLint                |
| `npm run setup-db` | Crear tablas y datos de referencia |

## Documentación

- [**docs/PRODUCT_SPECIFICATION.md**](docs/PRODUCT_SPECIFICATION.md) — Especificación del producto y flujos.
- [**docs/ADMIN.md**](docs/ADMIN.md) — Panel admin, super_admin y cambio de contraseña.
- [**docs/PRODUCTION.md**](docs/PRODUCTION.md) — Checklist y consideraciones para producción.

## Producción

En producción:

- Configurar **todas** las variables requeridas (ver `.env.example` y [docs/PRODUCTION.md](docs/PRODUCTION.md)).
- Dejar **`TEST_MODE`** sin definir o en `false`.
- Usar **`LOG_LEVEL=info`** (o `warn`).
- Configurar **Upstash Redis** (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) para que el rate limiting esté activo; si no, las APIs no tendrán límite de solicitudes.
- Asegurar **JWT_SECRET** de al menos 32 caracteres; en `NODE_ENV=production` la app no arranca sin él.

El endpoint **GET /api/health** comprueba servidor, base de datos, variables críticas y (si está configurado) Redis; útil para load balancers y orquestadores.

### Docker

Para ejecutar con Docker (build con `output: 'standalone'`):

```bash
docker build -t maxturnos-app .
docker run -p 3000:3000 --env-file .env.local maxturnos-app
```

Configurar las variables de entorno en el host o pasarlas con `-e`. Ver [.env.example](.env.example) y [docs/PRODUCTION.md](docs/PRODUCTION.md).
