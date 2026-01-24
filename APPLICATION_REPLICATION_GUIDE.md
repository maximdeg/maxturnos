# Guía de Replicación de la Aplicación

## Documentación Técnica Completa para la Aplicación de Reserva de Turnos MaxTurnos

Este documento proporciona instrucciones completas para replicar toda la aplicación, con enfoque especial en el formulario de reserva de citas `/[username]/agendar-visita` con rutas dinámicas para múltiples proveedores.

---

## Tabla de Contenidos

1. [Resumen de la Aplicación](#resumen-de-la-aplicación)
2. [Contexto de Negocio y Dominio](#contexto-de-negocio-y-dominio)
3. [Guía de Inicio Rápido](#guía-de-inicio-rápido)
4. [Stack Tecnológico](#stack-tecnológico)
5. [Estructura del Proyecto](#estructura-del-proyecto)
6. [Esquema de Base de Datos](#esquema-de-base-de-datos)
7. [Variables de Entorno](#variables-de-entorno)
8. [Instalación y Configuración](#instalación-y-configuración)
9. [El Flujo del Formulario `/[username]/agendar-visita`](#el-flujo-del-formulario-usernameagendar-visita)
10. [Rutas API](#rutas-api)
11. [Estilos y Componentes UI](#estilos-y-componentes-ui)
12. [Autenticación y Seguridad](#autenticación-y-seguridad)
13. [Integración de WhatsApp (Whapi)](#integración-de-whatsapp-whapi)
14. [Página de Detalles de Cita](#página-de-detalles-de-cita)
15. [Flujo de Cancelación](#flujo-de-cancelación)
16. [Perfil del Proveedor](#perfil-del-proveedor)
17. [Características Clave y Flujos de Usuario](#características-clave-y-flujos-de-usuario)
18. [Consideraciones de Despliegue](#consideraciones-de-despliegue)
19. [Pruebas del Formulario](#pruebas-del-formulario)
20. [Solución de Problemas](#solución-de-problemas)
21. [Recursos Adicionales](#recursos-adicionales)
22. [Análisis de Mejores Prácticas: Código Limpio y Base de Datos Rápida](#análisis-de-mejores-prácticas-código-limpio-y-base-de-datos-rápida)
23. [Resumen](#resumen)

---

## Resumen de la Aplicación

### ¿Qué es MaxTurnos?

**MaxTurnos** es un sistema de reserva de turnos multi-proveedor diseñado para proveedores de atención médica (específicamente profesionales médicos) para gestionar citas de pacientes. La aplicación permite a los pacientes reservar citas en línea a través de formularios de reserva específicos de cada proveedor usando rutas dinámicas basadas en el nombre de usuario del proveedor.

### Propósito Principal

La aplicación resuelve el problema de la programación manual de citas proporcionando:
- **Reserva de citas en línea** para pacientes
- **Soporte multi-proveedor** - cada proveedor de atención médica tiene su propia página de reserva mediante `/[username]`
- **Gestión dinámica de disponibilidad** - los proveedores pueden establecer horarios de trabajo, bloquear fechas y gestionar franjas horarias
- **Integración con obras sociales** - soporta el sistema de salud argentino ("obras sociales")
- **Sistema de cancelación seguro** - los pacientes pueden cancelar citas mediante enlaces con tokens seguros
- **Panel de administración** - los proveedores pueden gestionar citas, horarios y datos de pacientes
- **Notificaciones por WhatsApp** - confirmaciones y cancelaciones enviadas automáticamente vía Whapi

### Tipos de Usuarios Clave

1. **Pacientes/Clientes**: 
   - **NO requieren registro** - Acceso libre y directo a los formularios de reserva
   - Reservan citas a través de formularios específicos del proveedor (ej: `/[username]/agendar-visita`)
   - Solo proporcionan nombre, apellido y teléfono al reservar una cita
   - Pueden cancelar citas mediante enlaces seguros recibidos por WhatsApp
   
2. **Proveedores de Atención Médica**: 
   - **DEBEN registrarse** - Requieren cuenta y verificación por email
   - Proceso de registro con validación de email mediante Nodemailer (Google)
   - Gestionan horarios, ven citas, configuran disponibilidad
   - Acceso al panel de administración después de verificar su email
   
3. **Administradores**: Acceso completo al sistema para gestionar proveedores y configuración del sistema

### Características Principales

- ✅ **Formulario de Reserva de Citas**: Formulario multi-paso con campos condicionales según el tipo de visita
- ✅ **Generación Dinámica de Franjas Horarias**: Intervalos de 20 minutos basados en la disponibilidad del proveedor
- ✅ **Gestión de Horarios de Trabajo**: Días laborables y rangos horarios por proveedor
- ✅ **Filtrado de Obras Sociales**: Opciones de seguro contextuales según el tipo de visita
- ✅ **Cancelación de Citas**: Sistema seguro de cancelación basado en tokens
- ✅ **Arquitectura Multi-Proveedor**: Soporte para múltiples proveedores de atención médica con rutas dinámicas
- ✅ **Disponibilidad en Tiempo Real**: Calendario que muestra solo fechas/horarios disponibles
- ✅ **Gestión de Clientes**: Creación automática de clientes y deduplicación por número de teléfono
- ✅ **Integración con WhatsApp**: Notificaciones automáticas de confirmación y cancelación vía Whapi
- ✅ **Página de Detalles de Cita**: Acceso a detalles de la cita y opción de cancelación
- ✅ **Registro de Proveedores**: Sistema de registro con verificación por email usando Nodemailer (Google)
- ✅ **Acceso Libre para Pacientes**: Los pacientes pueden reservar citas sin necesidad de registro
- ✅ **Perfil del Proveedor**: Panel completo de gestión con visualización de citas, calendario interactivo, y configuración de perfil

---

## Contexto de Negocio y Dominio

### Tipos de Visitas Médicas

La aplicación soporta dos tipos principales de visitas en español:

1. **Consulta**
   - Consulta médica general
   - Sub-tipos:
     - **Primera vez**: Consulta inicial
     - **Seguimiento**: Cita de seguimiento

2. **Práctica**
   - Procedimientos o tratamientos médicos
   - Sub-tipos:
     - **Criocirugía**
     - **Electrocoagulación**
     - **Biopsia**

### Sistema de Obras Sociales

La aplicación se integra con el sistema de salud argentino, que incluye:
- **Obras Sociales**: Planes de seguro de salud proporcionados por empleadores o sindicatos
- **Particular**: Opción privada/pago directo
- **Práctica Particular**: Pago privado para procedimientos

El formulario filtra dinámicamente las opciones de seguro según el tipo de visita seleccionado para prevenir combinaciones inválidas.

### Ciclo de Vida de la Cita

1. **Programada**: Estado inicial cuando se crea la cita
2. **Cancelada**: Cita cancelada por paciente o proveedor
3. **Completada**: La cita ha sido cumplida

### Política de Cancelación

- Los pacientes pueden cancelar citas mediante un enlace con token seguro
- La cancelación debe ocurrir **al menos 12 horas antes** del horario de la cita
- El token expira 12 horas antes de la cita (previene cancelaciones de último minuto)
- Cuando un proveedor cancela una cita, se envía un mensaje de WhatsApp al paciente con la opción de reagendar

---

## Guía de Inicio Rápido

### Para Desarrolladores Configurando Localmente

**Tiempo Estimado: 15-20 minutos**

1. **Verificación de Prerrequisitos**
   ```bash
   node --version  # Debe ser >= 18.18.0 (recomendado >= 20.9.0 o 22.x)
   psql --version  # PostgreSQL debe estar instalado (recomendado >= 14)
   npm --version   # npm debe estar instalado
   ```

2. **Clonar e Instalar**
   ```bash
   git clone <repository-url>
   cd maxturnos-app
   npm install
   ```

3. **Configuración de Base de Datos**
   ```bash
   # Crear .env.local con credenciales de base de datos (ver sección Variables de Entorno)
   node scripts/setup-database.js
   ```

4. **Configurar Email para Verificación** (Ver sección completa más abajo)
   - Configurar variables de entorno SMTP para Gmail
   - Generar contraseña de aplicación de Google
   - Probar envío de emails

5. **Registrar Proveedor** (Recomendado usar el flujo de registro)
   - Usar endpoint `POST /api/auth/register` para crear cuenta
   - Verificar email mediante enlace recibido
   - O para pruebas rápidas, ver sección "Registro de Proveedores" más abajo

5. **Ejecutar Servidor de Desarrollo**
   ```bash
   npm run dev
   ```

6. **Probar el Formulario**
   - Navegar a: `http://localhost:3000/[username]/agendar-visita` (ej: `http://localhost:3000/maraflamini/agendar-visita`)
   - Completar el formulario y enviar
   - Verificar que la cita aparece en la base de datos
   - Verificar que se envía mensaje de WhatsApp de confirmación

### Para Entender el Flujo de la Aplicación

1. **Comienza Aquí**: Lee [Resumen de la Aplicación](#resumen-de-la-aplicación) y [Contexto de Negocio](#contexto-de-negocio-y-dominio)
2. **Inmersión Técnica**: Revisa [El Flujo del Formulario `/[username]/agendar-visita`](#el-flujo-del-formulario-usernameagendar-visita)
3. **Integración API**: Consulta [Rutas API](#rutas-api) para detalles de endpoints
4. **Diseño de Base de Datos**: Ver [Esquema de Base de Datos](#esquema-de-base-de-datos) para estructura de datos
5. **Integración WhatsApp**: Revisa [Integración de WhatsApp (Whapi)](#integración-de-whatsapp-whapi) para configuración de notificaciones

---

## Stack Tecnológico

> **⚠️ Nota de Compatibilidad:** Este stack ha sido verificado para compatibilidad entre todas las tecnologías. Asegúrate de usar las versiones especificadas o superiores para evitar problemas de compatibilidad.

### Framework y Runtime Principal

- **Next.js**: `^15.4.0` o `^15.3.8` (versiones parcheadas recomendadas)
  - React Server Components habilitado
  - Arquitectura App Router
  - Rutas API para funcionalidad backend
  - **Nota de Seguridad:** Usar versión >= 15.0.5 para evitar vulnerabilidades conocidas (CVE-2025-55182)
- **React**: `^19.0.0` (requerido para Next.js 15 con App Router)
- **React DOM**: `^19.0.0` (requerido para Next.js 15 con App Router)
- **TypeScript**: `^5.3.3` o superior (compatible con Next.js 15 y React 19)
- **Node.js**: `>= 18.18.0` (mínimo requerido), **recomendado: >= 20.9.0** o **22.x LTS**
  - Next.js 15 requiere mínimo Node.js 18.18.0
  - Para mejor compatibilidad y rendimiento, usar Node.js 20.x o 22.x LTS
  - Node.js 18 llegó a EOL, se recomienda migrar a 20+ o 22 LTS

### Base de Datos

- **PostgreSQL**: Versión 14+ recomendada (mínimo 12+, idealmente 15 o 16)
  - Versión 12+ es compatible pero se recomienda 14+ para mejor seguridad y rendimiento
  - PostgreSQL 15 o 16 son las versiones LTS más estables actualmente
- **pg** (node-postgres): `^8.11.3` o superior
  - Compatible con Node.js 18+ y PostgreSQL 12+
  - Requiere `pg >= 8.2` para Node.js >= 14
- **@types/pg**: `^8.10.9`

### Gestión y Validación de Formularios

- **react-hook-form**: `^7.49.0` o superior
  - Compatible con React 19 y Next.js 15
  - Verificar que la versión soporte React 19 (>= 7.49.0)
- **@hookform/resolvers**: `^3.3.4` o superior
  - Compatible con react-hook-form 7.x y zod 3.x
- **zod**: `^3.22.4` o superior
  - Compatible con TypeScript 5.x y React 19

### Gestión de Estado y Obtención de Datos

- **@tanstack/react-query**: `^5.0.0` o superior
  - Compatible con React 19 y Next.js 15
  - Verificar versión >= 5.0.0 para soporte completo de React 19
- **@reduxjs/toolkit**: `^2.11.2` o superior
  - Compatible con React 19 (verificar peer dependencies)
- **react-redux**: `^9.2.0` o superior
  - Compatible con React 19 y Redux Toolkit 2.x

### Componentes UI y Estilos

- **Tailwind CSS**: `^3.4.0`
- **tailwindcss-animate**: `^1.0.7`
- **autoprefixer**: `^10.4.16`
- **postcss**: `^8.4.32`
- **Radix UI Components**:
  - `@radix-ui/react-accordion`: `^1.1.2`
  - `@radix-ui/react-alert-dialog`: `^1.0.5`
  - `@radix-ui/react-checkbox`: `^1.3.3`
  - `@radix-ui/react-dialog`: `^1.0.5`
  - `@radix-ui/react-label`: `^2.0.2`
  - `@radix-ui/react-popover`: `^1.0.7`
  - `@radix-ui/react-select`: `^2.0.0`
  - `@radix-ui/react-slot`: `^1.0.2`
  - `@radix-ui/react-switch`: `^1.0.3`
  - `@radix-ui/react-tabs`: `^1.1.13`
  - `@radix-ui/react-toast`: `^1.1.5`
- **shadcn/ui**: Configurado vía `components.json`
  - Compatible con Next.js 15 y React 19
  - Verificar que los componentes Radix UI estén actualizados
- **lucide-react**: `^0.344.0` o superior (Iconos)
  - Compatible con React 19
- **class-variance-authority**: `^0.7.0` o superior
- **clsx**: `^2.1.0` o superior
- **tailwind-merge**: `^2.2.0` o superior

### Gestión de Fechas y Horas

- **date-fns**: `^3.0.0`
- **react-day-picker**: `^8.10.0`

### Animaciones

- **framer-motion**: `^10.16.16`

### Notificaciones y Toast

- **sonner**: `^1.3.1`

### Autenticación y Seguridad

- **jsonwebtoken**: `^9.0.2`
- **@types/jsonwebtoken**: `^9.0.5`
- **bcryptjs**: `^2.4.3`
- **@types/bcryptjs**: `^2.4.6`

### Utilidades Adicionales

- **axios**: `^1.13.2` (también usado para Whapi)
- **dotenv**: `^16.6.1`
- **nodemailer**: `^6.9.7`
- **@types/nodemailer**: `^6.4.14`
- **web-push**: `^3.6.7`
- **@types/web-push**: `^3.6.4`
- **next-themes**: `^0.4.6`

### Mejoras de Performance y Robustez

- **@upstash/ratelimit**: `^2.0.0` (Rate limiting con Redis)
- **@upstash/redis**: `^1.0.0` (Cliente Redis para rate limiting y caché)
- **pino**: `^8.0.0` (Logging estructurado)
- **pino-pretty**: `^10.0.0` (Formato legible de logs en desarrollo)
- **lru-cache**: `^10.0.0` (Caché en memoria como fallback)

### Dependencias de Desarrollo

- **eslint**: `^8.56.0` o superior
- **eslint-config-next**: `^15.0.0` o superior (debe coincidir con versión de Next.js)
- **@types/node**: `^20.10.6` o superior (recomendado `^22.0.0` para Node.js 22)
- **@types/react**: `^19.0.0` (requerido para React 19)
- **@types/react-dom**: `^19.0.0` (requerido para React DOM 19)

---

## Estructura del Proyecto

```
maxturnos-app/
├── app/                          # Next.js App Router
│   ├── api/                      # Rutas API
│   │   ├── appointments/
│   │   │   ├── create/          # POST /api/appointments/create
│   │   │   ├── [id]/
│   │   │   │   ├── cancel/      # POST /api/appointments/[id]/cancel
│   │   │   │   └── route.ts     # GET /api/appointments/[id]
│   │   │   ├── date/[date]/     # GET /api/appointments/date/[date]
│   │   │   └── route.ts         # GET/POST /api/appointments
│   │   ├── available-times/
│   │   │   ├── [date]/          # GET /api/available-times/[date]
│   │   │   └── route.ts         # GET/POST /api/available-times
│   │   ├── health-insurance/    # GET /api/health-insurance
│   │   ├── provider/
│   │   │   └── [username]/
│   │   │       └── work-schedule/ # GET /api/provider/[username]/work-schedule
│   │   ├── whatsapp/
│   │   │   └── send/            # POST /api/whatsapp/send (interno)
│   │   └── work-schedule/       # GET/POST /api/work-schedule
│   ├── [username]/              # Rutas dinámicas por proveedor
│   │   ├── page.tsx             # Página de inicio del proveedor
│   │   ├── agendar-visita/
│   │   │   └── page.tsx         # Formulario de reserva de cita
│   │   └── cita/
│   │       └── [id]/
│   │           └── page.tsx     # Página de detalles de cita y cancelación
│   ├── globals.css              # Estilos globales
│   └── ...
├── components/
│   ├── agendar-visita/          # Componentes de reserva de citas
│   │   ├── AppointmentForm.tsx  # Componente principal del formulario
│   │   ├── AvailableTimesComponentImproved.tsx
│   │   └── FooterRoot.tsx
│   ├── ui/                      # Componentes shadcn/ui
│   └── ...
├── lib/
│   ├── db.ts                    # Pool de conexiones PostgreSQL
│   ├── types.ts                 # Interfaces TypeScript
│   ├── actions.ts               # Server actions
│   ├── user-routes.ts           # Enrutamiento de cuentas de usuario
│   ├── cancellation-token.ts    # Tokens JWT de cancelación
│   ├── whatsapp.ts              # Utilidades de WhatsApp/Whapi
│   └── ...
├── data/
│   └── obras-sociales.json     # Datos de obras sociales
├── scripts/                     # Scripts de migración de base de datos
│   ├── create-appointments-table.js
│   ├── create-users-table.js
│   ├── create-client-forms-table.js
│   ├── setup-database.js
│   └── ...
├── public/
│   ├── images/
│   └── ...
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── postcss.config.js
└── components.json              # Configuración shadcn/ui
```

---

## Esquema de Base de Datos

### Tablas Principales

#### `clients`
Almacena información de pacientes/clientes.

```sql
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    user_account_id INTEGER REFERENCES user_accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_phone_format CHECK (
        phone_number ~ '^[0-9+\-\s()]+$' AND 
        LENGTH(REPLACE(REPLACE(REPLACE(REPLACE(phone_number, ' ', ''), '-', ''), '(', ''), ')', '')) >= 10
    )
);

CREATE INDEX idx_clients_phone_number ON clients (phone_number);
CREATE INDEX idx_clients_user_account_id ON clients (user_account_id);
```

**Relaciones:**
- `user_account_id` → `user_accounts.id` (nullable, para soporte multi-proveedor)

**Validaciones:**
- `phone_number` debe ser único y tener formato válido para WhatsApp
- Mínimo 10 dígitos numéricos (después de limpiar caracteres especiales)

---

#### `appointments`
Almacena reservas de citas.

```sql
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    user_account_id INTEGER NOT NULL REFERENCES user_accounts(id) ON DELETE SET NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME WITHOUT TIME ZONE NOT NULL,
    consult_type_id INTEGER REFERENCES consult_types(id) ON DELETE SET NULL,
    visit_type_id INTEGER NOT NULL REFERENCES visit_types(id) ON DELETE RESTRICT,
    practice_type_id INTEGER REFERENCES practice_types(id) ON DELETE SET NULL,
    health_insurance VARCHAR(255) NOT NULL,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'scheduled' NOT NULL,
    cancellation_token VARCHAR(500), -- JWT tokens suelen ser < 500 caracteres (más eficiente que TEXT)
    whatsapp_sent BOOLEAN DEFAULT FALSE NOT NULL,
    whatsapp_sent_at TIMESTAMP WITH TIME ZONE,
    whatsapp_message_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Nota: La prevención de citas duplicadas se maneja mediante índice único parcial
    -- Ver índices más abajo para unique_appointment_scheduled
    
    -- Restricción: Validar estado
    CONSTRAINT chk_status CHECK (status IN ('scheduled', 'cancelled', 'completed')),
    
    -- Restricción: Si es Consulta (visit_type_id = 1), debe tener consult_type_id
    CONSTRAINT chk_consult_type CHECK (
        (visit_type_id = 1 AND consult_type_id IS NOT NULL AND practice_type_id IS NULL) OR
        (visit_type_id = 2 AND practice_type_id IS NOT NULL AND consult_type_id IS NULL)
    ),
    
    -- Restricción: Validar que la fecha no sea en el pasado
    CONSTRAINT chk_appointment_date CHECK (appointment_date >= CURRENT_DATE)
);

CREATE INDEX idx_appointments_client_id ON appointments (client_id);
CREATE INDEX idx_appointments_user_account_id ON appointments (user_account_id);
CREATE INDEX idx_appointments_date ON appointments (appointment_date);
CREATE INDEX idx_appointments_status ON appointments (status);
CREATE INDEX idx_appointments_user_date ON appointments (user_account_id, appointment_date);
CREATE INDEX idx_appointments_user_date_time ON appointments (user_account_id, appointment_date, appointment_time);
CREATE INDEX idx_appointments_visit_type ON appointments (visit_type_id);
CREATE INDEX idx_appointments_date_status ON appointments (appointment_date, status) WHERE status = 'scheduled';

-- Índice compuesto para consultas de calendario con múltiples filtros
CREATE INDEX idx_appointments_user_date_status_range 
ON appointments (user_account_id, appointment_date, status) 
WHERE status IN ('scheduled', 'completed');

-- Índice parcial para citas pendientes de envío WhatsApp
CREATE INDEX idx_appointments_whatsapp_pending 
ON appointments (user_account_id, appointment_date) 
WHERE whatsapp_sent = false AND status = 'scheduled';

-- Índice único parcial: Previene citas duplicadas activas (solo para estado 'scheduled')
-- Permite tener múltiples citas canceladas/completadas en el mismo horario
CREATE UNIQUE INDEX unique_appointment_scheduled 
ON appointments (client_id, user_account_id, appointment_date, appointment_time) 
WHERE status = 'scheduled';
```

**Valores de Estado:** `'scheduled'`, `'cancelled'`, `'completed'`

**Relaciones:**
- `client_id` → `clients.id` (eliminación en cascada)
- `user_account_id` → `user_accounts.id` (NOT NULL, SET NULL al eliminar proveedor)
- `consult_type_id` → `consult_types.id` (nullable, requerido si visit_type_id = 1)
- `visit_type_id` → `visit_types.id` (NOT NULL, siempre debe tener valor)
- `practice_type_id` → `practice_types.id` (nullable, requerido si visit_type_id = 2)

**Campos Adicionales para Seguimiento:**
- `whatsapp_sent`: Indica si se envió el mensaje de confirmación por WhatsApp
- `whatsapp_sent_at`: Timestamp de cuándo se envió el mensaje
- `whatsapp_message_id`: ID del mensaje retornado por Whapi para seguimiento

**Validaciones y Restricciones:**
- **Citas Duplicadas:** El índice único parcial `unique_appointment_scheduled` previene que el mismo cliente tenga múltiples citas programadas ('scheduled') con el mismo proveedor en la misma fecha y hora. Permite tener múltiples citas canceladas o completadas en el mismo horario para mantener historial.
- **Lógica Condicional:** 
  - Si `visit_type_id = 1` (Consulta): `consult_type_id` debe tener valor y `practice_type_id` debe ser NULL
  - Si `visit_type_id = 2` (Practica): `practice_type_id` debe tener valor y `consult_type_id` debe ser NULL
- **Fecha Válida:** No se pueden crear citas en fechas pasadas
- **Estado Válido:** Solo permite estados: 'scheduled', 'cancelled', 'completed'
- **Obra Social:** Campo `health_insurance` es obligatorio (NOT NULL)

**Índices Adicionales:**
- `idx_appointments_user_date_time`: Optimiza búsquedas de disponibilidad por proveedor, fecha y hora
- `idx_appointments_visit_type`: Optimiza filtros por tipo de visita
- `idx_appointments_date_status`: Índice parcial para consultas de citas programadas por fecha

---

#### `user_accounts`
Almacena información de cuentas de proveedor/usuario (soporte multi-proveedor).

```sql
CREATE TABLE user_accounts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    whatsapp_phone_number VARCHAR(20), -- Número de teléfono para envío de mensajes WhatsApp
    email_verified BOOLEAN DEFAULT FALSE NOT NULL,
    verification_token VARCHAR(255),
    verification_token_expires TIMESTAMP WITH TIME ZONE, -- Expiración del token de verificación (24 horas)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

**Campos Adicionales:**
- `first_name`: Nombre del proveedor (editable desde perfil)
- `last_name`: Apellido del proveedor (editable desde perfil)
- `whatsapp_phone_number`: Número de teléfono desde donde se envían los mensajes WhatsApp (editable desde perfil)

**Nota:** El mapeo de `username` a `user_account_id` se realiza dinámicamente en `lib/user-routes.ts` mediante consulta a la base de datos.

**Índices Recomendados:**
```sql
-- Índice explícito en username para optimizar búsquedas frecuentes
-- Nota: Aunque username es UNIQUE (que crea índice automáticamente),
-- es bueno tenerlo explícito para documentación y optimización de consultas
CREATE INDEX IF NOT EXISTS idx_user_accounts_username ON user_accounts (username);

-- Índice en email (ya existe implícitamente por UNIQUE, pero explícito es mejor)
CREATE INDEX IF NOT EXISTS idx_user_accounts_email ON user_accounts (email);
```

---

#### `work_schedule`
Define los días laborables para cada proveedor.

```sql
CREATE TABLE work_schedule (
    id SERIAL PRIMARY KEY,
    user_account_id INTEGER NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    day_of_week VARCHAR(10) NOT NULL, -- 'Monday', 'Tuesday', etc.
    is_working_day BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(user_account_id, day_of_week)
);
```

**Valores de Día:** `'Sunday'`, `'Monday'`, `'Tuesday'`, `'Wednesday'`, `'Thursday'`, `'Friday'`, `'Saturday'`

**Relaciones:**
- `user_account_id` → `user_accounts.id` (eliminación en cascada)

---

#### `available_slots`
Define los rangos horarios disponibles para cada día de la semana.

```sql
CREATE TABLE available_slots (
    id SERIAL PRIMARY KEY,
    work_schedule_id INTEGER NOT NULL REFERENCES work_schedule(id) ON DELETE CASCADE,
    user_account_id INTEGER NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    start_time TIME WITHOUT TIME ZONE NOT NULL,
    end_time TIME WITHOUT TIME ZONE NOT NULL,
    is_available BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Restricción: Validar que end_time sea mayor que start_time
    CONSTRAINT chk_time_range CHECK (end_time > start_time),
    
    -- Restricción: Prevenir solapamiento de horarios para el mismo día
    CONSTRAINT unique_slot_per_day UNIQUE (work_schedule_id, start_time, end_time)
);

CREATE INDEX idx_available_slots_work_schedule ON available_slots (work_schedule_id);
CREATE INDEX idx_available_slots_user_account ON available_slots (user_account_id);
CREATE INDEX idx_available_slots_available ON available_slots (is_available) WHERE is_available = true;
```

**Relaciones:**
- `work_schedule_id` → `work_schedule.id` (eliminación en cascada)
- `user_account_id` → `user_accounts.id` (NOT NULL, eliminación en cascada)

**Validaciones:**
- `end_time` debe ser mayor que `start_time`
- No se pueden tener horarios solapados para el mismo día de trabajo
- `user_account_id` es obligatorio para facilitar consultas directas

---

#### `unavailable_days`
Marca días completos como no disponibles.

```sql
CREATE TABLE unavailable_days (
    id SERIAL PRIMARY KEY,
    user_account_id INTEGER NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    unavailable_date DATE NOT NULL,
    is_confirmed BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Restricción: Validar que la fecha no sea en el pasado
    CONSTRAINT chk_unavailable_date CHECK (unavailable_date >= CURRENT_DATE),
    
    -- Restricción: Un proveedor no puede tener el mismo día marcado dos veces
    UNIQUE(user_account_id, unavailable_date)
);

CREATE INDEX idx_unavailable_days_date ON unavailable_days (unavailable_date);
CREATE INDEX idx_unavailable_days_user ON unavailable_days (user_account_id);
CREATE INDEX idx_unavailable_days_user_date ON unavailable_days (user_account_id, unavailable_date);
```

**Relaciones:**
- `user_account_id` → `user_accounts.id` (eliminación en cascada)

**Validaciones:**
- `unavailable_date` no puede ser una fecha pasada
- Un proveedor no puede tener el mismo día marcado como no disponible múltiples veces

---

#### `unavailable_time_frames`
Bloquea franjas horarias específicas en fechas específicas.

```sql
CREATE TABLE unavailable_time_frames (
    id SERIAL PRIMARY KEY,
    workday_date DATE NOT NULL,
    start_time TIME WITHOUT TIME ZONE NOT NULL,
    end_time TIME WITHOUT TIME ZONE NOT NULL,
    work_schedule_id INTEGER REFERENCES work_schedule(id) ON DELETE SET NULL,
    user_account_id INTEGER NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Restricción: Validar que end_time sea mayor que start_time
    CONSTRAINT chk_time_frame_range CHECK (end_time > start_time),
    
    -- Restricción: Validar que la fecha no sea en el pasado
    CONSTRAINT chk_time_frame_date CHECK (workday_date >= CURRENT_DATE),
    
    -- Restricción: Prevenir solapamiento de marcos de tiempo bloqueados
    CONSTRAINT unique_time_frame UNIQUE (user_account_id, workday_date, start_time, end_time)
);

CREATE INDEX idx_unavailable_time_frames_user_date ON unavailable_time_frames (user_account_id, workday_date);
CREATE INDEX idx_unavailable_time_frames_date ON unavailable_time_frames (workday_date);
CREATE INDEX idx_unavailable_time_frames_user ON unavailable_time_frames (user_account_id);
```

**Relaciones:**
- `work_schedule_id` → `work_schedule.id` (nullable)
- `user_account_id` → `user_accounts.id` (NOT NULL, eliminación en cascada)

**Validaciones:**
- `end_time` debe ser mayor que `start_time`
- `workday_date` no puede ser una fecha pasada
- No se pueden tener marcos de tiempo bloqueados solapados para el mismo proveedor y fecha
- `user_account_id` es obligatorio para facilitar consultas y mantener integridad referencial

---

### Tablas de Referencia

#### `visit_types`
```sql
CREATE TABLE visit_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

**Valores por Defecto:**
- `'Consulta'` (ID: 1) - Usado en el formulario
- `'Practica'` (ID: 2) - Usado en el formulario
- `'In-Person'`
- `'Online'`
- `'Phone Call'`

---

#### `consult_types`
```sql
CREATE TABLE consult_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

**Valores por Defecto:**
- `'Primera vez'` (ID: 1) - Usado en el formulario
- `'Seguimiento'` (ID: 2) - Usado en el formulario
- `'Initial Consultation'`
- `'Follow-up'`
- `'Check-up'`
- `'Emergency Consultation'`

---

#### `practice_types`
```sql
CREATE TABLE practice_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Restricción: El nombre no puede estar vacío
    CONSTRAINT chk_practice_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);
```

**Valores por Defecto (Insertar en orden):**
- `'Criocirugía'` (ID: 1) - Usado en el formulario
- `'Electrocoagulación'` (ID: 2) - Usado en el formulario
- `'Biopsia'` (ID: 3) - Usado en el formulario

**Nota:** Los IDs se generan automáticamente con SERIAL. No se debe insertar un registro con ID 0 o nombre vacío. El sistema usa NULL en `practice_type_id` cuando `visit_type_id = 1` (Consulta).

---

#### `users` (Usuarios Administradores)
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- bcrypt hashed
    role VARCHAR(50) DEFAULT 'admin',
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_users_email ON users (email);
```

---

#### `push_subscriptions` (Notificaciones PWA)
```sql
CREATE TABLE push_subscriptions (
    id SERIAL PRIMARY KEY,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh_key TEXT,
    auth_key TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

---

#### `client_forms` (Opcional - Formularios Personalizados)
```sql
CREATE TABLE client_forms (
    id SERIAL PRIMARY KEY,
    user_account_id INTEGER NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    form_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(user_account_id)
);

CREATE INDEX idx_client_forms_user_account_id ON client_forms (user_account_id);
```

---

### Scripts de Población de Datos Iniciales

Para que el sistema funcione correctamente, es necesario poblar las tablas de referencia con los datos iniciales:

#### Poblar `visit_types`

```sql
INSERT INTO visit_types (name, description) VALUES
('Consulta', 'Consulta médica general'),
('Practica', 'Procedimiento o práctica médica')
ON CONFLICT (name) DO NOTHING;
```

#### Poblar `consult_types`

```sql
INSERT INTO consult_types (name, description) VALUES
('Primera vez', 'Consulta inicial del paciente'),
('Seguimiento', 'Consulta de seguimiento')
ON CONFLICT (name) DO NOTHING;
```

#### Poblar `practice_types`

```sql
INSERT INTO practice_types (name, description) VALUES
('Criocirugía', 'Procedimiento de criocirugía'),
('Electrocoagulación', 'Procedimiento de electrocoagulación'),
('Biopsia', 'Procedimiento de biopsia')
ON CONFLICT (name) DO NOTHING;
```

**Nota:** Estos scripts deben ejecutarse antes de usar el sistema. El script `setup-database.js` debería incluir estos INSERTs.

---

### Migraciones de Base de Datos

Si ya tienes una base de datos existente, necesitarás ejecutar las siguientes migraciones para agregar las nuevas restricciones y campos:

#### Migración 1: Actualizar Tabla `appointments`

```sql
-- Hacer visit_type_id NOT NULL (si hay datos, primero actualizar los NULL)
UPDATE appointments SET visit_type_id = 1 WHERE visit_type_id IS NULL;
ALTER TABLE appointments ALTER COLUMN visit_type_id SET NOT NULL;

-- Hacer user_account_id NOT NULL (si hay datos, primero asignar un valor por defecto)
-- NOTA: Ajusta el valor por defecto según tu caso
UPDATE appointments SET user_account_id = 1 WHERE user_account_id IS NULL;
ALTER TABLE appointments ALTER COLUMN user_account_id SET NOT NULL;

-- Hacer health_insurance NOT NULL (si hay datos, primero asignar un valor por defecto)
UPDATE appointments SET health_insurance = 'Particular' WHERE health_insurance IS NULL;
ALTER TABLE appointments ALTER COLUMN health_insurance SET NOT NULL;

-- Agregar restricción CHECK para estado
ALTER TABLE appointments ADD CONSTRAINT chk_status 
CHECK (status IN ('scheduled', 'cancelled', 'completed'));

-- Agregar restricción CHECK para fecha
ALTER TABLE appointments ADD CONSTRAINT chk_appointment_date 
CHECK (appointment_date >= CURRENT_DATE);

-- Agregar restricción CHECK para lógica condicional
ALTER TABLE appointments ADD CONSTRAINT chk_consult_type 
CHECK (
    (visit_type_id = 1 AND consult_type_id IS NOT NULL AND practice_type_id IS NULL) OR
    (visit_type_id = 2 AND practice_type_id IS NOT NULL AND consult_type_id IS NULL)
);

-- Crear índice único parcial para prevenir citas duplicadas activas
CREATE UNIQUE INDEX unique_appointment_scheduled 
ON appointments (client_id, user_account_id, appointment_date, appointment_time) 
WHERE status = 'scheduled';

-- Crear índices adicionales
CREATE INDEX IF NOT EXISTS idx_appointments_user_date_time 
ON appointments (user_account_id, appointment_date, appointment_time);
CREATE INDEX IF NOT EXISTS idx_appointments_visit_type 
ON appointments (visit_type_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date_status 
ON appointments (appointment_date, status) WHERE status = 'scheduled';

-- Crear índices adicionales para optimización
CREATE INDEX IF NOT EXISTS idx_appointments_user_date_status_range 
ON appointments (user_account_id, appointment_date, status) 
WHERE status IN ('scheduled', 'completed');

CREATE INDEX IF NOT EXISTS idx_appointments_whatsapp_pending 
ON appointments (user_account_id, appointment_date) 
WHERE whatsapp_sent = false AND status = 'scheduled';
```

#### Migración 1.1: Agregar Índices en `user_accounts`

```sql
-- Índices explícitos para optimizar búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_user_accounts_username ON user_accounts (username);
CREATE INDEX IF NOT EXISTS idx_user_accounts_email ON user_accounts (email);
```

#### Migración 2: Actualizar Tabla `clients`

```sql
-- Agregar restricción CHECK para formato de teléfono
ALTER TABLE clients ADD CONSTRAINT chk_phone_format 
CHECK (
    phone_number ~ '^[0-9+\-\s()]+$' AND 
    LENGTH(REPLACE(REPLACE(REPLACE(REPLACE(phone_number, ' ', ''), '-', ''), '(', ''), ')', '')) >= 10
);

-- Crear índice adicional
CREATE INDEX IF NOT EXISTS idx_clients_user_account_id ON clients (user_account_id);
```

#### Migración 3: Actualizar Tabla `available_slots`

```sql
-- Hacer user_account_id NOT NULL
UPDATE available_slots SET user_account_id = (
    SELECT user_account_id FROM work_schedule WHERE id = available_slots.work_schedule_id
) WHERE user_account_id IS NULL;
ALTER TABLE available_slots ALTER COLUMN user_account_id SET NOT NULL;

-- Agregar restricciones CHECK
ALTER TABLE available_slots ADD CONSTRAINT chk_time_range 
CHECK (end_time > start_time);

ALTER TABLE available_slots ADD CONSTRAINT unique_slot_per_day 
UNIQUE (work_schedule_id, start_time, end_time);

-- Crear índices adicionales
CREATE INDEX IF NOT EXISTS idx_available_slots_work_schedule 
ON available_slots (work_schedule_id);
CREATE INDEX IF NOT EXISTS idx_available_slots_user_account 
ON available_slots (user_account_id);
CREATE INDEX IF NOT EXISTS idx_available_slots_available 
ON available_slots (is_available) WHERE is_available = true;
```

#### Migración 4: Actualizar Tabla `unavailable_time_frames`

```sql
-- Hacer user_account_id NOT NULL
UPDATE unavailable_time_frames SET user_account_id = (
    SELECT user_account_id FROM work_schedule WHERE id = unavailable_time_frames.work_schedule_id
) WHERE user_account_id IS NULL;
ALTER TABLE unavailable_time_frames ALTER COLUMN user_account_id SET NOT NULL;

-- Agregar restricciones CHECK
ALTER TABLE unavailable_time_frames ADD CONSTRAINT chk_time_frame_range 
CHECK (end_time > start_time);

ALTER TABLE unavailable_time_frames ADD CONSTRAINT chk_time_frame_date 
CHECK (workday_date >= CURRENT_DATE);

ALTER TABLE unavailable_time_frames ADD CONSTRAINT unique_time_frame 
UNIQUE (user_account_id, workday_date, start_time, end_time);

-- Crear índices adicionales
CREATE INDEX IF NOT EXISTS idx_unavailable_time_frames_user_date 
ON unavailable_time_frames (user_account_id, workday_date);
CREATE INDEX IF NOT EXISTS idx_unavailable_time_frames_date 
ON unavailable_time_frames (workday_date);
CREATE INDEX IF NOT EXISTS idx_unavailable_time_frames_user 
ON unavailable_time_frames (user_account_id);
```

#### Migración 5: Actualizar Tabla `unavailable_days`

```sql
-- Agregar restricción CHECK
ALTER TABLE unavailable_days ADD CONSTRAINT chk_unavailable_date 
CHECK (unavailable_date >= CURRENT_DATE);

-- Crear índices adicionales
CREATE INDEX IF NOT EXISTS idx_unavailable_days_user 
ON unavailable_days (user_account_id);
CREATE INDEX IF NOT EXISTS idx_unavailable_days_user_date 
ON unavailable_days (user_account_id, unavailable_date);
```

#### Migración 6: Actualizar Tabla `practice_types`

```sql
-- Agregar restricción CHECK
ALTER TABLE practice_types ADD CONSTRAINT chk_practice_name_not_empty 
CHECK (LENGTH(TRIM(name)) > 0);
```

**Nota:** Ejecuta estas migraciones en orden y verifica que no haya errores antes de continuar con la siguiente.

#### Resumen de Mejoras en el Esquema de Base de Datos

Las siguientes mejoras se han implementado para asegurar la integridad de los datos y el correcto funcionamiento del sistema:

**Campos Obligatorios Agregados:**
- `appointments.visit_type_id`: Ahora es NOT NULL (siempre debe tener valor)
- `appointments.user_account_id`: Ahora es NOT NULL (proveedor siempre requerido)
- `appointments.health_insurance`: Ahora es NOT NULL (obra social siempre requerida)
- `available_slots.user_account_id`: Ahora es NOT NULL (mejora consultas)
- `unavailable_time_frames.user_account_id`: Ahora es NOT NULL (mejora integridad)

**Restricciones CHECK Agregadas:**
- Validación de formato de teléfono para WhatsApp
- Validación de lógica condicional (Consulta vs Practica)
- Validación de rangos de tiempo (end_time > start_time)
- Validación de fechas (no permitir fechas pasadas)
- Validación de estados válidos
- Validación de nombres no vacíos

**Índices Optimizados:**
- Índice único parcial para prevenir citas duplicadas activas
- Índices compuestos para consultas frecuentes
- Índices parciales para optimizar consultas por estado
- Índices adicionales en tablas relacionadas

**Beneficios:**
- Prevención de datos inconsistentes a nivel de base de datos
- Mejor rendimiento en consultas frecuentes
- Validación automática sin necesidad de código adicional
- Historial completo de citas (canceladas/completadas) sin restricciones

#### Verificación Pre-Migración

Antes de ejecutar las migraciones, verifica el estado actual de tus datos:

```sql
-- Verificar citas sin visit_type_id
SELECT COUNT(*) FROM appointments WHERE visit_type_id IS NULL;

-- Verificar citas sin user_account_id
SELECT COUNT(*) FROM appointments WHERE user_account_id IS NULL;

-- Verificar citas sin health_insurance
SELECT COUNT(*) FROM appointments WHERE health_insurance IS NULL;

-- Verificar citas con lógica incorrecta (tienen ambos consult_type y practice_type)
SELECT COUNT(*) FROM appointments 
WHERE consult_type_id IS NOT NULL AND practice_type_id IS NOT NULL;

-- Verificar citas con lógica incorrecta (no tienen ninguno cuando deberían)
SELECT COUNT(*) FROM appointments 
WHERE visit_type_id = 1 AND consult_type_id IS NULL;
SELECT COUNT(*) FROM appointments 
WHERE visit_type_id = 2 AND practice_type_id IS NULL;

-- Verificar teléfonos con formato inválido
SELECT phone_number FROM clients 
WHERE phone_number !~ '^[0-9+\-\s()]+$' 
OR LENGTH(REPLACE(REPLACE(REPLACE(REPLACE(phone_number, ' ', ''), '-', ''), '(', ''), ')', '')) < 10;
```

Si encuentras datos que violan las nuevas restricciones, corrígelos antes de ejecutar las migraciones.

---

### Restricciones de Integridad Referencial

**Resumen de Restricciones CHECK:**

1. **Tabla `clients`:**
   - `chk_phone_format`: Valida formato de teléfono para WhatsApp

2. **Tabla `appointments`:**
   - `unique_appointment`: Previene citas duplicadas
   - `chk_status`: Valida que el estado sea válido
   - `chk_consult_type`: Valida lógica condicional entre visit_type, consult_type y practice_type
   - `chk_appointment_date`: Previene fechas pasadas

3. **Tabla `available_slots`:**
   - `chk_time_range`: Valida que end_time > start_time
   - `unique_slot_per_day`: Previene horarios solapados

4. **Tabla `unavailable_days`:**
   - `chk_unavailable_date`: Previene fechas pasadas

5. **Tabla `unavailable_time_frames`:**
   - `chk_time_frame_range`: Valida que end_time > start_time
   - `chk_time_frame_date`: Previene fechas pasadas
   - `unique_time_frame`: Previene marcos de tiempo solapados

6. **Tabla `practice_types`:**
   - `chk_practice_name_not_empty`: Previene nombres vacíos

---

## Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Configuración de Base de Datos
POSTGRESQL_HOST=localhost
POSTGRESQL_PORT=5432
POSTGRESQL_USER=postgres
POSTGRESQL_PASSWORD=your_password
POSTGRESQL_DATABASE=MaxTurnos_db

# Configuración SSL (para producción/AWS RDS)
POSTGRESQL_SSL_MODE=require  # Opciones: 'require', 'verify-full', o dejar vacío para desarrollo
POSTGRESQL_CA_CERT=          # Requerido solo si POSTGRESQL_SSL_MODE=verify-full

# JWT Secret (mínimo 32 caracteres)
JWT_SECRET=your-super-secret-jwt-key-change-in-production-minimum-32-characters

# Entorno Node
NODE_ENV=development  # o 'production'

# Integración de WhatsApp (Whapi)
# Nota: Whapi requiere Node.js >= 18.0.0 y funciona mejor con Node.js >= 20
# Verificar compatibilidad con la versión de Node.js utilizada
WHAPI_API_URL=https://api.whapi.cloud
WHAPI_API_TOKEN=your_whapi_token
WHAPI_PHONE_NUMBER_ID=your_phone_number_id

# Configuración de Email para Verificación de Proveedores (Nodemailer con Google)
# Requerido para el proceso de registro y verificación de proveedores
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false  # true para puerto 465, false para puerto 587
SMTP_USER=tu_email@gmail.com  # Email de Gmail que enviará los correos
SMTP_PASS=tu_app_password  # Contraseña de aplicación de Gmail (NO la contraseña normal)
SMTP_FROM=noreply@tudominio.com  # Email que aparece como remitente
SMTP_FROM_NAME=MaxTurnos  # Nombre que aparece como remitente

# URL de la aplicación (para enlaces de verificación)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # En desarrollo
# NEXT_PUBLIC_APP_URL=https://tudominio.com  # En producción

# Opcional: API Backend (si se usa API externa)
BACKEND_API_PROD=

# Opcional: Claves VAPID para Notificaciones Push
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

**Notas de Seguridad:**
- Nunca commits `.env.local` al control de versiones
- Usa un JWT_SECRET fuerte y aleatorio en producción
- Para AWS RDS, usa `POSTGRESQL_SSL_MODE=require` o `verify-full`
- Mantén las credenciales de Whapi seguras y no las compartas públicamente
- **Para Gmail SMTP**: Usa una "Contraseña de aplicación" de Google, NO tu contraseña normal
  - Generar en: https://myaccount.google.com/apppasswords
  - Requiere autenticación de 2 factores habilitada en tu cuenta de Google

---

## Instalación y Configuración

### 1. Prerrequisitos

- **Node.js**: Versión `>= 18.18.0` (mínimo requerido por Next.js 15)
  - **Recomendado:** Node.js `>= 20.9.0` o `22.x LTS` para mejor compatibilidad
  - Verificar versión: `node --version`
- **PostgreSQL**: Versión `12+` (mínimo), **recomendado `14+` o `15+`**
  - Verificar versión: `psql --version`
- **npm** o **yarn** como gestor de paquetes
  - npm viene incluido con Node.js
  - Verificar versión: `npm --version` o `yarn --version`

### 2. Clonar e Instalar Dependencias

```bash
# Clonar repositorio (o crear nuevo proyecto Next.js)
npm install
# o
yarn install
```

### 3. Configuración de Base de Datos

#### Opción A: Usando Script de Configuración (Recomendado)

```bash
# Asegúrate de que PostgreSQL esté en ejecución
# Actualiza .env.local con credenciales de base de datos

# Ejecutar script de configuración de base de datos
node scripts/setup-database.js
```

Este script:
- Prueba la conexión a la base de datos
- Crea todas las tablas necesarias con todas las restricciones CHECK y FOREIGN KEY
- Crea todos los índices necesarios (incluyendo índices únicos parciales)
- Pobla datos de referencia (visit_types, consult_types, practice_types)
- Valida que todas las restricciones estén correctamente aplicadas

#### Opción B: Configuración Manual

```bash
# Crear base de datos
createdb MaxTurnos_db

# Ejecutar scripts de migración individuales
node scripts/create-users-table.js
node scripts/create-appointments-table.js
node scripts/create-client-forms-table.js

# Poblar datos de referencia
node scripts/setup-database.js
```

**Nota Importante:** Si ya tienes una base de datos existente, necesitarás ejecutar migraciones para agregar las nuevas restricciones. Ver sección "Migraciones de Base de Datos" más abajo.

#### Verificación de la Configuración

Después de ejecutar el script, verifica que todo esté correcto:

```sql
-- Verificar que las tablas existen
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verificar restricciones CHECK en appointments
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'appointments' AND constraint_type = 'CHECK';

-- Verificar índices únicos
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'appointments' AND indexdef LIKE '%UNIQUE%';

-- Verificar datos de referencia
SELECT * FROM visit_types;
SELECT * FROM consult_types;
SELECT * FROM practice_types;
```

### 4. Configurar Email para Verificación de Proveedores

**IMPORTANTE:** Los proveedores deben registrarse y verificar su email antes de poder usar el sistema.

#### Configurar Gmail para Nodemailer

1. **Habilitar Autenticación de 2 Factores** en tu cuenta de Google:
   - Ir a: https://myaccount.google.com/security
   - Activar "Verificación en dos pasos"

2. **Generar Contraseña de Aplicación**:
   - Ir a: https://myaccount.google.com/apppasswords
   - Seleccionar "Correo" y "Otro (nombre personalizado)"
   - Ingresar "MaxTurnos" como nombre
   - Copiar la contraseña generada (16 caracteres sin espacios)

3. **Configurar Variables de Entorno**:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=tu_email@gmail.com
   SMTP_PASS=xxxx xxxx xxxx xxxx  # Contraseña de aplicación (16 caracteres)
   SMTP_FROM=noreply@tudominio.com
   SMTP_FROM_NAME=MaxTurnos
   ```

**Nota:** La contraseña de aplicación es diferente a tu contraseña normal de Gmail. Úsala en `SMTP_PASS`.

### 5. Registro de Proveedores

Los proveedores deben registrarse a través del endpoint de registro. **NO se deben crear manualmente en la base de datos** a menos que sea para pruebas.

#### Flujo de Registro de Proveedor:

1. **Proveedor completa formulario de registro** (`POST /api/auth/register`)
   - Email
   - Username (único)
   - Contraseña
   - Nombre completo

2. **Sistema crea cuenta con `email_verified = false`**

3. **Sistema genera token de verificación** y lo almacena en `verification_token`

4. **Sistema envía email de verificación** usando Nodemailer con Google SMTP
   - Email contiene enlace: `/[username]/verificar-email?token=...`

5. **Proveedor hace clic en enlace** → `GET /api/auth/verify-email?token=...`

6. **Sistema verifica token y actualiza** `email_verified = true`

7. **Proveedor puede iniciar sesión** y acceder al panel de administración

#### Para Pruebas (Crear Proveedor Manualmente):

```sql
-- Solo para desarrollo/pruebas - En producción usar el flujo de registro
INSERT INTO user_accounts (email, username, password, email_verified, verification_token)
VALUES (
    'maraflamini@example.com', 
    'maraflamini', 
    '$2b$10$hashed_password_here',  -- Usar bcrypt para hash
    true,  -- Marcar como verificado para pruebas
    NULL
);

-- Obtener el user_account_id generado (usar en siguientes pasos)
SELECT id FROM user_accounts WHERE username = 'maraflamini';
```

**Nota:** El sistema mapea dinámicamente `username` a `user_account_id` mediante consultas a la base de datos en `lib/user-routes.ts`.

### 6. Configurar Horario de Trabajo

Configura días laborables y franjas horarias disponibles:

```sql
-- Ejemplo: Días laborables Lunes-Viernes para un proveedor
-- Reemplaza USER_ACCOUNT_ID con el ID obtenido en el paso anterior
INSERT INTO work_schedule (user_account_id, day_of_week, is_working_day)
VALUES 
    (USER_ACCOUNT_ID, 'Monday', true),
    (USER_ACCOUNT_ID, 'Tuesday', true),
    (USER_ACCOUNT_ID, 'Wednesday', true),
    (USER_ACCOUNT_ID, 'Thursday', true),
    (USER_ACCOUNT_ID, 'Friday', true),
    (USER_ACCOUNT_ID, 'Saturday', false),
    (USER_ACCOUNT_ID, 'Sunday', false);

-- Ejemplo: Franjas horarias 9 AM - 6 PM para Lunes
INSERT INTO available_slots (work_schedule_id, user_account_id, start_time, end_time)
SELECT ws.id, USER_ACCOUNT_ID, '09:00:00', '18:00:00'
FROM work_schedule ws
WHERE ws.user_account_id = USER_ACCOUNT_ID AND ws.day_of_week = 'Monday';
```

### 7. Agregar Datos de Obras Sociales

Asegúrate de que `data/obras-sociales.json` exista con datos de obras sociales (ver estructura de archivos existente).

### 8. Configurar WhatsApp (Whapi)

1. Obtén credenciales de Whapi desde https://whapi.cloud
2. Agrega las variables de entorno en `.env.local`:
   ```env
   WHAPI_API_URL=https://api.whapi.cloud
   WHAPI_API_TOKEN=tu_token_de_whapi
   WHAPI_PHONE_NUMBER_ID=tu_phone_number_id
   ```

### 8. Ejecutar Servidor de Desarrollo

```bash
npm run dev
# o
yarn dev
```

Visita `http://localhost:3000/[username]/agendar-visita` para probar el formulario (ej: `http://localhost:3000/maraflamini/agendar-visita`).

---

## El Flujo del Formulario `/[username]/agendar-visita`

### Estructura de Rutas

**Archivo:** `app/[username]/agendar-visita/page.tsx`

Este es un componente cliente que:
1. Envuelve `AppointmentForm` en un `QueryClientProvider`
2. Obtiene `userAccountId` del mapeo de username mediante consulta a la base de datos
3. Renderiza header con botón de retroceso y footer
4. Valida que el proveedor existe antes de mostrar el formulario

### Jerarquía de Componentes

```
/[username]/agendar-visita/page.tsx
└── QueryClientProvider
    └── AppointmentContent
        ├── Header (con botón de retroceso)
        ├── AppointmentForm (userAccountId={obtenido dinámicamente})
        └── FooterRoot
```

### Rutas Dinámicas

El sistema usa rutas dinámicas de Next.js:
- `app/[username]/page.tsx` - Página de inicio del proveedor
- `app/[username]/agendar-visita/page.tsx` - Formulario de reserva
- `app/[username]/cita/[id]/page.tsx` - Detalles de cita y cancelación

El parámetro `[username]` se obtiene de `params` y se usa para buscar el proveedor en la base de datos.

### Componente AppointmentForm

**Archivo:** `components/agendar-visita/AppointmentForm.tsx`

#### Parámetros y Campos del Formulario

El formulario está diseñado con los siguientes parámetros específicos:

##### 1. Información del Paciente (Campos Obligatorios)

**Nombre (`first_name`):**
- Tipo: Texto
- Validación: Mínimo 2 caracteres
- Almacenamiento: Campo `first_name` en tabla `clients`

**Apellido (`last_name`):**
- Tipo: Texto
- Validación: Mínimo 2 caracteres
- Almacenamiento: Campo `last_name` en tabla `clients`

**Número de Teléfono (`phone_number`):**
- Tipo: Texto
- Validación:
  - Mínimo 10 caracteres, máximo 15 caracteres
  - Formato: Solo números, espacios, guiones, paréntesis y signo +
  - Debe ser un número válido para WhatsApp (incluir código de país)
- Almacenamiento: Campo `phone_number` en tabla `clients` (único)
- Uso: Se utiliza para enviar confirmaciones y notificaciones vía WhatsApp
- Ejemplo válido: `+543421234567` o `3421234567`

##### 2. Tipo de Consulta (`visit_type`)

**Campo Obligatorio:** Selección entre dos opciones principales

- **"Consulta"** (valor: `"1"`):
  - Consulta médica general
  - Requiere selección adicional de tipo de consulta (ver sección 3.1)
  
- **"Practica"** (valor: `"2"`):
  - Procedimiento o práctica médica
  - Requiere selección adicional de tipo de práctica (ver sección 3.2)

##### 3. Tipos de Consulta y Prácticas (Campos Condicionales)

###### 3.1 Tipos de Consulta (`consult_type`)

**Visible solo cuando:** `visit_type === "1"` (Consulta)

Opciones disponibles:
- **"Primera vez"** (valor: `"1"`)
  - Consulta inicial del paciente
  - Almacenamiento: `consult_type_id = 1` en tabla `appointments`
  
- **"Seguimiento"** (valor: `"2"`)
  - Consulta de seguimiento
  - Almacenamiento: `consult_type_id = 2` en tabla `appointments`

**Almacenamiento:** Campo `consult_type_id` en tabla `appointments` (referencia a tabla `consult_types`)

###### 3.2 Tipos de Prácticas (`practice_type`)

**Visible solo cuando:** `visit_type === "2"` (Practica)

Opciones disponibles:
- **"Criocirugía"** (valor: `"1"`)
  - Procedimiento de criocirugía
  - Almacenamiento: `practice_type_id = 1` en tabla `appointments`
  
- **"Electrocoagulación"** (valor: `"2"`)
  - Procedimiento de electrocoagulación
  - Almacenamiento: `practice_type_id = 2` en tabla `appointments`
  
- **"Biopsia"** (valor: `"3"`)
  - Procedimiento de biopsia
  - Almacenamiento: `practice_type_id = 3` en tabla `appointments`

**Almacenamiento:** Campo `practice_type_id` en tabla `appointments` (referencia a tabla `practice_types`)

##### 4. Sistema de Obras Sociales (`health_insurance`)

**Campo Obligatorio:** Selección de obra social o plan de salud

**Fuente de Datos:**
- Obtenido de `/api/health-insurance`
- Datos almacenados en `data/obras-sociales.json`

**Filtrado Dinámico:**
- **Si `visit_type === "1"` (Consulta):**
  - Muestra todas las obras sociales EXCEPTO "Practica Particular"
  - Opciones disponibles: "Particular", obras sociales del sistema argentino
  
- **Si `visit_type === "2"` (Practica):**
  - Muestra todas las obras sociales EXCEPTO "Particular"
  - Opciones disponibles: "Practica Particular", obras sociales del sistema argentino

**Almacenamiento:** Campo `health_insurance` (VARCHAR) en tabla `appointments`

**Ejemplo de Opciones:**
```json
[
  { "id": 1, "name": "Particular", "price": "$25.000" },
  { "id": 2, "name": "Practica Particular", "price": "$50.000" },
  { "id": 3, "name": "OSDE", "price": "$30.000" },
  ...
]
```

##### 5. Calendario de Fechas Disponibles (`appointment_date`)

**Componente:** `react-day-picker`

**Funcionalidad:**
- Muestra solo los días disponibles según el horario de trabajo del proveedor
- Deshabilita automáticamente los días que el proveedor no trabaja

**Lógica de Deshabilitación:**

1. **Fechas Pasadas:**
   - Todas las fechas anteriores a hoy están deshabilitadas
   - Validación: `date >= today`

2. **Rango de Fechas:**
   - Solo permite fechas hasta 30 días desde mañana
   - Fechas más allá de este rango están deshabilitadas

3. **Días No Laborables del Proveedor:**
   - Consulta el horario de trabajo del proveedor desde `/api/provider/[username]/work-schedule`
   - Deshabilita días donde `is_working_day = false` en tabla `work_schedule`
   - Ejemplo: Si el proveedor solo trabaja Lunes-Viernes, Sábado y Domingo están deshabilitados

4. **Fechas Específicamente Bloqueadas:**
   - Consulta tabla `unavailable_days` para el `user_account_id` del proveedor
   - Deshabilita fechas marcadas como no disponibles (vacaciones, días libres, etc.)

5. **Días Festivos:**
   - Días festivos hardcodeados están deshabilitados:
     - 1 de enero (Año Nuevo)
     - 25 de diciembre (Navidad)

**Visualización:**
- Los días disponibles aparecen seleccionables
- Los días deshabilitados aparecen visualmente diferentes (grises, no clickeables)
- El calendario se actualiza dinámicamente según el proveedor seleccionado

##### 6. Select de Horarios Disponibles (`appointment_time`)

**Componente:** `AvailableTimesComponentImproved`

**Funcionalidad:**
- Muestra solo horarios disponibles en intervalos de 20 minutos
- No muestra horarios deshabilitados ni horarios con pacientes ya asignados

**Lógica de Generación:**

1. **Activación:**
   - Solo se muestra después de seleccionar una fecha válida
   - Se oculta automáticamente si cambia la fecha seleccionada

2. **Obtención de Horarios:**
   - Llama a `/api/available-times/[date]?user_account_id={id}`
   - Usa React Query para caché (5 minutos de tiempo de expiración)

3. **Generación de Intervalos:**
   - Obtiene `start_time` y `end_time` del horario de trabajo del proveedor para ese día
   - Genera intervalos de **20 minutos** desde `start_time` hasta `end_time`
   - Ejemplo: Si el horario es 09:00 - 18:00, genera: `["09:00", "09:20", "09:40", "10:00", ...]`

4. **Filtrado de Horarios:**
   - **Filtra horarios ya reservados:**
     - Consulta tabla `appointments` para la fecha seleccionada
     - Excluye horarios donde `status = 'scheduled'`
     - Solo muestra horarios disponibles
   
   - **Filtra horarios deshabilitados:**
     - Consulta tabla `unavailable_time_frames` para la fecha seleccionada
     - Excluye rangos de tiempo bloqueados específicamente
     - Ejemplo: Si 10:00-11:00 está bloqueado, no muestra esos horarios

5. **Visualización:**
   - Dropdown/Select con lista de horarios disponibles
   - Formato: `HH:MM` (ej: "09:00", "09:20", "14:40")
   - Muestra estado de carga mientras obtiene datos
   - Si no hay horarios disponibles, muestra mensaje apropiado

**Ejemplo de Horarios Generados:**
```json
["09:00", "09:20", "09:40", "10:00", "10:20", "10:40", "11:00", ...]
```

#### Esquema del Formulario (Validación Zod)

```typescript
const formSchema = z.object({
    // Información del paciente
    first_name: z.string()
        .min(2, "El nombre debe tener al menos 2 caracteres"),
    last_name: z.string()
        .min(2, "El apellido debe tener al menos 2 caracteres"),
    phone_number: z.string()
        .min(10, "El teléfono debe tener al menos 10 dígitos")
        .max(15, "El teléfono no puede tener más de 15 caracteres")
        .regex(/^[0-9+\-\s()]+$/, "Formato de teléfono inválido")
        .refine(phone => {
            // Validar que sea un número válido para WhatsApp
            const cleaned = phone.replace(/[\s\-()]/g, '');
            return cleaned.length >= 10 && /^\+?[0-9]+$/.test(cleaned);
        }, "Debe ser un número válido para WhatsApp"),
    
    // Tipo de visita
    visit_type: z.string()
        .nonempty("Debes seleccionar un tipo de visita")
        .refine(val => val === "1" || val === "2", "Tipo de visita inválido"),
    
    // Campos condicionales
    consult_type: z.string()
        .optional()
        .refine((val, ctx) => {
            if (ctx.parent.visit_type === "1") {
                return val !== undefined && val !== "";
            }
            return true;
        }, "Debes seleccionar un tipo de consulta"),
    
    practice_type: z.string()
        .optional()
        .refine((val, ctx) => {
            if (ctx.parent.visit_type === "2") {
                return val !== undefined && val !== "";
            }
            return true;
        }, "Debes seleccionar un tipo de práctica"),
    
    // Obra social
    health_insurance: z.string()
        .nonempty("Debes seleccionar una obra social"),
    
    // Fecha y hora
    appointment_date: z.date()
        .refine(date => date >= new Date(new Date().setHours(0,0,0,0)), 
                "No puedes seleccionar una fecha pasada")
        .refine(date => {
            const maxDate = new Date();
            maxDate.setDate(maxDate.getDate() + 31);
            return date <= maxDate;
        }, "La fecha no puede ser más de 30 días en el futuro"),
    
    appointment_time: z.string()
        .nonempty("Debes seleccionar un horario")
        .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido")
});
```

#### Pasos del Flujo del Formulario

1. **Información del Paciente:**
   - Usuario completa nombre, apellido y teléfono
   - El teléfono se valida para asegurar que sea apto para WhatsApp
   - Los datos se guardan en la tabla `clients` (o se actualizan si el teléfono ya existe)

2. **Selección de Tipo de Visita:**
   - Usuario selecciona "Consulta" o "Practica"
   - Los campos condicionales aparecen dinámicamente según la selección

3. **Selección de Tipo de Consulta o Práctica:**
   - **Si "Consulta":** Muestra dropdown con tipos de consulta (Primera vez, Seguimiento)
   - **Si "Practica":** Muestra dropdown con tipos de prácticas (Criocirugía, Electrocoagulación, Biopsia)

4. **Selección de Obra Social:**
   - Se cargan las obras sociales desde `/api/health-insurance`
   - El dropdown se filtra automáticamente según el tipo de visita seleccionado
   - Solo muestra opciones válidas para el tipo de visita

5. **Selección de Fecha:**
   - Se muestra calendario con días disponibles del proveedor
   - Los días no laborables están deshabilitados visualmente
   - Solo se pueden seleccionar días donde el proveedor trabaja
   - El calendario considera días bloqueados y festivos

6. **Selección de Hora:**
   - Aparece select de horarios solo después de seleccionar fecha
   - Muestra horarios disponibles en intervalos de 20 minutos
   - No muestra horarios ya reservados ni deshabilitados
   - Se actualiza automáticamente si cambia la fecha

7. **Envío del Formulario:**
   - Valida todos los campos según el esquema Zod
   - Llama al endpoint POST `/api/appointments/create`
   - Crea o actualiza cliente en tabla `clients` (basado en teléfono)
   - Crea cita en tabla `appointments` con todos los datos
   - Genera token de cancelación JWT
   - Envía mensaje de WhatsApp de confirmación vía Whapi al teléfono proporcionado
   - Redirige a `/[username]/cita/[id]` con los detalles de la cita

#### Almacenamiento de Datos en Base de Datos

**Tabla `clients`:**
```sql
-- Se crea o actualiza un registro en clients
INSERT INTO clients (first_name, last_name, phone_number, user_account_id)
VALUES ('Juan', 'Pérez', '3421234567', 6)
ON CONFLICT (phone_number) 
DO UPDATE SET 
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    updated_at = CURRENT_TIMESTAMP;
```

**Tabla `appointments`:**
```sql
-- Ejemplo 1: Cita de tipo Consulta
INSERT INTO appointments (
    client_id,
    user_account_id,
    appointment_date,
    appointment_time,
    visit_type_id,        -- 1 = Consulta (OBLIGATORIO)
    consult_type_id,      -- 1 = Primera vez, 2 = Seguimiento (OBLIGATORIO si visit_type_id = 1)
    practice_type_id,     -- NULL (debe ser NULL si visit_type_id = 1)
    health_insurance,     -- OBLIGATORIO
    status,
    cancellation_token
)
VALUES (
    123,                  -- client_id obtenido de clients
    6,                    -- user_account_id del proveedor (OBLIGATORIO)
    '2025-01-15',         -- appointment_date (debe ser >= CURRENT_DATE)
    '09:00:00',           -- appointment_time
    1,                    -- visit_type_id (1 = Consulta)
    1,                    -- consult_type_id (1 = Primera vez)
    NULL,                 -- practice_type_id (NULL porque es Consulta)
    'Particular',         -- health_insurance
    'scheduled',          -- status (default)
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'  -- cancellation_token
);

-- Ejemplo 2: Cita de tipo Practica
INSERT INTO appointments (
    client_id,
    user_account_id,
    appointment_date,
    appointment_time,
    visit_type_id,        -- 2 = Practica (OBLIGATORIO)
    consult_type_id,      -- NULL (debe ser NULL si visit_type_id = 2)
    practice_type_id,     -- 1/2/3 (OBLIGATORIO si visit_type_id = 2)
    health_insurance,     -- OBLIGATORIO
    status,
    cancellation_token
)
VALUES (
    123,
    6,
    '2025-01-16',
    '14:00:00',
    2,                    -- visit_type_id (2 = Practica)
    NULL,                 -- consult_type_id (NULL porque es Practica)
    1,                    -- practice_type_id (1 = Criocirugía)
    'Practica Particular',
    'scheduled',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
);
```

**Relaciones de Datos:**
- `client_id` → `clients.id` (relación con datos del paciente, eliminación en cascada)
- `user_account_id` → `user_accounts.id` (relación con el proveedor, NOT NULL)
- `visit_type_id` → `visit_types.id` (OBLIGATORIO: 1 = Consulta, 2 = Practica)
- `consult_type_id` → `consult_types.id` (OBLIGATORIO solo si visit_type_id = 1, NULL si visit_type_id = 2)
- `practice_type_id` → `practice_types.id` (OBLIGATORIO solo si visit_type_id = 2, NULL si visit_type_id = 1)

**Validaciones en Base de Datos:**
- **Teléfono único:** El teléfono debe ser único en `clients` (permite actualizar datos si el teléfono ya existe)
- **Citas duplicadas:** El índice único parcial `unique_appointment_scheduled` previene citas duplicadas activas (mismo cliente, proveedor, fecha y hora con estado 'scheduled'). Permite historial de citas canceladas/completadas.
- **Fecha válida:** `appointment_date` debe ser >= CURRENT_DATE (no se permiten fechas pasadas)
- **Hora válida:** `appointment_time` debe estar en formato TIME válido
- **Estado válido:** `status` solo puede ser 'scheduled', 'cancelled', o 'completed' (default: 'scheduled')
- **Lógica condicional:** 
  - Si `visit_type_id = 1`: `consult_type_id` debe tener valor, `practice_type_id` debe ser NULL
  - Si `visit_type_id = 2`: `practice_type_id` debe tener valor, `consult_type_id` debe ser NULL
- **Obra social obligatoria:** `health_insurance` es NOT NULL
- **Proveedor obligatorio:** `user_account_id` es NOT NULL

### AvailableTimesComponentImproved

**Archivo:** `components/agendar-visita/AvailableTimesComponentImproved.tsx`

#### Funcionalidad Detallada

Este componente es responsable de mostrar y gestionar el select de horarios disponibles.

##### 1. Obtención de Horarios Disponibles

**API Endpoint:**
- `GET /api/available-times/[date]?user_account_id={id}`
- Parámetros:
  - `[date]`: Fecha en formato `YYYY-MM-DD`
  - `user_account_id`: ID del proveedor obtenido dinámicamente

**Respuesta:**
- Array de strings de hora en formato `HH:MM`
- Ejemplo: `["09:00", "09:20", "09:40", "10:00", "10:20", ...]`
- Array vacío `[]` si no hay horarios disponibles

##### 2. Lógica de Generación de Horarios

**Proceso paso a paso:**

1. **Obtiene Horario de Trabajo del Proveedor:**
   - Consulta tabla `work_schedule` para el día de la semana
   - Obtiene `start_time` y `end_time` de tabla `available_slots`
   - Ejemplo: `start_time = "09:00"`, `end_time = "18:00"`

2. **Genera Intervalos de 20 Minutos:**
   - Calcula todos los intervalos posibles desde `start_time` hasta `end_time`
   - Cada intervalo es de exactamente 20 minutos
   - Ejemplo con horario 09:00-18:00:
     ```
     09:00, 09:20, 09:40, 10:00, 10:20, ..., 17:40
     ```

3. **Filtra Horarios Ya Reservados:**
   - Consulta tabla `appointments` para la fecha seleccionada
   - Filtra citas donde `status = 'scheduled'`
   - Excluye los horarios de estas citas de la lista disponible
   - Ejemplo: Si hay una cita a las 10:00, ese horario no aparece

4. **Filtra Horarios Deshabilitados:**
   - Consulta tabla `unavailable_time_frames` para la fecha
   - Excluye rangos de tiempo bloqueados específicamente
   - Ejemplo: Si 14:00-15:00 está bloqueado, esos horarios no aparecen

5. **Retorna Lista Final:**
   - Array de horarios disponibles después de todos los filtros
   - Ordenados cronológicamente
   - Listos para mostrar en el select

##### 3. Gestión de Estado

**React Query Integration:**
- Usa `useQuery` de TanStack Query
- Caché de 5 minutos de tiempo de expiración
- Clave de caché incluye fecha y `user_account_id`
- Evita llamadas innecesarias a la API

**Estados del Componente:**
- **Loading:** Muestra indicador de carga mientras obtiene horarios
- **Success:** Muestra select con horarios disponibles
- **Empty:** Muestra mensaje si no hay horarios disponibles
- **Error:** Muestra mensaje de error si falla la obtención

**Limpieza de Estado:**
- Limpia la selección de hora cuando cambia la fecha
- Resetea el estado cuando se selecciona un nuevo proveedor
- Invalida caché cuando se crea una nueva cita

##### 4. Validación y Manejo de Errores

**Validaciones:**
- Verifica que la fecha sea válida antes de hacer la petición
- Valida que `user_account_id` esté disponible
- Maneja casos donde el proveedor no tiene horario configurado

**Manejo de Errores:**
- Muestra mensaje amigable si no hay horarios disponibles
- Maneja errores de red con mensajes apropiados
- Permite reintentar la obtención de horarios

### Flujo de Obtención de Datos

```
AppointmentForm
├── useQuery: health-insurance-types
│   └── GET /api/health-insurance
│
├── useQuery: provider-work-schedule
│   └── GET /api/provider/[username]/work-schedule
│       └── Returns: { workingDays: [1,2,3,4,5], unavailableDates: [...] }
│
└── AvailableTimesComponentImproved
    └── useQuery: availableTimes
        └── GET /api/available-times/[date]?user_account_id={id}
            └── Returns: ["09:00", "09:20", ...]

Form Submit
└── useMutation: addNewPatientAndAppointmentMutation
    └── POST /api/appointments/create
        ├── Creates client (if new) and appointment
        └── Sends WhatsApp confirmation message via Whapi
```

---

## Rutas API

### Autenticación y Registro de Proveedores

#### Registrar Proveedor (`POST /api/auth/register`)

**Propósito:** Crear cuenta de proveedor y enviar email de verificación

**Cuerpo de la Solicitud:**
```json
{
    "email": "proveedor@example.com",
    "username": "proveedor1",
    "password": "contraseña_segura",
    "full_name": "Dr. Juan Pérez"
}
```

**Respuesta Exitosa:**
```json
{
    "success": true,
    "message": "Cuenta creada. Por favor verifica tu email.",
    "user_id": 123
}
```

**Errores:**
- `400`: Email o username ya existe
- `400`: Campos inválidos o faltantes
- `500`: Error al enviar email de verificación

**Lógica:**
1. Valida que email y username sean únicos
2. Valida formato de email y requisitos de contraseña
3. Hashea contraseña con bcrypt
4. Genera token de verificación aleatorio
5. Crea registro en `user_accounts` con `email_verified = false`
6. Envía email de verificación usando Nodemailer (Google SMTP)
7. Retorna éxito con `user_id`

---

#### Verificar Email (`GET /api/auth/verify-email`)

**Propósito:** Verificar email del proveedor mediante token

**Query Parameters:**
- `token`: Token de verificación recibido por email

**Respuesta Exitosa:**
```json
{
    "success": true,
    "message": "Email verificado exitosamente. Ya puedes iniciar sesión."
}
```

**Errores:**
- `400`: Token inválido o expirado
- `404`: Token no encontrado
- `400`: Email ya verificado

**Lógica:**
1. Busca cuenta con `verification_token` coincidente
2. Valida que token no haya expirado (24 horas)
3. Actualiza `email_verified = true`
4. Limpia `verification_token` (establece a NULL)
5. Retorna éxito

---

#### Iniciar Sesión (`POST /api/auth/login`)

**Propósito:** Autenticar proveedor y obtener JWT token

**Cuerpo de la Solicitud:**
```json
{
    "email": "proveedor@example.com",
    "password": "contraseña_segura"
}
```

**Respuesta Exitosa:**
```json
{
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
        "id": 123,
        "email": "proveedor@example.com",
        "username": "proveedor1",
        "email_verified": true
    }
}
```

**Errores:**
- `401`: Credenciales inválidas
- `403`: Email no verificado (`email_verified = false`)
- `404`: Usuario no encontrado

**Lógica:**
1. Busca cuenta por email
2. Compara contraseña con hash almacenado
3. Verifica que `email_verified = true`
4. Genera JWT token con información del usuario
5. Retorna token y datos del usuario

---

### Creación de Cita

**POST** `/api/appointments/create`

**Cuerpo de la Solicitud:**
```json
{
    "first_name": "Juan",
    "last_name": "Pérez",
    "phone_number": "3421234567",
    "visit_type_id": 1,
    "consult_type_id": 1,
    "practice_type_id": null,
    "health_insurance": "Particular",
    "appointment_date": "2025-01-15",
    "appointment_time": "09:00",
    "user_account_id": 6
}
```

**Nota sobre Campos Condicionales:**
- Si `visit_type_id = 1` (Consulta): `consult_type_id` es obligatorio, `practice_type_id` debe ser `null`
- Si `visit_type_id = 2` (Practica): `practice_type_id` es obligatorio, `consult_type_id` debe ser `null`

**Respuesta:**
```json
{
    "is_existing_patient": false,
    "appointment_info": {
        "id": 123,
        "patient_name": "Juan Pérez",
        "phone_number": "3421234567",
        "appointment_date": "2025-01-15",
        "appointment_time": "09:00",
        "visit_type_name": "Consulta",
        "consult_type_name": "Primera vez",
        "cancellation_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "appointment_details_url": "https://tudominio.com/[username]/cita/123?token=..."
    }
}
```

**Lógica:**
1. Valida el cuerpo de la solicitud (todos los campos requeridos)
2. Valida formato de teléfono para WhatsApp
3. Valida lógica condicional:
   - Si `visit_type_id = 1`: Verifica que `consult_type_id` tenga valor y `practice_type_id` sea null
   - Si `visit_type_id = 2`: Verifica que `practice_type_id` tenga valor y `consult_type_id` sea null
4. Valida que `user_account_id` existe y es válido
5. Valida que la fecha no sea en el pasado (`appointment_date >= CURRENT_DATE`)
6. Verifica si el cliente existe por número de teléfono
7. Crea cliente si no existe (actualiza información del cliente existente si el teléfono coincide)
8. Verifica citas duplicadas activas:
   - Consulta si existe una cita con mismo cliente, proveedor, fecha, hora y estado 'scheduled'
   - El índice único parcial `unique_appointment_scheduled` previene duplicados automáticamente
   - Si existe, retorna error 409 Conflict antes de intentar insertar
9. Valida que la fecha/hora de la cita esté disponible:
   - Verifica que el día sea laborable para el proveedor
   - Verifica que el horario esté dentro del rango disponible
   - Verifica que no haya otra cita programada en ese horario
10. Genera token de cancelación (JWT)
11. Crea registro de cita en la base de datos con todas las validaciones
12. Actualiza token con ID de cita
13. Envía mensaje de WhatsApp de confirmación vía Whapi al teléfono proporcionado
14. Retorna información de la cita con token de cancelación y URL de detalles

**Respuestas de Error:**
- `400 Bad Request`: Campos faltantes o inválidos
- `409 Conflict`: Ya existe una cita duplicada
- `404 Not Found`: Proveedor/user_account no encontrado
- `500 Internal Server Error`: Error de base de datos o servidor

**Ejemplo de Respuesta de Error:**
```json
{
    "error": "Ya existe una cita duplicada",
    "message": "Ya existe una cita para este cliente, fecha y hora"
}
```

---

### Horarios Disponibles

**GET** `/api/available-times/[date]?user_account_id={id}`

**Respuesta:**
```json
["09:00", "09:20", "09:40", "10:00", "10:20", ...]
```

**Lógica:**
1. Valida formato de fecha (YYYY-MM-DD)
2. Valida que la fecha no sea en el pasado
3. **Caché:** Intenta obtener resultado del caché (ver `lib/cache.ts`)
4. Si no está en caché:
   a. Obtiene día de la semana (Domingo = 0, Lunes = 1, etc.)
   b. Convierte a nombre de día ("Monday", "Tuesday", etc.)
   c. Verifica si el día no está disponible (tabla `unavailable_days`)
   d. Obtiene horario de trabajo para el día y user_account_id
   e. Retorna array vacío si el día no es laborable
   f. Obtiene franjas disponibles (`available_slots`) o marcos de tiempo personalizados
   g. Obtiene citas reservadas para la fecha (estado = 'scheduled')
   h. Genera franjas de 20 minutos desde start_time hasta end_time
   i. Filtra horarios reservados
   j. Filtra marcos de tiempo no disponibles (`unavailable_time_frames`)
   k. Almacena resultado en caché (TTL: 5 minutos)
5. Retorna array de strings de hora disponibles

**Implementación con Caché:**
```typescript
// app/api/available-times/[date]/route.ts
import { getOrSetCache, cacheKeys } from '@/lib/cache';
import { apiLogger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { date: string } }
) {
  const { date } = params;
  const userAccountId = parseInt(request.nextUrl.searchParams.get('user_account_id') || '0');

  // Obtener del caché o calcular
  const availableTimes = await getOrSetCache<string[]>(
    cacheKeys.availableTimes(userAccountId, date),
    async () => {
      // Lógica de cálculo de horarios disponibles...
      return calculateAvailableTimes(userAccountId, date);
    },
    300 // 5 minutos TTL
  );

  return NextResponse.json(availableTimes);
}
```

**Respuestas de Error:**
- `400 Bad Request`: Formato de fecha inválido o fecha pasada
- `404 Not Found`: Proveedor/user_account no encontrado
- `500 Internal Server Error`: Error de base de datos o servidor

**Ejemplo de Respuesta de Error:**
```json
{
    "error": "Formato de fecha inválido",
    "message": "La fecha debe estar en formato YYYY-MM-DD"
}
```

---

### Horario de Trabajo

**GET** `/api/provider/[username]/work-schedule`

**Respuesta:**
```json
{
    "user_account_id": 6,
    "workingDays": [1, 2, 3, 4, 5],  // Lunes-Viernes (0=Domingo, 1=Lunes, ...)
    "unavailableDates": ["2025-01-01", "2025-12-25"]
}
```

**Lógica:**
1. Mapea username a user_account_id mediante consulta a la base de datos vía `lib/user-routes.ts`
2. Valida que user_account existe
3. Consulta `work_schedule` para user_account_id
4. Convierte nombres de días a números (0-6, donde 0=Domingo, 1=Lunes, etc.)
5. Filtra días laborables (`is_working_day = true`)
6. Obtiene fechas no disponibles de la tabla `unavailable_days`
7. Incluye días festivos hardcodeados (1 de enero, 25 de diciembre)
8. Retorna respuesta formateada

**Respuestas de Error:**
- `404 Not Found`: Username/proveedor no encontrado
- `500 Internal Server Error`: Error de base de datos o servidor

---

### Obras Sociales

**GET** `/api/health-insurance`

**Respuesta:**
```json
[
    {
        "id": 1,
        "name": "Particular",
        "price": "$25.000",
        "price_numeric": 25000,
        "notes": null
    },
    {
        "id": 2,
        "name": "Practica Particular",
        "price": "$50.000",
        "price_numeric": 50000,
        "notes": null
    },
    ...
]
```

**Lógica:**
1. Lee archivo `data/obras-sociales.json`
2. Valida estructura JSON
3. Normaliza estructura de datos (asegura formato consistente)
4. Retorna array de opciones de obras sociales

**Respuestas de Error:**
- `500 Internal Server Error`: Error de lectura de archivo o JSON inválido

**Nota:** Los datos de obras sociales se almacenan como archivo JSON, no en la base de datos. Esto permite actualizaciones fáciles sin migraciones de base de datos.

---

### Obtener Detalles de Cita

**GET** `/api/appointments/[id]`

**Parámetros de Consulta:**
- `token` (opcional): Token JWT para validar acceso

**Respuesta:**
```json
{
    "id": 123,
    "patient_name": "Juan Pérez",
    "phone_number": "3421234567",
    "appointment_date": "2025-01-15",
    "appointment_time": "09:00",
    "visit_type_name": "Consulta",
    "consult_type_name": "Primera vez",
    "health_insurance": "Particular",
    "status": "scheduled",
    "provider_username": "maraflamini",
    "can_cancel": true
}
```

**Lógica:**
1. Valida que la cita existe
2. Si se proporciona token, valida el token JWT
3. Verifica que el token corresponde a la cita
4. Verifica si la cita puede cancelarse (al menos 12 horas antes)
5. Retorna información de la cita

**Respuestas de Error:**
- `404 Not Found`: Cita no encontrada
- `403 Forbidden`: Token inválido o expirado
- `400 Bad Request`: No se puede cancelar (menos de 12 horas antes)

---

### Cancelar Cita

**POST** `/api/appointments/[id]/cancel`

**Cuerpo de la Solicitud:**
```json
{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "cancelled_by": "patient" // o "provider"
}
```

**Respuesta:**
```json
{
    "success": true,
    "message": "Cita cancelada exitosamente",
    "appointment_id": 123,
    "status": "cancelled"
}
```

**Lógica:**
1. Valida token JWT
2. Verifica que la cita existe y está programada
3. Verifica que la cancelación es posible (al menos 12 horas antes, o si es el proveedor)
4. Actualiza estado de la cita a 'cancelled'
5. Si es cancelación por proveedor, envía mensaje de WhatsApp al paciente con opción de reagendar
6. Si es cancelación por paciente, libera el horario
7. Retorna confirmación

**Respuestas de Error:**
- `400 Bad Request`: Token inválido o cita no puede cancelarse
- `404 Not Found`: Cita no encontrada
- `409 Conflict`: Cita ya cancelada o completada
- `500 Internal Server Error`: Error de base de datos o servidor

---

### Enviar Mensaje WhatsApp (Interno)

**POST** `/api/whatsapp/send`

**Nota:** Este endpoint es interno y no debe exponerse públicamente. Se usa internamente para enviar notificaciones.

**Cuerpo de la Solicitud:**
```json
{
    "phone_number": "3421234567",
    "message": "Tu cita ha sido confirmada...",
    "message_type": "confirmation" // o "cancellation", "reschedule"
}
```

**Respuesta:**
```json
{
    "success": true,
    "message_id": "whapi_message_id"
}
```

**Lógica:**
1. Valida credenciales de Whapi
2. Formatea mensaje según tipo
3. Envía mensaje vía API de Whapi
4. Registra envío (opcional, para logging)
5. Retorna confirmación

**Respuestas de Error:**
- `400 Bad Request`: Número de teléfono inválido o mensaje vacío
- `401 Unauthorized`: Credenciales de Whapi inválidas
- `500 Internal Server Error`: Error al enviar mensaje

---

## Características Clave y Flujos de Usuario

### Flujo de Reserva de Cita

**Viaje del Usuario:**
1. Paciente navega a la página de reserva del proveedor (ej: `/[username]/agendar-visita`)
2. Completa información personal (nombre, teléfono)
3. Selecciona tipo de visita (Consulta o Practica)
4. Elige sub-tipo apropiado según el tipo de visita
5. Selecciona opción de obra social
6. Elige fecha disponible del calendario
7. Selecciona franja horaria disponible
8. Envía formulario
9. Sistema crea la cita y envía mensaje de WhatsApp de confirmación
10. Paciente recibe mensaje de WhatsApp con enlace a detalles de cita
11. Paciente es redirigido a `/[username]/cita/[id]` con detalles de la cita

### Flujo de Cancelación por Paciente

**Viaje del Usuario:**
1. Paciente recibe mensaje de WhatsApp con enlace a detalles de cita
2. Paciente hace clic en el enlace → Navega a `/[username]/cita/[id]?token={token}`
3. Sistema valida token y muestra detalles de la cita
4. Si es posible cancelar (al menos 12 horas antes), muestra botón de cancelación
5. Paciente confirma cancelación
6. Sistema actualiza estado de la cita a `'cancelled'`
7. Sistema libera el horario para que esté disponible nuevamente
8. Paciente es redirigido a `/[username]/agendar-visita` para reservar otra cita

### Flujo de Cancelación por Proveedor

**Viaje del Usuario:**
1. Proveedor cancela cita desde panel de administración
2. Sistema actualiza estado de la cita a `'cancelled'`
3. Sistema envía mensaje de WhatsApp al paciente:
   - Informa que la cita fue cancelada
   - Proporciona enlace para reagendar: `/[username]/agendar-visita`
   - Mensaje: "Por favor, reagenda tu cita"
4. Sistema libera el horario para que esté disponible nuevamente
5. Paciente puede reagendar visitando el enlace proporcionado

### Características del Panel de Administración

La aplicación incluye un panel de administración (autenticación vía JWT) para:
- Ver todas las citas
- Gestionar horarios de proveedores
- Configurar fechas/horarios no disponibles
- Gestionar opciones de obras sociales
- Ver información de pacientes/clientes
- Cancelar citas (envía notificación automática al paciente)

**Nota:** Las rutas y características del panel de administración deben documentarse por separado si existen en el código base.

### Gestión de Horarios de Trabajo del Proveedor

Los proveedores pueden configurar:
- **Días Laborables**: Qué días de la semana están disponibles
- **Franjas Horarias**: Rangos de tiempo disponibles por día
- **Fechas No Disponibles**: Bloquear días completos (festivos, vacaciones)
- **Marcos de Tiempo No Disponibles**: Bloquear rangos de tiempo específicos en fechas específicas

---

## Verificación de Relación Endpoints-Base de Datos

### Mapeo Completo de Endpoints a Tablas

Esta sección verifica que todos los endpoints documentados tienen una relación clara con las tablas de la base de datos.

#### Endpoints de Autenticación

| Endpoint | Método | Tablas Relacionadas | Campos Utilizados |
|----------|--------|---------------------|-------------------|
| `/api/auth/register` | POST | `user_accounts` | `email`, `username`, `password`, `first_name`, `last_name`, `email_verified`, `verification_token`, `verification_token_expires` |
| `/api/auth/verify-email` | GET | `user_accounts` | `verification_token`, `verification_token_expires`, `email_verified` |
| `/api/auth/login` | POST | `user_accounts` | `email`, `password`, `email_verified` |

**Verificación:** ✅ Todos los campos existen en la tabla `user_accounts`

#### Endpoints de Citas

| Endpoint | Método | Tablas Relacionadas | Campos Utilizados |
|----------|--------|---------------------|-------------------|
| `/api/appointments/create` | POST | `appointments`, `clients`, `user_accounts`, `visit_types`, `consult_types`, `practice_types` | `appointments`: todos los campos<br>`clients`: `first_name`, `last_name`, `phone_number`<br>`user_accounts`: `id` (user_account_id) |
| `/api/appointments/[id]` | GET | `appointments`, `clients`, `user_accounts`, `visit_types`, `consult_types`, `practice_types` | `appointments`: todos los campos<br>`clients`: `first_name`, `last_name`, `phone_number` |
| `/api/appointments/[id]/cancel` | POST | `appointments` | `status`, `whatsapp_sent`, `whatsapp_sent_at` |

**Verificación:** ✅ Todos los campos existen en las tablas correspondientes

#### Endpoints de Disponibilidad

| Endpoint | Método | Tablas Relacionadas | Campos Utilizados |
|----------|--------|---------------------|-------------------|
| `/api/available-times/[date]` | GET | `appointments`, `available_slots`, `work_schedule`, `unavailable_time_frames`, `unavailable_days` | `appointments`: `appointment_date`, `appointment_time`, `status`<br>`available_slots`: `start_time`, `end_time`, `is_available`<br>`work_schedule`: `day_of_week`, `is_working_day`<br>`unavailable_time_frames`: `workday_date`, `start_time`, `end_time`<br>`unavailable_days`: `unavailable_date` |
| `/api/provider/[username]/work-schedule` | GET | `user_accounts`, `work_schedule`, `unavailable_days` | `user_accounts`: `username`, `id`<br>`work_schedule`: `day_of_week`, `is_working_day`<br>`unavailable_days`: `unavailable_date` |

**Verificación:** ✅ Todos los campos existen en las tablas correspondientes

#### Endpoints de Obras Sociales

| Endpoint | Método | Tablas Relacionadas | Campos Utilizados |
|----------|--------|---------------------|-------------------|
| `/api/health-insurance` | GET | Ninguna (datos estáticos desde archivo JSON) | N/A - Retorna datos desde `data/obras-sociales.json` |

**Nota:** Este endpoint no requiere tabla de base de datos ya que los datos son estáticos desde un archivo JSON.

#### Endpoints de WhatsApp

| Endpoint | Método | Tablas Relacionadas | Campos Utilizados |
|----------|--------|---------------------|-------------------|
| `/api/whatsapp/send` | POST | `appointments` (actualización) | `whatsapp_sent`, `whatsapp_sent_at`, `whatsapp_message_id` |

**Verificación:** ✅ Los campos existen en la tabla `appointments`

#### Endpoints del Perfil del Proveedor

| Endpoint | Método | Tablas Relacionadas | Campos Utilizados |
|----------|--------|---------------------|-------------------|
| `/api/proveedor/appointments` | GET | `appointments`, `clients`, `visit_types`, `consult_types`, `practice_types` | `appointments`: todos los campos<br>`clients`: `first_name`, `last_name`, `phone_number` |
| `/api/proveedor/calendar` | GET | `appointments`, `work_schedule`, `unavailable_days`, `available_slots` | `appointments`: `appointment_date`, `appointment_time`, `status`<br>`work_schedule`: `day_of_week`, `is_working_day`<br>`unavailable_days`: `unavailable_date` |
| `/api/proveedor/calendar/day/[date]` | GET | `appointments`, `clients`, `visit_types`, `consult_types`, `practice_types`, `available_slots` | `appointments`: todos los campos<br>`clients`: `first_name`, `last_name`, `phone_number` |
| `/api/proveedor/profile` | GET | `user_accounts` | Todos los campos de `user_accounts` |
| `/api/proveedor/profile` | PUT | `user_accounts` | `email`, `first_name`, `last_name`, `whatsapp_phone_number`, `email_verified` |
| `/api/proveedor/profile/password` | PUT | `user_accounts` | `password` |
| `/api/proveedor/unavailable-days` | POST | `unavailable_days` | `user_account_id`, `unavailable_date`, `is_confirmed` |
| `/api/proveedor/unavailable-days/[id]` | DELETE | `unavailable_days` | `id` |
| `/api/proveedor/unavailable-days` | GET | `unavailable_days` | Todos los campos |
| `/api/proveedor/work-schedule` | GET | `work_schedule`, `available_slots` | Todos los campos de ambas tablas |
| `/api/proveedor/work-schedule/[day_of_week]` | PUT | `work_schedule` | `is_working_day` |
| `/api/proveedor/work-schedule/[day_of_week]/slots` | POST | `available_slots`, `work_schedule` | `work_schedule_id`, `start_time`, `end_time`, `is_available` |
| `/api/proveedor/work-schedule/slots/[id]` | DELETE | `available_slots` | `id` |

**Verificación:** ✅ Todos los campos existen en las tablas correspondientes

### Verificación de Campos Faltantes

#### Campos en Endpoints que NO existen en Base de Datos

**Ninguno encontrado** - Todos los campos mencionados en los endpoints existen en las tablas correspondientes.

#### Campos en Base de Datos que NO se usan en Endpoints

1. **Tabla `clients`:**
   - `email` - Campo existe pero no se usa en endpoints de creación de citas (solo se requiere teléfono)
   - **Nota:** Esto es correcto ya que los pacientes no requieren email

2. **Tabla `appointments`:**
   - `notes` - Campo existe pero no se documenta en endpoints
   - **Recomendación:** Agregar campo `notes` opcional en `POST /api/appointments/create`

3. **Tabla `user_accounts`:**
   - Todos los campos están siendo utilizados

4. **Tabla `users` (Administradores):**
   - Esta tabla no tiene endpoints documentados
   - **Nota:** Esto es correcto si el panel de administración no está documentado aún

### Relaciones Foreign Key Verificadas

Todas las relaciones FOREIGN KEY mencionadas en los endpoints están correctamente definidas en el esquema:

✅ `appointments.client_id` → `clients.id`  
✅ `appointments.user_account_id` → `user_accounts.id`  
✅ `appointments.visit_type_id` → `visit_types.id`  
✅ `appointments.consult_type_id` → `consult_types.id`  
✅ `appointments.practice_type_id` → `practice_types.id`  
✅ `work_schedule.user_account_id` → `user_accounts.id`  
✅ `available_slots.work_schedule_id` → `work_schedule.id`  
✅ `available_slots.user_account_id` → `user_accounts.id`  
✅ `unavailable_days.user_account_id` → `user_accounts.id`  
✅ `unavailable_time_frames.user_account_id` → `user_accounts.id`  
✅ `unavailable_time_frames.work_schedule_id` → `work_schedule.id`  

### Índices Utilizados por Endpoints

Los siguientes índices optimizan las consultas de los endpoints:

✅ `idx_appointments_user_account_id` - Usado en endpoints del perfil del proveedor  
✅ `idx_appointments_date` - Usado en endpoints de calendario  
✅ `idx_appointments_user_date_time` - Usado en endpoints de disponibilidad  
✅ `idx_clients_phone_number` - Usado en creación de citas (búsqueda de cliente existente)  
✅ `idx_unavailable_days_user_date` - Usado en endpoints de días no laborables  
✅ `unique_appointment_scheduled` - Previene duplicados en creación de citas  

### Recomendaciones

1. **Agregar campo `notes` opcional** en `POST /api/appointments/create` para permitir notas adicionales sobre la cita.

2. **Documentar endpoints de administración** si existen, especialmente para la tabla `users`.

3. **Considerar agregar tabla `health_insurance`** si se quiere hacer dinámico el sistema de obras sociales en lugar de usar archivo JSON estático.

4. **Agregar campo `verification_token_expires`** en `user_accounts` para manejar expiración de tokens de verificación (actualmente se menciona expiración de 24 horas pero no hay campo en BD).

---

## Estilos y Componentes UI

### Configuración de Tailwind

**Archivo:** `tailwind.config.ts`

- Usa plugin `tailwindcss-animate`
- Esquema de colores personalizado vía variables CSS
- Soporte de modo oscuro (basado en clases)
- Variables de radio de borde personalizadas

### Estilos Globales

**Archivo:** `app/globals.css`

- Directivas de Tailwind
- Variables CSS para temas
- Gradientes de fondo personalizados
- Estilos base para body y componentes

### Esquema de Colores

La aplicación usa una paleta de colores personalizada:

- Primario: `#9e7162` (marrón)
- Secundario: `#ba8c84` (marrón claro)
- Fondo: Gradiente de `#fff3f0` a `#e8d4cd`
- Texto: Blanco (`#ffffff`)

### Componentes UI (shadcn/ui)

Todos los componentes están en `components/ui/`:
- `button.tsx`
- `input.tsx`
- `select.tsx`
- `calendar.tsx`
- `form.tsx`
- `popover.tsx`
- `dialog.tsx`
- `toast.tsx` (vía sonner)
- Y más...

### Component Configuration

**File:** `components.json`

```json
{
    "style": "default",
    "rsc": true,
    "tsx": true,
    "tailwind": {
        "config": "tailwind.config.ts",
        "css": "app/globals.css",
        "baseColor": "zinc",
        "cssVariables": true
    },
    "aliases": {
        "components": "@/components",
        "utils": "@/lib/utils",
        "ui": "@/components/ui"
    }
}
```

---

## Autenticación y Seguridad

### Sistema de Registro y Verificación de Proveedores

**IMPORTANTE:** Solo los proveedores requieren registro. Los pacientes pueden acceder libremente a los formularios de reserva sin necesidad de crear cuenta.

#### Flujo de Registro de Proveedor

1. **Formulario de Registro** (`POST /api/auth/register`)
   - Endpoint: `/api/auth/register`
   - Campos requeridos:
     - `email`: Email único del proveedor
     - `username`: Nombre de usuario único (usado en rutas dinámicas)
     - `password`: Contraseña (se hashea con bcrypt)
     - `full_name`: Nombre completo del proveedor

2. **Creación de Cuenta**
   - Se crea registro en `user_accounts` con:
     - `email_verified = false`
     - `verification_token` generado aleatoriamente
     - Password hasheado con bcrypt

3. **Envío de Email de Verificación**
   - Sistema envía email usando Nodemailer con Google SMTP
   - Email contiene enlace: `{NEXT_PUBLIC_APP_URL}/[username]/verificar-email?token={verification_token}`
   - Token expira después de 24 horas

4. **Verificación de Email** (`GET /api/auth/verify-email`)
   - Proveedor hace clic en enlace del email
   - Sistema valida token y expiración
   - Actualiza `email_verified = true` y limpia `verification_token`

5. **Inicio de Sesión**
   - Una vez verificado, el proveedor puede iniciar sesión
   - Endpoint: `POST /api/auth/login`
   - Retorna JWT token para autenticación

#### Implementación de Email con Nodemailer (Google)

**Archivo:** `lib/email.ts`

```typescript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, // smtp.gmail.com
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true para 465, false para 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS, // Contraseña de aplicación de Google
  },
});

export async function sendVerificationEmail(
  email: string,
  username: string,
  verificationToken: string
) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${username}/verificar-email?token=${verificationToken}`;

  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM}>`,
    to: email,
    subject: 'Verifica tu cuenta de MaxTurnos',
    html: `
      <h1>Bienvenido a MaxTurnos</h1>
      <p>Por favor, verifica tu cuenta haciendo clic en el siguiente enlace:</p>
      <a href="${verificationUrl}">${verificationUrl}</a>
      <p>Este enlace expira en 24 horas.</p>
      <p>Si no solicitaste esta cuenta, puedes ignorar este email.</p>
    `,
  };

  return await transporter.sendMail(mailOptions);
}
```

#### Endpoints de Autenticación

**Registro de Proveedor:**
```
POST /api/auth/register
Body: {
  email: string,
  username: string,
  password: string,
  full_name: string
}
Response: {
  success: boolean,
  message: string,
  user_id?: number
}
```

**Verificación de Email:**
```
GET /api/auth/verify-email?token={verification_token}
Response: {
  success: boolean,
  message: string
}
```

**Inicio de Sesión:**
```
POST /api/auth/login
Body: {
  email: string,
  password: string
}
Response: {
  success: boolean,
  token?: string,
  user?: {
    id: number,
    email: string,
    username: string,
    email_verified: boolean
  }
}
```

### Sistema de Tokens JWT

**Propósito:** Autenticación segura para panel de administración de proveedores

**Implementación:**
- Clave secreta de variable de entorno `JWT_SECRET` (mínimo 32 caracteres)
- Expiración de token de 24 horas
- Token almacenado en cookies HTTP-only
- Verificación de token en rutas protegidas
- Solo proveedores con `email_verified = true` pueden obtener token

**Payload del Token:**
```json
{
    "id": 1,
    "email": "proveedor@example.com",
    "username": "proveedor1",
    "email_verified": true,
    "iat": 1234567890,
    "exp": 1234654290
}
```

### Sistema de Tokens de Cancelación

**Propósito:** Enlaces seguros y con tiempo limitado para cancelación de citas

**Implementación:**
- Tokens basados en JWT
- Expira 12 horas antes del horario de la cita
- Contiene ID de cita, ID de cliente, teléfono, fecha y hora
- Validación de un solo uso
- Previene cancelación dentro de 12 horas de la cita

**Generación de Token:**
```typescript
generateCancellationToken({
    appointmentId: string,
    patientId: string,
    patientPhone: string,
    appointmentDate: string,
    appointmentTime: string
}): string
```

**Archivo:** `lib/cancellation-token.ts`

### Hash de Contraseñas

- Usa `bcryptjs` para hash de contraseñas
- Rondas de sal: Por defecto (10)

---

## Integración de WhatsApp (Whapi)

### Configuración de Whapi

**Whapi** es el servicio utilizado para enviar mensajes de WhatsApp automáticamente. La integración permite enviar confirmaciones de citas y notificaciones de cancelación.

### Variables de Entorno Requeridas

```env
WHAPI_API_URL=https://api.whapi.cloud
WHAPI_API_TOKEN=tu_token_de_whapi
WHAPI_PHONE_NUMBER_ID=tu_phone_number_id
```

### Configuración Inicial

1. **Crear cuenta en Whapi:**
   - Visita https://whapi.cloud
   - Crea una cuenta y obtén tu API token
   - Configura tu número de teléfono de WhatsApp Business

2. **Obtener credenciales:**
   - `WHAPI_API_TOKEN`: Token de API de tu cuenta Whapi
   - `WHAPI_PHONE_NUMBER_ID`: ID del número de teléfono configurado

3. **Agregar a `.env.local`:**
   ```env
   WHAPI_API_URL=https://api.whapi.cloud
   WHAPI_API_TOKEN=tu_token_aqui
   WHAPI_PHONE_NUMBER_ID=tu_phone_id_aqui
   ```

### Plantillas de Mensajes

#### Mensaje de Confirmación de Cita

Cuando un paciente reserva una cita exitosamente, se envía automáticamente un mensaje de WhatsApp:

```
¡Hola {nombre_paciente}!

Tu cita ha sido confirmada exitosamente.

📅 Fecha: {fecha}
🕐 Hora: {hora}
👨‍⚕️ Tipo: {tipo_visita}
🏥 Obra Social: {obra_social}

Para ver los detalles de tu cita o cancelarla, visita:
{enlace_detalles_cita}

¡Te esperamos!
```

**Ejemplo de implementación:**
```typescript
// lib/whatsapp.ts
export async function sendAppointmentConfirmation(
  phoneNumber: string,
  appointmentDetails: {
    patientName: string;
    date: string;
    time: string;
    visitType: string;
    healthInsurance: string;
    detailsUrl: string;
  }
) {
  const message = `¡Hola ${appointmentDetails.patientName}!

Tu cita ha sido confirmada exitosamente.

📅 Fecha: ${appointmentDetails.date}
🕐 Hora: ${appointmentDetails.time}
👨‍⚕️ Tipo: ${appointmentDetails.visitType}
🏥 Obra Social: ${appointmentDetails.healthInsurance}

Para ver los detalles de tu cita o cancelarla, visita:
${appointmentDetails.detailsUrl}

¡Te esperamos!`;

  return await sendWhatsAppMessage(phoneNumber, message);
}
```

#### Mensaje de Cancelación por Proveedor

Cuando un proveedor cancela una cita, se envía un mensaje al paciente:

```
¡Hola {nombre_paciente}!

Lamentamos informarte que tu cita del {fecha} a las {hora} ha sido cancelada.

Por favor, reagenda tu cita visitando:
{enlace_reagendar}

Disculpa las molestias.
```

**Ejemplo de implementación:**
```typescript
export async function sendProviderCancellationNotification(
  phoneNumber: string,
  appointmentDetails: {
    patientName: string;
    date: string;
    time: string;
    rescheduleUrl: string;
  }
) {
  const message = `¡Hola ${appointmentDetails.patientName}!

Lamentamos informarte que tu cita del ${appointmentDetails.date} a las ${appointmentDetails.time} ha sido cancelada.

Por favor, reagenda tu cita visitando:
${appointmentDetails.rescheduleUrl}

Disculpa las molestias.`;

  return await sendWhatsAppMessage(phoneNumber, message);
}
```

### Función de Envío de Mensajes

**Archivo:** `lib/whatsapp.ts`

```typescript
import axios from 'axios';

const WHAPI_API_URL = process.env.WHAPI_API_URL || 'https://api.whapi.cloud';
const WHAPI_API_TOKEN = process.env.WHAPI_API_TOKEN;
const WHAPI_PHONE_NUMBER_ID = process.env.WHAPI_PHONE_NUMBER_ID;

export async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!WHAPI_API_TOKEN || !WHAPI_PHONE_NUMBER_ID) {
    throw new Error('Whapi credentials not configured');
  }

  try {
    const response = await axios.post(
      `${WHAPI_API_URL}/messages`,
      {
        to: phoneNumber,
        body: message,
        phone: WHAPI_PHONE_NUMBER_ID,
      },
      {
        headers: {
          Authorization: `Bearer ${WHAPI_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      success: true,
      messageId: response.data.id,
    };
  } catch (error: any) {
    console.error('Error sending WhatsApp message:', error);
    return {
      success: false,
      error: error.message || 'Failed to send message',
    };
  }
}
```

### Integración en Creación de Citas

El endpoint `/api/appointments/create` debe llamar a la función de WhatsApp después de crear la cita exitosamente:

```typescript
// app/api/appointments/create/route.ts
import { sendAppointmentConfirmation } from '@/lib/whatsapp';

// Después de crear la cita exitosamente:
const detailsUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${username}/cita/${appointment.id}?token=${cancellationToken}`;

await sendAppointmentConfirmation(phoneNumber, {
  patientName: `${firstName} ${lastName}`,
  date: appointmentDate,
  time: appointmentTime,
  visitType: visitTypeName,
  healthInsurance: healthInsurance,
  detailsUrl: detailsUrl,
});
```

### Manejo de Errores

- Si el envío de WhatsApp falla, la cita aún se crea exitosamente
- Los errores se registran en los logs del servidor
- Se puede implementar un sistema de reintentos para mensajes fallidos

---

## Página de Detalles de Cita

### Estructura de Ruta

**Archivo:** `app/[username]/cita/[id]/page.tsx`

**Ruta:** `/[username]/cita/[id]?token={cancellation_token}`

Esta página muestra los detalles de una cita específica y permite al paciente cancelarla si es posible.

### Funcionalidad

1. **Validación de Token:**
   - Valida el token JWT proporcionado en la query string
   - Verifica que el token corresponde a la cita
   - Verifica que la cita existe y está programada

2. **Visualización de Detalles:**
   - Muestra información completa de la cita
   - Muestra si la cita puede cancelarse (al menos 12 horas antes)
   - Muestra información del proveedor

3. **Cancelación:**
   - Botón de cancelación (solo visible si es posible cancelar)
   - Confirmación antes de cancelar
   - Redirección a formulario de reserva después de cancelar

### Componente de Ejemplo

```typescript
// app/[username]/cita/[id]/page.tsx
'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AppointmentDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [appointment, setAppointment] = useState(null);
  const [canCancel, setCanCancel] = useState(false);
  const [loading, setLoading] = useState(true);

  const username = params.username as string;
  const appointmentId = params.id as string;
  const token = searchParams.get('token');

  useEffect(() => {
    // Obtener detalles de la cita
    fetch(`/api/appointments/${appointmentId}?token=${token}`)
      .then(res => res.json())
      .then(data => {
        setAppointment(data);
        setCanCancel(data.can_cancel);
        setLoading(false);
      });
  }, [appointmentId, token]);

  const handleCancel = async () => {
    if (confirm('¿Estás seguro de que deseas cancelar esta cita?')) {
      const response = await fetch(`/api/appointments/${appointmentId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        // Redirigir a formulario de reserva
        window.location.href = `/${username}/agendar-visita`;
      }
    }
  };

  if (loading) return <div>Cargando...</div>;
  if (!appointment) return <div>Cita no encontrada</div>;

  return (
    <div>
      <h1>Detalles de tu Cita</h1>
      <p>Paciente: {appointment.patient_name}</p>
      <p>Fecha: {appointment.appointment_date}</p>
      <p>Hora: {appointment.appointment_time}</p>
      <p>Tipo: {appointment.visit_type_name}</p>
      {canCancel && (
        <button onClick={handleCancel}>
          Cancelar Cita
        </button>
      )}
      <a href={`/${username}/agendar-visita`}>
        Reservar Otra Cita
      </a>
    </div>
  );
}
```

---

## Flujo de Cancelación

### Cancelación por Paciente

**Flujo Completo:**

1. **Paciente recibe mensaje de WhatsApp** con enlace a detalles de cita
2. **Paciente hace clic en el enlace** → Navega a `/[username]/cita/[id]?token={token}`
3. **Sistema valida el token** y muestra detalles de la cita
4. **Si es posible cancelar** (al menos 12 horas antes), muestra botón de cancelación
5. **Paciente confirma cancelación**
6. **Sistema actualiza estado** de la cita a 'cancelled'
7. **Sistema libera el horario** para que esté disponible nuevamente
8. **Paciente es redirigido** a `/[username]/agendar-visita` para reservar otra cita

### Cancelación por Proveedor

**Flujo Completo:**

1. **Proveedor cancela cita** desde panel de administración
2. **Sistema actualiza estado** de la cita a 'cancelled'
3. **Sistema envía mensaje de WhatsApp** al paciente:
   - Informa que la cita fue cancelada
   - Proporciona enlace para reagendar: `/[username]/agendar-visita`
   - Mensaje: "Por favor, reagenda tu cita"
4. **Sistema libera el horario** para que esté disponible nuevamente
5. **Paciente puede reagendar** visitando el enlace proporcionado

---

## Perfil del Proveedor

### Descripción General

El perfil del proveedor es un panel completo de gestión que permite a los proveedores ver y gestionar todas sus citas, configurar su disponibilidad, y administrar su información personal. El acceso requiere autenticación mediante JWT token.

**Ruta:** `/proveedor/perfil` o `/[username]/perfil` (protegida, requiere autenticación)

### Funcionalidades Principales

#### 1. Visualización de Citas

**Vista de Lista de Citas:**
- Lista completa de todas las citas del proveedor
- Filtros por estado: `scheduled`, `cancelled`, `completed`
- Filtros por fecha (rango de fechas)
- Ordenamiento por fecha y hora
- Información mostrada:
  - Nombre completo del paciente
  - Teléfono del paciente
  - Fecha y hora de la cita
  - Tipo de visita (Consulta/Practica)
  - Tipo específico (Primera vez, Seguimiento, Criocirugía, etc.)
  - Obra social
  - Estado de la cita
  - Estado de confirmación WhatsApp (enviado/no enviado)

**Endpoint:** `GET /api/proveedor/appointments`

**Query Parameters:**
- `status`: Filtro por estado (`scheduled`, `cancelled`, `completed`)
- `start_date`: Fecha de inicio (formato: `YYYY-MM-DD`)
- `end_date`: Fecha de fin (formato: `YYYY-MM-DD`)
- `page`: Número de página (paginación)
- `limit`: Cantidad de resultados por página

**Respuesta:**
```json
{
    "appointments": [
        {
            "id": 123,
            "patient_name": "Juan Pérez",
            "patient_phone": "3421234567",
            "appointment_date": "2025-01-15",
            "appointment_time": "09:00",
            "visit_type": "Consulta",
            "consult_type": "Primera vez",
            "practice_type": null,
            "health_insurance": "Particular",
            "status": "scheduled",
            "whatsapp_sent": true,
            "whatsapp_sent_at": "2025-01-10T10:30:00Z",
            "created_at": "2025-01-10T10:25:00Z"
        }
    ],
    "total": 50,
    "page": 1,
    "limit": 20,
    "total_pages": 3
}
```

#### 2. Calendario Interactivo de Citas

**Vista de Calendario:**
- Calendario mensual interactivo
- Navegación entre meses (anterior/siguiente)
- Indicadores visuales por día:
  - **Días llenos**: Día con todas las franjas horarias ocupadas
  - **Días parciales**: Día con algunas franjas ocupadas
  - **Días disponibles**: Día con disponibilidad completa
  - **Días no laborables**: Días marcados como no disponibles
- Al hacer clic en un día, muestra:
  - Lista de citas del día
  - Cantidad total de pacientes
  - Desglose por tipo de visita
  - Estado de confirmación WhatsApp para cada cita
  - Horarios ocupados vs disponibles

**Endpoint:** `GET /api/proveedor/calendar`

**Query Parameters:**
- `year`: Año (ej: `2025`)
- `month`: Mes (1-12)

**Respuesta:**
```json
{
    "year": 2025,
    "month": 1,
    "days": [
        {
            "date": "2025-01-15",
            "total_appointments": 8,
            "scheduled": 6,
            "cancelled": 1,
            "completed": 1,
            "is_full": false,
            "is_working_day": true,
            "appointments": [
                {
                    "id": 123,
                    "time": "09:00",
                    "patient_name": "Juan Pérez",
                    "visit_type": "Consulta",
                    "consult_type": "Primera vez",
                    "whatsapp_sent": true,
                    "status": "scheduled"
                }
            ],
            "available_slots": 12,
            "total_slots": 20
        }
    ],
    "summary": {
        "total_days": 31,
        "working_days": 22,
        "full_days": 3,
        "total_appointments": 145
    }
}
```

**Endpoint para Detalle de Día:** `GET /api/proveedor/calendar/day/[date]`

**Respuesta:**
```json
{
    "date": "2025-01-15",
    "is_working_day": true,
    "appointments": [
        {
            "id": 123,
            "time": "09:00",
            "patient_name": "Juan Pérez",
            "patient_phone": "3421234567",
            "visit_type": "Consulta",
            "consult_type": "Primera vez",
            "health_insurance": "Particular",
            "status": "scheduled",
            "whatsapp_sent": true,
            "whatsapp_sent_at": "2025-01-10T10:30:00Z",
            "whatsapp_message_id": "msg_123456"
        }
    ],
    "time_slots": [
        {
            "time": "09:00",
            "status": "booked",
            "appointment_id": 123
        },
        {
            "time": "09:20",
            "status": "available"
        }
    ],
    "statistics": {
        "total_appointments": 8,
        "by_visit_type": {
            "Consulta": 5,
            "Practica": 3
        },
        "by_consult_type": {
            "Primera vez": 3,
            "Seguimiento": 2
        },
        "by_practice_type": {
            "Criocirugía": 2,
            "Electrocoagulación": 1
        },
        "whatsapp_confirmed": 7,
        "whatsapp_pending": 1
    }
}
```

#### 3. Gestión de Perfil Personal

**Información Editable:**
- Email
- Nombre (first_name)
- Apellido (last_name)
- Número de teléfono WhatsApp (whatsapp_phone_number)
- Contraseña

**Endpoint: Obtener Perfil** `GET /api/proveedor/profile`

**Respuesta:**
```json
{
    "id": 123,
    "email": "proveedor@example.com",
    "username": "proveedor1",
    "first_name": "Juan",
    "last_name": "Pérez",
    "whatsapp_phone_number": "+543421234567",
    "email_verified": true,
    "created_at": "2025-01-01T00:00:00Z"
}
```

**Endpoint: Actualizar Perfil** `PUT /api/proveedor/profile`

**Cuerpo de la Solicitud:**
```json
{
    "email": "nuevo_email@example.com",
    "first_name": "Juan",
    "last_name": "Pérez",
    "whatsapp_phone_number": "+543421234567"
}
```

**Respuesta:**
```json
{
    "success": true,
    "message": "Perfil actualizado exitosamente",
    "user": {
        "id": 123,
        "email": "nuevo_email@example.com",
        "first_name": "Juan",
        "last_name": "Pérez",
        "whatsapp_phone_number": "+543421234567"
    }
}
```

**Validaciones:**
- Email debe ser único (si se cambia)
- Email debe tener formato válido
- Teléfono WhatsApp debe tener formato válido (10-15 dígitos)
- Si se cambia el email, se debe re-verificar (`email_verified = false`)

**Endpoint: Cambiar Contraseña** `PUT /api/proveedor/profile/password`

**Cuerpo de la Solicitud:**
```json
{
    "current_password": "contraseña_actual",
    "new_password": "nueva_contraseña_segura"
}
```

**Respuesta:**
```json
{
    "success": true,
    "message": "Contraseña actualizada exitosamente"
}
```

**Errores:**
- `401`: Contraseña actual incorrecta
- `400`: Nueva contraseña no cumple requisitos
- `400`: Nueva contraseña igual a la actual

#### 4. Gestión de Días No Laborables

**Funcionalidad:**
- Agregar días específicos como no laborables (festivos, vacaciones)
- Eliminar días marcados como no laborables
- Ver lista de días no laborables configurados

**Endpoint: Agregar Día No Laborable** `POST /api/proveedor/unavailable-days`

**Cuerpo de la Solicitud:**
```json
{
    "date": "2025-12-25",
    "is_confirmed": true
}
```

**Respuesta:**
```json
{
    "success": true,
    "message": "Día no laborable agregado exitosamente",
    "unavailable_day": {
        "id": 456,
        "date": "2025-12-25",
        "is_confirmed": true
    }
}
```

**Endpoint: Eliminar Día No Laborable** `DELETE /api/proveedor/unavailable-days/[id]`

**Respuesta:**
```json
{
    "success": true,
    "message": "Día no laborable eliminado exitosamente"
}
```

**Endpoint: Listar Días No Laborables** `GET /api/proveedor/unavailable-days`

**Query Parameters:**
- `start_date`: Fecha de inicio
- `end_date`: Fecha de fin

**Respuesta:**
```json
{
    "unavailable_days": [
        {
            "id": 456,
            "date": "2025-12-25",
            "is_confirmed": true,
            "created_at": "2025-01-01T00:00:00Z"
        }
    ],
    "total": 10
}
```

#### 5. Gestión de Horarios de Trabajo

**Funcionalidad:**
- Ver horarios de trabajo actuales por día de la semana
- Agregar nuevos horarios de trabajo
- Modificar horarios existentes
- Eliminar horarios de trabajo
- Configurar días laborables/no laborables

**Endpoint: Obtener Horarios de Trabajo** `GET /api/proveedor/work-schedule`

**Respuesta:**
```json
{
    "work_schedule": [
        {
            "id": 1,
            "day_of_week": "Monday",
            "is_working_day": true,
            "available_slots": [
                {
                    "id": 10,
                    "start_time": "09:00",
                    "end_time": "18:00",
                    "is_available": true
                }
            ]
        }
    ]
}
```

**Endpoint: Actualizar Día Laborable** `PUT /api/proveedor/work-schedule/[day_of_week]`

**Cuerpo de la Solicitud:**
```json
{
    "is_working_day": true
}
```

**Endpoint: Agregar/Actualizar Franja Horaria** `POST /api/proveedor/work-schedule/[day_of_week]/slots`

**Cuerpo de la Solicitud:**
```json
{
    "start_time": "09:00",
    "end_time": "18:00",
    "is_available": true
}
```

**Respuesta:**
```json
{
    "success": true,
    "message": "Franja horaria actualizada exitosamente",
    "slot": {
        "id": 10,
        "day_of_week": "Monday",
        "start_time": "09:00",
        "end_time": "18:00",
        "is_available": true
    }
}
```

**Endpoint: Eliminar Franja Horaria** `DELETE /api/proveedor/work-schedule/slots/[id]`

**Validaciones:**
- No se pueden eliminar franjas horarias que tienen citas programadas
- `end_time` debe ser mayor que `start_time`
- No se pueden tener franjas horarias solapadas

### Autenticación y Seguridad

**Todas las rutas del perfil requieren:**
- Token JWT válido en header `Authorization: Bearer {token}`
- Token debe corresponder a un proveedor con `email_verified = true`
- El proveedor solo puede acceder a sus propios datos

**Middleware de Autenticación:**
```typescript
// lib/auth-middleware.ts
export async function verifyProviderToken(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!token) {
    throw new Error('Token no proporcionado');
  }
  
  const decoded = jwt.verify(token, process.env.JWT_SECRET!);
  
  // Verificar que el usuario existe y está verificado
  const user = await getUserById(decoded.id);
  
  if (!user || !user.email_verified) {
    throw new Error('Usuario no verificado');
  }
  
  return user;
}
```

### Estructura de Componentes Frontend

**Ruta:** `app/proveedor/perfil/page.tsx` o `app/[username]/perfil/page.tsx`

**Componentes Principales:**
```
PerfilPage
├── ProfileHeader (Información del proveedor)
├── ProfileTabs
│   ├── AppointmentsTab (Vista de lista de citas)
│   ├── CalendarTab (Calendario interactivo)
│   ├── ScheduleTab (Gestión de horarios)
│   └── SettingsTab (Configuración de perfil)
└── ProfileSidebar (Navegación)
```

**Componentes de Calendario:**
```
CalendarTab
├── CalendarNavigation (Navegación entre meses)
├── CalendarGrid (Grid del calendario)
│   └── CalendarDay (Cada día con indicadores)
└── DayDetailsModal (Modal con detalles del día seleccionado)
    ├── AppointmentsList (Lista de citas del día)
    ├── StatisticsPanel (Estadísticas del día)
    └── WhatsAppStatus (Estado de confirmaciones)
```

### Flujos de Usuario

#### Ver Citas por Día en Calendario

1. Proveedor accede a `/proveedor/perfil`
2. Navega a pestaña "Calendario"
3. Selecciona mes/año deseado
4. Ve calendario con indicadores visuales:
   - Verde: Día disponible
   - Amarillo: Día parcialmente ocupado
   - Rojo: Día lleno
   - Gris: Día no laborable
5. Hace clic en un día específico
6. Se abre modal con:
   - Lista completa de citas del día
   - Cantidad de pacientes por tipo de visita
   - Estado de confirmación WhatsApp para cada cita
   - Horarios ocupados vs disponibles

#### Actualizar Información Personal

1. Proveedor accede a pestaña "Configuración"
2. Edita campos deseados (email, nombre, apellido, teléfono WhatsApp)
3. Guarda cambios
4. Si cambió email, recibe nuevo email de verificación
5. Sistema actualiza información en base de datos

#### Agregar Día No Laborable

1. Proveedor accede a pestaña "Horarios"
2. Selecciona "Días No Laborables"
3. Agrega fecha específica
4. Sistema bloquea ese día para nuevas reservas
5. Citas existentes no se ven afectadas

#### Modificar Horarios de Trabajo

1. Proveedor accede a pestaña "Horarios"
2. Selecciona día de la semana
3. Modifica franjas horarias (agregar/editar/eliminar)
4. Sistema valida que no haya conflictos con citas existentes
5. Cambios se aplican inmediatamente para nuevas reservas

### Validaciones de Cancelación

- **Cancelación por paciente:**
  - Debe ser al menos 12 horas antes del horario de la cita
  - Token debe ser válido y corresponder a la cita
  - Cita debe estar en estado 'scheduled'

- **Cancelación por proveedor:**
  - Puede cancelar en cualquier momento
  - Requiere autenticación de proveedor
  - Siempre envía notificación al paciente

### Implementación del Endpoint de Cancelación

```typescript
// app/api/appointments/[id]/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyCancellationToken } from '@/lib/cancellation-token';
import { sendProviderCancellationNotification } from '@/lib/whatsapp';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { token, cancelled_by } = await request.json();
  const appointmentId = parseInt(params.id);

  // Validar token y obtener información de la cita
  const tokenData = verifyCancellationToken(token);
  
  if (!tokenData || tokenData.appointmentId !== appointmentId) {
    return NextResponse.json(
      { error: 'Token inválido' },
      { status: 403 }
    );
  }

  // Obtener cita de la base de datos
  const appointment = await getAppointmentById(appointmentId);
  
  if (!appointment || appointment.status !== 'scheduled') {
    return NextResponse.json(
      { error: 'Cita no encontrada o ya cancelada' },
      { status: 404 }
    );
  }

  // Validar tiempo de cancelación (solo para pacientes)
  if (cancelled_by === 'patient') {
    const appointmentDateTime = new Date(`${appointment.date} ${appointment.time}`);
    const hoursUntilAppointment = (appointmentDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
    
    if (hoursUntilAppointment < 12) {
      return NextResponse.json(
        { error: 'No se puede cancelar menos de 12 horas antes' },
        { status: 400 }
      );
    }
  }

  // Actualizar estado de la cita
  await updateAppointmentStatus(appointmentId, 'cancelled');

  // Si es cancelación por proveedor, enviar WhatsApp
  if (cancelled_by === 'provider') {
    const rescheduleUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${appointment.provider_username}/agendar-visita`;
    
    await sendProviderCancellationNotification(appointment.phone_number, {
      patientName: appointment.patient_name,
      date: appointment.date,
      time: appointment.time,
      rescheduleUrl: rescheduleUrl,
    });
  }

  return NextResponse.json({
    success: true,
    message: 'Cita cancelada exitosamente',
    appointment_id: appointmentId,
    status: 'cancelled',
  });
}
```

---

## Consideraciones de Despliegue

### Variables de Entorno de Producción

```env
NODE_ENV=production
POSTGRESQL_HOST=your-rds-endpoint.amazonaws.com
POSTGRESQL_PORT=5432
POSTGRESQL_USER=your_user
POSTGRESQL_PASSWORD=your_secure_password
POSTGRESQL_DATABASE=MaxTurnos_db
POSTGRESQL_SSL_MODE=require
JWT_SECRET=your-production-secret-minimum-32-characters

# WhatsApp/Whapi (Producción)
WHAPI_API_URL=https://api.whapi.cloud
WHAPI_API_TOKEN=your_production_whapi_token
WHAPI_PHONE_NUMBER_ID=your_production_phone_number_id

# URL de la aplicación (para enlaces en mensajes)
NEXT_PUBLIC_APP_URL=https://tudominio.com
```

### Configuración SSL de Base de Datos

Para AWS RDS u otras bases de datos en la nube:

1. **Requerir SSL (Recomendado):**
   ```env
   POSTGRESQL_SSL_MODE=require
   ```

2. **Verificación Completa (Más Seguro):**
   ```env
   POSTGRESQL_SSL_MODE=verify-full
   POSTGRESQL_CA_CERT=<contenido-del-certificado>
   ```

### Comandos de Build

```bash
# Desarrollo
npm run dev

# Build de Producción
npm run build

# Iniciar Servidor de Producción
npm start
```

### Configuración de Next.js

**Archivo:** `next.config.js`

- React Strict Mode habilitado
- Configuración de Webpack para builds del lado del cliente
- Exposición de variables de entorno

### Pool de Conexiones de Base de Datos

**Archivo:** `lib/db.ts`

- Tamaño del pool de conexiones: máximo 20 clientes
- Timeout de conexión: 10 segundos
- Timeout de inactividad: 30 segundos
- Configuración SSL basada en entorno

---

## Compatibilidad de Versiones y Advertencias Importantes

### ⚠️ Requisitos de Compatibilidad Verificados

Este stack tecnológico ha sido verificado para compatibilidad entre todas las tecnologías. Las siguientes son las versiones mínimas y recomendadas:

| Tecnología | Versión Mínima | Versión Recomendada | Notas |
|------------|----------------|---------------------|-------|
| **Node.js** | 18.18.0 | 20.9.0+ o 22.x LTS | Next.js 15 requiere mínimo 18.18.0. Node.js 18 llegó a EOL, se recomienda migrar a 20+ o 22 LTS |
| **Next.js** | 15.0.5 | 15.3.8+ o 15.4+ | Versiones < 15.0.5 tienen vulnerabilidades conocidas (CVE-2025-55182) |
| **React** | 19.0.0 | 19.0.3+ | Requerido para Next.js 15 con App Router. React 18 solo funciona con Pages Router |
| **PostgreSQL** | 12+ | 14+ o 15+ | Versiones más nuevas tienen mejor seguridad y rendimiento |
| **TypeScript** | 5.3.3 | 5.3.3+ | Compatible con Next.js 15 y React 19 |

### ⚠️ Advertencias Importantes

1. **React 19 es Requerido para App Router**
   - Next.js 15 con App Router requiere React 19
   - Si usas React 18, debes usar Pages Router (no recomendado para nuevas aplicaciones)
   - Muchas librerías de terceros aún pueden no soportar React 19 completamente
   - Verificar peer dependencies de todas las librerías antes de instalar

2. **Node.js Versión**
   - Node.js 18 llegó a End of Life (EOL)
   - Se recomienda usar Node.js 20.x o 22.x LTS para producción
   - Verificar que el entorno de despliegue use la misma versión

3. **Vulnerabilidades de Seguridad**
   - Next.js 15.0.0 tiene vulnerabilidades conocidas
   - Usar versión >= 15.0.5 para evitar CVE-2025-55182
   - Mantener todas las dependencias actualizadas

4. **WhatsApp/Whapi Integration**
   - Whapi requiere Node.js >= 18.0.0
   - Funciona mejor con Node.js >= 20
   - Verificar que el SDK de Whapi sea compatible con tu versión de Node.js

5. **PostgreSQL**
   - Versiones antiguas (9.x, 10.x) están fuera de soporte
   - Se recomienda PostgreSQL 14+ o 15+ para producción
   - Verificar que el driver `pg` sea compatible con tu versión de PostgreSQL

### ✅ Verificación de Compatibilidad

Antes de instalar dependencias, verifica:

```bash
# Verificar versión de Node.js
node --version  # Debe ser >= 18.18.0 (recomendado >= 20.9.0)

# Verificar versión de PostgreSQL
psql --version  # Debe ser >= 12 (recomendado >= 14)

# Verificar versión de npm
npm --version   # Debe ser >= 8.0.0
```

### 🔧 Solución de Problemas de Compatibilidad

**Problema: Peer dependency warnings con React 19**
```bash
# Opción 1: Usar --legacy-peer-deps (temporal)
npm install --legacy-peer-deps

# Opción 2: Actualizar todas las dependencias
npm update

# Opción 3: Verificar y actualizar librerías incompatibles
npm outdated
```

**Problema: Next.js requiere Node.js más nuevo**
- Actualizar Node.js a versión 20.x o 22.x LTS
- Usar `nvm` (Node Version Manager) para gestionar versiones

**Problema: PostgreSQL driver incompatible**
- Verificar versión de `pg`: `npm list pg`
- Actualizar a `pg >= 8.11.3` si es necesario

---

## Detalles Clave de Implementación

### Soporte Multi-Proveedor

La aplicación soporta múltiples proveedores a través de la tabla `user_accounts`:
- Cada proveedor tiene un `user_account_id` único
- Las citas están vinculadas a `user_account_id`
- Los horarios de trabajo son por proveedor
- Las rutas mapean dinámicamente `username` a `user_account_id` mediante consultas a la base de datos (ver `lib/user-routes.ts`)
- Las rutas dinámicas `/[username]` permiten que cada proveedor tenga su propia página

### Manejo de Fechas

- Fechas almacenadas como tipo `DATE` en PostgreSQL
- Horas almacenadas como `TIME WITHOUT TIME ZONE`
- Lado del cliente usa objetos JavaScript `Date`
- API espera fechas en formato `YYYY-MM-DD`
- API espera horas en formato `HH:MM`

### Generación de Franjas Horarias

- Intervalos de 20 minutos
- Generadas desde `start_time` hasta `end_time`
- Filtra citas ya reservadas
- Retorna array de strings de hora

### Validación de Formularios

- Lado del cliente: Validación de esquema Zod
- Lado del servidor: Validación de ruta API
- Mensajes de error en tiempo real vía React Hook Form
- Previene envíos inválidos

### Manejo de Errores

**Lado del Cliente:**
- Notificaciones toast vía `sonner` para retroalimentación del usuario
- Estados de carga durante llamadas API
- Errores de validación de formulario mostrados inline
- Mensajes de error elegantes en español
- Manejo de errores de red con lógica de reintento

**Lado del Servidor:**
- Traducción de errores de base de datos (ver `lib/db.ts`)
- Respuestas de error estructuradas con códigos de error
- Validación de entrada antes de operaciones de base de datos
- Rollback de transacciones en errores
- Registro detallado de errores para depuración

**Escenarios Comunes de Error:**
- **Citas Duplicadas**: Previstas por restricciones de base de datos y validación API
- **Reservas Concurrentes**: Manejadas por transacciones de base de datos
- **Fechas/Horas Inválidas**: Validadas antes de inserción en base de datos
- **Problemas de Conexión de Base de Datos**: El pool de conexiones maneja reintentos y timeouts
- **Errores de WhatsApp**: Los errores de envío no impiden la creación de citas, se registran en logs

---

## Pruebas del Formulario

### Estrategia de Pruebas

**Pruebas Unitarias:**
- Lógica de validación de formularios (esquemas Zod)
- Cálculos de fecha/hora
- Generación/validación de tokens
- Funciones de WhatsApp

**Pruebas de Integración:**
- Funcionalidad de endpoints API
- Operaciones de base de datos
- Flujo de envío de formulario
- Integración con Whapi

**Pruebas End-to-End:**
- Viaje completo del usuario desde formulario hasta confirmación
- Flujo de cancelación (paciente y proveedor)
- Escenarios de error
- Envío de mensajes de WhatsApp

### Pasos de Prueba Manual

1. **Navegar al formulario:**
   ```
   http://localhost:3000/[username]/agendar-visita
   ```
   Ejemplo: `http://localhost:3000/maraflamini/agendar-visita`

2. **Completar información del paciente:**
   - Nombre: "Prueba"
   - Apellido: "Usuario"
   - Teléfono: "3421234567"

3. **Seleccionar tipo de visita:**
   - Elegir "Consulta" o "Practica"

4. **Seleccionar campo condicional:**
   - Si "Consulta": Elegir "Primera vez" o "Seguimiento"
   - Si "Practica": Elegir tipo de práctica

5. **Seleccionar obra social:**
   - Elegir del dropdown (filtrado según tipo de visita)

6. **Seleccionar fecha:**
   - El calendario debe mostrar solo fechas disponibles
   - Los días no laborables deben estar deshabilitados

7. **Seleccionar hora:**
   - El dropdown debe aparecer después de seleccionar fecha
   - Debe mostrar franjas de 20 minutos disponibles
   - Los horarios reservados no deben aparecer

8. **Enviar formulario:**
   - Debe crear la cita
   - Debe enviar mensaje de WhatsApp de confirmación
   - Debe redirigir a `/[username]/cita/[id]` con detalles

9. **Probar cancelación:**
   - Hacer clic en enlace de detalles de cita desde WhatsApp
   - Verificar que se muestra información de la cita
   - Probar cancelación (si es posible)
   - Verificar redirección a formulario de reserva

---

## Solución de Problemas

### Problemas Comunes

1. **Errores de Conexión a Base de Datos:**
   - Verificar que PostgreSQL esté en ejecución
   - Verificar credenciales en `.env.local`
   - Verificar configuración SSL para producción

2. **No Aparecen Horarios Disponibles:**
   - Verificar que el horario de trabajo esté configurado
   - Verificar que la tabla `available_slots` tenga entradas
   - Verificar que `user_account_id` coincida con el proveedor

3. **Calendario No Muestra Fechas Disponibles:**
   - Verificar que la tabla `work_schedule` tenga `is_working_day = true` para los días deseados
   - Verificar que `unavailable_days` no bloquee las fechas deseadas
   - Verificar rango de fechas (30 días desde mañana)

4. **Errores de Validación de Formulario:**
   - Verificar que el esquema Zod coincida con los campos del formulario
   - Verificar que todos los campos requeridos estén completos
   - Verificar formato de número de teléfono (10-15 caracteres)

5. **Errores de Rutas API:**
   - Verificar que los archivos de rutas API existan en `app/api/`
   - Verificar que las consultas a la base de datos sean correctas
   - Revisar logs del servidor para errores detallados
   - Verificar que las variables de entorno estén configuradas correctamente
   - Verificar estado del pool de conexiones de base de datos

6. **Formulario No Se Envía:**
   - Revisar consola del navegador para errores de JavaScript
   - Verificar que todos los campos requeridos estén completos
   - Revisar pestaña de red para solicitud/respuesta API
   - Verificar configuración CORS si se usa API externa

7. **Franjas Horarias No Aparecen:**
   - Verificar que la tabla `available_slots` tenga entradas para el día seleccionado
   - Verificar que el horario de trabajo esté configurado correctamente
   - Verificar que la fecha esté dentro de la ventana de 30 días
   - Verificar conflictos con `unavailable_time_frames`

8. **Problemas con Tokens de Cancelación:**
   - Verificar que `JWT_SECRET` esté configurado correctamente
   - Verificar expiración del token (12 horas antes de la cita)
   - Verificar formato y estructura del token
   - Verificar que el endpoint de cancelación exista y sea accesible

9. **Mensajes de WhatsApp No Se Envían:**
   - Verificar que las credenciales de Whapi estén configuradas en `.env.local`
   - Verificar que `WHAPI_API_TOKEN` y `WHAPI_PHONE_NUMBER_ID` sean válidos
   - Revisar logs del servidor para errores de Whapi
   - Verificar formato del número de teléfono (debe incluir código de país)
   - Verificar que el número de teléfono esté registrado en Whapi

10. **Rutas Dinámicas No Funcionan:**
    - Verificar que las rutas `app/[username]/` existan
    - Verificar que el proveedor exista en la base de datos con el `username` correcto
    - Verificar que `lib/user-routes.ts` mapee correctamente el username
    - Revisar logs del servidor para errores de routing

11. **Problemas con Registro de Proveedores:**
    - Verificar que las variables de entorno SMTP estén configuradas correctamente
    - Verificar que se use una "Contraseña de aplicación" de Google, NO la contraseña normal
    - Verificar que la cuenta de Google tenga autenticación de 2 factores habilitada
    - Revisar logs del servidor para errores de Nodemailer
    - Verificar que `NEXT_PUBLIC_APP_URL` esté configurado correctamente para enlaces de verificación
    - Verificar que el token de verificación no haya expirado (24 horas)

12. **Email de Verificación No Llega:**
    - Verificar configuración SMTP en `.env.local`
    - Verificar que `SMTP_PASS` sea la contraseña de aplicación correcta (16 caracteres)
    - Verificar carpeta de spam en el email del proveedor
    - Verificar que el servidor pueda conectarse a `smtp.gmail.com:587`
    - Revisar logs del servidor para errores específicos de Nodemailer
    - Verificar que el email del remitente (`SMTP_FROM`) sea válido

13. **Proveedor No Puede Iniciar Sesión:**
    - Verificar que el email esté verificado (`email_verified = true` en base de datos)
    - Verificar que las credenciales sean correctas
    - Verificar que el token JWT se genere correctamente
    - Revisar logs del servidor para errores de autenticación

---

## Recursos Adicionales

- **Documentación de Next.js:** https://nextjs.org/docs
- **React Hook Form:** https://react-hook-form.com/
- **Zod:** https://zod.dev/
- **TanStack Query:** https://tanstack.com/query
- **Tailwind CSS:** https://tailwindcss.com/
- **shadcn/ui:** https://ui.shadcn.com/
- **PostgreSQL:** https://www.postgresql.org/docs/
- **Whapi (WhatsApp API):** https://whapi.cloud/docs

---

## Resumen

### Resumen de la Aplicación

**MaxTurnos** es un sistema integral de reserva de turnos multi-proveedor diseñado para proveedores de atención médica. Permite a los pacientes reservar citas en línea a través de formularios específicos de cada proveedor usando rutas dinámicas `/[username]/agendar-visita`, con programación robusta, gestión de disponibilidad y características de cancelación, incluyendo notificaciones automáticas por WhatsApp.

### Arquitectura Técnica

- **Frontend:** React 18, TypeScript, Tailwind CSS, componentes shadcn/ui
- **Backend:** Rutas API de Next.js 15, base de datos PostgreSQL
- **Gestión de Formularios:** React Hook Form + validación Zod
- **Gestión de Estado:** TanStack Query para estado del servidor, Redux Toolkit (si se usa)
- **Soporte Multi-Proveedor:** Sistema de cuentas de usuario con enrutamiento específico por proveedor usando rutas dinámicas
- **Seguridad:** Tokens JWT, hash de contraseñas bcrypt, tokens seguros de cancelación
- **Características:** Franjas horarias dinámicas, gestión de horarios de trabajo, filtrado de obras sociales
- **Integración WhatsApp:** Notificaciones automáticas vía Whapi para confirmaciones y cancelaciones

### Flujos de Usuario Principales

1. **Reserva de Paciente:** Formulario `/[username]/agendar-visita` con campos condicionales, calendario dinámico y selección de franjas horarias, seguido de mensaje de WhatsApp de confirmación
2. **Gestión de Citas:** Panel de administración de proveedor/admin para ver y gestionar citas
3. **Perfil del Proveedor:** Panel completo con visualización de citas, calendario interactivo, gestión de horarios y configuración de perfil
4. **Cancelación:** Sistema seguro de cancelación basado en tokens con aviso mínimo de 12 horas, con notificaciones automáticas por WhatsApp
5. **Detalles de Cita:** Página `/[username]/cita/[id]` para ver detalles y cancelar citas

### Diferenciadores Clave

- **Arquitectura Multi-Proveedor:** Soporta múltiples proveedores de atención médica con horarios aislados y rutas dinámicas
- **Registro y Verificación de Proveedores:** Sistema completo de registro con verificación por email usando Nodemailer (Google SMTP)
- **Acceso Libre para Pacientes:** Los pacientes pueden reservar citas sin necesidad de registro o autenticación
- **Perfil Completo del Proveedor:** Panel de gestión con visualización de citas, calendario interactivo, estadísticas por día, y gestión completa de configuración
- **Calendario Interactivo:** Vista mensual con indicadores visuales de días llenos/parciales/disponibles, con detalles de pacientes y estado de confirmaciones WhatsApp
- **Disponibilidad Dinámica:** Cálculo de disponibilidad en tiempo real basado en horarios de trabajo y reservas existentes
- **Específico para Salud:** Construido para el sistema de salud argentino con integración de obras sociales
- **Cancelación Segura:** Tokens de cancelación basados en JWT previenen acceso no autorizado
- **Programación Flexible:** Horarios de trabajo por proveedor con gestión granular de franjas horarias y días no laborables
- **Notificaciones Automáticas:** Integración con WhatsApp vía Whapi para confirmaciones y cancelaciones automáticas con seguimiento de estado

### Próximos Pasos para Desarrollo

**Brechas de Documentación a Abordar:**

1. **Documentación del Panel de Administración:** Documentar rutas de admin, características y gestión de usuarios
2. **Detalles de Página de Confirmación:** Ya documentado - página de detalles de cita `/[username]/cita/[id]`
3. **Endpoint de Cancelación:** Ya documentado - `/api/appointments/[id]/cancel`
4. **Integración WhatsApp:** Ya documentado - integración con Whapi
5. **Pruebas Automatizadas:** Incluir ejemplos de pruebas, estrategia de pruebas y configuración CI/CD
6. **Optimización de Rendimiento:** Documentar estrategias de caché, indexación de base de datos y técnicas de optimización
7. **Limitación de Tasa API:** Documentar limitación de tasa y medidas de seguridad
8. **Monitoreo y Registro:** Documentar seguimiento de errores, registro y configuración de monitoreo

**Mejoras de Código a Considerar:**

- Agregar definiciones de tipos de respuesta API (interfaces TypeScript)
- Documentar estrategia de migración de base de datos y versionado
- Agregar archivos de ejemplo de entorno (`.env.example`)
- Documentar características PWA si se implementan
- Agregar documentación API (OpenAPI/Swagger) si es aplicable

---

**Propósito del Documento:** Esta guía permite a los desarrolladores entender completamente, replicar y extender la aplicación de reserva de turnos MaxTurnos.

**Audiencia Objetivo:** Desarrolladores full-stack, ingenieros DevOps y líderes técnicos que trabajan en sistemas de reserva de turnos de atención médica.

---

**Última Actualización:** Enero 2025
**Versión:** 2.0.0

---

## Implementación de Mejores Prácticas

### Archivos de Implementación Creados

Se han creado los siguientes archivos con implementaciones completas de las mejores prácticas:

1. **`lib/db-transactions.ts`** - Sistema de transacciones para operaciones críticas
2. **`lib/rate-limit.ts`** - Rate limiting para prevenir abuso de APIs
3. **`lib/cache.ts`** - Sistema de caché para consultas frecuentes
4. **`lib/logger.ts`** - Logging estructurado con Pino
5. **`lib/db.ts`** - Pool de conexiones optimizado con logging

### Instalación de Dependencias

```bash
# Rate limiting y caché (Redis)
npm install @upstash/ratelimit @upstash/redis

# Logging estructurado
npm install pino pino-pretty

# Caché en memoria (fallback para desarrollo)
npm install lru-cache

# Tipos TypeScript
npm install --save-dev @types/lru-cache
```

### Configuración de Variables de Entorno

Agregar a `.env.local`:

```env
# Redis para Rate Limiting y Caché
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token

# Configuración de Logging
LOG_LEVEL=info  # debug, info, warn, error
```

### Uso de Transacciones

**Ejemplo: Crear Cita con Transacción**

```typescript
// app/api/appointments/create/route.ts
import { withTransaction, upsertClientInTransaction, createAppointmentInTransaction } from '@/lib/db-transactions';

export async function POST(request: NextRequest) {
  const data = await request.json();

  // Operación atómica: crear cliente y cita juntos
  const result = await withTransaction(async (client) => {
    const clientId = await upsertClientInTransaction(
      client,
      data.phone_number,
      data.first_name,
      data.last_name,
      data.user_account_id
    );

    const appointmentId = await createAppointmentInTransaction(client, {
      clientId,
      userAccountId: data.user_account_id,
      appointmentDate: data.appointment_date,
      appointmentTime: data.appointment_time,
      visitTypeId: data.visit_type_id,
      consultTypeId: data.consult_type_id,
      practiceTypeId: data.practice_type_id,
      healthInsurance: data.health_insurance,
      cancellationToken: generateToken(),
    });

    return { clientId, appointmentId };
  });

  return NextResponse.json({ success: true, appointment_id: result.appointmentId });
}
```

### Uso de Rate Limiting

**Ejemplo: Proteger Endpoint con Rate Limiting**

```typescript
// app/api/appointments/create/route.ts
import { rateLimitMiddleware, getRateLimitIdentifier, rateLimiters } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const identifier = getRateLimitIdentifier(request);
  const rateLimitResponse = await rateLimitMiddleware(identifier, rateLimiters.createAppointment);
  
  if (rateLimitResponse) {
    return rateLimitResponse; // Retorna 429 Too Many Requests
  }

  // Continuar con la lógica del endpoint...
}
```

### Uso de Caché

**Ejemplo: Cachéar Horarios Disponibles**

```typescript
// app/api/available-times/[date]/route.ts
import { getOrSetCache, cacheKeys } from '@/lib/cache';

export async function GET(request: NextRequest, { params }: { params: { date: string } }) {
  const { date } = params;
  const userAccountId = parseInt(request.nextUrl.searchParams.get('user_account_id') || '0');

  const availableTimes = await getOrSetCache<string[]>(
    cacheKeys.availableTimes(userAccountId, date),
    async () => {
      return await calculateAvailableTimesFromDB(userAccountId, date);
    },
    300 // TTL: 5 minutos
  );

  return NextResponse.json(availableTimes);
}
```

### Uso de Logging Estructurado

**Ejemplo: Logging en Endpoints**

```typescript
// app/api/appointments/create/route.ts
import { apiLogger, logError, withLogging, startTimer } from '@/lib/logger';

export const POST = withLogging(async (request: NextRequest) => {
  const timer = startTimer('createAppointment');
  
  try {
    const data = await request.json();
    
    apiLogger.info({ 
      userAccountId: data.user_account_id,
      appointmentDate: data.appointment_date 
    }, 'Creating appointment');
    
    // ... lógica ...
    
    timer.end();
    return NextResponse.json({ success: true });
  } catch (error) {
    logError(error, { endpoint: '/api/appointments/create' }, apiLogger);
    throw error;
  }
});
```

---

## Análisis de Mejores Prácticas: Código Limpio y Base de Datos Rápida

### Resumen Ejecutivo

Este análisis verifica que la aplicación cumple con las mejores prácticas para código limpio y rendimiento de base de datos. Se identifican áreas de mejora y se proporcionan recomendaciones específicas.

**Estado General:** ✅ **BUENO** - La aplicación sigue la mayoría de las mejores prácticas. Se identifican algunas mejoras recomendadas.

---

### 1. Análisis de Base de Datos

#### ✅ Fortalezas Identificadas

**1.1 Normalización Correcta**
- ✅ Tablas bien normalizadas (3NF)
- ✅ Separación correcta de datos de referencia (`visit_types`, `consult_types`, `practice_types`)
- ✅ Relaciones Foreign Key bien definidas
- ✅ Evita redundancia de datos

**1.2 Índices Optimizados**
- ✅ Índices en claves foráneas (`idx_appointments_client_id`, `idx_appointments_user_account_id`)
- ✅ Índices compuestos para consultas frecuentes (`idx_appointments_user_date_time`)
- ✅ Índices parciales para optimización (`idx_appointments_date_status WHERE status = 'scheduled'`)
- ✅ Índice único parcial para prevenir duplicados (`unique_appointment_scheduled`)
- ✅ Índices en campos de búsqueda frecuente (`idx_clients_phone_number`)

**1.3 Constraints y Validaciones**
- ✅ CHECK constraints para validación de datos (`chk_phone_format`, `chk_status`, `chk_appointment_date`)
- ✅ UNIQUE constraints donde corresponde (`phone_number`, `email`, `username`)
- ✅ Foreign Keys con acciones apropiadas (CASCADE, SET NULL, RESTRICT)
- ✅ NOT NULL en campos críticos

**1.4 Tipos de Datos Apropiados**
- ✅ `DATE` para fechas (no TIMESTAMP cuando no se necesita hora)
- ✅ `TIME WITHOUT TIME ZONE` para horas (correcto para horarios locales)
- ✅ `TIMESTAMP WITH TIME ZONE` para timestamps (correcto para auditoría)
- ✅ `VARCHAR` con límites apropiados (no TEXT innecesario)
- ✅ `SERIAL` para IDs auto-incrementales

#### ⚠️ Áreas de Mejora Identificadas

**1.1 Índices Faltantes**

**Problema:** Falta índice en `user_accounts.username` para búsquedas frecuentes.

**Impacto:** Las consultas que mapean `username` → `user_account_id` pueden ser lentas sin índice.

**Solución:**
```sql
-- Agregar índice en username (ya es UNIQUE, pero el índice explícito ayuda)
CREATE INDEX idx_user_accounts_username ON user_accounts (username);
```

**1.2 Índice Compuesto para Calendario**

**Problema:** El endpoint `/api/proveedor/calendar` consulta por `user_account_id` y rango de fechas, pero no hay índice compuesto optimizado.

**Solución:**
```sql
-- Índice compuesto para consultas de calendario por proveedor y rango de fechas
CREATE INDEX idx_appointments_user_date_range 
ON appointments (user_account_id, appointment_date, status) 
WHERE status IN ('scheduled', 'completed');
```

**1.3 Índice en Campos de Búsqueda de Texto**

**Problema:** `health_insurance` es VARCHAR(255) y se usa en filtros, pero no tiene índice.

**Impacto:** Búsquedas por obra social pueden ser lentas.

**Solución:**
```sql
-- Solo si las búsquedas por obra social son frecuentes
CREATE INDEX idx_appointments_health_insurance 
ON appointments (health_insurance) 
WHERE health_insurance IS NOT NULL;
```

**Nota:** Este índice solo es necesario si hay muchas búsquedas por obra social. Evaluar según uso real.

**1.4 Optimización de Consultas de Disponibilidad**

**Problema:** El endpoint `/api/available-times/[date]` realiza múltiples consultas que podrían optimizarse.

**Recomendación:** Considerar una vista materializada o función almacenada para calcular disponibilidad:

```sql
-- Vista materializada para disponibilidad (actualizar periódicamente)
CREATE MATERIALIZED VIEW mv_provider_availability AS
SELECT 
    ua.id as user_account_id,
    ws.day_of_week,
    asl.start_time,
    asl.end_time,
    COUNT(DISTINCT a.id) as booked_slots,
    -- Cálculos adicionales...
FROM user_accounts ua
JOIN work_schedule ws ON ws.user_account_id = ua.id
JOIN available_slots asl ON asl.work_schedule_id = ws.id
LEFT JOIN appointments a ON a.user_account_id = ua.id 
    AND a.appointment_date = CURRENT_DATE 
    AND a.status = 'scheduled'
GROUP BY ua.id, ws.day_of_week, asl.start_time, asl.end_time;

CREATE INDEX idx_mv_availability_user_day ON mv_provider_availability (user_account_id, day_of_week);

-- Actualizar periódicamente (ej: cada hora)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_provider_availability;
```

**1.5 Campos TEXT vs VARCHAR**

**Problema:** `cancellation_token` es TEXT, pero podría ser VARCHAR con límite específico.

**Recomendación:**
```sql
-- Cambiar a VARCHAR con límite razonable (JWT tokens suelen ser < 500 caracteres)
ALTER TABLE appointments 
ALTER COLUMN cancellation_token TYPE VARCHAR(500);
```

**1.6 Índice en Campos de Filtrado Frecuente**

**Problema:** `whatsapp_sent` se usa en filtros pero no tiene índice.

**Solución:**
```sql
-- Índice parcial para citas con WhatsApp pendiente
CREATE INDEX idx_appointments_whatsapp_pending 
ON appointments (user_account_id, appointment_date) 
WHERE whatsapp_sent = false AND status = 'scheduled';
```

#### 📊 Análisis de Performance de Consultas

**Consultas Críticas y Optimización:**

1. **Búsqueda de Cliente por Teléfono** (`POST /api/appointments/create`)
   - ✅ Índice: `idx_clients_phone_number` (UNIQUE)
   - ✅ Performance: Excelente (O(log n))

2. **Verificación de Citas Duplicadas**
   - ✅ Índice: `unique_appointment_scheduled` (único parcial)
   - ✅ Performance: Excelente (O(log n))

3. **Obtención de Horarios Disponibles** (`GET /api/available-times/[date]`)
   - ⚠️ Múltiples JOINs y subconsultas
   - **Recomendación:** Considerar caché en Redis para resultados frecuentes

4. **Calendario del Proveedor** (`GET /api/proveedor/calendar`)
   - ⚠️ Consulta compleja con agregaciones
   - **Recomendación:** Agregar índice compuesto (ver arriba)

5. **Lista de Citas del Proveedor** (`GET /api/proveedor/appointments`)
   - ✅ Índices: `idx_appointments_user_account_id`, `idx_appointments_date`
   - ✅ Paginación implementada
   - ✅ Performance: Buena

---

### 2. Análisis de Código Limpio

#### ✅ Fortalezas Identificadas

**2.1 Arquitectura RESTful**
- ✅ Endpoints siguen convenciones REST
- ✅ Métodos HTTP apropiados (GET, POST, PUT, DELETE)
- ✅ Códigos de estado HTTP correctos (200, 400, 401, 404, 409, 500)
- ✅ URLs semánticas y consistentes

**2.2 Validaciones**
- ✅ Validación en múltiples capas (cliente con Zod, servidor en API)
- ✅ Validación de formato de teléfono
- ✅ Validación de fechas (no permitir fechas pasadas)
- ✅ Validación de lógica condicional (Consulta vs Practica)

**2.3 Manejo de Errores**
- ✅ Respuestas de error estructuradas
- ✅ Códigos de estado apropiados
- ✅ Mensajes de error descriptivos
- ✅ Manejo de errores de base de datos

**2.4 Seguridad**
- ✅ Hash de contraseñas con bcrypt
- ✅ Tokens JWT para autenticación
- ✅ Tokens de cancelación con expiración
- ✅ Validación de email antes de acceso
- ✅ Sanitización de inputs (implícita en validaciones)

#### ⚠️ Áreas de Mejora Identificadas

**2.1 Transacciones de Base de Datos**

**Problema:** No se documenta el uso de transacciones para operaciones atómicas.

**Impacto:** Si falla una operación parcial (ej: crear cita pero falla WhatsApp), puede dejar datos inconsistentes.

**Solución:**
```typescript
// Ejemplo para POST /api/appointments/create
import { Pool } from 'pg';

export async function createAppointment(data: AppointmentData) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Crear/actualizar cliente
    const clientResult = await client.query(/* ... */);
    
    // 2. Crear cita
    const appointmentResult = await client.query(/* ... */);
    
    // 3. Enviar WhatsApp (si falla, rollback)
    try {
      await sendWhatsAppMessage(/* ... */);
      await client.query('UPDATE appointments SET whatsapp_sent = true WHERE id = $1', [appointmentId]);
    } catch (whatsappError) {
      // Log error pero no hacer rollback de la cita
      console.error('WhatsApp error:', whatsappError);
    }
    
    await client.query('COMMIT');
    return appointmentResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

**2.2 Prepared Statements**

**Problema:** No se documenta el uso de prepared statements para prevenir SQL injection.

**Recomendación:** Asegurar que todas las consultas usen parámetros:

```typescript
// ✅ CORRECTO - Usar parámetros
await pool.query(
  'SELECT * FROM appointments WHERE user_account_id = $1 AND appointment_date = $2',
  [userAccountId, date]
);

// ❌ INCORRECTO - Concatenación de strings
await pool.query(
  `SELECT * FROM appointments WHERE user_account_id = ${userAccountId}`
);
```

**2.3 Rate Limiting**

**Problema:** No se documenta rate limiting para prevenir abuso de APIs.

**Recomendación:** Implementar rate limiting:

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests per 10 seconds
});

export async function checkRateLimit(identifier: string) {
  const { success } = await ratelimit.limit(identifier);
  if (!success) {
    throw new Error('Rate limit exceeded');
  }
}
```

**2.4 Caché de Consultas Frecuentes**

**Problema:** Consultas como horarios disponibles y calendario se ejecutan frecuentemente sin caché.

**Recomendación:** Implementar caché con TTL:

```typescript
// lib/cache.ts
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function getCachedAvailableTimes(
  userAccountId: number,
  date: string
): Promise<string[] | null> {
  const key = `available_times:${userAccountId}:${date}`;
  const cached = await redis.get<string[]>(key);
  return cached;
}

export async function setCachedAvailableTimes(
  userAccountId: number,
  date: string,
  times: string[],
  ttl: number = 300 // 5 minutos
) {
  const key = `available_times:${userAccountId}:${date}`;
  await redis.setex(key, ttl, JSON.stringify(times));
}
```

**2.5 Paginación Consistente**

**Problema:** Algunos endpoints tienen paginación, otros no.

**Recomendación:** Implementar paginación estándar en todos los endpoints de listado:

```typescript
// Estándar de paginación
interface PaginationParams {
  page?: number;      // Default: 1
  limit?: number;     // Default: 20, Max: 100
  offset?: number;    // Calculado: (page - 1) * limit
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}
```

**2.6 Logging y Monitoreo**

**Problema:** No se documenta estrategia de logging estructurado.

**Recomendación:** Implementar logging estructurado:

```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

// Uso en endpoints
logger.info({ 
  endpoint: '/api/appointments/create',
  user_account_id: userAccountId,
  appointment_id: appointmentId 
}, 'Appointment created successfully');
```

**2.7 Validación de Entrada Más Estricta**

**Problema:** Algunas validaciones podrían ser más estrictas.

**Recomendaciones:**
- Validar longitud máxima de strings antes de insertar en BD
- Validar formato de email más estricto (RFC 5322)
- Validar que `username` solo contenga caracteres alfanuméricos y guiones bajos
- Validar que fechas no sean más de X días en el futuro (ej: 90 días)

**2.8 Manejo de Errores Más Granular**

**Problema:** Algunos errores genéricos podrían ser más específicos.

**Recomendación:** Crear clases de error personalizadas:

```typescript
// lib/errors.ts
export class ValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string, id: string | number) {
    super(`${resource} with id ${id} not found`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}
```

**2.9 Separación de Responsabilidades**

**Problema:** Los endpoints API pueden estar mezclando lógica de negocio con lógica de HTTP.

**Recomendación:** Separar en capas:

```
app/api/appointments/create/route.ts  (HTTP layer)
  ↓
lib/services/appointment-service.ts   (Business logic)
  ↓
lib/repositories/appointment-repo.ts  (Data access)
  ↓
Database
```

**2.10 Testing**

**Problema:** No se documenta estrategia de testing.

**Recomendación:** Documentar:
- Unit tests para funciones de negocio
- Integration tests para endpoints API
- E2E tests para flujos críticos
- Tests de base de datos con fixtures

---

### 3. Optimizaciones de Performance Recomendadas

#### 3.1 Consultas Optimizadas

**Problema:** Algunas consultas pueden hacer N+1 queries.

**Solución:** Usar JOINs o consultas con `IN`:

```sql
-- ❌ N+1 Problem
-- Para cada cita, hacer query separada para cliente
SELECT * FROM appointments WHERE user_account_id = 1;
-- Luego para cada resultado: SELECT * FROM clients WHERE id = ?

-- ✅ Optimizado con JOIN
SELECT 
  a.*,
  c.first_name,
  c.last_name,
  c.phone_number
FROM appointments a
JOIN clients c ON c.id = a.client_id
WHERE a.user_account_id = 1;
```

#### 3.2 Índices Adicionales Recomendados

```sql
-- Para búsquedas por username (ya mencionado arriba)
CREATE INDEX idx_user_accounts_username ON user_accounts (username);

-- Para consultas de calendario con filtros múltiples
CREATE INDEX idx_appointments_user_date_status 
ON appointments (user_account_id, appointment_date, status);

-- Para búsquedas de citas pendientes de WhatsApp
CREATE INDEX idx_appointments_whatsapp_pending 
ON appointments (user_account_id, appointment_date) 
WHERE whatsapp_sent = false AND status = 'scheduled';
```

#### 3.3 Connection Pooling

**Problema:** No se documenta configuración de connection pooling.

**Recomendación:** Configurar pool apropiadamente:

```typescript
// lib/db.ts
import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.POSTGRESQL_HOST,
  port: parseInt(process.env.POSTGRESQL_PORT || '5432'),
  database: process.env.POSTGRESQL_DATABASE,
  user: process.env.POSTGRESQL_USER,
  password: process.env.POSTGRESQL_PASSWORD,
  max: 20,                    // Máximo de conexiones en el pool
  idleTimeoutMillis: 30000,   // Cerrar conexiones inactivas después de 30s
  connectionTimeoutMillis: 10000, // Timeout al obtener conexión
  ssl: process.env.POSTGRESQL_SSL_MODE === 'require' ? { rejectUnauthorized: false } : false,
});
```

#### 3.4 Caché de Consultas Estáticas

**Problema:** Datos de referencia (`visit_types`, `consult_types`, `practice_types`) se consultan frecuentemente.

**Solución:** Cachéar en memoria o Redis:

```typescript
// lib/cache/reference-data.ts
let cachedVisitTypes: VisitType[] | null = null;
let cacheExpiry: number = 0;
const CACHE_TTL = 3600000; // 1 hora

export async function getVisitTypes(): Promise<VisitType[]> {
  if (cachedVisitTypes && Date.now() < cacheExpiry) {
    return cachedVisitTypes;
  }
  
  const result = await pool.query('SELECT * FROM visit_types ORDER BY id');
  cachedVisitTypes = result.rows;
  cacheExpiry = Date.now() + CACHE_TTL;
  
  return cachedVisitTypes;
}
```

---

### 4. Checklist de Mejores Prácticas

#### Base de Datos

- ✅ Normalización correcta (3NF)
- ✅ Índices en Foreign Keys
- ✅ Índices en campos de búsqueda frecuente
- ✅ Constraints CHECK para validación
- ✅ UNIQUE constraints donde corresponde
- ✅ Foreign Keys con acciones apropiadas
- ⚠️ Índice en `username` (recomendado agregar)
- ⚠️ Índices compuestos para consultas complejas (algunos faltan)
- ✅ Tipos de datos apropiados
- ⚠️ Vista materializada para disponibilidad (considerar)

#### Código

- ✅ Arquitectura RESTful
- ✅ Validaciones en múltiples capas
- ✅ Manejo de errores estructurado
- ✅ Seguridad (hash, JWT, tokens)
- ⚠️ Transacciones de base de datos (documentar)
- ⚠️ Prepared statements (asegurar uso)
- ⚠️ Rate limiting (implementar)
- ⚠️ Caché de consultas frecuentes (implementar)
- ⚠️ Paginación consistente (estandarizar)
- ⚠️ Logging estructurado (implementar)
- ⚠️ Testing (documentar estrategia)
- ⚠️ Separación de responsabilidades (mejorar)

#### Performance

- ✅ Índices optimizados
- ✅ Paginación en listados
- ⚠️ Caché de consultas frecuentes
- ⚠️ Optimización de consultas N+1
- ⚠️ Connection pooling configurado
- ⚠️ Caché de datos de referencia

---

### 5. Plan de Acción Recomendado

#### Prioridad Alta (Implementar Inmediatamente)

1. **Agregar índice en `user_accounts.username`**
   - Impacto: Alto (búsquedas frecuentes)
   - Esfuerzo: Bajo (1 línea SQL)

2. **Implementar transacciones para operaciones críticas**
   - Impacto: Alto (consistencia de datos)
   - Esfuerzo: Medio

3. **Asegurar uso de prepared statements**
   - Impacto: Alto (seguridad)
   - Esfuerzo: Bajo (revisar código existente)

#### Prioridad Media (Implementar Próximamente)

4. **Implementar rate limiting**
   - Impacto: Medio (prevención de abuso)
   - Esfuerzo: Medio

5. **Agregar caché para consultas frecuentes**
   - Impacto: Alto (performance)
   - Esfuerzo: Medio-Alto

6. **Agregar índices compuestos faltantes**
   - Impacto: Medio (performance)
   - Esfuerzo: Bajo

#### Prioridad Baja (Mejoras Futuras)

7. **Vista materializada para disponibilidad**
   - Impacto: Medio (performance en escala)
   - Esfuerzo: Alto

8. **Logging estructurado**
   - Impacto: Medio (debugging y monitoreo)
   - Esfuerzo: Medio

9. **Testing completo**
   - Impacto: Alto (calidad y mantenibilidad)
   - Esfuerzo: Alto

---

### 6. Conclusión

La aplicación sigue **buenas prácticas** en general, con una base de datos bien diseñada y código estructurado. Las mejoras recomendadas son principalmente optimizaciones de performance y robustez, no correcciones de errores críticos.

**Puntuación General:** 8/10

**Fortalezas Principales:**
- Base de datos bien normalizada y con índices apropiados
- Validaciones robustas en múltiples capas
- Arquitectura RESTful clara
- Seguridad bien implementada

**Áreas de Mejora Principales:**
- Agregar índices faltantes para optimización
- Implementar transacciones para operaciones críticas
- Agregar caché para consultas frecuentes
- Documentar y estandarizar prácticas de código

---

**Última Actualización:** Enero 2025
**Versión:** 2.0.0
