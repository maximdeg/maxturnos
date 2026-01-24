"use client";

import { useSearchParams } from "next/navigation";
import { Check, ArrowLeft, Home as HomeIcon, Calendar, MapPin, Phone, Info, Clock, FileText, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FooterRoot from "@/components/agendar-visita/FooterRoot";
import { generateCancellationUrl, getCancellationExpirationTime } from "@/lib/cancellation-token";

const ConfirmationPage = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    
    const patientName = searchParams.get("patient_name");
    const phoneNumber = searchParams.get("phone_number");
    const visitTypeName = searchParams.get("visit_type_name");
    const consultTypeName = searchParams.get("consult_type_name");
    const appointmentDate = searchParams.get("appointment_date");
    const appointmentTime = searchParams.get("appointment_time");
    const appointmentId = searchParams.get("appointment_id");
    const practiceTypeName = searchParams.get("practice_type_name");
    const cancellationToken = searchParams.get("cancellation_token");

    const handleGoHome = () => {
        router.push("/");
    };

    if (!patientName || !appointmentDate || !appointmentTime) {
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
                        <h1 className="text-2xl font-bold text-[#9e7162] mb-4">Información no encontrada</h1>
                        <p className="text-[#ba8c84] mb-6">No se pudo encontrar la información de la cita.</p>
                        <Link href="/agendar-visita">
                            <Button 
                                className="bg-gradient-to-r from-[#ba8c84] to-[#9e7162] hover:from-[#9e7162] hover:to-[#ba8c84] text-white px-8 py-3 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 font-semibold"
                            >
                                Volver a agendar
                            </Button>
                        </Link>
                    </div>
                </div>
                
                <FooterRoot />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#fff3f0] to-[#e8d4cd] flex flex-col">
            {/* Header */}
            <header className="w-full mb-2 p-2">
                <button
                    onClick={handleGoHome}
                    className="absolute top-10 left-5 md:static md:left-10 flex items-center gap-2 md:px-4 md:py-2 bg-[#a97f7] text-white rounded-lg hover:bg-[#8a6f6] transition-colors duration-200 text-sm sm:text-base"
                >
                    <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline">Inicio</span>
                    <HomeIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <div className="text-center flex-1 text-[#9e7162]">
                    <h1 className="text-2xl lg:text-4xl font-bold">Dra. Mara Flamini</h1>
                    <h2 className="lg:text-xl text-md">Consultorio dermatológico</h2>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="max-w-6xl w-full bg-white/80 backdrop-blur-md rounded-lg shadow-lg p-6">
                    {/* Success Header */}
                    <div className="text-center mb-6">
                        <div className="flex justify-center mb-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                                <Check className="h-6 w-6 text-white" />
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold text-[#9e7162] mb-1">
                            ¡Cita Agendada con Éxito!
                        </h1>
                        <p className="text-[#ba8c84] text-base">
                            Su cita ha sido confirmada. Por favor revise los detalles a continuación.
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
                                    <span className="text-[#9e7162] font-semibold text-right">{patientName}</span>
                                </div>
                                
                                <div className="flex justify-between items-start border-b border-[#ba8c84]/20 pb-1">
                                    <span className="font-medium text-[#ba8c84]">Teléfono:</span>
                                    <span className="text-[#9e7162] font-semibold text-right">{phoneNumber}</span>
                                </div>
                                
                                <div className="flex justify-between items-start border-b border-[#ba8c84]/20 pb-1">
                                    <span className="font-medium text-[#ba8c84]">Tipo de visita:</span>
                                    <span className="text-[#9e7162] font-semibold text-right">{visitTypeName}</span>
                                </div>

                                {visitTypeName === "Practica" && (
                                    <div className="flex justify-between items-start border-b border-[#ba8c84]/20 pb-1">
                                        <span className="font-medium text-[#ba8c84]">Tipo de practica:</span>
                                        <span className="text-[#9e7162] font-semibold text-right">{practiceTypeName}</span>
                                    </div>
                                )}

                                {visitTypeName === "Consulta" && (
                                    <div className="flex justify-between items-start border-b border-[#ba8c84]/20 pb-1">
                                        <span className="font-medium text-[#ba8c84]">Tipo de consulta:</span>
                                        <span className="text-[#9e7162] font-semibold text-right">{consultTypeName}</span>
                                    </div>
                                )}
                                
                                
                                <div className="flex justify-between items-start border-b border-[#ba8c84]/20 pb-1">
                                    <span className="font-medium text-[#ba8c84]">Fecha:</span>
                                    <span className="text-[#9e7162] font-semibold text-right">
                                        {format(new Date(appointmentDate), "dd/MM/yyyy", { locale: es })}
                                    </span>
                                </div>
                                
                                <div className="flex justify-between items-start border-b border-[#ba8c84]/20 pb-1">
                                    <span className="font-medium text-[#ba8c84]">Horario:</span>
                                    <span className="text-[#9e7162] font-semibold text-right">{appointmentTime}</span>
                                </div>
                                
                                {appointmentId && (
                                    <div className="flex justify-between items-start border-b border-[#ba8c84]/20 pb-1">
                                        <span className="font-medium text-[#ba8c84]">ID de cita:</span>
                                        <span className="text-[#9e7162] font-semibold text-right">{appointmentId}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Important Information */}
                        <div className="bg-white/60 rounded-lg p-6 shadow-md text-black">
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
                                            <span>PRACTICA: IAPOS 20 bonos + coseguro, UNL + coseguro, resto de obras sociales según convenio (previamente autorizado o solo firma en dorso).</span>
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
                                    <p className="text-red-700 text-sm">Si necesita cancelar, hágalo con al menos 24 horas de anticipación. Respete que quizás otro paciente necesite un turno más cercano y el tiempo del profesional.</p>
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
                                            <p className="text-sm text-green-700">IAPOS 20 bonos + coseguro, UNL + coseguro, resto de obras sociales según convenio (previamente autorizado o solo firma en dorso).</p>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h4 className="font-semibold text-gray-800 mb-2">URGENCIAS</h4>
                                        <p className="text-sm text-gray-700 mb-2">Turnos para casos donde se necesita atención pronta, estos turnos son únicamente particular no por obra social.</p>
                                        <div className="bg-orange-50 p-3 rounded">
                                            <p className="text-sm text-orange-700 font-medium">Turnos URGENCIAS únicamente particular.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Aesthetic Treatments */}
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-[#9e7162] mb-4">Tratamientos Estéticos</h3>
                                <div className="bg-purple-50 p-4 rounded-lg">
                                    <p className="text-sm text-purple-800 mb-3">Consultar con la profesional otros tratamientos estéticos por costos, días y horarios:</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <div className="flex items-center">
                                            <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                                            <span className="text-sm text-purple-700">Toxina botulínica</span>
                                        </div>
                                        <div className="flex items-center">
                                            <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                                            <span className="text-sm text-purple-700">Dermapen</span>
                                        </div>
                                        <div className="flex items-center">
                                            <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                                            <span className="text-sm text-purple-700">Rellenos</span>
                                        </div>
                                        <div className="flex items-center">
                                            <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                                            <span className="text-sm text-purple-700">Plasma rico en plaquetas</span>
                                        </div>
                                        <div className="flex items-center">
                                            <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                                            <span className="text-sm text-purple-700">Skinbooster</span>
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
                                        <span className="font-medium text-gray-800">Clínica María del Rosario:</span>
                                        <span className="text-green-600 font-semibold">342-439-3149</span>
                                    </div>
                                    <div className="flex items-center justify-between bg-white/60 p-3 rounded">
                                        <span className="font-medium text-gray-800">Clínica de Recreo:</span>
                                        <span className="text-green-600 font-semibold">342-582-2437</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contact Information */}
                        <div className="bg-white/60 rounded-lg p-4 shadow-md">
                            <h2 className="text-lg font-semibold text-[#9e7162] mb-3 flex items-center">
                                <MapPin className="w-4 h-4 mr-2" />
                                Información de Contacto
                            </h2>
                            
                            <div className="space-y-3">
                                <div className="flex items-center space-x-3">
                                    <MapPin className="w-4 h-4 text-[#ba8c84] flex-shrink-0" />
                                    <div>
                                        <p className="font-medium text-[#9e7162] text-sm">Dirección</p>
                                        <p className="text-[#ba8c84] text-xs">Consultorio Dermatológico</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center space-x-3">
                                    <Phone className="w-4 h-4 text-[#ba8c84] flex-shrink-0" />
                                    <div>
                                        <p className="font-medium text-[#9e7162] text-sm">Teléfono</p>
                                        <p className="text-[#ba8c84] text-xs">+54 9 342 123-4567</p>
                                    </div>
                                </div>
                            </div>

                            {/* Cancellation Link */}
                            {cancellationToken && (
                                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <h3 className="text-sm font-semibold text-yellow-800 mb-2 flex items-center">
                                        <X className="w-4 h-4 mr-2" />
                                        ¿Necesita cancelar su cita?
                                    </h3>
                                    <p className="text-sm text-yellow-700 mb-3">
                                        Si necesita cancelar su cita, puede hacerlo usando el siguiente enlace seguro:
                                    </p>
                                    <a 
                                        href={`/cancelar-cita?token=${encodeURIComponent(cancellationToken)}`}
                                        className="inline-block"
                                    >
                                        <Button 
                                            variant="outline"
                                            className="w-full border-red-300 text-red-700 hover:bg-red-50 px-4 py-2 rounded-full transition-all duration-300 font-semibold text-sm"
                                        >
                                                                                    <X className="w-4 h-4 mr-2" />
                                        Cancelar Cita
                                    </Button>
                                </a>
                                    <p className="text-xs text-yellow-600 mt-2">
                                        Este enlace es válido hasta 12 horas antes de su cita y es único para su cita.
                                    </p>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="mt-4 space-y-2">
                                <Link href="/agendar-visita" className="block">
                                    <Button 
                                        className="w-full bg-gradient-to-r from-[#ba8c84] to-[#9e7162] hover:from-[#9e7162] hover:to-[#ba8c84] text-white px-4 py-2 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 font-semibold text-sm"
                                    >
                                        <Calendar className="w-4 h-4 mr-2" />
                                        Agendar Otra Cita
                                    </Button>
                                </Link>
                                
                                <Link href="/" className="block">
                                    <Button 
                                        variant="outline"
                                        className="w-full border-[#ba8c84] text-[#9e7162] hover:bg-[#ba8c84] hover:text-white px-4 py-2 rounded-full transition-all duration-300 font-semibold text-sm"
                                    >
                                        <HomeIcon className="w-4 h-4 mr-2" />
                                        Volver al Inicio
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <FooterRoot />
        </div>
    );
};

export default ConfirmationPage; 