'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Calendar, Clock, User, Settings, Plus, Trash2, CheckCircle2, XCircle, Phone, Mail, X, Check, CheckCheck, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';

const API_BASE = '/api/proveedor';

// Types
interface Appointment {
  id: number;
  patient_name: string;
  patient_phone: string;
  appointment_date: string;
  appointment_time: string;
  visit_type: string;
  consult_type: string | null;
  practice_type: string | null;
  health_insurance: string;
  status: 'scheduled' | 'cancelled' | 'completed';
  whatsapp_sent: boolean;
  whatsapp_sent_at: string | null;
  whatsapp_message_id: string | null;
  created_at: string;
}

interface Profile {
  id: number;
  email: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  whatsapp_phone_number: string | null;
  email_verified: boolean;
  created_at: string;
}

interface WorkScheduleDay {
  id: number;
  day_of_week: string;
  is_working_day: boolean;
  available_slots: TimeSlot[];
}

interface TimeSlot {
  id: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface UnavailableDay {
  id: number;
  date: string;
  is_confirmed: boolean;
  created_at: string;
}

interface CalendarDay {
  date: string;
  total_appointments: number;
  scheduled: number;
  cancelled: number;
  completed: number;
  is_full: boolean;
  is_working_day: boolean;
  appointments: any[];
  available_slots: number;
  total_slots: number;
}

const DAYS_OF_WEEK = [
  { value: 'Monday', label: 'Lunes' },
  { value: 'Tuesday', label: 'Martes' },
  { value: 'Wednesday', label: 'Miércoles' },
  { value: 'Thursday', label: 'Jueves' },
  { value: 'Friday', label: 'Viernes' },
  { value: 'Saturday', label: 'Sábado' },
  { value: 'Sunday', label: 'Domingo' },
];

// Helper function to format time to 24-hour format (HH:MM)
function formatTime24(time: string): string {
  if (!time) return '';
  // If time is already in HH:MM format, return as is
  if (/^\d{2}:\d{2}$/.test(time)) return time;
  // If time is in HH:MM:SS format, extract HH:MM
  if (/^\d{2}:\d{2}:\d{2}/.test(time)) return time.substring(0, 5);
  // Try to parse and format
  try {
    const [hours, minutes] = time.split(':');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  } catch {
    return time;
  }
}

// Helper function to convert YYYY-MM-DD to dd/mm/yyyy
function formatDateToDDMMYYYY(dateString: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString + 'T00:00:00');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
}

// Helper function to convert dd/mm/yyyy to YYYY-MM-DD
function parseDDMMYYYYToISO(dateString: string): string {
  if (!dateString) return '';
  // Remove any non-digit characters except /
  const cleaned = dateString.replace(/[^\d/]/g, '');
  const parts = cleaned.split('/');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    // Validate and convert
    if (day && month && year && year.length === 4) {
      return `${year}-${month}-${day}`;
    }
  }
  return dateString;
}

