# MaxTurnos — Product Specification Document

**Version:** 1.0  
**Last Updated:** February 2025  
**Status:** Living document (derived from codebase analysis)

---

## 1. Product Overview

### 1.1 Purpose

**MaxTurnos** is a multi-provider medical appointment booking system (Sistema de Reserva de Turnos Médicos). It enables healthcare providers (proveedores) to offer personalized booking links to patients, who can self-serve to schedule, view, and cancel appointments without phone calls.

### 1.2 Value Proposition

- **For providers:** Reduce coordination time, avoid double bookings, automate reminders, and manage schedule and availability from one place.
- **For patients:** Book 24/7 from a provider’s link, receive confirmation (including WhatsApp when configured), and cancel or view details via a secure link.

### 1.3 Key Differentiators

- **Personalized provider URLs:** Each provider has a public page and booking flow at `/{username}` and `/{username}/agendar-visita`.
- **Visit types:** Supports “Consulta” (consultation) and “Practica” (practice/procedure), with consult types and practice types and conditional health insurance options.
- **Token-based cancellation:** Patients cancel via a signed link (cancellation token); no account required.
- **WhatsApp integration (UltraMsg):** Optional confirmation and cancellation messages to patients.
- **Email verification:** Providers must verify email before logging in.

---

## 2. Target Users

| User Type | Description | Primary Actions |
|-----------|-------------|-----------------|
| **Provider (Proveedor)** | Healthcare professional (e.g. dermatologist) who receives appointments | Register, verify email, login, set work schedule & unavailable days, manage health insurance list, view/manage appointments, cancel appointments, update profile |
| **Patient (Paciente)** | End patient booking with a provider | Open provider link, fill booking form, view appointment details, cancel (with token, within 24h) |
| **Admin (Super Admin)** | Back-office role (separate `users` table) | Login (same auth API), master password reset; future admin features |

---

## 3. User Flows & Features

### 3.1 Public (Unauthenticated)

- **Landing (`/`):** Marketing page: value proposition, features, “Cómo funciona,” benefits, CTAs to Register and Login.
- **Provider public page (`/[username]`):** Provider info, services copy, CTA “Agendar visita” → `/[username]/agendar-visita`.
- **Book visit (`/[username]/agendar-visita`):**
  - Form: name, phone, visit type (Consulta / Practica), consult type or practice type, health insurance, date (calendar), time (slots), notes.
  - Health insurance list filtered by visit type (e.g. exclude “Practica Particular” for Consulta, “Particular” for Practica).
  - Calendar disables: past dates, dates &gt; 30 days ahead, non–working days, unavailable days, hardcoded holidays (e.g. 01-01, 12-25).
  - Available times: 20-minute slots from provider work schedule, minus existing appointments and blocked frames.
  - On success: redirect to `/[username]/cita/[id]?token=...`.
- **Appointment details (`/[username]/cita/[id]`):**
  - View: patient, date, time, visit/consult/practice type, health insurance, status (scheduled / cancelled / completed).
  - If scheduled and &gt; 24h before: “Cancelar cita” using cancellation token.
  - Links: “Agendar otra cita,” “Volver al inicio.”

### 3.2 Provider Authentication

- **Register (`/proveedor/register`):** Email, password, username (slug), first name, last name, optional WhatsApp. Validation: unique email/username; email verification sent (link with token).
- **Verify email:** Link in email → `/api/auth/verify-email` (token) sets `email_verified = true`.
- **Login (`/proveedor/login`):** Email + password. JWT returned; stored in `localStorage` as `auth_token`. Providers must have `email_verified`; admins skip this check.
- **Protected routes:** All `/api/proveedor/*` require `Authorization: Bearer <token>` and validated, verified provider (middleware).

### 3.3 Provider Dashboard (`/proveedor/perfil`)

- **Tabs:**
  - **Citas:** List appointments with filters (status: all/scheduled/cancelled/completed; date range: today+future or all; start/end date). Show WhatsApp send status. Cancel (provider) with confirmation; patient is notified via WhatsApp when configured.
  - **Calendario:** Month view; days colored by status (working, full, has appointments); summary (total appointments, working days, full days); click day for day detail and list of appointments.
  - **Perfil:** Edit email, first/last name, WhatsApp; change password (current + new + confirm).
  - **Horarios:** Per weekday (Lunes–Domingo): toggle working day; add/remove time slots (start–end); add/remove unavailable dates (dd/mm/yyyy).
  - **Obras sociales:** CRUD health insurance items (name, optional price, notes). This list is what patients can choose when booking (filtered by visit type on public form).

