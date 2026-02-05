"use client";

import { useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Calendar, Clock, MapPin, Phone, Star, ArrowRight, Shield, Users, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import FooterRoot from "@/components/agendar-visita/FooterRoot";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Link from "next/link";

interface ProviderPageClientProps {
  provider: {
    id: number;
    username: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    whatsapp_phone_number: string | null;
    email_verified: boolean;
    created_at: Date | string;
  };
  username: string;
}

export default function ProviderPageClient({ provider, username }: ProviderPageClientProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        retry: 1,
      },
    },
  }));

  const [isVisible, setIsVisible] = useState(false);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 300], [0, 100]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const services = [
    {
      icon: Shield,
      title: "Dermatología General",
      description: "Diagnóstico y tratamiento de enfermedades de la piel, cabello y uñas."
    },
    {
      icon: Users,
      title: "Dermatología Estética",
      description: "Tratamientos para mejorar la apariencia y salud de tu piel."
    },
    {
      icon: Award,
      title: "Cirugía Dermatológica",
      description: "Procedimientos quirúrgicos especializados en dermatología."
    }
  ];

  // Construir nombre completo del proveedor
  const fullName = provider.first_name && provider.last_name 
    ? `${provider.first_name} ${provider.last_name}`
    : provider.first_name || provider.username || "Proveedor";
  
  // Obtener inicial para el avatar
  const initial = provider.first_name 
    ? provider.first_name.charAt(0).toUpperCase()
    : provider.username?.charAt(0).toUpperCase() || "P";

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gradient-to-br from-[#fff3f0] to-[#e8d4cd]">
        {/* Header */}
        <motion.header 
          className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#ba8c84]/20"
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="container mx-auto px-6 py-4 flex justify-between items-center">
            <motion.div 
              className="flex items-center space-x-3"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-[#ba8c84] to-[#9e7162] rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">{initial}</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#9e7162]">{fullName}</h1>
                <p className="text-sm text-[#ba8c84]">Dermatóloga</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Link href={`/${username}/agendar-visita`}>
                <Button 
                  className="bg-gradient-to-r from-[#ba8c84] to-[#9e7162] hover:from-[#9e7162] hover:to-[#ba8c84] text-white px-8 py-3 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 font-semibold"
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  Agendar visita
                </Button>
              </Link>
            </motion.div>
          </div>
        </motion.header>

        {/* Hero Section */}
        <section className="min-h-screen flex items-center pt-32 pb-20 px-6 md:px-5 lg:px-1 max-w-9xl mx-auto">
          <div className="w-full">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Column - Image */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="order-2 lg:order-1 relative max-h-[calc(100vh-12rem)]"
              >
                <div className="relative w-full h-[min(500px,calc(100vh-12rem))] max-h-[calc(100vh-12rem)] overflow-hidden rounded-lg">
                  <img
                    src="/images/maraflaminipic.jpg" 
                    width="500" 
                    height="400"
                    alt="Dermatología"
                    className="rounded-lg w-full h-full object-cover object-center"
                    onError={(e) => {
                      // Si la imagen falla, usar un placeholder
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&size=500&background=ba8c84&color=fff`;
                    }}
                  />
                  {/* Fade to right overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#f7e8e4] pointer-events-none"></div>
                </div>
              </motion.div>

              {/* Right Column - Text Content */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="order-1 lg:order-2 text-center lg:text-left md:ml-10"
              >
                <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-[#9e7162] mb-6 leading-tight">
                  Tu Piel, Nuestra
                  <span className="block text-[#ba8c84]">Especialidad</span>
                </h1>
                <p className="text-xl text-[#ba8c84] mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                  Cuidamos de la salud y belleza de tu piel con la más alta tecnología y experiencia médica especializada.
                </p>
                
                <motion.div 
                  className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center lg:items-start"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Link href={`/${username}/agendar-visita`}>
                    <Button 
                      size="lg"
                      className="bg-gradient-to-r from-[#ba8c84] to-[#9e7162] hover:from-[#9e7162] hover:to-[#ba8c84] text-white px-10 py-4 rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 text-lg font-semibold"
                    >
                      <Calendar className="w-6 h-6 mr-3" />
                      Agendar visita
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section className="py-20 px-6 bg-white/50">
          <div className="container mx-auto">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-bold text-[#9e7162] mb-4">Nuestros Servicios</h2>
              <p className="text-lg text-[#ba8c84] max-w-2xl mx-auto">
                Ofrecemos una amplia gama de servicios dermatológicos con la más alta calidad y tecnología.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {services.map((service, index) => (
                <motion.div
                  key={index}
                  className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  viewport={{ once: true }}
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-[#e8d4cd] to-[#ba8c84] rounded-full flex items-center justify-center mb-6">
                    <service.icon className="w-8 h-8 text-[#9e7162]" />
                  </div>
                  <h3 className="text-xl font-bold text-[#9e7162] mb-4">{service.title}</h3>
                  <p className="text-[#ba8c84] leading-relaxed">{service.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-6">
          <div className="container mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-bold text-[#9e7162] mb-6">
                ¿Listo para Cuidar tu Piel?
              </h2>
              <p className="text-xl text-[#ba8c84] mb-8 max-w-2xl mx-auto">
                Agenda tu cita hoy mismo y comienza tu camino hacia una piel más saludable y radiante.
              </p>

              <Link href={`/${username}/agendar-visita`}>
                <Button 
                  size="lg"
                  className="bg-gradient-to-r from-[#ba8c84] to-[#9e7162] hover:from-[#9e7162] hover:to-[#ba8c84] text-white px-12 py-4 rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 text-lg font-semibold"
                >
                  <Calendar className="w-6 h-6 mr-3 text-white" />
                  Agendar visita
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>

        <FooterRoot />
      </div>
    </QueryClientProvider>
  );
}
