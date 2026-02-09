'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Building2, 
  XCircle, 
  Check, 
  Info, 
  FileText, 
  AlertTriangle,
  ArrowLeft,
  Home as HomeIcon,
  MapPin
} from 'lucide-react';
import { toast } from 'sonner';
import { AppointmentDetails } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import FooterRoot from '@/components/agendar-visita/FooterRoot';

export default function AppointmentDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const appointmentId = params.id as string;
  const token = searchParams.get('token');
  const username = params.username as string;

  const { data: appointment, isLoading, error } = useQuery<AppointmentDetails>({
    queryKey: ['appointment', appointmentId, token],
    queryFn: async () => {
      const url = token 
        ? `/api/appointments/${appointmentId}?token=${token}`
        : `/api/appointments/${appointmentId}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Error al obtener detalles de la cita');
      }
      return response.json();
    },
    enabled: !!appointmentId,
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/appointments/${appointmentId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token || '',
          cancelled_by: 'patient',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al cancelar la cita');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', appointmentId] });
      toast.success('Cita cancelada exitosamente');
      router.push(`/${username}/agendar-visita`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al cancelar la cita');
    },
  });

  const handleCancel = () => {
    if (confirm('¿Estás seguro de que deseas cancelar esta cita?')) {
      cancelMutation.mutate();
    }
  };

  const handleGoHome = () => {
    router.push(`/${username}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fff3f0] to-[#e8d4cd] flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#9e7162]" />
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fff3f0] to-[#e8d4cd] flex flex-col">
        <header className="w-full mb-2 p-2">
          <button
            onClick={handleGoHome}
            className="absolute top-10 left-5 md:static md:left-10 flex items-center gap-2 md:px-4 md:py-2 bg-[#a97f7] text-white rounded-lg hover:bg-[#8a6f6] transition-colors duration-200 text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Inicio</span>
            <HomeIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center bg-white/80 backdrop-blur-md rounded-lg p-8 shadow-lg max-w-md">
            <Alert variant="destructive">
              <AlertDescription>
                {error ? 'Error al cargar los detalles de la cita' : 'Cita no encontrada'}
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => router.push(`/${username}/agendar-visita`)}
              className="mt-4 bg-gradient-to-r from-[#ba8c84] to-[#9e7162] hover:from-[#9e7162] hover:to-[#ba8c84] text-white"
            >
              Volver a agendar
            </Button>
          </div>
        </div>
        <FooterRoot />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-green-500">Programada</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500">Completada</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Función para formatear fecha sin problemas de zona horaria
  // appointment_date viene como string "YYYY-MM-DD" desde el API
  const formatDateWithoutTimezone = (dateString: string): string => {
    if (!dateString) return dateString;
    
    // Parsear la fecha como fecha local (no UTC) para evitar problemas de zona horaria
    const [year, month, day] = dateString.split('-').map(Number);
    const localDate = new Date(year, month - 1, day); // month es 0-indexed en Date
    
    return format(localDate, "dd 'de' MMMM 'de' yyyy", { locale: es });
  };

  const formattedDate = appointment.appointment_date 
    ? formatDateWithoutTimezone(appointment.appointment_date)
    : appointment.appointment_date;

  // Mostrar mensaje de seña cuando aplica: práctica particular o consulta primera vez
  const requiresDeposit35000 = appointment.visit_type_name === 'Practica' && appointment.health_insurance === 'Practica Particular';
  const requiresDeposit20000 = appointment.visit_type_name === 'Consulta' && appointment.consult_type_name === 'Primera vez';
  const showDepositMessage = requiresDeposit35000 || requiresDeposit20000;
  const depositAmount = requiresDeposit35000 ? '$35.000' : '$20.000';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fff3f0] to-[#e8d4cd] flex flex-col">
      {/* Header */}
      <header className="w-full mb-2 p-2">
        <button
          onClick={handleGoHome}
          className="absolute top-10 left-5 md:static md:left-10 flex items-center gap-2 md:px-4 md:py-2 bg-[#a97f7] text-white rounded-lg hover:bg-[#8a6f6] transition-colors duration-200 text-sm sm:text-base z-10"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Inicio</span>
          <HomeIcon className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-6xl w-full bg-white/80 backdrop-blur-md rounded-lg shadow-lg p-4 sm:p-6">
          {/* Success Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              {appointment.status === 'scheduled' ? (
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                  <Check className="h-6 w-6 text-white" />
                </div>
              ) : appointment.status === 'cancelled' ? (
                <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center shadow-lg">
                  <XCircle className="h-6 w-6 text-white" />
                </div>
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                  <Check className="h-6 w-6 text-white" />
                </div>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#9e7162] mb-1">
              {appointment.status === 'scheduled' 
                ? 'Cita Confirmada' 
                : appointment.status === 'cancelled'
                ? 'Cita Cancelada'
                : 'Detalles de la Cita'}
            </h1>
            <div className="flex justify-center mt-2">
              {getStatusBadge(appointment.status)}
            </div>
            <p className="text-[#ba8c84] text-sm sm:text-base mt-2">
              {appointment.status === 'scheduled' 
                ? 'Su cita ha sido confirmada. Por favor revise los detalles a continuación.'
                : 'Información de su cita médica'}
            </p>
          </div>

          <div className="grid gap-4">
            {/* Appointment Details */}
            <div className="bg-white/60 rounded-lg p-4 shadow-md">
              <h2 className="text-lg font-semibold text-[#9e7162] mb-3 flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                Detalles de la Cita
              </h2>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-start border-b border-[#ba8c84]/20 pb-1">
                  <span className="font-medium text-[#ba8c84]">Paciente:</span>
                  <span className="text-[#9e7162] font-semibold text-right">{appointment.patient_name}</span>
                </div>
                
                <div className="flex justify-between items-start border-b border-[#ba8c84]/20 pb-1">
                  <span className="font-medium text-[#ba8c84]">Teléfono:</span>
                  <span className="text-[#9e7162] font-semibold text-right">{appointment.phone_number}</span>
                </div>
                
                <div className="flex justify-between items-start border-b border-[#ba8c84]/20 pb-1">
                  <span className="font-medium text-[#ba8c84]">Tipo de visita:</span>
                  <span className="text-[#9e7162] font-semibold text-right">{appointment.visit_type_name}</span>
                </div>

                {appointment.visit_type_name === "Practica" && appointment.practice_type_name && (
                  <div className="flex justify-between items-start border-b border-[#ba8c84]/20 pb-1">
                    <span className="font-medium text-[#ba8c84]">Tipo de práctica:</span>
                    <span className="text-[#9e7162] font-semibold text-right">{appointment.practice_type_name}</span>
                  </div>
                )}

                {appointment.visit_type_name === "Consulta" && appointment.consult_type_name && (
                  <div className="flex justify-between items-start border-b border-[#ba8c84]/20 pb-1">
                    <span className="font-medium text-[#ba8c84]">Tipo de consulta:</span>
                    <span className="text-[#9e7162] font-semibold text-right">{appointment.consult_type_name}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-start border-b border-[#ba8c84]/20 pb-1">
                  <span className="font-medium text-[#ba8c84]">Fecha:</span>
                  <span className="text-[#9e7162] font-semibold text-right">{formattedDate}</span>
                </div>
                
                <div className="flex justify-between items-start border-b border-[#ba8c84]/20 pb-1">
                  <span className="font-medium text-[#ba8c84]">Horario:</span>
                  <span className="text-[#9e7162] font-semibold text-right">{appointment.appointment_time}</span>
                </div>
                
                <div className="flex justify-between items-start border-b border-[#ba8c84]/20 pb-1">
                  <span className="font-medium text-[#ba8c84]">Obra Social:</span>
                  <span className="text-[#9e7162] font-semibold text-right">{appointment.health_insurance}</span>
                </div>
              </div>
            </div>

            {/* Mensaje de seña para confirmar cita (práctica particular o consulta primera vez) */}
            {showDepositMessage && appointment.status === 'scheduled' && (
              <div className="bg-amber-50 border-l-4 border-amber-500 rounded-r-lg p-4 shadow-md">
                <h3 className="font-semibold text-amber-900 mb-2 flex items-center">
                  <Info className="w-5 h-5 mr-2 text-amber-600" />
                  Abonar seña para confirmar la cita
                </h3>
                <p className="text-amber-800 text-sm mb-3">
                  Para confirmar la cita por completo debe abonar una seña de {depositAmount} por transferencia.
                </p>
                <p className="text-black font-medium text-sm">
                  CBU / Alias: <span className="font-semibold text-amber-900">maraflamini</span>
                </p>
              </div>
            )}

            {/* Important Information */}
            <div className="bg-white/60 rounded-lg p-4 sm:p-6 shadow-md text-black">
              <h2 className="text-xl font-semibold text-[#9e7162] mb-6 flex items-center">
                <Info className="w-5 h-5 mr-2" />
                Información Importante
              </h2>
              
              {/* General Guidelines */}
              <div className="space-y-4 mb-6">
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                  <h3 className="font-semibold text-blue-800 text-sm mb-2 flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    Llegue 15 minutos antes
                  </h3>
                  <p className="text-blue-700 text-sm">Para completar la documentación necesaria.</p>
                </div>
                
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                  <h3 className="font-semibold text-yellow-800 text-sm mb-2 flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    Documentación requerida
                  </h3>
                  <ul className="text-yellow-700 text-sm space-y-1">
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>CONSULTA: Una orden de consulta ó credencial según corresponda con su obra social + coseguro por el uso del dermatoscopio.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>PRACTICA:                       <span>PRACTICA: IAPOS 20 bonos + coseguro, UNL + coseguro, resto de obras sociales según convenio (previamente autorizado o solo firma en dorso).</span>.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Estudios previos relacionados</span>
                    </li>
                  </ul>
                </div>
                
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                  <h3 className="font-semibold text-red-800 text-sm mb-2 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Cancelación
                  </h3>
                  <p className="text-red-700 text-sm">
                    {appointment.can_cancel 
                      ? 'Si necesita cancelar, hágalo con al menos 24 horas de anticipación. Respete que quizás otro paciente necesite un turno más cercano y el tiempo del profesional.'
                      : 'Esta cita no puede cancelarse porque faltan menos de 24 horas para el horario programado.'}
                  </p>
                </div>
              </div>

              {/* Service Types */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-[#9e7162] mb-4">Tipos de Servicios</h3>
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">CONSULTA</h4>
                    <p className="text-sm text-gray-700 mb-2">Consulta de Dermatología clínica y estética.</p>
                    <div className="bg-blue-50 p-3 rounded">
                      <h5 className="font-medium text-blue-800 text-sm mb-1">Qué tiene que traer?</h5>
                      <p className="text-sm text-blue-700">Una orden de consulta ó credencial según corresponda con su obra social más el coseguro por el uso del dermatoscopio, el cual se utiliza para el diagnóstico de múltiples patologías, control de nevos y seguimiento de los mismos. Dicho aparato no está nomenclado por obra social.</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">PRÁCTICA</h4>
                    <p className="text-sm text-gray-700 mb-2">Pacientes que ya tuvieron una consulta previa y requieren de biopsia, criocirugía o electrocoagulación de lesiones. No es un turno de consulta.</p>
                    <div className="bg-green-50 p-3 rounded">
                      <h5 className="font-medium text-green-800 text-sm mb-1">Qué tiene que traer?</h5>
                      <p className="text-sm text-green-700">IAPOS 18 bonos + coseguro, resto de obras sociales según convenio (previamente autorizado o solo firma en dorso).</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-[#9e7162] mb-3 flex items-center">
                  <Phone className="w-5 h-5 mr-2" />
                  Contacto
                </h3>
                <p className="text-sm text-gray-700 mb-3">Para cualquier inconveniente a la hora de tomar el turno o duda mandar WhatsApp a las secretarias:</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-white/60 p-3 rounded">
                    <span className="font-medium text-gray-800 text-sm">Clínica María del Rosario:</span>
                    <span className="text-green-600 font-semibold text-sm">342-439-3149</span>
                  </div>
                  <div className="flex items-center justify-between bg-white/60 p-3 rounded">
                    <span className="font-medium text-gray-800 text-sm">Clínica de Recreo:</span>
                    <span className="text-green-600 font-semibold text-sm">342-582-2437</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cancellation Section */}
            {appointment.status === 'scheduled' && appointment.can_cancel && (
              <div className="bg-white/60 rounded-lg p-4 shadow-md">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h3 className="text-sm font-semibold text-yellow-800 mb-2 flex items-center">
                    <XCircle className="w-4 h-4 mr-2" />
                    ¿Necesita cancelar su cita?
                  </h3>
                  <p className="text-sm text-yellow-700 mb-3">
                    Puede cancelar esta cita hasta 24 horas antes del horario programado.
                  </p>
                  <Button
                    variant="destructive"
                    className="w-full border-red-300 text-white hover:bg-red-600 px-4 py-2 rounded-full transition-all duration-300 font-semibold text-sm"
                    onClick={handleCancel}
                    disabled={cancelMutation.isPending}
                  >
                    {cancelMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Cancelando...
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Cancelar Cita
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {appointment.status === 'scheduled' && !appointment.can_cancel && (
              <div className="bg-white/60 rounded-lg p-4 shadow-md">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Esta cita no puede cancelarse porque faltan menos de 24 horas para el horario programado.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Action Buttons */}
            <div className="bg-white/60 rounded-lg p-4 shadow-md">
              <div className="space-y-2">
                <Button
                  onClick={() => router.push(`/${username}/agendar-visita`)}
                  className="w-full bg-gradient-to-r from-[#ba8c84] to-[#9e7162] hover:from-[#9e7162] hover:to-[#ba8c84] text-white px-4 py-2 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 font-semibold text-sm"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Agendar Otra Cita
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleGoHome}
                  className="w-full border-[#ba8c84] text-[#9e7162] hover:bg-[#ba8c84] hover:text-white px-4 py-2 rounded-full transition-all duration-300 font-semibold text-sm"
                >
                  <HomeIcon className="w-4 h-4 mr-2" />
                  Volver al Inicio
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <FooterRoot />
    </div>
  );
}