### 3.4 Cancellation Rules

- **By patient:** Requires cancellation token in URL/body; allowed only if appointment is &gt; 24 hours before scheduled time.
- **By provider:** Requires auth; only the owning provider can cancel; optional WhatsApp to patient with reschedule link.

---

## 4. Data Model (Conceptual)

### 4.1 Core Entities

| Entity | Purpose |
|--------|---------|
| **user_accounts** | Providers: email, username, password, first/last name, whatsapp_phone_number, email_verified, verification_token(_expires), created_at, updated_at |
| **users** | Admins: id, email, password, role (e.g. super_admin); used for login and admin-only actions |
| **clients** | Patients: first_name, last_name, phone_number, email (optional), user_account_id (optional), created_at, updated_at |
| **appointments** | Cita: client_id, user_account_id, appointment_date, appointment_time, consult_type_id, visit_type_id, practice_type_id, health_insurance, notes, status (scheduled \| cancelled \| completed), cancellation_token, whatsapp_sent, whatsapp_sent_at, whatsapp_message_id, created_at, updated_at |
| **work_schedule** | Per provider, per day_of_week (e.g. Monday): is_working_day |
| **available_slots** | Time windows per work_schedule: start_time, end_time, is_available (20-min slots derived in API) |
| **unavailable_days** | Provider-specific dates (e.g. holidays, leave) |
| **unavailable_time_frames** | Optional; block specific time ranges on a date |
| **visit_types** | e.g. Consulta (1), Practica (2) |
| **consult_types** | e.g. Primera vez, etc. (used when visit_type = Consulta) |
| **practice_types** | e.g. Criocirugía, Electrocoagulación, Biopsia (used when visit_type = Practica) |
| **health_insurance** | Name, optional price, notes; provider-scoped (proveedor health-insurance API) or global list for public form |

### 4.2 Key Relationships

- Appointment → one Client, one Provider (user_account).
- Appointment → one VisitType; optional ConsultType or PracticeType depending on VisitType.
- Work schedule and slots are per user_account; unavailable_days and unavailable_time_frames are per user_account.
- Health insurance: public `/api/health-insurance` (e.g. global/static list); provider CRUD at `/api/proveedor/health-insurance` for their own list used in booking.

### 4.3 Constraints (from code)

- Unique (client, provider, date, time) for status = scheduled to prevent double booking.
- Visit type 1 (Consulta) ⇒ consult_type_id required, practice_type_id null.
- Visit type 2 (Practica) ⇒ practice_type_id required, consult_type_id null.
- Phone format validated for WhatsApp (e.g. 8–12 digits, cleaned for storage).

---

## 5. API Specification (Summary)

### 5.1 Public APIs (no auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health-insurance` | List health insurance options (for booking form) |
| GET | `/api/visit-types` | List visit types |
| GET | `/api/provider/[username]/info` | Public provider info |
| GET | `/api/provider/[username]/work-schedule` | Working days and slots (for calendar/availability) |
| GET | `/api/available-times/[date]` | Query: `username` or `user_account_id`; returns array of HH:MM available slots |
| POST | `/api/appointments/create` | Body: patient data, visit/consult/practice type, health_insurance, date, time, user_account_id (or derived from provider username); returns appointment info + details URL with cancellation token |
| GET | `/api/appointments/[id]` | Query: optional `token`; returns appointment details (for confirmation page) |
| POST | `/api/appointments/[id]/cancel` | Body: `token` (required for patient), `cancelled_by`: patient \| provider; provider cancel requires Bearer token |
| POST | `/api/auth/register` | Register provider |
| POST | `/api/auth/login` | Login provider or admin; returns JWT |
| GET | `/api/auth/verify-email` | Verify email with token |

### 5.2 Provider APIs (Bearer token required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/proveedor/profile` | Current provider profile |
| PUT | `/api/proveedor/profile` | Update profile |
| PUT | `/api/proveedor/profile/password` | Change password |
| GET | `/api/proveedor/appointments` | List provider’s appointments (query: page, limit, status, etc.) |
| GET | `/api/proveedor/calendar` | Query: year, month; calendar view data |
| GET | `/api/proveedor/work-schedule` | Work schedule and slots |
| PUT | `/api/proveedor/work-schedule/[day_of_week]` | Set day working/non-working |
| POST | `/api/proveedor/work-schedule/[day]/slots` | Add slot (start_time, end_time) |
| DELETE | `/api/proveedor/work-schedule/slots/[id]` | Delete slot |
| GET | `/api/proveedor/unavailable-days` | List unavailable dates |
| POST | `/api/proveedor/unavailable-days` | Add unavailable date |
| DELETE | `/api/proveedor/unavailable-days/[id]` | Remove unavailable date |
| GET | `/api/proveedor/health-insurance` | List provider’s health insurance items |
| POST | `/api/proveedor/health-insurance` | Add |
| PUT | `/api/proveedor/health-insurance` | Update (e.g. by current name) |
| DELETE | `/api/proveedor/health-insurance` | Delete (e.g. by name) |

