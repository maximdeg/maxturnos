import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combina clases CSS usando clsx y tailwind-merge
 * Útil para combinar clases de Tailwind CSS condicionalmente
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea una fecha a formato YYYY-MM-DD
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formatea una hora a formato HH:MM
 */
export function formatTime(time: string | Date): string {
  if (typeof time === 'string') {
    // Si ya está en formato HH:MM, retornarlo
    if (/^\d{2}:\d{2}$/.test(time)) {
      return time;
    }
    // Si es un string de fecha/hora, extraer solo la hora
    const d = new Date(time);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  const d = time;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Limpia un número de teléfono para formato consistente
 */
export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/[\s\-()]/g, '');
}

/**
 * Valida formato de teléfono para WhatsApp
 */
export function isValidPhoneNumber(phone: string): boolean {
  const cleaned = cleanPhoneNumber(phone);
  return /^\+?[0-9]{10,15}$/.test(cleaned);
}

/**
 * Obtiene el nombre del día de la semana en español
 */
export function getDayName(dayOfWeek: number): string {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[dayOfWeek] || '';
}

/**
 * Obtiene el nombre del día de la semana en inglés (para BD)
 */
export function getDayNameEnglish(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek] || '';
}

/**
 * Convierte nombre de día en inglés a número (0-6)
 */
export function dayNameToNumber(dayName: string): number {
  const days: Record<string, number> = {
    'Sunday': 0,
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6,
  };
  return days[dayName] ?? -1;
}