export default function ProviderProfilePage() {
  const [token, setToken] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    setToken(storedToken);
  }, []);

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  });

  // Fetch appointments
  const { data: appointmentsData, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['appointments', token],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/appointments`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Error al cargar citas');
      return response.json();
    },
    enabled: !!token,
  });

  // Fetch profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', token],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/profile`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Error al cargar perfil');
      return response.json();
    },
    enabled: !!token,
  });

  // Fetch work schedule
  const { data: workScheduleData, isLoading: scheduleLoading } = useQuery({
    queryKey: ['work-schedule', token],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/work-schedule`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Error al cargar horarios');
      return response.json();
    },
    enabled: !!token,
  });

  // Fetch unavailable days
  const { data: unavailableDaysData } = useQuery({
    queryKey: ['unavailable-days', token],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/unavailable-days`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Error al cargar días no laborables');
      return response.json();
    },
    enabled: !!token,
  });

  // Calendar state
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const { data: calendarData, isLoading: calendarLoading } = useQuery({
    queryKey: ['calendar', token, selectedMonth.getFullYear(), selectedMonth.getMonth() + 1],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE}/calendar?year=${selectedMonth.getFullYear()}&month=${selectedMonth.getMonth() + 1}`,
        { headers: getAuthHeaders() }
      );
      if (!response.ok) throw new Error('Error al cargar calendario');
      return response.json();
    },
    enabled: !!token,
  });

  if (!token) {
    return (
      <div className="min-h-screen gradient-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Por favor, inicia sesión para acceder al panel.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Panel del Proveedor</h1>
        
        <Tabs defaultValue="appointments" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="appointments">Citas</TabsTrigger>
            <TabsTrigger value="calendar">Calendario</TabsTrigger>
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="schedule">Horarios</TabsTrigger>
          </TabsList>
          
          <TabsContent value="appointments">
            <AppointmentsTab 
              data={appointmentsData} 
              loading={appointmentsLoading}
              token={token}
            />
          </TabsContent>
          
          <TabsContent value="calendar">
            <CalendarTab 
              data={calendarData}
              loading={calendarLoading}
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
              token={token}
            />
          </TabsContent>
          
          <TabsContent value="profile">
            <ProfileTab 
              profile={profile}
              loading={profileLoading}
              token={token}
              queryClient={queryClient}
            />
          </TabsContent>
          
          <TabsContent value="schedule">
            <ScheduleTab 
              workSchedule={workScheduleData?.work_schedule}
              unavailableDays={unavailableDaysData?.unavailable_days}
              loading={scheduleLoading}
              token={token}
              queryClient={queryClient}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Appointments Tab Component
function AppointmentsTab({ data, loading, token }: { data: any; loading: boolean; token: string }) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const appointments: Appointment[] = data?.appointments || [];

  const filteredAppointments = appointments.filter((apt: Appointment) => {
    if (statusFilter !== 'all' && apt.status !== statusFilter) return false;
    if (startDate && apt.appointment_date < startDate) return false;
    if (endDate && apt.appointment_date > endDate) return false;
    return true;
  });

  // Mutation para cancelar cita
  const cancelAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: number) => {
      const response = await fetch(`/api/appointments/${appointmentId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cancelled_by: 'provider' }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al cancelar la cita');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('Cita cancelada exitosamente. Se envió un mensaje al paciente.');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setCancellingId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al cancelar la cita');
      setCancellingId(null);
    },
  });

  const handleCancelAppointment = (appointmentId: number) => {
    if (window.confirm('¿Estás seguro de que deseas cancelar esta cita? Se enviará un mensaje al paciente.')) {
      setCancellingId(appointmentId);
      cancelAppointmentMutation.mutate(appointmentId);
    }
  };

  // Función para obtener el estado del mensaje WhatsApp
  const getWhatsAppStatus = (apt: Appointment) => {
    if (!apt.whatsapp_sent) {
      return { icon: null, text: '', color: '' };
    }
    // Si tiene whatsapp_sent_at, significa que fue recibido (doble check)
    if (apt.whatsapp_sent_at) {
      return { 
        icon: CheckCheck, 
        text: 'Mensaje recibido', 
        color: 'text-blue-600' 
      };
    }
    // Si solo tiene whatsapp_sent pero no whatsapp_sent_at, fue enviado pero no confirmado (check simple)
    return { 
      icon: Check, 
      text: 'Mensaje enviado', 
      color: 'text-gray-600' 
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lista de Citas</CardTitle>
        <CardDescription>Gestiona todas tus citas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="status">Estado</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="scheduled">Programadas</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
                <SelectItem value="completed">Completadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="start-date">Fecha Inicio</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="end-date">Fecha Fin</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* Appointments List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : filteredAppointments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No hay citas disponibles
          </p>
        ) : (
          <div className="space-y-2">
            {filteredAppointments.map((apt: Appointment) => {
              const whatsappStatus = getWhatsAppStatus(apt);
              const StatusIcon = whatsappStatus.icon;
              
              return (
                <Card key={apt.id} className="p-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <h3 className="font-semibold text-base sm:text-lg truncate">{apt.patient_name}</h3>
                        <span className={`text-xs px-2 py-1 rounded self-start ${
                          apt.status === 'scheduled' ? 'bg-green-100 text-green-800' :
                          apt.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {apt.status === 'scheduled' ? 'Programada' :
                           apt.status === 'cancelled' ? 'Cancelada' : 'Completada'}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 flex-shrink-0" />
                          <span className="whitespace-nowrap">{format(parseISO(apt.appointment_date), 'dd/MM/yyyy')}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4 flex-shrink-0" />
                          <span className="whitespace-nowrap">{formatTime24(apt.appointment_time)}</span>
                        </span>
                        <span className="flex items-center gap-1 min-w-0">
                          <Phone className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{apt.patient_phone}</span>
                        </span>
                      </div>
                      <div className="text-sm break-words">
                        <span className="font-medium">{apt.visit_type}</span>
                        {apt.consult_type && ` - ${apt.consult_type}`}
                        {apt.practice_type && ` - ${apt.practice_type}`}
                        {' • '}
                        <span>{apt.health_insurance}</span>
                      </div>
                      {StatusIcon && (
                        <div className={`flex items-center gap-1 text-xs ${whatsappStatus.color}`}>
                          <StatusIcon className="h-3 w-3 flex-shrink-0" />
                          <span>{whatsappStatus.text}</span>
                        </div>
                      )}
                    </div>
                    {apt.status === 'scheduled' && (
                      <div className="flex-shrink-0 sm:ml-4">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCancelAppointment(apt.id)}
                          disabled={cancellingId === apt.id || cancelAppointmentMutation.isPending}
                          className="w-full sm:w-auto"
                        >
                          {cancellingId === apt.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              <span className="hidden sm:inline">Cancelando...</span>
                              <span className="sm:hidden">Cancelando...</span>
                            </>
                          ) : (
                            <>
                              <X className="mr-2 h-4 w-4" />
                              <span>Cancelar</span>
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Calendar Tab Component
function CalendarTab({ 
  data, 
  loading, 
  selectedMonth, 
  onMonthChange,
  token 
}: { 
  data: any; 
  loading: boolean; 
  selectedMonth: Date;
  onMonthChange: (date: Date) => void;
  token: string;
}) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const days: CalendarDay[] = data?.days || [];
  const summary = data?.summary || {};

  const getDayStatus = (day: CalendarDay) => {
    if (!day.is_working_day) return 'bg-gray-200';
    if (day.is_full) return 'bg-red-200';
    if (day.scheduled > 0) return 'bg-yellow-200';
    return 'bg-green-200';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendario</CardTitle>
        <CardDescription>Vista mensual de tus citas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Month Navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => onMonthChange(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}
          >
            Mes Anterior
          </Button>
          <h2 className="text-xl font-semibold">
            {format(selectedMonth, 'MMMM yyyy')}
          </h2>
          <Button
            variant="outline"
            onClick={() => onMonthChange(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}
          >
            Mes Siguiente
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded">
            <div className="text-2xl font-bold">{summary.total_appointments || 0}</div>
            <div className="text-sm text-muted-foreground">Total Citas</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded">
            <div className="text-2xl font-bold">{summary.working_days || 0}</div>
            <div className="text-sm text-muted-foreground">Días Laborables</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded">
            <div className="text-2xl font-bold">{summary.full_days || 0}</div>
            <div className="text-sm text-muted-foreground">Días Llenos</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded">
            <div className="text-2xl font-bold">{summary.total_days || 0}</div>
            <div className="text-sm text-muted-foreground">Total Días</div>
          </div>
        </div>

        {/* Calendar */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
              <div key={day} className="text-center font-semibold p-2">
                {day}
              </div>
            ))}
            {(() => {
              // Crear un mapa de días por fecha para acceso rápido
              const daysMap = new Map(days.map(d => [d.date, d]));
              
              // Obtener el primer día del mes y su día de la semana (0=domingo, 1=lunes, etc.)
              const firstDayOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
              const firstDayOfWeek = firstDayOfMonth.getDay(); // 0 = domingo
              
              // Crear array de días del mes con espacios vacíos al inicio
              const calendarDays: (CalendarDay | null)[] = [];
              
              // Agregar días vacíos antes del primer día del mes
              for (let i = 0; i < firstDayOfWeek; i++) {
                calendarDays.push(null);
              }
              
              // Agregar todos los días del mes
              const year = selectedMonth.getFullYear();
              const month = selectedMonth.getMonth() + 1;
              const daysInMonth = new Date(year, month, 0).getDate();
              
              for (let day = 1; day <= daysInMonth; day++) {
                const dateString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                const dayData = daysMap.get(dateString);
                if (dayData) {
                  calendarDays.push(dayData);
                } else {
                  // Si no hay datos del backend, crear un día vacío
                  calendarDays.push({
                    date: dateString,
                    total_appointments: 0,
                    scheduled: 0,
                    cancelled: 0,
                    completed: 0,
                    is_full: false,
                    is_working_day: false,
                    appointments: [],
                    available_slots: 0,
                    total_slots: 0,
                  });
                }
              }
              
              return calendarDays.map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}`} className="p-2" />;
                }
                const date = parseISO(day.date);
                return (
                  <div
                    key={day.date}
                    className={`p-2 border rounded cursor-pointer hover:bg-accent ${getDayStatus(day)}`}
                    onClick={() => setSelectedDate(date)}
                  >
                    <div className="text-sm font-medium">{format(date, 'd')}</div>
                    {day.scheduled > 0 && (
                      <div className="text-xs text-center mt-1">
                        {day.scheduled} cita{day.scheduled !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}

        {/* Day Details */}
        {selectedDate && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>
                {format(selectedDate, 'dd/MM/yyyy')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const dayData = days.find(d => d.date === format(selectedDate, 'yyyy-MM-dd'));
                if (!dayData) return <p>No hay datos para este día</p>;
                return (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Programadas:</span> {dayData.scheduled}
                      </div>
                      <div>
                        <span className="font-medium">Canceladas:</span> {dayData.cancelled}
                      </div>
                      <div>
                        <span className="font-medium">Completadas:</span> {dayData.completed}
                      </div>
                    </div>
                    {dayData.appointments.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <h4 className="font-semibold">Citas del día:</h4>
                        {dayData.appointments.map((apt: any) => (
                          <div key={apt.id} className="p-2 bg-gray-50 rounded text-sm">
                            <div className="font-medium">{apt.time} - {apt.patient_name}</div>
                            <div className="text-muted-foreground">
                              {apt.visit_type} {apt.consult_type || apt.practice_type || ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}

// Profile Tab Component
function ProfileTab({ 
  profile, 
  loading, 
  token,
  queryClient 
}: { 
  profile: Profile | undefined; 
  loading: boolean; 
  token: string;
  queryClient: any;
}) {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    whatsapp_phone_number: '',
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        email: profile.email || '',
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        whatsapp_phone_number: profile.whatsapp_phone_number || '',
      });
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`${API_BASE}/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al actualizar perfil');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('Perfil actualizado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar perfil');
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`${API_BASE}/profile/password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al cambiar contraseña');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('Contraseña actualizada exitosamente');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al cambiar contraseña');
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    changePasswordMutation.mutate({
      current_password: passwordData.current_password,
      new_password: passwordData.new_password,
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Información Personal</CardTitle>
          <CardDescription>Actualiza tu información personal</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="whatsapp_phone">Teléfono WhatsApp</Label>
                <Input
                  id="whatsapp_phone"
                  type="tel"
                  value={formData.whatsapp_phone_number}
                  onChange={(e) => setFormData({ ...formData, whatsapp_phone_number: e.target.value })}
                  placeholder="+543421234567"
                />
              </div>
              <div>
                <Label htmlFor="first_name">Nombre</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="last_name">Apellido</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>
            </div>
            <Button type="submit" disabled={updateProfileMutation.isPending}>
              {updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cambiar Contraseña</CardTitle>
          <CardDescription>Actualiza tu contraseña de acceso</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <Label htmlFor="current_password">Contraseña Actual</Label>
              <Input
                id="current_password"
                type="password"
                value={passwordData.current_password}
                onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="new_password">Nueva Contraseña</Label>
              <Input
                id="new_password"
                type="password"
                value={passwordData.new_password}
                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                required
                minLength={8}
              />
            </div>
            <div>
              <Label htmlFor="confirm_password">Confirmar Nueva Contraseña</Label>
              <Input
                id="confirm_password"
                type="password"
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                required
                minLength={8}
              />
            </div>
            <Button type="submit" disabled={changePasswordMutation.isPending}>
              {changePasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cambiar Contraseña
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Schedule Tab Component
function ScheduleTab({ 
  workSchedule, 
  unavailableDays,
  loading, 
  token,
  queryClient 
}: { 
  workSchedule: WorkScheduleDay[] | undefined;
  unavailableDays: UnavailableDay[] | undefined;
  loading: boolean;
  token: string;
  queryClient: any;
}) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [newSlot, setNewSlot] = useState({ start_time: '', end_time: '' });
  const [newUnavailableDate, setNewUnavailableDate] = useState('');
  const [newUnavailableDateDisplay, setNewUnavailableDateDisplay] = useState('');

  const scheduleMap = new Map(
    (workSchedule || []).map(day => [day.day_of_week, day])
  );

  const toggleWorkingDayMutation = useMutation({
    mutationFn: async ({ day, isWorking }: { day: string; isWorking: boolean }) => {
      const response = await fetch(`${API_BASE}/work-schedule/${day}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_working_day: isWorking }),
      });
      if (!response.ok) throw new Error('Error al actualizar día');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Día actualizado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['work-schedule'] });
    },
    onError: () => {
      toast.error('Error al actualizar día');
    },
  });

  const addSlotMutation = useMutation({
    mutationFn: async ({ day, slot }: { day: string; slot: { start_time: string; end_time: string } }) => {
      const response = await fetch(`${API_BASE}/work-schedule/${day}/slots`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(slot),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al agregar horario');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('Franja horaria agregada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['work-schedule'] });
      setNewSlot({ start_time: '', end_time: '' });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al agregar franja horaria');
    },
  });

  const deleteSlotMutation = useMutation({
    mutationFn: async (slotId: number) => {
      const response = await fetch(`${API_BASE}/work-schedule/slots/${slotId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar horario');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('Franja horaria eliminada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['work-schedule'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar franja horaria');
    },
  });

  const addUnavailableDayMutation = useMutation({
    mutationFn: async (date: string) => {
      const response = await fetch(`${API_BASE}/unavailable-days`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date, is_confirmed: true }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al agregar día no laborable');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('Día no laborable agregado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['unavailable-days'] });
      setNewUnavailableDate('');
      setNewUnavailableDateDisplay('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al agregar día no laborable');
    },
  });

  const deleteUnavailableDayMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_BASE}/unavailable-days/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Error al eliminar día');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Día no laborable eliminado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['unavailable-days'] });
    },
    onError: () => {
      toast.error('Error al eliminar día no laborable');
    },
  });

  const handleAddSlot = (day: string) => {
    if (!newSlot.start_time || !newSlot.end_time) {
      toast.error('Por favor completa ambos horarios');
      return;
    }
    addSlotMutation.mutate({ day, slot: newSlot });
  };

  const handleAddUnavailableDay = () => {
    const isoDate = parseDDMMYYYYToISO(newUnavailableDateDisplay);
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
      toast.error('Por favor ingresa una fecha válida (dd/mm/aaaa)');
      return;
    }
    addUnavailableDayMutation.mutate(isoDate);
  };

  const handleUnavailableDateChange = (value: string) => {
    // Remove all non-digit characters
    const cleaned = value.replace(/[^\d]/g, '');
    
    // Format as dd/mm/yyyy
    let formatted = '';
    if (cleaned.length > 0) {
      formatted = cleaned.substring(0, 2);
      if (cleaned.length > 2) {
        formatted += '/' + cleaned.substring(2, 4);
      }
      if (cleaned.length > 4) {
        formatted += '/' + cleaned.substring(4, 8);
      }
    }
    
    setNewUnavailableDateDisplay(formatted);
    
    // Update ISO date if valid
    if (cleaned.length === 8) {
      const day = cleaned.substring(0, 2);
      const month = cleaned.substring(2, 4);
      const year = cleaned.substring(4, 8);
      if (parseInt(day) >= 1 && parseInt(day) <= 31 && 
          parseInt(month) >= 1 && parseInt(month) <= 12 && 
          parseInt(year) >= 1900) {
        setNewUnavailableDate(`${year}-${month}-${day}`);
      }
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Horarios de Trabajo</CardTitle>
          <CardDescription>Configura tus días y horarios disponibles</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {DAYS_OF_WEEK.map((day) => {
            const schedule = scheduleMap.get(day.value);
            const isWorking = schedule?.is_working_day ?? false;
            const slots = schedule?.available_slots || [];

            return (
              <Card key={day.value} className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isWorking}
                      onChange={(e) => {
                        toggleWorkingDayMutation.mutate({
                          day: day.value,
                          isWorking: e.target.checked,
                        });
                      }}
                      className="h-5 w-5"
                    />
                    <Label className="text-lg font-semibold cursor-pointer">
                      {day.label}
                    </Label>
                  </div>
                  {isWorking && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedDay(selectedDay === day.value ? null : day.value)}
                    >
                      {selectedDay === day.value ? 'Ocultar' : 'Agregar Horario'}
                    </Button>
                  )}
                </div>

                {isWorking && (
                  <>
                    {slots.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {slots.map((slot) => (
                          <div
                            key={slot.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded"
                          >
                            <span className="font-medium">
                              {formatTime24(slot.start_time)} - {formatTime24(slot.end_time)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteSlotMutation.mutate(slot.id)}
                              disabled={deleteSlotMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedDay === day.value && (
                      <div className="flex gap-2 p-3 bg-blue-50 rounded">
                        <Input
                          type="time"
                          step="60"
                          value={newSlot.start_time}
                          onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
                          className="flex-1"
                        />
                        <Input
                          type="time"
                          step="60"
                          value={newSlot.end_time}
                          onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
                          className="flex-1"
                        />
                        <Button
                          onClick={() => handleAddSlot(day.value)}
                          disabled={addSlotMutation.isPending}
                          size="sm"
                        >
                          {addSlotMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </Card>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Días No Laborables</CardTitle>
          <CardDescription>Bloquea días específicos (festivos, vacaciones)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="dd/mm/aaaa"
              value={newUnavailableDateDisplay}
              onChange={(e) => handleUnavailableDateChange(e.target.value)}
              maxLength={10}
              className="flex-1"
              onBlur={(e) => {
                const isoDate = parseDDMMYYYYToISO(e.target.value);
                if (isoDate && /^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
                  setNewUnavailableDate(isoDate);
                }
              }}
            />
            <Button
              onClick={handleAddUnavailableDay}
              disabled={addUnavailableDayMutation.isPending}
            >
              {addUnavailableDayMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Agregar
            </Button>
          </div>

          {unavailableDays && unavailableDays.length > 0 && (
            <div className="space-y-2">
              {unavailableDays.map((day) => (
                <div
                  key={day.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded"
                >
                  <span>{format(parseISO(day.date), 'dd/MM/yyyy')}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteUnavailableDayMutation.mutate(day.id)}
                    disabled={deleteUnavailableDayMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
