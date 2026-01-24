/**
 * Tipos e interfaces TypeScript para la aplicación MaxTurnos
 */

// Tipos de referencia
export interface VisitType {
  id: number;
  name: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ConsultType {
  id: number;
  name: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PracticeType {
  id: number;
  name: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

// User Account (Proveedor)
export interface UserAccount {
  id: number;
  email: string;
  username: string | null;
  password: string;
  first_name: string | null;
  last_name: string | null;
  whatsapp_phone_number: string | null;
  email_verified: boolean;
  verification_token: string | null;
  verification_token_expires: Date | null;
  created_at: Date;
  updated_at: Date;
}

// Client (Paciente)
export interface Client {
  id: number;
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string | null;
  user_account_id: number | null;
  created_at: Date;
  updated_at: Date;
}

// Appointment (Cita)
export interface Appointment {
  id: number;
  client_id: number;
  user_account_id: number;
  appointment_date: Date;
  appointment_time: string; // TIME format HH:MM:SS
  consult_type_id: number | null;
  visit_type_id: number;
  practice_type_id: number | null;
  health_insurance: string;
  notes: string | null;
  status: 'scheduled' | 'cancelled' | 'completed';
  cancellation_token: string | null;
  whatsapp_sent: boolean;
  whatsapp_sent_at: Date | null;
  whatsapp_message_id: string | null;
  created_at: Date;
  updated_at: Date;
}

// Work Schedule
export interface WorkSchedule {
  id: number;
  user_account_id: number;
  day_of_week: string; // 'Monday', 'Tuesday', etc.
  is_working_day: boolean;
  created_at: Date;
  updated_at: Date;
}

// Available Slot
export interface AvailableSlot {
  id: number;
  work_schedule_id: number;
  user_account_id: number;
  start_time: string; // TIME format HH:MM:SS
  end_time: string; // TIME format HH:MM:SS
  is_available: boolean;
  created_at: Date;
  updated_at: Date;
}

// Unavailable Day
export interface UnavailableDay {
  id: number;
  user_account_id: number;
  unavailable_date: Date;
  is_confirmed: boolean;
  created_at: Date;
  updated_at: Date;
}

// Unavailable Time Frame
export interface UnavailableTimeFrame {
  id: number;
  workday_date: Date;
  start_time: string; // TIME format HH:MM:SS
  end_time: string; // TIME format HH:MM:SS
  work_schedule_id: number | null;
  user_account_id: number;
  created_at: Date;
  updated_at: Date;
}

// Health Insurance (Obra Social)
export interface HealthInsurance {
  id?: number;
  name: string;
  price: string | null;
  price_numeric?: number | null;
  notes?: string | null;
}

// Tipos para formularios
export interface AppointmentFormData {
  first_name: string;
  last_name: string;
  phone_number: string;
  visit_type: string; // "1" o "2"
  consult_type?: string; // "1" o "2" (si visit_type = "1")
  practice_type?: string; // "1", "2" o "3" (si visit_type = "2")
  health_insurance: string;
  appointment_date: Date;
  appointment_time: string; // HH:MM
  notes?: string;
}

// Tipos para API responses
export interface AppointmentDetails {
  id: number;
  patient_name: string;
  phone_number: string;
  appointment_date: string;
  appointment_time: string;
  visit_type_name: string;
  consult_type_name: string | null;
  practice_type_name: string | null;
  health_insurance: string;
  status: string;
  provider_username: string;
  can_cancel: boolean;
  cancellation_token?: string;
}

export interface WorkScheduleResponse {
  user_account_id: number;
  workingDays: number[]; // [1, 2, 3, 4, 5] donde 0=Domingo, 1=Lunes, etc.
  unavailableDates: string[]; // ["2025-01-01", "2025-12-25"]
}

export interface AvailableTimesResponse {
  date: string;
  available_times: string[]; // ["09:00", "09:20", ...]
}

// Tipos para autenticación
export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  full_name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: {
    id: number;
    email: string;
    username: string | null;
    email_verified: boolean;
  };
  message?: string;
  user_id?: number;
}

// Tipos para JWT payload
export interface JWTPayload {
  id: number;
  email: string;
  username: string | null;
  email_verified: boolean;
  iat?: number;
  exp?: number;
}

export interface CancellationTokenPayload {
  appointmentId: number;
  patientId: number;
  patientPhone: string;
  appointmentDate: string;
  appointmentTime: string;
  iat?: number;
  exp?: number;
}

// Tipos para WhatsApp
export interface WhatsAppMessage {
  phone_number: string;
  message: string;
  message_type?: 'confirmation' | 'cancellation' | 'reschedule';
}

export interface WhatsAppResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Tipos para Email
export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

// Tipos para Provider Profile
export interface ProviderProfile {
  id: number;
  email: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  whatsapp_phone_number: string | null;
  email_verified: boolean;
  created_at: Date;
}

export interface ProviderAppointmentsResponse {
  appointments: Appointment[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface CalendarDay {
  date: string;
  total_appointments: number;
  scheduled: number;
  cancelled: number;
  completed: number;
  is_full: boolean;
  is_working_day: boolean;
  appointments: Appointment[];
  available_slots: number;
  total_slots: number;
}

export interface CalendarResponse {
  year: number;
  month: number;
  days: CalendarDay[];
  summary: {
    total_days: number;
    working_days: number;
    full_days: number;
    total_appointments: number;
  };
}