### 5.3 Admin

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/admin/master-reset-password` | Master password reset (super_admin); body typically includes user identifier |

### 5.4 Behavioural Notes

- **Rate limiting:** Applied on register, login, create appointment, available-times (e.g. Upstash Redis sliding window); stricter in production, relaxed in test mode.
- **Caching:** Available times per (user_account_id, date) cached (e.g. 5 min TTL); invalidated on appointment create/cancel.
- **Idempotency / duplicates:** Create appointment checks for existing (client phone + provider + date + time + scheduled); returns 409 if duplicate.
- **Normalization:** Many APIs accept multiple field names (e.g. `date`/`appointment_date`, `provider`/`username`) for backward compatibility and tests.

---

## 6. Technical Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| UI | React 19, Tailwind CSS, Radix UI, Framer Motion, Lucide icons |
| Forms | React Hook Form, Zod |
| Data / state | TanStack Query (React Query), optional Redux |
| Backend | Next.js API routes (serverless) |
| Database | PostgreSQL (pg driver, connection pool) |
| Auth | JWT (jose), bcrypt for passwords |
| Email | Nodemailer (verification emails) |
| WhatsApp | UltraMsg API (optional) |
| Cache | Upstash Redis or in-memory LRU fallback |
| Rate limit | Upstash Ratelimit + Redis |
| Logging | Pino (apiLogger, authLogger, dbLogger, etc.) |

### 6.1 Environment (representative)

- `POSTGRESQL_*`: host, port, database, user, password, optional SSL.
- `JWT_SECRET`: min 32 chars.
- `NEXT_PUBLIC_APP_URL`: base URL for links (confirmation, cancellation).
- `ULTRAMSG_API_URL`, `ULTRAMSG_INSTANCE_ID`, `ULTRAMSG_API_TOKEN`: WhatsApp.
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`: cache and rate limiting.
- Email (SMTP) for verification emails.

---

## 7. Security & Authentication

- **Provider/Admin:** JWT in `Authorization: Bearer <token>`. Middleware protects `/api/proveedor/*`; validates token and `email_verified` for providers.
- **Patient cancellation:** Signed cancellation token (payload: appointmentId, patientId, phone, date, time; expiry); verified in cancel API.
- **Passwords:** Bcrypt hashing on register; current password required for provider password change.
- **Rate limiting:** On auth and booking endpoints to mitigate abuse.
- **Input:** Zod schemas and DB constraints; phone and date/time normalized before use.

---

## 8. Integrations

- **Email:** Verification link after register; configurable SMTP via Nodemailer.
- **WhatsApp (UltraMsg):** Optional. Used for: appointment confirmation (with details URL); provider-initiated cancellation with reschedule link. If credentials are missing, booking and cancel still succeed; only messaging is skipped.
- **Webhook:** `/api/whatsapp/webhook` present for future or external WhatsApp events (e.g. delivery status).

---

## 9. Non-Functional Considerations

- **i18n:** UI copy is Spanish (Argentina); date/time and phone formats aligned (e.g. dd/MM/yyyy, local time).
- **Responsiveness:** Layouts and components are responsive (e.g. provider dashboard, booking form, confirmation page).
- **Accessibility:** Radix-based components and semantic structure support basic a11y.
- **Performance:** Connection pooling, query logging, caching of availability, and invalidation on writes.
- **Observability:** Structured logging (Pino), request timing, and error context in logs.

---

## 10. Out of Scope / Future Ideas

- Patient accounts and login (today: booking and cancel are link/token-based).
- Payments or deposits.
- Recurring or multi-slot booking.
- Configurable slot duration (currently 20 minutes).
- Multi-location or multi-branch per provider.
- SMS or in-app push in addition to WhatsApp/email.
- Full admin UI beyond master password reset.
- Public discovery of providers (no directory; access only via known `/[username]`).

---

## 11. Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Feb 2025 | Initial PSD from codebase analysis |

---

*This document reflects the application as implemented in the repository. For implementation details, refer to the source code and API route handlers.*
