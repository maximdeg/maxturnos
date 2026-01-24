'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AvailableTimesComponentImproved from './AvailableTimesComponentImproved';
import { formatDate, isValidPhoneNumber, cleanPhoneNumber } from '@/lib/utils';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const formSchema = z.object({
  first_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  last_name: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  phone_number: z.string()
    .min(8, 'El teléfono debe tener al menos 8 dígitos')
    .max(12, 'El teléfono no puede tener más de 12 dígitos')
    .regex(/^[0-9]+$/, 'Solo se permiten números')
    .refine((phone) => {
      // Validar que tenga entre 8 y 12 dígitos (formato argentino sin código de país)
      const cleaned = phone.replace(/[^0-9]/g, '');
      return cleaned.length >= 8 && cleaned.length <= 12;
    }, 'Debe ser un número válido (8-12 dígitos)'),
  visit_type: z.string()
    .refine((val) => val === '1' || val === '2', 'Tipo de visita inválido')
    .optional()
    .or(z.literal('1').or(z.literal('2'))),
  consult_type: z.string().optional(),
  practice_type: z.string().optional(),
  health_insurance: z.string().min(1, 'Debes seleccionar una obra social'),
  appointment_date: z.date({
    required_error: 'Debes seleccionar una fecha',
  }).refine((date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  }, 'No puedes seleccionar una fecha pasada')
    .refine((date) => {
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 31);
      return date <= maxDate;
    }, 'La fecha no puede ser más de 30 días en el futuro'),
  appointment_time: z.string()
    .min(1, 'Debes seleccionar un horario')
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido'),
  notes: z.string().optional(),
}).refine((data) => {
  if (data.visit_type === '1') {
    return data.consult_type !== undefined && data.consult_type !== '';
  }
  return true;
}, {
  message: 'Debes seleccionar un tipo de consulta',
  path: ['consult_type'],
}).refine((data) => {
  if (data.visit_type === '2') {
    return data.practice_type !== undefined && data.practice_type !== '';
  }
  return true;
}, {
  message: 'Debes seleccionar un tipo de práctica',
  path: ['practice_type'],
});

type FormData = z.infer<typeof formSchema>;

interface AppointmentFormProps {
  userAccountId: number;
  username: string;
}

