# MaxTurnos — Funcionalidades y Tecnologías

Documento de referencia sobre las funcionalidades de la aplicación y el stack tecnológico utilizado.

---

## 1. Resumen de la aplicación

**MaxTurnos** es un sistema de reserva de turnos médicos multi-proveedor. Permite a profesionales de la salud (proveedores) ofrecer enlaces de reserva personalizados y a los pacientes agendar, ver y cancelar citas de forma autónoma, sin necesidad de llamadas ni cuentas de paciente.

- **Público objetivo:** Clínicas, consultorios y profesionales de la salud (ej. dermatólogos).
- **Idioma:** Español (Argentina); formatos de fecha dd/MM/yyyy y zona horaria local.
- **Despliegue:** Next.js con output `standalone`, compatible con Docker y Vercel.

---

## 2. Funcionalidades por tipo de usuario

### 2.1 Público (sin autenticación)

| Funcionalidad | Descripción | Rutas |
|---------------|-------------|-------|
| **Landing** | Página de presentación: valor del producto, “Cómo funciona”, beneficios, CTAs a Registro e Inicio de sesión. | `/` |
| **Página del proveedor** | Información del profesional, servicios y botón “Agendar visita”. | `/[username]` |
| **Agendar visita** | Formulario de reserva: nombre, teléfono, tipo de visita (Consulta / Práctica), tipo de consulta o práctica, obra social, fecha (calendario), horario (slots), notas. Obras sociales filtradas según tipo de visita. | `/[username]/agendar-visita` |
| **Confirmación de cita** | Ver detalle de la cita (paciente, fecha, hora, tipo, obra social, estado). Opción “Cancelar cita” si está programada y faltan más de 24 h (con token). | `/[username]/cita/[id]` |
| **Verificación de email** | El proveedor hace clic en el enlace del correo para verificar su cuenta. | `/[username]/verificar-email` |

**Reglas de reserva:**

- Fechas bloqueadas: pasadas, más de 30 días, días no laborables, días no disponibles del proveedor y festivos (ej. 01-01, 12-25).
- Slots de 20 minutos derivados del horario laboral del proveedor, descontando citas y bloques.
- Cancelación por paciente: solo con token en la URL; permitida solo si faltan más de 24 horas.

### 2.2 Proveedor (autenticado)

| Funcionalidad | Descripción | Rutas |
|---------------|-------------|-------|
| **Registro** | Email, contraseña, username (slug), nombre, apellido, WhatsApp opcional. Verificación de email obligatoria antes de poder iniciar sesión. | `/proveedor/register` |
| **Login** | Email + contraseña. Devuelve JWT; se guarda en `localStorage`. Requiere email verificado. | `/proveedor/login` |
| **Panel / Perfil** | Dashboard con pestañas: Citas, Calendario, Perfil, Horarios, Obras sociales. | `/proveedor/perfil` |
| **Citas** | Listado con filtros (estado, rango de fechas). Ver estado de envío por WhatsApp. Cancelar cita (con confirmación); si está configurado WhatsApp, se notifica al paciente con enlace para reagendar. | Pestaña Citas |
| **Calendario** | Vista mensual; días coloreados por estado (laboral, completo, con citas). Resumen (total citas, días laborables, días completos). Clic en día para ver detalle y listado de citas. | Pestaña Calendario |
| **Perfil** | Editar email, nombre, apellido, WhatsApp. Cambio de contraseña (actual + nueva + confirmación). | Pestaña Perfil |
| **Horarios** | Por día de la semana: activar/desactivar día laboral; agregar/quitar franjas horarias (inicio–fin); agregar/quitar días no disponibles (fecha concreta). | Pestaña Horarios |
| **Obras sociales** | CRUD de obras sociales (nombre, precio opcional, notas). Esta lista se usa en el formulario público de reserva (filtrada por tipo de visita). | Pestaña Obras sociales |

Todas las APIs bajo `/api/proveedor/*` exigen cabecera `Authorization: Bearer <token>` y que el proveedor tenga `email_verified = true`.

### 2.3 Administrador (super admin)

| Funcionalidad | Descripción | Rutas |
|---------------|-------------|-------|
| **Login admin** | Login separado usando la tabla `users` (no `user_accounts`). Mismo endpoint de login pero búsqueda en tabla de admins. | `/admin/login` |
| **Panel de proveedores** | Listado de proveedores. | `/admin/providers` |
| **Restablecer contraseña** | El super admin puede restablecer la contraseña de un usuario (incluido la suya) desde el panel. | `/admin/providers/[id]/reset` |

El super admin se crea con scripts (`create-super-admin.js`, `change-super-admin-password.js`) y vive en la tabla `users` con rol `super_admin`.

---

## 3. APIs principales

### 3.1 Públicas (sin token)

- `GET /api/health` — Estado del servidor, BD y variables críticas (y Redis si está configurado).
- `GET /api/health-insurance` — Lista de obras sociales (para el formulario de reserva).
- `GET /api/visit-types` — Tipos de visita (Consulta, Práctica).
- `GET /api/provider/[username]/info` — Información pública del proveedor.
- `GET /api/provider/[username]/work-schedule` — Días y franjas laborales (para disponibilidad).
- `GET /api/available-times/[date]` — Slots disponibles para una fecha (query: `username` o `user_account_id`).
- `POST /api/appointments/create` — Crear cita; devuelve datos y URL de confirmación con token de cancelación.
- `GET /api/appointments/[id]` — Detalle de cita (opcional query `token`).
- `POST /api/appointments/[id]/cancel` — Cancelar (body: `token` para paciente, o Bearer para proveedor).
- `POST /api/auth/register` — Registro de proveedor.
- `POST /api/auth/login` — Login proveedor o admin; devuelve JWT.
- `GET /api/auth/verify-email` — Verificación de email con token.