export default function AppointmentForm({ userAccountId, username }: AppointmentFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      phone_number: '',
      visit_type: undefined as '1' | '2' | undefined,
      consult_type: undefined,
      practice_type: undefined,
      health_insurance: '',
      appointment_date: undefined,
      appointment_time: '',
      notes: '',
    },
  });

  const visitType = form.watch('visit_type');

  // Obtener obras sociales
  const { data: healthInsurances = [] } = useQuery({
    queryKey: ['health-insurance'],
    queryFn: async () => {
      const response = await fetch('/api/health-insurance');
      if (!response.ok) throw new Error('Error al cargar obras sociales');
      return response.json();
    },
  });

  // Obtener horario de trabajo del proveedor
  const { data: workSchedule } = useQuery({
    queryKey: ['work-schedule', username],
    queryFn: async () => {
      const response = await fetch(`/api/provider/${username}/work-schedule`);
      if (!response.ok) throw new Error('Error al cargar horario de trabajo');
      return response.json();
    },
  });

  // Filtrar obras sociales según tipo de visita
  const filteredHealthInsurances = healthInsurances.filter((insurance: any) => {
    if (visitType === '1') {
      // Consulta: excluir "Practica Particular"
      return insurance.name !== 'Practica Particular';
    } else if (visitType === '2') {
      // Práctica: excluir "Particular"
      return insurance.name !== 'Particular';
    }
    return true;
  });

  // Función para deshabilitar días en el calendario
  const isDateDisabled = (date: Date): boolean => {
    // Normalizar fechas a medianoche en hora local para comparación correcta
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dateCopy = new Date(date);
    dateCopy.setHours(0, 0, 0, 0);
    
    // Deshabilitar fechas pasadas (comparar solo fecha, no hora)
    if (dateCopy < today) {
      return true;
    }

    // Deshabilitar fechas más de 30 días en el futuro
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 31);
    maxDate.setHours(0, 0, 0, 0);
    if (dateCopy > maxDate) {
      return true;
    }

    // Si no hay workSchedule, permitir todos los días habilitados por fecha
    if (!workSchedule) {
      return false;
    }

    // Si workingDays está vacío o no existe, permitir todos los días
    if (!workSchedule.workingDays || workSchedule.workingDays.length === 0) {
      // Solo verificar fechas no disponibles y festivos
      const dateString = formatDate(dateCopy);
      
      // Deshabilitar fechas no disponibles
      if (workSchedule.unavailableDates && workSchedule.unavailableDates.includes(dateString)) {
        return true;
      }

      // Deshabilitar días festivos hardcodeados
      const currentYear = dateCopy.getFullYear();
      const holidays = [
        `${currentYear}-01-01`, // Año Nuevo
        `${currentYear}-12-25`, // Navidad
      ];
      if (holidays.includes(dateString)) {
        return true;
      }

      return false;
    }

    // Deshabilitar días no laborables
    const dayOfWeek = dateCopy.getDay();
    if (!workSchedule.workingDays.includes(dayOfWeek)) {
      return true;
    }

    // Deshabilitar fechas no disponibles
    const dateString = formatDate(dateCopy);
    if (workSchedule.unavailableDates && workSchedule.unavailableDates.includes(dateString)) {
      return true;
    }

    // Deshabilitar días festivos hardcodeados
    const currentYear = dateCopy.getFullYear();
    const holidays = [
      `${currentYear}-01-01`, // Año Nuevo
      `${currentYear}-12-25`, // Navidad
    ];
    if (holidays.includes(dateString)) {
      return true;
    }

    return false;
  };

  // Mutación para crear cita
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch('/api/appointments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: data.first_name,
          last_name: data.last_name,
          phone_number: cleanPhoneNumber(data.phone_number),
          visit_type_id: parseInt(data.visit_type!),
          consult_type_id: data.visit_type === '1' ? parseInt(data.consult_type!) : null,
          practice_type_id: data.visit_type === '2' ? parseInt(data.practice_type!) : null,
          health_insurance: data.health_insurance,
          appointment_date: formatDate(data.appointment_date),
          appointment_time: data.appointment_time,
          user_account_id: userAccountId,
          notes: data.notes,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear la cita');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidar caché de horarios disponibles
      queryClient.invalidateQueries({ queryKey: ['available-times'] });
      
      toast.success('Cita creada exitosamente');
      
      // Redirigir a página de detalles
      router.push(`/${username}/cita/${data.appointment_info.id}?token=${data.appointment_info.cancellation_token}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al crear la cita');
    },
  });

  const onSubmit = (data: FormData) => {
    createAppointmentMutation.mutate(data);
  };

  // Resetear hora cuando cambia la fecha
  useEffect(() => {
    if (selectedDate) {
      form.setValue('appointment_time', '');
    }
  }, [selectedDate, form]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Agendar Visita</CardTitle>
        <CardDescription>Completa el formulario para reservar tu cita</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Información del Paciente */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Información del Paciente</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Ingresa tu nombre" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellido</FormLabel>
                      <FormControl>
                        <Input placeholder="Ingresa tu apellido" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <div className="flex items-center px-3 py-2 border border-input bg-background rounded-l-md border-r-0 text-sm text-muted-foreground">
                          +54
                        </div>
                        <Input 
                          placeholder="3421234567" 
                          className="rounded-l-none"
                          {...field}
                          onChange={(e) => {
                            // Solo permitir números
                            const value = e.target.value.replace(/[^0-9]/g, '');
                            // Actualizar el campo con el valor limpio
                            field.onChange(value);
                          }}
                          value={field.value}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Ingresa tu número sin el código de país (Argentina +54)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Tipo de Visita */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Tipo de Visita</h3>
              
              <FormField
                control={form.control}
                name="visit_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Visita</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">Consulta</SelectItem>
                        <SelectItem value="2">Práctica</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tipo de Consulta (solo si visit_type = 1) */}
              {visitType === '1' && (
                <FormField
                  control={form.control}
                  name="consult_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Consulta</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">Primera vez</SelectItem>
                          <SelectItem value="2">Seguimiento</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Tipo de Práctica (solo si visit_type = 2) */}
              {visitType === '2' && (
                <FormField
                  control={form.control}
                  name="practice_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Práctica</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">Criocirugía</SelectItem>
                          <SelectItem value="2">Electrocoagulación</SelectItem>
                          <SelectItem value="3">Biopsia</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Obra Social */}
            <FormField
              control={form.control}
              name="health_insurance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Obra Social</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={!visitType}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una obra social" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredHealthInsurances.map((insurance: any) => (
                        <SelectItem key={insurance.id || insurance.name} value={insurance.name}>
                          {insurance.name} {insurance.price && `- ${insurance.price}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fecha */}
            <FormField
              control={form.control}
              name="appointment_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha</FormLabel>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full pl-3 text-left font-normal"
                        >
                          {field.value ? (
                            format(field.value, 'PPP', { locale: es })
                          ) : (
                            <span>Selecciona una fecha</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent 
                      className="w-auto p-0" 
                      align="start"
                      onInteractOutside={(e) => {
                        // No prevenir el comportamiento por defecto para permitir clicks
                      }}
                    >
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          console.log('onSelect called with date:', date);
                          field.onChange(date);
                          setSelectedDate(date ?? null);
                          setCalendarOpen(false);
                        }}
                        onDayClick={(day, modifiers, e) => {
                          console.log('onDayClick called:', { day, modifiers, event: e });
                          e?.preventDefault();
                          e?.stopPropagation();
                          if (!modifiers.disabled && !modifiers.outside) {
                            const date = day;
                            console.log('Calling onChange manually with:', date);
                            field.onChange(date);
                            setSelectedDate(date);
                            setCalendarOpen(false);
                          }
                        }}
                        disabled={isDateDisabled}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Hora */}
            {selectedDate && (
              <FormField
                control={form.control}
                name="appointment_time"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <AvailableTimesComponentImproved
                        userAccountId={userAccountId}
                        selectedDate={selectedDate}
                        onTimeSelect={field.onChange}
                        selectedTime={field.value}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Notas (opcional) */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Información adicional..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Botón de envío */}
            <Button 
              type="submit" 
              className="w-full"
              disabled={createAppointmentMutation.isPending}
            >
              {createAppointmentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando cita...
                </>
              ) : (
                'Confirmar Cita'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