### 3.2 Proveedor (Bearer token)

- Perfil: `GET/PUT /api/proveedor/profile`, `PUT /api/proveedor/profile/password`.
- Citas: `GET /api/proveedor/appointments`.
- Calendario: `GET /api/proveedor/calendar` (query: year, month).
- Horarios: `GET /api/proveedor/work-schedule`, `PUT .../work-schedule/[day_of_week]`, `POST .../slots`, `DELETE .../slots/[id]`.
- Días no disponibles: `GET/POST /api/proveedor/unavailable-days`, `DELETE .../unavailable-days/[id]`.
- Obras sociales: `GET/POST/PUT/DELETE /api/proveedor/health-insurance`.

### 3.3 Admin

- `POST /api/admin/master-reset-password` — Restablecimiento de contraseña por super admin.

### 3.4 Cron y webhooks

- `GET/POST /api/cron/send-reminders` — Envío de recordatorios (ej. 30 h antes); protegido con `CRON_SECRET`.
- `POST /api/whatsapp/webhook` — Webhook para eventos de WhatsApp (ej. estado de entrega).

---

## 4. Stack tecnológico

### 4.1 Frontend

| Tecnología | Uso |
|------------|-----|
| **Next.js 15** | Framework con App Router, rutas dinámicas, API Routes y `output: 'standalone'`. |
| **React 19** | UI y componentes. |
| **TypeScript** | Tipado en toda la app. |
| **Tailwind CSS** | Estilos y diseño responsive. |
| **Radix UI** | Componentes accesibles (Alert Dialog, Calendar, Popover, Select, Tabs, Toast, etc.). |
| **shadcn/ui** | Sistema de componentes (config en `components.json`), basado en Radix + Tailwind. |
| **Framer Motion** | Animaciones (landing, transiciones). |
| **Lucide React** | Iconos. |
| **React Hook Form + Zod** | Formularios y validación. |
| **TanStack Query (React Query)** | Datos del servidor, caché y estado asíncrono. |
| **Redux Toolkit** | Estado global (opcional/complementario). |
| **Sonner** | Notificaciones toast. |
| **next-themes** | Soporte de temas (si se usa). |
| **date-fns / react-day-picker** | Fechas y selector de fechas. |

### 4.2 Backend y datos

| Tecnología | Uso |
|------------|-----|
| **Next.js API Routes** | Endpoints REST (serverless en Vercel). |
| **PostgreSQL** | Base de datos principal (driver `pg`, pool de conexiones). |
| **JWT (jose)** | Tokens de sesión para proveedor/admin y tokens de cancelación firmados. |
| **bcryptjs** | Hash de contraseñas en registro y cambio de contraseña. |
| **Nodemailer** | Envío de emails (verificación, notificaciones). |

### 4.3 Infraestructura y servicios

| Tecnología | Uso |
|------------|-----|
| **Upstash Redis** | Caché (ej. disponibilidad por fecha) y rate limiting (Ratelimit + Redis). |
| **LRU-cache** | Caché en memoria cuando Redis no está configurado. |
| **Pino** | Logging estructurado (api, auth, db, etc.). |
| **Axios** | Cliente HTTP para llamadas desde el servidor (ej. APIs externas). |

### 4.4 Integraciones opcionales

| Servicio | Uso |
|----------|-----|
| **UltraMsg** | WhatsApp: confirmación de cita y aviso de cancelación con enlace para reagendar. |
| **WHAPI / Meta WhatsApp** | Variables en `.env.example` para otros proveedores de WhatsApp. |
| **Web Push** | Dependencia presente para posibles notificaciones push. |

Si no se configuran credenciales de WhatsApp, la reserva y la cancelación siguen funcionando; solo se omite el envío de mensajes.

---

## 5. Seguridad y calidad

- **Middleware:** Protege `/api/proveedor/*`: exige Bearer token, verificación de JWT y `email_verified`.
- **Cancelación por paciente:** Token firmado (payload: appointmentId, patientId, teléfono, fecha, hora; con expiración).
- **Contraseñas:** Bcrypt en registro; para cambio de contraseña del proveedor se exige la contraseña actual.
- **Rate limiting:** Upstash Ratelimit en registro, login, creación de cita y disponibilidad; en producción se recomienda tener Redis configurado.
- **Cabeceras de seguridad:** `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`; HSTS en producción si la app es HTTPS.
- **Validación:** Schemas Zod y restricciones en BD; normalización de teléfono y fechas antes de usar.

---

## 6. Despliegue y entorno

- **Node.js:** 18+ (recomendado 20+).
- **Variables críticas:** `JWT_SECRET` (mín. 32 caracteres), `POSTGRESQL_*`, `NEXT_PUBLIC_APP_URL`. En producción: `UPSTASH_REDIS_*` para rate limiting, `EMAIL_*` para verificación.
- **Docker:** `Dockerfile` con build `standalone`; ejecución con `docker run -p 3000:3000 --env-file .env.local maxturnos-app`.
- **Vercel:** Configuración en `vercel.json`; variables de entorno según `.env.example` y [docs/PRODUCTION.md](PRODUCTION.md).

---

## 7. Documentación relacionada

- [PRODUCT_SPECIFICATION.md](PRODUCT_SPECIFICATION.md) — Especificación del producto y flujos detallados.
- [ADMIN.md](ADMIN.md) — Panel admin, super_admin y cambio de contraseña.
- [PRODUCTION.md](PRODUCTION.md) — Checklist y consideraciones para producción.
- [README.md](../README.md) — Setup local y comandos.

---

*Documento generado a partir del análisis del código y la documentación existente. Última revisión: febrero 2025.*
